// Service Worker von „Mia“: macht die App offline nutzbar.
// Seiten: erst Netz, bei Ausfall aus dem Cache. Statische Dateien: erst Cache.
// CACHE_VERSION bei jeder Auslieferung erhöhen. Eine neue Version wartet, bis
// man den Hinweis "Neue Version da" antippt (Nachricht "SKIP_WAITING") – nie
// ein Zwangs-Neuladen mitten im Tippen. Beim allerersten Mal sofort aktiv.
const CACHE_VERSION = "v167";
// Interner Name (alter Arbeitsname) bleibt, damit alte Caches sauber aufgeräumt werden.
const CACHE_NAME = `familienkueche-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  // Alle Seiten (ohne die alten Adressen, die nur umleiten) – tests/app/serviceWorker.test.ts prüft das
  "/",
  "/aufgaben",
  "/einkaufsliste",
  "/einkaufsliste/laden",
  "/kochbuch",
  "/konto",
  "/anmelden",
  "/beitreten",
  "/auth/callback",
  "/einladung",
  "/datenschutz",
  "/impressum",
  "/nutzungsbedingungen",
  "/mails",
  "/kochbuch/bearbeiten",
  "/kochbuch/kochen",
  "/kochbuch/rezept",
  "/notizen",
  "/notizen/bearbeiten",
  "/pinnwand",
  "/profil",
  "/profil/basen",
  "/profil/bausteine",
  "/profil/das-moegt-ihr",
  "/profil/deine-daten",
  "/profil/daten",
  "/profil/admin",
  "/profil/mitteilungen",
  "/profil/einkaufstag",
  "/profil/essen",
  "/profil/familie",
  "/profil/gesundheit",
  "/profil/haushalt",
  "/profil/kalender",
  "/profil/kochstil",
  "/profil/kuechenhelfer",
  "/profil/lieblingsgerichte",
  "/profil/mails",
  "/profil/mails-an-mia",
  "/profil/nie-wieder",
  "/profil/pause",
  "/profil/person",
  "/profil/produkte",
  "/profil/regiontipps",
  "/profil/standardwoche",
  "/profil/startseite",
  "/profil/tagesablauf",
  "/profil/warme-mahlzeit",
  "/profil/wetter",
  "/spendentopf",
  "/sport",
  "/tag",
  "/tipps",
  "/vorrat",
  "/wetter",
  "/woche/check",
  "/wochenplan",
  "/manifest.webmanifest",
  // Icons mit Version im Namen (ICON_VERSION in src/lib/core/app.ts) – neues Icon = neuer Dateiname
  "/icons/icon-v4.svg",
  "/icons/icon-192-v4.png",
  "/icons/icon-512-v4.png",
  "/icons/apple-touch-icon-v4.png",
  "/icons/lotte-192-v4.png",
  // Beispielgericht des Beispiel-Tags (offline da)
  "/demo/gericht.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => {
        if (!self.registration.active) return self.skipWaiting();
      }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
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

  // Gehashte Build-Dateien ändern sich nie → Cache zuerst. Gericht-Bilder
  // (/gerichte/…) werden nicht vorgeladen, sondern beim ersten Anzeigen gemerkt.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/gerichte/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Seiten, RSC-Daten für Client-Navigation und alles andere → Netz zuerst.
  event.respondWith(networkFirst(request));
});

// Mitteilungen (Tafel 77): Antippen öffnet genau den Eintrag – ein offenes
// Fenster der App wird nach vorne geholt, sonst ein neues geöffnet.
// Schnellknöpfe (Einkauf unterwegs): „+ Butter“ öffnet die Liste mit
// ?plus=Butter (die Liste setzt es drauf), „Nichts, danke“ schließt nur.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "nichts") return;
  const raw = event.notification.data && event.notification.data.href;
  const base = typeof raw === "string" && raw.startsWith("/") ? raw : "/";
  const plus = typeof event.action === "string" && event.action.startsWith("plus:") ? event.action.slice(5).trim().slice(0, 40) : "";
  const href = plus ? `/einkaufsliste?plus=${encodeURIComponent(plus)}` : base;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          client.navigate(href).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(href);
    }),
  );
});

// Web Push vom Server (Erinnerungen, wenn die App zu ist): { title, body, href, tag, actions? }
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" ? data.title : "Mia";
  const body = typeof data.body === "string" ? data.body : "";
  const href = typeof data.href === "string" && data.href.startsWith("/") ? data.href : "/";
  const actions = Array.isArray(data.actions) ? data.actions.filter((a) => a && typeof a.action === "string" && typeof a.title === "string").slice(0, 3) : [];
  event.waitUntil(self.registration.showNotification(title, { body, tag: typeof data.tag === "string" ? data.tag : undefined, icon: data.icon, data: { href }, ...(actions.length ? { actions } : {}) }));
});
