// Animation engine: text/element entrances, decoration motion, particles, shimmer and card-opening effects.
import { drawPage } from './render.js';
import { rng, clamp } from '../core/util.js';

export const IN_EFFECTS = ['none', 'fade', 'rise', 'drop', 'zoom', 'slideL', 'slideR', 'type', 'blur', 'spin', 'pop'];
export const PARTICLES = ['none', 'petals', 'sparkles', 'confetti', 'hearts', 'snow', 'stars', 'bubbles'];
export const OPEN_FX = ['none', 'doors', 'fold', 'curtain', 'zoomreveal', 'circle'];
export const MOTIONS = ['none', 'float', 'sway', 'pulse'];
export const FX_LABEL = {
  none: ['بدون', 'None'], fade: ['محو', 'Fade'], rise: ['بالا آمدن', 'Rise'], drop: ['فرود', 'Drop'], zoom: ['بزرگ‌نمایی', 'Zoom'], slideL: ['ورود از چپ', 'Slide left'], slideR: ['ورود از راست', 'Slide right'], type: ['تایپ', 'Typewriter'], blur: ['محو و واضح', 'Blur in'], spin: ['چرخش', 'Spin'], pop: ['جهش', 'Pop'],
  petals: ['گلبرگ', 'Petals'], sparkles: ['درخشش', 'Sparkles'], confetti: ['کاغذ رنگی', 'Confetti'], hearts: ['قلب', 'Hearts'], snow: ['برف', 'Snow'], stars: ['ستاره', 'Stars'], bubbles: ['حباب', 'Bubbles'],
  doors: ['دو لنگه در', 'Double doors'], fold: ['باز شدن کارت', 'Card unfold'], curtain: ['پرده', 'Curtain'], zoomreveal: ['زوم', 'Zoom reveal'], circle: ['دایره', 'Circle reveal'],
  float: ['شناور', 'Float'], sway: ['تکان نرم', 'Sway'], pulse: ['ضربان', 'Pulse'],
};
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeBack = (p) => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

const SWAYERS = new Set(['rose', 'tulip', 'daisy', 'lotus', 'sakura', 'sunflower', 'leaf', 'sprig', 'cornerFlowers', 'wreath', 'ribbonBow', 'ribbonCurl', 'ribbonBanner', 'dove', 'balloon', 'balloons3']);

export function buildScene(card, pageIndex = 0, o = {}) {
  const page = card.pages[pageIndex] || card.pages[0], fx = card.fx || {}, u = page.w / 1000;
  const openDur = fx.open && fx.open !== 'none' ? 1.7 : 0;
  const els = page.elements.filter((e) => !e.hidden), timeline = new Map();
  let tcur = openDur + 0.25, decoIdx = 0;
  for (const el of els) {
    const isText = el.type === 'text';
    const eff = el.anim?.in && el.anim.in !== 'none' ? el.anim.in : isText ? fx.textIn || 'rise' : el.type === 'clip' || el.type === 'shape' || el.type === 'frame' ? 'fade' : 'zoom';
    const dur = el.anim?.dur || (isText ? 0.9 : 0.8);
    let start;
    if (el.anim?.delay) start = openDur + el.anim.delay;
    else if (isText) { start = tcur; tcur += 0.38; }
    else { start = openDur + 0.1 + decoIdx * 0.07; decoIdx++; }
    timeline.set(el.id, { eff: fx.textIn === 'none' && isText ? 'none' : eff, start, dur });
  }
  const end = Math.max(tcur + 0.8, openDur + 1.2);
  const hold = o.hold ?? 3.2;
  return { card, page, fx, u, openDur, timeline, entranceEnd: end, duration: Math.round((end + hold) * 10) / 10, canvas: null };
}

