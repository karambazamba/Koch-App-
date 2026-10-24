// Nach dem Essen: Das heutige Gericht gilt ab Essenszeit + 90 Minuten (oder
// sobald "Gekocht" getippt wurde) als gekocht – ohne Nachfrage. Dann zählt es
// im Kochbuch mit ("<n>× gekocht"), seine Zutaten gelten als verbraucht
// (Kühlschrank/Tiefkühler und Gekauftes), und die Startseite zeigt schon das
// nächste Essen. "Auf morgen verschieben" im Wochenplan nimmt alles zurück.
// Speicher `wasgibts.gekocht` je Kochtag.

import { useExternalStore } from "@/lib/core/useExternalStore";
import { countCookedOn, uncountCooked, type Recipe } from "@/lib/essen/cookbook";
import { AT_HOME, DISHES } from "@/lib/essen/dishIdeas";
import { createLocalStore } from "@/lib/core/localStore";
import { composeWeek, entriesWithoutSlot, mealPlansWithWeek, type PlanDay, type StoredEntry } from "@/lib/essen/mealPlan";
import { activePantry, loadPantryAll, replacePantry, sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";
import { mealClockFor, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { addDays, DEFAULT_SHOPPING_DAY, weekStartFor, type WeekPlan } from "@/lib/essen/weekPlan";

/** So lange nach der Essenszeit verschwindet das Gericht von der Startseite */
const DONE_AFTER_MINUTES = 90;

type LeftoverAnswer = "kuehlschrank" | "tiefkuehler" | "nein";

type CookedDay = {
  title: string;
  recipeId?: string;
  /** "auto" = nach der Essenszeit von selbst, "marked" = "Gekocht" getippt */
  how: "auto" | "marked";
  /** Rezept wurde dafür mitgezählt; vorheriges "zuletzt gekocht" fürs Zurücknehmen */
  counted: boolean;
  lastCookedBefore: string | null;
  /** Aus dem Vorrat genommen (fürs Zurücknehmen) */
  removed: PantryItem[];
  /** Verbrauchte Zutaten (Gekauftes zählt dann nicht mehr als "da") */
  used: string[];
  /** Antwort auf "Ist was übrig geblieben?" */
  leftovers?: LeftoverAnswer;
};

type Store = { version: 1; days: Record<string, CookedDay> };

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function migrate(raw: unknown): Store | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; days?: unknown };
  if (data.version !== 1 || !data.days || typeof data.days !== "object") return null;
  const days: Record<string, CookedDay> = {};
  for (const [date, v] of Object.entries(data.days as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !v || typeof v !== "object") continue;
    const d = v as Partial<CookedDay>;
    if (typeof d.title !== "string") continue;
    days[date] = {
      title: d.title,
      recipeId: typeof d.recipeId === "string" ? d.recipeId : undefined,
      how: d.how === "marked" ? "marked" : "auto",
      counted: d.counted === true,
      lastCookedBefore: typeof d.lastCookedBefore === "string" ? d.lastCookedBefore : null,
      removed: Array.isArray(d.removed) ? (d.removed.filter((p) => p && typeof p === "object" && typeof p.id === "string") as PantryItem[]) : [],
      used: strings(d.used),
      leftovers: d.leftovers === "kuehlschrank" || d.leftovers === "tiefkuehler" || d.leftovers === "nein" ? d.leftovers : undefined,
    };
  }
  return { version: 1, days };
}

const store = createLocalStore("wasgibts.gekocht", migrate);
const EMPTY: Record<string, CookedDay> = {};

/** Gekochte Tage (`undefined` = lädt) */
export function useCookedDays(): Record<string, CookedDay> | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.days ?? EMPTY;
}

function loadCookedDays(): Record<string, CookedDay> {
  return store.load()?.days ?? EMPTY;
}

function saveDay(date: string, day: CookedDay | null) {
  const current = loadCookedDays();
  // Nur die letzten 60 Tage behalten
  const from = addDays(date, -60);
  const days = Object.fromEntries(Object.entries(current).filter(([d]) => d >= from && d !== date));
  if (day) days[date] = day;
  store.save({ version: 1, days });
}

const minutesOf = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};

/** Gibt es an dem Tag ein Gericht, das nach dem Essen als gekocht zählen kann? */
export function cookableEntry(day: PlanDay | undefined) {
  if (!day || day.away || day.paused) return null;
  return day.slot.entry;
}

/**
 * Ist das heutige Essen vorbei? Ab Essenszeit + 90 Minuten oder sobald es als
 * gekocht vermerkt ist. Dann zeigt die Startseite das nächste Essen.
 */
export function mealIsOver(day: PlanDay | undefined, profile: HouseholdProfile, minutesNow: number, cooked: Record<string, CookedDay>): boolean {
  if (!day) return false;
  return mealOverOn(day.date, day.weekday, profile, minutesNow, cooked);
}

/** Wie `mealIsOver`, nur mit Datum und Wochentag (ohne zusammengesetzte Woche) */
export function mealOverOn(date: string, weekday: string, profile: HouseholdProfile, minutesNow: number, cooked: Record<string, CookedDay>): boolean {
  if (cooked[date]) return true;
  return minutesNow >= minutesOf(mealClockFor(profile, weekday)) + DONE_AFTER_MINUTES;
}

