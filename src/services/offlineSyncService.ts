import { firestoreService, FirestoreWalletTransaction } from './firestoreService';
import { auth } from '../lib/firebase';

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
};

const OFFLINE_QUEUE_KEY = 'omnimini_offline_sync_queue_v1';

function readQueue(): OfflineMutation[] {
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

function writeQueue(queue: OfflineMutation[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed writing offline sync queue:', e);
  }
}

export const offlineSyncService = {
  getQueue(): OfflineMutation[] {
    return readQueue();
  },

  getPendingCount(): number {
    return readQueue().length;
  },

  enqueue(mutation: OfflineMutationInput): void {
    const queue = readQueue();
    const filtered = queue.filter((item) => {
      if (mutation.type === 'wallet_balance' && item.type === 'wallet_balance' && item.uid === mutation.uid) {
        return false;
      }
      if (mutation.type === 'user_app_lists' && item.type === 'user_app_lists' && item.uid === mutation.uid) {
        return false;
      }
      return true;
    });

    const entry: OfflineMutation = {
      ...mutation,
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };

    filtered.push(entry);
    writeQueue(filtered);
  },

  async flushQueue(): Promise<{ synced: number; remaining: number }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const q = readQueue();
      return { synced: 0, remaining: q.length };
    }

    const queue = readQueue();
    if (queue.length === 0 || !auth.currentUser) {
      return { synced: 0, remaining: queue.length };
    }

    const remaining: OfflineMutation[] = [];
    let synced = 0;

    for (const item of queue) {
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
        console.warn('Deferred offline mutation remained queued:', item.type, e);
        remaining.push(item);
      }
    }

    writeQueue(remaining);
    return { synced, remaining: remaining.length };
  },

  clearQueue(): void {
    writeQueue([]);
  },
};
