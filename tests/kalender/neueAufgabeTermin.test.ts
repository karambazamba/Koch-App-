// Neue Aufgabe & Termin – ein Feld, Familie · Ich · Arbeit (Tafel 114, A-034).
// Satz lesen (Tag-Erkennung „Freitag …“ → „Ab Freitag“, Raum aus dem Satz),
// Glocke + Zeile „Erinnern heute 16:00“, „Mehr“ (Ab wann, Wiederholen, An
// jemanden geben), Termin-Chips (Tag, Uhrzeit, Dauer) und „Uhrzeit?“, Raum
// vorgewählt (Termine Familie, Aufgaben Ich), Haushalt allein/zu zweit/Familie, Speichern
// mit „Steht drin · Rückgängig“ (Feld bleibt offen), Etiketten bleiben.
import { afterEach, describe, expect, it, vi } from "vitest";
import { at, atFresh, aufgabe, fakeWindow, noBrowser, termin } from "../helpers";
import { aufgabeDaten, aufgabeHinweis, aufgabeLesen, erinnernText, erinnernVon, glockeVorschlaege, serie, wiederholenLabel, wiederholenVon } from "@/lib/kalender/eintragen/aufgabe";
import { dauerAusText, dauerLabel, dauerVon, endeVon, terminBereit, terminDaten, terminLesen, vorherText } from "@/lib/kalender/eintragen/termin";
import { chipRaum, istKorrektur, raumZumSpeichern, vorgewaehltText } from "@/lib/kalender/raum/wahl";
import { tagKurz, tagWahl, tagWort, uhr } from "@/lib/kalender/eintragen/tage";
import type { AufgabeData, TerminData } from "@/lib/kalender/model";

const HEUTE = "2026-10-28"; // Mittwoch
at(`${HEUTE}T10:30`);
afterEach(() => noBrowser());

describe("Neue Aufgabe: Satz lesen", () => {
  it("ohne Tag für heute; „Freitag …“ → ab Freitag (korrigierbar über „Ab wann“)", () => {
    expect(aufgabeLesen("Tim antworten", HEUTE)).toMatchObject({ title: "Tim antworten", ab: null, raum: "ich", raumGrund: "standard", erinnern: null });
    expect(aufgabeLesen("Freitag Geschenk für Oma besorgen", HEUTE)).toMatchObject({ title: "Geschenk für Oma besorgen", ab: "2026-10-30" });
    expect(aufgabeLesen("Morgen Altglas wegbringen", HEUTE).ab).toBe("2026-10-29");
    expect(aufgabeLesen("Heute Blumen gießen", HEUTE).ab).toBeNull();
    expect(aufgabeHinweis(null, HEUTE)).toBe("Für heute. Return = speichern.");
    expect(aufgabeHinweis("2026-10-30", HEUTE)).toBe("Ab Freitag. Return = speichern.");
  });

  it("Raum aus dem Satz: „nur für mich“/„privat“ → Ich, „für alle“/„Familie“ → Familie, Büro → Arbeit, sonst Ich", () => {
    expect(aufgabeLesen("Tim antworten nur für mich", HEUTE)).toMatchObject({ title: "Tim antworten", raum: "ich", raumGrund: "gesagt" });
    expect(aufgabeLesen("Privat: Geschenk besorgen", HEUTE)).toMatchObject({ title: "Geschenk besorgen", raum: "ich" });
    expect(aufgabeLesen("Für alle: Müll rausbringen", HEUTE)).toMatchObject({ raum: "familie" });
    expect(aufgabeLesen("Rechnung Steuerberater fürs Büro", HEUTE).raum).toBe("arbeit");
    expect(aufgabeLesen("Laden aufräumen", HEUTE)).toMatchObject({ raum: "ich", raumGrund: "standard" });
    expect(aufgabeLesen("Laden aufräumen", HEUTE, { arbeitWorte: ["laden"] }).raum).toBe("arbeit");
    expect(aufgabeLesen("Peter anrufen", HEUTE, { gelernt: [{ wort: "peter", raum: "arbeit" }] })).toMatchObject({ raum: "arbeit", raumGrund: "gelernt" });
  });

  it("genannte Uhrzeit wird zur Erinnerung, dringend und Frist bleiben", () => {
    expect(aufgabeLesen("Tim anrufen 16 Uhr", HEUTE).erinnern).toEqual({ date: HEUTE, time: "16:00" });
    expect(aufgabeLesen("Dringend: Versicherung anrufen", HEUTE)).toMatchObject({ dringend: true, title: "Versicherung anrufen" });
    expect(aufgabeLesen("Formular bis Freitag", HEUTE).due).toBe("2026-10-30");
  });
});

