// 21 design styles. Each build(c) returns a page spec. Layout, typography, decoration and background differ per style.
import { newPage, newShape, newClip, newFrame, newText } from '../core/model.js';
import { lighten, darken, alpha, mix, readable, rng, uid } from '../core/util.js';
import { fontSet } from '../data/fonts.js';

const GOLD = ['#8d6e2f', '#f4d36f', '#fff1b8', '#c9a24a', '#8d6e2f'];
const GOLD_DARK = ['#5e430f', '#8d6a1f', '#b08a2e', '#7a5a1c', '#5e430f'];
const SILVER = ['#7d8590', '#e6e9ee', '#ffffff', '#aab2bd', '#7d8590'];
const GOLD_MID = '#c9a24a';

const deco = (el) => { el.deco = true; return el; };
const clip = (id, x, y, w, h, c1, c2, o = {}) => deco(newClip({ clip: id, x, y, w, h, c1, c2: c2 || '', ...o }));
const shape = (shape, x, y, w, h, fill, o = {}) => deco(newShape({ shape, x, y, w, h, fill, ...o }));
const frame = (kind, color, sw, ins, c, o = {}) => deco(newFrame({ kind, color, color2: o.color2 || '', sw, x: ins, y: ins, w: c.W - ins * 2, h: c.H - ins * 2, ...o }));

// ordered text tokens of a card
const ORDER = ['guestLine', 'sub', 'title', 'names', 'hostLine', 'body', 'custom', 'dateLine', 'timeLine', 'place', 'contact', 'dress', 'rsvp', 'notes', 'extra', 'signLine'];
const ORDER_BRAND = ['company', 'names', 'sub', 'body', 'contact', 'place', 'extra'];
const ROLE_OF = { guestLine: 'small', sub: 'sub', title: 'title', names: 'names', hostLine: 'small', body: 'body', custom: 'body', dateLine: 'info', timeLine: 'info', place: 'info2', contact: 'small', dress: 'small', rsvp: 'small', notes: 'small', extra: 'small', signLine: 'sign' };
const ROLE_OF_BRAND = { company: 'title', names: 'names', sub: 'sub', body: 'body', contact: 'small', place: 'small', extra: 'small' };

function textEls(c, T, box, o = {}) {
  const u = c.W / 1000, order = c.kind === 'brand' ? ORDER_BRAND : ORDER, roles = c.kind === 'brand' ? ROLE_OF_BRAND : ROLE_OF;
  const fs = fontSet(c.lang), out = [];
  for (const tok of order) {
    const r = T[roles[tok]] || T.body;
    if (!r) continue;
    const fam = fs[r.f] || r.f || fs.body;
    const size = Math.round((r.s || 40) * u * (o.sizeMul || 1) * (tok === 'title' && c.kind === 'condolence' ? 0.8 : 1));
    out.push(newText({
      text: '', tpl: `{${tok}}`, stack: 'main', font: fam, size, color: r.c || '#222', weight: r.w || 400, italic: !!r.i,
      align: o.align || r.align || 'center', lh: r.lh || (c.rtl ? 1.7 : 1.28), ls: c.rtl ? 0 : r.ls || 0, upper: !!r.upper && !c.rtl,
      grad: r.grad || null, shadow: r.shadow || null, extrude: r.extrude || null, stroke: r.stroke || null,
      x: box.x, w: box.w, h: size * 1.5, gapAfter: r.gap ?? 1, padY: r.padY ?? 4, name: tok,
    }));
  }
  return out;
}
const finish = (c, bg, decoBelow, T, box, decoAbove = [], o = {}) => {
  const p = newPage(c.W, c.H); p.bg = bg;
  p.elements = [...decoBelow, ...textEls(c, T, box, o), ...decoAbove];
  p.stacks = { main: { ...box, gap: box.gap ?? Math.round(c.W * 0.026), valign: box.valign || 'middle' } };
  return { pages: [p] };
};
const bx = (c, fx, fy, fw, fh, extra = {}) => ({ x: c.W * fx, y: c.H * fy, w: c.W * fw, h: c.H * fh, ...extra });
const mirrorX = (c, el) => { el.x = c.W - el.x - el.w; if (el.type === 'clip') el.flip = !el.flip; return el; };

export const STYLES = {};
const def = (id, n, tags, premium, build) => { STYLES[id] = { id, n, tags, premium, build }; };

// 1 ─ Royal & luxurious
def('royal', ['لوکس و سلطنتی', 'Royal luxury'], ['luxury', 'wedding', 'formal'], true, (c) => {
  const { W, H, pal } = c, dark = darken(pal.d, 0.1), u = W / 1000;
  const bg = { type: 'gradient', radial: true, c1: lighten(dark, 0.18), c2: darken(dark, 0.45), cy: 0.35 };
  const d = [
    shape('rect', 0, 0, W, H, null, { stroke: '', sw: 0 }),
    frame('ornate', GOLD_MID, 5 * u, 34 * u, c, { color2: '#f4d36f' }),
    clip('crown', W / 2 - 70 * u, 70 * u, 140 * u, 140 * u, '#d4af37', '#ef476f'),
    clip('divider-flourish', W / 2 - 160 * u, H - 150 * u, 320 * u, 42 * u, GOLD_MID),
    clip('rosette', -60 * u, H - 120 * u, 190 * u, 190 * u, alpha('#d4af37', 0.35), null, { opacity: 0.6 }),
    clip('rosette', W - 130 * u, -70 * u, 190 * u, 190 * u, alpha('#d4af37', 0.35), null, { opacity: 0.6 }),
  ];
  d.shift();
  if (c.alt) { d[1].y = H - 210 * u; d[1].flip = false; d[2].y = 80 * u; }
  const T = {
    small: { f: 'body', s: 26, c: '#e8d9a8' }, sub: { f: 'caps', s: 32, c: '#e9d8a6', ls: 4, upper: true },
    title: { f: 'display', s: 92, c: '#f4d36f', grad: GOLD, w: 700, lh: 1.15, shadow: { color: 'rgba(0,0,0,.5)', blur: 8, y: 4 } },
    names: { f: 'script', s: 84, c: '#f4d36f', grad: GOLD, lh: 1.2 }, body: { f: 'elegant', s: 36, c: '#f3ead0', lh: 1.5 },
    info: { f: 'elegant', s: 40, c: '#f4d36f', w: 700 }, info2: { f: 'elegant', s: 34, c: '#f3ead0' }, sign: { f: 'script', s: 46, c: '#f4d36f' },
  };
  return finish(c, bg, d, T, bx(c, 0.14, 0.235, 0.72, 0.57));
});

