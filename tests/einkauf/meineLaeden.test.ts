// Läden bewusst wählen (Tafel 88): Frage beim ersten Besuch (Fertig/Später),
// bestehende Nutzer, Laden-Reihe auch mit 0 Artikeln, Knopftexte, Vorwahl
// beim Hinzufügen, eigener Laden, Sätze mit Laden, Farben, Prüfstand.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListItem, ShoppingListStore } from "@/lib/einkauf/listModel";
import { at, fakeWindow } from "../helpers";

const KEY = "wasgibts.einkaufsliste";
let w: ReturnType<typeof fakeWindow>;
const saved = () => JSON.parse(w.localStorage.getItem(KEY)!) as ShoppingListStore;
const item = (name: string, shop = ""): ListItem => ({ key: name, name, originalName: name, amount: "", section: "sonstiges", dishes: [], days: [], shop, checked: false, hidden: false });
const ml = () => import("@/lib/einkauf/meineLaeden");

beforeEach(() => {
  at("2026-10-20T08:00");
  vi.resetModules();
  w = fakeWindow();
});

describe("Erster Besuch", () => {
  it("Fertig: Meine Läden in Reihenfolge der Wahl, eigener Laden gemerkt, nie wieder fragen", async () => {
    const { chooseMyShops } = await ml();
    chooseMyShops(["Lidl", "Rossmann", "Hofladen Meier", "lidl"]);
    const s = saved();
    expect(s.myShops).toEqual(["Lidl", "Rossmann", "Hofladen Meier"]);
    expect(s.shopsAsked).toBe(true);
    expect(s.shops).toEqual(["Hofladen Meier"]);
  });

  it("Später: nie wieder fragen, keine Läden – Liste wie bisher", async () => {
    const { laterShops, shopRow } = await ml();
    laterShops();
    expect(saved()).toMatchObject({ shopsAsked: true, myShops: [] });
    expect(shopRow([item("Milch")], []).map((c) => c.label)).toEqual(["Alle"]);
  });

  it("bestehende Nutzer: Läden an Artikeln sind vorgewählt (meistgenutzt zuerst)", async () => {
    const { vorauswahl, shopChoices } = await ml();
    expect(vorauswahl({ milch: "Lidl", shampoo: "Rossmann", eier: "Lidl", brot: "lidl" })).toEqual(["Lidl", "Rossmann"]);
    expect(vorauswahl({})).toEqual([]);
    expect(shopChoices(["Hofladen"], ["Biomarkt"]).slice(-2)).toEqual(["Hofladen", "Biomarkt"]);
  });

  it("alter Speicher (v4) bekommt leere Läden und wird einmal gefragt", async () => {
    const { migrateStore } = await import("@/lib/einkauf/listMigration");
    const v4 = { version: 4, weeks: {}, products: {}, shops: [], itemShops: { milch: "Lidl" }, staples: [] };
    expect(migrateStore(v4)).toMatchObject({ version: 6, myShops: [], shopsAsked: false, shopRules: {}, alwaysList: [], itemShops: { milch: "Lidl" } });
  });
});

describe("Frage nach Tafel 91 und Sortieren", () => {
  it("Chips in fester Reihenfolge, eigene Läden erkannt", async () => {
    const { FRAGE_LAEDEN, isSuggestion } = await ml();
    expect(FRAGE_LAEDEN).toEqual(["Edeka", "Rewe", "Lidl", "Aldi", "Penny", "Netto", "Kaufland", "Rossmann", "dm", "Wochenmarkt", "Bäcker"]);
    expect(isSuggestion("penny")).toBe(true);
    expect(isSuggestion("Famila")).toBe(false);
  });

  it("Meine Läden umsortieren", async () => {
    const { chooseMyShops, moveMyShop } = await ml();
    chooseMyShops(["Edeka", "Rewe", "Lidl"]);
    moveMyShop("Lidl", -1);
    expect(saved().myShops).toEqual(["Edeka", "Lidl", "Rewe"]);
    moveMyShop("Edeka", -1);
    expect(saved().myShops).toEqual(["Edeka", "Lidl", "Rewe"]);
  });
});

