// Einkaufsliste ändern (listEdits.ts), Läden (shops.ts), Speicher
// (listStore.ts) und Migration v1–v4 (listMigration.ts).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListItem, ShoppingListStore } from "@/lib/einkauf/listModel";
import { basicsToStaples, migrateStore } from "@/lib/einkauf/listMigration";
import { at, fakeWindow } from "../helpers";

const W = "2026-10-19";
const KEY = "wasgibts.einkaufsliste";

let w: ReturnType<typeof fakeWindow>;
const saved = () => JSON.parse(w.localStorage.getItem(KEY)!) as ShoppingListStore;
const item = (over: Partial<ListItem>): ListItem => ({ key: "milch|", name: "Milch", originalName: "Milch", amount: "", section: "kuehlregal", dishes: [], days: [], shop: "", checked: false, hidden: false, ...over });

beforeEach(async () => {
  at("2026-10-20T08:00");
  vi.resetModules();
  w = fakeWindow();
});

const edits = () => import("@/lib/einkauf/listEdits");

describe("Wochenliste ändern", () => {
  it("abhaken (Rezept- und eigene Artikel) – die Stammliste lernt den Kauf", async () => {
    const { addManualItem, toggleChecked } = await edits();
    const id = addManualItem(W, { name: "Butter", amount: "1", section: "kuehlregal" });
    toggleChecked(W, item({ key: "nudeln|g", name: "Nudeln" }), "2026-10-20");
    toggleChecked(W, item({ key: `m:${id}`, name: "Butter", manualId: id, amount: "1" }), "2026-10-20");
    let s = saved();
    expect(s.weeks[W].checked).toEqual(["nudeln|g"]);
    expect(s.weeks[W].manual[0].done).toBe(true);
    expect(s.staples.find((st) => st.name === "Nudeln")).toMatchObject({ purchases: ["2026-10-20"], amount: "", intervalDays: null });
    expect(s.staples.find((st) => st.name === "Butter")).toMatchObject({ purchases: ["2026-10-20"], intervalDays: 7 });
    // zurücknehmen: Häkchen weg, heutiger Kauf weg
    toggleChecked(W, item({ key: "nudeln|g", name: "Nudeln", checked: true }), "2026-10-20");
    s = saved();
    expect(s.weeks[W].checked).toEqual([]);
    expect(s.staples.find((st) => st.name === "Nudeln")?.purchases).toEqual([]);
    // ohne Tag: nichts gelernt
    toggleChecked(W, item({ key: "x|", name: "Neu" }));
    expect(saved().staples.some((st) => st.name === "Neu")).toBe(false);
  });

  it("haben wir schon, ändern, entfernen", async () => {
    const { addManualItem, removeManualItem, removeManualItems, setHave, updateManualItem } = await edits();
    setHave(W, "salz|", true);
    setHave(W, "salz|", true);
    expect(saved().weeks[W].have).toEqual(["salz|"]);
    setHave(W, "salz|", false);
    expect(saved().weeks[W].have).toEqual([]);
    const a = addManualItem(W, { name: "Brot", amount: "", section: "brot" });
    const b = addManualItem(W, { name: "Eier", amount: "6", section: "kuehlregal" });
    const c = addManualItem(W, { name: "Saft", amount: "", section: "getraenke" });
    updateManualItem(W, a, { amount: "2" });
    expect(saved().weeks[W].manual[0].amount).toBe("2");
    removeManualItem(W, a);
    removeManualItems(W, [b, c]);
    expect(saved().weeks[W].manual).toEqual([]);
  });

  it("spontan: offene eigene Artikel früherer Wochen wandern mit", async () => {
    const { addManualItem, carryOverManual, toggleChecked } = await edits();
    carryOverManual(W); // ohne Speicher nichts
    const alt = addManualItem("2026-10-05", { name: "Kerzen", amount: "", section: "sonstiges", day: "Montag" });
    const fertig = addManualItem("2026-10-05", { name: "Milch", amount: "", section: "kuehlregal" });
    toggleChecked("2026-10-05", item({ key: `m:${fertig}`, manualId: fertig }));
    addManualItem(W, { name: "Brot", amount: "", section: "brot" });
    carryOverManual(W);
    const s = saved();
    expect(s.weeks["2026-10-05"].manual.map((m) => m.name)).toEqual(["Milch"]);
    expect(s.weeks[W].manual.map((m) => m.name)).toEqual(["Brot", "Kerzen"]);
    expect(s.weeks[W].manual[1].id).toBe(alt);
    expect(s.weeks[W].manual[1].day).toBeUndefined();
    carryOverManual(W); // nichts mehr zu tun
    expect(saved().weeks[W].manual).toHaveLength(2);
    carryOverManual("2026-10-26");
    expect(saved().weeks["2026-10-26"].manual.map((m) => m.name)).toEqual(["Brot", "Kerzen"]);
  });

  it("Stammartikel übernehmen oder diesmal nicht, Listen ersetzen", async () => {
    const { replaceShoppingLists, skipStaple, takeStaple } = await edits();
    const staple = basicsToStaples([{ id: "s1", name: "Milch", amount: "2" }])[0];
    takeStaple(W, staple);
    skipStaple(W, staple);
    expect(saved().weeks[W].manual[0]).toMatchObject({ name: "Milch", amount: "2", section: "kuehlregal" });
    expect(saved().weeks[W].skippedStaples).toEqual(["s1"]);
    replaceShoppingLists({});
    expect(saved().weeks).toEqual({});
  });

  it("eigene Produkte und Umbenennen (nur diesmal oder immer)", async () => {
    const { addManualItem, removeProduct, renameItem, setProduct } = await edits();
    setProduct(" ", "x");
    setProduct("Butter", " Alsan ");
    expect(saved().products).toEqual({ butter: "Alsan" });
    setProduct("Butter", "butter");
    expect(saved().products).toEqual({});
    setProduct("Butter", "Alsan");
    removeProduct("Butter");
    expect(saved().products).toEqual({});

    const tomaten = item({ key: "tomaten|g", name: "Tomaten", originalName: "Tomaten" });
    renameItem(W, tomaten, "  ", false);
    renameItem(W, tomaten, "Kirschtomaten", false);
    expect(saved().weeks[W].renamed).toEqual({ "tomaten|g": "Kirschtomaten" });
    renameItem(W, tomaten, "Rispentomaten", true);
    expect(saved().weeks[W].renamed).toEqual({});
    expect(saved().products.tomaten).toBe("Rispentomaten");

    const id = addManualItem(W, { name: "Sahne", amount: "", section: "kuehlregal" });
    const sahne = item({ key: `m:${id}`, name: "Sahne", originalName: "Sahne", manualId: id });
    renameItem(W, sahne, "Hafersahne", false);
    expect(saved().weeks[W].manual[0].name).toBe("Hafersahne");
    expect(saved().products.sahne).toBeUndefined();
    renameItem(W, sahne, "Sojasahne", true);
    expect(saved().products.sahne).toBe("Sojasahne");
  });
});