// 2 ─ Classic
def('classic', ['کلاسیک', 'Classic'], ['classic', 'formal', 'wedding'], false, (c) => {
  const { W, H, pal } = c, u = W / 1000;
  const bg = { type: 'texture', kind: 'paper', c1: lighten(pal.l, 0.3), seed: c.seed };
  const d = [
    frame('double', pal.d, 5 * u, 40 * u, c, { color2: pal.a }),
    clip('divider-diamond', W / 2 - 150 * u, 118 * u, 300 * u, 24 * u, pal.a),
    clip('divider-diamond', W / 2 - 150 * u, H - 142 * u, 300 * u, 24 * u, pal.a),
    clip('sprig', 62 * u, H - 190 * u, 120 * u, 120 * u, mix(pal.a, '#3f8f5a', 0.5), pal.a2, { rot: -20 }),
    clip('sprig', W - 182 * u, H - 190 * u, 120 * u, 120 * u, mix(pal.a, '#3f8f5a', 0.5), pal.a2, { rot: 20, flip: true }),
  ];
  if (c.alt) { d.push(clip('laurel', W / 2 - 55 * u, 68 * u, 110 * u, 110 * u, pal.a)); d[1].y = 190 * u; }
  const T = {
    small: { f: 'body', s: 25, c: lighten(pal.i, 0.2) }, sub: { f: 'elegant', s: 36, c: pal.a, i: true },
    title: { f: 'display', s: 84, c: pal.d, w: 700, lh: 1.15 }, names: { f: 'script', s: 78, c: pal.a, lh: 1.2 },
    body: { f: 'elegant', s: 36, c: pal.i, lh: 1.5 }, info: { f: 'elegant', s: 40, c: pal.d, w: 700 }, info2: { f: 'elegant', s: 33, c: pal.i }, sign: { f: 'script', s: 44, c: pal.a },
  };
  return finish(c, bg, d, T, bx(c, 0.14, 0.2, 0.72, 0.6));
});

// 3 ─ Modern minimal
def('minimal', ['مدرن و مینیمال', 'Modern minimal'], ['modern', 'minimal', 'business'], false, (c) => {
  const { W, H, pal } = c, u = W / 1000, rtl = c.rtl, left = !rtl;
  const bg = { type: 'color', color: '#fafaf8' };
  const d = [
    shape('circle', c.alt ? -W * 0.35 : W * 0.45, c.alt ? H * 0.62 : -W * 0.3, W * 0.9, W * 0.9, pal.a2, { opacity: 0.55 }),
    shape('circle', c.alt ? W * 0.62 : -W * 0.08, c.alt ? H * 0.05 : H * 0.78, W * 0.3, W * 0.3, pal.a, { opacity: 0.95 }),
    shape('rect', W * 0.12, H * 0.1, 70 * u, 6 * u, pal.d),
  ];
  const al = c.alt ? 'center' : left ? 'left' : 'right';
  const T = {
    small: { f: 'body', s: 24, c: '#555', ls: 1 }, sub: { f: 'body', s: 26, c: pal.a, ls: 6, upper: true, w: 700 },
    title: { f: 'body', s: 88, c: '#141414', w: 700, lh: 1.1, ls: -1 }, names: { f: 'body', s: 54, c: pal.a, w: 400 },
    body: { f: 'body', s: 30, c: '#444', lh: 1.6 }, info: { f: 'body', s: 36, c: '#141414', w: 700 }, info2: { f: 'body', s: 30, c: '#333' }, sign: { f: 'body', s: 30, c: pal.d, i: true },
  };
  return finish(c, bg, d, T, bx(c, 0.12, 0.2, 0.76, 0.62), [], { align: al });
});

// 4 ─ 3D
def('threeD', ['سه‌بعدی', '3D'], ['modern', 'party', 'artistic'], true, (c) => {
  const { W, H, pal } = c, u = W / 1000, M = pal.m;
  const bg = { type: 'gradient', angle: 70, c1: lighten(pal.a, 0.15), c2: darken(pal.d, 0.1), c3: darken(pal.d, 0.35) };
  const sh = { color: 'rgba(0,0,0,.45)', blur: 30 * u, y: 18 * u };
  const d = [
    shape('circle', -W * 0.12, H * 0.04, W * 0.5, W * 0.5, null, { grad: { c1: lighten(M[1], 0.3), c2: darken(M[1], 0.2), angle: 60 }, shadow: sh }),
    shape('circle', W * 0.66, H * 0.58, W * 0.52, W * 0.52, null, { grad: { c1: lighten(M[2], 0.3), c2: darken(M[2], 0.25), angle: 60 }, shadow: sh }),
    shape('round', W * 0.1, H * 0.2, W * 0.8, H * 0.6, 'rgba(255,255,255,.14)', { radius: 60 * u, stroke: 'rgba(255,255,255,.4)', sw: 2 * u, shadow: { color: 'rgba(0,0,0,.35)', blur: 40 * u, y: 20 * u } }),
    clip(c.motif, W * 0.7, H * 0.06, 220 * u, 220 * u, M[0], M[3], { shadow: sh, rot: 12 }),
    clip('sparkle', W * 0.1, H * 0.86, 90 * u, 90 * u, '#ffffff', null, { opacity: 0.9 }),
  ];
  if (c.alt) { d[3].x = W * 0.06; d[3].rot = -12; d[3].y = H * 0.84; }
  const T = {
    small: { f: 'body', s: 25, c: '#fff' }, sub: { f: 'body', s: 28, c: '#ffe9a8', ls: 5, upper: true, w: 700 },
    title: { f: 'bold', s: 96, c: '#ffffff', w: 700, lh: 1.1, extrude: { d: 12, c: darken(pal.a, 0.4) }, shadow: { color: 'rgba(0,0,0,.4)', blur: 18, y: 10 } },
    names: { f: 'display', s: 64, c: '#ffe9a8', w: 700, extrude: { d: 6, c: darken(pal.a, 0.5) } }, body: { f: 'body', s: 32, c: '#fff', lh: 1.55 },
    info: { f: 'bold', s: 42, c: '#fff', w: 700, extrude: { d: 4, c: 'rgba(0,0,0,.35)' } }, info2: { f: 'body', s: 32, c: '#fff' }, sign: { f: 'script', s: 48, c: '#ffe9a8' },
  };
  return finish(c, bg, d, T, bx(c, 0.16, 0.24, 0.68, 0.52));
});

