// Einkaufsliste aus dem Wochenplan berechnen (buildList.ts), Mengen
// (amounts.ts) und Teilen als Text.
import { describe, expect, it } from "vitest";
import { formatTotal, roundSmall, unitFamily } from "@/lib/einkauf/amounts";
import { buildShoppingList, shoppingListText } from "@/lib/einkauf/buildList";
import type { WeekList } from "@/lib/einkauf/listModel";
import type { Recipe } from "@/lib/essen/cookbook";
import type { PlanDay, PlanWeek, ResolvedEntry } from "@/lib/essen/mealPlan";

const recipe = (id: string, servings: number, ingredients: [number | null, string, string][], kind: "kochen" | "backen" = "kochen") =>
  ({ id, title: id, servings, kind, ingredients: ingredients.map(([amount, unit, name], i) => ({ id: `${id}${i}`, amount, unit, name })) }) as unknown as Recipe;

const RECIPES: Record<string, Recipe> = {
  pasta: recipe("pasta", 4, [[500, "g", "Nudeln"], [1, "kg", "Tomaten"], [200, "ml", "Sahne"], [null, "", "Salz"], [1, "", "  "]]),
  gulasch: recipe("gulasch", 4, [[800, "g", "Rindfleisch"], [0.5, "l", "Sahne"], [2, "EL", "Paprikapulver"]]),
  kuchen: recipe("kuchen", 12, [[250, "g", "Mehl"], [3, "", "Eier"]], "backen"),
  leer: recipe("leer", 4, []),
};

const entry = (title: string, recipeId: string | undefined, extra: Partial<ResolvedEntry> = {}): ResolvedEntry => ({
  origin: "eigen",
  stored: recipeId ? { kind: "recipe", recipeId, title, category: "vegetarisch" } : { kind: "text", title, category: null },
  title,
  category: null,
  recipeId,
  double: false,
  ...extra,
});

const day = (weekday: string, e: ResolvedEntry | null, extra: Partial<PlanDay> = {}): PlanDay =>
  ({ weekday, date: "2026-10-19", away: false, cheat: false, slot: { key: weekday, entry: e, hint: null, hasDerived: false }, mealTime: "abends", persons: 4, note: "", leftovers: null, paused: false, weekend: null, ...extra }) as PlanDay;

const week = (days: PlanDay[]): PlanWeek => ({ weekStart: "2026-10-19", days, hasPlanRules: false, planned: 0, total: 7, counts: { fleisch: { planned: 0, target: 0 }, vegetarisch: { planned: 0, target: 0 }, fisch: { planned: 0, target: 0 } } });

const find = (list: ReturnType<typeof buildShoppingList>, name: string) => list.items.find((i) => i.name === name);

describe("Mengen", () => {
  it("Einheiten-Familien, Summen und Aufrunden", () => {
    expect(unitFamily("kg")).toEqual({ family: "g", factor: 1000 });
    expect(unitFamily("l")).toEqual({ family: "ml", factor: 1000 });
    expect(unitFamily("ml")).toEqual({ family: "ml", factor: 1 });
    expect(unitFamily("Dose")).toEqual({ family: "Dose", factor: 1 });
    expect(formatTotal(1500, "g")).toBe("1,5 kg");
    expect(formatTotal(1250, "ml")).toBe("1,25 l");
    expect(formatTotal(3, "")).toBe("3");
    expect(formatTotal(2.5, "EL")).toBe("2,5 EL");
    expect(roundSmall(130, "g")).toBe(150);
    expect(roundSmall(23, "ml")).toBe(30);
    expect(roundSmall(1.2, "EL")).toBe(1.5);
    expect(roundSmall(1.2, "")).toBe(2);
    expect(roundSmall(2, "")).toBe(2);
  });
});

