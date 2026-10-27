// Einkauf-Kachel (Auftrag „Sofort-Kachel“): Artikel ohne eigene Zeichnung
// zeigen das Symbol ihrer Abteilung – nie einen Buchstaben. Nur „Egal wo“ =
// Symbolreihe (Variante A), mit Läden = Zeilen (C2).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { abteilungSymbol, symbolReihe } from "@/lib/einkauf/kacheln/abteilung";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { tileArt, tileRows } from "@/lib/einkauf/shopGroups";
import { loadCooking, markStepsBefore } from "@/lib/essen/kochSession";
import { fakeWindow } from "../helpers";

const ABTEILUNGEN = ["obst-gemuese", "brot", "kuehlregal", "fleisch-fisch", "vorrat", "getraenke", "tiefkuehl", "drogerie", "sonstiges"];

describe("Symbol der Abteilung statt Buchstabe", () => {
  it("Artikel ohne Zeichnung bekommen immer eine Abteilung – auch Unbekanntes", () => {
    for (const name of ["Feinkost", "Batterien", "Teelichter", "Zucchini", "Speck", "Quark mit Kräutern", "Tofu", "Pommes", "Cola", "", "  ", "123", "Ä"]) {
      expect(ABTEILUNGEN, name).toContain(abteilungSymbol(name));
    }
  });

  it("Abteilungen: Obst, Kühlregal, Drogerie, Tiefkühl …", () => {
    expect(abteilungSymbol("Zucchini")).toBe("obst-gemuese");
    expect(abteilungSymbol("Tofu")).toBe("kuehlregal");
    expect(abteilungSymbol("Pudding")).toBe("kuehlregal");
    expect(abteilungSymbol("Hummus")).toBe("kuehlregal");
    expect(abteilungSymbol("Deo")).toBe("drogerie");
    expect(abteilungSymbol("Feuchttücher")).toBe("drogerie");
    expect(abteilungSymbol("Spültabs")).toBe("drogerie");
    expect(abteilungSymbol("Pommes")).toBe("tiefkuehl");
    expect(abteilungSymbol("Speck")).toBe("fleisch-fisch");
    expect(abteilungSymbol("Batterien")).toBe("sonstiges");
  });

  it("Aufschnitt, Würstchen, Käse haben eigene Zeichnungen", () => {
    expect(symbolFor("Aufschnitt")).toBe("aufschnitt");
    expect(symbolFor("Wurstaufschnitt")).toBe("aufschnitt");
    expect(symbolFor("Salami")).toBe("aufschnitt");
    expect(symbolFor("Kochschinken")).toBe("aufschnitt");
    expect(symbolFor("Würstchen")).toBe("wurst");
    expect(symbolFor("Wiener")).toBe("wurst");
    expect(symbolFor("Frischkäse")).toBe("kaese");
    expect(symbolFor("Cheddar")).toBe("kaese");
    expect(symbolFor("Leberwurst")).toBe("wurst");
  });

  it("nie ein Buchstabe: ItemSymbol zeigt ohne Zeichnung ein Abteilungs-Symbol", () => {
    const src = readFileSync("src/components/einkauf/kacheln/ItemSymbol.tsx", "utf8");
    expect(src).not.toMatch(/charAt\(|toUpperCase\(/);
    expect(src).toMatch(/const Icon = ABTEILUNG\[abteilungSymbol\(name\)\]/);
    for (const a of ABTEILUNGEN) expect(src, a).toMatch(new RegExp(`(?:"${a}"|${a}): [A-Z]`));
  });
});

describe("Nur „Egal wo“: Symbolreihe (Variante A), mit Läden: Zeilen (C2)", () => {
  it("bis zu 6 Symbole, Rest als +N", () => {
    const names = ["Milch", "Brot", "Käse", "Äpfel", "Deo", "Speck", "Batterien", "Tofu"];
    expect(symbolReihe(names)).toEqual({ names: names.slice(0, 6), more: 2 });
    expect(symbolReihe(["Milch"])).toEqual({ names: ["Milch"], more: 0 });
  });

  it("Art der Kachel: leer, nur Egal wo = Symbole, sonst Zeilen", () => {
    expect(tileArt(tileRows([], [], "S"))).toBe("leer");
    expect(tileArt(tileRows([{ name: "Milch", shop: "" }, { name: "Brot", shop: "" }], [], "S"))).toBe("symbole");
    expect(tileArt(tileRows([{ name: "Milch", shop: "Rewe" }, { name: "Brot", shop: "" }], [], "S"))).toBe("zeilen");
    expect(tileArt(tileRows([{ name: "Milch", shop: "Rewe" }], [], "M"))).toBe("zeilen");
  });

  it("die Kachel nutzt die Symbolreihe nur bei „symbole“", () => {
    const src = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
    expect(src).toMatch(/art === "symbole" \? \(\s*<SymbolRow/);
    expect(src).toMatch(/art === "zeilen" \? \(\s*<ShopRows/);
  });
});

describe("Kochmodus merkt den Schritt für die Koch-Kachel", () => {
  it("Schritte vor dem aktuellen gelten als erledigt", () => {
    fakeWindow();
    markStepsBefore("r1", 2);
    expect(loadCooking().steps.r1).toEqual([0, 1]);
    markStepsBefore("r1", 0);
    expect(loadCooking().steps.r1).toEqual([]);
  });
});
