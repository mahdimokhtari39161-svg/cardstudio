// Data model: cards, pages, elements.
import { uid, clone } from './util.js';

export const PAGE_PRESETS = {
  card:      { w: 1000, h: 1400, n: ['کارت دعوت ۵×۷', 'Invitation 5×7'] },
  a6:        { w: 1240, h: 1748, n: ['کارت‌پستال A6', 'Postcard A6'] },
  a5:        { w: 1748, h: 2480, n: ['A5', 'A5'] },
  square:    { w: 1080, h: 1080, n: ['مربع (پست)', 'Square post'] },
  post:      { w: 1080, h: 1350, n: ['پست اینستاگرام ۴:۵', 'Instagram post 4:5'] },
  story:     { w: 1080, h: 1920, n: ['استوری / وضعیت', 'Story / Status'] },
  landscape: { w: 1500, h: 1050, n: ['افقی', 'Landscape'] },
  bizcard:   { w: 1050, h: 600, n: ['کارت ویزیت', 'Business card'] },
  banner:    { w: 1500, h: 500, n: ['بنر', 'Banner'] },
};

export const DATA_FIELDS = [
  // key, group(for form), inputType
  ['host', 'text'], ['inviter', 'text'], ['guest', 'text'], ['couple', 'text'], ['honoree', 'text'],
  ['title', 'text'], ['body', 'area'], ['custom', 'area'],
  ['dateISO', 'date'], ['weekday', 'text'], ['timeStart', 'time'], ['timeEnd', 'time'],
  ['venue', 'text'], ['address', 'area'], ['phone', 'tel'], ['whatsapp', 'tel'], ['email', 'email'],
  ['map', 'url'], ['notes', 'area'], ['dress', 'text'], ['rsvpBy', 'date'], ['rsvpLink', 'url'], ['company', 'text'],
];

export function newPage(w = 1000, h = 1400) {
  return { id: uid('p'), w, h, bg: { type: 'color', color: '#ffffff' }, elements: [] };
}

export function newCard(opts = {}) {
  const now = Date.now();
  return {
    v: 1, id: uid('c'), name: opts.name || '', occasion: opts.occasion || '', lang: opts.lang || 'fa', calendar: opts.calendar || '',
    createdAt: now, updatedAt: now, fav: false, folder: opts.folder || '', parent: null, version: 1,
    tplId: opts.tplId || null, thumb: '', tier: 'free',
    data: {}, extras: [], assets: {}, pages: [newPage(opts.w, opts.h)],
    fx: { particles: 'none', open: 'none', shimmer: false, music: '', musicName: '' },
  };
}

const BASE = () => ({ id: uid(), x: 0, y: 0, w: 100, h: 100, rot: 0, opacity: 1, locked: false, hidden: false, name: '', shadow: null, anim: { in: 'none', delay: 0, dur: 0.9 }, motion: 'none' });

export function newText(o = {}) {
  return Object.assign(BASE(), {
    type: 'text', text: 'متن', tpl: '', font: 'Vazirmatn', size: 56, color: '#222222', weight: 400, italic: false,
    align: 'center', valign: 'middle', lh: 1.35, ls: 0, fit: false, grad: null, stroke: null, extrude: null, upper: false, dir: 'auto',
    x: 100, y: 100, w: 800, h: 120,
  }, o);
}
export function newShape(o = {}) {
  return Object.assign(BASE(), {
    type: 'shape', shape: 'rect', fill: '#c9a24a', grad: null, stroke: '', sw: 0, dash: 0, radius: 0, points: 5,
    x: 100, y: 100, w: 300, h: 300,
  }, o);
}
export function newClip(o = {}) {
  return Object.assign(BASE(), { type: 'clip', clip: 'heart', c1: '#c9a24a', c2: '', flip: false, x: 100, y: 100, w: 240, h: 240 }, o);
}
export function newImage(o = {}) {
  return Object.assign(BASE(), { type: 'image', src: '', fit: 'cover', mask: 'rect', radius: 0, border: null, kind: 'photo', x: 100, y: 100, w: 500, h: 500 }, o);
}
export function newQR(o = {}) {
  return Object.assign(BASE(), { type: 'qr', value: 'https://', color: '#111111', bg: '#ffffff', pad: 4, x: 100, y: 100, w: 260, h: 260 }, o);
}
export function newFrame(o = {}) {
  return Object.assign(BASE(), { type: 'frame', kind: 'double', color: '#c9a24a', color2: '', sw: 6, radius: 0, x: 40, y: 40, w: 920, h: 1320 }, o);
}

export const ELEMENT_LABEL = { text: ['متن', 'Text'], shape: ['شکل', 'Shape'], clip: ['تصویر', 'Graphic'], image: ['عکس', 'Photo'], qr: ['QR', 'QR'], frame: ['کادر', 'Frame'] };

export function cloneElement(el, dx = 30, dy = 30) {
  const c = clone(el); c.id = uid(); c.x += dx; c.y += dy; c.locked = false; return c;
}

export function allElements(card) { return card.pages.flatMap((p) => p.elements); }

// Re-apply form data to template-bound text elements
import { fillTokens } from './util.js';
export function applyData(card, displayData) {
  for (const p of card.pages) for (const el of p.elements) if (el.type === 'text' && el.tpl) el.text = fillTokens(el.tpl, displayData);
}
export function cardHasToken(card, token) {
  return allElements(card).some((e) => e.type === 'text' && e.tpl && e.tpl.includes(`{${token}}`));
}
