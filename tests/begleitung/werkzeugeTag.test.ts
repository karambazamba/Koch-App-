import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { at } from "../helpers";
import { dayContextLines } from "@/lib/begleitung/dayTools";
import { toolDefinitions } from "@/lib/begleitung/toolset";
import type { TipView } from "@/lib/tipps/model";
import type { Forecast } from "@/lib/wetter/forecast";
import { HEUTE, kontext, letzte, rufe, termin } from "./werkzeugKontext";

beforeEach(() => at("2026-10-21T09:00"));
afterEach(() => vi.unstubAllEnvs());

const timer = (name: string, leftSec: number, extra: { paused?: boolean; done?: boolean } = {}) => ({ name, leftSec, paused: false, done: false, ...extra });

describe("Timer und Stoppuhr (sofort)", () => {
  it("timer_stellen prüft Dauer und höchstens 5 laufende", () => {
    const ctx = kontext();
    expect(rufe(ctx, "timer_stellen", { minuten: 0 }).isError).toBe(true);
    expect(rufe(ctx, "timer_stellen", { minuten: "abc" }).isError).toBe(true);
    expect(rufe(ctx, "timer_stellen", { minuten: "0,5", name: "Ei" }).content).toBe("Läuft gleich (die App startet ihn sofort): Ei, 0.5 Minuten. Der Timer steht auf der Startseite.");
    expect(letzte(ctx)).toMatchObject({ type: "add_timer", name: "Ei", minutes: 0.5 });
    const voll = kontext({ timers: [1, 2, 3, 4].map((i) => timer(`T${i}`, 60)) });
    rufe(voll, "timer_stellen", { minuten: 5 });
    expect(rufe(voll, "timer_stellen", { minuten: 5 }).content).toMatch(/schon 5 Timer/);
    expect(rufe(kontext(), "timer_stellen", { minuten: 10 }).content).toContain("Timer, 10 Minuten");
  });

  it("timer_stoppen, stoppuhr, timer_status", () => {
    expect(rufe(kontext(), "timer_stoppen", { name: "Nudeln" }).content).toBe("Gerade läuft kein Timer.");
    const ctx = kontext({ timers: [timer("Nudeln", 250), timer("Ei", 30, { paused: true }), timer("Kuchen", 0, { done: true })], stopwatch: { sec: 75, running: true } });
    expect(rufe(ctx, "timer_stoppen", { name: "nudeln" }).content).toBe("Wird beendet: Nudeln.");
    expect(rufe(ctx, "timer_stoppen").content).toBe("Wird beendet: der Timer.");
    expect(rufe(ctx, "stoppuhr", { aktion: "start" }).content).toMatch(/läuft/);
    expect(rufe(ctx, "stoppuhr", { aktion: "stopp" }).content).toBe("Stoppuhr wird angehalten.");
    expect(letzte(ctx)).toMatchObject({ type: "stopwatch", action: "stop" });
    const status = rufe(ctx, "timer_status").content.split("\n");
    expect(status[0]).toMatch(/^Nudeln: 5 Min \(/);
    expect(status[1]).toMatch(/^Ei: 1 Min .*pausiert$/);
    expect(status[2]).toBe("Kuchen: fertig");
    expect(status[3]).toMatch(/^Stoppuhr: /);
    expect(rufe(kontext(), "timer_status").content).toBe("Gerade läuft kein Timer.");
  });
});

describe("Kochen", () => {
  const kochen = { dish: "Pasta", recipe: "r1", steps: ["Wasser aufsetzen.", "Nudeln kochen", "Soße rühren"], done: [0], active: false };

  it("kochen_starten nennt den aktuellen Schritt", () => {
    expect(rufe(kontext({ kochen }), "kochen_starten").content).toBe("Kochen-Modus an: Pasta. Jetzt: Nudeln kochen.");
    expect(rufe(kontext(), "kochen_starten").content).toBe("Kochen-Modus an (heute ist kein Gericht geplant).");
  });

  it("kochschritt zeigen und weiter bis zum Ende", () => {
    expect(rufe(kontext(), "kochschritt", { aktion: "zeigen" }).content).toMatch(/kein Rezept mit Schritten/);
    const ctx = kontext({ kochen });
    expect(rufe(ctx, "kochschritt", { aktion: "zeigen" }).content).toBe("Schritt 2 von 3: Nudeln kochen");
    expect(rufe(ctx, "kochschritt", { aktion: "weiter" }).content).toBe("Schritt 2 abgehakt. Jetzt Schritt 3 von 3: Soße rühren");
    expect(letzte(ctx)).toMatchObject({ type: "cook_step", recipe: "r1", index: 1 });
    expect(rufe(ctx, "kochschritt", { aktion: "weiter" }).content).toBe("Schritt 3 abgehakt. Das war der letzte. Guten Appetit!");
    expect(rufe(ctx, "kochschritt", { aktion: "weiter" }).content).toBe("Alle Schritte fertig. Guten Appetit!");
  });
});

describe("Sport", () => {
  it("sport_eintragen schätzt Dauer und zählt die Woche", () => {
    const ctx = kontext();
    const r = rufe(ctx, "sport_eintragen", { sportart: "Laufen", km: "5" });
    expect(r.content).toMatch(/^Vorgemerkt: Laufen, \d+ Min, 5 km \(2026-10-21\); 1\. Mal Laufen im Oktober\. Bestätige genau so: „Laufen · heute · gestempelt“\. Keine Zahlen von Trainings nennen\.$/);
    expect(letzte(ctx)).toMatchObject({ type: "add_training", training: { sport: "laufen", km: 5, date: HEUTE } });
    // Zukunft wird heute, unbekannte Sportart bleibt als Name
    rufe(ctx, "sport_eintragen", { sportart: "Klettern", minuten: 90, datum: "2026-12-01" });
    expect(letzte(ctx)).toMatchObject({ training: { sport: "klettern", minutes: 90, date: HEUTE } });
    rufe(ctx, "sport_eintragen", { sportart: "", minuten: 30 });
    expect(letzte(ctx)).toMatchObject({ training: { sport: "fitness" } });
  });

  it("Woche geschafft (Stempelkarte), Bonus ohne Zähler", () => {
    const ctx = kontext({ sport: { goal: 1, trainings: [], packs: {}, celebrated: [], skipped: [] } as never });
    expect(rufe(ctx, "sport_eintragen", { sportart: "yoga", minuten: 30 }).content).toContain("„Yoga · heute · gestempelt“ und „Woche geschafft.“");
    // ohne Übernehmen bleibt die Woche gleich; schon geschafft = kein zweites „geschafft“
    const geschafft = kontext({ sport: { goal: 1, trainings: [{ id: "t1", typ: "training", raum: "familie", erstellt: "", geaendert: "", data: { sport: "yoga", minutes: 30, date: HEUTE } }], packs: {}, celebrated: [] } as never });
    expect(rufe(geschafft, "sport_eintragen", { sportart: "yoga", minuten: 30 }).content).not.toContain("Woche geschafft");
  });

  it("sport_ziel_setzen, sport_statistik", () => {
    const ctx = kontext();
    expect(rufe(ctx, "sport_ziel_setzen", { ziel: 9 }).isError).toBe(true);
    expect(rufe(ctx, "sport_ziel_setzen", { ziel: 4 }).content).toBe("Vorgemerkt: Wochenziel 4× pro Woche.");
    rufe(ctx, "sport_eintragen", { sportart: "laufen", minuten: 40, km: 7 });
    const stat = rufe(ctx, "sport_statistik", { monat: "2026-10" }).content;
    expect(stat).toMatch(/^Lage diese Woche \(so antworten\): Heute war Laufen\.\nDiese Woche: 1 von 4\./);
    expect(stat).toContain("Oktober: 1 Einheiten");
    expect(stat).toContain("7 km");
    expect(stat).toMatch(/Zuletzt: 2026-10-21 Laufen 40 Min 7 km/);
  });

  it("trainings_planen legt Sport-Termine in freie Lücken", () => {
    const ctx = kontext({ entries: [termin({ title: "Büro", date: "2026-10-27", start: "08:00", end: "17:00" }, "arbeit")], me: "p-felix" });
    const r = rufe(ctx, "trainings_planen", { anzahl: 2, tageszeit: "morgens", woche: "naechste", sportart: "Rad" });
    expect(r.content).toMatch(/^Vorgemerkt \(Termine mit Etikett Sport/);
    const neu = ctx.ops.filter((o) => o.type === "upsert_entry");
    expect(neu).toHaveLength(2);
    for (const op of neu) {
      if (op.type !== "upsert_entry" || op.entry.typ !== "termin") throw new Error();
      expect(op.entry.data).toMatchObject({ label: "Sport", reminder: "30", who: ["p-felix"] });
      expect(op.entry.data.date >= "2026-10-26").toBe(true);
    }
  });

  it("trainings_planen denkt mit Regen", () => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ date: "2026-10-22", hour: h, temp: 10, code: 61, rain: 90, gust: 10, mm: 2, sun: 0, cloud: 100 }));
    const fc = { place: "Eutin", fetchedAt: "", current: { temp: 10, code: 61 }, hours, days: [] } as Forecast;
    const ctx = kontext({}, { forecast: fc });
    const r = rufe(ctx, "trainings_planen", { anzahl: 3, woche: "diese", sportart: "laufen", minuten: 45 });
    expect(r.isError).toBeUndefined();
    expect(r.content.length).toBeGreaterThan(10);
  });
});

