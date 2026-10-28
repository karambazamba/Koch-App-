// Termine und Aufgaben aus normalen Sätzen (parse.ts) und Schnell-Eintrag
// (quick.ts). Heute = Di 2026-10-20.
import { beforeEach, describe, expect, it } from "vitest";
import { findDate, guessLabel, guessRoom, parseCalendar, urgentFrom } from "@/lib/kalender/parse";
import { dayChipLabel, frequentTimes, quickTaskData, readQuickText, readTerminText, terminDay, whenLabel } from "@/lib/kalender/quick";
import { at } from "../helpers";

const TODAY = "2026-10-20";
const create = (text: string, persons: { id: string; name: string }[] = []) => {
  const cmd = parseCalendar(text, TODAY, persons);
  if (cmd?.kind !== "create") throw new Error(`kein Anlegen: ${text} → ${JSON.stringify(cmd)}`);
  return cmd.draft;
};

beforeEach(() => at("2026-10-20T08:00"));

describe("Tage erkennen", () => {
  it.each([
    ["übermorgen", "2026-10-22"],
    ["morgen früh", "2026-10-21"],
    ["heute", TODAY],
    ["in 3 tagen", "2026-10-23"],
    ["in zwei tagen", "2026-10-22"],
    ["am 24.10.", "2026-10-24"],
    ["am 1.3.", "2027-03-01"],
    ["am 5.1.27", "2027-01-05"],
    ["am 5.1.2028", "2028-01-05"],
    ["am 3. november", "2026-11-03"],
    ["am 3. januar", "2027-01-03"],
    ["nächsten dienstag", "2026-10-27"],
    ["am dienstag", TODAY],
    ["freitag", "2026-10-23"],
    ["nächste woche", "2026-10-26"],
  ])("%s → %s", (text, date) => {
    expect(findDate(text, TODAY)?.date).toBe(date);
  });

  it("Fehler behoben: ‚Übermorgen‘ wurde nicht erkannt (Termin landete heute)", () => {
    expect(findDate("Übermorgen Arzt", TODAY)?.date).toBe("2026-10-22");
    expect(create("Übermorgen um 9 Arzt").data).toMatchObject({ date: "2026-10-22", start: "09:00", title: "Arzt" });
  });

  it("‚Guten Morgen‘ ist kein Tag", () => {
    expect(findDate("Guten Morgen", TODAY)).toBeNull();
    expect(findDate("irgendwas", TODAY)).toBeNull();
  });
});

describe("Termine anlegen", () => {
  it("Uhrzeit macht einen Termin – mit Raum, Etikett, Erinnerung, Person", () => {
    const d = create("Morgen um 9 Zahnarzt mit Jonne, erinner mich 30 Minuten vorher", [{ id: "p1", name: "Jonne" }, { id: "p2", name: " " }]);
    expect(d.typ).toBe("termin");
    expect(d.data).toMatchObject({ date: "2026-10-21", start: "09:00", label: "Arzt", reminder: "30", who: ["p1"] });
    expect(d.data.title).toMatch(/Zahnarzt/);
  });

  it.each([
    ["Meeting am Freitag 14:30 Uhr", "14:30", "arbeit"],
    ["Kita um halb drei", "14:30", "familie"],
    ["Turnen um halb eins", "12:30", "familie"],
    ["Elternabend heute 7 Uhr abends", "19:00", "familie"],
    ["Joggen morgen um 7 früh", "07:00", "familie"],
    ["Café Treffen am 24.10. um 10", "10:00", "familie"],
  ])("%s → %s", (text, start, raum) => {
    const d = create(text);
    expect(d.typ).toBe("termin");
    expect(d.data).toMatchObject({ start });
    expect(d.raum).toBe(raum);
  });

  it("Wiederholungen", () => {
    expect(create("Jeden Dienstag und Donnerstag um 16 Uhr Turnen").data).toMatchObject({ repeat: { kind: "wochentage", days: [1, 3] }, date: TODAY, label: "Sport" });
    expect(create("Täglich um 8 Uhr Tabletten").data.repeat).toEqual({ kind: "taeglich" });
    expect(create("Jede Woche um 18 Uhr Chor").data.repeat).toEqual({ kind: "woechentlich" });
    expect(create("Monatlich am 1.11. um 9 Uhr Miete").data.repeat).toEqual({ kind: "monatlich" });
    expect(create("Freitags um 15 Uhr Schwimmen").data).toMatchObject({ repeat: { kind: "wochentage", days: [4] }, date: "2026-10-23" });
  });

  it("Erinnerungen: Stunde, halbe Stunde, Vorabend", () => {
    expect(create("Morgen um 10 Uhr Friseur, erinner mich eine Stunde vorher").data.reminder).toBe("60");
    expect(create("Morgen um 10 Uhr Friseur, erinner mich 10 Minuten vorher").data.reminder).toBe("15");
    expect(create("Morgen um 10 Uhr Friseur und erinner mich halbe Stunde vorher").data.reminder).toBe("30");
    expect(create("Morgen um 10 Uhr Friseur, am Vorabend erinnern").data.reminder).toBe("vorabend");
  });
});

