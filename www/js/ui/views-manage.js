// Gallery, guests/events, studio (design from scratch), settings, help.
import { h, ic, modal, toast, field, seg, chips, confirmBox, promptBox, pickFile, readFileAs, clear } from './dom.js';
import { t, uiLang, setUILang, UI_LANGS } from '../core/i18n.js';
import { register, go, back, topbar, refresh } from './router.js';
import { Settings, Store, listCards, saveCard, getCard, deleteCard, listEvents, saveEvent, deleteEvent, listPersonalTemplates } from '../core/storage.js';
import { occById, occName, OCCASIONS } from '../data/occasions.js';
import { LANGS, LANG_NAMES } from '../data/fonts.js';
import { newCard, PAGE_PRESETS } from '../core/model.js';
import { uid, clone, slug, formatDate, toCSV, parseCSV } from '../core/util.js';
import { entitlementsInfo } from './settings-info.js';
import { newEvent, newGuest, stats, inviteURL, applyReplies, buildICS, STATUS } from '../logic/guests.js';
import { saveToDevice, shareText, openExternal, waLink, copyText, mailLink } from '../io/native.js';
import { readTable, tableFromPaste, guessMapping } from '../io/sheet.js';
import { renderPageToCanvas } from '../gfx/render.js';
import { startCard } from './views-home.js';

export const L = (fa, en) => (uiLang() === 'en' ? en : fa);
const oName = (id, lang) => occName(occById[id], lang || (uiLang() === 'en' ? 'en' : 'fa')) || '';
const dateStr = (ms) => new Date(ms).toLocaleDateString(uiLang() === 'en' ? 'en-GB' : 'fa-IR', { day: 'numeric', month: 'short', year: 'numeric' });

