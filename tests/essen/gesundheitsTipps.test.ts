// Gesundheits-Tipps: ein freiwilliger Tausch je Rezept, nie bei Cheat Day/Wunsch/Allergie, Wochenlimit
import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { currentTip, declineTip, markTipShown, tipsForWeeks, tipsShown, tryTip, undoTip, type HealthTip } from "@/lib/essen/healthTips";
import { composeWeek, type StoredEntry } from "@/lib/essen/mealPlan";
import { createWeekPlan } from "@/lib/essen/weekPlan";
import type { Recipe } from "@/lib/essen/cookbook";
import { buch, fakeWindow, familie, rezept } from "./hilfen";

const WEEK = "2026-10-19";
let storage: Storage;
const tipStore = () => JSON.parse(storage.getItem("wasgibts.tipps") ?? "null") ?? { version: 1 as const, shown: {}, handled: {} };

beforeEach(() => {
  at("2026-10-22T12:00");
  storage = fakeWindow();
});

function woche(recipes: Record<string, Recipe>, stored: Record<string, StoredEntry>, profile = familie()) {
  return composeWeek(WEEK, profile, {}, { [WEEK]: stored }, recipes);
}
const rec = (r: Recipe): StoredEntry => ({ kind: "recipe", recipeId: r.id, title: r.title, category: r.category });

describe("Passender Tausch", () => {
  const cases: [string, string, RegExp][] = [
    ["Sahne", "sahne-joghurt", /Halbe Sahne durch Joghurt/],
    ["Schmand", "creme-joghurt", /Die Hälfte Schmand durch Joghurt/],
    ["Spaghetti", "vollkornnudeln", /Vollkornnudeln/],
    ["Basmatireis", "naturreis", /Naturreis/],
    ["Hackfleisch", "hack-linsen", /rote Linsen/],
    ["Speck", "wurst-gemuese", /Halbe Menge Speck/],
    ["Zucker", "weniger-zucker", /weniger Zucker/],
    ["Baguette", "vollkornbrot", /Vollkorn statt Baguette/],
  ];
  it.each(cases)("%s → %s", (zutat, swapId, text) => {
    const r = rezept("Gericht", [zutat], { id: "g" });
    const [tip] = tipsForWeeks([woche(buch(r), { Freitag: rec(r) })], "2026-10-22", buch(r), []);
    expect(tip).toMatchObject({ swapId, recipeId: "g", weekday: "Freitag", key: `g:${swapId}` });
    expect(tip.text).toMatch(text);
    // Keine Aussagen über Körper, Gewicht oder Kalorien
    expect(tip.text).not.toMatch(/kalorie|gewicht|abnehm|dick|schlank/i);
  });

  it("nicht für vergangene Tage, Cheat Day, Wunsch, Ausflug, Freitext oder bei Allergie", () => {
    const sahne = rezept("Sahnenudeln", [[200, "ml", "Sahne"]], { id: "s" });
    const cheat = rezept("Pizza", ["Speck"], { id: "c", category: "cheatday" });
    const recipes = buch(sahne, cheat);
    const plan = { ...createWeekPlan(WEEK, familie().weekRules), awayDays: ["Sonntag"] };
    const week = composeWeek(WEEK, familie(), { [WEEK]: plan }, {
      [WEEK]: { Montag: rec(sahne), Freitag: rec(cheat), Samstag: rec(sahne), Sonntag: rec(sahne), Donnerstag: { kind: "text", title: "Sahnesoße", category: null } },
    }, recipes);
    // Samstag ist Cheat Day laut Standardwoche, Sonntag Ausflug, Montag vorbei
    expect(tipsForWeeks([week], "2026-10-22", recipes, [])).toEqual([]);
    const wish = composeWeek(WEEK, familie(), { [WEEK]: { ...plan, awayDays: [], wish: { kidId: "mathis", text: "Sahnenudeln", weekday: "Freitag" } } }, {}, recipes);
    expect(tipsForWeeks([wish], "2026-10-22", recipes, [])).toEqual([]);
    const allergic = familie().persons.map((p) => (p.id === "mathis" ? { ...p, allergies: ["Joghurt"] } : p));
    expect(tipsForWeeks([woche(recipes, { Freitag: rec(sahne) })], "2026-10-22", recipes, allergic)).toEqual([]);
  });

  it("je Rezept nur ein Tipp; schon Ausprobiertes kommt nicht wieder; Folgeregel greift", () => {
    const r = rezept("Bolo", ["Hackfleisch", "Spaghetti"], { id: "b", note: "[vollkornnudeln]" });
    const recipes = buch(r);
    const tips = tipsForWeeks([woche(recipes, { Freitag: rec(r), Sonntag: rec(r) })], "2026-10-22", recipes, []);
    expect(tips.map((t) => t.swapId)).toEqual(["hack-linsen"]);
    // Rezept gelöscht → kein Tipp
    expect(tipsForWeeks([woche({}, { Freitag: rec(r) })], "2026-10-22", {}, [])).toEqual([]);
  });

  it("saure Sahne, Vollkornnudeln und Milchreis bleiben, wie sie sind", () => {
    const r = rezept("Leicht", ["saure Sahne", "Vollkornspaghetti", "Milchreis", "Vollkorntoast"], { id: "l" });
    expect(tipsForWeeks([woche(buch(r), { Freitag: rec(r) })], "2026-10-22", buch(r), [])).toEqual([]);
  });
});

