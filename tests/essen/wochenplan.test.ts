// Wochenplan: zusammengesetzte Woche, reine Änderungen, Speicher und Migration
import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import {
  clearSlot,
  composeWeek,
  entriesWithDouble,
  entriesWithMove,
  entriesWithoutSlot,
  loadMealPlans,
  mealPlansWithWeek,
  moveEntry,
  replaceMealPlans,
  setDouble,
  setEntry,
  setNote,
  slotKey,
  type DaySlot,
  type StoredEntry,
} from "@/lib/essen/mealPlan";
import { createWeekPlan, type WeekPlan } from "@/lib/essen/weekPlan";
import { buch, fakeWindow, familie, rezept } from "./hilfen";

const WEEK = "2026-10-19"; // Montag
const lasagne = rezept("Lasagne", ["Nudeln", "Hackfleisch"], { id: "las", category: "fleisch" });
const lachs = rezept("Lachs mit Reis", ["Lachs", "Reis"], { id: "lachs", category: "fisch" });
const recipes = buch(lasagne, lachs);

function vorgaben(change: Partial<WeekPlan> = {}): WeekPlan {
  return { ...createWeekPlan(WEEK, familie().weekRules), ...change };
}

let storage: Storage;
beforeEach(() => {
  at("2026-10-22T12:00");
  storage = fakeWindow();
});

describe("Woche zusammensetzen", () => {
  it("ohne Vorgaben: Standardwoche, Hinweise je Kategorie, Cheat Day am Samstag", () => {
    const week = composeWeek(WEEK, familie(), {}, {}, recipes);
    expect(week.days.map((d) => d.date)).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
    expect(week.hasPlanRules).toBe(false);
    expect(week.planned).toBe(0);
    expect(week.total).toBe(7);
    const hints = week.days.map((d) => d.slot.hint);
    expect(hints[5]).toBe("cheatday");
    expect(hints.filter((h) => h === "vegetarisch")).toHaveLength(3);
    expect(hints.filter((h) => h === "fleisch")).toHaveLength(2);
    expect(hints.filter((h) => h === "fisch")).toHaveLength(1);
    // Nie zweimal dieselbe Kategorie direkt hintereinander, solange es anders geht
    expect(hints[0]).not.toBe(hints[1]);
    // Sa/So locker, Essenszeit laut Profil, alle drei essen mit
    expect(week.days[6]).toMatchObject({ weekend: "locker", mealTime: "mittags", persons: 3 });
    expect(week.days[0]).toMatchObject({ weekend: null, mealTime: "abends" });
  });

  it("eigene Einträge, feste Gerichte, Wunsch, Ausflug, Notiz und Reste", () => {
    const plan = vorgaben({
      awayDays: ["Dienstag"],
      wish: { kidId: "mathis", text: "Pfannkuchen", weekday: "Freitag" },
      fixedMeals: [{ id: "f", weekday: "Mittwoch", recipeId: "lachs", title: "Lachs alt", category: "fisch" }],
    });
    const stored: Record<string, StoredEntry> = {
      Montag: { kind: "recipe", recipeId: "las", title: "Lasagne (alt)", category: "fleisch", double: true },
      "Montag:notiz": { kind: "note", text: "Mittags: Suppe" },
      Donnerstag: { kind: "text", title: "Pizza", category: null, persons: 2 },
      Samstag: { kind: "wish", kidId: "mathis", text: "" },
      Sonntag: { kind: "cleared" },
    };
    const week = composeWeek(WEEK, familie(), { [WEEK]: plan }, { [WEEK]: stored }, recipes);
    const [mo, di, mi, doo, fr, sa, so] = week.days;
    expect(mo.slot.entry).toMatchObject({ origin: "eigen", title: "Lasagne", category: "fleisch", double: true, recipeId: "las" });
    expect(mo.note).toBe("Mittags: Suppe");
    expect(di).toMatchObject({ away: true, leftovers: "Lasagne" });
    expect(mi.slot.entry).toMatchObject({ origin: "fest", title: "Lachs mit Reis", category: "fisch" });
    expect(mi.slot.hasDerived).toBe(true);
    expect(doo.slot.entry).toMatchObject({ title: "Pizza", category: null });
    expect(doo.persons).toBe(2);
    expect(fr.slot.entry).toMatchObject({ origin: "wunsch", title: "Pfannkuchen", kidName: "Mathis" });
    expect(sa.slot.entry).toMatchObject({ origin: "eigen", title: "Wunsch kommt noch", kidName: "Mathis" });
    expect(so.slot.entry).toBeNull();
    expect(week.hasPlanRules).toBe(true);
    expect(week.total).toBe(6);
    expect(week.planned).toBe(5);
    expect(week.counts.fleisch.planned).toBe(1);
    expect(week.counts.fisch.planned).toBe(1);
  });

  it("Wunsch auf einem Ausflugstag gilt nicht; unbekanntes Kind heißt „Kind“", () => {
    const plan = vorgaben({ awayDays: ["Freitag"], wish: { kidId: "x", text: "", weekday: "Freitag" } });
    const week = composeWeek(WEEK, familie(), { [WEEK]: plan }, {}, recipes);
    expect(week.days[4].slot.entry).toBeNull();
    const plan2 = vorgaben({ wish: { kidId: "x", text: " ", weekday: "Freitag" } });
    const week2 = composeWeek(WEEK, familie(), { [WEEK]: plan2 }, {}, recipes);
    expect(week2.days[4].slot.entry).toMatchObject({ title: "Wunsch kommt noch", kidName: "Kind" });
  });

  it("Reste vom letzten Tag der Vorwoche landen am ersten Tag", () => {
    const prev = { Sonntag: { kind: "text", title: "Chili", category: null, double: true } as StoredEntry };
    const week = composeWeek(WEEK, familie(), {}, { "2026-10-12": prev }, recipes);
    expect(week.days[0].leftovers).toBe("Chili");
  });

  it("Pause und freies Wochenende zählen nicht mit", () => {
    const profile = familie({ pause: { from: "2026-10-19", until: "2026-10-20" }, weekendStyle: "frei" });
    const week = composeWeek(WEEK, profile, {}, { [WEEK]: { Samstag: { kind: "text", title: "Grillen", category: null } } }, recipes);
    expect(week.days[0]).toMatchObject({ paused: true, away: true });
    expect(week.days[6]).toMatchObject({ weekend: "frei" });
    expect(week.days[6].slot.hint).toBeNull();
    // Mo, Di pausiert; So frei ohne Eintrag → 4 Tage zählen
    expect(week.total).toBe(4);
    expect(week.planned).toBe(1);
  });

  it("ohne Profil: abends, keine Personenzahl, keine Hinweise", () => {
    const week = composeWeek(WEEK, null, {}, {}, {});
    expect(week.days[0]).toMatchObject({ mealTime: "abends", persons: null, weekend: null });
    expect(week.days[6].weekend).toBe("locker");
    expect(week.days.every((d) => d.slot.hint === null)).toBe(true);
  });

  it("Planungswoche ab Donnerstag; Einträge einer überlappenden alten Woche bleiben", () => {
    const week = composeWeek("2026-10-22", familie({ shoppingDay: "Donnerstag" }), {}, { [WEEK]: { Freitag: { kind: "text", title: "Fisch", category: "fisch" } } }, {});
    expect(week.days[0].weekday).toBe("Donnerstag");
    expect(week.days[1].slot.entry?.title).toBe("Fisch");
  });
});

