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

// 1. Copy index.html to 404.html so GitHub Pages serves the SPA on any client route
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, notFoundHtml);
  console.log('✓ Created dist/404.html for GitHub Pages SPA routing');
}

// 2. Create .nojekyll to disable Jekyll processing on GitHub Pages
fs.writeFileSync(noJekyll, '', 'utf8');
fs.writeFileSync(path.join(rootDir, '.nojekyll'), '', 'utf8');
console.log('✓ Created .nojekyll for GitHub Pages static asset serving');

// 3. Create deterministic bundle aliases (omnimini-bundle.js & omnimini-bundle.css)
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
    console.log(`✓ Created deterministic bundle alias dist/assets/omnimini-bundle.js (from ${mainJs})`);
  }

  if (mainCss) {
    fs.copyFileSync(
      path.join(assetsDir, mainCss),
      path.join(assetsDir, 'omnimini-bundle.css')
    );
    console.log(`✓ Created deterministic CSS alias dist/assets/omnimini-bundle.css (from ${mainCss})`);
  }
}

// 4. Mirror PWA manifest.webmanifest and Service Worker to repo root for branch-root hosting
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

