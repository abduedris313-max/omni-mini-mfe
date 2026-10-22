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

export default defineConfig(() => {
  const basePath = process.env.GITHUB_PAGES_BASE || '/';

  return {
    base: basePath,
    plugins: [
      suppressViteHmrPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: basePath,
          name: 'OmniMini Super App',
          short_name: 'OmniMini',
          description: 'Micro Frontend Super App platform with pluggable mini apps and developer store.',
          theme_color: '#0f172a',
          background_color: '#090d16',
          display: 'standalone',
          start_url: basePath,
          scope: basePath,
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
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
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
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
