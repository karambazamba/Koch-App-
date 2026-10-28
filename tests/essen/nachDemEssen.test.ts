// Nach dem Essen: als gekocht zählen, Vorrat verbrauchen, zurücknehmen, auf morgen verschieben; Kochsitzung
import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { cookableEntry, markCooked, mealIsOver, mealOverOn, moveToTomorrow, unmarkCooked, usedRecently } from "@/lib/essen/mealDone";
import { composeWeek, type StoredEntry } from "@/lib/essen/mealPlan";
import { replaceRecipes } from "@/lib/essen/cookbook";
import { loadPantry, replacePantry } from "@/lib/vorrat/pantry";
import { currentStep, loadCooking, nextStep, startCooking, stepMinutes, stepTimerName, stopCooking, toggleStep } from "@/lib/essen/kochSession";
import { buch, fakeWindow, familie, rezept, vorrat } from "./hilfen";

const WEEK = "2026-10-19";
let storage: Storage;
const cooked = () => JSON.parse(storage.getItem("wasgibts.gekocht") ?? "{}").days ?? {};
const kochbuch = () => JSON.parse(storage.getItem("wasgibts.kochbuch")!).recipes;

beforeEach(() => {
  at("2026-10-22T20:00");
  storage = fakeWindow();
});

describe("Ist das Essen vorbei?", () => {
  const profile = familie();
  it("ab Essenszeit + 90 Minuten oder wenn schon gekocht", () => {
    const week = composeWeek(WEEK, profile, {}, {}, {});
    const thu = week.days[3];
    expect(mealIsOver(thu, profile, 18 * 60 + 30 + 89, {})).toBe(false);
    expect(mealIsOver(thu, profile, 20 * 60, {})).toBe(true);
    expect(mealIsOver(undefined, profile, 23 * 60, {})).toBe(false);
    // Samstag mittags warm (12:30)
    expect(mealOverOn("2026-10-24", "Samstag", profile, 14 * 60, {})).toBe(true);
    expect(mealOverOn("2026-10-22", "Donnerstag", profile, 8 * 60, { "2026-10-22": { title: "x" } as never })).toBe(true);
  });

  it("kochbar nur mit Gericht und ohne Ausflug/Pause", () => {
    const week = composeWeek(WEEK, profile, {}, { [WEEK]: { Donnerstag: { kind: "text", title: "Pizza", category: null } } }, {});
    expect(cookableEntry(week.days[3])?.title).toBe("Pizza");
    expect(cookableEntry(week.days[0])).toBeNull();
    expect(cookableEntry({ ...week.days[3], away: true })).toBeNull();
    expect(cookableEntry(undefined)).toBeNull();
  });
});

