// Renders the "opening envelope" card as a real video (MP4 or WebM) with music, so it plays inline in WhatsApp / Telegram / Instagram.
import { renderVariant } from './export.js';
import { ENVELOPES, MUSIC_JS } from './envelope.js';
import { PALETTES } from '../data/palettes.js';
import { occById, occName } from '../data/occasions.js';
import { videoSupport } from './gif.js';

const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3), clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const ENV_VIDEO_SECONDS = 11;

function palette(card, envelope) {
  const pal = card.pal || PALETTES.gold; let E = ENVELOPES[envelope] || ENVELOPES.classic;
  if (envelope === 'auto') E = { body: pal.s || '#f4ead0', flap: pal.a2 || '#e5d3a0', liner: pal.l || '#fff', seal: pal.a || '#c9a24a', ink: '#fff', glyph: '✦' };
  return { E, pal };
}

export function makeEnvelopePainter(card, { envelope = 'auto', to = '', W = 720, H = 1280 } = {}) {
  const { E, pal } = palette(card, envelope), lang = card.lang, rtl = ['fa', 'ar'].includes(lang);
  const cardCv = renderVariant(card, 0, 'png', { width: 900 }), ratio = cardCv.height / cardCv.width;
  const title = (card.data?.title || card.name || occName(occById[card.occasion], lang) || '').slice(0, 40);
  const dark = pal.d || '#14213d';
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H; { const g = bg.getContext('2d'); g.fillStyle = dark; g.fillRect(0, 0, W, H); const r = g.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.45, H * 0.8); r.addColorStop(0, dark + 'f0'); r.addColorStop(1, '#000'); g.fillStyle = r; g.fillRect(0, 0, W, H); }
  const ew = W * 0.78, eh = ew * 0.667, ex = (W - ew) / 2, ey = H * 0.5 - eh / 2 + 40;
  const cw = ew * 0.86, ch = cw * ratio, cx0 = (W - cw) / 2;
  const fw = Math.min(W * 0.9, (H * 0.86) / ratio), fh = fw * ratio, fx = (W - fw) / 2, fy = (H - fh) / 2;
  const fam = '"Vazirmatn","Montserrat","Noto Naskh Arabic",sans-serif';
  const tri = (g, pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); };
  const sparks = Array.from({ length: 46 }, (_, i) => ({ x: ((i * 9301 + 49297) % 233280) / 233280, y: ((i * 7919 + 1237) % 233280) / 233280, p: i * 0.7, r: 2 + (i % 4) }));
  return function paint(g, t) {
    g.drawImage(bg, 0, 0);
    const open = ease(seg(t, 1.9, 2.9)), rise = ease(seg(t, 2.7, 4.3)), reveal = ease(seg(t, 4.4, 6.2)), fadeEnv = 1 - reveal;
    const float = open === 0 ? Math.sin(t * 2.2) * 7 : 0, oy = ey + float;
    if (fadeEnv > 0) {
      g.save(); g.globalAlpha = fadeEnv; g.translate(0, reveal * 120);
      g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 40; g.shadowOffsetY = 24; g.fillStyle = E.liner; g.beginPath(); g.roundRect(ex, oy, ew, eh, 10); g.fill(); g.restore();
      const flapH = eh * 0.56, apex = oy + flapH * Math.cos(Math.PI * open), flapCol = open < 0.5 ? E.flap : E.liner;
      if (open >= 0.5) tri(g, [[ex, oy], [ex + ew, oy], [ex + ew / 2, apex]], flapCol);
      // card inside the envelope (clipped at envelope bottom)
      if (reveal === 0) {
        g.save(); g.beginPath(); g.rect(0, 0, W, oy + eh); g.clip();
        const cy = oy + eh * 0.1 - rise * (ch * 0.58 + eh * 0.1); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 14; g.drawImage(cardCv, cx0, cy, cw, ch); g.restore();
      }
      tri(g, [[ex, oy], [ex + ew * 0.52, oy + eh * 0.52], [ex, oy + eh]], E.body); tri(g, [[ex + ew, oy], [ex + ew * 0.48, oy + eh * 0.52], [ex + ew, oy + eh]], E.body);
      tri(g, [[ex, oy + eh], [ex + ew / 2, oy + eh * 0.46], [ex + ew, oy + eh]], E.body); tri(g, [[ex, oy + eh], [ex + ew / 2, oy + eh * 0.46], [ex + ew, oy + eh]], 'rgba(255,255,255,.12)');
      if (open < 0.5) tri(g, [[ex, oy], [ex + ew, oy], [ex + ew / 2, apex]], flapCol);
      const sa = 1 - clamp01(open * 3);
      if (sa > 0) { const sr = ew * 0.075 * (1 + open * 1.2), sx = W / 2, sy = oy + flapH; g.save(); g.globalAlpha = sa; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 12; g.shadowOffsetY = 4; g.fillStyle = E.seal; g.beginPath(); g.arc(sx, sy, sr, 0, 7); g.fill(); g.restore(); g.save(); g.globalAlpha = sa; g.fillStyle = E.ink || '#fff'; g.font = `${sr * 0.95}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(E.glyph, sx, sy + 2); g.restore(); }
      g.restore();
    }
    if (reveal > 0) {
      // card flies from the risen position to the centre, growing
      const sx0 = cx0, sy0 = oy0(), sw0 = cw, sh0 = ch, x = sx0 + (fx - sx0) * reveal, y = sy0 + (fy - sy0) * reveal, w = sw0 + (fw - sw0) * reveal, hh = sh0 + (fh - sh0) * reveal;
      const zoom = 1 + 0.03 * seg(t, 6.2, ENV_VIDEO_SECONDS);
      g.save(); g.translate(W / 2, H / 2); g.scale(zoom, zoom); g.translate(-W / 2, -H / 2); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40 * reveal; g.shadowOffsetY = 20 * reveal; g.drawImage(cardCv, x, y, w, hh); g.restore();
    }
    function oy0() { return ey + eh * 0.1 - (ch * 0.58 + eh * 0.1) + 120 * 0; }
    // title above the closed envelope
    const ta = 1 - clamp01(seg(t, 1.9, 2.6) + reveal);
    if (ta > 0) { g.save(); g.globalAlpha = ta; g.direction = rtl ? 'rtl' : 'ltr'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 12; g.font = `800 ${Math.round(W * 0.085)}px ${fam}`; g.fillText(title, W / 2, H * 0.2, W - 80); if (to) { g.font = `600 ${Math.round(W * 0.05)}px ${fam}`; g.fillStyle = pal.a2 || '#f4d36f'; g.fillText(to, W / 2, H * 0.2 + W * 0.1, W - 100); } g.restore(); }
    // sparkles once the card is revealed
    const sp = seg(t, 3.6, 5) * 0.9;
    if (sp > 0) for (const s of sparks) { const tw = 0.5 + 0.5 * Math.sin(t * 2.4 + s.p), yy = (s.y * H + (t * 18 * (1 + s.r / 3))) % H; g.save(); g.globalAlpha = sp * tw * 0.8; g.fillStyle = '#fff6d6'; g.beginPath(); g.arc(s.x * W, yy, s.r, 0, 7); g.fill(); g.restore(); }
  };
}

export async function recordEnvelopeVideo(card, { envelope = 'auto', mood = 'festive', audioData = '', audioFile = null, to = '', fps = 30, onProgress } = {}) {
  const sup = videoSupport(); if (!sup) throw new Error('video-unsupported');
  const W = 720, H = 1280, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const paint = makeEnvelopePainter(card, { envelope, to, W, H }); paint(g, 0);
  const stream = cv.captureStream(fps); let music = null, audio = null, ac = null, objUrl = '';
  try {
    if (audioData || audioFile) {
      objUrl = audioFile ? URL.createObjectURL(audioFile) : audioData; audio = new Audio(objUrl); ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = ac.createMediaElementSource(audio), dest = ac.createMediaStreamDestination(); src.connect(dest); dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t)); await ac.resume();
    } else if (mood !== 'none') {
      const Music = new Function(MUSIC_JS + '; return Music;')();
      music = Music(mood, (ctx, master) => { ac = ctx; const dest = ctx.createMediaStreamDestination(); master.connect(dest); dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t)); });
      music.start();
    }
  } catch { audio = null; music = null; }
  const rec = new MediaRecorder(stream, { mimeType: sup.mime, videoBitsPerSecond: 4_500_000, audioBitsPerSecond: 128000 }), chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((res) => (rec.onstop = res));
  rec.start(250); audio?.play().catch(() => {});
  const t0 = performance.now();
  await new Promise((res) => { const loop = () => { const t = (performance.now() - t0) / 1000; if (t >= ENV_VIDEO_SECONDS) return res(); paint(g, t); onProgress?.(t / ENV_VIDEO_SECONDS); requestAnimationFrame(loop); }; loop(); });
  paint(g, ENV_VIDEO_SECONDS - 0.01); await new Promise((r) => setTimeout(r, 250));
  rec.stop(); audio?.pause(); music?.stop(); await done; try { ac?.close?.(); } catch { /* ignore */ } if (audioFile && objUrl) URL.revokeObjectURL(objUrl);
  return { blob: new Blob(chunks, { type: sup.mime.split(';')[0] }), ext: sup.ext };
}
