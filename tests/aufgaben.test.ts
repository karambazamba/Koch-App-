import { describe, expect, it } from "vitest";
import { createEntry } from "@/lib/core/entries";
import { carriedLabel, dueLabel, itemsForDay, taskOverview, type AufgabeData, type CalendarEntry, type TerminData } from "@/lib/aufgaben/model";
import { at } from "./helpers";

const aufgabe = (data: Partial<AufgabeData> & { title: string }) => createEntry("aufgabe", { reminder: "aus", ...data }) as CalendarEntry;
const termin = (data: Partial<TerminData> & { title: string; date: string; start: string }) => createEntry("termin", { reminder: "aus", ...data }) as CalendarEntry;

describe("Fristen und Wochentage", () => {
  it("benennt Fristen kurz: heute, morgen, Wochentag, Datum", () => {
    expect(dueLabel("2026-10-20", "2026-10-20")).toBe("bis heute");
    expect(dueLabel("2026-10-21", "2026-10-20")).toBe("bis morgen");
    expect(dueLabel("2026-10-23", "2026-10-20")).toBe("bis Fr");
    expect(dueLabel("2026-11-02", "2026-10-20")).toBe("bis 2.11.");
  });

  it("nennt Mitgenommenes ohne Druck: von gestern, von Montag, von letzter Woche", () => {
    expect(carriedLabel("2026-10-21", "2026-10-22")).toBe("von gestern");
    expect(carriedLabel("2026-10-19", "2026-10-22")).toBe("von Montag");
    expect(carriedLabel("2026-10-12", "2026-10-22")).toBe("von letzter Woche");
  });
});

describe("Aufgaben und Termine an einem Tag", () => {
  it("sortiert nach Uhrzeit, ohne Uhrzeit danach, Erledigtes ans Ende", () => {
    at("2026-10-20T08:00");
    const entries = [
      aufgabe({ title: "Ohne Zeit", date: "2026-10-20" }),
      termin({ title: "Spät", date: "2026-10-20", start: "17:00" }),
      termin({ title: "Früh", date: "2026-10-20", start: "09:00" }),
      aufgabe({ title: "Erledigt", date: "2026-10-20", doneOn: "2026-10-20" }),
    ];
    const titles = itemsForDay(entries, "2026-10-20", "2026-10-20").map((i) => i.title);
    expect(titles).toEqual(["Früh", "Spät", "Ohne Zeit", "Erledigt"]);
  });

  it("nimmt Unerledigtes von gestern still auf heute mit", () => {
    at("2026-10-21T08:00");
    const entries = [aufgabe({ title: "Steuer", date: "2026-10-20" })];
    const today = itemsForDay(entries, "2026-10-21", "2026-10-21");
    expect(today.map((i) => [i.title, i.carried])).toEqual([["Steuer", "von gestern"]]);
  });

  it("gruppiert die Übersicht: heute dran, diese Woche, irgendwann", () => {
    at("2026-10-20T08:00");
    const entries = [
      aufgabe({ title: "Heute", date: "2026-10-20" }),
      aufgabe({ title: "Woche", week: "2026-10-19" }),
      aufgabe({ title: "Irgendwann" }),
    ];
    const g = taskOverview(entries, "2026-10-20");
    expect(g.heute.map((i) => i.title)).toContain("Heute");
    expect(g.woche.map((i) => i.title)).toContain("Woche");
    expect(g.irgendwann.map((i) => i.title)).toContain("Irgendwann");
  });
});