describe("Als gekocht vermerken", () => {
  it("zählt das Rezept, nimmt die Zutaten aus „Im Haus“ (alle Orte) und nimmt alles zurück", () => {
    const r = rezept("Hack-Nudeln", ["Hackfleisch", "Nudeln", "Salz", "Paprika"], { id: "hn", cookedCount: 1, lastCookedAt: "2026-10-01T12:00:00.000Z" });
    replaceRecipes(buch(r));
    replacePantry([vorrat("Hackfleisch"), vorrat("Nudeln", "schrank"), vorrat("Paprika", "tiefkuehler"), vorrat("Milch")]);
    markCooked("2026-10-22", { title: r.title, recipeId: "hn" }, buch(r));
    expect(kochbuch().hn).toMatchObject({ cookedCount: 2, lastCookedAt: "2026-10-22T12:00:00.000Z" });
    expect(loadPantry().map((p) => p.name)).toEqual(["Milch"]);
    const day = cooked()["2026-10-22"];
    expect(day).toMatchObject({ title: "Hack-Nudeln", recipeId: "hn", how: "auto", counted: true, lastCookedBefore: "2026-10-01T12:00:00.000Z" });
    expect(day.used).toEqual(["Hackfleisch", "Nudeln", "Paprika"]);
    expect(usedRecently(cooked(), "2026-10-22")).toEqual(["Hackfleisch", "Nudeln", "Paprika"]);
    expect(usedRecently(cooked(), "2026-11-05")).toEqual([]);

    // Zweites Mal am selben Tag: nur „marked“ setzen, nicht doppelt zählen
    markCooked("2026-10-22", { title: r.title, recipeId: "hn" }, buch(r), { how: "marked" });
    expect(cooked()["2026-10-22"].how).toBe("marked");
    expect(kochbuch().hn.cookedCount).toBe(2);
    markCooked("2026-10-22", { title: r.title, recipeId: "hn" }, buch(r), { how: "marked" });

    unmarkCooked("2026-10-22");
    expect(kochbuch().hn).toMatchObject({ cookedCount: 1, lastCookedAt: "2026-10-01T12:00:00.000Z" });
    expect(loadPantry().map((p) => p.name).sort()).toEqual(["Hackfleisch", "Milch", "Nudeln", "Paprika"]);
    expect(cooked()["2026-10-22"]).toBeUndefined();
    unmarkCooked("2026-10-22");
  });

  it("schon am Tag gezählt bzw. „alreadyCounted“ → nicht doppelt", () => {
    const r = rezept("Suppe", ["Kartoffeln"], { id: "s", cookedCount: 3, lastCookedAt: "2026-10-22T12:00:00.000Z" });
    replaceRecipes(buch(r));
    markCooked("2026-10-22", { title: "Suppe", recipeId: "s" }, buch(r));
    expect(cooked()["2026-10-22"].counted).toBe(false);
    expect(kochbuch().s.cookedCount).toBe(3);
    markCooked("2026-10-21", { title: "Suppe", recipeId: "s" }, buch(r), { alreadyCounted: true, how: "marked" });
    expect(cooked()["2026-10-21"]).toMatchObject({ counted: false, how: "marked" });
  });

  it("Klassiker ohne Rezept: Zutaten aus der Gerichte-Liste; alte Tage (> 60) fallen weg", () => {
    replacePantry([vorrat("Eier"), vorrat("Brot")]);
    storage.setItem("wasgibts.gekocht", JSON.stringify({ version: 1, days: { "2026-07-01": { title: "Alt", used: [] } } }));
    markCooked("2026-10-22", { title: "Rührei mit Brot" }, {});
    expect(loadPantry()).toEqual([]);
    expect(Object.keys(cooked())).toEqual(["2026-10-22"]);
    markCooked("2026-10-20", { title: "Unbekannt" }, {});
    expect(cooked()["2026-10-20"].used).toEqual([]);
  });

  it("Migration räumt Kaputtes auf", () => {
    storage.setItem(
      "wasgibts.gekocht",
      JSON.stringify({
        version: 1,
        days: {
          "2026-10-21": { title: "Pizza", recipeId: 5, how: "marked", counted: true, lastCookedBefore: "x", removed: [{ id: "a", name: "Käse" }, { name: "ohne id" }], used: ["Käse", 3], leftovers: "tiefkuehler" },
          "2026-10-20": { title: "Suppe", removed: "nein", leftovers: "vielleicht" },
          "kein-datum": { title: "x" },
          "2026-10-19": { title: 4 },
        },
      }),
    );
    replacePantry([]);
    markCooked("2026-10-22", { title: "Neu" }, {});
    const days = cooked();
    expect(Object.keys(days).sort()).toEqual(["2026-10-20", "2026-10-21", "2026-10-22"]);
    expect(days["2026-10-21"]).toMatchObject({ how: "marked", counted: true, lastCookedBefore: "x", used: ["Käse"], leftovers: "tiefkuehler" });
    expect(days["2026-10-21"].removed).toHaveLength(1);
    expect(days["2026-10-20"]).toMatchObject({ how: "auto", removed: [], lastCookedBefore: null });
    expect(days["2026-10-20"].leftovers).toBeUndefined();
    storage.setItem("wasgibts.gekocht", JSON.stringify({ version: 2, days: {} }));
    markCooked("2026-10-22", { title: "Neu" }, {});
    expect(Object.keys(cooked())).toEqual(["2026-10-22"]);
  });
});

describe("Doch nicht gekocht – auf morgen", () => {
  const profile = familie();
  const data = (mealPlans: Record<string, Record<string, StoredEntry>>) => ({ profile, weekPlans: {}, mealPlans, recipes: {} });
  const text = (title: string, extra: object = {}): StoredEntry => ({ kind: "text", title, category: null, ...extra });

  it("morgen frei → Gericht wandert auf morgen, doppelt kochen fällt weg", () => {
    const r = moveToTomorrow(data({ [WEEK]: { Donnerstag: text("Pizza", { double: true }) } }), "2026-10-22")!;
    expect(r.text).toBe("Alles klar ✓ Pizza gibt’s morgen.");
    expect(r.weeks[WEEK]).toEqual({ Freitag: text("Pizza") });
  });

  it("morgen belegt → das bisherige rutscht auf den nächsten freien Tag", () => {
    const r = moveToTomorrow(data({ [WEEK]: { Donnerstag: text("Pizza"), Freitag: text("Fisch"), Samstag: text("Grillen") } }), "2026-10-22")!;
    expect(r.text).toBe("Alles klar ✓ Pizza gibt’s morgen, Fisch rutscht auf Sonntag.");
    expect(r.weeks[WEEK]).toMatchObject({ Freitag: text("Pizza"), Samstag: text("Grillen"), Sonntag: text("Fisch") });
  });

  it("über das Wochenende in die nächste Woche", () => {
    const r = moveToTomorrow(data({ [WEEK]: { Samstag: text("Pizza"), Sonntag: text("Braten") } }), "2026-10-24")!;
    expect(r.text).toContain("Braten rutscht auf Montag");
    expect(r.weeks["2026-10-26"]).toEqual({ Montag: text("Braten") });
  });

  it("kein freier Tag → erst mal raus; ohne Gericht → nichts", () => {
    const voll: Record<string, StoredEntry> = {};
    for (const d of ["Donnerstag", "Freitag", "Samstag", "Sonntag"]) voll[d] = text(d);
    const next: Record<string, StoredEntry> = {};
    for (const d of ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]) next[d] = text(`N${d}`);
    const r = moveToTomorrow(data({ [WEEK]: voll, "2026-10-26": next }), "2026-10-22")!;
    expect(r.text).toBe("Alles klar ✓ Donnerstag gibt’s morgen. Freitag ist erst mal raus.");
    expect(moveToTomorrow(data({}), "2026-10-22")).toBeNull();
  });
});

