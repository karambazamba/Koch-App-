// Wetter-Kachel (Tafel „ruhig mit Regentropfen“, Tafel 87): ehrliche Lage und
// Zeile, Wind jetzt, 2-Stunden-Überblick, Hintergrund je Wetter/Tag/Nacht/Look,
// Kontrast jeder Himmel-Variante (WCAG ≥ 4,5:1), S/M/L als echte Ausgabe.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildDays, type Forecast, type ForecastHour } from "@/lib/wetter/forecast";
import { HIMMEL_KEYS, kachelHimmel, kachelLage, kachelWind, kachelZeile, rainingNow, zweiStunden } from "@/lib/wetter/kachel";

const TODAY = "2026-10-22";
const NEXT = "2026-10-23";
const hour = (h: number, o: Partial<ForecastHour> = {}, date = TODAY): ForecastHour => ({ date, hour: h, temp: 9 + h / 4, code: 3, rain: 20, gust: 30, mm: 0, sun: 0, cloud: 80, wind: 32, dir: 270, ...o });
const day24 = (o: (h: number) => Partial<ForecastHour> = () => ({}), date = TODAY) => Array.from({ length: 24 }, (_, h) => hour(h, o(h), date));
const WET = { mm: 1, rain: 80, code: 61 };
const fcOf = (hours: ForecastHour[], current: Partial<Forecast["current"]> = {}): Forecast => ({ place: "Eutin", fetchedAt: `${TODAY}T06:00:00Z`, current: { temp: 9, code: 3, ...current }, hours, days: buildDays(hours) });
/** Regen bis 9 Uhr, danach trocken (wie auf der Vorlage) */
const rainy = () => fcOf([...day24((h) => (h <= 9 ? WET : {})), ...day24(() => ({}), NEXT)], { code: 61, raining: true });

describe("Lage jetzt – ehrlich", () => {
  it("gemessener Regen = Regen; Regen-Code ohne echte Regenstunde = Bewölkt", () => {
    expect(kachelLage(rainy(), TODAY, 8)).toBe("regen");
    expect(kachelLage(fcOf(day24(), { code: 61, measured: true }), TODAY, 8)).toBe("bewoelkt");
    expect(kachelLage(fcOf(day24(), { code: 0 }), TODAY, 12)).toBe("sonnig");
    expect(kachelLage(fcOf(day24(), { code: 2 }), TODAY, 12)).toBe("sonnig");
  });

  it("ohne Messung zählt die Stunde jetzt (≥ 0,2 mm UND ≥ 50 %); eben aufgehört = trocken", () => {
    expect(rainingNow(fcOf(day24((h) => (h === 8 ? WET : {}))), TODAY, 8)).toBe(true);
    expect(rainingNow(fcOf(day24((h) => (h === 8 ? { mm: 0.1, rain: 90 } : {}))), TODAY, 8)).toBe(false);
    expect(rainingNow(fcOf(day24((h) => (h === 8 ? { mm: 1, rain: 40 } : {}))), TODAY, 8)).toBe(false);
    expect(rainingNow(fcOf(day24((h) => (h === 8 ? WET : {})), { stopped: true }), TODAY, 8)).toBe(false);
  });

  it("Schnee und Gewitter nur, wenn es wirklich nass ist", () => {
    expect(kachelLage(fcOf(day24((h) => (h === 8 ? { ...WET, code: 73 } : {})), { code: 73 }), TODAY, 8)).toBe("schnee");
    expect(kachelLage(fcOf(day24((h) => (h === 8 ? { ...WET, code: 95 } : {})), { code: 95 }), TODAY, 8)).toBe("gewitter");
    expect(kachelLage(fcOf(day24(), { code: 95, measured: true }), TODAY, 8)).toBe("bewoelkt");
  });
});

