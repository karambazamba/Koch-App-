// Ideen für heute, Bestand, Wünsche und „Das mögt ihr“ (alles ohne KI)
import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { ideasFor, recentDishes } from "@/lib/essen/ideas";
import {
  EMPTY_STOCK_HINT,
  ingredientsFromQuestion,
  isCookIdeasRequest,
  matchStock,
  mergeStock,
  soonToUse,
  stockIdeas,
  stockItem,
  stockKey,
  stockNearlyEmpty,
  usesLine,
} from "@/lib/essen/dishIdeas";
import { addWish, loadWishes, parseWish, removeWish, restoreWishes, wishLabel } from "@/lib/essen/wishes";
import { extractLikeStatements, learnFromRecipe, learnLikes, likeLevel, likesFromIngredients, sortedLikes, withLikes, withoutLike } from "@/lib/essen/likes";
import type { NeverAgainEntry } from "@/lib/einstellungen/profile";
import { buch, fakeWindow, familie, rezept, vorrat } from "./hilfen";

let storage: Storage;
beforeEach(() => {
  at("2026-10-22T12:00");
  storage = fakeWindow();
});

const nie = (title: string): NeverAgainEntry => ({ id: title, title, ingredients: [], reason: "", addedAt: "2026-10-01" });
const ctx = (change: Partial<Parameters<typeof ideasFor>[0]> = {}) => ({
  date: "2026-10-22",
  recipes: {},
  pantry: [],
  wishes: [],
  neverAgain: [],
  recent: [],
  dismissed: [],
  ...change,
});

