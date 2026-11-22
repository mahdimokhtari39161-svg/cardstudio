// Tiny DOM helpers: h(), icons, toast, modal/sheet, confirm/prompt.
import { t } from '../core/i18n.js';

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v; else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v; else if (k === 'value') el.value = v; else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v; else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return el;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', users: 'M16 11a4 4 0 100-8 4 4 0 000 8zM3 21v-1a6 6 0 0112 0v1M17 14a5 5 0 014 5v2', settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2L9 3 6 4l.5 2L5 7.5 3 7 2 10l2 1v2l-2 1 1 3 2-.5L6.5 18l-.5 2 3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3', plus: 'M12 5v14M5 12h14', back: 'M15 5l-7 7 7 7', fwd: 'M9 5l7 7-7 7', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3', redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', copy: 'M9 9h11v11H9zM5 15V4h11', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3', unlock: 'M6 11h12v9H6zM8 11V8a4 4 0 017.5-2', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z', eyeoff: 'M3 3l18 18M10.6 6.1A9 9 0 0112 5c6 0 10 7 10 7a17 17 0 01-3 3.7M6.5 6.8C3.8 8.6 2 12 2 12s4 7 10 7c1.5 0 2.9-.4 4.1-1',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5', text: 'M5 5h14M12 5v14M9 19h6', image: 'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M9 9.5a1 1 0 100-2 1 1 0 000 2z', shape: 'M12 3l9 16H3zM3 3h6v6H3z', star: 'M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z', frame: 'M4 4h16v16H4zM8 8h8v8H8z', qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM18 18h2v2h-2zM17 14h3',
  bg: 'M3 3h18v18H3zM3 15l6-6 5 5 3-3 4 4', share: 'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6', download: 'M12 3v12M7 10l5 5 5-5M5 20h14', play: 'M7 4l13 8-13 8z', stop: 'M6 6h12v12H6z', heart: 'M12 20S3 14 3 8.5A4.5 4.5 0 0112 6a4.5 4.5 0 019 2.5C21 14 12 20 12 20z', check: 'M4 12l5 5L20 6', close: 'M5 5l14 14M19 5L5 19',
  up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6', zoomin: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M11 8v6M8 11h6', zoomout: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3M8 11h6', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', magnet: 'M5 3v9a7 7 0 0014 0V3h-4v9a3 3 0 01-6 0V3zM5 7h4M15 7h4',
  palette: 'M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a3 3 0 003-3c0-6-4-11-8-11z', crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z', wand: 'M4 20L16 8M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.3L21 14l-1.3.7L19 16l-.7-1.3L17 14l1.3-.7z', sparkle: 'M12 3c1 5 3 7 9 9-6 2-8 4-9 9-1-5-3-7-9-9 6-2 8-4 9-9z', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', file: 'M6 3h9l4 4v14H6zM14 3v5h5', music: 'M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z', link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1', mail: 'M3 6h18v12H3zM3 7l9 7 9-7', pin: 'M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z', calendar: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4', folder: 'M3 6h6l2 2h10v11H3z', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', move: 'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3', rotate: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  alignl: 'M4 4v16M8 7h12M8 13h8', alignc: 'M12 4v16M6 7h12M8 13h8', alignr: 'M20 4v16M4 7h12M8 13h8', alignt: 'M4 4h16M7 8v12M13 8v8', alignm: 'M4 12h16M7 6v12M13 8v8', alignb: 'M4 20h16M7 4v12M13 8v8', bold: 'M7 4h6a4 4 0 010 8H7zM7 12h7a4 4 0 010 8H7z', italic: 'M10 4h8M6 20h8M14 4l-4 16', front: 'M8 8h12v12H8zM4 4h12v4', backward: 'M4 4h12v12H4zM8 20h12V8', help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 114 2c-1 .7-1.5 1-1.5 2.5M12 17h.01', info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7h.01',
  whatsapp: 'M3 21l1.5-5A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4-1zM9 9c0 3 3 6 6 6l1-2-2-1-1 .5c-1-.5-1.5-1-2-2l.5-1-1-2z', send: 'M21 3L3 11l7 3 3 7zM10 14l4-4', film: 'M3 4h18v16H3zM7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4', print: 'M7 9V3h10v6M7 17H4v-6h16v6h-3M7 14h10v7H7z', sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5', moon: 'M20 14A8 8 0 0110 4a8 8 0 1010 10z',
};
export function ic(name, size = 20) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('fill', name === 'heartFill' || name === 'stop' || name === 'play' ? 'currentColor' : 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.9'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('class', 'ic');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', ICONS[name === 'heartFill' ? 'heart' : name] || ICONS.star); s.appendChild(p); return s;
}
export const hasIcon = (n) => n in ICONS;

