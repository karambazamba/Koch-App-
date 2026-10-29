// Mini-Kreise oben (A-050, Tafel 143 + Nachtrag „kein Schild“): Reihe, Größen,
// Reihenfolge, Timer vorn, Sport-Ring, Bearbeiten (an/aus, ordnen, max. 5),
// Migration v9 → v10 (XS Sport/Timer → Kreise, Im Haus aus der Anordnung),
// neue Standard-Ordnung (Tafel 140), Mia-Befehle mit Prüfstand-Sätzen.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, memoryStorage, noBrowser } from "../helpers";
import {
  KREISE,
  MAX_KREISE,
  STANDARD_KREISE,
  aendereKreise,
  beschreibeKreis,
  kreisMasse,
  ordneKreise,
  ringBoegen,
  sanitizeKreise,
  sichtbareKreise,
  sportRing,
  timerImKreis,
  type KreisLage,
} from "@/lib/heute/kreise";
import { DEFAULT_HOME, defaultHome, hatNeueStandardOrdnung, migrateHome, neueStandardOrdnung, sanitizeHome, zuKreisen, type HomeTile } from "@/lib/core/homeLayout";
import { parseHomeCommand, parseKreisCommand } from "@/lib/begleitung/homeChat";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { durchatmenAusSatz } from "@/lib/durchatmen/erkennen";
import { everydayUses } from "@/lib/begleitung/mockAlltag";
import { createBackup, restoreBackup } from "@/lib/core/backup";
import { kontext, rufe } from "../begleitung/werkzeugKontext";
import type { Timer } from "@/lib/timer/model";

afterEach(() => noBrowser());

const ALLES: KreisLage = { sport: true, pause: true, waslos: true, timerLaeuft: false };
const OHNE_WASLOS: KreisLage = { ...ALLES, waslos: false };

