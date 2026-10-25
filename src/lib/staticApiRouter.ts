import { INITIAL_MINI_APPS, INITIAL_REVIEWS } from '../data/seedMiniApps';
import { MiniAppManifest, MiniAppReview } from '../types/miniapp';

const STORAGE_KEY_APPS = 'omnimini_apps_repo_v3';
const STORAGE_KEY_REVIEWS = 'omnimini_reviews_repo_v3';

function loadAppsFromStorage(): MiniAppManifest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return INITIAL_MINI_APPS;
}

function loadReviewsFromStorage(): Record<string, MiniAppReview[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVIEWS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return INITIAL_REVIEWS;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-OmniMini-Runtime': 'static-edge-router',
    },
  });
}

/**
 * Handles `/api/*` requests client-side when hosted on static platforms such as
 * GitHub Pages (`https://<user>.github.io/<repo>/`), Capacitor Android (`capacitor://`),
 * or when the Express backend is unreachable.
 *
 * This eliminates `404 (Not Found)` console errors for `/api/miniapps`,
 * `/api/developer/analytics`, `/api/auth/google`, and `/api/health`.
 */
export async function handleStaticApiRequest(
  urlStr: string,
  init?: RequestInit
): Promise<Response | null> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(
      urlStr,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    );
  } catch {
    return null;
  }

  // Normalize path so both `/api/...` and `/omni-mini-mfe/api/...` match cleanly
  const apiMatch = parsedUrl.pathname.match(/(?:^|\/)api\/(.+)$/);
  if (!apiMatch) return null;

  const subPath = apiMatch[1].replace(/\/+$/, '');
  const method = (init?.method || 'GET').toUpperCase();

  // 1. GET /api/health
  if (subPath === 'health' && method === 'GET') {
    return jsonResponse({
      status: 'ok',
      runtime: 'static-github-pages',
      timestamp: new Date().toISOString(),
    });
  }

  // 2. GET /api/miniapps
  if (subPath === 'miniapps' && method === 'GET') {
    const category = parsedUrl.searchParams.get('category');
    const search = parsedUrl.searchParams.get('search');
    let apps = loadAppsFromStorage();

    if (category && category !== 'all') {
      apps = apps.filter((a) => a.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      apps = apps.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.author.name.toLowerCase().includes(q)
      );
    }
    return jsonResponse({ success: true, data: apps });
  }

  // 3. GET /api/miniapps/:id
  const detailMatch = subPath.match(/^miniapps\/([^/]+)$/);
  if (detailMatch && method === 'GET') {
    const appId = decodeURIComponent(detailMatch[1]);
    const apps = loadAppsFromStorage();
    const app = apps.find((a) => a.id === appId);
    if (!app) {
      return jsonResponse({ success: false, error: 'Mini app not found' }, 404);
    }
    const reviewsMap = loadReviewsFromStorage();
    return jsonResponse({
      success: true,
      data: {
        ...app,
        reviews: reviewsMap[appId] || [],
      },
    });
  }

  // 4. GET /api/developer/analytics
  if (subPath === 'developer/analytics' && method === 'GET') {
    const apps = loadAppsFromStorage();
    const totalInstalls = apps.reduce((sum, a) => sum + (a.downloadCount || 0), 0);
    const uniqueDevelopers = new Set(apps.map((a) => a.author.email)).size;
    return jsonResponse({
      success: true,
      data: {
        totalPlatformInstalls: totalInstalls,
        crashFreeSessionRate: 100.0,
        developerCount: uniqueDevelopers,
        totalMiniApps: apps.length,
        categoryDistribution: {
          finance: apps.filter((a) => a.category === 'finance').length,
          transport: apps.filter((a) => a.category === 'transport').length,
          food: apps.filter((a) => a.category === 'food').length,
          health: apps.filter((a) => a.category === 'health').length,
          productivity: apps.filter((a) => a.category === 'productivity').length,
          utilities: apps.filter((a) => a.category === 'utilities').length,
          developer: apps.filter((a) => a.category === 'developer').length,
        },
      },
    });
  }

  // 5. POST /api/auth/google
  if (subPath === 'auth/google' && method === 'POST') {
    let body: Record<string, any> = {};
    try {
      if (typeof init?.body === 'string') {
        body = JSON.parse(init.body);
      }
    } catch {
      // ignore
    }
    const email = (body.email || 'abdu.edris313@gmail.com').trim();
    const name = (body.name || email.split('@')[0] || 'OmniMini Developer').trim();
    return jsonResponse({
      success: true,
      user: {
        id: `usr-google-${Date.now()}`,
        name,
        email,
        avatar: body.avatar || '',
        isGoogle: true,
        authProvider: 'google',
        walletBalance: 0,
        role: body.role || 'developer',
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      },
    });
  }

  return null;
}

/**
 * Safe API fetch helper that avoids mutating `window.fetch` (which is read-only/getter-only
 * in sandboxed iframe environments) while transparently serving static JSON responses on
 * GitHub Pages or when the backend returns 404.
 */
export async function safeApiFetch(
  urlStr: string,
  init?: RequestInit,
  isStaticHost = false
): Promise<Response> {
  if (isStaticHost) {
    const staticRes = await handleStaticApiRequest(urlStr, init);
    if (staticRes) return staticRes;
  }

  try {
    const response = await fetch(urlStr, init);
    if (response.status === 404) {
      const staticRes = await handleStaticApiRequest(urlStr, init);
      if (staticRes) return staticRes;
    }
    return response;
  } catch (error) {
    const staticRes = await handleStaticApiRequest(urlStr, init);
    if (staticRes) return staticRes;
    throw error;
  }
}

let fetchInterceptorInstalled = false;

/**
 * Safely installs a static `/api/*` interceptor only when running on a static host
 * and only if `window.fetch` is writable/configurable in the current runtime.
 */
export function installStaticApiInterceptor(isStaticHost: boolean): void {
  if (!isStaticHost || fetchInterceptorInstalled || typeof window === 'undefined' || !window.fetch) {
    return;
  }
  fetchInterceptorInstalled = true;

  try {
    const descriptor =
      Object.getOwnPropertyDescriptor(window, 'fetch') ||
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');

    // If fetch is a non-configurable getter without a setter, do not attempt to overwrite it
    if (descriptor && !descriptor.writable && !descriptor.set && !descriptor.configurable) {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    const wrappedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      const isApiCall = /(?:^|\/)api\/(miniapps|developer\/analytics|auth\/google|health)/.test(
        urlStr
      );

      if (isApiCall) {
        const staticRes = await handleStaticApiRequest(urlStr, init);
        if (staticRes) return staticRes;
      }

      return originalFetch(input, init);
    };

    Object.defineProperty(window, 'fetch', {
      value: wrappedFetch,
      configurable: true,
      writable: true,
    });
  } catch {
    // Ignore if window.fetch is locked by the host environment; safeApiFetch handles it directly
  }
}
