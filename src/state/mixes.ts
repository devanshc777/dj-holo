/** IndexedDB shelf for recorded mixes — survives reloads, downloadable anytime. */

export interface MixMeta {
  id: string;
  name: string;
  date: number;
  size: number;
}

const DB = 'dj-holo';
const STORE = 'mixes';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function saveMix(blob: Blob): Promise<MixMeta> {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const meta: MixMeta = {
    id: `${Date.now()}`,
    name: `set-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`,
    date: Date.now(),
    size: blob.size,
  };
  await tx('readwrite', (s) => s.put({ ...meta, blob }));
  return meta;
}

export async function listMixes(): Promise<MixMeta[]> {
  const all = await tx<{ id: string; name: string; date: number; size: number }[]>('readonly', (s) => s.getAll());
  return all
    .map(({ id, name, date, size }) => ({ id, name, date, size }))
    .sort((a, b) => b.date - a.date);
}

export async function getMixBlob(id: string): Promise<Blob | null> {
  const rec = await tx<{ blob: Blob } | undefined>('readonly', (s) => s.get(id));
  return rec?.blob ?? null;
}

export async function deleteMix(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}
