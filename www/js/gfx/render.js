// Canvas renderer for pages/elements. Used by editor, thumbnails, exports and animation.
import { drawClip, roundRectPath, starPts } from './cliparts.js';
import { fontStack } from '../data/fonts.js';
import { isRTLText, rng, lighten, darken, alpha, hex2rgb } from '../core/util.js';
import { qrMatrix } from '../io/qr.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- assets
const imgCache = new Map();
export const Assets = {
  onLoad: null,
  get(card, id) {
    if (!id) return null;
    const src = card?.assets?.[id] || (id.startsWith('data:') || id.startsWith('blob:') ? id : null);
    if (!src) return null;
    let e = imgCache.get(id);
    if (e && e.src !== src) e = null;
    if (!e) {
      const img = new Image();
      e = { img, ready: false, src };
      img.onload = () => { e.ready = true; Assets.onLoad && Assets.onLoad(); };
      img.onerror = () => { e.failed = true; };
      img.src = src;
      imgCache.set(id, e);
    }
    return e.ready ? e.img : null;
  },
  async preload(card) {
    const ids = new Set();
    for (const p of card.pages) {
      if (p.bg?.src) ids.add(p.bg.src);
      for (const el of p.elements) if (el.type === 'image' && el.src) ids.add(el.src);
    }
    await Promise.all([...ids].map((id) => new Promise((res) => {
      if (this.get(card, id)) return res();
      const e = imgCache.get(id);
      if (!e || e.failed) return res();
      const prev = e.img.onload; e.img.onload = () => { prev && prev(); res(); }; e.img.onerror = () => res();
      setTimeout(res, 4000);
    })));
  },
};

export async function ensureFonts(card) {
  if (!document.fonts || !document.fonts.load) return;
  const sets = new Set();
  for (const p of card.pages) for (const el of p.elements) if (el.type === 'text') { sets.add(`${el.italic ? 'italic ' : ''}${el.weight || 400} 40px "${el.font}"`); sets.add(`400 40px "${el.font}"`); }
  const jobs = [...sets].map((f) => document.fonts.load(f, 'ابجدهوزAaBb0123').catch(() => null));
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 3500))]);
}

// ---------------------------------------------------------------- text layout
const measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
const setFont = (ctx, el, size) => { ctx.font = `${el.italic ? 'italic ' : ''}${el.weight || 400} ${size}px ${fontStack(el.font)}`; };
const upperSafe = (s) => s.replace(/[a-zа-яçğıöşüéèêëàâîïôûùÿœ]+/gi, (m) => m.toLocaleUpperCase());

export function layoutText(ctx, el, text, sizeOverride) {
  ctx = ctx || measureCtx;
  text = el.upper ? upperSafe(String(text)) : String(text);
  const rtl = el.dir === 'rtl' || (el.dir !== 'ltr' && isRTLText(text));
  ctx.direction = rtl ? 'rtl' : 'ltr';
  const arabic = isRTLText(text);
  let size = sizeOverride || el.size;
  const build = (sz) => {
    setFont(ctx, el, sz);
    if ('letterSpacing' in ctx) ctx.letterSpacing = arabic ? '0px' : `${el.ls || 0}px`;
    const lines = [];
    let maxWord = 0;
    for (const para of text.split('\n')) {
      if (!para.trim()) { lines.push(''); continue; }
      const words = para.split(/\s+/);
      let cur = '';
      for (const w of words) {
        maxWord = Math.max(maxWord, ctx.measureText(w).width);
        const test = cur ? cur + ' ' + w : w;
        if (cur && ctx.measureText(test).width > el.w) { lines.push(cur); cur = w; } else cur = test;
      }
      lines.push(cur);
    }
    return { lines, maxWord, lineH: sz * (el.lh || 1.3) };
  };
  let r = build(size);
  if (el.fit && !sizeOverride) {
    let guard = 0;
    while ((r.lines.length * r.lineH > el.h * 1.02 || r.maxWord > el.w) && size > 10 && guard++ < 60) { size *= 0.94; r = build(size); }
  }
  return { lines: r.lines, size, lineH: r.lineH, rtl, arabic, totalH: r.lines.length * r.lineH };
}