/** Zutaten eines Gerichts: Rezept, sonst ein bekannter Klassiker mit dem Namen */
function ingredientsOf(title: string, recipe: Recipe | undefined): string[] {
  const names = recipe ? recipe.ingredients.map((i) => i.name) : DISHES.find((d) => d.title.toLowerCase() === title.trim().toLowerCase())?.needs ?? [];
  return names.map((n) => n.trim()).filter((n) => n && !AT_HOME.test(n));
}

/**
 * Gericht des Tages als gekocht vermerken (einmal je Tag). `counted`: das
 * Rezept wurde schon anders mitgezählt ("Gekocht" auf der Rezeptseite).
 */
export function markCooked(
  date: string,
  entry: { title: string; recipeId?: string },
  recipes: Record<string, Recipe>,
  opts: { how?: "auto" | "marked"; alreadyCounted?: boolean } = {},
) {
  const existing = loadCookedDays()[date];
  if (existing) {
    if (opts.how === "marked" && existing.how !== "marked") saveDay(date, { ...existing, how: "marked" });
    return;
  }
  const recipe = entry.recipeId ? recipes[entry.recipeId] : undefined;
  // Schon an dem Tag gezählt (z. B. "Gekocht" getippt) → nicht doppelt
  const count = Boolean(recipe && !opts.alreadyCounted && !recipe.lastCookedAt?.startsWith(date));
  const lastCookedBefore = count && recipe ? countCookedOn(recipe.id, date) : null;
  const used = ingredientsOf(entry.title, recipe);
  // Gekocht → Zutaten gehen aus „Im Haus“ raus (alle Orte)
  const pantry = loadPantryAll();
  const removed = activePantry(pantry, date).filter((p) => used.some((n) => sameIngredient(n, p.name)));
  if (removed.length) replacePantry(pantry.filter((p) => !removed.some((r) => r.id === p.id)));
  saveDay(date, {
    title: entry.title,
    recipeId: recipe?.id,
    how: opts.how ?? "auto",
    counted: count,
    lastCookedBefore,
    removed,
    used,
  });
}

/** Zurücknehmen: Zähler, Vorrat und Vermerk wie vorher */
export function unmarkCooked(date: string) {
  const day = loadCookedDays()[date];
  if (!day) return;
  if (day.counted && day.recipeId) uncountCooked(day.recipeId, day.lastCookedBefore);
  if (day.removed.length) {
    const pantry = loadPantryAll();
    replacePantry([...pantry, ...day.removed.filter((r) => !pantry.some((p) => p.id === r.id))]);
  }
  saveDay(date, null);
}

/** Verbrauchte Zutaten der letzten 7 Tage (Gekauftes zählt dann nicht mehr als "da") */
export function usedRecently(cooked: Record<string, CookedDay>, today: string): string[] {
  const from = addDays(today, -7);
  return Object.entries(cooked)
    .filter(([d]) => d >= from && d <= today)
    .flatMap(([, c]) => c.used);
}

type Data = {
  profile: HouseholdProfile;
  weekPlans: Record<string, WeekPlan>;
  mealPlans: Record<string, Record<string, StoredEntry>>;
  recipes: Record<string, Recipe>;
};

/**
 * "Auf morgen verschieben" (doch nicht gekocht): Das Gericht wandert auf
 * morgen, ein Gericht von morgen auf den nächsten freien Tag danach. Zählt
 * dann nicht als gekocht. Rein – gibt die neuen Wochen zurück.
 */
export function moveToTomorrow(data: Data, date: string): { weeks: Record<string, Record<string, StoredEntry>>; text: string } | null {
  const shoppingDay = data.profile.shoppingDay || DEFAULT_SHOPPING_DAY;
  const startOf = (iso: string) => weekStartFor(new Date(`${iso}T12:00:00`), shoppingDay);
  const weekStart = startOf(date);
  const day = composeWeek(weekStart, data.profile, data.weekPlans, data.mealPlans, data.recipes).days.find((d) => d.date === date);
  const entry = day?.slot.entry;
  if (!day || !entry) return null;
  const { double: _double, ...moved } = entry.stored;
  void _double;
  let weeks = mealPlansWithWeek(data.mealPlans, weekStart, (e) => entriesWithoutSlot(e, day.slot));
  const tomorrowIso = addDays(date, 1);
  const tStart = startOf(tomorrowIso);
  const tDay = composeWeek(tStart, data.profile, data.weekPlans, weeks, data.recipes).days.find((d) => d.date === tomorrowIso);
  if (!tDay) return null;
  const old = tDay.slot.entry;
  weeks = mealPlansWithWeek(weeks, tStart, (e) => ({ ...e, [tDay.slot.key]: moved }));
  if (!old) return { weeks, text: `Alles klar ✓ ${entry.title} gibt’s morgen.` };
  // Bisheriges Gericht von morgen auf den nächsten freien Tag (ohne Ausflug, kein freies Wochenende)
  const candidates = [0, 7].flatMap((offset) => {
    const start = addDays(tStart, offset);
    return composeWeek(start, data.profile, data.weekPlans, weeks, data.recipes).days.map((d) => ({ d, start }));
  });
  const target = candidates.find(({ d }) => d.date > tomorrowIso && !d.away && !d.paused && !d.slot.entry && d.weekend !== "frei");
  if (target) {
    weeks = mealPlansWithWeek(weeks, target.start, (e) => ({ ...e, [target.d.slot.key]: old.stored }));
    return { weeks, text: `Alles klar ✓ ${entry.title} gibt’s morgen, ${old.title} rutscht auf ${target.d.weekday}.` };
  }
  return { weeks, text: `Alles klar ✓ ${entry.title} gibt’s morgen. ${old.title} ist erst mal raus.` };
}