describe("Ausprobieren", () => {
  const apply = (zutat: [number | null, string, string]) => {
    const r = rezept("Gericht", [zutat], { id: "g", note: "Omas Rezept" });
    const [tip] = tipsForWeeks([woche(buch(r), { Freitag: rec(r) })], "2026-10-22", buch(r), []);
    const before = tryTip(tip, r);
    expect(before).toBe(r);
    return JSON.parse(storage.getItem("wasgibts.kochbuch")!).recipes.g as Recipe;
  };

  it("halbe Sahne + Joghurt (ml → g), Notiz und erledigt", () => {
    const saved = apply([200, "ml", "Sahne"]);
    expect(saved.ingredients.map((i) => [i.amount, i.unit, i.name])).toEqual([
      [100, "ml", "Sahne"],
      [100, "g", "Joghurt"],
    ]);
    expect(saved.note).toBe("Omas Rezept\n🌱 Ausprobiert: Halbe Sahne durch Joghurt ersetzen [sahne-joghurt]");
    expect(tipStore().handled["g:sahne-joghurt"]).toBe("tried");
  });

  it("Hack: zwei Drittel bleiben, rote Linsen dazu; ohne Menge bleibt es ohne Menge", () => {
    expect(apply([500, "g", "Hackfleisch"]).ingredients.map((i) => [i.amount, i.unit, i.name])).toEqual([
      [333.3, "g", "Hackfleisch"],
      [80, "g", "rote Linsen"],
    ]);
    expect(apply([null, "", "Hack"]).ingredients.map((i) => [i.amount, i.unit, i.name])).toEqual([
      [null, "", "Hack"],
      [null, "g", "rote Linsen"],
    ]);
  });

  it("die übrigen Tauschregeln", () => {
    expect(apply([400, "g", "Spaghetti"]).ingredients.map((i) => i.name)).toEqual(["Spaghetti", "Vollkorn-Spaghetti"]);
    expect(apply([200, "g", "Reis"]).ingredients.map((i) => i.name)).toEqual(["Naturreis"]);
    expect(apply([100, "g", "Speck"]).ingredients.map((i) => [i.amount, i.name])).toEqual([
      [50, "Speck"],
      [1, "Paprika"],
    ]);
    expect(apply([150, "g", "Zucker"]).ingredients[0].amount).toBe(100);
    expect(apply([1, "", "Baguette"]).ingredients[0].name).toBe("Vollkornbaguette");
    expect(apply([200, "g", "Crème fraîche"]).ingredients.map((i) => [i.amount, i.name])).toEqual([
      [100, "Crème fraîche"],
      [100, "Joghurt"],
    ]);
  });

  it("unpassender Tipp ändert nichts; Ablehnen und Rückgängig", () => {
    const r = rezept("Gericht", ["Sahne"], { id: "g" });
    const tip: HealthTip = { key: "g:sahne-joghurt", recipeId: "g", title: "Gericht", weekday: "Freitag", swapId: "sahne-joghurt", ingredientId: "gibtsnicht", text: "x" };
    expect(tryTip(tip, r)).toBeNull();
    expect(tryTip({ ...tip, swapId: "gibtsnicht" }, r)).toBeNull();
    declineTip(tip);
    expect(tipStore().handled[tip.key]).toBe("declined");
    undoTip({ ...tip, key: "g:zwei" }, r);
    expect(tipStore().handled["g:zwei"]).toBe("declined");
    expect(JSON.parse(storage.getItem("wasgibts.kochbuch")!).recipes.g.title).toBe("Gericht");
  });
});

describe("Welcher Tipp ist dran?", () => {
  const tip = (key: string): HealthTip => ({ key, recipeId: key, title: key, weekday: "Freitag", swapId: "x", ingredientId: "i", text: "t" });
  const tips = [tip("a"), tip("b"), tip("c")];

  it("aus = keiner; ab und zu = einer pro Woche; gezeigter bleibt bis erledigt", () => {
    expect(currentTip("aus", WEEK, tips, tipStore())).toBeNull();
    expect(currentTip("ab_und_zu", WEEK, tips, tipStore())?.key).toBe("a");
    markTipShown(WEEK, "a");
    markTipShown(WEEK, "a");
    expect(tipsShown(WEEK, tipStore())).toBe(1);
    expect(tipsShown(WEEK, null)).toBe(0);
    expect(currentTip("ab_und_zu", WEEK, tips, tipStore())?.key).toBe("a");
    declineTip(tips[0]);
    // Limit erreicht
    expect(currentTip("ab_und_zu", WEEK, tips, tipStore())).toBeNull();
    // Öfter: bis zu drei, schon in früheren Wochen gezeigte nicht noch einmal
    expect(currentTip("oefter", WEEK, tips, tipStore())?.key).toBe("b");
    markTipShown("2026-10-12", "b");
    expect(currentTip("oefter", WEEK, tips, tipStore())?.key).toBe("c");
  });

  it("kaputter Speicher wird ersetzt", () => {
    storage.setItem("wasgibts.tipps", JSON.stringify({ version: 1, shown: "x", handled: null }));
    markTipShown(WEEK, "a");
    expect(tipStore()).toEqual({ version: 1, shown: { [WEEK]: ["a"] }, handled: {} });
    storage.setItem("wasgibts.tipps", JSON.stringify({ version: 3 }));
    markTipShown(WEEK, "b");
    expect(tipStore().shown).toEqual({ [WEEK]: ["b"] });
  });
});
