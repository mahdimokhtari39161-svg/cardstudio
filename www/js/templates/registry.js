// Template registry. Templates are generated from (occasion × style × variant) so thousands of designs exist
// without storing them. External packs can be added with registerPack() – no app changes needed.
import { STYLES, STYLE_IDS } from './styles.js';
import { OCCASIONS, occById } from '../data/occasions.js';
import { PALETTES, PALETTE_NAMES } from '../data/palettes.js';
import { RTL_LANGS, hashStr } from '../core/util.js';
import { newCard } from '../core/model.js';
import { applyTemplateSpec } from './engine.js';

const KIND_EXCLUDE = {
  condolence: ['kids', 'fantasy', 'threeD', 'artistic', 'romantic', 'blackgold', 'luxe', 'floralgold'],
  sorry: ['kids', 'threeD', 'blackgold'],
  brand: ['kids', 'fantasy', 'romantic', 'floral', 'watercolor'],
};
const ISLAMIC_OCC = new Set(['eidFitr', 'eidAdha', 'ramadan', 'qadr', 'ghadir', 'prophetBirthday', 'religiousEids', 'muharram', 'aghd']);
const PERSIAN_OCC = new Set(['nowruz', 'yalda', 'wedding', 'engagement', 'aghd']);

export function occTags(occ) {
  const t = new Set([occ.k]);
  if (occ.g === 'business') t.add('business'), t.add('official');
  if (occ.g === 'religious') t.add('religious');
  if (['wedding', 'engagement', 'aghd', 'anniversary'].includes(occ.id)) t.add('wedding'), t.add('romantic'), t.add('luxury');
  if (['kidBirthday', 'childrensDay', 'newborn', 'babyShower', 'genderReveal'].includes(occ.id)) t.add('kids'), t.add('fun');
  if (['birthday', 'birthdayParty', 'party', 'newYear', 'christmas'].includes(occ.id)) t.add('party');
  if (ISLAMIC_OCC.has(occ.id)) t.add('islamic');
  if (PERSIAN_OCC.has(occ.id)) t.add('persian'), t.add('traditional');
  if (['nowruz', 'mothersDay', 'daughtersDay', 'welcome', 'thanks'].includes(occ.id)) t.add('floral'), t.add('nature');
  if (occ.k === 'love') t.add('romantic');
  if (['condolence', 'sympathy', 'memorial', 'muharram'].includes(occ.id)) t.add('classic'), t.add('minimal');
  return t;
}

export function paletteKeyFor(occ, v) {
  if (occ.k === 'condolence') return 'mono';
  if (v === 0) return occ.p;
  const i = PALETTE_NAMES.indexOf(occ.p);
  return PALETTE_NAMES[(i + 4 + (hashStr(occ.id) % 3)) % PALETTE_NAMES.length];
}

const cacheList = new Map();
const packs = [];
export function registerPack(pack) { packs.push(pack); cacheList.clear(); } // {id, templates:[{id, occ, name:[fa,en], premium, build(ctx)->spec}]}

export function templatesFor(occId) {
  if (cacheList.has(occId)) return cacheList.get(occId);
  const occ = occById[occId];
  if (!occ) return [];
  const tags = occTags(occ), excl = new Set(KIND_EXCLUDE[occ.k] || []);
  const out = [];
  for (const sid of STYLE_IDS) {
    if (excl.has(sid)) continue;
    const st = STYLES[sid];
    const score = st.tags.filter((t) => tags.has(t)).length + (sid === 'islamic' && ISLAMIC_OCC.has(occ.id) ? 5 : 0) + (sid === 'persian' && PERSIAN_OCC.has(occ.id) ? 5 : 0) + (sid === 'kids' && tags.has('kids') ? 5 : 0);
    for (const v of [0, 1]) out.push({ id: `${occId}.${sid}.${v}`, occ: occId, style: sid, v, premium: st.premium, score: score - v * 0.5, name: st.n });
  }
  for (const pk of packs) for (const t of pk.templates) if (!t.occ || t.occ === occId) out.push({ ...t, occ: occId, pack: pk.id, score: t.score ?? 1 });
  out.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  cacheList.set(occId, out);
  return out;
}
export const allTemplates = () => OCCASIONS.flatMap((o) => templatesFor(o.id));
export function templateCount() { return allTemplates().length; }

export function parseTplId(id) { const [occ, style, v] = id.split('.'); return { occ, style, v: +v || 0 }; }
export function findTemplate(id) { const p = parseTplId(id); return templatesFor(p.occ).find((t) => t.id === id) || null; }

// Build the page spec of a template for a language / page size.
export function buildSpec(tplId, { lang = 'fa', W = 1000, H = 1400, seed } = {}) {
  const t = findTemplate(tplId);
  if (!t) throw new Error('unknown template ' + tplId);
  const occ = occById[t.occ], pal = PALETTES[paletteKeyFor(occ, t.v)];
  const ctx = { W, H, lang, rtl: RTL_LANGS.includes(lang), occ, kind: occ.k === 'brand' ? 'brand' : occ.id === 'condolence' || occ.id === 'sympathy' ? 'condolence' : occ.k, pal, motif: occ.m, alt: t.v === 1, v: t.v, seed: seed || t.id };
  if (t.build) return t.build(ctx);
  return STYLES[t.style].build(ctx);
}

export function defaultSize(occ) {
  if (occ.k === 'brand') return { w: 1050, h: 600 };
  return { w: 1000, h: 1400 };
}

// Create a new card from a template.
export function cardFromTemplate(tplId, { lang = 'fa', w, h, calendar } = {}) {
  const t = findTemplate(tplId), occ = occById[t.occ], size = defaultSize(occ);
  const W = w || size.w, H = h || size.h;
  const card = newCard({ occasion: occ.id, lang, w: W, h: H, tplId, calendar: calendar || (lang === 'fa' ? 'persian' : 'gregorian') });
  card.sample = true; card.tier = t.premium ? 'premium' : 'free';
  card.style = t.style;
  return applyTemplateSpec(card, buildSpec(tplId, { lang, W, H }), tplId);
}

// Switch the visual template of an existing card (keeps data/language).
export function retemplate(card, tplId) {
  const t = findTemplate(tplId), p = card.pages[0], W = p.w, H = p.h;
  const old = card.pages.slice(1);
  applyTemplateSpec(card, buildSpec(tplId, { lang: card.lang, W, H }), tplId);
  card.pages.push(...old);
  card.tier = t.premium ? 'premium' : 'free'; card.style = t.style; card.occasion = t.occ || card.occasion;
  return card;
}

export function searchOccasions(q, lang) {
  q = String(q || '').trim().toLowerCase();
  if (!q) return OCCASIONS;
  return OCCASIONS.filter((o) => o.n.some((n) => n.toLowerCase().includes(q)) || o.id.toLowerCase().includes(q));
}
