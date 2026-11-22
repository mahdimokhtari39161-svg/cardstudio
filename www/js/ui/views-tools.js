// Bulk personalised cards (CSV / Excel / pasted list) and animated cards (preview, GIF, video).
import { h, ic, modal, toast, field, seg, pickFile, clear } from './dom.js';
import { t, uiLang } from '../core/i18n.js';
import { register, go, topbar } from './router.js';
import { listCards, getCard, Store, saveCard } from '../core/storage.js';
import { occById, occName } from '../data/occasions.js';
import { clone, slug, uid } from '../core/util.js';
import { refreshCard } from '../templates/engine.js';
import { readTable, tableFromPaste, guessMapping } from '../io/sheet.js';
import { prepare, renderBlob, renderPDF, buildPDF, renderVariant } from '../io/export.js';
import { zipStore } from '../io/zip.js';
import { saveToDevice, shareFiles } from '../io/native.js';
import { newGuest } from '../logic/guests.js';
import { ensureFonts, Assets } from '../gfx/render.js';
import { buildScene, Player, IN_EFFECTS, PARTICLES, OPEN_FX, FX_LABEL } from '../gfx/anim.js';
import { encodeGIF, recordVideo, videoSupport } from '../io/gif.js';
import { needsWatermark } from '../core/entitlements.js';
import { L } from './views-manage.js';

const TARGETS = [['guest', L('نام مهمان', 'Guest name')], ['guestTitle', L('عنوان مهمان', 'Guest title')], ['table', L('شماره میز', 'Table')], ['phone', L('تلفن (برای ارسال)', 'Phone (for sending)')], ['custom', L('متن اختصاصی', 'Custom text')], ['notes', L('توضیحات', 'Notes')]];
const tl = () => TARGETS.map(([k]) => k);

