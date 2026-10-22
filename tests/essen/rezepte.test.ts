// Kochbuch: Anlegen, Speichern, Migration, Zählen; Rezept erzählen; Backstube; Basen; Nie wieder
import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import {
  categoryInfo,
  countCookedOn,
  createAiRecipe,
  createIngredient,
  createRecipe,
  deleteRecipe,
  formatAmount,
  parseAmount,
  replaceRecipes,
  restoreRecipe,
  saveRecipe,
  setRecipeKnown,
  toggleFavorite,
  uncountCooked,
  type Recipe,
} from "@/lib/essen/cookbook";
import { parseSpokenRecipe } from "@/lib/essen/recipeSpeech";
import { adoptBuiltin, bakingIdeas, BUILTIN_BAKING, findRecipe, isBakingRequest, isBuiltin, KID_FRIENDLY } from "@/lib/essen/baking";
import { kidStepLabel, ovenText, stepMinutes } from "@/lib/essen/baking/steps";
import { baseFromText, baseLabel, bumpBase, EMPTY_BASES, migrateBases, recipeBase, sortedBases } from "@/lib/essen/bases";
import { isNeverAgain, restoreNeverAgain } from "@/lib/essen/neverAgain";
import { recipeIsKnown } from "@/lib/essen/dishStatus";
import { guessDishCategory } from "@/lib/essen/dishCategory";
import { demoLook, demoRecipe, isDemoRecipe } from "@/lib/essen/demoDish";
import { fakeWindow, familie, rezept } from "./hilfen";

let storage: Storage;
const stored = (): Record<string, Recipe> => JSON.parse(storage.getItem("wasgibts.kochbuch") ?? "{}").recipes ?? {};

beforeEach(() => {
  at("2026-10-22T12:00");
  storage = fakeWindow();
});

