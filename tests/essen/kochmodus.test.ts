// Kochmodus (Tafel 122): Sprachbefehle (Prüfstand ≥ 95 %), Einstieg am
// gemerkten Schritt, Gegessen-Satz, Timer läuft beim Blättern weiter,
// Kurz/Ausführlich merkt sich das Gerät, Quelltext-Regeln der Oberfläche.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gegessenSatz, kochBefehl, startSchritt, type KochBefehl } from "@/lib/essen/kochModus";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import { atFresh, fakeWindow } from "../helpers";

/** Prüfstand der Kochmodus-Befehle: Satz → erwarteter Befehl (null = nichts tun) */
const SAETZE: [string, KochBefehl["kind"] | null, number?][] = [
  ["Weiter", "weiter"],
  ["weiter bitte", "weiter"],
  ["Okay, weiter.", "weiter"],
  ["Nächster Schritt", "weiter"],
  ["Und dann?", "weiter"],
  ["Mia, weiter", "weiter"],
  ["Zurück", "zurueck"],
  ["Einen Schritt zurück", "zurueck"],
  ["Geh mal zurück", "zurueck"],
  ["Vorheriger Schritt", "zurueck"],
  ["Nochmal", "nochmal"],
  ["Noch mal bitte", "nochmal"],
  ["Wiederhol das", "nochmal"],
  ["Wie bitte?", "nochmal"],
  ["Timer 10 Minuten", "timer", 10],
  ["Timer zehn Minuten", "timer", 10],
  ["Stell einen Timer auf 5 Minuten", "timer", 5],
  ["Timer 8 Minuten für die Nudeln", "timer", 8],
  ["Timer eine halbe Stunde", "timer", 30],
  ["Wecker 12 Minuten", "timer", 12],
  ["Fertig", "fertig"],
  ["Ich bin fertig", "fertig"],
  ["Gegessen", "fertig"],
  ["Das war’s", "fertig"],
  // Gespräche am Herd lösen nichts aus
  ["Kannst du mal das Salz rüberreichen", null],
  ["Mathis, deck bitte den Tisch", null],
  ["Wie war dein Tag heute so in der Schule eigentlich", null],
  ["Hmm", null],
  ["", null],
  ["Lecker", null],
];

describe("Kochmodus-Befehle (Prüfstand)", () => {
  it("erkennt weiter, zurück, nochmal, Timer X Minuten, fertig – mind. 95 %", () => {
    const ok = SAETZE.filter(([text, kind, min]) => {
      const b = kochBefehl(text);
      if (kind === null) return b === null;
      if (b?.kind !== kind) return false;
      return kind !== "timer" || (b.kind === "timer" && b.minutes === min);
    });
    const fehler = SAETZE.filter((s) => !ok.includes(s)).map(([t]) => t);
    expect(ok.length / SAETZE.length, `nicht erkannt: ${fehler.join(" | ")}`).toBeGreaterThanOrEqual(0.95);
    expect(SAETZE.length).toBeGreaterThanOrEqual(30);
  });

  it("Timer-Name kommt mit („für die Nudeln“)", () => {
    expect(kochBefehl("Timer 8 Minuten für die Nudeln")).toEqual({ kind: "timer", minutes: 8, name: "Nudeln" });
  });

  it("lange Sätze lösen nichts aus", () => {
    expect(kochBefehl("ich glaube wir sollten gleich weiter machen wenn alle da sind")).toBeNull();
  });
});

describe("Einstieg und Ende", () => {
  it("✕ merkt sich den Schritt: wieder dort einsteigen, sonst bei den Zutaten, nie hinter dem Ende", () => {
    expect(startSchritt(undefined, 6)).toBe(0);
    expect(startSchritt(3, 6)).toBe(3);
    expect(startSchritt(9, 6)).toBe(6);
    expect(startSchritt(-2, 6)).toBe(0);
  });

  it("nach „Gegessen“ nur ein kurzer Satz, knapp und ohne Lob", () => {
    expect(gegessenSatz(5)).toBe("Lasst es euch schmecken.");
    expect(gegessenSatz(1)).toBe("Lass es dir schmecken.");
    expect(gegessenSatz(null)).toBe("Lass es dir schmecken.");
    for (const p of [1, 4]) {
      const satz = gegessenSatz(p);
      expect(tidyMiaText(satz)).toBe(satz);
      expect(satz.length).toBeLessThanOrEqual(40);
      expect(satz).not.toMatch(/super|toll|bravo|stolz|!/i);
    }
  });
});

describe("Kochsitzung: Schritt merken, Gegessen, Zutaten (nur heute)", () => {
  beforeEach(async () => {
    vi.resetModules();
    await atFresh("2026-10-22T18:00");
  });

  it("setCookAt merkt den Schritt, endCooking nimmt ihn weg (mit Zurücknehmen), Zutaten abhaken", async () => {
    fakeWindow();
    const k = await import("@/lib/essen/kochSession");
    k.setCookAt("k:lasagne", 3);
    expect(k.loadCooking().at).toEqual({ "k:lasagne": 3 });
    k.toggleZutat("k:lasagne", "z1");
    expect(k.loadCooking().zutaten).toEqual({ "k:lasagne": ["z1"] });
    k.toggleZutat("k:lasagne", "z1");
    expect(k.loadCooking().zutaten).toEqual({ "k:lasagne": [] });
    const undo = k.endCooking("k:lasagne");
    expect(k.loadCooking().at).toEqual({});
    undo();
    expect(k.loadCooking().at).toEqual({ "k:lasagne": 3 });
  });
});

