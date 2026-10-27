// Kalender = nur Termine (Tafel 74, angepasst an Tafel 76): Punkte je Person
// (höchstens 3, Familie ohne Person Orange, Arbeit Blau, ich = meine Farbe),
// Tag-Kopf „in 7 Tagen“, Schnell-Chips nur bei ≥ 3× am Wochentag und nie bei
// Serien, ＋/Zeile/lange drücken = Schnelleingabe mit dem gewählten Tag (Satz
// ohne KI → 16:00 an diesem Tag, anderes Datum im Satz gewinnt), kein Essen
// und keine Aufgaben im Kalender, Mia versteht ihre eigenen Fragen auch ohne KI.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aufgabe, termin } from "../helpers";
import { calendarDots, dayDistance, recurringSuggestions, termineOn } from "@/lib/kalender/monat";
import { readQuick } from "@/lib/core/schnelleingabe";
import { isCookIdeasRequest } from "@/lib/essen/dishIdeas";

const TODAY = "2026-10-21"; // Mittwoch
const persons = [
  { id: "p1", name: "Felix" },
  { id: "p2", name: "Lisa" },
  { id: "p3", name: "Jonne" },
  { id: "p4", name: "Mathis" },
];
const t = (title: string, date: string, extra: Record<string, unknown> = {}, raum: "familie" | "arbeit" = "familie") => termin({ title, date, start: "16:00", ...extra }, raum);

describe("Punkte je Person", () => {
  it("Familie ohne Person = Orange, Arbeit = Blau, je Person einer – höchstens 3", () => {
    const items = termineOn([t("Kita", "2026-10-23"), t("Meeting", "2026-10-23", {}, "arbeit"), t("Zahnarzt", "2026-10-23", { who: ["p3"] }), t("Turnen", "2026-10-23", { who: ["p4"] })], "2026-10-23", TODAY);
    const dots = calendarDots(items, persons, "p1");
    expect(dots).toHaveLength(3);
    expect(new Set(dots.map((d) => d.key)).size).toBe(3);
    expect(calendarDots(items.slice(0, 2), persons, "p1").map((d) => d.kind).sort()).toEqual(["arbeit", "familie"]);
    expect(calendarDots(items.slice(2, 3), persons, "p1")[0]).toMatchObject({ key: "p3", kind: "person" });
  });

  it("ich = „Meine Farbe im Kalender“; eine Person zweimal = ein Punkt", () => {
    const items = termineOn([t("Physio", "2026-10-23", { who: ["p1"] }), t("Friseur", "2026-10-23", { who: ["p1"] })], "2026-10-23", TODAY);
    expect(calendarDots(items, persons, "p1")).toEqual([{ key: "p1", kind: "ich" }]);
  });

  it("Aufgaben stehen nie im Kalender – auch mit Tag", () => {
    const entries = [aufgabe({ title: "Steuer", date: "2026-10-23" }), t("Kita", "2026-10-23")];
    expect(termineOn(entries, "2026-10-23", TODAY).map((i) => i.title)).toEqual(["Kita"]);
    expect(calendarDots(termineOn([entries[0]], "2026-10-23", TODAY), persons, "p1")).toEqual([]);
  });
});

describe("Tag-Kopf", () => {
  it("heute / morgen / in 7 Tagen / gestern", () => {
    expect(dayDistance(TODAY, TODAY)).toBe("heute");
    expect(dayDistance("2026-10-22", TODAY)).toBe("morgen");
    expect(dayDistance("2026-10-28", TODAY)).toBe("in 7 Tagen");
    expect(dayDistance("2026-10-20", TODAY)).toBe("gestern");
    expect(dayDistance("2026-10-18", TODAY)).toBe("vor 3 Tagen");
  });
});