describe("Die eine Zeile", () => {
  it("„Regen · ab 10 Uhr trocken“ (M/L) bzw. „ab 10 trocken“ (S)", () => {
    expect(kachelZeile(rainy(), TODAY, 8)).toEqual({ wort: "Regen", rest: "ab 10 Uhr trocken" });
    expect(kachelZeile(rainy(), TODAY, 8, true)).toEqual({ wort: "Regen", rest: "ab 10 trocken" });
  });

  it("Regen bis Mitternacht: nur „Regen“ – nichts Erfundenes", () => {
    expect(kachelZeile(fcOf(day24(() => WET), { raining: true }), TODAY, 8)).toEqual({ wort: "Regen", rest: null });
  });

  it("Niesel, später Regen, Schnee später, eben aufgehört, trocken", () => {
    expect(kachelZeile(fcOf(day24((h) => (h <= 9 ? { ...WET, code: 53 } : {})), { code: 53, raining: true }), TODAY, 8).wort).toBe("Niesel");
    expect(kachelZeile(fcOf(day24((h) => (h === 15 ? WET : {})), { code: 3, measured: true }), TODAY, 8)).toEqual({ wort: "Bewölkt", rest: "ab 15 Uhr Regen" });
    expect(kachelZeile(fcOf(day24((h) => (h === 15 ? { ...WET, code: 73 } : {})), { code: 3, measured: true }), TODAY, 8).rest).toBe("ab 15 Uhr Schnee");
    expect(kachelZeile(fcOf(day24(), { code: 3, stopped: true }), TODAY, 8)).toEqual({ wort: "Bewölkt", rest: "Regen hat aufgehört" });
    expect(kachelZeile(fcOf(day24(), { code: 0 }), TODAY, 8)).toEqual({ wort: "Sonnig", rest: "bleibt trocken" });
  });
});

describe("Wind jetzt und 2-Stunden-Überblick", () => {
  it("Wind der Stunde jetzt; ältere Daten ohne Wind: null", () => {
    expect(kachelWind(fcOf(day24((h) => (h === 8 ? { wind: 32, gust: 85, dir: 270 } : { wind: 5 }))), TODAY, 8)).toEqual({ speed: 32, gust: 85, dir: 270 });
    const old = day24().map((h) => ({ ...h, wind: undefined, dir: undefined }));
    expect(kachelWind(fcOf(old), TODAY, 8)).toBeNull();
  });

  it("ab jetzt alle 2 Stunden: 8 · 10 · 12 · 14 mit Symbol, Temperatur, Regen-%", () => {
    const s = zweiStunden(rainy(), TODAY, 8);
    expect(s.map((x) => x.hour)).toEqual([8, 10, 12, 14]);
    expect(s[0]).toMatchObject({ code: 61, temp: 11, rain: 80, night: false });
  });

  it("über Mitternacht und nachts mit Mond", () => {
    const s = zweiStunden(rainy(), TODAY, 21);
    expect(s.map((x) => x.hour)).toEqual([21, 23, 1, 3]);
    expect(s.every((x) => x.night)).toBe(true);
    expect(zweiStunden(rainy(), "2026-12-01", 8)).toEqual([]);
  });
});

