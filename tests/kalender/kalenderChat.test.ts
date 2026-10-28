// Antworten ohne KI (answers.ts, chat.ts), Erinnerungen, Begrüßung und der
// Speicher mit Migration (store.ts). Heute = Di 2026-10-20.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clockLabel, contextLines, freeAnswer, itemText, showAnswer } from "@/lib/kalender/answers";
import { calendarChat, draftSummary } from "@/lib/kalender/chat";
import { itemsForDay, type Aufgabe, type CalendarEntry, type Termin } from "@/lib/kalender/model";
import { dueReminder } from "@/lib/kalender/reminders";
import { greeting } from "@/lib/kalender/summary";
import { at, aufgabe, fakeWindow, termin } from "../helpers";

const TODAY = "2026-10-20";
const STAMP = "2026-10-20T10:00:00.000Z";
const NOPRESSURE = /überfällig|verpasst|fehlt|offen|noch zu erledigen|du musst|vergiss nicht/i;

beforeEach(() => at("2026-10-20T08:00"));

describe("Antworten", () => {
  it("Tag und Woche – ruhig, ohne Zähler", () => {
    const entries = [termin({ title: "Arzt", date: TODAY, start: "09:00" }), aufgabe({ title: "Formular", due: "2026-10-22" }), termin({ title: "Kita", date: TODAY, start: "15:00" })];
    expect(clockLabel("09:05")).toBe("9:05");
    // Alles ist heute: die Aufgabe mit Frist steht heute, nicht am Donnerstag
    expect(showAnswer(entries, TODAY, TODAY, 1, "heute")).toBe("Heute: 9:00 Arzt und 15:00 Kita. Dazu eine Aufgabe: Formular.");
    expect(showAnswer(entries, TODAY, "2026-10-22", 1, "am Donnerstag")).toBe("Am Donnerstag steht nichts an – ein freier Tag.");
    expect(showAnswer(entries, TODAY, "2026-10-21", 1, "morgen")).toBe("Morgen steht nichts an – ein freier Tag.");
    expect(showAnswer(entries, TODAY, TODAY, 7, "diese Woche")).toBe("Diese Woche: Di: 9:00 Arzt, 15:00 Kita und Formular (bis Do).");
    expect(showAnswer([], TODAY, TODAY, 7, "diese Woche")).toBe("Diese Woche ist noch alles frei.");
    const viele = Array.from({ length: 6 }, (_, i) => termin({ title: `T${i}`, date: `2026-10-2${i}`, start: "10:00" }));
    expect(showAnswer(viele, TODAY, TODAY, 7, "diese Woche")).toMatch(/ein paar Sachen mehr/);
    expect(showAnswer(entries, TODAY, TODAY, 7, "diese Woche")).not.toMatch(NOPRESSURE);
  });

  it("„Was steht heute an?“: Zahl und die ersten drei Aufgaben, nach Feierabend ohne Arbeit (Tafel 103)", () => {
    const entries = [
      termin({ title: "Arzt", date: TODAY, start: "09:00" }),
      aufgabe({ title: "Müll" }),
      aufgabe({ title: "Kita-Formular" }),
      aufgabe({ title: "Rad flicken" }),
      aufgabe({ title: "Bericht" }, { raum: "arbeit" }),
      aufgabe({ title: "KFZ-Steuer", date: "2026-10-23" }),
    ];
    expect(showAnswer(entries, TODAY, TODAY, 1, "heute")).toBe("Heute: 9:00 Arzt. Dazu 4 Aufgaben, zuerst Müll, Kita-Formular und Rad flicken.");
    expect(showAnswer(entries, TODAY, TODAY, 1, "heute", false, true)).toBe("Heute: 9:00 Arzt. Dazu 3 Aufgaben, zuerst Müll, Kita-Formular und Rad flicken.");
    expect(showAnswer(entries.slice(1, 3), TODAY, TODAY, 1, "heute")).toBe("Heute: 2 Aufgaben, zuerst Müll und Kita-Formular.");
    expect(calendarChat("Was steht heute an?", entries, TODAY, [], false, true)?.text).not.toMatch(/Bericht|4 Aufgaben/);
    expect(showAnswer(entries, TODAY, TODAY, 1, "heute")).not.toMatch(NOPRESSURE);
  });

  it("Zeit frei?", () => {
    const entries = [termin({ title: "Arzt", date: TODAY, start: "14:00" }), termin({ title: "Sport", date: TODAY, start: "16:00", end: "17:30" }), aufgabe({ title: "Aufgabe", date: TODAY, time: "15:00" })];
    expect(freeAnswer(entries, TODAY, TODAY, "08:00", "12:00", "heute Vormittag")).toBe("Ja, heute Vormittag ist frei.");
    expect(freeAnswer(entries, TODAY, TODAY, "13:00", "15:00", "heute")).toBe("Heute hast du 14:00 Arzt – davor und danach ist Luft.");
    expect(freeAnswer(entries, TODAY, TODAY, "12:00", "18:00", "heute Nachmittag")).toBe("Heute Nachmittag hast du 14:00 Arzt und 16:00 Sport.");
  });

  it("Kontext für die KI: je Tag mit IDs", () => {
    const t = termin({ title: "Meeting", date: TODAY, start: "09:00", end: "10:00", label: "Büro", reminder: "15", repeat: { kind: "taeglich" } }, { raum: "arbeit", id: "t1" });
    const a = aufgabe({ title: "Steuer", date: "2026-10-19", due: "2026-10-23" }, { id: "a1" });
    const d = aufgabe({ title: "Fertig", doneOn: TODAY }, { id: "d1" });
    const lines = contextLines([t, a, d], TODAY, 2);
    expect(lines).toContain("- Di 2026-10-20: 09:00 Meeting [id=t1; termin, arbeit, Etikett Büro, bis 10:00, Erinnerung 15, wiederkehrend]");
    expect(lines).toContain("Steuer [id=a1; aufgabe, familie, bis Fr]");
    expect(lines).not.toMatch(/von gestern/);
    expect(lines).toContain("Fertig [id=d1; aufgabe, familie, erledigt]");
    expect(contextLines([], TODAY, 1)).toBe("- Di 2026-10-20: frei");
    expect(itemText(itemsForDay([a], TODAY, TODAY)[0])).toBe("Steuer (bis Fr)");
  });
});

