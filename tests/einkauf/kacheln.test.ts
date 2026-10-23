// Einkauf wie Bring (Tafel 35): Symbole, Chips, Laufweg, Katalog, gemerkter Chip.
import { describe, expect, it } from "vitest";
import { SYMBOLS, symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { BASICS } from "@/lib/einkauf/kacheln/basics";
import { COMPACT_FROM, catalog, filterByChip, isCompact, recentBought, resolveChip, shopChips, walkOrder } from "@/lib/einkauf/kacheln/view";
import { migrateShopView } from "@/lib/einkauf/shopMode";
import type { ListItem, Section, Staple } from "@/lib/einkauf/shoppingList";

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
const staple = (name: string, section: Section, active = true): Staple => ({ id: name, name, amount: "", section, purchases: [], intervalDays: 7, active });

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

  it("jedes Grundsortiment hat ein Symbol, jedes Symbol wird gebraucht", () => {
    const used = new Set(BASICS.map((b) => symbolFor(b.name)));
    expect(BASICS.filter((b) => !symbolFor(b.name)).map((b) => b.name)).toEqual([]);
    expect(SYMBOLS.filter((s) => !used.has(s))).toEqual([]);
  });
});

describe("Chips und Filter", () => {
  const open = [item("Milch", { shop: "Rewe" }), item("Brot", { shop: "Rewe" }), item("Windeln", { shop: "dm" }), item("Äpfel")];

  it("Alle + Läden (meiste zuerst) + Ohne Laden", () => {
    expect(shopChips(open).map((c) => `${c.label} ${c.count}`)).toEqual(["Alle 4", "Rewe 2", "dm 1", "Ohne Laden 1"]);
  });

  it("ohne Läden nur „Alle“", () => {
    expect(shopChips([item("Milch")]).map((c) => c.id)).toEqual(["alle"]);
  });

  it("Läden mit anderer Schreibweise zählen zusammen", () => {
    expect(shopChips([item("A", { shop: "Rewe" }), item("B", { shop: "rewe " })])[1]).toMatchObject({ label: "Rewe", count: 2 });
  });

  it("filtert nach Chip", () => {
    expect(filterByChip(open, "alle")).toHaveLength(4);
    expect(filterByChip(open, "ohne").map((i) => i.name)).toEqual(["Äpfel"]);
    expect(filterByChip(open, "laden:REWE").map((i) => i.name)).toEqual(["Milch", "Brot"]);
  });

  it("gemerkter Chip: alter „Nach Laden“ = meiste Sachen, verschwundener Laden = Alle", () => {
    expect(resolveChip("meist", open)).toBe("laden:Rewe");
    expect(resolveChip("meist", [item("Milch")])).toBe("alle");
    expect(resolveChip("laden:dm", open)).toBe("laden:dm");
    expect(resolveChip("laden:Aldi", open)).toBe("alle");
    expect(resolveChip("ohne", open)).toBe("ohne");
  });

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

  it("ab 24 Artikeln kleinere Kacheln", () => {
    expect(isCompact(COMPACT_FROM - 1)).toBe(false);
    expect(isCompact(COMPACT_FROM)).toBe(true);
  });

  it("Zuletzt gekauft: nur Abgehaktes, ohne Doppelte", () => {
    const weeks = [[item("Milch", { checked: true }), item("Brot")], [item("milch", { checked: true }), item("Käse", { checked: true })]];
    expect(recentBought(weeks).map((i) => i.name)).toEqual(["Milch", "Käse"]);
  });
});

describe("Katalog „Mehr hinzufügen“", () => {
  const basics = [
    { name: "Milch", section: "kuehlregal" as Section },
    { name: "Äpfel", section: "obst-gemuese" as Section },
    { name: "Kaffee", section: "vorrat" as Section },
  ];

  it("Oft gekauft zuerst, dann Laufweg; auf der Liste = ausgewählt", () => {
    const list = catalog({ staples: [staple("Kaffee", "vorrat"), staple("Alt", "vorrat", false)], recent: [item("Brot", { section: "brot", checked: true })], open: [item("Milch")], basics });
    expect(list.map((e) => `${e.name}${e.often ? "*" : ""}${e.on ? "✓" : ""}`)).toEqual(["Kaffee*", "Brot*", "Äpfel", "Milch✓"]);
  });

  it("Suche nach Namensteil", () => {
    expect(catalog({ staples: [], recent: [], open: [], basics, query: "ApF" }).map((e) => e.name)).toEqual([]);
    expect(catalog({ staples: [], recent: [], open: [], basics, query: "äpf" }).map((e) => e.name)).toEqual(["Äpfel"]);
    expect(catalog({ staples: [], recent: [], open: [], basics, query: "kaf" }).map((e) => e.name)).toEqual(["Kaffee"]);
  });
});