// ---------------------------------------------------------------- shape paths
export function shapePath(ctx, el) {
  const { x, y, w, h } = el;
  ctx.beginPath();
  switch (el.shape) {
    case 'round': roundRectPath(ctx, x, y, w, h, el.radius || Math.min(w, h) * 0.15); break;
    case 'pill': roundRectPath(ctx, x, y, w, h, Math.min(w, h) / 2); break;
    case 'circle': case 'ellipse': ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU); break;
    case 'tri': ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); break;
    case 'diamond': ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2); ctx.closePath(); break;
    case 'hexagon': for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6 - Math.PI / 2; const px = x + w / 2 + (w / 2) * Math.cos(a), py = y + h / 2 + (h / 2) * Math.sin(a); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); break;
    case 'star': { const pts = starPts(0, 0, el.points || 5, 0.5, 0.22); pts.forEach((p, i) => { const px = x + w / 2 + p[0] * w, py = y + h / 2 + p[1] * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); break; }
    case 'heart': { const s = (px, py) => [x + (px / 100) * w, y + (py / 100) * h]; const m = (a, b) => ctx.moveTo(...s(a, b)); const c = (a, b, c1, d, e, f) => ctx.bezierCurveTo(...s(a, b), ...s(c1, d), ...s(e, f)); m(50, 90); c(8, 60, 4, 28, 27, 19); c(40, 14, 48, 23, 50, 31); c(52, 23, 60, 14, 73, 19); c(96, 28, 92, 60, 50, 90); ctx.closePath(); break; }
    case 'line': ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); break;
    default: ctx.rect(x, y, w, h);
  }
}

