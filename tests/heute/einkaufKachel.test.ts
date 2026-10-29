import { describe, expect, it } from "vitest";
import { kachelLaeden, ohneLadenZeile, shopTone, tileRows } from "@/lib/einkauf/shopGroups";
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
  it("A-048: meiste Sachen zuerst (Gleichstand: Reihenfolge aus „Meine Läden“, deren Schreibweise), bewusst „Egal wo“ zuletzt", () => {
    const r = tileRows(items, ["Lidl", "Rewe"], Infinity);
    expect(names(r)).toEqual(["Rossmann 3", "Rewe 2", "Lidl 1", "Edeka 1", "Egal wo 1"]);
    expect(r.rest).toBeNull();
    expect(r.rows[1].names).toEqual(["Milch", "Brot"]);
    expect(r.ohne).toEqual(["Spinat"]);
  });

  it("höchstens 3 Zeilen, der Rest als Zahl im Kopf", () => {
    const r = tileRows(items, ["Lidl", "Rewe"]);
    expect(names(r)).toEqual(["Rossmann 3", "Rewe 2", "Lidl 1"]);
    expect(r.rest).toBe("+ Edeka 1, Egal wo 1");
    expect(r.restZahl).toBe(2);
    const zwei = tileRows(items, ["Lidl", "Rewe"], 2);
    expect(names(zwei)).toEqual(["Rossmann 3", "Rewe 2"]);
    expect(zwei.restZahl).toBe(3);
  });

  // A-048 (Tafel 135): vorher nur 2 Läden + „+4“, obwohl Platz für 3 war
  it("A-048: 3 Läden, „+n“ erst ab dem 4. Laden – auch mit der Zeile „ohne Laden“ darunter", () => {
    const mit = (shop: string, n: number) => Array.from({ length: n }, (_, i) => ({ name: `${shop}${i}`, shop }));
    const laeden = ["Edeka", "Rewe", "Lidl", "Rossmann"];
    const ohne = [{ name: "Spinat", shop: "" }, { name: "Salz", shop: "" }];
    const drei = [...mit("Edeka", 3), ...mit("Rewe", 7), ...mit("Lidl", 3), ...ohne];
    const max = kachelLaeden({ mine: true, ohneDa: true, inhalt: true });
    expect(max).toBe(3);
    const r = tileRows(drei, laeden, max);
    expect(names(r)).toEqual(["Rewe 7", "Edeka 3", "Lidl 3"]);
    expect(r.restZahl).toBe(0);
    expect(r.ohne).toHaveLength(2);
    const vier = tileRows([...drei, ...mit("Rossmann", 1)], laeden, max);
    expect(names(vier)).toEqual(["Rewe 7", "Edeka 3", "Lidl 3"]);
    expect(vier.restZahl).toBe(1);
    // ohne „Meine Läden“ steht „Liste“ als eigene Zeile in der Liste: 2 + „Liste“; in einer festen Reihe wie bisher 2
    expect(kachelLaeden({ mine: false, ohneDa: true, inhalt: true })).toBe(2);
    expect(kachelLaeden({ mine: true, ohneDa: true, inhalt: false })).toBe(2);
    expect(kachelLaeden({ mine: true, ohneDa: false, inhalt: false })).toBe(3);
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
    // Läden mit Sachen kommen vor die leeren (A-048)
    const l = tileRows([{ name: "Zahnpasta", shop: "Rossmann" }], ["Edeka", "Rewe", "Lidl", "Rossmann"], 3);
    expect(names(l)).toEqual(["Rossmann 1", "Edeka 0", "Rewe 0"]);
    expect(l.rest).toBeNull();
    expect(names(tileRows([], ["Edeka", "Rewe", "Lidl", "Rossmann"], Infinity))).toEqual(["Edeka 0", "Rewe 0", "Lidl 0", "Rossmann 0"]);
    expect(tileRows([], [], 3)).toEqual({ rows: [], rest: null, restZahl: 0, ohne: [] });
  });

  it("Beispiel-Einkauf (Tafel 140): Edeka, Rewe, Lidl – die Kachel zeigt alle drei, kein Rest", () => {
    expect(DEMO_SHOPS).toEqual([
      { shop: "Edeka", names: ["Äpfel", "Eier", "Käse"] },
      { shop: "Rewe", names: ["Milch", "Brot", "Butter"] },
      { shop: "Lidl", names: ["Bananen", "Nudeln"] },
    ]);
    const demo = DEMO_SHOPS.flatMap((g) => g.names.map((name) => ({ name, shop: g.shop })));
    const order = DEMO_SHOPS.map((g) => g.shop);
    const s = tileRows(demo, order, 3);
    expect(names(s)).toEqual(["Edeka 3", "Rewe 3", "Lidl 2"]);
    expect(s.rest).toBeNull();
    expect(s.ohne).toEqual([]);
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
    const line = src.slice(src.indexOf("function OhneLadenZeile"), src.lastIndexOf("Sortieren ›") + 20);
    expect(line).toMatch(/flex-wrap/);
    expect(line).not.toMatch(/\btruncate\b/);
    expect(ohneLadenZeile(16)).toBe("16 ohne Laden");
  });
});
