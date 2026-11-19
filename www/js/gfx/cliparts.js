// Built-in vector clipart library (drawn with the Canvas API, so it works offline and recolors on demand).
// Every clip draws inside its own viewBox (vb) using primary colour c1 and secondary colour c2.
import { lighten, darken, alpha, rng } from '../core/util.js';

const TAU = Math.PI * 2;
const fillStroke = (ctx, fill, stroke, lw) => {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
};
const circle = (ctx, x, y, r, fill, stroke, lw) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fillStroke(ctx, fill, stroke, lw); };
const ell = (ctx, x, y, rx, ry, rot, fill, stroke, lw) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); fillStroke(ctx, fill, stroke, lw); };
const poly = (ctx, pts, fill, stroke, lw) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); fillStroke(ctx, fill, stroke, lw); };
const path = (ctx, d, fill, stroke, lw) => { const p = new Path2D(d); if (fill) { ctx.fillStyle = fill; ctx.fill(p); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(p); } };
const rrect = (ctx, x, y, w, h, r, fill, stroke, lw) => { ctx.beginPath(); roundRectPath(ctx, x, y, w, h, r); fillStroke(ctx, fill, stroke, lw); };
export function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
export function starPts(cx, cy, n, ro, ri, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = rot + (i * Math.PI) / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}
const petals = (ctx, n, len, wid, off, fill, stroke, lw, rot0 = 0) => {
  for (let i = 0; i < n; i++) { ctx.save(); ctx.rotate(rot0 + (i * TAU) / n); ell(ctx, 0, -off - len / 2, wid / 2, len / 2, 0, fill, stroke, lw); ctx.restore(); }
};
const HEART = 'M50 90 C8 60 4 28 27 19 C40 14 48 23 50 31 C52 23 60 14 73 19 C96 28 92 60 50 90 Z';
const LEAF = 'M0 0 C10 -14 30 -16 44 -8 C34 6 14 12 0 0 Z';
const withT = (ctx, x, y, s, rot, fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s); fn(); ctx.restore(); };
const GREEN = '#3f8f5a';

export const CLIPS = {};
const def = (id, cat, n, vb, draw) => { CLIPS[id] = { id, cat, n, vb, draw }; };

// ================= FLOWERS =================
def('rose', 'flowers', ['گل رز', 'Rose'], [100, 100], (ctx, c1, c2) => {
  withT(ctx, 50, 52, 1, -0.5, () => { path(ctx, LEAF, c2 || GREEN); }); withT(ctx, 52, 56, 1, Math.PI + 0.6, () => { path(ctx, LEAF, c2 || GREEN); });
  ctx.save(); ctx.translate(50, 46);
  circle(ctx, 0, 0, 36, darken(c1, 0.25));
  petals(ctx, 6, 30, 30, 10, c1, darken(c1, 0.3), 1.2);
  petals(ctx, 5, 22, 24, 4, lighten(c1, 0.12), darken(c1, 0.3), 1.2, 0.3);
  circle(ctx, 0, 0, 13, darken(c1, 0.1), darken(c1, 0.4), 1.2);
  ctx.beginPath(); ctx.arc(0, 0, 8, 0.4, 4.6); ctx.strokeStyle = darken(c1, 0.45); ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.arc(1, 1, 3.5, 1, 5); ctx.stroke();
  ctx.restore();
});
def('tulip', 'flowers', ['لاله', 'Tulip'], [100, 100], (ctx, c1, c2) => {
  ctx.strokeStyle = c2 || GREEN; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(50, 50); ctx.lineTo(50, 96); ctx.stroke();
  withT(ctx, 50, 92, 1, -0.9, () => path(ctx, LEAF, c2 || GREEN)); withT(ctx, 50, 86, 1, Math.PI + 0.9, () => path(ctx, LEAF, c2 || GREEN));
  path(ctx, 'M26 22 C26 52 36 62 50 62 C64 62 74 52 74 22 C66 30 58 26 50 14 C42 26 34 30 26 22 Z', c1, darken(c1, 0.3), 1.5);
  path(ctx, 'M50 14 C44 34 44 50 50 62 C56 50 56 34 50 14 Z', lighten(c1, 0.2));
});
def('daisy', 'flowers', ['گل مروارید', 'Daisy'], [100, 100], (ctx, c1, c2) => {
  ctx.save(); ctx.translate(50, 50); petals(ctx, 14, 30, 11, 8, '#ffffff', darken('#cccccc', 0.1), 1); circle(ctx, 0, 0, 12, c2 || '#f4b400', darken(c2 || '#f4b400', 0.3), 1.2); circle(ctx, -3, -3, 3, lighten(c2 || '#f4b400', 0.5)); ctx.restore();
});
def('lotus', 'flowers', ['نیلوفر', 'Lotus'], [100, 100], (ctx, c1, c2) => {
  ctx.save(); ctx.translate(50, 78);
  for (const [rot, len] of [[-1.15, 40], [1.15, 40], [-0.7, 50], [0.7, 50]]) { ctx.save(); ctx.rotate(rot); ell(ctx, 0, -len / 2, 13, len / 2, 0, lighten(c1, 0.25), darken(c1, 0.25), 1.2); ctx.restore(); }
  ell(ctx, 0, -29, 14, 31, 0, c1, darken(c1, 0.3), 1.2); ell(ctx, 0, -29, 5, 20, 0, lighten(c1, 0.35));
  ctx.restore(); ell(ctx, 50, 90, 38, 6, 0, alpha(c2 || '#2a9d8f', 0.6));
});
def('sakura', 'flowers', ['شکوفه', 'Blossom'], [100, 100], (ctx, c1, c2) => {
  ctx.save(); ctx.translate(50, 50);
  for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate((i * TAU) / 5); path(ctx, 'M0 -6 C-18 -14 -16 -42 -2 -40 L0 -34 L2 -40 C16 -42 18 -14 0 -6Z', lighten(c1, 0.4), darken(c1, 0.15), 1.2); ctx.restore(); }
  circle(ctx, 0, 0, 5, c2 || '#f4b400');
  for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5 + 0.3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14 * Math.cos(a), 14 * Math.sin(a)); ctx.strokeStyle = darken(c1, 0.3); ctx.lineWidth = 1; ctx.stroke(); circle(ctx, 14 * Math.cos(a), 14 * Math.sin(a), 1.8, darken(c1, 0.3)); }
  ctx.restore();
});
def('sunflower', 'flowers', ['آفتابگردان', 'Sunflower'], [100, 100], (ctx, c1, c2) => {
  ctx.save(); ctx.translate(50, 50); petals(ctx, 18, 30, 12, 10, c1, darken(c1, 0.3), 1); petals(ctx, 18, 24, 10, 8, lighten(c1, 0.15), null, 0, 0.17);
  circle(ctx, 0, 0, 17, c2 || '#5b3a1e', darken(c2 || '#5b3a1e', 0.4), 1.2);
  const r = rng('sf'); for (let i = 0; i < 40; i++) { const a = r() * TAU, d = r() * 14; circle(ctx, d * Math.cos(a), d * Math.sin(a), 1, lighten(c2 || '#5b3a1e', 0.3)); }
  ctx.restore();
});
def('leaf', 'flowers', ['برگ', 'Leaf'], [100, 100], (ctx, c1) => {
  path(ctx, 'M10 90 C10 40 40 10 90 10 C90 60 60 90 10 90 Z', c1 || GREEN, darken(c1 || GREEN, 0.3), 1.5);
  path(ctx, 'M10 90 C35 60 55 40 80 20', null, lighten(c1 || GREEN, 0.5), 2);
});
def('sprig', 'flowers', ['شاخه', 'Sprig'], [100, 100], (ctx, c1, c2) => {
  ctx.strokeStyle = darken(c1 || GREEN, 0.2); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(50, 96); ctx.quadraticCurveTo(46, 50, 56, 6); ctx.stroke();
  for (let i = 0; i < 6; i++) { const y = 90 - i * 14, side = i % 2 ? 1 : -1; withT(ctx, 49 + (i * 1.2), y, 0.7 - i * 0.04, side > 0 ? -0.6 : Math.PI + 0.6, () => path(ctx, LEAF, i % 2 ? c1 || GREEN : lighten(c1 || GREEN, 0.15), darken(c1 || GREEN, 0.3), 1.2)); }
  circle(ctx, 56, 6, 4, c2 || '#f4b400');
});
def('cornerFlowers', 'flowers', ['گوشه گل', 'Floral corner'], [100, 100], (ctx, c1, c2) => {
  ctx.strokeStyle = GREEN; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(2, 40); ctx.bezierCurveTo(30, 40, 40, 30, 40, 2); ctx.moveTo(2, 70); ctx.bezierCurveTo(50, 70, 70, 50, 70, 2); ctx.stroke();
  for (const [x, y, r] of [[18, 40, 0.6], [40, 24, 0.7], [58, 40, 0.5], [30, 62, 0.55]]) withT(ctx, x, y, r, x, () => path(ctx, LEAF, GREEN));
  for (const [x, y, s, col] of [[22, 22, 0.42, c1], [48, 52, 0.36, lighten(c1, 0.25)], [14, 56, 0.28, c2 || lighten(c1, 0.4)], [66, 22, 0.3, c2 || lighten(c1, 0.4)]]) withT(ctx, x, y, s, x / 30, () => { ctx.translate(-50, -50); CLIPS.rose.draw(ctx, col, GREEN); });
});
def('wreath', 'flowers', ['حلقه گل', 'Floral wreath'], [100, 100], (ctx, c1, c2) => {
  ctx.save(); ctx.translate(50, 50);
  for (let i = 0; i < 16; i++) { const a = (i * TAU) / 16; withT(ctx, 38 * Math.cos(a), 38 * Math.sin(a), 0.42, a + Math.PI / 2 + 0.5, () => path(ctx, LEAF, GREEN, darken(GREEN, 0.3), 1)); }
  for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6 + 0.3; withT(ctx, 38 * Math.cos(a), 38 * Math.sin(a), 0.28, 0, () => { ctx.translate(-50, -50); CLIPS.rose.draw(ctx, i % 2 ? c1 : c2 || lighten(c1, 0.3), GREEN); }); }
  ctx.restore();
});

