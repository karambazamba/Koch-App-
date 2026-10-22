// Gerichte-Bilder je Form und Feinheit, Teller-Farbe, Bild-Reihenfolge; Tipp des Tages
import { describe, expect, it } from "vitest";
import { dishArt } from "@/lib/essen/dishArt";
import { renderDishSvg } from "@/lib/essen/dishSvg";
import { builtinDishImage, dishImage } from "@/lib/essen/dishImages";
import { dishTone } from "@/lib/essen/dishLook";
import { dailyTip } from "@/lib/essen/tips/daily";
import { ALL_TIPS } from "@/lib/essen/tips";

// [Titel, Zutaten, Form, Feinheit, Beilage]
const FAELLE: [string, string[], string, string | undefined, string | undefined][] = [
  ["Kartoffelpüree mit Spinat", [], "kartoffeln", "pueree", undefined],
  ["Pellkartoffeln mit Quark", [], "kartoffeln", "pell", undefined],
  ["Bratkartoffeln", [], "kartoffeln", "brat", undefined],
  ["Spargel mit Butter", [], "kartoffeln", "pell", undefined],
  ["Wedges mit Dip", ["Kartoffeln"], "kartoffeln", "wedges", undefined],
  ["Kartoffeln vom Grill", [], "kartoffeln", "brat", undefined],
  ["Brownies", [], "kuchen", "brownie", undefined],
  ["Marmorkuchen", [], "kuchen", "marmor", undefined],
  ["Zitronenkuchen", [], "kuchen", "zitrone", undefined],
  ["Käsekuchen", [], "kuchen", "kaese", undefined],
  ["Rüblikuchen mit Möhren", [], "kuchen", "moehre", undefined],
  ["Streuselkuchen", [], "kuchen", "streusel", undefined],
  ["Bananenbrot", [], "kuchen", "banane", undefined],
  ["Schokotorte", [], "kuchen", "schoko", undefined],
  ["Omas Torte", [], "kuchen", "apfel", undefined],
  ["Apfel-Crumble", ["Äpfel"], "auflauf", "crumble", undefined],
  ["Gefüllte Zucchini", ["Hackfleisch"], "auflauf", "gefuellt", undefined],
  ["Lasagne", ["Hackfleisch", "Käse"], "auflauf", "lasagne", undefined],
  ["Nudelauflauf mit Brokkoli", [], "auflauf", "nudel", undefined],
  ["Tomatensuppe", [], "suppe", "tomate", undefined],
  ["Kürbissuppe", [], "suppe", "kuerbis", undefined],
  ["Linsensuppe", [], "suppe", "linsen", undefined],
  ["Kartoffelsuppe", [], "suppe", "kartoffel", undefined],
  ["Erbsensuppe", [], "suppe", "erbsen", undefined],
  ["Gemüseeintopf", [], "suppe", "gemuese", undefined],
  ["Nudelsalat", ["Nudeln", "Käse", "Gurke"], "salat", "nudel", undefined],
  ["Caprese", [], "salat", "caprese", undefined],
  ["Kartoffelsalat", [], "salat", "kartoffel", undefined],
  ["Grüner Salat", [], "salat", "gruen", undefined],
  ["Kartoffelpuffer mit Apfelmus", ["Äpfel"], "pfannkuchen", "puffer", undefined],
  ["Omelett mit Spinat", ["Eier"], "pfannkuchen", "omelett", undefined],
  ["Pancakes mit Beeren", [], "pfannkuchen", "stapel", undefined],
  ["Ofen-Baguette", ["Baguette"], "brot", "baguette", undefined],
  ["Knoblauch-Baguette", [], "brot", "baguette", undefined],
  ["Toast Hawaii", [], "brot", "toast", undefined],
  ["Hefezopf", [], "brot", "zopf", undefined],
  ["Belegte Semmel", [], "brot", "broetchen", undefined],
  ["Rührei mit Brot", ["Eier"], "brot", "ruehrei", undefined],
  ["Käsebrot", [], "brot", "scheiben", undefined],
  ["Flammkuchen mit Speck", [], "pizza", "flammkuchen", undefined],
  ["Pizza Margherita", [], "pizza", "pizza", undefined],
  ["Fischstäbchen mit Pommes", [], "fisch", "staebchen", "ofenkartoffeln"],
  ["Lachs mit Kartoffeln", [], "fisch", "lachs", "kartoffeln"],
  ["Kabeljau mit Reis", [], "fisch", "filet", "reis"],
  ["Forelle mit Gemüse", [], "fisch", "filet", "gemuese"],
  ["Hähnchenkeule mit Püree", [], "fleisch", "haehnchen", "pueree"],
  ["Schnitzel mit Pommes", [], "fleisch", "schnitzel", "ofenkartoffeln"],
  ["Bratwurst mit Kartoffeln", [], "fleisch", "wurst", "kartoffeln"],
  ["Frikadellen mit Erbsen", ["Eier"], "fleisch", "frikadellen", "gemuese"],
  ["Chili con Carne", ["Hackfleisch", "Bohnen", "Mais"], "bowl", "chili", undefined],
  ["Gemüsecurry mit Reis", [], "bowl", "curry", "reis"],
  ["Gulasch", [], "bowl", "gulasch", undefined],
  ["Grießbrei mit Kirschen", [], "suess", "griess", undefined],
  ["Milchreis mit Zimt", [], "suess", "milchreis", undefined],
  ["Butterkekse", [], "kekse", "butter", undefined],
  ["Haferkekse", [], "kekse", "hafer", undefined],
  ["Cookies", [], "kekse", "schoko", undefined],
  ["Blaubeer-Muffins", [], "muffins", "blaubeer", undefined],
  ["Schoko-Muffins", [], "muffins", "schoko", undefined],
  ["Waffeln", [], "waffeln", undefined, undefined],
  ["Zimtschnecken", [], "schnecken", undefined, undefined],
  ["Wok-Gemüse mit Reis", [], "pfanne", undefined, "reis"],
  ["Risotto mit Pilzen", [], "reis", undefined, undefined],
  ["Kürbisrisotto", [], "reis", undefined, undefined],
  ["Tomatenreis", [], "reis", undefined, undefined],
  ["Ofengemüse mit Feta", [], "blech", undefined, undefined],
  ["Wraps mit Avocado", [], "wrap", undefined, undefined],
  ["Penne mit Pesto", [], "nudeln-kurz", undefined, undefined],
  ["Pasta mit Lachs", ["Tagliatelle", "Lachs"], "nudeln-lang", undefined, undefined],
];

