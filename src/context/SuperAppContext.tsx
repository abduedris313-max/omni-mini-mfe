import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  SuperAppUser,
  SuperAppSettings,
  MiniAppManifest,
  NavigationTab,
} from '../types/miniapp';
import { repositoryService } from '../services/repositoryService';
import {
  resolveSuperAppTheme,
  superAppTokensToCSSVariables,
  resolveMiniAppTheme,
  themeEventEmitter,
} from '../theme/themeEngine';
import { ThemeTokens } from '../theme/types';
import { SUPER_APP_STARTER_CONFIG } from '../config/superAppStarter.config';

interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface WalletTransaction {
  id: string;
  appId: string;
  appName: string;
  amount: number;
  type: 'debit' | 'credit';
  description: string;
  timestamp: string;
}

interface SuperAppContextValue {
  user: SuperAppUser | null;
  setUser: (user: SuperAppUser | null) => void;
  signInWithGoogle: (customData?: Partial<SuperAppUser>) => Promise<void>;
  signOut: () => void;

  settings: SuperAppSettings;
  updateSetting: <K extends keyof SuperAppSettings>(key: K, val: SuperAppSettings[K]) => void;
  updatePluggableSetting: (appId: string, settingKey: string, val: any) => void;
  getPluggableSetting: (appId: string, settingKey: string, fallback: any) => any;

  // Theming Engine
  themeTokens: ThemeTokens;
  isDark: boolean;
  superAppStyle: React.CSSProperties;

  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;

  installedAppIds: string[];
  installApp: (appId: string) => Promise<void>;
  uninstallApp: (appId: string) => void;
  isAppInstalled: (appId: string) => boolean;

  activeMiniAppId: string | null;
  recentAppIds: string[];
  clearRecentApps: () => void;
  openMiniApp: (appId: string) => void;
  closeMiniApp: () => void;

  walletBalance: number;
  transactions: WalletTransaction[];
  deductWallet: (amount: number, description: string, appId: string) => Promise<boolean>;
  topUpWallet: (amount: number) => void;

  grantedPermissions: Record<string, string[]>;
  requestPermission: (appId: string, permission: string) => Promise<boolean>;
  revokePermission: (appId: string, permission: string) => void;
  requestConfirm: (title: string, message: string) => Promise<boolean>;

  toasts: ToastItem[];
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  hapticFeedback: (pattern?: 'light' | 'medium' | 'heavy' | 'success') => void;

  // Global repository cache
  availableApps: MiniAppManifest[];
  refreshApps: () => Promise<void>;

  // First-Time User Setup Wizard
  isSetupWizardOpen: boolean;
  openSetupWizard: () => void;
  closeSetupWizard: () => void;
  completeSetupWizard: (data: {
    theme?: 'dark' | 'light' | 'system';
    accentColor?: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet';
    deviceBezel?: boolean;
    showStatusBar?: boolean;
    displayName?: string;
    role?: 'consumer' | 'developer' | 'admin';
    starterBalance?: number;
    installedAppIds?: string[];
    enablePermissions?: boolean;
  }) => void;
}

const SuperAppContext = createContext<SuperAppContextValue | undefined>(undefined);

const DEFAULT_SETTINGS: SuperAppSettings = {
  ...SUPER_APP_STARTER_CONFIG.defaultSettings,
  developerMode: true,
  pluggableAppSettings: {
    'miniapp-starter-template': {
      welcomeBannerText: 'Build Fast with OmniMini SDK',
      enableDebugBanner: true,
      sampleCheckoutAmount: 5,
    },
    'fintrack-budget': {
      monthlyBudgetLimit: 2500,
      alertThresholdPercent: 80,
      currencySymbol: '$',
      privacyMaskDefault: false,
    },
    'paypulse-wallet': {
      requireBiometrics: true,
      dailySpendingLimit: 1500,
      defaultCurrency: 'USD',
      autoRoundUp: true,
    },
    'urbanride-transit': {
      preferredVehicleClass: 'comfort_ev',
      quietRideMode: true,
      defaultTipPercent: 15,
      emergencyContactPhone: '+1 (555) 019-2834',
    },
    'foodbite-express': {
      dietaryFilter: 'none',
      ecoPackagingOnly: true,
      contactlessDropoff: true,
    },
    'fitsync-health': {
      dailyStepGoal: 10000,
      dailyWaterTarget: 2500,
      sedentaryAlert: true,
    },
    'noteflow-editor': {
      defaultCategory: 'ideas',
      autoArchiveCompleted: false,
      fontSize: 'md',
    },
    'codecraft-scratchpad': {
      syntaxTheme: 'one_dark',
      autoRunCode: true,
      verboseLogs: true,
    },
  },
};

