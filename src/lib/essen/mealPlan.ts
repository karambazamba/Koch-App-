// Wochenplan: EIN Hauptgericht pro Tag.
//
// Gespeichert (localStore, später Supabase) werden nur eigene Einträge und
// Änderungen. Feste Gerichte, Wunsch, Ausflugstage und Cheat Day kommen
// automatisch aus dem Wochen-Check; wer sie im Plan löscht oder verschiebt,
// überschreibt sie nur hier ("cleared" bzw. eigener Eintrag) – die Vorgaben
// im Wochen-Check bleiben unverändert.

import { useExternalStore } from "../core/useExternalStore";
import type { Recipe, RecipeCategory } from "./cookbook";
import { guessDishCategory } from "./dishCategory";
import { noteUserAction, todayIso } from "../core/activity";
import { createLocalStore } from "../core/localStore";
import { mainMealHeadcount, mainMealTime, isWeekendDay, pausedOn, personLabel, type HouseholdProfile, type MealTime } from "../einstellungen/profile";
import { loadProfile } from "../einstellungen/profileStore";
import {
  CATEGORY_COUNT_KEY,
  addDays,
  planForWeek,
  resolveWeekKey,
  weekDayNames,
  wishIsActive,
  type WeekPlan,
} from "./weekPlan";
import type { StorageKey } from "@/lib/core/storage";

/** Was im Plan gespeichert wird. `double` = doppelt kochen, Reste für morgen. */
export type StoredEntry =
  /** `spontan` = aus den Ideen für heute gewählt (zählt nicht als "geplant") */
  /** `persons` = nur für diesen Tag umgerechnet ("heute sind wir nur zu zweit"), Familie und Rezept bleiben */
  | { kind: "recipe"; recipeId: string; title: string; category: RecipeCategory; double?: boolean; spontan?: boolean; persons?: number }
  | { kind: "text"; title: string; category: RecipeCategory | null; double?: boolean; spontan?: boolean; persons?: number }
  | { kind: "wish"; kidId: string; text: string; double?: boolean }
  | { kind: "cleared" }
  /** Notiz am Tag (z. B. das frühere zweite Gericht) – unter `noteKey(tag)` */
  | { kind: "note"; text: string };

export type MealEntry = Exclude<StoredEntry, { kind: "cleared" } | { kind: "note" }>;

type MealPlanStore = {
  /**
   * v2: Kategorie selbst eingetragener Gerichte kommt aus dem Gericht.
   * v3: ein Hauptgericht pro Tag (Schlüssel = Wochentag), Notizen unter "Tag:notiz".
   */
  version: 3;
  /** Je Woche (erster Tag "YYYY-MM-DD") die Einträge je Tag */
  weeks: Record<string, Record<string, StoredEntry>>;
};

const STORAGE_KEY: StorageKey = "wasgibts.wochenplan";

/** Schlüssel des Hauptgerichts eines Tages */
export function slotKey(weekday: string): string {
  return weekday;
}

/** Schlüssel der Notiz eines Tages */
function noteKey(weekday: string): string {
  return `${weekday}:notiz`;
}

// --- Zusammengesetzte Woche ---------------------------------------------------

export type ResolvedEntry = {
  /** "eigen" = im Plan eingetragen, "fest"/"wunsch" = aus dem Wochen-Check */
  origin: "eigen" | "fest" | "wunsch";
  stored: MealEntry;
  title: string;
  category: RecipeCategory | null;
  recipeId?: string;
  /** Nur beim Wunsch */
  kidName?: string;
  /** Doppelt kochen – Reste für den nächsten Tag */
  double: boolean;
};

export type DaySlot = {
  key: string;
  entry: ResolvedEntry | null;
  /** Kategorie-Hinweis für freie Tage, verteilt nach den Vorgaben */
  hint: RecipeCategory | null;
  /** Gibt es für den Tag etwas aus dem Wochen-Check? (dann löschen = überschreiben) */
  hasDerived: boolean;
};

