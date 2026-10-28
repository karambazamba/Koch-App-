// Im Haus – Tafel 102 (Punkt 5): eigene Zeichnungen für Zucchini, Kuchen,
// Honig; ohne Zeichnung nie Korb oder Karton, Obst und Gemüse getrennt.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SYMBOLS, symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { BELIEBT } from "@/lib/einkauf/aussuchen/katalog";
import { abteilungSymbol } from "@/lib/einkauf/kacheln/abteilung";
import { sectionFor } from "@/lib/einkauf/sections";

const SRC = readFileSync("src/components/einkauf/kacheln/ItemSymbol.tsx", "utf8");

describe("eigene Zeichnungen (Tafel 102)", () => {
  it("Zucchini, Kuchen, Honig, Sahne haben ihre eigene Zeichnung", () => {
    expect(symbolFor("Zucchini")).toBe("zucchini");
    expect(symbolFor("Kuchen")).toBe("kuchen");
    expect(symbolFor("Käsekuchen")).toBe("kuchen");
    expect(symbolFor("Apfelkuchen")).toBe("kuchen");
    expect(symbolFor("Torte")).toBe("kuchen");
    expect(symbolFor("Honig")).toBe("honig");
    expect(symbolFor("Sahne")).toBe("sahne");
    expect(symbolFor("Schlagsahne")).toBe("sahne");
  });

  it("Sonderfälle: Honigmelone ist kein Honig, Tortellini keine Torte", () => {
    expect(symbolFor("Honigmelone")).toBeNull();
    expect(abteilungSymbol("Honigmelone")).toBe("obst");
    expect(symbolFor("Tortellini")).toBe("nudeln");
    expect(abteilungSymbol("Wassermelone")).toBe("obst");
  });

  it("jedes Symbol hat eine Zeichnung", () => {
    for (const id of SYMBOLS) expect(SRC, id).toMatch(new RegExp(`\\n  ${id}: \\(`));
  });

  it("jede „Beliebt“-Sache in Aussuchen hat eine Zeichnung", () => {
    expect(BELIEBT.filter((n) => !symbolFor(n))).toEqual([]);
  });
});

describe("Ersatz-Symbol ohne Zeichnung", () => {
  it("nie Korb oder Karton", () => {
    expect(SRC).not.toMatch(/ShoppingBasket|\bPackage\b/);
  });

  it("Obst bekommt den Apfel, Gemüse die Möhre", () => {
    expect(SRC).toMatch(/obst: Apple/);
    expect(SRC).toMatch(/"obst-gemuese": Carrot/);
    for (const name of ["Mango", "Kiwi", "Birne", "Ananas", "Pfirsich", "Pflaumen", "Kirschen", "Melone"]) expect(abteilungSymbol(name), name).toBe("obst");
    for (const name of ["Aubergine", "Lauch", "Kohlrabi", "Kürbis", "Sellerie"]) expect(abteilungSymbol(name), name).toBe("obst-gemuese");
  });

  it("Kuchen und Gebäck stehen bei Brot & Backwaren", () => {
    for (const name of ["Kuchen", "Käsekuchen", "Torte", "Gebäck"]) expect(sectionFor(name), name).toBe("brot");
    expect(sectionFor("Tortellini")).toBe("vorrat");
  });

  it("übliche Sachen aus Kühlschrank und Vorrat: Zeichnung oder passende Abteilung", () => {
    const erwartet: Record<string, string> = {
      Zucchini: "zucchini", Kuchen: "kuchen", Honig: "honig", Sahne: "sahne", Quark: "joghurt", Thunfisch: "dose",
      Aubergine: "obst-gemuese", Lauch: "obst-gemuese", Kohlrabi: "obst-gemuese",
      Mango: "obst", Birne: "obst", Kiwi: "obst",
      Marmelade: "vorrat", Senf: "vorrat", Ketchup: "vorrat", Linsen: "vorrat",
      Tofu: "kuehlregal", Hummus: "kuehlregal", Pudding: "kuehlregal", Speck: "fleisch-fisch",
    };
    for (const [name, want] of Object.entries(erwartet)) expect(symbolFor(name) ?? abteilungSymbol(name), name).toBe(want);
  });
});
