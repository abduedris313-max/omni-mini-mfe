/**
 * Multi-Resolution Logo & App Icon Generator for OmniMini Super App.
 *
 * Generates crisp, anti-aliased RGBA PNG and ICO assets across all required
 * PWA, iOS Touch Icon, Favicon, and Android Capacitor Mipmap launcher resolutions
 * directly from the OmniMini 4-Tile Interlocking Micro-Frontend Brand Emblem.
 *
 * Usage: `node scripts/generate-icons.js`
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// -----------------------------------------------------------------------------
// 1. Signed Distance Field (SDF) Geometry Helpers (Normalized 0..512 coordinate space)
// -----------------------------------------------------------------------------

function sdRoundedRect(px, py, cx, cy, halfW, halfH, radius) {
  const qx = Math.abs(px - cx) - (halfW - radius);
  const qy = Math.abs(py - cy) - (halfH - radius);
  const outDist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inDist = Math.min(Math.max(qx, qy), 0);
  return outDist + inDist - radius;
}

function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

function smoothCoverage(sdf, pixelScale) {
  // Anti-alias edge over 1.2 device pixels
  const aa = 0.65 * pixelScale;
  if (sdf <= -aa) return 1.0;
  if (sdf >= aa) return 0.0;
  return 0.5 - sdf / (2 * aa);
}

function blendColor(baseR, baseG, baseB, baseA, overR, overG, overB, overAlpha) {
  if (overAlpha <= 0) return [baseR, baseG, baseB, baseA];
  const inv = 1 - overAlpha;
  const outA = overAlpha + baseA * inv;
  if (outA <= 0) return [0, 0, 0, 0];
  const outR = (overR * overAlpha + baseR * baseA * inv) / outA;
  const outG = (overG * overAlpha + baseG * baseA * inv) / outA;
  const outB = (overB * overAlpha + baseB * baseA * inv) / outA;
  return [outR, outG, outB, outA];
}

/**
 * Evaluates the OmniMini Logo RGBA color at normalized (u, v) in [0, 512]x[0, 512].
 *
 * @param {number} x - Coordinate in [0, 512]
 * @param {number} y - Coordinate in [0, 512]
 * @param {number} pixelScale - 512 / width for crisp anti-aliasing at any resolution
 * @param {boolean} maskable - If true, uses full-bleed background and 15% safe-zone scaling
 */
