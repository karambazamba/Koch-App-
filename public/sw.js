// Service Worker von "Was gibt's?": macht die App offline nutzbar.
// Seiten: erst Netz, bei Ausfall aus dem Cache. Statische Dateien: erst Cache.
// CACHE_VERSION erhöhen, wenn sich die Liste der vorab gecachten Seiten ändert.
const CACHE_VERSION = "v45";
// Interner Name (alter Arbeitsname) bleibt, damit alte Caches sauber aufgeräumt werden.
const CACHE_NAME = `familienkueche-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/profil",
  "/profil/person",
  "/profil/haushalt",
  "/profil/einkaufstag",
  "/profil/lieblingsgerichte",
  "/profil/warme-mahlzeit",
  "/profil/standardwoche",
  "/profil/kuechenhelfer",
  "/profil/basen",
  "/profil/nie-wieder",
  "/profil/das-moegt-ihr",
  "/profil/gesundheit",
  "/profil/produkte",
  "/profil/wochenende",
  "/profil/pause",
  "/profil/kochstil",
  "/profil/ansicht",
  "/profil/lotte",
  "/profil/darstellung",
  "/profil/essen",
  "/profil/familie",
  "/profil/daten",
  "/ideen",
  "/woche/check",
  "/kochbuch",
  "/kochbuch/rezept",
  "/kochbuch/bearbeiten",
  "/kochbuch/kochen",
  "/wochenplan",
  "/schnellkueche",
  "/vorrat",
  "/einkaufsliste",
  "/manifest.webmanifest",
  // Icons mit Version im Namen (ICON_VERSION in src/lib/core/app.ts) – neues Icon = neuer Dateiname
  "/icons/icon-v2.svg",
  "/icons/icon-192-v2.png",
  "/icons/icon-512-v2.png",
  "/icons/apple-touch-icon-v2.png",
  "/icons/lotte-192-v2.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("familienkueche-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Nur echte Seitenaufrufe ignorieren Query-Parameter – RSC-Anfragen
    // (?_rsc=…) dürfen nicht mit HTML beantwortet werden. Findet Next.js keine
    // RSC-Antwort, lädt es die Seite komplett neu und landet hier als "navigate".
    const isNavigation = request.mode === "navigate";
    const cached = await cache.match(request, { ignoreSearch: isNavigation });
    if (cached) return cached;
    if (isNavigation) {
      const home = await cache.match("/");
      if (home) return home;
    }
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API (Küchenhelfer) nie aus dem Cache beantworten
  if (url.pathname.startsWith("/api/")) return;

  // Gehashte Build-Dateien ändern sich nie → Cache zuerst.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Seiten, RSC-Daten für Client-Navigation und alles andere → Netz zuerst.
  event.respondWith(networkFirst(request));
});
