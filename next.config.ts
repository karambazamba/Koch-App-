import type { NextConfig } from "next";

const OLD_PAGES: [string, string][] = [
  ["/ideen", "/?seite=essen"],
  ["/schnellkueche", "/?seite=essen"],
  ["/profil/ansicht", "/profil"],
  ["/profil/darstellung", "/profil"],
  ["/profil/lotte", "/profil/kuechenhelfer"],
  ["/profil/vorlesen", "/profil/kuechenhelfer"],
  ["/profil/farbe", "/profil/kuechenhelfer"],
  ["/profil/wochenende", "/profil/kochstil"],
];

/** Mikrofon und Standort nur für die eigene Seite, alles andere aus; nie in fremden Rahmen */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self), payment=(), usb=(), interest-cohort=()" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  // Stand der Auslieferung – in den Einstellungen "Version 0.25 · Stand 20.10.2026"
  env: { BUILD_DATE: new Date().toISOString().slice(0, 10) },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Alte Adressen (frühere Seiten) – gleiche Ziele wie vorher, Lesezeichen und Links bleiben gültig
  async redirects() {
    return OLD_PAGES.map(([source, destination]) => ({ source, destination, permanent: false }));
  },
  // Einladungs-Links (Tafel 22): /e/<token> zeigt die statische Einladungsseite (Token liest die Seite selbst)
  async rewrites() {
    return [{ source: "/e/:token", destination: "/einladung" }];
  },
  async headers() {
    return [
      // Sicherheits-Header für alle Seiten (Datenschutz & Sicherheit, Platz 23) – Test tests/app/datenschutz.test.ts
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        // Der Service Worker darf nie aus dem HTTP-Cache kommen,
        // sonst erreichen Updates die installierte App nicht.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