// ================= FRAMES / DIVIDERS =================
def('divider-flourish', 'frames', ['جداکننده تزئینی', 'Flourish divider'], [300, 40], (ctx, c1) => {
  ctx.strokeStyle = c1; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(150, 20); ctx.scale(s, 1);
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.bezierCurveTo(40, -16, 60, 14, 84, 0); ctx.bezierCurveTo(100, -10, 106, 8, 96, 8); ctx.bezierCurveTo(88, 8, 88, -4, 98, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(110, 0); ctx.lineTo(146, 0); ctx.stroke(); ctx.restore();
  }
  poly(ctx, [[150, 8], [158, 20], [150, 32], [142, 20]], c1); circle(ctx, 134, 20, 2.4, c1); circle(ctx, 166, 20, 2.4, c1);
});
def('divider-diamond', 'frames', ['خط لوزی', 'Diamond line'], [300, 24], (ctx, c1) => {
  ctx.strokeStyle = c1; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(126, 12); ctx.moveTo(174, 12); ctx.lineTo(296, 12); ctx.stroke();
  poly(ctx, [[150, 3], [159, 12], [150, 21], [141, 12]], c1); poly(ctx, [[132, 8], [136, 12], [132, 16], [128, 12]], c1); poly(ctx, [[168, 8], [172, 12], [168, 16], [164, 12]], c1);
});
def('corner-curl', 'frames', ['گوشه فرفری', 'Curl corner'], [100, 100], (ctx, c1) => {
  ctx.strokeStyle = c1; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(4, 96); ctx.lineTo(4, 30); ctx.bezierCurveTo(4, 12, 22, 4, 36, 14); ctx.bezierCurveTo(46, 22, 38, 34, 30, 30); ctx.bezierCurveTo(24, 27, 28, 20, 32, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(96, 4); ctx.stroke(); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(14, 96); ctx.lineTo(14, 40); ctx.moveTo(40, 14); ctx.lineTo(96, 14); ctx.stroke();
  circle(ctx, 22, 22, 3, c1);
});
def('corner-deco', 'frames', ['گوشه آرتدکو', 'Art-deco corner'], [100, 100], (ctx, c1) => {
  ctx.strokeStyle = c1; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, 96); ctx.lineTo(4, 4); ctx.lineTo(96, 4); ctx.stroke();
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(14, 70); ctx.lineTo(14, 14); ctx.lineTo(70, 14); ctx.moveTo(24, 46); ctx.lineTo(24, 24); ctx.lineTo(46, 24); ctx.stroke();
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(4 + i * 12, 4 + (4 - i) * 12 + 12); ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1; }
});
def('medallion', 'frames', ['مدالیون', 'Medallion'], [100, 100], (ctx, c1, c2) => {
  ctx.save(); ctx.translate(50, 50); circle(ctx, 0, 0, 46, null, c1, 2.5); circle(ctx, 0, 0, 40, null, c1, 1.2);
  for (let i = 0; i < 24; i++) { const a = (i * TAU) / 24; circle(ctx, 43 * Math.cos(a), 43 * Math.sin(a), 1.6, c1); }
  ctx.restore();
});

// ================= RIBBONS =================
def('ribbonBanner', 'ribbons', ['روبان بنر', 'Banner ribbon'], [300, 80], (ctx, c1) => {
  poly(ctx, [[0, 20], [40, 20], [40, 70], [0, 70], [16, 45]], darken(c1, 0.3)); poly(ctx, [[300, 20], [260, 20], [260, 70], [300, 70], [284, 45]], darken(c1, 0.3));
  poly(ctx, [[40, 20], [40, 70], [50, 78], [50, 28]], darken(c1, 0.45)); poly(ctx, [[260, 20], [260, 70], [250, 78], [250, 28]], darken(c1, 0.45));
  rrect(ctx, 30, 8, 240, 52, 3, c1); ctx.strokeStyle = lighten(c1, 0.45); ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.strokeRect(36, 14, 228, 40); ctx.setLineDash([]);
});
def('ribbonBow', 'ribbons', ['پاپیون', 'Bow'], [100, 100], (ctx, c1) => {
  path(ctx, 'M50 50 C30 20 6 22 8 46 C10 70 34 62 50 50Z', c1, darken(c1, 0.3), 1.5); path(ctx, 'M50 50 C70 20 94 22 92 46 C90 70 66 62 50 50Z', c1, darken(c1, 0.3), 1.5);
  path(ctx, 'M48 54 L28 94 L40 90 L50 96 L52 58Z', darken(c1, 0.15), darken(c1, 0.4), 1.2); path(ctx, 'M52 54 L72 94 L60 90 L50 96 L48 58Z', darken(c1, 0.15), darken(c1, 0.4), 1.2);
  rrect(ctx, 42, 40, 16, 20, 6, lighten(c1, 0.1), darken(c1, 0.4), 1.5);
});
def('ribbonCurl', 'ribbons', ['روبان فرفری', 'Curly ribbon'], [200, 60], (ctx, c1) => {
  ctx.strokeStyle = c1; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, 40); ctx.bezierCurveTo(40, 4, 70, 70, 100, 30); ctx.bezierCurveTo(130, -6, 160, 66, 194, 22); ctx.stroke();
  ctx.strokeStyle = lighten(c1, 0.4); ctx.lineWidth = 1.6; ctx.stroke();
});

