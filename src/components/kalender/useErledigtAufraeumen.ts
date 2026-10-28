"use client";

// Erledigte Aufgaben nur 12 Stunden (A-043): kurz nach dem Start (der
// Abgleich holt vorher, was andere geändert haben), beim Zurückkommen in die
// App und jede Minute still aufräumen – Regel in kalender/erledigt.ts.

import { useEffect } from "react";
import { erledigteAufraeumen } from "@/lib/kalender/store";

export function useErledigtAufraeumen() {
  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") erledigteAufraeumen();
    };
    const first = window.setTimeout(run, 5000);
    const timer = window.setInterval(run, 60_000);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, []);
}
