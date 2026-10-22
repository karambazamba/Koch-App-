// Haushalt, Begleitung und Essen im Profil: reine Hilfen.
import { describe, expect, it } from "vitest";
import {
  AVATAR_COLORS, DEFAULT_HELPER, STANDARD_HELPERS, avatarHex, createEmptyProfile, createPerson, deriveHouseholdType, effectivePlanStyle,
  fitHouseholdType, hasKids, helperArtOf, helperMessage, helperName, helperTitle, helperWith, isSmallHousehold, isSolo, isWeekendDay,
  isWishDayEligible, mainMealHeadcount, mainMealTime, mealClockFor, pausedOn, personLabel, planningVisible, planningWeekLabel,
  standardWeekDays, syncPersons, usualLunch, weekdayLunchHeadcount, wishDayActive, wishDayKids, wishDayOrder, type HouseholdProfile, type Person,
} from "@/lib/einstellungen/profile";
import { ageGroupForAge, lunchSummary } from "@/lib/einstellungen/personLunch";

const kind = (name: string, extra: Partial<Person> = {}): Person => ({ ...createPerson("kind"), name, ...extra });
const erwachsen = (name: string, extra: Partial<Person> = {}): Person => ({ ...createPerson("erwachsen"), name, ...extra });

describe("Haushaltstyp", () => {
  it("aus der Anzahl abgeleitet", () => {
    expect(deriveHouseholdType(1, 0)).toBe("single");
    expect(deriveHouseholdType(2, 0)).toBe("paar");
    expect(deriveHouseholdType(4, 0)).toBe("wg");
    expect(deriveHouseholdType(1, 1)).toBe("familie");
  });

  it("passt sich an, wenn Personen dazukommen", () => {
    expect(fitHouseholdType("paar", [{ role: "erwachsen" }, { role: "kind" }])).toBe("familie");
    expect(fitHouseholdType("single", [{ role: "erwachsen" }, { role: "erwachsen" }])).toBe("paar");
    expect(fitHouseholdType("paar", [{ role: "erwachsen" }, { role: "erwachsen" }, { role: "erwachsen" }])).toBe("wg");
    expect(fitHouseholdType("wg", [{ role: "erwachsen" }])).toBe("wg");
  });

  it("Kinder, allein, klein", () => {
    expect(hasKids({ persons: [kind("Ella")] })).toBe(true);
    expect(hasKids({ persons: [erwachsen("Lisa")] })).toBe(false);
    expect(isSolo({ householdType: "single" })).toBe(true);
    expect(isSolo(null)).toBe(false);
    expect(isSmallHousehold({ householdType: "paar" })).toBe(true);
    expect(isSmallHousehold({ householdType: "familie" })).toBe(false);
  });
});

describe("Personen", () => {
  it("Anzahl angleichen: vorhandene bleiben, Überzählige fallen hinten weg", () => {
    const lisa = erwachsen("Lisa", { allergies: ["Nüsse"] });
    const ella = kind("Ella");
    const mehr = syncPersons([lisa, ella], 2, 2);
    expect(mehr).toHaveLength(4);
    expect(mehr[0]).toBe(lisa);
    expect(mehr[2]).toBe(ella);
    expect(syncPersons([lisa, ella], 1, 0)).toEqual([lisa]);
  });

  it("Anzeigename mit laufender Nummer, wenn kein Name da ist", () => {
    const a = erwachsen("");
    const b = erwachsen("  ");
    const k = kind("");
    const all = [a, b, k];
    expect(personLabel(a, all)).toBe("Erwachsene:r 1");
    expect(personLabel(b, all)).toBe("Erwachsene:r 2");
    expect(personLabel(k, all)).toBe("Kind 1");
    expect(personLabel(erwachsen("Lisa"), all)).toBe("Lisa");
  });

  it("Mittagessen wie üblich und Kurzform", () => {
    expect(usualLunch({ role: "erwachsen" })).toBe("zuhause");
    expect(usualLunch({ role: "kind", ageGroup: "kleinkind" })).toBe("zuhause");
    expect(usualLunch({ role: "kind", ageGroup: "schulkind" })).toBe("auswaerts");
    expect(lunchSummary(erwachsen("A", { weekdayLunch: undefined }))).toBe("zu Hause");
    expect(lunchSummary(kind("K", { weekdayLunch: undefined }))).toBe("in Kita/Schule");
    expect(lunchSummary(erwachsen("A", { weekdayLunch: "auswaerts" }))).toBe("auswärts");
    expect(lunchSummary(kind("K", { weekdayLunch: "manchmal" }))).toBe("manchmal zu Hause");
  });

  it("Altersgruppe aus dem Alter", () => {
    expect(ageGroupForAge(1)).toBe("kleinkind");
    expect(ageGroupForAge(4)).toBe("kitakind");
    expect(ageGroupForAge(6)).toBe("schulkind");
  });
});

