// „Was los?“ (A-055): Ort-, Kategorie- und Zeit-Erkennung als reine
// Funktionen auf Text – unabhängig vom HTML der Quelle.
import { describe, expect, it } from "vitest";
import { erkenneOrt, inOstholstein, orteImUmkreis, wohnortName } from "@/lib/region/orte";
import { erkenneKategorien, filterChips } from "@/lib/region/kategorien";
import { findeDaten, parseTermin, parseZeit, parseZeitraum } from "@/lib/region/zeit";

describe("Ort erkennen", () => {
  it.each([
    ["Treffpunkt Tourist-Info, Markt 19, Eutin", "Eutin"],
    ["Lenter Platz, Malente", "Bad Malente-Gremsmühlen"],
    ["Kurpark Bad Malente", "Bad Malente-Gremsmühlen"],
    ["Strandallee, Haffkrug", "Scharbeutz"],
    ["Rathaus Neustadt i. H.", "Neustadt in Holstein"],
    ["Kirche Schönwalde am Bungsberg", "Schönwalde am Bungsberg"],
    ["Burg auf Fehmarn, Marktplatz", "Fehmarn"],
    ["Schlossplatz Eutin", "Eutin"],
  ])("%s → %s", (text, ort) => {
    expect(erkenneOrt(text)).toBe(ort);
  });

  it("nichts Bekanntes, Wortteile zählen nicht", () => {
    expect(erkenneOrt("Rathaus Hamburg")).toBeNull();
    expect(erkenneOrt("Eutiner Straße 3")).toBeNull();
    expect(erkenneOrt("")).toBeNull();
    expect(erkenneOrt(null)).toBeNull();
  });

  it("zuletzt genannter Ort gewinnt (Adressen enden mit dem Ort)", () => {
    expect(erkenneOrt("Ausflug von Eutin nach Malente")).toBe("Bad Malente-Gremsmühlen");
  });

  it("Wohnort in Ostholstein: Name, Ortsteil oder PLZ", () => {
    expect(inOstholstein("Eutin")).toBe(true);
    expect(inOstholstein("Malente")).toBe(true);
    expect(inOstholstein("23701")).toBe(true);
    expect(inOstholstein("Hamburg")).toBe(false);
    expect(inOstholstein("Kiel")).toBe(false);
    expect(inOstholstein("")).toBe(false);
    expect(wohnortName("Malente")).toBe("Bad Malente-Gremsmühlen");
    expect(wohnortName(" Kiel ")).toBe("Kiel");
  });

  it("Umkreis: Eutin nach fester Liste, andere nach Luftlinie", () => {
    expect(orteImUmkreis("Eutin", 15)).toEqual(["Eutin", "Bad Malente-Gremsmühlen", "Süsel", "Scharbeutz", "Ahrensbök", "Schönwalde am Bungsberg", "Kasseedorf", "Stockelsdorf"]);
    expect(orteImUmkreis("Eutin", 5)).toEqual(["Eutin", "Bad Malente-Gremsmühlen"]);
    const weit = orteImUmkreis("Eutin", 30);
    expect(weit).toEqual(expect.arrayContaining(["Stockelsdorf", "Neustadt in Holstein", "Bad Schwartau"]));
    expect(weit).not.toContain("Fehmarn");
    expect(orteImUmkreis("Fehmarn", 15)).toEqual(["Fehmarn", "Großenbrode"]);
    expect(orteImUmkreis("Fehmarn", 30)).toEqual(expect.arrayContaining(["Heiligenhafen", "Oldenburg in Holstein"]));
    expect(orteImUmkreis("Fehmarn", 15)).not.toContain("Eutin");
    expect(orteImUmkreis("Hamburg", 30)).toEqual([]);
  });
});

describe("Kategorie erkennen (nur Titel/Art, nie die Adresse)", () => {
  it.each([
    ["Laternenbasteln für Kinder", ["kinder"]],
    ["Herbstmarkt am Schloss", ["markt"]],
    ["Nachtwächter-Rundgang", ["draussen"]],
    ["Rundgang durch die Beletage", ["kultur"]],
    ["Orgelkonzert im Dom", ["kultur"]],
    ["Kinderkino im Rathaus", ["kinder", "kultur"]],
    ["Flohmarkt auf dem Schulhof", ["markt"]],
    ["Geführte Wanderung am Kellersee", ["draussen"]],
    ["Seniorenkaffee", ["sonstiges"]],
  ])("%s", (titel, erwartet) => {
    expect(erkenneKategorien(titel)).toEqual(erwartet);
  });

  it("Art der Veranstaltung zählt mit", () => {
    expect(erkenneKategorien("Von Puder, Pasteten und Seidentapeten", "Familienführung")).toEqual(["kinder", "kultur"]);
  });

  it("Chips: Familie „Für Kinder“ zuerst, sonst hinten; ausgeschaltete fehlen", () => {
    expect(filterChips("familie").map((c) => c.label)).toEqual(["Alles", "Für Kinder", "Kultur", "Draußen", "Märkte"]);
    expect(filterChips("paar").map((c) => c.label)).toEqual(["Alles", "Kultur", "Draußen", "Märkte", "Für Kinder"]);
    expect(filterChips("allein", ["markt"]).map((c) => c.id)).toEqual(["alles", "kultur", "draussen", "kinder"]);
  });
});