describe("Ideen für heute", () => {
  it("Wünsche ganz oben, mit Rezept falls vorhanden", () => {
    const r = rezept("Pfannkuchen", ["Eier", "Milch"], { id: "pf", known: true });
    const ideas = ideasFor(ctx({
      recipes: buch(r),
      pantry: [vorrat("Eier")],
      wishes: [
        { id: "w1", personId: null, who: "Mathis", dish: "Pfannkuchen", createdAt: "" },
        { id: "w2", personId: null, who: "", dish: "Lachsnudeln", createdAt: "" },
      ],
    }));
    expect(ideas[0]).toMatchObject({ id: "w:w1", recipeId: "pf", reason: "Mathis' Wunsch", uses: ["Eier"], needs: ["Milch"], known: true });
    expect(ideas[1]).toMatchObject({ id: "w:w2", category: "fisch", reason: "Wunsch", known: true, minutes: null });
  });

  it("leerer Vorrat: Grundzutaten-Gerichte und Lieblinge; Herbst-Gerichte passen zur Jahreszeit", () => {
    const fav = rezept("Omas Gulasch", ["Rindfleisch"], { id: "g", favorite: true, prepMinutes: 50 });
    const ideas = ideasFor(ctx({ recipes: buch(fav) }));
    const titles = ideas.map((i) => i.title);
    expect(titles).toContain("Kartoffelsuppe");
    expect(titles).not.toContain("Spargel mit Kartoffeln");
    expect(ideas.find((i) => i.id === "g")?.reason).toBe("euer Liebling");
    expect(ideas.find((i) => i.title === "Kürbissuppe")?.reason).toBe("passt zur Jahreszeit");
    expect(ideas.find((i) => i.title === "Pfannkuchen")?.reason).toBe("geht fast immer");
  });

  it("Bestand überwiegt: Reste zuerst und Begründung „mit … aus dem Vorrat“", () => {
    const r = rezept("Hack-Pfanne", ["Hackfleisch", "Paprika"], { id: "hp" });
    const neu = rezept("Exotisch", ["Drachenfrucht"], { id: "ex" });
    const ideas = ideasFor(ctx({
      recipes: buch(r, neu),
      pantry: [vorrat("Hackfleisch", "kuehlschrank", "2026-10-20"), vorrat("Paprika"), vorrat("Reis", "schrank")],
    }));
    expect(ideas[0].title).toMatch(/Hack/);
    expect(ideas.find((i) => i.id === "hp")?.reason).toBe("Reste zuerst: Hackfleisch");
    expect(ideas.find((i) => i.id === "ex")?.reason).toBe("mal was Neues");
    expect(ideas.find((i) => i.title === "Hähnchenpfanne mit Reis")?.reason).toBe("mit Paprika und Reis (im Haus)");
    expect(ideas.find((i) => i.title === "Hack-Paprika-Pfanne mit Reis")?.reason).toBe("Reste zuerst: Hackfleisch");
    // Bekannte eigene Rezepte ohne Vorrat: „kennt ihr“, nie „fehlt“
    const known = ideasFor(ctx({ recipes: buch(rezept("Lieblingssuppe", [], { id: "k", known: true })) }));
    expect(known.find((i) => i.id === "k")?.reason).toBe("kennt ihr");
    expect(known.every((i) => !/fehlt|alles da|noch:/i.test(i.reason))).toBe(true);
    expect(ideas.find((i) => i.title === "Hähnchenpfanne mit Reis")?.needs).toEqual(["Hähnchenbrust"]);
  });

  it("ohne Backen, „Nie wieder“, Kürzliches und Weggewischtes; Filter", () => {
    const recipes = buch(
      rezept("Kuchen", ["Mehl"], { id: "ku", kind: "backen" }),
      rezept("Chili", ["Bohnen"], { id: "ch" }),
      rezept("Curry", ["Reis"], { id: "cu", category: "fleisch", prepMinutes: 50 }),
      rezept("Nudeln mit Pesto", ["Nudeln"], { id: "np", prepMinutes: 15 }),
    );
    const ideas = ideasFor(ctx({ recipes, neverAgain: [nie("Chili")], recent: ["Pfannkuchen"], dismissed: ["k:Rührei mit Brot"] }));
    const ids = ideas.map((i) => i.id);
    expect(ids).not.toContain("ku");
    expect(ids).not.toContain("ch");
    expect(ids).not.toContain("k:Pfannkuchen");
    expect(ids).not.toContain("k:Rührei mit Brot");
    // Eigenes Rezept mit gleichem Namen ersetzt den Klassiker
    expect(ids.filter((i) => i === "np" || i === "k:Nudeln mit Pesto")).toEqual(["np"]);
    const fast = ideasFor(ctx({ recipes, filters: ["schnell", "veggie"] }));
    expect(fast.every((i) => i.minutes !== null && i.minutes <= 25 && i.category === "vegetarisch")).toBe(true);
    expect(ideasFor(ctx({ recipes, filters: ["vorrat"] }))).toEqual([]);
  });

  it("Reihenfolge bleibt am selben Tag gleich und ändert sich von Tag zu Tag", () => {
    const a = ideasFor(ctx()).map((i) => i.id);
    expect(ideasFor(ctx()).map((i) => i.id)).toEqual(a);
    // Samstag: kein „unter der Woche schnell“
    expect(ideasFor(ctx({ date: "2026-10-24" })).length).toBeGreaterThan(5);
    expect(ideasFor(ctx({ date: "2026-07-15" })).map((i) => i.title)).toContain("Nudelsalat");
    expect(ideasFor(ctx({ date: "2026-04-15" })).map((i) => i.title)).toContain("Spargel mit Kartoffeln");
    expect(ideasFor(ctx({ date: "2026-01-15" })).map((i) => i.title)).toContain("Linsensuppe");
  });

  it("Gerichte der letzten 5 Tage aus dem Plan", () => {
    const WEEK = "2026-10-19";
    const plans = {
      "2026-10-12": { Freitag: { kind: "text" as const, title: "Zu alt", category: null }, Sonntag: { kind: "text" as const, title: "Braten", category: null } },
      [WEEK]: { Montag: { kind: "text" as const, title: "Pizza", category: null }, Donnerstag: { kind: "text" as const, title: "Heute", category: null } },
    };
    expect(recentDishes("2026-10-22", familie({ shoppingDay: "" }), {}, plans, {})).toEqual(["Braten", "Pizza"]);
  });
});