function fillStyleFor(ctx, el, spec, x, y, w, h) {
  if (spec && typeof spec === 'object' && spec.c1) {
    const a = ((spec.angle ?? 90) * Math.PI) / 180;
    const cx = x + w / 2, cy = y + h / 2, L = Math.abs(w * Math.cos(a)) / 2 + Math.abs(h * Math.sin(a)) / 2;
    const g = ctx.createLinearGradient(cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
    g.addColorStop(0, spec.c1); g.addColorStop(1, spec.c2 || spec.c1); return g;
  }
  return spec;
}
function multiStopGradient(ctx, cols, x, y, w, h, angle = 70) {
  const a = (angle * Math.PI) / 180, cx = x + w / 2, cy = y + h / 2, L = Math.abs(w * Math.cos(a)) / 2 + Math.abs(h * Math.sin(a)) / 2;
  const g = ctx.createLinearGradient(cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
  cols.forEach((c, i) => g.addColorStop(i / Math.max(1, cols.length - 1), c));
  return g;
}

const applyShadow = (ctx, s) => { if (s) { ctx.shadowColor = s.color || 'rgba(0,0,0,.35)'; ctx.shadowBlur = s.blur ?? 10; ctx.shadowOffsetX = s.x ?? 0; ctx.shadowOffsetY = s.y ?? 4; } };
const clearShadow = (ctx) => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; };

// ---------------------------------------------------------------- element drawing
function drawText(ctx, el, st) {
  const raw = el.text;
  if (raw == null || !String(raw).trim()) return;
  const L = layoutText(ctx, el, raw);
  ctx.direction = L.rtl ? 'rtl' : 'ltr';
  setFont(ctx, el, L.size);
  if ('letterSpacing' in ctx) ctx.letterSpacing = L.arabic ? '0px' : `${el.ls || 0}px`;
  ctx.textBaseline = 'middle';
  const ax = el.align === 'left' ? el.x : el.align === 'right' ? el.x + el.w : el.x + el.w / 2;
  ctx.textAlign = el.align === 'left' ? 'left' : el.align === 'right' ? 'right' : 'center';
  const top = el.valign === 'top' ? el.y : el.valign === 'bottom' ? el.y + el.h - L.totalH : el.y + (el.h - L.totalH) / 2;
  const fill = el.grad && el.grad.length > 1 ? multiStopGradient(ctx, el.grad, el.x, top, el.w, L.totalH) : el.color;
  let remaining = st && st.p != null && st.p < 1 ? Math.floor(L.lines.join('').length * st.p) : Infinity;
  L.lines.forEach((line, i) => {
    if (!line) return;
    let txt = line;
    if (remaining !== Infinity) { if (remaining <= 0) return; txt = line.slice(0, remaining); remaining -= line.length; }
    const y = top + L.lineH * i + L.lineH / 2;
    if (el.extrude && el.extrude.d) {
      ctx.fillStyle = el.extrude.c || '#000';
      for (let k = el.extrude.d; k >= 1; k--) ctx.fillText(txt, ax + k * 0.8, y + k * 0.8);
    }
    if (el.stroke && el.stroke.w) { ctx.lineJoin = 'round'; ctx.lineWidth = el.stroke.w * 2; ctx.strokeStyle = el.stroke.c || '#fff'; ctx.strokeText(txt, ax, y); }
    applyShadow(ctx, el.shadow);
    ctx.fillStyle = fill;
    ctx.fillText(txt, ax, y);
    clearShadow(ctx);
  });
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function drawShape(ctx, el) {
  shapePath(ctx, el);
  applyShadow(ctx, el.shadow);
  if (el.shape !== 'line') {
    ctx.fillStyle = fillStyleFor(ctx, el, el.grad || el.fill, el.x, el.y, el.w, el.h);
    if (el.fill || el.grad) ctx.fill();
  }
  clearShadow(ctx);
  if (el.sw > 0 && el.stroke) {
    ctx.lineWidth = el.sw; ctx.strokeStyle = el.stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.setLineDash(el.dash ? [el.sw * 2.4, el.sw * 1.6] : []); ctx.stroke(); ctx.setLineDash([]);
  }
}

function drawImageEl(ctx, el, card) {
  const img = Assets.get(card, el.src);
  ctx.save();
  if (el.shadow) { applyShadow(ctx, el.shadow); ctx.fillStyle = 'rgba(0,0,0,0.01)'; maskPath(ctx, el); ctx.fill(); clearShadow(ctx); }
  maskPath(ctx, el); ctx.clip();
  if (img) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (el.fit === 'contain') {
      const s = Math.min(el.w / iw, el.h / ih), dw = iw * s, dh = ih * s;
      ctx.drawImage(img, el.x + (el.w - dw) / 2, el.y + (el.h - dh) / 2, dw, dh);
    } else {
      const s = Math.max(el.w / iw, el.h / ih), sw = el.w / s, sh = el.h / s;
      ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, el.x, el.y, el.w, el.h);
    }
  } else { ctx.fillStyle = '#e5e7eb'; ctx.fillRect(el.x, el.y, el.w, el.h); }
  ctx.restore();
  if (el.border && el.border.w) { ctx.save(); maskPath(ctx, el); ctx.lineWidth = el.border.w * 2; ctx.strokeStyle = el.border.c || '#fff'; ctx.clip(); ctx.stroke(); ctx.restore(); }
}
function maskPath(ctx, el) {
  ctx.beginPath();
  if (el.mask === 'circle') ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, TAU);
  else if (el.mask === 'round') roundRectPath(ctx, el.x, el.y, el.w, el.h, el.radius || Math.min(el.w, el.h) * 0.12);
  else if (el.mask === 'arch') { const r = el.w / 2; ctx.moveTo(el.x, el.y + el.h); ctx.lineTo(el.x, el.y + r); ctx.arc(el.x + r, el.y + r, r, Math.PI, 0); ctx.lineTo(el.x + el.w, el.y + el.h); ctx.closePath(); }
  else if (el.mask === 'heart') shapePath(ctx, { shape: 'heart', x: el.x, y: el.y, w: el.w, h: el.h });
  else ctx.rect(el.x, el.y, el.w, el.h);
}

