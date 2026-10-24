import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import {
  SuperAppUser,
  SuperAppSettings,
  MiniAppManifest,
  NavigationTab,
} from '../types/miniapp';
import { repositoryService } from '../services/repositoryService';
import { firestoreService } from '../services/firestoreService';
import { offlineSyncService } from '../services/offlineSyncService';
import { runBackgroundIndexedDbSync, BackgroundSyncResult } from '../hooks/useServiceWorker';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { auth, googleProvider } from '../lib/firebase';
import {
  resolveSuperAppTheme,
  superAppTokensToCSSVariables,
  resolveMiniAppTheme,
  themeEventEmitter,
} from '../theme/themeEngine';
import { ThemeTokens } from '../theme/types';
import { SUPER_APP_STARTER_CONFIG } from '../config/superAppStarter.config';
import { nativeBridgeService, QrScanPayload } from '../services/nativeBridgeService';
import { BiometricPromptModal } from '../components/BiometricPromptModal';
import { QRScannerModal } from '../components/QRScannerModal';

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
  creditWallet: (amount: number, description: string, appId: string) => Promise<boolean>;
  syncSharedWalletBalance: (
    newBalance: number,
    description: string,
    appId: string
  ) => Promise<{ success: boolean; previousBalance: number; syncedBalance: number }>;
  topUpWallet: (amount: number) => void;

  grantedPermissions: Record<string, string[]>;
  requestPermission: (appId: string, permission: string) => Promise<boolean>;
  revokePermission: (appId: string, permission: string) => void;
  requestConfirm: (title: string, message: string) => Promise<boolean>;
  requestBiometricAuth: (reason?: string) => Promise<boolean>;
  openQRScanner: (initialTab?: 'scan' | 'receive') => Promise<QrScanPayload | null>;
  sendLocalNotification: (title: string, body: string, delaySeconds?: number) => Promise<void>;

  toasts: ToastItem[];
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  hapticFeedback: (pattern?: 'light' | 'medium' | 'heavy' | 'success') => void;

  // Global repository cache
  availableApps: MiniAppManifest[];
  refreshApps: () => Promise<void>;

  // Offline PWA & Sync state
  isOnline: boolean;
  pendingSyncCount: number;
  syncOfflineQueue: () => Promise<void>;

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
    'ethiotax-salary': {
      pensionScheme: 'standard',
      enableCostSharingDefault: false,
      etbPerUsdRate: 122,
    },
    'fintrack-budget': {
      monthlyBudgetLimit: 45000,
      alertThresholdPercent: 80,
      currencySymbol: 'ETB',
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
      emergencyContactPhone: '',
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

export const SuperAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isOnline = useOnlineStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() =>
    offlineSyncService.getPendingCount()
  );

  // 1. User Authentication (clean unauthenticated initial state unless signed in)
  const [user, setUserState] = useState<SuperAppUser | null>(() => {
    try {
      const saved = localStorage.getItem('omnimini_user_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed loading user from storage', e);
    }
    return null;
  });

  const setUser = (u: SuperAppUser | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('omnimini_user_v3', JSON.stringify(u));
    } else {
      localStorage.removeItem('omnimini_user_v3');
    }
  };

  const signInWithGoogle = async (_customData?: Partial<SuperAppUser>) => {
    const credential = await signInWithPopup(auth, googleProvider);
    const synced = await firestoreService.ensureUserProfile(
      credential.user,
      SUPER_APP_STARTER_CONFIG.preinstalledMiniAppIds
    );
    setUser(synced.user);
    setWalletBalance(synced.walletBalance);
    setInstalledAppIds(synced.installedAppIds);
    setRecentAppIds(synced.recentAppIds);
    showToast(`Welcome back, ${synced.user.name}! (Signed in via Google)`, 'success');
    hapticFeedback('success');
  };

  const signOut = () => {
    firebaseSignOut(auth).catch((e) => console.warn('Firebase signOut error:', e));
    setUser(null);
    setWalletBalance(0);
    setTransactions([]);
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

  const syncUserListsWithOfflineFallback = (uid: string, installed: string[], recent: string[]) => {
    if (!navigator.onLine) {
      offlineSyncService.enqueue({
        type: 'user_app_lists',
        uid,
        installedAppIds: installed,
        recentAppIds: recent,
      });
      setPendingSyncCount(offlineSyncService.getPendingCount());
      return;
    }
    firestoreService.updateUserAppLists(uid, installed, recent).catch(() => {
      offlineSyncService.enqueue({
        type: 'user_app_lists',
        uid,
        installedAppIds: installed,
        recentAppIds: recent,
      });
      setPendingSyncCount(offlineSyncService.getPendingCount());
    });
  };

  const installApp = async (appId: string) => {
    if (!installedAppIds.includes(appId)) {
      const next = [...installedAppIds, appId].slice(-10);
      setInstalledAppIds(next);
      localStorage.setItem('omnimini_installed_apps_v2', JSON.stringify(next));
      if (auth.currentUser) {
        syncUserListsWithOfflineFallback(auth.currentUser.uid, next, recentAppIds);
      }
      showToast('Mini app installed to your home screen', 'success');
      hapticFeedback('success');
    }
  };

  const uninstallApp = (appId: string) => {
    const next = installedAppIds.filter((id) => id !== appId);
    setInstalledAppIds(next);
    localStorage.setItem('omnimini_installed_apps_v2', JSON.stringify(next));
    if (auth.currentUser) {
      syncUserListsWithOfflineFallback(auth.currentUser.uid, next, recentAppIds);
    }
    if (activeMiniAppId === appId) {
      setActiveMiniAppId(null);
    }
    showToast('Mini app uninstalled', 'info');
    hapticFeedback('medium');
  };

  const isAppInstalled = (appId: string) => installedAppIds.includes(appId);

  const [recentAppIds, setRecentAppIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('omnimini_recent_apps_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed loading recent apps', e);
    }
    return [];
  });

  const clearRecentApps = () => {
    setRecentAppIds([]);
    localStorage.setItem('omnimini_recent_apps_v3', JSON.stringify([]));
    if (auth.currentUser) {
      syncUserListsWithOfflineFallback(auth.currentUser.uid, installedAppIds, []);
    }
    showToast('Recent launch history cleared', 'info');
    hapticFeedback('light');
  };

  const openMiniApp = (appId: string) => {
    setActiveMiniAppId(appId);
    setRecentAppIds((prev) => {
      const next = [appId, ...prev.filter((id) => id !== appId)].slice(0, 10);
      localStorage.setItem('omnimini_recent_apps_v3', JSON.stringify(next));
      if (auth.currentUser) {
        syncUserListsWithOfflineFallback(auth.currentUser.uid, installedAppIds, next);
      }
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
      const saved = localStorage.getItem('omnimini_wallet_balance_v3');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (Number.isFinite(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed loading wallet balance', e);
    }
    return SUPER_APP_STARTER_CONFIG.wallet.starterBalance;
  });

  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('omnimini_transactions_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed loading transactions', e);
    }
    return [];
  });

  const deductWallet = async (amount: number, description: string, appId: string): Promise<boolean> => {
    if (walletBalance < amount) {
      showToast('Insufficient shared wallet balance', 'error');
      hapticFeedback('heavy');
      return false;
    }

    const newBal = Number((walletBalance - amount).toFixed(2));
    setWalletBalance(newBal);
    localStorage.setItem('omnimini_wallet_balance_v3', newBal.toString());

    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      appId,
      appName: availableApps.find((a) => a.id === appId)?.name || appId,
      amount,
      type: 'debit',
      description,
      timestamp: new Date().toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setTransactions((prev) => {
      const next = [newTx, ...prev];
      localStorage.setItem('omnimini_transactions_v3', JSON.stringify(next));
      return next;
    });

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      const txPayload = {
        ...newTx,
        userId: uid,
        status: 'completed' as const,
      };
      if (!navigator.onLine) {
        offlineSyncService.enqueue({ type: 'wallet_balance', uid, balance: newBal });
        offlineSyncService.enqueue({ type: 'wallet_transaction', tx: txPayload });
        setPendingSyncCount(offlineSyncService.getPendingCount());
      } else {
        firestoreService.updateWalletBalance(uid, newBal).catch(() => {
          offlineSyncService.enqueue({ type: 'wallet_balance', uid, balance: newBal });
          setPendingSyncCount(offlineSyncService.getPendingCount());
        });
        firestoreService.recordTransaction(txPayload).catch(() => {
          offlineSyncService.enqueue({ type: 'wallet_transaction', tx: txPayload });
          setPendingSyncCount(offlineSyncService.getPendingCount());
        });
      }
    }

    showToast(`-$${amount.toFixed(2)} charged to Super App Wallet`, 'info');
    hapticFeedback('medium');
    return true;
  };

  const topUpWallet = (amount: number) => {
    const newBal = Number((walletBalance + amount).toFixed(2));
    setWalletBalance(newBal);
    localStorage.setItem('omnimini_wallet_balance_v3', newBal.toString());

    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      appId: 'super-app',
      appName: 'OmniMini Super App',
      amount,
      type: 'credit',
      description: 'Account Top-Up',
      timestamp: new Date().toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setTransactions((prev) => {
      const next = [newTx, ...prev];
      localStorage.setItem('omnimini_transactions_v3', JSON.stringify(next));
      return next;
    });

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      const txPayload = {
        ...newTx,
        userId: uid,
        status: 'completed' as const,
      };
      if (!navigator.onLine) {
        offlineSyncService.enqueue({ type: 'wallet_balance', uid, balance: newBal });
        offlineSyncService.enqueue({ type: 'wallet_transaction', tx: txPayload });
        setPendingSyncCount(offlineSyncService.getPendingCount());
      } else {
        firestoreService.updateWalletBalance(uid, newBal).catch(() => {
          offlineSyncService.enqueue({ type: 'wallet_balance', uid, balance: newBal });
          setPendingSyncCount(offlineSyncService.getPendingCount());
        });
        firestoreService.recordTransaction(txPayload).catch(() => {
          offlineSyncService.enqueue({ type: 'wallet_transaction', tx: txPayload });
          setPendingSyncCount(offlineSyncService.getPendingCount());
        });
      }
    }

    showToast(`+$${amount.toFixed(2)} added to Wallet`, 'success');
    hapticFeedback('success');
  };

  const creditWallet = async (
    amount: number,
    description: string,
    appId: string
  ): Promise<boolean> => {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const newBal = Number((walletBalance + amount).toFixed(2));
    setWalletBalance(newBal);
    localStorage.setItem('omnimini_wallet_balance_v3', newBal.toString());

    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      appId,
      appName: availableApps.find((a) => a.id === appId)?.name || appId,
      amount,
      type: 'credit',
      description,
      timestamp: new Date().toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setTransactions((prev) => {
      const next = [newTx, ...prev];
      localStorage.setItem('omnimini_transactions_v3', JSON.stringify(next));
      return next;
    });

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      const txPayload = {
        ...newTx,
        userId: uid,
        status: 'completed' as const,
      };
      if (!navigator.onLine) {
        offlineSyncService.enqueue({ type: 'wallet_balance', uid, balance: newBal });
        offlineSyncService.enqueue({ type: 'wallet_transaction', tx: txPayload });
        setPendingSyncCount(offlineSyncService.getPendingCount());
      } else {
        firestoreService.updateWalletBalance(uid, newBal).catch(() => {
          offlineSyncService.enqueue({ type: 'wallet_balance', uid, balance: newBal });
          setPendingSyncCount(offlineSyncService.getPendingCount());
        });
        firestoreService.recordTransaction(txPayload).catch(() => {
          offlineSyncService.enqueue({ type: 'wallet_transaction', tx: txPayload });
          setPendingSyncCount(offlineSyncService.getPendingCount());
        });
      }
    }

    showToast(`+$${amount.toFixed(2)} synced to Super App Wallet`, 'success');
    hapticFeedback('success');
    return true;
  };

  const syncSharedWalletBalance = async (
    newBalance: number,
    description: string,
    appId: string
  ): Promise<{ success: boolean; previousBalance: number; syncedBalance: number }> => {
    const cleanBalance = Math.max(0, Number(newBalance.toFixed(2)));
    const prevBalance = walletBalance;
    const delta = Number((cleanBalance - prevBalance).toFixed(2));

    setWalletBalance(cleanBalance);
    localStorage.setItem('omnimini_wallet_balance_v3', cleanBalance.toString());

    if (Math.abs(delta) >= 0.01) {
      const newTx: WalletTransaction = {
        id: `tx-sync-${Date.now()}`,
        appId,
        appName: availableApps.find((a) => a.id === appId)?.name || appId,
        amount: Math.abs(delta),
        type: delta >= 0 ? 'credit' : 'debit',
        description,
        timestamp: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setTransactions((prev) => {
        const next = [newTx, ...prev];
        localStorage.setItem('omnimini_transactions_v3', JSON.stringify(next));
        return next;
      });

      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        const txPayload = {
          ...newTx,
          userId: uid,
          status: 'completed' as const,
        };
        if (!navigator.onLine) {
          offlineSyncService.enqueue({ type: 'wallet_balance', uid, balance: cleanBalance });
          offlineSyncService.enqueue({ type: 'wallet_transaction', tx: txPayload });
          setPendingSyncCount(offlineSyncService.getPendingCount());
        } else {
          firestoreService.updateWalletBalance(uid, cleanBalance).catch(() => {
            offlineSyncService.enqueue({ type: 'wallet_balance', uid, balance: cleanBalance });
            setPendingSyncCount(offlineSyncService.getPendingCount());
          });
          firestoreService.recordTransaction(txPayload).catch(() => {
            offlineSyncService.enqueue({ type: 'wallet_transaction', tx: txPayload });
            setPendingSyncCount(offlineSyncService.getPendingCount());
          });
        }
      }
    } else if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      if (!navigator.onLine) {
        offlineSyncService.enqueue({ type: 'wallet_balance', uid, balance: cleanBalance });
        setPendingSyncCount(offlineSyncService.getPendingCount());
      } else {
        firestoreService.updateWalletBalance(uid, cleanBalance).catch(() => {
          offlineSyncService.enqueue({ type: 'wallet_balance', uid, balance: cleanBalance });
          setPendingSyncCount(offlineSyncService.getPendingCount());
        });
      }
    }

    return {
      success: true,
      previousBalance: prevBalance,
      syncedBalance: cleanBalance,
    };
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

  const [biometricDialog, setBiometricDialog] = useState<{
    reason: string;
    resolve: (verified: boolean) => void;
  } | null>(null);

  const [qrScannerState, setQrScannerState] = useState<{
    initialTab: 'scan' | 'receive';
    resolve: (payload: QrScanPayload | null) => void;
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

  const requestBiometricAuth = (
    reason = 'Verify your identity to authorize this action'
  ): Promise<boolean> => {
    hapticFeedback('medium');
    return new Promise((resolve) => {
      setBiometricDialog({
        reason,
        resolve: (verified: boolean) => {
          setBiometricDialog(null);
          if (verified) {
            showToast('Biometric identity verified', 'success');
          } else {
            showToast('Biometric verification cancelled', 'warning');
          }
          resolve(verified);
        },
      });
    });
  };

  const handleQrPayloadAction = async (payload: QrScanPayload) => {
    if (payload.type === 'miniapp' && payload.miniAppId) {
      openMiniApp(payload.miniAppId);
      showToast(`Opened Mini App via Deep Link (${payload.miniAppId})`, 'info');
      return;
    }

    if (payload.type === 'payment' && payload.amount && payload.amount > 0) {
      const recipient = payload.recipient || 'OmniMini Merchant';
      const approved = await requestConfirm(
        'Confirm QR Payment',
        `Pay $${payload.amount.toFixed(2)} to ${recipient} (${payload.note || 'QR Checkout'})?`
      );
      if (!approved) return;

      if (settings.biometricAuth) {
        const bioOk = await requestBiometricAuth(
          `Authorize $${payload.amount.toFixed(2)} QR payment to ${recipient}`
        );
        if (!bioOk) return;
      }

      const paid = await deductWallet(
        payload.amount,
        `${recipient} · ${payload.note || 'QR Payment'}`,
        'paypulse-wallet'
      );
      if (paid) {
        await nativeBridgeService.scheduleLocalNotification({
          title: 'Payment Sent via QR',
          body: `You paid $${payload.amount.toFixed(2)} to ${recipient}.`,
          delaySeconds: 1,
        });
      }
      return;
    }

    showToast(`Scanned QR: ${payload.rawValue}`, 'info');
  };

  const openQRScanner = (initialTab: 'scan' | 'receive' = 'scan'): Promise<QrScanPayload | null> => {
    hapticFeedback('light');
    return new Promise((resolve) => {
      setQrScannerState({
        initialTab,
        resolve: (payload) => {
          setQrScannerState(null);
          if (payload) {
            handleQrPayloadAction(payload);
          }
          resolve(payload);
        },
      });
    });
  };

  const sendLocalNotification = async (title: string, body: string, delaySeconds = 1) => {
    await nativeBridgeService.scheduleLocalNotification({
      title,
      body,
      delaySeconds,
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
    nativeBridgeService.triggerHaptics(pattern).catch(() => {});
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

    // Synchronize Native Capacitor StatusBar & theme-color meta tag
    nativeBridgeService
      .syncStatusBar({
        isDark,
        backgroundColor: themeTokens.bgBase,
        visible: settings.showStatusBar !== false,
      })
      .catch(() => {});

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

  // Dismiss native Capacitor splash screen & register Android hardware back button + deep links
  useEffect(() => {
    nativeBridgeService.hideSplashScreen().catch(() => {});

    const handleLocalNotificationBanner = (e: Event) => {
      const detail = (e as CustomEvent<{ title: string; body: string }>).detail;
      if (detail?.title) {
        showToast(`${detail.title}: ${detail.body}`, 'info');
        hapticFeedback('success');
      }
    };
    window.addEventListener('omnimini:local-notification', handleLocalNotificationBanner);

    const cleanupMobileListeners = nativeBridgeService.registerMobileLifecycleListeners({
      onHardwareBackButton: () => {
        if (qrScannerState) {
          setQrScannerState(null);
          return true;
        }
        if (biometricDialog) {
          biometricDialog.resolve(false);
          return true;
        }
        if (confirmDialog) {
          confirmDialog.resolve(false);
          return true;
        }
        if (activeMiniAppId) {
          closeMiniApp();
          return true;
        }
        if (currentTab !== 'home') {
          setCurrentTab('home');
          return true;
        }
        return false;
      },
      onDeepLink: (payload) => {
        handleQrPayloadAction(payload);
      },
    });

    return () => {
      window.removeEventListener('omnimini:local-notification', handleLocalNotificationBanner);
      cleanupMobileListeners();
    };
  }, [activeMiniAppId, currentTab, qrScannerState, biometricDialog, confirmDialog]);

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
        if (!prev) {
          if (!data.displayName?.trim()) return null;
          const created: SuperAppUser = {
            id: `usr-${Date.now()}`,
            name: data.displayName.trim(),
            email: `${data.displayName.trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@omnimini.app`,
            avatar: '',
            isGoogle: false,
            walletBalance: data.starterBalance || 0,
            role: data.role || 'consumer',
            joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          };
          localStorage.setItem('omnimini_user_v3', JSON.stringify(created));
          return created;
        }
        const next = {
          ...prev,
          name: data.displayName || prev.name,
          role: data.role || prev.role,
        };
        localStorage.setItem('omnimini_user_v3', JSON.stringify(next));
        return next;
      });
    }

    if (data.starterBalance && data.starterBalance > 0) {
      setWalletBalance((prev) => {
        const next = prev + data.starterBalance!;
        localStorage.setItem('omnimini_wallet_balance_v3', next.toString());
        return next;
      });
      const welcomeTx: WalletTransaction = {
        id: `tx-welcome-${Date.now()}`,
        appId: 'omnimini-system',
        appName: 'OmniMini Super App',
        amount: data.starterBalance,
        type: 'credit',
        description: 'Onboarding Wallet Deposit',
        timestamp: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setTransactions((prev) => {
        const next = [welcomeTx, ...prev];
        localStorage.setItem('omnimini_transactions_v3', JSON.stringify(next));
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

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      firestoreService
        .updateFullUserOnboarding(uid, {
          name: data.displayName?.trim() || user?.name || auth.currentUser.displayName || 'User',
          avatar: user?.avatar || auth.currentUser.photoURL || '',
          role: data.role === 'developer' ? 'developer' : 'consumer',
          walletBalance: (walletBalance || 0) + (data.starterBalance || 0),
          installedAppIds:
            data.installedAppIds && data.installedAppIds.length > 0
              ? data.installedAppIds
              : installedAppIds,
          recentAppIds,
        })
        .catch((e) => console.warn('Firestore onboarding sync failed:', e));
    }

    setIsSetupWizardOpen(false);
    showToast('🎉 Welcome to OmniMini! Personalization saved.', 'success');
    hapticFeedback('success');
  };

  // Listen to Firebase Auth state changes and attach Firestore listeners only when authenticated
  useEffect(() => {
    let unsubscribeTx: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeTx) {
        unsubscribeTx();
        unsubscribeTx = null;
      }

      if (!firebaseUser) {
        return;
      }

      try {
        const synced = await firestoreService.ensureUserProfile(
          firebaseUser,
          SUPER_APP_STARTER_CONFIG.preinstalledMiniAppIds
        );
        setUser(synced.user);
        setWalletBalance(synced.walletBalance);
        setInstalledAppIds(synced.installedAppIds);
        setRecentAppIds(synced.recentAppIds);

        unsubscribeTx = firestoreService.subscribeUserTransactions(firebaseUser.uid, (txs) => {
          setTransactions(txs);
          localStorage.setItem('omnimini_transactions_v3', JSON.stringify(txs));
        });
      } catch (e) {
        console.warn('Error hydrating Firebase user session:', e);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeTx) unsubscribeTx();
    };
  }, []);

  const syncOfflineQueue = async () => {
    const result = await runBackgroundIndexedDbSync('manual-sync');
    setPendingSyncCount(result.remainingCount);
    if (result.syncedCount > 0) {
      showToast(
        `Synced ${result.syncedCount} IndexedDB ${result.syncedCount === 1 ? 'mutation' : 'mutations'} to server`,
        'success'
      );
    }
  };

  useEffect(() => {
    const handleQueueUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ pendingCount: number }>).detail;
      if (typeof detail?.pendingCount === 'number') {
        setPendingSyncCount(detail.pendingCount);
      } else {
        setPendingSyncCount(offlineSyncService.getPendingCount());
      }
    };

    const handleSyncComplete = (e: Event) => {
      const result = (e as CustomEvent<BackgroundSyncResult>).detail;
      if (result) {
        setPendingSyncCount(result.remainingCount);
        if (result.syncedCount > 0 && result.trigger !== 'manual-sync') {
          showToast(
            `Background sync pushed ${result.syncedCount} IndexedDB ${result.syncedCount === 1 ? 'change' : 'changes'}`,
            'success'
          );
        }
      }
    };

    window.addEventListener('omnimini:idb-sync-updated', handleQueueUpdate);
    window.addEventListener('omnimini:background-sync-complete', handleSyncComplete);
    return () => {
      window.removeEventListener('omnimini:idb-sync-updated', handleQueueUpdate);
      window.removeEventListener('omnimini:background-sync-complete', handleSyncComplete);
    };
  }, []);

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
        creditWallet,
        syncSharedWalletBalance,
        topUpWallet,
        grantedPermissions,
        requestPermission,
        revokePermission,
        requestConfirm,
        requestBiometricAuth,
        openQRScanner,
        sendLocalNotification,
        toasts,
        showToast,
        hapticFeedback,
        availableApps,
        refreshApps,
        isOnline,
        pendingSyncCount,
        syncOfflineQueue,
        isSetupWizardOpen,
        openSetupWizard,
        closeSetupWizard,
        completeSetupWizard,
      }}
    >
      {children}

      {/* Native Biometric & Vault PIN Security Gate */}
      <BiometricPromptModal
        isOpen={!!biometricDialog}
        reason={biometricDialog?.reason || 'Authenticate with Biometrics'}
        themeTokens={themeTokens}
        onResolve={(verified) => biometricDialog?.resolve(verified)}
      />

      {/* Native Camera & QR Code Scanner / Receive QR Sheet */}
      <QRScannerModal
        isOpen={!!qrScannerState}
        initialTab={qrScannerState?.initialTab || 'scan'}
        userName={user?.name || 'OmniMini User'}
        walletBalance={walletBalance}
        themeTokens={themeTokens}
        onClose={() => qrScannerState?.resolve(null)}
        onScanComplete={(payload) => qrScannerState?.resolve(payload)}
      />

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
