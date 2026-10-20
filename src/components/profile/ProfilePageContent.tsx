"use client";

import { CARD } from "@/components/ui/styles";
import { FamilyOverview } from "@/components/profile/FamilyOverview";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { WelcomeChat } from "@/components/welcome/WelcomeChat";

/**
 * /profil: Gibt es schon ein Profil, zeigt es die Einstellungen.
 * Sonst startet das Kennenlernen im Chat.
 */
export function ProfilePageContent() {
  const profile = useProfile();
  if (profile === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  if (profile) return <FamilyOverview profile={profile} />;
  return <WelcomeChat />;
}
