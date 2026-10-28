// Essen-Kachel: immer Bild, gezeigtes Gericht immer wählbar (Screenshot
// „MORGEN · MO – Bibimbap – 3 Ideen ansehen“ ohne Bild, nicht auswählbar).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { KACHEL_VERLAUF, TITEL_BREITE, essenKopf, essenPille, essenTippen, essenUnterzeile, essenUnterzeilen, kachelZustand, foodTileView, kachelBild, kachelVerlaufCss, kochSchrittText, kontrastWeiss, rezeptVorratZeile, titelPx, titelZeilen, verlaufAlpha, zutatenKurz } from "@/lib/heute/essenKachel";
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
    expect(foodTileView({ ...base, over: true })).toEqual({ kind: "frei", title: "Was gibt’s morgen?", ideen: true });
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

  it("jeder Zustand ist eine Bild-Kachel; ohne Plan gleich ein Vorschlag (Tafel 134)", () => {
    const food = tile.slice(tile.indexOf("export function FoodTile"), tile.indexOf("/** Eine Zeile der Einkauf-Kachel"));
    // genau ein return mit <DishTile – kein Zweig ohne Bild mehr
    expect(food.match(/return \(/g)).toHaveLength(1);
    expect(food).toMatch(/return \(\s*<>\s*<DishTile/);
    expect(food).toMatch(/picture=\{picture\}/);
    expect(food).toMatch(/alt !== null \? list\[alt % list\.length\] : geplantTitel \? null : list\[0\]/);
    // keine großen Knöpfe mehr, nur die zwei Pillen
    expect(food).not.toMatch(/links=|rechts=|label: "Rezept"/);
    expect(food).toMatch(/pille=\{\{ label: pille/);
  });

  it("Antippen: Vorschlag → Vorschau (A-038), geplant → Rezept bzw. Fenster ohne Rezept, kocht → Kochmodus, frei → Ideen des Tages", () => {
    expect(tile).toMatch(/tippen === "vorschau" \? zeigen : tippen === "rezept" \? \(rezeptHref \?\? \(\(\) => setOhneRezept\(true\)\)\) : tippen === "kochmodus" && kochHref \? kochHref : day && !day\.away \? \(\) => setTag\(true\) : onOpen/);
    expect(tile).toMatch(/vorschau\.zeigen\(\{ title: idea\.title[^\n]*\(rezeptId\) => take\(idea, rezeptId\)\)/);
    expect(tile).toMatch(/<TagFenster data=\{data\} day=\{day\}/);
    // Wochenkarten-Gerichte ohne recipeId finden ihr eingebautes Rezept über den Titel
    expect(tile).toMatch(/entry\.recipeId \?\? rezeptIdFuer\(entry\.title\)/);
  });

  it("Beispiel-Tag: Antippen öffnet die Vorschau, erst „Nehmen“ übernimmt in den echten Plan", () => {
    expect(demo).toMatch(/open=\{zeigen\}/);
    expect(demo).toMatch(/onTake \? \(\) => onTake\(\{ title: r\.title, category: r\.category \}, d\.tomorrow\) : null/);
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
    expect(kachelBild(zustaende.frei)).toEqual({ title: "Was gibt’s heute?", leer: true });
    expect(kachelBild(zustaende["kein Kochtag"])).toEqual({ title: "Kein Kochtag", leer: true });
    expect(kachelBild(zustaende.gegessen).leer).toBe(true);
  });

  it("Statuszeile darf umbrechen, nichts mit „…“ gekürzt (A-045), keine „Personen“ auf der Essen-Kachel", () => {
    const dishTile = readFileSync("src/components/essen/DishTile.tsx", "utf8");
    expect(dishTile).not.toMatch(/\btruncate\b|line-clamp|text-ellipsis/);
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
    expect(essenUnterzeile({ minutes: 90, needs: ["Karotte", "Lauch", "Sahne"] })).toBe("90 Min · auf die Liste: Karotte, Lauch +1");
    // Tafel 133: S zwei Zeilen, eine Zutat + „+N“; M eine Zeile mit zwei
    expect(essenUnterzeilen({ minutes: 30, needs: ["Eier", "Limette", "Koriander", "Erdnüsse"] }, "S")).toEqual(["30 Min", "auf die Liste: Eier +3"]);
    expect(essenUnterzeilen({ minutes: 30, needs: ["Eier", "Limette", "Koriander", "Erdnüsse"] }, "M")).toEqual(["30 Min · auf die Liste: Eier, Limette +2"]);
    expect(essenUnterzeilen({ minutes: 25, needs: [] }, "S")).toEqual(["25 Min", "alles im Haus"]);
    expect(essenUnterzeilen({ minutes: null, needs: null }, "S")).toEqual([]);
    expect(essenUnterzeilen({ minutes: 30, needs: ["X"], schritt: "Schritt 2 von 3" }, "S")).toEqual(["Schritt 2 von 3"]);
    expect(essenUnterzeile({ minutes: 90, needs: [] })).toBe("90 Min · alles im Haus");
    expect(essenUnterzeile({ minutes: 90, needs: null })).toBe("90 Min");
    expect(essenUnterzeile({ minutes: null, needs: null })).toBe("");
    expect(essenUnterzeile({ minutes: 90, needs: [], schritt: "Schritt 3 von 6" })).toBe("Schritt 3 von 6");
    expect(rezeptVorratZeile(90, ["Karotte"])).toBe("90 Min · alles im Haus bis auf Karotte");
    expect(rezeptVorratZeile(90, [])).toBe("90 Min · alles im Haus");
    for (const t of [essenUnterzeile({ minutes: 9, needs: ["X"] }), rezeptVorratZeile(9, ["X"])]) expect(t).not.toMatch(/fehlt|offen|überfällig/i);
  });

  it("A-046: Statuszeile, Pille und Antippen je Zustand", () => {
    const geplant = foodTileView({ ...base, today: "Lasagne" });
    const vorschlag = foodTileView({ ...base, idea: "Pad Thai" });
    const frei = foodTileView({ ...base, ideas: 0 });
    const o = { over: false, clock: "18:30", morgen: "Do" };
    expect(kachelZustand(geplant, false)).toBe("geplant");
    expect(kachelZustand(geplant, true)).toBe("kocht");
    expect(kachelZustand(foodTileView({ ...base, over: true, tomorrow: "Curry" }), true)).toBe("geplant");
    expect(kachelZustand(vorschlag, true)).toBe("vorschlag");
    expect(essenKopf("vorschlag", o)).toBe("Kochidee · Heute");
    expect(essenKopf("vorschlag", { ...o, over: true })).toBe("Kochidee · Morgen Do");
    expect(essenKopf("geplant", o)).toBe("Essen · 18:30");
    expect(essenKopf("geplant", { ...o, over: true })).toBe("Morgen · Do");
    expect(essenKopf("kocht", o)).toBe("Essen · Jetzt");
    expect(essenKopf("frei", { ...o, clock: null })).toBe("Essen");
    expect(essenPille("kocht")).toBe("Weiter kochen ›");
    for (const z of ["vorschlag", "geplant", "frei"] as const) expect(essenPille(z)).toBe("Wochenplan ›");
    expect(essenTippen("vorschlag")).toBe("vorschau");
    expect(essenTippen("geplant")).toBe("rezept");
    expect(essenTippen("kocht")).toBe("kochmodus");
    expect(essenTippen(kachelZustand(frei, false))).toBe("ideen");
    expect(frei.title).toBe("Was gibt’s heute?");
  });

  it("Name: S 19 px, M 22 px – nur wenn er sonst nicht passt, kleiner; nie mitten im Wort, nie „…“", () => {
    // Tafel 134: S 19 px, M 22 px
    expect(titelPx("Lasagne", "S")).toBe(19);
    expect(titelPx("Lasagne", "M")).toBe(22);
    // „Gemüselasagne“ ist bei 19 px breiter als S auf dem SE (320 px) → kleiner, 2 Zeilen
    expect(titelZeilen("Gemüselasagne mit Béchamel", 19, TITEL_BREITE.S)).toBeNull();
    expect(titelPx("Gemüselasagne mit Béchamel", "S")).toBeLessThan(19);
    expect(titelZeilen("Gemüselasagne mit Béchamel", titelPx("Gemüselasagne mit Béchamel", "S"), TITEL_BREITE.S)).toBeLessThanOrEqual(2);
    expect(titelZeilen("Donaudampfschifffahrtsgesellschaft", 20, 116)).toBeNull();
    // SE 1. Gen.: 320 − 2 × 16 Rand, 8 Abstand, 2 × 12 Innenrand
    expect(TITEL_BREITE).toEqual({ S: 116, M: 264 });
  });

  it("alle 150 Gerichte und alle eingebauten Rezepte passen auf dem iPhone SE (320 px) ganz: S ≤ 3, M ≤ 2 Zeilen, kein Wort geteilt", () => {
    const titel = [...new Set([...GERICHTE.map((g) => g.title), ...BUILTIN_COOK.map((r) => r.title), ...DEMO_RECIPES.map((r) => r.title)])];
    for (const t of titel) {
      for (const size of ["S", "M"] as const) {
        const px = titelPx(t, size);
        const n = titelZeilen(t, px, TITEL_BREITE[size]);
        expect(n, `${size}: ${t} (${px} px)`).not.toBeNull();
        // Tafel 134: bis 2 Zeilen; nur auf dem SE (320 px) für sehr lange Namen 3, nie „…“
        expect(n!, `${size}: ${t}`).toBeLessThanOrEqual(size === "S" ? 3 : 2);
        expect(px, `${size}: ${t}`).toBeGreaterThanOrEqual(14);
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

  it("A-046: keine großen Knöpfe, unten rechts eine weiße Pille (32 px, Tippfläche 44 px), keine Emojis", () => {
    const dishTile = readFileSync("src/components/essen/DishTile.tsx", "utf8");
    const knopf = readFileSync("src/components/ui/KachelKnopf.tsx", "utf8");
    expect(knopf).toMatch(/"flex h-11 /);
    expect(knopf).toMatch(/flex h-8 /);
    expect(knopf).toMatch(/\[12\.5, 12\]/);
    expect(dishTile).not.toMatch(/grid-cols-2|data-kachel-knoepfe/);
    expect(dishTile).toMatch(/text-\[10\.5px\][^"]*" data-kopf/);
    expect(dishTile).not.toMatch(/⏱|⇄/);
    // Bereich immer „Essen …“ (VoiceOver, Fehler: „Kochidee · Heute“ fand niemand mehr als Essen)
    expect(dishTile).toMatch(/const bereich = \/\^Essen\/i\.test\(kopf\) \? kopf : `Essen · \$\{kopf\}`/);
    const tile = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
    const food = tile.slice(tile.indexOf("export function FoodTile"), tile.indexOf("/** Eine Zeile der Einkauf-Kachel"));
    expect(food).not.toMatch(/⏱|⇄|"Woche"|BookOpen/);
  });
});

describe("A-045 (Tafel 133): Zutaten nie mit „…“", () => {
  it("höchstens zwei Namen, der Rest als „+N“", () => {
    expect(zutatenKurz([])).toBe("");
    expect(zutatenKurz(["Eier"])).toBe("Eier");
    expect(zutatenKurz(["Eier", "Limette"])).toBe("Eier, Limette");
    expect(zutatenKurz(["Eier", "Limette", "Koriander", "Erdnüsse"])).toBe("Eier, Limette +2");
    expect(zutatenKurz(["Eier", "Limette", "Koriander", "Erdnüsse"], 1)).toBe("Eier +3");
    expect(zutatenKurz(["Eier", "Limette"], 0)).toBe("Eier +1");
    for (const n of [1, 2, 3, 7]) expect(zutatenKurz(Array.from({ length: n }, (_, i) => `Z${i}`))).not.toMatch(/…|\.\.\./);
  });

  it("Rezeptseite: „alles im Haus bis auf Karotte, Lauch +1“", () => {
    expect(rezeptVorratZeile(90, ["Karotte", "Lauch", "Sahne"])).toBe("90 Min · alles im Haus bis auf Karotte, Lauch +1");
  });
});
