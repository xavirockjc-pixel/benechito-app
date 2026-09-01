// Service worker mínimo de la app Vendedor.
// Estrategia: network-first (siempre datos frescos); si falla la red, sirve caché.
// Suficiente para instalabilidad; el offline avanzado se afina en una parte posterior.
const CACHE = "benechito-panel-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(["/admin", "/icons/icon-192.png", "/icons/icon-512.png"]).catch(() => {}),
    ),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Solo intercepta NAVEGACIONES (para el fallback offline). Nunca toca los chunks
// de JS/CSS ni /_next/*, para no romper la carga de la app.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r ?? caches.match("/admin"))),
  );
});
