// Service Worker — GCC Louange
// Cache-first pour les assets statiques, stale-while-revalidate pour les pages.
// Fix : les réponses redirigées (res.redirected) sont renvoyées via Response.redirect()
// pour éviter l'erreur "Response served by service worker has redirections" sur Safari/Chrome.

const CACHE = "gcc-louange-v2";

const PRECACHE = [
  "/songs-index.json",
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Laisser passer : non-GET, cross-origin, Firebase, API routes Next.js
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // Assets Next.js (_next/static) : cache-first (ils ont des hashes)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok && res.status === 200 && !res.redirected) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // Pages et autres ressources : stale-while-revalidate
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const fresh = fetch(request)
          .then((res) => {
            // Safari et Chrome rejettent les réponses redirigées servies par un SW.
            // On renvoie une redirection explicite pour que le browser suive lui-même.
            if (res.redirected) {
              return Response.redirect(res.url, 302);
            }
            if (res.ok && res.status === 200) {
              cache.put(request, res.clone());
            }
            return res;
          })
          .catch(() => cached);

        return cached || fresh;
      })
    )
  );
});
