// A-059 Punkt 8 (Tafel 145): Lösung erst nach Antippen. Kachel zeigt vorn nur
// die Frage (die Rückseite ist unsichtbar und unerreichbar), Seite nach
// „Noch eine“ verdeckt, Rätsel genauso; Schrift ≥ 4,5:1 in allen 8 Kachelfarben.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { KACHEL_FARBEN } from "@/lib/heute/kachelFarben";
import { BEISPIEL_KARTE } from "@/lib/wundertuete/pool";
import { istAufgedeckt, merkeAufgedeckt } from "@/lib/wundertuete/aufgedeckt";
import { ohneFett } from "@/lib/wundertuete/sorten";

vi.mock("@/lib/wetter/client", () => ({ useForecast: () => ({ forecast: null }) }));
vi.mock("@/lib/wundertuete/store", () => ({ useWundertuete: () => null, wtZeigen: () => {}, wtNoch: () => {} }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown }) => createElement("a", { href, ...rest }, children as never) }));

describe("Kachel: Lösung erst nach Antippen", () => {
  it("vorn nur die Frage; Rückseite inert, kein „Mehr ›“ und kein Link vor dem Tippen", async () => {
    const { WundertueteTile } = await import("@/components/wundertuete/WundertueteTile");
    const html = renderToStaticMarkup(createElement(WundertueteTile, { size: "S", today: "2026-10-21", minutes: 600, haushalt: "familie", gericht: null, demo: true, name: "Mia" }));
    const vorn = html.slice(html.indexOf('data-seite-karte="vorn"'), html.indexOf('data-seite-karte="hinten"'));
    const hinten = html.slice(html.indexOf('data-seite-karte="hinten"'));
    expect(vorn).toContain(BEISPIEL_KARTE.vorne);
    expect(vorn).not.toContain(ohneFett(BEISPIEL_KARTE.hinten!).slice(0, 12));
    expect(vorn).toContain("Antippen für die Lösung");
    expect(html).toMatch(/<section[^>]*inert=""[^>]*data-seite-karte="hinten"/);
    expect(html).not.toMatch(/<section[^>]*inert=""[^>]*data-seite-karte="vorn"/);
    expect(html).not.toContain("data-gedreht");
    expect(html).not.toContain("data-mehr");
    expect(html).not.toContain("<a ");
    expect(html).toContain('aria-pressed="false"');
    expect(hinten).toContain("bg-tile-inner");
  });

  it("aufgedeckt merken (Kachel → „Mehr ›“ → Seite offen), zudrehen vergisst", () => {
    expect(istAufgedeckt("aw-001")).toBe(false);
    merkeAufgedeckt("aw-001", true);
    expect(istAufgedeckt("aw-001")).toBe(true);
    expect(istAufgedeckt("aw-002")).toBe(false);
    merkeAufgedeckt("aw-001", false);
    expect(istAufgedeckt("aw-001")).toBe(false);
    expect(istAufgedeckt(undefined)).toBe(false);
  });
});

describe("Seite (auch Rätsel, A-064): nach „Noch eine“ verdeckt", () => {
  const seite = readFileSync("src/components/wundertuete/WundertueteSeite.tsx", "utf8");
  it("Seite: Lösung nur offen, wenn diese Karte aufgedeckt ist; „Noch eine“ vorher hell, aber tippbar", () => {
    expect(seite).toContain("gezeigtId === sichtbar.id || istAufgedeckt(sichtbar.id)");
    expect(seite).toContain("data-verdeckt");
    expect(seite).toMatch(/gezeigt \? \(\s*<span className="wt-neu block[^"]*" data-loesung/);
    expect(seite).toContain('${sichtbar && !gezeigt ? "opacity-45" : ""}');
    expect(seite).not.toMatch(/disabled=\{[^}]*gezeigt/);
    expect(seite).toContain('<div className="flex flex-wrap gap-2 pb-1" role="group" aria-label="Sorte">');
  });

});

// Kontrast: Tinte und Kachel-Akzent auf der Fläche und im weißen Feld (hell) bzw. der leicht helleren Karte (dunkel)
const css = readFileSync("src/app/globals.css", "utf8");
const block = (start: string) => css.slice(css.indexOf(start), css.indexOf("}", css.indexOf(start)));
const tokens = (text: string) => Object.fromEntries([...text.matchAll(/--app-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2].toLowerCase()]));
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (c: number[]) => {
  const [r, g, b] = c.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
/** Weiß mit Deckkraft über einer Fläche (dunkles Innen-Kärtchen: rgb(255 255 255 / 0.06)) */
const ueber = (bg: number[], a: number) => bg.map((v) => Math.round(v + (255 - v) * a));

describe("Kontrast in allen 8 Kachelfarben (≥ 4,5:1)", () => {
  const light = tokens(block(":root {"));
  const dark = tokens(block(':root[data-theme="nacht"] {'));
  it.each(KACHEL_FARBEN)("$label: Frage, Sorte, Hinweis und Lösung", (f) => {
    for (const [t, inner] of [
      [light, (bg: number[]) => (void bg, [255, 255, 255])],
      [dark, (bg: number[]) => ueber(bg, 0.06)],
    ] as const) {
      const bg = rgb(t[`tile-${f.kachel}`]);
      const ac = rgb(t[`tile-${f.kachel}-ac`]);
      expect(contrast(rgb(t.ink), bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ac, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ac, inner(bg))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