// ============ Gallery ============
register('gallery', async () => {
  let cards = await listCards(), mine = await listPersonalTemplates(), tab = 'all', folder = '', q = '';
  const grid = h('div', { class: 'tpl-grid' }), folderBar = h('div');
  const folders = () => [...new Set(cards.map((c) => c.folder).filter(Boolean))];
  const menu = (c) => {
    const m = modal(c.name || oName(c.occasion, c.lang) || L('بدون عنوان', 'Untitled'), h('div', { class: 'list' },
      item('edit', L('باز کردن در ویرایشگر', 'Open in editor'), () => go('editor', { id: c.id })),
      item('edit', L('تغییر نام', 'Rename'), async () => { const n = await promptBox(L('نام', 'Name'), c.name || ''); if (n != null) { c.name = n.trim(); await saveCard(c, c.thumb); render(); } }),
      item(c.fav ? 'heartFill' : 'heart', c.fav ? L('حذف از علاقه‌مندی‌ها', 'Remove favourite') : L('افزودن به علاقه‌مندی‌ها', 'Add to favourites'), async () => { c.fav = !c.fav; await saveCard(c, c.thumb); render(); }),
      item('copy', L('کپی کارت', 'Duplicate'), async () => { const n = clone(c); n.id = uid('c'); n.name = (c.name || '') + L(' (کپی)', ' (copy)'); n.createdAt = Date.now(); await saveCard(n, c.thumb); cards = await listCards(); render(); toast(L('کپی شد', 'Duplicated')); }),
      item('layers', L('نسخه جدید (نگه‌داشتن نسخه قبلی)', 'New version (keep the old one)'), async () => { const n = clone(c); n.id = uid('c'); n.parent = c.parent || c.id; n.version = (c.version || 1) + 1; n.createdAt = Date.now(); await saveCard(n, c.thumb); cards = await listCards(); render(); toast(L('نسخه ' + n.version + ' ساخته شد', 'Version ' + n.version + ' created')); }),
      item('folder', L('انتقال به پوشه', 'Move to folder'), async () => { const n = await promptBox(L('نام پوشه (خالی = بدون پوشه)', 'Folder name (empty = none)'), c.folder || ''); if (n != null) { c.folder = n.trim(); await saveCard(c, c.thumb); render(); } }),
      item('users', L('ساخت کارت‌های مهمان (گروهی)', 'Personalised cards for guests'), () => go('bulk', { id: c.id })),
      item('trash', L('حذف', 'Delete'), async () => { if (await confirmBox(L('این کارت حذف شود؟', 'Delete this card?'), { danger: true })) { await deleteCard(c.id); cards = await listCards(); render(); } }, true)), { sheet: true });
    function item(icn, lab, fn, danger) { return h('button', { class: 'list-item', style: danger ? { color: '#ef476f' } : {}, onclick: () => { m.close(); fn(); } }, ic(icn), h('b', null, lab)); }
  };
  const render = () => {
    folderBar.replaceChildren(h('div', { class: 'row wrap' }, ...folders().map((f) => h('button', { class: `btn small ${folder === f ? 'primary' : ''}`, onclick: () => { folder = folder === f ? '' : f; render(); } }, ic('folder', 14), f))));
    grid.replaceChildren();
    if (tab === 'tpl') {
      if (!mine.length) grid.replaceWith(emptyBox(L('هنوز قالب شخصی ندارید. در ویرایشگر «ذخیره به‌عنوان قالب شخصی» را بزنید.', 'No personal templates yet. Use “Save as personal template” in the editor.')));
      for (const p of mine) grid.append(h('div', { class: 'tpl' }, h('button', { class: 'thumb', style: { border: 0, padding: 0 }, onclick: async () => { const c = newCard({ occasion: p.occasion, lang: p.lang }); c.pages = clone(p.spec.pages); c.fx = clone(p.spec.fx); c.name = p.name; c.sample = false; await saveCard(c, p.thumb); go('editor', { id: c.id }); } }, h('img', { src: p.thumb, style: { width: '100%', height: '100%', objectFit: 'cover' } })), h('div', { class: 'cap' }, h('span', null, p.name), h('button', { class: 'icon-btn', style: { width: '28px', height: '28px' }, onclick: async () => { if (await confirmBox(L('حذف قالب؟', 'Delete template?'))) { await Store.del('tpls', p.id); mine = await listPersonalTemplates(); render(); } } }, ic('trash', 14)))));
      return;
    }
    let list = cards;
    if (tab === 'fav') list = list.filter((c) => c.fav);
    if (tab === 'recent') list = list.slice(0, 12);
    if (folder) list = list.filter((c) => c.folder === folder);
    if (q) list = list.filter((c) => ((c.name || '') + oName(c.occasion, c.lang)).toLowerCase().includes(q.toLowerCase()));
    if (!list.length) { grid.append(h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, h('p', null, L('هنوز کارتی نیست.', 'Nothing here yet.')), h('button', { class: 'btn primary', onclick: () => go('home', {}, { reset: true }) }, ic('plus'), L('ساخت کارت جدید', 'Create a card')))); return; }
    for (const c of list) grid.append(h('div', { class: 'tpl' }, h('button', { class: 'thumb', style: { border: 0, padding: 0, aspectRatio: `${c.pages[0].w}/${c.pages[0].h}` }, onclick: () => go('editor', { id: c.id }) }, c.thumb ? h('img', { src: c.thumb, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : null), c.fav ? h('span', { class: 'badge free', style: { color: '#ef476f' } }, ic('heartFill', 12)) : null, h('div', { class: 'cap' }, h('span', null, (c.name || oName(c.occasion, c.lang) || L('بدون عنوان', 'Untitled')) + (c.version > 1 ? ` v${c.version}` : '')), h('button', { class: 'icon-btn', style: { width: '28px', height: '28px' }, onclick: () => menu(c), 'aria-label': 'menu' }, ic('settings', 14)))));
  };
  const emptyBox = (txt) => h('div', { class: 'empty' }, txt);
  const el = h('div', { class: 'view' }, topbar(t('gallery'), { onBack: null, right: [h('button', { class: 'icon-btn', onclick: () => go('studio') }, ic('plus'))] }), h('div', { class: 'scroll' },
    h('input', { class: 'input', type: 'search', placeholder: t('search'), oninput: (e) => { q = e.target.value; render(); } }), h('div', { style: { height: '10px' } }),
    seg([['all', L('همه', 'All')], ['recent', L('اخیر', 'Recent')], ['fav', L('علاقه‌مندی', 'Favourites')], ['tpl', L('قالب‌های من', 'My templates')]], tab, (v) => { tab = v; render(); }), h('div', { style: { height: '10px' } }), folderBar, grid));
  render();
  return { el, tab: 'gallery' };
});

// ============ Studio: design from scratch ============
register('studio', async () => {
  let key = 'card', w = 1000, hh = 1400, lang = Settings.get('cardLang') || 'fa';
  const wI = h('input', { class: 'input', type: 'number', value: 1000, min: 200, max: 6000 }), hI = h('input', { class: 'input', type: 'number', value: 1400, min: 200, max: 6000 });
  const grid = h('div', { class: 'fx-grid' });
  const draw = () => grid.replaceChildren(...Object.entries(PAGE_PRESETS).map(([k, v]) => h('button', { class: key === k ? 'on' : '', onclick: () => { key = k; wI.value = v.w; hI.value = v.h; draw(); } }, v.n[uiLang() === 'en' ? 1 : 0], h('br'), h('small', { class: 'muted' }, `${v.w}×${v.h}`))));
  draw();
  const make = async () => {
    const W = Math.min(6000, Math.max(200, +wI.value || 1000)), H = Math.min(6000, Math.max(200, +hI.value || 1400));
    const c = newCard({ occasion: 'custom', lang, w: W, h: H }); c.sample = false; c.name = L('طرح جدید', 'New design');
    c.pages[0].bg = { type: 'color', color: '#ffffff' };
    await saveCard(c, renderPageToCanvas(c, 0, 200).toDataURL('image/jpeg', 0.6)); go('editor', { id: c.id }, { replace: true });
  };
  return { el: h('div', { class: 'view' }, topbar(L('طراحی از صفر', 'Design from scratch')), h('div', { class: 'scroll' }, h('p', { class: 'muted' }, L('یک بوم خالی با اندازهٔ دلخواه بسازید؛ بعد در ویرایشگر متن، تصویر، گرافیک و صفحهٔ بیشتر اضافه کنید.', 'Start with a blank canvas of any size, then add text, images, graphics and more pages in the editor.')), field(t('language'), chips(LANGS.map((l) => [l, LANG_NAMES[l]]), lang, (v) => (lang = v))), field(L('اندازه', 'Size'), grid), h('div', { class: 'row' }, field(L('عرض', 'Width'), wI), field(L('ارتفاع', 'Height'), hI)), h('button', { class: 'btn primary block', style: { marginTop: '14px' }, onclick: make }, ic('plus'), L('ساخت بوم', 'Create canvas')))) };
});

// ============ Guests / events ============
register('guests', async () => {
  const events = await listEvents(), list = h('div', { class: 'list' });
  if (!events.length) list.append(h('div', { class: 'empty' }, h('p', null, L('هنوز رویدادی ندارید. یک رویداد بسازید تا مهمان‌ها، لینک دعوت شخصی و پاسخ‌ها را مدیریت کنید.', 'No events yet. Create one to manage guests, personal invite links and replies.'))));
  for (const e of events) { const s = stats(e); list.append(h('button', { class: 'list-item', onclick: () => go('event', { id: e.id }) }, ic('calendar'), h('div', { class: 'grow', style: { textAlign: 'start' } }, h('b', null, e.name || L('رویداد', 'Event')), h('div', { class: 'muted', style: { fontSize: '12.5px' } }, `${e.dateISO ? formatDate(e.dateISO, e.lang === 'en' ? 'gregorian' : 'persian', e.lang || 'fa') + ' · ' : ''}${s.total} ${L('مهمان', 'guests')} · ${s.confirmed} ✓ · ${s.declined} ✗`)), ic('fwd', 16))); }
  const add = async () => {
    const cards = await listCards(), inv = cards.filter((c) => occById[c.occasion]?.k === 'invite' || true);
    const nm = h('input', { class: 'input', placeholder: L('نام رویداد', 'Event name') }), sel = h('select', { class: 'input' }, h('option', { value: '' }, L('بدون کارت', 'No card')), ...inv.map((c) => h('option', { value: c.id }, c.name || oName(c.occasion, c.lang) || c.id)));
    modal(L('رویداد جدید', 'New event'), h('div', null, field(L('نام رویداد', 'Event name'), nm), field(L('کارت دعوت مرتبط', 'Linked invitation card'), sel)), { actions: [{ label: t('cancel') }, { label: t('ok'), primary: true, onClick: async () => { const c = inv.find((x) => x.id === sel.value), d = c?.data || {}; const e = newEvent({ name: nm.value.trim() || (c?.name || oName(c?.occasion) || L('رویداد', 'Event')), cardId: c?.id || '', lang: c?.lang || Settings.get('cardLang') || 'fa', dateISO: d.dateISO || '', timeStart: d.timeStart || '', timeEnd: d.timeEnd || '', venue: d.venue || '', address: d.address || '', map: d.map || '', host: d.host || d.inviter || '', phone: d.phone || '', whatsapp: d.whatsapp || '', dress: d.dress || '', notes: d.notes || '' }); await saveEvent(e); go('event', { id: e.id }); } }] });
  };
  return { el: h('div', { class: 'view' }, topbar(t('guests'), { onBack: null, right: [h('button', { class: 'icon-btn', onclick: add, 'aria-label': 'add' }, ic('plus'))] }), h('div', { class: 'scroll' }, list, h('div', { style: { height: '12px' } }), h('button', { class: 'btn primary block', onclick: add }, ic('plus'), L('رویداد جدید', 'New event')))), tab: 'guests' };
});

register('event', async ({ id }) => {
  const ev = (await Store.get('events', id)); if (!ev) { await back(); return { el: h('div') }; }
  const card = ev.cardId ? await getCard(ev.cardId) : null, base = Settings.get('baseUrl');
  const persist = async () => { await saveEvent(ev); };
  const body = h('div'), lang = ev.lang || 'fa';
  const linkFor = (g) => inviteURL(base, { ...ev, webhook: Settings.get('webhook') }, card, g);
  const render = () => {
    clear(body); const s = stats(ev);
    body.append(
      h('div', { class: 'stats' }, [[L('کل', 'Total'), s.total], [L('تأیید', 'Yes'), s.confirmed], [L('رد', 'No'), s.declined], [L('در انتظار', 'Pending'), s.invited], [L('نفرات', 'Headcount'), s.headcount]].map(([a, b]) => h('div', { class: 'stat' }, h('b', null, b), h('small', null, a)))),
      h('div', { class: 'row wrap', style: { margin: '10px 0' } },
        h('button', { class: 'btn small primary', onclick: () => addGuest() }, ic('plus', 16), L('مهمان', 'Guest')),
        h('button', { class: 'btn small', onclick: importGuests }, ic('file', 16), L('ورود از فایل/متن', 'Import')),
        h('button', { class: 'btn small', onclick: replies }, ic('check', 16), L('ثبت پاسخ‌ها', 'Paste replies')),
        h('button', { class: 'btn small', onclick: () => go('bulk', { eventId: ev.id, id: ev.cardId }) }, ic('users', 16), L('کارت‌های مهمان', 'Guest cards')),
        h('button', { class: 'btn small', onclick: exportCSV }, ic('download', 16), 'CSV'),
        h('button', { class: 'btn small', onclick: sendICS }, ic('calendar', 16), '.ics')),
      ...ev.guests.map(guestRow));
    if (!ev.guests.length) body.append(h('div', { class: 'empty' }, L('مهمانی اضافه نشده است.', 'No guests added yet.')));
  };
  const text = (g) => `${L('دعوت‌نامهٔ', 'Invitation:')} ${ev.name}\n${linkFor(g)}`;
  function guestRow(g) {
    const stCol = { invited: '#8d99ae', confirmed: '#2a9d8f', declined: '#ef476f' }[g.status];
    return h('div', { class: 'guest-row' }, h('div', { class: 'grow', style: { minWidth: 0 } }, h('b', null, `${g.title ? g.title + ' ' : ''}${g.name || '—'}`), h('div', { class: 'muted', style: { fontSize: '12px' } }, [g.phone, g.table ? `${L('میز', 'Table')} ${g.table}` : '', g.plus ? `+${g.plus}` : ''].filter(Boolean).join(' · '))),
      h('button', { class: 'pill', style: { background: stCol, color: '#fff', border: 0 }, onclick: async () => { g.status = STATUS[(STATUS.indexOf(g.status) + 1) % 3]; await persist(); render(); } }, { invited: L('دعوت شد', 'Invited'), confirmed: L('می‌آید', 'Coming'), declined: L('نمی‌آید', 'Declined') }[g.status]),
      h('button', { class: 'icon-btn', onclick: () => guestMenu(g), 'aria-label': 'menu' }, ic('settings', 18)));
  }
  function guestMenu(g) {
    const m = modal(g.name || L('مهمان', 'Guest'), h('div', { class: 'list' },
      it('copy', L('کپی لینک دعوت شخصی', 'Copy personal invite link'), async () => { await copyText(linkFor(g)); toast(L('لینک کپی شد', 'Link copied')); }),
      it('whatsapp', L('ارسال با واتساپ', 'Send via WhatsApp'), async () => { g.sentAt = Date.now(); await persist(); openExternal(waLink(g.phone, text(g))); }),
      it('send', L('ارسال با سایر برنامه‌ها', 'Share…'), async () => { g.sentAt = Date.now(); await persist(); shareText(ev.name, text(g)); }),
      it('mail', L('ایمیل', 'Email'), () => openExternal(mailLink(g.email, ev.name, text(g)))),
      it('edit', L('ویرایش', 'Edit'), () => addGuest(g)),
      it('trash', L('حذف', 'Delete'), async () => { ev.guests = ev.guests.filter((x) => x !== g); await persist(); render(); })), { sheet: true });
    function it(icn, lab, fn) { return h('button', { class: 'list-item', onclick: () => { m.close(); fn(); } }, ic(icn), h('b', null, lab)); }
  }
  function addGuest(g) {
    const isNew = !g; g = g || newGuest(); const f = (k, lab, ty = 'text') => field(lab, h('input', { class: 'input', type: ty, value: g[k] ?? '', dir: ty === 'tel' || ty === 'email' ? 'ltr' : 'auto', oninput: (e) => (g[k] = ty === 'number' ? +e.target.value || 0 : e.target.value) }));
    modal(isNew ? L('مهمان جدید', 'New guest') : L('ویرایش مهمان', 'Edit guest'), h('div', null, f('title', L('عنوان (آقای/خانم/دکتر…)', 'Title')), f('name', L('نام', 'Name')), f('phone', L('تلفن / واتساپ', 'Phone / WhatsApp'), 'tel'), f('email', L('ایمیل', 'Email'), 'email'), f('table', L('شماره میز', 'Table')), f('plus', L('همراه', 'Plus-ones'), 'number'), f('note', L('یادداشت', 'Note'))), { actions: [{ label: t('cancel') }, { label: t('ok'), primary: true, onClick: async () => { if (!g.name.trim()) return; if (isNew) ev.guests.push(g); await persist(); render(); } }] });
  }
  async function importGuests() {
    const ta = h('textarea', { class: 'input', rows: 6, placeholder: L('هر خط یک مهمان: نام, تلفن', 'One guest per line: name, phone'), dir: 'auto' });
    const m = modal(L('ورود مهمان‌ها', 'Import guests'), h('div', null, h('button', { class: 'btn block', onclick: async () => { const [f] = await pickFile('.csv,.xlsx,.txt,text/csv'); if (!f) return; try { const tb = await readTable(f); add(tb); m.close(); } catch (e) { toast(L('فایل خوانده نشد: ', 'Cannot read file: ') + e.message); } } }, ic('file'), L('انتخاب CSV / Excel (xlsx)', 'Choose CSV / Excel (xlsx)')), h('div', { style: { height: '8px' } }), ta), { actions: [{ label: t('cancel') }, { label: t('ok'), primary: true, close: false, onClick: () => { const tb = tableFromPaste(ta.value); if (!tb.rows.length) return toast(L('چیزی برای ورود نیست', 'Nothing to import')); add(tb); m.close(); } }] });
    async function add(tb) { const map = guessMapping(tb.headers); let n = 0; for (const r of tb.rows) { const name = String(r[map.guest ?? 0] || '').trim(); if (!name) continue; ev.guests.push(newGuest({ name, title: map.title != null ? r[map.title] : '', phone: map.phone != null ? r[map.phone] : map.whatsapp != null ? r[map.whatsapp] : '', email: map.email != null ? r[map.email] : '', table: map.table != null ? r[map.table] : '' })); n++; } await persist(); render(); toast(`${n} ${L('مهمان اضافه شد', 'guests added')}`); }
  }
  function replies() {
    const ta = h('textarea', { class: 'input', rows: 6, dir: 'ltr', placeholder: 'CS1-…-…-y-0' });
    modal(L('ثبت پاسخ مهمان‌ها', 'Record replies'), h('div', null, h('p', { class: 'muted' }, L('کدهای پاسخ (CS1-…) را که مهمان‌ها از صفحهٔ دعوت‌نامه فرستاده‌اند اینجا بچسبانید؛ می‌توانید چند کد را با هم بچسبانید.', 'Paste the reply codes (CS1-…) your guests sent from the invitation page. Multiple codes are fine.')), ta), { actions: [{ label: t('cancel') }, { label: t('ok'), primary: true, onClick: async () => { const r = applyReplies(ev, ta.value); await persist(); render(); toast(`${r.applied} ${L('پاسخ ثبت شد', 'replies applied')}${r.unknown ? ` · ${r.unknown} ${L('نامعتبر', 'unmatched')}` : ''}`, 3200); } }] });
  }
  async function exportCSV() { const rows = [['name', 'title', 'phone', 'email', 'status', 'plus', 'table', 'note', 'link'], ...ev.guests.map((g) => [g.name, g.title, g.phone, g.email, g.status, g.plus, g.table, g.note, linkFor(g)])]; const r = await saveToDevice(new Blob(['﻿' + toCSV(rows)], { type: 'text/csv' }), `${slug(ev.name || 'guests')}.csv`); toast(r.ok ? L('ذخیره شد', 'Saved') : L('ناموفق', 'Failed')); }
  async function sendICS() { const ics = buildICS({ title: ev.name, dateISO: ev.dateISO, timeStart: ev.timeStart, timeEnd: ev.timeEnd, venue: ev.venue, address: ev.address, notes: ev.notes }); if (!ics) return toast(L('ابتدا تاریخ رویداد را وارد کنید', 'Set the event date first')); const r = await saveToDevice(new Blob([ics], { type: 'text/calendar' }), `${slug(ev.name || 'event')}.ics`); toast(r.ok ? L('ذخیره شد', 'Saved') : L('ناموفق', 'Failed')); }
  function editEvent() {
    const f = (k, lab, ty = 'text') => field(lab, h('input', { class: 'input', type: ty, value: ev[k] || '', dir: ty === 'url' || ty === 'tel' ? 'ltr' : 'auto', oninput: (e) => (ev[k] = e.target.value) }));
    modal(L('اطلاعات رویداد', 'Event info'), h('div', null, f('name', L('نام رویداد', 'Event name')), f('dateISO', L('تاریخ', 'Date'), 'date'), f('timeStart', L('ساعت شروع', 'Start'), 'time'), f('timeEnd', L('ساعت پایان', 'End'), 'time'), f('venue', L('مکان', 'Venue')), f('address', L('نشانی', 'Address')), f('map', L('لینک نقشه', 'Map link'), 'url'), f('host', L('میزبان', 'Host')), f('phone', L('تلفن میزبان', 'Host phone'), 'tel'), f('whatsapp', 'WhatsApp', 'tel'), f('dress', L('پوشش', 'Dress code')), f('notes', L('توضیحات', 'Notes')), field(t('language'), chips(LANGS.map((l) => [l, LANG_NAMES[l]]), ev.lang, (v) => (ev.lang = v)))), { sheet: true, actions: [{ label: t('cancel') }, { label: t('ok'), primary: true, onClick: async () => { await persist(); refresh(); } }] });
  }
  const el = h('div', { class: 'view' }, topbar(ev.name || L('رویداد', 'Event'), { right: [h('button', { class: 'icon-btn', onclick: editEvent }, ic('edit')), h('button', { class: 'icon-btn', onclick: async () => { if (await confirmBox(L('این رویداد حذف شود؟', 'Delete this event?'), { danger: true })) { await deleteEvent(ev.id); await back(); } } }, ic('trash'))] }), h('div', { class: 'scroll' },
    !card ? h('p', { class: 'muted' }, L('کارت مرتبطی انتخاب نشده؛ لینک دعوت از اطلاعات رویداد ساخته می‌شود.', 'No linked card; invite links use the event info.')) : null, body));
  render();
  return { el };
});

// ============ Settings ============
register('settings', async () => {
  let taps = 0;
  const sec = (title, ...kids) => h('div', { class: 'card-sec' }, h('div', { class: 'sec-title' }, h('span', null, title)), ...kids);
  const txt = (key, lab, ph = '', type = 'text', dir = 'ltr') => field(lab, h('input', { class: 'input', type, value: Settings.get(key) || '', placeholder: ph, dir, onchange: (e) => Settings.set(key, e.target.value.trim()) }));
  const applyTheme = () => { document.documentElement.dataset.theme = Settings.get('theme') === 'light' ? 'light' : 'dark'; };
  const el = h('div', { class: 'view' }, topbar(t('settings'), { onBack: null }), h('div', { class: 'scroll' },
    sec(L('ظاهر', 'Appearance'), field(L('تم', 'Theme'), seg([['dark', L('تیره', 'Dark')], ['light', L('روشن', 'Light')]], Settings.get('theme'), async (v) => { await Settings.set('theme', v); applyTheme(); })),
      field(L('زبان برنامه', 'App language'), seg(UI_LANGS.filter((x) => x[0] !== 'ar').map(([k, n]) => [k, n]), uiLang(), async (v) => { await Settings.set('uiLang', v); setUILang(v); refresh(); })),
      field(L('زبان پیش‌فرض کارت', 'Default card language'), chips(LANGS.map((l) => [l, LANG_NAMES[l]]), Settings.get('cardLang'), (v) => Settings.set('cardLang', v)))),
    sec(L('دعوت‌نامهٔ هوشمند', 'Smart invitation'), txt('baseUrl', L('نشانی صفحهٔ دعوت‌نامه', 'Invitation page URL'), 'https://…/invite/', 'url'), h('p', { class: 'muted', style: { fontSize: '12.5px' } }, L('صفحهٔ دعوت‌نامه (پوشهٔ invite) باید روی یک میزبان ثابت مثل GitHub Pages منتشر شود؛ اطلاعات دعوت‌نامه فقط داخل لینک است و به هیچ سروری فرستاده نمی‌شود.', 'The invite/ page must be hosted on a static host such as GitHub Pages. Invitation data lives only in the link; nothing is sent to a server.')), txt('webhook', L('نشانی دریافت پاسخ‌ها (اختیاری، Webhook)', 'Reply webhook URL (optional)'), 'https://…', 'url')),
    sec(L('هوش مصنوعی آنلاین (اختیاری)', 'Online AI (optional)'), h('p', { class: 'muted', style: { fontSize: '12.5px' } }, L('پیشنهاد متن آفلاین همیشه کار می‌کند. برای پیشنهاد هوشمند آنلاین، یک نشانی سازگار با OpenAI و کلید خودتان را وارد کنید.', 'Offline text suggestions always work. For online AI, enter an OpenAI-compatible endpoint and your own key.')), txt('aiEndpoint', 'Endpoint', 'https://api.openai.com/v1/chat/completions', 'url'), txt('aiKey', 'API key', '', 'password'), txt('aiModel', 'Model', 'gpt-4o-mini')),
    sec(L('حساب و اشتراک', 'Plan'), entitlementsInfo(L)),
    sec(L('داده‌ها', 'Data'), h('button', { class: 'btn block danger', onclick: async () => { if (await confirmBox(L('همهٔ کارت‌ها، رویدادها و تنظیمات حذف شود؟ این کار برگشت‌پذیر نیست.', 'Delete ALL cards, events and settings? This cannot be undone.'), { danger: true })) { for (const s of ['cards', 'events', 'tpls']) for (const x of await Store.all(s)) await Store.del(s, x.id); toast(L('پاک شد', 'Cleared')); } } }, ic('trash'), L('پاک‌کردن همهٔ داده‌ها', 'Erase all data'))),
    h('button', { class: 'btn block', onclick: () => go('help') }, ic('help'), t('help')),
    h('p', { class: 'muted', style: { textAlign: 'center', marginTop: '16px' }, onclick: async () => { if (++taps >= 7) { taps = 0; const on = !Settings.get('devUnlock'); await Settings.set('devUnlock', on); toast(on ? 'Developer unlock ON (testing only)' : 'Developer unlock OFF'); refresh(); } } }, 'CardStudio · v1.0')));
  return { el, tab: 'settings' };
});

// ============ Help ============
register('help', async () => {
  const items = [
    [L('ساخت کارت', 'Making a card'), L('مناسبت را انتخاب کنید ← یکی از قالب‌ها را بزنید ← اطلاعات را (هرچه خواستید) پر کنید ← در ویرایشگر هر چیزی را جابه‌جا یا ویرایش کنید.', 'Pick an occasion → choose a template → fill in whatever info you like → move or edit anything in the editor.')],
    [L('خروجی', 'Export'), L('از دکمهٔ اشتراک بالای ویرایشگر: PNG، JPG، PDF، استوری، پست، واتساپ و چاپ. ذخیره در گالری یا اشتراک‌گذاری مستقیم.', 'Use the share button in the editor: PNG, JPG, PDF, story, post, WhatsApp, print. Save to gallery or share directly.')],
    [L('دعوت‌نامهٔ هوشمند', 'Smart invitation'), L('در بخش مهمان‌ها یک رویداد بسازید؛ برای هر مهمان لینک شخصی (نقشه، شمارش معکوس، افزودن به تقویم، تأیید حضور) بفرستید و کدهای پاسخ را ثبت کنید.', 'Create an event under Guests; send each guest a personal link (map, countdown, add-to-calendar, RSVP) and record the reply codes.')],
    [L('کارت گروهی', 'Bulk cards'), L('از گالری روی کارت «ساخت کارت‌های مهمان» را بزنید و فایل CSV یا Excel بدهید.', 'From the gallery menu choose “Personalised cards for guests” and import a CSV or Excel file.')],
    [L('انیمیشن و ویدیو', 'Animated cards'), L('دکمهٔ فیلم در ویرایشگر: ورود متن، افکت باز شدن، ذرات، موسیقی شما، خروجی GIF و ویدیو.', 'Use the film button in the editor: text entrances, opening effects, particles, your own music, GIF and video export.')],
    [L('حریم خصوصی', 'Privacy'), L('همه‌چیز روی دستگاه شما ذخیره می‌شود و برنامه بدون اینترنت کار می‌کند.', 'Everything is stored on your device and the app works offline.')],
  ];
  return { el: h('div', { class: 'view' }, topbar(t('help')), h('div', { class: 'scroll' }, ...items.map(([a, b]) => h('div', { class: 'card-sec' }, h('h3', { style: { margin: '0 0 6px' } }, a), h('p', { style: { margin: 0, lineHeight: 1.9 } }, b))))) };
});
