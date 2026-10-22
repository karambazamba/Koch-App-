import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");
const sw = readFileSync(join(ROOT, "public/sw.js"), "utf8");
const precache = [...sw.slice(sw.indexOf("PRECACHE_URLS"), sw.indexOf("];", sw.indexOf("PRECACHE_URLS"))).matchAll(/"(\/[^"]*)"/g)].map((m) => m[1]);

/** Alle Seiten unter src/app (Ordner mit page.tsx) */
function pages(dir = join(ROOT, "src/app"), base = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...pages(p, `${base}/${name}`));
    else if (name === "page.tsx") out.push(base || "/");
  }
  return out;
}

describe("Service Worker: Vorladen", () => {
  it("lädt genau die echten Seiten vor – keine Umleitungen (Safari mag keine umgeleiteten Antworten aus dem Cache)", () => {
    const pageUrls = precache.filter((u) => !/\.[a-z]+$/.test(u) && u !== "/manifest.webmanifest");
    expect(pageUrls.sort()).toEqual(pages().sort());
  });

  it("Icons mit Version im Namen und das Beispielgericht sind dabei", () => {
    expect(precache).toContain("/demo/gericht.webp");
    expect(precache.some((u) => /^\/icons\/.+-v\d+\.(png|svg)$/.test(u))).toBe(true);
  });
});