function elState(scene, el, t) {
  const { u, page, fx } = scene, tl = scene.timeline.get(el.id);
  const st = {};
  if (tl) {
    const p = clamp((t - tl.start) / tl.dur, 0, 1), e = easeOut(p);
    switch (tl.eff) {
      case 'none': break;
      case 'fade': st.a = e; break;
      case 'rise': st.a = e; st.dy = (1 - e) * 70 * u; break;
      case 'drop': st.a = e; st.dy = -(1 - e) * 90 * u; break;
      case 'zoom': st.a = e; st.s = 0.55 + 0.45 * e; break;
      case 'slideL': st.a = e; st.dx = -(1 - e) * page.w * 0.35; break;
      case 'slideR': st.a = e; st.dx = (1 - e) * page.w * 0.35; break;
      case 'type': if (el.type === 'text') { st.p = p; st.a = p > 0 ? 1 : 0; } else st.a = e; break;
      case 'blur': st.a = e; st.blur = (1 - e) * 14 * u; break;
      case 'spin': st.a = e; st.rot = (1 - e) * Math.PI; st.s = 0.3 + 0.7 * e; break;
      case 'pop': st.a = Math.min(1, p * 3); st.s = Math.max(0.01, easeBack(p)); break;
    }
    if (tl.eff !== 'none' && t < tl.start) st.a = 0;
  }
  // continuous motion of decorations
  if (fx.motionDeco !== false && el.type === 'clip' && (!tl || t >= tl.start)) {
    const mo = el.motion && el.motion !== 'none' ? el.motion : SWAYERS.has(el.clip) ? 'sway' : el.deco ? 'float' : 'none';
    const ph = (el.x * 0.013 + el.y * 0.007), tt = t - (tl?.start || 0);
    if (mo === 'float') st.dy = (st.dy || 0) + Math.sin(tt * 1.5 + ph) * 8 * u;
    else if (mo === 'sway') st.rot = (st.rot || 0) + Math.sin(tt * 1.3 + ph) * 0.05;
    else if (mo === 'pulse') st.s = (st.s || 1) * (1 + Math.sin(tt * 2.2 + ph) * 0.035);
  } else if (el.motion && el.motion !== 'none') {
    const tt = t - (tl?.start || 0), ph = el.x * 0.01;
    if (el.motion === 'float') st.dy = (st.dy || 0) + Math.sin(tt * 1.5 + ph) * 8 * u; if (el.motion === 'sway') st.rot = (st.rot || 0) + Math.sin(tt * 1.3 + ph) * 0.05; if (el.motion === 'pulse') st.s = (st.s || 1) * (1 + Math.sin(tt * 2.2 + ph) * 0.035);
  }
  return st;
}

