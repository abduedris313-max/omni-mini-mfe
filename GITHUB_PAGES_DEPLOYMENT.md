# GitHub Pages Deployment & Firebase Auth Guide (`omni-mini-mfe`)

This guide explains how OmniMini resolves all **404 Not Found** errors (for `/src/main.tsx`, PWA icons, SPA sub-routes, and `/api/*` backend endpoints) and **403 Forbidden / Mixed Content** errors when hosted on GitHub Pages (`https://abduedris313-max.github.io/omni-mini-mfe/`).

---

## 1. One-Command Deployment Script

Run the automated GitHub Pages deployment script from the repository root:

```bash
# 1. Build, generate icons, configure SPA redirects, static /api/* routes & verify all assets:
npm run deploy:gh-pages

# 2. (Optional) Push the verified ./dist folder directly to the remote `gh-pages` branch:
npm run deploy:gh-pages -- --push
```

### What `npm run deploy:gh-pages` (`scripts/deploy-gh-pages.mjs`) Does
1. **Generates Multi-Resolution Icons (`scripts/generate-icons.js`)**:
   - Generates all 17 PNG resolutions (`16x16` through `1024x1024`), 4 maskable icons, `favicon.ico`, `icon.svg`, and `manifest.json` in `public/` **and** mirrors them to the repository root (`/`) so direct branch hosting never 404s on `./icon.svg`, `./favicon-32x32.png`, or `./pwa-192x192.png`.
2. **Compiles Vite Production Bundle (`GITHUB_PAGES_BASE=./`)**:
   - Emits relative asset paths (`./assets/...`) inside `dist/index.html` and `dist/manifest.webmanifest` so the app works under any repository subpath (`/omni-mini-mfe/`).
3. **Configures Redirects & Static API Endpoints (`scripts/prepare-gh-pages.mjs`)**:
   - **`dist/404.html` & `/404.html`**: Intercepts deep-link refreshes (e.g. `/omni-mini-mfe/store`) and redirects to `/omni-mini-mfe/?p=/store`, which `index.html` immediately restores via `history.replaceState` so relative assets always resolve from `/omni-mini-mfe/`.
   - **Trailing-Slash Normalizer (`index.html`)**: Automatically redirects `https://abduedris313-max.github.io/omni-mini-mfe` (without trailing slash) to `/omni-mini-mfe/` before relative assets load.
   - **Static Edge API (`src/lib/staticApiRouter.ts` + `dist/api/*`)**: Intercepts all `/api/miniapps`, `/api/developer/analytics`, `/api/auth/google`, and `/api/health` calls in memory **and** writes static JSON files under `dist/api/` so GitHub Pages never returns `404 (Not Found)` on `/api/*`.
   - **Deterministic Root Bundle Aliases (`dist/assets/omnimini-bundle.js` & `.css`)**: If GitHub Pages is set to serve the raw branch root (`/`) instead of `gh-pages` or GitHub Actions, `index.html` automatically loads `./dist/assets/omnimini-bundle.js` instead of `/src/main.tsx`.

---

## 2. Recommended GitHub Repository Settings

In your GitHub repository (`abduedris313-max/omni-mini-mfe`):

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose either:
   - **Option A (Recommended)**: **GitHub Actions** — `.github/workflows/deploy-gh-pages.yml` automatically builds `./dist` and deploys on every push to `main` or `prod`.
   - **Option B**: **Deploy from a branch** → select branch **`gh-pages`** and folder **`/ (root)`**.

---

## 3. Resolving Firebase 403 Forbidden & Enabling Auth Providers

### Why the 403 Forbidden & OpenDNS Mixed Content Errors Happened
1. **Unauthorized Domain (`403 Forbidden` on `/__/auth/iframe`)**:
   - Firebase Auth's `getAuth()` or `popupRedirectResolver` injects `<iframe src="https://device-streaming-cb1b795c.firebaseapp.com/__/auth/iframe?parent=https://abduedris313-max.github.io">` on startup. If `abduedris313-max.github.io` is not listed in Firebase Console's **Authorized domains**, Google's server rejects the iframe with `403 Forbidden`.
2. **OpenDNS Network Filter (`Mixed Content: http://...id.opendns.com/s/block.opendns.com`)**:
   - When OpenDNS blocks `*.firebaseapp.com`, it redirects the HTTPS iframe to an insecure `http://` block page.
3. **Code Fix Applied (`src/lib/firebase.ts` & `src/services/authService.ts`)**:
   - Firebase Auth is now initialized via `initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence] })` **without** a boot-time `popupRedirectResolver`, and `installAuthIframeGuard()` prevents hidden `/__/auth/iframe` injections on static hosts.
   - **Email/Password**, **Phone Number (6-Digit OTP)**, and **Google Sign-In** automatically use Firebase REST/Popup when supported and seamlessly fall back to the SHA-256 **OmniMini Identity Vault** when offline or when `*.firebaseapp.com` is blocked.

### Firebase Console Checklist (Project `device-streaming-cb1b795c`)
To enable live cloud synchronization for all 3 sign-in methods on GitHub Pages:
1. Open [Firebase Console](https://console.firebase.google.com/project/device-streaming-cb1b795c/authentication/providers).
2. Under **Authentication → Sign-in method**:
   - Enable **Google**.
   - Enable **Email/Password**.
   - Enable **Phone**.
3. Under **Authentication → Settings → Authorized domains**:
   - Click **Add domain** and enter: `abduedris313-max.github.io`
4. (Optional) If your Google Cloud API Key (`AIzaSy...`) has **HTTP referrer restrictions** enabled in [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), add:
   - `https://abduedris313-max.github.io/*`
   - `https://*.run.app/*`
   - `http://localhost:3000/*`
