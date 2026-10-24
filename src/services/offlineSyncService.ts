import { enableNetwork, waitForPendingWrites } from 'firebase/firestore';
import { firestoreService, FirestoreWalletTransaction } from './firestoreService';
import { auth, db } from '../lib/firebase';

export type OfflineMutationInput =
  | {
      type: 'wallet_balance';
      uid: string;
      balance: number;
    }
  | {
      type: 'wallet_transaction';
      tx: FirestoreWalletTransaction;
    }
  | {
      type: 'user_app_lists';
      uid: string;
      installedAppIds: string[];
      recentAppIds: string[];
    };

export type OfflineMutation = OfflineMutationInput & {
  id: string;
  createdAt: number;
  checksum: string;
  attempts: number;
};

export interface SyncCheckpoint {
  id: 'latest';
  lastSyncedAt: string;
  syncedCount: number;
  remainingCount: number;
  firestoreFlushed: boolean;
  integrityVerified: boolean;
}

const OFFLINE_QUEUE_KEY = 'omnimini_offline_sync_queue_v1';
const LAST_SYNC_STORAGE_KEY = 'omnimini_idb_last_synced_at_v1';
const IDB_NAME = 'omnimini_local_first_db';
const IDB_VERSION = 1;
const STORE_MUTATIONS = 'pending_mutations';
const STORE_CHECKPOINTS = 'sync_checkpoints';

/**
 * Computes a deterministic FNV-1a 32-bit hex checksum over a mutation payload
 * to guarantee local-first data integrity before pushing IndexedDB records to the server.
 */
