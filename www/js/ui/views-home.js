// Home, occasion template lists, template preview, smart design.
import { h, ic, modal, toast, seg, field, chips } from './dom.js';
import { t, uiLang } from '../core/i18n.js';
import { register, go, topbar } from './router.js';
import { OCCASIONS, GROUPS, occName, groupName, occById } from '../data/occasions.js';
import { LANGS, LANG_NAMES } from '../data/fonts.js';
import { templatesFor, templateCount, cardFromTemplate, findTemplate, searchOccasions, parseTplId } from '../templates/registry.js';
import { tplThumb } from './thumbs.js';
import { Settings, listCards } from '../core/storage.js';
import { canUseTemplate, hasPaymentProvider } from '../core/entitlements.js';
import { STYLES, STYLE_IDS } from '../templates/styles.js';
import { suggestDesigns, COLOR_CHOICES, COLOR_NAMES } from '../logic/suggest.js';
import { PALETTES } from '../data/palettes.js';

const ui = () => (uiLang() === 'en' ? 1 : 0);
export const styleName = (id) => STYLES[id]?.n[ui()] || id;
const cardLang = () => Settings.get('cardLang') || 'fa';

export function tplCard(tpl, { onPick } = {}) {
  const lang = cardLang(), fav = Settings.get('fav').includes(tpl.id);
  const b = h('button', { class: 'tpl', onclick: () => (onPick ? onPick(tpl) : openTemplate(tpl.id)), 'aria-label': styleName(tpl.style) },
    tplThumb(tpl.id, lang),
    tpl.premium ? h('span', { class: 'badge' }, ic('crown', 11), t('pro')) : h('span', { class: 'badge free' }, t('free')),
    h('div', { class: 'cap' }, h('span', null, styleName(tpl.style)), fav ? h('span', { style: { color: '#ef476f' } }, ic('heartFill', 13)) : null));
  return b;
}

export async function startCard(tplId) {
  const tpl = findTemplate(tplId);
  if (!canUseTemplate(tpl)) { premiumInfo(); return; }
  const card = cardFromTemplate(tplId, { lang: cardLang() });
  const recent = [tplId, ...Settings.get('recent').filter((x) => x !== tplId)].slice(0, 20); Settings.set('recent', recent);
  go('form', { card, isNew: true });
}
export function premiumInfo() {
  const body = h('div', null, h('p', null, t('premiumInfo')));
  if (!hasPaymentProvider()) body.append(h('p', { class: 'muted' }, t('devUnlock')));
  modal(t('premiumLocked'), body, { actions: [{ label: t('close'), primary: true }] });
}

