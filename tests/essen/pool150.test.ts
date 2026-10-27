// Essen: 150 beliebte Alltagsgerichte – jedes mit Gruppe, Beliebtheit,
// Rezept und Bild – und Ideen, die jeden Tag neu gemischt werden.
//
// 30 Tage simuliert (Herbst, Familie mit 5 Lieblingsrezepten): jeden Tag
// werden die 8 gezeigten Ideen als „gezeigt“ gemerkt; die Familie nimmt
// meist den ersten Klassiker (Platz 2), jeden 4. Tag ihren Liebling
// (Platz 1). Gemessen wird über alle gezeigten 8er-Listen: mindestens 80
// verschiedene Gerichte, kein Gericht (außer den Lieblingen, die sollen
// wiederkommen) öfter als 3× unter den ersten drei, je Tag höchstens 2 je
// Gruppe, jeden Tag mindestens ein Liebling, nie etwas aus den letzten 14
// Tagen.
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DISHES } from "@/lib/essen/dishIdeas";
import { GERICHTE, GERICHT_REZEPTE } from "@/lib/essen/gerichte";
import type { Gruppe } from "@/lib/essen/gerichte/types";
import { BUILTIN_COOK, cookRecipe, rezeptIdFuer } from "@/lib/essen/kochen";
import { findRecipe } from "@/lib/essen/baking";
import { ideasFor, RECENT_DAYS, SHOWN_IDEAS, type Idea } from "@/lib/essen/ideas";
import { DISH_IMAGES } from "@/lib/essen/dishImageList";
import { dishSlug } from "@/lib/essen/dishSlug";
import { dishArt } from "@/lib/essen/dishArt";
import { addDays } from "@/lib/core/now";
import { buch, familie, rezept } from "./hilfen";

const ZIEL: Record<Gruppe, number> = { deutsch: 30, nudeln: 25, asiatisch: 20, vegetarisch: 20, fisch: 15, fleisch: 15, suppen: 10, international: 10, suess: 5 };