describe("Zeitformate", () => {
  it("Uhrzeiten: von–bis, „bis“, Punkt statt Doppelpunkt, „ab 19 Uhr“", () => {
    expect(parseZeit("10:00 – 12:00 Uhr")).toEqual({ beginn: "10:00", ende: "12:00", ganztags: false });
    expect(parseZeit("10:00 bis 12:00")).toEqual({ beginn: "10:00", ende: "12:00", ganztags: false });
    expect(parseZeit("10.00-12.30 Uhr")).toEqual({ beginn: "10:00", ende: "12:30", ganztags: false });
    expect(parseZeit("ab 19 Uhr")).toEqual({ beginn: "19:00", ende: null, ganztags: false });
    expect(parseZeit("17:00 Uhr")).toEqual({ beginn: "17:00", ende: null, ganztags: false });
    expect(parseZeit("9 Uhr")).toEqual({ beginn: "09:00", ende: null, ganztags: false });
  });

  it("ganztags, ganztägig, ohne Uhrzeit", () => {
    expect(parseZeit("ganztägig")).toEqual({ beginn: null, ende: null, ganztags: true });
    expect(parseZeit("ganztags")).toEqual({ beginn: null, ende: null, ganztags: true });
    expect(parseZeit("Treffpunkt Markt 19")).toEqual({ beginn: null, ende: null, ganztags: true });
  });

  it("Daten werden nicht als Uhrzeit gelesen, Unsinn auch nicht", () => {
    expect(parseZeit("Do, 29.10.2026, 14:00 Uhr")).toEqual({ beginn: "14:00", ende: null, ganztags: false });
    expect(parseZeit("29.10.2026 bis 15.11.2026")).toEqual({ beginn: null, ende: null, ganztags: true });
    expect(parseZeit("25:00 Uhr")).toEqual({ beginn: null, ende: null, ganztags: true });
    // Ende vor Beginn: nur Beginn
    expect(parseZeit("18:00 – 10:00 Uhr")).toEqual({ beginn: "18:00", ende: null, ganztags: false });
  });

  it("Daten: Ziffern, Monatsnamen, ohne Jahr, ungültige fallen weg", () => {
    expect(findeDaten("Do, 29.10.2026", 2026)).toEqual(["2026-10-29"]);
    expect(findeDaten("29. Oktober 2026", 2026)).toEqual(["2026-10-29"]);
    expect(findeDaten("1. November", 2026)).toEqual(["2026-11-01"]);
    expect(findeDaten("Sa 31.10.", 2026)).toEqual(["2026-10-31"]);
    expect(findeDaten("31.11.2026", 2026)).toEqual([]);
    expect(findeDaten("02.01.27", 2026)).toEqual(["2027-01-02"]);
  });

  it("Zeitraum mit „bis“ bzw. Strich", () => {
    expect(parseZeitraum("29.10.2026 bis 15.11.2026", 2026)).toEqual({ datum: "2026-10-29", bis_datum: "2026-11-15" });
    expect(parseZeitraum("Do, 29.10.2026 – So, 1.11.2026", 2026)).toEqual({ datum: "2026-10-29", bis_datum: "2026-11-01" });
    expect(parseZeitraum("Do, 29.10.2026", 2026)).toEqual({ datum: "2026-10-29", bis_datum: null });
    expect(parseZeitraum("bald", 2026)).toBeNull();
  });

  it("Datum + Uhrzeit zusammen", () => {
    expect(parseTermin("Sa, 31.10.2026", "17:00 Uhr", 2026)).toEqual({ datum: "2026-10-31", bis_datum: null, beginn: "17:00", ende: null, ganztags: false });
    expect(parseTermin("Sa, 31.10.2026, 10:00 – 17:00 Uhr", null, 2026)).toEqual({ datum: "2026-10-31", bis_datum: null, beginn: "10:00", ende: "17:00", ganztags: false });
    expect(parseTermin("29.10.2026 bis 15.11.2026", "ganztägig", 2026)).toEqual({ datum: "2026-10-29", bis_datum: "2026-11-15", beginn: null, ende: null, ganztags: true });
    expect(parseTermin("ohne Datum", "10 Uhr", 2026)).toBeNull();
  });
});