export function openTemplate(tplId) {
  const tpl = findTemplate(tplId), lang = cardLang();
  let fav = Settings.get('fav').includes(tplId);
  const favBtn = h('button', { class: 'icon-btn', onclick: async () => { fav = !fav; const f = Settings.get('fav').filter((x) => x !== tplId); if (fav) f.unshift(tplId); await Settings.set('fav', f); favBtn.replaceChildren(ic(fav ? 'heartFill' : 'heart', 22)); favBtn.style.color = fav ? '#ef476f' : ''; } }, ic(fav ? 'heartFill' : 'heart', 22));
  if (fav) favBtn.style.color = '#ef476f';
  const big = tplThumb(tplId, lang); big.style.aspectRatio = '5/7'; big.style.maxHeight = '56vh'; big.style.margin = '0 auto';
  const body = h('div', null, h('div', { style: { display: 'flex', justifyContent: 'center' } }, h('div', { style: { width: 'min(62vw,300px)' } }, big)),
    h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', { class: 'grow' }, h('b', null, styleName(tpl.style)), h('div', { class: 'muted' }, occName(occById[tpl.occ], uiLang() === 'en' ? 'en' : 'fa'))), favBtn));
  modal(t('template'), body, { sheet: true, actions: [{ label: t('close') }, { label: t('useTemplate'), primary: true, close: false, onClick: (close) => { close(); startCard(tplId); } }] });
}

function occTile(o) {
  return h('button', { class: 'cat', onclick: () => go('occasion', { id: o.id }) }, h('span', { class: 'em' }, GROUPS[o.g].icon), h('b', null, occName(o, uiLang() === 'en' ? 'en' : 'fa')), h('small', null, `${templatesFor(o.id).length} ${t('tplCount')}`));
}

register('home', async () => {
  const lang = uiLang() === 'en' ? 'en' : 'fa', results = h('div'), sections = h('div');
  const q = h('input', { class: 'input', type: 'search', placeholder: t('search'), oninput: () => doSearch() });
  const doSearch = () => {
    const v = q.value.trim(); results.replaceChildren();
    if (!v) { sections.style.display = ''; return; }
    sections.style.display = 'none';
    const list = searchOccasions(v, lang);
    results.append(h('div', { class: 'sec-title' }, h('span', null, `${list.length}`)), list.length ? h('div', { class: 'cat-grid' }, list.map(occTile)) : h('div', { class: 'empty' }, t('empty')));
  };
  const hero = h('div', { class: 'hero' },
    h('button', { class: 'tile gold', onclick: () => go('smart') }, ic('wand', 24), h('b', null, t('smartDesign')), h('small', null, '5+')),
    h('button', { class: 'tile', onclick: () => go('studio') }, ic('edit', 24), h('b', null, t('fromScratch')), h('small', null, t('blank'))),
    h('button', { class: 'tile', onclick: () => go('bulk') }, ic('users', 24), h('b', null, t('bulk')), h('small', null, 'CSV / Excel')),
    h('button', { class: 'tile', onclick: () => go('gallery') }, ic('grid', 24), h('b', null, t('saved')), h('small', null, t('myCards'))));
  for (const g of Object.keys(GROUPS)) {
    sections.append(h('div', { class: 'sec-title' }, h('span', null, `${GROUPS[g].icon} ${groupName(g, lang)}`)), h('div', { class: 'cat-grid' }, OCCASIONS.filter((o) => o.g === g).map(occTile)));
  }
  // popular / newest / premium rows built from a fixed shortlist so the home feels curated
  const pick = (occIds, styles) => occIds.map((id, i) => findTemplate(`${id}.${styles[i % styles.length]}.0`)).filter(Boolean);
  const popular = pick(['wedding', 'birthday', 'eidFitr', 'nowruz', 'anniversary', 'newYear', 'mothersDay', 'graduation', 'engagement', 'ramadan', 'romantic', 'babyShower'], ['royal', 'floral', 'islamic', 'persian', 'whitegold', 'galaxy', 'romantic', 'classic', 'floralgold', 'islamic', 'romantic', 'kids']);
  const newest = pick(['yalda', 'christmas', 'genderReveal', 'brandCard', 'dinner', 'shopOpening', 'thanks', 'qadr', 'party', 'newborn', 'seminar', 'easter'], ['galaxy', 'nature', 'fantasy', 'minimal', 'luxe', 'european', 'watercolor', 'islamic', 'blackgold', 'kids', 'official', 'artistic']).map((x) => findTemplate(x.id.replace(/\.0$/, '.1')) || x);
  const premium = OCCASIONS.slice(0, 40).filter((_, i) => i % 3 === 0).map((o) => templatesFor(o.id).find((x) => x.premium)).filter(Boolean).slice(0, 12);
  const row = (title, list) => [h('div', { class: 'sec-title' }, h('span', null, title)), h('div', { class: 'hscroll' }, list.map((x) => tplCard(x)))];
  sections.prepend(...row(t('popular'), popular), ...row(t('newest'), newest));
  sections.append(...row(t('premium'), premium));
  const saved = h('div');
  listCards().then((cards) => { if (!cards.length) return; saved.append(h('div', { class: 'sec-title' }, h('span', null, t('saved')), h('button', { class: 'link', onclick: () => go('gallery') }, t('all'))), h('div', { class: 'hscroll' }, cards.slice(0, 10).map((c) => h('button', { class: 'tpl', style: { width: '120px' }, onclick: () => go('editor', { id: c.id }) }, h('div', { class: 'thumb' }, c.thumb ? h('img', { src: c.thumb, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : null), h('div', { class: 'cap' }, h('span', null, c.name || occName(occById[c.occasion], lang) || t('untitled'))))))); });
  const el = h('div', { class: 'view' }, h('header', { class: 'topbar' }, h('h1', null, `✦ ${t('app')}`), h('span', { class: 'offline-badge' }, t('offlineBadge')), h('button', { class: 'icon-btn', onclick: () => go('help') }, ic('help'))),
    h('div', { class: 'scroll' }, h('div', { class: 'search' }, ic('search'), q), results, hero, saved, sections, h('p', { class: 'muted center', style: { marginTop: '24px', fontSize: '12px' } }, `${templateCount().toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US')} ${t('tplCount')} · ${OCCASIONS.length} ${t('occasion')}`)));
  return { el, tab: 'home' };
});

register('occasion', async ({ id }) => {
  const o = occById[id], lang = uiLang() === 'en' ? 'en' : 'fa', all = templatesFor(id);
  let filter = 'all';
  const grid = h('div', { class: 'tpl-grid' });
  const styleSet = [...new Set(all.map((x) => x.style))];
  let styleF = '';
  const render = () => { grid.replaceChildren(...all.filter((x) => (filter === 'all' || (filter === 'free' ? !x.premium : x.premium)) && (!styleF || x.style === styleF)).map((x) => tplCard(x))); };
  const sel = h('select', { class: 'input', onchange: (e) => { styleF = e.target.value; render(); } }, h('option', { value: '' }, `${t('all')} · ${t('stylePref')}`), styleSet.map((s) => h('option', { value: s }, styleName(s))));
  render();
  const el = h('div', { class: 'view' }, topbar(occName(o, lang)), h('div', { class: 'scroll' },
    h('div', { class: 'row wrap', style: { marginBottom: '10px' } }, seg([['all', t('all')], ['free', t('free')], ['pro', t('pro')]], 'all', (v) => { filter = v; render(); })), h('div', { class: 'row', style: { marginBottom: '12px' } }, h('div', { class: 'grow' }, sel), h('span', { class: 'muted' }, `${all.length} ${t('tplCount')}`)), grid));
  return { el };
});

register('smart', async () => {
  const st = { occ: 'wedding', names: '', color: '', style: '', n: 6 }, out = h('div', { class: 'tpl-grid' }), lang = uiLang() === 'en' ? 'en' : 'fa';
  const occSel = h('select', { class: 'input', onchange: (e) => (st.occ = e.target.value) }, Object.keys(GROUPS).map((g) => h('optgroup', { label: groupName(g, lang) }, OCCASIONS.filter((o) => o.g === g).map((o) => h('option', { value: o.id, selected: o.id === st.occ }, occName(o, lang))))));
  const names = h('input', { class: 'input', placeholder: t('names'), oninput: (e) => (st.names = e.target.value) });
  const colorSel = h('select', { class: 'input', onchange: (e) => (st.color = e.target.value) }, COLOR_CHOICES.map(([k]) => h('option', { value: k }, k ? COLOR_NAMES[k][ui()] : t('any'))));
  const styleSel = h('select', { class: 'input', onchange: (e) => (st.style = e.target.value) }, h('option', { value: '' }, t('any')), STYLE_IDS.map((s) => h('option', { value: s }, styleName(s))));
  const go2 = () => {
    out.replaceChildren(); const list = suggestDesigns({ occ: st.occ, lang: cardLang(), colorPref: st.color, stylePref: st.style, n: 6, seed: st.names + Date.now() });
    for (const d of list) {
      const tpl = { ...findTemplate(d.id), id: d.id };
      const card = tplCard(tpl, { onPick: () => startWith(d.id) });
      card.append(h('div', { class: 'cap', style: { flexDirection: 'column', gap: '2px' } }, h('span', null, `${d.fonts[0] || ''}`), h('span', { style: { display: 'flex', gap: '3px' } }, [d.colors.a, d.colors.a2, d.colors.d].map((c) => h('i', { style: { width: '14px', height: '14px', borderRadius: '50%', background: c, display: 'inline-block', border: '1px solid rgba(255,255,255,.3)' } })), h('small', null, ` ${d.bg} · ${d.motifs.join(' ')}`))));
      out.append(card);
    }
  };
  const startWith = async (id) => { const { startCard: sc } = await import('./views-home.js'); const card = cardFromTemplate(id, { lang: cardLang() }); const nm = st.names.trim(); if (nm) { const kind = occById[st.occ].k; card.data[['wedding', 'engagement', 'aghd', 'anniversary', 'meetAnniversary', 'romantic'].includes(st.occ) ? 'couple' : 'honoree'] = nm; if (kind === 'brand') card.data.company = nm; } if (!canUseTemplate(findTemplate(id))) return premiumInfo(); go('form', { card, isNew: true }); };
  const el = h('div', { class: 'view' }, topbar(t('smartTitle')), h('div', { class: 'scroll' }, h('p', { class: 'muted' }, t('smartHint')), field(t('occasion'), occSel), field(t('names'), names), h('div', { class: 'row' }, h('div', { class: 'grow' }, field(t('colorPref'), colorSel)), h('div', { class: 'grow' }, field(t('stylePref'), styleSel))), h('button', { class: 'btn primary block', onclick: go2 }, ic('wand'), t('suggest')), h('div', { style: { height: '14px' } }), out));
  go2(); return { el };
});
