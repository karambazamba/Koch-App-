import { describe, expect, it } from "vitest";
import { toPutAway } from "@/lib/vorrat/einraeumen";
import type { PantryItem } from "@/lib/vorrat/pantry";

const p = (name: string): PantryItem => ({ id: name, name, amount: null, unit: "", addedAt: "2026-10-20", place: "kuehlschrank" });
const i = (key: string, checked: boolean, hidden = false) => ({ key, name: key, checked, hidden });

describe("Vom Einkauf einräumen", () => {
  it("nur abgehakte, nicht ausgeblendete, noch nicht im Vorrat, nicht schon eingeräumt", () => {
    const items = [i("Milch", true), i("Brot", true), i("Äpfel", false), i("Butter", true, true), i("Eier", true), i("Käse", true)];
    expect(toPutAway(items, [p("Eier")], ["Käse"]).map((x) => x.key)).toEqual(["Milch", "Brot"]);
  });

  it("gleiche Zutat in anderer Form zählt als schon da (Tomate/Tomaten)", () => {
    expect(toPutAway([i("Tomaten", true)], [p("Tomate")], [])).toEqual([]);
  });
});