describe("Schnell eintragen – nur Wiederkehrendes", () => {
  const fridays = ["2026-10-02", "2026-10-09", "2026-10-16"];
  it("≥ 3× am selben Wochentag in 8 Wochen → Chip für Freitag", () => {
    const entries = fridays.map((d) => t("Schwimmen", d, { start: "15:00" }));
    expect(recurringSuggestions(entries, "2026-10-23", TODAY)).toEqual([{ title: "Schwimmen", time: "15:00", room: "familie" }]);
  });

  it("nur 2×, schon eingetragen, andere Uhrzeit oder anderer Wochentag → nichts", () => {
    expect(recurringSuggestions(fridays.slice(1).map((d) => t("Schwimmen", d, { start: "15:00" })), "2026-10-23", TODAY)).toEqual([]);
    const all = [...fridays.map((d) => t("Schwimmen", d, { start: "15:00" })), t("schwimmen", "2026-10-23", { start: "15:00" })];
    expect(recurringSuggestions(all, "2026-10-23", TODAY)).toEqual([]);
    expect(recurringSuggestions([...fridays.slice(0, 2).map((d) => t("Chor", d, { start: "18:00" })), t("Chor", "2026-10-16", { start: "20:00" })], "2026-10-23", TODAY)).toEqual([]);
    expect(recurringSuggestions(fridays.map((d) => t("Schwimmen", d, { start: "15:00" })), "2026-10-22", TODAY)).toEqual([]);
  });

  it("nie bei Serien (die stehen ohnehin da)", () => {
    const series = t("Training", "2026-10-02", { start: "17:00", repeat: { kind: "woechentlich" } });
    expect(recurringSuggestions([series, ...fridays.map((d) => t("Training", d, { start: "17:00", repeat: { kind: "woechentlich" } }))], "2026-10-30", TODAY)).toEqual([]);
  });
});

describe("Eintragen am gewählten Tag (Schnelleingabe)", () => {
  it("Satz ohne Tag → 16:00 am gewählten Tag; anderes Datum im Satz gewinnt", () => {
    expect(readQuick("termin", "Zahnarzt mit Jonne um 16 Uhr", TODAY, { date: "2026-10-30" })).toMatchObject({ date: "2026-10-30", time: "16:00", title: "Zahnarzt mit Jonne" });
    expect(readQuick("termin", "Zahnarzt am 2.11. um 16 Uhr", TODAY, { date: "2026-10-30" })).toMatchObject({ date: "2026-11-02", time: "16:00" });
  });

  it("Launch 1.0: nur ＋ oben öffnet die Schnelleingabe mit dem gewählten Tag (kein langes Drücken, keine Zeile „Termin am …“)", () => {
    const page = readFileSync("src/components/kalender/CalendarPage.tsx", "utf8");
    const panel = readFileSync("src/components/kalender/DayPanel.tsx", "utf8");
    expect(page).toMatch(/openQuick\(\{ kind: "termin", date: day, more: setAdding \}\)/);
    expect(page).not.toMatch(/HOLD_MS|useDayHold/);
    expect(page).toMatch(/onClick=\{\(\) => onSelect\(date\)\}/);
    expect(panel).not.toMatch(/openQuick|Antippen und eintragen/);
  });

  it("kein Essen und keine Aufgaben im Kalender, kein „freier Tag“", () => {
    for (const f of ["src/components/kalender/CalendarPage.tsx", "src/components/kalender/DayPanel.tsx", "src/components/kalender/DayView.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/useMeals|dishOf|UtensilsCrossed|Ein freier Tag|Noch frei/);
    }
  });
});

describe("Mia versteht ihre eigenen Fragen auch ohne KI", () => {
  it.each(["Was könnten wir morgen essen?", "Was könnten wir am Freitag essen?", "Was könnten wir heute essen?", "Was gibt’s heute?", "Was gibt’s morgen?", "Was soll ich kochen?"])("„%s“ → Ideen statt „nicht verstanden“", (q) => {
    expect(isCookIdeasRequest(q)).toBe(true);
  });

  it("fremde Sätze bleiben fremd", () => {
    expect(isCookIdeasRequest("Was gibt’s Neues?")).toBe(false);
    expect(isCookIdeasRequest("Was kann ich mit Hack machen?")).toBe(false);
  });
});

