import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND, BRAND_DARK, BRAND_SOFT, WORD_PATH } from "@/lib/core/brand";

const ROOT = join(__dirname, "../..");
const DIR = join(ROOT, "public/brand");
const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");

/** Kontrast nach WCAG */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const VARIANTS = ["mia-logo-hell", "mia-logo-dunkel", "mia-logo-auf-orange", "mia-icon", "mia-aufkleber", "mia-punkt"];

describe("Marke Mia: Dateien", () => {
  it("jede Variante als SVG, PNG 1×/2×/3× und Druck-PNG", () => {
    const files = readdirSync(DIR);
    for (const v of VARIANTS) for (const end of [".svg", ".png", "@2x.png", "@3x.png", "-druck.png"]) expect(files).toContain(`${v}${end}`);
  });

  it("SVGs sind gültig (ein <svg> mit viewBox, alles geschlossen) und ohne Text – Schrift nur als Pfad", () => {
    for (const v of VARIANTS) {
      const svg = readFileSync(join(DIR, `${v}.svg`), "utf8");
      expect(svg.trim()).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 [\d.]+ [\d.]+"[^>]*>[\s\S]*<\/svg>$/);
      expect(svg).not.toMatch(/<text|<tspan|font-family/);
      // offene und geschlossene Tags gehen auf
      const open = (svg.match(/<[a-zA-Z][^>]*[^/]>/g) ?? []).length;
      const close = (svg.match(/<\/[a-zA-Z]+>/g) ?? []).length;
      expect(open).toBe(close);
    }
    // Der Schriftzug steckt als Pfad in allen Logos mit Schrift
    for (const v of ["mia-logo-hell", "mia-logo-dunkel", "mia-logo-auf-orange", "mia-aufkleber", "mia-punkt"]) expect(readFileSync(join(DIR, `${v}.svg`), "utf8")).toContain(WORD_PATH);
  });

  it("Druck-PNG trägt 300 dpi", () => {
    const png = readFileSync(join(DIR, "mia-logo-hell-druck.png"));
    const at = png.indexOf("pHYs");
    expect(at).toBeGreaterThan(0);
    // Pixel pro Meter (300 dpi ≈ 11811)
    expect(Math.round(png.readUInt32BE(at + 4) / 39.37)).toBe(300);
  });
});

describe("Marke Mia: Farben", () => {
  it("Tokens --app-brand* stimmen mit brand.ts überein", () => {
    expect(css).toContain(`--app-brand: ${BRAND.toLowerCase()};`);
    expect(css).toContain(`--app-brand-dark: ${BRAND_DARK.toLowerCase()};`);
    expect(css).toContain(`--app-brand-soft: ${BRAND_SOFT.toLowerCase()};`);
  });

  it("Kontrast je Variante mindestens 3:1 (Logo = große Grafik)", () => {
    expect(contrast(BRAND, "#ffffff")).toBeGreaterThanOrEqual(3); // hell auf Weiß
    expect(contrast(BRAND, "#f7f4ef")).toBeGreaterThanOrEqual(3); // hell auf Off-White
    expect(contrast(BRAND_DARK, "#17191c")).toBeGreaterThanOrEqual(3); // dunkel
    expect(contrast("#ffffff", BRAND)).toBeGreaterThanOrEqual(3); // auf Orange
  });
});