function sampleOmniMiniLogo(x, y, pixelScale, maskable = false) {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;

  // 1. Background (iOS squircle for `any`, full-bleed square for `maskable`)
  const bgSdf = maskable
    ? -1000
    : sdRoundedRect(x, y, 256, 256, 256, 256, 115);
  const bgCov = smoothCoverage(bgSdf, pixelScale);
  if (bgCov <= 0) {
    return [0, 0, 0, 0];
  }

  // Diagonal brand gradient: #3b82f6 -> #6366f1 -> #8b5cf6
  const diag = Math.max(0, Math.min(1, (x + y) / 1024));
  let bgR;
  let bgG;
  let bgB;
  if (diag < 0.5) {
    const t = diag * 2;
    bgR = 59 + (99 - 59) * t;
    bgG = 130 + (102 - 130) * t;
    bgB = 246 + (241 - 246) * t;
  } else {
    const t = (diag - 0.5) * 2;
    bgR = 99 + (139 - 99) * t;
    bgG = 102 + (92 - 102) * t;
    bgB = 241 + (246 - 241) * t;
  }

  // Subtle top glass highlight
  if (y < 256) {
    const glowFactor = (1 - y / 256) * 0.24;
    bgR = bgR + (255 - bgR) * glowFactor;
    bgG = bgG + (255 - bgG) * glowFactor;
    bgB = bgB + (255 - bgB) * glowFactor;
  }

  [r, g, b, a] = [bgR, bgG, bgB, bgCov];

  // Transform coordinates for the inner 4-tile emblem
  // For maskable icons, scale inner emblem slightly down so it sits comfortably inside the 80% safe zone
  const scale = maskable ? 1.18 : 1.0;
  const ex = (x - 256) * scale + 150;
  const ey = (y - 256) * scale + 150;
  const ps = pixelScale * scale;

  // Tile centers in local 0..300 emblem space:
  // Top-Left: [0..135, 0..135] -> center (67.5, 67.5), half (67.5, 67.5), radius 32
  // Top-Right: [165..300, 0..135] -> center (232.5, 67.5)
  // Bottom-Left: [0..135, 165..300] -> center (67.5, 232.5)
  // Bottom-Right: [165..300, 165..300] -> center (232.5, 232.5)

  const tileCenters = [
    [67.5, 67.5],
    [232.5, 67.5],
    [67.5, 232.5],
    [232.5, 232.5],
  ];

  // Soft drop shadow under tiles
  for (const [tcx, tcy] of tileCenters) {
    const shSdf = sdRoundedRect(ex, ey - 8, tcx, tcy, 67.5, 67.5, 32);
    if (shSdf < 18) {
      const shAlpha = Math.max(0, Math.min(1, (18 - shSdf) / 28)) * 0.22;
      [r, g, b, a] = blendColor(r, g, b, a, 9, 13, 22, shAlpha);
    }
  }

  // Render the 4 white squircle tiles
  for (const [tcx, tcy] of tileCenters) {
    const tileSdf = sdRoundedRect(ex, ey, tcx, tcy, 67.5, 67.5, 32);
    const tileCov = smoothCoverage(tileSdf, ps);
    if (tileCov > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 255, 255, 255, tileCov * 0.96);
    }
  }

  // Tile 1 (Top-Left): Blue circle + White plus
  {
    const cSdf = sdCircle(ex, ey, 67.5, 67.5, 30);
    const cCov = smoothCoverage(cSdf, ps);
    if (cCov > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 59, 130, 246, cCov);
    }
    const hLine = sdSegment(ex, ey, 55, 67.5, 80, 67.5) - 3.5;
    const vLine = sdSegment(ex, ey, 67.5, 55, 67.5, 80) - 3.5;
    const plusCov = smoothCoverage(Math.min(hLine, vLine), ps);
    if (plusCov > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 255, 255, 255, plusCov);
    }
  }

  // Tile 2 (Top-Right): Pink rounded square + White inner circle
  {
    const sqSdf = sdRoundedRect(ex, ey, 232.5, 67.5, 37.5, 37.5, 18);
    const sqCov = smoothCoverage(sqSdf, ps);
    if (sqCov > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 236, 72, 153, sqCov);
    }
    const innerDot = smoothCoverage(sdCircle(ex, ey, 232.5, 67.5, 15), ps);
    if (innerDot > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 255, 255, 255, innerDot);
    }
  }

  // Tile 3 (Bottom-Left): Emerald rounded square + White checkmark
  {
    const sqSdf = sdRoundedRect(ex, ey, 67.5, 232.5, 37.5, 37.5, 18);
    const sqCov = smoothCoverage(sqSdf, ps);
    if (sqCov > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 16, 185, 129, sqCov);
    }
    const seg1 = sdSegment(ex, ey, 50, 233, 62, 246) - 3.8;
    const seg2 = sdSegment(ex, ey, 62, 246, 86, 219) - 3.8;
    const chkCov = smoothCoverage(Math.min(seg1, seg2), ps);
    if (chkCov > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 255, 255, 255, chkCov);
    }
  }

  // Tile 4 (Bottom-Right): Amber circle + White diamond/star core
  {
    const cSdf = sdCircle(ex, ey, 232.5, 232.5, 33);
    const cCov = smoothCoverage(cSdf, ps);
    if (cCov > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 245, 158, 11, cCov);
    }
    // Rotated rounded diamond in center of tile 4
    const dx = Math.abs(ex - 232.5);
    const dy = Math.abs(ey - 232.5);
    const starSdf = (dx + dy) / Math.SQRT2 - 13;
    const starCov = smoothCoverage(starSdf, ps);
    if (starCov > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 255, 255, 255, starCov);
    }
  }

  // Central Super-App Bridge Hub Node at (150, 150)
  {
    const outerRing = smoothCoverage(sdCircle(ex, ey, 150, 150, 25), ps);
    if (outerRing > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 255, 255, 255, outerRing);
    }
    const darkCore = smoothCoverage(sdCircle(ex, ey, 150, 150, 20), ps);
    if (darkCore > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 15, 23, 42, darkCore);
    }
    const cyanPulse = smoothCoverage(sdCircle(ex, ey, 150, 150, 8.5), ps);
    if (cyanPulse > 0) {
      [r, g, b, a] = blendColor(r, g, b, a, 96, 165, 250, cyanPulse);
    }
  }

  return [
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b))),
    Math.max(0, Math.min(255, Math.round(a * 255))),
  ];
}

