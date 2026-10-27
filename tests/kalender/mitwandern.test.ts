import { describe, expect, it } from "vitest";
import { setDone, taskBadge, isUrgent, type CalendarEntry } from "@/lib/kalender/model";
import { abendsNachUhr, aufgabenFuerTag, aufgabenReihe, aufgabenTag, aufgabenUebersicht, aufMorgen, gruppenName, offeneAufgaben } from "@/lib/kalender/mitwandern";
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

describe("Abends: offene Aufgaben wandern mit auf morgen", () => {
  it("21 Uhr mit 10 offenen Aufgaben von heute: morgen zeigt sie zuerst, leise „von heute“", () => {
    const heute = zehnVonHeute();
    const morgenEcht = aufgabe({ title: "Kita-Formular", date: MORGEN });
    const entries = [...heute, morgenEcht];
    const list = aufgabenFuerTag(entries, MORGEN, ABENDS);
    expect(list.map((i) => i.title)).toEqual([...heute.map((e) => (e.data as { title: string }).title), "Kita-Formular"]);
    expect(list.slice(0, 10).every((i) => i.carried === "von heute")).toBe(true);
    expect(list[10].carried).toBeNull();
    // Kachel: gleiche Reihenfolge, Zusatz rechts „von heute“, morgen ohne „heute“
    const reihe = aufgabenReihe(entries, ABENDS).filter((i) => i.group === "heute");
    expect(reihe.map((i) => i.title)).toEqual(list.map((i) => i.title));
    expect(taskBadge(reihe[0], HEUTE)).toBe("von heute");
    expect(taskBadge(reihe[10], HEUTE)).toBe("");
    expect(aufgabenTag(ABENDS)).toBe(MORGEN);
    expect(offeneAufgaben(entries, ABENDS)).toBe(11);
  });

  it("tagsüber bleibt alles wie bisher (Heute dran, ohne Zusatz)", () => {
    const entries = zehnVonHeute();
    const list = aufgabenFuerTag(entries, HEUTE, { heute: HEUTE, abends: false });
    expect(list).toHaveLength(10);
    expect(list.every((i) => i.carried === null)).toBe(true);
    // Für morgen steht tagsüber nichts davon
    expect(aufgabenFuerTag(entries, MORGEN, { heute: HEUTE, abends: false })).toHaveLength(0);
  });

  it("Mitternacht: still auf den neuen Tag, „von gestern“ – keine Doppelungen", () => {
    const entries = zehnVonHeute();
    const abends = aufgabenFuerTag(entries, MORGEN, ABENDS);
    const nachts = aufgabenFuerTag(entries, MORGEN, { heute: MORGEN, abends: false });
    expect(nachts.map((i) => i.entry.id)).toEqual(abends.map((i) => i.entry.id));
    expect(nachts.every((i) => i.carried === "von gestern")).toBe(true);
    for (const list of [abends, nachts]) expect(new Set(list.map((i) => i.entry.id)).size).toBe(list.length);
  });

  it("Älteres wandert mit „von gestern“ mit, Fristen zählen vom echten Heute", () => {
    at("2026-10-26T08:00");
    const gestern = aufgabe({ title: "Rad flicken", date: "2026-10-26" });
    const frist = aufgabe({ title: "Antrag", due: "2026-10-29" });
    const list = aufgabenFuerTag([gestern, frist], MORGEN, ABENDS);
    expect(list.map((i) => [i.title, i.carried])).toEqual([["Rad flicken", "von gestern"]]);
    const g = aufgabenUebersicht([gestern, frist], ABENDS);
    expect(g.woche.find((i) => i.title === "Antrag")?.dueLabel).toBe("bis Do");
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
    const reihe = aufgabenReihe([normal, dringend], ABENDS);
    expect(reihe.map((i) => i.title)).toEqual(["Tierarzt anrufen", "Blumen"]);
    expect(isUrgent(reihe[0])).toBe(true);
  });

  it("Wiederkehrendes wandert nicht doppelt – morgen steht das nächste Vorkommen", () => {
    at("2026-10-20T08:00");
    const taeglich = aufgabe({ title: "Blumen gießen", date: "2026-10-20", repeat: { kind: "taeglich" } });
    const list = aufgabenFuerTag([taeglich], MORGEN, ABENDS);
    expect(list).toHaveLength(1);
    expect(list[0].date).toBe(MORGEN);
    expect(list[0].carried).toBeNull();
  });

  it("Sonntagabend: „diese Woche“ heißt dann „Nächste Woche“", () => {
    at("2026-10-26T08:00");
    const woche = aufgabe({ title: "Keller", week: "2026-10-26" });
    const so = { heute: "2026-11-01", abends: true };
    const [item] = aufgabenFuerTag([woche], "2026-11-02", so);
    expect(item.carried).toBe("von dieser Woche");
    expect(gruppenName("heute", "Heute dran", so)).toBe("Morgen dran");
    expect(gruppenName("woche", "Diese Woche", so)).toBe("Nächste Woche");
    expect(gruppenName("woche", "Diese Woche", ABENDS)).toBe("Diese Woche");
    expect(gruppenName("heute", "Heute dran", { heute: HEUTE, abends: false })).toBe("Heute dran");
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

  it("die KI bekommt abends eine Zeile mit dem Mitgewanderten", () => {
    const entries = zehnVonHeute().slice(0, 1);
    expect(calendarContext(entries, HEUTE, true)).toMatch(/Mit auf morgen gewandert.*Aufgabe 1 \(von heute\)/);
    expect(calendarContext(entries, HEUTE)).not.toMatch(/gewandert/);
  });
});
