// Essen ohne Fehler (Phase-0-Reste): Löschen ohne window.confirm, Kochmodus
// mit der gewählten Personenzahl, Hackbraten als Scheiben, Wortwahl
// „Unsere Rezepte“/„Kochmodus ›“, keine Emojis im Kochmodus, „Rezept
// erzählen“ ohne eigenes Mikro und Rezept-Links nur zu Rezepten, die es gibt.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { personsParam, scaledAmount } from "@/lib/essen/cookbook";
import { recipeHref } from "@/lib/essen/baking";
import { BUILTIN_COOK } from "@/lib/essen/kochen";
import { dishArt } from "@/lib/essen/dishArt";
import { renderDishSvg } from "@/lib/essen/dishSvg";
import { pageLabel } from "@/lib/core/pageLabel";

const read = (f: string) => readFileSync(f, "utf8");
const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));

describe("Rückfragen ohne window.confirm", () => {
  it("nirgends im Code window.confirm", () => {
    const hits = files("src").filter((f) => /window\.confirm\s*\(/.test(read(f)));
    expect(hits).toEqual([]);
  });

  it("Rezept löschen: ConfirmDialog, danach „Gelöscht · Rückgängig“", () => {
    const src = read("src/components/essen/rezepte/RecipeView.tsx");
    expect(src).toContain("<ConfirmDialog");
    expect(src).toMatch(/showDeleted\(pushUndo\(/);
    expect(src).toContain("restoreRecipe(gone)");
  });

  it("Ausflugstag mit festem Gericht fragt im kleinen Fenster", () => {
    expect(read("src/components/essen/plan/WeekCheck.tsx")).toContain("<ConfirmDialog");
  });
});

describe("Kochmodus mit der gewählten Personenzahl", () => {
  it("Personen aus der Adresse: 1–20, sonst nichts", () => {
    expect(personsParam("3")).toBe(3);
    expect(personsParam(null)).toBeNull();
    expect(personsParam("")).toBeNull();
    expect(personsParam("0")).toBeNull();
    expect(personsParam("21")).toBeNull();
    expect(personsParam("abc")).toBeNull();
  });

  it("Mengen umrechnen wie in der Rezept-Ansicht", () => {
    expect(scaledAmount(400, 4, 2)).toBe(200);
    expect(scaledAmount(3, 4, 3)).toBe(2.3);
    expect(scaledAmount(500, 4, 6)).toBe(750);
    expect(scaledAmount(200, 4, null)).toBe(200);
    expect(scaledAmount(200, 4, 4)).toBe(200);
    expect(scaledAmount(null, 4, 2)).toBeNull();
    expect(scaledAmount(200, 0, 2)).toBe(200);
  });

  it("Rezept gibt die Personen weiter, der Kochmodus liest und zeigt sie", () => {
    expect(read("src/components/essen/rezepte/RecipeView.tsx")).toContain("&personen=${servings}");
    const cook = read("src/components/essen/rezepte/CookMode.tsx");
    expect(cook).toContain('personsParam(params.get("personen"))');
    expect(cook).toContain("Für {servings} {baking ?");
  });
});

describe("Hackbraten als Scheiben vom Laib", () => {
  it.each(["Hackbraten mit Kartoffelpüree", "Hackbraten", "Falscher Hase"])("%s → hackbraten", (title) => {
    const art = dishArt(title, ["Hackfleisch", "Ei"], "fleisch");
    expect(art.form).toBe("fleisch");
    expect(art.variant).toBe("hackbraten");
  });

  it("Frikadellen bleiben Frikadellen", () => {
    expect(dishArt("Frikadellen", ["Hackfleisch"], "fleisch").variant).toBe("frikadellen");
  });

  it("rosige Scheiben, frische rote Soße statt brauner, keine braunen Bällchen", () => {
    const svg = renderDishSvg(dishArt("Hackbraten mit Kartoffelpüree", ["Hackfleisch", "Ei"], "fleisch"));
    expect(svg).toContain("#E9A386");
    expect(svg).toContain("#D9483B");
    expect(svg).not.toContain("#7E4A2A");
    expect(svg).not.toContain("#7A3E1E");
  });
});

describe("Wortwahl", () => {
  it("Kachel beim Kochen „Weiter kochen ›“ (Tafel 134) statt „Rezept groß öffnen“", () => {
    const src = read("src/components/heute/HomeTiles.tsx");
    expect(read("src/lib/heute/essenKachel.ts")).toContain('"Weiter kochen ›"');
    expect(src).not.toMatch(/Rezept groß öffnen/);
  });

  it("die Sammlung heißt „Unsere Rezepte“, nicht „Kochbuch“", () => {
    expect(read("src/components/essen/rezepte/CookbookList.tsx")).toContain('<PageHeader title="Unsere Rezepte"');
    expect(pageLabel("/kochbuch")).toBe("Unsere Rezepte");
    for (const f of ["src/components/essen/plan/PlanSheets.tsx", "src/components/essen/plan/FixedMealsSection.tsx", "src/components/einstellungen/NeverAgainView.tsx"]) {
      const visible = read(f)
        .split("\n")
        .filter((l) => !/^\s*(\/\/|\/?\*)/.test(l))
        .join("\n");
      expect(visible, f).not.toMatch(/Kochbuch/);
    }
  });

  it("keine Emojis im Kochmodus", () => {
    expect(read("src/components/essen/rezepte/CookMode.tsx")).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("Rezept-Kopf: rechts nur „…“, das Herz steht in der Infozeile", () => {
    const src = read("src/components/essen/rezepte/RecipeView.tsx");
    const head = src.slice(src.indexOf("<BackButton fallback"), src.lastIndexOf("</main>"));
    expect(head.indexOf("<MoreMenu")).toBeLessThan(head.indexOf("<h1"));
    expect(head.indexOf("<FavoriteButton")).toBeGreaterThan(head.indexOf("<h1"));
  });
});

describe("Rezept erzählen ohne eigenes Mikro", () => {
  it("Sprechen nur über den Mia-Knopf", () => {
    const src = read("src/components/essen/rezepte/NewRecipeSheet.tsx");
    expect(src).not.toMatch(/useSpeechInput|MicStrip|MIC_BLOCKED|<Mic\b/);
  });
});

describe("Rezept-Links nur zu Rezepten, die es gibt", () => {
  const builtin = BUILTIN_COOK[0].id;

  it("ohne Rezept kein Link", () => {
    expect(recipeHref({}, "weg-123")).toBeNull();
    expect(recipeHref({}, undefined)).toBeNull();
    expect(recipeHref(undefined, builtin)).toBeNull();
  });

  it("eigenes oder eingebautes Rezept: Link, auf Wunsch mit Personen", () => {
    const own = { ...BUILTIN_COOK[0], id: "r1" };
    expect(recipeHref({ r1: own }, "r1")).toBe("/kochbuch/rezept?id=r1");
    expect(recipeHref({}, builtin, 2)).toBe(`/kochbuch/rezept?id=${encodeURIComponent(builtin)}&personen=2`);
  });

  // Kochidee (KochideeViews) verlinkt seit A-038 nicht mehr: Antippen öffnet die Rezept-Vorschau
  it("die Stellen bauen Links über recipeHref", () => {
    for (const f of ["src/components/essen/plan/PlanSheets.tsx", "src/components/essen/FoodPage.tsx", "src/components/essen/IdeaCards.tsx", "src/components/heute/HomeTiles.tsx"]) {
      const src = read(f);
      expect(src, f).toMatch(/recipeHref|hrefFor/);
      expect(src, f).not.toMatch(/rezept\?id=\$\{encodeURIComponent\((entry|idea|card|chosen)\.recipeId\)\}/);
    }
  });
});
