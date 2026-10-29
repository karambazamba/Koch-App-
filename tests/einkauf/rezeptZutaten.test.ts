// A-057: Die eingebauten Rezepte („k:…“) liefern der Einkaufsliste ihre
// Zutaten – fürs Wochenplan-Angebot („Für deinen Wochenplan“) und für
// „Nehmen“ in der Rezept-Vorschau. Nur Namen (Mengen als Hinweis), Grundsachen
// blass bzw. ausgenommen, „im Haus“ nicht angeboten, gleiche Zutat aus zwei
// Gerichten = eine Zeile mit „wofür“.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShoppingListStore } from "@/lib/einkauf/listModel";
import type { PlanDay, PlanWeek, ResolvedEntry } from "@/lib/essen/mealPlan";
import type { PantryItem } from "@/lib/vorrat/haltbar";
import { at, atFresh, fakeWindow } from "../helpers";

const W = "2026-10-19";
const T = "2026-10-20";
const KEY = "wasgibts.einkaufsliste";
const WOK = "Wok-Nudeln mit Hähnchen";
const read = (f: string) => readFileSync(f, "utf8");

let w: ReturnType<typeof fakeWindow>;
const saved = () => JSON.parse(w.localStorage.getItem(KEY)!) as ShoppingListStore;
beforeEach(async () => {
  at(`${T}T17:00`);
  vi.resetModules();
  await atFresh(`${T}T17:00`);
  w = fakeWindow();
});
afterEach(() => {
  vi.doUnmock("@/lib/essen/mealPlan");
  vi.doUnmock("@/lib/core/toast");
  vi.useRealTimers();
});

/** Gericht aus der Wochenkarte: nur ein Titel, keine Rezept-ID */
const idee = (title: string): ResolvedEntry => ({ origin: "eigen", stored: { kind: "idea", title, category: "fleisch" }, title, category: null, double: false }) as unknown as ResolvedEntry;
/** Eingebautes Rezept über die ID */
const eingebaut = (title: string, recipeId: string): ResolvedEntry => ({ origin: "eigen", stored: { kind: "recipe", recipeId, title, category: "fleisch" }, title, category: null, recipeId, double: false });
const day = (weekday: string, e: ResolvedEntry): PlanDay =>
  ({ weekday, date: W, away: false, cheat: false, slot: { key: weekday, entry: e, hint: null, hasDerived: false }, mealTime: "abends", persons: 4, note: "", leftovers: null, paused: false, weekend: null }) as PlanDay;
const week = (days: PlanDay[]): PlanWeek => ({ weekStart: W, days, hasPlanRules: false, planned: 0, total: 7, counts: { fleisch: { planned: 0, target: 0 }, vegetarisch: { planned: 0, target: 0 }, fisch: { planned: 0, target: 0 } } });
const PLAN = week([day("Montag", idee(WOK)), day("Dienstag", eingebaut("Nasi Goreng", "k:nasi-goreng"))]);
const imHaus = (name: string): PantryItem => ({ id: `p:${name}`, name, addedAt: T, place: "kuehlschrank" });
const PROFIL = { planStyle: "fest", shoppingDay: "Montag", householdType: "familie" } as never;

describe("zutatenFuerGericht: eine Stelle für Plan und „Nehmen“", () => {
  it("eingebaut über den Titel oder die ID, Klammer-Erklärungen weg; eigenes Rezept geht vor; ohne Rezept leer", async () => {
    const { zutatenFuerGericht } = await import("@/lib/einkauf/angebot/rezeptZutaten");
    const wok = zutatenFuerGericht({ title: WOK }, {});
    expect(wok.rezept?.id).toBe("k:wok-nudeln-mit-haehnchen");
    expect(wok.zutaten.map((i) => i.name)).toEqual(["Mie-Nudeln", "Hähnchenbrust", "Paprika", "Möhren", "Frühlingszwiebeln", "Sojasoße"]);
    expect(zutatenFuerGericht({ title: "egal", recipeId: "k:wok-nudeln-mit-haehnchen" }, {}).zutaten).toHaveLength(6);
    expect(zutatenFuerGericht({ title: "nasi goreng" }, {}).zutaten[0].name).toBe("Reis");
    const eigen = { id: "x", title: WOK, servings: 2, ingredients: [{ id: "a", amount: 1, unit: "", name: "Tofu" }] } as never;
    expect(zutatenFuerGericht({ title: WOK, recipeId: "x" }, { x: eigen }).zutaten.map((i) => i.name)).toEqual(["Tofu"]);
    expect(zutatenFuerGericht({ title: "Omas Geheimsuppe" }, {})).toEqual({ zutaten: [] });
  });
});

