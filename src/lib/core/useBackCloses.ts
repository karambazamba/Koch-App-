"use client";

// Fenster (Sheet, Menü) schließen auch mit Zurück – Pfeil im Browser bzw.
// Wisch-Geste. Wie der Verlauf dabei geführt wird: `core/fensterVerlauf.ts`.

import { useEffect, useRef } from "react";
import { fensterVerlauf } from "@/lib/core/fensterVerlauf";

let verlauf: ReturnType<typeof fensterVerlauf> | null = null;
if (typeof window !== "undefined") {
  const v = fensterVerlauf({
    history: window.history,
    location: window.location,
    addEventListener: (t, l) => window.addEventListener(t, l),
    removeEventListener: (t, l) => window.removeEventListener(t, l),
    setTimeout: (f, ms) => window.setTimeout(f, ms),
    clearTimeout: (t) => window.clearTimeout(t),
    now: () => performance.now(),
  });
  verlauf = v;
  const back = window.history.back.bind(window.history);
  window.history.back = () => {
    v.zurueck();
    back();
  };
  const push = window.history.pushState.bind(window.history);
  window.history.pushState = (...args: Parameters<History["pushState"]>) => {
    v.navigation();
    push(...args);
  };
  document.addEventListener("click", (e) => (e.target as Element | null)?.closest?.("a[href]") && v.navigation(), true);
}

export function useBackCloses(onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => verlauf?.oeffne(() => closeRef.current()), []);
}