describe("150 Gerichte", () => {
  it("genau 150, ohne Doppelte, Gruppen wie geplant (± 1)", () => {
    expect(DISHES).toHaveLength(150);
    expect(new Set(DISHES.map((d) => d.title.toLowerCase())).size).toBe(150);
    for (const [gruppe, ziel] of Object.entries(ZIEL)) {
      const n = DISHES.filter((d) => d.gruppe === gruppe).length;
      expect(Math.abs(n - ziel), gruppe).toBeLessThanOrEqual(1);
    }
  });

  it("jedes Gericht: Gruppe, Beliebtheit 1–5, Kinder-Angabe, Zeit, Hauptzutaten", () => {
    for (const d of DISHES) {
      expect(d.beliebt, d.title).toBeGreaterThanOrEqual(1);
      expect(d.beliebt, d.title).toBeLessThanOrEqual(5);
      expect(typeof d.kind, d.title).toBe("boolean");
      expect(d.needs.length, d.title).toBeGreaterThanOrEqual(1);
      expect(d.minutes, d.title).toBeLessThanOrEqual(90);
    }
    // Alltag: fast alles in höchstens einer Stunde
    expect(DISHES.filter((d) => d.minutes <= 60).length).toBeGreaterThanOrEqual(145);
    expect(DISHES.filter((d) => d.beliebt >= 4).length).toBeGreaterThanOrEqual(50);
    expect(DISHES.filter((d) => d.kind).length).toBeGreaterThanOrEqual(120);
    // Vegetarisch ergibt sich aus der Kategorie
    expect(DISHES.filter((d) => d.category === "vegetarisch").length).toBeGreaterThanOrEqual(60);
  });

  it("jedes Gericht hat ein vollständiges Rezept für 4 – kochbar Schritt für Schritt", () => {
    for (const d of DISHES) {
      const id = rezeptIdFuer(d.title);
      expect(id, d.title).not.toBeNull();
      const r = cookRecipe(id!)!;
      expect(findRecipe({}, id!)?.title).toBe(d.title);
      expect(r.servings).toBe(4);
      expect(r.category, d.title).toBe(d.category);
      expect(r.prepMinutes, d.title).toBe(d.minutes);
      expect(r.ingredients.length, d.title).toBeGreaterThanOrEqual(3);
      expect(r.steps.length, d.title).toBeGreaterThanOrEqual(2);
      for (const s of r.steps) {
        expect(s, d.title).toMatch(/^[A-ZÄÖÜ0-9].*\.$/);
        expect(s.length, d.title).toBeLessThanOrEqual(140);
        expect(s, d.title).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    }
  });

  it("Rezepte: eindeutige IDs, kein Titel doppelt, nur wo es noch keins gab", () => {
    expect(new Set(BUILTIN_COOK.map((r) => r.id)).size).toBe(BUILTIN_COOK.length);
    expect(new Set(BUILTIN_COOK.map((r) => r.title.toLowerCase())).size).toBe(BUILTIN_COOK.length);
    expect(GERICHT_REZEPTE.length).toBe(GERICHTE.filter((g) => g.zutaten).length);
    expect(GERICHTE.every((g) => Boolean(g.zutaten) === Boolean(g.schritte))).toBe(true);
    expect(rezeptIdFuer("  spaghetti BOLOGNESE ")).toBe("k:bolognese");
    expect(rezeptIdFuer("Leberkäse mit Spiegelei")).toBe("k:leberkaese-mit-spiegelei");
    expect(rezeptIdFuer("Tante Ernas Gulasch")).toBeNull();
  });

  it("jedes Gericht hat ein eigenes Bild (erkannte Form, Datei liegt da)", () => {
    for (const d of DISHES) {
      expect(DISH_IMAGES.has(dishSlug(d.title)), d.title).toBe(true);
      expect(existsSync(`public/gerichte/${dishSlug(d.title)}.webp`), d.title).toBe(true);
      expect(dishArt(d.title, d.needs, d.category).guessed, d.title).toBe(false);
    }
    expect(dishArt("Leberkäse mit Spiegelei").variant).toBe("scheibe");
    expect(dishArt("Rinderrouladen mit Rotkohl").variant).toBe("roulade");
    expect(dishArt("Jägerschnitzel mit Spätzle").form).toBe("fleisch");
    expect(dishArt("Leberkäse mit Spiegelei").toppings).not.toContain("kaese");
  });
});

const ctx = (date: string, extra: Partial<Parameters<typeof ideasFor>[0]> = {}) => ({ date, recipes: {}, pantry: [], wishes: [], neverAgain: [], recent: [], dismissed: [], ...extra });
const GRUPPE = new Map(DISHES.map((d) => [d.title.toLowerCase(), d.gruppe as string]));
const groupOf = (i: Idea) => GRUPPE.get(i.title.toLowerCase()) ?? `eigen:${i.category}`;
const BELIEBT = new Map(DISHES.map((d) => [d.title, d.beliebt]));

describe("Ideen: jeden Tag neu gemischt", () => {
  const LIEBLINGE = ["Omas Gulasch", "Papas Pfannkuchen", "Hühnchen nach Mama", "Lieblingscurry", "Nudeln wie bei Oma"].map((t, i) =>
    rezept(t, ["Zwiebel", "Möhren"], { id: `fav${i}`, favorite: true, known: true, category: i % 2 ? "vegetarisch" : "fleisch", prepMinutes: 30 }),
  );
  const recipes = buch(...LIEBLINGE);
  const favs = new Set(LIEBLINGE.map((r) => r.title));

  it("30 Tage: viel Abwechslung, Lieblinge regelmäßig, Gegessenes 14 Tage nicht", () => {
    const shown: Record<string, string> = {};
    const eaten: { date: string; title: string }[] = [];
    const distinct = new Set<string>();
    const top3 = new Map<string, number>();
    for (let day = 0; day < 30; day++) {
      const date = addDays("2026-10-01", day);
      const recent = eaten.filter((e) => e.date >= addDays(date, -RECENT_DAYS)).map((e) => e.title);
      const ideas = ideasFor(ctx(date, { recipes, recent, shown, persons: familie().persons }));
      const eight = ideas.slice(0, SHOWN_IDEAS);
      expect(eight).toHaveLength(8);
      // Nichts aus den letzten 14 Tagen, nichts doppelt
      expect(eight.filter((i) => recent.includes(i.title))).toEqual([]);
      expect(new Set(eight.map((i) => i.title)).size).toBe(8);
      // Höchstens 2 je Gruppe
      const groups = new Map<string, number>();
      for (const i of eight) groups.set(groupOf(i), (groups.get(groupOf(i)) ?? 0) + 1);
      expect(Math.max(...groups.values()), date).toBeLessThanOrEqual(2);
      // Mischung: Lieblinge, Klassiker, Neues
      expect(eight.filter((i) => favs.has(i.title)).length, date).toBeGreaterThanOrEqual(1);
      expect(eight.filter((i) => (BELIEBT.get(i.title) ?? 0) >= 4).length, date).toBeGreaterThanOrEqual(2);
      expect(eight.filter((i) => (BELIEBT.get(i.title) ?? 9) <= 3).length, date).toBeGreaterThanOrEqual(1);
      for (const i of eight) {
        distinct.add(i.title);
        shown[i.title.toLowerCase()] = date;
      }
      for (const i of eight.slice(0, 3)) if (!favs.has(i.title)) top3.set(i.title, (top3.get(i.title) ?? 0) + 1);
      const take = day % 4 === 3 ? eight[0] : eight[1];
      eaten.push({ date, title: take.title });
    }
    expect(distinct.size).toBeGreaterThanOrEqual(80);
    expect(Math.max(...top3.values())).toBeLessThanOrEqual(3);
    // In 30 Tagen nichts zweimal innerhalb von 14 Tagen gegessen
    for (const [i, e] of eaten.entries()) expect(eaten.slice(Math.max(0, i - RECENT_DAYS), i).map((x) => x.title)).not.toContain(e.title);
  });

  it("gleicher Tag = gleiche 8, nächster Tag anders gemischt (ohne Gedächtnis)", () => {
    const titles = (date: string) => ideasFor(ctx(date, { recipes })).slice(0, 8).map((i) => i.title);
    expect(titles("2026-10-05")).toEqual(titles("2026-10-05"));
    expect(titles("2026-10-06")).not.toEqual(titles("2026-10-05"));
    // Auch ohne „gezeigt“-Gedächtnis: in einer Woche viele verschiedene
    const week = new Set(Array.from({ length: 7 }, (_, d) => titles(addDays("2026-10-05", d))).flat());
    expect(week.size).toBeGreaterThanOrEqual(22);
  });

  it("ohne eigene Rezepte trotzdem 8 Ideen, Klassiker und Neues", () => {
    const eight = ideasFor(ctx("2026-10-07")).slice(0, 8);
    expect(eight).toHaveLength(8);
    expect(eight.filter((i) => (BELIEBT.get(i.title) ?? 0) >= 4).length).toBeGreaterThanOrEqual(3);
    expect(eight.filter((i) => (BELIEBT.get(i.title) ?? 9) <= 3).length).toBeGreaterThanOrEqual(2);
  });

  it("Ideen aus der Liste tragen ihr eingebautes Rezept", () => {
    const ideas = ideasFor(ctx("2026-10-07"));
    const classic = ideas.filter((i) => i.id.startsWith("k:"));
    expect(classic.length).toBeGreaterThan(100);
    for (const i of classic) expect(cookRecipe(i.recipeId!)?.title, i.title).toBe(i.title);
  });

  it("Allergien und „mag nicht“ strikt – auch über die Zutaten des Rezepts", () => {
    const base = familie().persons;
    const persons = [{ ...base[0], allergies: ["Fisch", "Meeresfrüchte", "Nüsse"] }, { ...base[1], dislikes: ["Pilze"] }, base[2]];
    const ideas = ideasFor(ctx("2026-10-07", { persons }));
    expect(ideas.length).toBeGreaterThan(80);
    for (const i of ideas) {
      expect(i.category, i.title).not.toBe("fisch");
      const names = i.recipeId ? cookRecipe(i.recipeId)!.ingredients.map((x) => x.name.toLowerCase()) : [];
      expect(names.some((n) => /champignon|pilz|lachs|thunfisch|erdnüss/.test(n)), i.title).toBe(false);
    }
    // Pad Thai hat Erdnüsse, Kabeljau ist Fisch, Bandnudeln mit Pilzrahm hat Pilze
    const titles = ideas.map((i) => i.title);
    expect(titles).not.toContain("Pad Thai");
    expect(titles).not.toContain("Bandnudeln mit Pilzrahm");
    expect(titles).not.toContain("Fischstäbchen mit Kartoffelpüree");
  });

  it("Jahreszeit: Spargel nur im Frühling, Grünkohl nur im Winter", () => {
    const at = (date: string) => ideasFor(ctx(date)).map((i) => i.title);
    expect(at("2026-10-07")).not.toContain("Spargel mit Kartoffeln");
    expect(at("2026-05-07")).toContain("Spargel mit Kartoffeln");
    expect(at("2026-10-07")).not.toContain("Grünkohl mit Kartoffeln");
    expect(at("2026-01-07")).toContain("Grünkohl mit Kartoffeln");
  });
});
