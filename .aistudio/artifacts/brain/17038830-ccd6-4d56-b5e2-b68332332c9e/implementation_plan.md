# OmniMini Super App — Android Mobile App (Capacitor APK/AAB) Conversion Plan

## 1. Architectural Overview

We will convert the **OmniMini Micro-Frontend Super App** into a native **Android mobile application (APK & AAB)** powered by **Capacitor** while preserving full PWA offline capabilities and a **full-screen native mobile shell with an optional bezel toggle**.

### Core Pillars
1. **Capacitor Android Runtime & Packaging (`capacitor.config.ts`)**:
   - Configure Capacitor (`com.omnimini.superapp`) targeting Android APK and Play Store AAB bundles alongside the existing Vite build output (`dist/`).
   - Provide automated npm scripts (`cap:sync`, `cap:android`, `android:apk`, `android:aab`) and a GitHub Actions workflow (`.github/workflows/android-build.yml`) that compiles the web bundle, syncs Capacitor Android, and builds signed/debug APK & AAB artifacts.
2. **Unified Native Mobile Bridge (`src/services/nativeBridgeService.ts`)**:
   - A modular, dependency-injected hardware abstraction layer that detects whether the app is running inside the **Capacitor Android native runtime** or a **Standalone Mobile Web/PWA** environment, seamlessly invoking Capacitor plugins with graceful Web API fallbacks:
     - **Native Haptics, Status Bar & Splash Screen**: `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen` (synced with SuperApp dark/light theme tokens and immersive status bar toggle).
     - **Biometric Authentication & Secure Native Storage**: WebAuthn / Android BiometricPrompt bridge + encrypted/prefixed native key-value vault (`@capacitor/preferences`) for sensitive wallet PINs, biometric gates, and auth tokens.
     - **Camera & QR Code Scanner for Wallet Payments**: `@capacitor/camera` + live camera stream / QR payload parser modal (`QRScannerModal.tsx`) for instant P2P wallet transfers, merchant checkout, and `omnimini://pay` deep links.
     - **Local & Push Notifications**: `@capacitor/local-notifications` + Web Notification API bridge for FinTrack scheduled transactions, loan due alerts, and SuperApp wallet events.
     - **Native Share Sheet & Deep Linking**: `@capacitor/share` + `@capacitor/app` URL listener (`omnimini://app/<miniAppId>` and `omnimini://pay?...`) to deep-link directly into mini-apps or payment flows and handle the Android hardware back button (`backButton` listener).
