#!/usr/bin/env node
/**
 * Automated GitHub Pages Build, Verification & Deployment Script for OmniMini (`omni-mini-mfe`).
 *
 * Performs:
 *  1. Multi-resolution icon generation (`public/` + root `/` mirror).
 *  2. Production Vite build with relative asset paths (`GITHUB_PAGES_BASE=./`).
 *  3. Post-build GitHub Pages preparation (`404.html` SPA redirects, `.nojekyll`,
 *     `_redirects`, static `/api/*` endpoints, and `dist/assets/omnimini-bundle.*` aliases).
 *  4. Asset & path integrity verification (verifies zero missing icon/manifest/bundle paths).
 *  5. Optional git deployment to the `gh-pages` branch when invoked with `--push`.
 *
 * Usage:
 *   npm run deploy:gh-pages              # Build, prepare & verify GitHub Pages bundle
 *   npm run deploy:gh-pages -- --push    # Build, verify & push ./dist to origin/gh-pages
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const shouldPush = args.includes('--push');
const customBase = args.find((a) => a.startsWith('--base='))?.split('=')[1] || './';
const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

function runStep(title, command, envOverrides = {}) {
  console.log(`\n▶ ${title}`);
  execSync(command, {
    stdio: 'inherit',
    cwd: rootDir,
    env: {
      ...process.env,
      ...envOverrides,
    },
  });
}

// Step 1: Generate all icons and mirror to public/ and repo root /
runStep('Step 1/4: Generating multi-resolution PWA, iOS & Favicon assets...', 'node ./scripts/generate-icons.js');

// Step 2: Compile production bundle with relative base path
runStep('Step 2/4: Building Vite production bundle for GitHub Pages...', 'npx vite build', {
  GITHUB_PAGES_BASE: customBase,
});

// Step 3: Prepare GitHub Pages redirects, 404.html, .nojekyll, and static /api/* endpoints
runStep('Step 3/4: Configuring SPA redirects, 404.html, .nojekyll & static API routes...', 'node ./scripts/prepare-gh-pages.mjs');

// Step 4: Verify all required assets exist in dist/ and root /
console.log('\n▶ Step 4/4: Verifying GitHub Pages asset & route structure...');
const requiredDistFiles = [
  'index.html',
  '404.html',
  '.nojekyll',
  '_redirects',
  'manifest.webmanifest',
  'manifest.json',
  'icon.svg',
  'icon-maskable.svg',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-maskable-192x192.png',
  'pwa-maskable-512x512.png',
  'icons/icon-48x48.png',
  'icons/icon-96x96.png',
  'assets/omnimini-bundle.js',
  'assets/omnimini-bundle.css',
  'api/miniapps/index.json',
  'api/developer/analytics/index.json',
  'api/health/index.json',
];

const missing = [];
for (const relPath of requiredDistFiles) {
  if (!fs.existsSync(path.join(distDir, relPath))) {
    missing.push(`dist/${relPath}`);
  }
}

if (missing.length > 0) {
  console.error('❌ Verification failed! Missing files:', missing.join(', '));
  process.exit(1);
}

console.log(`✅ Verified all ${requiredDistFiles.length} critical GitHub Pages assets, redirects, and static API routes.`);

if (shouldPush) {
  console.log('\n▶ Publishing ./dist to origin/gh-pages branch...');
  const tempWorktree = path.join(rootDir, '.gh-pages-tmp');
  try {
    fs.rmSync(tempWorktree, { recursive: true, force: true });
    fs.mkdirSync(tempWorktree, { recursive: true });
    fs.cpSync(distDir, tempWorktree, { recursive: true });

    execSync('git init', { cwd: tempWorktree, stdio: 'inherit' });
    execSync('git checkout -b gh-pages', { cwd: tempWorktree, stdio: 'inherit' });
    execSync('git add -A', { cwd: tempWorktree, stdio: 'inherit' });
    execSync('git commit -m "chore(deploy): publish OmniMini bundle to GitHub Pages"', {
      cwd: tempWorktree,
      stdio: 'inherit',
    });

    const remoteUrl = execSync('git config --get remote.origin.url', {
      cwd: rootDir,
      encoding: 'utf8',
    }).trim();

    if (!remoteUrl) {
      throw new Error('No git remote "origin" configured.');
    }

    execSync(`git push -f ${remoteUrl} gh-pages:gh-pages`, {
      cwd: tempWorktree,
      stdio: 'inherit',
    });
    console.log('🚀 Successfully published ./dist to origin/gh-pages!');
  } finally {
    fs.rmSync(tempWorktree, { recursive: true, force: true });
  }
} else {
  console.log('\nℹ️  Build & verification complete. To push directly to the gh-pages branch, run:');
  console.log('   npm run deploy:gh-pages -- --push');
}
