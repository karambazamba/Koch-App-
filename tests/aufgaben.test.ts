import { describe, expect, it } from "vitest";
import { createEntry } from "@/lib/core/entries";
import { carriedLabel, dueLabel, itemsForDay, taskOverview, type AufgabeData, type CalendarEntry, type TerminData } from "@/lib/kalender/model";
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

import { orderedTasks, sortItems } from "@/lib/kalender/model";
import { parseCalendar } from "@/lib/kalender/parse";
import { readQuickText } from "@/lib/kalender/quick";

describe("Reihenfolge der Aufgaben (B2)", () => {
  const made = (title: string, iso: string, data: Partial<AufgabeData> = {}) => ({ ...aufgabe({ title, ...data }), erstellt: iso });

  it("vier Aufgaben für heute stehen genau in der Reihenfolge, in der sie angelegt wurden – nie alphabetisch", () => {
    at("2026-10-20T08:00");
    const list = [made("Zahnpasta", "2026-10-20T07:00:00Z", { date: "2026-10-20" }), made("Apfel", "2026-10-20T07:01:00Z", { date: "2026-10-20" }), made("Milch", "2026-10-20T07:02:00Z", { date: "2026-10-20" }), made("Brot", "2026-10-20T07:03:00Z", { date: "2026-10-20" })];
    expect(orderedTasks(list, "2026-10-20").map((i) => i.title)).toEqual(["Zahnpasta", "Apfel", "Milch", "Brot"]);
    expect(itemsForDay(list, "2026-10-20", "2026-10-20").map((i) => i.title)).toEqual(["Zahnpasta", "Apfel", "Milch", "Brot"]);
  });

  it("dringend → heute → Frist (früheste zuerst) → diese Woche → irgendwann", () => {
    at("2026-10-20T08:00");
    const list = [
      made("Irgendwann", "2026-10-01T00:00:00Z"),
      made("Woche", "2026-10-01T00:00:01Z", { week: "2026-10-19" }),
      made("Frist Fr", "2026-10-01T00:00:02Z", { due: "2026-10-23" }),
      made("Frist Mi", "2026-10-01T00:00:03Z", { due: "2026-10-21" }),
      made("Heute", "2026-10-01T00:00:04Z", { date: "2026-10-20" }),
      made("Wichtig", "2026-10-01T00:00:05Z", { dringend: true }),
    ];
    expect(orderedTasks(list, "2026-10-20").map((i) => i.title)).toEqual(["Wichtig", "Heute", "Frist Mi", "Frist Fr", "Woche", "Irgendwann"]);
  });

  it("mit Uhrzeit nach Uhrzeit, sonst nach Anlegen; Titel ändern ändert nichts", () => {
    at("2026-10-20T08:00");
    const a = made("B spät", "2026-10-20T06:00:00Z", { date: "2026-10-20", time: "18:00" });
    const b = made("A früh", "2026-10-20T07:00:00Z", { date: "2026-10-20", time: "09:00" });
    const c = made("Ohne Zeit", "2026-10-20T05:00:00Z", { date: "2026-10-20" });
    expect(sortItems(itemsForDay([a, b, c], "2026-10-20", "2026-10-20")).map((i) => i.title)).toEqual(["A früh", "B spät", "Ohne Zeit"]);
    const renamed = { ...c, data: { ...c.data, title: "AAA umbenannt" } } as CalendarEntry;
    expect(orderedTasks([a, b, renamed], "2026-10-20").map((i) => i.title).pop()).toBe("AAA umbenannt");
  });
});

describe("Dringend (B3)", () => {
  it("„Dringend: …“ und „… ist wichtig“ werden erkannt, das Wort verschwindet aus dem Titel", () => {
    expect(readQuickText("Dringend: Steuerberater anrufen", "2026-10-20")).toMatchObject({ title: "Steuerberater anrufen", urgent: true });
    expect(readQuickText("Steuerberater anrufen ist wichtig", "2026-10-20")).toMatchObject({ title: "Steuerberater anrufen", urgent: true });
    expect(readQuickText("Wichtige Unterlagen holen", "2026-10-20").urgent).toBe(false);
    const cmd = parseCalendar("Dringend: Kita-Formular abgeben", "2026-10-20");
    expect(cmd?.kind === "create" && cmd.draft.typ === "aufgabe" && cmd.draft.data.dringend).toBe(true);
  });
});