export type PlanDay = {
  weekday: string;
  date: string;
  away: boolean;
  cheat: boolean;
  /** Das Hauptgericht des Tages */
  slot: DaySlot;
  /** Wann es das Hauptgericht gibt (laut Profil) – nur Anzeige */
  mealTime: MealTime;
  /** Wie viele mitessen (mittags unter der Woche evtl. weniger) */
  persons: number | null;
  /** Notiz am Tag, z. B. das frühere zweite Gericht */
  note: string;
  /** Zweite Mahlzeit: Reste vom Vortag (Titel), sonst null */
  leftovers: string | null;
  /** Pause-Modus an diesem Tag (zählt wie ein Ausflugstag) */
  paused: boolean;
  /** Wochenend-Stil an Sa/So: "frei" (nichts planen) oder "locker" (eine Idee, optional); sonst null */
  weekend: "frei" | "locker" | null;
};

export type PlanWeek = {
  weekStart: string;
  days: PlanDay[];
  /** Vorgaben aus dem Wochen-Check vorhanden? (sonst Standardwoche) */
  hasPlanRules: boolean;
  planned: number;
  total: number;
  counts: Record<"fleisch" | "vegetarisch" | "fisch", { planned: number; target: number }>;
};

/**
 * Woche zusammensetzen: Hauptgericht je Tag aus eigenen Einträgen, festen
 * Gerichten und Wunsch, dazu Ausflugstage, Cheat Day, Kategorie-Hinweise und
 * Reste vom Vortag. `leftoversBefore` = doppelt gekochtes Gericht am Tag vor
 * dem ersten Tag (aus der Vorwoche), siehe `composeWeek`.
 */
function buildWeek(
  weekStart: string,
  profile: HouseholdProfile | null,
  weekPlan: WeekPlan | null,
  stored: Record<string, StoredEntry>,
  recipes: Record<string, Recipe>,
  leftoversBefore: string | null = null,
): PlanWeek {
  const rules = weekPlan ?? profile?.weekRules;
  const activeWish = weekPlan && weekPlan.wish && wishIsActive(weekPlan) ? weekPlan.wish : null;

  const derivedFor = (weekday: string): ResolvedEntry | null => {
    if (activeWish && activeWish.weekday === weekday) {
      const kid = profile?.persons.find((p) => p.id === activeWish.kidId);
      return {
        origin: "wunsch",
        stored: { kind: "wish", kidId: activeWish.kidId, text: activeWish.text },
        title: activeWish.text.trim() || "Wunsch kommt noch",
        category: null,
        kidName: kid && profile ? personLabel(kid, profile.persons) : "Kind",
        double: false,
      };
    }
    const fixed = weekPlan?.fixedMeals.find((m) => m.weekday === weekday);
    if (fixed) {
      return {
        origin: "fest",
        stored: { kind: "recipe", recipeId: fixed.recipeId, title: fixed.title, category: fixed.category },
        title: recipes[fixed.recipeId]?.title ?? fixed.title,
        category: fixed.category,
        recipeId: fixed.recipeId,
        double: false,
      };
    }
    return null;
  };

  const resolveStored = (entry: MealEntry): ResolvedEntry => {
    const double = entry.double === true;
    if (entry.kind === "recipe") {
      const recipe = recipes[entry.recipeId];
      return {
        origin: "eigen",
        stored: entry,
        title: recipe?.title ?? entry.title,
        category: recipe?.category ?? entry.category,
        recipeId: entry.recipeId,
        double,
      };
    }
    if (entry.kind === "wish") {
      const kid = profile?.persons.find((p) => p.id === entry.kidId);
      return {
        origin: "eigen",
        stored: entry,
        title: entry.text.trim() || "Wunsch kommt noch",
        category: null,
        kidName: kid && profile ? personLabel(kid, profile.persons) : "Kind",
        double,
      };
    }
    return { origin: "eigen", stored: entry, title: entry.title, category: entry.category, double };
  };

  // Die Woche beginnt am Einkaufstag, nicht unbedingt am Montag.
  const days: PlanDay[] = weekDayNames(weekStart).map((weekday, i) => {
    const key = slotKey(weekday);
    const s = stored[key];
    const derived = derivedFor(weekday);
    const entry = s && s.kind !== "note" ? (s.kind === "cleared" ? null : resolveStored(s)) : derived;
    const note = stored[noteKey(weekday)];
    const date = addDays(weekStart, i);
    const paused = pausedOn(profile, date);
    const style = profile?.weekendStyle ?? "locker";
    return {
      weekday,
      date,
      away: Boolean(weekPlan?.awayDays.includes(weekday)) || paused,
      paused,
      weekend: isWeekendDay(weekday) && style !== "normal" ? style : null,
      cheat: Boolean(rules?.cheatDay && rules.cheatDayWeekday === weekday),
      slot: { key, entry, hint: null, hasDerived: Boolean(derived) },
      mealTime: mainMealTime(profile, weekday),
      // Nur für diesen Tag umgerechnet (z. B. "heute sind wir nur zu zweit")
      persons: entry && entry.stored.kind !== "wish" && entry.stored.persons ? entry.stored.persons : profile ? mainMealHeadcount(profile, weekday) : null,
      note: note?.kind === "note" ? note.text : "",
      leftovers: null,
    };
  });

  // Reste: wer doppelt kocht, hat am nächsten Tag eine zweite Mahlzeit
  days.forEach((day, i) => {
    const before = i === 0 ? null : days[i - 1];
    day.leftovers = i === 0 ? leftoversBefore : !before!.away && before!.slot.entry?.double ? before!.slot.entry.title : null;
  });

  // Zählen, was schon geplant ist
  const counts = {
    fleisch: { planned: 0, target: rules?.meatDays ?? 0 },
    vegetarisch: { planned: 0, target: rules?.vegetarianDays ?? 0 },
    fisch: { planned: 0, target: rules?.fishDays ?? 0 },
  };
  let planned = 0;
  let total = 0;
  for (const day of days) {
    if (day.away) continue;
    // Freies Wochenende zählt nicht mit, außer es steht doch etwas drin
    if (day.weekend === "frei" && !day.slot.entry) continue;
    total++;
    const entry = day.slot.entry;
    if (!entry) continue;
    planned++;
    if (entry.category && CATEGORY_COUNT_KEY[entry.category]) counts[entry.category as keyof typeof counts].planned++;
  }

  // Hinweise für freie Tage: nicht unterwegs, ohne Gericht.
  const remaining = {
    fleisch: Math.max(0, counts.fleisch.target - counts.fleisch.planned),
    vegetarisch: Math.max(0, counts.vegetarisch.target - counts.vegetarisch.planned),
    fisch: Math.max(0, counts.fisch.target - counts.fisch.planned),
  };
  let previous: RecipeCategory | null = null;
  for (const day of days) {
    if (day.away || day.slot.entry || day.weekend === "frei") continue;
    if (day.cheat) {
      day.slot.hint = "cheatday";
      continue;
    }
    // Kategorie mit dem meisten Rest, möglichst nicht zweimal hintereinander
    const options = (Object.keys(remaining) as (keyof typeof remaining)[])
      .filter((c) => remaining[c] > 0)
      .sort((a, b) => remaining[b] - remaining[a]);
    const pick = options.find((c) => c !== previous) ?? options[0];
    if (!pick) continue;
    day.slot.hint = pick;
    remaining[pick]--;
    previous = pick;
  }

  return { weekStart, days, hasPlanRules: Boolean(weekPlan), planned, total, counts };
}

