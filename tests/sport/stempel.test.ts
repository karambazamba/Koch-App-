// Sport als Stempelkarte (A-044, Tafel 132): Felder = Wochenziel (ohne Ziel
// 3), Stempel je Training (fest gedreht), geplant gestrichelt, Bonus-Stempel,
// geschafft nur mit Ziel, Montag neue Karte, „Letzte Wochen“ ohne Serien und
// Summen; Kachel S/M/leer/geschafft ohne Wasserzeichen; Erinnerung am
// Vorabend Standard aus (19:00, proaktiv max. 1/Tag, Ruhe 20–7); Mias Texte.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { at, termin } from "../helpers";
import { EMPTY_SPORT, createTraining, parseSportCommand, type SportState, type TrainingData } from "@/lib/sport/model";
import { gestempeltText, letzteWochen, sportLage, stempelDrehung, stempelkarte, wochenLabel, zielFrageFaellig, ZIEL_FRAGE } from "@/lib/sport/stempel";
import { SPORT_VORABEND_MINUTE, proaktivHeute, sportVorabend } from "@/lib/sport/erinnerung";
import { pushAllowed } from "@/lib/heute/push";
import { DEFAULT_ROUTINE } from "@/lib/heute/tagesablauf";
import type { CalendarEntry } from "@/lib/kalender/model";
import type { Forecast } from "@/lib/wetter/forecast";

const TODAY = "2026-10-21"; // Mittwoch
const MO = "2026-10-19";
const run = (date: string, extra: Partial<TrainingData> = {}) => createTraining({ sport: "laufen", minutes: 30, date, ...extra });
const state = (trainings: ReturnType<typeof run>[], goal: number | null = 2): SportState => ({ ...EMPTY_SPORT, goal, trainings });
const plan = (date: string, start = "08:00", title = "Laufen") => termin({ title, date, start, end: "09:00", label: "Sport" });
const MITTAG = 12 * 60;

beforeEach(() => at(`${TODAY}T12:00`));

describe("Stempelkarte diese Woche", () => {
  it("Ziel 2, ein Training: 1 Stempel + 1 Feld, Sätze „Mo war Laufen.“ / „Do 8:00 ist geplant.“", () => {
    const k = stempelkarte(state([run(MO)]), [plan("2026-10-22")], TODAY, MITTAG);
    expect(k.felder.map((f) => f.art)).toEqual(["stempel", "geplant"]);
    expect(k.felder[0]).toMatchObject({ art: "stempel", stempel: { tag: "MO", sport: "laufen", label: "Laufen" } });
    expect(k.felder[1]).toMatchObject({ art: "geplant", label: "Do 8:00" });
    expect(k).toMatchObject({ ziel: 2, geschafft: false, satz: "Mo war Laufen.", klein: "Do 8:00 ist geplant.", bonus: [] });
    // ohne Plan: freies Feld, kein kleiner Satz
    const frei = stempelkarte(state([run(MO)]), [], TODAY, MITTAG);
    expect(frei.felder.map((f) => f.art)).toEqual(["stempel", "frei"]);
    expect(frei.klein).toBeNull();
  });

  it("zwei Trainings: geschafft (grün), „Woche geschafft.“ / „Mehr ist Bonus.“", () => {
    const k = stempelkarte(state([run(MO), run("2026-10-20", { sport: "volleyball" })]), [], TODAY, MITTAG);
    expect(k.felder.every((f) => f.art === "stempel")).toBe(true);
    expect(k).toMatchObject({ geschafft: true, satz: "Woche geschafft.", klein: "Mehr ist Bonus." });
  });

  it("drittes Training: kleiner Bonus-Stempel daneben", () => {
    const k = stempelkarte(state([run(MO), run("2026-10-20"), run(TODAY, { sport: "yoga" })]), [], TODAY, MITTAG);
    expect(k.felder).toHaveLength(2);
    expect(k.bonus.map((b) => b.stempel.sport)).toEqual(["yoga"]);
    expect(k.geschafft).toBe(true);
  });

  it("Montag: neue Karte (die Trainings der Vorwoche sind „Letzte Wochen“)", () => {
    at("2026-10-26T08:00");
    const s = state([run(MO), run("2026-10-20")]);
    const k = stempelkarte(s, [], "2026-10-26", 8 * 60);
    expect(k.monday).toBe("2026-10-26");
    expect(k.felder.map((f) => f.art)).toEqual(["frei", "frei"]);
    expect(k).toMatchObject({ geschafft: false, satz: "Diese Woche ist noch frei." });
    expect(letzteWochen(s, [], "2026-10-26")[0]).toEqual({ monday: MO, label: "19.–25. Okt", punkte: 2, leer: 0, geschafft: true });
  });

  it("ohne Ziel: 3 Felder, nie „geschafft“, mehr als 3 = Bonus", () => {
    const k = stempelkarte(state([run(MO)], null), [], TODAY, MITTAG);
    expect(k.felder).toHaveLength(3);
    expect(k.ziel).toBeNull();
    const voll = stempelkarte(state([run(MO), run(MO), run(MO), run(TODAY)], null), [], TODAY, MITTAG);
    expect(voll.geschafft).toBe(false);
    expect(voll.bonus).toHaveLength(1);
    expect(voll.satz).toBe("Heute war Laufen.");
  });

  it("Stempel-Drehung fest je Training (aus der ID), −10° bis +10°", () => {
    const t = run(MO);
    const a = stempelkarte(state([t]), [], TODAY, MITTAG).felder[0];
    const b = stempelkarte(state([t]), [], TODAY, MITTAG).felder[0];
    expect(a.art === "stempel" && b.art === "stempel" && a.stempel.dreh === b.stempel.dreh).toBe(true);
    const all = Array.from({ length: 200 }, (_, i) => stempelDrehung(`t-${i}`));
    expect(Math.min(...all)).toBeGreaterThanOrEqual(-10);
    expect(Math.max(...all)).toBeLessThanOrEqual(10);
    expect(new Set(all).size).toBeGreaterThan(10);
  });

  it("vorbei geplantes von heute zählt nicht als geplant (leise weg)", () => {
    const k = stempelkarte(state([]), [plan(TODAY, "08:00")], TODAY, MITTAG);
    expect(k.felder.map((f) => f.art)).toEqual(["frei", "frei"]);
  });
});

