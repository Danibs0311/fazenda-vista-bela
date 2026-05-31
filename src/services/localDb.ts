import { HarvestLog } from '../types';

const DB_NAME = 'fazenda_vista_bela_db';
const DB_VERSION = 1;
const STORE_NAME = 'harvest_logs_offline';

export interface OfflineHarvestLog extends HarvestLog {
  synced: boolean;
  criado_por_id?: string;
  criado_por_nome?: string;
}

export const localDb = {
  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  saveLog: async (log: OfflineHarvestLog): Promise<void> => {
    const db = await localDb.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(log);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getUnsyncedLogs: async (): Promise<OfflineHarvestLog[]> => {
    const db = await localDb.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result as OfflineHarvestLog[];
        resolve(all.filter(log => !log.synced));
      };
      request.onerror = () => reject(request.error);
    });
  },

  getAllLogs: async (): Promise<OfflineHarvestLog[]> => {
    const db = await localDb.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  markAsSynced: async (id: string): Promise<void> => {
    const db = await localDb.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      
      getReq.onsuccess = () => {
        const log = getReq.result as OfflineHarvestLog;
        if (log) {
          log.synced = true;
          const putReq = store.put(log);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  deleteLog: async (id: string): Promise<void> => {
    const db = await localDb.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
};
