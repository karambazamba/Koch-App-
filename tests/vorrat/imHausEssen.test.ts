// „Im Haus“ gehört zu 1.0 – zusammen mit Spontan kochen: füllt sich ohne
// Arbeit (Einkauf abhaken → rein, Gegessen → raus, „… ist alle“ → raus und
// auf die Liste, „Hab noch Hack“ → rein), Bereich unter Essen (Chips, bald
// zuerst, höchstens 8, „Was koch ich daraus?“ mit genau diesen Sachen),
// Kachel S/M nur über die Auswahl, Mia stellt es beim ersten Besuch vor.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { placeFor } from "@/lib/vorrat/haltbar";
import type { PantryItem } from "@/lib/vorrat/pantry";
import { HOUSE_TILE_MAX, IM_HAUS_CHIPS, houseTile, imHausReihe } from "@/lib/vorrat/imHaus";
import { pantrySentence } from "@/lib/vorrat/kreislauf";
import { spontanIdeas } from "@/lib/essen/spontan";
import { DEFAULT_HOME, HOME_TILES, applyHomeChange, sanitizeHome } from "@/lib/core/homeLayout";
import { ersterBesuch } from "@/lib/mia/denktmit/vorstellen";
import { ESSEN_SEITE } from "@/lib/mia/denktmit/seiten/essen";
import { seiteFuerTab } from "@/lib/mia/denktmit/seiten";
import { EMPTY_DENKT } from "@/lib/mia/denktmit/store";
import { at, atFresh, fakeWindow } from "../helpers";

const T = "2026-10-20";
const WEEK = "2026-10-19";
const day = (d: number) => new Date(Date.parse(`${T}T12:00:00Z`) - d * 86_400_000).toISOString().slice(0, 10);
const item = (name: string, daysAgo = 0, extra: Partial<PantryItem> = {}): PantryItem => ({ id: name, name, addedAt: day(daysAgo), place: placeFor(name), usedAt: null, ...extra });
const listItem = (name: string, key = name) => ({ key, name, originalName: name, amount: "", section: "kuehlregal" as const, dishes: [], days: [], shop: "", checked: false, hidden: false, manualId: key });

beforeEach(async () => {
  at(`${T}T08:00`);
  vi.resetModules();
  await atFresh(`${T}T08:00`);
  fakeWindow();
});

describe("Füllt sich ohne Arbeit", () => {
  it("Einkauf abhaken → Im Haus (und steht unter Essen als Chip)", async () => {
    const { toggleChecked } = await import("@/lib/einkauf/listEdits");
    const { loadPantry } = await import("@/lib/vorrat/pantry");
    toggleChecked(WEEK, listItem("Eier"), T);
    toggleChecked(WEEK, listItem("Hack"), T);
    toggleChecked(WEEK, listItem("Klopapier"), T);
    expect(loadPantry().map((i) => i.name)).toEqual(["Eier", "Hack"]);
    expect(imHausReihe(loadPantry(), T).map((x) => x.item.name)).toEqual(["Eier", "Hack"]);
    // Haken wieder weg = wieder raus
    toggleChecked(WEEK, { ...listItem("Eier"), checked: true }, T);
    expect(loadPantry().map((i) => i.name)).toEqual(["Hack"]);
  });

  it("Gegessen → die verbrauchten Zutaten sind raus (auch ohne eigenes Rezept), Rückgängig holt sie zurück", async () => {
    const { markCooked, unmarkCooked } = await import("@/lib/essen/mealDone");
    const p = await import("@/lib/vorrat/pantry");
    p.addPantryItems([{ name: "Spaghetti" }, { name: "Hackfleisch" }, { name: "Joghurt" }], T);
    markCooked(T, { title: "Spaghetti Bolognese" }, {}, { how: "marked" });
    expect(p.loadPantry().map((i) => i.name)).toEqual(["Joghurt"]);
    unmarkCooked(T);
    expect(p.loadPantry().map((i) => i.name).sort()).toEqual(["Hackfleisch", "Joghurt", "Spaghetti"]);
  });

  it("„Eier sind alle“ = raus und auf die Einkaufsliste; schon Draufstehendes nicht doppelt; Rückgängig", async () => {
    const p = await import("@/lib/vorrat/pantry");
    const { istAlle } = await import("@/lib/vorrat/kreislauf");
    const { addManualItem } = await import("@/lib/einkauf/listEdits");
    const { store } = await import("@/lib/einkauf/listStore");
    p.addPantryItems([{ name: "Eier" }, { name: "Milch" }, { name: "Hack" }], T);
    addManualItem(WEEK, { name: "Milch", amount: "", section: "kuehlregal" });
    const said = pantrySentence("Eier und Milch sind alle");
    expect(said).toEqual({ used: ["Eier", "Milch"] });
    const done = istAlle((said as { used: string[] }).used, T, WEEK);
    expect(done.used).toEqual(["Eier", "Milch"]);
    expect(done.toList).toEqual(["Eier"]);
    expect(p.loadPantry().map((i) => i.name)).toEqual(["Hack"]);
    expect(store.load()?.weeks[WEEK].manual.map((m) => m.name)).toEqual(["Milch", "Eier"]);
    done.undo();
    expect(p.loadPantry().map((i) => i.name)).toEqual(["Eier", "Milch", "Hack"]);
    expect(store.load()?.weeks[WEEK].manual.map((m) => m.name)).toEqual(["Milch"]);
  });

  it("auch was nicht im Haus stand, kommt bei „ist alle“ auf die Liste", async () => {
    const { istAlle } = await import("@/lib/vorrat/kreislauf");
    const { store } = await import("@/lib/einkauf/listStore");
    expect(istAlle(["Butter"], T, WEEK)).toMatchObject({ used: [], toList: ["Butter"] });
    expect(store.load()?.weeks[WEEK].manual.map((m) => m.name)).toEqual(["Butter"]);
  });

  it("„Hab noch Hack“ = rein – nur bekannte Lebensmittel („Hab noch Zeit“ nicht)", () => {
    expect(pantrySentence("Hab noch Hack")).toEqual({ add: ["Hack"] });
    expect(pantrySentence("Wir haben noch Eier und Milch im Kühlschrank.")).toEqual({ add: ["Eier", "Milch"] });
    expect(pantrySentence("Wir haben noch 4 Joghurt im Kühlschrank")).toEqual({ add: ["4 Joghurt"] });
    expect(pantrySentence("Ich hab noch Zeit")).toBeNull();
    expect(pantrySentence("Hab noch einen Termin um 3")).toBeNull();
  });
});

