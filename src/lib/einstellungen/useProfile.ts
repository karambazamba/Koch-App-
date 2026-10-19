"use client";

import { useSyncExternalStore } from "react";
import { loadProfile, subscribeProfile, type HouseholdProfile } from "./profile";

/**
 * Liest das gespeicherte Haushaltsprofil.
 * - `undefined`: noch nicht geladen (Server-Rendering / erster Render)
 * - `null`: kein Profil gespeichert
 */
export function useProfile(): HouseholdProfile | null | undefined {
  return useSyncExternalStore(subscribeProfile, loadProfile, () => undefined);
}