// ================= HEARTS & STARS =================
def('heart', 'hearts', ['قلب', 'Heart'], [100, 100], (ctx, c1) => { path(ctx, HEART, c1, darken(c1, 0.3), 2); ell(ctx, 30, 32, 9, 5, -0.7, 'rgba(255,255,255,.45)'); });
def('heartOutline', 'hearts', ['قلب توخالی', 'Heart outline'], [100, 100], (ctx, c1) => { path(ctx, HEART, null, c1, 4); });
def('hearts3', 'hearts', ['سه قلب', 'Three hearts'], [100, 100], (ctx, c1, c2) => {
  withT(ctx, 8, 30, 0.62, 0, () => CLIPS.heart.draw(ctx, c1)); withT(ctx, 50, 4, 0.5, 0, () => CLIPS.heart.draw(ctx, c2 || lighten(c1, 0.35))); withT(ctx, 42, 46, 0.5, 0, () => CLIPS.heart.draw(ctx, darken(c1, 0.12)));
});
def('star5', 'stars', ['ستاره', 'Star'], [100, 100], (ctx, c1) => { poly(ctx, starPts(50, 52, 5, 46, 20), c1, darken(c1, 0.3), 2); poly(ctx, starPts(50, 52, 5, 24, 10), lighten(c1, 0.3)); });
def('star8', 'stars', ['ستاره هشت‌پر', 'Eight-point star'], [100, 100], (ctx, c1, c2) => {
  poly(ctx, starPts(50, 50, 8, 46, 28, -Math.PI / 2), c1, darken(c1, 0.3), 1.5); poly(ctx, starPts(50, 50, 8, 28, 17, -Math.PI / 2 + Math.PI / 8), lighten(c1, 0.25)); circle(ctx, 50, 50, 8, c2 || darken(c1, 0.3));
});
def('sparkle', 'stars', ['درخشش', 'Sparkle'], [100, 100], (ctx, c1) => { path(ctx, 'M50 2 C54 38 62 46 98 50 C62 54 54 62 50 98 C46 62 38 54 2 50 C38 46 46 38 50 2Z', c1); });
def('burst', 'stars', ['آتش‌بازی', 'Fireworks'], [100, 100], (ctx, c1, c2) => {
  ctx.save(); ctx.translate(50, 50);
  for (let i = 0; i < 16; i++) { const a = (i * TAU) / 16, l = i % 2 ? 26 : 40; ctx.beginPath(); ctx.moveTo(10 * Math.cos(a), 10 * Math.sin(a)); ctx.lineTo(l * Math.cos(a), l * Math.sin(a)); ctx.strokeStyle = i % 2 ? c2 || lighten(c1, 0.4) : c1; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke(); circle(ctx, (l + 6) * Math.cos(a), (l + 6) * Math.sin(a), 2.4, i % 2 ? c1 : c2 || lighten(c1, 0.4)); }
  circle(ctx, 0, 0, 6, c2 || '#fff'); ctx.restore();
});
def('moon', 'stars', ['ماه', 'Moon'], [100, 100], (ctx, c1) => { path(ctx, 'M62 6 A44 44 0 1 0 94 70 A36 36 0 1 1 62 6 Z', c1, darken(c1, 0.25), 1.5); });
def('crescent', 'stars', ['هلال و ستاره', 'Crescent & star'], [100, 100], (ctx, c1, c2) => {
  path(ctx, 'M58 8 A42 42 0 1 0 90 72 A34 34 0 1 1 58 8 Z', c1, darken(c1, 0.25), 1.5); poly(ctx, starPts(70, 36, 5, 11, 4.5), c2 || lighten(c1, 0.3));
});

// ================= PARTY =================
def('candle', 'party', ['شمع', 'Candle'], [100, 100], (ctx, c1, c2) => {
  rrect(ctx, 38, 36, 24, 58, 4, c1, darken(c1, 0.3), 1.5); ctx.save(); ctx.beginPath(); ctx.rect(38, 36, 24, 58); ctx.clip(); ctx.strokeStyle = lighten(c1, 0.5); ctx.lineWidth = 4; for (let i = -2; i < 8; i++) { ctx.beginPath(); ctx.moveTo(34, 40 + i * 12); ctx.lineTo(66, 28 + i * 12); ctx.stroke(); } ctx.restore();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(50, 36); ctx.lineTo(50, 28); ctx.stroke();
  path(ctx, 'M50 6 C60 18 62 26 50 30 C38 26 40 18 50 6Z', c2 || '#ffb703', '#e85d04', 1.2); path(ctx, 'M50 16 C55 22 55 27 50 29 C45 27 45 22 50 16Z', '#fff3b0');
});
def('balloon', 'party', ['بادکنک', 'Balloon'], [100, 100], (ctx, c1) => {
  ctx.strokeStyle = '#777'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(50, 74); ctx.bezierCurveTo(42, 82, 58, 90, 50, 98); ctx.stroke();
  ell(ctx, 50, 38, 27, 34, 0, c1, darken(c1, 0.25), 1.5); poly(ctx, [[50, 70], [44, 78], [56, 78]], darken(c1, 0.2)); ell(ctx, 38, 24, 5, 9, 0.4, 'rgba(255,255,255,.5)');
});
def('balloons3', 'party', ['سه بادکنک', 'Balloon bunch'], [100, 100], (ctx, c1, c2) => {
  const cols = [c1, c2 || lighten(c1, 0.4), darken(c1, 0.1)];
  ctx.strokeStyle = '#777'; ctx.lineWidth = 1.2;
  for (const [x, y] of [[26, 36], [74, 36], [50, 28]]) { ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.quadraticCurveTo(50, 78, 50, 98); ctx.stroke(); }
  [[26, 36, 0], [74, 36, 1], [50, 26, 2]].forEach(([x, y, i]) => { ell(ctx, x, y, 21, 26, 0, cols[i], darken(cols[i], 0.25), 1.2); poly(ctx, [[x, y + 26], [x - 4, y + 32], [x + 4, y + 32]], darken(cols[i], 0.2)); ell(ctx, x - 8, y - 9, 3.5, 7, 0.4, 'rgba(255,255,255,.5)'); });
});
def('cake', 'party', ['کیک تولد', 'Birthday cake'], [100, 100], (ctx, c1, c2) => {
  ell(ctx, 50, 92, 44, 5, 0, 'rgba(0,0,0,.15)'); rrect(ctx, 10, 78, 80, 12, 5, darken(c1, 0.25));
  rrect(ctx, 16, 56, 68, 26, 4, c2 || lighten(c1, 0.55), darken(c1, 0.2), 1.2); rrect(ctx, 28, 36, 44, 22, 4, c1, darken(c1, 0.3), 1.2);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(28, 40); for (let x = 28; x <= 72; x += 11) ctx.quadraticCurveTo(x + 5.5, 54, x + 11, 40); ctx.lineTo(72, 36); ctx.lineTo(28, 36); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(16, 62); for (let x = 16; x < 84; x += 11.3) ctx.quadraticCurveTo(x + 5.6, 74, x + 11.3, 62); ctx.lineTo(84, 56); ctx.lineTo(16, 56); ctx.closePath(); ctx.fillStyle = c1; ctx.fill();
  for (const x of [38, 50, 62]) { rrect(ctx, x - 2, 20, 4, 16, 1, '#8ecae6'); path(ctx, `M${x} 10 C${x + 4} 15 ${x + 4} 18 ${x} 19 C${x - 4} 18 ${x - 4} 15 ${x} 10Z`, '#ffb703'); }
});
def('gift', 'party', ['هدیه', 'Gift'], [100, 100], (ctx, c1, c2) => {
  rrect(ctx, 14, 44, 72, 46, 3, c1, darken(c1, 0.3), 1.5); rrect(ctx, 10, 32, 80, 16, 3, lighten(c1, 0.1), darken(c1, 0.3), 1.5);
  const rb = c2 || '#ffd166'; rect(ctx, 46, 32, 8, 58, rb); rect(ctx, 10, 36, 80, 8, rb, 0.0);
  path(ctx, 'M50 32 C34 10 18 18 28 30 C34 36 46 33 50 32Z', rb, darken(rb, 0.3), 1.2); path(ctx, 'M50 32 C66 10 82 18 72 30 C66 36 54 33 50 32Z', rb, darken(rb, 0.3), 1.2);
});
function rect(ctx, x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
def('partyHat', 'party', ['کلاه جشن', 'Party hat'], [100, 100], (ctx, c1, c2) => {
  poly(ctx, [[50, 12], [86, 90], [14, 90]], c1, darken(c1, 0.3), 1.5); ctx.save(); ctx.beginPath(); ctx.moveTo(50, 12); ctx.lineTo(86, 90); ctx.lineTo(14, 90); ctx.closePath(); ctx.clip(); ctx.strokeStyle = c2 || '#fff'; ctx.lineWidth = 7; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(10, 70 - i * 17); ctx.lineTo(90, 52 - i * 17); ctx.stroke(); } ctx.restore();
  circle(ctx, 50, 12, 7, c2 || '#ffd166'); ell(ctx, 50, 91, 38, 5, 0, darken(c1, 0.2));
});
def('confetti', 'party', ['کاغذ رنگی', 'Confetti'], [100, 100], (ctx, c1, c2) => {
  const r = rng('confetti'), cols = [c1, c2 || lighten(c1, 0.4), '#ffd166', '#06d6a0', '#ef476f', '#8ecae6'];
  for (let i = 0; i < 38; i++) { ctx.save(); ctx.translate(r() * 96 + 2, r() * 96 + 2); ctx.rotate(r() * TAU); ctx.fillStyle = cols[i % cols.length]; if (i % 3) ctx.fillRect(-3, -1.5, 6, 3); else { ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill(); } ctx.restore(); }
});

