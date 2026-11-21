// Persistent storage on the device: IndexedDB with a localStorage fallback.
// Stores: cards, events (guest lists), tpls (personal templates), kv (settings).
const DB = 'cardstudio', VER = 1, STORES = ['cards', 'events', 'tpls', 'kv'];
let dbp = null, mem = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const rq = indexedDB.open(DB, VER);
      rq.onupgradeneeded = () => { const db = rq.result; for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: s === 'kv' ? 'k' : 'id' }); };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
      rq.onblocked = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}
const lsKey = (s) => `cs:${s}`;
function lsAll(s) { try { return JSON.parse(localStorage.getItem(lsKey(s)) || '[]'); } catch { return []; } }
function lsSave(s, arr) { try { localStorage.setItem(lsKey(s), JSON.stringify(arr)); return true; } catch { return false; } }
const keyOf = (s) => (s === 'kv' ? 'k' : 'id');

function tx(db, store, mode, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode), st = t.objectStore(store);
    let out; const r = fn(st);
    if (r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
}

export const Store = {
  async all(store) {
    const db = await open();
    if (!db) return lsAll(store);
    return (await tx(db, store, 'readonly', (s) => s.getAll())) || [];
  },
  async get(store, id) {
    const db = await open();
    if (!db) return lsAll(store).find((x) => x[keyOf(store)] === id) || null;
    return (await tx(db, store, 'readonly', (s) => s.get(id))) || null;
  },
  async put(store, obj) {
    const db = await open();
    if (!db) {
      const arr = lsAll(store), k = keyOf(store), i = arr.findIndex((x) => x[k] === obj[k]);
      if (i >= 0) arr[i] = obj; else arr.push(obj);
      if (!lsSave(store, arr)) throw new Error('storage full');
      return obj;
    }
    await tx(db, store, 'readwrite', (s) => s.put(obj));
    return obj;
  },
  async del(store, id) {
    const db = await open();
    if (!db) { lsSave(store, lsAll(store).filter((x) => x[keyOf(store)] !== id)); return; }
    await tx(db, store, 'readwrite', (s) => s.delete(id));
  },
  async clear(store) {
    const db = await open();
    if (!db) { lsSave(store, []); return; }
    await tx(db, store, 'readwrite', (s) => s.clear());
  },
  async setting(k, def) { const r = await this.get('kv', k); return r ? r.v : def; },
  async setSetting(k, v) { return this.put('kv', { k, v }); },
  async persistent() { try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; } },
};

// ---- cards
export async function saveCard(card, thumb) {
  card.updatedAt = Date.now();
  if (thumb) card.thumb = thumb;
  await Store.put('cards', card);
  return card;
}
export const listCards = async () => (await Store.all('cards')).sort((a, b) => b.updatedAt - a.updatedAt);
export const getCard = (id) => Store.get('cards', id);
export const deleteCard = (id) => Store.del('cards', id);
export const listEvents = async () => (await Store.all('events')).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
export const saveEvent = (e) => { e.updatedAt = Date.now(); return Store.put('events', e); };
export const deleteEvent = (id) => Store.del('events', id);
export const listPersonalTemplates = async () => (await Store.all('tpls')).sort((a, b) => b.createdAt - a.createdAt);

// ---- settings (sync cache)
export const Settings = {
  data: { uiLang: 'fa', cardLang: 'fa', theme: 'dark', fav: [], recent: [], baseUrl: 'https://mahdimokhtari39161-svg.github.io/cardstudio/invite/', webhook: '', aiEndpoint: '', aiKey: '', aiModel: '', devUnlock: false, grid: false, snap: true, onboarded: false, folders: [] },
  async load() { const v = await Store.setting('settings', null); if (v) Object.assign(this.data, v); return this.data; },
  async save() { await Store.setSetting('settings', this.data); },
  get(k) { return this.data[k]; },
  async set(k, v) { this.data[k] = v; await this.save(); },
};