describe("Glocke: Erinnern → Uhrzeit → eigene Zeile", () => {
  it("Vorschläge: in 1 Std, 16:00, 18:00, morgen früh – Vorbeies fällt weg, nichts doppelt", () => {
    expect(glockeVorschlaege(HEUTE, 10 * 60 + 30).map((v) => [v.label, v.date, v.time])).toEqual([
      ["In 1 Std", HEUTE, "11:30"],
      ["16:00", HEUTE, "16:00"],
      ["18:00", HEUTE, "18:00"],
      ["Morgen früh", "2026-10-29", "08:00"],
    ]);
    expect(glockeVorschlaege(HEUTE, 17 * 60).map((v) => v.label)).toEqual(["In 1 Std", "Morgen früh"]);
    expect(glockeVorschlaege(HEUTE, 23 * 60 + 30).map((v) => v.label)).toEqual(["Morgen früh"]);
  });

  it("Zeile „Erinnern heute 16:00“", () => {
    expect(erinnernText({ date: HEUTE, time: "16:00" }, HEUTE)).toBe("Erinnern heute 16:00");
    expect(erinnernText({ date: "2026-10-29", time: "08:00" }, HEUTE)).toBe("Erinnern morgen 8:00");
    expect(erinnernText({ date: "2026-10-30", time: "09:30" }, HEUTE)).toBe("Erinnern Freitag 9:30");
  });
});

describe("Aufgabe speichern: Daten", () => {
  it("neu: für heute; mit Glocke Uhrzeit + Erinnerung; „Morgen früh“ legt sie auf morgen", () => {
    expect(aufgabeDaten({ title: " Tim antworten ", ab: null, erinnern: null, repeat: null, today: HEUTE })).toEqual({ title: "Tim antworten", date: HEUTE, repeat: null, reminder: "aus" });
    expect(aufgabeDaten({ title: "Rechnung", ab: null, erinnern: { date: HEUTE, time: "16:00" }, repeat: null, today: HEUTE })).toMatchObject({ date: HEUTE, time: "16:00", reminder: "30" });
    expect(aufgabeDaten({ title: "Rechnung", ab: null, erinnern: { date: "2026-10-29", time: "08:00" }, repeat: null, today: HEUTE }).date).toBe("2026-10-29");
    expect(aufgabeDaten({ title: "Geschenk", ab: "2026-10-30", erinnern: null, repeat: { kind: "woechentlich" }, today: HEUTE, dringend: true, label: "Geburtstag" })).toMatchObject({ date: "2026-10-30", repeat: { kind: "woechentlich" }, dringend: true, label: "Geburtstag" });
  });

  it("Bearbeiten: Etiketten, Frist, Liste, Abgehaktes bleiben gespeichert (nur nicht mehr gezeigt)", () => {
    const vorher: AufgabeData = { title: "Alt", date: "2026-10-20", due: "2026-11-02", time: "07:00", label: "Kita", liste: "Haus", reminder: "aus", repeat: null, doneDates: ["2026-10-21"], seit: "2026-10-22T08:00:00.000Z" };
    const neu = aufgabeDaten({ title: "Neu", ab: null, erinnern: null, repeat: null, today: HEUTE, vorher });
    expect(neu).toMatchObject({ title: "Neu", date: "2026-10-20", due: "2026-11-02", label: "Kita", liste: "Haus", time: "07:00", reminder: "aus", doneDates: ["2026-10-21"], seit: vorher.seit });
    expect(erinnernVon({ date: "2026-10-20", time: "07:00", reminder: "30" }, HEUTE)).toEqual({ date: "2026-10-20", time: "07:00" });
    expect(erinnernVon({ time: "07:00", reminder: "aus" }, HEUTE)).toBeNull();
  });

  it("„Mehr“: Wiederholen (Nie · Täglich · Wöchentlich · Monatlich), alte Serien behalten ihre Feinheiten", () => {
    expect(serie("nie", null)).toBeNull();
    expect(serie("taeglich", null)).toEqual({ kind: "taeglich" });
    expect(serie("woechentlich", { kind: "woechentlich", every: 2 })).toEqual({ kind: "woechentlich", every: 2 });
    expect(wiederholenLabel({ kind: "woechentlich", every: 2 })).toBe("Alle 2 Wochen");
    expect(wiederholenLabel({ kind: "wochentage", days: [0, 2] })).toBe("An Wochentagen");
    expect(wiederholenLabel(null)).toBe("Nie");
    expect(wiederholenVon({ kind: "wochentage", days: [1] })).toBe("woechentlich");
    expect(wiederholenVon(undefined)).toBe("nie");
  });
});

