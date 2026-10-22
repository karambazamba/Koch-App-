"use client";

import { useSyncExternalStore } from "react";
import { type HouseholdProfile } from "@/lib/einstellungen/profile";
import { loadProfile, subscribeProfile } from "@/lib/einstellungen/profileStore";

/**
 * Liest das gespeicherte Haushaltsprofil.
 * - `undefined`: noch nicht geladen (Server-Rendering / erster Render)
 * - `null`: kein Profil gespeichert
 */
export function useProfile(): HouseholdProfile | null | undefined {
  return useSyncExternalStore(subscribeProfile, loadProfile, () => undefined);
}
