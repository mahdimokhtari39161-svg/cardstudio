// Event information form with live preview, and text suggestions.
import { h, ic, modal, toast, field, seg, chips } from './dom.js';
import { t, uiLang } from '../core/i18n.js';
import { register, go, back, topbar } from './router.js';
import { occById, occName } from '../data/occasions.js';
import { LANGS, LANG_NAMES } from '../data/fonts.js';
import { refreshCard } from '../templates/engine.js';
import { retemplate } from '../templates/registry.js';
import { COUPLE_OCC, PERSON_OCC } from '../templates/samples.js';
import { renderPageToCanvas, ensureFonts } from '../gfx/render.js';
import { saveCard } from '../core/storage.js';
import { textSuggestions, TONES, TONE_LABEL, aiText } from '../logic/suggest.js';
import { Settings } from '../core/storage.js';
import { uid, debounce, RTL_LANGS } from '../core/util.js';
import { DATA_FIELDS } from '../core/model.js';

const ti = () => (uiLang() === 'en' ? 1 : 0);

function mainFields(occ) {
  const k = occ.k, id = occ.id, who = COUPLE_OCC.has(id) ? 'couple' : PERSON_OCC.has(id) ? 'honoree' : '';
  if (k === 'brand') return ['company', 'honoree', 'title', 'phone', 'email', 'address', 'map'];
  if (k === 'invite') return [who, occ.g === 'business' ? 'company' : 'host', 'title', 'dateISO', 'timeStart', 'timeEnd', 'venue', 'address', 'phone'].filter(Boolean);
  if (k === 'condolence') return ['honoree', 'inviter', 'body'];
  return ['guest', who || 'honoree', 'inviter', 'title', 'body'];
}