describe("Reihe (Tafel 143)", () => {
  it("Standard: Sport · Pause · Was los? · Rätsel · Timer – je EIN Wort", () => {
    expect(KREISE.map((k) => k.wort)).toEqual(["Sport", "Pause", "Was los?", "Rätsel", "Timer"]);
    expect(KREISE.every((k) => !/\s/.test(k.wort) || k.wort === "Was los?")).toBe(true);
    expect(STANDARD_KREISE.every((k) => k.an)).toBe(true);
    expect(MAX_KREISE).toBe(5);
  });

  it("5 Kreise = 56 px (Symbol 23, Wort 12,5 px), 4 oder weniger = 64 px (26, 13 px)", () => {
    expect(kreisMasse(5)).toEqual({ kreis: 56, symbol: 23, wort: 12.5 });
    expect(kreisMasse(4)).toEqual({ kreis: 64, symbol: 26, wort: 13 });
    expect(kreisMasse(2).kreis).toBe(64);
    expect(sichtbareKreise(STANDARD_KREISE, ALLES)).toHaveLength(5);
  });

  it("nur Kreise für eingeschaltete Bausteine; „Was los?“ ohne Quelle/Einträge ausgeblendet", () => {
    expect(sichtbareKreise(STANDARD_KREISE, OHNE_WASLOS)).toEqual(["sport", "pause", "raetsel", "timer"]);
    expect(sichtbareKreise(STANDARD_KREISE, { ...OHNE_WASLOS, sport: false, pause: false })).toEqual(["raetsel", "timer"]);
  });

  it("Timer läuft: rückt an Position 1, danach zurück an seinen Platz; aus = nur solange er läuft", () => {
    expect(sichtbareKreise(STANDARD_KREISE, { ...OHNE_WASLOS, timerLaeuft: true })).toEqual(["timer", "sport", "pause", "raetsel"]);
    expect(sichtbareKreise(STANDARD_KREISE, OHNE_WASLOS).at(-1)).toBe("timer");
    const ohneTimer = aendereKreise(STANDARD_KREISE, { kreis: "timer", aktion: "aus" });
    expect(sichtbareKreise(ohneTimer, OHNE_WASLOS)).not.toContain("timer");
    expect(sichtbareKreise(ohneTimer, { ...OHNE_WASLOS, timerLaeuft: true })[0]).toBe("timer");
    // alle 5 und Timer läuft: der laufende Timer bleibt, höchstens 5
    expect(sichtbareKreise(STANDARD_KREISE, { ...ALLES, timerLaeuft: true })).toEqual(["timer", "sport", "pause", "waslos", "raetsel"]);
  });

  it("Timer im Kreis: Restzeit des kürzesten laufenden, Ring nimmt ab", () => {
    const t = (id: string, min: number, left: number): Timer => ({ id, name: id, emoji: "", durationMs: min * 60_000, endsAt: 1_000_000 + left * 1000, pausedLeft: null, startedAt: 0, acked: false }) as Timer;
    const k = timerImKreis([t("Nudeln", 10, 462), t("Eier", 8, 120)], 1_000_000)!;
    expect(k.rest).toBe("2:00");
    expect(k.name).toBe("Eier");
    expect(k.anteil).toBeCloseTo(0.25);
    expect(timerImKreis([], 1_000_000)).toBeNull();
    expect(timerImKreis([{ ...t("Pause", 5, 60), pausedLeft: 60_000 }], 1_000_000)).toBeNull();
  });

  it("Sport-Ring: Stücke = Ziel (ohne Ziel 3), füllt sich je Training, geschafft = grün", () => {
    expect(sportRing(0, 2)).toEqual({ stuecke: 2, voll: 0, geschafft: false });
    expect(sportRing(1, 2)).toEqual({ stuecke: 2, voll: 1, geschafft: false });
    expect(sportRing(3, 2)).toEqual({ stuecke: 2, voll: 2, geschafft: true });
    expect(sportRing(2, null)).toEqual({ stuecke: 3, voll: 2, geschafft: false });
    expect(sportRing(5, null).geschafft).toBe(false);
    expect(ringBoegen(4)).toHaveLength(4);
    expect(ringBoegen(1)).toEqual([{ von: 0, bis: 359.99 }]);
  });

  it("kein Schild, keine Zahl an Kreisen – nur Sport-Ring und Timer-Restzeit (Nachtrag)", () => {
    const ohneKommentar = (f: string) => readFileSync(f, "utf8").replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const knopf = ohneKommentar("src/components/heute/kreise/KreisKnopf.tsx");
    const reihe = ohneKommentar("src/components/heute/kreise/KreisReihe.tsx");
    expect(knopf + reihe).not.toMatch(/>\s*neu\s*</i);
    expect(knopf + reihe).not.toMatch(/hatUngesehenes|badge|plakette/i);
    // Unter dem Kreis genau EIN Wort, nie zweizeilig, nie „…“
    expect(knopf).toMatch(/whitespace-nowrap font-bold/);
    expect(knopf).not.toMatch(/truncate|line-clamp|text-ellipsis/);
    // Nicht wischbar: kein seitlicher Scrollbereich, kein data-no-swipe (Wischen wechselt die Seite)
    expect(reihe).not.toMatch(/overflow-x|data-no-swipe|snap-x/);
  });

  it("Startseite: Reihe unter Kopf bzw. Jetzt-Karte, im Bearbeiten „Kreise oben“", () => {
    const today = readFileSync("src/components/heute/TodayPage.tsx", "utf8");
    expect(today.indexOf("<JetztCard")).toBeLessThan(today.indexOf("<KreisReihe"));
    expect(today.indexOf("<KreisReihe")).toBeLessThan(today.indexOf("<HomeBoard"));
    expect(today).toMatch(/editing\.on \? <KreiseBearbeiten \/> : <KreisReihe/);
    const bearbeiten = readFileSync("src/components/heute/kreise/KreiseBearbeiten.tsx", "utf8");
    expect(bearbeiten).toContain("Kreise oben");
    expect(bearbeiten).toContain("Höchstens {MAX_KREISE} Kreise");
    expect(bearbeiten).toMatch(/data-keep-edit/);
  });
});

describe("Bearbeiten: an/aus, Reihenfolge", () => {
  it("an/aus, nach vorn/hinten, hoch/runter; nichts geht verloren", () => {
    const aus = aendereKreise(STANDARD_KREISE, { kreis: "raetsel", aktion: "aus" });
    expect(aus.find((k) => k.id === "raetsel")?.an).toBe(false);
    expect(aus).toHaveLength(5);
    expect(aendereKreise(aus, { kreis: "raetsel", aktion: "an" })).toEqual(STANDARD_KREISE);
    expect(aendereKreise(STANDARD_KREISE, { kreis: "timer", aktion: "nach_vorn" }).map((k) => k.id)).toEqual(["timer", "sport", "pause", "waslos", "raetsel"]);
    expect(aendereKreise(STANDARD_KREISE, { kreis: "sport", aktion: "nach_hinten" }).map((k) => k.id).at(-1)).toBe("sport");
    expect(aendereKreise(STANDARD_KREISE, { kreis: "pause", aktion: "hoch" }).map((k) => k.id).slice(0, 2)).toEqual(["pause", "sport"]);
    expect(aendereKreise(STANDARD_KREISE, { kreis: "timer", aktion: "runter" })).toEqual(STANDARD_KREISE);
    expect(ordneKreise(STANDARD_KREISE, ["raetsel", "sport"]).map((k) => k.id)).toEqual(["raetsel", "sport", "pause", "waslos", "timer"]);
  });

  it("gespeicherte Kreise prüfen: Unbekanntes/Doppeltes weg, Fehlendes an seinen Platz", () => {
    expect(sanitizeKreise(null)).toEqual(STANDARD_KREISE);
    expect(sanitizeKreise([{ id: "timer", an: false }, { id: "x" }, { id: "timer" }]).map((k) => `${k.id}:${k.an}`)).toEqual(["sport:true", "pause:true", "waslos:true", "raetsel:true", "timer:false"]);
    // Fehlende hinter den, der laut Standard davor steht (Timer hinter Rätsel)
    expect(sanitizeKreise([{ id: "raetsel", an: true }, { id: "sport" }]).map((k) => k.id)).toEqual(["raetsel", "timer", "sport", "pause", "waslos"]);
  });

  it("Ansage kurz, ohne Druck", () => {
    expect(beschreibeKreis({ kreis: "raetsel", aktion: "aus" })).toBe("Rätsel ist oben raus. In „Startseite bearbeiten“ holst du es zurück.");
    expect(beschreibeKreis({ kreis: "timer", aktion: "nach_vorn" })).toBe("Timer steht jetzt vorn.");
    expect(beschreibeKreis({ kreis: "waslos", aktion: "an" })).toBe("Was los steht wieder oben.");
  });
});

