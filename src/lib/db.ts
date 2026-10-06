import { PrintRequest } from './contexts/PrintQueueContext';
// A simple Promise-based wrapper around IndexedDB for our Print Queue

const DB_NAME = 'PrintQueueDB';
const DB_VERSION = 1;
const STORE_NAME = 'requests';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function getAllRequests(): Promise<PrintRequest[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Re-hydrate the File objects and Dates if needed
      const data = request.result.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      resolve(data.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    };

    request.onerror = () => reject(request.error);
  });
}

export async function addRequest(request: PrintRequest): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const req = store.add(request);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function updateRequestStatus(id: string, status: PrintRequest['status']): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => {
      const data = req.result;
      if (data) {
        data.status = status;
        store.put(data);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeRequest(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