/**
 * Woche aus den gespeicherten Daten – inkl. Reste vom letzten Tag der
 * Vorwoche für den ersten Tag.
 */
export function composeWeek(
  weekStart: string,
  profile: HouseholdProfile | null,
  weekPlans: Record<string, WeekPlan>,
  mealPlans: Record<string, Record<string, StoredEntry>>,
  recipes: Record<string, Recipe>,
): PlanWeek {
  const prevStart = addDays(weekStart, -7);
  const prev = buildWeek(prevStart, profile, planForWeek(weekPlans, prevStart), storedForWeek(mealPlans, prevStart), recipes);
  const last = prev.days[prev.days.length - 1];
  const leftovers = !last.away && last.slot.entry?.double ? last.slot.entry.title : null;
  return buildWeek(weekStart, profile, planForWeek(weekPlans, weekStart), storedForWeek(mealPlans, weekStart), recipes, leftovers);
}

// --- Speicherung ------------------------------------------------------------

function migrateEntry(raw: unknown, version: number): StoredEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const cat = (v: unknown) =>
    ["fleisch", "vegetarisch", "fisch", "cheatday"].includes(v as string) ? (v as RecipeCategory) : null;
  const double = e.double === true ? { double: true } : {};
  const spontan = e.spontan === true ? { spontan: true } : {};
  const persons = typeof e.persons === "number" && e.persons >= 1 && e.persons <= 30 ? { persons: Math.round(e.persons) } : {};
  switch (e.kind) {
    case "cleared":
      return { kind: "cleared" };
    case "note":
      return typeof e.text === "string" ? { kind: "note", text: e.text } : null;
    case "recipe":
      return typeof e.recipeId === "string" && typeof e.title === "string"
        ? { kind: "recipe", recipeId: e.recipeId, title: e.title, category: cat(e.category) ?? "vegetarisch", ...double, ...spontan, ...persons }
        : null;
    case "text":
      if (typeof e.title !== "string") return null;
      // Bis v1 wurde der Platz-Hinweis als Kategorie übernommen ("Milchreis" → Fisch):
      // einmalig aus dem Gericht neu bestimmen, ohne Treffer keine Kategorie.
      return { kind: "text", title: e.title, category: version < 2 ? guessDishCategory(e.title) : cat(e.category), ...double, ...spontan, ...persons };
    case "wish":
      return typeof e.kidId === "string"
        ? { kind: "wish", kidId: e.kidId, text: typeof e.text === "string" ? e.text : "", ...double }
        : null;
    default:
      return null;
  }
}

