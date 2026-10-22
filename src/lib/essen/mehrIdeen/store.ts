// „Mehr Ideen“ lernt still mit (`wasgibts.ideenmix` v1): Antippen, „Machen
// wir“ und Kochen zählen als Interesse (Gericht, Art, Aufwand, Kategorie);
// gezeigt, aber über Wochen nie angetippt = seltener. Keine Zähler sichtbar.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import type { Recipe } from "@/lib/essen/cookbook";
import { recipeKind } from "@/lib/essen/kochen";
import type { Interest } from "@/lib/essen/mehrIdeen/mix";

type State = Interest & { version: 1; day: string };

const numbers = (v: unknown): Record<string, number> =>
  v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, n]) => typeof n === "number" && Number.isFinite(n)) as [string, number][]) : {};

const store = createLocalStore("wasgibts.ideenmix", (raw: unknown): State | null => {
  if (!raw || typeof raw !== "object" || (raw as State).version !== 1) return null;
  const d = raw as Partial<State>;
  return { version: 1, day: typeof d.day === "string" ? d.day : "", taps: numbers(d.taps), seen: numbers(d.seen), kinds: numbers(d.kinds) };
});

const EMPTY: State = { version: 1, day: "", taps: {}, seen: {}, kinds: {} };
const load = () => store.load() ?? EMPTY;

export function useIdeaInterest(): Interest {
  return useExternalStore(store.subscribe, load, () => EMPTY);
}

/** Interesse an einem Gericht (Antippen, Machen wir, Kochen) */
export function noteIdeaInterest(r: Recipe) {
  const s = load();
  const { aufwand, art } = recipeKind(r);
  const kinds = { ...s.kinds };
  for (const k of [`cat:${r.category}`, `aufwand:${aufwand}`, `art:${art}`]) kinds[k] = Math.min(30, (kinds[k] ?? 0) + 1);
  store.save({ ...s, taps: { ...s.taps, [r.id]: (s.taps[r.id] ?? 0) + 1 }, kinds });
}

/** Einmal am Tag merken, was gezeigt wurde */
export function noteIdeasShown(ids: string[], today: string) {
  const s = load();
  if (s.day === today) return;
  const seen = { ...s.seen };
  for (const id of ids) seen[id] = Math.min(60, (seen[id] ?? 0) + 1);
  store.save({ ...s, day: today, seen });
}
