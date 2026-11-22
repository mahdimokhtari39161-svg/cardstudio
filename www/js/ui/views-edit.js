// Editor screen: tools, contextual property panels, layers, pages, backgrounds, graphics, export.
import { h, ic, modal, toast, field, seg, chips, confirmBox, promptBox, pickFile, prepareImage, clear, readFileAs, loadImageSize } from './dom.js';
import { t, uiLang } from '../core/i18n.js';
import { register, go, back, topbar } from './router.js';
import { Editor } from '../editor/editor.js';
import { Settings, getCard, saveCard, Store, listPersonalTemplates } from '../core/storage.js';
import { occById, occName } from '../data/occasions.js';
import { FONTS, fontsForLang, fontStack } from '../data/fonts.js';
import { SWATCHES, GRADIENT_PRESETS, PALETTES } from '../data/palettes.js';
import { CLIPS, CLIP_CATS } from '../gfx/cliparts.js';
import { clipThumb, tplThumb } from './thumbs.js';
import { templatesFor, retemplate, findTemplate } from '../templates/registry.js';
import { applyTemplateSpec, refreshCard } from '../templates/engine.js';
import { renderPageToCanvas, ensureFonts, Assets } from '../gfx/render.js';
import { PAGE_PRESETS } from '../core/model.js';
import { uid, debounce, clone } from '../core/util.js';
import { SIZES, prepare, renderBlob, fileName, renderPDF, renderVariant } from '../io/export.js';
import { saveToDevice, shareFiles, printImages, copyText, openExternal, waLink, tgLink, mailLink } from '../io/native.js';
import { needsWatermark, canUseTemplate } from '../core/entitlements.js';
import { zipStore } from '../io/zip.js';
import { styleName, premiumInfo } from './views-home.js';
import { ENVELOPES, MOODS, moodFor, envelopeFor, buildEnvelopeHTML } from '../io/envelope.js';

const ti = () => (uiLang() === 'en' ? 1 : 0);
const lbl = (pair) => pair[ti()];

function slider(label, min, max, step, value, onInput, fmt = (v) => v) {
  const out = h('span', null, fmt(value)), inp = h('input', { type: 'range', min, max, step, value, oninput: (e) => { out.textContent = fmt(+e.target.value); onInput(+e.target.value); } });
  return h('label', { class: 'mini' }, h('span', { class: 'row', style: { justifyContent: 'space-between' } }, label, out), inp);
}
function colorField(label, value, onInput, { allowNone = false } = {}) {
  const inp = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000', oninput: (e) => onInput(e.target.value) });
  return h('label', { class: 'mini' }, h('span', null, label), inp, h('div', { class: 'swatches' }, SWATCHES.map((c) => h('button', { type: 'button', style: { background: c }, onclick: () => { inp.value = c; onInput(c); } })), allowNone ? h('button', { type: 'button', style: { background: 'transparent' }, onclick: () => onInput(''), 'aria-label': 'none' }, '∅') : null));
}
const iconBtn = (icon, title, fn, on) => h('button', { class: `icon-btn ${on ? 'on' : ''}`, title, 'aria-label': title, onclick: fn }, ic(icon));

