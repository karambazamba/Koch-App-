// Termine und Aufgaben: Wiederholungen, Verschieben, Erinnerung, Löschen,
// Reihenfolge und Reparieren (model.ts). 2026-10-19 ist ein Montag.
import { beforeEach, describe, expect, it } from "vitest";
import {
  aufgabeToTermin,
  findByTitle,
  itemsForDay,
  moveItem,
  openTaskCount,
  orderedTasks,
  removeItem,
  repeatLabel,
  sanitizeEntry,
  sanitizeRepeat,
  setDone,
  setReminder,
  setUrgent,
  taskBadge,
  taskOverview,
  terminExtras,
  terminToAufgabe,
  tomorrowLabel,
  upcomingTermine,
  upsertEntry,
  weekdayLong,
  carriedLabel,
  dueLabel,
  type Aufgabe,
  type Termin,
} from "@/lib/kalender/model";
import { addDays } from "@/lib/core/now";
import { at } from "../helpers";
import { aufgabe, termin } from "./hilfen";

const STAMP = "2026-10-20T10:00:00.000Z";
const titles = (list: { title: string }[]) => list.map((i) => i.title);

beforeEach(() => at("2026-10-20T08:00"));

describe("Wiederholungen", () => {
  it("täglich, wöchentlich, monatlich und an Wochentagen", () => {
    const entries = [
      termin({ title: "Täglich", date: "2026-10-19", start: "07:00", repeat: { kind: "taeglich" } }),
      termin({ title: "Wöchentlich", date: "2026-10-19", start: "08:00", repeat: { kind: "woechentlich" } }),
      termin({ title: "Monatlich", date: "2026-10-05", start: "09:00", repeat: { kind: "monatlich" } }),
      termin({ title: "Di+Do", date: "2026-10-19", start: "10:00", repeat: { kind: "wochentage", days: [1, 3] } }),
    ];
    expect(titles(itemsForDay(entries, "2026-10-26", "2026-10-20"))).toEqual(["Täglich", "Wöchentlich"]);
    expect(titles(itemsForDay(entries, "2026-11-05", "2026-10-20"))).toEqual(["Täglich", "Monatlich", "Di+Do"]);
    expect(titles(itemsForDay(entries, "2026-10-20", "2026-10-20"))).toEqual(["Täglich", "Di+Do"]);
    // vor dem ersten Tag nichts
    expect(itemsForDay(entries, "2026-10-18", "2026-10-20")).toEqual([]);
  });

  it("übersprungene Tage entfallen, Erledigtes je Tag", () => {
    const serie = termin({ title: "Kita", date: "2026-10-19", start: "08:00", repeat: { kind: "taeglich" }, skipDates: ["2026-10-21"], doneDates: ["2026-10-20"] });
    expect(itemsForDay([serie], "2026-10-21", "2026-10-20")).toEqual([]);
    expect(itemsForDay([serie], "2026-10-20", "2026-10-20")[0].done).toBe(true);
    expect(itemsForDay([serie], "2026-10-22", "2026-10-20")[0].done).toBe(false);
  });

  it("wiederkehrende Aufgaben starten am Wunschtag bzw. am Tag des Anlegens", () => {
    const a = aufgabe({ title: "Müll", repeat: { kind: "woechentlich" } });
    expect(titles(itemsForDay([a], "2026-10-27", "2026-10-20"))).toEqual(["Müll"]);
    expect(itemsForDay([a], "2026-10-21", "2026-10-20")).toEqual([]);
    const done = aufgabe({ title: "Gießen", date: "2026-10-20", repeat: { kind: "taeglich" }, doneDates: ["2026-10-20"] });
    expect(itemsForDay([done], "2026-10-20", "2026-10-20")[0].done).toBe(true);
  });

  it("benennt Wiederholungen", () => {
    expect(repeatLabel(null)).toBe("");
    expect(repeatLabel({ kind: "taeglich" })).toBe("täglich");
    expect(repeatLabel({ kind: "woechentlich" })).toBe("wöchentlich");
    expect(repeatLabel({ kind: "woechentlich" }, "2026-10-20")).toBe("jeden Dienstag");
    expect(repeatLabel({ kind: "monatlich" })).toBe("monatlich");
    expect(repeatLabel({ kind: "wochentage", days: [0, 2] })).toBe("jeden Montag, Mittwoch");
    expect(repeatLabel({ kind: "wochentage", days: [0, 1, 2, 3, 4, 5, 6] })).toBe("täglich");
  });

  it("Wochentag und Morgen immer mit Wochentag", () => {
    expect(weekdayLong("2026-10-25")).toBe("Sonntag");
    expect(tomorrowLabel("2026-10-21")).toBe("Morgen · Mi");
  });
});