describe("Liste aus dem Wochenplan", () => {
  it("addiert gleiche Zutaten derselben Einheiten-Familie, doppelt kochen ×2", () => {
    const plan = week([day("Montag", entry("Pasta", "pasta")), day("Dienstag", entry("Gulasch", "gulasch", { double: true }))]);
    const list = buildShoppingList(plan, RECIPES);
    expect(find(list, "Sahne")).toMatchObject({ amount: "1,2 l", dishes: ["Pasta (Mo)", "Gulasch (Di) ×2"], days: ["Montag", "Dienstag"], section: "kuehlregal" });
    expect(find(list, "Rindfleisch")?.amount).toBe("1,6 kg");
    expect(find(list, "Salz")?.amount).toBe("");
    expect(find(list, "Paprikapulver")?.amount).toBe("4 EL");
    expect(list.items.some((i) => !i.name.trim())).toBe(false);
    expect(list.openCount).toBe(6);
    expect(list.doneCount).toBe(0);
    // Abteilungen in fester Reihenfolge: Obst & Gemüse zuerst
    expect(list.items[0].section).toBe("obst-gemuese");
  });

  it("Ausflug, leerer Tag, Gericht ohne Zutaten, Wunsch", () => {
    const wish = entry("Pfannkuchen", undefined, { stored: { kind: "wish", kidId: "k", text: "Pfannkuchen" }, kidName: "Mathis", origin: "wunsch" });
    const plan = week([day("Montag", entry("Pasta", "pasta"), { away: true }), day("Dienstag", null), day("Mittwoch", entry("Reste", undefined)), day("Donnerstag", wish), day("Freitag", entry("Leer", "leer"))]);
    const list = buildShoppingList(plan, RECIPES);
    expect(list.items).toEqual([]);
    expect(list.missing).toEqual(["Reste (Mi)", "Mathiss Wunsch „Pfannkuchen“ (Do)", "Leer (Fr)"]);
  });

  it("kleiner Haushalt: auf die Personen umgerechnet und aufgerundet, Backen bleibt ganz", () => {
    const plan = week([day("Montag", entry("Pasta", "pasta"), { persons: 1 }), day("Dienstag", entry("Kuchen", "kuchen"), { persons: 1 })]);
    const list = buildShoppingList(plan, RECIPES, undefined, undefined, { small: true });
    expect(find(list, "Nudeln")?.amount).toBe("150 g");
    expect(find(list, "Tomaten")?.amount).toBe("250 g");
    expect(find(list, "Mehl")?.amount).toBe("250 g");
    expect(find(list, "Eier")?.amount).toBe("3");
    // ohne „klein“ bleiben die Rezeptmengen
    expect(find(buildShoppingList(plan, RECIPES), "Nudeln")?.amount).toBe("500 g");
  });

  it("nur heute umgerechnet (persons am Gericht)", () => {
    const e = entry("Pasta", "pasta", { stored: { kind: "recipe", recipeId: "pasta", title: "Pasta", category: "vegetarisch", persons: 2 } });
    const list = buildShoppingList(week([day("Montag", e, { persons: 2 })]), RECIPES);
    expect(find(list, "Nudeln")?.amount).toBe("250 g");
    const gleich = entry("Pasta", "pasta", { stored: { kind: "recipe", recipeId: "pasta", title: "Pasta", category: "vegetarisch", persons: 4 } });
    expect(find(buildShoppingList(week([day("Montag", gleich)]), RECIPES), "Nudeln")?.amount).toBe("500 g");
  });

  it("lockeres Wochenende: Zutaten nur optional", () => {
    const plan = week([day("Samstag", entry("Pasta", "pasta"), { weekend: "locker" }), day("Sonntag", entry("Gulasch", "gulasch"), { weekend: "locker" }), day("Montag", entry("Gulasch", "gulasch"))]);
    const list = buildShoppingList(plan, RECIPES);
    expect(find(list, "Nudeln")?.optional).toBe(true);
    expect(find(list, "Rindfleisch")?.optional).toBe(false);
  });

  it("eigene Artikel, Häkchen, ‚haben wir‘, Umbenennungen, Produkte und Läden", () => {
    const wl: WeekList = {
      manual: [
        { id: "1", name: "Butter", amount: "1", section: "kuehlregal", done: false, day: "Montag", now: true, dish: "Pasta" },
        { id: "2", name: "Windeln", amount: "", section: "sonstiges", done: true },
      ],
      checked: ["nudeln|g"],
      have: ["salz|"],
      renamed: { "tomaten|g": "Kirschtomaten" },
    };
    const settings = { products: { butter: "Alsan", sahne: "Hafersahne" }, itemShops: { alsan: "Rewe", nudeln: "Lidl" } };
    const list = buildShoppingList(week([day("Montag", entry("Pasta", "pasta"))]), RECIPES, wl, settings);
    expect(find(list, "Alsan")).toMatchObject({ key: "m:1", originalName: "Butter", shop: "Rewe", now: true, dishes: ["Pasta"], days: ["Montag"], manualId: "1" });
    expect(find(list, "Windeln")).toMatchObject({ checked: true, dishes: [], days: [] });
    expect(find(list, "Nudeln")).toMatchObject({ checked: true, shop: "Lidl" });
    expect(find(list, "Salz")?.hidden).toBe(true);
    expect(find(list, "Kirschtomaten")?.originalName).toBe("Tomaten");
    expect(find(list, "Hafersahne")).toBeDefined();
    expect(list.openCount).toBe(3);
    expect(list.doneCount).toBe(2);
    // eigene Artikel nach den Rezept-Artikeln derselben Abteilung
    const kuehl = list.items.filter((i) => i.section === "kuehlregal").map((i) => i.name);
    expect(kuehl).toEqual(["Hafersahne", "Alsan"]);
  });

  it("spontan: keine Wochenliste aus dem Plan, nur eigene Artikel", () => {
    const wl: WeekList = { manual: [{ id: "1", name: "Milch", amount: "", section: "kuehlregal", done: false }], checked: [], have: [] };
    const list = buildShoppingList(week([day("Montag", entry("Pasta", "pasta"))]), RECIPES, wl, undefined, { manualOnly: true });
    expect(list.items.map((i) => i.name)).toEqual(["Milch"]);
  });
});

describe("Liste teilen", () => {
  it("nur Offenes, nach Abteilung, optional ein Laden", () => {
    const wl: WeekList = { manual: [{ id: "1", name: "Zahnpasta", amount: "", section: "sonstiges", done: false }], checked: ["sahne|ml"], have: [] };
    const list = buildShoppingList(week([day("Montag", entry("Pasta", "pasta"))]), RECIPES, wl, { products: {}, itemShops: { zahnpasta: "dm" } });
    const text = shoppingListText(list, "Einkauf");
    expect(text.split("\n")[0]).toBe("Einkauf");
    expect(text).toContain("🥕 Obst & Gemüse\n- 1 kg Tomaten");
    expect(text).toContain("- Salz");
    expect(text).not.toContain("Sahne");
    expect(shoppingListText(list, "dm", "dm")).toBe("dm\n\n🛍️ Sonstiges\n- Zahnpasta");
  });
});
