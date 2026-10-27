// Mikro-Protokoll zum Nachschauen (Einstellungen → Daten & App → Für
// Entwickler, mit Teilen-Knopf; außerdem 5× auf die Version tippen): die
// letzten 50 Ereignisse rund um Mikrofon, Zuhören und Sprachnachrichten mit
// Uhrzeit – Tipp, Start, Wachhund, Neustart, Stimme abgebrochen,
// getUserMedia ok/Fehlername, Bytes, Speichern ok/Fehlername. Nur Technik,
// nie Gesprochenes; nur auf dem Gerät, nicht in der Sicherung, nie an die KI.

import { createLocalStore } from "@/lib/core/localStore";
import { now } from "@/lib/core/now";
import { useExternalStore } from "@/lib/core/useExternalStore";

const MAX = 50;

export type MicLogEntry = { at: number; text: string };
type MicLogState = { version: 1; entries: MicLogEntry[] };

/** Nur gültige Einträge, höchstens die letzten 50 */
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

/** Zum Teilen: eine Zeile je Ereignis, „14:03:22 Zuhören: Start“ (älteste zuerst) */
export function micLogText(entries: MicLogEntry[]): string {
  const clock = (ms: number) => new Date(ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Berlin" });
  return entries.map((e) => `${clock(e.at)} ${e.text}`).join("\n");
}