describe("Bestand", () => {
  it("Abgleich ohne Grundzutaten, Synonyme", () => {
    expect(matchStock(["Möhren", "Salz", " ", "Hack"], [vorrat("Karotten"), vorrat("Hackfleisch")])).toEqual({ uses: ["Karotten", "Hackfleisch"], needs: [], unsure: [] });
    expect(stockNearlyEmpty([vorrat("Salz"), vorrat("Milch")])).toBe(true);
    expect(stockNearlyEmpty([vorrat("Eier"), vorrat("Milch"), vorrat("Brot")])).toBe(false);
    expect(EMPTY_STOCK_HINT).toMatch(/Sag mir/);
  });

  it("bald verbrauchen: Frisches im letzten Drittel seiner Zeit, nicht Gekauftes/Gesagtes", () => {
    const list = [vorrat("Milch", "kuehlschrank", "2026-10-17"), vorrat("Käse", "kuehlschrank", "2026-10-21"), vorrat("Reis", "schrank", "2026-10-01"), stockItem("Quark", "b", "2026-10-17")];
    expect(soonToUse(list, "2026-10-22").map((p) => p.name)).toEqual(["Milch"]);
    expect(stockItem("Quark", "s", "2026-10-22")).toEqual({ id: "s:Quark", name: "Quark", addedAt: "2026-10-22", place: "schrank" });
  });

  it("zusammenführen und Kennung", () => {
    const merged = mergeStock([vorrat("Eier")], [stockItem("Ei", "b", "x"), stockItem("Brot", "s", "x")]);
    expect(merged.map((p) => p.name)).toEqual(["Eier", "Brot"]);
    expect(stockKey([vorrat("B", "kuehlschrank", "x"), vorrat("a")])).toBe("a|b");
  });

  it("drei Ideen nur aus der Gerichte-Liste", () => {
    expect(stockIdeas([]).map((i) => i.title)).toEqual(["Rührei mit Brot", "Käsebrot mit Rohkost", "Nudeln mit Pesto"]);
    const ideas = stockIdeas([vorrat("Hackfleisch"), vorrat("Paprika"), vorrat("Reis")], 2);
    expect(ideas[0]).toMatchObject({ title: "Hack-Paprika-Pfanne mit Reis", needs: [] });
    expect(ideas).toHaveLength(2);
  });

  it("Zeile „nutzt: … · auf die Liste: …“ – nie „fehlt“ oder „noch:“", () => {
    expect(usesLine(["Hack", "Paprika", "Reis", "Mais"], ["Sahne"])).toBe("nutzt: Hack, Paprika, Reis · auf die Liste: Sahne");
    expect(usesLine([], ["Sahne", "Dill"])).toBe("auf die Liste: Sahne und Dill");
    expect(usesLine(["Ei"], ["a", "b", "c"])).toBe("nutzt: Ei");
    expect(usesLine([], [])).toBe("");
  });

  it("Fragen im Chat", () => {
    expect(isCookIdeasRequest("Was kann ich heute kochen?")).toBe(true);
    expect(isCookIdeasRequest("Was koche ich?")).toBe(true);
    expect(isCookIdeasRequest("Hast du eine Idee fürs Abendessen?")).toBe(true);
    expect(isCookIdeasRequest("Was gibt's heute?")).toBe(true);
    expect(isCookIdeasRequest("Was kann ich mit Reis kochen?")).toBe(false);
    expect(ingredientsFromQuestion("Was mach ich mit Hack und Paprika?")).toEqual(["Hack", "Paprika"]);
    expect(ingredientsFromQuestion("Was kann ich aus dem Rest Reis, meinem Brokkoli machen")).toEqual(["Reis", "Brokkoli"]);
    // Fehler: „was da ist“ wurde als Zutat erkannt
    expect(ingredientsFromQuestion("Was mach ich mit dem, was da ist?")).toBeNull();
    expect(ingredientsFromQuestion("Was koche ich aus Reis und was noch da ist")).toEqual(["Reis"]);
    expect(ingredientsFromQuestion("Wie spät ist es?")).toBeNull();
  });
});

describe("Wünsche", () => {
  it("erkennt Wunsch-Sätze", () => {
    const persons = familie().persons;
    expect(parseWish("Lotte, Mathis wünscht sich Pfannkuchen", persons)).toEqual({ who: "Mathis", personId: "mathis", dish: "Pfannkuchen", weekday: false });
    expect(parseWish("Ich wünsche mir am Freitag mal wieder Lasagne!", persons)).toEqual({ who: "", personId: null, dish: "Lasagne", weekday: true });
    expect(parseWish("Wunsch von Ella: nudeln", persons)).toEqual({ who: "Ella", personId: null, dish: "Nudeln", weekday: false });
    expect(parseWish("Mathis wünscht sich bitte", persons)).toBeNull();
    expect(parseWish("Was gibt's?", persons)).toBeNull();
    expect(parseWish(`Ich wünsche mir ${"x".repeat(70)}`, persons)).toBeNull();
  });

  it("Beschriftung", () => {
    expect(wishLabel("Mathis")).toBe("Mathis' Wunsch");
    expect(wishLabel("Ella")).toBe("Ellas Wunsch");
    expect(wishLabel("")).toBe("Wunsch");
  });

  it("speichern ohne Doppelte, entfernen, wiederherstellen, Migration", () => {
    const a = addWish({ personId: null, who: "Ella", dish: "Nudeln" }, "2026-10-22");
    addWish({ personId: null, who: "Ella", dish: "nudeln" }, "2026-10-22");
    addWish({ personId: null, who: "Ben", dish: "Fisch" }, "2026-10-22");
    expect(loadWishes().map((w) => w.dish)).toEqual(["nudeln", "Fisch"]);
    const before = loadWishes();
    removeWish(loadWishes()[0].id);
    expect(loadWishes().map((w) => w.dish)).toEqual(["Fisch"]);
    restoreWishes(before);
    expect(loadWishes()).toHaveLength(2);
    expect(a.createdAt).toBe("2026-10-22");
    storage.setItem("wasgibts.wuensche", JSON.stringify({ version: 1, wishes: [{ id: "x", dish: "Eis", personId: 3 }, { id: 2, dish: "y" }, null] }));
    expect(loadWishes()).toEqual([{ id: "x", personId: null, who: "", dish: "Eis", createdAt: "" }]);
    storage.setItem("wasgibts.wuensche", JSON.stringify({ version: 2, wishes: [] }));
    expect(loadWishes()).toEqual([]);
  });
});

