import type { NextConfig } from "next";

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
  async headers() {
    return [
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
