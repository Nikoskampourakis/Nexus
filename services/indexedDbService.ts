
const DB_NAME = 'nexus_media_db';
const IMAGE_STORE = 'images';
const MESSAGE_STORE = 'messages';
const METADATA_STORE = 'metadata';
const DB_VERSION = 3;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MESSAGE_STORE)) {
        db.createObjectStore(MESSAGE_STORE, { keyPath: 'sessionId' });
      }
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const storeImage = async (id: string, dataUrl: string) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE);
    store.put({ id, dataUrl, timestamp: Date.now() });
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getImage = async (id: string): Promise<string | null> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(IMAGE_STORE, 'readonly');
    const store = transaction.objectStore(IMAGE_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result?.dataUrl || null);
    request.onerror = () => resolve(null);
  });
};

export const deleteImage = async (id: string) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE);
    store.delete(id);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const storeSessionMessages = async (sessionId: string, messages: any[]) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MESSAGE_STORE, 'readwrite');
    const store = transaction.objectStore(MESSAGE_STORE);
    store.put({ sessionId, messages, updatedAt: Date.now() });
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getSessionMessages = async (sessionId: string): Promise<any[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(MESSAGE_STORE, 'readonly');
    const store = transaction.objectStore(MESSAGE_STORE);
    const request = store.get(sessionId);
    request.onsuccess = () => resolve(request.result?.messages || []);
    request.onerror = () => resolve([]);
  });
};

export const deleteSessionMessages = async (sessionId: string) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MESSAGE_STORE, 'readwrite');
    const store = transaction.objectStore(MESSAGE_STORE);
    store.delete(sessionId);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const clearAllSessionMessages = async (): Promise<boolean> => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(MESSAGE_STORE, 'readwrite');
      const store = transaction.objectStore(MESSAGE_STORE);
      store.clear();
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn("Failed to clear session messages in IndexedDB", e);
    return false;
  }
};

export const storeMetadata = async (key: string, data: any) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(METADATA_STORE, 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);
    store.put({ key, data, updatedAt: Date.now() });
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getMetadata = async (key: string): Promise<any | null> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(METADATA_STORE, 'readonly');
    const store = transaction.objectStore(METADATA_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => resolve(null);
  });
};