describe("Chat ohne KI", () => {
  it("legt an und meldet kurz", () => {
    const reply = calendarChat("Morgen um 9 Zahnarzt, erinner mich 30 Minuten vorher", [], TODAY, [])!;
    expect(reply.text).toBe("Eingetragen ✓ Mi 21.10. · 9:00 · Zahnarzt · Erinnerung 30 Min vorher");
    const list = reply.change!([], STAMP);
    expect(list).toHaveLength(1);
    expect(calendarChat("Hallo", [], TODAY, [])).toBeNull();
  });

  it("zeigt an und sagt, ob Zeit ist", () => {
    const entries = [termin({ title: "Arzt", date: TODAY, start: "09:00" })];
    expect(calendarChat("Was steht heute an?", entries, TODAY, [])?.text).toBe("Heute: 9:00 Arzt.");
    expect(calendarChat("Hab ich heute vormittags Zeit?", entries, TODAY, [])?.text).toMatch(/9:00 Arzt/);
  });

  it("verschieben, erledigen, löschen – auch in Serien", () => {
    const arzt = termin({ title: "Zahnarzt", date: TODAY, start: "09:00" });
    const turnen = termin({ title: "Turnen", date: "2026-10-21", start: "16:00", repeat: { kind: "woechentlich" } });
    const formular = aufgabe({ title: "Formular", date: TODAY });
    const entries: CalendarEntry[] = [arzt, turnen, formular];
    const move = calendarChat("Verschieb den Zahnarzt auf Freitag", entries, TODAY, [])!;
    expect(move.text).toBe("Verschoben ✓ Zahnarzt → Fr 23.10. · 9:00");
    expect((move.change!(entries, STAMP)[0] as Termin).data.date).toBe("2026-10-23");
    expect(calendarChat("Verschieb den Zahnarzt auf Freitag um 11 Uhr", entries, TODAY, [])!.text).toBe("Verschoben ✓ Zahnarzt → Fr 23.10. · 11:00");
    expect(calendarChat("Verschieb das Formular auf morgen", entries, TODAY, [])!.text).toBe("Verschoben ✓ Formular → Mi 21.10.");
    const done = calendarChat("Formular ist erledigt", entries, TODAY, [])!;
    expect(done.text).toBe("Erledigt ✓ Formular");
    expect((done.change!(entries, STAMP)[2] as Aufgabe).data.doneOn).toBe(TODAY);
    const del = calendarChat("Lösch das Turnen", entries, TODAY, [])!;
    expect(del.text).toBe("Gelöscht ✓ Turnen am Mi 21.10.");
    expect((del.change!(entries, STAMP)[1] as Termin).data.skipDates).toEqual(["2026-10-21"]);
    const delOne = calendarChat("Der Zahnarzt fällt aus", entries, TODAY, [])!;
    expect(delOne.change!(entries, STAMP)).toHaveLength(2);
    expect(calendarChat("Lösch den Friseur", entries, TODAY, [])!.text).toMatch(/finde ich gerade nicht/);
  });

  it("vergangener Eintrag steht nirgends mehr an", () => {
    const alt = termin({ title: "Zahnarzt", date: "2026-10-10", start: "09:00" });
    expect(calendarChat("Zahnarzt ist erledigt", [alt], TODAY, [])!.text).toBe("Zahnarzt steht gerade nirgends an.");
  });

  it("Zusammenfassung des Entwurfs", () => {
    expect(draftSummary({ typ: "aufgabe", raum: "arbeit", data: { title: "Bericht", due: "2026-10-23", reminder: "aus" } })).toBe("bis Fr 23.10. · Bericht · Arbeit");
    expect(draftSummary({ typ: "aufgabe", raum: "familie", data: { title: "Müll", date: "2026-10-21", repeat: { kind: "woechentlich" }, reminder: "vorabend" } })).toBe("Mi 21.10. · Müll · jeden Mittwoch · Erinnerung am Vorabend");
    expect(draftSummary({ typ: "aufgabe", raum: "familie", data: { title: "Irgendwas", reminder: "aus" } })).toBe("für heute · Irgendwas");
  });
});