describe("Letzte Wochen", () => {
  it("3 Zeilen mit Punkten je Training, gestrichelt bis zum Ziel, „geschafft“; ohne Trainings nichts", () => {
    const s = state([run("2026-10-12"), run("2026-10-07"), run("2026-10-08"), run("2026-10-09")]);
    expect(letzteWochen(s, [], TODAY)).toEqual([
      { monday: "2026-10-12", label: "12.–18. Okt", punkte: 1, leer: 1, geschafft: false },
      { monday: "2026-10-05", label: "5.–11. Okt", punkte: 3, leer: 0, geschafft: true },
      { monday: "2026-09-28", label: "28. Sept–4. Okt", punkte: 0, leer: 2, geschafft: false },
    ]);
    expect(letzteWochen(state([]), [], TODAY)).toEqual([]);
    expect(letzteWochen(state([run("2026-10-12")], null), [], TODAY)[0]).toMatchObject({ leer: 0, geschafft: false });
    expect(wochenLabel("2026-10-26")).toBe("26. Okt–1. Nov");
  });
});

describe("Ziel-Frage", () => {
  it("einmalig beim ersten Training, solange kein Ziel und nicht gefragt", () => {
    expect(zielFrageFaellig(EMPTY_SPORT)).toBe(false);
    expect(zielFrageFaellig(state([run(MO)], null))).toBe(true);
    expect(zielFrageFaellig({ ...state([run(MO)], null), zielGefragt: true })).toBe(false);
    expect(zielFrageFaellig(state([run(MO)], 2))).toBe(false);
    expect(ZIEL_FRAGE).toBe("Wie oft willst du Sport machen? Pro Woche. Dann sag ich dir, wenn die Woche geschafft ist.");
  });
});