register('bulk', async ({ id, eventId }) => {
  let card = id ? await getCard(id) : null; const cards = await listCards(); let ev = eventId ? await Store.get('events', eventId) : null;
  let table = { headers: [], rows: [] }, map = {}, fmt = 'png';
  const box = h('div'), out = h('div'), prog = h('div', { class: 'progress', style: { display: 'none' } }, h('i'));
  const sel = h('select', { class: 'input', onchange: async () => { card = await getCard(sel.value); render(); } }, h('option', { value: '' }, L('— انتخاب کارت —', '— choose a card —')), ...cards.map((c) => h('option', { value: c.id, selected: card?.id === c.id }, c.name || occName(occById[c.occasion], c.lang) || c.id)));
  const ta = h('textarea', { class: 'input', rows: 4, dir: 'auto', placeholder: L('نام‌ها را اینجا بچسبانید (هر خط یک مهمان؛ ستون‌ها با کاما یا تب)', 'Paste names here (one guest per line; columns by comma or tab)') });
  const loadTable = (tb) => { table = tb; map = guessMapping(tb.headers); render(); };
  const fromEvent = () => { if (!ev?.guests?.length) return toast(L('رویداد مهمانی ندارد', 'Event has no guests')); loadTable({ headers: ['name', 'title', 'table', 'phone'], rows: ev.guests.map((g) => [g.name, g.title, g.table, g.phone]) }); };
  const rowCard = (r) => { const c = clone(card); c.id = uid('c'); const d = c.data = { ...c.data }; c.sample = false; const at = (k) => (map[k] != null && map[k] >= 0 ? String(r[map[k]] ?? '').trim() : ''); const name = at('guest'), ttl = at('guestTitle'); d.guest = [ttl, name].filter(Boolean).join(' '); for (const k of ['custom', 'notes']) if (at(k)) d[k] = at(k); if (at('table')) c.extras = [...(c.extras || []), { id: uid('x'), label: L('میز', 'Table'), value: at('table') }]; refreshCard(c); return { c, name }; };
  function render() {
    clear(box);
    if (!card) { box.append(h('p', { class: 'muted' }, L('اول کارت پایه را انتخاب کنید.', 'Choose the base card first.'))); return; }
    box.append(
      h('div', { class: 'row wrap' }, h('button', { class: 'btn', onclick: async () => { const [f] = await pickFile('.csv,.xlsx,.xlsm,.txt,text/csv'); if (!f) return; try { loadTable(await readTable(f)); } catch (e) { toast(e.message === 'xls-unsupported' ? L('فرمت .xls پشتیبانی نمی‌شود؛ فایل را به xlsx یا CSV ذخیره کنید.', '.xls is not supported; save as xlsx or CSV.') : L('فایل خوانده نشد', 'Cannot read file')); } } }, ic('file'), L('CSV / Excel', 'CSV / Excel')), ev ? h('button', { class: 'btn', onclick: fromEvent }, ic('users'), L('از مهمانان رویداد', 'From event guests')) : null),
      h('div', { style: { height: '8px' } }), ta, h('button', { class: 'btn small', style: { marginTop: '6px' }, onclick: () => { const tb = tableFromPaste(ta.value); if (!tb.rows.length) return toast(L('متنی نیست', 'Nothing pasted')); loadTable(tb); } }, L('خواندن متن', 'Read text')));
    if (table.rows.length) {
      box.append(h('div', { class: 'sec-title' }, h('span', null, `${L('ستون‌ها', 'Columns')} · ${table.rows.length} ${L('ردیف', 'rows')}`)),
        ...TARGETS.map(([k, lab]) => field(lab, h('select', { class: 'input', onchange: (e) => { map[k] = e.target.value === '' ? undefined : +e.target.value; preview(); } }, h('option', { value: '' }, '—'), ...table.headers.map((hd, i) => h('option', { value: i, selected: map[k] === i }, hd))))),
        h('div', { class: 'sec-title' }, h('span', null, L('پیش‌نمایش', 'Preview'))), out,
        seg([['png', 'PNG'], ['jpg', 'JPG'], ['pdf', 'PDF']], fmt, (v) => (fmt = v)), prog,
        h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn primary grow', onclick: () => generate('zip') }, ic('download'), fmt === 'pdf' ? 'PDF' : 'ZIP'), h('button', { class: 'btn grow', onclick: () => generate('share') }, ic('share'), L('اشتراک تک‌تک', 'Share'))));
      preview();
    }
  }
  let pseq = 0;
  async function preview() {
    if (!table.rows.length || map.guest == null) return out.replaceChildren(h('p', { class: 'muted' }, L('ستون نام مهمان را انتخاب کنید.', 'Pick the guest-name column.')));
    const my = ++pseq; await prepare(card); if (my !== pseq) return; out.replaceChildren(...table.rows.slice(0, 3).map((r) => { const { c } = rowCard(r); const cv = renderVariant(c, 0, 'png', { width: 320, watermark: false }); cv.style.cssText = 'height:200px;width:auto;border-radius:8px;margin-inline-end:8px'; return cv; }));
  }
  async function generate(mode) {
    if (map.guest == null) return toast(L('ستون نام مهمان را انتخاب کنید', 'Pick the guest-name column'));
    prog.style.display = ''; const bar = prog.firstChild; const rows = table.rows.filter((r) => String(r[map.guest] ?? '').trim()); const files = [], used = new Set(), cs = [];
    try {
      await prepare(card);
      for (let i = 0; i < rows.length; i++) {
        const { c, name } = rowCard(rows[i]); let base = slug(name) || `guest_${i + 1}`; while (used.has(base)) base += '_' + (i + 1); used.add(base);
        if (fmt === 'pdf') cs.push(renderVariant(c, 0, 'png', { width: 1500 })); else files.push({ blob: await renderBlob(c, 0, fmt), name: `${base}.${fmt}`, row: rows[i] });
        bar.style.width = Math.round(((i + 1) / rows.length) * 90) + '%'; if (i % 4 === 3) await new Promise((r) => setTimeout(r)); }
      if (fmt === 'pdf') { const blob = await buildPDF(cs); const r = mode === 'share' ? await shareFiles([{ blob, name: 'cards.pdf' }], {}) : await saveToDevice(blob, `${slug(card.name || 'cards')}.pdf`); toast(L('انجام شد', 'Done')); }
      else if (mode === 'share') { for (const f of files) { try { await shareFiles([f], { title: f.name }); } catch (e) { if (e?.name === 'AbortError') break; throw e; } } }
      else { const parts = []; for (const f of files) parts.push({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) }); const zip = new Blob([zipStore(parts)], { type: 'application/zip' }); const r = await saveToDevice(zip, `${slug(card.name || 'cards')}_${files.length}.zip`); toast(r.ok ? `${files.length} ${L('کارت ساخته شد', 'cards created')}` : L('ناموفق', 'Failed'), 3000); }
      bar.style.width = '100%';
    } catch (e) { toast(L('ناموفق: ', 'Failed: ') + (e.message || e), 4000); }
    setTimeout(() => (prog.style.display = 'none'), 700);
  }
  const el = h('div', { class: 'view' }, topbar(L('کارت‌های مهمان (گروهی)', 'Personalised guest cards')), h('div', { class: 'scroll' }, field(L('کارت پایه', 'Base card'), sel), box));
  render();
  return { el };
});

