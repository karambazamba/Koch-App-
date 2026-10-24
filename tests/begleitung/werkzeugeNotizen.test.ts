import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { createNote } from "@/lib/notizen/model";
import type { Forecast } from "@/lib/wetter/forecast";
import { aufgabe, HEUTE, kontext, letzte, rufe } from "./werkzeugKontext";

beforeEach(() => at("2026-10-21T09:00"));

describe("Schnellnotiz", () => {
  it("anhängen, ersetzen und aufräumen", () => {
    const ctx = kontext({ features: ["notizen"], schnellnotiz: "Handwerker Müller 0176\nMilch kaufen" });
    expect(rufe(ctx, "schnellnotiz_schreiben", { text: "" }).isError).toBe(true);
    expect(rufe(ctx, "schnellnotiz_schreiben", { text: "Oma anrufen" }).content).toMatch(/Schnellnotiz/);
    expect(ctx.data.schnellnotiz).toBe("Handwerker Müller 0176\nMilch kaufen\nOma anrufen");
    expect(letzte(ctx)).toMatchObject({ type: "set_schnellnotiz", change: "+ Oma anrufen" });
    expect(rufe(ctx, "schnellnotiz_aufraeumen", { zeilen: ["gibt es nicht"] }).isError).toBe(true);
    expect(rufe(ctx, "schnellnotiz_aufraeumen", { zeilen: ["Milch kaufen", "Oma anrufen"] }).content).toBe("Vorgemerkt: 2 Zeilen aus der Schnellnotiz nehmen.");
    expect(ctx.data.schnellnotiz).toBe("Handwerker Müller 0176");
    expect(letzte(ctx)).toMatchObject({ change: "2 Zeilen übernommen – der Rest bleibt" });
    rufe(ctx, "schnellnotiz_aufraeumen", { zeilen: ["Handwerker Müller 0176"] });
    expect(letzte(ctx)).toMatchObject({ text: "", change: "1 Zeile übernommen, Schnellnotiz ist leer" });
    rufe(ctx, "schnellnotiz_schreiben", { text: "Ganz neu und sehr lang, damit er abgeschnitten wird beim Anzeigen", ersetzen: true });
    expect(letzte(ctx)).toMatchObject({ text: "Ganz neu und sehr lang, damit er abgeschnitten wird beim Anzeigen", change: "neu: Ganz neu und sehr lang, damit er abges…" });
  });
});

describe("Notizen", () => {
  it("anlegen als Text oder Liste", () => {
    const ctx = kontext({ features: ["notizen"] });
    expect(rufe(ctx, "notiz_anlegen", { titel: " " }).isError).toBe(true);
    expect(rufe(ctx, "notiz_anlegen", { titel: "WLAN-Passwort", text: "geheim123", angeheftet: true, raum: "arbeit" }).content).toBe("Vorgemerkt: Notiz „WLAN-Passwort“ (Text).");
    expect(letzte(ctx)).toMatchObject({ type: "upsert_note", isNew: true, note: { raum: "arbeit", data: { pinned: true, text: "geheim123" } } });
    expect(rufe(ctx, "notiz_anlegen", { titel: "Packliste", liste: ["Zelt", "Lampe"], emoji: "🎒" }).content).toBe("Vorgemerkt: Notiz „Packliste“ (Liste mit 2).");
    expect(ctx.data.notes).toHaveLength(2);
  });

  it("ändern, anheften, löschen über id oder Titel", () => {
    const wlan = createNote({ title: "WLAN-Passwort", text: "alt" });
    const pack = createNote({ title: "Packliste Urlaub", items: ["Zelt"] });
    const ctx = kontext({ features: ["notizen"], notes: [wlan, pack] });
    expect(rufe(ctx, "notiz_aendern", { id: "zzz" }).isError).toBe(true);
    expect(rufe(ctx, "notiz_aendern", { id: wlan.id, text: "neu", emoji: "🔑", titel: "WLAN", raum: "arbeit" }).content).toBe("Vorgemerkt: „WLAN“ ändern.");
    expect(letzte(ctx)).toMatchObject({ isNew: false, note: { raum: "arbeit", data: { text: "neu", emoji: "🔑", title: "WLAN" } } });
    // Text bei einer Liste wird ignoriert
    rufe(ctx, "notiz_aendern", { id: pack.id, text: "egal" });
    expect(letzte(ctx)).toMatchObject({ note: { data: { kind: "liste" } } });
    expect(rufe(ctx, "notiz_anheften", { id: "Packliste" }).content).toBe("Vorgemerkt: „Packliste Urlaub“ oben anheften.");
    expect(rufe(ctx, "notiz_anheften", { id: pack.id, angeheftet: false }).content).toBe("Vorgemerkt: „Packliste Urlaub“ lösen.");
    expect(rufe(ctx, "notiz_anheften", { id: "nichts" }).isError).toBe(true);
    expect(rufe(ctx, "notiz_loeschen", { id: wlan.id }).content).toBe("Vorgemerkt: „WLAN“ löschen.");
    expect(ctx.data.notes?.map((n) => n.id)).toEqual([pack.id]);
    expect(rufe(ctx, "notiz_loeschen", { id: "nichts" }).isError).toBe(true);
  });

  it("liste_eintrag_hinzufuegen hängt an oder legt die Liste an", () => {
    const pack = createNote({ title: "Packliste", items: ["Zelt"] });
    const ctx = kontext({ features: ["notizen"], notes: [pack] });
    expect(rufe(ctx, "liste_eintrag_hinzufuegen", { liste: "Packliste", eintraege: [] }).isError).toBe(true);
    expect(rufe(ctx, "liste_eintrag_hinzufuegen", { liste: "Packliste", eintraege: ["Sonnencreme"] }).content).toBe("Vorgemerkt: Sonnencreme auf „Packliste“.");
    expect(ctx.data.notes?.[0].data.items?.map((i) => i.text)).toEqual(["Zelt", "Sonnencreme"]);
    expect(rufe(ctx, "liste_eintrag_hinzufuegen", { liste: "Geschenkideen", eintraege: ["Torwarthandschuhe (für Mathis)"] }).content).toBe("Vorgemerkt: neue Liste „Geschenkideen“ mit Torwarthandschuhe (für Mathis).");
    expect(letzte(ctx)).toMatchObject({ isNew: true, change: "neue Liste: Torwarthandschuhe (für Mathis)" });
  });

  it("notizen_anzeigen", () => {
    expect(rufe(kontext(), "notizen_anzeigen").content).toBe("Es gibt noch keine Notizen.");
    const ctx = kontext({ notes: [createNote({ title: "Packliste", items: ["Zelt", "Lampe"], pinned: true }), createNote({ title: "Rezeptidee", text: "Kürbis" })] });
    expect(rufe(ctx, "notizen_anzeigen").content).toBe("Notizen: Packliste (angeheftet) (Liste, 2), Rezeptidee. Zu finden in der Woche ganz unten unter „Notizen“.");
    expect(rufe(ctx, "notizen_anzeigen", { suche: "Packliste" }).content).toBe("Packliste: Zelt und Lampe.");
    expect(rufe(ctx, "notizen_anzeigen", { suche: "Steuer" }).content).toBe("Keine Notiz zu „Steuer“. Vorhanden: Packliste, Rezeptidee.");
  });
});

