// Wetter-Kachel (Tafel 87, Tafel 120 „mit Himmel“): ehrliche Lage und Zeile,
// kurzer Satz (≤ 22 Zeichen), Szene je Wetterlage, Wind jetzt,
// 2-Stunden-Überblick, Hintergrund je Wetter/Tag/Nacht/Look, Kontrast jeder
// Himmel-Variante (WCAG ≥ 4,5:1), XS/S/M als echte Ausgabe.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildDays, type Forecast, type ForecastHour } from "@/lib/wetter/forecast";
import { HIMMEL_KEYS, SATZ_MAX, SZENEN, kachelHimmel, kachelLage, kachelSatz, kachelSzene, kachelWind, kachelZeile, rainingNow, szeneAus, zweiStunden, type WetterSzene } from "@/lib/wetter/kachel";

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
  it.each(["regen", "bewoelkt", "sonnig", "schnee", "gewitter"] as const)("%s: Tag und nachts die dunklere Variante", (lage) => {
    expect(kachelHimmel(lage, false, "farbig")).toEqual({ key: lage, ton: null });
    expect(kachelHimmel(lage, true, "farbig").key).toBe(`${lage}-nacht`);
  });

  it("Schlicht: weiß – Tag wie Nacht", () => {
    for (const nacht of [false, true]) expect(kachelHimmel("regen", nacht, "schlicht")).toEqual({ key: "schlicht", ton: null });
  });

  it("ab „Stürmisch“ leicht warm, ab „Sturm“ rötlich (beide Looks)", () => {
    expect(kachelHimmel("bewoelkt", false, "farbig", { speed: 61, gust: 90, dir: null }).ton).toBeNull();
    expect(kachelHimmel("bewoelkt", false, "farbig", { speed: 62, gust: 0, dir: null }).ton).toBe("warm");
    expect(kachelHimmel("bewoelkt", false, "schlicht", { speed: 75, gust: 0, dir: null }).ton).toBe("sturm");
  });

  it("zehn Varianten, jede mit eigener Regel im Stilblatt; Kachel und Szene still", () => {
    expect(HIMMEL_KEYS).toHaveLength(10);
    const css = readFileSync("src/app/globals.css", "utf8");
    for (const k of [...HIMMEL_KEYS, "schlicht"]) expect(css, k).toContain(`.wx-himmel[data-himmel="${k}"]`);
    for (const f of ["WeatherTile", "WetterSzene"]) expect(readFileSync(`src/components/wetter/${f}.tsx`, "utf8"), f).not.toMatch(/animate|animation|<animate/);
  });
});

