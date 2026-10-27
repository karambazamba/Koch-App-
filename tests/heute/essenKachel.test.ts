// Essen-Kachel: immer Bild, gezeigtes Gericht immer wählbar (Screenshot
// „MORGEN · MO – Bibimbap – 3 Ideen ansehen“ ohne Bild, nicht auswählbar).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { foodTileView, takeLabel } from "@/lib/heute/essenKachel";
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

  it("jedes gezeigte Gericht ist eine Bild-Kachel; „Ideen ansehen“ nur ohne Gericht", () => {
    expect(tile).toMatch(/if \(view\.kind !== "frei"\) \{[\s\S]*<DishTile/);
    expect(tile).toMatch(/view\.ideen && !away && <span[^>]*>\{`\$\{Math\.min\(3, list\.length\)\} Ideen ansehen`\}/);
    expect(tile).toMatch(/sub=\{view\.kind === "vorschlag" \? "Vorschlag"/);
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