// 5 ─ Floral
def('floral', ['گل‌دار', 'Floral'], ['floral', 'wedding', 'romantic', 'greeting'], false, (c) => {
  const { W, H, pal } = c, u = W / 1000;
  const bg = { type: 'gradient', angle: 90, c1: '#ffffff', c2: lighten(pal.s, 0.35) };
  const s = 380 * u;
  const d = [
    clip('cornerFlowers', 0, 0, s, s, pal.a, pal.a2), clip('cornerFlowers', W - s, H - s, s, s, pal.a, pal.a2, { flip: true, rot: 180 }),
    clip('rose', W - 130 * u, 40 * u, 100 * u, 100 * u, pal.a2, '#3f8f5a', { opacity: 0.9 }), clip('daisy', 36 * u, H - 120 * u, 90 * u, 90 * u, '#fff', pal.a2),
    clip('divider-flourish', W / 2 - 140 * u, H - 165 * u, 280 * u, 38 * u, pal.a),
  ];
  if (c.alt) { d[0].flip = true; d[0].x = W - s; d[1].flip = false; d[1].rot = 0; d[1].x = 0; d[1].y = H - s; d[1].rot = 180; d.push(clip('wreath', W / 2 - 90 * u, 70 * u, 180 * u, 180 * u, pal.a, pal.a2)); }
  const T = {
    small: { f: 'body', s: 25, c: lighten(pal.i, 0.15) }, sub: { f: 'elegant', s: 36, c: pal.a, i: true },
    title: { f: 'script', s: 112, c: pal.a, lh: 1.15 }, names: { f: 'script', s: 84, c: darken(pal.a, 0.2), lh: 1.2 }, body: { f: 'elegant', s: 36, c: pal.i, lh: 1.5 },
    info: { f: 'elegant', s: 40, c: pal.d, w: 700 }, info2: { f: 'elegant', s: 33, c: pal.i }, sign: { f: 'script', s: 48, c: pal.a },
  };
  return finish(c, bg, d, T, bx(c, 0.16, 0.2, 0.68, 0.6));
});

// 6 ─ Nature & landscape
def('nature', ['طبیعت و منظره', 'Nature & landscape'], ['nature', 'greeting', 'travel'], false, (c) => {
  const { W, H, pal } = c, u = W / 1000;
  const bg = { type: 'gradient', angle: 90, c1: '#bfe3ff', c2: '#fdf3d4' };
  const hill = (y, col, w = 1.6) => shape('ellipse', -W * 0.3, y, W * w, H * 0.5, col);
  const d = [
    clip('sun', W - 230 * u, 60 * u, 170 * u, 170 * u, '#ffd166', '#ffb703'), clip('cloud', 40 * u, 90 * u, 190 * u, 120 * u, '#ffffff'), clip('cloud', W * 0.45, 40 * u, 150 * u, 94 * u, '#ffffff', null, { opacity: 0.9 }),
    hill(H * 0.78, '#9ad1a0'), hill(H * 0.84, '#5fb47a', 1.3), hill(H * 0.92, '#3f8f5a', 1.8),
    shape('round', W * 0.1, H * 0.2, W * 0.8, H * 0.54, 'rgba(255,255,255,.74)', { radius: 46 * u, shadow: { color: 'rgba(0,0,0,.12)', blur: 24 * u, y: 8 * u } }),
    clip('tulip', W * 0.08, H * 0.82, 100 * u, 100 * u, pal.a, '#3f8f5a'), clip('tulip', W * 0.2, H * 0.86, 80 * u, 80 * u, pal.a2, '#3f8f5a'), clip('daisy', W * 0.78, H * 0.84, 100 * u, 100 * u, '#fff', '#f4b400'),
  ];
  if (c.alt) { d[0].x = 40 * u; d[1].x = W - 230 * u; d[4].y = H * 0.74; }
  const T = {
    small: { f: 'body', s: 25, c: '#35503c' }, sub: { f: 'kids', s: 34, c: '#3f8f5a' }, title: { f: 'bold', s: 86, c: '#1f5a36', w: 700, lh: 1.15 },
    names: { f: 'script', s: 70, c: pal.a, lh: 1.2 }, body: { f: 'body', s: 31, c: '#2d4034', lh: 1.55 }, info: { f: 'body', s: 36, c: '#1f5a36', w: 700 }, info2: { f: 'body', s: 30, c: '#2d4034' }, sign: { f: 'script', s: 46, c: '#2d6e45' },
  };
  return finish(c, bg, d, T, bx(c, 0.15, 0.225, 0.7, 0.5));
});

// 7 ─ Fantasy
def('fantasy', ['فانتزی', 'Fantasy'], ['fantasy', 'kids', 'party'], false, (c) => {
  const { W, H, pal } = c, u = W / 1000, r = rng(c.seed + 'f');
  const bg = { type: 'gradient', angle: 60, c1: '#3b1c6e', c2: '#7b4bd1', c3: '#14919b' };
  const d = [clip('moon', W - 210 * u, 60 * u, 150 * u, 150 * u, '#fff3b0'), clip('cloud', -30 * u, H - 230 * u, 330 * u, 220 * u, alpha('#ffffff', 0.9)), clip('cloud', W - 300 * u, H - 190 * u, 300 * u, 190 * u, alpha('#e9d5ff', 0.9))];
  for (let i = 0; i < 16; i++) d.push(clip(i % 3 ? 'sparkle' : 'star5', r() * (W - 60 * u), r() * (H * 0.9), (14 + r() * 36) * u, (14 + r() * 36) * u, i % 2 ? '#fff3b0' : '#ffffff', null, { opacity: 0.4 + r() * 0.6 }));
  d.push(shape('round', W * 0.1, H * 0.2, W * 0.8, H * 0.58, 'rgba(255,255,255,.1)', { radius: 80 * u, stroke: 'rgba(255,255,255,.5)', sw: 3 * u }));
  if (c.alt) { d[0].x = 50 * u; d[0].flip = true; }
  const glow = { color: 'rgba(255,230,150,.9)', blur: 24, y: 0 };
  const T = {
    small: { f: 'body', s: 25, c: '#f3e8ff' }, sub: { f: 'script', s: 46, c: '#fff3b0', shadow: glow }, title: { f: 'script', s: 112, c: '#ffffff', shadow: glow, lh: 1.15 },
    names: { f: 'script', s: 76, c: '#fff3b0', shadow: glow }, body: { f: 'body', s: 31, c: '#f3e8ff', lh: 1.6 }, info: { f: 'display', s: 40, c: '#fff3b0', w: 700 }, info2: { f: 'body', s: 31, c: '#fff' }, sign: { f: 'script', s: 50, c: '#fff3b0', shadow: glow },
  };
  return finish(c, bg, d, T, bx(c, 0.16, 0.24, 0.68, 0.52));
});

