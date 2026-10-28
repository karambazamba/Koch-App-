// Prüfstand Sofort-Weg: lokale Zuordnung ≥ 98 % richtig – sonst gehört die
// Regel nicht in den Sofort-Weg. Dazu: Was lokal erledigt wird, muss auch im
// großen Prüfstand (echte Alltagssätze) richtig sein.
import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { sofortErkennen, type SofortKontext } from "@/lib/begleitung/sofort/erkennen";
import { bewerteSofort, SOFORT_SAETZE } from "@/lib/begleitung/pruefstand/sofort";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte } from "@/lib/begleitung/pruefstand/bewerten";
import { pruefHaushalt, PRUEF_HEUTE, type Lage } from "@/lib/begleitung/pruefstand/haushalt";
import { planningWeekStart } from "@/lib/essen/weekPlan";

beforeEach(() => at("2026-10-21T10:30"));

function pruefKontext(lage: Lage[] = []): SofortKontext {
  const d = pruefHaushalt(lage);
  return {
    today: PRUEF_HEUTE,
    nowMinutes: 10 * 60 + 30,
    persons: d.profile.persons.map((p) => ({ id: p.id, name: p.name })),
    laeden: ["Rewe", "Aldi", "Rossmann"],
    weekStart: planningWeekStart(new Date(`${PRUEF_HEUTE}T12:00:00`), d.profile.shoppingDay || "Montag").weekStart,
    aufDerListe: [],
    entries: d.entries ?? [],
  };
}

describe("Prüfstand Sofort-Weg", () => {
  it(`mindestens 40 Kurzsätze, lokale Zuordnung ≥ 98 % richtig`, () => {
    expect(SOFORT_SAETZE.length).toBeGreaterThanOrEqual(40);
    const ctx = pruefKontext();
    const ergebnisse = SOFORT_SAETZE.map((s) => ({ s, ...bewerteSofort(s, sofortErkennen(s.text, ctx)) }));
    const falsch = ergebnisse.filter((e) => !e.ok).map((e) => `${e.s.text}: ${e.gruende.join("; ")}`);
    const quote = (ergebnisse.length - falsch.length) / ergebnisse.length;
    expect(falsch, `Quote ${Math.round(quote * 1000) / 10} %`).toEqual([]);
    expect(quote).toBeGreaterThanOrEqual(0.98);
    // Jede Art kommt vor (positiv) und es gibt genug „nicht lokal“
    for (const art of ["einkauf", "termin", "aufgabe", "notiz", "pinnwand", "timer"]) expect(SOFORT_SAETZE.some((s) => s.art === art), art).toBe(true);
    expect(SOFORT_SAETZE.filter((s) => s.art === null).length).toBeGreaterThanOrEqual(20);
  });

  it("großer Prüfstand: was lokal erledigt wird, ist dort richtig (≥ 98 %)", () => {
    const lokal = PRUEFSAETZE.flatMap((s) => {
      const r = sofortErkennen(s.text, pruefKontext(s.lage ?? []));
      return r ? [{ s, r }] : [];
    });
    expect(lokal.length).toBeGreaterThan(10);
    const falsch = lokal.filter(({ s, r }) => !bewerte(s, { reply: r.reply, ops: r.ops }, 10).ok).map(({ s, r }) => `${s.text} → ${r.art}`);
    expect(falsch).toEqual([]);
    expect((lokal.length - falsch.length) / lokal.length).toBeGreaterThanOrEqual(0.98);
  });

  it("saubere Titel: ohne Tageszeit, Füllwörter und „Timer“", () => {
    const ctx = pruefKontext();
    const titel = (t: string) => {
      const op = sofortErkennen(t, ctx)?.ops[0];
      return op?.type === "upsert_entry" ? op.entry.data.title : op?.type === "add_timer" ? op.name : null;
    };
    expect(titel("heute abend 20 uhr kino")).toBe("Kino");
    expect(titel("Ich muss am Mittwoch nächste Woche um 9 zum Arzt")).toBe("Arzt");
    expect(titel("Irgendwann mal den Keller aufräumen")).toBe("Keller aufräumen");
    expect(titel("Timer für die Eier 7 Minuten")).toBe("Eier");
    expect(titel("Stell einen Timer auf 5 Minuten")).toBe("");
  });

  it("schon auf der Liste → nicht lokal (die KI sagt „steht schon drauf“)", () => {
    expect(sofortErkennen("Milch auf die Liste", { ...pruefKontext(), aufDerListe: ["Milch (Rewe)"] })).toBeNull();
  });

  it("Bestätigung und Zusammenfassung für die Prüfung der KI", () => {
    const ctx = pruefKontext();
    expect(sofortErkennen("Milch auf die Liste", ctx)).toMatchObject({ reply: "Is drauf.", was: "Einkaufsliste: Milch" });
    expect(sofortErkennen("Elternabend Freitag 19:30", ctx)).toMatchObject({ reply: "Fr 19:30 Elternabend, steht drin.", was: "Termin „Elternabend“ am 2026-10-23 um 19:30" });
    expect(sofortErkennen("Timer 10 Minuten Nudeln", ctx)).toMatchObject({ reply: "Läuft.", was: "Timer 10 Minuten „Nudeln“" });
    expect(sofortErkennen("Erinner mich morgen um 8 an die Mülltonne", ctx)).toMatchObject({ reply: "Mach ich." });
    expect(sofortErkennen("Notier dir: WLAN", ctx)?.was).toBe("Notiz „WLAN“");
    expect(sofortErkennen("Pinnwand: Bin da", ctx)?.was).toBe("Pinnwand: Bin da");
    expect(sofortErkennen("Paket abholen", ctx)?.was).toBe("Aufgabe „Paket abholen“ ab 2026-10-21");
  });
});
