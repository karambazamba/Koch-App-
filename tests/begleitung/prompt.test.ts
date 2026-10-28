import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { contextText, identityPrompt, SYSTEM_PROMPT } from "@/lib/begleitung/prompt";
import { applyOps } from "@/lib/begleitung/ops";
import { createNote } from "@/lib/notizen/model";
import { aufgabe, daten, haushalt, HEUTE, rezept, termin, WOCHEN } from "./werkzeugKontext";

beforeEach(() => at("2026-10-21T09:00"));

describe("Wer die Begleitung ist", () => {
  it("Name, Art und Haushalt", () => {
    const p = haushalt();
    expect(identityPrompt(p)).toMatch(/^Du heißt Mia und bist die persönliche Assistentin der Familie Müller in der App/);
    // Mia heißt fest Mia – auch ein altes „Theo“ im Profil ändert daran nichts
    expect(identityPrompt({ ...p, householdName: "Familie Schulz", helper: { name: "Theo", art: "assistent", voice: "maennlich", farbe: "nachtblau" } })).toMatch(/^Du heißt Mia und bist die persönliche Assistentin der Familie Schulz /);
    expect(identityPrompt(p)).toContain('in der App "Mia"');
    expect(identityPrompt(p)).toContain("Ich bleib lieber Mia 😊");
    expect(identityPrompt({ ...p, householdName: "" })).toContain("Assistentin der Familie in der App");
    expect(identityPrompt({ ...p, householdType: "single" })).toContain("Assistentin von Felix");
    expect(identityPrompt({ ...p, householdType: "single", persons: [{ ...p.persons[0], name: "" }] })).toContain("für einen Ein-Personen-Haushalt");
    expect(identityPrompt({ ...p, householdType: "wg", householdName: "" })).toContain("Assistentin der WG");
    expect(identityPrompt({ ...p, householdType: "paar", householdName: "" })).toContain("Assistentin des Paars");
    expect(identityPrompt({ ...p, householdType: "paar", householdName: "Felix & Lisa" })).toContain("Assistentin von Felix & Lisa");
  });

  it("Systemanweisung ohne Druck-Wörter als Anweisung", () => {
    expect(SYSTEM_PROMPT).toContain('Nie "du musst"');
    expect(SYSTEM_PROMPT).toContain("Übernehmen");
  });
});

