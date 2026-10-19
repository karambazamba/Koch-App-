// Lieblingswochen: eine Woche als Vorlage speichern (Name) und später für
// eine kommende Woche laden. Gespeichert je Wochentag nur eigene Gerichte
// (Rezept oder Freitext) – Wunsch, Ausflug und Cheat Day kommen aus dem
// Wochen-Check der jeweiligen Woche.

import { useExternalStore } from "../core/useExternalStore";
import { createLocalStore } from "../core/localStore";
import type { RecipeCategory } from "./cookbook";
import { mealPlansWithWeek, replaceMealPlans, slotKey, type PlanWeek, type StoredEntry } from "./mealPlan";
import { now } from "../core/now";

export type TemplateDish =
  | { kind: "recipe"; recipeId: string; title: string; category: RecipeCategory }
  | { kind: "text"; title: string; category: RecipeCategory | null };

export type WeekTemplate = {
  id: string;
  name: string;
  createdAt: string;
  /** Wochentag → Gericht */
  days: Record<string, TemplateDish>;
};

type TemplateStore = { version: 1; templates: WeekTemplate[] };

function migrate(raw: unknown): TemplateStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<TemplateStore>;
  if (d.version !== 1 || !Array.isArray(d.templates)) return null;
  return {
    version: 1,
    templates: d.templates.filter(
      (t): t is WeekTemplate => Boolean(t) && typeof t.id === "string" && typeof t.name === "string" && Boolean(t.days) && typeof t.days === "object",
    ),
  };
}

const store = createLocalStore("wasgibts.vorlagen", migrate);
const EMPTY: WeekTemplate[] = [];

export function useTemplates(): WeekTemplate[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data?.templates ?? EMPTY);
}

/** Gerichte einer Woche als Vorlage (ohne Wunsch) */
export function templateDays(week: PlanWeek): Record<string, TemplateDish> {
  const days: Record<string, TemplateDish> = {};
  for (const day of week.days) {
    const s = day.slot.entry?.stored;
    if (!s || day.away) continue;
    if (s.kind === "recipe") days[day.weekday] = { kind: "recipe", recipeId: s.recipeId, title: s.title, category: s.category };
    else if (s.kind === "text") days[day.weekday] = { kind: "text", title: s.title, category: s.category };
  }
  return days;
}

export function saveTemplate(name: string, week: PlanWeek): WeekTemplate {
  const template: WeekTemplate = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    name: name.trim().slice(0, 40) || "Lieblingswoche",
    createdAt: now().toISOString(),
    days: templateDays(week),
  };
  const current = store.load()?.templates ?? [];
  store.save({ version: 1, templates: [...current.filter((t) => t.name !== template.name), template] });
  return template;
}

export function deleteTemplate(id: string) {
  const current = store.load()?.templates ?? [];
  store.save({ version: 1, templates: current.filter((t) => t.id !== id) });
}

/** Ausgewählte Tage der Vorlage in die Woche übernehmen (überschreibt diese Tage) */
export function applyTemplate(
  mealPlans: Record<string, Record<string, StoredEntry>>,
  weekStart: string,
  template: WeekTemplate,
  weekdays: string[],
) {
  const weeks = mealPlansWithWeek(mealPlans, weekStart, (entries) => {
    const next = { ...entries };
    for (const weekday of weekdays) {
      const dish = template.days[weekday];
      if (dish) next[slotKey(weekday)] = { ...dish };
    }
    return next;
  });
  replaceMealPlans(weeks);
}
