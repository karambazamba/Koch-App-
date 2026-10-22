// Speicher der Timer (`wasgibts.timer` v1, pro Gerät). Timer stehen mit ihrer
// Endzeit drin – nach Hintergrund, Sperre oder Neustart stimmt alles sofort.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { now } from "@/lib/core/now";
import { EMPTY_TIMERS, pruneTimers, sanitizeTimers, type TimerState } from "@/lib/timer/model";

type Stored = { version: 1 } & TimerState;

const store = createLocalStore("wasgibts.timer", (raw: unknown): Stored | null => {
  if (!raw || typeof raw !== "object" || (raw as Stored).version !== 1) return null;
  return { version: 1, ...sanitizeTimers(raw) };
});

export const loadTimers = (): TimerState => store.load() ?? EMPTY_TIMERS;

function saveTimers(state: TimerState) {
  store.save({ version: 1, ...pruneTimers(state, now().getTime()) });
}

/** Änderung anwenden; liefert das Zurücknehmen */
export function changeTimers(change: (s: TimerState, nowMs: number) => TimerState): () => void {
  const before = loadTimers();
  saveTimers(change(before, now().getTime()));
  return () => store.save({ version: 1, ...before });
}

export function useTimers(): TimerState | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? EMPTY_TIMERS);
}
