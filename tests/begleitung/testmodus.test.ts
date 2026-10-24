// Testmodus (KUECHENHELFER_MOCK=1): das Schein-Modell versteht Alltags-Sätze
// und ruft dieselben Werkzeuge auf wie Claude – erste Runde (neue Frage).
import { describe, expect, it } from "vitest";
import { createMockModel } from "@/lib/begleitung/mock";
import { ask, context } from "./testmodusHilfen";

const S = context();
const one = async (latest: string, system = S, history: [("user" | "assistant"), string][] = []) => {
  const r = await ask(system, latest, history);
  return { ...r, names: r.uses.map((u) => u.name), first: r.uses[0] };
};

describe("Gedächtnis im Gespräch", () => {
  it("weiß, was eben gesagt wurde, und merkt sich den Namen", async () => {
    expect((await one("Was hab ich eben gesagt?")).text).toBe("Wir haben gerade erst angefangen.");
    expect((await one("Was hab ich eben gesagt?", S, [["user", "Milch ist alle"], ["assistant", "Okay"]])).text).toBe("Du hast gesagt: „Milch ist alle“");
    expect((await one("Ich heiße Felix")).text).toBe("Schön, dich kennenzulernen, Felix!");
    expect((await one("Wie heiße ich?")).text).toBe("Das hast du mir noch nicht verraten.");
    expect((await one("Wie heiße ich?", S, [["user", "Ich heiße Lisa"], ["assistant", "Hallo!"]])).text).toBe("Du heißt Lisa.");
  });

  it("streamt den Text Wort für Wort", async () => {
    const model = createMockModel();
    const words: string[] = [];
    const m = await model({ model: "mock", max_tokens: 10, system: [{ type: "text", text: S }], messages: [{ role: "user", content: "Wie heiße ich?" }] } as never, (w) => words.push(w));
    expect(words.join("")).toBe("Das hast du mir noch nicht verraten.");
    expect(words.length).toBeGreaterThan(3);
    expect(m.stop_reason).toBe("end_turn");
  });
});

describe("Mails", () => {
  it("neue Mail an die Kita wird ein Entwurf im Sie", async () => {
    const r = await one("Schreib der Kita, dass Jonne krank ist");
    expect(r.stop).toBe("tool_use");
    expect(r.first).toMatchObject({ name: "mail_entwurf", input: { empfaenger: "Kita", betreff: "Krankmeldung", anrede: "sie" } });
    expect(String(r.first.input.text)).toContain("Viele Grüße\nFelix");
  });

  it("eingefügte Mail: ohne Anweisung Knöpfe + Termin, mit Anweisung Entwurf", async () => {
    const mail = "Von: Kita <info@kita.de>\nBetreff: Elternabend\n\nLiebe Eltern,\n\nder Elternabend findet am Donnerstag um 19:30 statt.\n\nLiebe Grüße\nAnna";
    const knobs = await one(mail);
    expect(knobs.names).toEqual(["antwort_knoepfe", "termin_anlegen"]);
    expect(knobs.first.input).toEqual({ optionen: ["Zusagen", "Absagen", "Nachfragen"] });
    expect(knobs.uses[1].input).toMatchObject({ titel: "Elternabend", datum: "2026-10-22", start: "19:30" });
    const reply = await one(`Antworte, dass wir kommen:\n\n${mail}`);
    expect(reply.first).toMatchObject({ name: "mail_entwurf", input: { an: "info@kita.de", betreff: "Re: Elternabend", kurzfassung: "Der Elternabend findet am Donnerstag um 19:30 statt." } });
    expect(String(reply.first.input.text)).toContain("Wir kommen.");
  });

  it("Knopf „Zusagen“ und „Kürzer“ beziehen sich auf den Verlauf", async () => {
    const mail = "Hallo Felix,\n\nhast du am Sonntag Zeit zum Kaffee? Wir würden uns sehr freuen, euch zu sehen.\n\nLiebe Grüße, Oma";
    const yes = await one("Zusagen", S, [["user", mail], ["assistant", "Wie willst du antworten?"]]);
    expect(yes.first.name).toBe("mail_entwurf");
    expect(String(yes.first.input.text)).toContain("Das passt mir gut, ich bin dabei.");
    const draft = "[Mail-Entwurf an Oma, Du]\nBetreff: Re: Kaffee\nHallo Oma,\n\nDanke dir. Eins. Zwei. Drei.\n\nViele Grüße\nFelix";
    const shorter = await one("Kürzer", S, [["user", mail], ["assistant", `Hier mein Vorschlag.\n${draft}`]]);
    expect(shorter.first.input).toMatchObject({ empfaenger: "Oma", text: "Hallo Oma,\n\nEins. Zwei.\n\nViele Grüße\nFelix" });
    // ohne Entwurf/Mail im Verlauf: kein Mail-Werkzeug
    expect((await one("Zusagen")).names).toEqual([]);
  });
});

