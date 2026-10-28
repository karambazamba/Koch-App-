// Neue Aufgabe/Termin: zuletzt gewählter Raum (`wasgibts.eintragraum`, pro
// Gerät, nicht in der Sicherung). Der Schalter startet damit – nach
// Feierabend aber mit dem gemeinsamen Raum (`eintragen/raum.ts`).

import { createLocalStore } from "@/lib/core/localStore";
import { roomOf, type Room } from "@/lib/core/entries";

type RaumState = { version: 1; raum: Room };

/** @public für Tests */
export function migrateEintragRaum(raw: unknown): RaumState | null {
  if (!raw || typeof raw !== "object" || (raw as RaumState).version !== 1) return null;
  return { version: 1, raum: roomOf((raw as RaumState).raum) };
}

const store = createLocalStore("wasgibts.eintragraum", migrateEintragRaum);

export const letzterRaum = (): Room | null => store.load()?.raum ?? null;
export const raumMerken = (raum: Room) => store.save({ version: 1, raum });
