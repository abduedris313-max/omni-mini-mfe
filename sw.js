/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-9ba2d447'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "8fc46bab3d83330bedc5961d10af6014"
  }, {
    "url": "pwa-maskable-192x192.png",
    "revision": "1853037f37e51fdcb722e8dcba5d42a4"
  }, {
    "url": "pwa-512x512.png",
    "revision": "fd24136f382f50ccab93d3a439a83369"
  }, {
    "url": "pwa-192x192.png",
    "revision": "dea169c2a7e8cecaceafb39073f47c11"
  }, {
    "url": "manifest.json",
    "revision": "48786af229074e8d2e55e5927e9818fb"
  }, {
    "url": "index.html",
    "revision": "7933bcf3dfcc8841023e238139c0aded"
  }, {
    "url": "icon.svg",
    "revision": "f1bc368fc11d87f5feb37230dcba564d"
  }, {
    "url": "icon-maskable.svg",
    "revision": "2922746d1acb51775aa4e17c41b47ce4"
  }, {
    "url": "favicon.ico",
    "revision": "7e941ef7ae2528046e88ab71d0b3c707"
  }, {
    "url": "favicon-32x32.png",
    "revision": "9b7e824365c33d746d37432dcc0388ed"
  }, {
    "url": "favicon-16x16.png",
    "revision": "eef8f3d1304592b3a3643209d0a630db"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "dc83305ffdebe5b265e845e65f6a19ff"
  }, {
    "url": "icons/maskable-icon-512x512.png",
    "revision": "8fc46bab3d83330bedc5961d10af6014"
  }, {
    "url": "icons/maskable-icon-384x384.png",
    "revision": "1be12dffb206189c008f05ec49e110c5"
  }, {
    "url": "icons/maskable-icon-192x192.png",
    "revision": "1853037f37e51fdcb722e8dcba5d42a4"
  }, {
    "url": "icons/maskable-icon-1024x1024.png",
    "revision": "d436806c6b6bf47b2ec4c7c8a81f0297"
  }, {
    "url": "icons/icon-96x96.png",
    "revision": "c74d8ba8080005f8e5452c327a735fb7"
  }, {
    "url": "icons/icon-72x72.png",
    "revision": "3336df5b7483a31a140e7f48961b29a3"
  }, {
    "url": "icons/icon-64x64.png",
    "revision": "991e1e32c62d903f89b2844b0dc531c7"
  }, {
    "url": "icons/icon-512x512.png",
    "revision": "fd24136f382f50ccab93d3a439a83369"
  }, {
    "url": "icons/icon-48x48.png",
    "revision": "6029058969c4825a49e13edaa0d3a149"
  }, {
    "url": "icons/icon-384x384.png",
    "revision": "2bb75c39b12be31b80989f9cee6fc4ec"
  }, {
    "url": "icons/icon-32x32.png",
    "revision": "9b7e824365c33d746d37432dcc0388ed"
  }, {
    "url": "icons/icon-256x256.png",
    "revision": "54347ae707f7855b38a22e5ea8275716"
  }, {
    "url": "icons/icon-192x192.png",
    "revision": "dea169c2a7e8cecaceafb39073f47c11"
  }, {
    "url": "icons/icon-180x180.png",
    "revision": "dc83305ffdebe5b265e845e65f6a19ff"
  }, {
    "url": "icons/icon-16x16.png",
    "revision": "eef8f3d1304592b3a3643209d0a630db"
  }, {
    "url": "icons/icon-167x167.png",
    "revision": "1694918bdfd667207f85611e3e47fd11"
  }, {
    "url": "icons/icon-152x152.png",
    "revision": "dd05c0c3c82a40685f20fc6772838c67"
  }, {
    "url": "icons/icon-144x144.png",
    "revision": "db9045313fde3e51b6eaae3de8513f37"
  }, {
    "url": "icons/icon-128x128.png",
    "revision": "93e6d3b106a5fc597b6810237cc76011"
  }, {
    "url": "icons/icon-120x120.png",
    "revision": "adb40432c47ddbd86172cb0417a326c8"
  }, {
    "url": "icons/icon-1024x1024.png",
    "revision": "a8dfac04897a1d0ec49a4e1504ae586b"
  }, {
    "url": "icons/android/mipmap-xxxhdpi/ic_launcher_round.png",
    "revision": "dea169c2a7e8cecaceafb39073f47c11"
  }, {
    "url": "icons/android/mipmap-xxxhdpi/ic_launcher_foreground.png",
    "revision": "1853037f37e51fdcb722e8dcba5d42a4"
  }, {
    "url": "icons/android/mipmap-xxxhdpi/ic_launcher.png",
    "revision": "dea169c2a7e8cecaceafb39073f47c11"
  }, {
    "url": "icons/android/mipmap-xxhdpi/ic_launcher_round.png",
    "revision": "db9045313fde3e51b6eaae3de8513f37"
  }, {
    "url": "icons/android/mipmap-xxhdpi/ic_launcher_foreground.png",
    "revision": "701c4b372a5d28a1cc0a9cee77e15ceb"
  }, {
    "url": "icons/android/mipmap-xxhdpi/ic_launcher.png",
    "revision": "db9045313fde3e51b6eaae3de8513f37"
  }, {
    "url": "icons/android/mipmap-xhdpi/ic_launcher_round.png",
    "revision": "c74d8ba8080005f8e5452c327a735fb7"
  }, {
    "url": "icons/android/mipmap-xhdpi/ic_launcher_foreground.png",
    "revision": "3a60394bde630a09faea44e2b5721d97"
  }, {
    "url": "icons/android/mipmap-xhdpi/ic_launcher.png",
    "revision": "c74d8ba8080005f8e5452c327a735fb7"
  }, {
    "url": "icons/android/mipmap-mdpi/ic_launcher_round.png",
    "revision": "6029058969c4825a49e13edaa0d3a149"
  }, {
    "url": "icons/android/mipmap-mdpi/ic_launcher_foreground.png",
    "revision": "8a1d29ed08d25b8ded9b8cbe55e043d0"
  }, {
    "url": "icons/android/mipmap-mdpi/ic_launcher.png",
    "revision": "6029058969c4825a49e13edaa0d3a149"
  }, {
    "url": "icons/android/mipmap-hdpi/ic_launcher_round.png",
    "revision": "3336df5b7483a31a140e7f48961b29a3"
  }, {
    "url": "icons/android/mipmap-hdpi/ic_launcher_foreground.png",
    "revision": "29c286f4f83860c184640aaf9a92f74e"
  }, {
    "url": "icons/android/mipmap-hdpi/ic_launcher.png",
    "revision": "3336df5b7483a31a140e7f48961b29a3"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/web-baEP_0uw.js",
    "revision": null
  }, {
    "url": "assets/web-MF-R-YQ7.js",
    "revision": null
  }, {
    "url": "assets/web-K2hD9_8I.js",
    "revision": null
  }, {
    "url": "assets/web-DXz4JZiQ.js",
    "revision": null
  }, {
    "url": "assets/web-D-xVD_lM.js",
    "revision": null
  }, {
    "url": "assets/web-BD13833I.js",
    "revision": null
  }, {
    "url": "assets/web-B7lVBdYe.js",
    "revision": null
  }, {
    "url": "assets/pwa-512x512-CLIWsSMO.png",
    "revision": null
  }, {
    "url": "assets/pwa-192x192-D2OZhphy.png",
    "revision": null
  }, {
    "url": "assets/index-DCcjK1LJ.css",
    "revision": null
  }, {
    "url": "assets/index-CDkAC7hZ.js",
    "revision": null
  }, {
    "url": "assets/icon-DftOHzpq.svg",
    "revision": null
  }, {
    "url": "assets/icon-96x96-DET7izUG.png",
    "revision": null
  }, {
    "url": "assets/icon-48x48-CnP5ISSe.png",
    "revision": null
  }, {
    "url": "assets/icon-167x167-CAlZ6_Nb.png",
    "revision": null
  }, {
    "url": "assets/icon-152x152-N0fD3HUu.png",
    "revision": null
  }, {
    "url": "assets/icon-120x120-DPS24iqI.png",
    "revision": null
  }, {
    "url": "assets/favicon-DD9-j1Gu.ico",
    "revision": null
  }, {
    "url": "assets/favicon-32x32-IoUNoJw-.png",
    "revision": null
  }, {
    "url": "assets/favicon-16x16-CAnoC61U.png",
    "revision": null
  }, {
    "url": "assets/apple-touch-icon-boH6QFRc.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "dc83305ffdebe5b265e845e65f6a19ff"
  }, {
    "url": "favicon-16x16.png",
    "revision": "eef8f3d1304592b3a3643209d0a630db"
  }, {
    "url": "favicon-32x32.png",
    "revision": "9b7e824365c33d746d37432dcc0388ed"
  }, {
    "url": "favicon.ico",
    "revision": "7e941ef7ae2528046e88ab71d0b3c707"
  }, {
    "url": "icon-maskable.svg",
    "revision": "2922746d1acb51775aa4e17c41b47ce4"
  }, {
    "url": "icon.svg",
    "revision": "f1bc368fc11d87f5feb37230dcba564d"
  }, {
    "url": "pwa-192x192.png",
    "revision": "dea169c2a7e8cecaceafb39073f47c11"
  }, {
    "url": "pwa-512x512.png",
    "revision": "fd24136f382f50ccab93d3a439a83369"
  }, {
    "url": "pwa-maskable-192x192.png",
    "revision": "1853037f37e51fdcb722e8dcba5d42a4"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "8fc46bab3d83330bedc5961d10af6014"
  }, {
    "url": "icons/icon-1024x1024.png",
    "revision": "a8dfac04897a1d0ec49a4e1504ae586b"
  }, {
    "url": "icons/icon-120x120.png",
    "revision": "adb40432c47ddbd86172cb0417a326c8"
  }, {
    "url": "icons/icon-128x128.png",
    "revision": "93e6d3b106a5fc597b6810237cc76011"
  }, {
    "url": "icons/icon-144x144.png",
    "revision": "db9045313fde3e51b6eaae3de8513f37"
  }, {
    "url": "icons/icon-152x152.png",
    "revision": "dd05c0c3c82a40685f20fc6772838c67"
  }, {
    "url": "icons/icon-167x167.png",
    "revision": "1694918bdfd667207f85611e3e47fd11"
  }, {
    "url": "icons/icon-16x16.png",
    "revision": "eef8f3d1304592b3a3643209d0a630db"
  }, {
    "url": "icons/icon-180x180.png",
    "revision": "dc83305ffdebe5b265e845e65f6a19ff"
  }, {
    "url": "icons/icon-192x192.png",
    "revision": "dea169c2a7e8cecaceafb39073f47c11"
  }, {
    "url": "icons/icon-256x256.png",
    "revision": "54347ae707f7855b38a22e5ea8275716"
  }, {
    "url": "icons/icon-32x32.png",
    "revision": "9b7e824365c33d746d37432dcc0388ed"
  }, {
    "url": "icons/icon-384x384.png",
    "revision": "2bb75c39b12be31b80989f9cee6fc4ec"
  }, {
    "url": "icons/icon-48x48.png",
    "revision": "6029058969c4825a49e13edaa0d3a149"
  }, {
    "url": "icons/icon-512x512.png",
    "revision": "fd24136f382f50ccab93d3a439a83369"
  }, {
    "url": "icons/icon-64x64.png",
    "revision": "991e1e32c62d903f89b2844b0dc531c7"
  }, {
    "url": "icons/icon-72x72.png",
    "revision": "3336df5b7483a31a140e7f48961b29a3"
  }, {
    "url": "icons/icon-96x96.png",
    "revision": "c74d8ba8080005f8e5452c327a735fb7"
  }, {
    "url": "icons/maskable-icon-1024x1024.png",
    "revision": "d436806c6b6bf47b2ec4c7c8a81f0297"
  }, {
    "url": "icons/maskable-icon-192x192.png",
    "revision": "1853037f37e51fdcb722e8dcba5d42a4"
  }, {
    "url": "icons/maskable-icon-384x384.png",
    "revision": "1be12dffb206189c008f05ec49e110c5"
  }, {
    "url": "icons/maskable-icon-512x512.png",
    "revision": "8fc46bab3d83330bedc5961d10af6014"
  }, {
    "url": "icons/android/mipmap-hdpi/ic_launcher.png",
    "revision": "3336df5b7483a31a140e7f48961b29a3"
  }, {
    "url": "icons/android/mipmap-hdpi/ic_launcher_foreground.png",
    "revision": "29c286f4f83860c184640aaf9a92f74e"
  }, {
    "url": "icons/android/mipmap-hdpi/ic_launcher_round.png",
    "revision": "3336df5b7483a31a140e7f48961b29a3"
  }, {
    "url": "icons/android/mipmap-mdpi/ic_launcher.png",
    "revision": "6029058969c4825a49e13edaa0d3a149"
  }, {
    "url": "icons/android/mipmap-mdpi/ic_launcher_foreground.png",
    "revision": "8a1d29ed08d25b8ded9b8cbe55e043d0"
  }, {
    "url": "icons/android/mipmap-mdpi/ic_launcher_round.png",
    "revision": "6029058969c4825a49e13edaa0d3a149"
  }, {
    "url": "icons/android/mipmap-xhdpi/ic_launcher.png",
    "revision": "c74d8ba8080005f8e5452c327a735fb7"
  }, {
    "url": "icons/android/mipmap-xhdpi/ic_launcher_foreground.png",
    "revision": "3a60394bde630a09faea44e2b5721d97"
  }, {
    "url": "icons/android/mipmap-xhdpi/ic_launcher_round.png",
    "revision": "c74d8ba8080005f8e5452c327a735fb7"
  }, {
    "url": "icons/android/mipmap-xxhdpi/ic_launcher.png",
    "revision": "db9045313fde3e51b6eaae3de8513f37"
  }, {
    "url": "icons/android/mipmap-xxhdpi/ic_launcher_foreground.png",
    "revision": "701c4b372a5d28a1cc0a9cee77e15ceb"
  }, {
    "url": "icons/android/mipmap-xxhdpi/ic_launcher_round.png",
    "revision": "db9045313fde3e51b6eaae3de8513f37"
  }, {
    "url": "icons/android/mipmap-xxxhdpi/ic_launcher.png",
    "revision": "dea169c2a7e8cecaceafb39073f47c11"
  }, {
    "url": "icons/android/mipmap-xxxhdpi/ic_launcher_foreground.png",
    "revision": "1853037f37e51fdcb722e8dcba5d42a4"
  }, {
    "url": "icons/android/mipmap-xxxhdpi/ic_launcher_round.png",
    "revision": "dea169c2a7e8cecaceafb39073f47c11"
  }, {
    "url": "manifest.webmanifest",
    "revision": "4433714cf077b48c64e83712221ac632"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//]
  }));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-stylesheets",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 15,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-webfonts",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/\/api\/(miniapps|developer\/analytics).*/i, new workbox.NetworkFirst({
    "cacheName": "omnimini-api-cache",
    "networkTimeoutSeconds": 3,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 604800
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/lh3\.googleusercontent\.com\/.*/i, new workbox.StaleWhileRevalidate({
    "cacheName": "omnimini-avatar-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