const entryTitle = (e: StoredEntry): string =>
  e.kind === "recipe" || e.kind === "text" ? e.title : e.kind === "wish" ? e.text || "Wunsch" : "";

/**
 * Bis v2 gab es je Tag bis zu zwei Plätze ("Montag|mittags", "Montag|abends").
 * Jetzt: das Gericht der Hauptmahlzeit (laut Profil) bleibt Hauptgericht, das
 * andere wird als Notiz am Tag erhalten – es geht nichts verloren. Gibt es nur
 * eins, wird es das Hauptgericht.
 */
function toOnePerDay(entries: Record<string, StoredEntry>, profile: HouseholdProfile | null): Record<string, StoredEntry> {
  const result: Record<string, StoredEntry> = {};
  const weekdays = new Set(Object.keys(entries).map((k) => k.split("|")[0]));
  for (const weekday of weekdays) {
    const main = mainMealTime(profile, weekday);
    const other: MealTime = main === "abends" ? "mittags" : "abends";
    let first: StoredEntry | undefined = entries[`${weekday}|${main}`];
    let second: StoredEntry | undefined = entries[`${weekday}|${other}`];
    if (!first && second) [first, second] = [second, undefined];
    if (first) result[slotKey(weekday)] = first;
    const secondTitle = second ? entryTitle(second) : "";
    if (secondTitle) result[noteKey(weekday)] = { kind: "note", text: `${other === "mittags" ? "Mittags" : "Abends"}: ${secondTitle}` };
  }
  return result;
}

function migrateStore(raw: unknown): MealPlanStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; weeks?: Record<string, unknown> };
  if (![1, 2, 3].includes(data.version as number) || !data.weeks || typeof data.weeks !== "object") return null;
  const version = data.version as number;
  const profile = version < 3 ? loadProfile() : null;
  const weeks: MealPlanStore["weeks"] = {};
  for (const [week, entries] of Object.entries(data.weeks)) {
    if (!entries || typeof entries !== "object") continue;
    let migrated: Record<string, StoredEntry> = {};
    for (const [key, entry] of Object.entries(entries as Record<string, unknown>)) {
      const e = migrateEntry(entry, version);
      if (e) migrated[key] = e;
    }
    if (version < 3) migrated = toOnePerDay(migrated, profile);
    weeks[week] = migrated;
  }
  return { version: 3, weeks };
}

const store = createLocalStore(STORAGE_KEY, migrateStore);

/** Wie `updateWeek`, aber rein: neue Wochen-Map zurückgeben */
export function mealPlansWithWeek(
  weeks: Record<string, Record<string, StoredEntry>>,
  weekStart: string,
  change: (entries: Record<string, StoredEntry>) => Record<string, StoredEntry>,
): Record<string, Record<string, StoredEntry>> {
  // Neue Woche (z. B. nach Wechsel des Einkaufstags) übernimmt die überlappenden Einträge.
  return { ...weeks, [weekStart]: change({ ...storedForWeek(weeks, weekStart) }) };
}

function updateWeek(
  weekStart: string,
  change: (entries: Record<string, StoredEntry>) => Record<string, StoredEntry>,
) {
  const current = store.load() ?? { version: 3 as const, weeks: {} };
  store.save({ ...current, weeks: mealPlansWithWeek(current.weeks, weekStart, change) });
  noteUserAction(todayIso());
}

