// Stand des Abgleichs für die Oberfläche (klein, ohne Supabase): Übernahme
// fragen? Wie viel wartet? Seit wann ohne Verbindung? Der Abgleich selbst
// (runner.ts) wird erst geladen, wenn es einen Haushalt gibt.

import { useExternalStore } from "@/lib/core/useExternalStore";

export type SyncStatus = {
  /** aus = kein Haushalt; uebernahme = Frage „Mitnehmen?“; bereit = gleicht ab */
  phase: "aus" | "uebernahme" | "bereit";
  /** „3 Termine und 5 Aufgaben“ (nur bei der Übernahme) */
  summary: string;
  /** Wartende Änderungen */
  pending: number;
  /** Seit wann (ms) ohne Verbindung; null = verbunden */
  offlineSince: number | null;
};

const OFF: SyncStatus = { phase: "aus", summary: "", pending: 0, offlineSince: null };
let status = OFF;
const listeners = new Set<() => void>();

export function setSyncStatus(next: Partial<SyncStatus>) {
  const merged = { ...status, ...next };
  if ((Object.keys(merged) as (keyof SyncStatus)[]).every((k) => merged[k] === status[k])) return;
  status = merged;
  listeners.forEach((l) => l());
}

export const resetSyncStatus = () => setSyncStatus(OFF);

export function useSyncStatus(): SyncStatus {
  return useExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => status,
    () => OFF,
  );
}

/** Hinweis „Offline – wird gleich abgeglichen“ erst nach über einer Minute und nur, wenn etwas wartet */
export const showOfflineHint = (s: SyncStatus, nowMs: number): boolean => s.phase === "bereit" && s.pending > 0 && s.offlineSince !== null && nowMs - s.offlineSince > 60_000;