describe("Aufgaben anlegen", () => {
  it("Frist, Zeitraum, Tageszeit, dringend – alles ist heute, „nächste Woche“ ab Montag (Tafel 103)", () => {
    expect(create("Kita-Formular bis Mittwoch abgeben").data).toMatchObject({ due: "2026-10-21", date: TODAY });
    expect(create("Steuer bis Ende der Woche").data).toMatchObject({ due: "2026-10-25", date: TODAY });
    expect(create("Ich muss diese Woche noch die Reifen machen").data).toMatchObject({ date: TODAY, title: "Reifen machen" });
    expect(create("Nächste Woche Fenster putzen").data).toMatchObject({ date: "2026-10-26" });
    expect(create("In der kommenden Woche Keller aufräumen").data).toMatchObject({ date: "2026-10-26" });
    expect(create("Freitag KFZ-Steuer überweisen").data).toMatchObject({ date: "2026-10-23" });
    expect(create("Ich muss noch die Steuer machen").data).toMatchObject({ date: TODAY });
    expect(Object.keys(create("Ich muss diese Woche noch die Reifen machen").data)).not.toContain("week");
    const abends = create("Morgen abends Geschenk einpacken");
    expect(abends.typ).toBe("aufgabe");
    expect(abends.data).toMatchObject({ time: "19:00", date: "2026-10-21", reminder: "aus" });
    expect(create("Erinner mich morgen nachmittags an die Blumen").data.reminder).toBe("15");
    expect(create("Dringend: Steuerberater anrufen").data).toMatchObject({ dringend: true, title: "Steuerberater anrufen" });
    expect(create("Ich muss den Müll rausbringen").data.title).toBe("Müll rausbringen");
  });

  it("Frist mit Uhrzeit bleibt Aufgabe", () => {
    const d = create("Bewerbung bis Freitag um 12 Uhr abschicken");
    expect(d.typ).toBe("aufgabe");
    expect(d.raum).toBe("arbeit");
    expect(d.data).toMatchObject({ due: "2026-10-23", time: "12:00" });
  });

  it("nichts anlegen ohne Hinweis, bei Fragen und Essen", () => {
    expect(parseCalendar("", TODAY)).toBeNull();
    expect(parseCalendar("Hallo Mia", TODAY)).toBeNull();
    expect(parseCalendar("Was gibt's heute zu essen?", TODAY)).toBeNull();
    expect(parseCalendar("Wir kommen erst um 19 Uhr heim", TODAY)).toBeNull();
    expect(parseCalendar("Wie wird es morgen?", TODAY)).toBeNull();
    expect(parseCalendar("Morgen", TODAY)).toBeNull();
  });
});