describe("Wochenplan-Angebot mit eingebauten Rezepten (A-057)", () => {
  it("Wok-Nudeln im Plan ergeben Zutaten im Angebot – nur Namen, Menge nur als Hinweis; nicht mehr „ohne Rezept“", async () => {
    const { buildShoppingList } = await import("@/lib/einkauf/buildList");
    const list = buildShoppingList(week([day("Montag", idee(WOK))]), {}, undefined, undefined, { angebot: true });
    expect(list.items).toEqual([]);
    expect(list.missing).toEqual([]);
    expect(list.angebot.map((i) => i.name)).toEqual(["Mie-Nudeln", "Hähnchenbrust", "Paprika", "Möhren", "Frühlingszwiebeln", "Sojasoße"]);
    const nudeln = list.angebot.find((i) => i.name === "Mie-Nudeln")!;
    expect(nudeln.amount).toBe("");
    expect(nudeln.rezeptMenge).toBe("250 g");
    const { alsEintrag } = await import("@/lib/einkauf/angebot/angebot");
    expect(alsEintrag(nudeln)).toMatchObject({ name: "Mie-Nudeln", amount: "", dish: WOK, day: "Montag", rezeptMenge: "250 g" });
  });

  it("dieselbe Zutat aus zwei Gerichten = eine Zeile mit „wofür“ (Mengen zusammen als Hinweis)", async () => {
    const { buildShoppingList } = await import("@/lib/einkauf/buildList");
    const { angebotFuer, wofuer } = await import("@/lib/einkauf/angebot/angebot");
    const list = buildShoppingList(PLAN, {}, undefined, undefined, { angebot: true });
    const namen = list.angebot.map((i) => i.name);
    expect(namen.filter((n) => n === "Hähnchenbrust")).toHaveLength(1);
    expect(namen.filter((n) => n === "Möhren")).toHaveLength(1);
    expect(new Set(namen).size).toBe(namen.length);
    const huhn = list.angebot.find((i) => i.name === "Hähnchenbrust")!;
    expect(huhn.rezeptMenge).toBe("700 g");
    expect(wofuer(huhn)).toBe(`für ${WOK}, Nasi Goreng · Mo`);
    expect(angebotFuer(null, list.angebot).kopf).toBe(`${WOK} · Mo · Nasi Goreng · Di`);
  });

  it("Grundsachen (Sojasoße …) stehen blass da und kommen nie mit „Alle dazu“", async () => {
    const { buildShoppingList } = await import("@/lib/einkauf/buildList");
    const { alleDazu, angebotFuer } = await import("@/lib/einkauf/angebot/angebot");
    const a = angebotFuer(null, buildShoppingList(PLAN, {}, undefined, undefined, { angebot: true }).angebot);
    expect(a.chips.find((c) => c.item.name === "Sojasoße")?.blass).toBe(true);
    expect(alleDazu(a).map((i) => i.name)).not.toContain("Sojasoße");
  });

  it("„Haben wir schon“ (im Haus) und schon Draufstehendes wird nicht angeboten", async () => {
    const { buildShoppingList } = await import("@/lib/einkauf/buildList");
    const list = buildShoppingList(PLAN, {}, { checked: [], have: ["hähnchenbrust|g"], manual: [{ id: "1", name: "Paprika", amount: "", section: "obst", done: false }] } as never, undefined, { angebot: true });
    const namen = list.angebot.map((i) => i.name);
    expect(namen).not.toContain("Hähnchenbrust");
    expect(namen).not.toContain("Paprika");
    expect(namen).toContain("Mie-Nudeln");
  });
});