describe("Neuer Termin: Tag, Uhrzeit, Dauer als Chips", () => {
  it("„Zahnarzt Freitag 13 Uhr“ → Fr 30. Okt · 13:00 · 1 Std (Standard)", () => {
    const r = terminLesen("Zahnarzt Freitag 13 Uhr", HEUTE);
    expect(r).toMatchObject({ title: "Zahnarzt", date: "2026-10-30", time: "13:00", dauer: null, raum: "ich" });
    expect(terminLesen("Kino Freitag 20 Uhr", HEUTE)).toMatchObject({ raum: "familie", raumGrund: "standard" });
    expect(tagKurz(r.date!)).toBe("Fr 30. Okt");
    expect(uhr(r.time!)).toBe("13:00");
    expect(dauerLabel(r.dauer ?? 60)).toBe("1 Std");
  });

  it("Dauer aus dem Satz – und „1 Std“ wird nie zur Uhrzeit", () => {
    expect(terminLesen("Elternabend Donnerstag 19:30 für 2 Stunden", HEUTE)).toMatchObject({ title: "Elternabend", date: "2026-10-29", time: "19:30", dauer: 120 });
    expect(terminLesen("Physio morgen 9 Uhr 45 Minuten", HEUTE)).toMatchObject({ time: "09:00", dauer: 45 });
    expect(terminLesen("Zahnarzt Freitag 13 Uhr eine Stunde", HEUTE).dauer).toBe(60);
    expect(dauerAusText("anderthalb Stunden Training")?.min).toBe(90);
    expect(dauerAusText("Zahnarzt")).toBeNull();
    expect(dauerLabel(30)).toBe("30 Min");
    expect(dauerLabel(90)).toBe("1,5 Std");
  });

  it("ohne Uhrzeit: „Uhrzeit?“ – gespeichert wird erst danach (oder ganztägig)", () => {
    const r = terminLesen("Zahnarzt Freitag", HEUTE);
    expect(r.time).toBeNull();
    expect(terminBereit({ title: r.title, time: r.time, ganztaegig: false })).toBe(false);
    expect(terminBereit({ title: r.title, time: "13:00", ganztaegig: false })).toBe(true);
    expect(terminBereit({ title: r.title, time: null, ganztaegig: true })).toBe(true);
    expect(terminBereit({ title: "  ", time: "13:00", ganztaegig: false })).toBe(false);
  });

  it("Raum aus dem Satz wie bei Aufgaben", () => {
    expect(terminLesen("Therapie Donnerstag 17 Uhr nur für mich", HEUTE)).toMatchObject({ title: "Therapie", raum: "ich", time: "17:00" });
    expect(terminLesen("Lieferant Tohuus Freitag 9 Uhr", HEUTE)).toMatchObject({ raum: "arbeit", time: "09:00" });
    expect(terminLesen("Meeting mit dem Team Freitag 10 Uhr", HEUTE).raum).toBe("arbeit");
  });

  it("Ende aus Beginn und Dauer, über Mitternacht ohne Ende; Glocke „Erinnern 1 Std vorher“", () => {
    expect(endeVon("13:00", 60)).toBe("14:00");
    expect(endeVon("23:30", 60)).toBeUndefined();
    expect(dauerVon("13:00", "14:30")).toBe(90);
    expect(dauerVon("13:00")).toBeNull();
    expect(vorherText("60")).toBe("Erinnern 1 Std vorher");
    expect(vorherText("vorabend")).toBe("Erinnern am Vorabend");
  });

  it("Daten: neu mit Ende; Bearbeiten behält Etikett, Herkunft, Link, Abgehaktes", () => {
    const neu = terminDaten({ title: "Zahnarzt", date: "2026-10-30", time: "13:00", ganztaegig: false, dauer: 60, reminder: "60", repeat: null, place: " Praxis ", who: [] });
    expect(neu).toEqual({ title: "Zahnarzt", date: "2026-10-30", start: "13:00", end: "14:00", place: "Praxis", repeat: null, reminder: "60" });
    expect(terminDaten({ title: "Oma", date: "2026-10-30", time: "13:00", ganztaegig: true, dauer: null, reminder: "aus", repeat: null, place: "", who: ["p1"] })).toMatchObject({ start: "", who: ["p1"] });
    const vorher: TerminData = { title: "Alt", date: "2026-10-30", start: "09:00", end: "10:00", label: "Kita", reminder: "aus", repeat: null, link: "https://eutin.de", source: { kind: "google", uid: "x" }, doneDates: ["2026-10-01"] };
    const geaendert = terminDaten({ title: "Neu", date: "2026-10-31", time: "09:00", ganztaegig: false, dauer: dauerVon("09:00", "10:00"), reminder: "30", repeat: null, place: "", who: [], vorher });
    expect(geaendert).toMatchObject({ title: "Neu", date: "2026-10-31", end: "10:00", label: "Kita", link: "https://eutin.de", source: { kind: "google", uid: "x" }, doneDates: ["2026-10-01"] });
  });
});

