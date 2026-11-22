// Animated GIF encoder (global palette via median cut, LZW) + video recorder (MediaRecorder: MP4 if supported, else WebM).
import { renderFrame } from '../gfx/anim.js';

function medianCut(samples, n = 256) {
  // samples: Uint8Array RGB triplets
  let boxes = [{ px: Array.from({ length: samples.length / 3 }, (_, i) => i) }];
  const rng = (b) => { let r0 = 255, r1 = 0, g0 = 255, g1 = 0, b0 = 255, b1 = 0; for (const i of b.px) { const r = samples[i * 3], g = samples[i * 3 + 1], bl = samples[i * 3 + 2]; if (r < r0) r0 = r; if (r > r1) r1 = r; if (g < g0) g0 = g; if (g > g1) g1 = g; if (bl < b0) b0 = bl; if (bl > b1) b1 = bl; } return [r1 - r0, g1 - g0, b1 - b0]; };
  while (boxes.length < n) {
    let bi = -1, best = 0, ax = 0;
    boxes.forEach((b, i) => { if (b.px.length < 2) return; const r = rng(b), m = Math.max(...r); if (m * Math.sqrt(b.px.length) > best) { best = m * Math.sqrt(b.px.length); bi = i; ax = r.indexOf(m); } });
    if (bi < 0) break;
    const b = boxes[bi]; b.px.sort((a, c) => samples[a * 3 + ax] - samples[c * 3 + ax]);
    const mid = b.px.length >> 1; boxes.splice(bi, 1, { px: b.px.slice(0, mid) }, { px: b.px.slice(mid) });
  }
  return boxes.map((b) => { let r = 0, g = 0, bl = 0; for (const i of b.px) { r += samples[i * 3]; g += samples[i * 3 + 1]; bl += samples[i * 3 + 2]; } const c = b.px.length || 1; return [Math.round(r / c), Math.round(g / c), Math.round(bl / c)]; });
}

function lzw(indices, minCode) {
  const clear = 1 << minCode, eoi = clear + 1, out = []; let bits = 0, cur = 0, size = minCode + 1, next = eoi + 1, dict = new Map();
  const emit = (code) => { cur |= code << bits; bits += size; while (bits >= 8) { out.push(cur & 255); cur >>= 8; bits -= 8; } };
  emit(clear); let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = (prefix << 8) | k, hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
    else { emit(clear); dict = new Map(); size = minCode + 1; next = eoi + 1; }
    prefix = k;
  }
  emit(prefix); emit(eoi); if (bits > 0) out.push(cur & 255);
  return out;
}
function subBlocks(bytes) { const out = []; for (let i = 0; i < bytes.length; i += 255) { const c = bytes.slice(i, i + 255); out.push(c.length, ...c); } out.push(0); return out; }

// Frame renderer: plain card, or the card centred on a blurred story background (9:16).
export function frameRenderer(scene, width, story = false) {
  const page = scene.page;
  if (!story) { const k = width / page.w; return { W: Math.round(page.w * k) & ~1, H: Math.round(page.h * k) & ~1, draw: (ctx, t) => renderFrame(ctx, scene, t, k) }; }
  const W = width & ~1, H = Math.round((width * 16) / 9) & ~1, cardW = Math.round(W * 0.9), k = cardW / page.w, cardH = Math.round(page.h * k), tmp = document.createElement('canvas'); tmp.width = cardW; tmp.height = cardH;
  const tctx = tmp.getContext('2d');
  return { W, H, draw: (ctx, t) => {
    renderFrame(tctx, scene, t, k);
    ctx.save(); ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, W, H); ctx.filter = 'blur(28px) brightness(.7)'; const s = Math.max(W / cardW, H / cardH); ctx.drawImage(tmp, (W - cardW * s) / 2, (H - cardH * s) / 2, cardW * s, cardH * s); ctx.restore();
    const fit = Math.min(1, (H * 0.92) / cardH), dw = cardW * fit, dh = cardH * fit; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; ctx.drawImage(tmp, (W - dw) / 2, (H - dh) / 2, dw, dh); ctx.restore();
  } };
}

