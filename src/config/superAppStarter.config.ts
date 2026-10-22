import { MiniAppCategory, MiniAppPermission, SuperAppSettings } from '../types/miniapp';

/**
 * Super App Host Starter Configuration
 *
 * Customize this file when forking or initializing a new Super App platform
 * from the OmniMini Super App Starter Template.
 */
export interface SuperAppStarterConfig {
  /** Platform identity and branding */
  platform: {
    name: string;
    shortName: string;
    tagline: string;
    version: string;
    organization: string;
    supportEmail: string;
    deepLinkProtocol: string;
  };
  /** Default appearance & shell settings for first-time users */
  defaultSettings: Omit<SuperAppSettings, 'pluggableAppSettings'>;
  /** Initial shared wallet configuration */
  wallet: {
    currency: string;
    currencySymbol: string;
    starterBalance: number;
    minTopUp: number;
    maxTopUp: number;
  };
  /** Mini App IDs pre-installed on first launch */
  preinstalledMiniAppIds: string[];
  /** Allowed sandbox permissions & categories in the host registry */
  registry: {
    supportedCategories: MiniAppCategory[];
    supportedPermissions: MiniAppPermission[];
    enforceSandboxedStoragePrefix: string;
  };
}

export const SUPER_APP_STARTER_CONFIG: SuperAppStarterConfig = {
  platform: {
    name: 'OmniMini Super App',
    shortName: 'OmniMini',
    tagline: 'Modular Micro-Frontend Host & Mini App Runtime',
    version: '2.5.0',
    organization: 'OmniMini Platform Core',
    supportEmail: 'developers@omnimini.dev',
    deepLinkProtocol: 'omnimini://app/',
  },
  defaultSettings: {
    theme: 'dark',
    accentColor: 'blue',
    hapticsEnabled: true,
    soundEffects: true,
    biometricAuth: true,
    deviceBezel: false,
    showStatusBar: true,
    developerMode: true,
  },
  wallet: {
    currency: 'USD',
    currencySymbol: '$',
    starterBalance: 345.5,
    minTopUp: 10,
    maxTopUp: 2500,
  },
  preinstalledMiniAppIds: [
    'miniapp-starter-template',
    'fintrack-budget',
    'paypulse-wallet',
    'urbanride-transit',
    'foodbite-express',
    'fitsync-health',
    'noteflow-editor',
    'codecraft-scratchpad',
  ],
  registry: {
    supportedCategories: [
      'finance',
      'transport',
      'food',
      'health',
      'productivity',
      'utilities',
      'developer',
    ],
    supportedPermissions: [
      'camera',
      'location',
      'storage',
      'notifications',
      'biometrics',
      'auth',
      'clipboard',
    ],
    enforceSandboxedStoragePrefix: 'miniapp_store_',
  },
};