// Reine Änderungen an den Einträgen einer Woche – genutzt vom Wochenplan und
// vom Küchenhelfer (Vorschau und Übernehmen), damit beide gleich rechnen.

/** Platz leeren; Einträge aus dem Wochen-Check werden dafür überschrieben. */
export function entriesWithoutSlot(entries: Record<string, StoredEntry>, slot: DaySlot): Record<string, StoredEntry> {
  const next = { ...entries };
  if (slot.hasDerived) next[slot.key] = { kind: "cleared" };
  else delete next[slot.key];
  return next;
}

/** Eintrag auf einen anderen Platz verschieben; ist der belegt, wird getauscht. */
export function entriesWithMove(
  entries: Record<string, StoredEntry>,
  from: DaySlot,
  to: DaySlot,
): Record<string, StoredEntry> {
  if (!from.entry || from.key === to.key) return entries;
  const next = { ...entries, [to.key]: from.entry.stored };
  if (to.entry) next[from.key] = to.entry.stored;
  else if (from.hasDerived) next[from.key] = { kind: "cleared" };
  else delete next[from.key];
  return next;
}

/**
 * Doppelt kochen an/aus. Bei Gerichten aus dem Wochen-Check wird dafür ein
 * eigener Eintrag mit demselben Gericht angelegt.
 */
export function entriesWithDouble(entries: Record<string, StoredEntry>, slot: DaySlot, double: boolean): Record<string, StoredEntry> {
  if (!slot.entry) return entries;
  const { double: _old, ...rest } = slot.entry.stored;
  void _old;
  return { ...entries, [slot.key]: double ? { ...rest, double: true } : rest };
}

/** Notiz am Tag setzen; leer = entfernen */
function entriesWithNote(entries: Record<string, StoredEntry>, weekday: string, text: string): Record<string, StoredEntry> {
  const next = { ...entries };
  if (text.trim()) next[noteKey(weekday)] = { kind: "note", text: text.trim() };
  else delete next[noteKey(weekday)];
  return next;
}

/** Eintrag auf einen Platz setzen (neu oder tauschen) */
export function setEntry(weekStart: string, key: string, entry: Exclude<StoredEntry, { kind: "cleared" }>) {
  updateWeek(weekStart, (entries) => ({ ...entries, [key]: entry }));
}

/** Platz leeren; Einträge aus dem Wochen-Check werden dafür überschrieben. */
export function clearSlot(weekStart: string, slot: DaySlot) {
  updateWeek(weekStart, (entries) => entriesWithoutSlot(entries, slot));
}

/** Eintrag auf einen anderen Platz verschieben; ist der belegt, wird getauscht. */
export function moveEntry(weekStart: string, from: DaySlot, to: DaySlot) {
  updateWeek(weekStart, (entries) => entriesWithMove(entries, from, to));
}

export function setDouble(weekStart: string, slot: DaySlot, double: boolean) {
  updateWeek(weekStart, (entries) => entriesWithDouble(entries, slot, double));
}

export function setNote(weekStart: string, weekday: string, text: string) {
  updateWeek(weekStart, (entries) => entriesWithNote(entries, weekday, text));
}

/** Alle gespeicherten Einträge (ohne React, z. B. für Aufräumen/Rückgängig) */
export function loadMealPlans(): Record<string, Record<string, StoredEntry>> {
  return store.load()?.weeks ?? {};
}

/** Alle Wochen auf einmal ersetzen (Küchenhelfer: Übernehmen/Rückgängig) */
export function replaceMealPlans(weeks: Record<string, Record<string, StoredEntry>>) {
  store.save({ version: 3, weeks });
}

const EMPTY: Record<string, StoredEntry> = {};

/** Gespeicherte Einträge aller Wochen (`undefined` = noch nicht geladen) */
export function useMealPlans(): Record<string, Record<string, StoredEntry>> | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.weeks ?? EMPTY_WEEKS;
}

const EMPTY_WEEKS: Record<string, Record<string, StoredEntry>> = {};

/** Einträge der Woche – nach Wechsel des Einkaufstags auch aus der überlappenden Woche */
function storedForWeek(
  weeks: Record<string, Record<string, StoredEntry>>,
  weekStart: string,
): Record<string, StoredEntry> {
  const key = resolveWeekKey(Object.keys(weeks), weekStart);
  return key ? weeks[key] : EMPTY;
}