// 8 ─ Kids
def('kids', ['کودکانه', 'Kids'], ['kids', 'party', 'fun'], false, (c) => {
  const { W, H, pal } = c, u = W / 1000, M = pal.m;
  const bg = { type: 'pattern', kind: 'dots', color: alpha(M[0], 0.28), bg: '#fff9e6', size: 54 * u };
  const d = [
    shape('round', W * 0.07, H * 0.17, W * 0.86, H * 0.64, '#ffffff', { radius: 70 * u, stroke: M[0], sw: 10 * u, dash: 1, shadow: { color: 'rgba(0,0,0,.12)', blur: 20 * u, y: 10 * u } }),
    clip('balloons3', W * 0.04, H * 0.02, 230 * u, 230 * u, M[0], M[1]), clip('rainbow', W - 290 * u, 52 * u, 260 * u, 180 * u, '#fff'),
    clip('cloud', W - 200 * u, 150 * u, 150 * u, 100 * u, '#bde0fe', null, { opacity: 0.9 }), clip('bear', W * 0.04, H - 230 * u, 200 * u, 200 * u, '#c68642'),
    clip('gift', W - 240 * u, H - 220 * u, 190 * u, 190 * u, M[2], M[3]), clip('star5', W * 0.42, H - 120 * u, 80 * u, 80 * u, '#ffd166'), clip('confetti', 0, 0, W, H, M[0], M[1], { opacity: 0.55 }),
  ];
  if (c.alt) { d[1].x = W - 270 * u; d[1].flip = true; d[2].x = 30 * u; d[4].x = W - 230 * u; d[5].x = 30 * u; }
  d.unshift(d.pop()); // confetti behind the white panel
  const T = {
    small: { f: 'kids', s: 27, c: '#555' }, sub: { f: 'kids', s: 36, c: darken(M[1], 0.3) }, title: { f: 'kids', s: 96, c: M[0], w: 700, lh: 1.15, stroke: { w: 4, c: '#fff' }, shadow: { color: 'rgba(0,0,0,.2)', blur: 4, y: 5 } },
    names: { f: 'bold', s: 70, c: M[2], lh: 1.2 }, body: { f: 'kids', s: 32, c: '#444', lh: 1.55 }, info: { f: 'kids', s: 40, c: M[0], w: 700 }, info2: { f: 'kids', s: 32, c: '#333' }, sign: { f: 'kids', s: 40, c: darken(M[1], 0.3) },
  };
  return finish(c, bg, d, T, bx(c, 0.14, 0.24, 0.72, 0.5));
});

// 9 ─ Romantic
def('romantic', ['عاشقانه', 'Romantic'], ['romantic', 'love', 'wedding'], false, (c) => {
  const { W, H, pal } = c, u = W / 1000, r = rng(c.seed + 'r');
  const bg = { type: 'gradient', radial: true, c1: '#fff0f3', c2: '#f7b7c8', cy: 0.4 };
  const d = [];
  for (let i = 0; i < 14; i++) d.push(clip('heart', r() * W, r() * H, (24 + r() * 70) * u, (24 + r() * 70) * u, i % 3 ? '#e85d8a' : '#c2476a', null, { opacity: 0.12 + r() * 0.3, rot: (r() - 0.5) * 50 }));
  d.push(shape('round', W * 0.09, H * 0.18, W * 0.82, H * 0.64, 'rgba(255,255,255,.72)', { radius: 120 * u, stroke: '#e85d8a', sw: 3 * u, shadow: { color: 'rgba(194,71,106,.25)', blur: 30 * u, y: 10 * u } }),
    clip('ribbonBow', W / 2 - 70 * u, H * 0.14 - 40 * u, 140 * u, 140 * u, '#c2476a'), clip('rose', 30 * u, H - 210 * u, 170 * u, 170 * u, '#d6336c', '#3f8f5a'), clip('rose', W - 190 * u, H - 230 * u, 150 * u, 150 * u, '#e85d8a', '#3f8f5a', { flip: true }),
    clip('hearts3', W / 2 - 55 * u, H - 150 * u, 110 * u, 110 * u, '#c2476a', '#f7a8c4'));
  if (c.alt) { d.find((e) => e.clip === 'ribbonBow').y = H - 160 * u; d.find((e) => e.clip === 'hearts3').y = H * 0.06; }
  const T = {
    small: { f: 'body', s: 25, c: '#8a2b4d' }, sub: { f: 'script', s: 52, c: '#c2476a' }, title: { f: 'script', s: 118, c: '#b3203a', lh: 1.1 }, names: { f: 'script', s: 88, c: '#c2476a', lh: 1.2 },
    body: { f: 'elegant', s: 36, c: '#5a1f35', lh: 1.55 }, info: { f: 'elegant', s: 40, c: '#8a2b4d', w: 700 }, info2: { f: 'elegant', s: 33, c: '#5a1f35' }, sign: { f: 'script', s: 54, c: '#b3203a' },
  };
  return finish(c, bg, d, T, bx(c, 0.16, 0.22, 0.68, 0.54));
});

