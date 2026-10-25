import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  disableNetwork,
  setLogLevel,
  Firestore,
} from 'firebase/firestore';
import rawAppletConfig from '../../firebase-applet-config.json';
import { installStaticApiInterceptor, safeApiFetch } from './staticApiRouter';

export { safeApiFetch };

// Silence verbose Firestore WebChannel timeout logs when operating in offline / DNS-restricted environments
try {
  setLogLevel('silent');
} catch {
  // ignore
}

/**
 * Detects whether the application is running on a static host (e.g. GitHub Pages `*.github.io`),
 * file protocol, or native Capacitor WebView where the Express `/api/*` server is not running.
 */
export function isStaticHostEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host.endsWith('.github.io') ||
    host.endsWith('.pages.dev') ||
    window.location.protocol === 'file:' ||
    window.location.protocol === 'capacitor:'
  );
}

/**
 * Checks whether the current browser origin supports Firebase Auth's cross-origin
 * `/__/auth/iframe` & popup flow without triggering a 403 Forbidden or OpenDNS block.
 *
 * By default, AI Studio Cloud Run (`*.run.app`), Firebase Hosting (`*.firebaseapp.com`, `*.web.app`),
 * and local development (`localhost`, `127.0.0.1`) are pre-authorized in Firebase Auth.
 * On `*.github.io`, popup auth can be enabled by adding `<username>.github.io` to
 * Firebase Console -> Authentication -> Settings -> Authorized domains and setting
 * `localStorage.setItem('omnimini_enable_github_firebase_popup', 'true')` or `VITE_FIREBASE_ALLOW_POPUP_ON_GITHUB=true`.
 */
export function isPopupAuthSupportedOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const protocol = window.location.protocol;
  if (protocol !== 'https:' && protocol !== 'http:') return false;

  const host = window.location.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app') ||
    host.endsWith('.firebaseapp.com') ||
    host.endsWith('.web.app')
  ) {
    return true;
  }

  // On GitHub Pages or custom domains, check if user explicitly enabled live popup auth
  try {
    if (
      import.meta.env.VITE_FIREBASE_ALLOW_POPUP_ON_GITHUB === 'true' ||
      localStorage.getItem('omnimini_enable_github_firebase_popup') === 'true'
    ) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Resolves an API path relative to the active Vite base path (`import.meta.env.BASE_URL`),
 * preventing root `/api/...` 404 errors when deployed under a GitHub Pages repository subpath
 * like `https://<username>.github.io/omni-mini-mfe/`.
 */
export function getResolvedApiPath(endpoint: string): string {
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const baseUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './';
  if (baseUrl === '/' || baseUrl === './') {
    return `./${cleanEndpoint}`;
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${cleanEndpoint}`;
}

/**
 * Prevents Firebase Auth from injecting the hidden cross-origin `<iframe src="https://.../__/auth/iframe">`
 * on static hosts where the domain is not yet allowlisted in Firebase Console or where OpenDNS
 * intercepts `*.firebaseapp.com` with an insecure HTTP block page (causing 403 Forbidden & Mixed Content errors).
 */
function installAuthIframeGuard(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (isPopupAuthSupportedOrigin()) return;

  const sanitizeAuthIframe = (node: Node): Node => {
    if (
      node instanceof HTMLIFrameElement &&
      typeof node.src === 'string' &&
      (node.src.includes('/__/auth/iframe') || node.src.includes('firebaseapp.com/__/auth'))
    ) {
      node.src = 'about:blank';
      node.setAttribute('data-omnimini-guarded-iframe', 'true');
    }
    return node;
  };

  try {
    const origAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function <T extends Node>(newChild: T): T {
      sanitizeAuthIframe(newChild);
      return origAppendChild.call(this, newChild) as T;
    };

    const origInsertBefore = Element.prototype.insertBefore;
    Element.prototype.insertBefore = function <T extends Node>(
      newChild: T,
      refChild: Node | null
    ): T {
      sanitizeAuthIframe(newChild);
      return origInsertBefore.call(this, newChild, refChild) as T;
    };
  } catch {
    // Ignore if prototype methods are non-writable in current runtime
  }
}

// Install static API router & auth iframe guard before initializing Firebase
installStaticApiInterceptor(isStaticHostEnvironment());
installAuthIframeGuard();

const env = (typeof import.meta !== 'undefined' && import.meta.env) || ({} as Record<string, string>);

function pickConfigValue(envVal: string | undefined, fallbackVal: string): string {
  const trimmed = (envVal || '').trim();
  if (!trimmed || trimmed.startsWith('MY_') || trimmed === 'undefined') {
    return fallbackVal;
  }
  return trimmed;
}

export const firebaseConfig = {
  projectId: pickConfigValue(env.VITE_FIREBASE_PROJECT_ID, rawAppletConfig.projectId),
  appId: pickConfigValue(env.VITE_FIREBASE_APP_ID, rawAppletConfig.appId),
  apiKey: pickConfigValue(env.VITE_FIREBASE_API_KEY, rawAppletConfig.apiKey),
  authDomain: pickConfigValue(env.VITE_FIREBASE_AUTH_DOMAIN, rawAppletConfig.authDomain),
  firestoreDatabaseId: pickConfigValue(
    env.VITE_FIREBASE_DATABASE_ID,
    rawAppletConfig.firestoreDatabaseId
  ),
  storageBucket: pickConfigValue(
    env.VITE_FIREBASE_STORAGE_BUCKET,
    rawAppletConfig.storageBucket
  ),
  messagingSenderId: pickConfigValue(
    env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    rawAppletConfig.messagingSenderId
  ),
  measurementId: pickConfigValue(
    env.VITE_FIREBASE_MEASUREMENT_ID,
    rawAppletConfig.measurementId || ''
  ),
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createOfflineReadyFirestore(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

function createAuthInstance(): Auth {
  try {
    // Using initializeAuth with explicit local/in-memory persistence and WITHOUT a startup
    // popupRedirectResolver prevents Firebase from injecting `<iframe src="https://<authDomain>/__/auth/iframe">`
    // on page load, eliminating 403 Forbidden and OpenDNS Mixed Content errors on static hosts.
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        inMemoryPersistence,
      ],
    });
  } catch {
    return getAuth(app);
  }
}

export const db = createOfflineReadyFirestore();
export const auth = createAuthInstance();
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export { browserPopupRedirectResolver };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  if (!isStaticHostEnvironment()) {
    console.warn('Firestore Error: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (isStaticHostEnvironment() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    await disableNetwork(db).catch(() => {});
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      // Switch cleanly to IndexedDB persistent cache mode when network/DNS blocks Firestore
      await disableNetwork(db).catch(() => {});
    }
  }
}

void testConnection();