describe("Bild-Rezept je Gericht", () => {
  it.each(FAELLE)("%s", (title, ingredients, form, variant, side) => {
    const art = dishArt(title, ingredients);
    expect(art.form).toBe(form);
    expect(art.variant).toBe(variant);
    expect(art.side).toBe(side);
    expect(art.toppings.length).toBeGreaterThan(0);
    expect(art.toppings.length).toBeLessThanOrEqual(5);
    const svg = renderDishSvg(art);
    expect(svg).toMatch(/^<svg /);
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("Süßes ohne herzhafte Toppings, Ei im Teig nicht als Topping, Käse nicht doppelt", () => {
    expect(dishArt("Apfelkuchen", ["Eier", "Mehl", "Äpfel", "Käse"]).toppings).toEqual(["apfel"]);
    expect(dishArt("Frikadellen", ["Eier", "Hackfleisch"]).toppings).not.toContain("ei");
    expect(dishArt("Spiegelei mit Spinat", ["Eier"]).toppings).not.toContain("ei");
    expect(dishArt("Salat mit Feta und Käse").toppings).not.toContain("kaese");
    expect(dishArt("Lachs mit Lachs").toppings).not.toContain("lachs");
  });

  it("allgemeine Form nach Kategorie, Größe frei wählbar", () => {
    expect(dishArt("Überraschung", [], "cheatday").form).toBe("pizza");
    expect(dishArt("Überraschung", [], "fleisch")).toMatchObject({ form: "fleisch", guessed: true });
    expect(renderDishSvg(dishArt("Überraschung"), { width: 1200, height: 800 })).toMatch(/width="1200" height="800"/);
  });
});

describe("Bild-Reihenfolge und Teller-Farbe", () => {
  it("eingebautes Bild zuerst, sonst live gezeichnet (gemerkt), leer → nichts", () => {
    expect(builtinDishImage("Rührei mit Brot")).toBe("/gerichte/ruehrei-mit-brot.webp");
    expect(builtinDishImage("Omas Geheimrezept")).toBeNull();
    const live = dishImage("Omas Geheimrezept", ["Kürbis"], "vegetarisch")!;
    expect(live).toMatch(/^data:image\/svg\+xml/);
    expect(dishImage("Omas Geheimrezept", ["Kürbis"], "vegetarisch")).toBe(live);
    expect(dishImage("Rührei mit Brot")).toBe("/gerichte/ruehrei-mit-brot.webp");
    expect(dishImage("  ")).toBeNull();
  });

  it("gleiches Gericht, gleiche Farbe – je Kategorie aus der eigenen Palette", () => {
    expect(dishTone("Lasagne", "fleisch")).toBe(dishTone("lasagne", "fleisch"));
    expect(["#E2786A", "#E59A6F", "#D9A45C", "#C97F64"]).toContain(dishTone("Lachs", "fisch"));
    expect(dishTone("Irgendwas")).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe("Tipp des Tages", () => {
  const opts = { dish: null, tips: true, weekendIdeas: true, kids: true, persons: 3 };

  it("Fr–So eine Wochenend-Idee, die zum Haushalt passt", () => {
    const sa = dailyTip("2026-10-24", opts)!;
    expect(sa.category).toBe("wochenende");
    expect(sa.audience === undefined || sa.audience === "kids").toBe(true);
    const paar = dailyTip("2026-10-25", { ...opts, kids: false, persons: 2 })!;
    expect(paar.audience).not.toBe("kids");
  });

  it("sonst ein Tipp zum Gericht, sonst ein allgemeiner; aus = nichts", () => {
    expect(dailyTip("2026-10-22", { ...opts, dish: "Spaghetti Bolognese" })?.category).toBe("gericht");
    const general = dailyTip("2026-10-22", opts)!;
    expect(["gericht", "wochenende"]).not.toContain(general.category);
    expect(dailyTip("2026-10-22", opts)).toBe(general);
    expect(dailyTip("2026-10-22", { ...opts, tips: false })).toBeNull();
    expect(dailyTip("2026-10-24", { ...opts, tips: false, weekendIdeas: false })).toBeNull();
    expect(dailyTip("2026-10-22", { ...opts, kids: false, persons: 1 })).not.toBeNull();
  });

  it("Tipp-Texte ohne Druck-Wörter", () => {
    for (const t of ALL_TIPS) expect(`${t.text} ${t.detail}`, t.id).not.toMatch(/du musst|du solltest|vergiss nicht|überfällig/i);
  });
});