describe("Kochsitzung", () => {
  it("starten, Schritte abhaken, nächster Schritt, stoppen – alles mit Zurücknehmen", () => {
    expect(loadCooking()).toEqual({ date: "2026-10-22", manualAt: null, steps: {}, at: {}, zutaten: {} });
    const undoStart = startCooking();
    expect(loadCooking().manualAt).toBe(new Date("2026-10-22T20:00:00+02:00").getTime());
    const undoToggle = toggleStep("r", 1);
    expect(loadCooking().steps.r).toEqual([1]);
    toggleStep("r", 0);
    expect(loadCooking().steps.r).toEqual([0, 1]);
    toggleStep("r", 0);
    expect(currentStep(3, loadCooking().steps.r)).toBe(0);
    const step = nextStep("r", 3);
    expect(step).toMatchObject({ done: 0, next: 2 });
    step.undo();
    expect(loadCooking().steps.r).toEqual([1]);
    nextStep("r", 2);
    expect(nextStep("r", 2)).toMatchObject({ done: null, next: null });
    undoToggle();
    expect(loadCooking().steps.r).toBeUndefined();
    const undoStop = stopCooking();
    expect(loadCooking().manualAt).toBeNull();
    undoStop();
    expect(loadCooking().manualAt).not.toBeNull();
    undoStart();
    expect(loadCooking().manualAt).toBeNull();
    expect(currentStep(2, [0, 1])).toBeNull();
  });

  it("von gestern Gebliebenes zählt nicht; Kaputtes wird bereinigt", () => {
    storage.setItem("wasgibts.kochen", JSON.stringify({ version: 1, date: "2026-10-21", manualAt: 5, steps: { r: [1] } }));
    expect(loadCooking()).toEqual({ date: "2026-10-22", manualAt: null, steps: {}, at: {}, zutaten: {} });
    // v1 → v2: Schritte bleiben, Kochmodus-Stand und Zutaten kommen leer dazu
    storage.setItem("wasgibts.kochen", JSON.stringify({ version: 1, date: "2026-10-22", manualAt: "x", steps: { r: [1, -1, 1.5, "a"], s: "kaputt" } }));
    expect(loadCooking()).toEqual({ date: "2026-10-22", manualAt: null, steps: { r: [1] }, at: {}, zutaten: {} });
    storage.setItem("wasgibts.kochen", JSON.stringify({ version: 2, date: "2026-10-22", at: { r: 3, s: -1, t: "x" }, zutaten: { r: ["a", 1], s: "x" } }));
    expect(loadCooking()).toMatchObject({ steps: {}, at: { r: 3 }, zutaten: { r: ["a"] } });
    storage.setItem("wasgibts.kochen", JSON.stringify({ version: 3 }));
    expect(loadCooking().steps).toEqual({});
  });

  it("Zeiten in Schritten und Timer-Namen", () => {
    expect(stepMinutes("10 Minuten köcheln")).toBe(10);
    expect(stepMinutes("8–10 Min garen")).toBe(10);
    expect(stepMinutes("8 bis 12 Minuten backen")).toBe(12);
    expect(stepMinutes("1 Stunde ruhen lassen")).toBe(60);
    expect(stepMinutes("1,5 Std. gehen lassen")).toBe(90);
    expect(stepMinutes("zwanzig Minuten ziehen lassen")).toBe(20);
    expect(stepMinutes("etliche Minuten warten")).toBeNull();
    expect(stepMinutes("Alles verrühren")).toBeNull();
    expect(stepMinutes("0 Minuten")).toBeNull();
    expect(stepTimerName("Nudeln 10 Minuten kochen.")).toBe("Nudeln kochen");
    expect(stepTimerName("Die Soße (mit Sahne) bei kleiner Hitze sehr lange einkochen lassen, dann")).toBe("Die Soße bei kleiner Hitze…");
    expect(stepTimerName("10 Minuten")).toBe("Schritt");
  });
});
