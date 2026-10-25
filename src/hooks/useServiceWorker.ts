import { useEffect, useState, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { MiniAppManifest } from '../types/miniapp';
import { INITIAL_MINI_APPS } from '../data/seedMiniApps';
import { offlineSyncService, OfflineMutationInput } from '../services/offlineSyncService';
import { isStaticHostEnvironment, getResolvedApiPath } from '../lib/firebase';

export interface BackgroundSyncResult {
  syncedCount: number;
  remainingCount: number;
  firestoreFlushed: boolean;
  integrityVerified: boolean;
  timestamp: string;
  trigger: 'online-event' | 'manual-reconnect' | 'visibility-resume' | 'sw-message' | 'manual-sync';
}

export interface OfflineCacheStats {
  swActive: boolean;
  offlineReady: boolean;
  needRefresh: boolean;
  cachedAssetCount: number;
  storageUsedKb: number;
  lastVerifiedAt: string | null;
  cachedMiniApps: MiniAppManifest[];
  isReconnecting: boolean;
  lastReconnectAttempt: string | null;
  isOfflineViewOpen: boolean;
  isSyncing: boolean;
  pendingIndexedDbCount: number;
  lastSyncedAt: string | null;
  lastSyncResult: BackgroundSyncResult | null;
}

const OFFLINE_READY_STORAGE_KEY = 'omnimini_pwa_offline_ready_v1';
const STORAGE_KEY_APPS = 'omnimini_apps_repo_v3';

let globalUpdateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swInitialized = false;
let syncInFlightPromise: Promise<BackgroundSyncResult> | null = null;
const listeners = new Set<() => void>();

/**
 * Retrieves cached Mini-App manifests synchronously from localStorage with fallback
 * to the bundled seed repository so offline rendering is instantaneous.
 */
function loadLocalCachedMiniApps(): MiniAppManifest[] {
  if (typeof localStorage === 'undefined') return INITIAL_MINI_APPS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPS);
    if (raw) {
      const parsed = JSON.parse(raw) as MiniAppManifest[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local cached mini-apps:', e);
  }
  return INITIAL_MINI_APPS;
}

let sharedState = {
  offlineReady: typeof localStorage !== 'undefined' && localStorage.getItem(OFFLINE_READY_STORAGE_KEY) === 'true',
  needRefresh: false,
  swActive: false,
  isOfflineViewOpen: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  isSyncing: false,
  pendingIndexedDbCount: offlineSyncService.getPendingCount(),
  lastSyncedAt: offlineSyncService.getLastSyncedAt(),
  lastSyncResult: null as BackgroundSyncResult | null,
};

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

/**
 * Executes a mutex-locked background synchronization pass that reads pending mutations
 * from the browser's IndexedDB storage (`omnimini_local_first_db` + Firestore IndexedDB cache),
 * verifies payload checksums, and pushes them to the server in chronological order.
 */
export async function runBackgroundIndexedDbSync(
  trigger: BackgroundSyncResult['trigger'] = 'online-event'
): Promise<BackgroundSyncResult> {
  if (syncInFlightPromise) {
    return syncInFlightPromise;
  }

  sharedState = { ...sharedState, isSyncing: true };
  notifyListeners();

  syncInFlightPromise = (async (): Promise<BackgroundSyncResult> => {
    try {
      const { synced, remaining, firestoreFlushed, integrityVerified } =
        await offlineSyncService.flushQueue();

      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const result: BackgroundSyncResult = {
        syncedCount: synced,
        remainingCount: remaining,
        firestoreFlushed,
        integrityVerified,
        timestamp,
        trigger,
      };

      sharedState = {
        ...sharedState,
        isSyncing: false,
        pendingIndexedDbCount: remaining,
        lastSyncedAt: offlineSyncService.getLastSyncedAt() || timestamp,
        lastSyncResult: result,
      };
      notifyListeners();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('omnimini:background-sync-complete', {
            detail: result,
          })
        );
      }

      return result;
    } catch (error) {
      console.warn('Background IndexedDB sync error:', error);
      const fallbackCount = offlineSyncService.getPendingCount();
      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const failedResult: BackgroundSyncResult = {
        syncedCount: 0,
        remainingCount: fallbackCount,
        firestoreFlushed: false,
        integrityVerified: false,
        timestamp,
        trigger,
      };
      sharedState = {
        ...sharedState,
        isSyncing: false,
        pendingIndexedDbCount: fallbackCount,
        lastSyncResult: failedResult,
      };
      notifyListeners();
      return failedResult;
    } finally {
      syncInFlightPromise = null;
    }
  })();

  return syncInFlightPromise;
}

