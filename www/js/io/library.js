// Personal music library: the user's own audio files (e.g. مداحی/نوحه, songs) stored on the device and reusable in envelope cards.
// No copyrighted recordings are bundled with the app.
import { Store } from '../core/storage.js';
import { readFileAs } from '../ui/dom.js';
import { uid } from '../core/util.js';
export const CATS = { eulogy: ['مداحی / نوحه', 'Eulogy / Noha'], romantic: ['عاشقانه', 'Romantic'], joyful: ['شاد', 'Joyful'], classical: ['کلاسیک / سنتی', 'Classical / traditional'], other: ['سایر', 'Other'] };
export const MAX_BYTES = 12e6;
export async function listTracks() { return (await Store.all('kv')).filter((r) => String(r.k).startsWith('track_')).sort((a, b) => b.at - a.at); }
export async function addTrack(file, { name, artist, cat }) {
  if (file.size > MAX_BYTES) throw new Error('too-large');
  const data = await readFileAs(file, 'dataURL'), rec = { k: 'track_' + uid('t'), name: name || file.name.replace(/\.[^.]+$/, ''), artist: artist || '', cat: cat || 'other', data, size: file.size, at: Date.now() };
  await Store.put('kv', rec); return rec;
}
export const deleteTrack = (k) => Store.del('kv', k);