export function computeMutationChecksum(input: OfflineMutationInput, createdAt: number): string {
  const canonical = JSON.stringify({ input, createdAt });
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Verifies that an OfflineMutation retrieved from IndexedDB has not been corrupted.
 */
export function verifyMutationIntegrity(mutation: OfflineMutation): boolean {
  if (!mutation || typeof mutation.id !== 'string' || typeof mutation.createdAt !== 'number') {
    return false;
  }
  if (!mutation.checksum) {
    return true; // backward compatibility with legacy entries
  }
  let inputPayload: OfflineMutationInput;
  if (mutation.type === 'wallet_balance') {
    inputPayload = { type: 'wallet_balance', uid: mutation.uid, balance: mutation.balance };
  } else if (mutation.type === 'wallet_transaction') {
    inputPayload = { type: 'wallet_transaction', tx: mutation.tx };
  } else if (mutation.type === 'user_app_lists') {
    inputPayload = {
      type: 'user_app_lists',
      uid: mutation.uid,
      installedAppIds: mutation.installedAppIds,
      recentAppIds: mutation.recentAppIds,
    };
  } else {
    return false;
  }
  return computeMutationChecksum(inputPayload, mutation.createdAt) === mutation.checksum;
}

function openLocalFirstIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_MUTATIONS)) {
          const store = database.createObjectStore(STORE_MUTATIONS, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORE_CHECKPOINTS)) {
          database.createObjectStore(STORE_CHECKPOINTS, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readIdbQueue(): Promise<OfflineMutation[]> {
  const database = await openLocalFirstIdb();
  if (!database) return readLocalStorageQueue();

  return new Promise((resolve) => {
    try {
      const tx = database.transaction(STORE_MUTATIONS, 'readonly');
      const store = tx.objectStore(STORE_MUTATIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = Array.isArray(req.result) ? (req.result as OfflineMutation[]) : [];
        items.sort((a, b) => a.createdAt - b.createdAt);
        resolve(items);
      };
      req.onerror = () => resolve(readLocalStorageQueue());
    } catch {
      resolve(readLocalStorageQueue());
    }
  });
}

async function writeIdbQueue(queue: OfflineMutation[]): Promise<void> {
  const database = await openLocalFirstIdb();
  if (!database) return;

  return new Promise((resolve) => {
    try {
      const tx = database.transaction(STORE_MUTATIONS, 'readwrite');
      const store = tx.objectStore(STORE_MUTATIONS);
      store.clear();
      for (const item of queue) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function writeIdbCheckpoint(checkpoint: SyncCheckpoint): Promise<void> {
  try {
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, checkpoint.lastSyncedAt);
  } catch {
    // ignore storage errors
  }
  const database = await openLocalFirstIdb();
  if (!database) return;

  return new Promise((resolve) => {
    try {
      const tx = database.transaction(STORE_CHECKPOINTS, 'readwrite');
      const store = tx.objectStore(STORE_CHECKPOINTS);
      store.put(checkpoint);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function readLocalStorageQueue(): OfflineMutation[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed reading offline sync queue:', e);
  }
  return [];
}

function writeLocalStorageQueue(queue: OfflineMutation[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed writing offline sync queue:', e);
  }
}

function dispatchSyncQueueEvent(pendingCount: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('omnimini:idb-sync-updated', {
        detail: { pendingCount },
      })
    );
  }
}

export const offlineSyncService = {
  /**
   * Synchronous read from local mirror for immediate UI rendering.
   */
  getQueue(): OfflineMutation[] {
    return readLocalStorageQueue();
  },

  /**
   * Asynchronous authoritative read from the browser's IndexedDB `pending_mutations` object store.
   * Reconciles with the synchronous mirror to ensure zero data loss across tabs or crashes.
   */
  async getIndexedDbQueue(): Promise<OfflineMutation[]> {
    const [idbItems, localItems] = await Promise.all([
      readIdbQueue(),
      Promise.resolve(readLocalStorageQueue()),
    ]);

    const mergedMap = new Map<string, OfflineMutation>();
    for (const item of localItems) {
      mergedMap.set(item.id, item);
    }
    for (const item of idbItems) {
      mergedMap.set(item.id, item);
    }

    const reconciled = Array.from(mergedMap.values()).sort((a, b) => a.createdAt - b.createdAt);
    if (reconciled.length !== localItems.length) {
      writeLocalStorageQueue(reconciled);
    }
    if (reconciled.length !== idbItems.length) {
      await writeIdbQueue(reconciled);
    }
    return reconciled;
  },

  getPendingCount(): number {
    return readLocalStorageQueue().length;
  },

  getLastSyncedAt(): string | null {
    try {
      return localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Enqueues a local-first mutation into both IndexedDB (`pending_mutations` store)
   * and the synchronous localStorage mirror, deduplicating state updates for the same entity.
   */
  enqueue(mutation: OfflineMutationInput): void {
    const queue = readLocalStorageQueue();
    const filtered = queue.filter((item) => {
      if (mutation.type === 'wallet_balance' && item.type === 'wallet_balance' && item.uid === mutation.uid) {
        return false;
      }
      if (mutation.type === 'user_app_lists' && item.type === 'user_app_lists' && item.uid === mutation.uid) {
        return false;
      }
      return true;
    });

    const createdAt = Date.now();
    const entry: OfflineMutation = {
      ...mutation,
      id: `sync-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt,
      checksum: computeMutationChecksum(mutation, createdAt),
      attempts: 0,
    };

    filtered.push(entry);
    writeLocalStorageQueue(filtered);
    void writeIdbQueue(filtered);
    dispatchSyncQueueEvent(filtered.length);

    // Request Service Worker Background Sync if supported by browser
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          const syncReg = reg as ServiceWorkerRegistration & {
            sync?: { register: (tag: string) => Promise<void> };
          };
          if (syncReg.sync && typeof syncReg.sync.register === 'function') {
            return syncReg.sync.register('omnimini-idb-background-sync');
          }
        })
        .catch(() => {
          // Background Sync API not supported or permission denied; handled by online event listener
        });
    }
  },

  /**
   * Flushes all pending changes from the browser's IndexedDB storage and Firestore's
   * IndexedDB persistence layer to the remote server in chronological order, verifying
   * payload checksums for local-first data integrity.
   */
  async flushQueue(): Promise<{
    synced: number;
    remaining: number;
    firestoreFlushed: boolean;
    integrityVerified: boolean;
  }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const q = await this.getIndexedDbQueue();
      return {
        synced: 0,
        remaining: q.length,
        firestoreFlushed: false,
        integrityVerified: true,
      };
    }

    const queue = await this.getIndexedDbQueue();
    let firestoreFlushed = false;

    // 1. Ensure Firestore's own IndexedDB offline write queue is online and flushed to server
    try {
      await enableNetwork(db);
      const timeoutPromise = new Promise<boolean>((resolve) =>
        window.setTimeout(() => resolve(false), 3500)
      );
      const pendingWritesPromise = waitForPendingWrites(db).then(() => true);
      firestoreFlushed = await Promise.race([pendingWritesPromise, timeoutPromise]);
    } catch {
      firestoreFlushed = false;
    }

    if (queue.length === 0) {
      const nowStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      await writeIdbCheckpoint({
        id: 'latest',
        lastSyncedAt: nowStr,
        syncedCount: 0,
        remainingCount: 0,
        firestoreFlushed,
        integrityVerified: true,
      });
      dispatchSyncQueueEvent(0);
      return { synced: 0, remaining: 0, firestoreFlushed, integrityVerified: true };
    }

    if (!auth.currentUser) {
      dispatchSyncQueueEvent(queue.length);
      return {
        synced: 0,
        remaining: queue.length,
        firestoreFlushed,
        integrityVerified: true,
      };
    }

    const remaining: OfflineMutation[] = [];
    let synced = 0;
    let integrityVerified = true;

    // Sort strictly by createdAt ascending to preserve causal local-first ordering
    const orderedQueue = [...queue].sort((a, b) => a.createdAt - b.createdAt);

    for (const item of orderedQueue) {
      if (!verifyMutationIntegrity(item)) {
        console.warn('Dropped corrupted offline mutation failing checksum integrity check:', item.id);
        integrityVerified = false;
        continue;
      }

      try {
        if (item.type === 'wallet_balance') {
          await firestoreService.updateWalletBalance(item.uid, item.balance);
          synced++;
        } else if (item.type === 'wallet_transaction') {
          await firestoreService.recordTransaction(item.tx);
          synced++;
        } else if (item.type === 'user_app_lists') {
          await firestoreService.updateUserAppLists(item.uid, item.installedAppIds, item.recentAppIds);
          synced++;
        }
      } catch (e) {
        console.warn('Deferred offline mutation remained queued in IndexedDB:', item.type, e);
        remaining.push({
          ...item,
          attempts: (item.attempts || 0) + 1,
        });
      }
    }

    writeLocalStorageQueue(remaining);
    await writeIdbQueue(remaining);

    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    await writeIdbCheckpoint({
      id: 'latest',
      lastSyncedAt: nowStr,
      syncedCount: synced,
      remainingCount: remaining.length,
      firestoreFlushed,
      integrityVerified,
    });

    dispatchSyncQueueEvent(remaining.length);

    return {
      synced,
      remaining: remaining.length,
      firestoreFlushed,
      integrityVerified,
    };
  },

  clearQueue(): void {
    writeLocalStorageQueue([]);
    void writeIdbQueue([]);
    dispatchSyncQueueEvent(0);
  },
};