describe("Befehle", () => {
  it("anzeigen", () => {
    expect(parseCalendar("Was steht diese Woche an?", TODAY)).toMatchObject({ kind: "show", from: TODAY, days: 7, label: "diese Woche" });
    expect(parseCalendar("Was steht nächste Woche an?", TODAY)).toMatchObject({ kind: "show", from: "2026-10-26", days: 7 });
    expect(parseCalendar("Was hab ich morgen vor?", TODAY)).toMatchObject({ kind: "show", from: "2026-10-21", label: "morgen" });
    expect(parseCalendar("Was steht heute an?", TODAY)).toMatchObject({ label: "heute" });
    expect(parseCalendar("Was steht am Freitag an?", TODAY)).toMatchObject({ from: "2026-10-23", label: "am Freitag" });
    expect(parseCalendar("Zeig mir die Termine", TODAY)).toMatchObject({ kind: "show", label: "heute" });
  });

  it("Zeit frei?", () => {
    expect(parseCalendar("Hab ich morgen Nachmittag Zeit?", TODAY)).toEqual({ kind: "free", date: "2026-10-21", from: "12:00", to: "18:00", label: "morgen Nachmittag" });
    expect(parseCalendar("Bin ich heute frei?", TODAY)).toEqual({ kind: "free", date: TODAY, from: "08:00", to: "20:00", label: "heute" });
    expect(parseCalendar("Haben wir am Freitag abends Zeit?", TODAY)).toMatchObject({ from: "18:00", label: "Freitag Abend" });
    expect(parseCalendar("Hab ich morgens Zeit?", TODAY)).toMatchObject({ from: "06:00", label: "heute früh" });
  });

  it("verschieben, löschen, erledigt", () => {
    expect(parseCalendar("Verschieb den Steuerberater auf Donnerstag", TODAY)).toEqual({ kind: "move", query: "den Steuerberater", to: "2026-10-22", time: undefined });
    expect(parseCalendar("Verleg den Zahnarzt auf 15 Uhr", TODAY)).toEqual({ kind: "move", query: "den Zahnarzt", to: TODAY, time: "15:00" });
    expect(parseCalendar("Lösch den Zahnarzt", TODAY)).toEqual({ kind: "delete", query: "den Zahnarzt" });
    expect(parseCalendar("Der Zahnarzt fällt aus", TODAY)).toEqual({ kind: "delete", query: "Der Zahnarzt" });
    expect(parseCalendar("Kita-Formular ist erledigt", TODAY)).toEqual({ kind: "done", query: "Kita-Formular" });
    expect(parseCalendar("Hab den Müll erledigt", TODAY)).toEqual({ kind: "done", query: "den Müll" });
    expect(parseCalendar("Erledigt: Steuer", TODAY)).toEqual({ kind: "done", query: "Steuer" });
  });
});

describe("Hilfen", () => {
  it("dringend erkennen", () => {
    expect(urgentFrom("Steuer – ist wichtig")).toEqual({ text: "Steuer", urgent: true });
    expect(urgentFrom("❗ Eilig: Pass")).toEqual({ text: "Pass", urgent: true });
    expect(urgentFrom("Normal")).toEqual({ text: "Normal", urgent: false });
  });

  it("Etikett und Raum", () => {
    expect(guessLabel("Eisdiele mit Kindern")).toBe("Eisladen");
    expect(guessLabel("Geburtstag Oma")).toBe("Geburtstag");
    expect(guessLabel("Nichts")).toBeUndefined();
    expect(guessRoom("Call mit Kunde")).toBe("arbeit");
    expect(guessRoom("Spielplatz")).toBe("familie");
  });
});