describe("Kochbuch", () => {
  it("Rezept anlegen mit Standardwerten, KI-Rezept als Favorit", () => {
    const r = createRecipe({ title: "Suppe", category: "vegetarisch" });
    expect(r).toMatchObject({ servings: 4, source: "eigenes", kind: "kochen", favorite: false, createdAt: "2026-10-22T10:00:00.000Z" });
    expect(r.id).toBeTruthy();
    const ai = createAiRecipe({ title: "Curry", category: "vegetarisch" }, "was mit Linsen");
    expect(ai).toMatchObject({ source: "ki", favorite: true, ai: { generatedAt: "2026-10-22T10:00:00.000Z", prompt: "was mit Linsen" } });
    expect(createIngredient()).toMatchObject({ amount: null, unit: "", name: "" });
    expect(categoryInfo("fisch").label).toBe("Fisch");
  });

  it("Mengen lesen und schreiben", () => {
    expect(parseAmount("1,5")).toBe(1.5);
    expect(parseAmount(" ")).toBeNull();
    expect(parseAmount("viel")).toBeNull();
    expect(formatAmount(1.5)).toBe("1,5");
    expect(formatAmount(null)).toBe("");
  });

  it("speichern räumt auf; Favorit, „Kennen wir“, löschen", () => {
    const r = createRecipe({ title: "  Suppe ", category: "vegetarisch", ingredients: [{ id: "a", amount: 1, unit: "", name: "Lauch" }, { id: "b", amount: null, unit: "", name: " " }], steps: [" Kochen ", ""] });
    saveRecipe(r);
    expect(stored()[r.id]).toMatchObject({ title: "Suppe", steps: ["Kochen"] });
    expect(stored()[r.id].ingredients).toHaveLength(1);
    toggleFavorite(r.id);
    setRecipeKnown(r.id, true);
    expect(stored()[r.id]).toMatchObject({ favorite: true, known: true });
    toggleFavorite("gibtsnicht");
    deleteRecipe(r.id);
    expect(stored()).toEqual({});
  });

  it("nach dem Essen mitzählen und zurücknehmen", () => {
    replaceRecipes({ s: rezept("Suppe", [], { id: "s", cookedCount: 0 }) });
    expect(countCookedOn("s", "2026-10-22")).toBeNull();
    expect(stored().s).toMatchObject({ cookedCount: 1, lastCookedAt: "2026-10-22T12:00:00.000Z" });
    uncountCooked("s", null);
    uncountCooked("s", null);
    expect(stored().s).toMatchObject({ cookedCount: 0, lastCookedAt: null });
  });

  it.each([1, 2])("Migration v%i → v3: bekannte Rezepte, Backen am Namen, Backofen, Kinder- und Maschinenschritte", (version) => {
    storage.setItem(
      "wasgibts.kochbuch",
      JSON.stringify({
        version,
        recipes: {
          a: { title: "Marmorkuchen", category: "unsinn", ingredients: [{ amount: "2", name: "Eier" }, null], steps: ["Rühren", 3], oven: { mode: "umluft", temp: 170, minutes: 50 }, kidSteps: [0, -1, 1.5], machineSteps: [{ text: "Mixen", time: "1 Min", speed: "4", reverse: true, temp: 3 }, { time: "x" }] },
          b: { title: "KI-Curry", source: "ki", cookedCount: 1, ai: { generatedAt: "x" }, oven: { temp: "heiß" } },
          c: { title: "KI-Bowl", source: "ki", cookedCount: 2, kind: "kochen", oven: { temp: 200, minutes: 20 } },
          d: { title: 5 },
          e: null,
        },
      }),
    );
    toggleFavorite("b");
    const recipes = stored();
    expect(Object.keys(recipes).sort()).toEqual(["a", "b", "c"]);
    expect(recipes.a).toMatchObject({ category: "vegetarisch", kind: "backen", known: true, steps: ["Rühren"], oven: { mode: "umluft", temp: 170, minutes: 50 }, kidSteps: [0] });
    expect(recipes.a.ingredients).toEqual([{ id: expect.any(String), amount: null, unit: "", name: "Eier" }]);
    expect(recipes.a.machineSteps).toEqual([{ text: "Mixen", time: "1 Min", speed: "4", reverse: true }]);
    expect(recipes.b).toMatchObject({ source: "ki", known: false, kind: "kochen", oven: null, ai: { generatedAt: "x" }, favorite: true });
    expect(recipes.c).toMatchObject({ known: true, oven: { mode: "ober-unter", temp: 200, minutes: 20 } });
    storage.setItem("wasgibts.kochbuch", JSON.stringify({ version: 4, recipes: {} }));
    toggleFavorite("a");
    expect(stored()).toEqual({});
  });

  it("Kopie aus „Nie wieder“ zurück ins Kochbuch", () => {
    expect(restoreRecipe({ id: "x", title: "Chili" })?.title).toBe("Chili");
    expect(stored().x.title).toBe("Chili");
    expect(restoreRecipe({ title: "Ohne ID" })?.id).toBeTruthy();
    expect(restoreRecipe("kaputt")).toBeNull();
  });
});