describe("Timer, Kochen, Sport, Jetzt-Karte, Begleitung", () => {
  it.each([
    ["Timer 10 Minuten für die Nudeln", "timer_stellen", { minuten: 10, name: "Nudeln" }],
    ["Stopp den Nudel-Timer", "timer_stoppen", { name: "nudel" }],
    ["Stoppuhr starten", "stoppuhr", { aktion: "start" }],
    ["Stoppuhr stoppen", "stoppuhr", { aktion: "stopp" }],
    ["Wie lange noch?", "timer_status", {}],
    ["Ich fang an zu kochen", "kochen_starten", {}],
    ["Nächster Schritt", "kochschritt", { aktion: "weiter" }],
    ["Was kommt jetzt?", "kochschritt", { aktion: "zeigen" }],
    ["War heute 5 km laufen", "sport_eintragen", { sportart: "laufen", km: 5, datum: "2026-10-22" }],
    ["Ich will 4× pro Woche Sport machen", "sport_ziel_setzen", { ziel: 4 }],
    ["Wie oft war ich diese Woche beim Sport?", "sport_statistik", { zeitraum: "woche" }],
    ["Plan mir 3 Trainings nächste Woche, am liebsten morgens", "trainings_planen", { anzahl: 3, tageszeit: "morgens", woche: "naechste" }],
    ["Blende die Jetzt-Karte aus", "jetzt_karte", { an: false }],
  ])("%s → %s", async (sentence, name, input) => {
    const r = await one(sentence);
    expect(r.uses).toHaveLength(1);
    expect(r.first).toMatchObject({ name, input });
  });
});

describe("Mia bleibt Mia", () => {
  it("„Ich nenn dich ab jetzt Frieda“ → freundlich nein, kein Werkzeug", async () => {
    const r = await one("Ich nenn dich ab jetzt Frieda");
    expect(r.uses).toHaveLength(0);
    expect(r.text).toBe("Ich bleib lieber Mia 😊 (Testmodus)");
  });
});

describe("Pinnwand und Wetter", () => {
  it("schreibt und liest die Pinnwand", async () => {
    expect((await one("Schreib an die Pinnwand: Bin um 20 Uhr da")).first).toMatchObject({ name: "pinnwand_schreiben", input: { text: "Bin um 20 Uhr da" } });
    expect((await one("Was steht auf der Pinnwand?")).text).toBe("Auf der Pinnwand steht gerade nichts. (Testmodus)");
    const full = context([], { pinnwand: 'Lisa: "Bin später da"' });
    expect((await one("Was steht auf der Pinnwand?", full)).text).toBe('Auf der Pinnwand: Lisa: "Bin später da" (Testmodus)');
  });

  it.each([
    ["Wie wird das Wetter morgen?", "2026-10-23"],
    ["Wie wird das Wetter übermorgen?", "2026-10-24"],
    ["Wie wird das Wetter am Samstag?", "2026-10-24"],
    ["Wie wird das Wetter am Donnerstag?", "2026-10-29"],
    ["Brauch ich heute einen Schirm?", "2026-10-22"],
  ])("%s → Tag %s", async (sentence, tag) => {
    expect((await one(sentence)).first).toEqual(expect.objectContaining({ name: "wetter_abfragen", input: { tag } }));
  });
});

