import { describe, expect, it } from "vitest";
import {
  compareText,
  IDEAS,
  NOTES,
  PANTRY,
  PERSONS,
  PINS,
  RECIPES,
  SECTION_WALK,
  SHOP_GROUPS,
  SHOPPING,
  SHOPS,
  searchRank,
  sortBy,
  TERMINE,
  TILE_PICKER,
  TIPS,
  timeThenCreated,
} from "@/lib/core/sort";
import { SECTIONS } from "@/lib/einkauf/sections";
import { shopGroups } from "@/lib/einkauf/shopGroups";
import { allShops } from "@/lib/einkauf/shops";

const names = <T extends { name: string }>(list: T[]) => list.map((x) => x.name);

describe("deutsche Sortierung", () => {
  it("Umlaute richtig, Groß/klein egal, Zahlen natürlich", () => {
    const list = ["Zucchini", "Äpfel", "apfelmus", "Öl", "Tag 10", "Tag 2", "Brot"];
    expect([...list].sort(compareText)).toEqual(["Äpfel", "apfelmus", "Brot", "Öl", "Tag 2", "Tag 10", "Zucchini"]);
  });
  it("leere Felder zuletzt", () => {
    expect(["", "b", null as unknown as string, "a"].sort(compareText)).toEqual(["a", "b", "", null]);
  });
  it("stabil bei Gleichstand", () => {
    const list = [{ k: 1, id: "a" }, { k: 0, id: "b" }, { k: 1, id: "c" }, { k: 0, id: "d" }];
    expect(sortBy(list, (x, y) => x.k - y.k).map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
  });
});

describe("Termine und Aufgaben", () => {
  it("Termine: Tag → ganztägig zuerst → Uhrzeit → Erstellungszeit", () => {
    const list = [
      { id: "b", date: "2026-10-23", time: "09:00", stamp: "1" },
      { id: "c", date: "2026-10-22", time: "18:00", stamp: "1" },
      { id: "d", date: "2026-10-22", time: null, stamp: "2" },
      { id: "e", date: "2026-10-22", time: "08:00", stamp: "3" },
      { id: "f", date: "2026-10-22", time: "08:00", stamp: "2" },
    ];
    expect(sortBy(list, ...TERMINE).map((t) => t.id)).toEqual(["d", "f", "e", "c", "b"]);
  });
  it("Aufgaben: mit Uhrzeit nach Uhrzeit, sonst nach Anlegen – nie alphabetisch", () => {
    const list = [
      { id: "Zahnarzt", time: null, stamp: "2026-10-20" },
      { id: "Apotheke", time: null, stamp: "2026-10-21" },
      { id: "Bank", time: "10:00", stamp: "2026-10-22" },
    ];
    expect(sortBy(list, timeThenCreated).map((t) => t.id)).toEqual(["Bank", "Zahnarzt", "Apotheke"]);
  });
});

describe("Einkauf", () => {
  it("Abteilungen im Laufweg (auch in der Ansicht)", () => {
    expect(SECTIONS.map((s) => s.value)).toEqual([...SECTION_WALK]);
    expect(SECTION_WALK.slice(0, 4)).toEqual(["obst-gemuese", "brot", "kuehlregal", "fleisch-fisch"]);
  });
  it("Liste: Abteilung → aus Rezepten nach Name → eigene in Eintrag-Reihenfolge", () => {
    const list = [
      { name: "Milch", section: "kuehlregal", manualId: "1" },
      { name: "Zwiebeln", section: "obst-gemuese" },
      { name: "Äpfel", section: "obst-gemuese" },
      { name: "Butter", section: "kuehlregal" },
      { name: "Bananen", section: "obst-gemuese", manualId: "2" },
      { name: "Avocado", section: "obst-gemuese", manualId: "3" },
      { name: "Brötchen", section: "brot" },
      { name: "Rätselheft", section: "unbekannt" },
    ];
    expect(names(sortBy(list, ...SHOPPING))).toEqual(["Äpfel", "Zwiebeln", "Bananen", "Avocado", "Brötchen", "Butter", "Milch", "Rätselheft"]);
  });
  it("Läden-Gruppen: meiste zuerst, Gleichstand nach Name, Egal wo zuletzt", () => {
    const groups = shopGroups(
      [
        { name: "Milch", shop: "" },
        { name: "Brot", shop: "Rewe" },
        { name: "Seife", shop: "dm" },
        { name: "Eier", shop: "Edeka" },
        { name: "Käse", shop: "Edeka" },
      ],
      9,
    );
    expect(groups.map((g) => g.shop)).toEqual(["Edeka", "dm", "Rewe", null]);
    expect(sortBy([{ shop: null, count: 9 }, { shop: "Öko", count: 1 }, { shop: "Aldi", count: 1 }], ...SHOP_GROUPS).map((g) => g.shop)).toEqual(["Aldi", "Öko", null]);
  });
  it("Läden: meistgenutzt → Name", () => {
    expect(sortBy([{ name: "Lidl", uses: 0 }, { name: "Bäcker", uses: 0 }, { name: "dm", uses: 2 }], ...SHOPS).map((s) => s.name)).toEqual(["dm", "Bäcker", "Lidl"]);
    const shops = allShops({ shops: ["Ökomarkt"], itemShops: { müsli: "Rossmann", windeln: "rossmann", brot: "Bäcker" } });
    expect(shops.slice(0, 2)).toEqual(["Rossmann", "Bäcker"]);
    expect(shops.slice(2)).toEqual(["Aldi", "dm", "Edeka", "Lidl", "Ökomarkt", "Rewe", "Wochenmarkt"]);
  });
});

describe("Vorrat", () => {
  it("Bald aufbrauchen → Ort → Name", () => {
    const list = [
      { name: "Erbsen", place: "tiefkuehler" },
      { name: "Reis", place: "schrank" },
      { name: "Joghurt", place: "kuehlschrank" },
      { name: "Äpfel", place: "kuehlschrank" },
      { name: "Sahne", place: "kuehlschrank", soon: true },
    ];
    expect(names(sortBy(list, ...PANTRY))).toEqual(["Sahne", "Äpfel", "Joghurt", "Erbsen", "Reis"]);
  });
});

describe("Rezepte und Ideen", () => {
  it("Lieblinge → zuletzt gekocht → oft gekocht → Name", () => {
    const list = [
      { title: "Zucchini-Puffer", cookedCount: 0, lastCookedAt: null },
      { title: "Älplermagronen", cookedCount: 0, lastCookedAt: null },
      { title: "Chili", cookedCount: 5, lastCookedAt: "2026-10-01" },
      { title: "Bolognese", cookedCount: 2, lastCookedAt: "2026-10-20" },
      { title: "Pfannkuchen", favorite: true, cookedCount: 0, lastCookedAt: null },
      { title: "Linsen", cookedCount: 3, lastCookedAt: null },
    ];
    expect(sortBy(list, ...RECIPES).map((r) => r.title)).toEqual(["Pfannkuchen", "Bolognese", "Chili", "Linsen", "Älplermagronen", "Zucchini-Puffer"]);
  });
  it("Suche nach Trefferqualität: Anfang → Wortanfang → im Titel → Zutat", () => {
    expect(searchRank("nud", "Nudelauflauf")).toBe(0);
    expect(searchRank("nud", "Bunte Nudeln")).toBe(1);
    expect(searchRank("nud", "Bandnudeln")).toBe(2);
    expect(searchRank("nud", "Minestrone", ["Nudeln"])).toBe(3);
    expect(searchRank("nud", "Chili", ["Bohnen"])).toBe(-1);
    expect(searchRank("ÄPF", "Äpfel im Schlafrock")).toBe(0);
    expect(searchRank("", "Egal")).toBe(0);
  });
  it("Ideen: Punkte, bei Gleichstand die schnellere", () => {
    const list = [
      { id: "a", score: 3, minutes: 40 },
      { id: "b", score: 3, minutes: 15 },
      { id: "c", score: 5, minutes: 60 },
      { id: "d", score: 3, minutes: null },
    ];
    expect(sortBy(list, ...IDEAS).map((i) => i.id)).toEqual(["c", "b", "a", "d"]);
  });
});

describe("Notizen, Pinnwand, Tipps", () => {
  it("Notizen: angeheftet → zuletzt geändert", () => {
    const list = [
      { id: "alt", geaendert: "2026-10-01T10:00" },
      { id: "neu", geaendert: "2026-10-22T10:00" },
      { id: "pin", pinned: true, geaendert: "2026-09-01T10:00" },
    ];
    expect(sortBy(list, ...NOTES).map((n) => n.id)).toEqual(["pin", "neu", "alt"]);
  });
  it("Pinnwand: angeheftet → neueste (Neues steht immer oben)", () => {
    const list = [
      { id: "gestern", at: "2026-10-21T08:00" },
      { id: "pin", pinned: true, at: "2026-10-20T08:00" },
      { id: "jetzt", at: "2026-10-22T08:00" },
    ];
    expect(sortBy(list, ...PINS).map((p) => p.id)).toEqual(["pin", "jetzt", "gestern"]);
  });
  it("Tipps: Beginn → (KARAMBA nur bei gleicher Zeit) → Entfernung → Titel", () => {
    const list = [
      { titel: "Zirkus", beginn: "2026-10-24T15:00", km: 3 },
      { titel: "Konzert", beginn: "2026-10-24T15:00", km: 12, karamba: true },
      { titel: "Ährenfest", beginn: "2026-10-24T15:00", km: 3 },
      { titel: "Flohmarkt", beginn: "2026-10-24T09:00", km: 30 },
      { titel: "Lesung", beginn: "2026-10-23T19:00", km: 8 },
    ];
    expect(sortBy(list, ...TIPS).map((t) => t.titel)).toEqual(["Lesung", "Flohmarkt", "Konzert", "Ährenfest", "Zirkus"]);
  });
});

describe("Startseite und Personen", () => {
  it("Kachel-Auswahl: Neu oben, sonst Standard-Reihenfolge", () => {
    const list = [{ id: "termine" }, { id: "wetter", fresh: true }, { id: "aufgaben" }, { id: "timer", fresh: true }];
    expect(sortBy(list, ...TILE_PICKER).map((t) => t.id)).toEqual(["wetter", "timer", "termine", "aufgaben"]);
  });
  it("Personen: Erwachsene → Kinder nach Alter (älteste zuerst) → Name", () => {
    const list = [
      { name: "Ole", role: "kind", age: 4 },
      { name: "Felix", role: "erwachsen" },
      { name: "Mathis", role: "kind", ageGroup: "kleinkind" },
      { name: "Ella", role: "kind", age: 9 },
      { name: "Anna", role: "erwachsen" },
      { name: "Jonne", role: "kind", ageGroup: "schulkind" },
      { name: "Ömer", role: "kind" },
    ];
    expect(names(sortBy(list, ...PERSONS))).toEqual(["Anna", "Felix", "Ella", "Ole", "Jonne", "Mathis", "Ömer"]);
  });
});
