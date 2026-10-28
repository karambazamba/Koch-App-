import { describe, expect, it } from "vitest";
import { setDone, isUrgent, type CalendarEntry } from "@/lib/kalender/model";
import { abendsNachUhr, aufgabenFuerTag, aufgabenTag, aufgabenUebersicht, aufMorgen, wandertMit } from "@/lib/kalender/mitwandern";
import { showAnswer } from "@/lib/kalender/answers";
import { calendarChat } from "@/lib/kalender/chat";
import { calendarContext } from "@/lib/begleitung/calendarTools";
import { isAbend } from "@/lib/heute/abendThema";
import { aufgabe, at, jetztInput, termin } from "../helpers";

// Di 27.10.2026, 21:11 (Screenshot): zehn Aufgaben von heute offen
const HEUTE = "2026-10-27";
const MORGEN = "2026-10-28";
const ABENDS = { heute: HEUTE, abends: true };
const NOPRESSURE = /überfällig|verpasst|fehlt|offen|noch zu erledigen|du musst|vergiss nicht/i;

function zehnVonHeute(): CalendarEntry[] {
  at("2026-10-27T08:00");
  return Array.from({ length: 10 }, (_, i) => aufgabe({ title: `Aufgabe ${i + 1}`, date: HEUTE }));
}

describe("Abends: offene Aufgaben wandern still mit auf morgen (ohne Etikett, Tafel 103)", () => {
  it("21 Uhr mit 10 offenen Aufgaben von heute: morgen stehen sie in derselben einen Liste, ohne „von heute“", () => {
    const heute = zehnVonHeute();
    at("2026-10-26T08:00");
    const morgenEcht = aufgabe({ title: "Kita-Formular", date: MORGEN });
    const entries = [...heute, morgenEcht];
    const list = aufgabenFuerTag(entries, MORGEN, ABENDS);
    // Heute angelegt = „neu“ und vorne (bis Mitternacht), dann nach Erstellungszeit – das Kita-Formular ist vom Montag
    expect(list.map((i) => i.title)).toEqual([...heute.map((e) => (e.data as { title: string }).title), "Kita-Formular"]);
    expect(list.every((i) => !("carried" in i))).toBe(true);
    // Abhaken am echten Tag: Mitgewandertes steht noch auf heute, das Echte auf morgen
    expect(list.filter((i) => wandertMit(i, HEUTE)).map((i) => i.date)).toEqual(Array(10).fill(HEUTE));
    expect(list[10].date).toBe(MORGEN);
    expect(aufgabenTag(ABENDS)).toBe(MORGEN);
    expect(aufgabenUebersicht(entries, ABENDS).heute).toHaveLength(11);
  });

  it("tagsüber: die eine Liste von heute", () => {
    const entries = zehnVonHeute();
    const list = aufgabenFuerTag(entries, HEUTE, { heute: HEUTE, abends: false });
    expect(list).toHaveLength(10);
    // Für morgen steht tagsüber nichts davon
    expect(aufgabenFuerTag(entries, MORGEN, { heute: HEUTE, abends: false })).toHaveLength(0);
  });

  it("Mitternacht: still auf den neuen Tag – keine Doppelungen", () => {
    const entries = zehnVonHeute();
    const abends = aufgabenFuerTag(entries, MORGEN, ABENDS);
    const nachts = aufgabenFuerTag(entries, MORGEN, { heute: MORGEN, abends: false });
    expect(nachts.map((i) => i.entry.id)).toEqual(abends.map((i) => i.entry.id));
    for (const list of [abends, nachts]) expect(new Set(list.map((i) => i.entry.id)).size).toBe(list.length);
  });

  it("Älteres und Fristen wandern still mit; Geplantes erst ab seinem Tag", () => {
    at("2026-10-26T08:00");
    const gestern = aufgabe({ title: "Rad flicken", date: "2026-10-26" });
    const frist = aufgabe({ title: "Antrag", due: "2026-10-29" });
    const geplant = aufgabe({ title: "KFZ-Steuer", date: "2026-10-30" });
    const list = aufgabenFuerTag([gestern, frist, geplant], MORGEN, ABENDS);
    expect(list.map((i) => i.title)).toEqual(["Rad flicken", "Antrag"]);
    expect(aufgabenUebersicht([gestern, frist, geplant], ABENDS).geplant.map((i) => i.title)).toEqual(["KFZ-Steuer"]);
  });

  it("erledigt abends: verschwindet und zählt für heute", () => {
    const entries = zehnVonHeute();
    const [erste] = aufgabenFuerTag(entries, MORGEN, ABENDS);
    at("2026-10-27T21:15");
    const next = setDone(entries, erste, true, "2026-10-27T21:15:00.000Z");
    expect(next.find((e) => e.id === erste.entry.id)?.data).toMatchObject({ doneOn: HEUTE });
    expect(aufgabenFuerTag(next, MORGEN, ABENDS).map((i) => i.entry.id)).not.toContain(erste.entry.id);
    expect(aufgabenFuerTag(next, MORGEN, { heute: MORGEN, abends: false }).map((i) => i.entry.id)).not.toContain(erste.entry.id);
    expect(aufgabenUebersicht(next, ABENDS).erledigt.map((i) => i.entry.id)).toContain(erste.entry.id);
  });

  it("dringend bleibt vorne und gekennzeichnet", () => {
    at("2026-10-27T08:00");
    const normal = aufgabe({ title: "Blumen", date: HEUTE });
    const dringend = aufgabe({ title: "Tierarzt anrufen", date: MORGEN, dringend: true });
    const reihe = aufgabenUebersicht([normal, dringend], ABENDS).heute;
    expect(reihe.map((i) => i.title)).toEqual(["Tierarzt anrufen", "Blumen"]);
    expect(isUrgent(reihe[0])).toBe(true);
  });

  it("Wiederkehrendes wandert nicht doppelt – morgen steht das nächste Vorkommen", () => {
    at("2026-10-20T08:00");
    const taeglich = aufgabe({ title: "Blumen gießen", date: "2026-10-20", repeat: { kind: "taeglich" } });
    const list = aufgabenFuerTag([taeglich], MORGEN, ABENDS);
    expect(list).toHaveLength(1);
    expect(list[0].date).toBe(MORGEN);
    expect(wandertMit(list[0], HEUTE)).toBe(false);
  });
});

