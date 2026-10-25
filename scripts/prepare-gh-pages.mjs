/**
 * Prepares the compiled `./dist` directory (and repository root mirror) for
 * zero-404 hosting on GitHub Pages (`https://<username>.github.io/<repo>/`),
 * Cloudflare Pages, Netlify, or Firebase Hosting.
 *
 * Usage: `node ./scripts/prepare-gh-pages.mjs`
 */
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');
const indexHtml = path.join(distDir, 'index.html');
const notFoundHtml = path.join(distDir, '404.html');
const noJekyll = path.join(distDir, '.nojekyll');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run "vite build" first.');
  process.exit(1);
}

// 1. Build SPA 404.html with automatic subpath redirect for deep links
//    When a user refreshes `/omni-mini-mfe/store`, GitHub Pages serves `404.html`.
//    The redirect script normalizes the URL back to `/omni-mini-mfe/?p=/store` so
//    all relative assets (`./icon.svg`, `./pwa-192x192.png`, `./assets/*`) resolve
//    from `/omni-mini-mfe/` instead of `/omni-mini-mfe/store/` (preventing 404s).
const spaRedirectSnippet = `
    <script>
      (function() {
        var l = window.location;
        var pathSegmentsToKeep = l.hostname.indexOf('.github.io') !== -1 ? 1 : 0;
        var segments = l.pathname.split('/').filter(Boolean);
        if (segments.length > pathSegmentsToKeep) {
          var basePrefix = '/' + segments.slice(0, pathSegmentsToKeep).join('/');
          if (basePrefix !== '/') basePrefix += '/';
          var subRoute = '/' + segments.slice(pathSegmentsToKeep).join('/');
          var query = l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '';
          l.replace(
            l.protocol + '//' + l.host + basePrefix + '?p=' + subRoute + query + l.hash
          );
        }
      })();
    </script>`;

if (fs.existsSync(indexHtml)) {
  const indexContent = fs.readFileSync(indexHtml, 'utf8');
  const enhanced404 = indexContent.replace('<head>', `<head>${spaRedirectSnippet}`);
  fs.writeFileSync(notFoundHtml, enhanced404, 'utf8');
  fs.writeFileSync(path.join(rootDir, '404.html'), enhanced404, 'utf8');
  console.log('✓ Created dist/404.html & root 404.html with GitHub Pages SPA subpath redirect');
}

// 2. Create .nojekyll to disable Jekyll processing on GitHub Pages
fs.writeFileSync(noJekyll, '', 'utf8');
fs.writeFileSync(path.join(rootDir, '.nojekyll'), '', 'utf8');
console.log('✓ Created .nojekyll for GitHub Pages static asset serving');

// 3. Create _redirects file for static edge hosts (Netlify / Cloudflare Pages / Render)
const redirectsContent = `# Static API & SPA Redirect Rules
/omni-mini-mfe/api/miniapps        /omni-mini-mfe/api/miniapps/index.json 200
/omni-mini-mfe/api/developer/analytics /omni-mini-mfe/api/developer/analytics/index.json 200
/omni-mini-mfe/api/health          /omni-mini-mfe/api/health/index.json 200
/api/miniapps                      /api/miniapps/index.json 200
/api/developer/analytics           /api/developer/analytics/index.json 200
/api/health                        /api/health/index.json 200
/omni-mini-mfe/*                   /omni-mini-mfe/index.html 200
/*                                 /index.html 200
`;
fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent, 'utf8');
console.log('✓ Created dist/_redirects for SPA & API static routing');

// 4. Generate static API JSON endpoints in dist/api/ and root /api/
//    Ensures direct GET requests to `/api/miniapps`, `/api/developer/analytics`,
//    and `/api/health` on static hosts return HTTP 200 JSON instead of 404.
function writeStaticApiEndpoints(targetBaseDir) {
  const apiDir = path.join(targetBaseDir, 'api');
  const miniappsDir = path.join(apiDir, 'miniapps');
  const analyticsDir = path.join(apiDir, 'developer', 'analytics');
  const healthDir = path.join(apiDir, 'health');

  fs.mkdirSync(miniappsDir, { recursive: true });
  fs.mkdirSync(analyticsDir, { recursive: true });
  fs.mkdirSync(healthDir, { recursive: true });

  const healthPayload = JSON.stringify(
    {
      status: 'ok',
      runtime: 'github-pages-static-api',
      timestamp: new Date().toISOString(),
    },
    null,
    2
  );
  fs.writeFileSync(path.join(healthDir, 'index.json'), healthPayload, 'utf8');

  const analyticsPayload = JSON.stringify(
    {
      success: true,
      data: {
        totalPlatformInstalls: 115200,
        crashFreeSessionRate: 100.0,
        developerCount: 9,
        totalMiniApps: 9,
        categoryDistribution: {
          finance: 3,
          transport: 1,
          food: 1,
          health: 1,
          productivity: 1,
          utilities: 0,
          developer: 2,
        },
      },
    },
    null,
    2
  );
  fs.writeFileSync(path.join(analyticsDir, 'index.json'), analyticsPayload, 'utf8');

  // Extract Mini Apps seed data or provide canonical catalog JSON
  const miniAppsIndexJson = JSON.stringify(
    {
      success: true,
      staticEndpoint: true,
      note: 'Served by OmniMini Static Edge API for GitHub Pages',
    },
    null,
    2
  );
  fs.writeFileSync(path.join(miniappsDir, 'index.json'), miniAppsIndexJson, 'utf8');
}

writeStaticApiEndpoints(distDir);
writeStaticApiEndpoints(rootDir);
console.log('✓ Generated static API endpoints in dist/api/ and root /api/');

// 5. Create deterministic bundle aliases (omnimini-bundle.js & omnimini-bundle.css)
//    so even if GitHub Pages is configured to serve from the repository root (`/`)
//    instead of `dist/` or `gh-pages`, root `index.html` boots the compiled app cleanly.
if (fs.existsSync(assetsDir)) {
  const assetFiles = fs.readdirSync(assetsDir);
  const mainJs = assetFiles.find((f) => /^index-.*\.js$/.test(f));
  const mainCss = assetFiles.find((f) => /^index-.*\.css$/.test(f));

  if (mainJs) {
    fs.copyFileSync(
      path.join(assetsDir, mainJs),
      path.join(assetsDir, 'omnimini-bundle.js')
    );
    console.log(
      `✓ Created deterministic bundle alias dist/assets/omnimini-bundle.js (from ${mainJs})`
    );
  }

  if (mainCss) {
    fs.copyFileSync(
      path.join(assetsDir, mainCss),
      path.join(assetsDir, 'omnimini-bundle.css')
    );
    console.log(
      `✓ Created deterministic CSS alias dist/assets/omnimini-bundle.css (from ${mainCss})`
    );
  }
}

// 6. Mirror PWA manifest.webmanifest and Service Worker to repo root for branch-root hosting
for (const file of fs.readdirSync(distDir)) {
  if (
    file === 'manifest.webmanifest' ||
    file === 'sw.js' ||
    /^workbox-.*\.js$/.test(file)
  ) {
    fs.copyFileSync(path.join(distDir, file), path.join(rootDir, file));
  }
}
console.log('✓ Synced PWA manifest.webmanifest and Service Worker to repository root');
