// Nachtrag A-018, Punkt 3 und 4: Doppeltes zusammenfassen (gleiche Sache im
// selben Laden = ein Eintrag, Mengen addiert, rückwirkend per Migration,
// Familien-Abgleich ohne Doppel-Löschungen) und Rezeptmengen als
// Einkaufsmengen (Packung, Rezeptmenge nur als Hinweis, eigene Mengen bleiben).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aufnehmen, gleicheSache, mengenAddieren, normalform, zielFuer } from "@/lib/einkauf/zusammen/zusammen";
import { alsEinkauf, einkaufsMenge, packungAus, packungFuer, rezeptHinweis } from "@/lib/einkauf/zusammen/packung";
import { migrateStore } from "@/lib/einkauf/listMigration";
import { buildShoppingList } from "@/lib/einkauf/buildList";
import { applyOps, type AssistantData } from "@/lib/begleitung/ops";
import { ADAPTERS } from "@/lib/konten/sync/docs";
import type { ManualItem, ShoppingListStore, WeekList } from "@/lib/einkauf/listModel";
import type { Recipe } from "@/lib/essen/cookbook";
import type { PlanDay, PlanWeek, ResolvedEntry } from "@/lib/essen/mealPlan";
import { at, atFresh, fakeWindow } from "../helpers";

const W = "2026-10-19";
const KEY = "wasgibts.einkaufsliste";
const m = (id: string, name: string, amount = "", extra: Partial<ManualItem> = {}): ManualItem => ({ id, name, amount, section: "obst-gemuese", done: false, ...extra });
const v6 = (manual: ManualItem[], extra: Partial<ShoppingListStore> = {}) => ({ version: 6, weeks: { [W]: { manual, checked: [], have: [] } }, products: {}, shops: [], itemShops: {}, staples: [], myShops: ["Rewe", "Edeka"], shopsAsked: true, shopRules: {}, learned: {}, learnAsked: [], alwaysList: [], ...extra });

let w: ReturnType<typeof fakeWindow>;
const saved = () => JSON.parse(w.localStorage.getItem(KEY)!) as ShoppingListStore;
beforeEach(async () => {
  at("2026-10-20T08:00");
  vi.resetModules();
  await atFresh("2026-10-20T08:00");
  w = fakeWindow();
});

describe("Gleiche Sache", () => {
  it("Normalform: Groß/klein, Einzahl/Mehrzahl, Umlaute – aber nicht zu großzügig", () => {
    expect(normalform("Zucchinis")).toBe(normalform("zucchini"));
    expect(gleicheSache("Tomaten", "Tomate")).toBe(true);
    expect(gleicheSache("Äpfel", "Apfel")).toBe(true);
    expect(gleicheSache("Eier", "Ei")).toBe(true);
    expect(gleicheSache(" MILCH ", "Milch")).toBe(true);
    expect(gleicheSache("Milch", "Hafermilch")).toBe(false);
    expect(gleicheSache("Tomaten", "passierte Tomaten")).toBe(false);
    expect(gleicheSache("", "")).toBe(false);
  });

  it("Mengen: gleiche Einheiten addiert, sonst beide Angaben (nichts verlieren)", () => {
    expect(mengenAddieren("500 g", "250 g")).toBe("750 g");
    expect(mengenAddieren("2", "1")).toBe("3");
    expect(mengenAddieren("800 g", "0,5 kg")).toBe("1,3 kg");
    expect(mengenAddieren("1 l", "500 ml")).toBe("1,5 l");
    expect(mengenAddieren("500 g", "1 Packung")).toBe("500 g + 1 Packung");
    expect(mengenAddieren("500 g + 1 Packung", "1 Packung")).toBe("500 g + 2 Packungen");
    expect(mengenAddieren("2 Dosen", "1 Dose")).toBe("3 Dosen");
    expect(mengenAddieren("etwas", "2")).toBe("etwas + 2");
    // hat nur eine Seite eine Menge, bleibt diese
    expect(mengenAddieren("", "2")).toBe("2");
    expect(mengenAddieren("300 g", "")).toBe("300 g");
    expect(mengenAddieren("", "")).toBe("");
  });

  it("nur offene Artikel im selben Laden; „Jetzt mitnehmen“ bleibt", () => {
    const laden = (n: string) => (gleicheSache(n, "Zucchini") ? "Rewe" : null);
    const list = [m("a", "Zucchini", "", { done: true }), m("b", "Zucchini", "1")];
    expect(zielFuer(list, "zucchinis", laden)?.id).toBe("b");
    expect(zielFuer(list, "Gurke", laden)).toBeUndefined();
    expect(zielFuer([m("c", "Zucchini")], "Zucchinis", (n) => (n === "Zucchini" ? "Rewe" : "Edeka"))).toBeUndefined();
    expect(aufnehmen(m("b", "Zucchini", "1"), { amount: "2", now: true })).toMatchObject({ id: "b", amount: "3", now: true });
  });
});

