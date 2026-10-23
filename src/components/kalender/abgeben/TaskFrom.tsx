"use client";

// „von Felix“ klein unter einer Aufgabe, die man bekommen hat (Tafel 52 B)

import { useCachedAccount } from "@/lib/konten/cache";
import { fromLabel } from "@/lib/kalender/abgeben/model";
import type { DayItem } from "@/lib/kalender/model";

export function TaskFrom({ item, className }: { item: DayItem; className?: string }) {
  const household = useCachedAccount().household;
  if (!household || item.entry.typ !== "aufgabe") return null;
  const label = fromLabel(item.entry, household.me.userId, household.members);
  return label ? <span className={className}>{label}</span> : null;
}
