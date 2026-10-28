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
    const r = tileRows(items, ["Lidl", "Rewe"], Infinity);
    expect(names(r)).toEqual(["Lidl 1", "Rewe 2", "Rossmann 3", "Edeka 1", "Egal wo 1"]);
    expect(r.rest).toBeNull();
    expect(r.rows[1].names).toEqual(["Milch", "Brot"]);
    expect(r.ohne).toEqual(["Spinat"]);
  });

  it("feste Fläche: höchstens 3 Zeilen (mit „ohne Laden“-Zeile 2), der Rest als Zahl im Kopf", () => {
    const r = tileRows(items, ["Lidl", "Rewe"]);
    expect(names(r)).toEqual(["Lidl 1", "Rewe 2", "Rossmann 3"]);
    expect(r.rest).toBe("+ Edeka 1, Egal wo 1");
    expect(r.restZahl).toBe(2);
    const zwei = tileRows(items, ["Lidl", "Rewe"], 2);
    expect(names(zwei)).toEqual(["Lidl 1", "Rewe 2"]);
    expect(zwei.restZahl).toBe(5);
  });

  it("ohne Meine Läden: meiste Artikel zuerst", () => {
    expect(names(tileRows(items, [], Infinity))).toEqual(["Rossmann 3", "REWE 2", "Edeka 1", "Lidl 1", "Egal wo 1"]);
  });

  it("Meine Läden stehen IMMER da, auch mit 0; noch ohne Laden zählt extra", () => {
    const r = tileRows([{ name: "Milch", shop: "" }, { name: "Brot", shop: " " }], ["Edeka", "Rewe", "Lidl", "Rossmann"], 3);
    expect(names(r)).toEqual(["Edeka 0", "Rewe 0", "Lidl 0"]);
    expect(r.rest).toBeNull();
    expect(r.ohne).toEqual(["Milch", "Brot"]);
    expect(ohneLadenZeile(r.ohne.length)).toBe("2 ohne Laden");
    const l = tileRows([{ name: "Zahnpasta", shop: "Rossmann" }], ["Edeka", "Rewe", "Lidl", "Rossmann"], 3);
    expect(l.rest).toBe("+ Rossmann 1");
    expect(names(tileRows([], ["Edeka", "Rewe", "Lidl", "Rossmann"], Infinity))).toEqual(["Edeka 0", "Rewe 0", "Lidl 0", "Rossmann 0"]);
    expect(tileRows([], [], 3)).toEqual({ rows: [], rest: null, restZahl: 0, ohne: [] });
  });

  it("Beispiel-Einkauf: Edeka, Rewe, Lidl, Rossmann – die Kachel zeigt 3 + Rest, ohne Grenze alle", () => {
    expect(DEMO_SHOPS).toEqual([
      { shop: "Edeka", names: ["Äpfel", "Eier", "Käse"] },
      { shop: "Rewe", names: ["Milch", "Brot", "Butter"] },
      { shop: "Lidl", names: ["Bananen", "Nudeln"] },
      { shop: "Rossmann", names: ["Zahnpasta", "Küchenrolle"] },
    ]);
    const demo = DEMO_SHOPS.flatMap((g) => g.names.map((name) => ({ name, shop: g.shop })));
    const order = DEMO_SHOPS.map((g) => g.shop);
    const s = tileRows(demo, order, 3);
    expect(names(s)).toEqual(["Edeka 3", "Rewe 3", "Lidl 2"]);
    expect(s.rest).toBe("+ Rossmann 2");
    expect(s.ohne).toEqual([]);
    expect(names(tileRows(demo, order, Infinity))).toEqual(["Edeka 3", "Rewe 3", "Lidl 2", "Rossmann 2"]);
  });

  it("bekannte Läden haben verschiedene Farben", () => {
    const tones = ["Edeka", "Rewe", "Lidl", "Aldi", "Rossmann", "dm"].map(shopTone);
    expect(new Set(tones).size).toBe(tones.length);
    expect([shopTone("REWE"), shopTone("EDEKA"), shopTone("Lidl")]).toEqual([1, 2, 4]);
    expect(shopTone("Netto")).not.toBe(shopTone("Edeka"));
    expect(shopTone("Kaufland")).not.toBe(shopTone("Rewe"));
  });
});

describe("Fehler: Kopf und Sortieren-Zeile der Einkauf-Kachel wurden abgeschnitten", () => {
  it("Kopf „EINKAUF“ ohne Abschneiden, „16 ohne Laden · Sortieren ›“ vollständig (notfalls zweizeilig)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
    const head = src.slice(src.indexOf("function ShoppingHead"), src.indexOf("/** Beispiel-Einkauf"));
    expect(head).toContain('<span className="whitespace-nowrap">Einkauf</span>');
    expect(head).not.toMatch(/truncate|pr-6/);
    const line = src.slice(src.indexOf("{mine && ohne.length > 0 && ("), src.lastIndexOf("Sortieren ›") + 20);
    expect(line).toMatch(/flex-wrap/);
    expect(line).not.toMatch(/\btruncate\b/);
    expect(ohneLadenZeile(16)).toBe("16 ohne Laden");
  });
});