// -----------------------------------------------------------------------------
// 2. PNG & ICO Binary Encoders (Zero External Native Dependencies)
// -----------------------------------------------------------------------------

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ -1;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeInt32BE(crc, 8 + len);
  return chunk;
}

function createOmniMiniPNG(size, { maskable = false } = {}) {
  const width = size;
  const height = size;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk (8-bit RGBA, colorType = 6)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth: 8
  ihdrData.writeUInt8(6, 9); // color type: 6 (RGBA)
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const scanlineWidth = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineWidth);
  const pixelScale = 512 / width;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineWidth;
    rawData[rowOffset] = 0; // Filter type 0
    const normY = ((y + 0.5) / height) * 512;

    for (let x = 0; x < width; x++) {
      const normX = ((x + 0.5) / width) * 512;
      const [r, g, b, a] = sampleOmniMiniLogo(normX, normY, pixelScale, maskable);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Wraps 16x16, 32x32, and 48x48 PNG buffers into a valid multi-resolution Windows/Browser `.ico` container.
 */
function createMultiSizeICO(pngEntries) {
  const count = pngEntries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let dataOffset = 6 + count * 16;

  for (const { size, buffer } of pngEntries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // Palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // Size of PNG payload
    entry.writeUInt32LE(dataOffset, 12); // Offset
    dirEntries.push(entry);
    dataOffset += buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngEntries.map((e) => e.buffer)]);
}

// -----------------------------------------------------------------------------
// 3. Generate All Resolution Targets
// -----------------------------------------------------------------------------

const publicDir = path.resolve('public');
const iconsDir = path.join(publicDir, 'icons');
const androidIconsDir = path.join(iconsDir, 'android');

fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(androidIconsDir, { recursive: true });

// Standard `any` resolutions (Favicons, iOS Touch Icons, PWA Manifest, App Store / Play Store)
const ANY_RESOLUTIONS = [16, 32, 48, 64, 72, 96, 120, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024];

// Maskable adaptive icon resolutions (with 15% safe zone padding)
const MASKABLE_RESOLUTIONS = [192, 384, 512, 1024];

// Android Capacitor Mipmap density buckets
const ANDROID_MIPMAP_BUCKETS = [
  { folder: 'mipmap-mdpi', size: 48, density: 'mdpi (1x)' },
  { folder: 'mipmap-hdpi', size: 72, density: 'hdpi (1.5x)' },
  { folder: 'mipmap-xhdpi', size: 96, density: 'xhdpi (2x)' },
  { folder: 'mipmap-xxhdpi', size: 144, density: 'xxhdpi (3x)' },
  { folder: 'mipmap-xxxhdpi', size: 192, density: 'xxxhdpi (4x)' },
];

const generatedBuffers = new Map();

console.log('Generating OmniMini multi-resolution logo & icon suite...');

for (const size of ANY_RESOLUTIONS) {
  const buf = createOmniMiniPNG(size, { maskable: false });
  generatedBuffers.set(size, buf);
  const fileName = `icon-${size}x${size}.png`;
  fs.writeFileSync(path.join(iconsDir, fileName), buf);
}

// Copy root-level canonical PWA & iOS & Favicon files
fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), generatedBuffers.get(16));
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), generatedBuffers.get(32));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatedBuffers.get(180));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatedBuffers.get(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatedBuffers.get(512));

