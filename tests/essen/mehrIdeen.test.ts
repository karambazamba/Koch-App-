// „Mehr Ideen“: feste Grenzen, Mischung 3/2/2/1 bzw. 2/2/2/2, alles im Haus
// zuerst, Auffüllen, gleiche Mischung am selben Tag, höchstens 2 von gestern,
// Lernen verschiebt die Gewichtung.
import { describe, expect, it } from "vitest";
import { moreIdeas, type Interest, type MixInput } from "@/lib/essen/mehrIdeen/mix";
import { BUILTIN_COOK, recipeKind } from "@/lib/essen/kochen";
import type { Recipe } from "@/lib/essen/cookbook";

const none: Interest = { taps: {}, seen: {}, kinds: {} };
const base = (over: Partial<MixInput> = {}): MixInput => ({ recipes: BUILTIN_COOK, current: "", date: "2026-10-21", household: "h1", avoid: [], recent: [], stock: [], interest: none, ...over });
const groups = (input: MixInput) => moreIdeas(input).map((c) => c.group);
const count = (list: string[], g: string) => list.filter((x) => x === g).length;
const own = (id: string, title: string, extra: Partial<Recipe> = {}): Recipe => ({ ...BUILTIN_COOK[0], id, title, cookedCount: 3, ...extra });

describe("Eingebaute Rezepte", () => {
  it("haben Aufwand und Art, genug von jeder Sorte", () => {
    const kinds = BUILTIN_COOK.map(recipeKind);
    expect(BUILTIN_COOK.length).toBeGreaterThanOrEqual(30);
    expect(kinds.filter((k) => k.art === "besonders").length).toBeGreaterThanOrEqual(12);
    expect(kinds.filter((k) => k.aufwand === "aufwendig").length).toBeGreaterThanOrEqual(8);
    expect(new Set(BUILTIN_COOK.map((r) => r.id)).size).toBe(BUILTIN_COOK.length);
  });
});

describe("Mischung", () => {
  it("unter der Woche 3/2/2/1 – ohne Lieblinge gehen deren Plätze an „einfach“, Aufwendiges hinten", () => {
    const g = groups(base());
    expect(g).toHaveLength(8);
    expect([count(g, "einfach"), count(g, "lieblinge"), count(g, "besonders"), count(g, "zeit")]).toEqual([5, 0, 2, 1]);
    expect(g[7]).toBe("zeit");
    expect(g[2]).toBe("besonders");
  });

  it("mit Lieblingen 3/2/2/1, am Wochenende 2/2/2/2 mit Aufwendigen vorn", () => {
    const recipes = [...BUILTIN_COOK, own("r1", "Omas Suppe"), own("r2", "Papas Pfanne"), own("r3", "Tante Ilses Eintopf")];
    const week = groups(base({ recipes }));
    expect([count(week, "einfach"), count(week, "lieblinge"), count(week, "besonders"), count(week, "zeit")]).toEqual([3, 2, 2, 1]);
    const sat = groups(base({ recipes, date: "2026-10-24" }));
    expect([count(sat, "einfach"), count(sat, "lieblinge"), count(sat, "besonders"), count(sat, "zeit")]).toEqual([2, 2, 2, 2]);
    expect(sat.slice(0, 2)).toEqual(["zeit", "zeit"]);
    expect(sat[2]).toBe("besonders");
  });

  it("Etiketten nur bei „Besonders“ und „Wenn Zeit ist“", () => {
    const cards = moreIdeas(base());
    expect(cards.filter((c) => c.label === "Besonders").every((c) => c.group === "besonders")).toBe(true);
    expect(cards.find((c) => c.group === "zeit")?.label).toBe("Wenn Zeit ist");
    expect(cards.filter((c) => c.group === "einfach").every((c) => c.label === null)).toBe(true);
  });

  it("je Gruppe zuerst „alles im Haus“", () => {
    const stock = ["Gnocchi", "Kirschtomaten", "Parmesan", "Salbei"].map((name, i) => ({ id: `p${i}`, name, amount: null, unit: "", addedAt: "2026-10-20", place: "schrank" as const }));
    const cards = moreIdeas(base({ stock, date: "2026-01-01" }));
    expect(cards.find((c) => c.group === "besonders")?.recipe.title).toBe("Gnocchi mit Salbeibutter");
    for (const g of ["einfach", "besonders", "zeit"]) {
      const inGroup = cards.filter((c) => c.group === g).map((c) => c.ready);
      expect(inGroup).toEqual([...inGroup].sort((a, b) => Number(b) - Number(a)));
    }
  });
});

