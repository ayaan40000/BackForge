// On-device photo storage — the SAME IndexedDB ('backforge_media' / 'photos') the
// classic app uses, so photo sets and the encrypted vault work from either app.
let db = null;
function open() {
  if (db) return Promise.resolve(db);
  return new Promise((res, rej) => { const r = indexedDB.open('backforge_media', 1); r.onupgradeneeded = () => r.result.createObjectStore('photos'); r.onsuccess = () => { db = r.result; res(db); }; r.onerror = () => rej(r.error); });
}
export async function put(id, blob) { const d = await open(); return new Promise((res, rej) => { const tx = d.transaction('photos', 'readwrite'); tx.objectStore('photos').put(blob, id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
export async function get(id) { const d = await open(); return new Promise((res, rej) => { const q = d.transaction('photos').objectStore('photos').get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }); }
export async function del(id) { const d = await open(); return new Promise((res, rej) => { const tx = d.transaction('photos', 'readwrite'); tx.objectStore('photos').delete(id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
const urls = new Map();
export async function url(id) { if (!id) return null; if (urls.has(id)) return urls.get(id); const b = await get(id); if (!b) return null; const u = URL.createObjectURL(b); urls.set(id, u); return u; }

/** Re-encode: respects EXIF orientation, strips metadata (incl. location), max 1280 px JPEG. */
export async function normalise(file) {
  let bmp; try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { bmp = await createImageBitmap(file); }
  const sc = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Could not process that image'))), 'image/jpeg', 0.82));
  return { blob, widthPx: c.width, heightPx: c.height };
}
