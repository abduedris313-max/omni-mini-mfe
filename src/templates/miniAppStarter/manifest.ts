import { MiniAppManifest } from '../../types/miniapp';

/**
 * Mini App Starter Template — Manifest Definition
 *
 * Copy this directory (`src/templates/miniAppStarter`) to create a new Mini App.
 * 1. Customize `id`, `name`, `shortName`, `category`, and `iconBg` below.
 * 2. Declare required `permissions` and `pluggableSettingsSchema`.
 * 3. Build your UI inside `StarterMiniApp.tsx` using the `MiniAppBridgeSDK` prop.
 */
export const STARTER_MINI_APP_MANIFEST: MiniAppManifest = {
  id: 'miniapp-starter-template',
  name: 'Mini App Starter Kit',
  shortName: 'StarterKit',
  version: '1.0.0',
  category: 'developer',
  icon: 'Boxes',
  iconBg: '#6366f1',
  gradient: 'from-indigo-500 to-violet-600',
  summary: 'Official boilerplate template demonstrating Auth, Wallet, Storage, Theme & Pluggable Settings SDKs',
  description:
    'A production-ready Mini App Starter Template for OmniMini. Use this interactive reference implementation as a blueprint to build and ship new micro-frontend mini apps with zero boilerplate setup.',
  author: {
    name: 'OmniMini SDK Team',
    email: 'sdk@omnimini.dev',
    verified: true,
    org: 'OmniMini Platform Core',
  },
  rating: 5.0,
  reviewCount: 412,
  downloadCount: 9850,
  sizeKb: 64,
  permissions: ['storage', 'auth', 'notifications', 'biometrics'],
  status: 'published',
  isBuiltin: true,
  releaseNotes: 'Added Biometric Secure Login vault and onStart/onPause lifecycle listener telemetry.',
  updatedAt: '2026-10-18',
  screenshots: [
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
  ],
  pluggableSettingsSchema: [
    {
      id: 'welcomeBannerText',
      label: 'Custom Greeting Title',
      description: 'Headline rendered inside the Starter Mini App header card',
      type: 'text',
      defaultValue: 'Build Fast with OmniMini SDK',
    },
    {
      id: 'enableDebugBanner',
      label: 'Show Bridge Telemetry Footer',
      description: 'Display live SDK state tokens at the bottom of the mini app',
      type: 'switch',
      defaultValue: true,
    },
    {
      id: 'sampleCheckoutAmount',
      label: 'Demo Checkout Price ($)',
      description: 'Amount charged when testing the shared Super App Wallet API',
      type: 'slider',
      min: 1,
      max: 50,
      step: 1,
      defaultValue: 5,
    },
  ],
  entrypoint: 'StarterMiniApp',
};
