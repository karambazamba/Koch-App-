// Testmodus: weitere Runden – nach dem Lesen der Woche Änderungen vorschlagen,
// nach Werkzeugen kurz antworten (Portionen, Mails, Timer, Wetter, Termine …).
import { describe, expect, it } from "vitest";
import { calendarAnswer } from "@/lib/begleitung/mockAlltag";
import { afterTools, context } from "./testmodusHilfen";

const S = context();

type Day = { tag: string; datum: string; gericht?: string | null; rezept_id?: string; ausflug?: boolean; pause?: boolean; wochenende?: string };
const week = (tage: Day[], woche = "2026-10-19") => JSON.stringify({ woche, tage });
const book = (rezepte: { rezept_id: string; titel: string; bekannt?: boolean; minuten?: number }[]) => JSON.stringify({ rezepte });

/** Woche Mo 19.10. – So 25.10., Do mit Bolognese, Fr frei */
const WEEK: Day[] = [
  { tag: "Montag", datum: "19.10.", gericht: "Kartoffelsuppe", rezept_id: "r2" },
  { tag: "Dienstag", datum: "20.10.", gericht: null },
  { tag: "Mittwoch", datum: "21.10.", ausflug: true },
  { tag: "Donnerstag", datum: "22.10.", gericht: null },
  { tag: "Freitag", datum: "23.10.", gericht: null },
  { tag: "Samstag", datum: "24.10.", gericht: null, wochenende: "frei" },
  { tag: "Sonntag", datum: "25.10.", gericht: null },
];
const BOOK = book([
  { rezept_id: "r1", titel: "Spaghetti Bolognese", bekannt: true, minuten: 25 },
  { rezept_id: "r2", titel: "Kartoffelsuppe", bekannt: true, minuten: 50 },
  { rezept_id: "r3", titel: "Linsencurry", bekannt: false, minuten: 30 },
  { rezept_id: "r4", titel: "Rührei mit Brot", bekannt: true, minuten: 10 },
]);
const READ = [{ name: "woche_lesen", input: { woche: "aktuell" } }, { name: "kochbuch_durchsuchen" }];
const plan = (question: string, tage: Day[] = WEEK, system = S, bookJson = BOOK) => afterTools(system, question, READ, { woche_lesen: week(tage), kochbuch_durchsuchen: bookJson });
const names = (r: { uses: { name: string }[] }) => r.uses.map((u) => u.name);