describe("Reine Änderungen", () => {
  const slot = (key: string, entry: StoredEntry | null, hasDerived = false): DaySlot => ({
    key,
    hint: null,
    hasDerived,
    entry: entry && entry.kind !== "cleared" && entry.kind !== "note" ? { origin: "eigen", stored: entry, title: "x", category: null, double: false } : null,
  });
  const pizza: StoredEntry = { kind: "text", title: "Pizza", category: null };
  const suppe: StoredEntry = { kind: "text", title: "Suppe", category: null, double: true };

  it("leeren: eigene löschen, abgeleitete überschreiben", () => {
    expect(entriesWithoutSlot({ Montag: pizza }, slot("Montag", pizza))).toEqual({});
    expect(entriesWithoutSlot({}, slot("Montag", pizza, true))).toEqual({ Montag: { kind: "cleared" } });
  });

  it("verschieben und tauschen", () => {
    expect(entriesWithMove({ Montag: pizza }, slot("Montag", pizza), slot("Dienstag", null))).toEqual({ Dienstag: pizza });
    expect(entriesWithMove({ Montag: pizza, Dienstag: suppe }, slot("Montag", pizza), slot("Dienstag", suppe))).toEqual({ Montag: suppe, Dienstag: pizza });
    expect(entriesWithMove({}, slot("Montag", pizza, true), slot("Dienstag", null))).toEqual({ Montag: { kind: "cleared" }, Dienstag: pizza });
    const same = { Montag: pizza };
    expect(entriesWithMove(same, slot("Montag", pizza), slot("Montag", pizza))).toBe(same);
    expect(entriesWithMove(same, slot("Montag", null), slot("Dienstag", null))).toBe(same);
  });

  it("doppelt kochen an und aus", () => {
    expect(entriesWithDouble({}, slot("Montag", pizza), true)).toEqual({ Montag: { ...pizza, double: true } });
    expect(entriesWithDouble({ Montag: suppe }, slot("Montag", suppe), false)).toEqual({ Montag: { kind: "text", title: "Suppe", category: null } });
    const none = {};
    expect(entriesWithDouble(none, slot("Montag", null), true)).toBe(none);
  });

  it("neue Woche übernimmt überlappende Einträge", () => {
    const weeks = mealPlansWithWeek({ [WEEK]: { Freitag: pizza } }, "2026-10-22", (e) => ({ ...e, Samstag: suppe }));
    expect(weeks["2026-10-22"]).toEqual({ Freitag: pizza, Samstag: suppe });
    expect(slotKey("Montag")).toBe("Montag");
  });
});