// ================= WEDDING =================
def('rings', 'wedding', ['حلقه ازدواج', 'Wedding rings'], [100, 100], (ctx, c1, c2) => {
  circle(ctx, 37, 62, 24, null, darken(c1, 0.25), 9); circle(ctx, 37, 62, 24, null, c1, 6); circle(ctx, 63, 62, 24, null, darken(c1, 0.25), 9); circle(ctx, 63, 62, 24, null, lighten(c1, 0.15), 6);
  ctx.beginPath(); ctx.arc(37, 62, 24, -0.9, 0.5); ctx.strokeStyle = c1; ctx.lineWidth = 6; ctx.stroke();
  poly(ctx, [[63, 24], [72, 12], [54, 12]], c2 || '#bde0fe', '#5aa9e6', 1.2); poly(ctx, [[54, 12], [63, 4], [72, 12]], lighten(c2 || '#bde0fe', 0.4), '#5aa9e6', 1.2);
});
def('crown', 'wedding', ['تاج', 'Crown'], [100, 100], (ctx, c1, c2) => {
  path(ctx, 'M10 78 L6 30 L30 52 L50 18 L70 52 L94 30 L90 78 Z', c1, darken(c1, 0.3), 2); rrect(ctx, 10, 78, 80, 12, 3, darken(c1, 0.1), darken(c1, 0.35), 1.5);
  for (const [x, y] of [[6, 28], [50, 14], [94, 28]]) circle(ctx, x, y, 5, c2 || '#ef476f', darken(c1, 0.3), 1);
  for (const x of [26, 50, 74]) poly(ctx, [[x, 62], [x + 6, 68], [x, 74], [x - 6, 68]], c2 || '#ef476f');
});
def('dove', 'wedding', ['کبوتر', 'Dove'], [100, 100], (ctx, c1) => {
  path(ctx, 'M12 62 C22 50 40 46 56 48 C64 34 78 28 92 32 C86 40 80 46 74 50 C82 52 88 58 92 68 C80 64 70 64 62 68 C54 78 40 82 26 76 C30 70 26 64 12 62 Z', c1, darken(c1, 0.25), 1.5);
  path(ctx, 'M54 50 C46 28 32 16 14 16 C22 30 30 44 42 56 Z', lighten(c1, 0.2), darken(c1, 0.25), 1.5); circle(ctx, 82, 38, 1.8, '#333');
  path(ctx, 'M92 32 L99 34 L92 37', '#f4a300');
});

