// Essen – die nächsten 7 Tage (Tafel 97): rollend ab heute über die
// Wochengrenze, Verschieben/Tauschen (auch zwischen zwei Wochen) mit
// Rückgängig, „Kein Kochtag“, Zuletzt gegessen, Tag-Fenster-Texte, Ansicht
// gemerkt und Mia („Schieb das Pad Thai auf Mittwoch“, „Tausch Freitag und
// Samstag“). Der Einkauf folgt dem Plan von selbst.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dochKochtag, fensterKopf, keinKochtag, naechsteSieben, tagLabel, verschiebe, verschiebeText, wocheVon, zuletztGegessen } from "@/lib/essen/sieben";
import { composeWeek } from "@/lib/essen/mealPlan";
import { createEmptyProfile } from "@/lib/einstellungen/profile";
import { weekdayLong, weekdayShort } from "@/lib/kalender/model";
import { findSlot, weekOf } from "@/lib/begleitung/ops";
import { buildShoppingList } from "@/lib/einkauf/shoppingList";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { kontext, letzte, rezept, rufe, WOCHEN } from "../begleitung/werkzeugKontext";
import { afterTools, context } from "../begleitung/testmodusHilfen";

type Weeks = Parameters<typeof verschiebe>[0];
const profile = createEmptyProfile();
const tag = (weeks: Weeks, date: string) => {
  const start = wocheVon(date, "Montag");
  return composeWeek(start, profile, {}, weeks, {}).days.find((d) => d.date === date)!;
};
const titel = (weeks: Weeks, date: string) => tag(weeks, date).slot.entry?.title ?? null;
const dish = (title: string) => ({ kind: "text" as const, title, category: "vegetarisch" as const });