describe("Beim Hinzufügen (Tippen, Rezept, Mia)", () => {
  it("„Zucchini“ zweimal = ein Eintrag; Rückgängig nimmt nur das Dazugekommene", async () => {
    const { addManualItem, removeManualItems, removeManualItem } = await import("@/lib/einkauf/listEdits");
    const a = addManualItem(W, { name: "Zucchini", amount: "2", section: "obst-gemuese" });
    const b = addManualItem(W, { name: "zucchinis", amount: "1", section: "obst-gemuese" });
    expect(saved().weeks[W].manual).toEqual([expect.objectContaining({ id: a, name: "Zucchini", amount: "3" })]);
    removeManualItems(W, [b]);
    expect(saved().weeks[W].manual).toEqual([expect.objectContaining({ id: a, amount: "2" })]);
    // einzeln löschen (Fenster) samt Rückgängig
    const c = addManualItem(W, { name: "Zucchini", amount: "", section: "obst-gemuese" });
    const undo = removeManualItem(W, c);
    expect(saved().weeks[W].manual).toHaveLength(1);
    undo();
    expect(saved().weeks[W].manual).toEqual([expect.objectContaining({ id: a, amount: "2" })]);
  });

  it("abgehakt (schon gekauft) oder anderer Laden = eigener Eintrag", async () => {
    const { addManualItem, toggleChecked } = await import("@/lib/einkauf/listEdits");
    const { setItemShop } = await import("@/lib/einkauf/shops");
    const id = addManualItem(W, { name: "Milch", amount: "", section: "kuehlregal" });
    toggleChecked(W, { key: `m:${id}`, name: "Milch", originalName: "Milch", amount: "", section: "kuehlregal", dishes: [], days: [], shop: "", checked: false, hidden: false, manualId: id });
    addManualItem(W, { name: "Milch", amount: "", section: "kuehlregal" });
    expect(saved().weeks[W].manual).toHaveLength(2);
    setItemShop("Tomaten", "Rewe");
    setItemShop("Tomate", "Edeka");
    addManualItem(W, { name: "Tomaten", amount: "", section: "obst-gemuese" });
    addManualItem(W, { name: "Tomate", amount: "", section: "obst-gemuese" });
    expect(saved().weeks[W].manual.filter((x) => gleicheSache(x.name, "Tomate"))).toHaveLength(2);
  });

  it("Mia (add_shopping): dieselbe Sache kommt dazu, Mengen addiert", () => {
    const data = { shopping: { [W]: { manual: [m("x", "Zucchini", "2")], checked: [], have: [] } } } as unknown as AssistantData;
    const out = applyOps(data, [{ id: "op1", type: "add_shopping", weekStart: W, name: "Zucchini", amount: "1", section: "obst-gemuese" }]).data;
    expect(out.shopping[W].manual).toEqual([expect.objectContaining({ id: "x", amount: "3" })]);
  });
});