function profil(patch: Partial<HouseholdProfile> = {}): HouseholdProfile {
  const persons = [
    erwachsen("Lisa", { weekdayLunch: "zuhause" }),
    erwachsen("Felix", { weekdayLunch: "manchmal" }),
    kind("Mattis", { id: "k1", age: 7, ageGroup: "schulkind", weekdayLunch: undefined }),
    kind("Ella", { id: "k2", age: null, ageGroup: "kleinkind", weekdayLunch: "zuhause" }),
  ];
  return { ...createEmptyProfile(), persons, adults: 2, kids: 2, ...patch };
}

describe("Essen – wer isst mit, wann", () => {
  it("Mittagessen unter der Woche: sicher und mit „manchmal“", () => {
    expect(weekdayLunchHeadcount(profil())).toEqual({ min: 2, max: 3 });
  });

  it("Hauptgericht: Zeit und Personen je Wochentag", () => {
    const mittags = profil({ warmMeal: { weekday: "mittags", weekend: "abends" } });
    expect(mainMealTime(mittags, "Montag")).toBe("mittags");
    expect(mainMealTime(mittags, "Sonntag")).toBe("abends");
    expect(mainMealTime(null, "Montag")).toBe("abends");
    expect(mainMealHeadcount(mittags, "Dienstag")).toBe(3);
    expect(mainMealHeadcount(mittags, "Samstag")).toBe(4);
    expect(mealClockFor(mittags, "Montag")).toBe("12:30");
    expect(mealClockFor(mittags, "Samstag")).toBe("18:30");
    // niemand mittags zu Hause → mindestens 1
    const leer = profil({ warmMeal: { weekday: "mittags", weekend: "abends" }, persons: [kind("K", { weekdayLunch: "auswaerts" })], adults: 0, kids: 1 });
    expect(mainMealHeadcount(leer, "Montag")).toBe(1);
  });

  it("Wochenende und Planungswoche", () => {
    expect(isWeekendDay("Samstag")).toBe(true);
    expect(isWeekendDay("Freitag")).toBe(false);
    expect(planningWeekLabel("Montag")).toBe("Mo–So");
    expect(planningWeekLabel("Donnerstag")).toBe("Do–Mi");
    expect(planningWeekLabel("Funtag")).toBe("Mo–So");
  });

  it("Planstil: spontan mit „nur diese Woche planen“ zählt wie mal so, mal so", () => {
    expect(effectivePlanStyle(null)).toBe("mix");
    expect(effectivePlanStyle({ planStyle: "spontan", planWeek: "2026-10-19" }, "2026-10-19")).toBe("mix");
    expect(effectivePlanStyle({ planStyle: "spontan", planWeek: "2026-10-12" }, "2026-10-19")).toBe("spontan");
    expect(planningVisible({ planStyle: "spontan", planWeek: null })).toBe(false);
    expect(planningVisible({ planStyle: "plan", planWeek: null })).toBe(true);
  });

  it("Pause: von – bis, offen ohne Ende", () => {
    expect(pausedOn({ pause: { from: "2026-10-20", until: "2026-10-25" } }, "2026-10-22")).toBe(true);
    expect(pausedOn({ pause: { from: "2026-10-20", until: "2026-10-25" } }, "2026-10-26")).toBe(false);
    expect(pausedOn({ pause: { from: "2026-10-20", until: null } }, "2027-01-01")).toBe(true);
    expect(pausedOn({ pause: null }, "2026-10-22")).toBe(false);
    expect(pausedOn(undefined, "2026-10-22")).toBe(false);
  });
});

