"use client";

// Ideen für heute (Essen-Kachel, Tausch-Fenster): Zustand des Tages
// (weggewischt, welche gerade dran ist).

import { useRecipes } from "@/lib/essen/cookbook";
import { ideasFor, recentDishes, type Idea, type IdeaFilter } from "@/lib/essen/ideas";
import { createLocalStore } from "@/lib/core/localStore";
import { useMealPlans } from "@/lib/essen/mealPlan";
import { stockKey, stockNearlyEmpty } from "@/lib/essen/dishIdeas";
import { useStock } from "@/lib/essen/useStock";
import type { HouseholdProfile } from "@/lib/einstellungen/profile";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { toIsoDate, useToday, useWeekPlans } from "@/lib/essen/weekPlan";
import { useWishes } from "@/lib/essen/wishes";
import type { Recipe } from "@/lib/essen/cookbook";
import { useIdeenGezeigt } from "@/lib/essen/ideenGezeigt";

/** `key`: Bestand, zu dem `index` gehört – ändert sich der Bestand, beginnt es wieder vorn */
type IdeaDay = { version: 1; date: string; dismissed: string[]; index: number; key?: string };

function migrate(raw: unknown): IdeaDay | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<IdeaDay>;
  if (d.version !== 1 || typeof d.date !== "string") return null;
  return {
    version: 1,
    date: d.date,
    dismissed: Array.isArray(d.dismissed) ? d.dismissed.filter((x) => typeof x === "string") : [],
    index: Number(d.index) || 0,
    key: typeof d.key === "string" ? d.key : undefined,
  };
}

const store = createLocalStore("wasgibts.ideen", migrate);

type TodayIdeas = {
  ideas: Idea[];
  index: number;
  profile: HouseholdProfile;
  recipes: Record<string, Recipe>;
  today: Date;
  todayIso: string;
  /** Kennung des Bestands (für nextIdea) */
  stockKey: string;
  /** Vorrat leer oder fast leer → Hinweis "Sag mir, was da ist …" */
  nearlyEmpty: boolean;
};

/** Ideen für heute (`undefined` = lädt, `null` = kein Profil) */
export function useTodayIdeas(filters: IdeaFilter[] = [], opts: { tomorrow?: boolean } = {}): TodayIdeas | null | undefined {
  const now = useToday();
  // Nach dem Essen: Ideen für morgen ("Was gibt's morgen?")
  const today = now && opts.tomorrow ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12) : now;
  const profile = useProfile();
  const recipes = useRecipes();
  // Immer der aktuelle Bestand (Vorrat + Gekauftes) – Ideen rechnen sich bei jeder Änderung neu
  const pantry = useStock();
  const wishes = useWishes();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const state = useExternalStore(store.subscribe, store.load, () => undefined);
  const shown = useIdeenGezeigt();
  if (!today || profile === undefined || !recipes || !pantry || !wishes || !weekPlans || !mealPlans || state === undefined) return undefined;
  if (!profile) return null;
  const todayIso = toIsoDate(today);
  const key = stockKey(pantry);
  // Bestand geändert → die gemerkte Position gilt nicht mehr, es beginnt bei der besten Idee
  const day = state && state.date === todayIso ? { ...state, index: state.key === key ? state.index : 0 } : { dismissed: [], index: 0 };
  const ideas = ideasFor({
    date: todayIso,
    recipes,
    pantry,
    wishes,
    neverAgain: profile.neverAgain,
    recent: recentDishes(todayIso, profile, weekPlans, mealPlans, recipes),
    dismissed: day.dismissed,
    filters,
    shown,
    persons: profile.persons,
  });
  return { ideas, index: ideas.length ? day.index % ideas.length : 0, profile, recipes, today, todayIso, stockKey: key, nearlyEmpty: stockNearlyEmpty(pantry) };
}

