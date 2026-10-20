// Profil speichern und ältere Versionen migrieren (`familienkueche.haushaltsprofil`).
// Datenmodell, Standardwerte und Hilfen stehen in ./profile.ts.

import { migrateBases } from "../essen/bases";
import { createLocalStore } from "../core/localStore";
import { now } from "../core/now";
import type { StorageKey } from "@/lib/core/storage";
import { AVATAR_COLORS, HELPER_NAME_MAX, HOUSEHOLD_TYPES, deriveHouseholdType, PLAN_STYLES, APP_THEMES, HELPER_MODES, WEEKDAYS, LIMITS, newId, createEmptyProfile, wishDayOrder, syncPersons, type PersonRole, type KidAgeGroup, type WeekdayLunch, type Person, type MealTime, type WarmMealSchedule, type WeekRules, type WishDaySettings, type HelperArt, type AvatarColor, type HelperSettings, type NeverAgainEntry, type LikedIngredient, type HouseholdType, type MealClock, type PauseSettings, type WeatherSettings, type HouseholdProfile, type PlanStyle, type AppTheme, type HelperMode, DEFAULT_MEAL_CLOCK, voiceForArt } from "./profile";

/** Stehen schon Gerichte im Wochenplan? (nur für die Migration auf v16, liest den Speicher direkt) */
function hasPlannedMeals(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const raw = JSON.parse(localStorage.getItem("wasgibts.wochenplan") ?? "null") as { weeks?: Record<string, Record<string, { kind?: string }>> } | null;
    return Object.values(raw?.weeks ?? {}).some((w) => Object.values(w ?? {}).some((e) => e && (e.kind === "recipe" || e.kind === "text" || e.kind === "wish")));
  } catch {
    return false;
  }
}

// --- Migration älterer Profile ----------------------------------------------

const KID_AGE_GROUPS: KidAgeGroup[] = ["kleinkind", "kitakind", "schulkind"];
const WEEKDAY_LUNCHES: WeekdayLunch[] = ["auswaerts", "zuhause", "manchmal"];

const pick = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Version 1 kannte nur eine Antwort für alle Kinder. */
const V1_KIDS_LUNCH: Record<string, WeekdayLunch> = {
  ja: "auswaerts",
  teilweise: "manchmal",
  nein: "zuhause",
};

/**
 * Aus einer gespeicherten Angabe die Zeit, zu der meistens zusammen warm
 * gegessen wird. v1/v2: einzelner Wert, v3–v5: Liste ("mittags", "abends",
 * beides oder "flexibel"), ab v6: "mittags" | "abends".
 * Eindeutig mittags/abends bleibt; beides oder "mal so, mal so" → `fallback`
 * (unter der Woche abends, am Wochenende mittags).
 */
function normalizeMealTime(value: unknown, fallback: MealTime): MealTime {
  const list = Array.isArray(value) ? value : [value];
  const lunch = list.includes("mittags");
  const dinner = list.includes("abends");
  if (lunch && !dinner) return "mittags";
  if (dinner && !lunch) return "abends";
  return fallback;
}

/**
 * Bringt gespeicherte Profile (auch ältere Versionen) auf den aktuellen Stand
 * und ergänzt fehlende Felder mit Standardwerten.
 */
