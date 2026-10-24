import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

function suppressViteHmrPlugin(): Plugin {
  return {
    name: 'suppress-vite-hmr-ws',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'script',
            attrs: { type: 'text/javascript' },
            children: `
(function() {
  var origConsoleError = console.error;
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    var str = args.join(' ');
    if (str.indexOf('WebSocket') !== -1 || (str.indexOf('[vite]') !== -1 && (str.indexOf('websocket') !== -1 || str.indexOf('failed to connect') !== -1))) {
      return;
    }
    origConsoleError.apply(console, arguments);
  };

  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason) {
      var msg = String(event.reason.message || event.reason);
      if (msg.indexOf('WebSocket') !== -1 || msg.indexOf('vite') !== -1) {
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      }
    }
  });

  var OrigWS = window.WebSocket;
  if (!OrigWS) return;

  window.WebSocket = function(url, protocols) {
    var isVite = protocols === 'vite-hmr' || (typeof url === 'string' && (url.indexOf('vite-hmr') !== -1 || url.indexOf('@vite/client') !== -1));
    if (isVite) {
      var listeners = { open: [], message: [], close: [], error: [] };
      var socket = {
        url: String(url),
        readyState: 1,
        protocol: 'vite-hmr',
        extensions: '',
        bufferedAmount: 0,
        binaryType: 'blob',
        addEventListener: function(event, cb) {
          if (listeners[event]) listeners[event].push(cb);
          if (event === 'open') {
            setTimeout(function() { try { cb(new Event('open')); } catch(e){} }, 0);
          }
        },
        removeEventListener: function(event, cb) {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter(function(fn) { return fn !== cb; });
          }
        },
        dispatchEvent: function(e) {
          var fns = listeners[e.type] || [];
          fns.forEach(function(fn) { try { fn(e); } catch(err){} });
          return true;
        },
        send: function() {},
        close: function(code, reason) {
          socket.readyState = 3;
          var closeEvt = new CloseEvent('close', { wasClean: true, code: code || 1000, reason: reason || '' });
          (listeners.close || []).forEach(function(fn) { try { fn(closeEvt); } catch(err){} });
        },
        onopen: null,
        onclose: null,
        onmessage: null,
        onerror: null
      };

      setTimeout(function() {
        if (typeof socket.onopen === 'function') {
          try { socket.onopen(new Event('open')); } catch(e){}
        }
      }, 0);

      return socket;
    }
    return new OrigWS(url, protocols);
  };

  window.WebSocket.prototype = OrigWS.prototype;
  window.WebSocket.CONNECTING = OrigWS.CONNECTING;
  window.WebSocket.OPEN = OrigWS.OPEN;
  window.WebSocket.CLOSING = OrigWS.CLOSING;
  window.WebSocket.CLOSED = OrigWS.CLOSED;
})();
`,
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}

export default defineConfig(({ command }) => {
  const basePath = process.env.GITHUB_PAGES_BASE || (command === 'build' ? './' : '/');

  return {
    base: basePath,
    plugins: [
      suppressViteHmrPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon-16x16.png',
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'icon.svg',
          'icon-maskable.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-192x192.png',
          'pwa-maskable-512x512.png',
          'icons/*.png',
          'icons/android/**/*.png',
        ],
        manifest: {
          id: basePath,
          name: 'OmniMini Super App',
          short_name: 'OmniMini',
          description: 'Offline-capable Micro Frontend Super App platform with pluggable mini apps, shared wallet, and developer store.',
          theme_color: '#0f172a',
          background_color: '#090d16',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: basePath,
          scope: basePath,
          categories: ['productivity', 'finance', 'utilities', 'developer'],
          icons: [
            {
              src: 'icons/icon-16x16.png',
              sizes: '16x16',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-32x32.png',
              sizes: '32x32',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-48x48.png',
              sizes: '48x48',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-64x64.png',
              sizes: '64x64',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-72x72.png',
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-96x96.png',
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-120x120.png',
              sizes: '120x120',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-128x128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-144x144.png',
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-152x152.png',
              sizes: '152x152',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-167x167.png',
              sizes: '167x167',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-180x180.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-256x256.png',
              sizes: '256x256',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-384x384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-1024x1024.png',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'any',
            },
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
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 15,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/api\/(miniapps|developer\/analytics).*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'omnimini-api-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/lh3\.googleusercontent\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'omnimini-avatar-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio preview iframe to prevent WebSocket connection failures
      hmr: false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