describe("Ohne Druck: von früher, Fristen", () => {
  it("nennt ältere Aufgaben leise", () => {
    expect(carriedLabel("2026-10-12", "2026-10-26")).toBe("von früher");
    expect(carriedLabel("2026-10-18", "2026-10-21")).toBe("von letzter Woche");
    expect(dueLabel("2026-10-15", "2026-10-20")).toBe("bis 15.10.");
  });

  it("Aufgabe mit Frist steht an der Frist, Erledigtes am Tag des Abhakens", () => {
    const frist = aufgabe({ title: "Formular", due: "2026-10-22" });
    expect(itemsForDay([frist], "2026-10-22", "2026-10-20")[0].dueLabel).toBe("bis heute");
    expect(itemsForDay([frist], "2026-10-21", "2026-10-20")).toEqual([]);
    const erledigt = aufgabe({ title: "Fertig", date: "2026-10-18", doneOn: "2026-10-19" });
    expect(itemsForDay([erledigt], "2026-10-19", "2026-10-20")[0].done).toBe(true);
    expect(itemsForDay([erledigt], "2026-10-20", "2026-10-20")).toEqual([]);
  });

  it("‚diese Woche‘ von letzter Woche rutscht still auf heute, an vergangenen Tagen nichts", () => {
    const alt = aufgabe({ title: "Reifen", week: "2026-10-12" });
    const heute = itemsForDay([alt], "2026-10-20", "2026-10-20");
    expect(heute.map((i) => i.carried)).toEqual(["von letzter Woche"]);
    expect(itemsForDay([alt], "2026-10-19", "2026-10-20")).toEqual([]);
    expect(itemsForDay([aufgabe({ title: "Diese", week: "2026-10-19" })], "2026-10-20", "2026-10-20")).toEqual([]);
  });

  it("keine Druck-Wörter in den Beschriftungen", () => {
    const labels = [carriedLabel("2026-10-01", "2026-10-20"), dueLabel("2026-10-19", "2026-10-20"), dueLabel("2026-10-30", "2026-10-20")];
    for (const l of labels) expect(l).not.toMatch(/überfällig|verpasst|offen|fehlt/i);
  });
});