describe("Tage für Chips und „Ab wann“", () => {
  it("Heute, Morgen, Wochentag, sonst kurz", () => {
    expect(tagWort(HEUTE, HEUTE)).toBe("Heute");
    expect(tagWort("2026-10-29", HEUTE)).toBe("Morgen");
    expect(tagWort("2026-10-30", HEUTE)).toBe("Freitag");
    expect(tagWort("2026-11-05", HEUTE)).toBe("Do 5. Nov");
    expect(tagWahl(HEUTE, 3).map((t) => t.label)).toEqual(["Heute", "Morgen", "Freitag"]);
  });
});

describe("Raum-Chips Familie · Ich · Arbeit (A-034)", () => {
  it("von Hand geht vor Mias Vorschlag; allein zeigt „Ich“ sich als „Privat“", () => {
    expect(chipRaum({ hand: null, vorschlag: "ich", haushalt: "familie" })).toBe("ich");
    expect(chipRaum({ hand: "arbeit", vorschlag: "ich", haushalt: "familie" })).toBe("arbeit");
    expect(chipRaum({ hand: null, vorschlag: "ich", haushalt: "allein" })).toBe("familie");
  });

  it("gespeichert: allein bleibt eine Aufgabe „ich“ (später mit Partner nicht ungefragt geteilt), ein Termin „familie“", () => {
    expect(raumZumSpeichern("familie", { art: "aufgabe", vorher: null, vorschlag: "ich", haushalt: "allein" })).toBe("ich");
    expect(raumZumSpeichern("familie", { art: "termin", vorher: null, vorschlag: "familie", haushalt: "allein" })).toBe("familie");
    expect(raumZumSpeichern("familie", { art: "termin", vorher: "ich", vorschlag: "ich", haushalt: "allein" })).toBe("ich");
    expect(raumZumSpeichern("familie", { art: "aufgabe", vorher: null, vorschlag: "arbeit", haushalt: "allein" })).toBe("ich");
    expect(raumZumSpeichern("familie", { art: "aufgabe", vorher: null, vorschlag: "ich", haushalt: "familie" })).toBe("familie");
    expect(raumZumSpeichern("arbeit", { art: "aufgabe", vorher: "ich", vorschlag: "ich", haushalt: "allein" })).toBe("arbeit");
  });

  it("Korrektur = von Hand anders als Mias Vorschlag; der einmalige Satz", () => {
    expect(istKorrektur({ hand: null, vorschlag: "ich", haushalt: "familie" })).toBe(false);
    expect(istKorrektur({ hand: "ich", vorschlag: "ich", haushalt: "familie" })).toBe(false);
    expect(istKorrektur({ hand: "arbeit", vorschlag: "ich", haushalt: "familie" })).toBe(true);
    expect(istKorrektur({ hand: "familie", vorschlag: "ich", haushalt: "allein" })).toBe(false);
    expect(vorgewaehltText("familie", "familie")).toBe("Hab Familie gewählt. Tippen zum Ändern.");
    expect(vorgewaehltText("ich", "familie")).toBe("Nur für dich gewählt. Tippen zum Ändern.");
    expect(vorgewaehltText("ich", "allein")).toBe("Hab Privat gewählt. Tippen zum Ändern.");
  });
});

