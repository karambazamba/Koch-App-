// Vorrat: Orte, Mengen, Zusammenzählen, Abgleich mit Zutaten, Migration
// (pantry.ts) und „Vom Einkauf einräumen“ (einraeumen.ts).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatPantryAmount, formatPantryItem, ingredientStem, placeFor, sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";
import { toPutAway } from "@/lib/vorrat/einraeumen";
import { at, fakeWindow } from "../helpers";

let w: ReturnType<typeof fakeWindow>;

beforeEach(() => {
  at("2026-10-20T08:00");
  vi.resetModules();
  w = fakeWindow();
});

describe("Orte und Anzeige", () => {
  it("naheliegender Ort: Tiefkühler, Schrank, sonst Kühlschrank", () => {
    expect(placeFor("TK-Erbsen")).toBe("tiefkuehler");
    expect(placeFor("Eis")).toBe("tiefkuehler");
    expect(placeFor("Pommes")).toBe("tiefkuehler");
    expect(placeFor("Nudeln")).toBe("schrank");
    expect(placeFor("Mineralwasser")).toBe("schrank");
    expect(placeFor("Joghurt")).toBe("kuehlschrank");
  });

  it("Mengen mit Bruch-Zeichen", () => {
    expect(formatPantryAmount(null)).toBe("");
    expect(formatPantryAmount(0.5)).toBe("½");
    expect(formatPantryAmount(1.75)).toBe("1¾");
    expect(formatPantryAmount(2)).toBe("2");
    expect(formatPantryItem({ name: "Bacon", amount: 200, unit: "g" })).toBe("200 g Bacon");
    expect(formatPantryItem({ name: "Joghurt", amount: null, unit: "" })).toBe("Joghurt");
  });

  it("gleiche Zutat: Mehrzahl, Synonyme, nicht Gewürzpulver", () => {
    expect(ingredientStem("rote Zwiebeln")).toBe("zwiebel");
    expect(ingredientStem("Karotten")).toBe("möhre");
    expect(sameIngredient("Karotte", "Möhren")).toBe(true);
    expect(sameIngredient("Eier", "Ei")).toBe(true);
    expect(sameIngredient("Paprika", "Paprikapulver")).toBe(false);
    expect(sameIngredient("Kirschtomaten", "Tomate")).toBe(true);
    expect(sameIngredient("!!", "Milch")).toBe(false);
    expect(sameIngredient("Reis", "Mais")).toBe(false);
  });
});

describe("Speicher", () => {
  it("v1 ohne Ort → naheliegender Ort; Kaputtes fällt weg, nichts Gültiges geht verloren", async () => {
    w = fakeWindow({
      "wasgibts.vorrat": JSON.stringify({
        version: 1,
        items: [{ id: "1", name: "Reis", amount: 2, unit: "Packung", addedAt: "2026-10-01" }, { id: "2", name: "Milch" }, { id: "3", name: "Mehl", place: "schrank", amount: "viel" }, null, { name: "ohne id" }],
      }),
    });
    const { loadPantry } = await import("@/lib/vorrat/pantry");
    const items = loadPantry();
    expect(items.map((i) => [i.id, i.place])).toEqual([["1", "schrank"], ["2", "kuehlschrank"], ["3", "schrank"]]);
    expect(items[1]).toEqual({ id: "2", name: "Milch", amount: null, unit: "", addedAt: "", place: "kuehlschrank" });
    expect(JSON.parse(w.localStorage.getItem("wasgibts.vorrat")!).version).toBe(2);
  });

  it("unbekannte Version wird nicht gelesen", async () => {
    fakeWindow({ "wasgibts.vorrat": JSON.stringify({ version: 7, items: [] }) });
    const { loadPantry } = await import("@/lib/vorrat/pantry");
    expect(loadPantry()).toEqual([]);
  });

  it("hinzufügen zählt Gleiches zusammen (Form passt zur Menge), ändern, löschen, ersetzen", async () => {
    const { addPantryItems, loadPantry, removePantryItem, replacePantry, updatePantryItem } = await import("@/lib/vorrat/pantry");
    addPantryItems([{ name: "Karotten", amount: 2, unit: "" }, { name: "Bacon", amount: null, unit: "" }, { name: "Nudeln", amount: 500, unit: "g" }], "2026-10-18");
    addPantryItems([{ name: "Karotte", amount: 1, unit: "" }, { name: "Bacon", amount: null, unit: "" }, { name: "Nudeln", amount: 500, unit: "g", place: "kuehlschrank" }], "2026-10-20");
    let items = loadPantry();
    expect(items.map((i) => formatPantryItem(i))).toEqual(["3 Karotten", "Bacon", "500 g Nudeln", "500 g Nudeln"]);
    expect(items[0].addedAt).toBe("2026-10-20");
    expect(items.map((i) => i.place)).toEqual(["kuehlschrank", "kuehlschrank", "schrank", "kuehlschrank"]);
    addPantryItems([{ name: "Bacon", amount: 100, unit: "" }], "2026-10-20");
    expect(loadPantry()[1].amount).toBe(100);
    updatePantryItem(items[0].id, { place: "tiefkuehler" });
    expect(loadPantry()[0].place).toBe("tiefkuehler");
    const before = loadPantry();
    removePantryItem(items[1].id);
    expect(loadPantry()).toHaveLength(3);
    replacePantry(before);
    items = loadPantry();
    expect(items).toHaveLength(4);
  });
});

