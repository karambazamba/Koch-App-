// Einkaufsliste aufgeräumt + Mia merkt sich den Laden (Tafel 88/89):
// Gruppen „Alle“ nach Laden bzw. Laufweg, Grundsachen-Karte, feste Regeln
// (setzen, löschen, ähnliche Namen, von Hand umstellen), Lernen nach 2×
// Abhaken, „Was kauf ich wo?“, Werkzeug und Prüfstand.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListItem, ShoppingListStore } from "@/lib/einkauf/listModel";
import { grundsachen } from "@/lib/einkauf/kacheln/gruppen";
import { isShopOverviewQuestion, parseShopRule, shopForItem, shopOverview, shopRuleReply } from "@/lib/einkauf/shopRules";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { kontext, letzte, rufe } from "../begleitung/werkzeugKontext";
import { at, fakeWindow } from "../helpers";

const KEY = "wasgibts.einkaufsliste";
let w: ReturnType<typeof fakeWindow>;
const saved = () => JSON.parse(w.localStorage.getItem(KEY)!) as ShoppingListStore;
const item = (name: string, shop = "", section: ListItem["section"] = "sonstiges", extra: Partial<ListItem> = {}): ListItem => ({ key: name, name, originalName: name, amount: "", section, dishes: [], days: [], shop, checked: false, hidden: false, ...extra });

beforeEach(() => {
  at("2026-10-20T08:00");
  vi.resetModules();
  w = fakeWindow();
});