// ================= ISLAMIC =================
def('lantern', 'islamic', ['فانوس', 'Lantern'], [100, 100], (ctx, c1, c2) => {
  ctx.strokeStyle = c1; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(50, 2); ctx.lineTo(50, 14); ctx.stroke(); circle(ctx, 50, 4, 3, null, c1, 1.5);
  path(ctx, 'M36 24 C36 16 44 14 50 14 C56 14 64 16 64 24 Z', c1, darken(c1, 0.3), 1.2); rrect(ctx, 32, 24, 36, 6, 2, darken(c1, 0.1));
  path(ctx, 'M34 30 C26 44 26 64 34 76 L66 76 C74 64 74 44 66 30 Z', alpha(c2 || '#ffd166', 0.85), darken(c1, 0.3), 2); ctx.strokeStyle = c1; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(50, 30); ctx.lineTo(50, 76); ctx.moveTo(41, 30); ctx.quadraticCurveTo(36, 54, 41, 76); ctx.moveTo(59, 30); ctx.quadraticCurveTo(64, 54, 59, 76); ctx.stroke();
  rrect(ctx, 30, 76, 40, 7, 2, c1, darken(c1, 0.3), 1); path(ctx, 'M38 83 L62 83 L56 92 L44 92Z', darken(c1, 0.1)); circle(ctx, 50, 96, 3, c1);
});
def('mosque', 'islamic', ['مسجد', 'Mosque'], [100, 100], (ctx, c1, c2) => {
  path(ctx, 'M28 88 L28 60 C28 38 38 30 50 22 C62 30 72 38 72 60 L72 88 Z', c1, darken(c1, 0.3), 1.5); path(ctx, 'M50 6 L50 22', null, c1, 2); poly(ctx, starPts(50, 6, 5, 5, 2), c2 || '#ffd166');
  for (const x of [12, 88]) { rrect(ctx, x - 4, 40, 8, 48, 1, c1, darken(c1, 0.3), 1.2); path(ctx, `M${x - 6} 40 L${x} 26 L${x + 6} 40 Z`, darken(c1, 0.1), darken(c1, 0.3), 1.2); circle(ctx, x, 24, 2, c2 || '#ffd166'); }
  rrect(ctx, 4, 86, 92, 8, 2, darken(c1, 0.2)); path(ctx, 'M42 88 L42 70 C42 62 58 62 58 70 L58 88 Z', c2 || '#ffd166'); for (const x of [34, 66]) path(ctx, `M${x - 3} 62 L${x - 3} 54 C${x - 3} 48 ${x + 3} 48 ${x + 3} 54 L${x + 3} 62Z`, alpha(c2 || '#ffd166', 0.8));
});
def('rosette', 'islamic', ['گل‌سرخ اسلامی', 'Islamic rosette'], [100, 100], (ctx, c1, c2) => {
  ctx.save(); ctx.translate(50, 50); circle(ctx, 0, 0, 47, null, c1, 2);
  for (let k = 0; k < 2; k++) { ctx.save(); ctx.rotate((k * Math.PI) / 4); ctx.strokeStyle = c1; ctx.lineWidth = 2.5; ctx.strokeRect(-30, -30, 60, 60); ctx.restore(); }
  petals(ctx, 8, 16, 14, 18, alpha(c2 || c1, 0.5), c1, 1.4); circle(ctx, 0, 0, 10, c1); circle(ctx, 0, 0, 5, c2 || lighten(c1, 0.5)); ctx.restore();
});
def('arabesqueCorner', 'islamic', ['گوشه عربی', 'Arabesque corner'], [100, 100], (ctx, c1, c2) => {
  ctx.strokeStyle = c1; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(4, 96); ctx.lineTo(4, 4); ctx.lineTo(96, 4); ctx.stroke();
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(4, 4, 60, 0, Math.PI / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(4, 4, 44, 0, Math.PI / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(4, 4, 28, 0, Math.PI / 2); ctx.stroke();
  withT(ctx, 28, 28, 0.36, 0, () => { ctx.translate(-50, -50); CLIPS.rosette.draw(ctx, c1, c2); });
  for (const [x, y] of [[62, 6], [6, 62]]) circle(ctx, x, y, 3, c2 || c1);
});
def('mehrab', 'islamic', ['محراب', 'Arch'], [100, 140], (ctx, c1, c2) => {
  const d = 'M10 138 L10 60 C10 26 36 8 50 2 C64 8 90 26 90 60 L90 138';
  path(ctx, d, null, c1, 5); path(ctx, 'M20 138 L20 62 C20 34 40 18 50 12 C60 18 80 34 80 62 L80 138', null, c2 || c1, 2); circle(ctx, 50, 2, 3.5, c1);
});

// ================= PERSIAN =================
def('boteh', 'persian', ['بته‌جقه', 'Boteh'], [100, 100], (ctx, c1, c2) => {
  path(ctx, 'M50 6 C82 18 90 54 68 80 C52 98 26 94 20 76 C14 58 32 54 40 66 C45 74 55 72 55 62 C55 48 38 34 50 6Z', c1, darken(c1, 0.3), 2);
  path(ctx, 'M52 24 C70 36 72 56 60 70 C54 62 56 50 50 42 C46 36 46 30 52 24Z', c2 || lighten(c1, 0.35)); circle(ctx, 58, 52, 3.2, c1); circle(ctx, 40, 82, 3, c2 || lighten(c1, 0.35)); circle(ctx, 30, 70, 2.4, c2 || lighten(c1, 0.35));
});
def('toranj', 'persian', ['ترنج', 'Toranj medallion'], [100, 140], (ctx, c1, c2) => {
  const o = 'M50 4 C84 36 92 56 92 70 C92 84 84 100 50 136 C16 100 8 84 8 70 C8 56 16 36 50 4Z';
  path(ctx, o, c2 ? alpha(c2, 0.3) : null, c1, 3); ctx.save(); ctx.translate(50, 70); ctx.scale(0.72, 0.72); ctx.translate(-50, -70); path(ctx, o, null, c1, 2.2); ctx.restore();
  ctx.save(); ctx.translate(50, 70); petals(ctx, 12, 20, 12, 8, c2 || lighten(c1, 0.4), c1, 1.4); circle(ctx, 0, 0, 8, c1); circle(ctx, 0, 0, 3.5, c2 || '#fff'); ctx.restore();
  for (const y of [4, 136]) { circle(ctx, 50, y, 3.4, c1); }
  for (const s of [-1, 1]) for (const y of [38, 102]) { circle(ctx, 50 + s * 31, y, 3, c1); }
});
def('watermelon', 'persian', ['هندوانه', 'Watermelon'], [100, 100], (ctx, c1) => {
  path(ctx, 'M6 40 A44 44 0 0 0 94 40 Z', '#2d6a4f', '#1b4332', 1.5); path(ctx, 'M11 40 A39 39 0 0 0 89 40 Z', '#b7e4c7'); path(ctx, 'M14 40 A36 36 0 0 0 86 40 Z', c1 || '#e63946');
  for (const [x, y, r] of [[34, 52, 0.3], [50, 62, 0], [66, 52, -0.3], [42, 74, 0.1], [58, 74, -0.1]]) ell(ctx, x, y, 2.2, 4, r, '#222');
  ctx.beginPath(); ctx.moveTo(6, 40); ctx.lineTo(94, 40); ctx.strokeStyle = darken(c1 || '#e63946', 0.3); ctx.lineWidth = 1.5; ctx.stroke();
});
def('sprout', 'persian', ['سبزه', 'Sprout'], [100, 100], (ctx, c1) => {
  ctx.strokeStyle = darken(c1 || GREEN, 0.15); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(50, 94); ctx.quadraticCurveTo(48, 70, 50, 52); ctx.stroke();
  path(ctx, 'M50 56 C20 56 10 34 12 18 C38 18 50 34 50 56Z', c1 || GREEN, darken(c1 || GREEN, 0.3), 1.5); path(ctx, 'M50 66 C78 66 90 46 88 30 C62 30 50 46 50 66Z', lighten(c1 || GREEN, 0.15), darken(c1 || GREEN, 0.3), 1.5);
  ell(ctx, 50, 95, 26, 4, 0, 'rgba(0,0,0,.15)');
});

// ================= KIDS =================
def('cloud', 'kids', ['ابر', 'Cloud'], [100, 100], (ctx, c1) => {
  ctx.beginPath(); ctx.arc(30, 62, 20, 0, TAU); ctx.arc(52, 48, 26, 0, TAU); ctx.arc(74, 62, 20, 0, TAU); ctx.rect(30, 62, 44, 20); ctx.arc(30, 72, 10, 0, TAU); ctx.arc(74, 72, 10, 0, TAU); ctx.fillStyle = c1 || '#fff'; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 2; ctx.stroke();
});
def('rainbow', 'kids', ['رنگین‌کمان', 'Rainbow'], [100, 70], (ctx, c1) => {
  const cols = ['#ef476f', '#ffa94d', '#ffd166', '#06d6a0', '#4dabf7', '#9775fa'];
  cols.forEach((c, i) => { ctx.beginPath(); ctx.arc(50, 66, 46 - i * 6.2, Math.PI, 0); ctx.strokeStyle = c; ctx.lineWidth = 6.4; ctx.stroke(); });
});
def('sun', 'kids', ['خورشید', 'Sun'], [100, 100], (ctx, c1, c2) => {
  ctx.save(); ctx.translate(50, 50);
  for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate((i * TAU) / 12); path(ctx, 'M-4 -30 L0 -46 L4 -30Z', c2 || c1); ctx.restore(); }
  circle(ctx, 0, 0, 26, c1, darken(c1, 0.2), 2); ctx.restore(); circle(ctx, 42, 46, 2.6, '#7a4a00'); circle(ctx, 58, 46, 2.6, '#7a4a00'); ctx.beginPath(); ctx.arc(50, 54, 9, 0.2, Math.PI - 0.2); ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 2; ctx.stroke();
});
def('bear', 'kids', ['خرس', 'Teddy bear'], [100, 100], (ctx, c1) => {
  const b = c1 || '#c68642';
  circle(ctx, 24, 24, 15, b, darken(b, 0.3), 1.5); circle(ctx, 24, 24, 8, lighten(b, 0.35)); circle(ctx, 76, 24, 15, b, darken(b, 0.3), 1.5); circle(ctx, 76, 24, 8, lighten(b, 0.35));
  circle(ctx, 50, 54, 38, b, darken(b, 0.3), 1.5); ell(ctx, 50, 66, 16, 12, 0, lighten(b, 0.4)); ell(ctx, 50, 60, 5.5, 4, 0, '#3a2412');
  circle(ctx, 36, 46, 4, '#222'); circle(ctx, 64, 46, 4, '#222'); circle(ctx, 37.2, 44.8, 1.2, '#fff'); circle(ctx, 65.2, 44.8, 1.2, '#fff');
  ctx.beginPath(); ctx.moveTo(50, 64); ctx.lineTo(50, 70); ctx.arc(45, 70, 5, 0, Math.PI * 0.8); ctx.moveTo(50, 70); ctx.arc(55, 70, 5, Math.PI, Math.PI * 0.2, true); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1.6; ctx.stroke();
});

// ================= OFFICIAL / SYMBOLS =================
def('seal', 'official', ['مهر رسمی', 'Official seal'], [100, 100], (ctx, c1, c2) => {
  ctx.save(); ctx.translate(50, 50); ctx.beginPath(); for (let i = 0; i < 48; i++) { const a = (i * TAU) / 48, r = i % 2 ? 44 : 48; ctx.lineTo(r * Math.cos(a), r * Math.sin(a)); } ctx.closePath(); ctx.fillStyle = c1; ctx.fill();
  circle(ctx, 0, 0, 38, null, c2 || lighten(c1, 0.5), 2); circle(ctx, 0, 0, 32, null, c2 || lighten(c1, 0.5), 1); poly(ctx, starPts(0, 0, 5, 20, 8.5), c2 || lighten(c1, 0.5)); ctx.restore();
});
def('laurel', 'official', ['تاج گل افتخار', 'Laurel wreath'], [100, 100], (ctx, c1) => {
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(50, 54); ctx.scale(s, 1); ctx.strokeStyle = c1; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, 0, 38, Math.PI * 0.55, Math.PI * 1.25); ctx.stroke(); for (let i = 0; i < 9; i++) { const a = Math.PI * 0.6 + i * 0.1 * Math.PI * 0.8; withT(ctx, 38 * Math.cos(a), 38 * Math.sin(a), 0.36, a + Math.PI / 2 + 0.2, () => path(ctx, LEAF, c1)); withT(ctx, 38 * Math.cos(a), 38 * Math.sin(a), 0.3, a - Math.PI / 2 - 0.2, () => path(ctx, LEAF, lighten(c1, 0.2))); } ctx.restore(); }
});
def('shield', 'official', ['سپر', 'Shield'], [100, 100], (ctx, c1, c2) => {
  path(ctx, 'M50 4 L90 16 L90 48 C90 72 72 86 50 96 C28 86 10 72 10 48 L10 16 Z', c1, darken(c1, 0.3), 2); path(ctx, 'M50 12 L82 22 L82 48 C82 66 68 78 50 87 Z', lighten(c1, 0.15)); poly(ctx, starPts(50, 46, 5, 18, 7.5), c2 || '#fff');
});
def('check', 'official', ['تأیید', 'Check'], [100, 100], (ctx, c1) => { circle(ctx, 50, 50, 44, c1); path(ctx, 'M28 52 L44 68 L74 34', null, '#fff', 9); });
def('trophy', 'official', ['جام', 'Trophy'], [100, 100], (ctx, c1, c2) => {
  path(ctx, 'M28 12 L72 12 C72 40 64 58 50 62 C36 58 28 40 28 12Z', c1, darken(c1, 0.3), 2); path(ctx, 'M28 18 C10 18 10 42 32 46 M72 18 C90 18 90 42 68 46', null, c1, 5);
  rrect(ctx, 44, 62, 12, 16, 1, darken(c1, 0.1)); rrect(ctx, 30, 78, 40, 10, 3, c2 || darken(c1, 0.25), darken(c1, 0.4), 1.2); poly(ctx, starPts(50, 32, 5, 10, 4.2), lighten(c1, 0.5));
});
def('medal', 'official', ['مدال', 'Medal'], [100, 100], (ctx, c1, c2) => {
  poly(ctx, [[30, 4], [50, 44], [42, 48], [20, 6]], c2 || '#c1121f'); poly(ctx, [[70, 4], [50, 44], [58, 48], [80, 6]], darken(c2 || '#c1121f', 0.2));
  circle(ctx, 50, 66, 28, c1, darken(c1, 0.3), 2); circle(ctx, 50, 66, 21, null, lighten(c1, 0.4), 2); poly(ctx, starPts(50, 66, 5, 14, 6), lighten(c1, 0.45));
});
def('gradcap', 'official', ['کلاه فارغ‌التحصیلی', 'Graduation cap'], [100, 100], (ctx, c1, c2) => {
  path(ctx, 'M22 50 L22 70 C22 80 78 80 78 70 L78 50 L50 62 Z', darken(c1, 0.15), darken(c1, 0.4), 1.5); poly(ctx, [[50, 18], [96, 40], [50, 62], [4, 40]], c1, darken(c1, 0.4), 2);
  ctx.strokeStyle = c2 || '#ffd166'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(50, 40); ctx.lineTo(88, 48); ctx.lineTo(88, 74); ctx.stroke(); circle(ctx, 88, 74, 3.4, c2 || '#ffd166'); path(ctx, 'M85 76 L84 90 M88 76 L88 92 M91 76 L92 90', null, c2 || '#ffd166', 2);
});
def('briefcase', 'official', ['کیف', 'Briefcase'], [100, 100], (ctx, c1, c2) => {
  path(ctx, 'M36 30 L36 20 C36 16 40 14 44 14 L56 14 C60 14 64 16 64 20 L64 30', null, darken(c1, 0.3), 5); rrect(ctx, 8, 30, 84, 56, 8, c1, darken(c1, 0.35), 2); path(ctx, 'M8 54 L92 54', null, darken(c1, 0.35), 2); rrect(ctx, 43, 48, 14, 12, 2, c2 || '#ffd166', darken(c1, 0.35), 1.2);
});
def('building', 'official', ['ساختمان', 'Building'], [100, 100], (ctx, c1, c2) => {
  rrect(ctx, 22, 12, 56, 80, 3, c1, darken(c1, 0.3), 2); rrect(ctx, 6, 44, 20, 48, 2, darken(c1, 0.15), darken(c1, 0.3), 1.5); rrect(ctx, 74, 36, 20, 56, 2, darken(c1, 0.1), darken(c1, 0.3), 1.5);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) rect(ctx, 30 + c * 16, 20 + r * 13, 9, 8, c2 || lighten(c1, 0.6)); rect(ctx, 44, 80, 12, 12, darken(c1, 0.4));
});
def('gear', 'official', ['چرخ‌دنده', 'Gear'], [100, 100], (ctx, c1) => {
  ctx.save(); ctx.translate(50, 50); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8; const a1 = a - 0.2, a2 = a + 0.2; ctx.lineTo(34 * Math.cos(a - 0.3), 34 * Math.sin(a - 0.3)); ctx.lineTo(46 * Math.cos(a1), 46 * Math.sin(a1)); ctx.lineTo(46 * Math.cos(a2), 46 * Math.sin(a2)); ctx.lineTo(34 * Math.cos(a + 0.3), 34 * Math.sin(a + 0.3)); } ctx.closePath();
  ctx.moveTo(14, 0); ctx.arc(0, 0, 14, 0, TAU, true); ctx.fillStyle = c1; ctx.fill('evenodd'); ctx.strokeStyle = darken(c1, 0.3); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
});
def('blackRibbon', 'official', ['روبان عزا', 'Mourning ribbon'], [100, 100], (ctx, c1) => {
  path(ctx, 'M50 8 C24 8 20 32 36 50 L16 92 L36 86 L50 62 L64 86 L84 92 L64 50 C80 32 76 8 50 8Z', c1, darken(c1, 0.35), 2); path(ctx, 'M50 20 C38 20 36 32 44 42 L50 50 L56 42 C64 32 62 20 50 20Z', lighten(c1, 0.18));
});
def('diamond', 'official', ['الماس', 'Diamond'], [100, 100], (ctx, c1) => {
  poly(ctx, [[22, 14], [78, 14], [96, 36], [50, 92], [4, 36]], c1, darken(c1, 0.3), 2); poly(ctx, [[4, 36], [96, 36], [50, 92]], darken(c1, 0.08)); ctx.strokeStyle = lighten(c1, 0.55); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(22, 14); ctx.lineTo(34, 36); ctx.lineTo(50, 14); ctx.lineTo(66, 36); ctx.lineTo(78, 14); ctx.moveTo(34, 36); ctx.lineTo(50, 92); ctx.lineTo(66, 36); ctx.stroke();
});
def('monogram', 'official', ['قاب مونوگرام', 'Monogram ring'], [100, 100], (ctx, c1, c2) => {
  circle(ctx, 50, 50, 46, null, c1, 3); circle(ctx, 50, 50, 40, null, c1, 1.2);
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(50, 50); ctx.scale(s, 1); for (let i = 0; i < 6; i++) { const a = Math.PI * 0.62 + i * 0.16; withT(ctx, 34 * Math.cos(a), 34 * Math.sin(a), 0.24, a + Math.PI / 2, () => path(ctx, LEAF, c2 || c1)); } ctx.restore(); }
});

