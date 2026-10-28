// Essen-Kachel: immer Bild, gezeigtes Gericht immer wählbar (Screenshot
// „MORGEN · MO – Bibimbap – 3 Ideen ansehen“ ohne Bild, nicht auswählbar).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { KACHEL_VERLAUF, TITEL_BREITE, essenKnoepfe, essenUnterzeile, foodTileView, kachelBild, kachelVerlaufCss, kochSchrittText, kontrastWeiss, rezeptVorratZeile, takeLabel, titelAnzeige, titelPx, titelZeilen, verlaufAlpha } from "@/lib/heute/essenKachel";
import { GERICHTE } from "@/lib/essen/gerichte";
import { BUILTIN_COOK } from "@/lib/essen/kochen";
import { DEMO_RECIPES } from "@/lib/essen/demoDish";
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
    expect(food).toMatch(/view\.kind === "frei" \? \(view\.ideen \? `\$\{Math\.min\(3, list\.length\)\} Ideen ansehen`/);
    expect(food).toMatch(/const sub = view\.kind === "vorschlag" \? "Vorschlag"/);
  });

  it("Antippen: Vorschlag → Fenster, geplant → Tagesansicht (TagFenster), „Rezept“ → Rezept bzw. Fenster ohne Rezept", () => {
    expect(tile).toMatch(/view\.kind === "vorschlag" \? \(\) => setChosen\(idea\) : view\.kind === "geplant" && day \? \(\) => setTag\(true\) : onOpen/);
    expect(tile).toMatch(/<TagFenster data=\{data\} day=\{day\}/);
    expect(tile).toMatch(/label: "Rezept", icon: BookOpen, open: rezeptHref \?\? \(\(\) => setOhneRezept\(true\)\)/);
    // Wochenkarten-Gerichte ohne recipeId finden ihr eingebautes Rezept über den Titel
    expect(tile).toMatch(/entry\.recipeId \?\? rezeptIdFuer\(entry\.title\)/);
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

  it("Kopfzeile bricht nie um, keine „Personen“ auf der Essen-Kachel", () => {
    const dishTile = readFileSync("src/components/essen/DishTile.tsx", "utf8");
    expect(dishTile).toMatch(/truncate whitespace-nowrap[^"]*" data-kopf/);
    expect(readFileSync("src/components/heute/HomeTiles.tsx", "utf8")).not.toMatch(/"Personen?"/);
  });

  it("Kochmodus-Schritt: „Schritt 3 von 6“ (Zutaten zählen als Schritt 1, nie über das Ende)", () => {
    expect(kochSchrittText(3, 6)).toBe("Schritt 3 von 6");
    expect(kochSchrittText(0, 6)).toBe("Schritt 1 von 6");
    expect(kochSchrittText(9, 6)).toBe("Schritt 6 von 6");
    expect(kochSchrittText(1, 0)).toBeNull();
  });
});

describe("Tafel 122: Name groß, zwei Knöpfe, Unterzeile", () => {
  it("Unterzeile: Minuten · auf die Liste bzw. alles im Haus, ohne Vorrat-Daten nur Minuten, beim Kochen der Schritt", () => {
    expect(essenUnterzeile({ minutes: 90, needs: ["Karotte"] })).toBe("90 Min · auf die Liste: Karotte");
    expect(essenUnterzeile({ minutes: 90, needs: ["Karotte", "Lauch", "Sahne"] })).toBe("90 Min · auf die Liste: Karotte, Lauch …");
    expect(essenUnterzeile({ minutes: 90, needs: [] })).toBe("90 Min · alles im Haus");
    expect(essenUnterzeile({ minutes: 90, needs: null })).toBe("90 Min");
    expect(essenUnterzeile({ minutes: null, needs: null })).toBe("");
    expect(essenUnterzeile({ minutes: 90, needs: [], schritt: "Schritt 3 von 6" })).toBe("Schritt 3 von 6");
    expect(rezeptVorratZeile(90, ["Karotte"])).toBe("90 Min · alles im Haus bis auf Karotte");
    expect(rezeptVorratZeile(90, [])).toBe("90 Min · alles im Haus");
    for (const t of [essenUnterzeile({ minutes: 9, needs: ["X"] }), rezeptVorratZeile(9, ["X"])]) expect(t).not.toMatch(/fehlt|offen|überfällig/i);
  });

  it("Knöpfe: Rezept bzw. Weiter kochen, Vorschlag ohne Gericht, nichts bei Kein Kochtag; rechts Wochenplan (S: Woche)", () => {
    const geplant = foodTileView({ ...base, today: "Lasagne" });
    expect(essenKnoepfe(geplant, { kocht: false, half: true })).toEqual({ links: "rezept", rechts: "Woche" });
    expect(essenKnoepfe(geplant, { kocht: true, half: false })).toEqual({ links: "weiter", rechts: "Wochenplan" });
    expect(essenKnoepfe(foodTileView({ ...base, over: true, tomorrow: "Curry" }), { kocht: true, half: false }).links).toBe("rezept");
    expect(essenKnoepfe(foodTileView({ ...base }), { kocht: false, half: false }).links).toBe("vorschlag");
    expect(essenKnoepfe(foodTileView({ ...base, idea: "Curry" }), { kocht: false, half: false }).links).toBe("vorschlag");
    expect(essenKnoepfe(foodTileView({ ...base, away: "Kein Kochtag", ideas: 0 }), { kocht: false, half: true }).links).toBeNull();
  });

  it("Name: S 20 px, M 24 px – nur wenn er sonst nicht passt, kleiner; nie mitten im Wort", () => {
    expect(titelPx("Lasagne", "S")).toBe(20);
    expect(titelPx("Lasagne", "M")).toBe(24);
    // „Gemüselasagne“ ist bei 20 px breiter als S auf dem SE → 18 px, zwei Zeilen
    expect(titelZeilen("Gemüselasagne mit Béchamel", 20, TITEL_BREITE.S)).toBeNull();
    expect(titelPx("Gemüselasagne mit Béchamel", "S")).toBe(18);
    expect(titelPx("Gemüselasagne mit Béchamel", "M")).toBe(22);
    // sehr lang: an einer Wortgrenze gekürzt, nie mitten im Wort
    expect(titelAnzeige("Rahmspinat mit Spiegelei und Kartoffeln", "S").text).toMatch(/^Rahmspinat mit Spiegelei( und)? …$/);
    expect(titelAnzeige("Rahmspinat mit Spiegelei und Kartoffeln", "M").text).toBe("Rahmspinat mit Spiegelei und Kartoffeln");
    expect(titelZeilen("Donaudampfschifffahrtsgesellschaft", 20, 143)).toBeNull();
  });

  it("alle 150 Gerichte und alle eingebauten Rezepte passen auf dem iPhone SE in S und M (≤ 2 Zeilen, kein Wort geteilt)", () => {
    const titel = [...new Set([...GERICHTE.map((g) => g.title), ...BUILTIN_COOK.map((r) => r.title), ...DEMO_RECIPES.map((r) => r.title)])];
    for (const t of titel) {
      for (const size of ["S", "M"] as const) {
        const { px, text } = titelAnzeige(t, size);
        const n = titelZeilen(text, px, TITEL_BREITE[size]);
        // gekürzt nur an einer Wortgrenze: alles vor „ …“ ist ein Anfang des Namens aus ganzen Wörtern
        if (text !== t) expect(`${t} `.startsWith(`${text.replace(/ …$/, "")} `), `${size}: ${t} → ${text}`).toBe(true);
        if (size === "M") expect(text, "M zeigt den ganzen Namen").toBe(t);
        expect(n, `${size}: ${t} (${px} px)`).not.toBeNull();
        expect(n!, `${size}: ${t}`).toBeLessThanOrEqual(2);
        expect(px, `${size}: ${t}`).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it("Kontrast: weiße Schrift auf dem hellsten Bild unter dem Verlauf überall, wo Text steht, mind. 4,5:1", () => {
    // Text beginnt unter der Pille (ab ca. 24 % der Höhe) und reicht bis unten
    for (let pos = 0.24; pos <= 1; pos += 0.02) expect(kontrastWeiss(verlaufAlpha(pos)), `bei ${Math.round(pos * 100)} %`).toBeGreaterThanOrEqual(4.5);
    // helle Gerichte (Creme, Gelb) erst recht
    expect(kontrastWeiss(verlaufAlpha(0.24), [250, 236, 200])).toBeGreaterThanOrEqual(4.5);
    // oben leicht, unten dunkel
    expect(KACHEL_VERLAUF[0][1]).toBeLessThan(KACHEL_VERLAUF[KACHEL_VERLAUF.length - 1][1]);
  });

  it("Verlauf ist ein Token (globals.css = genau der geprüfte Verlauf), Kachel nutzt ihn", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain(`--app-dish-tile-shade: ${kachelVerlaufCss()};`);
    expect(readFileSync("src/components/essen/DishTile.tsx", "utf8")).toMatch(/dish-tile-shade/);
  });

  it("Knöpfe unten: je 44 px hoch, gleich breit (zwei Spalten), Emojis nie in Knöpfen (Linien-Icons)", () => {
    const dishTile = readFileSync("src/components/essen/DishTile.tsx", "utf8");
    expect(dishTile).toMatch(/const KNOPF = "flex h-11 /);
    expect(dishTile).toMatch(/grid-cols-2/);
    const tile = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
    expect(tile).toMatch(/label: "Weiter kochen", icon: ChefHat/);
    expect(tile).toMatch(/label: "Vorschlag", icon: Lightbulb/);
    expect(dishTile).not.toMatch(/⏱|⇄/);
    const food = tile.slice(tile.indexOf("export function FoodTile"), tile.indexOf("/** Eine Zeile der Einkauf-Kachel"));
    expect(food).not.toMatch(/⏱|⇄/);
  });
});