3. **Full-Screen Native Mobile Shell with Optional Bezel Toggle**:
   - Update `IOSDeviceFrame.tsx` and global CSS (`src/index.css`) to render a **full-screen edge-to-edge mobile shell** (`100dvh`, `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, native touch momentum, overscroll containment, and swipe-back / pull-down gestures) by default when `deviceBezel` is off, while retaining the toggleable phone chassis bezel in Settings for desktop inspection.
   - Bind Android hardware back button navigation: if a Mini App or modal is open, pressing the Android back button closes the Mini App/modal instead of exiting the host app.

---

## 2. Planned File Changes & Additions

### A. Capacitor Configuration & Android Build Pipeline
- **`package.json`**:
  - Add Capacitor core & official plugins (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/app`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/preferences`, `@capacitor/local-notifications`, `@capacitor/share`, `@capacitor/camera`).
  - Add mobile build scripts:
    - `"mobile:build": "vite build && npx cap sync android"`
    - `"android:apk": "vite build && npx cap sync android && cd android && ./gradlew assembleDebug"`
    - `"android:aab": "vite build && npx cap sync android && cd android && ./gradlew bundleRelease"`
- **`capacitor.config.ts`** *(New)*:
  - Configure `appId: 'com.omnimini.superapp'`, `appName: 'OmniMini'`, `webDir: 'dist'`, Android deep-link scheme (`omnimini`), SplashScreen configuration, and StatusBar styling.
- **`.github/workflows/android-build.yml`** *(New)*:
  - CI/CD pipeline that installs dependencies, builds the Vite bundle, initializes/syncs the Android Capacitor platform, builds the downloadable Android `.apk` and `.aab` artifacts with Java 21 + Android SDK, and uploads them as workflow artifacts.

### B. Native Hardware Bridge & MiniApp SDK Extensions
- **`src/services/nativeBridgeService.ts`** *(New)*:
  - Singleton service with strict TypeScript interfaces and JSDoc annotations providing:
    - `isNativePlatform()` & `getPlatformInfo()` (`android` | `ios` | `web`, Capacitor runtime status)
    - `triggerHaptics(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error')`
    - `syncStatusBar(isDark: boolean, backgroundColor: string, visible: boolean)`
    - `hideSplashScreen()`
    - `authenticateBiometrics(reason: string): Promise<{ verified: boolean; method: string }>`
    - `secureStorage: { get(key), set(key, value), remove(key) }`
    - `scanQrCode(): Promise<QrScanResult | null>` & `capturePhoto()`
    - `scheduleLocalNotification(options: { title: string; body: string; id?: number; scheduleAt?: Date; extra?: Record<string, any> })`
    - `shareContent(options: { title: string; text: string; url?: string })`
    - `registerDeepLinkHandler(onOpenMiniApp, onPaymentLink)` & `registerHardwareBackButton(handler)`
- **`src/types/miniapp.ts` & `src/sdk/createMiniAppSDK.ts`**:
  - Extend `MiniAppBridgeSDK.device` and `MiniAppBridgeSDK.ui` so every Mini App can invoke:
    - `sdk.device.authenticateBiometrics(reason)`
    - `sdk.device.scanQRCode()`
    - `sdk.device.capturePhoto()`
    - `sdk.device.share({ title, text, url })`
    - `sdk.device.scheduleNotification({ title, body, delaySeconds })`
    - `sdk.device.secureStorage.{getItem, setItem, removeItem}`

### C. Native Mobile UI Components & Wallet / Settings Enhancements
- **`src/components/QRScannerModal.tsx`** *(New)*:
  - Interactive Camera & QR Scanner sheet supporting live camera viewfinder (`navigator.mediaDevices.getUserMedia` / `@capacitor/camera`), simulated instant QR presets (Merchant Payment QR, P2P Transfer QR, MiniApp Deep Link QR), and custom QR payload generation so users can both scan to pay and display their own Wallet Receive QR code.
- **`src/components/BiometricPromptModal.tsx`** *(New)*:
  - Native-style Biometric Authentication & PIN fallback sheet triggered before high-value wallet transfers, viewing sensitive tokens, or when `biometricAuth` is enabled.
- **`src/pages/WalletPage.tsx`**:
  - Add **"Scan & Pay (QR)"**, **"My Receive QR"**, **"Share Payment Link"** (via native share sheet), and **Biometric Gate** on wallet top-ups/transfers, plus native local notification receipts on completed transactions.
- **`src/components/IOSDeviceFrame.tsx` & `src/index.css`**:
  - Upgrade the default `deviceBezel: false` mode to a true full-bleed mobile viewport (`min-h-[100dvh]`, safe-area padding, native status bar color sync via `@capacitor/status-bar` and `<meta name="theme-color">`, edge-swipe gesture support) while keeping the optional bezel toggle for desktop previewing.
- **`src/pages/SettingsPage.tsx`**:
  - Add a **"Mobile App & Native Bridge (Android APK / Capacitor)"** section allowing users to:
    - Inspect live native bridge status (Platform, Biometrics, Camera, Notifications, Deep Links, Secure Storage).
    - Test native hardware capabilities interactively (Test Biometric Auth, Test Local Push Notification, Open QR Scanner, Share App Link, Toggle Full-Screen vs. Device Bezel).
    - View one-click Android APK / AAB build commands & download instructions.
- **`README.md`**:
  - Update architecture documentation, Capacitor Android APK/AAB build guide, and GitHub Actions status badges.

---

## 3. Verification & Quality Assurance
1. Run `lint_applet` and `compile_applet` to verify zero TypeScript or Vite bundling errors.
2. Verify that all native plugins degrade gracefully in the browser preview on port 3000 while functioning natively inside Capacitor Android WebView.