/**
 * Initializes the Workbox-backed PWA Service Worker and attaches browser
 * online/offline, visibility, and IndexedDB queue listeners to automatically
 * surface the Offline View when disconnected and push pending IndexedDB mutations
 * to the server immediately upon reconnection.
 */
export function initPWAServiceWorker() {
  if (swInitialized || typeof window === 'undefined') return;
  swInitialized = true;

  window.addEventListener('offline', () => {
    sharedState = {
      ...sharedState,
      isOfflineViewOpen: true,
      pendingIndexedDbCount: offlineSyncService.getPendingCount(),
    };
    notifyListeners();
  });

  window.addEventListener('online', () => {
    sharedState = { ...sharedState, isOfflineViewOpen: false };
    notifyListeners();
    // Automatically push pending IndexedDB mutations to the server on reconnect
    void runBackgroundIndexedDbSync('online-event');
  });

  // Listen for IndexedDB queue count updates dispatched by offlineSyncService
  window.addEventListener('omnimini:idb-sync-updated', ((event: CustomEvent<{ pendingCount: number }>) => {
    const nextCount =
      typeof event.detail?.pendingCount === 'number'
        ? event.detail.pendingCount
        : offlineSyncService.getPendingCount();
    sharedState = {
      ...sharedState,
      pendingIndexedDbCount: nextCount,
      lastSyncedAt: offlineSyncService.getLastSyncedAt() || sharedState.lastSyncedAt,
    };
    notifyListeners();
  }) as EventListener);

  // Flush pending IndexedDB changes when the user returns to the app tab while online
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void offlineSyncService.getIndexedDbQueue().then((queue) => {
          if (queue.length > 0) {
            void runBackgroundIndexedDbSync('visibility-resume');
          }
        });
      }
    });
  }

  // Listen for Service Worker message events requesting an IndexedDB sync pass
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (
        event.data &&
        (event.data.type === 'SYNC_OFFLINE_MUTATIONS' ||
          event.data.type === 'omnimini-idb-background-sync')
      ) {
        void runBackgroundIndexedDbSync('sw-message');
      }
    });
  }

  // Reconcile IndexedDB queue on boot if already online
  void offlineSyncService.getIndexedDbQueue().then((queue) => {
    sharedState = { ...sharedState, pendingIndexedDbCount: queue.length };
    notifyListeners();
    if (navigator.onLine && queue.length > 0) {
      void runBackgroundIndexedDbSync('online-event');
    }
  });

  try {
    globalUpdateSW = registerSW({
      immediate: true,
      onOfflineReady() {
        sharedState = { ...sharedState, offlineReady: true, swActive: true };
        try {
          localStorage.setItem(OFFLINE_READY_STORAGE_KEY, 'true');
        } catch {
          // ignore storage quota errors
        }
        notifyListeners();
      },
      onNeedRefresh() {
        sharedState = { ...sharedState, needRefresh: true, swActive: true };
        notifyListeners();
      },
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          sharedState = { ...sharedState, swActive: true };
          notifyListeners();
        }
      },
      onRegisterError(error) {
        console.warn('PWA Service Worker registration warning:', error);
      },
    });
  } catch (e) {
    console.warn('Service worker virtual registration fallback:', e);
  }
}

/**
 * Custom hook managing PWA Service Worker lifecycle, offline mini-app manifest caching,
 * IndexedDB background synchronization, storage telemetry, Offline View visibility,
 * and active network reconnection probing.
 */