describe("Schnellnotiz und Notizen", () => {
  it("schreibt in die Schnellnotiz und räumt auf", async () => {
    expect((await one("Schreib in die Schnellnotiz: Kita-Fest vorbereiten")).first).toMatchObject({ name: "schnellnotiz_schreiben", input: { text: "Kita-Fest vorbereiten" } });
    expect((await one("Räum meine Schnellnotiz auf")).text).toMatch(/finde ich gerade nichts/);
    const full = context([], { schnellnotiz: "Morgen 15 Uhr Zahnarzt\nWLAN-Passwort: abc123\nSteuer bis Freitag" });
    const tidy = await one("Räum meine Schnellnotiz auf", full);
    expect(tidy.names[tidy.names.length - 1]).toBe("schnellnotiz_aufraeumen");
    expect(tidy.names).toContain("termin_anlegen");
    const zeilen = tidy.uses[tidy.uses.length - 1].input.zeilen as string[];
    expect(zeilen).toContain("Morgen 15 Uhr Zahnarzt");
  });

  it("wandelt Termin ↔ Aufgabe um", async () => {
    expect((await one("Das ist kein Termin, sondern eine Aufgabe")).first).toMatchObject({ name: "termin_in_aufgabe_umwandeln", input: { id: "t1" } });
    expect((await one("Das ist keine Aufgabe, sondern ein Termin um 15 Uhr")).first).toMatchObject({ name: "aufgabe_in_termin_umwandeln", input: { id: "a1", start: "15:00" } });
    const leer = context().split("\n").filter((l) => !l.startsWith("- Do") && !l.startsWith("- Fr")).join("\n");
    expect((await one("Das ist kein Termin, sondern eine Aufgabe", leer)).text).toBe("Welchen Eintrag meinst du genau? (Testmodus)");
  });

  it.each([
    ["Merk dir das WLAN-Passwort: abc123", "notiz_anlegen", { titel: "WLAN-Passwort", text: "abc123" }],
    ["Was steht auf der Packliste?", "notizen_anzeigen", { suche: "Packliste" }],
    ["Häng das WLAN oben an", "notiz_anheften", { id: "WLAN", angeheftet: true }],
    ["Was muss ich heute noch erledigen?", "aufgaben_anzeigen", { gruppe: "heute" }],
    ["Zeig mir meine Aufgaben", "app_befehl", { text: "Zeig mir meine Aufgaben" }],
    ["Zeig mir meine Notizen", "app_befehl", { text: "Zeig mir meine Notizen" }],
  ])("%s → %s", async (sentence, name, input) => {
    expect((await one(sentence)).first).toMatchObject({ name, input });
  });
});

describe("Alltag: Portionen, Pause, Bausteine, Startseite, App-Bedienung", () => {
  it.each([
    ["Heute sind wir nur zu zweit", "portionen_anpassen", { personen: 2 }],
    ["Rechne das Rezept auf 3 Personen um", "portionen_anpassen", { personen: 3 }],
    ["Wir sind wieder da", "pause_beenden", {}],
    ["Wir sind ab Freitag eine Woche im Urlaub", "pause_setzen", { von: "2026-10-23", bis: "2026-10-29" }],
    ["Zeig mir den Vorrat", "baustein_an", { baustein: "vorrat" }],
    ["Ich brauche die Tipps nicht", "baustein_aus", { baustein: "tipps" }],
    ["Mach das rückgängig", "rueckgaengig", {}],
    ["Mach die Einkaufsliste wieder klein", "startseite_anpassen", { kachel: "einkauf", aktion: "klein" }],
    ["Lösch den Wochenplan wieder", "wochenplan_loeschen", {}],
    ["Leer die Einkaufsliste", "einkaufsliste_leeren", {}],
    ["Nimm Milch von der Liste", "einkaufsliste_entfernen", { artikel: ["milch"] }],
    ["Zeig mir den Wochenplan", "app_befehl", { text: "Zeig mir den Wochenplan" }],
    ["Unterschreib meine Mails mit Liebe Grüße", "app_befehl", {}],
    ["Mach die Ansicht dunkel", "app_befehl", {}],
  ])("%s → %s", async (sentence, name, input) => {
    expect((await one(sentence)).first).toMatchObject({ name, input });
  });

  it("Urlaub ohne Zeit: nachfragen; Baustein schon an: nichts schalten", async () => {
    expect((await one("Wir fahren bald in den Urlaub")).text).toBe("Schön! Von wann bis wann seid ihr weg? (Testmodus)");
    const all = context([], { on: ["wochenplan", "vorrat", "rezepte", "backen", "spontan", "tipps", "wochenendIdeen", "kochstil", "kalender", "mails"] });
    expect((await one("Was kannst du noch?", all)).text).toBe("Gerade ist alles an, was ich kann. (Testmodus)");
    expect((await one("Was kannst du noch?")).text).toMatch(/^Außerdem kann ich: Rezepte – /);
    expect((await one("Was kannst du noch?")).text).not.toMatch(/Im Haus|Sport|Notizen|Spendentopf|Wochenplan/);
    expect((await one("Zeig mir den Vorrat", all)).names).not.toContain("baustein_an");
  });
});

