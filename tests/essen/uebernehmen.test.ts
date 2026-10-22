// Ideen übernehmen: für heute/einen Tag, im Supermarkt, Lieblingswochen, Planung freischalten
import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { takeForDay, takeForToday } from "@/lib/essen/spontanTake";
import { isMarketSituation, marketIdeas, marketProduct, marketTargetDay } from "@/lib/essen/market";
import { applyTemplate, deleteTemplate, saveTemplate, templateDays } from "@/lib/essen/templates";
import { isPlanUnlockRequest, unlockPlanning } from "@/lib/essen/planUnlock";
import { composeWeek, loadMealPlans, type StoredEntry } from "@/lib/essen/mealPlan";
import { createWeekPlan } from "@/lib/essen/weekPlan";
import { buch, fakeWindow, familie, rezept, vorrat } from "./hilfen";

const WEEK = "2026-10-19";
const DO = new Date(2026, 9, 22, 12);
let storage: Storage;
const text = (title: string, extra: object = {}): StoredEntry => ({ kind: "text", title, category: null, ...extra });

beforeEach(() => {
  at("2026-10-22T12:00");
  storage = fakeWindow();
});

describe("Für heute übernehmen", () => {
  const data = (mealPlans: Record<string, Record<string, StoredEntry>> = {}, profile = familie()) => ({ profile, weekPlans: {}, mealPlans, recipes: {} });

  it("freier Tag: einfach übernehmen; Rezept-Idee bekommt ihre Kategorie", () => {
    const r = takeForToday(data(), DO, { title: "Lachs mit Reis", category: null });
    expect(r).toMatchObject({ ok: true, text: "Übernommen ✓ Heute gibt’s Lachs mit Reis." });
    if (r.ok) expect(r.weeks[WEEK].Donnerstag).toEqual({ kind: "text", title: "Lachs mit Reis", category: "fisch" });
    const withRecipe = takeForToday(data(), DO, { title: "Bolo", recipeId: "b", category: null });
    if (withRecipe.ok) expect(withRecipe.weeks[WEEK].Donnerstag).toEqual({ kind: "recipe", recipeId: "b", title: "Bolo", category: "vegetarisch" });
  });

  it("bisheriges Gericht rutscht auf den nächsten freien Tag (ohne doppelt kochen)", () => {
    const r = takeForToday(data({ [WEEK]: { Donnerstag: text("Pizza", { double: true }), Freitag: text("Fisch") } }), DO, { title: "Suppe", category: null });
    expect(r.text).toBe("Übernommen ✓ Heute gibt’s Suppe. Pizza hab ich auf Samstag geschoben.");
    if (r.ok) expect(r.weeks[WEEK].Samstag).toEqual(text("Pizza"));
  });

  it("bis in die nächste Woche; sonst erst mal raus", () => {
    const voll = Object.fromEntries(["Donnerstag", "Freitag", "Samstag", "Sonntag"].map((d) => [d, text(d)]));
    const r = takeForToday(data({ [WEEK]: voll }), DO, { title: "Suppe", category: null });
    expect(r.text).toContain("Donnerstag hab ich auf Montag geschoben");
    if (r.ok) expect(r.weeks["2026-10-26"].Montag).toEqual(text("Donnerstag"));
    const next = Object.fromEntries(["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"].map((d) => [d, text(`N${d}`)]));
    const full = takeForToday(data({ [WEEK]: voll, "2026-10-26": next }), DO, { title: "Suppe", category: null });
    expect(full.text).toBe("Übernommen ✓ Heute gibt’s Suppe. Donnerstag ist erst mal raus – sag Bescheid, wenn’s woanders hin soll.");
  });

  it("gleiches Gericht oder spontan: nichts verschieben, spontan markiert", () => {
    expect(takeForToday(data({ [WEEK]: { Donnerstag: text("Suppe") } }), DO, { title: "suppe", category: null }).text).toBe("Übernommen ✓ Heute gibt’s suppe.");
    const sp = takeForToday(data({ [WEEK]: { Donnerstag: text("Pizza") } }), DO, { title: "Suppe", category: null }, { spontan: true });
    if (sp.ok) expect(sp.weeks[WEEK].Donnerstag).toEqual({ kind: "text", title: "Suppe", category: null, spontan: true });
  });

  it("Ausflugstag: heute bzw. an einem anderen Tag kein Kochtag", () => {
    const profile = familie();
    const weekPlans = { [WEEK]: { ...createWeekPlan(WEEK, profile.weekRules), awayDays: ["Donnerstag", "Freitag"] } };
    const d = { profile, weekPlans, mealPlans: {}, recipes: {} };
    expect(takeForToday(d, DO, { title: "Suppe", category: null })).toEqual({ ok: false, text: "Heute ist eigentlich kein Kochtag eingetragen – guten Appetit trotzdem! 😊" });
    expect(takeForDay(d, DO, { title: "Suppe", category: null }, "2026-10-23")).toEqual({ ok: false, text: "Freitag ist kein Kochtag eingetragen." });
    expect(takeForDay(d, DO, { title: "Suppe", category: null }, "2026-10-24").text).toBe("Übernommen ✓ Am Samstag gibt’s Suppe.");
    expect(takeForToday(d, DO, { title: "Suppe", category: null }, { spontan: true }).ok).toBe(true);
  });
});