function drawQR(ctx, el) {
  const m = qrMatrix(el.value || ' ');
  const n = m.length, pad = el.pad ?? 4, unit = Math.min(el.w, el.h) / (n + pad * 2);
  const total = unit * (n + pad * 2), ox = el.x + (el.w - total) / 2, oy = el.y + (el.h - total) / 2;
  ctx.fillStyle = el.bg || '#fff'; ctx.fillRect(ox, oy, total, total);
  ctx.fillStyle = el.color || '#000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) ctx.fillRect(ox + (c + pad) * unit, oy + (r + pad) * unit, unit + 0.4, unit + 0.4);
}

export function drawFrame(ctx, el) {
  const { x, y, w, h, sw } = el, c = el.color, c2 = el.color2 || el.color;
  ctx.save(); ctx.lineJoin = 'miter'; ctx.strokeStyle = c;
  const box = (ins, lw, col, r) => { ctx.lineWidth = lw; ctx.strokeStyle = col || c; ctx.beginPath(); if (r) roundRectPath(ctx, x + ins, y + ins, w - 2 * ins, h - 2 * ins, r); else ctx.rect(x + ins, y + ins, w - 2 * ins, h - 2 * ins); ctx.stroke(); };
  switch (el.kind) {
    case 'line': box(sw / 2, sw); break;
    case 'double': box(sw / 2, sw); box(sw * 2.4, Math.max(1, sw / 3), c2); break;
    case 'thickthin': box(sw, sw * 1.8); box(sw * 3, Math.max(1, sw / 3), c2); break;
    case 'dashed': ctx.setLineDash([sw * 2.6, sw * 1.6]); box(sw / 2, sw); break;
    case 'dotted': ctx.setLineDash([0.1, sw * 2.2]); ctx.lineCap = 'round'; box(sw / 2, sw * 1.2); break;
    case 'rounded': box(sw / 2, sw, c, Math.min(w, h) * 0.06 + sw); box(sw * 2.6, Math.max(1, sw / 3), c2, Math.min(w, h) * 0.05); break;
    case 'scallop': {
      ctx.lineWidth = Math.max(1.5, sw / 2); const r = Math.max(10, sw * 3), nx = Math.max(3, Math.round(w / (r * 2))), ny = Math.max(3, Math.round(h / (r * 2)));
      const rw = w / nx / 2, rh = h / ny / 2; ctx.beginPath();
      for (let i = 0; i < nx; i++) { const cx = x + rw + i * rw * 2; ctx.moveTo(cx - rw, y + r * 0.2); ctx.arc(cx, y + r * 0.2, rw, Math.PI, 0); ctx.moveTo(cx - rw, y + h - r * 0.2); ctx.arc(cx, y + h - r * 0.2, rw, Math.PI, 0, true); }
      for (let i = 0; i < ny; i++) { const cy = y + rh + i * rh * 2; ctx.moveTo(x + r * 0.2, cy - rh); ctx.arc(x + r * 0.2, cy, rh, -Math.PI / 2, Math.PI / 2); ctx.moveTo(x + w - r * 0.2, cy - rh); ctx.arc(x + w - r * 0.2, cy, rh, -Math.PI / 2, Math.PI / 2, true); }
      ctx.stroke(); box(sw * 3, Math.max(1, sw / 3), c2); break;
    }
    case 'ornate': {
      box(sw / 2, sw); box(sw * 2.6, Math.max(1, sw / 3), c2);
      const s = Math.min(w, h) * 0.16;
      for (const [cx, cy, fx, fy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { ctx.save(); ctx.translate(cx, cy); ctx.scale(fx, fy); drawClip(ctx, 'corner-curl', s, s, c, c2); ctx.restore(); }
      ctx.fillStyle = c; for (const [mx, my] of [[x + w / 2, y + sw / 2], [x + w / 2, y + h - sw / 2], [x + sw / 2, y + h / 2], [x + w - sw / 2, y + h / 2]]) { ctx.beginPath(); ctx.moveTo(mx, my - sw * 1.6); ctx.lineTo(mx + sw * 1.6, my); ctx.lineTo(mx, my + sw * 1.6); ctx.lineTo(mx - sw * 1.6, my); ctx.closePath(); ctx.fill(); }
      break;
    }
    case 'deco': {
      box(sw / 2, sw);
      const s = Math.min(w, h) * 0.14;
      for (const [cx, cy, fx, fy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { ctx.save(); ctx.translate(cx, cy); ctx.scale(fx, fy); drawClip(ctx, 'corner-deco', s * 1.6, s * 1.6, c, c2); ctx.restore(); }
      box(sw * 3.2, Math.max(1, sw / 3), c2); break;
    }
    default: box(sw / 2, sw);
  }
  ctx.restore();
}

export function drawElement(ctx, el, card, st) {
  if (el.hidden) return;
  ctx.save();
  const a = (el.opacity ?? 1) * (st?.a ?? 1);
  if (a <= 0.003) { ctx.restore(); return; }
  ctx.globalAlpha = Math.min(1, a);
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
  ctx.translate(cx + (st?.dx || 0), cy + (st?.dy || 0));
  const rot = ((el.rot || 0) * Math.PI) / 180 + (st?.rot || 0);
  if (rot) ctx.rotate(rot);
  const s = st?.s ?? 1;
  if (s !== 1 || st?.sx || st?.sy) ctx.scale(s * (st?.sx ?? 1), s * (st?.sy ?? 1));
  ctx.translate(-cx, -cy);
  if (st?.blur) ctx.filter = `blur(${st.blur}px)`;
  switch (el.type) {
    case 'text': drawText(ctx, el, st); break;
    case 'shape': drawShape(ctx, el); break;
    case 'clip':
      ctx.translate(el.x, el.y);
      if (el.flip) { ctx.translate(el.w, 0); ctx.scale(-1, 1); }
      if (el.shadow) applyShadow(ctx, el.shadow);
      drawClip(ctx, el.clip, el.w, el.h, el.c1, el.c2 || undefined);
      break;
    case 'image': drawImageEl(ctx, el, card); break;
    case 'qr': drawQR(ctx, el); break;
    case 'frame': drawFrame(ctx, el); break;
  }
  ctx.restore();
}

// ---------------------------------------------------------------- backgrounds
const bgCache = new Map();
function patternTile(kind, color, bg, size) {
  const S = Math.max(8, size | 0), c = document.createElement('canvas');
  c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, S, S); g.fillStyle = color; g.strokeStyle = color; g.lineWidth = Math.max(1, S / 14);
  switch (kind) {
    case 'dots': g.beginPath(); g.arc(S / 2, S / 2, S / 7, 0, TAU); g.fill(); break;
    case 'stripes': g.save(); g.translate(S / 2, S / 2); g.rotate(Math.PI / 4); g.fillRect(-S, -S / 10, S * 2, S / 5); g.restore(); break;
    case 'grid': g.strokeRect(0, 0, S, S); break;
    case 'checks': g.fillRect(0, 0, S / 2, S / 2); g.fillRect(S / 2, S / 2, S / 2, S / 2); break;
    case 'diamonds': g.beginPath(); g.moveTo(S / 2, S * 0.1); g.lineTo(S * 0.9, S / 2); g.lineTo(S / 2, S * 0.9); g.lineTo(S * 0.1, S / 2); g.closePath(); g.stroke(); break;
    case 'crosses': g.beginPath(); g.moveTo(S / 2, S * 0.3); g.lineTo(S / 2, S * 0.7); g.moveTo(S * 0.3, S / 2); g.lineTo(S * 0.7, S / 2); g.stroke(); break;
    case 'waves': g.beginPath(); g.moveTo(0, S / 2); g.bezierCurveTo(S / 4, 0, S / 4 * 3, S, S, S / 2); g.stroke(); break;
    case 'star8': { g.beginPath(); starPts(S / 2, S / 2, 8, S * 0.42, S * 0.26).forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke(); g.beginPath(); g.arc(S / 2, S / 2, S * 0.07, 0, TAU); g.fill(); break; }
    default: break;
  }
  return c;
}

function textureCanvas(bg, W, H) {
  const key = JSON.stringify(bg) + W + 'x' + H;
  if (bgCache.has(key)) return bgCache.get(key);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const R = rng(bg.seed || 'tex'), c1 = bg.c1 || '#f6f2ea', c2 = bg.c2 || '#8a8f98', c3 = bg.c3 || '#ffffff';
  const kind = bg.kind;
  if (kind === 'marble') {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, c1); gr.addColorStop(1, lighten(c1, 0.35)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { const rg = g.createRadialGradient(R() * W, R() * H, 0, R() * W, R() * H, W * (0.5 + R() * 0.5)); rg.addColorStop(0, alpha(c3, 0.5)); rg.addColorStop(1, alpha(c3, 0)); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
    g.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      let x = R() * W, y = R() < 0.5 ? -10 : H * R(), ang = Math.PI / 2 + (R() - 0.5) * 1.4;
      g.beginPath(); g.moveTo(x, y); const steps = 12 + ((R() * 8) | 0);
      for (let s = 0; s < steps; s++) { ang += (R() - 0.5) * 1.1; const len = (H / steps) * (0.7 + R() * 0.9); x += Math.cos(ang) * len; y += Math.sin(ang) * len * 1.2; g.quadraticCurveTo(x - Math.cos(ang) * len * 0.5 + (R() - 0.5) * 40, y - Math.sin(ang) * len * 0.5, x, y); }
      g.strokeStyle = alpha(c2, 0.08 + R() * 0.32); g.lineWidth = 0.6 + R() * (i % 4 === 0 ? 4 : 1.8); g.stroke();
    }
  } else if (kind === 'galaxy') {
    const gr = g.createLinearGradient(0, 0, W * 0.3, H); gr.addColorStop(0, c1); gr.addColorStop(0.55, c2); gr.addColorStop(1, c3); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const cols = [bg.n1 || '#7b4bd1', bg.n2 || '#14919b', bg.n3 || '#c2476a'];
    for (let i = 0; i < 6; i++) { const x = R() * W, y = R() * H, r = W * (0.35 + R() * 0.4); const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, alpha(cols[i % 3], 0.38)); rg.addColorStop(1, alpha(cols[i % 3], 0)); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
    for (let i = 0; i < Math.round((W * H) / 3500); i++) { g.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.8})`; g.beginPath(); g.arc(R() * W, R() * H, R() * 1.6 + 0.3, 0, TAU); g.fill(); }
    for (let i = 0; i < 14; i++) { const x = R() * W, y = R() * H, s = 6 + R() * 16; g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.fill(); const gl = g.createRadialGradient(x, y, 0, x, y, s * 2.2); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(x - s * 3, y - s * 3, s * 6, s * 6); }
  } else if (kind === 'watercolor') {
    g.fillStyle = c1; g.fillRect(0, 0, W, H);
    const cols = bg.m || [c2, c3, '#f2a7bd', '#9ed0ff'];
    g.filter = `blur(${Math.round(W / 36)}px)`;
    for (let i = 0; i < 9; i++) { const x = R() * W, y = R() * H, r = W * (0.18 + R() * 0.3); g.fillStyle = alpha(cols[i % cols.length], 0.22 + R() * 0.28); g.beginPath(); for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU, rr = r * (0.7 + R() * 0.5); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.fill(); }
    g.filter = 'none';
    for (let i = 0; i < 4; i++) { g.strokeStyle = alpha(cols[(i + 1) % cols.length], 0.12); g.lineWidth = 20 + R() * 40; g.lineCap = 'round'; g.beginPath(); g.moveTo(R() * W, R() * H); g.bezierCurveTo(R() * W, R() * H, R() * W, R() * H, R() * W, R() * H); g.stroke(); }
    g.globalAlpha = 0.5; const wash = g.createLinearGradient(0, 0, 0, H); wash.addColorStop(0, 'rgba(255,255,255,.35)'); wash.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = wash; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  } else { // paper
    g.fillStyle = c1; g.fillRect(0, 0, W, H);
    for (let i = 0; i < Math.round((W * H) / 90); i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${0.02 + R() * 0.04})`; g.fillRect(R() * W, R() * H, 1 + R() * 2, 1 + R() * 2); }
  }
  if (bgCache.size > 8) bgCache.delete(bgCache.keys().next().value);
  bgCache.set(key, c);
  return c;
}

export function drawBackground(ctx, page, card) {
  const bg = page.bg || { type: 'color', color: '#fff' }, W = page.w, H = page.h;
  switch (bg.type) {
    case 'gradient': {
      let g;
      if (bg.radial) g = ctx.createRadialGradient(W * (bg.cx ?? 0.5), H * (bg.cy ?? 0.4), 0, W / 2, H / 2, Math.max(W, H) * 0.75);
      else { const a = ((bg.angle ?? 90) * Math.PI) / 180, cx = W / 2, cy = H / 2, L = Math.abs(W * Math.cos(a)) / 2 + Math.abs(H * Math.sin(a)) / 2; g = ctx.createLinearGradient(cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L); }
      g.addColorStop(0, bg.c1 || '#fff'); if (bg.c3) { g.addColorStop(0.5, bg.c2 || bg.c1); g.addColorStop(1, bg.c3); } else g.addColorStop(1, bg.c2 || bg.c1);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); break;
    }
    case 'image': {
      ctx.fillStyle = bg.color || '#111'; ctx.fillRect(0, 0, W, H);
      const img = Assets.get(card, bg.src);
      if (img) { const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(W / iw, H / ih), sw = W / s, sh = H / s; ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, W, H); }
      if (bg.dim) { ctx.fillStyle = `rgba(0,0,0,${bg.dim})`; ctx.fillRect(0, 0, W, H); }
      break;
    }
    case 'pattern': {
      ctx.fillStyle = bg.bg || '#fff'; ctx.fillRect(0, 0, W, H);
      const tile = patternTile(bg.kind, bg.color || '#ddd', bg.bg || '#fff', bg.size || 60);
      ctx.save(); ctx.globalAlpha = bg.op ?? 1; ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore(); break;
    }
    case 'texture': { ctx.drawImage(textureCanvas(bg, W, H), 0, 0); break; }
    default: ctx.fillStyle = bg.color || '#ffffff'; ctx.fillRect(0, 0, W, H);
  }
}

