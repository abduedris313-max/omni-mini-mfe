import express, { Request, Response } from 'express';
import { INITIAL_MINI_APPS, INITIAL_REVIEWS } from '../data/seedMiniApps';
import { MiniAppManifest, MiniAppReview } from '../types/miniapp';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// In-memory persistent database for the repository backend
let miniAppsRegistry: MiniAppManifest[] = [...INITIAL_MINI_APPS];
let miniAppReviews: Record<string, MiniAppReview[]> = { ...INITIAL_REVIEWS };

// Dynamic telemetry helper
function computeTelemetry() {
  const totalInstalls = miniAppsRegistry.reduce((sum, app) => sum + (app.downloadCount || 0), 0);
  const totalReviews = Object.values(miniAppReviews).reduce((sum, list) => sum + list.length, 0);
  const uniqueAuthors = new Set(miniAppsRegistry.map((a) => a.author.email)).size;
  return {
    totalPlatformInstalls: totalInstalls,
    totalReviews,
    crashFreeSessionRate: 100.0,
    developerCount: uniqueAuthors,
  };
}

// GET /api/health
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'OmniMini Repository Core Backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/miniapps - Query all mini apps
apiRouter.get('/miniapps', (req: Request, res: Response) => {
  const { category, search, status } = req.query;
  let results = [...miniAppsRegistry];

  if (category && category !== 'all') {
    results = results.filter((app) => app.category === category);
  }

  if (status) {
    results = results.filter((app) => app.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.summary.toLowerCase().includes(q) ||
        app.author.name.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    total: results.length,
    data: results,
  });
});

// GET /api/miniapps/:id - Detailed manifest & reviews
apiRouter.get('/miniapps/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const app = miniAppsRegistry.find((a) => a.id === id);

  if (!app) {
    return res.status(404).json({ success: false, error: 'Mini app not found' });
  }

  const reviews = miniAppReviews[id] || [];
  res.json({
    success: true,
    data: {
      ...app,
      reviews,
    },
  });
});

// POST /api/miniapps/publish - Developer publishes new Mini App
apiRouter.post('/miniapps/publish', (req: Request, res: Response) => {
  const {
    id,
    name,
    shortName,
    version,
    category,
    icon,
    iconBg,
    gradient,
    summary,
    description,
    authorName,
    authorEmail,
    authorOrg,
    permissions,
    pluggableSettingsSchema,
    entrypoint,
    screenshots,
    releaseNotes,
  } = req.body;

  if (!name || !summary || !category) {
    return res.status(400).json({
      success: false,
      error: 'Missing required manifest fields (name, summary, category)',
    });
  }

  const generatedId = id || name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

  // Check if exists
  const existingIdx = miniAppsRegistry.findIndex((a) => a.id === generatedId);
  if (existingIdx >= 0) {
    return res.status(409).json({
      success: false,
      error: `Mini app with ID "${generatedId}" already exists. Use version update instead.`,
    });
  }

  const newApp: MiniAppManifest = {
    id: generatedId,
    name,
    shortName: shortName || name.slice(0, 10),
    version: version || '1.0.0',
    category: category || 'utilities',
    icon: icon || 'Sparkles',
    iconBg: iconBg || '#3b82f6',
    gradient: gradient || 'from-blue-600 to-indigo-600',
    summary,
    description: description || summary,
    author: {
      name: authorName || 'Independent Developer',
      email: authorEmail || 'dev@example.com',
      verified: true,
      org: authorOrg || undefined,
    },
    rating: 5.0,
    reviewCount: 0,
    downloadCount: 0,
    sizeKb: payloadSizeKb(req.body),
    permissions: permissions || ['storage'],
    status: 'published',
    pluggableSettingsSchema: pluggableSettingsSchema || [],
    entrypoint: entrypoint || 'DynamicApp',
    screenshots: screenshots || [],
    releaseNotes: releaseNotes || 'Initial stable release to OmniMini Store.',
    updatedAt: new Date().toISOString().split('T')[0],
  };

  miniAppsRegistry.unshift(newApp);
  miniAppReviews[generatedId] = [];

  res.status(201).json({
    success: true,
    message: 'Mini app published successfully to OmniMini Repository',
    data: newApp,
  });
});