describe("Läden", () => {
  it("anlegen, Laden je Artikel merken, entfernen, sortieren", async () => {
    const { addShop, allShops, clearItemShop, removeShop, setItemShop } = await import("@/lib/einkauf/shops");
    addShop("  ");
    addShop("rewe");
    addShop("Biomarkt Sonnenblume");
    expect(saved().shops).toEqual(["Biomarkt Sonnenblume"]);
    setItemShop(" ", "Rewe");
    setItemShop("Müsli", "Rossmann");
    setItemShop("Tofu", "Asia Laden");
    expect(saved().itemShops).toEqual({ müsli: "Rossmann", tofu: "Asia Laden" });
    expect(saved().shops).toEqual(["Biomarkt Sonnenblume", "Asia Laden"]);
    // Leer = bewusst „Egal wo“ (bleibt gemerkt); vergessen = wieder „noch ohne Laden“
    setItemShop("Müsli", "");
    expect(saved().itemShops).toEqual({ müsli: "", tofu: "Asia Laden" });
    clearItemShop("Müsli");
    expect(saved().itemShops).toEqual({ tofu: "Asia Laden" });
    removeShop("Asia Laden");
    expect(saved().shops).toEqual(["Biomarkt Sonnenblume"]);
    expect(saved().itemShops).toEqual({});
    const order = allShops({ shops: ["Biomarkt", "lidl"], itemShops: { a: "Lidl", b: "lidl", c: "dm" } });
    expect(order.slice(0, 2)).toEqual(["Lidl", "dm"]);
    expect(order).toContain("Biomarkt");
    expect(order.filter((s) => s.toLowerCase() === "lidl")).toHaveLength(1);
    expect(allShops({ shops: [] })).toHaveLength(11);
  });

  it("Einstellungen ohne Hook: Standard ohne Speicher, sonst aus dem Speicher (gleiches Objekt)", async () => {
    const { loadShoppingSettings } = await import("@/lib/einkauf/listStore");
    expect(loadShoppingSettings().staples.map((s) => s.name)).toContain("Milch");
    const { addShop } = await import("@/lib/einkauf/shops");
    addShop("Markthalle");
    const a = loadShoppingSettings();
    expect(a.shops).toEqual(["Markthalle"]);
    expect(loadShoppingSettings()).toBe(a);
  });
});

