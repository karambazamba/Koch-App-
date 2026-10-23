// Gerichte-Bilder ohne Braun (Tafel 62 B): helle Pfanne mit farbigem Rand und
// Holzgriff, Soße passend zum Gericht und sparsam, Eintöpfe Paprikarot statt
// Braun, die Lachs-Bowl wird als Bowl gezeichnet (nicht als Gulasch).
import { describe, expect, it } from "vitest";
import { dishArt } from "@/lib/essen/dishArt";
import { renderDishSvg } from "@/lib/essen/dishSvg";
import { panSauce } from "@/lib/essen/dishBases";

const DARK = ["#2E2A27", "#2F2A27", "#4A4440", "#26221F", "#8E4A2A", "#6A3420", "#A8693E", "#D9A35A"];

describe("Pfannen ohne Braun", () => {
  it.each(["Gemüsepfanne mit Reis", "Reispfanne mit Ei", "Hähnchenpfanne mit Reis", "Hack-Paprika-Pfanne mit Reis", "Kartoffel-Gemüse-Pfanne", "Shakshuka"])("%s: keine dunkle Pfanne, keine Karamell-Soße", (title) => {
    const svg = renderDishSvg(dishArt(title));
    for (const c of DARK) expect(svg, `${title} enthält ${c}`).not.toContain(c);
  });

  it("Pfanne hell wie Emaille, Holzgriff", () => {
    const svg = renderDishSvg(dishArt("Gemüsepfanne"));
    expect(svg).toContain("#FBF7F0");
    expect(svg).toContain("#C98A4E");
  });

  it("Soße nach Gericht: Tomate/Hack rot, Ei/Hähnchen goldgelb, Gemüse nur Glanz", () => {
    expect(panSauce(dishArt("Hack-Paprika-Pfanne"))).toEqual({ color: "#E2552F", opacity: 0.8 });
    expect(panSauce(dishArt("Hähnchenpfanne mit Reis")).color).toBe("#F4C64E");
    expect(panSauce(dishArt("Gemüsepfanne mit Zucchini")).color).toBe("#EBD27A");
  });
});

describe("Eintöpfe rot, Bowl als Bowl", () => {
  it("Gulasch und Chili rot statt braun", () => {
    expect(renderDishSvg(dishArt("Gulasch"))).toContain("#C9502E");
    expect(renderDishSvg(dishArt("Chili con Carne"))).toContain("#CC4A2C");
  });

  it("Fehler: „Lachs-Bowl mit Edamame“ wurde als Gulasch gezeichnet → „poke“", () => {
    const art = dishArt("Lachs-Bowl mit Edamame");
    expect(art.form).toBe("bowl");
    expect(art.variant).toBe("poke");
    const svg = renderDishSvg(art);
    expect(svg).not.toContain("#A8381F");
    expect(svg).not.toContain("#C9502E");
  });
});