describe("Reihenfolge (nie alphabetisch)", () => {
  it("Tag: dringend vorne, ganztägige Termine, dann Uhrzeit, Erledigtes hinten", () => {
    at("2026-10-20T07:00");
    const z = aufgabe({ title: "Zebra", date: "2026-10-20" });
    at("2026-10-20T07:05");
    const a = aufgabe({ title: "Apfel", date: "2026-10-20" });
    const dringend = aufgabe({ title: "Dringend", date: "2026-10-20", dringend: true });
    const ganz = termin({ title: "Ganztag", date: "2026-10-20", start: "" });
    const um9 = termin({ title: "Neun", date: "2026-10-20", start: "09:00" });
    const done = aufgabe({ title: "Aaa erledigt", date: "2026-10-20", doneOn: "2026-10-20" });
    expect(titles(itemsForDay([done, a, um9, z, ganz, dringend], "2026-10-20", "2026-10-20"))).toEqual(["Dringend", "Ganztag", "Neun", "Zebra", "Apfel", "Aaa erledigt"]);
  });

  it("Übersicht: dringend → heute → Frist → Woche → später → irgendwann", () => {
    const entries = [
      aufgabe({ title: "A irgendwann" }),
      aufgabe({ title: "B später", date: "2026-11-10" }),
      aufgabe({ title: "C woche", week: "2026-10-19" }),
      aufgabe({ title: "D frist spät", due: "2026-10-30" }),
      aufgabe({ title: "E frist früh", due: "2026-10-23" }),
      aufgabe({ title: "F heute", date: "2026-10-20" }),
      aufgabe({ title: "G dringend", dringend: true }),
      aufgabe({ title: "H Do", date: "2026-10-22" }),
    ];
    const order = orderedTasks(entries, "2026-10-20");
    expect(titles(order)).toEqual(["G dringend", "F heute", "E frist früh", "D frist spät", "C woche", "H Do", "B später", "A irgendwann"]);
    expect(order.map((o) => o.group)).toEqual(["irgendwann", "heute", "woche", "spaeter", "woche", "woche", "spaeter", "irgendwann"]);
    expect(openTaskCount(entries, "2026-10-20")).toBe(8);
  });

  it("Übersicht: Serien, Erledigtes (14 Tage), nächste Woche, von früher", () => {
    const entries = [
      aufgabe({ title: "Serie heute", date: "2026-10-19", repeat: { kind: "taeglich" }, doneDates: ["2026-10-20"] }),
      aufgabe({ title: "Serie Fr", date: "2026-10-23", repeat: { kind: "woechentlich" } }),
      aufgabe({ title: "Serie später", date: "2026-11-02", repeat: { kind: "woechentlich" } }),
      aufgabe({ title: "Serie leer", date: "2026-10-19", repeat: { kind: "wochentage", days: [6] }, skipDates: Array.from({ length: 10 }, (_, i) => addDays("2026-10-25", i * 7)) }),
      aufgabe({ title: "Alt erledigt", doneOn: "2026-09-01" }),
      aufgabe({ title: "Neu erledigt", doneOn: "2026-10-19" }),
      aufgabe({ title: "Nächste Woche", week: "2026-10-26" }),
      aufgabe({ title: "Übernächste", week: "2026-11-02" }),
      aufgabe({ title: "Woche alt", week: "2026-10-05" }),
      aufgabe({ title: "Gestern", date: "2026-10-19", due: "2026-10-21" }),
    ];
    const g = taskOverview(entries, "2026-10-20");
    expect(titles(g.erledigt)).toEqual(["Serie heute", "Neu erledigt"]);
    // heute schon abgehakt → nächstes Vorkommen morgen
    expect(g.woche.find((i) => i.title === "Serie heute")?.when).toBe("Mi 21.10.");
    expect(g.woche.find((i) => i.title === "Serie Fr")?.when).toBe("Fr 23.10.");
    expect(titles(g.spaeter)).toEqual(["Nächste Woche", "Serie später", "Übernächste"]);
    expect(titles([...g.heute, ...g.woche, ...g.spaeter])).not.toContain("Serie leer");
    expect(g.spaeter.find((i) => i.title === "Nächste Woche")?.when).toBe("nächste Woche");
    expect(g.spaeter.find((i) => i.title === "Übernächste")?.when).toBe("ab Mo 2.11.");
    const alt = g.heute.find((i) => i.title === "Woche alt");
    expect(alt?.carried).toBe("von früher");
    const gestern = g.heute.find((i) => i.title === "Gestern")!;
    expect(gestern.carried).toBe("von gestern");
    expect(gestern.dueLabel).toBe("bis morgen");
  });

  it("Kurzlabel rechts in der Zeile", () => {
    const g = taskOverview([aufgabe({ title: "F", due: "2026-10-20" }), aufgabe({ title: "W", week: "2026-10-19" }), aufgabe({ title: "I" }), aufgabe({ title: "D", date: "2026-10-23" })], "2026-10-20");
    expect(taskBadge(g.heute[0], "2026-10-20")).toBe("heute");
    expect(taskBadge(g.woche.find((i) => i.title === "W")!, "2026-10-20")).toBe("diese Woche");
    expect(taskBadge(g.woche.find((i) => i.title === "D")!, "2026-10-20")).toBe("Fr 23.10.");
    expect(taskBadge(g.irgendwann[0], "2026-10-20")).toBe("heute");
    expect(taskBadge({ ...g.irgendwann[0], date: "2026-10-21" }, "2026-10-20")).toBe("");
    expect(taskBadge({ ...g.irgendwann[0], dueLabel: "bis Fr" }, "2026-10-20")).toBe("bis Fr");
    expect(taskBadge({ ...g.irgendwann[0], carried: "von gestern" }, "2026-10-20")).toBe("von gestern");
  });
});