export async function encodeGIF(scene, { width = 480, fps = 12, story = false, onProgress } = {}) {
  const fr = frameRenderer(scene, width, story), W = fr.W, H = fr.H;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d', { willReadFrequently: true });
  const n = Math.max(2, Math.round(scene.duration * fps)), delay = Math.round(100 / fps), frames = [];
  const samples = [];
  for (let i = 0; i < n; i++) {
    fr.draw(ctx, (i / n) * scene.duration);
    const d = ctx.getImageData(0, 0, W, H).data; frames.push(d);
    if (i % 3 === 0) for (let p = 0; p < d.length; p += 4 * 37) samples.push(d[p], d[p + 1], d[p + 2]);
    onProgress?.((i + 1) / n * 0.6); if (i % 4 === 0) await new Promise((r) => setTimeout(r));
  }
  const pal = medianCut(new Uint8Array(samples), 255); while (pal.length < 256) pal.push([0, 0, 0]);
  const lut = new Uint8Array(32768).fill(255), seen = new Uint8Array(32768);
  const near = (r, g, b) => { const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3); if (seen[key]) return lut[key]; let best = 0, bd = 1e9; for (let i = 0; i < 255; i++) { const c = pal[i], dr = c[0] - r, dg = c[1] - g, db = c[2] - b, dd = dr * dr * 2 + dg * dg * 4 + db * db * 3; if (dd < bd) { bd = dd; best = i; } } seen[key] = 1; lut[key] = best; return best; };
  const bytes = [71, 73, 70, 56, 57, 97, W & 255, W >> 8, H & 255, H >> 8, 0xf7, 0, 0];
  for (const c of pal) bytes.push(c[0], c[1], c[2]);
  bytes.push(0x21, 0xff, 0x0b, ...[...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);
  for (let f = 0; f < frames.length; f++) {
    const d = frames[f], idx = new Uint8Array(W * H);
    for (let p = 0, q = 0; p < d.length; p += 4, q++) idx[q] = near(d[p], d[p + 1], d[p + 2]);
    bytes.push(0x21, 0xf9, 4, 0x04, delay & 255, delay >> 8, 0, 0, 0x2c, 0, 0, 0, 0, W & 255, W >> 8, H & 255, H >> 8, 0, 8);
    bytes.push(...subBlocks(lzw(idx, 8)));
    frames[f] = null; onProgress?.(0.6 + ((f + 1) / n) * 0.4); if (f % 3 === 0) await new Promise((r) => setTimeout(r));
  }
  bytes.push(0x3b);
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

export function videoSupport() {
  if (typeof MediaRecorder === 'undefined') return null;
  const tries = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const m of tries) if (MediaRecorder.isTypeSupported(m)) return { mime: m, ext: m.startsWith('video/mp4') ? 'mp4' : 'webm' };
  return null;
}

export async function recordVideo(scene, { width = 540, fps = 30, audioUrl = '', story = false, onProgress } = {}) {
  const sup = videoSupport(); if (!sup) throw new Error('video-unsupported');
  const fr = frameRenderer(scene, width, story), W = fr.W, H = fr.H;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const stream = cv.captureStream(fps); let ac, audio;
  if (audioUrl) {
    try {
      audio = new Audio(audioUrl); audio.crossOrigin = 'anonymous'; ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = ac.createMediaElementSource(audio), dest = ac.createMediaStreamDestination(); src.connect(dest); dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      await ac.resume();
    } catch { audio = null; }
  }
  const rec = new MediaRecorder(stream, { mimeType: sup.mime, videoBitsPerSecond: 4_000_000 }), chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((res) => (rec.onstop = res));
  rec.start(250); audio?.play().catch(() => {});
  const t0 = performance.now();
  await new Promise((res) => { const loop = () => { const t = (performance.now() - t0) / 1000; if (t >= scene.duration) return res(); fr.draw(ctx, t); onProgress?.(t / scene.duration); requestAnimationFrame(loop); }; loop(); });
  fr.draw(ctx, scene.duration - 0.01); await new Promise((r) => setTimeout(r, 200));
  rec.stop(); audio?.pause(); await done; ac?.close?.();
  return { blob: new Blob(chunks, { type: sup.mime.split(';')[0] }), ext: sup.ext };
}