// 10 ─ Traditional Persian
def('persian', ['سنتی ایرانی', 'Persian traditional'], ['persian', 'traditional', 'formal'], false, (c) => {
  const { W, H } = c, u = W / 1000, tur = '#0e6f7a', navy = '#102a52', gold = '#d4af37';
  const bg = { type: 'gradient', radial: true, c1: '#164a8a', c2: navy, cy: 0.4 };
  const d = [
    frame('deco', gold, 5 * u, 34 * u, c, { color2: '#f4d36f' }),
    clip('toranj', W * 0.12, H * 0.07, W * 0.76, H * 0.86, alpha(gold, 0.9), alpha('#0e6f7a', 0.55), { opacity: 0.22 }),
    clip('boteh', 52 * u, 52 * u, 150 * u, 150 * u, gold, tur), clip('boteh', W - 202 * u, H - 202 * u, 150 * u, 150 * u, gold, tur, { flip: true, rot: 180 }),
    clip('boteh', W - 202 * u, 52 * u, 150 * u, 150 * u, '#f4d36f', tur, { flip: true }), clip('boteh', 52 * u, H - 202 * u, 150 * u, 150 * u, '#f4d36f', tur, { rot: 180 }),
    clip('divider-flourish', W / 2 - 150 * u, H - 150 * u, 300 * u, 40 * u, gold),
  ];
  if (c.alt) { d[1].opacity = 0.22; d.push(clip('mehrab', W / 2 - 110 * u, 70 * u, 220 * u, 300 * u, alpha(gold, 0.35), tur, { opacity: 0.5 })); }
  const T = {
    small: { f: 'body', s: 26, c: '#f4e4b0' }, sub: { f: 'trad', s: 42, c: '#f4d36f' }, title: { f: 'trad', s: 96, c: '#f4d36f', grad: GOLD, lh: 1.7 },
    names: { f: 'script', s: 80, c: '#fff1b8', lh: 1.5 }, body: { f: 'elegant', s: 36, c: '#fdf3d4', lh: 1.75 }, info: { f: 'elegant', s: 40, c: '#f4d36f', w: 700 }, info2: { f: 'elegant', s: 34, c: '#fdf3d4' }, sign: { f: 'trad', s: 44, c: '#f4d36f' },
  };
  return finish(c, bg, d, T, bx(c, 0.19, 0.2, 0.62, 0.58));
});

// 11 ─ Arabic & Islamic
def('islamic', ['عربی و اسلامی', 'Arabic & Islamic'], ['islamic', 'religious', 'traditional'], false, (c) => {
  const { W, H } = c, u = W / 1000, em = '#0c4a3a', gold = '#d4af37';
  const bg = { type: 'pattern', kind: 'star8', color: 'rgba(212,175,55,.2)', bg: em, size: 120 * u };
  const d = [
    shape('rect', 0, 0, W, H, null, { grad: { c1: 'rgba(5,40,30,.1)', c2: 'rgba(5,40,30,.75)', angle: 90 } }),
    frame('double', gold, 5 * u, 36 * u, c, { color2: '#f4d36f' }),
    clip('mehrab', W * 0.13, H * 0.1, W * 0.74, H * 0.8, gold, '#f4d36f'),
    clip('lantern', 70 * u, 70 * u, 120 * u, 120 * u, gold, '#ffd166'), clip('lantern', W - 190 * u, 70 * u, 120 * u, 120 * u, gold, '#ffd166', { flip: true }),
    clip('crescent', W / 2 - 52 * u, 62 * u, 104 * u, 104 * u, '#f4d36f', '#fff3b0'), clip('arabesqueCorner', 36 * u, H - 176 * u, 140 * u, 140 * u, gold, null, { rot: -90 }), clip('arabesqueCorner', W - 176 * u, H - 176 * u, 140 * u, 140 * u, gold, null, { rot: 180 }),
  ];
  if (c.alt) { d[2].opacity = 0.35; d[5].y = H - 190 * u; }
  const T = {
    small: { f: 'body', s: 26, c: '#f4e4b0' }, sub: { f: 'caps', s: 40, c: '#f4d36f' }, title: { f: 'display', s: 96, c: '#f4d36f', grad: GOLD, lh: 1.6 },
    names: { f: 'elegant', s: 70, c: '#fff1b8', lh: 1.5 }, body: { f: 'elegant', s: 38, c: '#f3ead0', lh: 1.8 }, info: { f: 'elegant', s: 40, c: '#f4d36f', w: 700 }, info2: { f: 'elegant', s: 34, c: '#f3ead0' }, sign: { f: 'caps', s: 40, c: '#f4d36f' },
  };
  return finish(c, bg, d, T, bx(c, 0.21, 0.27, 0.58, 0.5));
});

// 12 ─ European
def('european', ['اروپایی', 'European'], ['european', 'classic', 'wedding'], false, (c) => {
  const { W, H, pal } = c, u = W / 1000;
  const bg = { type: 'pattern', kind: 'diamonds', color: alpha(pal.a, 0.14), bg: '#fffaf0', size: 70 * u };
  const d = [
    shape('rect', 50 * u, 50 * u, W - 100 * u, H - 100 * u, '#fffdf8', { stroke: pal.a, sw: 3 * u, shadow: { color: 'rgba(0,0,0,.12)', blur: 18 * u, y: 6 * u } }),
    frame('scallop', pal.a, 6 * u, 70 * u, c, { color2: pal.a2 }),
    clip('seal', W / 2 - 62 * u, H - 190 * u, 124 * u, 124 * u, pal.d, pal.a2), clip('ribbonBanner', W / 2 - 170 * u, 118 * u, 340 * u, 90 * u, pal.a, null, { opacity: 0.0 }),
    clip('laurel', W / 2 - 80 * u, 92 * u, 160 * u, 160 * u, pal.a), clip('sprig', 76 * u, H - 230 * u, 140 * u, 140 * u, '#5a8f67', pal.a, { rot: -15 }), clip('sprig', W - 216 * u, H - 230 * u, 140 * u, 140 * u, '#5a8f67', pal.a, { rot: 15, flip: true }),
  ];
  if (c.alt) { d[2].y = 80 * u; d[4].y = H - 250 * u; }
  const T = {
    small: { f: 'body', s: 24, c: '#555' }, sub: { f: 'caps', s: 30, c: pal.a, ls: 6, upper: true }, title: { f: 'elegant', s: 90, c: pal.d, w: 700, lh: 1.1 },
    names: { f: 'script', s: 80, c: pal.a, lh: 1.2 }, body: { f: 'elegant', s: 35, c: '#3a3a3a', lh: 1.5, i: true }, info: { f: 'caps', s: 34, c: pal.d, ls: 3, upper: true }, info2: { f: 'elegant', s: 32, c: '#3a3a3a' }, sign: { f: 'script', s: 46, c: pal.a },
  };
  return finish(c, bg, d, T, bx(c, 0.17, 0.27, 0.66, 0.46));
});