// ---------------------------------------------------------------- particles
function drawParticles(ctx, scene, t) {
  const kind = scene.fx.particles; if (!kind || kind === 'none') return;
  const { page, u } = scene, W = page.w, H = page.h, R = rng('prt' + kind), N = kind === 'confetti' ? 70 : kind === 'sparkles' || kind === 'stars' ? 36 : 34;
  const pal = { petals: ['#f7a8c4', '#ffd1dc', '#fff0f3', '#f06292'], hearts: ['#e85d8a', '#c2476a', '#ff8fab', '#ffb3c6'], confetti: ['#ef476f', '#ffd166', '#06d6a0', '#4dabf7', '#9775fa', '#ff9f1c'], snow: ['#ffffff'], bubbles: ['rgba(255,255,255,.55)'], sparkles: ['#fff3b0', '#ffffff', '#ffe08a'], stars: ['#fff3b0', '#ffffff'] }[kind];
  const fadeIn = clamp((t - scene.openDur) / 1.2, 0, 1);
  ctx.save(); ctx.globalAlpha = fadeIn;
  for (let i = 0; i < N; i++) {
    const x0 = R() * W, y0 = R() * H, sp = (0.5 + R()) * 60 * u, ph = R() * 6.28, sz = (8 + R() * 22) * u, col = pal[i % pal.length], rot0 = R() * 6.28, spin = (R() - 0.5) * 3;
    let x, y, a = 1;
    if (kind === 'sparkles' || kind === 'stars') { x = x0; y = y0; a = 0.5 + 0.5 * Math.sin(t * 2.4 + ph); }
    else if (kind === 'bubbles') { x = x0 + Math.sin(t + ph) * 20 * u; y = ((y0 - t * sp * 1.1) % (H + 80 * u) + H + 80 * u) % (H + 80 * u) - 40 * u; }
    else { x = x0 + Math.sin(t * 0.9 + ph) * 36 * u; y = ((y0 + t * sp * (kind === 'snow' ? 0.8 : 1.3)) % (H + 80 * u)) - 40 * u; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot0 + t * spin); ctx.globalAlpha = fadeIn * a; ctx.fillStyle = col;
    switch (kind) {
      case 'petals': ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.5, sz * 0.8, 0, 0, 6.3); ctx.fill(); break;
      case 'confetti': ctx.fillRect(-sz * 0.3, -sz * 0.15, sz * 0.6, sz * 0.3); break;
      case 'snow': ctx.beginPath(); ctx.arc(0, 0, sz * 0.22, 0, 6.3); ctx.fill(); break;
      case 'bubbles': ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5 * u; ctx.beginPath(); ctx.arc(0, 0, sz * 0.6, 0, 6.3); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fill(); break;
      case 'hearts': { const s = sz / 50; ctx.scale(s, s); ctx.translate(-50, -50); ctx.fill(new Path2D('M50 90 C8 60 4 28 27 19 C40 14 48 23 50 31 C52 23 60 14 73 19 C96 28 92 60 50 90 Z')); break; }
      case 'sparkles': { const s = sz * 0.9; ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s); ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s); ctx.fill(); break; }
      case 'stars': { ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? sz * 0.2 : sz * 0.5, an = -1.57 + k * 0.628; ctx.lineTo(r * Math.cos(an), r * Math.sin(an)); } ctx.closePath(); ctx.fill(); break; }
    }
    ctx.restore();
  }
  ctx.restore();
}
function drawShimmer(ctx, scene, t) {
  if (!scene.fx.shimmer) return;
  const { page } = scene, W = page.w, H = page.h, cyc = 3.2, p = ((t - scene.openDur - 0.6) % cyc) / cyc; if (p < 0 || t < scene.openDur) return;
  const x = -W * 0.4 + p * W * 1.8, g = ctx.createLinearGradient(x - W * 0.12, 0, x + W * 0.12, H * 0.4);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---------------------------------------------------------------- card-opening effects
function drawCover(g, W, H, col = '#1b1b2f') {
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#2a2744'); gr.addColorStop(1, col); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#d4af37'; g.lineWidth = Math.max(2, W * 0.006); g.strokeRect(W * 0.04, H * 0.03, W * 0.92, H * 0.94);
}
function openComposite(ctx, scene, cardCanvas, t) {
  const { page, fx, openDur } = scene, W = page.w, H = page.h, p = openDur ? clamp(t / openDur, 0, 1) : 1, e = easeOut(p);
  if (!openDur || p >= 1) { ctx.drawImage(cardCanvas, 0, 0, W, H); return; }
  const kind = fx.open;
  if (kind === 'doors') {
    ctx.drawImage(cardCanvas, 0, 0, W, H);
    const hold = 0.25, q = clamp((p - hold) / (1 - hold), 0, 1), k = easeOut(q), half = W / 2;
    for (const side of [-1, 1]) { ctx.save(); const off = side * k * half; ctx.translate(side < 0 ? 0 + off : half + off, 0); ctx.beginPath(); ctx.rect(0, 0, half, H); ctx.clip(); const tmp = document.createElement('canvas'); tmp.width = half; tmp.height = H; const g = tmp.getContext('2d'); drawCover(g, W, H); if (side > 0) { g.setTransform(1, 0, 0, 1, -half, 0); drawCover(g, W, H); } ctx.drawImage(tmp, 0, 0); ctx.restore(); }
  } else if (kind === 'curtain') {
    ctx.drawImage(cardCanvas, 0, 0, W, H);
    const k = easeOut(clamp((p - 0.15) / 0.85, 0, 1)), half = W / 2;
    for (const side of [-1, 1]) { const w = half * (1 - k); ctx.save(); const x = side < 0 ? 0 : W - w; const gr = ctx.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#7a1020'); gr.addColorStop(0.5, '#b3203a'); gr.addColorStop(1, '#7a1020'); ctx.fillStyle = gr; ctx.fillRect(x, 0, w, H); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3; for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x + (w * i) / 8, 0); ctx.lineTo(x + (w * i) / 8, H); ctx.stroke(); } ctx.restore(); }
  } else if (kind === 'fold') {
    ctx.fillStyle = 'rgba(0,0,0,.0)'; const k = e; ctx.save(); ctx.translate(W / 2, 0); ctx.scale(Math.max(0.02, k), 1); ctx.translate(-W / 2, 0); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 40; ctx.drawImage(cardCanvas, 0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalAlpha = (1 - k) * 0.5; ctx.fillStyle = '#000'; ctx.fillRect(W * (0.5 + k / 2), 0, W * (0.5 - k / 2), H); ctx.restore();
  } else if (kind === 'circle') {
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, e * Math.hypot(W, H) * 0.55, 0, 6.3); ctx.clip(); ctx.drawImage(cardCanvas, 0, 0, W, H); ctx.restore();
  } else { // zoomreveal
    ctx.save(); ctx.globalAlpha = clamp(p * 1.6, 0, 1); const s = 1.25 - 0.25 * e; ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); ctx.drawImage(cardCanvas, 0, 0, W, H); ctx.restore();
  }
}

// Render frame at time t into ctx (ctx is sized W×H = page size × k).
export function renderFrame(ctx, scene, t, k = 1) {
  const { page, card } = scene, W = page.w, H = page.h;
  if (!scene.canvas) { scene.canvas = document.createElement('canvas'); }
  const cw = Math.round(W * k), ch = Math.round(H * k);
  if (scene.canvas.width !== cw || scene.canvas.height !== ch) { scene.canvas.width = cw; scene.canvas.height = ch; }
  const g = scene.canvas.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch); g.setTransform(k, 0, 0, k, 0, 0);
  drawPage(g, page, card, { stateFor: (el) => elState(scene, el, t) });
  g.save(); drawParticles(g, scene, t); drawShimmer(g, scene, t); g.restore();
  ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, W, H);
  openComposite(ctx, scene, scene.canvas, t);
  ctx.restore();
}

// Real-time preview player.
export class Player {
  constructor(canvas, scene, k = 0.5) { this.cv = canvas; this.scene = scene; this.k = k; this.t = 0; this.playing = false; this.size(); }
  size() { const p = this.scene.page; this.cv.width = Math.round(p.w * this.k); this.cv.height = Math.round(p.h * this.k); this.ctx = this.cv.getContext('2d'); }
  play() { if (this.playing) return; this.playing = true; this.t0 = performance.now() - this.t * 1000; this.audio?.play?.().catch(() => {}); const loop = (now) => { if (!this.playing) return; this.t = ((now - this.t0) / 1000) % this.scene.duration; if (this.t < 0.05 && this.audio) { this.audio.currentTime = 0; } renderFrame(this.ctx, this.scene, this.t, this.k); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  stop() { this.playing = false; cancelAnimationFrame(this.raf); this.audio?.pause?.(); }
  seek(t) { this.t = t; renderFrame(this.ctx, this.scene, t, this.k); }
  setAudio(a) { this.audio = a; if (a) a.loop = true; }
}
