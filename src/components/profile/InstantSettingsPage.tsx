"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CARD, FAB_CLEARANCE, PAGE_MAIN, buttonClass } from "@/components/ui/styles";
import { saveProfile, type HouseholdProfile } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";

/**
 * Einstellungs-Seite, deren Änderungen sofort wirken (ohne "Speichern"),
 * z. B. Ansicht oder Lotte-Modus. Gespeichert wird bei jedem Tippen.
 */
export function InstantSettingsPage({
  title,
  intro,
  children,
}: {
  title: string;
  /** Kurzer, freundlicher Erklärsatz oben */
  intro: string;
  children: (profile: HouseholdProfile, set: (changes: Partial<HouseholdProfile>) => void) => ReactNode;
}) {
  const profile = useProfile();
  if (profile === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  if (profile === null) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <PageHeader title={title} backHref="/profil" />
        <main className={`flex flex-col items-center gap-4 px-6 pt-10 text-center ${FAB_CLEARANCE}`}>
          <p className="text-base text-muted">Es gibt noch kein Haushaltsprofil.</p>
          <Link href="/profil" className={buttonClass("primary", "lg")}>
            Profil anlegen
          </Link>
        </main>
      </div>
    );
  }
  const set = (changes: Partial<HouseholdProfile>) => saveProfile({ ...profile, ...changes });
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={title} backHref="/profil" />
      <main className={PAGE_MAIN}>
        <p className="px-1 text-base text-muted">{intro}</p>
        {children(profile, set)}
        <p className="px-1 text-sm text-muted" role="status">
          Wirkt sofort ✓
        </p>
      </main>
    </div>
  );
}