describe("Termine und Aufgaben", () => {
  it.each([
    ["Morgen um 15 Uhr Zahnarzt", "termin_anlegen", { titel: "Zahnarzt", datum: "2026-10-23", start: "15:00", raum: "familie" }],
    ["Was steht morgen an?", "tag_anzeigen", { datum: "2026-10-23", label: "morgen" }],
    ["Was steht diese Woche an?", "woche_anzeigen", { ab: "2026-10-22", tage: 7 }],
    ["Hab ich morgen um 15 Uhr Zeit?", "tag_anzeigen", { datum: "2026-10-23" }],
    ["Verschieb den Zahnarzt auf Freitag", "termin_aendern", { id: "t1", datum: "2026-10-23" }],
    ["Verschieb das Kita-Fest auf Samstag", "termin_aendern", { id: "t2", datum: "2026-10-24", nur_am: "2026-10-23" }],
    ["Lösch den Zahnarzt", "termin_loeschen", { id: "t1" }],
    ["Steuer machen ist erledigt", "aufgabe_erledigen", { id: "a1", am: "2026-10-22" }],
    ["Verschieb Steuer machen auf morgen", "aufgabe_verschieben", { id: "a1", auf: "2026-10-23" }],
    ["Lösch Steuer machen", "aufgabe_aendern", { id: "a1", loeschen: true }],
  ])("%s → %s", async (sentence, name, input) => {
    expect((await one(sentence)).first).toMatchObject({ name, input });
  });

  it("unbekannter Eintrag: freundlich nachfragen", async () => {
    expect((await one("Lösch den Friseur")).text).toBe("Den Eintrag find ich grad nicht. Wie heißt er genau? (Testmodus)");
  });
});

