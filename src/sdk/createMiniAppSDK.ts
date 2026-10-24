import { MiniAppBridgeSDK, MiniAppPermission } from '../types/miniapp';
import { resolveMiniAppTheme } from '../theme/themeEngine';
import { nativeBridgeService, QrScanPayload } from '../services/nativeBridgeService';

const startListenersByApp: Record<string, Set<() => void>> = {};
const pauseListenersByApp: Record<string, Set<() => void>> = {};

function getListenerSet(store: Record<string, Set<() => void>>, appId: string): Set<() => void> {
  if (!store[appId]) {
    store[appId] = new Set();
  }
  return store[appId];
}

export function createMiniAppSDK(
  appId: string,
  context: {
    user: any;
    settings: any;
    updatePluggableSetting: (appId: string, key: string, val: any) => void;
    closeMiniApp: () => void;
    openMiniApp: (id: string) => void;
    showToast: (msg: string, type?: any) => void;
    hapticFeedback: (pattern?: any) => void;
    walletBalance: number;
    deductWallet: (amount: number, description: string, appId: string) => Promise<boolean>;
    creditWallet?: (amount: number, description: string, appId: string) => Promise<boolean>;
    syncSharedWalletBalance?: (
      newBalance: number,
      description: string,
      appId: string
    ) => Promise<{ success: boolean; previousBalance: number; syncedBalance: number }>;
    grantedPermissions: Record<string, string[]>;
    requestPermission: (appId: string, permission: string) => Promise<boolean>;
    requestConfirm: (title: string, message: string) => Promise<boolean>;
    requestBiometricAuth?: (reason: string) => Promise<boolean>;
    openQRScanner?: () => Promise<QrScanPayload | null>;
  }
): MiniAppBridgeSDK {
  const themeAPI = resolveMiniAppTheme(
    appId,
    context.settings,
    undefined,
    context.updatePluggableSetting
  );

  const registerOnStart = (callback: () => void) => {
    const set = getListenerSet(startListenersByApp, appId);
    set.add(callback);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        callback();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Fire initial onStart asynchronously upon registration
    const timer = setTimeout(() => {
      callback();
    }, 0);

    return () => {
      clearTimeout(timer);
      set.delete(callback);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  };

  const registerOnPause = (callback: () => void) => {
    const set = getListenerSet(pauseListenersByApp, appId);
    set.add(callback);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        callback();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      set.delete(callback);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  };

  const triggerStart = () => {
    const set = getListenerSet(startListenersByApp, appId);
    set.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('onStart listener error', err);
      }
    });
  };

  const triggerPause = () => {
    const set = getListenerSet(pauseListenersByApp, appId);
    set.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('onPause listener error', err);
      }
    });
  };

  return {
    auth: {
      getUser: () => context.user,
      requestAuth: async () => {
        if (context.user) return context.user;
        throw new Error('User not logged in');
      },
    },

    theme: themeAPI,

    storage: {
      getItem: (key: string) => {
        try {
          const raw = localStorage.getItem(`miniapp_store_${appId}_${key}`);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      },
      setItem: (key: string, val: any) => {
        try {
          localStorage.setItem(`miniapp_store_${appId}_${key}`, JSON.stringify(val));
        } catch (e) {
          console.warn('Storage set failed', e);
        }
      },
      removeItem: (key: string) => {
        localStorage.removeItem(`miniapp_store_${appId}_${key}`);
      },
    },

    settings: {
      getSettings: () => {
        return context.settings.pluggableAppSettings[appId] || {};
      },
      updateSetting: (key: string, val: any) => {
        context.updatePluggableSetting(appId, key, val);
      },
      registerSchema: (_schema) => {
        // Dynamic registration supported
      },
    },

    navigation: {
      closeMiniApp: () => {
        triggerPause();
        context.closeMiniApp();
      },
      setHeaderTitle: (_title: string) => {
        // Can adjust dynamic header
      },
      openMiniApp: (targetAppId: string) => {
        triggerPause();
        context.openMiniApp(targetAppId);
      },
    },

    ui: {
      showToast: (msg: string, type = 'info') => {
        context.showToast(msg, type);
      },
      hapticFeedback: (pattern = 'light') => {
        context.hapticFeedback(pattern);
      },
      requestConfirm: async (title: string, message: string) => {
        return context.requestConfirm(title, message);
      },
    },

    payment: {
      getBalance: () => context.walletBalance,
      pay: async (amount: number, description: string) => {
        const ok = await context.deductWallet(amount, description, appId);
        if (ok) {
          return { success: true, txId: `tx-${Date.now()}` };
        }
        return { success: false, error: 'Payment declined or insufficient balance' };
      },
      credit: async (amount: number, description: string) => {
        if (context.creditWallet) {
          const ok = await context.creditWallet(amount, description, appId);
          if (ok) {
            return { success: true, txId: `tx-${Date.now()}` };
          }
        }
        return { success: false, error: 'Credit declined' };
      },
      syncSharedBalance: async (newBalance: number, description = 'FinTrack Shared Balance Sync') => {
        if (context.syncSharedWalletBalance) {
          const res = await context.syncSharedWalletBalance(newBalance, description, appId);
          return { ...res, txId: `tx-sync-${Date.now()}` };
        }
        return {
          success: false,
          previousBalance: context.walletBalance,
          syncedBalance: context.walletBalance,
        };
      },
    },

    device: {
      hasPermission: (perm: MiniAppPermission) => {
        const perms = context.grantedPermissions[appId] || [];
        return perms.includes(perm);
      },
      requestPermission: async (perm: MiniAppPermission) => {
        return context.requestPermission(appId, perm);
      },
      getPlatformInfo: () => {
        const info = nativeBridgeService.getPlatformInfo();
        return {
          platform: info.platform,
          isNative: info.isNative,
          isStandalonePWA: info.isStandalonePWA,
        };
      },
      authenticateBiometrics: async (reason = `Authorize action in ${appId}`) => {
        const allowed = await context.requestPermission(appId, 'biometrics');
        if (!allowed) return false;
        if (context.requestBiometricAuth) {
          return context.requestBiometricAuth(reason);
        }
        const res = await nativeBridgeService.verifyHardwareBiometrics();
        return res.verified;
      },
      scanQRCode: async () => {
        const allowed = await context.requestPermission(appId, 'camera');
        if (!allowed) return null;
        if (context.openQRScanner) {
          return context.openQRScanner();
        }
        return null;
      },
      capturePhoto: async () => {
        const allowed = await context.requestPermission(appId, 'camera');
        if (!allowed) return null;
        return nativeBridgeService.capturePhoto();
      },
      share: async (options) => {
        const res = await nativeBridgeService.shareContent(options);
        return res.shared;
      },
      scheduleNotification: async (options) => {
        const allowed = await context.requestPermission(appId, 'notifications');
        if (!allowed) return false;
        const res = await nativeBridgeService.scheduleLocalNotification({
          title: options.title,
          body: options.body,
          delaySeconds: options.delaySeconds,
          extra: { appId },
        });
        return res.delivered;
      },
      secureStorage: {
        getItem: (key: string) => nativeBridgeService.secureStorage.getItem(`${appId}_${key}`),
        setItem: (key: string, val: string) =>
          nativeBridgeService.secureStorage.setItem(`${appId}_${key}`, val),
        removeItem: (key: string) =>
          nativeBridgeService.secureStorage.removeItem(`${appId}_${key}`),
      },
    },

    onStart: registerOnStart,
    onPause: registerOnPause,
    lifecycle: {
      onStart: registerOnStart,
      onPause: registerOnPause,
      triggerStart,
      triggerPause,
    },
  };
}
