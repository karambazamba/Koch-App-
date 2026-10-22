// Neue Nutzer starten in Hell. Ab dem 3. Tag einmal leise der Hinweis, dass es
// auch Dunkel bzw. Automatisch gibt – nur, wenn die Ansicht nie selbst gewählt
// wurde. Antwort (oder Wahl in den Einstellungen) = nie wieder.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { addDays } from "@/lib/core/now";

type DarkTipState = { version: 1; since: string; done: boolean };

const store = createLocalStore("wasgibts.dunkeltipp", (raw: unknown): DarkTipState | null => {
  if (!raw || typeof raw !== "object" || (raw as DarkTipState).version !== 1) return null;
  const d = raw as DarkTipState;
  return typeof d.since === "string" ? { version: 1, since: d.since, done: d.done === true } : null;
});

/** Zeigen? Erst ab 2 Tagen nach dem ersten Öffnen, nie nach einer eigenen Wahl */
export const showDarkTip = (state: DarkTipState | null, today: string, themeSet: boolean) => Boolean(state && !state.done && !themeSet && today >= addDays(state.since, 2));

/** Erstes Öffnen merken (ab dann zählen die 2 Tage) */
export function noteDarkTipStart(today: string) {
  if (!store.load()) store.save({ version: 1, since: today, done: false });
}

export function finishDarkTip() {
  const s = store.load();
  if (s) store.save({ ...s, done: true });
}

export function useDarkTip(): DarkTipState | null {
  return useExternalStore(store.subscribe, store.load, () => null);
}
