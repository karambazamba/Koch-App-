import { beforeEach, describe, expect, it } from "vitest";
import { at, termin } from "../helpers";
import { EMPTY_SPORT, freeStarts, sanitizeSport } from "@/lib/sport/model";
import { stempelkarte } from "@/lib/sport/stempel";
import { changePlanned, clashText, clashWith, lastTimeFor, nextLine, plannedEntry, sportOfTitle } from "@/lib/sport/plan";
import { itemsForDay, type CalendarEntry, type Termin } from "@/lib/kalender/model";

const TODAY = "2026-10-21"; // Mittwoch
const STAMP = "2026-10-21T08:00:00.000Z";
beforeEach(() => at(`${TODAY}T10:30`));

const plan = (extra = {}) => ({ sport: "laufen", date: "2026-10-22", start: "18:30", minutes: 45, weekly: false, ...extra });

describe("Training planen (Tafel 25)", () => {
  it("eigene Uhrzeit 18:30 → Termin mit Etikett Sport, Ende, Erinnerung", () => {
    const e = plannedEntry(plan(), "a1") as Termin;
    expect(e.data).toMatchObject({ title: "Laufen", date: "2026-10-22", start: "18:30", end: "19:15", reminder: "30", label: "Sport", who: ["a1"], repeat: null });
  });

  it("„Jede Woche“ → wöchentliche Serie am Wochentag", () => {
    const e = plannedEntry(plan({ weekly: true }), null) as Termin;
    expect(e.data.repeat).toEqual({ kind: "woechentlich" });
    expect(itemsForDay([e], "2026-10-29", TODAY)).toHaveLength(1);
    expect(itemsForDay([e], "2026-10-28", TODAY)).toHaveLength(0);
  });

  it("Felder: geplant mit Uhrzeit und Sportart, eigene Sportart bleibt ihr Name", () => {
    const entries = [plannedEntry(plan(), null)!, plannedEntry(plan({ sport: "Tennis", date: "2026-10-24", start: "10:00" }), null)!];
    const felder = stempelkarte(EMPTY_SPORT, entries, TODAY, 10 * 60 + 30).felder;
    expect(felder[0]).toMatchObject({ art: "geplant", label: "Do 18:30", sport: "laufen" });
    expect(felder[1]).toMatchObject({ art: "geplant", label: "Sa 10:00", sport: "Tennis" });
    expect(felder[2]).toEqual({ art: "frei" });
    expect(sportOfTitle("Tennis")).toBe("Tennis");
  });

  it("Überschneidung: Hinweis mit Titel und Uhrzeit, sonst „Frei“", () => {
    const entries = [termin({ title: "Zahnarzt", date: "2026-10-22", start: "18:00", end: "19:00" })];
    const clash = clashWith(entries, "2026-10-22", TODAY, "18:30", 45);
    expect(clashText(clash)).toBe("Überschneidet sich mit Zahnarzt 18:00");
    expect(clashText(clashWith(entries, "2026-10-22", TODAY, "19:00", 45))).toBe("Frei – nichts im Kalender");
    // ohne Ende = 60 Min
    expect(clashWith([termin({ title: "Kurs", date: "2026-10-22", start: "07:00" })], "2026-10-22", TODAY, "07:45", 30)?.title).toBe("Kurs");
  });

  it("Vorauswahl: zuletzt genutzte Zeit für diese Sportart", () => {
    const old = { ...plannedEntry(plan({ date: "2026-10-01", start: "07:15" }), null)!, geaendert: "2026-10-01T00:00:00.000Z" };
    const newer = { ...plannedEntry(plan({ date: "2026-10-15", start: "06:45" }), null)!, geaendert: "2026-10-15T00:00:00.000Z" };
    const swim = plannedEntry(plan({ sport: "schwimmen", date: "2026-10-16", start: "20:00" }), null)!;
    expect(lastTimeFor([old, newer, swim], "laufen")).toBe("06:45");
    expect(lastTimeFor([old, newer, swim], "schwimmen")).toBe("20:00");
    expect(lastTimeFor([old], "yoga")).toBeNull();
  });

  it("Vorschläge heute nur, was noch kommt", () => {
    expect(freeStarts([], TODAY, TODAY, 45, 3, 17 * 60 + 40)).toEqual(["18:00", "19:00", "20:00"]);
  });

  it("„Als Nächstes“: Tag, Uhrzeit, Titel, Dauer", () => {
    const e = plannedEntry(plan({ date: "2026-10-24", start: "18:00" }), null) as CalendarEntry;
    const [item] = itemsForDay([e], "2026-10-24", TODAY);
    expect(nextLine(item, TODAY)).toBe("Sa 18:00 · Laufen · 45 Min");
    const [tomorrow] = itemsForDay([plannedEntry(plan(), null)!], "2026-10-22", TODAY);
    expect(nextLine(tomorrow, TODAY)).toBe("Morgen · Do 18:30 · Laufen · 45 Min");
  });

  it("Ändern: einzeln direkt, Serie „nur diesmal“ = Ausnahme + Einzeltermin, „jede Woche“ = Serie ändert sich", () => {
    const single = plannedEntry(plan(), null)!;
    const [s] = itemsForDay([single], "2026-10-22", TODAY);
    const changed = changePlanned([single], s, plan({ start: "19:00", minutes: 60 }), "serie", STAMP, null);
    expect(changed).toHaveLength(1);
    expect((changed[0] as Termin).data).toMatchObject({ start: "19:00", end: "20:00" });

    const series = plannedEntry(plan({ weekly: true }), null)!;
    const [occ] = itemsForDay([series], "2026-10-29", TODAY);
    const once = changePlanned([series], occ, plan({ date: "2026-10-29", start: "07:00", weekly: true }), "diesmal", STAMP, null);
    expect(once).toHaveLength(2);
    expect(itemsForDay(once, "2026-10-29", TODAY).map((i) => i.time)).toEqual(["07:00"]);
    expect(itemsForDay(once, "2026-11-05", TODAY).map((i) => i.time)).toEqual(["18:30"]);

    const all = changePlanned([series], occ, plan({ date: "2026-10-29", start: "20:00", sport: "rad", weekly: true }), "serie", STAMP, null);
    expect(all).toHaveLength(1);
    expect(itemsForDay(all, "2026-11-05", TODAY).map((i) => `${i.time} ${i.title}`)).toEqual(["20:00 Rad"]);
  });

  it("eigene Sportarten werden gemerkt (alte Speicherstände ohne Feld = leer)", () => {
    expect(sanitizeSport({ goal: 3 }).custom).toEqual([]);
    expect(sanitizeSport({ custom: ["Tennis", " Tennis ", 5, ""] }).custom).toEqual(["Tennis"]);
  });
});

describe("Mia versteht Sport-Zeiten frei", () => {
  it("„Samstag 18:30 laufen gehen“ → Termin Sa 18:30 mit Etikett Sport (zählt auf der Kachel)", async () => {
    const { parseCalendar } = await import("@/lib/kalender/parse");
    const cmd = parseCalendar("Samstag 18:30 laufen gehen", TODAY);
    expect(cmd?.kind).toBe("create");
    if (cmd?.kind !== "create") return;
    expect(cmd.draft.data).toMatchObject({ date: "2026-10-24", start: "18:30", label: "Sport" });
  });
});