describe("Hintergrund je Wetter, Tag/Nacht und Look", () => {
  it.each([
    ["regen", "tropfen"],
    ["bewoelkt", "wolken"],
    ["sonnig", "sonne"],
    ["schnee", "punkte"],
    ["gewitter", "blitz"],
  ] as const)("%s: Tag mit Muster %s, nachts dunklere Variante", (lage, muster) => {
    expect(kachelHimmel(lage, false, "farbig")).toEqual({ key: lage, muster, symbol: false, ton: null });
    expect(kachelHimmel(lage, true, "farbig").key).toBe(`${lage}-nacht`);
    expect(kachelHimmel(lage, true, "farbig").muster).toBe(lage === "sonnig" ? "mond" : muster);
  });

  it("Schlicht: weiß, kein Muster, nur das Symbol farbig – Tag wie Nacht", () => {
    for (const nacht of [false, true]) expect(kachelHimmel("regen", nacht, "schlicht")).toEqual({ key: "schlicht", muster: null, symbol: true, ton: null });
  });

  it("ab „Stürmisch“ leicht warm, ab „Sturm“ rötlich (beide Looks)", () => {
    expect(kachelHimmel("bewoelkt", false, "farbig", { speed: 61, gust: 90, dir: null }).ton).toBeNull();
    expect(kachelHimmel("bewoelkt", false, "farbig", { speed: 62, gust: 0, dir: null }).ton).toBe("warm");
    expect(kachelHimmel("bewoelkt", false, "schlicht", { speed: 75, gust: 0, dir: null }).ton).toBe("sturm");
  });

  it("zehn Varianten, jede mit eigener Regel im Stilblatt", () => {
    expect(HIMMEL_KEYS).toHaveLength(10);
    const css = readFileSync("src/app/globals.css", "utf8");
    for (const k of [...HIMMEL_KEYS, "schlicht"]) expect(css, k).toContain(`.wx-himmel[data-himmel="${k}"]`);
    // still: keine Animation in der Kachel und im Muster
    for (const f of ["WeatherTile", "HimmelMuster"]) expect(readFileSync(`src/components/wetter/${f}.tsx`, "utf8"), f).not.toMatch(/animate|animation|<animate/);
  });
});

