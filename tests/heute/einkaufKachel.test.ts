import { describe, expect, it } from "vitest";
import { ohneLadenZeile, shopTone, tileRows } from "@/lib/einkauf/shopGroups";
import { DEMO_SHOPS } from "@/lib/core/demo";

const items = [
  { name: "Milch", shop: "REWE" },
  { name: "Salz", shop: "", anywhere: true },
  { name: "Spinat", shop: "" },
  { name: "Zahnpasta", shop: "Rossmann" },
  { name: "Äpfel", shop: "Edeka" },
  { name: "Brot", shop: "rewe" },
  { name: "Duschgel", shop: "Rossmann" },
  { name: "Seife", shop: "Rossmann" },
  { name: "Bananen", shop: "Lidl" },
];
const names = (r: ReturnType<typeof tileRows>) => r.rows.map((x) => `${x.shop ?? "Egal wo"} ${x.count}`);

describe("Einkauf-Kachel (Variante C2)", () => {
  it("Reihenfolge wie „Meine Läden“ (deren Schreibweise), andere danach (meiste zuerst), bewusst „Egal wo“ zuletzt", () => {
    const r = tileRows(items, ["Lidl", "Rewe"], "L");
    expect(names(r)).toEqual(["Lidl 1", "Rewe 2", "Rossmann 3", "Edeka 1", "Egal wo 1"]);
    expect(r.rest).toBeNull();
    expect(r.rows[1].names).toEqual(["Milch", "Brot"]);
    expect(r.ohne).toEqual(["Spinat"]);
  });

  it("S und M: höchstens 3 Zeilen plus leise Rest-Zeile mit Zahl", () => {
    for (const size of ["S", "M"] as const) {
      const r = tileRows(items, ["Lidl", "Rewe"], size);
      expect(names(r)).toEqual(["Lidl 1", "Rewe 2", "Rossmann 3"]);
      expect(r.rest).toBe("+ Edeka 1, Egal wo 1");
    }
  });

  it("ohne Meine Läden: meiste Artikel zuerst", () => {
    expect(names(tileRows(items, [], "L"))).toEqual(["Rossmann 3", "REWE 2", "Edeka 1", "Lidl 1", "Egal wo 1"]);
  });

  it("Meine Läden stehen IMMER da, auch mit 0; noch ohne Laden zählt extra", () => {
    const r = tileRows([{ name: "Milch", shop: "" }, { name: "Brot", shop: " " }], ["Edeka", "Rewe", "Lidl", "Rossmann"], "S");
    expect(names(r)).toEqual(["Edeka 0", "Rewe 0", "Lidl 0"]);
    expect(r.rest).toBeNull();
    expect(r.ohne).toEqual(["Milch", "Brot"]);
    expect(ohneLadenZeile(r.ohne.length)).toBe("2 noch ohne Laden");
    const l = tileRows([{ name: "Zahnpasta", shop: "Rossmann" }], ["Edeka", "Rewe", "Lidl", "Rossmann"], "M");
    expect(l.rest).toBe("+ Rossmann 1");
    expect(names(tileRows([], ["Edeka", "Rewe", "Lidl", "Rossmann"], "L"))).toEqual(["Edeka 0", "Rewe 0", "Lidl 0", "Rossmann 0"]);
    expect(tileRows([], [], "M")).toEqual({ rows: [], rest: null, ohne: [] });
  });

  it("Beispiel-Einkauf: Edeka, Rewe, Lidl, Rossmann – S zeigt 3 + Rest, L alle", () => {
    expect(DEMO_SHOPS).toEqual([
      { shop: "Edeka", names: ["Äpfel", "Eier", "Käse"] },
      { shop: "Rewe", names: ["Milch", "Brot", "Butter"] },
      { shop: "Lidl", names: ["Bananen", "Nudeln"] },
      { shop: "Rossmann", names: ["Zahnpasta", "Küchenrolle"] },
    ]);
    const demo = DEMO_SHOPS.flatMap((g) => g.names.map((name) => ({ name, shop: g.shop })));
    const order = DEMO_SHOPS.map((g) => g.shop);
    const s = tileRows(demo, order, "S");
    expect(names(s)).toEqual(["Edeka 3", "Rewe 3", "Lidl 2"]);
    expect(s.rest).toBe("+ Rossmann 2");
    expect(s.ohne).toEqual([]);
    expect(names(tileRows(demo, order, "L"))).toEqual(["Edeka 3", "Rewe 3", "Lidl 2", "Rossmann 2"]);
  });

  it("bekannte Läden haben verschiedene Farben", () => {
    const tones = ["Edeka", "Rewe", "Lidl", "Aldi", "Rossmann", "dm"].map(shopTone);
    expect(new Set(tones).size).toBe(tones.length);
    expect([shopTone("REWE"), shopTone("EDEKA"), shopTone("Lidl")]).toEqual([1, 2, 4]);
    expect(shopTone("Netto")).not.toBe(shopTone("Edeka"));
    expect(shopTone("Kaufland")).not.toBe(shopTone("Rewe"));
  });
});
