// Feste Reihenfolgen (core/sort.ts) – Grenzfälle: leere Felder, Gleichstand,
// fehlende Zahlen, Regeln über eine andere Form.
import { describe, expect, it } from "vitest";
import {
  IDEAS,
  NOTES,
  PANTRY,
  PERSONS,
  PINS,
  RECIPES,
  SHOPPING,
  SHOP_GROUPS,
  SHOPS,
  TERMINE,
  TILE_PICKER,
  TIPS,
  ascNum,
  byName,
  compareText,
  first,
  searchRank,
  sortBy,
  timeThenCreated,
  via,
} from "@/lib/core/sort";

const names = <T extends { name: string }>(list: T[]) => list.map((x) => x.name);

describe("Grundregeln", () => {
  it("Text: deutsch, natürlich, leer zuletzt", () => {
    expect(["Tag 10", "", "äpfel", "Tag 2", "Birne"].sort(compareText)).toEqual(["äpfel", "Birne", "Tag 2", "Tag 10", ""]);
    expect(compareText(null, undefined)).toBe(0);
    expect(compareText("  ", "a")).toBeGreaterThan(0);
  });

  it("mehrere Regeln, bei Gleichstand bleibt die Eingangsreihenfolge; die Liste bleibt unverändert", () => {
    const list = [
      { name: "b", n: 2 },
      { name: "a", n: 1 },
      { name: "c", n: 2 },
      { name: "d", n: null },
    ];
    const sorted = sortBy(list, ascNum((x) => x.n));
    expect(names(sorted)).toEqual(["a", "b", "c", "d"]);
    expect(names(list)).toEqual(["b", "a", "c", "d"]);
    expect(names(sortBy(list, first((x) => x.name === "c"), byName((x) => x.name)))).toEqual(["c", "a", "b", "d"]);
    expect(names(sortBy(list))).toEqual(["b", "a", "c", "d"]);
  });

  it("Regeln über eine andere Form", () => {
    const list = [{ note: { pinned: false, geaendert: "2026-10-02" } }, { note: { pinned: true, geaendert: "2026-10-01" } }, { note: { pinned: false, geaendert: "2026-10-03" } }];
    const sorted = sortBy(list, ...via((x: (typeof list)[number]) => x.note, NOTES));
    expect(sorted.map((x) => x.note.geaendert)).toEqual(["2026-10-01", "2026-10-03", "2026-10-02"]);
  });
});

describe("Termine und Aufgaben", () => {
  it("ganztägig zuerst, dann Uhrzeit, dann Anlegen", () => {
    const t = [
      { date: "2026-10-21", time: "09:00", stamp: "2" },
      { date: "2026-10-21", time: null, stamp: "3" },
      { date: "2026-10-20", time: "18:00", stamp: "1" },
      { date: "2026-10-21", time: "09:00", stamp: "1" },
    ];
    expect(sortBy(t, ...TERMINE).map((x) => `${x.date} ${x.time} ${x.stamp}`)).toEqual(["2026-10-20 18:00 1", "2026-10-21 null 3", "2026-10-21 09:00 1", "2026-10-21 09:00 2"]);
  });

  it("Aufgaben: mit Uhrzeit vor ohne, sonst nach Anlegen", () => {
    const a = [
      { time: null, stamp: "2026-10-01" },
      { time: "08:00", stamp: "2026-10-05" },
      { time: null, stamp: "2026-09-30" },
    ];
    expect([...a].sort(timeThenCreated).map((x) => x.stamp)).toEqual(["2026-10-05", "2026-09-30", "2026-10-01"]);
  });
});