describe("Ändern", () => {
  it("Abhaken: einmalig über doneOn, Serie je Tag – und zurück", () => {
    const a = aufgabe({ title: "Steuer", date: "2026-10-20" });
    const s = termin({ title: "Kita", date: "2026-10-19", start: "08:00", repeat: { kind: "taeglich" } });
    let list = setDone([a, s], { entry: a, date: "2026-10-20" }, true, STAMP);
    expect((list[0] as Aufgabe).data.doneOn).toBe("2026-10-20");
    list = setDone(list, { entry: a, date: "2026-10-20" }, false, STAMP);
    expect((list[0] as Aufgabe).data.doneOn).toBeNull();
    list = setDone(list, { entry: s, date: "2026-10-20" }, true, STAMP);
    list = setDone(list, { entry: s, date: "2026-10-20" }, true, STAMP);
    expect((list[1] as Termin).data.doneDates).toEqual(["2026-10-20"]);
    list = setDone(list, { entry: s, date: "2026-10-20" }, false, STAMP);
    expect((list[1] as Termin).data.doneDates).toEqual([]);
    expect(list[1].geaendert).toBe(STAMP);
    const fremd = aufgabe({ title: "Fremd" });
    expect(setDone(list, { entry: fremd, date: "2026-10-20" }, true, STAMP)).toBe(list);
  });

  it("Verschieben: einmalige wandern ganz, Aufgaben hinten einsortiert", () => {
    const t = termin({ title: "Zahnarzt", date: "2026-10-20", start: "09:00" });
    const a = aufgabe({ title: "Anrufen", date: "2026-10-20" });
    let list = moveItem([t, a], { entry: t, date: "2026-10-20" }, "2026-10-22", STAMP, "11:00");
    expect((list[0] as Termin).data).toMatchObject({ date: "2026-10-22", start: "11:00" });
    list = moveItem(list, { entry: t, date: "2026-10-22" }, "2026-10-23", STAMP);
    expect((list[0] as Termin).data).toMatchObject({ date: "2026-10-23", start: "11:00" });
    list = moveItem(list, { entry: a, date: "2026-10-20" }, "2026-10-21", STAMP, "15:00");
    expect((list[1] as Aufgabe).data).toMatchObject({ date: "2026-10-21", seit: STAMP, time: "15:00" });
    expect(moveItem(list, { entry: aufgabe({ title: "x" }), date: "2026-10-20" }, "2026-10-21", STAMP)).toBe(list);
  });

  it("Verschieben in einer Serie: nur dieser Tag, plus Einzelkopie", () => {
    const s = termin({ title: "Turnen", date: "2026-10-20", start: "16:00", repeat: { kind: "woechentlich" }, doneDates: ["2026-10-13"] });
    const list = moveItem([s], { entry: s, date: "2026-10-27" }, "2026-10-28", STAMP, "17:00");
    expect(list).toHaveLength(2);
    expect((list[0] as Termin).data.skipDates).toEqual(["2026-10-27"]);
    expect((list[1] as Termin).data).toMatchObject({ date: "2026-10-28", start: "17:00", repeat: null, doneDates: [], skipDates: [] });
    expect(titles(itemsForDay(list, "2026-10-27", "2026-10-20"))).toEqual([]);
    expect(titles(itemsForDay(list, "2026-10-28", "2026-10-20"))).toEqual(["Turnen"]);
    const noTime = moveItem([s], { entry: s, date: "2026-10-27" }, "2026-10-29", STAMP);
    expect((noTime[1] as Termin).data.start).toBe("16:00");

    const as = aufgabe({ title: "Gießen", date: "2026-10-20", repeat: { kind: "taeglich" } }, { raum: "arbeit" });
    const al = moveItem([as], { entry: as, date: "2026-10-21" }, "2026-10-22", STAMP, "09:00");
    expect((al[1] as Aufgabe).data).toMatchObject({ date: "2026-10-22", seit: STAMP, time: "09:00", repeat: null, doneOn: null });
    expect(al[1].raum).toBe("arbeit");
    const al2 = moveItem([as], { entry: as, date: "2026-10-21" }, "2026-10-22", STAMP);
    expect((al2[1] as Aufgabe).data.time).toBeUndefined();
  });

  it("Erinnerung, dringend, Löschen, Ersetzen", () => {
    const t = termin({ title: "Arzt", date: "2026-10-20", start: "09:00" });
    const s = termin({ title: "Serie", date: "2026-10-20", start: "10:00", repeat: { kind: "taeglich" } });
    const a = aufgabe({ title: "A" });
    let list = setReminder([t, s, a], t.id, "30", STAMP);
    expect((list[0] as Termin).data.reminder).toBe("30");
    expect(setReminder(list, "nix", "15", STAMP)).toBe(list);
    list = setUrgent(list, a.id, true, STAMP);
    expect((list[2] as Aufgabe).data.dringend).toBe(true);
    list = setUrgent(list, a.id, false, STAMP);
    expect((list[2] as Aufgabe).data.dringend).toBeUndefined();
    expect(setUrgent(list, t.id, true, STAMP)[0]).toBe(list[0]);
    const nurTag = removeItem(list, s.id, STAMP, "2026-10-21");
    expect((nurTag[1] as Termin).data.skipDates).toEqual(["2026-10-21"]);
    expect(removeItem(list, t.id, STAMP, "2026-10-20").map((e) => e.id)).toEqual([s.id, a.id]);
    expect(removeItem(list, "nix", STAMP)).toBe(list);
    const geaendert = { ...t, data: { ...(t as Termin).data, title: "Arzt neu" } } as Termin;
    expect(upsertEntry(list, geaendert)[0].data.title).toBe("Arzt neu");
    expect(upsertEntry(list, aufgabe({ title: "Neu" }))).toHaveLength(4);
  });

  it("findet Einträge ungefähr nach Titel oder Etikett", () => {
    const entries = [termin({ title: "Steuerberater Müller", date: "2026-10-20", start: "09:00" }), aufgabe({ title: "Formular", label: "Kita" })];
    expect(titles(findByTitle(entries, "den Termin beim Steuerberater").map((e) => e.data))).toEqual(["Steuerberater Müller"]);
    expect(titles(findByTitle(entries, "kita").map((e) => e.data))).toEqual(["Formular"]);
    expect(findByTitle(entries, "der die")).toEqual([]);
    expect(findByTitle(entries, "Zahnarzt")).toEqual([]);
  });

  it("anstehende Termine: läuft noch oder kommt noch", () => {
    const entries = [
      termin({ title: "Vorbei", date: "2026-10-20", start: "07:00" }),
      termin({ title: "Läuft", date: "2026-10-20", start: "07:30", end: "09:00" }),
      termin({ title: "Gleich", date: "2026-10-20", start: "10:00" }),
      termin({ title: "Erledigt", date: "2026-10-20", start: "11:00", doneDates: ["2026-10-20"] }),
      aufgabe({ title: "Aufgabe", date: "2026-10-20" }),
    ];
    expect(titles(upcomingTermine(entries, "2026-10-20", 8 * 60 + 30))).toEqual(["Läuft", "Gleich"]);
  });
});