const DEFAULT_USER: SuperAppUser = {
  id: 'usr-google-8821',
  name: 'Abdu Edris',
  email: 'abdu.edris313@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  isGoogle: true,
  walletBalance: 345.5,
  role: 'developer',
  joinedDate: 'October 2026',
};

export const SuperAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. User Authentication
  const [user, setUserState] = useState<SuperAppUser | null>(() => {
    try {
      const saved = localStorage.getItem('omnimini_user_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed loading user from storage', e);
    }
    return DEFAULT_USER;
  });

  const setUser = (u: SuperAppUser | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('omnimini_user_v2', JSON.stringify(u));
    } else {
      localStorage.removeItem('omnimini_user_v2');
    }
  };

  const signInWithGoogle = async (customData?: Partial<SuperAppUser>) => {
    const googleUser = await repositoryService.authenticateGoogle(customData);
    setUser(googleUser);
    showToast(`Welcome back, ${googleUser.name}! (Signed in via Google)`, 'success');
    hapticFeedback('success');
  };

  const signOut = () => {
    setUser(null);
    showToast('Signed out of OmniMini Super App', 'info');
    hapticFeedback('light');
  };

  // 2. Settings (Core + Pluggable Mini App Settings)
  const [settings, setSettingsState] = useState<SuperAppSettings>(() => {
    try {
      const saved = localStorage.getItem('omnimini_settings_v2');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed loading settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  const updateSetting = <K extends keyof SuperAppSettings>(key: K, val: SuperAppSettings[K]) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: val };
      localStorage.setItem('omnimini_settings_v2', JSON.stringify(next));
      return next;
    });
  };

  const updatePluggableSetting = (appId: string, settingKey: string, val: any) => {
    setSettingsState((prev) => {
      const appSettings = { ...(prev.pluggableAppSettings[appId] || {}), [settingKey]: val };
      const next = {
        ...prev,
        pluggableAppSettings: {
          ...prev.pluggableAppSettings,
          [appId]: appSettings,
        },
      };
      localStorage.setItem('omnimini_settings_v2', JSON.stringify(next));
      return next;
    });
  };

  const getPluggableSetting = (appId: string, settingKey: string, fallback: any) => {
    return settings.pluggableAppSettings[appId]?.[settingKey] ?? fallback;
  };

  // 3. Navigation & Active Mini App Container
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [activeMiniAppId, setActiveMiniAppId] = useState<string | null>(null);

  // 4. Installed Mini Apps
  const [installedAppIds, setInstalledAppIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('omnimini_installed_apps_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed loading installed apps', e);
    }
    // Default installed apps from Super App Starter Config
    return SUPER_APP_STARTER_CONFIG.preinstalledMiniAppIds;
  });

  const installApp = async (appId: string) => {
    if (!installedAppIds.includes(appId)) {
      const next = [...installedAppIds, appId];
      setInstalledAppIds(next);
      localStorage.setItem('omnimini_installed_apps_v2', JSON.stringify(next));
      showToast('Mini app installed to your home screen', 'success');
      hapticFeedback('success');
    }
  };

  const uninstallApp = (appId: string) => {
    const next = installedAppIds.filter((id) => id !== appId);
    setInstalledAppIds(next);
    localStorage.setItem('omnimini_installed_apps_v2', JSON.stringify(next));
    if (activeMiniAppId === appId) {
      setActiveMiniAppId(null);
    }
    showToast('Mini app uninstalled', 'info');
    hapticFeedback('medium');
  };

  const isAppInstalled = (appId: string) => installedAppIds.includes(appId);

  const [recentAppIds, setRecentAppIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('omnimini_recent_apps_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed loading recent apps', e);
    }
    return ['paypulse-wallet', 'foodbite-express', 'urbanride-transit'];
  });

  const clearRecentApps = () => {
    setRecentAppIds([]);
    localStorage.setItem('omnimini_recent_apps_v2', JSON.stringify([]));
    showToast('Recent launch history cleared', 'info');
    hapticFeedback('light');
  };

  const openMiniApp = (appId: string) => {
    setActiveMiniAppId(appId);
    setRecentAppIds((prev) => {
      const next = [appId, ...prev.filter((id) => id !== appId)].slice(0, 12);
      localStorage.setItem('omnimini_recent_apps_v2', JSON.stringify(next));
      return next;
    });
    hapticFeedback('light');
  };

  const closeMiniApp = () => {
    setActiveMiniAppId(null);
    hapticFeedback('light');
  };

  // 5. Shared Wallet & Transactions across mini apps
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('omnimini_wallet_balance_v2');
      if (saved) return parseFloat(saved);
    } catch (e) {
      console.warn('Failed loading wallet balance', e);
    }
    return 345.5;
  });

  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('omnimini_transactions_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed loading transactions', e);
    }
    return [
      {
        id: 'tx-1',
        appId: 'foodbite-express',
        appName: 'FoodBite Express',
        amount: 24.5,
        type: 'debit',
        description: 'Artisan Poke Bowl + Green Smoothie',
        timestamp: 'Today, 1:15 PM',
      },
      {
        id: 'tx-2',
        appId: 'urbanride-transit',
        appName: 'UrbanRide Transit',
        amount: 14.8,
        type: 'debit',
        description: 'Comfort EV Trip to Downtown Core',
        timestamp: 'Yesterday, 8:45 AM',
      },
      {
        id: 'tx-3',
        appId: 'paypulse-wallet',
        appName: 'PayPulse Wallet',
        amount: 100.0,
        type: 'credit',
        description: 'Apple Pay Shared Wallet Top Up',
        timestamp: 'Oct 1, 2026',
      },
    ];
  });

  const deductWallet = async (amount: number, description: string, appId: string): Promise<boolean> => {
    if (walletBalance < amount) {
      showToast('Insufficient shared wallet balance', 'error');
      hapticFeedback('heavy');
      return false;
    }

    const newBal = Number((walletBalance - amount).toFixed(2));
    setWalletBalance(newBal);
    localStorage.setItem('omnimini_wallet_balance_v2', newBal.toString());

    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      appId,
      appName: availableApps.find((a) => a.id === appId)?.name || appId,
      amount,
      type: 'debit',
      description,
      timestamp: 'Just now',
    };

    setTransactions((prev) => {
      const next = [newTx, ...prev];
      localStorage.setItem('omnimini_transactions_v2', JSON.stringify(next));
      return next;
    });

    showToast(`-$${amount.toFixed(2)} charged to Super App Wallet`, 'info');
    hapticFeedback('medium');
    return true;
  };

  const topUpWallet = (amount: number) => {
    const newBal = Number((walletBalance + amount).toFixed(2));
    setWalletBalance(newBal);
    localStorage.setItem('omnimini_wallet_balance_v2', newBal.toString());

    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      appId: 'super-app',
      appName: 'OmniMini Super App',
      amount,
      type: 'credit',
      description: 'Account Top-Up via Google / Apple Pay',
      timestamp: 'Just now',
    };

    setTransactions((prev) => {
      const next = [newTx, ...prev];
      localStorage.setItem('omnimini_transactions_v2', JSON.stringify(next));
      return next;
    });

    showToast(`+$${amount.toFixed(2)} added to Wallet`, 'success');
    hapticFeedback('success');
  };

  // 6. Centralized App Permissions Management
  const [grantedPermissions, setGrantedPermissions] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('omnimini_permissions_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed loading permissions', e);
    }
    return {
      'paypulse-wallet': ['camera', 'biometrics', 'auth'],
      'urbanride-transit': ['location', 'notifications', 'auth'],
      'foodbite-express': ['location', 'notifications', 'auth'],
      'fitsync-health': ['notifications', 'storage'],
      'noteflow-editor': ['storage', 'clipboard'],
      'codecraft-scratchpad': ['storage', 'clipboard'],
    };
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    resolve: (val: boolean) => void;
  } | null>(null);

  const requestConfirm = (title: string, message: string): Promise<boolean> => {
    hapticFeedback('medium');
    return new Promise((resolve) => {
      setConfirmDialog({
        title,
        message,
        resolve: (val: boolean) => {
          setConfirmDialog(null);
          resolve(val);
        },
      });
    });
  };

  const requestPermission = async (appId: string, permission: string): Promise<boolean> => {
    const current = grantedPermissions[appId] || [];
    if (current.includes(permission)) return true;

    // Use non-blocking in-app confirmation modal
    const approved = await requestConfirm(
      'Permission Request',
      `"${appId}" is requesting "${permission.toUpperCase()}" access on OmniMini. Allow access?`
    );

    if (approved) {
      const next = { ...grantedPermissions, [appId]: [...current, permission] };
      setGrantedPermissions(next);
      localStorage.setItem('omnimini_permissions_v2', JSON.stringify(next));
      hapticFeedback('light');
      return true;
    }
    return false;
  };

  const revokePermission = (appId: string, permission: string) => {
    const current = grantedPermissions[appId] || [];
    const next = {
      ...grantedPermissions,
      [appId]: current.filter((p) => p !== permission),
    };
    setGrantedPermissions(next);
    localStorage.setItem('omnimini_permissions_v2', JSON.stringify(next));
    showToast(`Revoked ${permission} permission for ${appId}`, 'info');
  };

  // 7. Toasts & Feedback
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const hapticFeedback = (pattern: 'light' | 'medium' | 'heavy' | 'success' = 'light') => {
    if (!settings.hapticsEnabled) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (pattern === 'light') navigator.vibrate(12);
      else if (pattern === 'medium') navigator.vibrate(25);
      else if (pattern === 'heavy') navigator.vibrate(45);
      else if (pattern === 'success') navigator.vibrate([15, 40, 20]);
    }
  };

  // 8. Repository sync
  const [availableApps, setAvailableApps] = useState<MiniAppManifest[]>([]);

  const refreshApps = async () => {
    const apps = await repositoryService.getMiniApps();
    setAvailableApps(apps);
  };

  // System theme preference listener for responsive system mode
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  // Theming Engine resolution for Super App
  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && systemPrefersDark);

  const themeTokens = resolveSuperAppTheme(settings);
  const superAppStyle = superAppTokensToCSSVariables(themeTokens) as React.CSSProperties;

  // DOM sync for class, dataset, and CSS variables
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('dark', 'light');
      root.classList.add(isDark ? 'dark' : 'light');
      root.setAttribute('data-theme', settings.theme);
      root.setAttribute('data-mode', isDark ? 'dark' : 'light');
      root.setAttribute('data-accent', settings.accentColor);

      const vars = superAppTokensToCSSVariables(themeTokens);
      Object.entries(vars).forEach(([k, v]) => {
        root.style.setProperty(k, v);
        document.body.style.setProperty(k, v);
      });
    }

    // Broadcast to mini app event listeners
    availableApps.forEach((app) => {
      try {
        const miniTheme = resolveMiniAppTheme(app.id, settings);
        themeEventEmitter.notify(miniTheme);
      } catch {
        // ignore
      }
    });
  }, [settings, isDark, themeTokens, availableApps]);

  // 9. First Time User Setup Wizard
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState<boolean>(() => {
    try {
      const completed = localStorage.getItem('omnimini_setup_completed_v2');
      return !completed;
    } catch {
      return false;
    }
  });

  const openSetupWizard = () => {
    setIsSetupWizardOpen(true);
    hapticFeedback('medium');
  };

  const closeSetupWizard = () => {
    setIsSetupWizardOpen(false);
    hapticFeedback('light');
  };

  const completeSetupWizard = (data: {
    theme?: 'dark' | 'light' | 'system';
    accentColor?: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet';
    deviceBezel?: boolean;
    showStatusBar?: boolean;
    displayName?: string;
    role?: 'consumer' | 'developer' | 'admin';
    starterBalance?: number;
    installedAppIds?: string[];
    enablePermissions?: boolean;
  }) => {
    if (data.theme) updateSetting('theme', data.theme);
    if (data.accentColor) updateSetting('accentColor', data.accentColor);
    if (data.deviceBezel !== undefined) updateSetting('deviceBezel', data.deviceBezel);
    if (data.showStatusBar !== undefined) updateSetting('showStatusBar', data.showStatusBar);

    if (data.displayName || data.role) {
      setUserState((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          name: data.displayName || prev.name,
          role: data.role || prev.role,
        };
        localStorage.setItem('omnimini_user_v2', JSON.stringify(next));
        return next;
      });
    }

    if (data.starterBalance && data.starterBalance > 0) {
      setWalletBalance((prev) => {
        const next = prev + data.starterBalance!;
        localStorage.setItem('omnimini_wallet_balance_v2', next.toString());
        return next;
      });
      const welcomeTx: WalletTransaction = {
        id: `tx-welcome-${Date.now()}`,
        appId: 'omnimini-system',
        appName: 'OmniMini Super App',
        amount: data.starterBalance,
        type: 'credit',
        description: 'First Time User Onboarding Starter Credit',
        timestamp: 'Just now',
      };
      setTransactions((prev) => {
        const next = [welcomeTx, ...prev];
        localStorage.setItem('omnimini_transactions_v2', JSON.stringify(next));
        return next;
      });
    }

    if (data.installedAppIds && data.installedAppIds.length > 0) {
      setInstalledAppIds(data.installedAppIds);
      localStorage.setItem('omnimini_installed_apps_v2', JSON.stringify(data.installedAppIds));
    }

    if (data.enablePermissions) {
      const fullPerms = {
        'paypulse-wallet': ['camera', 'biometrics', 'auth'],
        'urbanride-transit': ['location', 'notifications', 'auth'],
        'foodbite-express': ['location', 'notifications', 'auth'],
        'fitsync-health': ['notifications', 'storage'],
        'noteflow-editor': ['storage', 'clipboard'],
        'codecraft-scratchpad': ['storage', 'clipboard'],
      };
      setGrantedPermissions(fullPerms);
      localStorage.setItem('omnimini_permissions_v2', JSON.stringify(fullPerms));
    }

    try {
      localStorage.setItem('omnimini_setup_completed_v2', 'true');
    } catch (e) {
      console.warn('Failed saving setup flag', e);
    }

    setIsSetupWizardOpen(false);
    showToast('🎉 Welcome to OmniMini! Personalization saved.', 'success');
    hapticFeedback('success');
  };

  useEffect(() => {
    refreshApps();
  }, []);

  return (
    <SuperAppContext.Provider
      value={{
        user,
        setUser,
        signInWithGoogle,
        signOut,
        settings,
        updateSetting,
        updatePluggableSetting,
        getPluggableSetting,
        themeTokens,
        isDark,
        superAppStyle,
        currentTab,
        setCurrentTab,
        installedAppIds,
        installApp,
        uninstallApp,
        isAppInstalled,
        activeMiniAppId,
        recentAppIds,
        clearRecentApps,
        openMiniApp,
        closeMiniApp,
        walletBalance,
        transactions,
        deductWallet,
        topUpWallet,
        grantedPermissions,
        requestPermission,
        revokePermission,
        requestConfirm,
        toasts,
        showToast,
        hapticFeedback,
        availableApps,
        refreshApps,
        isSetupWizardOpen,
        openSetupWizard,
        closeSetupWizard,
        completeSetupWizard,
      }}
    >
      {children}

      {/* In-app iOS style Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            style={{
              backgroundColor: themeTokens.bgCard,
              borderColor: themeTokens.borderDefault,
              color: themeTokens.textPrimary,
            }}
            className="w-full max-w-sm rounded-3xl border p-6 shadow-2xl text-center space-y-4 animate-in slide-in-from-bottom-4 duration-150"
          >
            <h3 className="text-base font-bold" style={{ color: themeTokens.textPrimary }}>
              {confirmDialog.title}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: themeTokens.textSecondary }}>
              {confirmDialog.message}
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => confirmDialog.resolve(false)}
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  color: themeTokens.textSecondary,
                }}
                className="flex-1 py-2.5 rounded-xl font-semibold text-xs transition ios-active"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDialog.resolve(true)}
                style={{
                  backgroundColor: themeTokens.accentPrimary,
                  color: themeTokens.accentContrast,
                  boxShadow: `0 4px 14px ${themeTokens.accentGlow}`,
                }}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs transition ios-active shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAppContext.Provider>
  );
};

export const useSuperApp = () => {
  const context = useContext(SuperAppContext);
  if (!context) {
    throw new Error('useSuperApp must be used within a SuperAppProvider');
  }
  return context;
};