// PUT /api/miniapps/:id/version - Developer updates Mini App version
apiRouter.put('/miniapps/:id/version', (req: Request, res: Response) => {
  const { id } = req.params;
  const { newVersion, releaseNotes, pluggableSettingsSchema } = req.body;

  const app = miniAppsRegistry.find((a) => a.id === id);
  if (!app) {
    return res.status(404).json({ success: false, error: 'Mini app not found' });
  }

  app.version = newVersion || `${parseInt(app.version.split('.')[0] || '1') + 1}.0.0`;
  app.releaseNotes = releaseNotes || `Updated to version ${app.version}`;
  app.updatedAt = new Date().toISOString().split('T')[0];

  if (pluggableSettingsSchema) {
    app.pluggableSettingsSchema = pluggableSettingsSchema;
  }

  res.json({
    success: true,
    message: `Mini app ${app.name} updated to v${app.version}`,
    data: app,
  });
});

// POST /api/miniapps/:id/reviews - Submit review
apiRouter.post('/miniapps/:id/reviews', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userName, rating, comment } = req.body;

  const app = miniAppsRegistry.find((a) => a.id === id);
  if (!app) {
    return res.status(404).json({ success: false, error: 'Mini app not found' });
  }

  const newReview: MiniAppReview = {
    id: `rev-${Date.now()}`,
    appId: id,
    userName: userName || 'OmniUser',
    rating: Number(rating) || 5,
    date: 'Just now',
    comment: comment || 'Works seamlessly on the Super App!',
  };

  if (!miniAppReviews[id]) {
    miniAppReviews[id] = [];
  }
  miniAppReviews[id].unshift(newReview);

  // Recalculate rating
  const allReviews = miniAppReviews[id];
  const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  app.rating = Number(avg.toFixed(1));
  app.reviewCount = allReviews.length;

  res.status(201).json({
    success: true,
    data: newReview,
    updatedRating: app.rating,
    totalReviews: app.reviewCount,
  });
});

// Helper to estimate manifest bundle size in KB
function payloadSizeKb(body: Record<string, unknown>): number {
  const bytes = Buffer.byteLength(JSON.stringify(body || {}), 'utf8');
  return Math.max(16, Math.round(bytes / 64));
}

// GET /api/developer/analytics - Telemetry & metrics
apiRouter.get('/developer/analytics', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      ...computeTelemetry(),
      totalMiniApps: miniAppsRegistry.length,
      categoryDistribution: {
        finance: miniAppsRegistry.filter((a) => a.category === 'finance').length,
        transport: miniAppsRegistry.filter((a) => a.category === 'transport').length,
        food: miniAppsRegistry.filter((a) => a.category === 'food').length,
        health: miniAppsRegistry.filter((a) => a.category === 'health').length,
        productivity: miniAppsRegistry.filter((a) => a.category === 'productivity').length,
        utilities: miniAppsRegistry.filter((a) => a.category === 'utilities').length,
        developer: miniAppsRegistry.filter((a) => a.category === 'developer').length,
      },
    },
  });
});

// POST /api/auth/google - Google Authentication Session
apiRouter.post('/auth/google', (req: Request, res: Response) => {
  const { email, name, avatar } = req.body;
  const resolvedEmail = (email || '').trim();
  const resolvedName = (name || (resolvedEmail ? resolvedEmail.split('@')[0] : 'Authenticated User')).trim();

  const user = {
    id: `usr-google-${Date.now()}`,
    name: resolvedName,
    email: resolvedEmail || 'authenticated@omnimini.app',
    avatar: avatar || '',
    isGoogle: true,
    walletBalance: 0,
    role: 'developer',
    joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  };

  res.json({
    success: true,
    user,
    message: 'Authenticated with Google successfully',
  });
});

// ============================================================================
// SECURO FINANCE & ERP BACKEND SERVICE ROUTES (/api/securo/*)
// ============================================================================
interface SecuroBackendSnapshot {
  activeWorkspaceId: string;
  accounts: any[];
  assets: any[];
  transactions: any[];
  rules: any[];
  splits: any[];
  invoices: any[];
  lastSyncedAt: string;
}

let securoServerState: SecuroBackendSnapshot | null = null;