describe("Bekannt, Kategorie, Nie wieder", () => {
  it("bekannt: markiert, 2× gekocht oder eigenes schon gekocht", () => {
    expect(recipeIsKnown(rezept("a", [], { known: true }))).toBe(true);
    expect(recipeIsKnown(rezept("a", [], { source: "ki", cookedCount: 2 }))).toBe(true);
    expect(recipeIsKnown(rezept("a", [], { cookedCount: 1 }))).toBe(true);
    expect(recipeIsKnown(rezept("a", [], { source: "ki", cookedCount: 1 }))).toBe(false);
  });

  it("Kategorie nur aus dem Gericht", () => {
    expect(guessDishCategory("Lachs mit Reis")).toBe("fisch");
    expect(guessDishCategory("Spaghetti Bolognese")).toBe("fleisch");
    expect(guessDishCategory("Flammkuchen")).toBeNull();
    expect(guessDishCategory("Milchreis")).toBeNull();
    expect(guessDishCategory(" ")).toBeNull();
    expect(guessDishCategory("omas eintopf", [rezept("Omas Eintopf", [], { category: "fleisch" })])).toBe("fleisch");
  });

  it("Nie wieder: gleich oder sehr ähnlich", () => {
    const list = [{ id: "1", title: "Rosenkohl-Auflauf", ingredients: [], reason: "", addedAt: "" }];
    expect(isNeverAgain("rosenkohl auflauf", list)).toBe(false);
    expect(isNeverAgain("Rosenkohl-Auflauf mit Käse", list)).toBe(true);
    expect(isNeverAgain("Auflauf", list)).toBe(true);
    expect(isNeverAgain("Eis", list)).toBe(false);
    expect(isNeverAgain("!!!", list)).toBe(false);
  });

  it("Nie wieder rückgängig: aus der Liste, Rezept zurück", () => {
    const profile = familie({ neverAgain: [{ id: "n", title: "Chili", ingredients: [], reason: "", addedAt: "", recipe: { id: "chili", title: "Chili" } }, { id: "m", title: "Eis", ingredients: [], reason: "", addedAt: "" }] });
    restoreNeverAgain(profile, "gibtsnicht");
    expect(storage.getItem("familienkueche.haushaltsprofil")).toBeNull();
    restoreNeverAgain(profile, "n");
    expect(stored().chili.title).toBe("Chili");
    expect(JSON.parse(storage.getItem("familienkueche.haushaltsprofil")!).neverAgain.map((e: { id: string }) => e.id)).toEqual(["m"]);
    restoreNeverAgain(profile, "m");
  });
});

describe("Basen", () => {
  it("aus Text und Rezept", () => {
    expect(baseFromText("lieber Couscous")).toBe("quinoa");
    expect(baseFromText("Pommes")).toBe("kartoffeln");
    expect(baseFromText("egal")).toBeNull();
    expect(recipeBase({ title: "Bowl", ingredients: [{ id: "1", amount: null, unit: "", name: "Basmatireis" }] })).toBe("reis");
    expect(recipeBase({ title: "Suppe", ingredients: [] })).toBeNull();
    expect(baseLabel("quinoa")).toBe("Quinoa/Couscous");
  });

  it("zählen, sortieren, migrieren", () => {
    const counts = bumpBase(bumpBase(EMPTY_BASES, "reis"), null);
    expect(counts.reis).toBe(1);
    expect(sortedBases(counts)[0].id).toBe("reis");
    expect(sortedBases(EMPTY_BASES).map((b) => b.id)).toEqual(["kartoffeln", "reis", "nudeln", "quinoa", "brot", "salat"]);
    expect(migrateBases({ reis: 2.6, nudeln: -1, brot: 5000, salat: "3" })).toEqual({ ...EMPTY_BASES, reis: 3, brot: 999 });
    expect(migrateBases(null)).toEqual(EMPTY_BASES);
  });
});

describe("Rezept erzählen", () => {
  it("Titel, Zutaten mit Mengen, Schritte, Minuten", () => {
    const r = parseSpokenRecipe("Pfannkuchen. Zutaten: 200 Gramm Mehl, drei Eier und 300 ml Milch. Zuerst alles verrühren, dann 15 Minuten ruhen lassen. Danach in der Pfanne backen.")!;
    expect(r.title).toBe("Pfannkuchen");
    expect(r.category).toBe("vegetarisch");
    expect(r.ingredients.map((i) => [i.amount, i.unit, i.name])).toEqual([
      [200, "g", "Mehl"],
      [3, "", "Eier"],
      [300, "ml", "Milch"],
    ]);
    expect(r.steps).toEqual(["Alles verrühren.", "15 Minuten ruhen lassen.", "In der Pfanne backen."]);
    expect(r.prepMinutes).toBe(15);
  });

  it("„Für X braucht man …“ und Kategorie aus dem Titel", () => {
    const r = parseSpokenRecipe("Für Lachsnudeln braucht man Nudeln und Lachs. Dann alles kochen")!;
    expect(r.title).toBe("Lachsnudeln");
    expect(r.category).toBe("fisch");
    expect(r.ingredients.map((i) => i.name)).toEqual(["Nudeln", "Lachs"]);
    expect(r.steps).toEqual(["Alles kochen."]);
    expect(r.prepMinutes).toBeNull();
  });

  it("ohne Trennzeichen: erste Wörter als Titel; leer → null", () => {
    const r = parseSpokenRecipe("Rezept für Omas Suppe: Kartoffeln, Lauch")!;
    expect(r.title).toBe("Omas Suppe");
    expect(r.ingredients.map((i) => i.name)).toEqual(["Kartoffeln", "Lauch"]);
    expect(parseSpokenRecipe("Mehl Eier Milch Zucker Salz")?.title).toBe("Mehl Eier Milch Zucker");
    expect(parseSpokenRecipe("   ")).toBeNull();
    expect(parseSpokenRecipe("Hallo: x")).toBeNull();
  });
});

