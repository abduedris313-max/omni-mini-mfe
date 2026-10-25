import { MiniAppThemeAPI } from '../theme/types';

export type MiniAppCategory =
  | 'finance'
  | 'transport'
  | 'food'
  | 'health'
  | 'productivity'
  | 'utilities'
  | 'developer';

export type MiniAppPermission =
  | 'camera'
  | 'location'
  | 'storage'
  | 'notifications'
  | 'biometrics'
  | 'auth'
  | 'clipboard';

export interface MiniAppSettingField {
  id: string;
  label: string;
  description: string;
  type: 'switch' | 'select' | 'text' | 'number' | 'slider';
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue: any;
}

export interface MiniAppManifest {
  id: string;
  name: string;
  shortName: string;
  version: string;
  category: MiniAppCategory;
  icon: string; // Lucide icon identifier or SVG
  iconBg: string;
  gradient: string;
  summary: string;
  description: string;
  author: {
    name: string;
    email: string;
    verified: boolean;
    org?: string;
  };
  rating: number;
  reviewCount: number;
  downloadCount: number;
  sizeKb: number;
  permissions: MiniAppPermission[];
  status: 'published' | 'draft' | 'under_review' | 'deprecated';
  pluggableSettingsSchema: MiniAppSettingField[];
  entrypoint: string;
  screenshots: string[];
  releaseNotes: string;
  updatedAt: string;
  isBuiltin?: boolean;
}

export interface MiniAppReview {
  id: string;
  appId: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
}

export interface SuperAppUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  phoneNumber?: string;
  authProvider?: 'google' | 'password' | 'phone';
  avatar: string;
  isGoogle: boolean;
  walletBalance: number;
  role: 'consumer' | 'developer' | 'admin';
  joinedDate: string;
}

export interface SuperAppSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet';
  hapticsEnabled: boolean;
  soundEffects: boolean;
  biometricAuth: boolean;
  deviceBezel: boolean;
  showStatusBar: boolean;
  developerMode: boolean;
  pluggableAppSettings: Record<string, Record<string, any>>;
}

export interface MiniAppBridgeSDK {
  auth: {
    getUser: () => SuperAppUser | null;
    requestAuth: () => Promise<SuperAppUser>;
  };
  theme: MiniAppThemeAPI;
  storage: {
    getItem: (key: string) => any;
    setItem: (key: string, val: any) => void;
    removeItem: (key: string) => void;
  };
  settings: {
    getSettings: () => Record<string, any>;
    updateSetting: (key: string, value: any) => void;
    registerSchema: (schema: MiniAppSettingField[]) => void;
  };
  navigation: {
    closeMiniApp: () => void;
    setHeaderTitle: (title: string) => void;
    openMiniApp: (appId: string) => void;
  };
  ui: {
    showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    hapticFeedback: (pattern?: 'light' | 'medium' | 'heavy' | 'success') => void;
    requestConfirm: (title: string, message: string) => Promise<boolean>;
  };
  payment: {
    getBalance: () => number;
    pay: (amount: number, description: string) => Promise<{ success: boolean; txId?: string; error?: string }>;
    credit: (amount: number, description: string) => Promise<{ success: boolean; txId?: string; error?: string }>;
    syncSharedBalance: (
      newBalance: number,
      description?: string
    ) => Promise<{ success: boolean; txId?: string; previousBalance: number; syncedBalance: number }>;
  };
  device: {
    hasPermission: (perm: MiniAppPermission) => boolean;
    requestPermission: (perm: MiniAppPermission) => Promise<boolean>;
    getPlatformInfo: () => {
      platform: 'android' | 'ios' | 'web';
      isNative: boolean;
      isStandalonePWA: boolean;
    };
    authenticateBiometrics: (reason?: string) => Promise<boolean>;
    scanQRCode: () => Promise<{
      rawValue: string;
      type: 'payment' | 'miniapp' | 'url' | 'text';
      recipient?: string;
      amount?: number;
      currency?: string;
      note?: string;
      miniAppId?: string;
    } | null>;
    capturePhoto: () => Promise<{ dataUrl: string; format: string } | null>;
    share: (options: { title: string; text: string; url?: string }) => Promise<boolean>;
    scheduleNotification: (options: {
      title: string;
      body: string;
      delaySeconds?: number;
    }) => Promise<boolean>;
    secureStorage: {
      getItem: (key: string) => Promise<string | null>;
      setItem: (key: string, val: string) => Promise<void>;
      removeItem: (key: string) => Promise<void>;
    };
  };
  onStart: (callback: () => void) => () => void;
  onPause: (callback: () => void) => () => void;
  lifecycle: {
    onStart: (callback: () => void) => () => void;
    onPause: (callback: () => void) => () => void;
    triggerStart: () => void;
    triggerPause: () => void;
  };
}

export type NavigationTab = 'home' | 'store' | 'developer' | 'wallet' | 'settings';