// 13 ─ Official
def('official', ['رسمی و اداری', 'Official & corporate'], ['official', 'business', 'formal'], false, (c) => {
  const { W, H, pal } = c, u = W / 1000, navy = pal.d;
  const bg = { type: 'color', color: '#ffffff' };
  const d = [
    shape('rect', 0, 0, W, H * 0.17, navy), shape('rect', 0, H * 0.17, W, 8 * u, pal.a), shape('rect', 0, H * 0.94, W, H * 0.06, navy),
    clip('seal', c.alt ? W - 190 * u : 60 * u, H * 0.17 / 2 - 62 * u, 124 * u, 124 * u, '#ffffff', pal.a2),
    shape('rect', W * 0.12, H * 0.83, W * 0.76, 2 * u, pal.a), clip('laurel', W / 2 - 40 * u, H * 0.855, 80 * u, 80 * u, pal.a),
  ];
  const T = {
    small: { f: 'body', s: 24, c: '#555' }, sub: { f: 'body', s: 26, c: pal.a, ls: 4, upper: true, w: 700 }, title: { f: 'body', s: 70, c: navy, w: 700, lh: 1.2 },
    names: { f: 'body', s: 46, c: pal.a, w: 700 }, body: { f: 'body', s: 30, c: '#333', lh: 1.65 }, info: { f: 'body', s: 36, c: navy, w: 700 }, info2: { f: 'body', s: 30, c: '#333' }, sign: { f: 'elegant', s: 36, c: navy, i: true },
  };
  return finish(c, bg, d, T, bx(c, 0.12, 0.23, 0.76, 0.58));
});

// 14 ─ Black & gold
def('blackgold', ['طلایی و مشکی', 'Black & gold'], ['luxury', 'party', 'modern', 'formal'], true, (c) => {
  const { W, H } = c, u = W / 1000;
  const bg = { type: 'pattern', kind: 'stripes', color: 'rgba(212,175,55,.07)', bg: '#0b0b0d', size: 60 * u };
  const d = [
    frame('deco', GOLD_MID, 5 * u, 36 * u, c, { color2: '#f4d36f' }), clip('diamond', W / 2 - 50 * u, 80 * u, 100 * u, 100 * u, '#d4af37'),
    clip('divider-diamond', W / 2 - 160 * u, H - 140 * u, 320 * u, 24 * u, '#d4af37'), clip('star8', 70 * u, H - 160 * u, 80 * u, 80 * u, '#d4af37', null, { opacity: 0.7 }), clip('star8', W - 150 * u, H - 160 * u, 80 * u, 80 * u, '#d4af37', null, { opacity: 0.7 }),
  ];
  if (c.alt) { d[1].y = H - 190 * u; d[2].y = 190 * u; }
  const T = {
    small: { f: 'body', s: 25, c: '#cdbb85' }, sub: { f: 'caps', s: 32, c: '#d4af37', ls: 8, upper: true }, title: { f: 'display', s: 96, c: '#f4d36f', grad: GOLD, w: 700, lh: 1.12 },
    names: { f: 'script', s: 86, c: '#f4d36f', grad: GOLD, lh: 1.2 }, body: { f: 'body', s: 30, c: '#e5dcc0', lh: 1.65 }, info: { f: 'caps', s: 38, c: '#f4d36f', grad: GOLD, ls: 3, upper: true, w: 700 }, info2: { f: 'body', s: 30, c: '#e5dcc0' }, sign: { f: 'script', s: 50, c: '#f4d36f', grad: GOLD },
  };
  return finish(c, bg, d, T, bx(c, 0.15, 0.22, 0.7, 0.56));
});

// 15 ─ White & gold
def('whitegold', ['سفید و طلایی', 'White & gold'], ['luxury', 'wedding', 'minimal', 'formal'], false, (c) => {
  const { W, H } = c, u = W / 1000;
  const bg = { type: 'texture', kind: 'marble', c1: '#fbfaf7', c2: '#b8b4aa', c3: '#ffffff', seed: c.seed };
  const d = [
    frame('thickthin', GOLD_MID, 5 * u, 44 * u, c, { color2: '#e6c76a' }), clip('divider-flourish', W / 2 - 150 * u, H * 0.135, 300 * u, 40 * u, GOLD_MID),
    clip('divider-flourish', W / 2 - 150 * u, H * 0.855, 300 * u, 40 * u, GOLD_MID, null, { rot: 180 }), clip('corner-curl', 56 * u, 56 * u, 120 * u, 120 * u, GOLD_MID), clip('corner-curl', W - 176 * u, 56 * u, 120 * u, 120 * u, GOLD_MID, null, { flip: true }),
    clip('corner-curl', 56 * u, H - 176 * u, 120 * u, 120 * u, GOLD_MID, null, { rot: -90 }), clip('corner-curl', W - 176 * u, H - 176 * u, 120 * u, 120 * u, GOLD_MID, null, { rot: 180 }),
  ];
  if (c.alt) { d.splice(1, 2); d.push(clip('rings', W / 2 - 55 * u, H * 0.09, 110 * u, 110 * u, '#d4af37', '#bde0fe')); }
  const T = {
    small: { f: 'body', s: 24, c: '#6d6755' }, sub: { f: 'caps', s: 30, c: '#7a5a1c', ls: 7, upper: true }, title: { f: 'display', s: 92, c: '#8d6a1f', grad: GOLD_DARK, w: 700, lh: 1.12 },
    names: { f: 'script', s: 88, c: '#8d6a1f', grad: GOLD_DARK, lh: 1.2 }, body: { f: 'elegant', s: 36, c: '#4a4638', lh: 1.55 }, info: { f: 'elegant', s: 40, c: '#8d6e2f', w: 700 }, info2: { f: 'elegant', s: 33, c: '#4a4638' }, sign: { f: 'script', s: 48, c: '#8d6a1f', grad: GOLD },
  };
  return finish(c, bg, d, T, bx(c, 0.17, 0.2, 0.66, 0.6));
});