describe("Liste aufgeräumt", () => {
  it("Karten nach Laden in der Reihenfolge von „Meine Läden“, andere danach (Einkauf neu)", async () => {
    const { ladenKarten } = await import("@/lib/einkauf/seite/karten");
    const k = ladenKarten([item("Milch", "Rewe"), item("Brot"), item("Äpfel", "Edeka"), item("Seife", "Rossmann"), item("Käse", "edeka")], ["Edeka", "Rewe"]);
    expect(k.map((x) => [x.shop, x.items.length])).toEqual([["Edeka", 2], ["Rewe", 1], ["Rossmann", 1]]);
  });

  it("Grundsachen aus Rezepten stehen nicht herum (unter Aussuchen · Für eure Woche), selbst Eingetragenes und „immer auf die Liste“ nicht", () => {
    const r = grundsachen([item("Salz"), item("Pfeffer", "", "vorrat", { manualId: "m1" }), item("Mehl"), item("Tomaten")], ["mehl"]);
    expect(r.karte.map((i) => i.name)).toEqual(["Salz"]);
    expect(r.liste.map((i) => i.name)).toEqual(["Pfeffer", "Mehl", "Tomaten"]);
  });

  it("Bug: Beispiel-Einkauf fragt beim Vorrendern nicht nach „heute“ (Build brach ab)", () => {
    expect(readFileSync("src/components/einkauf/EinkaufBeispiel.tsx", "utf8")).toMatch(/if \(!demo \|\| !demoTiles\(demo, todayIso\(\)\)/);
  });

  it("Kacheln: drei Spalten, Silbentrennung statt abgeschnittener Namen", () => {
    const tile = readFileSync("src/components/einkauf/kacheln/ItemTile.tsx", "utf8");
    expect(tile).toMatch(/hyphens-auto/);
    expect(readFileSync("src/app/layout.tsx", "utf8")).toMatch(/lang="de"/);
  });
});

describe("Mia merkt sich den Laden", () => {
  it("Sätze erkennen: setzen, löschen, keine Personen", () => {
    expect(parseShopRule("Tomaten kaufe ich immer bei Rewe")).toEqual({ item: "Tomaten", shop: "Rewe" });
    expect(parseShopRule("Butter immer bei Lidl")).toEqual({ item: "Butter", shop: "Lidl" });
    expect(parseShopRule("Shampoo nur bei Rossmann.")).toEqual({ item: "Shampoo", shop: "Rossmann" });
    expect(parseShopRule("Tomaten nicht mehr bei Rewe")).toEqual({ item: "Tomaten", shop: "" });
    expect(parseShopRule("Milch egal wo")).toEqual({ item: "Milch", shop: "" });
    expect(parseShopRule("Mathis ist immer bei Oma")).toBeNull();
    expect(shopRuleReply("tomaten", "Rewe")).toBe("Merk ich mir. Tomaten → Rewe.");
    expect(shopRuleReply("Milch", "")).toBe("Gut, Milch egal wo.");
  });

  it("Regel gilt überall, ähnliche Namen nur eindeutig, Löschen nimmt sie weg", async () => {
    const { setShopRule, removeShopRule } = await import("@/lib/einkauf/shopRules");
    setShopRule("Tomaten", "Rewe");
    const s = saved();
    expect(s.shopRules).toEqual({ tomaten: "Rewe" });
    expect(s.myShops).toContain("Rewe");
    expect(shopForItem("Cherrytomaten", s)).toBe("Rewe");
    expect(shopForItem("passierte Tomaten", s)).toBe("Rewe");
    expect(shopForItem("Tomaten", { ...s, shopRules: { tomaten: "Rewe", "passierte tomaten": "Lidl" } })).toBe("Rewe");
    expect(shopForItem("Cherrytomaten", { itemShops: {}, shopRules: { tomaten: "Rewe", cherrytomaten: "Lidl" } })).toBe("Lidl");
    removeShopRule("Tomaten");
    expect(saved().shopRules).toEqual({});
  });

  it("Regel greift beim Wochenplan: Zutaten landen im richtigen Laden", async () => {
    const { buildShoppingList } = await import("@/lib/einkauf/buildList");
    const week = { days: [{ weekday: "Montag", away: false, slot: { entry: { recipeId: "r1", title: "Nudeln", stored: { kind: "recipe" }, double: false } } }] };
    const recipes = { r1: { id: "r1", title: "Nudeln", ingredients: [{ name: "Tomaten", amount: 2, unit: "" }] } };
    const list = buildShoppingList(week as never, recipes as never, undefined, { products: {}, itemShops: {}, shopRules: { tomaten: "Rewe" } });
    const tomaten = list.items.find((i) => i.name === "Tomaten");
    expect(tomaten?.shop).toBe("Rewe");
  });

  it("Bug: von Hand umgestellt gewinnt – die Regel zieht mit", async () => {
    const { setShopRule } = await import("@/lib/einkauf/shopRules");
    const { setItemShop } = await import("@/lib/einkauf/shops");
    setShopRule("Butter", "Lidl");
    setItemShop("Butter", "Aldi");
    expect(shopForItem("Butter", saved())).toBe("Aldi");
    expect(saved().shopRules).toEqual({ butter: "Aldi" });
  });

  it("Lernen: zweimal hintereinander im selben Laden → still gemerkt, einmal fragen", async () => {
    const { noteShopCheck } = await import("@/lib/einkauf/shopRules");
    expect(noteShopCheck("Butter", "Lidl")).toBeNull();
    expect(saved().itemShops.butter).toBeUndefined();
    expect(noteShopCheck("Butter", "Lidl")).toBe("frage");
    expect(saved().itemShops.butter).toBe("Lidl");
    expect(noteShopCheck("Butter", "Lidl")).toBeNull();
    // Anderer Laden zählt neu
    expect(noteShopCheck("Käse", "Edeka")).toBeNull();
    expect(noteShopCheck("Käse", "Rewe")).toBeNull();
    expect(saved().itemShops["käse"]).toBeUndefined();
  });

  it("„Was kauf ich wo?“ – Übersicht je Laden", () => {
    expect(isShopOverviewQuestion("Was kauf ich wo?")).toBe(true);
    expect(isShopOverviewQuestion("Welche Läden hab ich?")).toBe(true);
    expect(isShopOverviewQuestion("Was kaufe ich morgen?")).toBe(false);
    expect(shopOverview({ tomaten: "Rewe", butter: "Lidl", gurken: "rewe" }, ["Rewe", "Lidl"])).toBe("Rewe: Gurken, Tomaten\nLidl: Butter");
    expect(shopOverview({}, [])).toMatch(/Noch keine Läden/);
  });

  it("Werkzeug laden_regel und laeden_anzeigen, Prüfstand mit ≥ 5 Regel-Sätzen", () => {
    const ctx = kontext({ laeden: { regeln: { tomaten: "Rewe" }, meine: ["Rewe"] } });
    expect(rufe(ctx, "laden_regel", { artikel: "Butter", laden: "Lidl" }).content).toContain("Merk ich mir. Butter → Lidl.");
    expect(letzte(ctx)).toMatchObject({ type: "set_shop_rule", name: "Butter", shop: "Lidl" });
    expect(rufe(ctx, "laden_regel", { artikel: "", laden: "Lidl" }).isError).toBe(true);
    expect(rufe(ctx, "laeden_anzeigen", {}).content).toContain("Rewe: Tomaten");
    expect(PRUEFSAETZE.filter((s) => s.ops.includes("set_shop_rule")).length).toBeGreaterThanOrEqual(5);
  });
});
