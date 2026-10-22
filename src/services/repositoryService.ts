import { INITIAL_MINI_APPS, INITIAL_REVIEWS } from '../data/seedMiniApps';
import { MiniAppManifest, MiniAppReview, SuperAppUser } from '../types/miniapp';
import { firestoreService } from './firestoreService';
import { auth } from '../lib/firebase';

const STORAGE_KEY_APPS = 'omnimini_apps_repo_v3';
const STORAGE_KEY_REVIEWS = 'omnimini_reviews_repo_v3';

function getLocalApps(): MiniAppManifest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local apps cache', e);
  }
  return INITIAL_MINI_APPS;
}

function saveLocalApps(apps: MiniAppManifest[]) {
  try {
    localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(apps));
  } catch (e) {
    console.warn('Failed to save apps cache', e);
  }
}

function getLocalReviews(): Record<string, MiniAppReview[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVIEWS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local reviews cache', e);
  }
  return INITIAL_REVIEWS;
}

function saveLocalReviews(reviews: Record<string, MiniAppReview[]>) {
  try {
    localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(reviews));
  } catch (e) {
    console.warn('Failed to save reviews cache', e);
  }
}

function mergeApps(baseApps: MiniAppManifest[], firestoreApps: MiniAppManifest[]): MiniAppManifest[] {
  const map = new Map<string, MiniAppManifest>();
  for (const app of baseApps) {
    map.set(app.id, app);
  }
  for (const fApp of firestoreApps) {
    const existing = map.get(fApp.id);
    map.set(fApp.id, existing ? { ...existing, ...fApp } : fApp);
  }
  return Array.from(map.values());
}