describe("Im Supermarkt", () => {
  it("erkennt die Situation und das Produkt", () => {
    expect(isMarketSituation("Lachs ist im Angebot")).toBe(true);
    expect(isMarketSituation("Ich steh grad im Rewe, hier gibt's Spargel")).toBe(true);
    expect(isMarketSituation("Was gibt's heute?")).toBe(false);
    expect(marketProduct("Lachs ist im Angebot")).toBe("Lachs");
    expect(marketProduct("Ich steh grad im Rewe, hier gibt's Spargel")).toBe("Spargel");
    expect(marketProduct("Hähnchenbrüste sind reduziert")).toBe("Hähnchenbrust");
    expect(marketProduct("Brokoli im Angebot")).toBe("Brokkoli");
    expect(marketProduct("Was kann ich damit machen?")).toBeNull();
  });

  it("Kochbuch zuerst (bekannt vor neu), dann Vorlagen; „Nie wieder“ fällt raus", () => {
    const recipes = buch(
      rezept("Lachs-Nudeln", ["Lachs", "Nudeln", "Sahne", "Salz"], { id: "neu", source: "ki", prepMinutes: 15 }),
      rezept("Ofenlachs", ["Lachs", "Kartoffeln"], { id: "alt", known: true, prepMinutes: null }),
      rezept("Lachskuchen", ["Lachs"], { id: "back", kind: "backen" }),
    );
    const ideas = marketIdeas("Lachs", recipes, [vorrat("Kartoffeln", "schrank")], ["Sahne"], []);
    expect(ideas.map((i) => i.title)).toEqual(["Ofenlachs", "Lachs-Nudeln", "Lachs aus dem Ofen mit Kartoffeln"]);
    expect(ideas[0]).toMatchObject({ minutes: 30, recipeId: "alt", needs: [] });
    expect(ideas[1].needs).toEqual(["Nudeln"]);
    expect(ideas[2]).toMatchObject({ category: "fisch", needs: ["Zitrone"] });
    const ohne = marketIdeas("Lachs", {}, [], [], [{ id: "x", title: "Nudeln mit Lachs und Sahne", ingredients: [], reason: "", addedAt: "" }]);
    expect(ohne.map((i) => i.title)).toEqual(["Lachs aus dem Ofen mit Kartoffeln", "Lachs-Bowl mit Reis"]);
  });

  it("Vorlagen je Produktart", () => {
    expect(marketIdeas("Spargel", {}, [], [], [])[0].title).toBe("Spargel mit Kartoffeln und Butter");
    expect(marketIdeas("Hähnchenbrust", {}, [], [], [])[1].title).toBe("Hähnchenbrust-Curry mit Reis");
    expect(marketIdeas("Hackfleisch", {}, [], [], [])[0]).toMatchObject({ title: "Nudeln mit Hackfleisch-Soße", category: "fleisch" });
    expect(marketIdeas("Brokkoli", {}, [], [], []).map((i) => i.title)).toEqual(["Brokkoli-Pfanne mit Reis", "Nudeln mit Brokkoli", "Ofen-Brokkoli mit Kartoffeln"]);
  });

  it("welcher Tag passt", () => {
    const week = composeWeek(WEEK, familie({ weekendStyle: "frei" }), {}, { [WEEK]: { Donnerstag: text("Pizza"), Freitag: text("Fisch") } }, {});
    expect(marketTargetDay(week, "2026-10-22", true)).toEqual({ date: "2026-10-22", weekday: "Donnerstag", replaces: "Pizza" });
    expect(marketTargetDay(week, "2026-10-22", false)).toEqual({ date: "2026-10-23", weekday: "Freitag", replaces: "Fisch" });
    const empty = composeWeek(WEEK, familie({ weekendStyle: "frei" }), {}, {}, {});
    expect(marketTargetDay(empty, "2026-10-22", false)).toEqual({ date: "2026-10-23", weekday: "Freitag", replaces: null });
    expect(marketTargetDay(empty, "2026-10-23", false)).toBeNull();
  });
});