describe("Rollend ab heute", () => {
  it("immer 7 Tage ab heute, auch über die Wochengrenze", () => {
    expect(naechsteSieben("2026-10-27")).toEqual(["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(wocheVon("2026-11-01", "Montag")).toBe("2026-10-26");
    expect(wocheVon("2026-11-02", "Montag")).toBe("2026-11-02");
  });

  it("Tag-Zeile und Fenster-Kopf", () => {
    expect(tagLabel("2026-10-27", "2026-10-27", weekdayShort)).toBe("Heute · Di 27.");
    expect(tagLabel("2026-10-28", "2026-10-27", weekdayShort)).toBe("Morgen · Mi 28.");
    expect(tagLabel("2026-10-29", "2026-10-27", weekdayShort)).toBe("Do 29.");
    expect(fensterKopf("2026-10-29", weekdayLong, "18:30")).toBe("DONNERSTAG · 29.10. · 18:30");
    expect(fensterKopf("2026-10-29", weekdayLong, null)).toBe("DONNERSTAG · 29.10.");
  });
});

describe("Ziehen = verschieben oder tauschen", () => {
  const weeks: Weeks = { "2026-10-26": { Freitag: dish("Pad Thai"), Samstag: dish("Pizza") }, "2026-11-02": {} };

  it("auf einen belegten Tag = tauschen", () => {
    const next = verschiebe(weeks, tag(weeks, "2026-10-30"), tag(weeks, "2026-10-31"), "Montag")!;
    expect([titel(next, "2026-10-30"), titel(next, "2026-10-31")]).toEqual(["Pizza", "Pad Thai"]);
    expect(verschiebeText(tag(weeks, "2026-10-31"))).toBe("Getauscht");
  });

  it("auf einen freien Tag in der nächsten Woche = verschieben (zwei Wochen ändern sich)", () => {
    const next = verschiebe(weeks, tag(weeks, "2026-10-30"), tag(weeks, "2026-11-02"), "Montag")!;
    expect(titel(next, "2026-10-30")).toBeNull();
    expect(titel(next, "2026-11-02")).toBe("Pad Thai");
    expect(verschiebeText(tag(weeks, "2026-11-02"))).toBe("Verschoben");
    // Rückgängig = alte Wochen zurück; das Original bleibt unberührt
    expect(titel(weeks, "2026-10-30")).toBe("Pad Thai");
  });

  it("nichts zu tun: freier Tag oder gleicher Tag", () => {
    expect(verschiebe(weeks, tag(weeks, "2026-10-29"), tag(weeks, "2026-10-30"), "Montag")).toBeNull();
    expect(verschiebe(weeks, tag(weeks, "2026-10-30"), tag(weeks, "2026-10-30"), "Montag")).toBeNull();
  });

  it("Einkauf folgt dem verschobenen Gericht (wird aus dem Plan berechnet)", () => {
    const recipes = { pt: rezept("pt", "Pad Thai", ["Reisnudeln"]) };
    const mitRezept: Weeks = { "2026-10-26": { Freitag: { kind: "recipe", recipeId: "pt", title: "Pad Thai", category: "vegetarisch" } } };
    const from = composeWeek("2026-10-26", profile, {}, mitRezept, recipes).days.find((d) => d.weekday === "Freitag")!;
    const to = composeWeek("2026-11-02", profile, {}, mitRezept, recipes).days.find((d) => d.weekday === "Montag")!;
    const next = verschiebe(mitRezept, from, to, "Montag")!;
    const liste = (start: string) => buildShoppingList(composeWeek(start, profile, {}, next, recipes), recipes).items.find((i) => i.name === "Reisnudeln");
    expect(liste("2026-10-26")).toBeUndefined();
    expect(liste("2026-11-02")?.dishes).toEqual(["Pad Thai (Mo)"]);
  });
});

describe("Kein Kochtag", () => {
  it("markiert den Tag und nimmt es wieder zurück", () => {
    const d = tag({}, "2026-10-30");
    const plans = keinKochtag({}, d, "Montag", profile.weekRules);
    expect(plans["2026-10-26"].awayDays).toEqual(["Freitag"]);
    expect(keinKochtag(plans, d, "Montag", profile.weekRules)).toBe(plans);
    expect(dochKochtag(plans, d, "Montag")["2026-10-26"].awayDays).toEqual([]);
    expect(dochKochtag({}, d, "Montag")).toEqual({});
  });
});

describe("Zuletzt gegessen", () => {
  it("die letzten 14 Tage vor heute, neueste zuerst", () => {
    const cooked = { "2026-10-10": { title: "Alt" }, "2026-10-20": { title: "Suppe" }, "2026-10-26": { title: "Pizza", recipeId: "k:pizza" }, "2026-10-27": { title: "Heute" } };
    expect(zuletztGegessen(cooked, "2026-10-27")).toEqual([
      { date: "2026-10-26", title: "Pizza", recipeId: "k:pizza" },
      { date: "2026-10-20", title: "Suppe" },
    ]);
  });
});

describe("Ansicht Liste/Reihe gemerkt", () => {
  it("eigener Speicher, Standard Liste, nicht in der Sicherung", () => {
    const src = readFileSync("src/lib/essen/sieben/ansicht.ts", "utf8");
    expect(src).toMatch(/wasgibts\.essenansicht/);
    expect(src).toMatch(/"liste"/);
    expect(readFileSync("src/lib/core/storage.ts", "utf8")).toMatch(/wasgibts\.essenansicht/);
  });
});

describe("Mia verschiebt in den nächsten 7 Tagen", () => {
  // Heute: Mi 21.10.; aktuelle Woche ab Mo 19.10., nächste ab Mo 26.10.
  const ctx = () => {
    const c = kontext({ recipes: { pt: rezept("pt", "Pad Thai", ["Reisnudeln"]) } });
    rufe(c, "gericht_setzen", { woche: "aktuell", tag: "Freitag", gericht: "Pad Thai" });
    rufe(c, "gericht_setzen", { woche: "aktuell", tag: "Samstag", gericht: "Pizza" });
    c.ops = [];
    return c;
  };
  const am = (c: ReturnType<typeof kontext>, woche: string, t: string) => findSlot(weekOf(c.data, woche), t)?.entry?.title ?? null;

  it("„Schieb das Pad Thai auf Montag“: über den Namen, über die Wochengrenze", () => {
    const c = ctx();
    expect(rufe(c, "gericht_verschieben", { gericht: "das pad thai", nach_tag: "Montag" }).content).toBe("Vorgemerkt: Pad Thai auf Montag verschieben.");
    expect(letzte(c)).toMatchObject({ type: "move_meal", from: { weekStart: WOCHEN.aktuell, weekday: "Freitag" }, to: { weekStart: WOCHEN.naechste, weekday: "Montag" } });
    // Vorschläge gelten in der Arbeitskopie sofort (wie in der Vorschau)
    expect(am(c, WOCHEN.aktuell, "Freitag")).toBeNull();
    expect(am(c, WOCHEN.naechste, "Montag")).toBe("Pad Thai");
  });

  it("„Tausch Freitag und Samstag“ ohne Woche = die nächsten Tage", () => {
    const c = ctx();
    expect(rufe(c, "gericht_verschieben", { von_tag: "Freitag", nach_tag: "Samstag" }).content).toBe("Vorgemerkt: Pad Thai und Pizza tauschen.");
    expect([am(c, WOCHEN.aktuell, "Freitag"), am(c, WOCHEN.aktuell, "Samstag")]).toEqual(["Pizza", "Pad Thai"]);
  });

  it("Tausch über die Wochengrenze tauscht wirklich", () => {
    const c = ctx();
    rufe(c, "gericht_setzen", { woche: "naechste", tag: "Montag", gericht: "Linsensuppe" });
    expect(rufe(c, "gericht_verschieben", { gericht: "Pizza", nach_tag: "Montag" }).content).toBe("Vorgemerkt: Pizza und Linsensuppe tauschen.");
    expect([am(c, WOCHEN.aktuell, "Samstag"), am(c, WOCHEN.naechste, "Montag")]).toEqual(["Linsensuppe", "Pizza"]);
  });

  it("ehrlich, wenn das Gericht nicht in den nächsten 7 Tagen steht oder schon dort ist", () => {
    const c = ctx();
    expect(rufe(c, "gericht_verschieben", { gericht: "Lasagne", nach_tag: "Montag" }).content).toBe("Lasagne steht in den nächsten 7 Tagen nicht im Plan.");
    expect(rufe(c, "gericht_verschieben", { gericht: "Pizza", nach_tag: "Samstag" }).content).toBe("Pizza steht schon am Samstag.");
    expect(rufe(c, "gericht_verschieben", { nach_tag: "Samstag" }).isError).toBe(true);
    expect(c.ops).toHaveLength(0);
  });

  it("Testmodus: „Schieb das Pad Thai auf Mittwoch“ → Werkzeug mit dem Namen", async () => {
    const woche = JSON.stringify({ woche: "2026-10-19", tage: [{ tag: "Freitag", datum: "23.10.", gericht: "Pad Thai" }] });
    const r = await afterTools(context(), "Schieb das Pad Thai auf Mittwoch", [{ name: "woche_lesen", input: { woche: "aktuell" } }, { name: "kochbuch_durchsuchen" }], { woche_lesen: woche, kochbuch_durchsuchen: JSON.stringify({ rezepte: [] }) });
    expect(r.uses.map((u) => [u.name, u.input])).toEqual([["gericht_verschieben", { gericht: "Pad Thai", nach_tag: "Mittwoch" }]]);
  });

  it("Prüfstand-Sätze sind dabei", () => {
    const texte = PRUEFSAETZE.map((s) => s.text);
    for (const t of ["Schieb die Pizza auf Samstag", "Schieb das Curry auf Montag", "Tausch Freitag und Samstag", "Was gibt’s Samstag?"]) expect(texte).toContain(t);
  });
});