describe("Feste Grenzen", () => {
  it("Allergien, „mag nicht“, letzte 7 Tage und das aktuelle Rezept – auch bei „Besonders“", () => {
    const cards = moreIdeas(base({ avoid: ["Erdnüsse", "Ei"], recent: ["Shakshuka"], current: "k:pad-thai" }));
    for (const c of cards) {
      expect(c.recipe.id).not.toBe("k:pad-thai");
      expect(c.recipe.title).not.toBe("Shakshuka");
      expect(c.recipe.ingredients.some((i) => /erdnüss|^eier?$/i.test(i.name))).toBe(false);
    }
  });

  it("vegetarisch: kein Fleisch, kein Fisch – strenge Profile bekommen weniger Karten", () => {
    const veg = moreIdeas(base({ avoid: ["Fleisch", "Fisch"] }));
    expect(veg.every((c) => c.recipe.category === "vegetarisch")).toBe(true);
    const strict = moreIdeas(base({ avoid: ["Fleisch", "Fisch", "Eier", "Käse", "Milch", "Nudeln", "Reis", "Tomaten"] }));
    expect(strict.length).toBeLessThan(8);
  });
});

describe("Jeden Tag neu", () => {
  it("gleicher Tag = gleiche 8, morgen andere, höchstens 2 von gestern", () => {
    const ids = (date: string) => moreIdeas(base({ date })).map((c) => c.recipe.id);
    expect(ids("2026-10-21")).toEqual(ids("2026-10-21"));
    expect(ids("2026-10-22")).not.toEqual(ids("2026-10-21"));
    for (const d of ["2026-10-22", "2026-10-23", "2026-10-27", "2026-11-03"]) {
      const prev = new Date(`${d}T12:00:00Z`);
      prev.setUTCDate(prev.getUTCDate() - 1);
      const yesterday = ids(prev.toISOString().slice(0, 10));
      expect(ids(d).filter((x) => yesterday.includes(x)).length).toBeLessThanOrEqual(2);
    }
  });

  it("Lernen verschiebt die Mischung leicht in Richtung des Angetippten", () => {
    const shown = (interest: Interest) => moreIdeas(base({ interest })).map((c) => c.recipe.category);
    const fish: Interest = { taps: {}, seen: {}, kinds: { "cat:fisch": 30 } };
    expect(shown(fish).filter((c) => c === "fisch").length).toBeGreaterThanOrEqual(shown(none).filter((c) => c === "fisch").length);
    const tapped: Interest = { taps: { "k:ramen": 2 }, seen: {}, kinds: {} };
    expect(moreIdeas(base({ interest: tapped })).find((c) => c.recipe.id === "k:ramen")?.group).toBe("lieblinge");
  });
});

describe("Still mitlernen (Speicher)", () => {
  it("Antippen zählt Gericht, Art, Aufwand und Kategorie; gezeigt einmal am Tag", async () => {
    const { fakeWindow, noBrowser } = await import("../helpers");
    const { noteIdeaInterest, noteIdeasShown } = await import("@/lib/essen/mehrIdeen/store");
    const win = fakeWindow({ "wasgibts.ideenmix": JSON.stringify({ version: 1, day: "", taps: { x: "kaputt" }, seen: {}, kinds: {} }) });
    try {
      const ramen = BUILTIN_COOK.find((r) => r.id === "k:ramen")!;
      noteIdeaInterest(ramen);
      noteIdeasShown(["k:ramen", "k:shakshuka"], "2026-10-21");
      noteIdeasShown(["k:ramen"], "2026-10-21");
      const saved = JSON.parse(win.localStorage.getItem("wasgibts.ideenmix")!);
      expect(saved.taps).toEqual({ "k:ramen": 1 });
      expect(saved.kinds).toEqual({ "cat:fleisch": 1, "aufwand:normal": 1, "art:besonders": 1 });
      expect(saved.seen).toEqual({ "k:ramen": 1, "k:shakshuka": 1 });
    } finally {
      noBrowser();
    }
  });

  it("eigene Rezepte: Aufwand aus Zeit, Zutaten und Ofen geschätzt", () => {
    expect(recipeKind({ ...BUILTIN_COOK[0], id: "r", prepMinutes: 15 }).aufwand).toBe("einfach");
    expect(recipeKind({ ...BUILTIN_COOK[0], id: "r", prepMinutes: 60 }).aufwand).toBe("aufwendig");
    expect(recipeKind({ ...BUILTIN_COOK[0], id: "r", prepMinutes: 35 }).aufwand).toBe("normal");
  });
});