describe("Mia", () => {
  it("„War heute Volleyball“ → Training, Bestätigung „Volleyball · heute · gestempelt“", () => {
    expect(parseSportCommand("War heute Volleyball", TODAY)).toEqual({ kind: "add", sport: "volleyball", minutes: null, km: null, date: TODAY });
    expect(gestempeltText("volleyball", TODAY, TODAY)).toBe("Volleyball · heute · gestempelt");
    expect(gestempeltText("laufen", "2026-10-20", TODAY)).toBe("Laufen · gestern · gestempelt");
    expect(gestempeltText("Tennis", MO, TODAY)).toBe("Tennis · Mo · gestempelt");
  });

  it("„Wie läuft’s mit Sport?“ → „Mo war Laufen, Do ist geplant.“ bzw. „Woche geschafft.“", () => {
    expect(parseSportCommand("Wie läuft’s mit Sport?", TODAY)).toEqual({ kind: "lage" });
    expect(parseSportCommand("wie laeuft es mit dem training", TODAY)).toEqual({ kind: "lage" });
    expect(sportLage(stempelkarte(state([run(MO)]), [plan("2026-10-22")], TODAY, MITTAG), TODAY)).toBe("Mo war Laufen, Do ist geplant.");
    expect(sportLage(stempelkarte(state([run(MO), run(TODAY)]), [], TODAY, MITTAG), TODAY)).toBe("Woche geschafft.");
    expect(sportLage(stempelkarte(state([run(MO)]), [], TODAY, MITTAG), TODAY)).toBe("Mo war Laufen.");
    expect(sportLage(stempelkarte(state([]), [plan("2026-10-22")], TODAY, MITTAG), TODAY)).toBe("Do ist geplant.");
    expect(sportLage(stempelkarte(state([]), [], TODAY, MITTAG), TODAY)).toBe("Diese Woche ist noch frei.");
  });

  it("Texte ohne Gedankenstriche, Zähler und Druck-Wörter", () => {
    const src = readFileSync("src/lib/sport/stempel.ts", "utf8").split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/**"));
    const texte = src.join("\n").match(/"[^"]*"|`[^`]*`/g) ?? [];
    for (const t of texte) expect(t).not.toMatch(/ – | — |fehlt|überfällig|verpasst|musst/);
  });
});

describe("Erinnerung am Vorabend", () => {
  const allowed = (minute: number, sent: string[] = [], paused = false) => () => pushAllowed({ kind: "proaktiv", minutes: minute, routine: DEFAULT_ROUTINE, workEnd: null, paused, proactiveSentToday: proaktivHeute(sent, TODAY) });
  const morgen = [plan("2026-10-22", "08:00")];

  it("Standard aus: keine Mitteilung", () => {
    expect(EMPTY_SPORT.erinnerung).toBe(false);
    expect(sportVorabend(EMPTY_SPORT, morgen, { today: TODAY, minute: SPORT_VORABEND_MINUTE, sent: [], allowed: allowed(SPORT_VORABEND_MINUTE) })).toBeNull();
  });

  it("an: um 19:00, wenn morgen ein Training geplant ist; höchstens 1 proaktive am Tag, nicht in der Pause", () => {
    const on = { ...EMPTY_SPORT, erinnerung: true };
    const m = SPORT_VORABEND_MINUTE;
    expect(m).toBe(19 * 60);
    expect(sportVorabend(on, morgen, { today: TODAY, minute: m, sent: [], allowed: allowed(m) })).toEqual({ key: `proaktiv:${TODAY}:sport-vorabend`, body: "Morgen (Do): Laufen · 8:00", href: "/sport" });
    expect(sportVorabend(on, [], { today: TODAY, minute: m, sent: [], allowed: allowed(m) })).toBeNull();
    expect(sportVorabend(on, morgen, { today: TODAY, minute: m - 30, sent: [], allowed: allowed(m - 30) })).toBeNull();
    // schon eine proaktive heute (z. B. diese) → nichts
    expect(sportVorabend(on, morgen, { today: TODAY, minute: m + 2, sent: [`proaktiv:${TODAY}:sport-vorabend`], allowed: allowed(m + 2, [`proaktiv:${TODAY}:sport-vorabend`]) })).toBeNull();
    expect(sportVorabend(on, morgen, { today: TODAY, minute: m, sent: [`proaktiv:${TODAY}:pinnwand`], allowed: allowed(m, [`proaktiv:${TODAY}:pinnwand`]) })).toBeNull();
    expect(sportVorabend(on, morgen, { today: TODAY, minute: m, sent: [], allowed: allowed(m, [], true) })).toBeNull();
    // 19:00 liegt vor der Ruhe ab 20 Uhr
    expect(pushAllowed({ kind: "proaktiv", minutes: m + 5, routine: DEFAULT_ROUTINE, workEnd: null, paused: false, proactiveSentToday: false })).toBe(true);
  });
});

// --- Kachel als echte Ausgabe (ohne Browser) ---------------------------------
const store = vi.hoisted(() => ({ sport: null as SportState | null, forecast: null as Forecast | null }));
vi.mock("@/lib/sport/store", async (orig) => ({ ...(await orig<object>()), useSport: () => store.sport ?? undefined }));
vi.mock("@/lib/wetter/client", () => ({ useForecast: () => ({ forecast: store.forecast, stale: false, failed: false, place: "Eutin" }) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown }) => createElement("a", { href, ...rest }, children as never) }));

async function kachel(sport: SportState, entries: CalendarEntry[] = [], size: "XS" | "S" | "M" = "S") {
  store.sport = sport;
  const { SportTile } = await import("@/components/sport/SportTile");
  return renderToStaticMarkup(createElement(SportTile, { size, entries, today: TODAY, minutes: MITTAG, me: null }));
}
const anzahl = (html: string, re: RegExp) => html.match(re)?.length ?? 0;

describe("Sport-Kachel", () => {
  it("S: Stempel dieser Woche, leere Felder gestrichelt, darunter „Do · 8:00“ und „Laufen“; Plus = Training eintragen; kein Wasserzeichen", async () => {
    const html = await kachel(state([run(MO)]), [plan("2026-10-22")]);
    expect(anzahl(html, /data-stempel="laufen"/g)).toBe(1);
    expect(anzahl(html, /data-feld=/g)).toBe(1);
    expect(html).toContain("h-[54px] w-[54px]");
    expect(html).toContain("Do · 8:00");
    expect(html).toContain(">Laufen<");
    expect(html).toContain('aria-label="Training eintragen"');
    expect(html).toContain('href="/sport"');
    expect(html).not.toContain("kachel-wasserzeichen");
    expect(html).not.toContain("data-wasserzeichen");
    expect(html).toContain('data-sport-zustand="normal"');
    // In der Kachel steht im geplanten Feld keine Uhrzeit (die steht darunter)
    expect(html).not.toContain(">Do 8:00<");
  });

  it("geschafft: Kachel grün, „Geschafft.“ / „Diese Woche“", async () => {
    const html = await kachel(state([run(MO), run("2026-10-20", { sport: "volleyball" })]));
    expect(html).toContain('data-geschafft=""');
    expect(html).toContain("Geschafft.");
    expect(html).toContain("Diese Woche");
    expect(anzahl(html, /data-stempel=/g)).toBe(2);
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("[data-geschafft] { --tile-bg: var(--app-good-soft); --tile-ac: var(--app-good-ink);");
  });

  it("M: Stempel links, rechts „Als Nächstes“, „Do · 8:00“, „Laufen · Wetter zur Trainingszeit“", async () => {
    store.forecast = { place: "Eutin", fetchedAt: "", current: { temp: 9, code: 0 }, hours: [{ date: "2026-10-22", hour: 8, temp: 9.2, code: 0, rain: 0, gust: 0, mm: 0, sun: 1, cloud: 0 }], days: [] };
    const html = await kachel(state([run(MO)]), [plan("2026-10-22")], "M");
    store.forecast = null;
    expect(html).toContain("Als Nächstes");
    expect(html).toContain("Do · 8:00");
    expect(html).toMatch(/Laufen<\/span><span aria-hidden="true">·<\/span><svg[\s\S]*?9°/);
    expect(html).toContain("h-[68px] w-[68px]");
  });

  it("leer: gestrichelte Felder + „Diese Woche ist noch frei.“", async () => {
    const html = await kachel(state([]));
    expect(anzahl(html, /data-feld="frei"/g)).toBe(2);
    expect(html).toContain("Diese Woche ist noch frei.");
    expect(html).toContain('data-sport-zustand="leer"');
    expect(html).not.toContain(" – ");
  });

  it("XS: eine Zeile", async () => {
    expect(await kachel(state([run(MO), run(TODAY)]), [], "XS")).toContain("Woche geschafft");
    expect(await kachel(state([]), [plan("2026-10-22")], "XS")).toContain("Morgen · Do 8:00 · Laufen");
  });
});

describe("Stempel-Animation", () => {
  it("weich 0,8–1,2 s mit cubic-bezier(.16,1,.3,1), nur transform/opacity, reduced-motion = Überblenden", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const teil = css.slice(css.indexOf(".stempel {"), css.indexOf("[data-geschafft]"));
    expect(teil).toContain(".stempel-neu { animation: stempel-auf 1s cubic-bezier(.16,1,.3,1) both; }");
    expect(teil).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.stempel-neu \{ animation: stempel-blende/);
    const frames = teil.slice(teil.indexOf("@keyframes stempel-auf"), teil.indexOf("@media"));
    expect(frames.match(/[a-z-]+(?=:)/g)?.every((p) => ["transform", "opacity"].includes(p))).toBe(true);
  });
});
