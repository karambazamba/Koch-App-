// Neue Nutzer starten in Hell und im Look „Farbig“. Ab dem 3. Tag einmal leise
// der Hinweis „Lieber schlicht?“ (seit v0.94 statt der Look-Frage beim Start),
// danach einmal, dass es auch Dunkel bzw. Automatisch gibt – nur, wenn nie
// selbst gewählt. Antwort (oder Wahl in den Einstellungen) = nie wieder.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { addDays } from "@/lib/core/now";

type DarkTipState = { version: 1; since: string; done: boolean; look: boolean };

const store = createLocalStore("wasgibts.dunkeltipp", (raw: unknown): DarkTipState | null => {
  if (!raw || typeof raw !== "object" || (raw as DarkTipState).version !== 1) return null;
  const d = raw as DarkTipState;
  return typeof d.since === "string" ? { version: 1, since: d.since, done: d.done === true, look: d.look === true } : null;
});

/** Zeigen? Erst ab 2 Tagen nach dem ersten Öffnen, nie nach einer eigenen Wahl */
export const showDarkTip = (state: DarkTipState | null, today: string, themeSet: boolean) => Boolean(state && !state.done && !themeSet && today >= addDays(state.since, 2));

/** „Lieber schlicht?“ zeigen? Ab dem 3. Tag, nur im Look „Farbig“, einmal */
export const showLookTip = (state: DarkTipState | null, today: string, look: "farbig" | "schlicht") => Boolean(state && !state.look && look === "farbig" && today >= addDays(state.since, 2));

export function finishLookTip() {
  const s = store.load();
  if (s) store.save({ ...s, look: true });
}

/** Erstes Öffnen merken (ab dann zählen die 2 Tage) */
export function noteDarkTipStart(today: string) {
  if (!store.load()) store.save({ version: 1, since: today, done: false, look: false });
}

export function finishDarkTip() {
  const s = store.load();
  if (s) store.save({ ...s, done: true });
}

export function useDarkTip(): DarkTipState | null {
  return useExternalStore(store.subscribe, store.load, () => null);
}