// ================= SEASONAL / TRAVEL / HOME =================
def('christmasTree', 'seasonal', ['درخت کریسمس', 'Christmas tree'], [100, 100], (ctx, c1, c2) => {
  rect(ctx, 44, 82, 12, 12, '#7b4a2a'); poly(ctx, [[50, 22], [78, 54], [22, 54]], c1 || '#2d6a4f', darken(c1 || '#2d6a4f', 0.3), 1.5); poly(ctx, [[50, 38], [86, 72], [14, 72]], lighten(c1 || '#2d6a4f', 0.08), darken(c1 || '#2d6a4f', 0.3), 1.5); poly(ctx, [[50, 54], [92, 88], [8, 88]], lighten(c1 || '#2d6a4f', 0.16), darken(c1 || '#2d6a4f', 0.3), 1.5);
  poly(ctx, starPts(50, 14, 5, 10, 4.2), c2 || '#ffd166', '#e09f00', 1); for (const [x, y, c] of [[40, 48, '#ef476f'], [60, 64, '#ffd166'], [34, 76, '#4dabf7'], [64, 80, '#ef476f'], [50, 62, '#ffd166']]) circle(ctx, x, y, 3.2, c);
});
def('snowflake', 'seasonal', ['برف‌دانه', 'Snowflake'], [100, 100], (ctx, c1) => {
  ctx.save(); ctx.translate(50, 50); ctx.strokeStyle = c1; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate((i * TAU) / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -44); ctx.moveTo(0, -28); ctx.lineTo(-10, -38); ctx.moveTo(0, -28); ctx.lineTo(10, -38); ctx.moveTo(0, -14); ctx.lineTo(-7, -21); ctx.moveTo(0, -14); ctx.lineTo(7, -21); ctx.stroke(); ctx.restore(); } ctx.restore();
});
def('egg', 'seasonal', ['تخم‌مرغ', 'Easter egg'], [100, 100], (ctx, c1, c2) => {
  const d = 'M50 6 C76 6 90 46 90 64 C90 82 72 94 50 94 C28 94 10 82 10 64 C10 46 24 6 50 6Z'; path(ctx, d, c1, darken(c1, 0.3), 2);
  ctx.save(); ctx.clip(new Path2D(d)); ctx.strokeStyle = c2 || '#fff'; ctx.lineWidth = 6; ctx.beginPath(); for (let x = -4; x <= 104; x += 10) ctx.lineTo(x, 50 + (Math.floor(x / 10) % 2 ? 8 : 0)); ctx.stroke(); for (let x = 10; x < 95; x += 16) circle(ctx, x, 74, 3, c2 || '#fff'); ctx.restore();
});
def('plane', 'travel', ['هواپیما', 'Airplane'], [100, 100], (ctx, c1) => {
  poly(ctx, [[4, 48], [96, 8], [64, 92], [48, 60]], c1, darken(c1, 0.3), 2); poly(ctx, [[48, 60], [96, 8], [58, 52]], darken(c1, 0.15)); ctx.beginPath(); ctx.moveTo(4, 48); ctx.lineTo(48, 60); ctx.strokeStyle = darken(c1, 0.3); ctx.lineWidth = 1.5; ctx.stroke();
});
def('house', 'travel', ['خانه', 'House'], [100, 100], (ctx, c1, c2) => {
  rect(ctx, 20, 44, 60, 46, lighten(c1, 0.55)); ctx.strokeStyle = darken(c1, 0.3); ctx.lineWidth = 2; ctx.strokeRect(20, 44, 60, 46); poly(ctx, [[8, 48], [50, 10], [92, 48]], c1, darken(c1, 0.3), 2); rrect(ctx, 42, 62, 16, 28, 2, c2 || darken(c1, 0.2)); rect(ctx, 26, 54, 12, 12, '#bde0fe'); rect(ctx, 62, 54, 12, 12, '#bde0fe'); rect(ctx, 68, 18, 8, 20, darken(c1, 0.2));
});
def('key', 'travel', ['کلید', 'Key'], [100, 100], (ctx, c1) => {
  circle(ctx, 28, 36, 20, null, c1, 8); circle(ctx, 28, 36, 20, null, lighten(c1, 0.25), 3); path(ctx, 'M42 50 L90 90 M72 74 L66 84 M82 82 L76 92', null, c1, 8);
});
def('tie', 'travel', ['کراوات', 'Tie'], [100, 100], (ctx, c1) => {
  path(ctx, 'M38 8 L62 8 L58 22 L38 22Z', darken(c1, 0.2), darken(c1, 0.4), 1.5); path(ctx, 'M40 22 L60 22 L72 82 L50 96 L28 82Z', c1, darken(c1, 0.4), 2); path(ctx, 'M48 26 L52 26 L56 80 L50 88 L44 80Z', lighten(c1, 0.2));
});
def('clock', 'travel', ['ساعت', 'Clock'], [100, 100], (ctx, c1, c2) => {
  circle(ctx, 50, 50, 44, c2 || '#fff', c1, 6); for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12; ctx.beginPath(); ctx.moveTo(50 + 34 * Math.cos(a), 50 + 34 * Math.sin(a)); ctx.lineTo(50 + 39 * Math.cos(a), 50 + 39 * Math.sin(a)); ctx.strokeStyle = c1; ctx.lineWidth = i % 3 ? 2 : 4; ctx.stroke(); }
  path(ctx, 'M50 50 L50 24 M50 50 L68 60', null, c1, 5); circle(ctx, 50, 50, 4, c1);
});

