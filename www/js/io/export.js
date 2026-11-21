// Rendering of cards into export formats: PNG, JPG, PDF, story/post/whatsapp/print variants.
import { renderPageToCanvas, ensureFonts, Assets } from '../gfx/render.js';
import { needsWatermark } from '../core/entitlements.js';
import { slug } from '../core/util.js';

export const SIZES = {
  png:      { w: 1500, fmt: 'png', n: ['تصویر کامل PNG', 'Full PNG'] },
  jpg:      { w: 1500, fmt: 'jpg', n: ['تصویر JPG', 'JPG image'] },
  whatsapp: { w: 1080, fmt: 'jpg', q: 0.86, n: ['واتساپ (سبک)', 'WhatsApp (light)'] },
  story:    { W: 1080, H: 1920, fmt: 'jpg', n: ['استوری اینستاگرام ۱۰۸۰×۱۹۲۰', 'Instagram story'] },
  post:     { W: 1080, H: 1350, fmt: 'jpg', n: ['پست اینستاگرام ۱۰۸۰×۱۳۵۰', 'Instagram post'] },
  square:   { W: 1080, H: 1080, fmt: 'jpg', n: ['مربع ۱۰۸۰×۱۰۸۰', 'Square'] },
  print:    { w: 2480, fmt: 'png', n: ['چاپ (کیفیت بالا)', 'Print (high-res)'] },
};

export async function prepare(card) { await ensureFonts(card); await Assets.preload(card); }

function watermark(ctx, W, H) {
  const s = Math.max(14, W * 0.022), pad = s * 0.7;
  ctx.save(); ctx.font = `700 ${s}px "Montserrat","Vazirmatn",sans-serif`; ctx.direction = 'ltr'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  const label = 'CardStudio', w = ctx.measureText(label).width + pad * 2, h = s + pad * 1.2, x = W - w - s * 0.6, y = H - h - s * 0.6;
  ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, h / 2) : ctx.rect(x, y, w, h); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillText(label, x + w - pad, y + h / 2 + 1); ctx.restore();
}

export function renderVariant(card, pageIndex, kind = 'png', opts = {}) {
  const spec = SIZES[kind] || SIZES.png, wm = opts.watermark ?? needsWatermark();
  const page = card.pages[pageIndex] || card.pages[0];
  let canvas;
  if (spec.W) {
    // fit the card inside a fixed canvas; blurred copy of the card fills the rest
    canvas = document.createElement('canvas'); canvas.width = spec.W; canvas.height = spec.H;
    const g = canvas.getContext('2d'), margin = Math.round(spec.W * 0.05);
    const fitW = spec.W - margin * 2, fitH = spec.H - margin * 2, s = Math.min(fitW / page.w, fitH / page.h);
    const cw = Math.round(page.w * s), ch = Math.round(page.h * s);
    const inner = renderPageToCanvas(card, pageIndex, Math.max(cw, 600));
    const exactFit = Math.abs(spec.W / spec.H - page.w / page.h) < 0.01;
    if (exactFit) { g.drawImage(inner, 0, 0, spec.W, spec.H); }
    else {
      g.save(); g.filter = 'blur(40px) brightness(.8)'; const cs = Math.max(spec.W / inner.width, spec.H / inner.height); g.drawImage(inner, (spec.W - inner.width * cs) / 2, (spec.H - inner.height * cs) / 2, inner.width * cs, inner.height * cs); g.restore();
      g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 40; g.shadowOffsetY = 12; g.drawImage(inner, (spec.W - cw) / 2, (spec.H - ch) / 2, cw, ch); g.restore();
    }
  } else {
    canvas = renderPageToCanvas(card, pageIndex, opts.width || spec.w);
  }
  if (wm) watermark(canvas.getContext('2d'), canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas, fmt = 'png', q = 0.92) {
  return new Promise((res, rej) => {
    const type = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
    if (fmt === 'jpg') { // flatten transparency onto white for JPEG
      const c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = canvas.height; const g = c2.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c2.width, c2.height); g.drawImage(canvas, 0, 0); canvas = c2;
    }
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), type, q);
  });
}
export async function renderBlob(card, pageIndex, kind = 'png', opts = {}) {
  const spec = SIZES[kind] || SIZES.png;
  return canvasToBlob(renderVariant(card, pageIndex, kind, opts), spec.fmt, spec.q || 0.92);
}
export const fileName = (card, kind, i = 0, ext) => `${slug(card.name || card.data?.title || card.occasion || 'card')}${card.pages.length > 1 ? '_p' + (i + 1) : ''}_${kind}.${ext || (SIZES[kind]?.fmt === 'png' ? 'png' : 'jpg')}`;

// ---------------------------------------------------------------- PDF (JPEG pages, real PDF 1.4 file)
export const PAPER = { a4: [595.28, 841.89], a5: [419.53, 595.28], a6: [297.64, 419.53], letter: [612, 792], auto: null };
export async function buildPDF(canvases, { paper = 'auto', margin = 0, fit = 'contain' } = {}) {
  const enc = new TextEncoder(), chunks = [], offsets = []; let len = 0;
  const put = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
  const mark = (n) => { offsets[n] = len; };
  const jpegs = []; for (const c of canvases) { const blob = await canvasToBlob(c, 'jpg', 0.93); jpegs.push({ data: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height }); }
  const n = jpegs.length, objCount = 2 + n * 3;
  put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  mark(1); put('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  mark(2); put(`2 0 obj\n<< /Type /Pages /Count ${n} /Kids [${jpegs.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>\nendobj\n`);
  jpegs.forEach((j, i) => {
    const pg = 3 + i * 3, ct = pg + 1, im = pg + 2;
    let pw, ph; if (PAPER[paper]) { [pw, ph] = PAPER[paper]; if ((j.w > j.h) !== (pw > ph)) [pw, ph] = [ph, pw]; } else { pw = 595.28; ph = pw * (j.h / j.w); }
    const iw = pw - margin * 2, ih = ph - margin * 2, s = fit === 'cover' ? Math.max(iw / j.w, ih / j.h) : Math.min(iw / j.w, ih / j.h), dw = j.w * s, dh = j.h * s, dx = (pw - dw) / 2, dy = (ph - dh) / 2;
    const content = `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)} cm /Im0 Do Q`;
    mark(pg); put(`${pg} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>\nendobj\n`);
    mark(ct); put(`${ct} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    mark(im); put(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${j.w} /Height ${j.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${j.data.length} >>\nstream\n`); put(j.data); put('\nendstream\nendobj\n');
  });
  const xref = len; put(`xref\n0 ${objCount + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= objCount; i++) put(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  put(`trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const out = new Uint8Array(len); let p = 0; for (const c of chunks) { out.set(c, p); p += c.length; }
  return new Blob([out], { type: 'application/pdf' });
}
export async function renderPDF(card, { paper = 'auto', print = false, margin } = {}) {
  await prepare(card);
  const canv = card.pages.map((_, i) => renderVariant(card, i, print ? 'print' : 'png', { width: print ? 2480 : 1500 }));
  return buildPDF(canv, { paper: print ? paper === 'auto' ? 'a4' : paper : paper, margin: margin ?? (print ? 28 : 0) });
}
