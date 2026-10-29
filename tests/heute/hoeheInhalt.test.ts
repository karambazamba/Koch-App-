// A-048 (Tafel 135): Termine, Aufgaben und Einkauf so hoch wie ihr Inhalt –
// höchstens 3 Zeilen, darunter 14 px Rand, kein Leerraum bis zu einer festen
// Rasterhöhe. Feste Höhen nur für Kacheln mit Bild/eigener Fläche; zwei
// Kacheln in einer Reihe gleich hoch, aber nur so hoch wie die höhere braucht.
// Das Raster (Plätze) bleibt XS · S · M (Tafel 118/119).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DEFAULT_HOME, defaultHome, type HomeTile } from "@/lib/core/homeLayout";
import { unitsOf } from "@/lib/core/homeUnits";
import { INHALT_KACHELN, anzeigeZeilen, inhaltsHoch, packe, rasterOf, zeilenPlan } from "@/lib/heute/raster";

const tiles = (list: [string, string][]): HomeTile[] => list.map(([id, size]) => ({ id, visible: true, size }) as HomeTile);
const plan = (t: HomeTile[]) => {
  const units = unitsOf(t);
  const r = packe(units);
  return { r, p: zeilenPlan(r, units) };
};

describe("Höhe = Inhalt (A-048)", () => {
  it("Listen-Kacheln: Termine, Aufgaben, Einkauf, Notizen (Klarstellung) – das Paar Essen + Einkauf zählt mit, Essen allein nicht", () => {
    expect([...INHALT_KACHELN]).toEqual(["termine", "aufgaben", "einkauf", "notizen"]);
    // Notizen M allein: Höhe = Inhalt; Notizen XS bleibt im festen XS-Raster
    expect(plan(tiles([["notizen", "M"]])).p.zeilen).toEqual(["inhalt"]);
    expect(plan(tiles([["notizen", "XS"], ["wetter", "XS"], ["termine", "M"]])).p.zeilen).toEqual(["fest", "inhalt"]);
    const u = unitsOf(tiles([["termine", "M"], ["essen", "S"], ["einkauf", "S"], ["essen", "M"], ["pinnwand", "S"], ["wetter", "M"]]));
    expect(u.map((x) => [x.key, inhaltsHoch(x)])).toEqual([["termine", true], ["essen+einkauf", true], ["essen", false], ["pinnwand", false], ["wetter", false]]);
  });

  it("Standard Familie (Tafel 119/135): Pinnwand | Wetter/Notizen fest, Termine, Aufgaben und Essen + Einkauf je EINE Zeile so hoch wie der Inhalt", () => {
    const { r, p } = plan(defaultHome("familie").filter((t) => t.visible));
    expect(r.rows).toBe(8);
    expect(p.zeilen).toEqual(["fest", "fest", "inhalt", "inhalt", "inhalt"]);
    expect(p.von).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
    // Die Plätze im Raster bleiben dieselben (Tafel 118)
    expect(r).toEqual(rasterOf(DEFAULT_HOME.filter((t) => t.visible)));
    const termine = r.plaetze.find((x) => x.key === "termine")!;
    expect(anzeigeZeilen(p, termine)).toEqual({ start: 2, span: 1 });
    expect(anzeigeZeilen(p, r.plaetze.find((x) => x.key === "pinnwand")!)).toEqual({ start: 0, span: 2 });
  });

  it("zwei Listen nebeneinander (Termine S | Aufgaben S): eine Zeile, beide gleich hoch – so hoch wie die höhere", () => {
    expect(plan(tiles([["termine", "S"], ["aufgaben", "S"]])).p.zeilen).toEqual(["inhalt"]);
  });

  it("Liste neben einer Kachel mit eigener Fläche (Pinnwand S, XS-Paar) bleibt fest – die Reihe ist gleich hoch", () => {
    expect(plan(tiles([["termine", "S"], ["pinnwand", "S"]])).p.zeilen).toEqual(["fest", "fest"]);
    expect(plan(tiles([["termine", "S"], ["wetter", "XS"], ["notizen", "XS"]])).p.zeilen).toEqual(["fest", "fest"]);
    expect(plan(tiles([["essen", "M"], ["einkauf", "M"]])).p.zeilen).toEqual(["fest", "fest", "inhalt"]);
  });

  it("Liste allein mit Lücke daneben: so hoch wie der Inhalt (die Lücke bleibt ruhig leer)", () => {
    const { r, p } = plan(tiles([["termine", "S"]]));
    expect(r.luecken).toEqual([{ col: 1, row: 0, h: 2 }]);
    expect(p.zeilen).toEqual(["inhalt"]);
    expect(anzeigeZeilen(p, { row: 0, h: 2 })).toEqual({ start: 0, span: 1 });
  });

  it("im Board: Listen-Zeilen `auto`, sonst die feste Grund-Zeile; die Kachel bekommt `inhalt` und `data-hoehe`", () => {
    const board = readFileSync("src/components/heute/HomeBoard.tsx", "utf8");
    expect(board).toMatch(/z === "inhalt" \? "auto" : "var\(--zeile\)"/);
    expect(board).toContain('data-hoehe={inhalt ? "inhalt" : "fest"}');
    expect(board).toContain("render(tile, half, editing, inhalt)");
  });

  it("Termine, Aufgaben, Einkauf: unten 14 px Rand (pb-3.5), höchstens 3 Zeilen", () => {
    const mini = readFileSync("src/components/heute/MiniCards.tsx", "utf8");
    expect(mini.match(/px-3 pb-3\.5 pt-2\.5/g)).toHaveLength(2);
    expect(mini).toContain("const ROW_COUNT: Record<TileSize, number> = { XS: 1, S: 3, M: 3 };");
    const home = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
    expect(home).toContain("${HALF} isolate pb-3.5");
  });

  it("Wasserzeichen macht die Kachel nie höher: absolut, hinter dem Inhalt", () => {
    const w = readFileSync("src/components/ui/KachelWasserzeichen.tsx", "utf8");
    expect(w).toMatch(/kachel-wasserzeichen pointer-events-none absolute -z-10/);
  });
});