export const repositoryService = {
  async getMiniApps(category?: string, search?: string): Promise<MiniAppManifest[]> {
    let firestoreApps: MiniAppManifest[] = [];
    try {
      firestoreApps = await firestoreService.getPublishedMiniApps();
    } catch (e) {
      console.warn('Firestore miniapps read fallback:', e);
    }

    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') params.append('category', category);
      if (search) params.append('search', search);

      const res = await fetch(`/api/miniapps?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const merged = mergeApps(json.data, firestoreApps);
          saveLocalApps(merged);
          return merged;
        }
      }
    } catch (e) {
      console.warn('Offline or API unreachable, serving cached repository', e);
    }

    // Local fallback merged with Firestore
    let apps = mergeApps(getLocalApps(), firestoreApps);
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
    return apps;
  },

  async getMiniAppById(id: string): Promise<{ app: MiniAppManifest; reviews: MiniAppReview[] } | null> {
    try {
      const res = await fetch(`/api/miniapps/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return {
            app: json.data,
            reviews: json.data.reviews || [],
          };
        }
      }
    } catch (e) {
      console.warn('Offline or API unreachable for app detail', e);
    }

    const apps = getLocalApps();
    const app = apps.find((a) => a.id === id);
    if (!app) return null;

    const reviewsMap = getLocalReviews();
    const reviews = reviewsMap[id] || [];
    return { app, reviews };
  },

  async publishMiniApp(payload: any): Promise<MiniAppManifest> {
    let publishedManifest: MiniAppManifest | null = null;
    try {
      const res = await fetch('/api/miniapps/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          publishedManifest = json.data;
        }
      }
    } catch (e) {
      console.warn('Publish API unreachable, committing to local repository', e);
    }

    if (!publishedManifest) {
      const id =
        payload.id ||
        payload.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
      publishedManifest = {
        id,
        name: payload.name,
        shortName: payload.shortName || payload.name.slice(0, 10),
        version: payload.version || '1.0.0',
        category: payload.category || 'utilities',
        icon: payload.icon || 'Sparkles',
        iconBg: payload.iconBg || '#3b82f6',
        gradient: payload.gradient || 'from-blue-600 to-indigo-600',
        summary: payload.summary,
        description: payload.description || payload.summary,
        author: {
          name: payload.authorName || auth.currentUser?.displayName || 'Verified Developer',
          email: payload.authorEmail || auth.currentUser?.email || '',
          verified: true,
          org: payload.authorOrg || undefined,
        },
        rating: 5.0,
        reviewCount: 0,
        downloadCount: 0,
        sizeKb: 64,
        permissions: payload.permissions || ['storage'],
        status: 'published',
        pluggableSettingsSchema: payload.pluggableSettingsSchema || [],
        entrypoint: payload.entrypoint || 'DynamicApp',
        screenshots: payload.screenshots || [],
        releaseNotes: payload.releaseNotes || 'Initial stable release to OmniMini Store.',
        updatedAt: new Date().toISOString().split('T')[0],
      };
    }

    if (auth.currentUser && auth.currentUser.emailVerified) {
      try {
        await firestoreService.publishMiniAppToFirestore(publishedManifest);
      } catch (e) {
        console.warn('Failed to sync published Mini App to Firestore:', e);
      }
    }

    const apps = getLocalApps();
    apps.unshift(publishedManifest);
    saveLocalApps(apps);
    return publishedManifest;
  },

  async updateVersion(id: string, newVersion: string, releaseNotes: string, schema?: any): Promise<MiniAppManifest | null> {
    if (auth.currentUser && auth.currentUser.emailVerified) {
      try {
        await firestoreService.updateMiniAppVersionInFirestore(id, newVersion, releaseNotes);
      } catch (e) {
        console.warn('Failed to sync Mini App version update to Firestore:', e);
      }
    }

    try {
      const res = await fetch(`/api/miniapps/${id}/version`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newVersion, releaseNotes, pluggableSettingsSchema: schema }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const apps = getLocalApps();
          const idx = apps.findIndex((a) => a.id === id);
          if (idx >= 0) {
            apps[idx] = json.data;
            saveLocalApps(apps);
          }
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Update version API unreachable, updating locally', e);
    }

    const apps = getLocalApps();
    const app = apps.find((a) => a.id === id);
    if (!app) return null;
    app.version = newVersion;
    app.releaseNotes = releaseNotes;
    app.updatedAt = new Date().toISOString().split('T')[0];
    if (schema) app.pluggableSettingsSchema = schema;
    saveLocalApps(apps);
    return app;
  },

  async addReview(appId: string, userName: string, rating: number, comment: string): Promise<MiniAppReview> {
    try {
      const res = await fetch(`/api/miniapps/${appId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, rating, comment }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Review API unreachable, saving locally', e);
    }

    const review: MiniAppReview = {
      id: `rev-${Date.now()}`,
      appId,
      userName,
      rating,
      date: 'Just now',
      comment,
    };

    const reviewsMap = getLocalReviews();
    if (!reviewsMap[appId]) reviewsMap[appId] = [];
    reviewsMap[appId].unshift(review);
    saveLocalReviews(reviewsMap);

    const apps = getLocalApps();
    const app = apps.find((a) => a.id === appId);
    if (app) {
      const all = reviewsMap[appId];
      app.rating = Number((all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1));
      app.reviewCount = all.length;
      saveLocalApps(apps);
    }

    return review;
  },

  async getTelemetry(): Promise<any> {
    try {
      const res = await fetch('/api/developer/analytics');
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json.data;
      }
    } catch (e) {
      console.warn('Telemetry API unreachable', e);
    }

    const apps = getLocalApps();
    const totalInstalls = apps.reduce((sum, a) => sum + (a.downloadCount || 0), 0);
    const uniqueDevelopers = new Set(apps.map((a) => a.author.email)).size;
    return {
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
    };
  },

  async authenticateGoogle(googleData?: Partial<SuperAppUser>): Promise<SuperAppUser> {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleData || {}),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) return json.user;
      }
    } catch (e) {
      console.warn('Google Auth API unreachable, generating local session', e);
    }

    const email = (googleData?.email || '').trim();
    const name = (googleData?.name || (email ? email.split('@')[0] : 'Authenticated User')).trim();

    return {
      id: `usr-google-${Date.now()}`,
      name,
      email: email || 'authenticated@omnimini.app',
      avatar: googleData?.avatar || '',
      isGoogle: true,
      walletBalance: 0,
      role: googleData?.role || 'developer',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };
  },
};
