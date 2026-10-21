import { describe, expect, it } from "vitest";
import { HOME_TILES, applyHomeChange, migrateHome, sanitizeHome, standardLayout, DEFAULT_HOME } from "@/lib/core/homeLayout";

const ORDER = ["S", "M", "L"] as const;

describe("Kachel-Größen", () => {
  it("jede Kachel erlaubt Größen in der Reihenfolge S ≤ M ≤ L und ihre Standardgröße", () => {
    for (const t of HOME_TILES) {
      const ranks = t.sizes.map((s) => ORDER.indexOf(s));
      expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
      expect(t.sizes).toContain(t.size);
    }
  });

  it("eine nicht erlaubte Größe wird auf eine erlaubte gesetzt", () => {
    const tiles = sanitizeHome([{ id: "morgen", visible: true, size: "L" }]);
    expect(tiles.find((t) => t.id === "morgen")?.size).toBe("M");
  });

  it("klein/mittel/groß ändert nur die Größe, nicht die Reihenfolge", () => {
    const before = DEFAULT_HOME.map((t) => t.id);
    const after = applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "gross" });
    expect(after.map((t) => t.id)).toEqual(before);
    expect(after.find((t) => t.id === "termine")?.size).toBe("L");
  });

  it("Essen und Einkauf bleiben ein Paar (direkt hintereinander, Essen zuerst)", () => {
    const moved = applyHomeChange(DEFAULT_HOME, { tile: "einkauf", action: "nach_oben" });
    const visible = moved.filter((t) => t.visible).map((t) => t.id);
    expect(visible.indexOf("einkauf")).toBe(visible.indexOf("essen") + 1);
  });

  it("Standard-Anordnung stellt Reihenfolge und Größen wieder her", () => {
    const changed = applyHomeChange(applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "klein" }), { tile: "aufgaben", action: "nach_oben" });
    const std = standardLayout(changed).filter((t) => t.visible);
    expect(std.find((t) => t.id === "termine")?.size).toBe("M");
    expect(std.map((t) => t.id).indexOf("termine")).toBeLessThan(std.map((t) => t.id).indexOf("aufgaben"));
  });
});

describe("Migration der Startseite", () => {
  it("v2 → v3: Kladde wird zur Notizen-Kachel an derselben Stelle, Größen gesetzt", () => {
    const v3 = migrateHome({ version: 2, tiles: [{ id: "termine", visible: true }, { id: "kladde", visible: true }, { id: "essen", visible: true }], tipSeen: true });
    expect(v3?.version).toBe(4);
    const ids = v3!.tiles.filter((t) => t.visible).map((t) => t.id);
    expect(ids.indexOf("notizen")).toBe(ids.indexOf("termine") + 1);
    expect(v3!.tiles.find((t) => t.id === "essen")?.size).toBe("S");
  });

  it("unbekannte Versionen werden nicht geraten", () => {
    expect(migrateHome({ version: 99, tiles: [] })).toBeNull();
  });
});
