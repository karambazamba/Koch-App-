import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { dietConflicts } from "@/lib/begleitung/diet";
import { findSlot, weekOf } from "@/lib/begleitung/ops";
import { HEUTE, haushalt, kontext, letzte, rezept, rufe, WOCHEN } from "./werkzeugKontext";

beforeEach(() => at("2026-10-21T09:00"));

const gericht = (ctx: ReturnType<typeof kontext>, tag: string, woche = WOCHEN.aktuell) => findSlot(weekOf(ctx.data, woche), tag)?.entry;

describe("Allergien und 'mag nicht' (diet)", () => {
  it("findet versteckte Allergene und Abneigungen, kurze Wörter nur ganz", () => {
    const persons = haushalt().persons;
    const c = dietConflicts("Pesto-Nudeln", ["Basilikum", "Pinienkerne", "Champignons"], persons);
    expect(c).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ person: "Mathis", kind: "Allergie", term: "Nüsse", found: "Pinienkerne" }),
        expect.objectContaining({ person: "Lisa", kind: "mag nicht" }),
      ]),
    );
    const ei = [{ ...persons[0], allergies: ["Ei"] }];
    expect(dietConflicts("Reis mit Gemüse", ["Reis"], ei)).toEqual([]);
    expect(dietConflicts("Rührei", ["Eier"], ei)[0]).toMatchObject({ found: "Eier" });
    // Ohne Namen: "ein Kind"
    expect(dietConflicts("Nusskuchen", [], [{ ...persons[2], name: "" }])[0].person).toBe("ein Kind");
  });
});