describe("Jetzt-Karte und Kontext", () => {
  it("jetzt_karte an/aus", () => {
    const ctx = kontext();
    expect(rufe(ctx, "jetzt_karte", { an: false }).content).toMatch(/Jetzt-Karte aus/);
    expect(ctx.data.tagesablauf).toEqual({ feierabendAb: "20:00", morgenBis: "10:00", jetzt: false });
    expect(rufe(ctx, "jetzt_karte", {}).content).toMatch(/Jetzt-Karte an/);
  });

  it("dayContextLines fasst Startseite, Timer, Kochen und Sport zusammen", () => {
    const leer = dayContextLines({ data: kontext().data, today: HEUTE });
    expect(leer).toEqual(["Timer: keiner"]);
    const lines = dayContextLines({
      data: kontext({
        tagesablauf: { jetzt: true, morgenBis: "10:00", feierabendAb: "20:00" },
        timers: [timer("Nudeln", 125), timer("Ei", 10, { paused: true }), timer("Brot", 0, { done: true })],
        stopwatch: { sec: 30, running: true },
        kochen: { dish: "Pasta", recipe: "", steps: ["A", "B"], done: [0, 1], active: true },
        sport: { goal: 3, trainings: [], packs: {}, celebrated: [], skipped: [] } as never,
      }).data,
      today: HEUTE,
    });
    expect(lines[0]).toBe("Startseite: Kacheln bleiben, wie sortiert; Jetzt-Karte an (Morgens bis 10:00, Feierabend ab 20:00)");
    expect(lines[1]).toMatch(/^Timer: Nudeln .* übrig; Ei .* übrig \(pausiert\); Brot fertig; Stoppuhr .* \(läuft\)$/);
    expect(lines[2]).toBe("Kochen (Kochen-Modus an): Pasta, Schritt alle fertig");
    expect(lines[3]).toBe("Sport: Wochenziel 3×, diese Woche 0");
    const ohne = dayContextLines({ data: kontext({ kochen: { dish: "Brot", recipe: "", steps: [], done: [], active: false } }).data, today: HEUTE });
    expect(ohne[1]).toBe("Kochen: Brot, ohne Schritte");
  });
});

