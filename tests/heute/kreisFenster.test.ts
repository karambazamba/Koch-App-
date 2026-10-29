// Fenster der Mini-Kreise (A-050, Tafel 137/2–3), Einkauf M mit Läden
// nebeneinander (Nachtrag 2, Tafel 140 unten) und Pinnwand-Korkrahmen
// (Nachtrag 3, Tafel 141 A).
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { at, fakeWindow, noBrowser, termin } from "../helpers";
import { EMPTY_SPORT, createTraining, type SportState } from "@/lib/sport/model";
import { plannedEntry } from "@/lib/sport/plan";
import { stempelkarte } from "@/lib/sport/stempel";
import { PLAN_ZEITEN, planenText, sportChips, wochenTage, wochenUnterzeile } from "@/lib/sport/wochePlanen";
import { ladenChips, textBreite } from "@/lib/einkauf/kacheln/ladenChips";
import { TIMER_FELDER, TIMER_UNTERZEILE, timerMiaHinweis } from "@/components/timer/TimerFenster";

const TODAY = "2026-10-21"; // Mittwoch
const MO = "2026-10-19";
const MITTAG = 12 * 60;
const run = (date: string, sport = "laufen") => createTraining({ sport, minutes: 30, date });
const state = (trainings: ReturnType<typeof run>[], goal: number | null = 2): SportState => ({ ...EMPTY_SPORT, goal, trainings });
const plan = (date: string, start = "08:00", title = "Laufen") => termin({ title, date, start, end: "09:00", label: "Sport" });

beforeEach(() => at(`${TODAY}T12:00`));
afterEach(() => noBrowser());

describe("Sport-Fenster (Tafel 137/2)", () => {
  it("Unterzeile „Ziel 2× · Mo geschafft, Do geplant“ – ohne Ziel, frei, geschafft", () => {
    const k = stempelkarte(state([run(MO)]), [plan("2026-10-22")], TODAY, MITTAG);
    expect(wochenUnterzeile(k, TODAY)).toBe("Ziel 2× · Mo geschafft, Do geplant");
    expect(wochenUnterzeile(stempelkarte(state([], null), [], TODAY, MITTAG), TODAY)).toBe("Ohne Ziel · Diese Woche ist frei");
    expect(wochenUnterzeile(stempelkarte(state([run(MO), run(TODAY)]), [], TODAY, MITTAG), TODAY)).toBe("Ziel 2× · Woche geschafft");
    // Kein Druck: nie „noch offen“, „fehlt“
    expect(wochenUnterzeile(k, TODAY)).not.toMatch(/offen|fehlt|noch/);
  });

  it("Woche Mo–So: geschafft voll, geplant gestrichelt, frei = Plus, Vergangenes still", () => {
    const tage = wochenTage(state([run(MO, "volleyball")]), [plan("2026-10-22")], TODAY, MO);
    expect(tage.map((t) => `${t.kurz}:${t.art}${t.vorbei ? ":vorbei" : ""}`)).toEqual(["Mo:geschafft:vorbei", "Di:frei:vorbei", "Mi:frei", "Do:geplant", "Fr:frei", "Sa:frei", "So:frei"]);
    expect(tage[0].sport).toBe("volleyball");
    expect(tage[3].sport).toBe("laufen");
  });

  it("Chips: eigene Sportarten zuerst; Uhrzeiten 8:00 · 10:00 · 18:00 + andere; Knopf „Sa 10:00 Volleyball planen“", () => {
    expect(sportChips(["volleyball"], ["Tennis"], ["laufen", "fitness", "rad"])).toEqual(["volleyball", "Tennis", "laufen", "fitness"]);
    expect(PLAN_ZEITEN).toEqual(["08:00", "10:00", "18:00"]);
    expect(planenText("2026-10-24", "10:00", "volleyball", TODAY)).toBe("Sa 10:00 Volleyball planen");
    expect(planenText(TODAY, "18:00", "laufen", TODAY)).toBe("Heute 18:00 Laufen planen");
  });

  it("planen legt einen Termin im Raum „Ich“ an (Etikett Sport, Erinnerung 30 Min)", () => {
    const e = plannedEntry({ sport: "volleyball", date: "2026-10-24", start: "10:00", minutes: 60, weekly: false }, "p-felix", "ich")!;
    expect(e).toMatchObject({ typ: "termin", raum: "ich", data: { title: "Volleyball", date: "2026-10-24", start: "10:00", end: "11:00", label: "Sport", reminder: "30" } });
    // Standard bleibt Familie (Sport-Seite, Mia)
    expect(plannedEntry({ sport: "laufen", date: TODAY, start: "18:00", minutes: 45, weekly: false }, null)!.raum).toBe("familie");
    const fenster = readFileSync("src/components/sport/SportFenster.tsx", "utf8");
    expect(fenster).toMatch(/weekly: false \}, me, "ich"\)/);
    expect(fenster).toContain("Schon trainiert? Eintragen");
    expect(fenster).toContain("Alles zu Sport");
    expect(fenster).toContain('titel="Sport · diese Woche"');
  });

  it("Mia nutzt Sport → Baustein an und Sport-Kreis oben (keine Kachel)", async () => {
    fakeWindow({ "wasgibts.funktionen": JSON.stringify({ version: 7, on: [], launch: true, imHaus: true }) });
    vi.resetModules();
    const { zeigeSportKreis, SPORT_OBEN } = await import("@/lib/heute/sportKreis");
    const home = await import("@/lib/core/homeLayout");
    const f = await import("@/lib/core/features");
    home.saveKreise(home.loadKreise().map((k) => (k.id === "sport" ? { ...k, an: false } : k)));
    expect(zeigeSportKreis()).toBe(true);
    expect(f.featureOn("sport")).toBe(true);
    expect(home.loadKreise().find((k) => k.id === "sport")?.an).toBe(true);
    expect(home.loadHomeTiles().find((t) => t.id === "sport")?.visible).toBe(false);
    expect(zeigeSportKreis()).toBe(false);
    expect(SPORT_OBEN).toBe("Sport steht jetzt oben als Kreis.");
  });

  it("erster Start: Sport für alle an, Kreise in Standard-Reihenfolge (Tafel 140)", async () => {
    fakeWindow();
    vi.resetModules();
    const { startFresh } = await import("@/lib/einstellungen/welcomeStore");
    const f = await import("@/lib/core/features");
    const home = await import("@/lib/core/homeLayout");
    home.saveKreise([{ id: "waslos", an: false }]);
    startFresh("farbig", "familie");
    expect(f.featureOn("sport")).toBe(true);
    expect(home.loadKreise().every((k) => k.an)).toBe(true);
    expect(home.loadKreise()[0].id).toBe("sport");
  });
});