describe("Wann die Startseite auf morgen steht", () => {
  it("ab Feierabend bzw. 19 Uhr, wenn heute nichts mehr kommt – bis Mitternacht", () => {
    expect(aufMorgen({ minutes: 21 * 60 + 11, feierabend: true, nochTermin: false })).toBe(true);
    expect(aufMorgen({ minutes: 19 * 60, feierabend: false, nochTermin: false })).toBe(true);
    expect(aufMorgen({ minutes: 18 * 60, feierabend: false, nochTermin: false })).toBe(false);
    expect(aufMorgen({ minutes: 17 * 60, feierabend: true, nochTermin: false })).toBe(true);
    expect(aufMorgen({ minutes: 20 * 60, feierabend: true, nochTermin: true })).toBe(false);
    expect(aufMorgen({ minutes: 20 * 60, feierabend: true, nochTermin: false, nochEssen: true })).toBe(false);
    expect(aufMorgen({ minutes: 20 * 60, feierabend: true, nochTermin: false, kochen: true })).toBe(false);
    expect(aufMorgen({ minutes: 23 * 60 + 30, feierabend: true, nochTermin: false })).toBe(true);
    // Nach Mitternacht ist der neue Tag schon da
    expect(aufMorgen({ minutes: 3 * 60, feierabend: true, nochTermin: false })).toBe(false);
  });

  it("die Jetzt-Karte nutzt dieselbe Regel, nachts (ab 22 Uhr) aber nicht", () => {
    expect(isAbend(jetztInput(21 * 60, { evening: true }))).toBe(true);
    expect(isAbend(jetztInput(23 * 60, { evening: true }))).toBe(false);
  });

  it("nach Uhr (Aufgaben-Seite, Mia): Feierabend-Einstellung, Termine und Essen von heute", () => {
    at("2026-10-27T08:00");
    const spaet = termin({ title: "Elternabend", date: HEUTE, start: "21:30" });
    expect(abendsNachUhr({ entries: [], heute: HEUTE, minutes: 21 * 60, feierabendAb: "20:00" })).toBe(true);
    expect(abendsNachUhr({ entries: [spaet], heute: HEUTE, minutes: 21 * 60, feierabendAb: "20:00" })).toBe(false);
    expect(abendsNachUhr({ entries: [], heute: HEUTE, minutes: 18 * 60, feierabendAb: "17:30" })).toBe(true);
    expect(abendsNachUhr({ entries: [], heute: HEUTE, minutes: 18 * 60, feierabendAb: "17:30", essenUm: "18:30" })).toBe(false);
    expect(abendsNachUhr({ entries: [], heute: HEUTE, minutes: 18 * 60 })).toBe(false);
  });
});

describe("Mia abends: „Was steht morgen an?“", () => {
  it("nennt das Mitgewanderte kurz mit – ohne Zähler, ohne Druck", () => {
    const entries = [...zehnVonHeute().slice(0, 2), termin({ title: "Zahnarzt", date: MORGEN, start: "09:00" })];
    const text = showAnswer(entries, HEUTE, MORGEN, 1, "morgen", true);
    expect(text).toBe("Morgen: 9:00 Zahnarzt. Dazu von heute: Aufgabe 1 und Aufgabe 2.");
    expect(text).not.toMatch(NOPRESSURE);
    expect(showAnswer(entries, HEUTE, MORGEN, 1, "morgen")).toBe("Morgen: 9:00 Zahnarzt.");
    expect(calendarChat("Was steht morgen an?", entries, HEUTE, [], true)?.text).toMatch(/Dazu von heute: Aufgabe 1/);
  });

  it("viele: die ersten drei und „ein paar mehr“; morgen sonst frei", () => {
    const text = showAnswer(zehnVonHeute(), HEUTE, MORGEN, 1, "morgen", true);
    expect(text).toBe("Morgen kommt nichts Neues dazu. Von heute dabei: Aufgabe 1, Aufgabe 2, Aufgabe 3 und ein paar mehr.");
    expect(text).not.toMatch(/\d{2,}|10/);
  });

  it("die KI bekommt abends eine Zeile mit dem Mitgewanderten (ohne „von heute“)", () => {
    const entries = zehnVonHeute().slice(0, 1);
    expect(calendarContext(entries, HEUTE, true)).toMatch(/mit auf morgen gewandert \(nichts verschoben\): Aufgabe 1$/m);
    expect(calendarContext(entries, HEUTE)).not.toMatch(/gewandert/);
  });
});