describe("Erinnerungen und Begrüßung", () => {
  it("fällige Erinnerung, die nächste zuerst", () => {
    const entries = [
      termin({ title: "Abholen", date: TODAY, start: "09:00", reminder: "30" }, { id: "a" }),
      termin({ title: "Arzt", date: TODAY, start: "09:10", reminder: "60" }, { id: "b" }),
      termin({ title: "Ohne", date: TODAY, start: "08:40" }, { id: "c" }),
      termin({ title: "Morgen", date: "2026-10-21", start: "08:00", reminder: "vorabend" }, { id: "d" }),
      aufgabe({ title: "Vorabend ohne Zeit", date: "2026-10-21", reminder: "vorabend" }, { id: "e" }),
    ];
    expect(dueReminder(entries, TODAY, 8 * 60 + 40, [])?.text).toBe("In 20 Minuten: Abholen.");
    expect(dueReminder(entries, TODAY, 8 * 60 + 40, ["a@2026-10-20"])?.text).toBe("In 30 Minuten: Arzt.");
    expect(dueReminder(entries, TODAY, 8 * 60 + 59, [])?.text).toBe("Gleich: Abholen.");
    expect(dueReminder([entries[1]], TODAY, 8 * 60 + 10, [])?.text).toBe("In einer Stunde: Arzt.");
    expect(dueReminder(entries, TODAY, 7 * 60, [])).toBeNull();
    expect(dueReminder(entries, TODAY, 19 * 60, [])?.text).toBe("Morgen (Mi): Vorabend ohne Zeit.");
    expect(dueReminder(entries, TODAY, 19 * 60, ["e@2026-10-21"])?.text).toBe("Morgen (Mi) um 08:00: Morgen.");
  });

  it("Begrüßung nach Uhrzeit", () => {
    expect(greeting(8 * 60)).toBe("Guten Morgen");
    expect(greeting(12 * 60)).toBe("Hallo");
    expect(greeting(20 * 60)).toBe("Guten Abend");
  });
});