/** WCAG-Kontrast zweier Hex-Farben */
function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
/** Tönung `share` von `top` über `base` gemischt (wie color-mix … transparent über dem Verlauf) */
function mix(top: string, base: string, share: number) {
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(ch(top, i) * share + ch(base, i) * (1 - share)).toString(16).padStart(2, "0")).join("")}`;
}

describe("Kontrast: Schrift auf jedem Himmel ≥ 4,5:1 (hell, dunkel, getönt)", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const block = (start: string) => css.slice(css.indexOf(start), css.indexOf("}", css.indexOf(start)));
  const tokens = (text: string) => Object.fromEntries([...text.matchAll(/--app-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2].toLowerCase()]));
  const light = tokens(block(":root {"));
  const themes = { hell: light, dunkel: { ...light, ...tokens(block(':root[data-theme="nacht"] {')) }, auto: { ...light, ...tokens(block(':root[data-theme="auto"] {')) } };
  const share = (ton: string) => Number(css.match(new RegExp(`data-ton="${ton}"\\] \\{ --sky-tint: color-mix\\(in srgb, var\\(--app-sky-${ton}\\) (\\d+)%`))![1]) / 100;

  it.each(Object.entries(themes))("%s: Schrift und leise Schrift auf a und b – auch warm/sturm getönt", (_, t) => {
    for (const k of HIMMEL_KEYS)
      for (const bg of [t[`sky-${k}-a`], t[`sky-${k}-b`]]) {
        expect(bg, k).toBeTruthy();
        for (const ton of ["", "warm", "sturm"]) {
          const g = ton ? mix(t[`sky-${ton}`], bg, share(ton)) : bg;
          for (const fg of ["ink", "soft"]) expect(contrast(t[`sky-${k}-${fg}`], g), `${k} ${fg} ${ton}`).toBeGreaterThanOrEqual(4.5);
        }
      }
  });

  it.each(Object.entries(themes))("%s: Schlicht – Schrift auf der Kachel-Fläche (auch getönt); Böen-Schild orange mit dunkler Schrift", (_, t) => {
    for (const ton of ["", "warm", "sturm"]) {
      const g = ton ? mix(t[`sky-${ton}`], t.surface, share(ton)) : t.surface;
      expect(contrast(t.ink, g)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.muted, g), ton).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(t["boeen-ink"], t.windsack)).toBeGreaterThanOrEqual(4.5);
  });
});

// --- S/M/L als echte Ausgabe (ohne Browser) ---------------------------------
const store = vi.hoisted(() => ({ forecast: null as Forecast | null }));
vi.mock("@/lib/wetter/client", () => ({ useForecast: () => ({ forecast: store.forecast, stale: false, failed: false, place: "Eutin" }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown }) => createElement("a", { href, ...rest }, children as never) }));

async function tile(size: "S" | "M" | "L", fc: Forecast, minutes = 8 * 60, look: "farbig" | "schlicht" = "farbig") {
  store.forecast = fc;
  const { WeatherTile } = await import("@/components/wetter/WeatherTile");
  return renderToStaticMarkup(createElement(WeatherTile, { size, today: TODAY, minutes, look, half: size === "S" }));
}
const stormy = () => fcOf([...day24((h) => (h <= 9 ? { ...WET, wind: 32, gust: 85 } : {})), ...day24(() => ({}), NEXT)], { code: 61, raining: true });

describe("Kachel S/M/L", () => {
  it("M wie Vorlage: Ort, Temperatur, Windsack, ↑/↓, Zeile, Wind in Worten mit Böen, 4 Stunden", async () => {
    const html = await tile("M", stormy(), 9 * 60);
    expect(html).toContain("Wetter · Eutin");
    expect(html).toContain('data-himmel="regen"');
    expect(html).toContain('data-muster="tropfen"');
    expect(html).toContain('data-windsack="frisch"');
    expect(html).toMatch(/↑ \d+°/);
    expect(html).toContain('Regen</span><span class="wx-soft"> · ab 10 Uhr trocken');
    expect(html).toContain('Frischer Wind</span><span class="wx-soft font-semibold"> · 32 km/h aus West</span><span class="wx-soft font-semibold"> · </span><span class="wx-boeen rounded-full px-1.5 py-px font-extrabold tabular-nums">Böen 85');
    expect((html.match(/data-stunden/g) ?? []).length).toBe(1);
    expect([...html.matchAll(/tabular-nums">(\d+)<\/span>/g)].map((m) => m[1])).toEqual(["9", "11", "13", "15"]);
    expect(html).not.toContain("Nächste Tage");
  });

  it("S: Temperatur, Windsack und EINE Zeile – kein Stunden-Überblick, kein Wind-Satz", async () => {
    const html = await tile("S", stormy(), 9 * 60);
    expect(html).toContain('data-windsack="frisch"');
    expect(html).toContain("ab 10 trocken");
    expect(html).not.toContain("data-stunden");
    expect(html).not.toContain("data-wind-zeile");
    expect(html).not.toContain("↑");
  });

  it("L: dazu die nächsten Tage", async () => {
    const html = await tile("L", stormy());
    expect(html).toContain("data-stunden");
    expect(html).toContain("Nächste Tage");
  });

  it("Böen unter 60: kein Zusatz; nachts dunkler; Schlicht ohne Muster mit Symbol", async () => {
    const calm = fcOf(day24((h) => ({ wind: 22, gust: 40, code: h > 20 ? 0 : 3 })), { code: 0 });
    const night = await tile("M", calm, 22 * 60);
    expect(night).toContain('data-himmel="sonnig-nacht"');
    expect(night).toContain('data-muster="mond"');
    expect(night).not.toContain("Böen");
    expect(night).toContain("Mäßiger Wind");
    const plain = await tile("M", calm, 12 * 60, "schlicht");
    expect(plain).toContain('data-himmel="schlicht"');
    expect(plain).not.toContain("data-muster");
    expect(plain).toMatch(/<svg viewBox="0 0 48 48" class="shrink-0 h-11 w-11"/);
  });

  it("Sturm: Karte getönt, Windsack rot, Windstriche", async () => {
    const html = await tile("M", fcOf(day24(() => ({ wind: 80, gust: 110 }))));
    expect(html).toContain('data-ton="sturm"');
    expect(html).toContain('data-windsack="sturm"');
    expect(html).toContain("var(--app-windsack-rot)");
    expect((html.match(/data-windstrich/g) ?? []).length).toBe(3);
  });
});