describe("Backstube", () => {
  it("eingebaute Rezepte sind Backrezepte mit fester ID", () => {
    expect(BUILTIN_BAKING.length).toBeGreaterThanOrEqual(20);
    expect(BUILTIN_BAKING.every((r) => r.kind === "backen" && isBuiltin(r.id))).toBe(true);
    expect(findRecipe({}, "b:apfelkuchen")?.title).toBe("Versunkener Apfelkuchen");
    expect(findRecipe({ x: rezept("Eigen", [], { id: "x" }) }, "x")?.title).toBe("Eigen");
    expect(findRecipe({}, "gibtsnicht")).toBeUndefined();
    // Beispiel-Rezepte („d:…“) sind lesbar, liegen aber nie im Kochbuch
    expect(isDemoRecipe("d:pasta-burrata")).toBe(true);
    expect(findRecipe({}, "d:pasta-burrata")?.title).toBe(demoRecipe("d:pasta-burrata")?.title);
    expect(demoLook("d:pasta-burrata")?.emoji).toBeTruthy();
    expect(demoLook("gibtsnicht")).toBeNull();
  });

  it("ins eigene Kochbuch übernehmen", () => {
    const id = adoptBuiltin(findRecipe({}, "b:apfelkuchen")!);
    expect(isBuiltin(id)).toBe(false);
    expect(stored()[id]).toMatchObject({ title: "Versunkener Apfelkuchen", kind: "backen" });
  });

  it("Backwünsche: nach Name, mit Kindern die kinderleichten zuerst, sonst schnellste", () => {
    expect(bakingIdeas("Können wir einen Apfelkuchen backen?", false)[0].id).toBe("b:apfelkuchen");
    const kids = bakingIdeas("Was kann ich mit den Kindern backen?", false);
    expect(kids).toHaveLength(3);
    expect(kids.every((r) => KID_FRIENDLY.has(r.id))).toBe(true);
    const fast = bakingIdeas("backen", false);
    expect((fast[0].prepMinutes ?? 0) <= (fast[2].prepMinutes ?? 0)).toBe(true);
    expect(isBakingRequest("Wollen wir Muffins machen?")).toBe(true);
    expect(isBakingRequest("Mach ein Backup")).toBe(false);
    expect(isBakingRequest("Was gibt's heute?")).toBe(false);
  });

  it("Zeiten, Backofen und Kinder reihum", () => {
    expect(stepMinutes("30 Minuten ruhen lassen")).toBe(30);
    expect(stepMinutes("1,5 Stunden gehen lassen")).toBe(90);
    expect(stepMinutes("10–12 Min. backen")).toBe(10);
    expect(stepMinutes("Rühren")).toBeNull();
    expect(ovenText({ mode: "umluft", temp: 160, minutes: 25 })).toBe("160 °C Umluft · 25 Min.");
    expect(ovenText({ mode: "ober-unter", temp: 180, minutes: 40 })).toBe("180 °C Ober-/Unterhitze · 40 Min.");
    expect([0, 1, 2].map((n) => kidStepLabel(["Ella", "Mathis"], n))).toEqual(["Ella", "Mathis", "Ella"]);
  });
});
