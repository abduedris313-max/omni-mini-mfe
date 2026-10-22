import { useEffect, useState, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

export interface OfflineCacheStats {
  swActive: boolean;
  offlineReady: boolean;
  needRefresh: boolean;
  cachedAssetCount: number;
  storageUsedKb: number;
  lastVerifiedAt: string | null;
}

const OFFLINE_READY_STORAGE_KEY = 'omnimini_pwa_offline_ready_v1';

let globalUpdateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swInitialized = false;
const listeners = new Set<() => void>();

let sharedState = {
  offlineReady: typeof localStorage !== 'undefined' && localStorage.getItem(OFFLINE_READY_STORAGE_KEY) === 'true',
  needRefresh: false,
  swActive: false,
};

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function initPWAServiceWorker() {
  if (swInitialized || typeof window === 'undefined') return;
  swInitialized = true;

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

export function useServiceWorker() {
  const [state, setState] = useState(sharedState);
  const [cachedAssetCount, setCachedAssetCount] = useState<number>(0);
  const [storageUsedKb, setStorageUsedKb] = useState<number>(0);
  const [isPrewarming, setIsPrewarming] = useState<boolean>(false);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('omnimini_pwa_verified_at');
    } catch {
      return null;
    }
  });

  const inspectCacheStorage = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.active) {
          sharedState = { ...sharedState, swActive: true };
          setState({ ...sharedState });
        }
      }

      if ('caches' in window) {
        const cacheNames = await window.caches.keys();
        let totalEntries = 0;
        for (const name of cacheNames) {
          const cache = await window.caches.open(name);
          const keys = await cache.keys();
          totalEntries += keys.length;
        }
        setCachedAssetCount(totalEntries);
      }

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

  const prewarmOfflineCache = useCallback(async (): Promise<number> => {
    if (typeof window === 'undefined' || !('caches' in window)) return 0;
    setIsPrewarming(true);
    try {
      const cache = await window.caches.open('omnimini-offline-core-v1');
      const urlsToCache = [
        './',
        './index.html',
        './icon.svg',
        './apple-touch-icon.png',
        './pwa-192x192.png',
        './pwa-512x512.png',
        './pwa-maskable-512x512.png',
      ];

      await Promise.allSettled(
        urlsToCache.map(async (url) => {
          const response = await fetch(url, { cache: 'reload' });
          if (response.ok) {
            await cache.put(url, response.clone());
          }
        })
      );

      // Also warm API cache if reachable
      try {
        const apiCache = await window.caches.open('omnimini-api-cache');
        const apiRes = await fetch('/api/miniapps');
        if (apiRes.ok) {
          await apiCache.put('/api/miniapps', apiRes.clone());
        }
      } catch {
        // Ignore if running in static hosting or already offline
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
    cachedAssetCount,
    storageUsedKb,
    lastVerifiedAt,
    isPrewarming,
    prewarmOfflineCache,
    updateServiceWorker,
    inspectCacheStorage,
  };
}
