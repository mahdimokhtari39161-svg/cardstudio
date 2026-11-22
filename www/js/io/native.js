// Bridges to Capacitor plugins (Filesystem, Share, Media) with web fallbacks.
const Cap = () => window.Capacitor;
export const isNative = () => !!Cap()?.isNativePlatform?.();
const P = (n) => Cap()?.Plugins?.[n];

export function blobToBase64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}
export const u8ToBlob = (u8, type) => new Blob([u8], { type });
const safeName = (n) => String(n).replace(/[\\/:*?"<>|]+/g, '_');

async function writeCache(blob, name) {
  const FS = P('Filesystem'); if (!FS) throw new Error('no filesystem');
  const data = await blobToBase64(blob);
  const r = await FS.writeFile({ path: `export/${Date.now()}_${safeName(name)}`, data, directory: 'CACHE', recursive: true });
  return r.uri;
}

// Save to the phone. Images go to the gallery (album "CardStudio"); other files to Documents/CardStudio.
export async function saveToDevice(blob, name) {
  name = safeName(name);
  if (isNative()) {
    const isImage = /^image\//.test(blob.type);
    const errors = [];
    if (isImage && P('Media')) {
      try {
        const uri = await writeCache(blob, name), M = P('Media');
        let albumIdentifier;
        try { const { albums } = await M.getAlbums(); albumIdentifier = albums?.find((a) => a.name === 'CardStudio')?.identifier; if (!albumIdentifier) { await M.createAlbum({ name: 'CardStudio' }); const r2 = await M.getAlbums(); albumIdentifier = r2.albums?.find((a) => a.name === 'CardStudio')?.identifier; } } catch (e) { errors.push('album:' + e?.message); }
        await M.savePhoto({ path: uri, ...(albumIdentifier ? { albumIdentifier } : {}), fileName: name.replace(/\.[^.]+$/, '') });
        return { ok: true, where: 'gallery' };
      } catch (e) { errors.push('media:' + (e?.message || e)); }
    }
    try {
      const FS = P('Filesystem'), data = await blobToBase64(blob);
      const r = await FS.writeFile({ path: `CardStudio/${name}`, data, directory: 'DOCUMENTS', recursive: true });
      return { ok: true, where: 'documents', uri: r.uri };
    } catch (e) { errors.push('fs:' + (e?.message || e)); }
    // last resort: system share sheet lets the user pick "Save to Files / Photos"
    try { await shareBlob(blob, name, name); return { ok: true, where: 'share' }; } catch (e) { errors.push('share:' + (e?.message || e)); }
    return { ok: false, error: errors.join(' | ') };
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { ok: true, where: 'download' };
}

// Share one or more files through the system share sheet. `target` is a hint only ("whatsapp", "telegram", "email").
export async function shareFiles(files, { title = '', text = '', target = '' } = {}) { // files: [{blob, name}]
  if (isNative() && P('Share')) {
    const uris = []; for (const f of files) uris.push(await writeCache(f.blob, f.name));
    await P('Share').share({ title, text, files: uris, dialogTitle: title || 'Share' });
    return { ok: true };
  }
  const fileObjs = files.map((f) => new File([f.blob], safeName(f.name), { type: f.blob.type }));
  if (navigator.canShare?.({ files: fileObjs })) { await navigator.share({ files: fileObjs, title, text }); return { ok: true }; }
  if (files.length === 1) { await saveToDevice(files[0].blob, files[0].name); return { ok: true, fallback: 'download' }; }
  throw new Error('share-unsupported');
}
export const shareBlob = (blob, name, title, text) => shareFiles([{ blob, name }], { title, text });

// Text/link shares to a specific app through URL schemes (works on web and Android WebView).
export function openExternal(url) {
  if (isNative() && P('App')?.openUrl) { try { P('App').openUrl({ url }); return; } catch { /* fall through */ } }
  const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
}
export const waLink = (phone, text) => `https://wa.me/${String(phone || '').replace(/[^\d]/g, '')}?text=${encodeURIComponent(text || '')}`;
export const tgLink = (text, url = '') => `https://t.me/share/url?url=${encodeURIComponent(url || ' ')}&text=${encodeURIComponent(text || '')}`;
export const mailLink = (to, subject, body) => `mailto:${to || ''}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fallback */ }
  try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch { return false; }
}

// Hardware back button (Android)
export function onBackButton(fn) { const A = P('App'); if (A?.addListener) A.addListener('backButton', fn); }

// Print: native → PDF through the share sheet (choose "Print"); web → hidden iframe + window.print()
export async function printImages(dataUrls, pdfBlob) {
  if (isNative()) { await shareBlob(pdfBlob, 'CardStudio-print.pdf', 'Print'); return; }
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f); const d = f.contentDocument;
  d.open(); d.write(`<html><head><style>@page{margin:0}body{margin:0}img{width:100%;page-break-after:always;display:block}</style></head><body>${dataUrls.map((u) => `<img src="${u}">`).join('')}</body></html>`); d.close();
  await new Promise((r) => setTimeout(r, 400)); f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 3000);
}

// Share plain text (link) through the system share sheet; falls back to copying.
export async function shareText(title, text) {
  try {
    if (isNative() && P('Share')) { await P('Share').share({ title, text, dialogTitle: title || 'Share' }); return true; }
    if (navigator.share) { await navigator.share({ title, text }); return true; }
  } catch (e) { if (e?.name === 'AbortError') return false; }
  await copyText(text); return false;
}
