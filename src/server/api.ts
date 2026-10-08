import express, { Request, Response } from 'express';
import { INITIAL_MINI_APPS, INITIAL_REVIEWS } from '../data/seedMiniApps';
import { MiniAppManifest, MiniAppReview } from '../types/miniapp';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// In-memory persistent database for the repository backend
let miniAppsRegistry: MiniAppManifest[] = [...INITIAL_MINI_APPS];
let miniAppReviews: Record<string, MiniAppReview[]> = { ...INITIAL_REVIEWS };

// Telemetry & analytics metrics
const telemetry = {
  totalPlatformInstalls: 66800,
  dailyActiveUsers: 24350,
  averageLoadTimeMs: 142,
  crashFreeSessionRate: 99.94,
  developerCount: 128,
};

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
    reviewCount: 1,
    downloadCount: 1,
    sizeKb: Math.floor(Math.random() * 80) + 80,
    permissions: permissions || ['storage'],
    status: 'published',
    pluggableSettingsSchema: pluggableSettingsSchema || [],
    entrypoint: entrypoint || 'DynamicApp',
    screenshots: screenshots || [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    ],
    releaseNotes: releaseNotes || 'Initial stable release to OmniMini Store.',
    updatedAt: new Date().toISOString().split('T')[0],
  };

  miniAppsRegistry.unshift(newApp);
  miniAppReviews[generatedId] = [
    {
      id: `rev-${Date.now()}`,
      appId: generatedId,
      userName: 'Verified Auditor',
      rating: 5,
      date: 'Just now',
      comment: 'Manifest verification completed. Safe sandboxed bundle.',
    },
  ];

  telemetry.totalPlatformInstalls += 1;

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

// GET /api/developer/analytics - Telemetry & metrics
apiRouter.get('/developer/analytics', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      ...telemetry,
      totalMiniApps: miniAppsRegistry.length,
      categoryDistribution: miniAppsRegistry.reduce(
        (acc, app) => {
          const category = app.category;
          if (
            category === 'finance' ||
            category === 'transport' ||
            category === 'food' ||
            category === 'health' ||
            category === 'productivity' ||
            category === 'utilities' ||
            category === 'developer'
          ) {
            acc[category]++;
          }
          return acc;
        },
        {
          finance: 0,
          transport: 0,
          food: 0,
          health: 0,
          productivity: 0,
          utilities: 0,
          developer: 0,
        }
      ),
    },
  });
});

// POST /api/auth/google - One-click Google Authentication
apiRouter.post('/auth/google', (req: Request, res: Response) => {
  const { email, name, avatar } = req.body;

  const user = {
    id: `usr-google-${Date.now()}`,
    name: name || 'Google User',
    email: email || 'user@gmail.com',
    avatar:
      avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    isGoogle: true,
    walletBalance: 248.5,
    role: 'developer',
    joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    token: `oauth_mock_jwt_${Buffer.from(email || 'user').toString('base64')}_${Date.now()}`,
  };

  res.json({
    success: true,
    user,
    message: 'Authenticated with Google successfully',
  });
});