describe("Essen – Wunschtag", () => {
  it("wer mitmachen darf: Alter oder Gruppe", () => {
    expect(isWishDayEligible(kind("A", { age: 5 }), 4)).toBe(true);
    expect(isWishDayEligible(kind("A", { age: 3 }), 4)).toBe(false);
    expect(isWishDayEligible(kind("A", { age: null, ageGroup: "kitakind" }), 4)).toBe(true);
    expect(isWishDayEligible(kind("A", { age: null, ageGroup: "kleinkind" }), 4)).toBe(false);
    expect(isWishDayEligible(erwachsen("A"), 4)).toBe(false);
  });

  it("Reihenfolge: gespeicherte zuerst, neue hinten, entfernte weg", () => {
    const p = profil({ wishDay: { enabled: true, weekday: "Freitag", minAge: 4, order: ["k2", "weg"] } });
    expect(wishDayOrder(p).map((k) => k.name)).toEqual(["Ella", "Mattis"]);
    expect(wishDayKids(p).map((k) => k.name)).toEqual(["Mattis"]);
    expect(wishDayActive(p)).toBe(true);
    expect(standardWeekDays(p)).toBe(6);
    const ohneKinder = { ...p, persons: [erwachsen("Lisa")] };
    expect(wishDayActive(ohneKinder)).toBe(false);
    expect(standardWeekDays(ohneKinder)).toBe(7);
  });
});

describe("Begleitung", () => {
  it("Standard ist Mia (Assistentin, Orange), Theo ist Assistent in Nachtblau", () => {
    expect(DEFAULT_HELPER).toBe(STANDARD_HELPERS[0]);
    expect(STANDARD_HELPERS[1]).toMatchObject({ art: "assistent", voice: "maennlich", farbe: "nachtblau" });
    expect(AVATAR_COLORS).toHaveLength(10);
  });

  it("Farbe als Hex, unbekannt → Orange", () => {
    expect(avatarHex("lila")).toBe("#7357C4");
    expect(avatarHex(undefined)).toBe("#F26B21");
  });

  it("Art ändern wechselt die Stimme; leerer Name bleibt beim alten", () => {
    const h = helperWith(DEFAULT_HELPER, { art: "assistent", name: "  Frieda  " });
    expect(h).toEqual({ name: "Frieda", art: "assistent", voice: "maennlich", farbe: "orange" });
    expect(helperWith(h, { name: "   " }).name).toBe("Frieda");
    expect(helperWith(h, { farbe: "senf" })).toMatchObject({ farbe: "senf", voice: "maennlich" });
  });

  it("Name, Anrede und Mitteilungen kommen aus dem Profil – nie fest eingebaut", () => {
    const frieda = { helper: { name: "Frieda", art: "assistentin" as const, voice: "weiblich" as const, farbe: "rosa" as const } };
    const kalle = { helper: { name: "Kalle", art: "assistent" as const, voice: "maennlich" as const, farbe: "senf" as const } };
    expect(helperName(frieda)).toBe("Frieda");
    expect(helperName({ helper: { ...frieda.helper, name: "  " } })).toBe(DEFAULT_HELPER.name);
    expect(helperName(null)).toBe(DEFAULT_HELPER.name);
    expect(helperTitle(frieda)).toBe("deine Assistentin");
    expect(helperTitle(kalle)).toBe("dein Assistent");
    expect(helperTitle(undefined)).toBe("deine Assistentin");
    expect(helperArtOf(null)).toBe(DEFAULT_HELPER.art);
    expect(helperMessage(kalle, "Heute gibt’s Gulasch")).toBe("Kalle: Heute gibt’s Gulasch");
  });
});
