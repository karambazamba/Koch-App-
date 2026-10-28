// Wasserzeichen (Tafel 124 A): Deckkraft als Tokens (hell/dunkel, Schlicht
// ohne); Schrift bleibt ≥ 4,5:1 auch über dem Wasserzeichen. Im Haus (S) mit
// Kühlschrank, Namen nie abgeschnitten. Alle Kacheln: A-036. Sport hat seit
// A-044 keins mehr (die Stempel sind das Bild, `tests/sport/stempel.test.ts`).
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PantryItem } from "@/lib/vorrat/pantry";
import { KACHEL_FARBEN } from "@/lib/heute/kachelFarben";
import { at } from "../helpers";

const TODAY = "2026-10-21";

beforeEach(() => at(`${TODAY}T09:00`));

// --- Kachel als echte Ausgabe (ohne Browser) ---------------------------------
const store = vi.hoisted(() => ({ pantry: null as PantryItem[] | null }));
vi.mock("@/lib/vorrat/pantry", async (orig) => ({ ...(await orig<object>()), usePantry: () => store.pantry ?? undefined }));
vi.mock("@/lib/wetter/client", () => ({ useForecast: () => ({ forecast: null, stale: false, failed: false, place: "Eutin" }) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown }) => createElement("a", { href, ...rest }, children as never) }));

async function pantryTile(items: PantryItem[], size: "XS" | "S" = "S") {
  store.pantry = items;
  const { PantryTile } = await import("@/components/heute/HomeTiles");
  return renderToStaticMarkup(createElement(PantryTile, { size }));
}
const sache = (name: string, i: number): PantryItem => ({ id: `p${i}`, name, addedAt: TODAY, place: "kuehlschrank" });

describe("Im-Haus-Kachel", () => {
  it("S: Kühlschrank als Wasserzeichen (freier Text: leise Deckkraft), XS ohne", async () => {
    const html = await pantryTile([sache("Würstchen", 1)]);
    expect(html).toMatch(/<span class="kachel-wasserzeichen[^"]*" data-kachel="vorrat" data-art="frei" aria-hidden="true"><svg[^>]*lucide-refrigerator/);
    expect(await pantryTile([sache("Würstchen", 1)], "XS")).not.toContain("kachel-wasserzeichen");
  });

  it("Namen nie abgeschnitten: Symbol 20 px, Name 14 px ohne flex-1/truncate, Schild 10,5 px darf umbrechen", async () => {
    const html = await pantryTile([sache("Würstchen", 1), sache("Frischkäse mit Kräutern", 2)]);
    const names = [...html.matchAll(/<span class="([^"]*)" data-haus-name="true">([^<]*)</g)];
    expect(names.map((m) => m[2])).toEqual(expect.arrayContaining(["Würstchen"]));
    for (const [, cls] of names) {
      expect(cls).toContain("text-[14px]");
      expect(cls).not.toMatch(/truncate|flex-1|line-clamp/);
    }
    expect(html).toMatch(/data-haus-zeile="true"[^>]*>[\s\S]*?h-5 w-5/);
    expect(html).toMatch(/flex-wrap/);
  });
});

// --- Tokens und Kontrast -------------------------------------------------------
const css = readFileSync("src/app/globals.css", "utf8");
const block = (start: string) => css.slice(css.indexOf(start), css.indexOf("}", css.indexOf(start)));
const hexes = (text: string) => Object.fromEntries([...text.matchAll(/--app-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2].toLowerCase()]));
const zahlen = (text: string) => Object.fromEntries([...text.matchAll(/--app-(wasserzeichen[\w-]*):\s*([0-9.]+)\s*;/g)].map((m) => [m[1], Number(m[2])]));
const THEMES = { hell: ":root {", dunkel: ':root[data-theme="nacht"] {', auto: ':root[data-theme="auto"] {' };

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
/** Farbe `top` mit Deckkraft `a` über `bottom` */
const mix = (top: string, bottom: string, a: number) =>
  "#" + [1, 3, 5].map((i) => Math.round(parseInt(top.slice(i, i + 2), 16) * a + parseInt(bottom.slice(i, i + 2), 16) * (1 - a)).toString(16).padStart(2, "0")).join("");

describe("Tokens (Tafel 124 A)", () => {
  it("Deckkraft hell 12,5 % (frei 9 %), dunkel 10 % (frei 8 %); Dunkel und Automatisch gleich", () => {
    const [h, d, a] = Object.values(THEMES).map((s) => zahlen(block(s)));
    expect(h).toEqual({ wasserzeichen: 0.125, "wasserzeichen-frei": 0.09 });
    expect(d).toEqual({ wasserzeichen: 0.1, "wasserzeichen-frei": 0.08 });
    expect(d).toEqual(a);
  });

  it("CSS: Farbe = Kachel-Akzent (folgt data-farbe), Schlicht ohne; nur var(--app-…), keine Hex", () => {
    const regeln = css.slice(css.indexOf(".kachel-wasserzeichen {"), css.indexOf("}", css.indexOf('[data-look="schlicht"] .kachel-wasserzeichen')) + 1);
    expect(regeln).toContain("color: var(--tile-ac)");
    expect(regeln).toContain("opacity: var(--app-wasserzeichen)");
    expect(regeln).toContain('[data-art="frei"] { opacity: var(--app-wasserzeichen-frei)');
    expect(regeln).toContain('[data-look="schlicht"] .kachel-wasserzeichen { display: none; }');
    expect(regeln).not.toMatch(/#[0-9a-f]{3,6}|var\(--color-/i);
    const komp = readFileSync("src/components/ui/KachelWasserzeichen.tsx", "utf8");
    expect(komp).not.toMatch(/#[0-9a-f]{6}|style=/i);
  });

  // Der Kopf (Label, Plus) steht oben, das Zeichen beginnt erst 120 px über der
  // Unterkante: über dem Zeichen liegt nur dunkle Schrift (ink), Kärtchen und
  // Schilder mit eigener Fläche oder leiser Text mit Freistellung (`kachel-frei`).
  it.each(Object.entries(THEMES))("%s: Schrift bleibt ≥ 4,5:1 auch über dem Wasserzeichen, in allen 8 Farben", (_, start) => {
    const t = hexes(block(start));
    const z = zahlen(block(start));
    for (const f of KACHEL_FARBEN) {
      const bg = t[`tile-${f.kachel}`];
      const ac = t[`tile-${f.kachel}-ac`];
      for (const a of [z.wasserzeichen, z["wasserzeichen-frei"]]) {
        expect(contrast(t.ink, mix(ac, bg, a)), `${f.id} ink`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("leiser Text über dem Zeichen trägt die Freistellung (Kontrast genau wie ohne Wasserzeichen)", async () => {
    expect(css).toMatch(/\.kachel-frei \{ background: var\(--tile-bg\);/);
    expect(await pantryTile([])).toMatch(/text-muted"><span class="kachel-frei">Sag mir, was da ist/);
    expect(await pantryTile([sache("Milch", 1)])).toMatch(/class="hit kachel-frei[^"]*text-accent-strong"/);
  });
});
