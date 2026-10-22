"use client";

import { CARD } from "@/components/ui/styles";
import { FamilyOverview } from "@/components/einstellungen/FamilyOverview";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { HelloScreen } from "@/components/begleitung/HelloScreen";
import { helloWasShown } from "@/lib/core/hello";

/**
 * /profil: Gibt es schon ein Profil, zeigt es die Einstellungen.
 * Sonst der Hallo-Bildschirm (erster Start).
 */
export function ProfilePageContent() {
  const profile = useProfile();
  // Einmal Hallo, immer Hallo (kein Neuaufbau beim Laden – siehe HomeView)
  if (helloWasShown() && !profile) return <HelloScreen />;
  if (profile === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  if (profile) return <FamilyOverview profile={profile} />;
  return <HelloScreen />;
}