// ================= ICONS (24×24 stroke icons) =================
const icon = (id, n, fn) => def('i-' + id, 'icons', n, [24, 24], (ctx, c1) => { ctx.strokeStyle = c1; ctx.fillStyle = c1; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; fn(ctx); });
icon('phone', ['تلفن', 'Phone'], (c) => path(c, 'M5 4 L9 4 L11 9 L8.5 10.8 C9.8 13.6 11.4 15.2 14.2 15.5 L16 13 L21 15 L21 19 C21 20 20 21 19 21 C10 21 3 14 3 5 C3 4.4 4 4 5 4Z', null, c.strokeStyle, 2));
icon('mail', ['ایمیل', 'Email'], (c) => { path(c, 'M3 6 H21 V18 H3Z', null, c.strokeStyle, 2); path(c, 'M3 7 L12 14 L21 7', null, c.strokeStyle, 2); });
icon('pin', ['مکان', 'Location'], (c) => { path(c, 'M12 22 C6 15 5 12 5 9.5 C5 5.5 8.2 2.5 12 2.5 C15.8 2.5 19 5.5 19 9.5 C19 12 18 15 12 22Z', null, c.strokeStyle, 2); circle(c, 12, 9.5, 2.6, null, c.strokeStyle, 2); });
icon('calendar', ['تقویم', 'Calendar'], (c) => { rrect(c, 3, 5, 18, 16, 2, null, c.strokeStyle, 2); path(c, 'M3 10 H21 M8 3 V7 M16 3 V7', null, c.strokeStyle, 2); circle(c, 8, 14.5, 1, c.fillStyle); circle(c, 12, 14.5, 1, c.fillStyle); circle(c, 16, 14.5, 1, c.fillStyle); });
icon('clock', ['ساعت', 'Time'], (c) => { circle(c, 12, 12, 9, null, c.strokeStyle, 2); path(c, 'M12 7 V12 L15.5 14', null, c.strokeStyle, 2); });
icon('user', ['کاربر', 'Person'], (c) => { circle(c, 12, 8, 4, null, c.strokeStyle, 2); path(c, 'M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21', null, c.strokeStyle, 2); });
icon('chat', ['پیام', 'Chat'], (c) => path(c, 'M4 5 H20 V16 H11 L6 20 V16 H4Z', null, c.strokeStyle, 2));
icon('globe', ['وب‌سایت', 'Website'], (c) => { circle(c, 12, 12, 9, null, c.strokeStyle, 2); path(c, 'M3 12 H21 M12 3 C8 8 8 16 12 21 M12 3 C16 8 16 16 12 21', null, c.strokeStyle, 1.6); });
icon('link', ['لینک', 'Link'], (c) => { path(c, 'M10 14 C8.5 12.5 8.5 10 10 8.5 L13 5.5 C14.5 4 17 4 18.5 5.5 C20 7 20 9.5 18.5 11 L17 12.5 M14 10 C15.5 11.5 15.5 14 14 15.5 L11 18.5 C9.5 20 7 20 5.5 18.5 C4 17 4 14.5 5.5 13 L7 11.5', null, c.strokeStyle, 2); });
icon('heart', ['قلب', 'Heart'], (c) => { c.save(); c.scale(0.24, 0.24); c.translate(0, 2); path(c, HEART, null, c.strokeStyle, 8); c.restore(); });
icon('gift', ['هدیه', 'Gift'], (c) => { rrect(c, 4, 10, 16, 11, 1, null, c.strokeStyle, 2); rrect(c, 3, 7, 18, 3.5, 1, null, c.strokeStyle, 2); path(c, 'M12 7 V21 M12 7 C9 2 5 4 8 7 M12 7 C15 2 19 4 16 7', null, c.strokeStyle, 2); });
icon('dress', ['لباس', 'Dress code'], (c) => path(c, 'M9 3 L12 6 L15 3 L21 7 L18 11 L17 9.5 L17 21 L7 21 L7 9.5 L6 11 L3 7Z', null, c.strokeStyle, 2));
icon('car', ['خودرو', 'Parking'], (c) => { path(c, 'M3 14 L5.5 8 H18.5 L21 14 V18 H3Z M3 14 H21', null, c.strokeStyle, 2); circle(c, 7.5, 18, 1.8, c.fillStyle); circle(c, 16.5, 18, 1.8, c.fillStyle); });
icon('music', ['موسیقی', 'Music'], (c) => { path(c, 'M9 18 V5 L19 3 V16', null, c.strokeStyle, 2); circle(c, 6.5, 18, 2.6, null, c.strokeStyle, 2); circle(c, 16.5, 16, 2.6, null, c.strokeStyle, 2); });
icon('check', ['تیک', 'Check'], (c) => path(c, 'M4 12.5 L9.5 18 L20 6', null, c.strokeStyle, 3));
icon('star', ['ستاره', 'Star'], (c) => poly(c, starPts(12, 12.8, 5, 10, 4.4), null, c.strokeStyle, 2));
icon('camera', ['دوربین', 'Camera'], (c) => { path(c, 'M3 8 H7 L9 5 H15 L17 8 H21 V19 H3Z', null, c.strokeStyle, 2); circle(c, 12, 13, 3.6, null, c.strokeStyle, 2); });

export const CLIP_CATS = {
  flowers: ['گل و گیاه', 'Flowers'], frames: ['قاب و تزئین', 'Frames & dividers'], ribbons: ['روبان', 'Ribbons'], hearts: ['قلب', 'Hearts'], stars: ['ستاره و ماه', 'Stars & moon'],
  party: ['جشن', 'Party'], wedding: ['عروسی', 'Wedding'], islamic: ['اسلامی و عربی', 'Islamic & Arabic'], persian: ['نقوش ایرانی', 'Persian motifs'], kids: ['کودکانه', 'Kids'],
  official: ['رسمی و نمادها', 'Official & symbols'], seasonal: ['فصلی', 'Seasonal'], travel: ['سفر و خانه', 'Travel & home'], icons: ['آیکون‌ها', 'Icons'],
};

export function drawClip(ctx, id, w, h, c1 = '#c9a24a', c2) {
  const c = CLIPS[id]; if (!c) return;
  ctx.save();
  ctx.scale(w / c.vb[0], h / c.vb[1]);
  try { c.draw(ctx, c1, c2); } catch (e) { console.warn('clip error', id, e); }
  ctx.restore();
}
