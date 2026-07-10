/*
 * Boss of Clean — minimal PWA service worker (DLD-539)
 *
 * Design goals:
 *  - App-shell speed for immutable static assets (cache-first).
 *  - Navigations are NETWORK-FIRST with an offline.html fallback — we never
 *    serve stale page HTML, so authed/dashboard pages always come from the
 *    network.
 *  - Auth (Supabase) and payments (Stripe) MUST stay live: /api, /auth, /login,
 *    /logout and all cross-origin requests bypass the SW entirely.
 */

const VERSION = 'boc-pwa-v1';
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = '/offline.html';

// Minimal app shell precache — offline page + the icon it renders.
const PRECACHE = [OFFLINE_URL, '/android-chrome-192x192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Paths that must always hit the network (auth + payments + dynamic APIs).
function isBypassed(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/logout')
  );
}

// Immutable / safe-to-cache static assets.
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase/Stripe/etc.
  if (isBypassed(url)) return;

  // Navigations: network-first, fall back to the offline page when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets: cache-first with background refresh.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
