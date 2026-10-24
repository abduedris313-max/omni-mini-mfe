import { MiniAppBridgeSDK, MiniAppPermission } from '../types/miniapp';
import { resolveMiniAppTheme } from '../theme/themeEngine';

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
