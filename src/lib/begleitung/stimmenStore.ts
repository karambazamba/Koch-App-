// Welche guten Stimmen das Gerät schon hatte (`wasgibts.stimmen`, pro Gerät):
// Kommt nach der Rückkehr in die App eine neue dazu (gerade geladen), fragt
// Mia einmal „Neue Stimme gefunden: Anna. Nehmen?“. Beim allerersten Blick
// wird nur gemerkt, nichts vorgeschlagen.

import { createLocalStore } from "@/lib/core/localStore";

type StimmenStore = { version: 1; bekannt: string[] };

/** Gespeicherten Stand lesen (Fremdes wird verworfen) @public für Tests */
export function migrateStimmen(raw: unknown): StimmenStore | null {
  if (!raw || typeof raw !== "object" || (raw as StimmenStore).version !== 1) return null;
  const list = (raw as StimmenStore).bekannt;
  return { version: 1, bekannt: Array.isArray(list) ? list.filter((s): s is string => typeof s === "string").slice(-50) : [] };
}

const store = createLocalStore("wasgibts.stimmen", migrateStimmen);

/** Bekannte gute Stimmen (null = noch nie nachgeschaut) */
export const bekannteStimmen = (): string[] | null => store.load()?.bekannt ?? null;

/** Stimmen als bekannt merken (vorgeschlagen, genommen oder abgelehnt) */
export function merkeStimmen(ids: string[]) {
  const alt = store.load()?.bekannt ?? [];
  store.save({ version: 1, bekannt: [...new Set([...alt, ...ids])].slice(-50) });
}
