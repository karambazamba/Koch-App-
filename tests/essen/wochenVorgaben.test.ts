// Wochen-Vorgaben (Wochen-Check): Planungswoche, Wunschtag reihum, Speicher und Migration
import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import {
  availableDays,
  createWeekPlan,
  fixedMealCounts,
  formatWeekRange,
  isWeekStartIso,
  loadWeekPlans,
  nextWeekStartFor,
  nextWishKid,
  planForWeek,
  planningWeekStart,
  replaceWeekPlans,
  resolveWeekKey,
  saveWeekPlan,
  weekDayNames,
  weekStartFor,
  weekdayName,
  wishIsActive,
  wishKidForWeek,
  type WeekPlan,
} from "@/lib/essen/weekPlan";
import { fakeWindow, familie } from "./hilfen";

const DO = new Date(2026, 9, 22, 12); // Donnerstag
let storage: Storage;

beforeEach(() => {
  at("2026-10-22T12:00");
  storage = fakeWindow();
});

const plan = (weekStart: string, change: Partial<WeekPlan> = {}): WeekPlan => ({ ...createWeekPlan(weekStart, familie().weekRules), ...change });

describe("Planungswoche", () => {
  it("beginnt am Einkaufstag", () => {
    expect(weekdayName(DO)).toBe("Donnerstag");
    expect(weekStartFor(DO, "Montag")).toBe("2026-10-19");
    expect(weekStartFor(DO, "Donnerstag")).toBe("2026-10-22");
    expect(weekStartFor(DO, "Freitag")).toBe("2026-10-16");
    // Unbekannter Tag = Montag
    expect(weekStartFor(DO, "Quatsch")).toBe("2026-10-19");
    expect(nextWeekStartFor(DO, "Montag")).toBe("2026-10-26");
  });

  it("ab 2 Tage vor dem nächsten Einkaufstag ist die nächste Woche dran", () => {
    expect(planningWeekStart(DO, "Montag")).toEqual({ weekStart: "2026-10-19", isNext: false });
    expect(planningWeekStart(new Date(2026, 9, 24, 12), "Montag")).toEqual({ weekStart: "2026-10-26", isNext: true });
  });

  it("gültiger Wochenbeginn", () => {
    expect(isWeekStartIso("2026-10-19", "Montag")).toBe(true);
    expect(isWeekStartIso("2026-10-20", "Montag")).toBe(false);
    expect(isWeekStartIso("2026-02-30", "Montag")).toBe(false);
    expect(isWeekStartIso("gestern", "Montag")).toBe(false);
    expect(isWeekStartIso(null, "Montag")).toBe(false);
  });

  it("Wochentage, Zeitraum und überlappende alte Woche", () => {
    expect(weekDayNames("2026-10-22")).toEqual(["Donnerstag", "Freitag", "Samstag", "Sonntag", "Montag", "Dienstag", "Mittwoch"]);
    expect(formatWeekRange("2026-10-19")).toBe("19.10. – 25.10.");
    expect(resolveWeekKey(["2026-10-19"], "2026-10-19")).toBe("2026-10-19");
    expect(resolveWeekKey(["2026-10-12", "2026-10-19"], "2026-10-22")).toBe("2026-10-19");
    expect(resolveWeekKey(["2026-10-12"], "2026-10-22")).toBeUndefined();
  });
});

describe("Vorgaben", () => {
  it("feste Gerichte zählen in ihre Kategorie, Cheat Day nicht", () => {
    const p = plan("2026-10-19", {
      fixedMeals: [
        { id: "1", weekday: "Montag", recipeId: "a", title: "A", category: "fleisch" },
        { id: "2", weekday: "Dienstag", recipeId: "b", title: "B", category: "fisch" },
        { id: "3", weekday: "Mittwoch", recipeId: "c", title: "C", category: "cheatday" },
      ],
    });
    expect(fixedMealCounts(p)).toEqual({ meatDays: 1, vegetarianDays: 0, fishDays: 1 });
  });

  it("Wunschtag zählt nur, wenn er nicht auf einem Ausflugstag liegt", () => {
    const wish = { kidId: "mathis", text: "", weekday: "Freitag" };
    expect(wishIsActive({ awayDays: [], wish })).toBe(true);
    expect(wishIsActive({ awayDays: ["Freitag"], wish })).toBe(false);
    expect(wishIsActive({ awayDays: [], wish: null })).toBe(false);
    expect(availableDays({ awayDays: ["Montag"], wish })).toBe(5);
    expect(availableDays({ awayDays: ["Freitag"], wish })).toBe(6);
  });

  it("Wunsch reihum nach dem Kind, das zuletzt dran war; zu Junge werden übersprungen", () => {
    const base = familie();
    const profile = familie({
      persons: [
        ...base.persons,
        { ...base.persons[2], id: "ella", name: "Ella", age: 6 },
        { ...base.persons[2], id: "baby", name: "Baby", age: 1 },
      ],
      wishDay: { enabled: true, weekday: "Freitag", minAge: 4, order: ["ella", "mathis", "baby"] },
    });
    expect(nextWishKid(profile, null)).toBe("ella");
    expect(nextWishKid(profile, "ella")).toBe("mathis");
    expect(nextWishKid(profile, "mathis")).toBe("ella");
    const weeks = {
      "2026-10-05": plan("2026-10-05", { wish: { kidId: "ella", text: "", weekday: "Freitag" } }),
      "2026-10-12": plan("2026-10-12", { wish: { kidId: "mathis", text: "", weekday: "Freitag" } }),
      "2026-10-26": plan("2026-10-26", { wish: { kidId: "mathis", text: "", weekday: "Freitag" } }),
    };
    expect(wishKidForWeek(profile, weeks, "2026-10-19")).toBe("ella");
    expect(wishKidForWeek(profile, {}, "2026-10-19")).toBe("ella");
    // Ohne Kinder im passenden Alter niemand
    expect(nextWishKid(familie({ persons: base.persons.slice(0, 2) }), null)).toBeNull();
  });
});