describe("„Nehmen“ bei einem eingebauten Rezept (A-057)", () => {
  it("bedarfFuerGericht: alle Rezept-Zutaten ohne „im Haus“ und ohne Grundsachen; ohne Vorrat kein Abgleich; ohne Rezept die Vorschau", async () => {
    const { bedarfFuerGericht } = await import("@/lib/einkauf/angebot/rezeptZutaten");
    expect(bedarfFuerGericht({ title: WOK }, {}, [imHaus("Paprika")], ["Mie-Nudeln"])).toEqual(["Mie-Nudeln", "Hähnchenbrust", "Möhren", "Frühlingszwiebeln"]);
    expect(bedarfFuerGericht({ title: WOK }, {}, undefined, ["Mie-Nudeln"])).toBeNull();
    expect(bedarfFuerGericht({ title: "Omas Geheimsuppe" }, {}, [], ["Speck"])).toEqual(["Speck"]);
  });

  it("bietet die Zutaten des Rezepts an (nicht nur, was die Vorschau nannte), ohne „im Haus“ und Grundsachen", async () => {
    vi.doMock("@/lib/essen/mealPlan", async (orig) => ({ ...(await orig<object>()), composeWeek: () => week([day("Montag", idee(WOK))]), loadMealPlans: () => ({}) }));
    const showToast = vi.fn();
    vi.doMock("@/lib/core/toast", async (orig) => ({ ...(await orig<object>()), showToast }));
    const { zutatenAnbieten } = await import("@/lib/einkauf/angebot/nachNehmen");
    const { bedarfFuerGericht } = await import("@/lib/einkauf/angebot/rezeptZutaten");
    const needs = bedarfFuerGericht({ title: WOK }, {}, [imHaus("Paprika")], ["Mie-Nudeln", "Hähnchenbrust"]);
    expect(zutatenAnbieten({ profile: PROFIL, weekPlans: {}, recipes: {} }, WOK, "2026-10-19", needs)).toBe(true);
    const t = showToast.mock.calls[0][0] as { text: string; action: { run: () => void } };
    expect(t.text).toBe("Auf die Liste: Mie-Nudeln, Hähnchenbrust +2?");
    t.action.run();
    const manual = saved().weeks[W].manual;
    expect(manual.map((m) => m.name)).toEqual(["Mie-Nudeln", "Hähnchenbrust", "Möhren", "Frühlingszwiebeln"]);
    expect(manual.every((m) => m.amount === "" && m.dish === WOK)).toBe(true);
    expect(manual[0].rezeptMenge).toBe("250 g");
  });

  it("spontan (nicht im Plan): was nicht im Haus ist, Rezeptmenge als Hinweis", async () => {
    vi.doMock("@/lib/essen/mealPlan", async (orig) => ({ ...(await orig<object>()), composeWeek: () => week([]), loadMealPlans: () => ({}) }));
    const showToast = vi.fn();
    vi.doMock("@/lib/core/toast", async (orig) => ({ ...(await orig<object>()), showToast }));
    const { zutatenAnbieten } = await import("@/lib/einkauf/angebot/nachNehmen");
    const { bedarfFuerGericht } = await import("@/lib/einkauf/angebot/rezeptZutaten");
    const needs = bedarfFuerGericht({ title: WOK }, {}, [imHaus("Mie-Nudeln")], null);
    const spontan = { planStyle: "spontan", shoppingDay: "Montag", householdType: "familie" } as never;
    expect(zutatenAnbieten({ profile: spontan, weekPlans: {}, recipes: {} }, WOK, "2026-10-21", needs)).toBe(true);
    (showToast.mock.calls[0][0] as { action: { run: () => void } }).action.run();
    const manual = saved().weeks[W].manual;
    expect(manual.map((m) => m.name)).toEqual(["Hähnchenbrust", "Paprika", "Möhren", "Frühlingszwiebeln"]);
    expect(manual[0]).toMatchObject({ amount: "", dish: WOK, day: "Mittwoch", rezeptMenge: "400 g" });
  });

  it("die Essen-Kachel rechnet `needs` mit dem ganzen Rezept und dem, was im Haus ist", () => {
    expect(read("src/components/heute/HomeTiles.tsx")).toMatch(/needs: bedarfFuerGericht\(\{ title: it\.title, recipeId: rezeptId \?\? it\.recipeId \}, data\.recipes, stock, it\.needs \?\? null\)/);
    expect(read("src/lib/einkauf/buildList.ts")).toMatch(/zutatenFuerGericht\(entry, recipes\)/);
  });
});
