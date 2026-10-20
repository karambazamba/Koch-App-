"use client";

// Fenster (Sheet, Menü) schließen auch mit Zurück – Pfeil im Browser bzw.
// Wisch-Geste. Beim Öffnen ein eigener Verlaufseintrag (gleiche Adresse);
// Zurück nimmt ihn weg und schließt nur dieses Fenster. Schließt es anders
// (✕, Danebentippen, Runterwischen, Auswahl), wird der Eintrag wieder entfernt.

import { useEffect, useRef } from "react";

let counter = 0;
const openIds = (): number[] => {
  const s = window.history.state as { sheets?: unknown } | null;
  return Array.isArray(s?.sheets) ? (s.sheets as number[]) : [];
};

export function useBackCloses(onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const id = ++counter;
    try {
      window.history.pushState({ ...(window.history.state ?? {}), sheets: [...openIds(), id] }, "");
    } catch {
      return;
    }
    let closedByBack = false;
    const onPop = () => {
      if (openIds().includes(id)) return;
      closedByBack = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Anders geschlossen und unser Eintrag liegt noch oben → wieder wegnehmen
      const ids = openIds();
      if (!closedByBack && ids[ids.length - 1] === id) window.history.back();
    };
  }, []);
}
