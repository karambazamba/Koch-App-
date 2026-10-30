// Erinnerungen & Push (Tafel 77): Zeitpunkte und Texte, Ruhe/Pause, wann Mia
// fragt (nie beim ersten Start, nach „Lieber nicht“ höchstens noch einmal
// nach 14 Tagen, ohne Homescreen die Anleitung), Chip in der Schnelleingabe.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aufgabe, termin } from "../helpers";
import { dueNow, pauseOn, reminderFor, remindersBetween, remindersToSend } from "@/lib/heute/mitteilungen/erinnerungen";
import { askDecision, askText, DEFAULT_NOTIFY, migrateNotify, notifyStatusLabel } from "@/lib/heute/mitteilungen/einstellungen";
import { itemsForDay } from "@/lib/kalender/model";
import { pushAllowed } from "@/lib/heute/push";
import { DEFAULT_ROUTINE } from "@/lib/heute/tagesablauf";

const TODAY = "2026-10-21";
const item = (e: ReturnType<typeof termin>, date = TODAY) => itemsForDay([e], date, TODAY)[0];

describe("Wann erinnert wird", () => {
  it("Termin: n Minuten vorher, mit Uhrzeit und Ort im Text", () => {
    const m = reminderFor(item(termin({ title: "Zahnarzt Jonne", date: TODAY, start: "16:00", reminder: "30", place: "Praxis Dr. Krüger" })));
    expect(m).toMatchObject({ date: TODAY, minute: 15 * 60 + 30, body: "In 30 Min: Zahnarzt Jonne · 16:00 · Praxis Dr. Krüger", href: expect.stringMatching(new RegExp(`^/tag\\?datum=${TODAY}&eintrag=`)), kind: "termin-familie" });
  });

  it("1 Stunde, 10 Minuten, über Mitternacht zurück", () => {
    expect(reminderFor(item(termin({ title: "A", date: TODAY, start: "09:00", reminder: "60" })))?.body).toBe("In 1 Std: A · 9:00");
    expect(reminderFor(item(termin({ title: "B", date: TODAY, start: "09:00", reminder: "10" })))?.minute).toBe(8 * 60 + 50);
    expect(reminderFor(item(termin({ title: "C", date: TODAY, start: "00:10", reminder: "30" })))).toMatchObject({ date: "2026-10-20", minute: 23 * 60 + 40 });
  });

  it("ganztägig um 8:00, „Am Vorabend“ um 19:00 am Tag davor, aus = nie", () => {
    expect(reminderFor(item(termin({ title: "Laternenfest", date: TODAY, start: "", reminder: "30" })))).toMatchObject({ minute: 8 * 60, body: "Heute: Laternenfest" });
    expect(reminderFor(item(termin({ title: "Ausflug", date: TODAY, start: "08:00", reminder: "vorabend" })))).toMatchObject({ date: "2026-10-20", minute: 19 * 60, body: "Morgen (Mi): Ausflug · 8:00" });
    expect(reminderFor(item(termin({ title: "X", date: TODAY, start: "08:00" })))).toBeNull();
  });

  it("Aufgabe mit Uhrzeit genau dann, ohne Uhrzeit nie; Arbeit getrennt", () => {
    expect(reminderFor(item(aufgabe({ title: "Wäsche", date: TODAY, time: "17:00", reminder: "30" }) as never))).toMatchObject({ minute: 17 * 60, body: "Jetzt: Wäsche · 17:00", kind: "aufgabe" });
    expect(reminderFor(item(aufgabe({ title: "Wäsche", date: TODAY, reminder: "30" }) as never))).toBeNull();
    expect(reminderFor(item(termin({ title: "Kunde", date: TODAY, start: "10:00", reminder: "30" }, "arbeit")))?.kind).toBe("termin-arbeit");
  });

  it("zwischen zwei Zeitpunkten, sortiert, inklusive Vorabend von morgen", () => {
    const list = [termin({ title: "Spät", date: TODAY, start: "20:00", reminder: "30" }), termin({ title: "Früh", date: TODAY, start: "10:00", reminder: "30" }), termin({ title: "Morgen", date: "2026-10-22", start: "08:00", reminder: "vorabend" })];
    expect(remindersBetween(list, TODAY, { date: TODAY, minute: 0 }, TODAY).map((m) => m.title)).toEqual(["Früh", "Morgen", "Spät"]);
  });

  it("jetzt fällig: nur im Fenster, nichts doppelt", () => {
    const list = [termin({ title: "Zahnarzt", date: TODAY, start: "16:00", reminder: "30" })];
    expect(dueNow(list, TODAY, 15 * 60 + 29, [])).toEqual([]);
    const due = dueNow(list, TODAY, 15 * 60 + 31, []);
    expect(due.map((m) => m.title)).toEqual(["Zahnarzt"]);
    expect(dueNow(list, TODAY, 15 * 60 + 31, [`${due[0].key}#${TODAY}`])).toEqual([]);
    expect(dueNow(list, TODAY, 15 * 60 + 40, [])).toEqual([]);
  });
});