export function migrateProfile(raw: unknown): HouseholdProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].includes(data.version as number)) return null;

  const defaults = createEmptyProfile();

  // v1: eine Einstellung für alle Tage → gilt für Woche und Wochenende.
  const oldWarmMeal = data.warmMeal;
  const oldSchedule =
    oldWarmMeal && typeof oldWarmMeal === "object" && !Array.isArray(oldWarmMeal)
      ? (oldWarmMeal as Record<string, unknown>)
      : { weekday: oldWarmMeal, weekend: oldWarmMeal };
  const warmMeal: WarmMealSchedule = {
    weekday: normalizeMealTime(oldSchedule.weekday, defaults.warmMeal.weekday),
    weekend: normalizeMealTime(oldSchedule.weekend, defaults.warmMeal.weekend),
  };

  const kidLunchFallback =
    V1_KIDS_LUNCH[data.kidsLunchAway as string] ?? "auswaerts";

  const persons = (Array.isArray(data.persons) ? data.persons : []).map(
    (p: Partial<Person>): Person => {
      const role: PersonRole = p.role === "kind" ? "kind" : "erwachsen";
      const person: Person = {
        id: typeof p.id === "string" ? p.id : newId(),
        role,
        name: typeof p.name === "string" ? p.name : "",
        allergies: Array.isArray(p.allergies) ? p.allergies : [],
        dislikes: Array.isArray(p.dislikes) ? p.dislikes : [],
      };
      if (role === "kind") {
        person.ageGroup = pick(p.ageGroup, KID_AGE_GROUPS, "kitakind");
        person.age = typeof p.age === "number" ? p.age : null;
        person.weekdayLunch = pick(p.weekdayLunch, WEEKDAY_LUNCHES, kidLunchFallback);
      } else {
        // Bis v2 wurden Erwachsene nicht gefragt und zählten als "zu Hause".
        person.weekdayLunch = pick(p.weekdayLunch, WEEKDAY_LUNCHES, "zuhause");
        person.employed = typeof p.employed === "boolean" ? p.employed : null;
      }
      return person;
    },
  );

  const adults = typeof data.adults === "number" ? data.adults : defaults.adults;
  const kids = typeof data.kids === "number" ? data.kids : defaults.kids;

  return {
    ...defaults,
    householdName:
      typeof data.householdName === "string" ? data.householdName : "",
    adults,
    kids,
    persons: syncPersons(persons, adults, kids),
    favoriteDishes: Array.isArray(data.favoriteDishes)
      ? (data.favoriteDishes as string[])
      : [],
    warmMeal,
    weekRules: {
      ...defaults.weekRules,
      ...(data.weekRules as Partial<WeekRules> | undefined),
    },
    // Bis v3 gab es keinen Wunschtag → standardmäßig aus.
    wishDay: migrateWishDay(data.wishDay, defaults.wishDay),
    // Bis v4 lief die Woche immer Mo–So → Einkaufstag Montag.
    shoppingDay: pick(data.shoppingDay, WEEKDAYS, defaults.shoppingDay),
    // Begleitung: bis v6 ohne Namen → Lotte; bis v18 ohne Art/Farbe (aus dem Namen geraten)
    helper: migrateHelper(data.helper),
    // Bis v7 keine Basis-Statistik und keine "Nie wieder"-Liste
    bases: migrateBases(data.bases),
    neverAgain: migrateNeverAgain(data.neverAgain),
    // Bis v8 keine Lieblingszutaten und keine Gesundheits-Tipps-Einstellung
    likes: migrateLikes(data.likes),
    likesBlocked: Array.isArray(data.likesBlocked)
      ? (data.likesBlocked as unknown[]).filter((n): n is string => typeof n === "string").slice(0, 200)
      : [],
    healthTips: data.healthTips === "aus" || data.healthTips === "oefter" ? data.healthTips : "ab_und_zu",
    // Bis v9 keine Uhrzeiten → Standard 12:30 / 18:30
    mealClock: migrateMealClock(data.mealClock),
    // Bis v10: Wochenende "locker", keine Pause, kein Wetter
    weekendStyle: data.weekendStyle === "frei" || data.weekendStyle === "normal" ? data.weekendStyle : "locker",
    // Bis v17: eine alte Chat-Regel hat bei "nicht da"/"weg" eine Pause ohne Ende eingetragen,
    // die still alle Gerichte ab dann ausgeblendet hat – solche offenen Pausen einmalig entfernen
    pause: (data.version as number) < 18 && migratePause(data.pause)?.until === null ? null : migratePause(data.pause),
    weather: migrateWeather(data.weather),
    // Bis v11: nach Gefühl, ein neues Gericht pro Woche
    cookingStyle: data.cookingStyle === "rezept" ? "rezept" : "gefuehl",
    newPerWeek: data.newPerWeek === 2 ? 2 : 1,
    // Bis v12: Tipps "ab und zu"
    tips: data.tips === "aus" || data.tips === "taeglich" ? data.tips : "ab_und_zu",
    // Bis v13: aus den Personen ableiten (Kinder → Familie), keine Küchenmaschine
    householdType: HOUSEHOLD_TYPES.some((t) => t.value === data.householdType)
      ? (data.householdType as HouseholdType)
      : deriveHouseholdType(
          persons.filter((p) => p.role === "erwachsen").length || adults,
          persons.filter((p) => p.role === "kind").length || (persons.length ? 0 : kids),
        ),
    kitchenMachine: data.kitchenMachine === "thermomix" ? "thermomix" : "keine",
    // Bis v14: Warm, Normal, Einfach, Wochenend-Ideen an
    // Bis v14 ohne Ansicht → Hell (wie bisher); "Frisch" gibt es nicht mehr → Automatisch
    theme: APP_THEMES.some((t) => t.value === data.theme) ? (data.theme as AppTheme) : data.theme === "frisch" ? "auto" : "warm",
    helperMode: HELPER_MODES.some((m) => m.value === data.helperMode) ? (data.helperMode as HelperMode) : "normal",
    display: data.display === "alles" ? "alles" : "einfach",
    weekendIdeas: data.weekendIdeas !== false,
    // Bis v15: wer schon Gerichte im Plan hat, plant gern – sonst "mal so, mal so"
    planStyle: PLAN_STYLES.some((p) => p.value === data.planStyle) ? (data.planStyle as PlanStyle) : hasPlannedMeals() ? "plan" : "mix",
    // Bis v16: 2 Tage
    mixSuggest: data.mixSuggest === "nie" || data.mixSuggest === "woche" ? data.mixSuggest : "zwei",
    planWeek: typeof data.planWeek === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.planWeek) ? data.planWeek : null,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  };
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function migratePause(raw: unknown): PauseSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<PauseSettings>;
  if (typeof p.from !== "string" || !ISO.test(p.from)) return null;
  return { from: p.from, until: typeof p.until === "string" && ISO.test(p.until) ? p.until : null };
}

