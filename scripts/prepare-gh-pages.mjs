import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
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
console.log('✓ Created dist/.nojekyll for GitHub Pages static asset serving');
