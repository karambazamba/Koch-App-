// Mikro-Protokoll zum Nachschauen (Einstellungen → Daten & App, versteckt:
// 5× auf die Version tippen): die letzten 20 Ereignisse rund um Mikrofon und
// Sprachnachrichten mit Uhrzeit – Tipp, getUserMedia ok/Fehlername,
// Recorder-Start, Bytes, Speichern ok/Fehlername, Notlösung ja/nein. Nur auf
// dem Gerät, nicht in der Sicherung und nie an die KI.

import { createLocalStore } from "@/lib/core/localStore";
import { now } from "@/lib/core/now";
import { useExternalStore } from "@/lib/core/useExternalStore";

const MAX = 20;

export type MicLogEntry = { at: number; text: string };
type MicLogState = { version: 1; entries: MicLogEntry[] };

/** Nur gültige Einträge, höchstens die letzten 20 */
export function migrateMicLog(raw: unknown): MicLogState | null {
  if (!raw || typeof raw !== "object" || (raw as MicLogState).version !== 1) return null;
  const list = Array.isArray((raw as MicLogState).entries) ? (raw as MicLogState).entries : [];
  return { version: 1, entries: list.filter((e): e is MicLogEntry => Boolean(e) && typeof e.at === "number" && typeof e.text === "string").slice(-MAX) };
}

const store = createLocalStore("wasgibts.mikroprotokoll", migrateMicLog);

/** Ein Ereignis festhalten (still – schlägt das Speichern fehl, passiert nichts) */
export function micLog(text: string) {
  try {
    const entries = [...(store.load()?.entries ?? []), { at: now().getTime(), text: text.slice(0, 120) }].slice(-MAX);
    store.save({ version: 1, entries });
  } catch {
    // Protokoll ist nur zum Nachschauen
  }
}

export function useMicLog(): MicLogEntry[] {
  return useExternalStore(store.subscribe, () => store.load()?.entries ?? null, () => null) ?? [];
}

export function clearMicLog() {
  store.save({ version: 1, entries: [] });
}