describe("Timer-Fenster (Tafel 137/3)", () => {
  it("6 Felder 3 · 5 · 10 · 15 · 20 Min · Eigene, ein Tipp startet sofort", () => {
    expect(TIMER_FELDER).toEqual([3, 5, 10, 15, 20]);
    expect(TIMER_UNTERZEILE).toBe("Läuft weiter, auch wenn du die App schließt");
    expect(timerMiaHinweis("Mia")).toBe("Oder sag Mia: „Timer 12 Minuten für die Eier“");
    const src = readFileSync("src/components/timer/TimerFenster.tsx", "utf8");
    expect(src).toMatch(/onClick=\{\(\) => start\(m\)\}/);
    expect(src).toContain("Eigene");
    expect(src).toMatch(/von \$\{formatLeft\(timer\.durationMs\)\}/);
    // Jetzt-Karte und Timer-Kachel öffnen dasselbe Fenster
    expect(readFileSync("src/components/heute/TodayPage.tsx", "utf8")).toMatch(/<TimerFenster onClose/);
    expect(readFileSync("src/components/timer/TimerTile.tsx", "utf8")).toMatch(/<TimerFenster onClose/);
  });
});

describe("Einkauf M: Läden nebeneinander (Tafel 140 unten)", () => {
  const row = (shop: string, count: number) => ({ shop, count, names: Array.from({ length: count }, (_, i) => `${shop}${i}`) });
  // Innenbreite der breiten Kachel: iPhone SE 375 → 343 − 28, Pixel 7 412 → 380 − 28, ganz schmal 320 → 288 − 28
  const SE = 315;
  const PIXEL = 352;
  const SE1 = 260;

  it("bis zu 3 Chips gleich breit, meiste zuerst; Edeka/Rewe/Rossmann passen ganz (auch auf dem SE)", () => {
    for (const breite of [SE, PIXEL]) {
      const { chips, px } = ladenChips([row("Rossmann", 4), row("Edeka", 3), row("Rewe", 7)], breite);
      expect(chips.map((c) => (c.art === "laden" ? c.label : "weitere"))).toEqual(["Rossmann", "Edeka", "Rewe"]);
      expect(px).toBeGreaterThanOrEqual(13);
    }
  });

  it("Tafel 148 B: 4 Läden alle als 2 × 2, ab 5 das vierte Feld „+n weitere“; meiste zuerst", () => {
    for (const breite of [SE1, SE, PIXEL]) {
      const vier = ladenChips([row("Lidl", 3), row("Rewe", 8), row("Kaufland", 2), row("Edeka", 5)].sort((a, b) => b.count - a.count), breite);
      expect(vier.spalten).toBe(2);
      expect(vier.chips.map((c) => (c.art === "laden" ? `${c.label} ${c.count}` : "weitere"))).toEqual(["Rewe 8", "Edeka 5", "Lidl 3", "Kaufland 2"]);
      const fuenf = ladenChips(["Edeka", "Rewe", "Lidl", "Aldi", "Penny"].map((s, i) => row(s, 5 - i)), breite);
      expect(fuenf.spalten).toBe(2);
      expect(fuenf.chips.map((c) => (c.art === "laden" ? c.label : `+${c.anzahl} weitere`))).toEqual(["Edeka", "Rewe", "Lidl", "+2 weitere"]);
    }
    // 1–3 Läden bleiben eine Reihe
    expect(ladenChips([row("Rewe", 2), row("Edeka", 1)], SE).spalten).toBe(2);
    expect(ladenChips([row("Rewe", 2)], SE).spalten).toBe(1);
    const src = readFileSync("src/components/einkauf/kacheln/LadenChipReihe.tsx", "utf8");
    expect(src).toMatch(/hoch \? "min-h-11" : "h-10"/);
    expect(src).toMatch(/hoch \? "break-words py-1" : "whitespace-nowrap"/);
  });

  it("drei Läden auf schmalem Handy: nie abgekürzt", () => {
    // Ganz schmal und lange Namen: lieber 2 Chips + „+n weitere“ als „Kaufl.“
    const lang = ladenChips([row("Kaufland", 4), row("Rossmann", 3), row("Wochenmarkt", 2)], SE1);
    expect(lang.chips.every((c) => c.art === "weitere" || !c.label.endsWith("."))).toBe(true);
    expect(lang.chips.length).toBeLessThanOrEqual(3);
    expect(textBreite("Rossmann", 14)).toBeGreaterThan(textBreite("Rewe", 14));
  });

  it("nur Läden mit Sachen; ohne Laden steht als Zeile darunter; leer: „Liste ist leer. Plus tippen oder Mia sagen.“", () => {
    expect(ladenChips([row("Edeka", 0), row("Rewe", 2)], SE).chips).toHaveLength(1);
    const src = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
    expect(src).toMatch(/size === "M" \? \(/);
    expect(src).toContain("<LadenChipReihe");
    expect(src).toContain("<OhneLadenZeile ohne={rows.ohne} />");
    const chip = readFileSync("src/components/einkauf/kacheln/LadenChipReihe.tsx", "utf8");
    expect(chip).toMatch(/whitespace-nowrap/);
    expect(chip).not.toMatch(/truncate|text-ellipsis/);
    expect(chip).toContain("weitere");
  });
});

describe("Pinnwand flach mit Kork-Punkten (Tafel 147 B, ersetzt Korkrahmen 141 A)", () => {
  const css = readFileSync("src/app/globals.css", "utf8");

  it("kein Rahmen, Punkte über die ganze Fläche (9 %, dunkel 6 %), Ecken wie die Kachel; Schlicht ohne Punkte", () => {
    const kork = css.slice(css.indexOf(".korkpunkte {"), css.indexOf("}", css.indexOf(".korkpunkte {")));
    expect(kork).not.toMatch(/border:/);
    expect(kork).toMatch(/border-radius: inherit/);
    expect((kork.match(/radial-gradient/g) ?? []).length).toBe(2);
    expect(css).not.toMatch(/korkrahmen|--app-kork-rand/);
    expect(css).toMatch(/--app-kork-punkt: 9%;/);
    expect((css.match(/--app-kork-punkt: 6%;/g) ?? []).length).toBe(2);
    expect(css).toMatch(/\[data-look="schlicht"\] \.korkpunkte \{ background-image: none; \}/);
  });

  it("Kachel: Punkte nur Deko über die ganze Kachel, Zettel und Plus bleiben; Seite: dieselbe flache Wand", () => {
    const tile = readFileSync("src/components/pinnwand/PinboardTile.tsx", "utf8");
    expect(tile).toMatch(/korkpunkte pointer-events-none absolute inset-0 -z-10" aria-hidden/);
    expect(tile).not.toMatch(/korkrahmen/);
    const view = readFileSync("src/components/pinnwand/PinboardView.tsx", "utf8");
    expect(view).toMatch(/<section className="korkwand"/);
    expect(view).toMatch(/<div className="korkpunkte /);
  });
});