describe("Kontext je Anfrage", () => {
  it("leerer Haushalt: freundliche Platzhalter", () => {
    const text = contextText(daten(), HEUTE, WOCHEN);
    expect(text).toContain("Heute: Mittwoch, 21. Oktober 2026 (2026-10-21) (Zeitzone Europe/Berlin)");
    expect(text).toContain("Datumsliste: Mi 2026-10-21, Do 2026-10-22");
    expect(text).toContain("Notizen: noch keine.");
    expect(text).not.toContain("Schnellnotiz");
    expect(text).toContain("Pinnwand: leer");
    expect(text).toContain("Wetter-Ort: Eutin");
    expect(text).toContain('Mail-Stil: Gruß "Viele Grüße", Name "Felix"');
    expect(text).toContain("Essen heute: nichts eingetragen; morgen: nichts eingetragen");
    expect(text).toContain("Einkaufsliste: gerade leer");
    expect(text).toMatch(/Im Haus: nichts notiert/);
    expect(text).toContain("Kochbuch: 0 Rezepte");
    expect(text).toContain("Bausteine an: keine.");
    expect(text).toContain("- Mathis; Kind, 8 J.; ALLERGIE: Nüsse");
    expect(text).toContain("- Lisa; erwachsen; mag nicht: Pilze");
    expect(text).toContain("Gesundheits-Tipps: ab und zu (höchstens 1 pro Woche) – diese Woche schon 0 gezeigt");
    expect(text).toContain("Modus: normal");
    expect(text).toContain("Kochstil: Mal so, mal so");
    expect(text).toContain("Küchenmaschine: keine");
  });

  it("voller Haushalt: Termine, Notizen, Vorrat, Plan, Vorlieben, Startseite", () => {
    const base = daten({
      entries: [termin({ title: "Elternabend", date: HEUTE, start: "19:30" }), aufgabe({ title: "Reifen", week: WOCHEN.aktuell })],
      notes: [createNote({ title: "Packliste", items: ["Zelt"], pinned: true }), createNote({ title: "WLAN", text: "x" })],
      pinnwand: [{ author: "Lisa", text: "Bin um 8 da", at: "" }],
      wetterOrt: "Malente",
      features: ["vorrat"],
      home: [{ id: "wetter", visible: true, size: "S" }, { id: "post", visible: false, size: "S" }],
      mail: { greeting: "Liebe Grüße", signature: "Felix Müller\nEutin", tones: { Kita: "sie", Bernd: "du" } },
      timers: [{ name: "Nudeln", leftSec: 120, paused: false, done: false }],
      pantry: [
        { id: "p1", name: "Zucchini", addedAt: "2026-10-16", place: "kuehlschrank" },
        { id: "p2", name: "Hack", addedAt: HEUTE, place: "kuehlschrank" },
        { id: "gekauft", name: "Milch", addedAt: HEUTE, place: "schrank" },
      ],
      recipes: { r: rezept("r", "Linsencurry", ["Linsen"], { thumbsUp: 2 }) },
      profile: {
        ...haushalt(),
        helperMode: "dranbleiben",
        planStyle: "spontan",
        planWeek: WOCHEN.aktuell,
        kitchenMachine: "thermomix",
        cookingStyle: "rezept",
        healthTips: "aus",
        householdType: "paar",
        favoriteDishes: ["Lasagne"],
        bases: { kartoffeln: 0, reis: 2, nudeln: 5, quinoa: 0, brot: 0, salat: 0 },
        likes: [{ name: "Käse", weight: 3 }, { name: "Paprika", weight: 5 }] as never,
        neverAgain: [{ id: "n", title: "Leber", ingredients: ["Leber"], reason: "zu bitter", addedAt: "2026-01-01" }, { id: "m", title: "Rosenkohl", ingredients: [], reason: "", addedAt: "2026-01-01" }],
        pause: { from: "2026-12-20", until: null },
        weekRules: { ...haushalt().weekRules, cheatDay: true, cheatDayWeekday: "" },
      },
    });
    const data = applyOps(base, [
      { id: "1", type: "set_meal", slot: { weekStart: WOCHEN.aktuell, weekday: "Mittwoch" }, dish: { kind: "text", title: "Ofengemüse", category: "vegetarisch" } },
      { id: "2", type: "update_week", weekStart: WOCHEN.aktuell, changes: { awayDays: ["Donnerstag"] } },
    ]).data;
    const text = contextText(data, HEUTE, WOCHEN, 2, { clock: "08:15", shopping: ["Milch", "Eier"] });
    expect(text).toContain(", jetzt 08:15 Uhr");
    expect(text).toContain("Elternabend");
    expect(text).toMatch(/Mi 2026-10-21: .*Reifen \[id=/);
    expect(text).toMatch(/Packliste \[id=.*Liste, 1 Einträge, angeheftet, familie\]/);
    expect(text).toContain('Pinnwand: Lisa: "Bin um 8 da"');
    expect(text).toContain("Wetter-Ort: Malente");
    expect(text).toMatch(/Timer: Nudeln 2:00 übrig/);
    expect(text).toMatch(/Bausteine an: Im Haus\. Aus: Wochenplan \(wochenplan:.*Rezepte \(rezepte:/);
    expect(text).toContain('Mail-Stil: Gruß "Liebe Grüße", Name "Felix", Signatur (nur förmlich): "Felix Müller / Eutin"; gemerkte Anrede: Kita = Sie, Bernd = Du');
    expect(text).toContain("Startseite (Reihenfolge): wetter S, post ausgeblendet");
    expect(text).toContain("Essen heute: Ofengemüse (18:30 Uhr); morgen: kein Kochtag");
    expect(text).toContain("Typ: Zu zweit (kleine Mengen, Reste bewusst einplanen)");
    expect(text).toContain("Standardwoche: 2× Fleisch, 3× vegetarisch, 1× Fisch, Cheat Day (Tag frei)");
    expect(text).toContain("Modus: dranbleiben");
    expect(text).toContain("Kochstil: spontan, diese Woche aber mit Plan");
    expect(text).toContain("Kochstil: kocht gern nach Rezept");
    expect(text).toContain("Küchenmaschine: Thermomix");
    expect(text).toContain("Pause: 2026-12-20 (ohne Enddatum) – an diesen Tagen nichts planen");
    expect(text).toContain("Lieblingsgerichte: Lasagne");
    expect(text).toContain("Lieblings-Basen: Nudeln (5×), Reis (2×)");
    expect(text).toContain("Das mögt ihr (Lieblingszutaten, bevorzugt einbauen): Paprika, Käse");
    expect(text).toContain("- Leber; Zutaten: Leber; Grund: zu bitter");
    expect(text).toContain("- Rosenkohl; ohne Grund");
    expect(text).toContain("Gesundheits-Tipps: aus\n");
    expect(text).toContain("Einkaufsliste (steht schon drauf): Milch, Eier");
    expect(text).toContain("Zucchini (Kühlschrank, seit 5 Tagen – bald verbrauchen)");
    expect(text).toContain("Hack (Kühlschrank)");
    expect(text).toContain("Milch (gekauft)");
    expect(text).toContain("Kochbuch: 1 Rezepte – Linsencurry (👍2)");
  });

  it("Modus locker, ich plane gern, Pause mit Ende, Pausentag", () => {
    const data = daten({ profile: { ...haushalt(), helperMode: "locker", planStyle: "plan", pause: { from: "2026-10-21", until: "2026-10-22" }, healthTips: "oefter" as never } });
    const text = contextText(data, HEUTE, WOCHEN);
    expect(text).toContain("Modus: ganz locker");
    expect(text).toContain("Kochstil: Ich plane gern");
    expect(text).toContain("Pause: 2026-10-21 bis 2026-10-22");
    expect(text).toContain("Essen heute: Pause");
    expect(text).toContain("gern öfter (höchstens 3 pro Woche)");
    const spontan = contextText(daten({ profile: { ...haushalt(), planStyle: "spontan" } }), HEUTE, WOCHEN);
    expect(spontan).toContain("Ich koche spontan – keine Planung");
  });
});