describe("Rückwirkend: Migration v6 → v7", () => {
  it("doppelte offene Artikel werden eins, nichts geht verloren (Mengen, Erledigtes bleibt)", () => {
    const old = v6([m("b2", "Zucchini", "1"), m("a1", "Zucchini", "2"), m("c3", "zucchinis"), m("d4", "Zucchini", "", { done: true }), m("e5", "Milch", "1 l")]);
    const neu = migrateStore(old)!;
    expect(neu.version).toBe(8);
    // die kleinste Kennung bleibt (alle Geräte im Haushalt entscheiden gleich)
    expect(neu.weeks[W].manual).toEqual([m("a1", "Zucchini", "3"), m("d4", "Zucchini", "", { done: true }), m("e5", "Milch", "1 l")]);
    // v8 bleibt beim Laden, wie es ist
    expect(migrateStore(neu)).toEqual(neu);
  });

  it("verschiedene Läden bleiben getrennt", () => {
    const old = v6([m("a", "Tomaten"), m("b", "Tomate")], { itemShops: { tomaten: "Rewe", tomate: "Edeka" } });
    expect(migrateStore(old)!.weeks[W].manual).toHaveLength(2);
  });

  it("über den Speicher: einmal zurückgeschrieben; Familien-Abgleich ohne Doppel-Löschung", async () => {
    w.localStorage.setItem(KEY, JSON.stringify(v6([m("a", "Zucchini", "1"), m("b", "Zucchini", "1")])));
    const { store } = await import("@/lib/einkauf/listStore");
    expect(store.load()!.weeks[W].manual).toHaveLength(1);
    expect(saved().version).toBe(8);
    // Abgleich: der zusammengeführte Eintrag bleibt, der andere fehlt (→ Lösch-Markierung), nichts doppelt
    const adapter = ADAPTERS.find((a) => a.name === "einkauf")!;
    const docs = adapter.toDocs(saved() as unknown as Record<string, unknown>);
    expect(docs.filter((d) => d.typ === "einkauf").map((d) => d.id)).toEqual([`ek:${W}:a`]);
    // ein älterer Stand vom Partner wird beim Abgleich genauso zusammengefasst
    const up = adapter.upgrade!(v6([m("a", "Zucchini", "1"), m("b", "Zucchini", "1")]) as unknown as Record<string, unknown>) as unknown as ShoppingListStore;
    expect(up.version).toBe(8);
    expect(up.weeks[W].manual).toEqual([m("a", "Zucchini", "2")]);
    expect(adapter.upgrade!(saved() as unknown as Record<string, unknown>)).toBeNull();
  });

  it("„Einkauf fertig“ (fertig) und Rezeptmenge bleiben beim Laden und im Abgleich", () => {
    const old = { ...v6([m("a", "Milch", "", { rezeptMenge: "250 ml", dish: "Pfannkuchen" })]), version: 7 };
    old.weeks[W] = { ...old.weeks[W], fertig: ["m:a"] } as WeekList & { manual: ManualItem[] };
    const neu = migrateStore(old)!;
    expect(neu.weeks[W].fertig).toEqual(["m:a"]);
    expect(neu.weeks[W].manual[0].rezeptMenge).toBe("250 ml");
    const adapter = ADAPTERS.find((a) => a.name === "einkauf")!;
    const back = adapter.fromDocs(adapter.toDocs(neu as unknown as Record<string, unknown>), null) as unknown as ShoppingListStore;
    expect(back.weeks[W].fertig).toEqual(["m:a"]);
    expect(back.weeks[W].manual[0].rezeptMenge).toBe("250 ml");
  });
});

// --- Punkt 4 ------------------------------------------------------------------

const recipe = (id: string, title: string, ingredients: [number | null, string, string][]) =>
  ({ id, title, servings: 4, kind: "kochen", ingredients: ingredients.map(([amount, unit, name], i) => ({ id: `${id}${i}`, amount, unit, name })) }) as unknown as Recipe;
const entry = (title: string, recipeId: string): ResolvedEntry => ({ origin: "eigen", stored: { kind: "recipe", recipeId, title, category: "fleisch" }, title, category: null, recipeId, double: false });
const day = (weekday: string, e: ResolvedEntry): PlanDay =>
  ({ weekday, date: W, away: false, cheat: false, slot: { key: weekday, entry: e, hint: null, hasDerived: false }, mealTime: "abends", persons: 4, note: "", leftovers: null, paused: false, weekend: null }) as PlanDay;