describe("Speichern", () => {
  it("setzen, verschieben, doppelt, Notiz, leeren – und merkt sich eigenes Tun", () => {
    setEntry(WEEK, "Montag", { kind: "text", title: "Pizza", category: null });
    setNote(WEEK, "Montag", "  Teig vorbereiten ");
    let week = composeWeek(WEEK, familie(), {}, loadMealPlans(), {});
    expect(week.days[0].note).toBe("Teig vorbereiten");
    moveEntry(WEEK, week.days[0].slot, week.days[2].slot);
    week = composeWeek(WEEK, familie(), {}, loadMealPlans(), {});
    expect(week.days[2].slot.entry?.title).toBe("Pizza");
    setDouble(WEEK, week.days[2].slot, true);
    week = composeWeek(WEEK, familie(), {}, loadMealPlans(), {});
    expect(week.days[3].leftovers).toBe("Pizza");
    clearSlot(WEEK, week.days[2].slot);
    setNote(WEEK, "Montag", " ");
    expect(loadMealPlans()[WEEK]).toEqual({});
    expect(JSON.parse(storage.getItem("wasgibts.aktivitaet")!).lastAction).toBe("2026-10-22");
    replaceMealPlans({});
    expect(loadMealPlans()).toEqual({});
  });

  it("Migration v1: zwei Plätze je Tag → Hauptgericht + Notiz, Kategorie aus dem Gericht", () => {
    storage.setItem(
      "wasgibts.wochenplan",
      JSON.stringify({
        version: 1,
        weeks: {
          [WEEK]: {
            "Montag|abends": { kind: "text", title: "Milchreis", category: "fisch" },
            "Montag|mittags": { kind: "recipe", recipeId: "las", title: "Lasagne", category: "unsinn" },
            "Dienstag|mittags": { kind: "text", title: "Lachsnudeln", category: null, double: true, spontan: true, persons: 2.4 },
            "Mittwoch|abends": { kind: "wish", kidId: "mathis" },
            "Mittwoch|mittags": { kind: "wish", kidId: "mathis", text: "" },
            "Donnerstag|abends": { kind: "cleared" },
            "Freitag|abends": { kind: "unbekannt" },
            "Samstag|abends": { kind: "note", text: 3 },
            "Sonntag|abends": { kind: "recipe" },
            kaputt: null,
          },
          "2026-10-26": null,
        },
      }),
    );
    const weeks = loadMealPlans();
    expect(weeks[WEEK]).toEqual({
      Montag: { kind: "text", title: "Milchreis", category: null },
      "Montag:notiz": { kind: "note", text: "Mittags: Lasagne" },
      Dienstag: { kind: "text", title: "Lachsnudeln", category: "fisch", double: true, spontan: true, persons: 2 },
      Mittwoch: { kind: "wish", kidId: "mathis", text: "" },
      "Mittwoch:notiz": { kind: "note", text: "Mittags: Wunsch" },
      Donnerstag: { kind: "cleared" },
    });
    // Migrierter Stand wird einmal zurückgeschrieben
    expect(JSON.parse(storage.getItem("wasgibts.wochenplan")!).version).toBe(3);
  });

  it("Migration v2 behält die Kategorie; v3 bleibt unverändert; Unsinn wird ignoriert", () => {
    storage.setItem("wasgibts.wochenplan", JSON.stringify({ version: 2, weeks: { [WEEK]: { "Montag|abends": { kind: "text", title: "Milchreis", category: "vegetarisch" } } } }));
    expect(loadMealPlans()[WEEK]).toEqual({ Montag: { kind: "text", title: "Milchreis", category: "vegetarisch" } });
    storage.setItem("wasgibts.wochenplan", JSON.stringify({ version: 3, weeks: { [WEEK]: { Montag: { kind: "recipe", recipeId: "x", title: "X", category: "fisch" } } } }));
    expect(loadMealPlans()[WEEK].Montag).toMatchObject({ category: "fisch" });
    storage.setItem("wasgibts.wochenplan", JSON.stringify({ version: 9, weeks: {} }));
    expect(loadMealPlans()).toEqual({});
    storage.setItem("wasgibts.wochenplan", "null");
    expect(loadMealPlans()).toEqual({});
  });

  it("Migration mit Profil: mittags warm → das Mittagsgericht ist das Hauptgericht", () => {
    storage.setItem("familienkueche.haushaltsprofil", JSON.stringify(familie({ warmMeal: { weekday: "mittags", weekend: "mittags" } })));
    storage.setItem(
      "wasgibts.wochenplan",
      JSON.stringify({ version: 2, weeks: { [WEEK]: { "Montag|abends": { kind: "text", title: "Brot", category: null }, "Montag|mittags": { kind: "text", title: "Suppe", category: null } } } }),
    );
    expect(loadMealPlans()[WEEK]).toEqual({
      Montag: { kind: "text", title: "Suppe", category: null },
      "Montag:notiz": { kind: "note", text: "Abends: Brot" },
    });
  });
});