export function useServiceWorker() {
  const [state, setState] = useState(sharedState);
  const [cachedAssetCount, setCachedAssetCount] = useState<number>(0);
  const [storageUsedKb, setStorageUsedKb] = useState<number>(0);
  const [isPrewarming, setIsPrewarming] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [lastReconnectAttempt, setLastReconnectAttempt] = useState<string | null>(null);
  const [cachedMiniApps, setCachedMiniApps] = useState<MiniAppManifest[]>(() => loadLocalCachedMiniApps());
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('omnimini_pwa_verified_at');
    } catch {
      return null;
    }
  });

  /**
   * Inspects Cache Storage, IndexedDB storage estimates, pending IndexedDB mutations,
   * and cached Mini-App manifests.
   */
  const inspectCacheStorage = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const localApps = loadLocalCachedMiniApps();
      let resolvedApps = localApps;

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.active) {
          sharedState = { ...sharedState, swActive: true };
          setState({ ...sharedState });
        }
      }

      const idbQueue = await offlineSyncService.getIndexedDbQueue();
      if (idbQueue.length !== sharedState.pendingIndexedDbCount) {
        sharedState = { ...sharedState, pendingIndexedDbCount: idbQueue.length };
        setState({ ...sharedState });
      }

      if ('caches' in window) {
        const cacheNames = await window.caches.keys();
        let totalEntries = 0;
        for (const name of cacheNames) {
          const cache = await window.caches.open(name);
          const keys = await cache.keys();
          totalEntries += keys.length;

          if (name === 'omnimini-api-cache') {
            const apiCacheKey = getResolvedApiPath('api/miniapps');
            const cachedApiResponse =
              (await cache.match(apiCacheKey)) || (await cache.match('/api/miniapps'));
            if (cachedApiResponse) {
              try {
                const data = await cachedApiResponse.clone().json();
                if (Array.isArray(data) && data.length > 0) {
                  const mergedMap = new Map<string, MiniAppManifest>();
                  for (const app of localApps) mergedMap.set(app.id, app);
                  for (const app of data) mergedMap.set(app.id, app);
                  resolvedApps = Array.from(mergedMap.values());
                }
              } catch {
                // fallback to localStorage apps
              }
            }
          }
        }
        setCachedAssetCount(totalEntries);
      }

      setCachedMiniApps(resolvedApps);

      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (typeof estimate.usage === 'number') {
          setStorageUsedKb(Math.max(1, Math.round(estimate.usage / 1024)));
        }
      }
    } catch (e) {
      console.warn('Failed inspecting cache storage:', e);
    }
  }, []);

  useEffect(() => {
    initPWAServiceWorker();
    const handleUpdate = () => setState({ ...sharedState });
    listeners.add(handleUpdate);
    inspectCacheStorage();

    return () => {
      listeners.delete(handleUpdate);
    };
  }, [inspectCacheStorage]);

  /**
   * Controls whether the custom Offline View overlay is expanded or minimized.
   */
  const setOfflineViewOpen = useCallback((open: boolean) => {
    sharedState = { ...sharedState, isOfflineViewOpen: open };
    notifyListeners();
  }, []);

  /**
   * Manually triggers the IndexedDB-to-server background synchronization pipeline.
   */
  const triggerBackgroundSync = useCallback(async (): Promise<BackgroundSyncResult> => {
    const result = await runBackgroundIndexedDbSync('manual-sync');
    await inspectCacheStorage();
    return result;
  }, [inspectCacheStorage]);

  /**
   * Enqueues a mutation into the browser's IndexedDB outbox and triggers immediate
   * background sync if the device is currently online.
   */
  const enqueueIndexedDbMutation = useCallback(
    async (mutation: OfflineMutationInput): Promise<void> => {
      offlineSyncService.enqueue(mutation);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await runBackgroundIndexedDbSync('manual-sync');
      }
    },
    []
  );

  /**
   * Actively probes network connectivity using a cache-busted request to verify
   * if the user's connection has been restored, immediately pushing pending IndexedDB
   * changes to the server upon reconnection.
   */
  const tryReconnect = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    setIsReconnecting(true);
    const attemptTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastReconnectAttempt(attemptTime);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);

      const probeUrl = `${import.meta.env.BASE_URL || './'}icon.svg?_reconnect=${Date.now()}`;
      const response = await fetch(probeUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (response.ok && navigator.onLine !== false) {
        sharedState = { ...sharedState, isOfflineViewOpen: false };
        notifyListeners();
        window.dispatchEvent(new Event('online'));
        await runBackgroundIndexedDbSync('manual-reconnect');
        await inspectCacheStorage();
        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      setIsReconnecting(false);
    }
  }, [inspectCacheStorage]);

  /**
   * Pre-warms the Workbox Cache Storage with core application shell assets and
   * persists all Mini-App manifests for guaranteed offline execution.
   */
  const prewarmOfflineCache = useCallback(async (): Promise<number> => {
    if (typeof window === 'undefined' || !('caches' in window)) return 0;
    setIsPrewarming(true);
    try {
      const cache = await window.caches.open('omnimini-offline-core-v1');
      const urlsToCache = [
        './',
        './index.html',
        './manifest.json',
        './icon.svg',
        './icon-maskable.svg',
        './favicon.ico',
        './favicon-16x16.png',
        './favicon-32x32.png',
        './apple-touch-icon.png',
        './pwa-192x192.png',
        './pwa-512x512.png',
        './pwa-maskable-192x192.png',
        './pwa-maskable-512x512.png',
        './icons/icon-48x48.png',
        './icons/icon-72x72.png',
        './icons/icon-96x96.png',
        './icons/icon-128x128.png',
        './icons/icon-144x144.png',
        './icons/icon-152x152.png',
        './icons/icon-167x167.png',
        './icons/icon-180x180.png',
        './icons/icon-256x256.png',
        './icons/icon-384x384.png',
        './icons/icon-1024x1024.png',
      ];

      await Promise.allSettled(
        urlsToCache.map(async (url) => {
          const response = await fetch(url, { cache: 'reload' });
          if (response.ok) {
            await cache.put(url, response.clone());
          }
        })
      );

      // Warm API cache or seed with local mini-apps manifest snapshot for offline access
      try {
        const apiCache = await window.caches.open('omnimini-api-cache');
        const apiCacheKey = getResolvedApiPath('api/miniapps');
        if (isStaticHostEnvironment()) {
          const fallbackApps = loadLocalCachedMiniApps();
          const syntheticResponse = new Response(JSON.stringify(fallbackApps), {
            headers: { 'Content-Type': 'application/json' },
          });
          await apiCache.put(apiCacheKey, syntheticResponse);
        } else {
          try {
            const apiRes = await fetch(apiCacheKey);
            if (apiRes.ok) {
              await apiCache.put(apiCacheKey, apiRes.clone());
            }
          } catch {
            const fallbackApps = loadLocalCachedMiniApps();
            const syntheticResponse = new Response(JSON.stringify(fallbackApps), {
              headers: { 'Content-Type': 'application/json' },
            });
            await apiCache.put(apiCacheKey, syntheticResponse);
          }
        }
      } catch {
        // Ignore if Cache API is restricted
      }

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastVerifiedAt(nowStr);
      try {
        localStorage.setItem('omnimini_pwa_verified_at', nowStr);
        localStorage.setItem(OFFLINE_READY_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }

      sharedState = { ...sharedState, offlineReady: true, swActive: true };
      notifyListeners();
      await inspectCacheStorage();
      return urlsToCache.length;
    } finally {
      setIsPrewarming(false);
    }
  }, [inspectCacheStorage]);

  const updateServiceWorker = useCallback(async () => {
    if (globalUpdateSW) {
      await globalUpdateSW(true);
    } else {
      window.location.reload();
    }
  }, []);

  return {
    swActive: state.swActive,
    offlineReady: state.offlineReady,
    needRefresh: state.needRefresh,
    isOfflineViewOpen: state.isOfflineViewOpen,
    setOfflineViewOpen,
    isSyncing: state.isSyncing,
    pendingIndexedDbCount: state.pendingIndexedDbCount,
    lastSyncedAt: state.lastSyncedAt,
    lastSyncResult: state.lastSyncResult,
    triggerBackgroundSync,
    enqueueIndexedDbMutation,
    cachedAssetCount,
    storageUsedKb,
    lastVerifiedAt,
    cachedMiniApps,
    isPrewarming,
    isReconnecting,
    lastReconnectAttempt,
    tryReconnect,
    prewarmOfflineCache,
    updateServiceWorker,
    inspectCacheStorage,
  };
}

export { OfflineView } from '../components/OfflineView';