// 16 ─ Watercolor
def('watercolor', ['آبرنگی', 'Watercolor'], ['watercolor', 'romantic', 'greeting', 'floral'], false, (c) => {
  const { W, H, pal } = c, u = W / 1000;
  const bg = { type: 'texture', kind: 'watercolor', c1: '#fffdf9', c2: pal.a, c3: pal.a2, m: [...pal.m.slice(0, 3), '#9ed0ff'], seed: c.seed };
  const d = [
    clip('leaf', -40 * u, H * 0.72, 260 * u, 260 * u, '#7fb685', null, { rot: -30, opacity: 0.85 }), clip('leaf', W - 210 * u, -30 * u, 240 * u, 240 * u, '#8fc49a', null, { rot: 150, opacity: 0.85 }),
    clip('sprig', W - 230 * u, H - 270 * u, 210 * u, 210 * u, '#6aa87a', pal.a, { opacity: 0.95 }), clip('sakura', 30 * u, 50 * u, 140 * u, 140 * u, pal.a2, pal.a),
    shape('round', W * 0.1, H * 0.2, W * 0.8, H * 0.6, 'rgba(255,255,255,.62)', { radius: 50 * u }),
  ];
  if (c.alt) { d[3].x = W - 170 * u; d[3].flip = true; d[2].x = 20 * u; d[2].flip = true; }
  const T = {
    small: { f: 'body', s: 25, c: '#555' }, sub: { f: 'script', s: 50, c: darken(pal.a, 0.3) }, title: { f: 'script', s: 112, c: darken(pal.a, 0.15), lh: 1.15 }, names: { f: 'script', s: 80, c: darken(pal.a, 0.2), lh: 1.2 },
    body: { f: 'elegant', s: 36, c: '#3f3f46', lh: 1.55 }, info: { f: 'elegant', s: 40, c: darken(pal.a, 0.25), w: 700 }, info2: { f: 'elegant', s: 33, c: '#3f3f46' }, sign: { f: 'script', s: 50, c: darken(pal.a, 0.3) },
  };
  return finish(c, bg, d, T, bx(c, 0.16, 0.23, 0.68, 0.54));
});

// 17 ─ Galaxy
def('galaxy', ['آسمانی و کهکشانی', 'Sky & galaxy'], ['galaxy', 'fantasy', 'modern', 'religious'], false, (c) => {
  const { W, H } = c, u = W / 1000;
  const bg = { type: 'texture', kind: 'galaxy', c1: '#070b24', c2: '#1b1450', c3: '#0b3b5a', n1: '#7b4bd1', n2: '#14919b', n3: '#c2476a', seed: c.seed };
  const d = [
    clip('moon', c.alt ? 70 * u : W - 220 * u, 70 * u, 150 * u, 150 * u, '#fff3b0'), clip('star8', c.alt ? W - 190 * u : 70 * u, H - 220 * u, 120 * u, 120 * u, '#c7d2fe', null, { opacity: 0.5 }),
    clip('sparkle', W * 0.12, H * 0.16, 60 * u, 60 * u, '#ffffff'), clip('sparkle', W * 0.84, H * 0.7, 46 * u, 46 * u, '#ffffff'), clip('sparkle', W * 0.5, H * 0.9, 38 * u, 38 * u, '#ffffff'),
    shape('round', W * 0.11, H * 0.2, W * 0.78, H * 0.6, 'rgba(255,255,255,.06)', { radius: 40 * u, stroke: 'rgba(199,210,254,.45)', sw: 2 * u }),
  ];
  const glow = { color: 'rgba(160,180,255,.85)', blur: 22, y: 0 };
  const T = {
    small: { f: 'body', s: 25, c: '#c7d2fe' }, sub: { f: 'caps', s: 30, c: '#a5b4fc', ls: 7, upper: true }, title: { f: 'display', s: 94, c: '#ffffff', shadow: glow, w: 700, lh: 1.15 },
    names: { f: 'script', s: 80, c: '#e0e7ff', shadow: glow }, body: { f: 'body', s: 30, c: '#e0e7ff', lh: 1.65 }, info: { f: 'body', s: 38, c: '#fff3b0', w: 700 }, info2: { f: 'body', s: 30, c: '#e0e7ff' }, sign: { f: 'script', s: 48, c: '#fff3b0', shadow: glow },
  };
  return finish(c, bg, d, T, bx(c, 0.15, 0.23, 0.7, 0.54));
});

// 18 ─ Artistic
def('artistic', ['هنری و خلاقانه', 'Artistic & creative'], ['artistic', 'modern', 'party', 'business'], false, (c) => {
  const { W, H, pal } = c, u = W / 1000, M = pal.m;
  const bg = { type: 'color', color: lighten(pal.l, 0.4) };
  const a = c.alt;
  const d = [
    shape('circle', a ? W * 0.5 : -W * 0.15, -H * 0.04, W * 0.7, W * 0.7, M[0]), shape('tri', a ? -W * 0.05 : W * 0.55, H * 0.62, W * 0.55, W * 0.5, M[1], { rot: a ? 20 : -15 }),
    shape('round', a ? -W * 0.1 : W * 0.62, a ? H * 0.8 : H * 0.05, W * 0.5, W * 0.18, M[2], { radius: 40 * u, rot: a ? -10 : 12 }), shape('circle', a ? W * 0.82 : W * 0.04, H * 0.85, W * 0.14, W * 0.14, M[3]),
    shape('rect', W * 0.1, H * 0.18, W * 0.8, H * 0.64, '#ffffff', { stroke: '#141414', sw: 5 * u, shadow: { color: '#141414', blur: 0, x: 16 * u, y: 16 * u } }),
    clip('star8', a ? W * 0.08 : W * 0.78, H * 0.14, 110 * u, 110 * u, M[2], '#141414'),
  ];
  const T = {
    small: { f: 'body', s: 24, c: '#333' }, sub: { f: 'body', s: 26, c: M[0], ls: 5, upper: true, w: 700 }, title: { f: 'bold', s: 92, c: '#141414', w: 700, lh: 1.1 }, names: { f: 'display', s: 56, c: M[0], w: 700 },
    body: { f: 'body', s: 30, c: '#333', lh: 1.6 }, info: { f: 'bold', s: 38, c: '#141414', w: 700 }, info2: { f: 'body', s: 30, c: '#333' }, sign: { f: 'script', s: 46, c: M[0] },
  };
  return finish(c, bg, d, T, bx(c, 0.15, 0.22, 0.7, 0.56));
});

