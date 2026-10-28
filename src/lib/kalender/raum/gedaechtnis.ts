// Mia lernt Räume (A-034): Korrigiert man den Raum, merkt sie sich das
// Stichwort („Zahnarzt“ → Ich, „Peter“ → Arbeit) und wählt beim nächsten Mal
// richtig. Dazu der Merker für den einmaligen Satz „Hab Familie gewählt.
// Tippen zum Ändern.“ Nur auf dem Gerät (`wasgibts.raumgedaechtnis`, in der
// Sicherung), löschbar unter Einstellungen → Mia → „Was ich mir gemerkt hab“.

import { createLocalStore } from "@/lib/core/localStore";
import { roomOf, type Room } from "@/lib/core/entries";
import { nowIso } from "@/lib/core/now";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { stichwort, type RaumWort } from "@/lib/kalender/raum/raten";

/** Höchstens so viele Stichworte (die ältesten fallen weg) */
const MAX_WORTE = 60;

type Gemerkt = RaumWort & { seit: string };
export type RaumGedaechtnis = { version: 1; worte: Gemerkt[]; hinweisGesehen: boolean };

const LEER: RaumGedaechtnis = { version: 1, worte: [], hinweisGesehen: false };

/** @public für Tests */
export function migrateRaumGedaechtnis(raw: unknown): RaumGedaechtnis | null {
  if (!raw || typeof raw !== "object" || (raw as RaumGedaechtnis).version !== 1) return null;
  const d = raw as Partial<RaumGedaechtnis>;
  const worte = (Array.isArray(d.worte) ? d.worte : [])
    .filter((w): w is Gemerkt => Boolean(w) && typeof w === "object" && typeof w.wort === "string" && w.wort.trim().length >= 2)
    .map((w) => ({ wort: w.wort.trim().toLowerCase().slice(0, 40), raum: roomOf(w.raum), seit: typeof w.seit === "string" ? w.seit : "" }))
    .slice(0, MAX_WORTE);
  return { version: 1, worte, hinweisGesehen: d.hinweisGesehen === true };
}

const store = createLocalStore("wasgibts.raumgedaechtnis", migrateRaumGedaechtnis);
const load = (): RaumGedaechtnis => store.load() ?? LEER;

/** Gelernte Stichworte, neueste zuerst (für das Raten, Mias Kontext und die Einstellungen) */
export const gelernteRaeume = (): RaumWort[] => load().worte.map(({ wort, raum }) => ({ wort, raum }));

/** Rein: Stichwort merken bzw. umlernen (neuestes vorn). @public für Tests */
export function mitWort(s: RaumGedaechtnis, wort: string, raum: Room, seit: string): RaumGedaechtnis {
  const w = wort.trim().toLowerCase();
  if (w.length < 2) return s;
  return { ...s, worte: [{ wort: w, raum, seit }, ...s.worte.filter((x) => x.wort !== w)].slice(0, MAX_WORTE) };
}

/** Korrektur aus der Oberfläche oder von Mia: Stichwort des Titels → Raum. Liefert das Stichwort (oder null). */
export function raumLernen(title: string, raum: Room): string | null {
  const wort = stichwort(title);
  if (!wort) return null;
  store.save(mitWort(load(), wort, raum, nowIso()));
  return wort;
}

/** Ein Stichwort vergessen (Einstellungen) */
export function raumVergessen(wort: string) {
  const s = load();
  store.save({ ...s, worte: s.worte.filter((w) => w.wort !== wort) });
}

/** Beim allerersten Vorwählen ein kleiner Satz – danach nie wieder */
export const raumHinweisOffen = (): boolean => !load().hinweisGesehen;
export function raumHinweisGesehen() {
  const s = load();
  if (!s.hinweisGesehen) store.save({ ...s, hinweisGesehen: true });
}

export function useRaumGedaechtnis(): RaumGedaechtnis {
  return useExternalStore(store.subscribe, load, () => LEER);
}
