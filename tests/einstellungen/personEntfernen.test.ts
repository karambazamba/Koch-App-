// Person entfernen: Profil, Wunschtag, Wünsche in Wochen-Vorgaben und Plan –
// mit Rückgängig. Die letzte Person bleibt.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { removePerson } from "@/lib/einstellungen/removePerson";
import { createEmptyProfile, createPerson, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { loadProfile, saveProfile } from "@/lib/einstellungen/profileStore";
import { loadWeekPlans, replaceWeekPlans, type WeekPlan } from "@/lib/essen/weekPlan";
import { loadMealPlans, replaceMealPlans } from "@/lib/essen/mealPlan";
import { at } from "../helpers";
import { fakeWindow } from "./fenster";

function familie(): HouseholdProfile {
  const lisa = { ...createPerson("erwachsen"), id: "a1", name: "Lisa", allergies: ["Nüsse"] };
  const mattis = { ...createPerson("kind"), id: "k1", name: "Mattis", age: 7, dislikes: ["Pilze"] };
  const ella = { ...createPerson("kind"), id: "k2", name: "Ella", age: 5 };
  return { ...createEmptyProfile(), persons: [lisa, mattis, ella], adults: 1, kids: 2, wishDay: { enabled: true, weekday: "Freitag", minAge: 4, order: ["k1", "k2"] } };
}

function woche(wish: WeekPlan["wish"]): WeekPlan {
  return { weekStart: "2026-10-19", meatDays: 2, vegetarianDays: 3, fishDays: 1, cheatDay: false, cheatDayWeekday: "", awayDays: [], budgetEuro: null, wishes: "", wish, fixedMeals: [], updatedAt: "" };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  at("2026-10-22T09:00");
  fakeWindow();
  saveProfile(familie());
  replaceWeekPlans({ "2026-10-19": woche({ kidId: "k1", text: "Pfannkuchen", weekday: "Freitag" }), "2026-10-26": woche({ kidId: "k2", text: "Pizza", weekday: "Freitag" }) });
  replaceMealPlans({
    "2026-10-19": {
      Freitag: { kind: "wish", kidId: "k1", text: "Pfannkuchen", double: true },
      Samstag: { kind: "wish", kidId: "k1", text: "  " },
      Sonntag: { kind: "wish", kidId: "k2", text: "Pizza" },
      Montag: { kind: "text", title: "Gemüsepfanne", category: "vegetarisch" },
    },
  });
});

describe("Person entfernen", () => {
  it("räumt Profil, Wunschtag, Wochen-Vorgaben und Plan auf", () => {
    const r = removePerson("k1");
    expect(r.ok).toBe(true);
    const p = loadProfile()!;
    expect(p.persons.map((x) => x.name)).toEqual(["Lisa", "Ella"]);
    expect(p.adults).toBe(1);
    expect(p.kids).toBe(1);
    expect(p.wishDay.order).toEqual(["k2"]);
    // Allergien der anderen bleiben
    expect(p.persons[0].allergies).toEqual(["Nüsse"]);
    const weeks = loadWeekPlans();
    expect(weeks["2026-10-19"].wish).toBeNull();
    expect(weeks["2026-10-26"].wish?.kidId).toBe("k2");
    const plan = loadMealPlans()["2026-10-19"];
    expect(plan.Freitag).toMatchObject({ kind: "text", title: "Pfannkuchen", double: true });
    expect(plan.Samstag).toEqual({ kind: "cleared" });
    expect(plan.Sonntag).toMatchObject({ kind: "wish", kidId: "k2" });
    expect(plan.Montag).toMatchObject({ kind: "text", title: "Gemüsepfanne" });
  });

  it("Rückgängig stellt alles wieder her – inklusive „mag nicht“", () => {
    const r = removePerson("k1");
    if (!r.ok) throw new Error("sollte klappen");
    r.undo();
    const p = loadProfile()!;
    expect(p.persons.map((x) => x.name)).toEqual(["Lisa", "Mattis", "Ella"]);
    expect(p.persons[1].dislikes).toEqual(["Pilze"]);
    expect(loadWeekPlans()["2026-10-19"].wish?.kidId).toBe("k1");
    expect(loadMealPlans()["2026-10-19"].Freitag).toMatchObject({ kind: "wish", kidId: "k1" });
  });

  it("unbekannte Person oder kein Profil → nichts passiert", () => {
    expect(removePerson("gibtsnicht")).toEqual({ ok: false, reason: "missing" });
    fakeWindow();
    expect(removePerson("k1")).toEqual({ ok: false, reason: "missing" });
  });

  it("die letzte Person bleibt", () => {
    const lisa = familie().persons[0];
    saveProfile({ ...familie(), persons: [lisa], adults: 1, kids: 0 });
    expect(removePerson("a1")).toEqual({ ok: false, reason: "last" });
    expect(loadProfile()!.persons).toHaveLength(1);
  });
});