// ---------------------------------------------------------------- page / card rendering
export function drawPage(ctx, page, card, o = {}) {
  ctx.save();
  if (o.scale && o.scale !== 1) ctx.scale(o.scale, o.scale);
  ctx.beginPath(); ctx.rect(0, 0, page.w, page.h); ctx.clip();
  drawBackground(ctx, page, card);
  for (const el of page.elements) drawElement(ctx, el, card, o.stateFor ? o.stateFor(el) : null);
  if (o.overlay) o.overlay(ctx, page);
  ctx.restore();
}

export function renderPageToCanvas(card, pageIndex = 0, width = 1000, o = {}) {
  const page = card.pages[pageIndex] || card.pages[0];
  const c = document.createElement('canvas');
  const scale = width / page.w;
  c.width = Math.round(page.w * scale); c.height = Math.round(page.h * scale);
  drawPage(c.getContext('2d'), page, card, { scale, ...o });
  return c;
}

// ---------------------------------------------------------------- geometry helpers (editor)
export function elementCenter(el) { return [el.x + el.w / 2, el.y + el.h / 2]; }
export function toLocal(el, px, py) {
  const [cx, cy] = elementCenter(el), a = (-(el.rot || 0) * Math.PI) / 180, dx = px - cx, dy = py - cy;
  return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
}
export function hitElement(el, px, py, pad = 0) {
  const [lx, ly] = toLocal(el, px, py);
  return Math.abs(lx) <= el.w / 2 + pad && Math.abs(ly) <= el.h / 2 + pad;
}
export function corners(el) {
  const [cx, cy] = elementCenter(el), a = ((el.rot || 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => { const x = (sx * el.w) / 2, y = (sy * el.h) / 2; return [cx + x * c - y * s, cy + x * s + y * c]; });
}
export function boundsOf(els) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const el of els) for (const [x, y] of corners(el)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