// 19 ─ Marble & stone
def('marble', ['سنگی و مرمری', 'Marble & stone'], ['luxury', 'modern', 'classic', 'business'], true, (c) => {
  const { W, H, pal } = c, u = W / 1000, dark = c.alt;
  const bg = { type: 'texture', kind: 'marble', c1: dark ? '#1b1d22' : '#f4f2ee', c2: dark ? '#8a8f98' : '#7d8590', c3: dark ? '#3a3f48' : '#ffffff', seed: c.seed + 'm' };
  const ink = dark ? '#f3f0e8' : '#1f2328', acc = dark ? '#e6c76a' : '#8d6e2f';
  const d = [
    shape('rect', W * 0.09, H * 0.09, W * 0.82, H * 0.82, dark ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.55)', { stroke: acc, sw: 4 * u }), shape('rect', W * 0.09 + 18 * u, H * 0.09 + 18 * u, W * 0.82 - 36 * u, H * 0.82 - 36 * u, null, { stroke: acc, sw: 1.5 * u }),
    clip('divider-diamond', W / 2 - 140 * u, H * 0.17, 280 * u, 22 * u, acc), clip('divider-diamond', W / 2 - 140 * u, H * 0.8, 280 * u, 22 * u, acc),
  ];
  const T = {
    small: { f: 'body', s: 24, c: dark ? '#c9c5b8' : '#555' }, sub: { f: 'caps', s: 28, c: acc, ls: 7, upper: true }, title: { f: 'display', s: 88, c: ink, w: 700, lh: 1.12 }, names: { f: 'script', s: 78, c: acc, lh: 1.2 },
    body: { f: 'elegant', s: 35, c: ink, lh: 1.55 }, info: { f: 'caps', s: 34, c: acc, ls: 3, upper: true, w: 700 }, info2: { f: 'elegant', s: 33, c: ink }, sign: { f: 'script', s: 46, c: acc },
  };
  return finish(c, bg, d, T, bx(c, 0.15, 0.22, 0.7, 0.56));
});

// 20 ─ Floral & gold
def('floralgold', ['گل و طلا', 'Floral & gold'], ['luxury', 'floral', 'wedding', 'romantic'], true, (c) => {
  const { W, H, pal } = c, u = W / 1000, bgc = c.alt ? '#0f2a2a' : darken(pal.d, 0.2), s = 420 * u;
  const bg = { type: 'gradient', radial: true, c1: lighten(bgc, 0.16), c2: darken(bgc, 0.3), cy: 0.4 };
  const d = [
    clip('cornerFlowers', 0, 0, s, s, '#d4af37', '#f4d36f'), clip('cornerFlowers', W - s, H - s, s, s, '#d4af37', '#f4d36f', { rot: 180, flip: true }),
    clip('wreath', W / 2 - 100 * u, 60 * u, 200 * u, 200 * u, '#d4af37', '#f4d36f', { opacity: 0.9 }), frame('line', alpha('#d4af37', 0.8), 3 * u, 30 * u, c), clip('divider-flourish', W / 2 - 150 * u, H - 150 * u, 300 * u, 42 * u, '#d4af37'),
  ];
  if (c.alt) { d[2].y = H - 280 * u; d[4].y = 270 * u; }
  const T = {
    small: { f: 'body', s: 25, c: '#e8d9a8' }, sub: { f: 'elegant', s: 36, c: '#f4d36f', i: true }, title: { f: 'script', s: 112, c: '#f4d36f', grad: GOLD, lh: 1.15 }, names: { f: 'script', s: 84, c: '#f4d36f', grad: GOLD, lh: 1.2 },
    body: { f: 'elegant', s: 36, c: '#f3ead0', lh: 1.55 }, info: { f: 'elegant', s: 40, c: '#f4d36f', w: 700 }, info2: { f: 'elegant', s: 33, c: '#f3ead0' }, sign: { f: 'script', s: 50, c: '#f4d36f', grad: GOLD },
  };
  return finish(c, bg, d, T, bx(c, 0.17, 0.26, 0.66, 0.5));
});

// 21 ─ Luxe (burgundy foil)
def('luxe', ['مجلل و لاکچری', 'Opulent luxury'], ['luxury', 'formal', 'wedding', 'party'], true, (c) => {
  const { W, H } = c, u = W / 1000, base = c.alt ? '#0d1b2a' : '#3a0a17';
  const bg = { type: 'gradient', angle: 100, c1: lighten(base, 0.15), c2: base, c3: darken(base, 0.4) };
  const d = [
    shape('round', 38 * u, 38 * u, W - 76 * u, H - 76 * u, null, { stroke: '#d4af37', sw: 4 * u, radius: 40 * u }), shape('round', 60 * u, 60 * u, W - 120 * u, H - 120 * u, null, { stroke: alpha('#f4d36f', 0.6), sw: 1.5 * u, radius: 28 * u }),
    clip('monogram', W / 2 - 80 * u, 88 * u, 160 * u, 160 * u, '#d4af37', '#f4d36f'), clip('dove', W / 2 - 50 * u, H - 190 * u, 100 * u, 100 * u, '#f4efe0', null, { opacity: 0.95 }),
    clip('corner-deco', 70 * u, 70 * u, 110 * u, 110 * u, '#d4af37'), clip('corner-deco', W - 180 * u, 70 * u, 110 * u, 110 * u, '#d4af37', null, { flip: true }),
    clip('corner-deco', 70 * u, H - 180 * u, 110 * u, 110 * u, '#d4af37', null, { rot: -90 }), clip('corner-deco', W - 180 * u, H - 180 * u, 110 * u, 110 * u, '#d4af37', null, { rot: 180 }),
  ];
  if (c.alt) { d[2].clip = 'crown'; d[3].clip = 'diamond'; }
  const T = {
    small: { f: 'body', s: 25, c: '#e8cfa0' }, sub: { f: 'caps', s: 30, c: '#f4d36f', ls: 7, upper: true }, title: { f: 'display', s: 92, c: '#f4d36f', grad: GOLD, w: 700, lh: 1.12 }, names: { f: 'script', s: 84, c: '#f4d36f', grad: GOLD, lh: 1.2 },
    body: { f: 'elegant', s: 36, c: '#f6e9ce', lh: 1.55 }, info: { f: 'elegant', s: 40, c: '#f4d36f', w: 700 }, info2: { f: 'elegant', s: 33, c: '#f6e9ce' }, sign: { f: 'script', s: 48, c: '#f4d36f', grad: GOLD },
  };
  return finish(c, bg, d, T, bx(c, 0.16, 0.27, 0.68, 0.46));
});

export const STYLE_IDS = Object.keys(STYLES);
