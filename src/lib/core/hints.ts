// Einmalige kleine Hinweise (z. B. Mias Sprechblase unter „+ Kachel“ beim
// allerersten Bearbeiten): einmal gezeigt = nie wieder.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

export type HintId = "kachel-hinzufuegen";

type HintState = { version: 1; seen: HintId[] };

const store = createLocalStore("wasgibts.einmalhinweise", (raw: unknown): HintState | null => {
  if (!raw || typeof raw !== "object" || (raw as HintState).version !== 1) return null;
  const seen = (raw as HintState).seen;
  return { version: 1, seen: Array.isArray(seen) ? seen.filter((s): s is HintId => typeof s === "string") : [] };
});

/** Schon gezeigt? (`undefined` = lädt noch) */
export function useHintSeen(id: HintId): boolean | undefined {
  const state = useExternalStore(store.subscribe, store.load, () => undefined);
  return state === undefined ? undefined : Boolean(state?.seen.includes(id));
}

export function markHintSeen(id: HintId) {
  const s = store.load();
  if (s?.seen.includes(id)) return;
  store.save({ version: 1, seen: [...(s?.seen ?? []), id] });
}
