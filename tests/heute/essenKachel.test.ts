// Essen-Kachel: immer Bild, gezeigtes Gericht immer wählbar (Screenshot
// „MORGEN · MO – Bibimbap – 3 Ideen ansehen“ ohne Bild, nicht auswählbar).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { essenKopf, foodTileView, kachelBild, kochSchrittZeile, takeLabel } from "@/lib/heute/essenKachel";
import { takeForDay } from "@/lib/essen/spontanTake";
import { createEmptyProfile } from "@/lib/einstellungen/profile";

const base = { over: false, today: null, tomorrow: null, idea: null, away: null, ideas: 3 };

describe("Was zeigt die Essen-Kachel?", () => {
  it("abends mit Plan für morgen: das Gericht für morgen, kein „Ideen ansehen“", () => {
    expect(foodTileView({ ...base, over: true, tomorrow: "Bibimbap" })).toEqual({ kind: "geplant", title: "Bibimbap", when: "morgen" });
  });

  it("abends ohne Plan für morgen: frei mit Ideen; mit ⇄ ein Vorschlag für morgen", () => {
    expect(foodTileView({ ...base, over: true })).toEqual({ kind: "frei", title: "Noch frei", ideen: true });
    expect(foodTileView({ ...base, over: true, idea: "Linsensuppe" })).toEqual({ kind: "vorschlag", title: "Linsensuppe", takeFor: "morgen" });
  });

  it("tagsüber: geplant heute bzw. Vorschlag für heute; ⇄ geht auch über ein Gericht für morgen", () => {
    expect(foodTileView({ ...base, today: "Lasagne" })).toEqual({ kind: "geplant", title: "Lasagne", when: "heute" });
    expect(foodTileView({ ...base, idea: "Pfannkuchen" })).toEqual({ kind: "vorschlag", title: "Pfannkuchen", takeFor: "heute" });
    expect(foodTileView({ ...base, over: true, tomorrow: "Bibimbap", idea: "Curry" })).toMatchObject({ kind: "vorschlag", takeFor: "morgen" });
  });

  it("kein Kochtag: Text, keine Ideen ohne Ideen", () => {
    expect(foodTileView({ ...base, away: "Kein Kochtag", ideas: 0 })).toEqual({ kind: "frei", title: "Kein Kochtag", ideen: false });
  });

  it("Knopf im Gericht-Fenster", () => {
    expect(takeLabel("heute")).toBe("Für heute nehmen");
    expect(takeLabel("morgen")).toBe("Für morgen nehmen");
  });
});

describe("Nehmen: heute und morgen", () => {
  const profile = { ...createEmptyProfile(), shoppingDay: "samstag" as const };
  const data = { profile, weekPlans: {}, mealPlans: {}, recipes: {} };
  const today = new Date("2026-10-21T19:30:00");

  it("Vorschlag für heute landet heute im Plan", () => {
    const r = takeForDay(data, today, { title: "Pfannkuchen", category: "vegetarisch" }, "2026-10-21");
    expect(r.ok && JSON.stringify(r.weeks)).toContain("Pfannkuchen");
    expect(r.ok && r.text).toMatch(/^Übernommen ✓ Heute/);
  });

  it("abends für morgen (auch über das Wochenende in die nächste Woche)", () => {
    const r = takeForDay(data, today, { title: "Linsensuppe", category: "vegetarisch" }, "2026-10-22");
    expect(r.ok && r.text).toMatch(/Am Donnerstag gibt’s Linsensuppe/);
    const sa = takeForDay(data, new Date("2026-10-23T19:30:00"), { title: "Curry", category: "vegetarisch" }, "2026-10-24");
    expect(sa.ok).toBe(true);
  });
});

