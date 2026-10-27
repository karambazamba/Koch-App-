// Einkauf-Kachel (Auftrag „Sofort-Kachel“): Artikel ohne eigene Zeichnung
// zeigen das Symbol ihrer Abteilung – nie einen Buchstaben. Immer Zeilen je
// Laden (C2), keine Symbolreihe mehr (Tafel 99).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { abteilungSymbol } from "@/lib/einkauf/kacheln/abteilung";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { tileRows } from "@/lib/einkauf/shopGroups";
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

describe("Kein Symbol-Haufen mehr (Tafel 99)", () => {
  it("nur „Egal wo“ ist eine normale Zeile, nichts ohne Ordnung", () => {
    const r = tileRows([{ name: "Milch", shop: "", anywhere: true }, { name: "Brot", shop: "" }], [], "S");
    expect(r.rows).toEqual([{ shop: null, names: ["Milch"], count: 1 }]);
    expect(r.ohne).toEqual(["Brot"]);
  });

  it("die Kachel hat keine Symbolreihe mehr", () => {
    const src = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
    expect(src).not.toMatch(/SymbolRow|symbolReihe|tileArt/);
    expect(src).toMatch(/<ShopRows/);
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
