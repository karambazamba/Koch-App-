// Speicher Sport (`wasgibts.sport` v2, persönlich – später im Konto, nicht
// automatisch mit der Familie geteilt). v1 → v2 (A-044 Stempelkarte): das
// Wochenziel darf leer sein („Ohne Ziel“), dazu `zielGefragt` und
// `erinnerung` (Standard aus). Wer v1 hatte, behält sein Ziel (früherer
// Standard 3) und wird nicht noch einmal gefragt.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { EMPTY_SPORT, sanitizeSport, validGoal, type SportState } from "@/lib/sport/model";

type Stored = { version: 2 } & SportState;

/** Früherer Standard des Wochenziels (v1) */
const V1_GOAL = 3;

export function migrateSport(raw: unknown): Stored | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { version?: unknown; goal?: unknown };
  if (r.version === 1) return { version: 2, ...sanitizeSport({ ...r, goal: validGoal(r.goal) ?? V1_GOAL, zielGefragt: true, erinnerung: false }) };
  if (r.version === 2) return { version: 2, ...sanitizeSport(raw) };
  return null;
}

const store = createLocalStore("wasgibts.sport", migrateSport);

export const loadSport = (): SportState => store.load() ?? EMPTY_SPORT;

export function saveSport(state: SportState) {
  store.save({ version: 2, ...sanitizeSport(state) });
}

/** Änderung anwenden; liefert das Zurücknehmen */
export function changeSport(change: (s: SportState) => SportState): () => void {
  const before = loadSport();
  saveSport(change(before));
  return () => store.save({ version: 2, ...before });
}

export function useSport(): SportState | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? EMPTY_SPORT);
}
