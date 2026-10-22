import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { isPast, readSentence, timeLabel, timeSuggestions } from "@/lib/kalender/sentence";

const TODAY = "2026-10-21"; // Mittwoch
beforeEach(() => at(`${TODAY}T10:30`));
const r = (t: string) => readSentence(t, TODAY);

describe("Ein Satz genügt: Uhrzeit", () => {
  it.each([
    ["Zahnarzt 12:30", "12:30"],
    ["Zahnarzt 12.30", "12:30"],
    ["Zahnarzt 12 Uhr 30", "12:30"],
    ["Zahnarzt 12 Uhr", "12:00"],
    ["Zahnarzt um 4", "16:00"],
    ["Zahnarzt halb eins", "12:30"],
    ["Zahnarzt viertel nach 3", "15:15"],
    ["Elternabend viertel vor 8", "19:45"],
    ["Essen mittags", "12:00"],
    ["Kino abends", "19:00"],
    ["Joggen morgens um 7", "07:00"],
    ["Kino um acht", "20:00"],
    ["Kino acht Uhr", "20:00"],
  ])("%s → %s", (text, time) => {
    expect(r(text).time).toBe(time);
  });
});

describe("Ein Satz genügt: Tag", () => {
  it.each([
    ["28.10. Zahnarzt", "2026-10-28"],
    ["28.10 Zahnarzt", "2026-10-28"],
    ["28.10.2027 Zahnarzt", "2027-10-28"],
    ["28. Oktober Zahnarzt", "2026-10-28"],
    ["heute Zahnarzt", "2026-10-21"],
    ["morgen Zahnarzt", "2026-10-22"],
    ["übermorgen Zahnarzt", "2026-10-23"],
    ["Mittwoch Zahnarzt", "2026-10-21"],
    ["nächsten Mittwoch Zahnarzt", "2026-10-28"],
    ["Freitag Zahnarzt", "2026-10-23"],
    ["in 3 Tagen Zahnarzt", "2026-10-24"],
    ["nächste Woche Zahnarzt", "2026-10-26"],
    ["nächste Woche Dienstag Zahnarzt", "2026-10-27"],
    ["3.2. Zahnarzt", "2027-02-03"],
  ])("%s → %s", (text, date) => {
    expect(r(text).date).toBe(date);
  });

  it("ungültige Daten werden nicht erkannt", () => {
    expect(r("31.2. Zahnarzt").date).toBeUndefined();
  });
});

describe("Ein Satz genügt: Titel und Stellen", () => {
  it("„Mittwoch 12.30 Zahnarzt“ → Mi + 12:30, Titel „Zahnarzt“", () => {
    expect(r("Mittwoch 12.30 Zahnarzt")).toMatchObject({ date: "2026-10-21", time: "12:30", title: "Zahnarzt" });
  });
  it("„28.10. 12.30 Zahnarzt“ → Titel „Zahnarzt“", () => {
    expect(r("28.10. 12.30 Zahnarzt")).toMatchObject({ date: "2026-10-28", time: "12:30", title: "Zahnarzt" });
  });
  it("„28.10. Zahnarzt“ → ganztägig", () => {
    expect(r("28.10. Zahnarzt")).toEqual({ date: "2026-10-28", title: "Zahnarzt", spans: [{ start: 0, end: 6 }] });
  });
  it("„Hallo“ → nichts erkannt", () => {
    expect(r("Hallo")).toEqual({ title: "Hallo", spans: [] });
  });
  it("„am“/„um“ verschwinden mit", () => {
    expect(r("Zahnarzt am Freitag um 9:15").title).toBe("Zahnarzt");
    expect(r("Elternabend morgen um 19:30 in der Schule").title).toBe("Elternabend in der Schule");
  });
  it("Stellen für die Hinterlegung", () => {
    const s = r("Mittwoch 12.30 Zahnarzt");
    expect(s.spans.map((x) => "Mittwoch 12.30 Zahnarzt".slice(x.start, x.end))).toEqual(["Mittwoch", "12.30"]);
  });
  it("„Guten Morgen“ ist kein Tag", () => {
    expect(r("Guten Morgen sagen").date).toBeUndefined();
  });
});

describe("Ein Satz genügt: Hilfen", () => {
  it("Uhrzeit immer mit Minuten", () => {
    expect(timeLabel("19:30")).toBe("19:30");
    expect(timeLabel("08:00")).toBe("8:00");
  });
  it("Vorschläge: heute ab der nächsten halben Stunde, sonst feste", () => {
    expect(timeSuggestions(TODAY, TODAY, 10 * 60 + 30)).toEqual(["11:00", "12:00", "13:00", "14:00"]);
    expect(timeSuggestions(TODAY, TODAY, 17 * 60 + 10)).toEqual(["17:30", "18:00", "18:30", "19:00"]);
    expect(timeSuggestions("2026-10-22", TODAY, 600)).toEqual(["08:00", "12:00", "15:00", "19:30"]);
  });
  it("Zeit schon vorbei", () => {
    expect(isPast(TODAY, "10:00", TODAY, 10 * 60 + 30)).toBe(true);
    expect(isPast(TODAY, "11:00", TODAY, 10 * 60 + 30)).toBe(false);
    expect(isPast("2026-10-22", "10:00", TODAY, 10 * 60 + 30)).toBe(false);
    expect(isPast(TODAY, null, TODAY, 10 * 60 + 30)).toBe(false);
  });
});