describe("Tipps aus der Region", () => {
  const tip = (id: string, beginn: string, extra: Partial<TipView> = {}): TipView => ({
    id, quelle: "demo", quelle_id: id, titel: `Tipp ${id}`, kurztext: "", beginn, ende: null, ganztags: false, ort_name: "Malente", adresse: "", lat: 54, lng: 10.5,
    kategorien: [], fuer_kinder: false, drinnen: null, kostenlos: false, preis_text: null, alter_ab: null, url: null, veranstalter: null, lizenz: "CC0", urheber: null,
    bild_url: null, bild_lizenz: null, aktualisiert_am: "2026-10-01", km: 7.6, karamba: false, ...extra,
  });

  it("nur angeboten, wenn eine Quelle läuft", () => {
    vi.stubEnv("TIPS_SOURCE", "off");
    expect(toolDefinitions().some((d) => d.name === "tipps_suchen")).toBe(false);
    vi.stubEnv("TIPS_SOURCE", "demo");
    expect(toolDefinitions().some((d) => d.name === "tipps_suchen")).toBe(true);
  });

  it("antwortet nur aus Treffern und merkt sie als Karten", () => {
    expect(rufe(kontext(), "tipps_suchen", { von: HEUTE, bis: HEUTE }).content).toMatch(/gibt es gerade nicht/);
    const tips = [
      tip("a", "2026-10-24T15:00", { fuer_kinder: true, drinnen: true, kostenlos: true, karamba: true }),
      tip("b", "2026-10-25T00:00", { ganztags: true, drinnen: false }),
      tip("c", "2026-11-20T10:00"),
    ];
    const ctx = kontext({}, { regionTips: tips });
    const r = rufe(ctx, "tipps_suchen", { von: "2026-10-24", bis: "2026-10-25", filter: ["unsinn"], ort: " " });
    expect(r.content.split("\n")).toEqual([
      "Treffer (werden als Karten angezeigt – nur diese nennen):",
      "- Tipp a · Sa 2026-10-24 15:00 · Malente (8 km) · für Kinder · drinnen · kostenlos · von KARAMBA Eis · Beispiel",
      "- Tipp b · So 2026-10-25 ganztägig · Malente (8 km) · draußen · Beispiel",
    ]);
    expect(ctx.tipCards?.map((t) => t.id)).toEqual(["a", "b"]);
    expect(rufe(ctx, "tipps_suchen", { von: "kaputt" }).content).toMatch(/Keine Tipps/);
    expect(ctx.tipCards).toEqual([]);
  });
});

