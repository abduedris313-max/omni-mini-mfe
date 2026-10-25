# OmniMini (`omni-mini-mfe`) — Super App & Mini App Starter Package

![CI Build Status](https://img.shields.io/badge/build-passing-10b981?style=flat-square)
![Android APK & AAB](https://img.shields.io/badge/Android-Capacitor%20APK%20%26%20AAB-3ddc84?style=flat-square&logo=android)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Deployed-2563eb?style=flat-square&logo=github)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-f59e0b?style=flat-square&logo=firebase)
![NPM Package](https://img.shields.io/badge/npm-omni--mini--mfe%20v1.0.0-cb3837?style=flat-square)
![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-3b82f6?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-6366f1?style=flat-square)

A production-grade, mobile-first **Micro-Frontend Super App Starter Template**, **Capacitor Android Mobile App (`com.omnimini.superapp`)**, **Mini App Starter Kit**, and **Node.js CLI Scaffolder (`omni-mini-mfe`)** built with React 19, TypeScript, Tailwind CSS v4, Capacitor 8, Firebase Auth & Cloud Firestore, Express, and Workbox PWA.

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

## 2. Native Android Mobile App Packaging (Capacitor APK & AAB)

OmniMini is configured with **Capacitor 8** (`capacitor.config.ts`) to compile into a native **Android APK** and **Google Play Store AAB** with hardware bridge plugins (`@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/preferences`, `@capacitor/local-notifications`, `@capacitor/share`, `@capacitor/camera`, `@capacitor/app`).

### Local Android Build Commands
```bash
# 1. Build web bundle and sync with Capacitor Android
npm run mobile:build

# 2. Build installable Android Debug APK (outputs to android/app/build/outputs/apk/debug/)
npm run android:apk

# 3. Build Google Play Store Release AAB (outputs to android/app/build/outputs/bundle/release/)
npm run android:aab

# 4. Open native Android project in Android Studio
npm run cap:open:android
```

### Automated GitHub Actions Android APK & AAB Pipeline
Every push to `main` (or manual dispatch in **Actions → Build Android APK & AAB**) runs `.github/workflows/android-build.yml`, which sets up JDK 21 and the Android SDK, syncs Capacitor, compiles the `.apk` and `.aab` binaries, and uploads them as downloadable workflow artifacts.

### Native Mobile Hardware Bridge (`src/services/nativeBridgeService.ts`)
All installed Mini Apps can access hardware capabilities via `sdk.device`:
- `sdk.device.authenticateBiometrics(reason)` — Hardware Biometric / Passkey & Secure Vault PIN gate.
- `sdk.device.scanQRCode()` — Camera viewfinder & `omnimini://pay` / `omnimini://app/<id>` QR scanner.
- `sdk.device.capturePhoto()` — Native Capacitor Camera capture.
- `sdk.device.scheduleNotification({ title, body, delaySeconds })` — Native Android Local Notifications.
- `sdk.device.share({ title, text, url })` — Native OS Share Sheet.
- `sdk.device.secureStorage` — Encrypted/encoded key-value storage via `@capacitor/preferences`.

---

## 3. Using This Repo as a Super App Starter Template

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
    starterBalance: 0,
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
├── .github/workflows/
│   ├── ci.yml                          # PR quality, TypeScript & Firestore rules gate
│   ├── deploy-gh-pages.yml             # Automated GitHub Pages SPA + PWA deployment
│   └── android-build.yml               # Automated Capacitor Android APK & AAB build pipeline
├── capacitor.config.ts                 # Capacitor Native Android/iOS runtime configuration
├── bin/
│   ├── omni-mini-mfe.mjs               # Main Node.js CLI scaffolder
│   ├── create-super-app.mjs            # Super App generator binary
│   └── create-mini-app.mjs             # Mini App generator & auto-wiring binary
├── scripts/
│   └── prepare-gh-pages.mjs            # Generates dist/404.html & dist/.nojekyll
├── src/
│   ├── config/
│   │   └── superAppStarter.config.ts   # Super App Host Starter configuration
│   ├── lib/
│   │   └── firebase.ts                 # Firebase Auth & Cloud Firestore initialization
│   ├── services/
│   │   ├── nativeBridgeService.ts      # Capacitor Native Hardware & Deep-Link Bridge
│   │   ├── firestoreService.ts         # Validated Firestore CRUD & real-time sync
│   │   └── repositoryService.ts        # Hybrid Firestore + local offline Mini App registry
│   ├── components/
│   │   ├── BiometricPromptModal.tsx    # Biometric & Secure Vault PIN Authentication Gate
│   │   ├── QRScannerModal.tsx          # Live Camera QR Scanner & Wallet Receive QR Sheet
│   │   └── IOSDeviceFrame.tsx          # Full-screen Mobile Shell with optional bezel toggle
│   ├── sdk/
│   │   └── createMiniAppSDK.ts         # Sandboxed Host-to-MiniApp Bridge SDK
│   ├── context/
│   │   └── SuperAppContext.tsx         # Shared Auth, Wallet, Permissions, Recent History
│   ├── miniapps/
│   │   └── MiniAppContainer.tsx        # Sandboxed Mini App Runtime & Theme Controller
│   └── pages/
│       ├── HomePage.tsx                # Mobile Springboard & Installed Mini Apps
│       ├── StorePage.tsx               # App Store, Category Bar, QR Scanner & Reviews
│       ├── WalletPage.tsx              # Unified Super App Wallet, QR Pay & Ledger
│       ├── DeveloperPage.tsx           # Developer Console, Starter Kit Generator & Docs
│       └── SettingsPage.tsx            # Host, Native Bridge & Pluggable Mini App Settings
```

---

## 4. Local Development, GitHub Pages Deployment & Firebase Auth Setup

```bash
# 1. Install dependencies
npm install

# 2. Start full-stack dev server on port 3000
npm run dev

# 3. Type-check, audit Firestore rules & build for production
npm run lint
npm run lint:rules
npm run build

# 4. Run full GitHub Pages build, redirect generation & asset verification
npm run deploy:gh-pages

# 5. (Optional) Build and push ./dist directly to origin/gh-pages branch
npm run deploy:gh-pages -- --push
```

### Enable GitHub Pages & Firebase Providers
See **[GITHUB_PAGES_DEPLOYMENT.md](./GITHUB_PAGES_DEPLOYMENT.md)** for the complete architecture of:
- **Subpath Trailing-Slash & SPA `404.html` Redirects** (`scripts/prepare-gh-pages.mjs` & `index.html`)
- **Static Edge API Router** (`src/lib/staticApiRouter.ts` & `dist/api/*`) eliminating `/api/miniapps` 404 errors on static hosts
- **Multi-Provider Firebase Auth** (Google, Username/Password, and Phone SMS OTP) with automatic `/__/auth/iframe` 403 Forbidden & OpenDNS Mixed-Content protection