describe("Lieblingswochen", () => {
  it("speichern (ohne Wunsch/Ausflug), überschreiben bei gleichem Namen, laden, löschen", () => {
    const profile = familie();
    const weekPlans = { [WEEK]: { ...createWeekPlan(WEEK, profile.weekRules), awayDays: ["Dienstag"] } };
    const week = composeWeek(WEEK, profile, weekPlans, {
      [WEEK]: { Montag: { kind: "recipe", recipeId: "r", title: "Bolo", category: "fleisch" }, Dienstag: text("Weg"), Mittwoch: text("Suppe"), Donnerstag: { kind: "wish", kidId: "mathis", text: "Eis" } },
    }, {});
    expect(templateDays(week)).toEqual({
      Montag: { kind: "recipe", recipeId: "r", title: "Bolo", category: "fleisch" },
      Mittwoch: { kind: "text", title: "Suppe", category: null },
    });
    const t = saveTemplate("  ", week);
    expect(t.name).toBe("Lieblingswoche");
    saveTemplate("Lieblingswoche", week);
    const saved = JSON.parse(storage.getItem("wasgibts.vorlagen")!).templates;
    expect(saved).toHaveLength(1);
    applyTemplate({ "2026-10-26": { Montag: text("Alt"), Dienstag: text("Bleibt") } }, "2026-10-26", saved[0], ["Montag", "Mittwoch", "Freitag"]);
    expect(loadMealPlans()["2026-10-26"]).toEqual({
      Montag: { kind: "recipe", recipeId: "r", title: "Bolo", category: "fleisch" },
      Dienstag: text("Bleibt"),
      Mittwoch: { kind: "text", title: "Suppe", category: null },
    });
    deleteTemplate(saved[0].id);
    expect(JSON.parse(storage.getItem("wasgibts.vorlagen")!).templates).toEqual([]);
  });

  it("Migration verwirft Kaputtes", () => {
    storage.setItem("wasgibts.vorlagen", JSON.stringify({ version: 1, templates: [{ id: "a", name: "A", days: {} }, { id: "b", name: "B" }, null] }));
    deleteTemplate("x");
    expect(JSON.parse(storage.getItem("wasgibts.vorlagen")!).templates.map((t: { id: string }) => t.id)).toEqual(["a"]);
    storage.setItem("wasgibts.vorlagen", JSON.stringify({ version: 2, templates: [] }));
    deleteTemplate("x");
    expect(JSON.parse(storage.getItem("wasgibts.vorlagen")!).templates).toEqual([]);
  });
});

describe("Planung freischalten", () => {
  it("erkennt den Wunsch", () => {
    expect(isPlanUnlockRequest("Ich will doch mal planen")).toBe(true);
    expect(isPlanUnlockRequest("Können wir die Woche planen?")).toBe(true);
    expect(isPlanUnlockRequest("Wochenplan wieder an")).toBe(true);
    expect(isPlanUnlockRequest("Was gibt's heute?")).toBe(false);
  });

  it("nur diese Woche oder ab jetzt immer – mit Rückgängig", () => {
    const profile = familie({ planStyle: "spontan" });
    const week = unlockPlanning(profile, DO, { kind: "woche" });
    expect(week.text).toMatch(/diese Woche/);
    const saved = () => JSON.parse(storage.getItem("familienkueche.haushaltsprofil")!);
    expect(saved().planWeek).toBe(WEEK);
    expect(JSON.parse(storage.getItem("wasgibts.aktivitaet")!).asked[`planwoche:${WEEK}`]).toBe(true);
    week.undo();
    expect(saved().planWeek).toBeNull();
    const plan = unlockPlanning(profile, DO, { kind: "immer", style: "plan" });
    expect(plan.text).toBe("Gemacht ✓ Ab jetzt mit Wochenplan.");
    expect(saved().planStyle).toBe("plan");
    const mix = unlockPlanning(familie({ planStyle: "spontan", shoppingDay: "" }), DO, { kind: "immer", style: "mix" });
    expect(mix.text).toMatch(/mal so, mal so/);
    mix.undo();
    expect(saved().planStyle).toBe("spontan");
  });
});
