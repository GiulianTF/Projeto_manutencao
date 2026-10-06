// Mini-wrapper de IndexedDB para guardar as fotos no modo local
// (localStorage não comporta imagens).

const DB_NAME = 'manutencao-local';
const STORE = 'photos';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const photoBlobs = {
  put: (id: string, blob: Blob) => run('readwrite', (s) => s.put(blob, id)).then(() => undefined),
  get: (id: string) => run<Blob | undefined>('readonly', (s) => s.get(id)),
  delete: (id: string) => run('readwrite', (s) => s.delete(id)).then(() => undefined),
  clear: () => run('readwrite', (s) => s.clear()).then(() => undefined),
};