describe("Woche gelesen → Vorschlag", () => {
  it("kaputtes Ergebnis: ehrlich sagen", async () => {
    expect((await afterTools(S, "Plan mir die Woche", READ, { woche_lesen: "kaputt" })).text).toBe("Ich konnte die Woche gerade nicht lesen.");
  });

  it("Gericht für morgen: Rezept aus dem Kochbuch oder freies Gericht", async () => {
    const both = [{ name: "woche_lesen", id: "w1" }, { name: "woche_lesen", id: "w2" }, { name: "kochbuch_durchsuchen", id: "k" }];
    const lasagne = book([{ rezept_id: "r9", titel: "Lasagne al forno", bekannt: true, minuten: 60 }]);
    const r = await afterTools(S, "Morgen gibt's Lasagne", both, { woche_lesen: week(WEEK), kochbuch_durchsuchen: lasagne });
    expect(r.uses).toEqual([expect.objectContaining({ name: "gericht_setzen", input: { woche: "2026-10-19", tag: "Freitag", rezept_id: "r9" } })]);
    const free = await afterTools(S, "Morgen gibt's Flammkuchen", both, { woche_lesen: week(WEEK), kochbuch_durchsuchen: lasagne });
    expect(free.uses[0].input).toEqual({ woche: "2026-10-19", tag: "Freitag", gericht: "Flammkuchen" });
    const missing = await afterTools(S, "Morgen gibt's Flammkuchen", both, { woche_lesen: week(WEEK.slice(0, 2)), kochbuch_durchsuchen: lasagne });
    expect(missing.text).toBe("Den Tag finde ich gerade nicht im Plan – magst du ihn mir nochmal sagen?");
  });

  it("nur schnelle Gerichte: Langsames und Freies ersetzen, Ausflug/frei bleibt", async () => {
    const r = await plan("Nur noch schnelle Gerichte");
    expect(r.uses.map((u) => [u.input.tag, u.input.rezept_id])).toEqual([
      ["Montag", "r4"],
      ["Dienstag", "r1"],
      ["Donnerstag", "r4"],
      ["Freitag", "r1"],
      ["Sonntag", "r4"],
    ]);
    const fast: Day[] = [{ tag: "Montag", datum: "19.10.", gericht: "Rührei", rezept_id: "r4" }];
    expect((await plan("Nur noch schnelle Gerichte", fast)).text).toBe("Diese Woche ist schon alles schnell – passt! (Testmodus)");
    const spontan = context(["Kochstil: Ich koche spontan – keine Planung"]);
    expect(names(await plan("Nur noch schnelle Gerichte", WEEK, spontan))).toEqual(["gericht_setzen"]);
  });

  it("meine Rezepte an zwei Tagen + Wunsch + Einkauf", async () => {
    const r = await plan("Donnerstag und Freitag gibt es meine Rezepte, Spaghetti Bolognese und Linsencurry, Mattis wünscht sich Sonntag Milchreis. Setz Eier und Milch auf die Einkaufsliste");
    expect(r.uses.map((u) => [u.name, u.input])).toEqual([
      ["gericht_setzen", { woche: "aktuell", tag: "Donnerstag", rezept_id: "r1" }],
      ["gericht_setzen", { woche: "aktuell", tag: "Freitag", rezept_id: "r3" }],
      ["vorgaben_aendern", { woche: "aktuell", wunsch: { kind: "Mattis", gericht: "Milchreis", tag: "Sonntag" } }],
      ["einkaufsliste_hinzufuegen", { woche: "aktuell", artikel: [{ name: "Eier" }, { name: "Milch" }] }],
    ]);
  });

  it("der Rest vegetarisch: neue Rezepte für freie Tage, auf die Personen umgerechnet", async () => {
    const two = S.replace("4 Personen", "2 Personen");
    const r = await plan("Der Rest vegetarisch", WEEK, two);
    const created = r.uses.filter((u) => u.name === "rezept_erstellen");
    // Di, Do, Fr, Sa (frei zählt hier mit), So – nicht Mo (belegt) und nicht Mi (Ausflug)
    expect(created.map((u) => u.id.split("_")[2])).toEqual(["Dienstag", "Donnerstag", "Freitag", "Samstag", "Sonntag"]);
    const curry = created[0].input as { portionen: number; zutaten: { menge: number | null; einheit: string; name: string }[]; kategorie: string };
    expect(curry.kategorie).toBe("vegetarisch");
    expect(curry.portionen).toBe(2);
    expect(curry.zutaten).toContainEqual({ menge: 200, einheit: "ml", name: "Kokosmilch" });
    expect(curry.zutaten).toContainEqual({ menge: 1, einheit: "Stück", name: "Paprika" });
    const suppe = created[2].input as { zutaten: { menge: number | null; name: string }[] };
    expect(suppe.zutaten).toContainEqual({ menge: null, einheit: "", name: "Muskat" });
  });

  it("leeren, doppelt kochen, tauschen", async () => {
    const tage: Day[] = WEEK.map((d) => (d.tag === "Dienstag" ? { ...d, gericht: "Pizza" } : d));
    expect((await plan("Lösch den Montag und den Mittwoch", tage)).uses.map((u) => [u.name, u.input.tag])).toEqual([["platz_leeren", "Montag"]]);
    expect((await plan("Am Montag doppelt kochen", tage)).uses.map((u) => [u.name, u.input])).toEqual([["doppelt_kochen", { woche: "aktuell", tag: "Montag", an: true }]]);
    expect((await plan("Tausch Montag und Dienstag", tage)).uses.map((u) => [u.name, u.input])).toEqual([["gericht_verschieben", { woche: "aktuell", von_tag: "Montag", nach_tag: "Dienstag" }]]);
    expect((await plan("Tausch Montag und Mittwoch", tage)).text).toMatch(/^Ich habe nichts gefunden/);
  });

  it("Woche planen: Bekanntes, Schnelles zuerst und ein neues Gericht", async () => {
    const r = await plan("Plan mir die Woche");
    const set = r.uses.map((u) => [u.input.tag, u.input.rezept_id ?? u.name]);
    // frei: Di, Do, Fr, So → ein neues (Linsencurry) in der Mitte, sonst bekannte, schnellste zuerst
    expect(set).toEqual([
      ["Dienstag", "r4"],
      ["Donnerstag", "r1"],
      ["Freitag", "r3"],
      ["Sonntag", "r2"],
    ]);
    const twoNew = S.replace("Neue Gerichte pro Woche: 1", "Neue Gerichte pro Woche: 2");
    const onlyKnown = book([{ rezept_id: "r4", titel: "Rührei mit Brot", bekannt: true, minuten: 10 }]);
    const r2 = await plan("Plan mir die Woche", WEEK, twoNew, onlyKnown);
    // ohne unbekannte Rezepte → KI-Rezept (rezept_erstellen); reichen die bekannten nicht, bleiben Tage frei
    expect(names(r2)).toEqual(["gericht_setzen", "rezept_erstellen", "rezept_erstellen"]);
  });
});

