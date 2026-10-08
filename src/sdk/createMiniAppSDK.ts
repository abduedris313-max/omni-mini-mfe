import { MiniAppBridgeSDK, MiniAppPermission } from '../types/miniapp';
import { resolveMiniAppTheme } from '../theme/themeEngine';

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
        } catch {
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
        context.closeMiniApp();
      },
      setHeaderTitle: (_title: string) => {
        // Can adjust dynamic header
      },
      openMiniApp: (targetAppId: string) => {
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
  };
}