describe("Einkauf, Läden, Vorrat", () => {
  it("Abteilung im Laufweg, Rezept-Artikel nach Name, eigene in Eintrag-Reihenfolge, Unbekanntes hinten", () => {
    const items = [
      { section: "unbekannt", name: "X" },
      { section: "kuehlregal", name: "Zucchini-Joghurt", manualId: "m2" },
      { section: "kuehlregal", name: "Butter" },
      { section: "kuehlregal", name: "Apfelmus", manualId: "m1" },
      { section: "obst-gemuese", name: "Gurke" },
      { section: "kuehlregal", name: "Ayran" },
    ];
    expect(names(sortBy(items, ...SHOPPING))).toEqual(["Gurke", "Ayran", "Butter", "Zucchini-Joghurt", "Apfelmus", "X"]);
  });

  it("Läden-Gruppen und Läden", () => {
    const groups = [
      { shop: null, count: 9 },
      { shop: "Lidl", count: 2 },
      { shop: "Aldi", count: 2 },
      { shop: "REWE", count: 5 },
    ];
    expect(sortBy(groups, ...SHOP_GROUPS).map((g) => g.shop)).toEqual(["REWE", "Aldi", "Lidl", null]);
    expect(names(sortBy([{ name: "b", uses: 1 }, { name: "a", uses: 1 }, { name: "c", uses: 4 }], ...SHOPS))).toEqual(["c", "a", "b"]);
  });

  it("Vorrat: bald aufbrauchen, Ort, Name", () => {
    const p = [
      { name: "Nudeln", place: "schrank" },
      { name: "Erbsen", place: "tiefkuehler" },
      { name: "Milch", place: "kuehlschrank" },
      { name: "Feta", place: "kuehlschrank", soon: true },
      { name: "Irgendwas" },
    ];
    expect(names(sortBy(p, ...PANTRY))).toEqual(["Feta", "Milch", "Erbsen", "Nudeln", "Irgendwas"]);
  });
});

describe("Rezepte, Ideen, Pinnwand, Tipps, Kacheln, Personen", () => {
  it("Rezepte: Liebling, zuletzt gekocht, oft gekocht, Name", () => {
    const r = [
      { title: "B", cookedCount: 1 },
      { title: "A" },
      { title: "C", lastCookedAt: "2026-10-01" },
      { title: "D", favorite: true },
      { title: "E", lastCookedAt: "2026-10-10" },
    ];
    expect(sortBy(r, ...RECIPES).map((x) => x.title)).toEqual(["D", "E", "C", "B", "A"]);
  });

  it("Suche nach Trefferqualität", () => {
    expect(searchRank("", "Pasta")).toBe(0);
    expect(searchRank("pas", "Pasta mit Tomaten")).toBe(0);
    expect(searchRank("tom", "Pasta mit Tomaten")).toBe(1);
    expect(searchRank("ast", "Pasta")).toBe(2);
    expect(searchRank("feta", "Ofengemüse", ["Feta", "Paprika"])).toBe(3);
    expect(searchRank("xyz", "Pasta")).toBe(-1);
  });

  it("Ideen, Pinnwand, Tipps (KARAMBA nur bei gleicher Zeit vorn), Kachel-Auswahl", () => {
    expect(sortBy([{ score: 2, minutes: 30 }, { score: 2, minutes: 15 }, { score: 5, minutes: null }], ...IDEAS).map((i) => i.minutes)).toEqual([null, 15, 30]);
    expect(sortBy([{ at: "1" }, { at: "3", pinned: false }, { at: "2", pinned: true }], ...PINS).map((p) => p.at)).toEqual(["2", "3", "1"]);
    const tips = [
      { beginn: "2026-10-24T10:00", titel: "Markt", km: 3 },
      { beginn: "2026-10-24T10:00", titel: "Aktion", karamba: true, km: 9 },
      { beginn: "2026-10-24T09:00", titel: "Lauf", karamba: true },
      { beginn: "2026-10-24T10:00", titel: "Basar" },
    ];
    expect(sortBy(tips, ...TIPS).map((t) => t.titel)).toEqual(["Lauf", "Aktion", "Markt", "Basar"]);
    expect(sortBy([{ id: 1 }, { id: 2, fresh: true }], ...TILE_PICKER).map((t) => t.id)).toEqual([2, 1]);
  });

  it("Personen: Erwachsene, Kinder nach Alter, ohne Alter nach Gruppe, dann Name", () => {
    const p = [
      { name: "Jonne", role: "kind", ageGroup: "kitakind" },
      { name: "Mathis", role: "kind", age: 9 },
      { name: "Lisa", role: "erwachsen" },
      { name: "Ida", role: "kind", ageGroup: "schulkind" },
      { name: "Felix" },
    ];
    expect(names(sortBy(p, ...PERSONS))).toEqual(["Felix", "Lisa", "Mathis", "Ida", "Jonne"]);
  });
});
