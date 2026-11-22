// Lazy thumbnails for templates and clipart.
import { h } from './dom.js';
import { cardFromTemplate } from '../templates/registry.js';
import { renderPageToCanvas, ensureFonts } from '../gfx/render.js';
import { drawClip } from '../gfx/cliparts.js';

const cache = new Map(); let queue = []; let busy = false; let fontsReady = null;
const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); enqueue(e.target); } }, { rootMargin: '300px' }) : null;

async function run() {
  if (busy) return; busy = true;
  while (queue.length) {
    const el = queue.shift(); if (!el.isConnected) continue;
    try { await paint(el); } catch (e) { console.warn('thumb', e); }
    await new Promise((r) => setTimeout(r, 0));
  }
  busy = false;
}
const enqueue = (el) => { queue.push(el); run(); };

async function paint(el) {
  const key = el.dataset.key; let url = cache.get(key);
  if (!url) {
    if (!fontsReady) fontsReady = (async () => { try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch { /* ignore */ } })();
    await fontsReady;
    const [kind, ...rest] = key.split('|');
    let cv;
    if (kind === 'tpl') { const [id, lang] = rest; const card = cardFromTemplate(id, { lang }); await ensureFonts(card); cv = renderPageToCanvas(card, 0, 260); }
    else { const [id, c1] = rest; cv = document.createElement('canvas'); cv.width = cv.height = 96; drawClip(cv.getContext('2d'), id, 96, 96, c1, c1); }
    url = cv.toDataURL(kind === 'tpl' ? 'image/jpeg' : 'image/png', 0.8); cache.set(key, url);
    if (cache.size > 400) cache.delete(cache.keys().next().value);
  }
  el.replaceChildren(h('img', { src: url, alt: '', draggable: 'false', style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } }));
}

export function tplThumb(tplId, lang) {
  const el = h('div', { class: 'thumb', 'data-key': `tpl|${tplId}|${lang}` });
  io ? io.observe(el) : enqueue(el); return el;
}
export function clipThumb(id, c1 = '#8d6e2f') {
  const el = h('div', { 'data-key': `clip|${id}|${c1}`, style: { width: '100%', height: '100%' } });
  io ? io.observe(el) : enqueue(el); return el;
}
export const thumbCache = cache;