describe("Migration v9 → v10", () => {
  const v9 = (tiles: object[]) => migrateHome({ version: 9, tiles, tipSeen: true })!;

  it("XS-Kacheln Sport und Timer → Kreise (nur ausgeblendet), S/M bleiben Kacheln", () => {
    const m = v9([
      { id: "wetter", visible: true, size: "XS" },
      { id: "sport", visible: true, size: "XS" },
      { id: "timer", visible: true, size: "XS" },
      { id: "termine", visible: true, size: "M" },
    ]);
    expect(m.version).toBe(10);
    expect(m.kreise).toEqual(STANDARD_KREISE);
    expect(m.tiles.filter((t) => t.visible).map((t) => t.id)).toEqual(["wetter", "termine"]);
    expect(m.tiles.find((t) => t.id === "sport")).toMatchObject({ visible: false, size: "XS" });
    const s = v9([{ id: "sport", visible: true, size: "S" }, { id: "timer", visible: true, size: "S" }]);
    expect(s.tiles.filter((t) => t.visible).map((t) => t.id)).toEqual(["sport", "timer"]);
  });

  it("Im Haus kommt aus der Anordnung (wählbar S/M), die übrige Anordnung bleibt", () => {
    const tiles = [
      { id: "pinnwand", visible: true, size: "S" },
      { id: "vorrat", visible: true, size: "XS" },
      { id: "termine", visible: true, size: "M", farbe: "mint" },
      { id: "essen", visible: true, size: "S" },
      { id: "einkauf", visible: true, size: "S" },
    ];
    const m = v9(tiles);
    expect(m.tiles.filter((t) => t.visible).map((t) => `${t.id}:${t.size}`)).toEqual(["pinnwand:S", "termine:M", "essen:S", "einkauf:S"]);
    expect(m.tiles.find((t) => t.id === "vorrat")).toMatchObject({ visible: false, size: "S" });
    expect(m.tiles.find((t) => t.id === "termine")?.farbe).toBe("mint");
    expect(zuKreisen(sanitizeHome(tiles)).length).toBe(m.tiles.length);
  });

  it("v10 bleibt; Sicherung: Kreise kommen mit zurück (auch alte Sicherungen laden)", async () => {
    const m = migrateHome({ version: 10, tiles: DEFAULT_HOME, tipSeen: false, kreise: [{ id: "raetsel", an: false }] })!;
    expect(m.kreise.find((k) => k.id === "raetsel")?.an).toBe(false);
    const win = fakeWindow();
    vi.resetModules();
    const home = await import("@/lib/core/homeLayout");
    home.changeKreise({ kreis: "timer", aktion: "nach_vorn" });
    const back = memoryStorage();
    restoreBackup(createBackup(win.localStorage), back);
    expect(migrateHome(JSON.parse(back.getItem("wasgibts.startseite")!))!.kreise[0].id).toBe("timer");
    const alt = JSON.parse(readFileSync("tests/fixtures/sicherung-v0.47.json", "utf8"));
    expect(migrateHome(JSON.parse(alt.data["wasgibts.startseite"]))!.kreise).toEqual(STANDARD_KREISE);
  });
});

