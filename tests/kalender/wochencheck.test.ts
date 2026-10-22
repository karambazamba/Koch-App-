import { beforeEach, describe, expect, it } from "vitest";
import { at, termin } from "../helpers";
import { applyCorrections, parseWeekTalk, sortWeek, splitPoints, weekDayLabel } from "@/lib/kalender/wochencheck";

const TODAY = "2026-10-26"; // Montag
const PERSONS = [{ id: "k1", name: "Mathis" }, { id: "a1", name: "Lisa" }];
beforeEach(() => at(`${TODAY}T08:00`));
const talk = (t: string, entries = []) => parseWeekTalk(t, TODAY, PERSONS, entries);

const TAFEL = "Also, ähm, diese Woche … Dienstag haben wir Elternabend, halb acht glaub ich. Mittwoch muss ich das Paket zur Post bringen. Donnerstag 10 Uhr Meeting mit dem Lieferanten. Samstag hat Mathis noch ein Spiel, äh, keine Ahnung wann.";

describe("Wochencheck: verstehen", () => {
  it("Beispieltext von Tafel 36", () => {
    const { items } = talk(TAFEL);
    expect(items.map((i) => [i.art, i.raum, i.title, i.date ?? i.due ?? null, i.time ?? null])).toEqual([
      ["termin", "familie", "Elternabend", "2026-10-27", "19:30"],
      ["aufgabe", "familie", "Paket Post bringen", "2026-10-28", null],
      ["termin", "arbeit", "Meeting mit Lieferanten", "2026-10-29", "10:00"],
      ["termin", "familie", "Mathis: Spiel", "2026-10-31", null],
    ]);
    expect(items[0].minutes).toBe(120);
    expect(items[3]).toMatchObject({ who: ["k1"], question: ["10:00", "14:00", "weiß noch nicht"] });
  });

  it("Füllwörter raus, Nachträge als eigener Punkt", () => {
    expect(splitPoints("Montag Zahnarzt um 9, ach so, und am Samstag Kino")).toEqual(["Montag Zahnarzt um 9,", "und am Samstag Kino"]);
    expect(talk("Ähm also Freitag 18 Uhr Kino, glaub ich").items[0]).toMatchObject({ title: "Kino", time: "18:00" });
  });

  it("Korrekturen: „Dienstag … nee, Mittwoch“ und „halb acht, oder acht? – acht“", () => {
    expect(applyCorrections("Dienstag Elternabend, nee, Mittwoch")).toContain("Mittwoch Elternabend");
    expect(talk("Dienstag Elternabend, nee, Mittwoch, um 19:30").items[0]).toMatchObject({ date: "2026-10-28", time: "19:30" });
    expect(talk("Freitag Kino halb acht, oder acht? – acht Uhr").items[0].time).toBe("20:00");
  });

  it("„Dienstag“ an jedem Wochentag = der nächste Dienstag; vorbei → nächste Woche", () => {
    expect(parseWeekTalk("Dienstag Kino 20 Uhr", "2026-10-28").items[0].date).toBe("2026-11-03");
    expect(parseWeekTalk("Dienstag Kino 20 Uhr", "2026-11-01").items[0].date).toBe("2026-11-03");
    expect(parseWeekTalk("nächste Woche Dienstag Kino 20 Uhr", "2026-10-26").items[0].date).toBe("2026-11-03");
  });

  it("Raum: Arbeit, Privat, Familie (Standard)", () => {
    expect(talk("Mittwoch 9 Uhr Kunde anrufen Termin").items[0].raum).toBe("arbeit");
    expect(talk("Donnerstag 8 Uhr Arzt, nur für mich").items[0].raum).toBe("privat");
    expect(talk("Freitag 15 Uhr Kindergeburtstag").items[0].raum).toBe("familie");
  });

  it("schon im Kalender → ausgegraut", () => {
    const entries = [termin({ title: "Elternabend", date: "2026-10-27", start: "19:30" })];
    expect(talk(TAFEL, entries as never).items[0].already).toBe(true);
  });

  it("Sport-Wunsch wird erkannt (Vorschläge nur mit KI)", () => {
    expect(talk("Diese Woche dreimal Sport, einmal Schwimmen Mittwoch 18 Uhr").sportWish).toBe(3);
  });

  it("Reihenfolge und Tag-Etiketten", () => {
    const items = sortWeek(talk(TAFEL).items);
    expect(items.map((i) => i.art)).toEqual(["termin", "termin", "termin", "aufgabe"]);
    expect(weekDayLabel(items[0], TODAY)).toBe("Di 27");
    expect(weekDayLabel({ id: "x", art: "aufgabe", raum: "familie", title: "A", who: [] }, TODAY)).toBe("Woche");
    expect(weekDayLabel({ id: "x", art: "aufgabe", raum: "familie", title: "A", who: [], due: "2026-10-30" }, TODAY)).toBe("bis Fr");
  });
});