describe("Szene je Wetterlage (Tafel 120)", () => {
  const W = (speed: number, gust = 0) => ({ speed, gust, dir: 270 });
  it("acht Szenen: Sonne, leicht bewölkt, bewölkt, Regen, Gewitter, Schnee, Wind, Nacht", () => {
    expect(SZENEN).toEqual(["sonne", "leicht", "wolken", "regen", "gewitter", "schnee", "wind", "nacht"]);
    expect(szeneAus("sonnig", 0, false, null)).toBe("sonne");
    expect(szeneAus("sonnig", 2, false, null)).toBe("leicht");
    expect(szeneAus("bewoelkt", 3, false, null)).toBe("wolken");
    expect(szeneAus("regen", 61, false, null)).toBe("regen");
    expect(szeneAus("gewitter", 95, false, null)).toBe("gewitter");
    expect(szeneAus("schnee", 73, false, null)).toBe("schnee");
    expect(szeneAus("sonnig", 0, true, null)).toBe("nacht");
    expect(szeneAus("bewoelkt", 3, true, null)).toBe("nacht");
  });
  it("nass geht vor (auch nachts), Wind nur ab „Frischer Wind“ oder Böen ≥ 60 (`windZeigen`)", () => {
    expect(szeneAus("regen", 61, true, W(80))).toBe("regen");
    expect(szeneAus("bewoelkt", 3, false, W(28, 59))).toBe("wolken");
    expect(szeneAus("bewoelkt", 3, false, W(29))).toBe("wind");
    expect(szeneAus("sonnig", 0, false, W(20, 60))).toBe("wind");
    expect(szeneAus("sonnig", 0, true, W(40))).toBe("wind");
    expect(kachelSzene(rainy(), TODAY, 8, false)).toBe("regen");
  });
  it("jede Szene hat eigene Formen, Farben nur über Tokens (hell, dunkel, auto)", () => {
    const src = readFileSync("src/components/wetter/WetterSzene.tsx", "utf8");
    for (const sz of SZENEN) expect(src, sz).toContain(`case "${sz}":`);
    expect(src).not.toMatch(/#[0-9a-f]{3,6}/i);
    const css = readFileSync("src/app/globals.css", "utf8");
    for (const t of ["wolke", "wolke-2", "wind", "stern", "sonne", "tropfen", "mond", "wolke-schlicht"]) expect(css.match(new RegExp(`--app-szene-${t}:`, "g")) ?? [], t).toHaveLength(3);
    expect(css).toMatch(/\.wx-himmel\[data-himmel="schlicht"\] \.wx-szene \{\s*opacity: 0\.6/);
  });
});

describe("Der kurze Satz (≤ 22 Zeichen)", () => {
  it("später nass, jetzt nass, eben aufgehört, Wind, nachts, sonst trocken", () => {
    expect(kachelSatz(fcOf(day24((h) => (h === 15 ? WET : { wind: 10 })), { code: 3, measured: true }), TODAY, 8, false)).toBe("ab 15 Uhr Regen");
    expect(kachelSatz(fcOf(day24((h) => (h === 18 ? { ...WET, code: 95 } : { wind: 10 })), { code: 3, measured: true }), TODAY, 8, false)).toBe("ab 18 Uhr Gewitter");
    expect(kachelSatz(fcOf(day24((h) => (h === 15 ? { ...WET, code: 73 } : { wind: 10 })), { code: 3, measured: true }), TODAY, 8, false)).toBe("ab 15 Uhr Schnee");
    expect(kachelSatz(rainy(), TODAY, 8, false)).toBe("Regen bis 10 Uhr");
    expect(kachelSatz(fcOf(day24(() => WET), { raining: true }), TODAY, 8, false)).toBe("Regen");
    expect(kachelSatz(fcOf(day24(() => ({ wind: 10 })), { code: 3, stopped: true }), TODAY, 8, false)).toBe("Regen hat aufgehört");
    expect(kachelSatz(fcOf(day24(() => ({ wind: 30 }))), TODAY, 8, false)).toBe("Frischer Wind");
    expect(kachelSatz(fcOf(day24(() => ({ wind: 10 })), { code: 0 }), TODAY, 23, true)).toBe("klar");
    expect(kachelSatz(fcOf(day24(() => ({ wind: 10 })), { code: 3 }), TODAY, 23, true)).toBe("bewölkt");
    expect(kachelSatz(fcOf(day24(() => ({ wind: 10 })), { code: 0 }), TODAY, 8, false)).toBe("bleibt sonnig");
    expect(kachelSatz(fcOf(day24(() => ({ wind: 10 })), { code: 2 }), TODAY, 8, false)).toBe("bleibt trocken");
    expect(kachelSatz(fcOf(day24(() => ({ wind: 10 })), { code: 3 }), TODAY, 8, false)).toBe("bewölkt");
  });
  it("nie länger als 22 Zeichen – für jede Stunde, jedes Wetter, jeden Wind", () => {
    for (const code of [0, 2, 3, 45, 53, 61, 73, 95])
      for (const wind of [5, 30, 70, 110])
        for (const h of [0, 8, 15, 23]) {
          const fc = fcOf(day24((x) => ({ wind, code, ...(x % 5 === 0 ? WET : {}) })), { code, raining: code >= 61 });
          expect(kachelSatz(fc, TODAY, h, h > 20).length).toBeLessThanOrEqual(SATZ_MAX);
        }
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

async function tile(size: "XS" | "S" | "M", fc: Forecast, minutes = 8 * 60, look: "farbig" | "schlicht" = "farbig") {
  store.forecast = fc;
  const { WeatherTile } = await import("@/components/wetter/WeatherTile");
  return renderToStaticMarkup(createElement(WeatherTile, { size, today: TODAY, minutes, look }));
}
const stormy = () => fcOf([...day24((h) => (h <= 9 ? { ...WET, wind: 32, gust: 85 } : {})), ...day24(() => ({}), NEXT)], { code: 61, raining: true });

describe("Kachel XS/S/M (Tafel 120)", () => {
  it("M: Ort, Temperatur, ↑/↓, Satz, Szene rechts oben, 4 Stunden – Text links mit Platz für die Szene", async () => {
    const html = await tile("M", stormy(), 9 * 60);
    expect(html).toContain("Wetter · Eutin");
    expect(html).toContain('data-himmel="regen"');
    expect(html).toContain('data-szene="regen"');
    expect(html).toMatch(/↑ \d+° ↓ \d+°/);
    expect(html).toContain(">Regen bis 10 Uhr<");
    expect(html).toContain("pr-24");
    expect((html.match(/data-stunden/g) ?? []).length).toBe(1);
    expect([...html.matchAll(/leading-tight">(\d+)<\/span>/g)].map((m) => m[1])).toEqual(["9", "11", "13", "15"]);
    expect(html).not.toContain("data-windsack");
  });

  it("S: Temperatur, Satz und ↑/↓ – kein Stunden-Überblick", async () => {
    const html = await tile("S", stormy(), 9 * 60);
    expect(html).toContain('data-groesse="S"');
    expect(html).toContain(">Regen bis 10 Uhr<");
    expect(html).toMatch(/↑ \d+° ↓ \d+°/);
    expect(html).not.toContain("data-stunden");
  });

  it("XS: Temperatur groß, darunter EIN kurzer Satz – sonst nichts", async () => {
    const html = await tile("XS", stormy(), 9 * 60);
    expect(html).toContain('data-groesse="XS"');
    expect(html).toContain("text-[26px]");
    expect(html).toContain(">Regen bis 10 Uhr<");
    expect(html).not.toContain("↑");
    expect(html).not.toContain("data-stunden");
  });

  it("Wind: unter „Frischer Wind“ keine Wind-Szene und kein Wind-Text; ab da die Szene statt des Windsacks", async () => {
    const still = await tile("M", fcOf(day24(() => ({ wind: 22, gust: 40 }))));
    expect(still).not.toContain('data-szene="wind"');
    expect(still).not.toContain("Wind");
    const frisch = await tile("M", fcOf(day24(() => ({ wind: 30, gust: 45 }))));
    expect(frisch).toContain('data-szene="wind"');
    expect(frisch).toContain(">Frischer Wind<");
    expect(frisch).not.toContain("data-windsack");
    const boeen = await tile("S", fcOf(day24(() => ({ wind: 20, gust: 65 }))));
    expect(boeen).toContain('data-szene="wind"');
    expect(boeen).toContain("Böen bis 65 Kilometer pro Stunde");
  });

  it("Sturm: Karte getönt", async () => {
    const html = await tile("M", fcOf(day24(() => ({ wind: 80, gust: 110 }))));
    expect(html).toContain('data-ton="sturm"');
    expect(html).toContain(">Sturm<");
  });

  it("Schlicht: weiß, Szene kleiner (und über das Stilblatt blasser)", async () => {
    const calm = fcOf(day24(() => ({ wind: 10, gust: 20 })), { code: 0 });
    const plain = await tile("M", calm, 12 * 60, "schlicht");
    expect(plain).toContain('data-himmel="schlicht"');
    expect(plain).toMatch(/wx-szene[^"]*scale-75/);
    expect(await tile("M", calm, 12 * 60)).not.toMatch(/wx-szene[^"]*scale-75/);
  });

  // Jede Wetterlage × XS/S/M × Tag/Nacht × Farbig/Schlicht (hell/dunkel über die Tokens oben)
  const LAGEN: [string, Forecast][] = [
    ["sonne", fcOf(day24(() => ({ wind: 8, code: 0 })), { code: 0 })],
    ["leicht", fcOf(day24(() => ({ wind: 8, code: 2 })), { code: 2 })],
    ["wolken", fcOf(day24(() => ({ wind: 8 })), { code: 3 })],
    ["regen", fcOf(day24(() => ({ ...WET, wind: 8 })), { code: 61, raining: true })],
    ["gewitter", fcOf(day24(() => ({ ...WET, code: 95, wind: 8 })), { code: 95, raining: true })],
    ["schnee", fcOf(day24(() => ({ ...WET, code: 73, wind: 8 })), { code: 73, raining: true })],
    ["wind", fcOf(day24(() => ({ wind: 35 })), { code: 3 })],
  ];
  it.each(LAGEN.flatMap(([n, fc]) => (["XS", "S", "M"] as const).flatMap((size) => [false, true].flatMap((nacht) => (["farbig", "schlicht"] as const).map((look) => [n, fc, size, nacht, look] as const)))))(
    "%s · %s · Nacht %s · %s",
    async (name, fc, size, nacht, look) => {
      const html = await tile(size, fc, nacht ? 23 * 60 : 12 * 60, look);
      const szene = (nacht && ["sonne", "leicht", "wolken"].includes(name) ? "nacht" : name) as WetterSzene;
      expect(html).toContain(`data-szene="${szene}"`);
      expect(html).toContain(`data-groesse="${size}"`);
      expect(html).toContain(look === "schlicht" ? 'data-himmel="schlicht"' : `data-himmel="${kachelLage(fc, TODAY, nacht ? 23 : 12)}${nacht ? "-nacht" : ""}"`);
      const satz = html.match(/data-wetter-zeile="true">([^<]+)</)![1];
      expect(satz.length).toBeLessThanOrEqual(SATZ_MAX);
      // Text nie unter der Zeichnung: Satz und Temperatur stehen links in eigenem Block, nie absolut
      expect(html.indexOf("wx-szene")).toBeLessThan(html.indexOf("data-wetter-zeile"));
    },
  );
});

// Durchklick wetterSzenen/rasterHoehen (nach Rebase): S-Temperatur lag mit voller
// Breite unter der Szene, M quoll auf dem iPhone SE 3 px über
describe("Feste Fläche: S und M passen", () => {
  it("S: Temperatur nur so breit wie die Zahl (nie unter der Szene)", async () => {
    const html = await tile("S", stormy(), 9 * 60);
    expect(html).toMatch(/class="relative mt-1 self-start text-\[40px\][^"]*">-?\d+°</);
  });
  it("M: Satz und Stunden eng genug für 168 px (iPhone SE)", async () => {
    const html = await tile("M", stormy(), 9 * 60);
    expect(html).toMatch(/class="mt-0\.5 truncate[^"]*" data-wetter-zeile/);
    expect(html).toMatch(/wx-linie relative mt-auto grid grid-cols-4 border-t pt-1"/);
  });
});
