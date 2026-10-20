"use client";

// Fenster (Sheet, Menü) schließen auch mit Zurück – Pfeil im Browser bzw.
// Wisch-Geste. Beim Öffnen ein eigener Verlaufseintrag (gleiche Adresse);
// Zurück nimmt ihn weg und schließt nur dieses Fenster. Schließt es anders
// (✕, Danebentippen, Runterwischen, Auswahl), wird der Eintrag kurz danach
// wieder entfernt – außer die Auswahl navigiert weiter (dann bleibt der
// Verlauf) oder gleich öffnet das nächste Fenster (das übernimmt den Eintrag).

import { useEffect, useRef } from "react";

const REMOVE_AFTER_MS = 300;

let counter = 0;
/** Eintrag eines eben anders geschlossenen Fensters, der gleich entfernt wird */
let pending: { id: number; timer: ReturnType<typeof setTimeout> } | null = null;

/** Wann zuletzt jemand selbst "Zurück" ausgelöst hat (z. B. "Entfernen" → eine Ebene zurück) */
let lastBackAt = -1;
/** Wann zuletzt eine Navigation begann (Link angetippt, neue Seite im Verlauf) */
let lastNavAt = -1;
if (typeof window !== "undefined") {
  const back = window.history.back.bind(window.history);
  window.history.back = () => {
    lastBackAt = performance.now();
    back();
  };
  const push = window.history.pushState.bind(window.history);
  window.history.pushState = (...args: Parameters<History["pushState"]>) => {
    lastNavAt = performance.now();
    push(...args);
  };
  document.addEventListener("click", (e) => (e.target as Element | null)?.closest?.("a[href]") && (lastNavAt = performance.now()), true);
}

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
      const ids = openIds();
      if (pending && ids[ids.length - 1] === pending.id) {
        // Gleich das nächste Fenster (z. B. Menü → Bearbeiten): Eintrag übernehmen statt Zurück + neu
        clearTimeout(pending.timer);
        const reuse = pending.id;
        pending = null;
        window.history.replaceState({ ...(window.history.state ?? {}), sheets: [...ids.filter((x) => x !== reuse), id] }, "");
      } else {
        window.history.pushState({ ...(window.history.state ?? {}), sheets: [...ids, id] }, "");
      }
    } catch {
      return;
    }
    const href = window.location.href;
    let closedByBack = false;
    const onPop = () => {
      if (openIds().includes(id)) return;
      closedByBack = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (closedByBack) return;
      const isTop = () => {
        const ids = openIds();
        return ids[ids.length - 1] === id && window.location.href === href;
      };
      if (!isTop()) return;
      // Die Auswahl geht selbst eine Ebene zurück: erst dieses Fenster, dann die Seite
      if (performance.now() - lastBackAt < 100) {
        window.history.back();
        return;
      }
      const closedAt = performance.now();
      const timer = setTimeout(() => {
        if (pending?.id === id) pending = null;
        // Inzwischen geht es woanders hin → Verlauf so lassen (sonst nähme Zurück die neue Seite weg)
        if (lastNavAt >= closedAt) return;
        if (isTop()) window.history.back();
      }, REMOVE_AFTER_MS);
      pending = { id, timer };
    };
  }, []);
}