register('form', async ({ card, isNew, fromEditor }) => {
  const occ = occById[card.occasion], main = mainFields(occ), lang0 = card.lang;
  const prev = h('div', { class: 'preview-wrap', style: { margin: '10px 16px 0', maxHeight: '34vh', overflow: 'hidden' } });
  let seq = 0;
  const draw = debounce(async () => {
    const my = ++seq; refreshCard(card); await ensureFonts(card); if (my !== seq) return;
    const cv = renderPageToCanvas(card, 0, 420); cv.style.maxHeight = '32vh'; cv.style.width = 'auto'; cv.style.height = '32vh'; prev.replaceChildren(cv);
  }, 90);
  const inputFor = (key) => {
    const type = DATA_FIELDS.find((f) => f[0] === key)?.[1] || 'text';
    const set = (v) => { card.data[key] = v; draw(); };
    const val = card.data[key] || '';
    if (type === 'area') return h('textarea', { class: 'input', rows: 3, oninput: (e) => set(e.target.value) }, val);
    return h('input', { class: 'input', type: type === 'text' ? 'text' : type, value: val, dir: type === 'tel' || type === 'email' || type === 'url' ? 'ltr' : 'auto', oninput: (e) => set(e.target.value) });
  };
  const mk = (key) => field(t(key), inputFor(key));
  const more = h('div', { style: { display: 'none' } }, DATA_FIELDS.map((f) => f[0]).filter((k) => !main.includes(k) && k !== 'custom').map(mk), mk('custom'));
  const moreBtn = h('button', { class: 'btn block', onclick: () => { const open = more.style.display === 'none'; more.style.display = open ? '' : 'none'; moreBtn.textContent = open ? '▲' : '▼ ' + t('all') + ' …'; } }, '▼ ' + t('all') + ' …');
  // custom extra fields
  const extrasBox = h('div');
  const renderExtras = () => { extrasBox.replaceChildren(...(card.extras || []).map((e) => h('div', { class: 'row', style: { marginBottom: '8px' } }, h('input', { class: 'input grow', placeholder: t('fieldLabel'), value: e.label, oninput: (ev) => { e.label = ev.target.value; draw(); } }), h('input', { class: 'input grow', placeholder: t('fieldValue'), value: e.value, oninput: (ev) => { e.value = ev.target.value; draw(); } }), h('button', { class: 'icon-btn', onclick: () => { card.extras = card.extras.filter((x) => x !== e); renderExtras(); draw(); } }, ic('trash'))))); };
  renderExtras();
  const addExtra = h('button', { class: 'btn small', onclick: () => { (card.extras ||= []).push({ id: uid('x'), label: '', value: '' }); renderExtras(); } }, ic('plus', 16), t('addField'));
  // language + calendar
  const langSeg = chips(LANGS.map((l) => [l, LANG_NAMES[l]]), card.lang, async (l) => { card.lang = l; retemplate(card, card.tplId); card.sample = card.sample; draw(); await Settings.set('cardLang', l); });
  const calSeg = seg([['persian', t('persian')], ['gregorian', t('gregorian')], ['islamic', t('islamic')]], card.calendar || (card.lang === 'fa' ? 'persian' : 'gregorian'), (c) => { card.calendar = c; draw(); });
  const suggestBtn = h('button', { class: 'btn small', onclick: () => openSuggest() }, ic('wand', 16), t('suggestText'));
  function openSuggest() {
    const list = h('div', { class: 'list' }); let tone = '';
    const render = () => { list.replaceChildren(...textSuggestions(card.occasion, card.lang, tone || null).map((s) => h('button', { class: 'list-item', style: { textAlign: 'start', width: '100%' }, onclick: () => { card.data.body = s.text; refreshCard(card); m.close(); back2(); } }, h('div', null, h('small', null, TONE_LABEL[s.tone][ti()]), h('div', { dir: RTL_LANGS.includes(card.lang) ? 'rtl' : 'ltr', style: { lineHeight: 1.8 } }, s.text))))); };
    const toneSeg = seg([['', t('all')], ...TONES.map((x) => [x, TONE_LABEL[x][ti()]])], '', (v) => { tone = v; render(); });
    const ai = Settings.get('aiEndpoint') ? h('button', { class: 'btn small', onclick: async (e) => { e.target.disabled = true; try { const txt = await aiText({ endpoint: Settings.get('aiEndpoint'), key: Settings.get('aiKey'), model: Settings.get('aiModel'), prompt: `Write a ${tone || 'warm'} card text in language "${card.lang}" for the occasion "${occName(occ, card.lang)}". Max 2 sentences.` }); list.prepend(h('button', { class: 'list-item', style: { textAlign: 'start', width: '100%' }, onclick: () => { card.data.body = txt; refreshCard(card); m.close(); back2(); } }, h('div', { style: { lineHeight: 1.8 } }, '✦ ', txt))); } catch (er) { toast(t('failed') + ': ' + er.message); } e.target.disabled = false; } }, ic('sparkle', 16), 'AI') : null;
    render(); const m = modal(t('suggestText'), h('div', null, toneSeg, h('div', { style: { height: '10px' } }), ai, list), { sheet: true });
  }
  const back2 = () => { prev.replaceChildren(); draw(); document.querySelectorAll('textarea,input').forEach((i) => { if (i.type !== 'search' && card.data) { /* refresh visible values */ } }); go('form', { card, isNew, fromEditor }, { replace: true }); };

  const proceed = async () => {
    card.sample = false; refreshCard(card); await ensureFonts(card);
    const thumb = renderPageToCanvas(card, 0, 260).toDataURL('image/jpeg', 0.7); await saveCard(card, thumb);
    if (fromEditor) { await go('editor', { id: card.id }, { replace: true }); } else go('editor', { id: card.id }, { replace: true });
  };
  const el = h('div', { class: 'view' }, topbar(t('fillInfo'), { right: [h('span', { class: 'pill' }, occName(occ, uiLang() === 'en' ? 'en' : 'fa'))] }), prev,
    h('div', { class: 'scroll' }, h('p', { class: 'muted', style: { marginTop: 0 } }, t('fillHint')),
      field(t('language'), langSeg), field(t('calendar'), calSeg), h('div', { class: 'row wrap', style: { marginBottom: '12px' } }, suggestBtn), main.map(mk), moreBtn, more, h('div', { style: { height: '8px' } }), extrasBox, addExtra, h('div', { style: { height: '16px' } }),
      h('button', { class: 'btn primary block', onclick: proceed }, ic('edit'), t('toEditor'))));
  draw();
  return { el };
});