describe("Laden-Reihe", () => {
  it("meine Läden immer da, auch mit 0; andere mit offenen Sachen; „Ohne Laden“ nur wenn nötig", async () => {
    const { shopRow } = await ml();
    const row = shopRow([item("Milch", "Lidl"), item("Brot", "Bäcker"), item("Salz")], ["Rossmann", "Lidl"]);
    expect(row.map((c) => `${c.label}:${c.count}`)).toEqual(["Alle:3", "Rossmann:0", "Lidl:1", "Bäcker:1", "Ohne Laden:1"]);
    expect(shopRow([], ["Rossmann"]).map((c) => `${c.label}:${c.count}`)).toEqual(["Alle:0", "Rossmann:0"]);
    expect(shopRow([item("Salz")], ["Rossmann"]).map((c) => c.label)).toEqual(["Alle", "Rossmann"]);
  });

  it("gemerkter Reiter bleibt auch ohne Artikel; verschwundener Laden → Alle", async () => {
    const { shopRow, chipIn } = await ml();
    const row = shopRow([], ["Rossmann"]);
    expect(chipIn(row, "laden:Rossmann")).toBe("laden:Rossmann");
    expect(chipIn(row, "laden:Aldi")).toBe("alle");
    expect(chipIn(shopRow([item("Milch", "Lidl")], ["Rossmann"]), "meist")).toBe("laden:Lidl");
  });

  it("Knopftexte je Reiter und Einkaufsmodus", async () => {
    const { addLabel, shopModeLabel } = await ml();
    expect(addLabel("Lidl")).toBe("Zu Lidl hinzufügen");
    expect(addLabel()).toBe("Mehr hinzufügen");
    expect(shopModeLabel("Lidl")).toBe("Bei Lidl einkaufen");
  });

  it("eigenen Laden dazu und wieder weg; Laden am Artikel kommt zu Meine Läden", async () => {
    const { addMyShop, removeMyShop } = await ml();
    const { setItemShop } = await import("@/lib/einkauf/shops");
    addMyShop("Hofladen");
    addMyShop("hofladen");
    expect(saved().myShops).toEqual(["Hofladen"]);
    setItemShop("Shampoo", "Rossmann");
    expect(saved().myShops).toEqual(["Hofladen", "Rossmann"]);
    removeMyShop("Hofladen");
    expect(saved().myShops).toEqual(["Rossmann"]);
    expect(saved().shops).toContain("Hofladen");
    expect(saved().itemShops.shampoo).toBe("Rossmann");
  });
});

describe("Vorwahl beim Hinzufügen", () => {
  it("gemerkter Laden → offener Reiter → Egal wo, mit leisem Hinweis", async () => {
    const { ladenVorwahl, vorwahlHinweis } = await ml();
    const itemShops = { shampoo: "Rossmann", hafermilch: "Lidl" };
    expect(ladenVorwahl({ name: "Shampoo", itemShops, tab: "Lidl" })).toEqual({ shop: "Rossmann", remembered: true });
    expect(ladenVorwahl({ name: "Milch", itemShops, products: { milch: "Hafermilch" } })).toEqual({ shop: "Lidl", remembered: true });
    expect(ladenVorwahl({ name: "Brot", itemShops, tab: "Lidl" })).toEqual({ shop: "Lidl", remembered: false });
    expect(ladenVorwahl({ name: "Brot", itemShops })).toEqual({ shop: "", remembered: false });
    expect(vorwahlHinweis("Butter", "Lidl")).toBe("Butter gibt’s bei dir bei Lidl. Hab ich vorgewählt.");
  });
});

describe("Sätze mit Laden", () => {
  it("„Shampoo bei Rossmann“ und „Für Lidl: Milch, Eier“ landen im richtigen Laden", async () => {
    const { parseShoppingText } = await import("@/lib/einkauf/shoppingParse");
    expect(parseShoppingText("Shampoo bei Rossmann").map((i) => `${i.name}@${i.shop}`)).toEqual(["Shampoo@Rossmann"]);
    expect(parseShoppingText("Für Lidl: Milch, Eier").map((i) => `${i.name}@${i.shop}`)).toEqual(["Milch@Lidl", "Eier@Lidl"]);
  });
});

describe("Farben ohne Logos", () => {
  it("Lidl und Aldi haben verschiedene Töne", async () => {
    const { shopTone } = await import("@/lib/einkauf/shopGroups");
    expect(shopTone("Lidl")).not.toBe(shopTone("Aldi"));
  });
});

describe("Prüfstand", () => {
  it("prüft den Laden der Einkaufs-Vorschläge", async () => {
    const { bewerte } = await import("@/lib/begleitung/pruefstand/bewerten");
    const { PRUEFSAETZE } = await import("@/lib/begleitung/pruefstand/saetze");
    const satz = PRUEFSAETZE.find((s) => s.text === "Für Lidl: Milch, Eier")!;
    const op = (name: string, shop?: string) => ({ id: name, type: "add_shopping", weekStart: "2026-10-19", name, amount: "", section: "sonstiges", ...(shop ? { shop } : {}) });
    const ok = bewerte(satz, { reply: "Steht drin.", ops: [op("Milch", "Lidl"), op("Eier", "Lidl")] } as never, 900);
    expect(ok.ok).toBe(true);
    const falsch = bewerte(satz, { reply: "Steht drin.", ops: [op("Milch", "Lidl"), op("Eier")] } as never, 900);
    expect(falsch.gruende.join()).toMatch(/Laden Lidl/);
  });
});
