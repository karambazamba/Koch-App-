// Essen: mehr Abwechslung – 14 Tage simuliert: keine Idee öfter als 2×,
// Gegessenes kommt 14 Tage nicht wieder, unter den ersten drei höchstens eine
// je Grundlage, ⇄ nie dieselbe zweimal, jedes eingebaute Gericht mit Bild.
import { describe, expect, it } from "vitest";
import { ideasFor, mixFirst, RECENT_DAYS } from "@/lib/essen/ideas";
import { DISHES } from "@/lib/essen/dishIdeas";
import { DISH_IMAGES } from "@/lib/essen/dishImageList";
import { dishSlug } from "@/lib/essen/dishArt";
import { baseFromText } from "@/lib/essen/bases";
import { addDays } from "@/lib/core/now";
import { naechsteIdee } from "@/lib/heute/essenKachel";
import { migrateIdeenGezeigt } from "@/lib/essen/ideenGezeigt";

const ctx = (date: string, extra: Partial<Parameters<typeof ideasFor>[0]> = {}) => ({ date, recipes: {}, pantry: [], wishes: [], neverAgain: [], recent: [], dismissed: [], ...extra });

describe("14 Tage Ideen", () => {
  it("gezeigt, aber nicht genommen: keine Idee öfter als 2× in 14 Tagen", () => {
    const shown: Record<string, string> = {};
    const count = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const date = addDays("2026-10-19", i);
      const top = ideasFor(ctx(date, { shown })).slice(0, 3);
      expect(top).toHaveLength(3);
      for (const idea of top) {
        count.set(idea.title, (count.get(idea.title) ?? 0) + 1);
        shown[idea.title.toLowerCase()] = date;
      }
    }
    expect(Math.max(...count.values())).toBeLessThanOrEqual(2);
  });

  it("jeden Tag genommen: in 14 Tagen nichts doppelt gegessen", () => {
    const eaten: { date: string; title: string }[] = [];
    for (let i = 0; i < 14; i++) {
      const date = addDays("2026-10-19", i);
      const recent = eaten.filter((e) => e.date >= addDays(date, -RECENT_DAYS)).map((e) => e.title);
      const idea = ideasFor(ctx(date, { recent }))[0];
      expect(recent).not.toContain(idea.title);
      eaten.push({ date, title: idea.title });
    }
    expect(new Set(eaten.map((e) => e.title)).size).toBe(14);
  });

  it("unter den ersten drei höchstens eine je Grundlage (nicht 3× Nudeln)", () => {
    for (let i = 0; i < 14; i++) {
      const top = ideasFor(ctx(addDays("2026-10-19", i))).slice(0, 3);
      const keys = top.map((t) => baseFromText([t.title, ...t.needs].join(" ")) ?? t.category);
      expect(new Set(keys).size).toBe(3);
    }
    const nudeln = (t: string) => ({ title: t, needs: ["Nudeln"], uses: [], category: "vegetarisch" as const });
    expect(mixFirst([nudeln("A"), nudeln("B"), { ...nudeln("Reis"), needs: ["Reis"] }, nudeln("C")]).map((i) => i.title)).toEqual(["A", "Reis", "B", "C"]);
  });

  it("gleicher Tag = gleiche Reihenfolge, anderer Tag = gemischt", () => {
    const a = ideasFor(ctx("2026-10-21")).map((i) => i.title);
    expect(ideasFor(ctx("2026-10-21")).map((i) => i.title)).toEqual(a);
    expect(ideasFor(ctx("2026-10-22")).map((i) => i.title).slice(0, 5)).not.toEqual(a.slice(0, 5));
  });
});

describe("⇄ Andere Idee", () => {
  it("nie dieselbe zweimal hintereinander", () => {
    expect(naechsteIdee(["A", "B", "C"], null, "A")).toBe(1);
    expect(naechsteIdee(["A", "B", "C"], 2, "C")).toBe(0);
    expect(naechsteIdee(["A"], 0, "A")).toBeNull();
    expect(naechsteIdee(["A", "B"], 0, "Lasagne")).toBe(1);
  });

  it("Speicher „gezeigt“: nur gültige Tage", () => {
    expect(migrateIdeenGezeigt({ version: 1, shown: { pizza: "2026-10-20", kaputt: 3, alt: "gestern" } })).toEqual({ version: 1, shown: { pizza: "2026-10-20" } });
    expect(migrateIdeenGezeigt({ version: 2 })).toBeNull();
  });
});

describe("Gerichte", () => {
  it("jedes eingebaute Gericht hat ein eigenes Bild", () => {
    const fehlt = DISHES.filter((d) => !DISH_IMAGES.has(dishSlug(d.title))).map((d) => d.title);
    expect(fehlt).toEqual([]);
    expect(new Set(DISHES.map((d) => d.title)).size).toBe(DISHES.length);
  });
});
