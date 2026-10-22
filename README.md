# OmniMini (`omni-mini-mfe`) — Super App & Mini App Starter Package

![CI Build Status](https://img.shields.io/badge/build-passing-10b981?style=flat-square)
![NPM Package](https://img.shields.io/badge/npm-omni--mini--mfe%20v1.0.0-cb3837?style=flat-square)
![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-3b82f6?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-6366f1?style=flat-square)

A production-grade, mobile-first **Micro-Frontend Super App Starter Template**, **Mini App Starter Kit**, and **Node.js CLI Scaffolder (`omni-mini-mfe`)** built with React 19, TypeScript, Tailwind CSS v4, Express, and Workbox PWA.

---

## 1. CLI Scaffolding (`omni-mini-mfe`)

This repository is configured as the **`omni-mini-mfe`** Node package with executable CLI commands in `./bin/`:

### Create a New Super App Host Workspace
```bash
# Interactive mode
npm run omni-mini-mfe:create-super-app

# Or pass target directory & flags directly
npm run omni-mini-mfe:create-super-app -- my-super-app --name "Nova Super App" --accent indigo --currency USD --yes

# Or via npx / linked binary
npx omni-mini-mfe create-super-app my-super-app
```

### Create & Auto-Register a New Mini App
```bash
# Interactive mode
npm run omni-mini-mfe:create-mini-app

# Or pass Mini App flags directly (auto-registers into seedMiniApps.ts & MiniAppContainer.tsx)
npm run omni-mini-mfe:create-mini-app -- --id acme-loyalty --name "Acme Loyalty Club" --category finance --color "#6366f1" --permissions storage,auth --yes

# Or via npx / linked binary
npx omni-mini-mfe create-mini-app --id acme-loyalty --name "Acme Loyalty Club"
```

---

## 2. Using This Repo as a Super App Starter Template

Customize your Super App host brand, default theme, shared wallet currency, pre-installed mini apps, and sandboxed permissions in **`src/config/superAppStarter.config.ts`**:

```ts
export const SUPER_APP_STARTER_CONFIG: SuperAppStarterConfig = {
  platform: {
    name: 'OmniMini Super App',
    shortName: 'OmniMini',
    deepLinkProtocol: 'omnimini://app/',
  },
  defaultSettings: {
    theme: 'dark',
    accentColor: 'blue',
    deviceBezel: false,
    showStatusBar: true,
    developerMode: true,
  },
  wallet: {
    currency: 'USD',
    starterBalance: 345.5,
  },
  preinstalledMiniAppIds: [
    'miniapp-starter-template',
    'paypulse-wallet',
    // ...
  ],
};
```

### Architecture & Directory Structure

```text
├── bin/
│   ├── omni-mini-mfe.mjs               # Main Node.js CLI scaffolder
│   ├── create-super-app.mjs            # Super App generator binary
│   └── create-mini-app.mjs             # Mini App generator & auto-wiring binary
├── src/
│   ├── config/
│   │   └── superAppStarter.config.ts   # Super App Host Starter configuration
│   ├── templates/
│   │   └── miniAppStarter/             # Official Mini App Starter Template
│   │       ├── manifest.ts             # Reference MiniAppManifest & pluggable settings
│   │       ├── StarterMiniApp.tsx      # Reference Mini App using all Bridge SDK APIs
│   │       └── index.ts                # Barrel exports & code generator
│   ├── sdk/
│   │   └── createMiniAppSDK.ts         # Sandboxed Host-to-MiniApp Bridge SDK
│   ├── context/
│   │   └── SuperAppContext.tsx         # Shared Auth, Wallet, Permissions, Recent History
│   ├── miniapps/
│   │   └── MiniAppContainer.tsx        # Sandboxed Mini App Runtime & Theme Controller
│   └── pages/
│       ├── HomePage.tsx                # iOS Springboard & Installed Mini Apps
│       ├── StorePage.tsx               # App Store, Category Bar, QR Scanner & Reviews
│       ├── WalletPage.tsx              # Unified Super App Wallet & Ledger
│       ├── DeveloperPage.tsx           # Developer Console, Starter Kit Generator & Docs
│       └── SettingsPage.tsx            # Host & Pluggable Mini App Settings
```

---

## 3. Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start full-stack dev server on port 3000
npm run dev

# 3. Type-check & build for production
npm run lint
npm run build
```