describe("Mails", () => {
  it("mail_entwurf legt eine Karte an, ohne Text → Fehler", () => {
    const ctx = kontext();
    expect(rufe(ctx, "mail_entwurf", { betreff: "Hallo", anrede: "du" }).isError).toBe(true);
    const r = rufe(ctx, "mail_entwurf", { an: "kita@example.org", empfaenger: "Kita", betreff: "Jonne krank", text: "Hallo,\n\nJonne ist krank.\n\nViele Grüße", anrede: "sie" });
    expect(r.content).toMatch(/Karte im Chat/);
    expect(ctx.mail).toMatchObject({ to: "kita@example.org", subject: "Jonne krank", tone: "sie" });
    expect(ctx.ops).toHaveLength(0);
  });

  it("antwort_knoepfe: 2–3 kurze Optionen", () => {
    const ctx = kontext();
    expect(rufe(ctx, "antwort_knoepfe", { optionen: ["Ja"] }).isError).toBe(true);
    expect(rufe(ctx, "antwort_knoepfe", { optionen: [" Zusagen ", "", 3, "Absagen", "Nachfragen", "Später"] }).content).toMatch(/Knöpfe/);
    expect(ctx.chips).toEqual(["Zusagen", "Absagen", "Nachfragen"]);
  });
});
