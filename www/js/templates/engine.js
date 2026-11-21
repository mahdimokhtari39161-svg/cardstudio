// Template engine: turns form data into text tokens, fills template-bound text and re-stacks the text column.
import { fillTokens, formatDate, weekdayName, formatTime, localizeDigits, latinDigits } from '../core/util.js';
import { lab } from '../data/cardlabels.js';
import { occById, occName } from '../data/occasions.js';
import { kindText } from '../data/texts.js';
import { layoutText } from '../gfx/render.js';
import { clone } from '../core/util.js';
import { sampleData } from './samples.js';

const v = (x) => String(x ?? '').trim();

// Build the token dictionary used by template text ("{title}", "{dateLine}" …) from a card.
export function displayData(card, override = {}) {
  const lang = card.lang, occ = occById[card.occasion], kind = occ?.k || 'greet';
  const real = Object.fromEntries(Object.entries(card.data || {}).filter(([, x]) => String(x ?? '').trim() !== ''));
  const d = { ...(card.sample ? sampleData(occ, lang) : {}), ...real, ...override };
  const nums = (s) => localizeDigits(s, lang === 'fa' || lang === 'ar' ? lang : 'en');
  const dateTxt = d.dateISO ? nums(formatDate(d.dateISO, lang, card.calendar || undefined)) : '';
  const wd = v(d.weekday) || (d.dateISO ? weekdayName(d.dateISO, lang) : '');
  const dateLine = [wd, dateTxt].filter(Boolean).join(lang === 'fa' || lang === 'ar' ? '، ' : ', ');
  const t1 = v(d.timeStart), t2 = v(d.timeEnd);
  const timeLine = t1 ? `${lab('time', lang)} ${nums(t1)}${t2 ? ` ${lab('until', lang)} ${nums(t2)}` : ''}` : '';
  const contact = [
    v(d.phone) && `${lab('phone', lang)}: ${nums(v(d.phone))}`,
    v(d.whatsapp) && `${lab('whatsapp', lang)}: ${nums(v(d.whatsapp))}`,
    v(d.email) && `${lab('email', lang)}: ${v(d.email)}`,
  ].filter(Boolean).join('\n');
  const rsvpTxt = d.rsvpBy ? `${lab('rsvp', lang)} ${nums(formatDate(d.rsvpBy, lang, card.calendar || undefined))}` : '';
  const from = v(d.inviter) || v(d.host) || v(d.company);
  const extra = (card.extras || []).filter((e) => v(e.value)).map((e) => (v(e.label) ? `${e.label}: ${e.value}` : e.value)).join('\n');
  const names = v(d.couple) || v(d.honoree) || (kind === 'invite' || kind === 'brand' ? '' : '');
  const out = {
    title: v(d.title) || occName(occ, lang) || '',
    sub: kindText(kind, 'sub', lang),
    names,
    body: v(d.body) || kindText(kind, 'body', lang),
    custom: v(d.custom),
    guestLine: v(d.guest) ? `${lab('to', lang)} ${v(d.guest)}` : '',
    guest: v(d.guest),
    hostLine: v(d.host) && !v(d.inviter) ? `${lab('hostedBy', lang)}: ${v(d.host)}` : v(d.inviter) ? `${lab('invitedBy', lang)}: ${v(d.inviter)}` : '',
    company: v(d.company),
    from,
    sign: kindText(kind, 'sign', lang),
    signLine: [kindText(kind, 'sign', lang), from].filter(Boolean).join('\n'),
    dateLine, timeLine,
    venue: v(d.venue), address: v(d.address),
    place: [v(d.venue), v(d.address)].filter(Boolean).join('\n'),
    contact, dress: v(d.dress) ? `${lab('dress', lang)}: ${v(d.dress)}` : '',
    rsvp: [rsvpTxt, v(d.rsvpLink)].filter(Boolean).join('\n'),
    notes: v(d.notes), extra,
    phone: v(d.phone) ? nums(v(d.phone)) : '', email: v(d.email),
    job: v(d.title) && kind === 'brand' ? v(d.title) : '',
  };
  if (kind === 'brand') {
    out.names = v(d.honoree) || v(d.host) || v(d.inviter) || '';
    out.company = v(d.company) || '';
    out.title = v(d.title) || '';
    out.sub = v(d.title) || '';
    out.body = v(d.body) || '';
    out.sign = '';
    out.signLine = '';
  }
  return out;
}

// Place stacked text elements top-to-bottom inside their stack box, skipping empty ones.
export function restack(card, page) {
  const stacks = page.stacks;
  if (!stacks) return;
  for (const [name, box] of Object.entries(stacks)) {
    const items = page.elements.filter((e) => e.stack === name && e.type === 'text' && !e.free);
    const live = items.filter((e) => String(e.text || '').trim());
    items.forEach((e) => { e.hidden = !String(e.text || '').trim(); });
    if (!live.length) continue;
    const measure = () => live.map((e) => {
      const L = layoutText(null, { ...e, fit: false }, e.text);
      return Math.max(e.minH || 0, Math.ceil(L.totalH + (e.padY ?? 6) * 2));
    });
    let gap = box.gap ?? 26, measured = measure(), total = 0;
    const sum = () => measured.reduce((a, b) => a + b, 0) + gap * (live.length - 1);
    total = sum();
    // shrink all text a little at a time until the column fits its box
    for (let guard = 0; total > box.h && guard < 14; guard++) {
      live.forEach((e) => { if (e.size > 14) e.size = Math.max(14, Math.round(e.size * 0.93)); });
      gap = Math.max(6, gap * 0.9); measured = measure(); total = sum();
    }
    const weights = live.map((e) => e.gapAfter ?? 1);
    let y = box.valign === 'top' ? box.y : box.y + Math.max(0, (box.h - total) / 2);
    live.forEach((e, i) => {
      e.x = box.x + (e.dx || 0); e.w = box.w - (e.dx || 0) * 2; e.y = y; e.h = measured[i];
      y += measured[i] + gap * weights[i];
    });
  }
}

// Fill every template-bound text of a card from its data and restack.
export function refreshCard(card) {
  const dd = displayData(card);
  for (const p of card.pages) {
    for (const el of p.elements) if (el.type === 'text' && el.tpl && !el.edited) el.text = fillTokens(el.tpl, dd);
    restack(card, p);
  }
  return card;
}

// Apply a generated template spec ({pages:[{w,h,bg,elements,stacks}]}) onto a card, keeping its data.
export function applyTemplateSpec(card, spec, tplId) {
  const sp = clone(spec);
  card.pages = sp.pages;
  card.tplId = tplId || card.tplId;
  if (spec.fx) card.fx = { ...card.fx, ...spec.fx };
  refreshCard(card);
  return card;
}