function migrateWeather(raw: unknown): WeatherSettings {
  const w = (raw && typeof raw === "object" ? raw : {}) as Partial<WeatherSettings>;
  return { consent: w.consent === true, postcode: typeof w.postcode === "string" ? w.postcode.replace(/\D/g, "").slice(0, 5) : "" };
}

function migrateMealClock(raw: unknown): MealClock {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<MealClock>;
  return {
    mittags: typeof r.mittags === "string" && CLOCK.test(r.mittags) ? r.mittags : DEFAULT_MEAL_CLOCK.mittags,
    abends: typeof r.abends === "string" && CLOCK.test(r.abends) ? r.abends : DEFAULT_MEAL_CLOCK.abends,
  };
}

function migrateLikes(raw: unknown): LikedIngredient[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is Partial<LikedIngredient> => Boolean(l) && typeof l === "object")
    .filter((l) => typeof l.name === "string" && l.name.trim() !== "")
    .map((l) => ({
      name: l.name!.trim().slice(0, 40),
      weight: typeof l.weight === "number" && l.weight > 0 ? Math.min(999, l.weight) : 1,
      ...(l.manual ? { manual: true } : {}),
    }))
    .slice(0, 200);
}

function migrateNeverAgain(raw: unknown): NeverAgainEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Partial<NeverAgainEntry> => Boolean(e) && typeof e === "object")
    .filter((e) => typeof e.title === "string" && e.title.trim() !== "")
    .map((e) => ({
      id: typeof e.id === "string" ? e.id : newId(),
      title: e.title!.trim(),
      ingredients: Array.isArray(e.ingredients) ? e.ingredients.filter((i): i is string => typeof i === "string").slice(0, 8) : [],
      reason: typeof e.reason === "string" ? e.reason.slice(0, 200) : "",
      addedAt: typeof e.addedAt === "string" ? e.addedAt : "",
      ...(e.recipe && typeof e.recipe === "object" ? { recipe: e.recipe } : {}),
    }));
}

/**
 * Begleitung prüfen. Bis v6 ohne Namen → Lotte (wer Lotte hat, behält Lotte).
 * Bis v18 ohne Art/Farbe: Art aus dem Namen (Mia/Lotte → Assistentin, Theo →
 * Assistent, sonst die bisher gewählte Stimme), Farbe Theo Nachtblau, sonst
 * Orange.
 */
export function migrateHelper(raw: unknown): HelperSettings {
  const h = (raw && typeof raw === "object" ? raw : {}) as Partial<HelperSettings>;
  const name = (typeof h.name === "string" ? h.name.trim().slice(0, HELPER_NAME_MAX) : "") || "Lotte";
  const lower = name.toLowerCase();
  const art: HelperArt =
    h.art === "assistent" || h.art === "assistentin" ? h.art : lower === "mia" || lower === "lotte" ? "assistentin" : lower === "theo" ? "assistent" : h.voice === "weiblich" ? "assistentin" : "assistent";
  const farbe: AvatarColor = AVATAR_COLORS.some((c) => c.id === h.farbe) ? (h.farbe as AvatarColor) : lower === "theo" ? "nachtblau" : "orange";
  return { name, art, voice: voiceForArt(art), farbe };
}

function migrateWishDay(raw: unknown, fallback: WishDaySettings): WishDaySettings {
  if (!raw || typeof raw !== "object") return fallback;
  const w = raw as Partial<WishDaySettings>;
  const { min, max } = LIMITS.wishMinAge;
  return {
    enabled: w.enabled === true,
    weekday: pick(w.weekday, WEEKDAYS, fallback.weekday),
    minAge:
      typeof w.minAge === "number" ? Math.min(max, Math.max(min, w.minAge)) : fallback.minAge,
    order: Array.isArray(w.order) ? w.order.filter((id) => typeof id === "string") : [],
  };
}

const STORAGE_KEY: StorageKey = "familienkueche.haushaltsprofil";

// --- Speicherung -----------------------------------------------------------

const store = createLocalStore(STORAGE_KEY, migrateProfile);

export const loadProfile = store.load;
export const clearProfile = store.clear;
export const subscribeProfile = store.subscribe;

export function saveProfile(profile: HouseholdProfile): HouseholdProfile {
  const persons = syncPersons(profile.persons, profile.adults, profile.kids);
  const toSave: HouseholdProfile = {
    ...profile,
    persons,
    // Reihenfolge fürs Wunschtag-Reihum mit den aktuellen Kindern abgleichen.
    wishDay: {
      ...profile.wishDay,
      order: wishDayOrder({ persons, wishDay: profile.wishDay }).map((k) => k.id),
    },
    updatedAt: now().toISOString(),
  };
  store.save(toSave);
  return toSave;
}