// Multi-size favicon.ico (16x16, 32x32, 48x48)
const icoBuffer = createMultiSizeICO([
  { size: 16, buffer: generatedBuffers.get(16) },
  { size: 32, buffer: generatedBuffers.get(32) },
  { size: 48, buffer: generatedBuffers.get(48) },
]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

// Maskable icons
for (const size of MASKABLE_RESOLUTIONS) {
  const maskBuf = createOmniMiniPNG(size, { maskable: true });
  fs.writeFileSync(path.join(iconsDir, `maskable-icon-${size}x${size}.png`), maskBuf);
  if (size === 192 || size === 512) {
    fs.writeFileSync(path.join(publicDir, `pwa-maskable-${size}x${size}.png`), maskBuf);
  }
}

// Android Capacitor mipmap density folders
for (const bucket of ANDROID_MIPMAP_BUCKETS) {
  const bucketDir = path.join(androidIconsDir, bucket.folder);
  fs.mkdirSync(bucketDir, { recursive: true });
  const launcherBuf = generatedBuffers.get(bucket.size);
  const roundBuf = createOmniMiniPNG(bucket.size, { maskable: false });
  const foregroundBuf = createOmniMiniPNG(bucket.size, { maskable: true });
  fs.writeFileSync(path.join(bucketDir, 'ic_launcher.png'), launcherBuf);
  fs.writeFileSync(path.join(bucketDir, 'ic_launcher_round.png'), roundBuf);
  fs.writeFileSync(path.join(bucketDir, 'ic_launcher_foreground.png'), foregroundBuf);
}

// Maskable SVG variant in public/icon-maskable.svg
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="50%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- Full-bleed background for Android Maskable Adaptive Icons -->
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="256" fill="url(#glow)"/>

  <!-- Safe-zone centered emblem (80% inner circle safe zone) -->
  <g filter="url(#shadow)" transform="translate(128, 128) scale(0.8533)">
    <rect x="0" y="0" width="135" height="135" rx="32" fill="#ffffff" fill-opacity="0.95"/>
    <circle cx="67.5" cy="67.5" r="28" fill="#3b82f6"/>
    <path d="M57 67.5 L78 67.5 M67.5 57 L67.5 78" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>

    <rect x="165" y="0" width="135" height="135" rx="32" fill="#ffffff" fill-opacity="0.95"/>
    <rect x="195" y="30" width="75" height="75" rx="18" fill="#ec4899"/>
    <circle cx="232.5" cy="67.5" r="16" fill="#ffffff"/>

    <rect x="0" y="165" width="135" height="135" rx="32" fill="#ffffff" fill-opacity="0.95"/>
    <rect x="30" y="195" width="75" height="75" rx="18" fill="#10b981"/>
    <path d="M48 232.5 L63 247.5 L87 217.5" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>

    <rect x="165" y="165" width="135" height="135" rx="32" fill="#ffffff" fill-opacity="0.95"/>
    <circle cx="232.5" cy="232.5" r="32" fill="#f59e0b"/>
    <polygon points="232.5,212 240,227 256,227 243,237 248,253 232.5,243 217,253 222,237 209,227 225,227" fill="#ffffff"/>

    <circle cx="150" cy="150" r="22" fill="#0f172a" stroke="#ffffff" stroke-width="4"/>
    <circle cx="150" cy="150" r="8" fill="#60a5fa"/>
  </g>
</svg>
`;
fs.writeFileSync(path.join(publicDir, 'icon-maskable.svg'), maskableSvg);

// Also write static public/manifest.json synchronized with VitePWA manifest
const manifestJson = {
  id: './',
  name: 'OmniMini Super App',
  short_name: 'OmniMini',
  description:
    'Offline-capable Micro Frontend Super App platform with pluggable mini apps, shared wallet, and developer store.',
  theme_color: '#0f172a',
  background_color: '#090d16',
  display: 'standalone',
  orientation: 'portrait-primary',
  start_url: './',
  scope: './',
  categories: ['productivity', 'finance', 'utilities', 'developer'],
  icons: [
    ...ANY_RESOLUTIONS.map((size) => ({
      src:
        size === 192
          ? 'pwa-192x192.png'
          : size === 512
          ? 'pwa-512x512.png'
          : `icons/icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any',
    })),
    {
      src: 'pwa-maskable-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: 'icons/maskable-icon-384x384.png',
      sizes: '384x384',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: 'pwa-maskable-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: 'icons/maskable-icon-1024x1024.png',
      sizes: '1024x1024',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: 'icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: 'icon-maskable.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'maskable',
    },
  ],
};

fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifestJson, null, 2) + '\n');

console.log(
  `Successfully generated ${ANY_RESOLUTIONS.length} standard PNG resolutions, ${MASKABLE_RESOLUTIONS.length} maskable PNGs, multi-size favicon.ico, public/manifest.json, and ${ANDROID_MIPMAP_BUCKETS.length} Android mipmap density buckets!`
);

