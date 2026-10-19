"use client";

// Laufende Uhr in Millisekunden (auf die Sekunde, für Timer/Stoppuhr): tickt
// nur, solange `active` ist. Rechnet immer mit `now()` – nach Hintergrund
// oder Sperre stimmt die Anzeige sofort. Beim Vorrendern 0.

import { useCallback } from "react";
import { now } from "./now";
import { useExternalStore } from "./useExternalStore";

const snapshot = () => Math.floor(now().getTime() / 1000) * 1000;

export function useNowMs(active: boolean, every = 500): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!active) return () => {};
      const id = window.setInterval(onChange, every);
      const onVisible = () => document.visibilityState === "visible" && onChange();
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        window.clearInterval(id);
        document.removeEventListener("visibilitychange", onVisible);
      };
    },
    [active, every],
  );
  return useExternalStore(subscribe, snapshot, () => 0);
}