describe("Neue Standard-Ordnung (Tafel 140)", () => {
  const alt: HomeTile[] = sanitizeHome([
    { id: "pinnwand", visible: true, size: "S" },
    { id: "wetter", visible: true, size: "XS" },
    { id: "notizen", visible: true, size: "XS", farbe: "rose" },
    { id: "termine", visible: true, size: "M" },
    { id: "aufgaben", visible: true, size: "M" },
    { id: "essen", visible: true, size: "S" },
    { id: "einkauf", visible: true, size: "S" },
    { id: "sport", visible: true, size: "S" },
  ]);

  it("übernimmt Reihenfolge und Größen der Tafel, eigene Kacheln bleiben dahinter, Farben bleiben", () => {
    const neu = neueStandardOrdnung(alt, "familie");
    expect(neu.filter((t) => t.visible).map((t) => `${t.id}:${t.size}`)).toEqual(["wetter:XS", "notizen:XS", "pinnwand:S", "termine:M", "aufgaben:M", "essen:S", "wundertuete:S", "einkauf:M", "sport:S"]);
    expect(neu.find((t) => t.id === "notizen")?.farbe).toBe("rose");
    expect(hatNeueStandardOrdnung(alt, "familie")).toBe(false);
    expect(hatNeueStandardOrdnung(neu, "familie")).toBe(true);
    expect(hatNeueStandardOrdnung(defaultHome("allein"), "allein")).toBe(true);
  });

  it("Bausteine aus (Wundertüte) kommen nicht dazu; allein ohne Pinnwand-Pflicht", () => {
    const neu = neueStandardOrdnung(alt, "familie", ["wundertuete"]);
    expect(neu.filter((t) => t.visible).map((t) => t.id)).not.toContain("wundertuete");
    const solo = neueStandardOrdnung(alt, "allein");
    expect(solo.filter((t) => t.visible).map((t) => t.id).slice(0, 3)).toEqual(["wetter", "notizen", "wundertuete"]);
    // Pinnwand bleibt (eigene Kachel), nur weiter unten – nie ausgeblendet oder gelöscht
    expect(solo.find((t) => t.id === "pinnwand")?.visible).toBe(true);
  });

  it("Knopf im Bearbeiten nur, solange die neue Ordnung nicht dasteht", () => {
    const board = readFileSync("src/components/heute/HomeBoard.tsx", "utf8");
    expect(board).toContain("Neue Standard-Ordnung übernehmen");
    expect(board).toMatch(/!hatNeueStandardOrdnung\(all, haushalt, aus\)/);
  });
});

describe("Mia: „Nimm Rätsel oben raus“, „Timer nach vorn“", () => {
  const SAETZE: [string, string, string][] = [
    ["Nimm Rätsel oben raus", "raetsel", "aus"],
    ["Timer nach vorn", "timer", "nach_vorn"],
    ["Hol die Pause wieder nach oben", "pause", "an"],
    ["Den Sport-Kreis bitte ganz nach hinten", "sport", "nach_hinten"],
    ["Blende das Rätsel oben aus", "raetsel", "aus"],
    ["Timer nach vorne", "timer", "nach_vorn"],
  ];

  it("ohne KI erkannt (feste Regel), mit KI als Werkzeug kreise_anpassen", () => {
    for (const [satz, kreis, aktion] of SAETZE) {
      expect(parseKreisCommand(satz), satz).toEqual({ kreis, aktion });
      expect(parseHomeCommand(satz), satz).toEqual({ kind: "kreise", change: { kreis, aktion } });
      const msg = everydayUses(satz, "Heute: Mittwoch (2026-10-21)");
      expect(JSON.stringify(msg?.content), satz).toContain("kreise_anpassen");
      // „Pause“ hier ist der Kreis – keine Atemübung
      expect(durchatmenAusSatz(satz), satz).toBeNull();
    }
  });

  it("nicht verwechselt: Timer stellen, Pause/Urlaub, Kacheln", () => {
    expect(parseKreisCommand("Timer 10 Minuten")).toBeNull();
    expect(parseKreisCommand("Ich brauch kurz Pause")).toBeNull();
    expect(parseKreisCommand("Pause beenden")).toBeNull();
    expect(parseKreisCommand("Nimm das Wetter weg")).toBeNull();
    expect(parseHomeCommand("Nimm das Wetter weg")).toEqual({ kind: "home", change: { tile: "wetter", action: "ausblenden" } });
  });

  it("Werkzeug: Vorschau „kreise“ mit Übernehmen, Unsinn wird abgelehnt", () => {
    const ctx = kontext();
    expect(rufe(ctx, "kreise_anpassen", { kreis: "raetsel", aktion: "aus" }).isError).toBeFalsy();
    expect(ctx.ops.at(-1)).toMatchObject({ type: "kreise", change: { kreis: "raetsel", aktion: "aus" } });
    expect(rufe(ctx, "kreise_anpassen", { kreis: "wetter", aktion: "aus" }).isError).toBe(true);
  });

  it("Prüfstand-Sätze stehen drin (Ziel ≥ 95 %)", () => {
    for (const [satz] of SAETZE.slice(0, 4)) expect(PRUEFSAETZE.find((s) => s.text === satz)?.ops, satz).toEqual(["kreise"]);
  });
});