describe("Nach den Werkzeugen kurz antworten", () => {
  it("Portionen und App-Befehl", async () => {
    const p = [{ name: "portionen_anpassen", input: { personen: 2 } }];
    expect((await afterTools(S, "Nur zu zweit", p, { portionen_anpassen: "Vorgemerkt: Pasta am Freitag nur für 2 Personen." })).text).toBe("Klar! Pasta am Freitag nur für 2 Personen. Tipp unten auf Übernehmen. (Testmodus)");
    expect((await afterTools(S, "Nur zu zweit", p, { portionen_anpassen: "Heute ist nichts geplant." })).text).toBe("Heute ist nichts geplant. (Testmodus)");
    expect((await afterTools(S, "Mach dunkel", [{ name: "app_befehl" }], {})).text).toBe("Mach ich – tipp unten auf Übernehmen. (Testmodus)");
  });

  it("Mails: Kurzfassung, Frage nach der Richtung, Termin dazu", async () => {
    const drafted = await afterTools(S, "Schreib der Kita …", [{ name: "mail_entwurf", input: { kurzfassung: "Jonne ist krank." } }], {});
    expect(drafted.text).toBe("Kurz gesagt: Jonne ist krank. Hier mein Vorschlag – senden machst du selbst. (Testmodus)");
    const noSummary = await afterTools(S, "Schreib der Kita …", [{ name: "mail_entwurf", input: {} }], {});
    expect(noSummary.text).toBe("Hier mein Vorschlag – senden machst du selbst. (Testmodus)");
    const mail = "Von: Kita <info@kita.de>\nBetreff: Elternabend\n\nLiebe Eltern,\n\nder Elternabend findet am Donnerstag um 19:30 statt.\n\nLiebe Grüße\nAnna";
    const asked = await afterTools(S, mail, [{ name: "antwort_knoepfe" }, { name: "termin_anlegen" }], {});
    expect(asked.text).toBe("Kurz gesagt: Der Elternabend findet am Donnerstag um 19:30 statt. Wie willst du antworten? Da steht auch ein Termin drin – soll ich das eintragen? Tipp unten auf Übernehmen. (Testmodus)");
  });

  it("Timer, Begleitung, Sport-Ziel", async () => {
    expect((await afterTools(S, "Timer", [{ name: "timer_stellen" }], { timer_stellen: "Läuft gleich (die App startet ihn sofort): Nudeln, 10 Min." })).text).toBe("Läuft: Nudeln, 10 Min. (Testmodus)");
    expect((await afterTools(S, "Frieda", [{ name: "assistent_anpassen" }], { assistent_anpassen: "Vorgemerkt (mit Übernehmen): Gern – ab jetzt bin ich Frieda." })).text).toBe("Gern – ab jetzt bin ich Frieda. Tipp unten auf Übernehmen. (Testmodus)");
    expect((await afterTools(S, "Ziel", [{ name: "sport_ziel_setzen" }], { sport_ziel_setzen: "Vorgemerkt: Wochenziel 4×." })).text).toBe("Klar: Wochenziel 4×. Tipp unten auf Übernehmen. (Testmodus)");
  });

  it("Tipps aus der Region und Wetter", async () => {
    expect((await afterTools(S, "Was ist los?", [{ name: "tipps_suchen" }], { tipps_suchen: "Treffer: Kürbisfest" })).text).toMatch(/^Da wäre was in eurer Nähe/);
    expect((await afterTools(S, "Was ist los?", [{ name: "tipps_suchen" }], { tipps_suchen: "Keine Treffer" })).text).toBe("Dafür habe ich in eurer Nähe gerade nichts gefunden. (Testmodus)");
    expect((await afterTools(S, "Wetter?", [{ name: "wetter_abfragen" }], { wetter_abfragen: "Freitag, 23.10.\nRegnerisch, 8 bis 11°\nKurz: Ab 15 Uhr Regen." })).text).toBe("Ab 15 Uhr Regen. (Freitag, 23.10.) (Testmodus)");
    expect((await afterTools(S, "Wetter?", [{ name: "wetter_abfragen" }], { wetter_abfragen: "Freitag, 23.10.\nSonnig, 12°" })).text).toBe("Sonnig, 12° (Freitag, 23.10.) (Testmodus)");
  });

  it("Notizen/Aufgaben ohne ids wiedergeben, Termine kurz zusammenfassen", async () => {
    expect((await afterTools(S, "Packliste?", [{ name: "notizen_anzeigen" }], { notizen_anzeigen: "Packliste [id=n1]: Zelt, Lampe" })).text).toBe("Packliste: Zelt, Lampe (Testmodus)");
    const day = "Fr 2026-10-23: 09:00 Zahnarzt [id=t1; termin, familie] | Steuer [id=a1; aufgabe, familie]";
    expect((await afterTools(S, "Was steht morgen an?", [{ name: "tag_anzeigen", input: { datum: "2026-10-23", label: "morgen" } }], { tag_anzeigen: day })).text).toBe("Morgen: 9:00 Zahnarzt, Steuer. (Testmodus)");
  });

  it("neue Rezepte angelegt → eintragen, sonst Abschluss", async () => {
    const created = [{ name: "rezept_erstellen", id: "mock_rezept_Freitag_1" }];
    const r = await afterTools(S, "Der Rest vegetarisch", created, { rezept_erstellen: "Angelegt, ref: neu-7" });
    expect(r.uses).toEqual([expect.objectContaining({ name: "gericht_setzen", input: { woche: "aktuell", tag: "Freitag", neues_rezept: "neu-7" } })]);
    expect((await afterTools(S, "Der Rest vegetarisch", created, { rezept_erstellen: "Abgelehnt: Allergie" })).text).toMatch(/^Ich habe dir einen Vorschlag gemacht/);
  });

  it("Abschluss: bereit zum Übernehmen bzw. ehrlich bei Fehlern", async () => {
    expect((await afterTools(S, "Morgen 15 Uhr Zahnarzt", [{ name: "termin_anlegen" }], { termin_anlegen: "ok" })).text).toBe("Steht bereit – tipp unten auf Übernehmen. (Testmodus)");
    expect((await afterTools(S, "Setz Pasta", [{ name: "gericht_setzen" }], { gericht_setzen: "ok" })).text).toMatch(/^Ich habe dir einen Vorschlag gemacht \(Testmodus\)/);
    expect((await afterTools(S, "Setz Pasta", [{ name: "gericht_setzen" }], { gericht_setzen: "Fehler" }, ["gericht_setzen"])).text).toBe("Das hat leider nicht geklappt. Magst du es anders formulieren?");
  });
});