describe("Das mögt ihr", () => {
  it("Vorlieben aus Zutaten: ohne Grundzutaten, Basen, Gewürzpulver; Aliase", () => {
    expect(likesFromIngredients([{ name: "rote Zwiebeln" }, { name: "Salz" }, { name: "Spaghetti" }, { name: "Paprikapulver" }, { name: "Knoblauchzehen" }, { name: "Möhren" }, { name: "Hack" }, { name: "" }, { name: "Feta" }, { name: "Feta" }])).toEqual([
      "Zwiebel",
      "Knoblauch",
      "Karotte",
      "Hackfleisch",
      "Feta",
    ]);
    expect(likesFromIngredients([{ name: "Kirschtomaten" }, { name: "Quatschwort" }])).toEqual(["Kirschtomate"]);
    expect(likesFromIngredients([{ name: "Rinderhackfleisch" }])).toEqual(["Rinderhackfleisch"]);
  });

  it("lernen mit Gewicht; Allergie/„mag nicht“ und Entferntes werden nicht gelernt", () => {
    const base = familie();
    const profile = familie({ persons: base.persons.map((p) => (p.id === "ben" ? { ...p, dislikes: ["Pilze"], allergies: ["Nüsse"] } : p)) });
    let p = withLikes(profile, ["Käse", "Pilz", "Nüsse", "Salz"], 2);
    expect(p.likes).toEqual([{ name: "Käse", weight: 2 }]);
    p = withLikes(p, ["Käse"], 3);
    expect(p.likes).toEqual([{ name: "Käse", weight: 5 }]);
    p = withoutLike(p, "Käse");
    expect(p.likes).toEqual([]);
    expect(p.likesBlocked).toEqual(["Käse"]);
    expect(withLikes(p, ["Käse"], 1).likes).toEqual([]);
    // Selbst ergänzt: hebt die Sperre auf, auch Unbekanntes
    p = withLikes(p, ["Käse", "omas soße"], 5, true);
    expect(p.likes).toEqual([
      { name: "Käse", weight: 5, manual: true },
      { name: "Omas soße", weight: 5, manual: true },
    ]);
    expect(p.likesBlocked).toEqual([]);
    p = withLikes(p, ["Käse"], 5, true);
    expect(p.likes[0]).toEqual({ name: "Käse", weight: 10, manual: true });
  });

  it("sortiert und in Stufen", () => {
    const likes = [{ name: "B", weight: 1 }, { name: "A", weight: 9 }, { name: "C", weight: 1 }, { name: "D", weight: 5 }];
    expect(sortedLikes(likes).map((l) => l.name)).toEqual(["A", "D", "B", "C"]);
    expect(likes.map((l) => likeLevel(l, likes))).toEqual([1, 3, 1, 2]);
  });

  it("Sätze im Chat; Verneinung zählt nicht", () => {
    expect(extractLikeStatements("Wir lieben Käse und Knoblauch!")).toEqual(["Käse", "Knoblauch"]);
    expect(extractLikeStatements("Paprika geht bei uns immer")).toEqual(["Paprika"]);
    expect(extractLikeStatements("Feta essen wir sehr gern")).toEqual(["Feta"]);
    expect(extractLikeStatements("Die Kinder mögen total gerne Mais, Erbsen")).toEqual(["Mais", "Erbse"]);
    expect(extractLikeStatements("Wir mögen keine Pilze")).toEqual([]);
    expect(extractLikeStatements("Wir lieben Urlaub")).toEqual([]);
    expect(extractLikeStatements("Hallo")).toEqual([]);
  });

  it("lernt in das gespeicherte Profil", () => {
    learnLikes(["Käse"], 2);
    expect(storage.getItem("familienkueche.haushaltsprofil")).toBeNull();
    storage.setItem("familienkueche.haushaltsprofil", JSON.stringify(familie()));
    learnLikes([], 2);
    learnFromRecipe(undefined, 2);
    learnFromRecipe(rezept("Ofengemüse", ["Zucchini", "Feta"]), 1);
    expect(JSON.parse(storage.getItem("familienkueche.haushaltsprofil")!).likes).toEqual([
      { name: "Zucchini", weight: 1 },
      { name: "Feta", weight: 1 },
    ]);
  });
});
