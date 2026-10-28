// Launch 1.0 (Prüfstand-Fälle): „am 29.“, „um 14 Uhr“, Wochentage („Mittwoch
// nächste Woche“) und mehrere Termine in einem Satz – ohne KI (Schnelleingabe,
// Testmodus, Rückfall) genauso wie mit.
import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { nextDayOfMonth, readSentence, splitTermine } from "@/lib/kalender/sentence";
import { findDate, parseCalendar } from "@/lib/kalender/parse";
import { readQuick } from "@/lib/core/schnelleingabe";
import { ask, context } from "../begleitung/testmodusHilfen";

const TODAY = "2026-10-21"; // Mittwoch
beforeEach(() => at(`${TODAY}T10:30`));

describe("am 29. (ohne Monat)", () => {
  it.each([
    ["Am 29. um 14 Uhr Kinderturnen", "2026-10-29", "14:00", "Kinderturnen"],
    ["Kinderturnen am 29. um 14 Uhr", "2026-10-29", "14:00", "Kinderturnen"],
    ["am 21. Zahnarzt", "2026-10-21", undefined, "Zahnarzt"],
    ["am 5. Friseur 9 Uhr", "2026-11-05", "09:00", "Friseur"],
  ])("%s → %s %s", (text, date, time, title) => {
    const s = readSentence(text, TODAY);
    expect(s.date).toBe(date);
    expect(s.time).toBe(time);
    expect(s.title).toBe(title);
    expect(findDate(text, TODAY)?.date).toBe(date);
  });

  it("gibt es den Tag im Monat nicht, der nächste Monat mit ihm", () => {
    expect(nextDayOfMonth(31, "2026-11-02")).toBe("2026-12-31");
    expect(nextDayOfMonth(30, "2027-02-01")).toBe("2027-03-30");
    expect(nextDayOfMonth(32, TODAY)).toBeNull();
  });

  it("„28.10.“ bleibt ein Datum mit Monat", () => {
    expect(readSentence("am 28.10. Zahnarzt", TODAY).date).toBe("2026-10-28");
  });
});

describe("Wochentage", () => {
  it.each([
    ["Mittwoch nächste Woche um 14 Uhr Elterngespräch", "2026-10-28", "Elterngespräch"],
    ["nächste Woche Mittwoch 14 Uhr Elterngespräch", "2026-10-28", "Elterngespräch"],
    ["Freitag in der nächsten Woche Friseur", "2026-10-30", "Friseur"],
    ["Donnerstag um 14 Uhr Turnen", "2026-10-22", "Turnen"],
    ["Mittwoch Elterngespräch", "2026-10-21", "Elterngespräch"],
  ])("%s → %s", (text, date, title) => {
    const s = readSentence(text, TODAY);
    expect(s.date).toBe(date);
    expect(s.title).toBe(title);
  });
});

describe("Mehrere Termine in einem Satz", () => {
  it("trennt nur, wenn jeder Teil einen eigenen Tag hat", () => {
    expect(splitTermine("Montag Zahnarzt um 9 und Dienstag Friseur um 14 Uhr", TODAY)).toEqual(["Montag Zahnarzt um 9", "Dienstag Friseur um 14 Uhr"]);
    expect(splitTermine("Morgen Kino, am 29. Turnen um 14 Uhr", TODAY)).toEqual(["Morgen Kino", "am 29. Turnen um 14 Uhr"]);
    expect(splitTermine("Zahnarzt und Friseur am Montag", TODAY)).toEqual(["Zahnarzt und Friseur am Montag"]);
    expect(splitTermine("Montag Oma und Opa besuchen", TODAY)).toEqual(["Montag Oma und Opa besuchen"]);
  });

  it("Schnelleingabe liest jeden Teil richtig", () => {
    const [a, b] = splitTermine("Montag Zahnarzt um 9 und Dienstag Friseur um 14 Uhr", TODAY).map((t) => readQuick("termin", t, TODAY));
    expect(a).toMatchObject({ title: "Zahnarzt", date: "2026-10-26", time: "09:00" });
    expect(b).toMatchObject({ title: "Friseur", date: "2026-10-27", time: "14:00" });
  });

  it("Testmodus (ohne KI): zwei Termine statt einem", async () => {
    const r = await ask(context(), "Montag Zahnarzt um 9 und Dienstag Friseur um 14 Uhr");
    const termine = r.uses.filter((u) => u.name === "termin_anlegen");
    expect(termine.map((u) => [u.input.titel, u.input.datum, u.input.start])).toEqual([
      ["Zahnarzt", "2026-10-26", "09:00"],
      ["Friseur", "2026-10-27", "14:00"],
    ]);
  });
});

describe("Regeln ohne KI: Prüfstand-Sätze (Fehler: falscher Tag oder 18 statt 6 Uhr)", () => {
  it.each([
    ["Trag ein: Werkstatt am Freitag um 7:30", "2026-10-23", "07:30", "Werkstatt"],
    ["zahnartz do 16 uhr", "2026-10-22", "16:00", "Zahnartz"],
    ["Felix fliegt am 5.11. um 6 Uhr nach München", "2026-11-05", "06:00", "Felix fliegt nach München"],
    ["Mittwoch nächste Woche um 14 Uhr Elterngespräch", "2026-10-28", "14:00", "Elterngespräch"],
    ["Ich muss am Mittwoch nächste Woche um 9 zum Arzt", "2026-10-28", "09:00", "Zum Arzt"],
    ["Physio Donnerstag in einer Woche um 10", "2026-10-29", "10:00", "Physio"],
    ["Lisa hat morgen um viertel nach drei Elterngespräch", "2026-10-22", "15:15", "Lisa Elterngespräch"],
    ["Ähm also morgen, nee übermorgen, um drei Zahnarzt", "2026-10-23", "15:00", "Zahnarzt"],
    ["Termin Zahnarzt, also nicht Donnerstag sondern Freitag 16 Uhr", "2026-10-23", "16:00", "Zahnarzt"],
    ["um 3 Kinderarzt", "2026-10-21", "15:00", "Kinderarzt"],
  ])("%s → %s %s", (text, date, start, title) => {
    const c = parseCalendar(text, TODAY);
    expect(c?.kind === "create" && c.draft.typ === "termin" ? [c.draft.data.date, c.draft.data.start, c.draft.data.title] : c).toEqual([date, start, title]);
    // Schnelleingabe liest Tag und Uhrzeit genauso
    const s = readSentence(text, TODAY);
    expect([s.date ?? TODAY, s.time]).toEqual([date, start]);
  });

  it("„nächste Woche“ allein: Aufgabe ab Montag (kein Zeitraum mehr, Tafel 103)", () => {
    const c = parseCalendar("Ich muss nächste Woche noch die Reifen machen", TODAY);
    expect(c?.kind === "create" && c.draft.typ === "aufgabe" ? c.draft.data.date : null).toBe("2026-10-26");
  });
});