describe("Termin ↔ Aufgabe und Extras", () => {
  it("wandelt um und behält Tag, Etikett, übersprungene Tage", () => {
    const t = termin({ title: "Reifen", date: "2026-10-22", start: "09:00", label: "Auto", skipDates: ["2026-10-29"] }) as Termin;
    expect(terminToAufgabe(t, STAMP).data).toMatchObject({ title: "Reifen", date: "2026-10-22", label: "Auto", skipDates: ["2026-10-29"], doneOn: null });
    expect(terminToAufgabe(t, STAMP, { due: "2026-10-24" }).data).toMatchObject({ due: "2026-10-24" });
    expect(terminToAufgabe({ ...t, data: { ...t.data, skipDates: undefined } }, STAMP).data.skipDates).toEqual([]);
    const a = aufgabe({ title: "Anruf", due: "2026-10-23" }) as Aufgabe;
    expect(aufgabeToTermin(a, STAMP, "15:00").data).toMatchObject({ date: "2026-10-23", start: "15:00", skipDates: [] });
    expect(aufgabeToTermin(aufgabe({ title: "X" }) as Aufgabe, STAMP, "15:00").data.date).toBe("2026-10-20");
    expect(aufgabeToTermin(a, STAMP, "15:00", "2026-10-30").typ).toBe("termin");
  });

  it("Link und ‚aus Tipps‘ bleiben beim Sichern", () => {
    expect(terminExtras(undefined)).toEqual({});
    expect(terminExtras({ note: "aus Tipps", link: "https://x.de" })).toEqual({ note: "aus Tipps", link: "https://x.de" });
  });
});