describe("Wochenplan-Werkzeuge", () => {
  it("woche_lesen liefert Zeitraum, Tage und Vorgaben", () => {
    const ctx = kontext();
    expect(rufe(ctx, "woche_lesen", { woche: "bald" }).isError).toBe(true);
    const r = JSON.parse(rufe(ctx, "woche_lesen", { woche: "aktuell" }).content);
    expect(r.woche).toBe("aktuell");
    expect(r.tage).toHaveLength(7);
    expect(r.tage[0]).toMatchObject({ tag: "Montag", datum: "19.10." });
    expect(r.vorgaben_aus_wochen_check).toBe(false);
  });

  it("gericht_setzen: freier Text, Rezept, neues Rezept – genau eine Quelle", () => {
    const ctx = kontext({ recipes: { r1: rezept("r1", "Linsencurry", ["Linsen", "Kokosmilch"]) } });
    expect(rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Montag", gericht: "A", rezept_id: "r1" }).content).toMatch(/Genau eine Quelle/);
    expect(rufe(ctx, "gericht_setzen", { woche: "aktuell" }).content).toBe("woche und tag angeben.");
    expect(rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Montag", rezept_id: "nix" }).content).toMatch(/Unbekannte rezept_id/);
    expect(rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Donnerstag", gericht: "Pizza vom Italiener", doppelt_kochen: true }).content).toBe("Vorgemerkt: Donnerstag – Pizza vom Italiener (doppelt – Reste für morgen).");
    expect(gericht(ctx, "Donnerstag")?.title).toBe("Pizza vom Italiener");
    expect(rufe(ctx, "gericht_setzen", { woche: "naechste", tag: "Dienstag", rezept_id: "r1" }).content).toBe("Vorgemerkt: Dienstag – Linsencurry.");
    expect(gericht(ctx, "Dienstag", WOCHEN.naechste)?.recipeId).toBe("r1");
    expect(rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Freitag", neues_rezept: "plan-99" }).content).toMatch(/Unbekannte ref/);
  });

  it("warnt bei einem Rezept mit Allergen und lehnt Nie-wieder-Gerichte ab", () => {
    const profile = { ...haushalt(), neverAgain: [{ id: "n1", title: "Leber", ingredients: [], reason: "", addedAt: "2026-01-01" }] };
    const ctx = kontext({ profile, recipes: { r2: rezept("r2", "Nusskuchen", ["Haselnüsse", "Mehl"]) } });
    expect(rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Montag", rezept_id: "r2" }).content).toMatch(/Achtung, bitte erwähnen: Mathis – Allergie Nüsse/);
    expect(rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Dienstag", gericht: "Leber" }).content).toMatch(/Nie-wieder-Liste/);
    expect(rufe(ctx, "wunsch_merken", { person: "Mathis", gericht: "Leber" }).isError).toBe(true);
  });

  it("rezept_erstellen + gericht_setzen mit neuem Rezept", () => {
    const ctx = kontext();
    expect(rufe(ctx, "rezept_erstellen", { titel: "Suppe" }).isError).toBe(true);
    const r = rufe(ctx, "rezept_erstellen", {
      titel: "Kürbissuppe",
      kategorie: "vegetarisch",
      portionen: 3.6,
      zubereitungszeit_min: 30.2,
      zutaten: [{ menge: 500, einheit: "g", name: "Kürbis" }, { menge: -1, einheit: "", name: "Salz" }, { menge: 1, einheit: "", name: "" }],
      schritte: ["Schneiden", " ", "Kochen"],
      fuer_plan: true,
    });
    expect(r.content).toMatch(/^Rezept vorgemerkt, ref: plan-\d+$/);
    const ref = r.content.split("ref: ")[1];
    const add = letzte(ctx);
    if (add.type !== "add_recipe") throw new Error();
    expect(add.recipe).toMatchObject({ servings: 4, prepMinutes: 30, steps: ["Schneiden", "Kochen"] });
    expect(add.recipe.ingredients).toEqual([{ amount: 500, unit: "g", name: "Kürbis" }, { amount: null, unit: "", name: "Salz" }]);
    expect(rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Freitag", neues_rezept: ref }).content).toBe("Vorgemerkt: Freitag – Kürbissuppe (neues Rezept).");
    expect(gericht(ctx, "Freitag")?.recipeId).toBe(ctx.refs[ref]);
    // Ohne Plan
    const solo = rufe(ctx, "rezept_erstellen", { titel: "Brot", kategorie: "vegetarisch", zutaten: [{ name: "Mehl" }], schritte: ["Backen"], fuer_plan: false });
    expect(solo.content).toMatch(/ref: rezept-/);
  });

  it("rezept_erstellen lehnt Allergene und Nie-wieder ab", () => {
    const profile = { ...haushalt(), neverAgain: [{ id: "n1", title: "Spinatauflauf", ingredients: [], reason: "", addedAt: "2026-01-01" }] };
    const ctx = kontext({ profile });
    const base = { kategorie: "vegetarisch", portionen: 4, zubereitungszeit_min: 20, schritte: ["x"], fuer_plan: true };
    expect(rufe(ctx, "rezept_erstellen", { ...base, titel: "Spinatauflauf", zutaten: [{ name: "Spinat" }] }).content).toMatch(/Nie-wieder/);
    expect(rufe(ctx, "rezept_erstellen", { ...base, titel: "Pilzpfanne", zutaten: [{ name: "Champignons" }] }).content).toMatch(/Abgelehnt – verstößt gegen: Lisa: mag nicht/);
    expect(ctx.ops).toHaveLength(0);
  });

  it("platz_leeren, doppelt_kochen und gericht_verschieben arbeiten mit belegten Tagen", () => {
    const ctx = kontext();
    expect(rufe(ctx, "platz_leeren", { woche: "aktuell", tag: "Montag" }).content).toBe("Montag ist schon frei.");
    expect(rufe(ctx, "doppelt_kochen", { woche: "aktuell", tag: "Montag", an: true }).content).toBe("Montag hat noch kein Gericht.");
    expect(rufe(ctx, "doppelt_kochen", { woche: "aktuell", tag: "Montag" }).isError).toBe(true);
    expect(rufe(ctx, "gericht_verschieben", { woche: "aktuell", von_tag: "Montag", nach_tag: "Dienstag" }).content).toMatch(/frei – nichts zu verschieben/);
    rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Montag", gericht: "Spaghetti" });
    rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Mittwoch", gericht: "Bratkartoffeln" });
    expect(rufe(ctx, "doppelt_kochen", { woche: "aktuell", tag: "Montag", an: true }).content).toBe("Vorgemerkt: Spaghetti am Montag doppelt kochen – Reste für morgen.");
    expect(gericht(ctx, "Montag")?.double).toBe(true);
    expect(rufe(ctx, "doppelt_kochen", { woche: "aktuell", tag: "Montag", an: false }).content).toMatch(/nicht mehr doppelt/);
    expect(rufe(ctx, "gericht_verschieben", { woche: "aktuell", von_tag: "Montag", nach_tag: "Mittwoch" }).content).toBe("Vorgemerkt: Spaghetti und Bratkartoffeln tauschen.");
    expect(gericht(ctx, "Mittwoch")?.title).toBe("Spaghetti");
    expect(rufe(ctx, "gericht_verschieben", { woche: "aktuell", von_tag: "Mittwoch", nach_tag: "Dienstag" }).content).toBe("Vorgemerkt: Spaghetti auf Dienstag verschieben.");
    expect(rufe(ctx, "gericht_verschieben", { woche: "aktuell", von_tag: "Mittwoch" }).isError).toBe(true);
    expect(rufe(ctx, "platz_leeren", { woche: "aktuell", tag: "Dienstag" }).content).toBe("Vorgemerkt: Dienstag leeren (Spaghetti).");
    expect(gericht(ctx, "Dienstag")).toBeFalsy();
    expect(rufe(ctx, "platz_leeren", { woche: "aktuell" }).isError).toBe(true);
  });

  it("vorgaben_aendern: Zahlen, Cheat Day, Ausflug, Wunsch", () => {
    const ctx = kontext();
    expect(rufe(ctx, "vorgaben_aendern", {}).content).toBe("woche angeben.");
    expect(rufe(ctx, "vorgaben_aendern", { woche: "aktuell" }).content).toBe("Keine Änderung angegeben.");
    expect(rufe(ctx, "vorgaben_aendern", { woche: "aktuell", fleisch_tage: 5, veggie_tage: 3 }).content).toMatch(/mehr als 7/);
    expect(rufe(ctx, "vorgaben_aendern", { woche: "aktuell", fleisch_tage: 9 }).content).toBe("Keine Änderung angegeben.");
    const r = rufe(ctx, "vorgaben_aendern", { woche: "aktuell", fleisch_tage: 1, veggie_tage: 4, fisch_tage: 1, cheat_day_tag: "Freitag", ausflugstage: ["Sonntag", "Sonntag", "Quatsch"], wunsch: { kind: "Matis", gericht: "Milchreis", tag: "Samstag" } });
    expect(r.content).toBe("Vorgemerkt: Vorgaben geändert (meatDays, vegetarianDays, fishDays, cheatDayWeekday, cheatDay, awayDays, wish).");
    const op = letzte(ctx);
    if (op.type !== "update_week") throw new Error();
    expect(op.changes).toMatchObject({ cheatDay: true, cheatDayWeekday: "Freitag", awayDays: ["Sonntag"], wish: { kidId: "p-mathis", text: "Milchreis", weekday: "Samstag" } });
    // Ausflugstag blockiert Gerichte
    expect(rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Sonntag", gericht: "Grillen" }).content).toMatch(/Ausflugstag/);
    rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Montag", gericht: "Eintopf" });
    expect(rufe(ctx, "gericht_verschieben", { woche: "aktuell", von_tag: "Montag", nach_tag: "Sonntag" }).content).toBe("Sonntag ist ein Ausflugstag.");
    // woche_lesen sieht die Vorgaben
    const woche = JSON.parse(rufe(ctx, "woche_lesen", { woche: "aktuell" }).content);
    expect(woche.vorgaben_aus_wochen_check).toBe(true);
    expect(woche.ziel).toEqual({ fleisch: 1, veggie: 4, fisch: 1 });
  });

  it("vorgaben_aendern: unbekanntes Kind, Wunsch ohne Tag, Wunsch entfernen", () => {
    const ctx = kontext();
    expect(rufe(ctx, "vorgaben_aendern", { woche: "aktuell", wunsch: { kind: "Oma", gericht: "Torte", tag: "Montag" } }).content).toBe('Kein Kind namens "Oma". Kinder im Profil: Mathis. Nachfragen.');
    expect(rufe(ctx, "vorgaben_aendern", { woche: "aktuell", wunsch: { kind: "Mathis", gericht: "Torte" } }).content).toBe("Für den Wunsch den tag angeben.");
    expect(rufe(ctx, "vorgaben_aendern", { woche: "naechste", wunsch_entfernen: true, cheat_day: false }).content).toMatch(/cheatDay, wish/);
  });

  it("wunsch_merken mit bekannter und unbekannter Person", () => {
    const ctx = kontext();
    expect(rufe(ctx, "wunsch_merken", { person: "Mathis" }).isError).toBe(true);
    expect(rufe(ctx, "wunsch_merken", { person: "Mathis", gericht: "Pfannkuchen" }).content).toBe("Vorgemerkt: Wunsch von Mathis – Pfannkuchen.");
    expect(letzte(ctx)).toMatchObject({ type: "add_wish", personId: "p-mathis" });
    rufe(ctx, "wunsch_merken", { person: "Oma Gerda", gericht: "Rouladen" });
    expect(letzte(ctx)).toMatchObject({ type: "add_wish", personId: null, who: "Oma Gerda" });
  });
});

describe("Kochbuch, Einkauf, Vorrat", () => {
  it("kochbuch_durchsuchen nach Titel, Zutat und Kategorie", () => {
    const ctx = kontext({ recipes: { a: rezept("a", "Linsencurry", ["Linsen"]), b: rezept("b", "Lachs mit Reis", ["Lachs", "Reis"], { category: "fisch", favorite: true, cookedCount: 3, thumbsUp: 2 }) } });
    expect(JSON.parse(rufe(ctx, "kochbuch_durchsuchen", {}).content).treffer).toBe(2);
    const reis = JSON.parse(rufe(ctx, "kochbuch_durchsuchen", { suche: "REIS" }).content);
    expect(reis.rezepte.map((r: { titel: string }) => r.titel)).toEqual(["Lachs mit Reis"]);
    expect(reis.rezepte[0]).toMatchObject({ favorit: true, gekocht: 3, daumen_hoch: 2, minuten: 25, bekannt: true });
    expect(JSON.parse(rufe(ctx, "kochbuch_durchsuchen", { kategorie: "vegetarisch" }).content).treffer).toBe(1);
  });

  it("einkaufsliste_hinzufuegen merkt Tag, Gericht und Laden", () => {
    const ctx = kontext();
    expect(rufe(ctx, "einkaufsliste_hinzufuegen", { woche: "aktuell", artikel: [] }).isError).toBe(true);
    const r = rufe(ctx, "einkaufsliste_hinzufuegen", { woche: "aktuell", artikel: [{ name: "Milch", menge: "1 l", fuer_tag: "heute", laden: "REWE" }, { name: " " }, { name: "Müsli", abteilung: "vorrat", fuer_tag: "Freitag", gericht: "Frühstück" }] });
    expect(r.content).toBe("Vorgemerkt für die Einkaufsliste: Milch, Müsli.");
    expect(ctx.ops[0]).toMatchObject({ type: "add_shopping", name: "Milch", amount: "1 l", day: "Mittwoch", shop: "REWE", section: "kuehlregal" });
    expect(ctx.ops[1]).toMatchObject({ section: "vorrat", day: "Freitag", dish: "Frühstück" });
    expect(ctx.data.shopping[WOCHEN.aktuell].manual.map((m) => m.name)).toEqual(["Milch", "Müsli"]);
  });

  it("vorrat_hinzufuegen wählt den naheliegenden Ort", () => {
    const ctx = kontext();
    expect(rufe(ctx, "vorrat_hinzufuegen", { sachen: [{ name: "" }] }).content).toBe("sachen mit name angeben.");
    expect(rufe(ctx, "vorrat_hinzufuegen", { sachen: [{ name: "Chili", menge: 4, einheit: "Portionen", ort: "tiefkuehler" }, { name: "Joghurt", menge: 0 }] }).content).toBe("Vorgemerkt für den Vorrat: Chili, Joghurt.");
    expect(ctx.ops[0]).toMatchObject({ type: "add_pantry", amount: 4, unit: "Portionen", place: "tiefkuehler" });
    expect(ctx.ops[1]).toMatchObject({ amount: null, place: "kuehlschrank" });
  });
});

describe("Register", () => {
  it("unbekannte Werkzeuge und Fehler werfen nie", () => {
    const ctx = kontext();
    expect(rufe(ctx, "zaubern")).toEqual({ content: "Unbekanntes Werkzeug: zaubern", isError: true });
    // Kaputte Arbeitskopie → freundliche Meldung statt Absturz
    const kaputt = { ...ctx, data: { ...ctx.data, recipes: null as never } };
    expect(rufe(kaputt, "kochbuch_durchsuchen", {})).toMatchObject({ isError: true, content: expect.stringMatching(/nicht geklappt/) });
    expect(HEUTE).toBe("2026-10-21");
  });
});