describe("Aufgaben-Übersicht und Pinnwand", () => {
  it("aufgaben_anzeigen gruppiert ruhig", () => {
    expect(rufe(kontext(), "aufgaben_anzeigen").content).toBe("Gerade liegt keine Aufgabe an.");
    const ctx = kontext({ entries: [aufgabe({ title: "Kita-Formular", date: HEUTE }), aufgabe({ title: "Keller aufräumen" })] });
    const alle = rufe(ctx, "aufgaben_anzeigen").content;
    expect(alle).toMatch(/Kita-Formular/);
    expect(alle).toMatch(/Keller aufräumen/);
    expect(alle).toContain("Die ganze Liste steht unter „Aufgaben“.");
    const heute = rufe(ctx, "aufgaben_anzeigen", { gruppe: "heute" }).content;
    expect(heute).toContain("Kita-Formular");
    expect(heute).not.toContain("Keller");
  });

  it("pinnwand_schreiben kürzt auf 140 Zeichen", () => {
    const ctx = kontext();
    expect(rufe(ctx, "pinnwand_schreiben", { text: "" }).isError).toBe(true);
    rufe(ctx, "pinnwand_schreiben", { text: "x".repeat(200) });
    const op = letzte(ctx);
    expect(op.type === "add_pin" && op.text.length).toBe(140);
  });
});

describe("wetter_abfragen", () => {
  const hour = (h: number, mm = 0, rain = 0) => ({ date: HEUTE, hour: h, temp: 10, code: mm ? 61 : 2, rain, gust: 20, mm, sun: mm ? 0 : 30, cloud: 50 });
  const fc: Forecast = {
    place: "Eutin",
    fetchedAt: "2026-10-21T07:00:00.000Z",
    current: { temp: 9, code: 2 },
    hours: [hour(9), hour(15, 1.2, 80), hour(16, 0.8, 70)],
    days: [
      { date: HEUTE, code: 61, text: "Schauer möglich", max: 12.4, min: 6.6, rain: 80, mm: 2, sun: 3.4, wet: 2 },
      { date: "2026-10-22", code: 0, text: "Sonnig", max: 14, min: 5, rain: 0, mm: 0, sun: 8, wet: 0 },
    ],
  };

  it("ohne Daten freundlich, sonst Tag mit Regenzeiten", () => {
    expect(rufe(kontext(), "wetter_abfragen").content).toMatch(/keine Wetterdaten/);
    const ctx = kontext({}, { forecast: fc });
    const heute = rufe(ctx, "wetter_abfragen").content;
    expect(heute).toContain("Eutin, 2026-10-21: Schauer möglich, 7 bis 12 °C, Regenrisiko 80 %");
    expect(heute).toContain("Regen heute um 15, 16 Uhr.");
    expect(heute).toContain("Kurz:");
    const morgen = rufe(ctx, "wetter_abfragen", { tag: "2026-10-22" }).content;
    expect(morgen).toContain("Sonnig, 5 bis 14 °C");
    expect(rufe(ctx, "wetter_abfragen", { tag: "2026-11-30" }).content).toMatch(/noch keine Vorhersage/);
    const trocken = rufe(kontext({}, { forecast: { ...fc, hours: [hour(9)] } }), "wetter_abfragen").content;
    expect(trocken).toContain("Heute trocken.");
  });
});
