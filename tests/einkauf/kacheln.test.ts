// Einkauf wie Bring (Tafel 35): Symbole, Laufweg, „Zuletzt gekauft“, gemerkter Laden.
// (Chips, Filter und der alte Katalog sind mit „Einkauf neu“ weg – Aussuchen: tests/einkauf/aussuchen.test.ts.)
import { describe, expect, it } from "vitest";
import { SYMBOLS, symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { KATALOG_ALLE } from "@/lib/einkauf/aussuchen/katalog";
import { recentBought, walkOrder } from "@/lib/einkauf/kacheln/view";
import { migrateShopView } from "@/lib/einkauf/shopMode";
import type { ListItem, Section } from "@/lib/einkauf/shoppingList";

const item = (name: string, more: Partial<ListItem> = {}): ListItem => ({
  key: `k-${name}`,
  name,
  originalName: name,
  amount: "",
  section: "sonstiges" as Section,
  dishes: [],
  days: [],
  shop: "",
  checked: false,
  hidden: false,
  ...more,
});

/** Grundsortiment mit eigener Zeichnung (früher kacheln/basics.ts) */
const GRUNDSORTIMENT = [
  "Milch", "Käse", "Butter", "Joghurt", "Quark", "Eier", "Sahne", "Brot", "Brötchen", "Toast", "Kuchen",
  "Äpfel", "Bananen", "Zitronen", "Orangen", "Trauben", "Beeren", "Avocado", "Tomaten", "Gurke", "Zucchini", "Paprika", "Karotten", "Zwiebeln", "Knoblauch", "Kartoffeln", "Salat", "Brokkoli", "Champignons", "Petersilie",
  "Hähnchen", "Hackfleisch", "Wurst", "Aufschnitt", "Lachs", "Nudeln", "Reis", "Mehl", "Zucker", "Öl", "Salz", "Pfeffer", "Dosentomaten", "Müsli", "Kaffee", "Tee", "Schokolade", "Kekse", "Honig",
  "Wasser", "Saft", "Bier", "Wein", "Eis", "Pizza", "Klopapier", "Küchenrolle", "Windeln", "Spülmittel", "Waschmittel", "Zahnpasta", "Shampoo",
];

describe("Symbole", () => {
  it("kennt die häufigsten Artikel", () => {
    expect(symbolFor("Milch")).toBe("milch");
    expect(symbolFor("Hafermilch")).toBe("milch");
    expect(symbolFor("Eier")).toBe("eier");
    expect(symbolFor("Steinpilze")).toBe("pilz");
    expect(symbolFor("Bananen")).toBe("banane");
    expect(symbolFor("Klopapier")).toBe("klopapier");
  });

  it("Sonderfälle vor dem Allgemeinen", () => {
    expect(symbolFor("Kokosmilch")).toBe("dose");
    expect(symbolFor("Paprikapulver")).toBe("gewuerz");
    expect(symbolFor("Orangensaft")).toBe("saft");
    expect(symbolFor("Fischstäbchen")).toBe("fisch");
    expect(symbolFor("Erdnussbutter")).toBe("butter");
  });

  it("kurze Wörter nur als ganzes Wort (Feinkost ist kein Ei, Reiswaffeln schon Reis)", () => {
    expect(symbolFor("Feinkost")).toBeNull();
    expect(symbolFor("Ei")).toBe("eier");
    expect(symbolFor("Öl")).toBe("oel");
    expect(symbolFor("Tee")).toBe("tee");
    expect(symbolFor("Teelichter")).toBeNull();
  });

  it("eigenes Produkt nimmt das Symbol der Zutat, Unbekanntes bekommt keins", () => {
    expect(symbolFor("Alsan", { butter: "Alsan" })).toBe("butter");
    expect(symbolFor("Batterien")).toBeNull();
    expect(symbolFor("  ")).toBeNull();
  });

  it("jedes Grundsortiment hat ein Symbol und steht im Katalog, jedes Symbol wird gebraucht", () => {
    expect(GRUNDSORTIMENT.filter((n) => !symbolFor(n))).toEqual([]);
    expect(GRUNDSORTIMENT.filter((n) => !KATALOG_ALLE.includes(n))).toEqual([]);
    const used = new Set(KATALOG_ALLE.map((n) => symbolFor(n)));
    expect(SYMBOLS.filter((s) => !used.has(s))).toEqual([]);
  });
});

describe("Gemerkter Laden (pro Gerät)", () => {
  it("Speicher v1 → v2 ohne Verlust", () => {
    expect(migrateShopView({ version: 1, view: "laden" })).toEqual({ version: 2, chip: "meist" });
    expect(migrateShopView({ version: 1, view: "abteilung" })).toEqual({ version: 2, chip: "alle" });
    expect(migrateShopView({ version: 2, chip: "laden:Rewe" })).toEqual({ version: 2, chip: "laden:Rewe" });
    expect(migrateShopView({ version: 2, chip: "laden:" })).toEqual({ version: 2, chip: "alle" });
    expect(migrateShopView({ version: 9 })).toBeNull();
    expect(migrateShopView(null)).toBeNull();
  });
});

describe("Kacheln", () => {
  it("Laufweg: Obst & Gemüse vor Kühlregal vor Getränken", () => {
    const items = [item("Wasser", { section: "getraenke" }), item("Milch", { section: "kuehlregal" }), item("Äpfel", { section: "obst-gemuese" })];
    expect(walkOrder(items).map((i) => i.name)).toEqual(["Äpfel", "Milch", "Wasser"]);
  });

  it("Zuletzt gekauft: nur Abgehaktes, ohne Doppelte", () => {
    const weeks = [[item("Milch", { checked: true }), item("Brot")], [item("milch", { checked: true }), item("Käse", { checked: true })]];
    expect(recentBought(weeks).map((i) => i.name)).toEqual(["Milch", "Käse"]);
  });
});