describe("Ruhe und Pause", () => {
  const list = [termin({ title: "Kunde", date: TODAY, start: "21:00", reminder: "30" }, "arbeit"), termin({ title: "Elternabend", date: TODAY, start: "21:00", reminder: "30" })];
  const routine = { ...DEFAULT_ROUTINE, ruhe: true };
  const allowed = (minute: number) => (m: { kind: "termin-familie" | "termin-arbeit" | "aufgabe" }) => pushAllowed({ kind: m.kind, minutes: minute, routine, workEnd: null, paused: false, proactiveSentToday: false });

  it("selbst gestellte Erinnerung kommt auch nach 20 Uhr – Arbeit nicht im Feierabend", () => {
    const sent = remindersToSend(list, { today: TODAY, minute: 20 * 60 + 31, sent: [], on: true, paused: false, allowed: allowed(20 * 60 + 31) });
    expect(sent.map((m) => m.title)).toEqual(["Elternabend"]);
  });

  it("Pause = absolute Ruhe, Schalter aus = nichts", () => {
    expect(remindersToSend(list, { today: TODAY, minute: 20 * 60 + 31, sent: [], on: true, paused: true, allowed: () => true })).toEqual([]);
    expect(remindersToSend(list, { today: TODAY, minute: 20 * 60 + 31, sent: [], on: false, paused: false, allowed: () => true })).toEqual([]);
    expect(pauseOn({ from: "2026-10-20", until: null }, TODAY)).toBe(true);
    expect(pauseOn({ from: "2026-10-20", until: "2026-10-20" }, TODAY)).toBe(false);
    expect(pauseOn(null, TODAY)).toBe(false);
  });
});

describe("Mitteilungen erlauben – zur richtigen Zeit", () => {
  const opts = { today: TODAY, iosTab: false, demo: false, firstStart: false };

  it("nie beim ersten Start, nie im Beispiel-Tag, nie wenn schon erlaubt/abgelehnt", () => {
    expect(askDecision(DEFAULT_NOTIFY, "default", { ...opts, firstStart: true })).toBeNull();
    expect(askDecision(DEFAULT_NOTIFY, "default", { ...opts, demo: true })).toBeNull();
    expect(askDecision(DEFAULT_NOTIFY, "granted", opts)).toBeNull();
    expect(askDecision(DEFAULT_NOTIFY, "denied", opts)).toBeNull();
    expect(askDecision(DEFAULT_NOTIFY, "default", opts)).toBe("frage");
  });

  it("nach „Lieber nicht“: erst nach 14 Tagen, höchstens noch einmal", () => {
    const no = { ...DEFAULT_NOTIFY, answer: "nein" as const, askedAt: "2026-10-10T08:00:00.000Z", asks: 1 };
    expect(askDecision(no, "default", opts)).toBeNull();
    expect(askDecision(no, "default", { ...opts, today: "2026-10-24" })).toBe("frage");
    expect(askDecision({ ...no, asks: 2 }, "default", { ...opts, today: "2026-11-30" })).toBeNull();
  });

  it("iPhone im Safari-Tab: Anleitung statt Abfrage", () => {
    expect(askDecision(DEFAULT_NOTIFY, "unsupported", { ...opts, iosTab: true })).toBe("homescreen");
    expect(askDecision(DEFAULT_NOTIFY, "unsupported", opts)).toBeNull();
  });

  it("eigene Frage mit der Standard-Erinnerung, Status kurz", () => {
    expect(askText("erster-termin", "30")).toEqual({ title: "Soll ich dich erinnern?", text: "30 Minuten vorher sag ich kurz Bescheid." });
    expect(askText("pinnwand", "30").title).toBe("Soll ich Bescheid sagen?");
    expect(notifyStatusLabel("granted")).toBe("An");
    expect(notifyStatusLabel(null)).toBeUndefined();
  });

  it("Speicher: kaputt → Standard, unbekannte Werte geglättet", () => {
    expect(migrateNotify(null)).toBeNull();
    expect(migrateNotify({ version: 1, defaultReminder: "99", kinds: { pinnwand: false }, answer: "vielleicht", sent: ["a", 3] })).toMatchObject({ defaultReminder: "30", kinds: { erinnerungen: true, pinnwand: false, abgeben: true, morgen: false }, answer: null, sent: ["a"] });
  });
});

describe("Fenster Aufgabe/Termin: Glocke (Tafel 114)", () => {
  it("kein Emoji im Chip, Glocke als Linien-Icon", () => {
    const src = readFileSync("src/components/kalender/eintragen/EintragTeile.tsx", "utf8");
    expect(src).toContain("<Bell ");
    expect(src).not.toContain("🔔");
  });
});

describe("Service Worker: Mitteilungen", () => {
  it("Antippen öffnet den Eintrag, Push vom Server wird gezeigt", () => {
    const sw = readFileSync("public/sw.js", "utf8");
    expect(sw).toContain('addEventListener("notificationclick"');
    expect(sw).toContain('addEventListener("push"');
  });
});