describe("Migration – nie Daten verlieren", () => {
  it("v1 → Standard-Stammartikel; Unbekanntes → null", () => {
    expect(migrateStore(null)).toBeNull();
    expect(migrateStore({ version: 9, weeks: {} })).toBeNull();
    expect(migrateStore({ version: 3 })).toBeNull();
    const v1 = migrateStore({ version: 1 })!;
    expect(v1.staples.map((s) => s.name)).toEqual(["Brot", "Aufschnitt", "Käse", "Butter", "Milch", "Joghurt", "Obst"]);
    expect(v1.staples.every((s) => s.intervalDays === 7)).toBe(true);
  });

  it("v2/v3: ‚Immer da‘ wird Stammliste, abgehakte Basics bleiben als eigene Artikel", () => {
    const v3 = migrateStore({
      version: 3,
      basics: [{ id: "b1", name: "Hafermilch", amount: "2", active: false }, { id: "b2", name: " " }, null],
      weeks: {
        [W]: {
          manual: [{ id: "m1", name: "Kerzen", section: "quatsch", done: true, day: "Mo", now: true, dish: "Fest" }, { id: 3 }],
          checked: ["b:b1", "nudeln|g", 5],
          have: ["b:b1", "salz|"],
          renamed: { a: "B", c: 3 },
        },
        kaputt: null,
      },
    })!;
    expect(v3.version).toBe(8);
    expect(v3.staples).toEqual([{ id: "b1", name: "Hafermilch", amount: "2", section: "kuehlregal", purchases: [], intervalDays: 7, active: false }]);
    const wk = v3.weeks[W];
    expect(wk.checked).toEqual(["nudeln|g"]);
    expect(wk.have).toEqual(["salz|"]);
    expect(wk.renamed).toEqual({ a: "B" });
    expect(wk.manual[0]).toEqual({ id: "m1", name: "Kerzen", amount: "", section: "sonstiges", done: true, day: "Mo", now: true, dish: "Fest" });
    expect(wk.manual[1]).toMatchObject({ name: "Hafermilch", amount: "2", done: true });
    expect(v3.weeks.kaputt).toBeUndefined();
  });

  it("v2 ohne eigene Basics: Standardliste, Häkchen an Standard-Basics bleiben", () => {
    const v2 = migrateStore({ version: 2, weeks: { [W]: { checked: ["b:standard-milch", "b:unbekannt"], have: [] } } })!;
    expect(v2.staples).toHaveLength(7);
    expect(v2.weeks[W].manual.map((m) => m.name)).toEqual(["Milch"]);
  });

  it("v4: repariert Stammartikel, Produkte und Läden", () => {
    const v4 = migrateStore({
      version: 4,
      weeks: { [W]: { manual: [], checked: [], have: [], skippedStaples: ["s1", 2] } },
      products: { butter: "Alsan", x: 1 },
      shops: ["Markt", 2],
      itemShops: { müsli: "dm" },
      staples: [
        { id: "s1", name: "Milch", amount: 2, section: "nix", purchases: Array.from({ length: 15 }, (_, i) => `2026-01-${String(i + 1).padStart(2, "0")}`), intervalDays: 0, active: false },
        { id: "s2", name: "Brot", amount: "1", section: "brot", purchases: [], intervalDays: 14 },
        { name: "ohne id" },
      ],
    })!;
    expect(v4.products).toEqual({ butter: "Alsan" });
    expect(v4.shops).toEqual(["Markt"]);
    expect(v4.weeks[W].skippedStaples).toEqual(["s1"]);
    expect(v4.staples).toHaveLength(2);
    expect(v4.staples[0]).toMatchObject({ amount: "", section: "kuehlregal", intervalDays: null, active: false });
    expect(v4.staples[0].purchases).toHaveLength(12);
    expect(v4.staples[1]).toMatchObject({ intervalDays: 14, active: true });
    expect(migrateStore({ version: 4, weeks: {} })!.staples).toEqual([]);
  });

  it("über den Speicher: alte Version wird einmal zurückgeschrieben", async () => {
    w = fakeWindow({ [KEY]: JSON.stringify({ version: 2, weeks: { [W]: { manual: [{ id: "m", name: "Brot", amount: "", section: "brot", done: false }], checked: [], have: [] } } }) });
    const { store } = await import("@/lib/einkauf/listStore");
    expect(store.load()?.weeks[W].manual[0].name).toBe("Brot");
    expect(saved().version).toBe(8);
  });
});