describe("Schnell-Eintrag", () => {
  it("liest Tag und Uhrzeit aus dem Text", () => {
    expect(readQuickText("Morgen um 9 Arzt", TODAY)).toMatchObject({ when: "morgen", time: "09:00", label: "Arzt", urgent: false });
    expect(readQuickText("Heute um 9 Arzt", TODAY).when).toBe("heute");
    expect(readQuickText("Am Freitag um 9 Arzt", TODAY).when).toEqual({ date: "2026-10-23" });
    expect(readQuickText("Formular bis Freitag", TODAY).when).toEqual({ due: "2026-10-23" });
    expect(readQuickText("Fenster putzen heute", TODAY).when).toBe("heute");
    expect(readQuickText("Fenster putzen morgen", TODAY).when).toBe("morgen");
    expect(readQuickText("Fenster putzen am Freitag", TODAY).when).toEqual({ date: "2026-10-23" });
    // Ohne genannten Tag: null = der vorgegebene Tag (sonst heute)
    expect(readQuickText("Diese Woche Reifen", TODAY).when).toBeNull();
    expect(readQuickText("Kommende Woche Reifen", TODAY).when).toEqual({ date: "2026-10-26" });
    expect(readQuickText("Wichtig: Müll rausbringen", TODAY)).toMatchObject({ urgent: true, when: null, title: "Müll rausbringen" });
    expect(readQuickText("Präsentation", TODAY)).toMatchObject({ title: "Präsentation", when: null, room: "arbeit" });
  });

  it("baut die Aufgabe aus der Auswahl", () => {
    expect(quickTaskData(" Müll ", "heute", TODAY, { time: "18:00", label: "Haus", dringend: true, reminder: "15" })).toEqual({ title: "Müll", reminder: "15", repeat: null, time: "18:00", label: "Haus", dringend: true, date: TODAY });
    expect(quickTaskData("A", "morgen", TODAY).date).toBe("2026-10-21");
    expect(quickTaskData("A", { due: "2026-10-23" }, TODAY)).toMatchObject({ due: "2026-10-23", date: TODAY });
    expect(quickTaskData("A", {}, TODAY).date).toBe(TODAY);
    expect(quickTaskData("A", { date: "2026-10-23" }, TODAY).date).toBe("2026-10-23");
  });

  it("Chips: Wann, Tag, häufige Uhrzeiten", () => {
    expect(whenLabel("morgen")).toBe("Morgen");
    expect(whenLabel({ date: "2026-10-23" })).toBe("Fr 23.10.");
    expect(whenLabel({ due: "2026-10-23" })).toBe("bis Fr 23.10.");
    expect(dayChipLabel("2026-10-23")).toBe("Fr 23.10.");
    expect(dayChipLabel("2026-10-23", true)).toBe("Freitag");
    expect(frequentTimes(["17:00", "17:00", "09:30", "09:30", "09:30", "kaputt", "11:00"])).toEqual(["09:30", "17:00", "08:00", "12:00"]);
    expect(frequentTimes([], 2)).toEqual(["08:00", "12:00"]);
  });

  it("Termin-Text und Tag des neuen Termins", () => {
    expect(readTerminText("Freitag um 10 Kita Fest", TODAY)).toMatchObject({ date: "2026-10-23", time: "10:00", label: "Kita", repeat: null });
    expect(readTerminText("Formular bis Freitag", TODAY)).toMatchObject({ date: "2026-10-23" });
    expect(readTerminText("Kunde Meier", TODAY)).toMatchObject({ title: "Kunde Meier", room: "arbeit" });
    expect(terminDay("Arzt", TODAY, null, "2026-10-25", TODAY)).toBe("2026-10-25");
    expect(terminDay("heute Arzt", TODAY, null, "2026-10-25", TODAY)).toBe(TODAY);
    expect(terminDay("Arzt", "2026-10-23", "2026-10-30", undefined, TODAY)).toBe("2026-10-30");
    expect(terminDay("Arzt", undefined, null, undefined, TODAY)).toBe(TODAY);
  });
});