describe("Bereich „Im Haus“ unter Essen", () => {
  it("bald aufbrauchen zuerst, dann das zuletzt Reingekommene; Aufgebrauchtes, Abgelaufenes, Grundsachen nicht", () => {
    const all = [item("Nudeln", 3), item("Joghurt", 5), item("Hack", 2), item("Milch"), item("Salz"), item("Brot", 0, { usedAt: T }), item("Quark", 9)];
    expect(imHausReihe(all, T).map((x) => [x.item.name, x.soon])).toEqual([
      ["Hack", true],
      ["Joghurt", true],
      ["Milch", false],
      ["Nudeln", false],
    ]);
    // Gekauftes aus der Liste („b:“) ist nie „bald“
    expect(imHausReihe([{ ...item("Joghurt", 6), id: "b:Joghurt" }], T)[0].soon).toBe(false);
    expect(IM_HAUS_CHIPS).toBe(8);
  });

  it("„Was koch ich daraus?“ rechnet mit genau diesen Sachen", () => {
    const stock = imHausReihe([item("Spaghetti", 1), item("Hackfleisch", 2), item("Tomaten")], T).map((x) => x.item);
    const ideas = spontanIdeas({}, stock, [], []);
    expect(ideas.length).toBeGreaterThan(0);
    const names = stock.map((s) => s.name);
    for (const idea of ideas) for (const used of idea.uses) expect(names).toContain(used);
    expect(ideas.some((i) => i.uses.length > 0)).toBe(true);
  });
});

describe("Kachel „Im Haus“", () => {
  it("XS oder S, nur über die Auswahl (nicht im Standard für Familie)", () => {
    const meta = HOME_TILES.find((t) => t.id === "vorrat")!;
    expect(meta.sizes).toEqual(["XS", "S"]);
    expect(meta.size).toBe("XS");
    expect(DEFAULT_HOME.find((t) => t.id === "vorrat")?.visible).toBe(false);
    const shown = applyHomeChange(DEFAULT_HOME, { tile: "vorrat", action: "zeigen" });
    expect(shown.find((t) => t.id === "vorrat")).toMatchObject({ visible: true, size: "XS" });
    // M gibt es nicht → S (die nächste erlaubte), altes L ebenso
    expect(applyHomeChange(shown, { tile: "vorrat", action: "mittel" }).find((t) => t.id === "vorrat")?.size).toBe("S");
    expect(sanitizeHome([{ id: "vorrat", visible: true, size: "L" } as never]).find((t) => t.id === "vorrat")?.size).toBe("S");
  });

  it("XS = 1 Sache, S = 2 Sachen „bald aufbrauchen“ (darunter „Was koch ich daraus?“)", () => {
    expect(HOUSE_TILE_MAX).toEqual({ XS: 1, S: 2 });
    const soon = ["Joghurt", "Sahne", "Quark", "Schmand", "Feta", "Mozzarella", "Frischkäse"].map((n) => item(n, 5));
    expect(houseTile(soon, T, HOUSE_TILE_MAX.S)).toMatchObject({ soon: true });
    expect(houseTile(soon, T, HOUSE_TILE_MAX.S).items).toHaveLength(2);
    expect(houseTile(soon, T, HOUSE_TILE_MAX.XS).items).toHaveLength(1);
  });
});

describe("Mia stellt es einmal vor", () => {
  it("erster Besuch der Essen-Seite – auch für alle, die Essen schon kannten", () => {
    const text = "Sag mir, was im Kühlschrank ist. Dann koch ich spontan was mit dir.";
    expect(seiteFuerTab("essen")).toBe(ESSEN_SEITE);
    expect(seiteFuerTab("kalender")).toBe("seite:kalender");
    expect(ersterBesuch({ ...EMPTY_DENKT }, ESSEN_SEITE)).toBe(text);
    expect(ersterBesuch({ ...EMPTY_DENKT, besucht: ["seite:essen"] }, ESSEN_SEITE)).toBe(text);
    expect(ersterBesuch({ ...EMPTY_DENKT, besucht: [ESSEN_SEITE] }, ESSEN_SEITE)).toBeNull();
  });
});
