"use client";

// „von Felix“ klein unter einer Aufgabe, die man bekommen hat (Tafel 52 B),
// bzw. „erledigt von Lisa“ (A-034). Steht jemand noch nicht in der
// gespeicherten Mitgliederliste (eben beigetreten), einmal neu nachfragen.

import { useEffect } from "react";
import { useCachedAccount } from "@/lib/konten/cache";
import { fromLabel, unbekannteMitglieder } from "@/lib/kalender/abgeben/model";
import type { DayItem } from "@/lib/kalender/model";

/** Schon nachgefragt (je Konto-ID einmal pro Sitzung) */
const gefragt = new Set<string>();

export function TaskFrom({ item, className }: { item: DayItem; className?: string }) {
  const household = useCachedAccount().household;
  const fehlt = household ? unbekannteMitglieder(item.entry, household.me.userId, household.members).filter((id) => !gefragt.has(id)) : [];
  const nachfragen = fehlt.join(" ");
  useEffect(() => {
    if (!nachfragen) return;
    for (const id of nachfragen.split(" ")) gefragt.add(id);
    void import("@/lib/konten/account").then((m) => m.refreshAccount());
  }, [nachfragen]);
  if (!household || item.entry.typ !== "aufgabe") return null;
  const label = fromLabel(item.entry, household.me.userId, household.members);
  return label ? <span className={className}>{label}</span> : null;
}