register('animate', async ({ id }) => {
  const card = await getCard(id); if (!card) { go('home', {}, { reset: true }); return { el: h('div') }; }
  card.fx ||= { particles: 'none', open: 'none', shimmer: false, music: '', musicName: '' };
  await ensureFonts(card); await Assets.preload(card);
  const cv = h('canvas', { style: { maxWidth: '100%', maxHeight: '48vh', borderRadius: '10px', background: '#000' } });
  let scene, player, audio = null, audioUrl = '';
  const rebuild = (play = true) => { player?.stop(); scene = buildScene(card, 0); player = new Player(cv, scene, Math.min(0.55, 520 / card.pages[0].w)); if (audio) player.setAudio(audio); player.seek(scene.duration); if (play) { player.t = 0; player.play(); } };
  const save = () => Store.put('cards', { ...card, updatedAt: Date.now() });
  const optSeg = (list, key, def) => h('div', { class: 'fx-grid' }, list.map((k) => h('button', { class: (card.fx[key] || def) === k ? 'on' : '', onclick: (e) => { card.fx[key] = k; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.target.classList.add('on'); save(); rebuild(); } }, FX_LABEL[k]?.[uiLang() === 'en' ? 1 : 0] || k)));
  const prog = h('div', { class: 'progress', style: { display: 'none', margin: '8px 0' } }, h('i'));
  const run = async (kind, story) => {
    prog.style.display = ''; const bar = prog.firstChild; bar.style.width = '4%'; player.stop();
    try {
      const sc = buildScene(card, 0); const onProgress = (p) => (bar.style.width = Math.round(p * 95) + '%');
      let blob, name = slug(card.name || 'card');
      if (kind === 'gif') { blob = await encodeGIF(sc, { width: story ? 405 : 480, story, onProgress }); name += story ? '_story.gif' : '.gif'; }
      else { const v = videoSupport(); if (!v) throw new Error(L('این دستگاه ضبط ویدیو را پشتیبانی نمی‌کند؛ از GIF استفاده کنید.', 'Video recording is not supported here; use GIF.')); const rv = await recordVideo(sc, { width: story ? 540 : 720, story, audioUrl, onProgress }); blob = rv.blob; name += (story ? '_story' : '') + '.' + rv.ext; }
      const r = await saveToDevice(blob, name); bar.style.width = '100%'; toast(r.ok ? L('ذخیره شد', 'Saved') + (name.endsWith('.webm') ? ' (WebM)' : '') : L('ناموفق', 'Failed'), 3000);
      if (r.ok && r.where === 'documents') toast(L('ذخیره شد در Documents/CardStudio', 'Saved to Documents/CardStudio'), 3500);
      return blob;
    } catch (e) { toast(L('ناموفق: ', 'Failed: ') + (e.message || e), 4500); } finally { setTimeout(() => (prog.style.display = 'none'), 700); rebuild(false); }
  };
  const musicLbl = h('span', { class: 'muted' }, card.fx.musicName || L('بدون موسیقی', 'No music'));
  const el = h('div', { class: 'view' }, topbar(L('کارت متحرک', 'Animated card'), { right: [h('button', { class: 'icon-btn', onclick: () => { player.t = 0; player.play(); }, 'aria-label': 'play' }, ic('play'))] }),
    h('div', { class: 'scroll' }, h('div', { style: { textAlign: 'center' } }, cv),
      field(L('ورود متن', 'Text entrance'), optSeg(IN_EFFECTS, 'textIn', 'rise')), field(L('افکت باز شدن', 'Opening effect'), optSeg(OPEN_FX, 'open', 'none')), field(L('ذرات', 'Particles'), optSeg(PARTICLES, 'particles', 'none')),
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: !!card.fx.shimmer, onchange: (e) => { card.fx.shimmer = e.target.checked; save(); rebuild(); } }), L('درخشش طلایی روی متن', 'Shimmer on text')),
      field(L('موسیقی (فایل خودتان، اختیاری)', 'Music (your own file, optional)'), h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: async () => { const [f] = await pickFile('audio/*'); if (!f) return; if (audioUrl) URL.revokeObjectURL(audioUrl); audioUrl = URL.createObjectURL(f); audio = new Audio(audioUrl); player.setAudio(audio); card.fx.musicName = f.name; musicLbl.textContent = f.name; } }, ic('music', 16), L('انتخاب', 'Choose')), h('button', { class: 'btn small', onclick: () => { audio?.pause(); audio = null; audioUrl = ''; player.setAudio(null); card.fx.musicName = ''; musicLbl.textContent = L('بدون موسیقی', 'No music'); } }, ic('close', 16)), musicLbl)),
      needsWatermark() ? h('p', { class: 'muted', style: { fontSize: '12.5px' } }, t('watermarkNote')) : null, prog,
      h('div', { class: 'row wrap' }, h('button', { class: 'btn primary', onclick: () => run('gif', false) }, ic('download'), 'GIF'), h('button', { class: 'btn primary', onclick: () => run('video', false) }, ic('film'), L('ویدیو', 'Video')), h('button', { class: 'btn', onclick: () => run('video', true) }, ic('film'), L('ویدیو استوری/وضعیت', 'Story / status video')), h('button', { class: 'btn', onclick: () => run('gif', true) }, 'GIF story'))));
  return { el, onShow: () => rebuild(true), destroy: () => { player?.stop(); audio?.pause(); if (audioUrl) URL.revokeObjectURL(audioUrl); save(); } };
});