describe("Essen ohne Wochenplan", () => {
  it("Ideen aus dem Vorrat – mit Vorrat bzw. aus Grundzutaten", async () => {
    const r = await one("Was kann ich heute kochen?");
    expect(r.text).toMatch(/^Mit dem, was da ist: .*nutzt: Hack, Paprika/);
    expect(r.text).not.toMatch(/fehlt|noch:/);
    const empty = await one("Was kann ich heute kochen?", context([], { vorrat: "" }));
    expect(empty.text).toMatch(/^Aus Grundzutaten geht z\. B\. /);
    expect((await one("Was mach ich mit Hack und Paprika?", context([], { vorrat: "" }))).text).toMatch(/^Mit dem, was da ist: /);
  });

  it("Reste-Ideen aus dem Spontan-Modus ohne Nie-wieder", async () => {
    const q = "Spontan kochen mit dem, was da ist: Hack, Paprika. Bitte drei Ideen.";
    expect((await one(q)).text).toBe("Aus Hack, Paprika fallen mir drei Sachen ein (Testmodus): Spaghetti Bolognese, Resteomelett (10 Min.) oder Gemüsepfanne (15 Min.). Welche soll’s werden?");
    const banned = context(["NIE WIEDER (diese und sehr ähnliche Gerichte nie vorschlagen):", "- Spaghetti Bolognese; zu fad"]);
    expect((await one(q, banned)).text).toMatch(/: Kartoffelsuppe, Resteomelett/);
  });

  it.each([
    ["Ich hab noch 2 Portionen Chili eingefroren", "vorrat_hinzufuegen", { sachen: [{ name: "Chili", ort: "tiefkuehler" }] }],
    ["Ich habe Joghurt im Kühlschrank", "vorrat_hinzufuegen", { sachen: [{ name: "Joghurt", ort: "kuehlschrank" }] }],
    ["Ich hab 500 g Nudeln im Schrank", "vorrat_hinzufuegen", { sachen: [{ name: "Nudeln", ort: "schrank" }] }],
    ["Hab Hähnchen und Brot gekauft", "vorrat_hinzufuegen", { sachen: [{ name: "Hähnchen" }, { name: "Brot" }] }],
    ["Die Milch ist alle", "vorrat_aufgebraucht", { namen: ["Milch"] }],
    ["Mattis wünscht sich Pfannkuchen", "wunsch_merken", { person: "Mattis", gericht: "Pfannkuchen" }],
    ["Wir brauchen Milch und Brot", "einkaufsliste_hinzufuegen", { woche: "aktuell", artikel: [{ name: "Milch" }, { name: "Brot" }] }],
  ])("%s → %s", async (sentence, name, input) => {
    expect((await one(sentence)).first).toMatchObject({ name, input });
  });

  it("Einkauf landet in der Planungswoche aus dem Kontext", async () => {
    const next = S.replace("wenn nichts gesagt wird: aktuell", "wenn nichts gesagt wird: naechste");
    expect((await one("Wir brauchen Eier", next)).first.input).toMatchObject({ woche: "naechste" });
  });

  it("Entdecker, neues Rezept und die Basis-Frage", async () => {
    expect((await one("Ich bin Entdecker")).text).toBe("Wie wär’s mit einer Shakshuka? (Testmodus)");
    const likes = context(["Das mögt ihr (Lieblingszutaten, bevorzugt einbauen): Feta, Paprika, Käse"]);
    expect((await one("Lass uns was neues ausprobieren", likes)).text).toBe("Neu, aber nicht fremd: Wie wär’s mit einer Shakshuka mit Feta und Paprika? (Testmodus)");
    expect((await one("Denk dir ein neues Rezept aus")).text).toMatch(/Was soll die Basis sein/);
    const basis = await one("Kartoffeln", S, [["user", "Denk dir ein neues Rezept aus"], ["assistant", "Was soll die Basis sein – Kartoffeln, Reis?"]]);
    expect(basis.text).toMatch(/^Mit Kartoffeln – wie wär’s/);
  });
});

describe("Wochenplanung – erste Runde", () => {
  it("die Beispiel-Sätze des Testmodus landen nicht als Aufgabe (Fehler bis jetzt)", async () => {
    const example = await one("Donnerstag und Freitag gibt es meine Rezepte, Mattis wünscht sich Sonntag Milchreis, der Rest vegetarische KI-Rezepte.");
    expect(example.names).toEqual([]);
    expect(example.text).toBe("Gern! Welche deiner Rezepte soll es am Donnerstag und am Freitag geben? Zur Auswahl hast du zum Beispiel: Spaghetti Bolognese, Kartoffelsuppe, Linsencurry.");
    expect((await one("Mattis wünscht sich Sonntag Milchreis")).names).toEqual(["woche_lesen", "kochbuch_durchsuchen"]);
    expect((await one("Plan mir die nächste Woche")).first).toMatchObject({ name: "woche_lesen", input: { woche: "naechste" } });
  });

  it("ohne Kochbuch: Gerichte nennen lassen", async () => {
    const empty = context([], { kochbuch: "0 Rezepte" });
    expect((await one("Freitag gibt es meine Rezepte", empty)).text).toMatch(/Im Kochbuch ist noch nichts/);
  });

  it("Gericht für einen Tag liest beide Wochen und das Kochbuch", async () => {
    expect((await one("Morgen gibt's Lasagne")).names).toEqual(["woche_lesen", "woche_lesen", "kochbuch_durchsuchen"]);
    expect((await one("Nur noch schnelle Gerichte")).names).toEqual(["woche_lesen", "kochbuch_durchsuchen"]);
    expect((await one("Setz Eier auf die Einkaufsliste")).names).toEqual(["woche_lesen", "kochbuch_durchsuchen"]);
  });

  it("nichts Erkennbares: kurze Vorstellung mit Beispiel", async () => {
    expect((await one("Hallo")).text).toMatch(/^Sag einfach, was ansteht \(Testmodus\)\. Zum Beispiel:/);
    const noName = S.replace(/^Du heißt .*$/m, "Ohne Namen");
    expect((await one("Hallo", noName)).text).toMatch(/^Sag einfach, was ansteht \(Testmodus\)/);
  });
});