describe("Kachel und Beispiel-Tag", () => {
  const tile = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
  const demo = readFileSync("src/components/essen/DemoFoodTile.tsx", "utf8");

  it("jeder Zustand ist eine Bild-Kachel; „Ideen ansehen“ nur ohne Gericht", () => {
    const food = tile.slice(tile.indexOf("export function FoodTile"), tile.indexOf("/** Eine Zeile der Einkauf-Kachel"));
    // genau ein return mit <DishTile – kein Zweig ohne Bild mehr
    expect(food.match(/return \(/g)).toHaveLength(1);
    expect(food).toMatch(/return \(\s*<>\s*<DishTile/);
    expect(food).toMatch(/picture=\{picture\}/);
    expect(food).toMatch(/view\.kind === "frei" \? \(view\.ideen && !away \? `\$\{Math\.min\(3, list\.length\)\} Ideen ansehen`/);
    expect(food).toMatch(/const sub = view\.kind === "vorschlag" \? "Vorschlag"/);
  });

  it("Antippen öffnet genau dieses Gericht: Vorschlag → Fenster, geplant mit Rezept → Rezept", () => {
    expect(tile).toMatch(/view\.kind === "vorschlag" \? \(\) => setChosen\(idea\) : recipe \? `\/kochbuch\/rezept\?id=/);
    expect(tile).toMatch(/<GerichtSheet dish=\{chosen\} take=\{takeLabel\(over \? "morgen" : "heute"\)\}/);
  });

  it("Beispiel-Tag: Antippen öffnet das Fenster, erst „Nehmen“ übernimmt in den echten Plan", () => {
    expect(demo).toMatch(/open=\{onTake \? \(\) => setOpen\(true\)/);
    expect(demo).toMatch(/onTake\(\{ title: r\.title, category: r\.category \}, d\.tomorrow\)/);
    expect(readFileSync("src/components/heute/TodayPage.tsx", "utf8")).toMatch(/takeDish\(data, d, tomorrow \? addDays\(data\.todayIso, 1\) : data\.todayIso\) && clearDemoTile\("essen"\)/);
  });
});

describe("Sofort-Kachel: nie ohne Bild", () => {
  const recipe = { ingredients: ["Nudeln", "Tomaten"], category: "vegetarisch" as const };
  // Alle sieben Zustände der Essen-Kachel
  const zustaende = {
    geplant: foodTileView({ ...base, today: "Lasagne" }),
    vorschlag: foodTileView({ ...base, idea: "Pfannkuchen" }),
    morgen: foodTileView({ ...base, over: true, tomorrow: "Bibimbap" }),
    "kocht gerade": { kind: "kocht" as const, title: "Lasagne" },
    gegessen: foodTileView({ ...base, over: true, today: "Lasagne" }),
    frei: foodTileView({ ...base }),
    "kein Kochtag": foodTileView({ ...base, away: "Kein Kochtag", ideas: 0 }),
  };

  it("jeder der sieben Zustände hat ein Bild (Gericht oder leerer Teller)", () => {
    for (const [name, view] of Object.entries(zustaende)) {
      const bild = kachelBild(view, recipe);
      expect(bild, name).toBeTruthy();
      expect(bild.title, name).not.toBe("");
      expect(Boolean(bild.leer) || bild.title === view.title, name).toBe(true);
    }
    expect(Object.keys(zustaende)).toHaveLength(7);
  });

  it("Gericht → sein Bild mit Zutaten; frei und kein Kochtag → leerer Teller", () => {
    expect(kachelBild(zustaende.geplant, recipe)).toEqual({ title: "Lasagne", ingredients: ["Nudeln", "Tomaten"], category: "vegetarisch" });
    expect(kachelBild(zustaende["kocht gerade"], recipe)).toEqual(kachelBild(zustaende.geplant, recipe));
    expect(kachelBild(zustaende.vorschlag)).toEqual({ title: "Pfannkuchen", ingredients: undefined, category: null });
    expect(kachelBild(zustaende.frei)).toEqual({ title: "Noch frei", leer: true });
    expect(kachelBild(zustaende["kein Kochtag"])).toEqual({ title: "Kein Kochtag", leer: true });
    expect(kachelBild(zustaende.gegessen).leer).toBe(true);
  });

  it("Kopfzeile einzeilig: bei S nie Personen, ab M kurz „für 4“", () => {
    expect(essenKopf("Essen · 18:30", 4, "S")).toBe("Essen · 18:30");
    expect(essenKopf("Essen · 18:30", 1, "M")).toBe("Essen · 18:30 · für 1");
    expect(essenKopf("Essen · 18:30", 4, "L")).toBe("Essen · 18:30 · für 4");
    expect(essenKopf("Essen", null, "L")).toBe("Essen");
    expect(essenKopf("Essen · 18:30", 4, "S")).not.toMatch(/Person/);
  });

  it("Kopfzeile bricht nie um, keine „Personen“ mehr auf Essen- und Koch-Kachel", () => {
    const dishTile = readFileSync("src/components/essen/DishTile.tsx", "utf8");
    expect(dishTile).toMatch(/truncate whitespace-nowrap[^"]*" data-kopf/);
    expect(readFileSync("src/components/heute/HomeTiles.tsx", "utf8")).not.toMatch(/"Personen?"/);
    expect(readFileSync("src/components/essen/CookingTile.tsx", "utf8")).not.toMatch(/"Personen?"/);
  });

  it("Kochmodus-Schritt nur, wenn schon Schritte abgehakt sind und noch einer kommt", () => {
    expect(kochSchrittZeile(6, [0, 1])).toBe("Schritt 3 von 6");
    expect(kochSchrittZeile(6, [])).toBeNull();
    expect(kochSchrittZeile(0, [])).toBeNull();
    expect(kochSchrittZeile(3, [0, 1, 2])).toBeNull();
    expect(kochSchrittZeile(4, [0, 2])).toBe("Schritt 2 von 4");
  });

  it("Koch-Kachel: dasselbe Gerichtsbild (DishTile), „Koche gerade“, weißer Knopf „Gegessen“, Kochmodus erreichbar", () => {
    const cooking = readFileSync("src/components/essen/CookingTile.tsx", "utf8");
    expect(cooking).toMatch(/<DishTile/);
    expect(cooking).toMatch(/when="Koche gerade"/);
    expect(cooking).toMatch(/bg-on-color[^"]*text-on-photo-ink[^"]*">Gegessen</);
    expect(cooking).toMatch(/\/kochbuch\/kochen\?id=/);
    expect(cooking).toMatch(/cookLabel="Kochmodus ›"/);
    // keine Schritte-Liste mehr auf der Kachel
    expect(cooking).not.toMatch(/<ol|toggleStep/);
  });
});