describe("Prüfen und reparieren", () => {
  it("lehnt Kaputtes ab", () => {
    expect(sanitizeEntry(null)).toBeNull();
    expect(sanitizeEntry({ id: 1, typ: "termin", data: {} })).toBeNull();
    expect(sanitizeEntry({ id: "a", typ: "notiz", data: { title: "x" } })).toBeNull();
    expect(sanitizeEntry({ id: "a", typ: "termin", data: { title: "  " } })).toBeNull();
    expect(sanitizeEntry({ id: "a", typ: "termin", data: { title: "x", date: "morgen", start: "09:00" } })).toBeNull();
  });

  it("repariert Termine und Aufgaben, Unbekanntes fällt weg", () => {
    const t = sanitizeEntry({
      id: "t",
      typ: "termin",
      raum: "arbeit",
      data: { title: " Meeting ", date: "2026-10-20", start: "09:00", end: "9 Uhr", place: " Büro ", label: " Arbeit ", reminder: "99", who: ["p1", 3], note: " aus Tipps ", link: "javascript:x", doneDates: ["2026-10-20", "x"], repeat: { kind: "wochentage", days: [3, 1, 1, 9] } },
    }) as Termin;
    expect(t.raum).toBe("arbeit");
    expect(t.besitzer).toBe("lokal");
    expect(t.data).toMatchObject({ title: "Meeting", end: undefined, place: "Büro", label: "Arbeit", reminder: "aus", who: ["p1"], note: "aus Tipps", link: undefined, doneDates: ["2026-10-20"], repeat: { kind: "wochentage", days: [1, 3] } });
    const a = sanitizeEntry({
      id: "a",
      typ: "aufgabe",
      besitzer: "konto",
      erstellt: "2026-10-01T00:00:00.000Z",
      geaendert: "2026-10-02T00:00:00.000Z",
      data: { title: "Steuer", date: "2026-10-20", due: "x", week: "2026-10-19", time: "10:00", reminder: "vorabend", doneOn: "2026-10-20", dringend: true, seit: "2026-10-05T00:00:00.000Z", repeat: { kind: "monatlich" } },
    }) as Aufgabe;
    expect(a.raum).toBe("familie");
    expect(a.besitzer).toBe("konto");
    expect(a.data).toMatchObject({ date: "2026-10-20", due: undefined, week: "2026-10-19", time: "10:00", reminder: "vorabend", doneOn: "2026-10-20", dringend: true, seit: "2026-10-05T00:00:00.000Z", repeat: { kind: "monatlich" } });
    const leer = sanitizeEntry({ id: "b", typ: "aufgabe", data: { title: "Ohne" } }) as Aufgabe;
    expect(leer.data.doneOn).toBeNull();
    expect(leer.data.dringend).toBeUndefined();
  });

  it("Wiederholung prüfen", () => {
    expect(sanitizeRepeat(null)).toBeNull();
    expect(sanitizeRepeat({ kind: "taeglich" })).toEqual({ kind: "taeglich" });
    expect(sanitizeRepeat({ kind: "wochentage", days: [8] })).toBeNull();
    expect(sanitizeRepeat({ kind: "jährlich" })).toBeNull();
  });
});