describe("Speichern: „Steht drin · Rückgängig“, Feld bleibt offen", () => {
  async function setup() {
    fakeWindow();
    vi.resetModules();
    await atFresh(`${HEUTE}T10:30`);
    const { eintragSpeichern } = await import("@/components/kalender/eintragen/speichern");
    const toast = await import("@/lib/core/toast");
    const { loadEntries } = await import("@/lib/kalender/store");
    const undo = await import("@/lib/core/undo");
    let shown: { text: string; undo?: () => void } | null = null;
    vi.spyOn(toast, "showToast").mockImplementation((t) => void (shown = t));
    return { eintragSpeichern, loadEntries, undo, toast: () => shown };
  }

  it("neu: speichert im Raum „arbeit“, Toast „Steht drin“, Rückgängig nimmt sie weg", async () => {
    const s = await setup();
    const a = aufgabe({ title: "Lieferant anrufen", date: HEUTE }, { raum: "familie" });
    expect(s.eintragSpeichern([{ ...a, raum: "arbeit" }], true)).toBe(true);
    expect(s.loadEntries()).toMatchObject([{ typ: "aufgabe", raum: "arbeit", data: { title: "Lieferant anrufen" } }]);
    expect(s.toast()?.text).toBe("Steht drin");
    s.toast()!.undo!();
    expect(s.loadEntries()).toEqual([]);
  });

  it("mehrere Termine auf einmal, „Mach das rückgängig“ (Mia) geht; Ändern meldet sich still", async () => {
    const s = await setup();
    const zwei = [termin({ title: "Zahnarzt", date: "2026-11-02", start: "09:00" }), termin({ title: "Friseur", date: "2026-11-03", start: "14:00" }, "arbeit")];
    s.eintragSpeichern(zwei, true);
    expect(s.loadEntries().map((e) => e.data.title).sort()).toEqual(["Friseur", "Zahnarzt"]);
    expect(s.undo.undoLast()).toBeTruthy();
    expect(s.loadEntries()).toEqual([]);
    s.eintragSpeichern([zwei[0]], true);
    const vorher = s.toast();
    s.eintragSpeichern([{ ...zwei[0], data: { ...zwei[0].data, title: "Zahnarzt Jonne" } } as typeof zwei[0]], false);
    expect(s.loadEntries()).toMatchObject([{ data: { title: "Zahnarzt Jonne" } }]);
    expect(s.toast()).toBe(vorher);
  });

  it("ungültig = nichts", async () => {
    const s = await setup();
    expect(s.eintragSpeichern([{ ...aufgabe({ title: "x" }), data: { title: " ", reminder: "aus" } } as never], true)).toBe(false);
    expect(s.loadEntries()).toEqual([]);
  });
});
