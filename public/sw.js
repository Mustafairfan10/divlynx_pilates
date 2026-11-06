/* Divlynx Pilates — offline service worker.
 * - Precaches every app route (HTML) and the JS/CSS/font assets those pages reference.
 * - Navigations: network-first, falling back to cache so the app opens offline.
 * - /_next/static/*: cache-first (content-hashed, immutable).
 * - RSC fetches that fail offline return an error so Next falls back to a full
 *   page load, which this worker then serves from cache.
 * All studio data lives in IndexedDB on the device, so every feature works offline.
 */
const VERSION = "v2";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const ROUTES = [
  "/", "/shop", "/join",
  "/admin", "/admin/schedule", "/admin/check-in", "/admin/members", "/admin/instructors", "/admin/plans",
  "/admin/payments", "/admin/reports", "/admin/classes", "/admin/equipment", "/admin/settings",
];
const EXTRA = ["/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

const assetUrlsIn = (html) => {
  const out = new Set();
  const re = /(?:src|href)="(\/_next\/static\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) out.add(m[1]);
  // chunks referenced inside inline flight data
  const re2 = /\\?"(\/_next\/static\/[^"\\]+\.(?:js|css|woff2))\\?"/g;
  while ((m = re2.exec(html))) out.add(m[1]);
  const re3 = /"(static\/chunks\/[^"\\]+\.js)/g;
  while ((m = re3.exec(html))) out.add("/_next/" + m[1]);
  return [...out];
};

async function precache() {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const assetSet = new Set();
  await Promise.all(ROUTES.map(async (route) => {
    try {
      const res = await fetch(route, { cache: "reload" });
      if (!res.ok) return;
      const html = await res.clone().text();
      await pages.put(route, res);
      assetUrlsIn(html).forEach((u) => assetSet.add(u));
    } catch {}
  }));
  await Promise.all([...assetSet].map(async (u) => {
    try {
      if (await assets.match(u)) return;
      const r = await fetch(u);
      if (r.ok) await assets.put(u, r);
    } catch {}
  }));
  await Promise.all(EXTRA.map(async (u) => {
    try { const r = await fetch(u); if (r.ok) await assets.put(u, r); } catch {}
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "recache") event.waitUntil(precache());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Next.js immutable build assets
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSETS);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(url.pathname, res.clone());
        return res;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  // RSC payloads (client-side navigations / prefetches)
  if (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    event.respondWith(fetch(req).catch(() => Response.error()));
    return;
  }

  // Page navigations
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(PAGES);
      const key = url.pathname.replace(/\/$/, "") || "/";
      try {
        const res = await fetch(req);
        if (res.ok && ROUTES.includes(key)) {
          cache.put(key, res.clone());
          // opportunistically cache the assets this page references
          res.clone().text().then(async (html) => {
            const assets = await caches.open(ASSETS);
            for (const u of assetUrlsIn(html)) {
              if (!(await assets.match(u))) fetch(u).then((r) => r.ok && assets.put(u, r)).catch(() => {});
            }
          }).catch(() => {});
        }
        return res;
      } catch {
        return (await cache.match(key)) || (await cache.match("/")) || new Response(
          "<h1 style='font-family:sans-serif'>Offline</h1><p>Open the app once while online to enable offline mode.</p>",
          { headers: { "Content-Type": "text/html" } },
        );
      }
    })());
    return;
  }

  // Other same-origin GETs (icons, manifest): stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(ASSETS);
    const hit = await cache.match(req);
    const net = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => hit || Response.error());
    return hit || net;
  })());
});