describe("Speicher", () => {
  it("speichern, laden, Woche finden und ersetzen", () => {
    saveWeekPlan(plan("2026-10-19", { budgetEuro: 80 }));
    const weeks = loadWeekPlans();
    expect(weeks["2026-10-19"]).toMatchObject({ budgetEuro: 80, updatedAt: "2026-10-22T10:00:00.000Z" });
    expect(planForWeek(weeks, "2026-10-22")).toMatchObject({ weekStart: "2026-10-22", budgetEuro: 80 });
    expect(planForWeek(weeks, "2026-11-02")).toBeNull();
    replaceWeekPlans({});
    expect(loadWeekPlans()).toEqual({});
  });

  it("Migration v3: ein festes Gericht pro Tag (Hauptmahlzeit), Wunsch ohne Mahlzeit, Unsinn raus", () => {
    storage.setItem("familienkueche.haushaltsprofil", JSON.stringify(familie()));
    storage.setItem(
      "wasgibts.wochenvorgaben",
      JSON.stringify({
        version: 3,
        weeks: {
          "2026-10-19": {
            meatDays: 2,
            cheatDay: true,
            cheatDayWeekday: "Samstag",
            awayDays: ["Montag", "Feiertag"],
            budgetEuro: 50,
            wishes: "mehr Gemüse",
            wish: { kidId: "mathis", text: 7, weekday: "Blubbtag", meal: "abends" },
            fixedMeals: [
              { id: "m", weekday: "Dienstag", recipeId: "r1", title: "Mittags", category: "fisch", meal: "mittags" },
              { id: "a", weekday: "Dienstag", recipeId: "r2", title: "Abends", category: "fleisch", meal: "abends" },
              { id: "s", weekday: "Samstag", recipeId: "r3", title: "Sa", category: "vegetarisch", meal: "abends" },
              { id: "x", weekday: "Mittwoch", recipeId: "r4", title: "Kaputt", category: "suppe" },
              null,
            ],
            updatedAt: "2026-10-18",
          },
          "2026-10-26": { wish: { text: "ohne Kind" } },
          leer: null,
        },
      }),
    );
    const weeks = loadWeekPlans();
    expect(weeks["2026-10-19"]).toEqual({
      weekStart: "2026-10-19",
      meatDays: 2,
      vegetarianDays: 0,
      fishDays: 0,
      cheatDay: true,
      cheatDayWeekday: "Samstag",
      awayDays: ["Montag"],
      budgetEuro: 50,
      wishes: "mehr Gemüse",
      wish: { kidId: "mathis", text: "", weekday: "Freitag" },
      fixedMeals: [
        { id: "a", weekday: "Dienstag", recipeId: "r2", title: "Abends", category: "fleisch" },
        { id: "s", weekday: "Samstag", recipeId: "r3", title: "Sa", category: "vegetarisch" },
      ],
      updatedAt: "2026-10-18",
    });
    expect(weeks["2026-10-26"]).toMatchObject({ wish: null, fixedMeals: [], cheatDay: false, cheatDayWeekday: "", budgetEuro: null });
    expect(weeks.leer).toBeUndefined();
  });

  it("unbekannte Version oder kaputte Daten → leer", () => {
    storage.setItem("wasgibts.wochenvorgaben", JSON.stringify({ version: 7, weeks: {} }));
    expect(loadWeekPlans()).toEqual({});
    storage.setItem("wasgibts.wochenvorgaben", "{kaputt");
    expect(loadWeekPlans()).toEqual({});
    storage.setItem("wasgibts.wochenvorgaben", "5");
    expect(loadWeekPlans()).toEqual({});
  });
});