describe("Rezeptseite: Kurz | Ausführlich merkt sich das Gerät", () => {
  beforeEach(() => vi.resetModules());

  it("Standard beim ersten Mal Kurz, danach die letzte Wahl; nicht in der Sicherung", async () => {
    fakeWindow();
    const a = await import("@/lib/essen/kurz/ansicht");
    expect(a.loadRezeptAnsicht()).toBe("kurz");
    a.setRezeptAnsicht("lang");
    expect(a.loadRezeptAnsicht()).toBe("lang");
    a.setRezeptAnsicht("kurz");
    expect(a.loadRezeptAnsicht()).toBe("kurz");
    const storage = readFileSync("src/lib/core/storage.ts", "utf8");
    expect(storage).toMatch(/key: "wasgibts\.rezeptansicht"[^}]*backup: false/);
    expect(storage).toMatch(/key: "wasgibts\.kochen"[^}]*version: 2/);
  });
});

describe("Timer-Chip und Kochmodus nutzen denselben Timer", () => {
  beforeEach(() => vi.resetModules());

  it("startStepTimer startet einen Timer mit dem Schritt; derselbe Schritt nicht doppelt; er läuft unabhängig vom Blättern weiter", async () => {
    await atFresh("2026-10-22T18:00");
    fakeWindow();
    const { startStepTimer } = await import("@/lib/timer/actions");
    const { loadTimers } = await import("@/lib/timer/store");
    expect(startStepTimer("Tomaten dazu, 10 Minuten köcheln, würzen.", 10, "Tomaten dazu")).toBe(true);
    expect(startStepTimer("Tomaten dazu, 10 Minuten köcheln, würzen.", 10, "Tomaten dazu")).toBe(true);
    const timers = loadTimers().timers;
    expect(timers).toHaveLength(1);
    expect(timers[0]).toMatchObject({ name: "Tomaten dazu", step: "Tomaten dazu, 10 Minuten köcheln, würzen.", durationMs: 600_000 });
  });
});

describe("Oberfläche (Quelltext-Regeln)", () => {
  const cook = readFileSync("src/components/essen/rezepte/CookMode.tsx", "utf8");
  const view = readFileSync("src/components/essen/rezepte/RecipeView.tsx", "utf8");
  const schritte = readFileSync("src/components/essen/rezepte/RezeptSchritte.tsx", "utf8");
  const ohr = readFileSync("src/components/essen/rezepte/KochOhr.tsx", "utf8");

  it("Kochmodus: dunkel, ✕ ohne Nachfrage, große Schrift, Knöpfe ≥ 52 px, Wake Lock, Timer über timer/, Gegessen am Ende", () => {
    expect(cook).toMatch(/bg-cook text-cook-ink/);
    expect(cook).toMatch(/aria-label="Kochmodus beenden"/);
    expect(cook).not.toMatch(/confirm|ConfirmDialog/);
    expect(cook).toMatch(/text-\[24px\]/);
    expect(cook).toMatch(/const BIG = "flex h-14 /);
    expect(cook).toMatch(/useWakeLock\(\)/);
    expect(cook).toMatch(/startStepTimer\(/);
    expect(cook).toMatch(/isToday \? "Gegessen" : "Fertig"/);
    expect(cook).toMatch(/setCookAt\(recipe\.id, step\)/);
    expect(cook).toMatch(/startSchritt\(session\.at\[recipe\.id\], total\)/);
  });

  it("Mia hört nur über useSpeechInput mit, ruft nach jedem Befehl reset(), und ihr Gesicht ist nicht antippbar", () => {
    expect(ohr).toMatch(/useSpeechInput\(/);
    expect(ohr).toMatch(/speech\.reset\(\);\s*befehl\.current\(b\)/);
    expect(ohr).not.toMatch(/<button[^>]*>\s*<BegleitungAvatar/);
  });

  it("Rezeptseite: großer Knopf „Los, Schritt für Schritt“ direkt unter dem Bild, dann Zutaten, dann So geht’s", () => {
    const los = view.indexOf("Los, Schritt für Schritt");
    const zutaten = view.indexOf("<RezeptZutaten");
    const so = view.indexOf("<RezeptSchritte");
    expect(los).toBeGreaterThan(0);
    expect(los).toBeLessThan(zutaten);
    expect(zutaten).toBeLessThan(so);
    expect(view).toMatch(/h-\[50px\] w-full/);
    expect(view).toMatch(/<BackButton fallback="\/kochbuch" pill \/>/);
  });

  it("So geht’s: Umschalter Kurz | Ausführlich, Timer-Chips, Schritt antippen streicht durch, Gegessen am Ende", () => {
    expect(schritte).toMatch(/So geht’s/);
    expect(schritte).toMatch(/label: "Kurz"/);
    expect(schritte).toMatch(/label: "Ausführlich"/);
    expect(schritte).toMatch(/data-timer-chip/);
    expect(schritte).toMatch(/toggleStep\(recipe\.id, index\)/);
    expect(schritte).toMatch(/line-through/);
    expect(schritte).toMatch(/data-gegessen/);
    expect(schritte).not.toMatch(/weitere/);
  });
});

describe("Demo-Haushalte: passende Personenzahl im Beispiel-Rezept", () => {
  it("allein 1, zu zweit 2, Familie 4 – eingetragene Personen gehen vor", async () => {
    const { beispielPersonen } = await import("@/lib/essen/demoDish");
    expect(beispielPersonen("allein", 0)).toBe(1);
    expect(beispielPersonen("paar", 0)).toBe(2);
    expect(beispielPersonen("familie", 0)).toBe(4);
    expect(beispielPersonen("familie", 3)).toBe(3);
    expect(readFileSync("src/components/essen/DemoFoodTile.tsx", "utf8")).toMatch(/rezept: r, needs: \[\], persons, kopf: d\.when/);
  });
});