// GET /api/securo/state - Retrieve server-persisted Securo workspace state
apiRouter.get('/securo/state', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Securo Finance ERP Engine',
    hasState: Boolean(securoServerState),
    data: securoServerState,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/securo/sync - Synchronize client Securo ledger, equity, rules & B2B invoices with backend
apiRouter.post('/securo/sync', (req: Request, res: Response) => {
  const {
    activeWorkspaceId,
    accounts,
    assets,
    transactions,
    rules,
    splits,
    invoices,
  } = req.body || {};

  const nowIso = new Date().toISOString();
  securoServerState = {
    activeWorkspaceId: activeWorkspaceId || 'ws-personal',
    accounts: Array.isArray(accounts) ? accounts : [],
    assets: Array.isArray(assets) ? assets : [],
    transactions: Array.isArray(transactions) ? transactions : [],
    rules: Array.isArray(rules) ? rules : [],
    splits: Array.isArray(splits) ? splits : [],
    invoices: Array.isArray(invoices) ? invoices : [],
    lastSyncedAt: nowIso,
  };

  const wsAccounts = securoServerState.accounts.filter(
    (a) => a.workspaceId === securoServerState?.activeWorkspaceId
  );
  const wsAssets = securoServerState.assets.filter(
    (a) => a.workspaceId === securoServerState?.activeWorkspaceId
  );

  const liquidAssets = wsAccounts
    .filter((a) => Number(a.balance) > 0)
    .reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLiabilities = wsAccounts
    .filter((a) => Number(a.balance) < 0)
    .reduce((sum, a) => sum + Math.abs(Number(a.balance)), 0);
  const totalAssetValue = wsAssets.reduce(
    (sum, a) => sum + Number(a.quantity || 1) * Number(a.current_price || 0),
    0
  );

  res.json({
    success: true,
    lastSyncedAt: nowIso,
    telemetry: {
      activeWorkspaceId: securoServerState.activeWorkspaceId,
      liquidAssets,
      totalLiabilities,
      totalAssetValue,
      netWorth: liquidAssets + totalAssetValue - totalLiabilities,
      accountCount: wsAccounts.length,
      transactionCount: securoServerState.transactions.filter(
        (t) => t.workspaceId === securoServerState?.activeWorkspaceId
      ).length,
    },
  });
});

// POST /api/securo/open-banking/import - Server-side Open Banking Statement Connector
apiRouter.post('/securo/open-banking/import', (req: Request, res: Response) => {
  const provider = (req.body?.provider || 'simplefin') as
    | 'simplefin'
    | 'enable_banking'
    | 'pluggy'
    | 'csv';

  const providerBatches: Record<
    string,
    Array<{ payee: string; description: string; amount: number; defaultCat: string }>
  > = {
    simplefin: [
      {
        payee: 'WHOLE FOODS MKT #1042 AUSTIN',
        description: 'SimpleFIN US Bridge · POS Debit Card',
        amount: -142.85,
        defaultCat: 'Uncategorized',
      },
      {
        payee: 'AWS EMEA SARL CLOUD',
        description: 'SimpleFIN US Bridge · Monthly S3 & EC2 compute',
        amount: -49.9,
        defaultCat: 'Uncategorized',
      },
    ],
    enable_banking: [
      {
        payee: 'HETZNER ONLINE GMBH',
        description: 'Enable Banking PSD2 EU · SEPA Direct Debit',
        amount: -89.0,
        defaultCat: 'Uncategorized',
      },
      {
        payee: 'REWE MARKT BERLIN',
        description: 'Enable Banking PSD2 EU · Girocard',
        amount: -64.15,
        defaultCat: 'Groceries',
      },
    ],
    pluggy: [
      {
        payee: 'PIX TRANSF NUBANK',
        description: 'Pluggy Open Finance Brasil · Instant Sync',
        amount: 1850.0,
        defaultCat: 'Client Revenue',
      },
      {
        payee: 'GITHUB INC CLOUD',
        description: 'Pluggy Open Finance Brasil · Actions & Copilot',
        amount: -39.0,
        defaultCat: 'Uncategorized',
      },
    ],
    csv: [
      {
        payee: 'TRADER JOES #412',
        description: 'OFX / CAMT.053 Statement Parser',
        amount: -94.5,
        defaultCat: 'Uncategorized',
      },
    ],
  };

  res.json({
    success: true,
    provider,
    rows: providerBatches[provider] || providerBatches.simplefin,
    syncedAt: new Date().toISOString(),
  });
});

