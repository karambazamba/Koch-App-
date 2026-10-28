// Einmal-Tipps (z. B. der Tipp „Neue Kacheln holen“ beim allerersten
// Bearbeiten der Startseite): einmal gezeigt = nie wieder.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

// „kachel-hinzufuegen“ = alte Sprechblase (bis v0.48.0), „pinnwand-24h“ = alter
// Einmal-Hinweis der Pinnwand (jetzt immer im Kopf); beide bleiben nur als gespeicherte Werte
export type HintId = "kachel-hinzufuegen" | "kachel-tipp" | "mikro-gefragt" | "stimme-angeboten" | "kochtipp-muetze" | "mia-knopf" | "aufgaben-persoenlich" | "mia-name-neu" | "memo-nur-sitzung" | "mikro-homescreen" | "pinnwand-kachel" | "pinnwand-gesten" | "pinnwand-24h" | "pinnwand-kachel-1" | "zu-zweit" | "leiste-neu" | "essen-ziehen" | "einkauf-wagen" | "koch-ohr" | "vorschau-antippen" | "einkauf-merken" | "einkauf-laden-gewaehlt";

type HintState = { version: 1; seen: HintId[] };

const store = createLocalStore("wasgibts.einmalhinweise", (raw: unknown): HintState | null => {
  if (!raw || typeof raw !== "object" || (raw as HintState).version !== 1) return null;
  const seen = (raw as HintState).seen;
  return { version: 1, seen: Array.isArray(seen) ? seen.filter((s): s is HintId => typeof s === "string") : [] };
});

const seenIn = (state: HintState | null, id: HintId) => Boolean(state?.seen.includes(id));

/** Schon gezeigt? (ohne React) @public für Tests */
export function hintSeen(id: HintId): boolean {
  return seenIn(store.load(), id);
}

/** Schon gezeigt? (`undefined` = lädt noch) */
export function useHintSeen(id: HintId): boolean | undefined {
  const state = useExternalStore(store.subscribe, store.load, () => undefined);
  return state === undefined ? undefined : seenIn(state, id);
}

export function markHintSeen(id: HintId) {
  const s = store.load();
  if (s?.seen.includes(id)) return;
  store.save({ version: 1, seen: [...(s?.seen ?? []), id] });
}

/** Tipps, die „Tipps nochmal zeigen“ (Einstellungen → Mia) zurückholt – nie Fragen wie „mikro-gefragt“ */
export const TIPP_HINWEISE: readonly HintId[] = ["einkauf-wagen", "einkauf-merken", "einkauf-laden-gewaehlt"];

/** Einzelne Einmal-Hinweise wieder zeigen */
export function hintsZuruecksetzen(ids: readonly HintId[]) {
  const s = store.load();
  if (!s) return;
  store.save({ version: 1, seen: s.seen.filter((x) => !ids.includes(x)) });
}

/** Alle Einmal-Hinweise wieder zeigen (Daten & App, nur im Testmodus) */
export function resetHints() {
  store.save({ version: 1, seen: [] });
}