describe("Speicher", () => {
  beforeEach(() => vi.resetModules());

  it("v1 → v2: Aufgabe mit Tag und Uhrzeit wird Termin, nichts geht verloren", async () => {
    const w = fakeWindow({
      "wasgibts.eintraege": JSON.stringify({
        version: 1,
        entries: [
          { id: "x", typ: "aufgabe", data: { title: "Arzt", date: TODAY, time: "09:00", reminder: "aus" } },
          { id: "y", typ: "aufgabe", data: { title: "Frist", date: TODAY, time: "09:00", due: "2026-10-22", reminder: "aus" } },
          { id: "z", typ: "kaputt" },
        ],
        seenReminders: ["a@b", 3],
      }),
    });
    const { loadEntries, markReminderSeen } = await import("@/lib/kalender/store");
    const list = loadEntries();
    expect(list.map((e) => [e.id, e.typ])).toEqual([["x", "termin"], ["y", "aufgabe"]]);
    expect((list[0] as Termin).data.start).toBe("09:00");
    expect(JSON.parse(w.localStorage.getItem("wasgibts.eintraege")!).version).toBe(3);
    markReminderSeen("a@b");
    markReminderSeen("c@d");
    expect(JSON.parse(w.localStorage.getItem("wasgibts.eintraege")!).seenReminders).toEqual(["a@b", "c@d"]);
  });

  it("unbekannte Version wird ignoriert, leerer Speicher liefert nichts", async () => {
    fakeWindow({ "wasgibts.eintraege": JSON.stringify({ version: 9, entries: [] }) });
    const { loadEntries } = await import("@/lib/kalender/store");
    expect(loadEntries()).toEqual([]);
  });

  it("Ändern mit Rückgängig", async () => {
    fakeWindow();
    const { changeEntries, loadEntries } = await import("@/lib/kalender/store");
    const t = termin({ title: "Neu", date: TODAY, start: "09:00" });
    const undo = changeEntries((list) => [...list, t]);
    expect(loadEntries()).toHaveLength(1);
    undo();
    expect(loadEntries()).toHaveLength(0);
  });

  it("alte Termine werden einmal übernommen, dann der alte Schlüssel entfernt", async () => {
    const w = fakeWindow({
      "wasgibts.termine": JSON.stringify({
        items: [
          { id: "o1", date: "2026-10-21", time: "15:00", title: "Abholen", until: true, personId: "p1", who: "Oma" },
          { id: "o2", date: "2026-10-22", title: "Ohne Zeit" },
          { id: "o3", date: "kaputt", title: "Weg" },
        ],
      }),
    });
    const { loadEntries, migrateOldTermine } = await import("@/lib/kalender/store");
    migrateOldTermine();
    const list = loadEntries() as Termin[];
    expect(list.map((e) => e.data.title)).toEqual(["Abholen (bis 15:00) – Oma", "Ohne Zeit"]);
    expect(list[0].data.who).toEqual(["p1"]);
    expect(list[1].data.start).toBe("08:00");
    expect(w.localStorage.getItem("wasgibts.termine")).toBeNull();
    w.localStorage.setItem("wasgibts.termine", "{}");
    migrateOldTermine();
    expect(loadEntries()).toHaveLength(2);
    expect(w.localStorage.getItem("wasgibts.termine")).toBeNull();
  });

  it("kaputte alte Termine stören nicht", async () => {
    fakeWindow({ "wasgibts.termine": "{kaputt" });
    const { loadEntries, migrateOldTermine } = await import("@/lib/kalender/store");
    migrateOldTermine();
    expect(loadEntries()).toEqual([]);
  });
});
