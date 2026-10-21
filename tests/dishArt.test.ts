import { describe, expect, it } from "vitest";
import { dishArt, dishSlug } from "@/lib/essen/dishArt";
import { renderDishSvg } from "@/lib/essen/dishSvg";
import { builtinDishImage, dishImage } from "@/lib/essen/dishImages";
import { DISH_IMAGES } from "@/lib/essen/dishImageList";
import { DISHES } from "@/lib/essen/dishIdeas";
import { DEMO_RECIPES } from "@/lib/essen/demoDish";
import { BUILTIN_BAKING } from "@/lib/essen/baking";

const names = (r: { ingredients: { name: string }[] }) => r.ingredients.map((i) => i.name);
const ALL = [
  ...DEMO_RECIPES.map((r) => ({ title: r.title, ingredients: names(r), category: r.category })),
  ...DISHES.map((d) => ({ title: d.title, ingredients: d.needs, category: d.category })),
  ...BUILTIN_BAKING.map((r) => ({ title: r.title, ingredients: names(r), category: r.category })),
];

describe("Ein Bild für jedes Gericht", () => {
  it("alle eingebauten Gerichte bekommen eine echte Form und ein eingebautes Bild", () => {
    for (const d of ALL) {
      const art = dishArt(d.title, d.ingredients, d.category);
      expect(art.guessed, d.title).toBe(false);
      expect(art.toppings.length, d.title).toBeGreaterThan(0);
      expect(DISH_IMAGES.has(dishSlug(d.title)), d.title).toBe(true);
    }
  });

  it("erkennt die Form am Namen", () => {
    expect(dishArt("Spaghetti Carbonara").form).toBe("nudeln-lang");
    expect(dishArt("Omas Erbsensuppe").form).toBe("suppe");
    expect(dishArt("Lachs mit Brokkoli").form).toBe("fisch");
    expect(dishArt("Bunte Wraps").form).toBe("wrap");
    expect(dishArt("Pfannkuchen").form).toBe("pfannkuchen");
    expect(dishArt("Versunkener Apfelkuchen").form).toBe("kuchen");
    expect(dishArt("Gefüllte Paprika").form).toBe("auflauf");
    expect(dishArt("Fischstäbchen mit Kartoffelpüree")).toMatchObject({ form: "fisch", variant: "staebchen", side: "pueree" });
  });

  it("nutzt die Zutaten, wenn der Name nichts verrät", () => {
    expect(dishArt("Omas Liebling", ["Spaghetti", "Hackfleisch", "Tomaten"]).form).toBe("nudeln-lang");
    expect(dishArt("Pasta mit Tomaten & Burrata", ["Spaghetti", "Burrata"]).form).toBe("nudeln-lang");
  });

  it("Unbekanntes ist nie leer – allgemeine Form der Kategorie", () => {
    const art = dishArt("Überraschung vom Chef", [], "vegetarisch");
    expect(art).toMatchObject({ form: "pfanne", guessed: true });
    expect(art.toppings.length).toBeGreaterThan(0);
    expect(dishArt("Irgendwas", [], "fisch").form).toBe("fisch");
  });

  it("gleiche Eingabe → gleiches SVG", () => {
    const a = renderDishSvg(dishArt("Kürbissuppe", ["Kürbis"]));
    const b = renderDishSvg(dishArt("Kürbissuppe", ["Kürbis"]));
    expect(a).toBe(b);
    expect(a).toMatch(/^<svg [^>]*viewBox="0 0 900 600"/);
    expect(a).not.toMatch(/NaN|undefined/);
    expect(renderDishSvg(dishArt("Linsensuppe"))).not.toBe(a);
  });

  it("jede Form zeichnet ohne Fehler", () => {
    for (const d of ALL) expect(renderDishSvg(dishArt(d.title, d.ingredients, d.category))).not.toMatch(/NaN|undefined/);
  });

  it("eingebautes Bild zuerst, sonst live gezeichnet", () => {
    expect(builtinDishImage("Spaghetti Bolognese")).toBe("/gerichte/spaghetti-bolognese.webp");
    expect(dishImage("Spaghetti Bolognese")).toBe("/gerichte/spaghetti-bolognese.webp");
    expect(dishImage("Tante Ernas Gulasch")).toMatch(/^data:image\/svg\+xml/);
    expect(dishImage("  ")).toBeNull();
    expect(dishSlug("Pasta mit Tomaten & Burrata")).toBe("pasta-mit-tomaten-burrata");
    expect(dishSlug("Grießbrei")).toBe("griessbrei");
  });
});
