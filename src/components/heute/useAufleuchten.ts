"use client";

// Aufleuchten in der Kachel (A-037, Tafel 126): Was Mia eben eingetragen hat,
// leuchtet nach dem Schließen der Bühne bzw. bei der Rückkehr zur Startseite
// EINMAL 1,5 s weich orange – die Zeile (`data-leuchte="eintrag:<id>"`,
// `einkauf:<name>`, `notiz:<id>`), wenn sie in der Kachel steht, sonst die
// Kachel als Ganzes. Nur ein Attribut (`data-leuchtet`), das Leuchten selbst
// ist CSS (opacity, Ring über `--app-leuchten`). Im Bearbeiten nie.

import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { geleuchtet, leuchtenAbo, leuchtenJetzt, leuchtVersion, LEUCHT_MS, type Leuchten } from "@/lib/heute/aufleuchten";

/** Kurz warten, bis die Kacheln ihre Zeilen haben (Daten laden nach) */
const WARTEN_MS = 450;

/** Wo es leuchtet: Zeile in der Kachel, sonst die Kachel selbst (null = Kachel nicht auf der Startseite) */
function zielIn(root: HTMLElement, z: Leuchten): HTMLElement | null {
  const kachel = root.querySelector<HTMLElement>(`[data-tone="${z.kachel}"] > *`);
  if (!kachel) return null;
  const zeile = z.schluessel ? kachel.querySelector<HTMLElement>(`[data-leuchte~="${CSS.escape(z.schluessel)}"]`) : null;
  return zeile ?? kachel;
}

export function useAufleuchten(board: RefObject<HTMLElement | null>, aus: boolean) {
  const version = useSyncExternalStore(leuchtenAbo, leuchtVersion, () => 0);
  const an = useRef(new Set<HTMLElement>());
  useEffect(() => {
    if (aus || !leuchtenJetzt().length) return;
    const t = window.setTimeout(() => {
      const root = board.current;
      const ziele = leuchtenJetzt();
      if (!root || !ziele.length) return;
      // Verbraucht – leuchtet nie ein zweites Mal (auch wenn die Kachel fehlt)
      geleuchtet(ziele);
      for (const el of new Set(ziele.map((z) => zielIn(root, z)).filter((el): el is HTMLElement => el !== null))) {
        el.removeAttribute("data-leuchtet");
        void el.offsetWidth;
        el.setAttribute("data-leuchtet", "");
        an.current.add(el);
        window.setTimeout(() => {
          el.removeAttribute("data-leuchtet");
          an.current.delete(el);
        }, LEUCHT_MS);
      }
    }, WARTEN_MS);
    return () => window.clearTimeout(t);
  }, [version, aus, board]);
  // Beim Verlassen nichts leuchtend stehen lassen
  useEffect(() => {
    const leuchtend = an.current;
    return () => {
      for (const el of leuchtend) el.removeAttribute("data-leuchtet");
      leuchtend.clear();
    };
  }, []);
}
