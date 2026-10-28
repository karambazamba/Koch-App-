import { describe, expect, it } from "vitest";
import { dueLabel, isNeu, itemsForDay, taskOverview, tomorrowLabel, type AufgabeData, type CalendarEntry } from "@/lib/kalender/model";
import { PHASES } from "@/lib/heute/phases";
import { aufgabe, at, termin } from "../helpers";

describe("Fristen und Wochentage", () => {
  it("benennt Fristen kurz: heute, morgen, Wochentag, Datum", () => {
    expect(dueLabel("2026-10-20", "2026-10-20")).toBe("bis heute");
    expect(dueLabel("2026-10-21", "2026-10-20")).toBe("bis morgen");
    expect(dueLabel("2026-10-23", "2026-10-20")).toBe("bis Fr");
    expect(dueLabel("2026-11-02", "2026-10-20")).toBe("bis 2.11.");
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

  it("nimmt Unerledigtes von gestern still auf heute mit – ohne Etikett", () => {
    at("2026-10-21T08:00");
    const entries = [aufgabe({ title: "Steuer", date: "2026-10-20" })];
    const today = itemsForDay(entries, "2026-10-21", "2026-10-21");
    expect(today.map((i) => i.title)).toEqual(["Steuer"]);
    expect(Object.keys(today[0])).not.toContain("carried");
  });

  it("alles ist heute: eine Liste (ohne Tag, alt „diese Woche“, Frist), Geplant erst ab dem Tag (Tafel 103)", () => {
    at("2026-10-20T08:00");
    const entries = [
      aufgabe({ title: "Heute", date: "2026-10-20" }),
      aufgabe({ title: "Woche", week: "2026-10-19" }),
      aufgabe({ title: "Ohne Tag" }),
      aufgabe({ title: "Frist", due: "2026-10-30" }),
      aufgabe({ title: "KFZ-Steuer", date: "2026-10-23" }),
      aufgabe({ title: "Nächste Woche (alt)", week: "2026-10-26" }),
    ];
    const g = taskOverview(entries, "2026-10-20");
    expect(Object.keys(g)).toEqual(["heute", "geplant", "erledigt"]);
    expect(g.heute.map((i) => i.title)).toEqual(["Heute", "Woche", "Ohne Tag", "Frist"]);
    expect(g.geplant.map((i) => [i.title, i.when])).toEqual([
      ["KFZ-Steuer", "Fr 23.10."],
      ["Nächste Woche (alt)", "Mo 26.10."],
    ]);
    // Ab Freitag steht die KFZ-Steuer in der Liste, im Kalender an ihrem Tag
    expect(taskOverview(entries, "2026-10-23").heute.map((i) => i.title)).toContain("KFZ-Steuer");
    expect(itemsForDay(entries, "2026-10-23", "2026-10-20").map((i) => i.title)).toEqual(["KFZ-Steuer"]);
  });
});

import { sortItems } from "@/lib/kalender/model";
import { parseCalendar } from "@/lib/kalender/parse";
import { readQuickText } from "@/lib/kalender/quick";

describe("Reihenfolge der Aufgaben (Tafel 103): dringend → neu → Erstellungszeit", () => {
  const made = (title: string, iso: string, data: Partial<AufgabeData> = {}) => ({ ...aufgabe({ title, ...data }), erstellt: iso });
  const orderedTasks = (list: CalendarEntry[], today: string) => taskOverview(list, today).heute;

  it("vier Aufgaben für heute stehen genau in der Reihenfolge, in der sie angelegt wurden – nie alphabetisch", () => {
    at("2026-10-20T08:00");
    const list = [made("Zahnpasta", "2026-10-20T07:00:00Z", { date: "2026-10-20" }), made("Apfel", "2026-10-20T07:01:00Z", { date: "2026-10-20" }), made("Milch", "2026-10-20T07:02:00Z", { date: "2026-10-20" }), made("Brot", "2026-10-20T07:03:00Z", { date: "2026-10-20" })];
    expect(orderedTasks(list, "2026-10-20").map((i) => i.title)).toEqual(["Zahnpasta", "Apfel", "Milch", "Brot"]);
    expect(itemsForDay(list, "2026-10-20", "2026-10-20").map((i) => i.title)).toEqual(["Zahnpasta", "Apfel", "Milch", "Brot"]);
  });

  it("dringend → heute neu angelegt → Rest nach Erstellungszeit (Frist, Tag, alter Zeitraum zählen nicht)", () => {
    at("2026-10-20T08:00");
    const list = [
      made("Neu 2", "2026-10-20T05:30:00Z"),
      made("Alt ohne Tag", "2026-10-01T00:00:00Z"),
      made("Woche", "2026-10-01T00:00:01Z", { week: "2026-10-19" }),
      made("Frist Fr", "2026-10-01T00:00:02Z", { due: "2026-10-23" }),
      made("Frist Mi", "2026-10-01T00:00:03Z", { due: "2026-10-21" }),
      made("Neu 1", "2026-10-20T05:00:00Z", { date: "2026-10-20" }),
      made("Wichtig", "2026-10-01T00:00:05Z", { dringend: true }),
    ];
    expect(orderedTasks(list, "2026-10-20").map((i) => i.title)).toEqual(["Wichtig", "Neu 1", "Neu 2", "Alt ohne Tag", "Woche", "Frist Fr", "Frist Mi"]);
    // Am nächsten Tag ist nichts mehr „neu“: nur noch nach Erstellungszeit
    expect(orderedTasks(list, "2026-10-21").map((i) => i.title)).toEqual(["Wichtig", "Alt ohne Tag", "Woche", "Frist Fr", "Frist Mi", "Neu 1", "Neu 2"]);
  });

  it("„neu“ heißt heute angelegt (Berliner Tag) – am nächsten Tag weg", () => {
    const item = (erstellt: string) => ({ entry: { ...aufgabe({ title: "X" }), erstellt } });
    // 22:30 UTC = 0:30 Uhr in Berlin am nächsten Tag
    expect(isNeu(item("2026-10-20T22:30:00Z"), "2026-10-20")).toBe(false);
    expect(isNeu(item("2026-10-20T22:30:00Z"), "2026-10-21")).toBe(true);
    expect(isNeu(item("2026-10-20T08:00:00Z"), "2026-10-20")).toBe(true);
    expect(isNeu({ entry: termin({ title: "T", date: "2026-10-20", start: "09:00" }) }, "2026-10-20")).toBe(false);
  });

  it("Kalender-Tag: mit Uhrzeit nach Uhrzeit, sonst nach Anlegen; Titel ändern ändert nichts", () => {
    at("2026-10-20T08:00");
    const a = made("B spät", "2026-10-19T06:00:00Z", { date: "2026-10-20", time: "18:00" });
    const b = made("A früh", "2026-10-19T07:00:00Z", { date: "2026-10-20", time: "09:00" });
    const c = made("Ohne Zeit", "2026-10-19T05:00:00Z", { date: "2026-10-20" });
    expect(sortItems(itemsForDay([a, b, c], "2026-10-20", "2026-10-20")).map((i) => i.title)).toEqual(["A früh", "B spät", "Ohne Zeit"]);
    const renamed = { ...c, data: { ...c.data, title: "AAA umbenannt" } } as CalendarEntry;
    expect(orderedTasks([a, b, renamed], "2026-10-20").map((i) => i.title)[0]).toBe("AAA umbenannt");
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

describe("Der nächste Tag immer mit Wochentag (B4)", () => {
  it("„Morgen · Do“ und die Phase heißt „Morgens“", () => {
    expect(tomorrowLabel("2026-10-22")).toBe("Morgen · Do");
    const morning = PHASES.find((p) => p.id === "morgen")!;
    expect(morning.label).toBe("Morgens");
  });
});
