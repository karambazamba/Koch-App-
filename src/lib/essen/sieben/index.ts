// Essen – die nächsten 7 Tage (Tafel 97): immer ab heute, über die
// Wochengrenze hinweg (gespeichert bleibt je Woche ab dem Einkaufstag).
// Verschieben/Tauschen zwischen zwei Tagen – auch in verschiedenen Wochen –,
// „Kein Kochtag“ und die Zeile „Zuletzt gegessen“. Rein: alles bekommt die
// Wochen und gibt neue zurück (Rückgängig = alte zurückschreiben). Der
// Einkauf wird aus dem Plan berechnet; Zutaten wandern also von selbst mit.

import { addDays } from "@/lib/core/now";
import { createWeekPlan, planForWeek, weekStartFor, type WeekPlan } from "@/lib/essen/weekPlan";
import { entriesWithoutSlot, mealPlansWithWeek, type PlanDay, type StoredEntry } from "@/lib/essen/mealPlan";
import type { WeekRules } from "@/lib/einstellungen/profile";

type Weeks = Record<string, Record<string, StoredEntry>>;

/** Die nächsten 7 Tage ab heute */
export const naechsteSieben = (today: string): string[] => Array.from({ length: 7 }, (_, i) => addDays(today, i));

/** Woche (Startdatum je Einkaufstag), zu der ein Tag gehört */
export const wocheVon = (date: string, shoppingDay: string) => weekStartFor(new Date(`${date}T12:00:00`), shoppingDay || "Montag");

/**
 * Gericht von `von` auf `nach`: ist `nach` belegt, wird getauscht. Klappt über
 * die Wochengrenze (zwei Wochen werden geändert). `null` = nichts zu tun.
 */
export function verschiebe(weeks: Weeks, von: PlanDay, nach: PlanDay, shoppingDay: string): Weeks | null {
  if (!von.slot.entry || von.date === nach.date) return null;
  const wa = wocheVon(von.date, shoppingDay);
  const wb = wocheVon(nach.date, shoppingDay);
  const a = von.slot.entry.stored;
  const b = nach.slot.entry?.stored ?? null;
  // Erst die Quelle leeren (bzw. tauschen), dann das Ziel setzen – auch wenn beide in einer Woche liegen
  let next = mealPlansWithWeek(weeks, wa, (e) => (b ? { ...e, [von.slot.key]: b } : entriesWithoutSlot(e, von.slot)));
  next = mealPlansWithWeek(next, wb, (e) => ({ ...e, [nach.slot.key]: a }));
  return next;
}

/** Text der Meldung: „Getauscht“ bzw. „Verschoben“ */
export const verschiebeText = (nach: PlanDay) => (nach.slot.entry ? "Getauscht" : "Verschoben");

/** „Kein Kochtag“: Tag als unterwegs markieren (Gericht bleibt gespeichert, zählt aber nicht) */
export function keinKochtag(plans: Record<string, WeekPlan>, day: PlanDay, shoppingDay: string, rules: WeekRules): Record<string, WeekPlan> {
  const start = wocheVon(day.date, shoppingDay);
  const base = planForWeek(plans, start) ?? createWeekPlan(start, rules);
  if (base.awayDays.includes(day.weekday)) return plans;
  return { ...plans, [start]: { ...base, awayDays: [...base.awayDays, day.weekday] } };
}

/** Wieder ein Kochtag */
export function dochKochtag(plans: Record<string, WeekPlan>, day: PlanDay, shoppingDay: string): Record<string, WeekPlan> {
  const start = wocheVon(day.date, shoppingDay);
  const base = planForWeek(plans, start);
  if (!base || !base.awayDays.includes(day.weekday)) return plans;
  return { ...plans, [start]: { ...base, awayDays: base.awayDays.filter((d) => d !== day.weekday) } };
}

/** „Zuletzt gegessen“: die letzten 14 Tage vor heute, neueste zuerst */
export function zuletztGegessen(cooked: Record<string, { title: string; recipeId?: string }>, today: string): { date: string; title: string; recipeId?: string }[] {
  const from = addDays(today, -14);
  return Object.entries(cooked)
    .filter(([d]) => d >= from && d < today)
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, c]) => ({ date, title: c.title, ...(c.recipeId ? { recipeId: c.recipeId } : {}) }));
}

/** „Heute · Di 27.“, „Morgen · Mi 28.“, sonst „Do 29.“ */
export function tagLabel(date: string, today: string, kurz: (iso: string) => string): string {
  const tag = `${kurz(date)} ${Number(date.slice(8, 10))}.`;
  return date === today ? `Heute · ${tag}` : date === addDays(today, 1) ? `Morgen · ${tag}` : tag;
}

/** Kopf des Tag-Fensters: „DONNERSTAG · 29.10. · 18:30“ */
export const fensterKopf = (date: string, lang: (iso: string) => string, clock: string | null) =>
  [lang(date).toUpperCase(), `${date.slice(8, 10)}.${date.slice(5, 7)}.`, clock].filter(Boolean).join(" · ");