describe("Vom Einkauf einräumen", () => {
  const pantry = [{ id: "p", name: "Möhren", amount: 2, unit: "", addedAt: "", place: "kuehlschrank" }] as PantryItem[];

  it("nur Abgehaktes, das noch nicht im Vorrat steht und nicht schon eingeräumt wurde", () => {
    const items = [
      { key: "a", name: "Milch", checked: true },
      { key: "b", name: "Karotten", checked: true },
      { key: "c", name: "Brot", checked: false },
      { key: "d", name: "Salz", checked: true, hidden: true },
      { key: "e", name: "Eier", checked: true },
    ];
    expect(toPutAway(items, pantry, ["e"]).map((i) => i.name)).toEqual(["Milch"]);
  });

  it("merkt Eingeräumtes – nur die letzten 8 Wochen", async () => {
    const { markMoved } = await import("@/lib/vorrat/einraeumen");
    markMoved("2026-10-19", ["a"]);
    markMoved("2026-10-19", ["a", "b"]);
    for (let i = 1; i <= 8; i++) markMoved(`2026-0${i}-01`, ["x"]);
    const saved = JSON.parse(w.localStorage.getItem("wasgibts.eingeraeumt")!);
    expect(Object.keys(saved.weeks)).toHaveLength(8);
    expect(saved.weeks["2026-10-19"]).toEqual(["a", "b"]);
    expect(saved.weeks["2026-01-01"]).toBeUndefined();
  });

  it("repariert den Merker beim Laden", async () => {
    w = fakeWindow({ "wasgibts.eingeraeumt": JSON.stringify({ version: 1, weeks: { "2026-10-19": ["a", 1], quatsch: ["x"], "2026-10-12": "kein Array" } }) });
    const { markMoved } = await import("@/lib/vorrat/einraeumen");
    markMoved("2026-10-26", ["z"]);
    expect(JSON.parse(w.localStorage.getItem("wasgibts.eingeraeumt")!).weeks).toEqual({ "2026-10-19": ["a"], "2026-10-26": ["z"] });
  });

  it("falsche Version: Merker startet leer", async () => {
    w = fakeWindow({ "wasgibts.eingeraeumt": JSON.stringify({ version: 2, weeks: { "2026-10-19": ["a"] } }) });
    const { markMoved } = await import("@/lib/vorrat/einraeumen");
    markMoved("2026-10-26", ["z"]);
    expect(JSON.parse(w.localStorage.getItem("wasgibts.eingeraeumt")!).weeks).toEqual({ "2026-10-26": ["z"] });
  });
});
