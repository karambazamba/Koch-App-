// Hinweis-Warteschlange der Startseite (Launch 1.0): höchstens EIN Hinweis
// unter der Jetzt-Karte und höchstens EINE schwebende Blase je Öffnen. Jeder
// Hinweis nur einmal: an dem Tag, an dem er zuerst steht, bleibt er; ab dem
// nächsten Tag ist er weg (auch ohne Antippen). In den ersten 3 Tagen nur der
// Beispiel-Tag und die Blase „Schreiben & sprechen“ – Ausnahme „Ich heiße jetzt
// Mia“ (alte Installationen, sichern vor dem Neu-Hinzufügen; bis „✕“) und
// „Unten findest du jetzt …“ (Leiste unten, wer die App schon vorher hatte).

import { addDays } from "@/lib/core/now";
import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

/** Hinweise unter der Jetzt-Karte, in dieser Reihenfolge */
const HINWEISE = ["mia-name-neu", "leiste-neu", "einladen", "spendentopf", "startseite-halten", "lieber-schlicht", "abends-dunkel"] as const;
export type HinweisId = (typeof HINWEISE)[number];

/** Erst ab dem 4. Tag (Tag 0–2 = Beispiel-Tag und „Schreiben & sprechen“) */
export const RUHE_TAGE = 3;

type State = { version: 1; gezeigt: Partial<Record<HinweisId, string>> };

const store = createLocalStore("wasgibts.hinweise", (raw: unknown): State | null => {
  if (!raw || typeof raw !== "object" || (raw as State).version !== 1) return null;
  const g = (raw as State).gezeigt;
  const gezeigt: State["gezeigt"] = {};
  if (g && typeof g === "object") for (const id of HINWEISE) if (typeof g[id] === "string") gezeigt[id] = g[id];
  return { version: 1, gezeigt };
});

/** Schon an einem früheren Tag gestanden = nie wieder */
export const abgelaufen = (gezeigt: State["gezeigt"], id: HinweisId, today: string) => Boolean(gezeigt[id] && gezeigt[id]! < today);

/**
 * Welcher Hinweis steht heute unter der Jetzt-Karte? (rein)
 * `aktiv`: was gerade zeigen würde (jeder Hinweis prüft seine eigene Regel);
 * `since`: erster Tag der App; `demo`: Beispiel-Tag läuft.
 */
export function naechsterHinweis(aktiv: Partial<Record<HinweisId, boolean>>, opts: { today: string; since: string | null; demo: boolean; gezeigt: State["gezeigt"] }): HinweisId | null {
  // „Ich heiße jetzt Mia“ betrifft nur alte Installationen und schützt vor Datenverlust: immer zuerst, auch in der Ruhezeit
  if (aktiv["mia-name-neu"]) return "mia-name-neu";
  if (opts.demo) return null;
  // Leiste unten neu (Tafel 96): wer die App schon vorher hatte, hört es gleich einmal
  if (aktiv["leiste-neu"] && opts.since && opts.since < opts.today && !abgelaufen(opts.gezeigt, "leiste-neu", opts.today)) return "leiste-neu";
  if (!opts.since || opts.today < addDays(opts.since, RUHE_TAGE)) return null;
  return HINWEISE.find((id) => aktiv[id] && !abgelaufen(opts.gezeigt, id, opts.today)) ?? null;
}

/** Steht er heute zum ersten Mal: merken (ab morgen weg) */
export function hinweisGezeigt(id: HinweisId, today: string) {
  const s = store.load() ?? { version: 1 as const, gezeigt: {} };
  if (s.gezeigt[id]) return;
  store.save({ version: 1, gezeigt: { ...s.gezeigt, [id]: today } });
}

const EMPTY: State["gezeigt"] = {};

export function useHinweiseGezeigt(): State["gezeigt"] | undefined {
  return useExternalStore(store.subscribe, () => store.load()?.gezeigt ?? EMPTY, () => undefined);
}

/** Alle Hinweise wieder zeigen (Einstellungen → Mia „Tipps nochmal zeigen“) */
export function hinweiseZuruecksetzen() {
  store.save({ version: 1, gezeigt: {} });
}