const week = (days: PlanDay[]): PlanWeek => ({ weekStart: W, days, hasPlanRules: false, planned: 0, total: 7, counts: { fleisch: { planned: 0, target: 0 }, vegetarisch: { planned: 0, target: 0 }, fisch: { planned: 0, target: 0 } } });
const RECIPES = {
  lasagne: recipe("lasagne", "Lasagne", [[250, "ml", "Milch"], [2, "Stück", "Lasagneplatten"], [20, "g", "Parmesan"], [500, "g", "Hackfleisch"], [1, "TL", "Salz"], [2, "", "Zucchini"]]),
  gemuese: recipe("gemuese", "Gemüsepfanne", [[1, "", "Zucchinis"], [4, "", "Eier"]]),
};

describe("Rezeptmengen als Einkaufsmengen", () => {
  it("Packungen: Milch 250 ml → „Milch“, Lasagneplatten 2 Stück → 1 Packung, Parmesan 20 g → „Parmesan“", () => {
    expect(einkaufsMenge("Milch", 250, "ml")).toBe("");
    expect(einkaufsMenge("Milch", 1500, "ml")).toBe("2 l");
    expect(einkaufsMenge("Lasagneplatten", 2, "Stück")).toBe("1 Packung");
    expect(einkaufsMenge("Lasagneplatten", 250, "g")).toBe("1 Packung");
    expect(einkaufsMenge("Parmesan", 20, "g")).toBe("");
    expect(einkaufsMenge("Sahne", 400, "ml")).toBe("2 Becher");
    expect(einkaufsMenge("Butter", 40, "g")).toBe("");
    expect(einkaufsMenge("Spaghetti", 750, "g")).toBe("2 Packungen");
    expect(einkaufsMenge("Eier", 4, "")).toBe("6 Stück");
    expect(einkaufsMenge("Eier", 8, "Stück")).toBe("10 Stück");
    expect(einkaufsMenge("Kokosmilch", 400, "ml")).toBe("1 Dose");
    // Krümel: Löffel, Prisen, unter 50 g
    expect(einkaufsMenge("Paprikapulver", 2, "EL")).toBe("");
    expect(einkaufsMenge("Petersilie", 10, "g")).toBe("");
    expect(einkaufsMenge("Petersilie", 1, "Bund")).toBe("");
    // ohne Tabelle: wie im Rezept
    expect(einkaufsMenge("Hackfleisch", 500, "g")).toBe("500 g");
    expect(einkaufsMenge("Zucchini", 2, "")).toBe("2");
    expect(einkaufsMenge("gehackte Tomaten", 2, "Dosen")).toBe("2 Dosen");
  });

  it("Liste aus dem Plan: nie eine Rezeptmenge als Menge (A-040), Packung nur als Vorschlag, Rezeptmenge als Hinweis im Fenster; gleiche Zutat eins", () => {
    const list = buildShoppingList(week([day("Montag", entry("Lasagne", "lasagne")), day("Dienstag", entry("Gemüsepfanne", "gemuese"))]), RECIPES);
    const find = (n: string) => list.items.find((i) => i.name === n);
    expect(find("Milch")).toMatchObject({ amount: "", hinweis: "250 ml für Lasagne" });
    expect(find("Milch")?.packung).toBeUndefined();
    expect(find("Lasagneplatten")).toMatchObject({ amount: "", packung: "1 Packung", hinweis: "2 Stück für Lasagne" });
    expect(find("Parmesan")).toMatchObject({ amount: "", hinweis: "20 g für Lasagne" });
    expect(find("Hackfleisch")).toMatchObject({ amount: "", packung: "500 g", hinweis: "500 g für Lasagne" });
    expect(find("Salz")?.amount).toBe("");
    // „Zucchini“ (Lasagne) und „Zucchinis“ (Pfanne) = eine Zeile
    const zucchini = list.items.filter((i) => gleicheSache(i.name, "Zucchini"));
    expect(zucchini).toHaveLength(1);
    expect(zucchini[0]).toMatchObject({ amount: "", packung: "3", hinweis: "3 Stück für Lasagne, Gemüsepfanne" });
    expect(list.items.every((i) => i.amount === "")).toBe(true);
  });

  it("eigener Artikel kommt zur Rezept-Zutat dazu (eine Zeile, abhaken gilt für beide); eigene Mengen nie geändert", async () => {
    const list = buildShoppingList(week([day("Montag", entry("Lasagne", "lasagne"))]), RECIPES, { manual: [m("u", "Zucchini", "1"), m("v", "Milch", "250 ml", { section: "kuehlregal" })], checked: [], have: [] });
    const zucchini = list.items.filter((i) => gleicheSache(i.name, "Zucchini"));
    expect(zucchini).toHaveLength(1);
    // nur die selbst gesagte Menge zählt (A-040)
    expect(zucchini[0]).toMatchObject({ amount: "1", teile: ["u"] });
    // die eigene Milch-Menge bleibt „250 ml“ (die Rezept-Milch hat keine Hauptmenge)
    expect(list.items.find((i) => i.name === "Milch")?.amount).toBe("250 ml");
    const { toggleChecked } = await import("@/lib/einkauf/listEdits");
    w.localStorage.setItem(KEY, JSON.stringify({ ...v6([m("u", "Zucchini", "1")]), version: 7 }));
    toggleChecked(W, zucchini[0]);
    expect(saved().weeks[W].checked).toEqual([zucchini[0].key]);
    expect(saved().weeks[W].manual[0].done).toBe(true);
    // Eigener Artikel ohne Rezept: Menge genau wie eingegeben, kein Hinweis
    const own = buildShoppingList(week([]), {}, { manual: [m("o", "Milch", "250 ml")], checked: [], have: [] }).items[0];
    expect(own).toMatchObject({ amount: "250 ml" });
    expect(own.hinweis).toBeUndefined();
  });

  it("Rezept-Link und Kochidee: keine Menge (A-040), Rezeptmenge als Hinweis, Packung als Vorschlag", async () => {
    expect(alsEinkauf("Milch", 250, "ml")).toEqual({ amount: "", rezeptMenge: "250 ml" });
    expect(alsEinkauf("Lasagneplatten", 2, "Stück")).toEqual({ amount: "", rezeptMenge: "2 Stück" });
    expect(alsEinkauf("Mehl", 0.5, "kg")).toEqual({ amount: "", rezeptMenge: "0,5 kg" });
    expect(alsEinkauf("Hackfleisch", 500, "g")).toEqual({ amount: "", rezeptMenge: "500 g" });
    expect(packungFuer("Lasagneplatten", 2, "Stück")).toBe("1 Packung");
    expect(packungAus("Mehl", "0,5 kg")).toBe("");
    expect(packungAus("Sahne", "400 ml")).toBe("2 Becher");
    expect(alsEinkauf("Salz", null, "")).toEqual({ amount: "" });
    expect(rezeptHinweis("250 ml", ["Lasagne (Mi) ×2"])).toBe("250 ml für Lasagne");
    const { linkAufDieListe } = await import("@/lib/essen/rezeptLink/uebernehmen");
    linkAufDieListe({ title: "Lasagne", url: "https://example.org", servings: 4, ingredients: [] } as never, [{ amount: 250, unit: "ml", name: "Milch" }, { amount: 20, unit: "g", name: "Parmesan" }], W);
    expect(saved().weeks[W].manual.map((x) => [x.name, x.amount, x.rezeptMenge])).toEqual([["Milch", "", "250 ml"], ["Parmesan", "", "20 g"]]);
    const list = buildShoppingList(week([]), {}, saved().weeks[W]);
    expect(list.items.find((i) => i.name === "Milch")?.hinweis).toBe("250 ml für Lasagne");
  });
});