register('editor', async ({ id }) => {
  const card = await getCard(id); if (!card) { toast(t('error')); await back(); return { el: h('div') }; }
  if (!card.assets) card.assets = {};
  await ensureFonts(card); await Assets.preload(card);
  const stage = h('div', { class: 'editor-stage' }), ctxPanel = h('div', { class: 'ed-ctx', style: { display: 'none' } }), tools = h('div', { class: 'ed-tools' });
  let ed, saving = false;
  const lang = card.lang, u = () => ed.page.w / 1000;
  const save = async (quiet) => {
    if (saving) return; saving = true;
    try { await ensureFonts(card); const thumb = renderPageToCanvas(card, 0, 260).toDataURL('image/jpeg', 0.7); await saveCard(card, thumb); ed.dirty = false; if (!quiet) toast(t('autosaved')); } catch (e) { toast(t('error') + ': ' + (e.message || e)); } finally { saving = false; }
  };
  const autosave = debounce(() => save(true), 900);

  // ---------- top bar
  const undoB = iconBtn('undo', t('undo'), () => ed.undo()), redoB = iconBtn('redo', t('redo'), () => ed.redo());
  const nameBtn = h('button', { class: 'grow', style: { background: 'none', border: 0, textAlign: 'start', fontWeight: 700, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, onclick: async () => { const n = await promptBox(t('rename'), card.name || ''); if (n != null) { card.name = n.trim(); nameBtn.textContent = card.name || occName(occById[card.occasion], lang) || t('untitled'); ed.changed(); } } }, card.name || occName(occById[card.occasion], lang) || t('untitled'));
  const top = h('header', { class: 'ed-top' }, h('button', { class: 'icon-btn', onclick: async () => { await save(true); go('home', {}, { reset: true }); }, 'aria-label': t('back') }, h('span', { class: 'flip-rtl' }, ic('back'))), nameBtn, undoB, redoB, iconBtn('film', t('animate'), async () => { await save(true); go('animate', { id: card.id }); }), iconBtn('share', t('export'), () => openExport()));
  const refreshUR = () => { if (!ed) return; undoB.disabled = !ed.canUndo; redoB.disabled = !ed.canRedo; };

  // ---------- context panel
  const rebuildCtx = () => {
    if (!ed) return; clear(ctxPanel); const s = ed.selected; refreshUR();
    if (!s.length) { ctxPanel.style.display = 'none'; return; }
    ctxPanel.style.display = ''; const one = ed.one;
    ctxPanel.append(commonRow(s, one));
    if (one) ctxPanel.append(...propsFor(one));
    else ctxPanel.append(h('div', { class: 'row wrap' }, h('button', { class: 'btn small', onclick: () => ed.distribute('h') }, '⇔'), h('button', { class: 'btn small', onclick: () => ed.distribute('v') }, '⇕'), slider(t('opacity'), 0, 1, 0.05, s[0].opacity ?? 1, (v) => ed.set({ opacity: v }, 'op'), (v) => Math.round(v * 100) + '%')));
  };
  function commonRow(s, one) {
    const A = (name, icn) => iconBtn(icn, name, () => ed.align(name));
    return h('div', { class: 'row', style: { overflowX: 'auto' } },
      A('left', 'alignl'), A('center', 'alignc'), A('right', 'alignr'), A('top', 'alignt'), A('middle', 'alignm'), A('bottom', 'alignb'),
      iconBtn('copy', t('duplicate'), () => ed.duplicateSelected()), iconBtn(s.every((e) => e.locked) ? 'lock' : 'unlock', t('lock'), () => ed.toggleLock(), s.every((e) => e.locked)),
      iconBtn('front', t('front'), () => ed.order('front')), iconBtn('up', t('forward'), () => ed.order('forward')), iconBtn('down', t('backward'), () => ed.order('backward')), iconBtn('backward', t('back2'), () => ed.order('back')),
      iconBtn('palette', t('copyStyle'), () => toast(ed.copyStyle() ? t('copied') : t('error'))), iconBtn('check', t('pasteStyle'), () => ed.pasteStyle()), iconBtn('trash', t('delete'), () => ed.deleteSelected()));
  }
  function propsFor(el) {
    const out = [], R = () => rebuildCtx();
    out.push(slider(t('rotation'), -180, 180, 1, Math.round(((el.rot + 180) % 360) - 180), (v) => ed.set({ rot: v }, 'rot'), (v) => v + '°'), slider(t('opacity'), 0, 1, 0.05, el.opacity ?? 1, (v) => ed.set({ opacity: v }, 'op'), (v) => Math.round(v * 100) + '%'));
    if (el.type === 'text') {
      const fonts = fontsForLang(lang).concat(FONTS.filter((f) => !fontsForLang(lang).includes(f)));
      out.unshift(h('div', { class: 'row', style: { marginBottom: '8px' } }, h('button', { class: 'btn small grow', onclick: () => editText(el) }, ic('edit', 16), t('edit')), h('select', { class: 'input grow', onchange: (e) => ed.set({ font: e.target.value }) }, fonts.map((f) => h('option', { value: f.family, selected: f.family === el.font, style: { fontFamily: fontStack(f.family) } }, f.label)))));
      out.push(
        h('div', { class: 'row' }, slider(t('size'), 10, 300, 1, el.size, (v) => ed.set({ size: v }, 'size')), slider(t('lineHeight'), 0.8, 3, 0.05, el.lh || 1.3, (v) => ed.set({ lh: v }, 'lh'), (v) => v.toFixed(2))),
        h('div', { class: 'row' }, slider(t('letterSpacing'), -5, 40, 0.5, el.ls || 0, (v) => ed.set({ ls: v }, 'ls')), seg([['left', t('alignLeft')], ['center', t('alignCenter')], ['right', t('alignRight')]], el.align, (v) => ed.set({ align: v }))),
        h('div', { class: 'row wrap', style: { margin: '6px 0' } }, iconBtn('bold', t('weight'), () => { ed.set({ weight: el.weight >= 600 ? 400 : 700 }); R(); }, el.weight >= 600), iconBtn('italic', 'Italic', () => { ed.set({ italic: !el.italic }); R(); }, el.italic), h('button', { class: `btn small ${el.upper ? 'primary' : ''}`, onclick: () => { ed.set({ upper: !el.upper }); R(); } }, 'AA'), h('button', { class: `btn small ${el.shadow ? 'primary' : ''}`, onclick: () => { ed.setDeep('shadow', el.shadow ? null : { color: 'rgba(0,0,0,.45)', blur: 8, x: 0, y: 4 }); R(); } }, t('shadow')), h('button', { class: `btn small ${el.stroke ? 'primary' : ''}`, onclick: () => { ed.setDeep('stroke', el.stroke ? null : { w: 3, c: '#ffffff' }); R(); } }, t('stroke')), h('button', { class: `btn small ${el.grad ? 'primary' : ''}`, onclick: () => { ed.setDeep('grad', el.grad ? null : GRADIENT_PRESETS.gold); R(); } }, t('gradient'))),
        colorField(t('color'), el.color, (v) => ed.set({ color: v, grad: null }, 'color')));
      if (el.stroke) out.push(h('div', { class: 'row' }, slider(t('stroke'), 0, 20, 0.5, el.stroke.w, (v) => ed.setDeep('stroke', { ...el.stroke, w: v }, 'sw')), colorField(t('color'), el.stroke.c, (v) => ed.setDeep('stroke', { ...el.stroke, c: v }, 'sc'))));
      if (el.shadow) out.push(h('div', { class: 'row' }, slider(t('shadow'), 0, 40, 1, el.shadow.blur, (v) => ed.setDeep('shadow', { ...el.shadow, blur: v }, 'sh'))));
      if (el.grad) out.push(h('div', { class: 'row wrap' }, ...Object.entries(GRADIENT_PRESETS).map(([k, g]) => h('button', { class: 'btn small', style: { background: `linear-gradient(90deg,${g.join(',')})`, color: '#111', minWidth: '56px' }, onclick: () => ed.setDeep('grad', g) }, k))));
      if (el.stack) out.push(h('p', { class: 'muted', style: { fontSize: '12px', margin: '2px 0' } }, el.free ? '' : '↕ ' + t('autosaved')));
    } else if (el.type === 'shape') {
      out.push(colorField(t('fill'), el.fill || '#c9a24a', (v) => ed.set({ fill: v, grad: null }, 'fill'), { allowNone: true }), h('div', { class: 'row' }, slider(t('stroke'), 0, 40, 1, el.sw || 0, (v) => ed.set({ sw: v, stroke: el.stroke || '#222222' }, 'sw')), colorField(t('stroke'), el.stroke || '#222222', (v) => ed.set({ stroke: v }, 'stc'))));
      if (el.shape === 'round') out.push(slider('R', 0, 300, 1, el.radius || 0, (v) => ed.set({ radius: v }, 'rad')));
    } else if (el.type === 'clip') {
      out.push(h('div', { class: 'row' }, colorField(t('color') + ' 1', el.c1, (v) => ed.set({ c1: v }, 'c1')), colorField(t('color') + ' 2', el.c2 || el.c1, (v) => ed.set({ c2: v }, 'c2'))), h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => { ed.set({ flip: !el.flip }); R(); } }, '⇋'), seg([['none', '—'], ['float', 'float'], ['sway', 'sway'], ['pulse', 'pulse']], el.motion || 'none', (v) => ed.set({ motion: v }))));
    } else if (el.type === 'image') {
      out.push(h('div', { class: 'row wrap' }, seg([['rect', '▭'], ['round', '▢'], ['circle', '◯'], ['arch', '⌓'], ['heart', '♥']], el.mask, (v) => ed.set({ mask: v })), seg([['cover', 'cover'], ['contain', 'contain']], el.fit, (v) => ed.set({ fit: v }))), h('div', { class: 'row' }, slider(t('stroke'), 0, 30, 1, el.border?.w || 0, (v) => ed.setDeep('border', { w: v, c: el.border?.c || '#ffffff' }, 'bw')), colorField(t('color'), el.border?.c || '#ffffff', (v) => ed.setDeep('border', { w: el.border?.w || 6, c: v }, 'bc'))), h('button', { class: 'btn small', onclick: () => replaceImage(el) }, ic('image', 16), t('addPhoto')));
    } else if (el.type === 'qr') {
      out.push(h('div', { class: 'row' }, h('input', { class: 'input grow', value: el.value, dir: 'ltr', oninput: (e) => ed.set({ value: e.target.value }, 'qrv') })), h('div', { class: 'row' }, colorField(t('color'), el.color, (v) => ed.set({ color: v }, 'qc')), colorField(t('background'), el.bg, (v) => ed.set({ bg: v }, 'qb'))));
    } else if (el.type === 'frame') {
      out.push(seg([['line', '—'], ['double', '═'], ['thickthin', '≡'], ['dashed', '┄'], ['dotted', '⋯'], ['rounded', '▢'], ['scallop', '◠'], ['ornate', '❦'], ['deco', '◇']], el.kind, (v) => ed.set({ kind: v })), h('div', { class: 'row' }, colorField(t('color'), el.color, (v) => ed.set({ color: v }, 'fc')), slider(t('stroke'), 1, 30, 1, el.sw, (v) => ed.set({ sw: v }, 'fw'))));
    }
    if (el.stack || el.tpl) out.push(h('button', { class: 'btn small', onclick: () => { ed.relayout(); R(); } }, '↺ ' + t('template')));
    return out;
  }
  const refreshTools = () => tools.querySelectorAll('button[data-tool]').forEach((b) => b.classList.toggle('on', (b.dataset.tool === 'multi' && ed.multi) || (b.dataset.tool === 'grid' && ed.grid) || (b.dataset.tool === 'snap' && ed.snap)));

  // ---------- actions
  function editText(el) {
    const ta = h('textarea', { class: 'input', rows: 6, dir: 'auto', style: { fontFamily: fontStack(el.font) } }); ta.value = el.text || '';
    modal(t('edit'), ta, { actions: [{ label: t('cancel') }, { label: t('ok'), primary: true, onClick: () => { ed.select(el.id); ed.set({ text: ta.value }); ed.changed(); rebuildCtx(); } }] }); setTimeout(() => ta.focus(), 80);
  }
  async function addPhoto(kind = 'photo') {
    const [f] = await pickFile('image/*'); if (!f) return;
    try {
      const im = await prepareImage(f, kind === 'logo' ? 900 : 1800), aid = uid('img'); card.assets[aid] = im.src; await Assets.preload(card);
      ed.addImage(aid, im.w, im.h, kind === 'logo' ? { kind: 'logo', fit: 'contain', mask: 'rect', w: ed.page.w * 0.28, h: ed.page.w * 0.28 * (im.h / (im.w || 1)) } : {});
    } catch (e) { toast(t('error') + ': ' + e.message); }
  }
  async function replaceImage(el) {
    const [f] = await pickFile('image/*'); if (!f) return; const im = await prepareImage(f), aid = uid('img'); card.assets[aid] = im.src; await Assets.preload(card); ed.set({ src: aid }); ed.draw();
  }
  function openClips() {
    const cats = Object.keys(CLIP_CATS), grid = h('div', { class: 'clip-grid' }); let cat = cats[0];
    const c1 = card.pal?.a || '#c9a24a', c2 = card.pal?.a2 || '';
    const render = () => { grid.replaceChildren(...Object.values(CLIPS).filter((c) => c.cat === cat).map((c) => h('button', { title: lbl(c.n), onclick: () => { ed.addClip(c.id, c.cat === 'icons' ? '#222222' : c.id.startsWith('divider') || c.cat === 'frames' ? c1 : c1, c2 && c.cat !== 'icons' ? { c2 } : {}); m.close(); } }, clipThumb(c.id, c.cat === 'icons' ? '#222222' : '#8d6e2f')))); };
    const tabs = seg(cats.map((k) => [k, lbl(CLIP_CATS[k])]), cat, (v) => { cat = v; render(); }); render();
    const m = modal(t('graphic'), h('div', null, tabs, h('div', { style: { height: '10px' } }), grid), { sheet: true });
  }
  function openShapes() {
    const shapes = [['rect', '▭'], ['round', '▢'], ['pill', '⬬'], ['circle', '●'], ['tri', '▲'], ['diamond', '◆'], ['hexagon', '⬢'], ['star', '★'], ['heart', '♥'], ['line', '—']];
    const frames = [['line', '—'], ['double', '═'], ['thickthin', '≡'], ['dashed', '┄'], ['dotted', '⋯'], ['rounded', '▢'], ['scallop', '◠'], ['ornate', '❦'], ['deco', '◇']];
    const m = modal(t('shape'), h('div', null, h('div', { class: 'fx-grid' }, shapes.map(([k, g]) => h('button', { style: { fontSize: '24px' }, onclick: () => { ed.addShape(k); m.close(); } }, g))), h('div', { class: 'sec-title' }, h('span', null, t('frame'))), h('div', { class: 'fx-grid' }, frames.map(([k, g]) => h('button', { style: { fontSize: '22px' }, onclick: () => { ed.addFrame(k, card.pal?.a || '#c9a24a'); m.close(); } }, g)))), { sheet: true });
  }
  function openBackground() {
    const p = ed.page, bg = p.bg || { type: 'color', color: '#fff' }; const box = h('div');
    const pal = card.pal || PALETTES.gold; let tab = bg.type === 'gradient' ? 'grad' : bg.type === 'pattern' ? 'pattern' : bg.type === 'texture' ? 'texture' : bg.type === 'image' ? 'image' : 'solid';
    const render = () => {
      clear(box); const b = ed.page.bg;
      if (tab === 'solid') box.append(colorField(t('color'), b.type === 'color' ? b.color : '#ffffff', (v) => ed.setBackground({ type: 'color', color: v })), h('div', { class: 'swatches' }, [pal.a, pal.a2, pal.d, pal.l, pal.s, '#ffffff', '#000000'].map((c) => h('button', { style: { background: c }, onclick: () => { ed.setBackground({ type: 'color', color: c }); render(); } }))));
      if (tab === 'grad') { const g = b.type === 'gradient' ? b : { type: 'gradient', c1: pal.a2, c2: pal.d, angle: 90 }; const upd = (o) => { ed.setBackground({ ...g, ...o, type: 'gradient' }); Object.assign(g, o); }; box.append(h('div', { class: 'row' }, colorField(t('color') + ' 1', g.c1, (v) => upd({ c1: v })), colorField(t('color') + ' 2', g.c2, (v) => upd({ c2: v }))), slider('°', 0, 360, 5, g.angle ?? 90, (v) => upd({ angle: v, radial: false })), h('button', { class: 'btn small', onclick: () => upd({ radial: !g.radial }) }, 'Radial'), h('div', { class: 'row wrap', style: { marginTop: '8px' } }, [[pal.a2, pal.d], ['#ff5e62', '#ffd166'], ['#00c6ff', '#0072ff'], ['#7b4bd1', '#14919b'], ['#fbf6ea', '#efe3c4'], ['#232526', '#414345']].map(([a, c]) => h('button', { class: 'btn small', style: { background: `linear-gradient(90deg,${a},${c})`, minWidth: '60px' }, onclick: () => { upd({ c1: a, c2: c, c3: undefined }); render(); } }, ' ')))); }
      if (tab === 'pattern') { const g = b.type === 'pattern' ? b : { type: 'pattern', kind: 'dots', color: pal.a2, bg: '#ffffff', size: 60, op: 1 }; const upd = (o) => { Object.assign(g, o); ed.setBackground({ ...g }); }; box.append(seg(['dots', 'stripes', 'grid', 'checks', 'diamonds', 'crosses', 'waves', 'star8'].map((k) => [k, k]), g.kind, (v) => upd({ kind: v })), h('div', { class: 'row', style: { marginTop: '8px' } }, colorField(t('color'), g.color, (v) => upd({ color: v })), colorField(t('background'), g.bg, (v) => upd({ bg: v }))), slider(t('size'), 20, 240, 2, g.size || 60, (v) => upd({ size: v }))); }
      if (tab === 'texture') box.append(h('div', { class: 'fx-grid' }, [['marble', { c1: '#f4f2ee', c2: '#7d8590', c3: '#ffffff' }], ['marble', { c1: '#1b1d22', c2: '#8a8f98', c3: '#3a3f48' }], ['galaxy', { c1: '#070b24', c2: '#1b1450', c3: '#0b3b5a' }], ['watercolor', { c1: '#fffdf9', c2: pal.a, c3: pal.a2, m: [pal.a, pal.a2, '#9ed0ff', '#ffd166'] }], ['paper', { c1: '#f6efe0' }]].map(([k, o]) => h('button', { onclick: () => ed.setBackground({ type: 'texture', kind: k, seed: uid('t'), ...o }) }, k))));
      if (tab === 'image') box.append(h('button', { class: 'btn block', onclick: async () => { const [f] = await pickFile('image/*'); if (!f) return; const im = await prepareImage(f, 2000), aid = uid('bg'); card.assets[aid] = im.src; await Assets.preload(card); ed.setBackground({ type: 'image', src: aid, dim: 0 }); render(); } }, ic('image'), t('fromGallery')), b.type === 'image' ? slider('Dim', 0, 0.8, 0.05, b.dim || 0, (v) => ed.setBackground({ ...ed.page.bg, dim: v }), (v) => Math.round(v * 100) + '%') : null);
    };
    const tabs = seg([['solid', t('solid')], ['grad', t('gradient')], ['pattern', t('pattern')], ['texture', t('texture')], ['image', t('image')]], tab, (v) => { tab = v; render(); }); render();
    modal(t('background'), h('div', null, tabs, h('div', { style: { height: '10px' } }), box), { sheet: true });
  }
  function openLayers() {
    const list = h('div', { class: 'list' });
    const render = () => {
      list.replaceChildren(...[...ed.page.elements].reverse().map((e) => h('div', { class: `layer ${ed.sel.has(e.id) ? 'sel' : ''} ${e.hidden ? 'hid' : ''}` },
        h('button', { class: 'nm', style: { background: 'none', border: 0, textAlign: 'start' }, onclick: () => { ed.select(e.id); render(); rebuildCtx(); } }, `${e.type === 'text' ? '𝐓 ' + String(e.text || '').slice(0, 22) : e.type === 'clip' ? '✦ ' + (CLIPS[e.clip] ? lbl(CLIPS[e.clip].n) : e.clip) : e.type === 'image' ? '🖼 ' + t('image') : e.type === 'shape' ? '◆ ' + e.shape : e.type === 'qr' ? '▦ QR' : '▢ ' + t('frame')}`),
        iconBtn(e.hidden ? 'eyeoff' : 'eye', t('hide'), () => { ed.toggleHide(e.id); render(); }), iconBtn(e.locked ? 'lock' : 'unlock', t('lock'), () => { ed.toggleLock([e.id]); render(); }),
        iconBtn('up', t('forward'), () => { ed.moveLayer(e.id, ed.page.elements.indexOf(e) + 1); render(); }), iconBtn('down', t('backward'), () => { ed.moveLayer(e.id, ed.page.elements.indexOf(e) - 1); render(); }), iconBtn('trash', t('delete'), () => { if (!e.locked) { ed.select(e.id); ed.deleteSelected(); render(); } }))));
    };
    render(); modal(t('layers'), list, { sheet: true });
  }
  function openPages() {
    const box = h('div'); const render = () => {
      clear(box);
      box.append(h('div', { class: 'row wrap' }, ed.card.pages.map((_, i) => h('button', { class: `btn small ${i === ed.pageIdx ? 'primary' : ''}`, onclick: () => { ed.gotoPage(i); render(); rebuildCtx(); } }, i + 1)), h('button', { class: 'btn small', onclick: () => { ed.addPage(false); render(); } }, ic('plus', 16), t('addPage')), h('button', { class: 'btn small', onclick: () => { ed.addPage(true); render(); } }, ic('copy', 16), t('duplicate')), h('button', { class: 'btn small danger', onclick: () => { if (!ed.deletePage()) toast(t('error')); render(); } }, ic('trash', 16), t('delPage'))),
        h('div', { class: 'sec-title' }, h('span', null, t('size'))), h('div', { class: 'fx-grid' }, Object.entries(PAGE_PRESETS).map(([k, v]) => h('button', { class: ed.page.w === v.w && ed.page.h === v.h ? 'on' : '', onclick: () => { ed.resizePage(v.w, v.h); render(); } }, lbl(v.n), h('br'), h('small', { class: 'muted' }, `${v.w}×${v.h}`)))));
      const w = h('input', { class: 'input', type: 'number', value: ed.page.w, min: 200, max: 6000 }), hh = h('input', { class: 'input', type: 'number', value: ed.page.h, min: 200, max: 6000 });
      box.append(h('div', { class: 'row', style: { marginTop: '10px' } }, field(t('width'), w), field(t('height'), hh), h('button', { class: 'btn', onclick: () => { ed.resizePage(Math.min(6000, Math.max(200, +w.value || 1000)), Math.min(6000, Math.max(200, +hh.value || 1400))); render(); } }, t('ok'))));
    }; render(); modal(t('pages'), box, { sheet: true });
  }
  async function openTemplates() {
    const occ = occById[card.occasion], mine = await listPersonalTemplates(); let tab = 'all'; const grid = h('div', { class: 'tpl-grid' });
    const render = () => {
      grid.replaceChildren();
      if (tab === 'mine') { if (!mine.length) grid.append(h('div', { class: 'empty' }, t('empty'))); for (const p of mine) grid.append(h('div', { class: 'tpl' }, h('button', { class: 'thumb', style: { border: 0, padding: 0 }, onclick: () => { ed.push(); applyTemplateSpec(card, { pages: clone(p.spec.pages), fx: p.spec.fx }, card.tplId); ed.gotoPage(0); ed.changed(); m.close(); } }, h('img', { src: p.thumb, style: { width: '100%', height: '100%', objectFit: 'cover' } })), h('div', { class: 'cap' }, h('span', null, p.name), h('button', { class: 'icon-btn', style: { width: '28px', height: '28px' }, onclick: async () => { await Store.del('tpls', p.id); mine.splice(mine.indexOf(p), 1); render(); } }, ic('trash', 14))))); return; }
      for (const tp of templatesFor(card.occasion)) grid.append(h('button', { class: 'tpl', onclick: () => { if (!canUseTemplate(tp)) return premiumInfo(); ed.push(); retemplate(card, tp.id); refreshCard(card); ed.gotoPage(0); ed.changed(); m.close(); } }, tplThumb(tp.id, card.lang), tp.premium ? h('span', { class: 'badge' }, ic('crown', 11), t('pro')) : null, h('div', { class: 'cap' }, h('span', null, styleName(tp.style)))));
    };
    const m = modal(t('template'), h('div', null, seg([['all', occName(occ, ti() ? 'en' : 'fa')], ['mine', t('myTemplates')]], tab, (v) => { tab = v; render(); }), h('div', { style: { height: '10px' } }), grid), { sheet: true, wide: true }); render();
  }
  function openQR() {
    const d = card.data || {}, defVal = d.map || d.rsvpLink || (d.whatsapp ? `https://wa.me/${String(d.whatsapp).replace(/\D/g, '')}` : '') || 'https://';
    const inp = h('input', { class: 'input', value: defVal, dir: 'ltr' });
    modal(t('addQR'), field(t('qrValue'), inp), { actions: [{ label: t('cancel') }, { label: t('ok'), primary: true, onClick: () => ed.addQR(inp.value.trim() || ' ') }] });
  }
  async function savePersonal() {
    const name = await promptBox(t('rename'), card.name || ''); if (name == null) return;
    await ensureFonts(card); const spec = { pages: clone(card.pages), fx: clone(card.fx) }; spec.pages.forEach((p) => p.elements.forEach((e) => { if (e.type === 'text' && e.tpl) e.edited = false; }));
    await Store.put('tpls', { id: uid('tpl'), name: name || t('untitled'), createdAt: Date.now(), occasion: card.occasion, lang: card.lang, spec, thumb: renderPageToCanvas(card, 0, 240).toDataURL('image/jpeg', 0.7) }); toast(t('done'));
  }
  function openMore() {
    const m = modal(t('settings'), h('div', { class: 'list' },
      ...[[t('grid'), 'grid', () => { ed.grid = !ed.grid; ed.draw(); }, () => ed.grid], [t('guides'), 'magnet', () => { ed.snap = !ed.snap; }, () => ed.snap], [t('multi'), 'move', () => { ed.multi = !ed.multi; }, () => ed.multi]].map(([lab, icn, fn, st]) => h('button', { class: 'list-item', onclick: () => { fn(); m.close(); refreshTools(); toast(`${lab}: ${st() ? 'ON' : 'OFF'}`); } }, ic(icn), h('b', null, lab), h('span', { class: 'pill' }, st() ? 'ON' : 'OFF'))),
      h('button', { class: 'list-item', onclick: () => { ed.selectAll(); m.close(); rebuildCtx(); } }, ic('check'), h('b', null, 'Select all')),
      h('button', { class: 'list-item', onclick: () => { ed.relayout(); m.close(); toast(t('done')); } }, ic('rotate'), h('b', null, '↺ ' + t('template'))),
      h('button', { class: 'list-item', onclick: () => { m.close(); savePersonal(); } }, ic('star'), h('b', null, t('savePersonal'))),
      h('button', { class: 'list-item', onclick: () => { m.close(); save().then(() => go('form', { card, fromEditor: true })); } }, ic('list'), h('b', null, t('fillInfo'))),
      h('button', { class: 'list-item', onclick: () => { m.close(); save().then(() => go('animate', { id: card.id })); } }, ic('film'), h('b', null, t('animated')))), { sheet: true });
  }

  // ---------- export sheet
  function openExport() {
    let kind = 'png', pdfPaper = 'auto'; const prog = h('div', { class: 'progress', style: { display: 'none', margin: '10px 0' } }, h('i')), note = h('p', { class: 'muted', style: { fontSize: '12.5px' } }, needsWatermark() ? t('watermarkNote') : '');
    const opts = [['png', t('png')], ['jpg', t('jpg')], ['pdf', t('pdf')], ['story', t('story')], ['post', t('post')], ['whatsapp', t('whatsapp2')], ['print', t('print')], ['zip', 'ZIP'], ['envelope', ti() ? 'Envelope (HTML)' : 'پاکت متحرک (HTML)']];
    let env = envelopeFor(card), mood = moodFor(card), audioFile = null;
    const envBox = h('div', { style: { display: 'none' } },
      h('div', { class: 'sec-title' }, h('span', null, ti() ? 'Envelope' : 'پاکت')), chips(Object.entries(ENVELOPES).map(([k, v]) => [k, v.n ? v.n[ti()] : k]), env, (v) => (env = v)),
      h('div', { class: 'sec-title' }, h('span', null, ti() ? 'Music' : 'موسیقی')), chips(Object.entries(MOODS).map(([k, v]) => [k, v[ti()]]), mood, (v) => { mood = v; audioFile = null; fileLbl.textContent = ''; }),
      h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'btn small', onclick: async () => { const [f] = await pickFile('audio/*'); if (!f) return; if (f.size > 12e6) return toast(ti() ? 'File too large (max 12 MB)' : 'فایل بزرگ است (حداکثر ۱۲ مگابایت)'); audioFile = f; fileLbl.textContent = f.name; } }, ic('music', 16), ti() ? 'My own music' : 'موسیقی خودم'), h('span', { class: 'muted', style: { fontSize: '12px' } }, '')),
      h('button', { class: 'btn small block', style: { marginTop: '8px' }, onclick: async () => { await prepare(card); const html = await buildEnvelopeHTML(card, { envelope: env, mood, audioFile, to: card.data?.guest || '' }); const fr = h('iframe', { style: { width: '100%', height: '60vh', border: 0, borderRadius: '12px' } }); fr.srcdoc = html; modal(ti() ? 'Preview' : 'پیش‌نمایش', fr, { sheet: true }); } }, ic('play', 16), ti() ? 'Preview' : 'پیش‌نمایش'));
    const fileLbl = envBox.querySelector('.muted');
    const kinds = seg(opts, kind, (v) => { kind = v; envBox.style.display = v === 'envelope' ? '' : 'none'; }, 'chips'); kinds.style.flexWrap = 'wrap';
    const run = async (action) => {
      prog.style.display = ''; const bar = prog.firstChild; bar.style.width = '8%';
      try {
        await save(true); await prepare(card); const files = []; const n = card.pages.length;
        if (kind === 'envelope') { const html = await buildEnvelopeHTML(card, { envelope: env, mood, audioFile, to: card.data?.guest || '' }); files.push({ blob: new Blob([html], { type: 'text/html' }), name: fileName(card, 'envelope', 0, 'html') }); }
        else if (kind === 'pdf' || kind === 'print') { const blob = await renderPDF(card, { print: kind === 'print' }); files.push({ blob, name: fileName(card, kind === 'print' ? 'print' : 'pdf', 0, 'pdf') }); }
        else if (kind === 'zip') { const parts = []; for (let i = 0; i < n; i++) { const b = await renderBlob(card, i, 'png'); parts.push({ name: fileName(card, 'png', i), data: new Uint8Array(await b.arrayBuffer()) }); bar.style.width = 10 + (i / n) * 80 + '%'; } files.push({ blob: new Blob([zipStore(parts)], { type: 'application/zip' }), name: `${(card.name || 'cards').replace(/\s+/g, '_')}.zip` }); }
        else for (let i = 0; i < n; i++) { const blob = await renderBlob(card, i, kind); files.push({ blob, name: fileName(card, kind, i) }); bar.style.width = 10 + (i / n) * 80 + '%'; }
        bar.style.width = '95%';
        if (kind === 'print') { if (action === 'share') await shareFiles(files, { title: card.name || 'CardStudio' }); else { const urls = []; for (let i = 0; i < n; i++) urls.push(renderVariant(card, i, 'print', { width: 1700 }).toDataURL('image/jpeg', 0.9)); await printImages(urls, files[0].blob); } }
        else if (action === 'share') await shareFiles(files, { title: card.name || occName(occById[card.occasion], card.lang), text: '' });
        else { let where = ''; for (const f of files) { const r = await saveToDevice(f.blob, f.name); if (!r.ok) throw new Error(r.error || 'save failed'); where = r.where; } toast(`${t('savedTo')} ${where === 'gallery' ? t('gallery') : where === 'documents' ? 'Documents/CardStudio' : where === 'download' ? 'Downloads' : ''}`, 3200); }
        bar.style.width = '100%';
      } catch (e) { if (e?.name !== 'AbortError') toast(t('failed') + ': ' + (e.message || e), 4000); }
      setTimeout(() => (prog.style.display = 'none'), 600);
    };
    const linkRow = h('div', { class: 'row wrap' }, h('button', { class: 'btn small', onclick: () => openExternal(waLink('', card.data.title || occName(occById[card.occasion], card.lang))) }, ic('whatsapp', 16), t('toWhatsapp')), h('button', { class: 'btn small', onclick: () => openExternal(tgLink(card.data.title || occName(occById[card.occasion], card.lang))) }, ic('send', 16), t('toTelegram')), h('button', { class: 'btn small', onclick: () => openExternal(mailLink('', card.data.title || occName(occById[card.occasion], card.lang), '')) }, ic('mail', 16), t('toEmail')));
    modal(t('export'), h('div', null, kinds, envBox, note, prog, h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn grow', onclick: () => run('save') }, ic('download'), kind === 'print' ? t('print') : t('saveGallery')), h('button', { class: 'btn primary grow', onclick: () => run('share') }, ic('share'), t('shareTo'))), h('div', { class: 'sec-title' }, h('span', null, t('toOthers'))), linkRow), { sheet: true });
  }

  // ---------- tool strip
  const T = (id, icon, label, fn) => h('button', { 'data-tool': id, onclick: fn }, ic(icon, 22), label);
  tools.append(T('tpl', 'layers', t('template'), openTemplates), T('text', 'text', t('text'), () => ed.addText({ font: fontsForLang(lang)[0]?.family })), T('photo', 'image', t('image'), () => addPhoto()), T('clip', 'star', t('graphic'), openClips), T('shape', 'shape', t('shape'), openShapes), T('bg', 'bg', t('background'), openBackground), T('layers', 'list', t('layers'), openLayers), T('pages', 'file', t('pages'), openPages), T('qr', 'qr', 'QR', openQR), T('logo', 'crown', t('logo'), () => addPhoto('logo')), T('multi', 'move', t('multi'), () => { ed.multi = !ed.multi; refreshTools(); toast(`${t('multi')}: ${ed.multi ? 'ON' : 'OFF'}`); }), T('more', 'settings', '⋯', openMore));

  // ---------- zoom controls & page pill
  const pill = h('div', { class: 'page-pill' }), vc = h('div', { class: 'view-ctrl' }, h('button', { onclick: () => ed.setZoom(ed.zoom * 1.25) }, ic('zoomin')), h('button', { onclick: () => ed.setZoom(ed.zoom / 1.25) }, ic('zoomout')), h('button', { onclick: () => ed.fit() }, ic('fit')));
  const updPill = () => { if (!ed) return; pill.replaceChildren(h('span', null, `${ed.pageIdx + 1}/${ed.card.pages.length}`), h('span', { class: 'muted' }, `${Math.round(ed.zoom * 100)}%`)); };
  stage.append(vc, pill);
  const el = h('div', { class: 'view editor' }, top, stage, ctxPanel, tools);

  const onKey = (e) => { if (!ed || /input|textarea|select/i.test(document.activeElement?.tagName)) return; const k = e.key; if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? ed.redo() : ed.undo(); } else if ((e.ctrlKey || e.metaKey) && k === 'y') ed.redo(); else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); ed.deleteSelected(); } else if (k.startsWith('Arrow')) { e.preventDefault(); const s = e.shiftKey ? 10 : 1; ed.nudge(k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0, k === 'ArrowUp' ? -s : k === 'ArrowDown' ? s : 0); } else if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); ed.duplicateSelected(); } };
  document.addEventListener('keydown', onKey);
  const onHide = () => { if (document.visibilityState === 'hidden' && ed?.dirty) save(true); };
  document.addEventListener('visibilitychange', onHide);

  return {
    el,
    onShow: () => {
      ed = new Editor(stage, card, { grid: Settings.get('grid'), snap: Settings.get('snap'), onChange: (e, live) => { if (!live) autosave(); else autosave(); refreshUR(); updPill(); }, onSelect: () => rebuildCtx(), onEditText: (e) => editText(e), onView: updPill, onPage: updPill });
      window.__editor = ed; refreshUR(); updPill(); refreshTools();
    },
    onBack: async () => { if (ed?.dirty) await save(true); await go('home', {}, { reset: true }); return true; },
    destroy: () => { document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onHide); if (ed?.dirty) save(true); ed?.destroy(); window.__editor = null; },
  };
});