// ---- toast
let toastEl;
export function toast(msg, ms = 2200) {
  if (!toastEl) { toastEl = h('div', { class: 'toast', role: 'status' }); document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('show'), ms);
}

// ---- modal / bottom sheet
export function modal(title, body, { actions = [], sheet = false, onClose, wide = false } = {}) {
  const close = () => { back.remove(); document.body.classList.remove('has-modal'); onClose?.(); };
  const box = h('div', { class: `modal ${sheet ? 'sheet' : ''} ${wide ? 'wide' : ''}`, role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'modal-head' }, h('b', null, title), h('button', { class: 'icon-btn', onclick: close, 'aria-label': t('close') }, ic('close'))),
    h('div', { class: 'modal-body' }, body),
    actions.length ? h('div', { class: 'modal-actions' }, actions.map((a) => h('button', { class: `btn ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''}`, onclick: async () => { const r = await a.onClick?.(close); if (r !== false && a.close !== false) close(); } }, a.label))) : null);
  const back = h('div', { class: 'backdrop', onclick: (e) => { if (e.target === back) close(); } }, box);
  document.body.appendChild(back); document.body.classList.add('has-modal');
  return { close, el: box };
}
export function confirmBox(msg, { yes = t('yes'), no = t('no'), danger = false } = {}) {
  return new Promise((res) => {
    let done = false; const fin = (v) => { if (!done) { done = true; res(v); } };
    modal(t('app'), h('p', { class: 'center' }, msg), { actions: [{ label: no, onClick: () => fin(false) }, { label: yes, primary: !danger, danger, onClick: () => fin(true) }], onClose: () => fin(false) });
  });
}
export function promptBox(label, value = '', { multiline = false, type = 'text', title = t('app') } = {}) {
  return new Promise((res) => {
    let done = false; const fin = (v) => { if (!done) { done = true; res(v); } };
    const inp = multiline ? h('textarea', { class: 'input', rows: 4 }, value) : h('input', { class: 'input', type, value });
    if (multiline) inp.value = value;
    modal(title, h('label', { class: 'field' }, h('span', null, label), inp), { actions: [{ label: t('cancel'), onClick: () => fin(null) }, { label: t('ok'), primary: true, onClick: () => fin(inp.value) }], onClose: () => fin(null) });
    setTimeout(() => inp.focus(), 60);
  });
}

// ---- form controls
export function field(label, input, hint) { return h('label', { class: 'field' }, h('span', null, label), input, hint ? h('small', null, hint) : null); }
export function seg(options, value, onPick, cls = '') {
  const box = h('div', { class: `seg ${cls}` });
  const render = (v) => { clear(box); options.forEach(([val, label]) => box.append(h('button', { type: 'button', class: v === val ? 'on' : '', onclick: () => { onPick(val); render(val); } }, label))); };
  render(value); return box;
}
export function chips(options, value, onPick) { return seg(options, value, onPick, 'chips'); }
export function readFileAs(file, how = 'dataURL') { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); how === 'text' ? r.readAsText(file) : how === 'buffer' ? r.readAsArrayBuffer(file) : r.readAsDataURL(file); }); }
export function pickFile(accept, multiple = false) {
  return new Promise((res) => {
    const i = h('input', { type: 'file', accept, multiple, style: { display: 'none' } }); document.body.appendChild(i);
    i.onchange = () => { res([...i.files]); i.remove(); }; i.oncancel = () => { res([]); i.remove(); }; i.click();
  });
}
export function loadImageSize(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => res({ w: 0, h: 0 }); i.src = src; }); }

// Downscale a photo so cards stay light (max side px) → JPEG/PNG data URL
export async function prepareImage(file, max = 1800) {
  const src = await readFileAs(file), size = await loadImageSize(src);
  if (!size.w || Math.max(size.w, size.h) <= max && file.size < 900_000) return { src, ...size };
  const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  const k = max / Math.max(size.w, size.h), c = document.createElement('canvas'); c.width = Math.round(size.w * k); c.height = Math.round(size.h * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const png = /png|webp|gif|svg/.test(file.type); return { src: c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.9), w: c.width, h: c.height };
}