describe("Kurze Antwort aus der Terminliste", () => {
  const list = "Do 2026-10-22: 09:00 Zahnarzt [id=t1; termin, familie] | 16:00 Turnen [id=t3; termin, familie] | Wäsche [id=a2; aufgabe, familie]\nFr 2026-10-23: 08:00 Kita-Fest [id=t2; termin, familie]";

  it("Woche nach Tagen, Tag ohne Wochentag", () => {
    expect(calendarAnswer(list, { label: "diese Woche" })).toBe("Diese Woche: Do: 9:00 Zahnarzt, 16:00 Turnen, Wäsche. Fr: 8:00 Kita-Fest. (Testmodus)");
    expect(calendarAnswer(list.split("\n")[1], { datum: "2026-10-23", label: "morgen" })).toBe("Morgen: 8:00 Kita-Fest. (Testmodus)");
    expect(calendarAnswer("", { label: "morgen" })).toBe("Morgen steht nichts an – schön ruhig. (Testmodus)");
    expect(calendarAnswer("", {})).toBe("Da steht nichts an – schön ruhig. (Testmodus)");
  });

  it("frei oder belegt im Zeitfenster", () => {
    expect(calendarAnswer(list.split("\n")[0], { label: "heute", frei: ["08:00", "12:00"] })).toBe("Heute hast du 9:00 Zahnarzt. (Testmodus)");
    expect(calendarAnswer(list.split("\n")[0], { label: "heute", frei: ["12:00", "15:00"] })).toBe("Ja, heute ist frei. (Testmodus)");
  });
});
