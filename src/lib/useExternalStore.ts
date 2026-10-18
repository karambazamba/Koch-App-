"use client";

// Einziger React-Import der Daten-Module (Kochbuch, Wochenplan, …). Als
// Client-Modul ausgelagert, damit der Server (Küchenhelfer-API) die reine
// Logik dieser Module nutzen kann, ohne React-Hooks zu laden.

import { useSyncExternalStore } from "react";

export function useExternalStore<T>(
  subscribe: (onChange: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot: () => T,
): T {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
