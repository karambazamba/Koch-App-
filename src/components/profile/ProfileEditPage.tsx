"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PRIMARY_BUTTON } from "@/components/StickyActions";
import { CARD, FAB_CLEARANCE, PAGE_MAIN } from "@/components/ui/styles";
import { saveProfile, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";

type Props = {
  title: string;
  /** Kurzer, freundlicher Erklärsatz oben */
  intro?: string;
  /** Formular; bekommt den Entwurf und eine Funktion zum Ändern */
  children: (
    draft: HouseholdProfile,
    setDraft: (update: (draft: HouseholdProfile) => HouseholdProfile) => void,
  ) => ReactNode;
  /** Entwurf vor dem ersten Anzeigen anpassen (z. B. neue Person anhängen) */
  prepare?: (profile: HouseholdProfile) => HouseholdProfile;
  canSave?: (draft: HouseholdProfile) => boolean;
};

/**
 * Rahmen für eine einzelne Bearbeiten-Ansicht des Profils. Änderungen wirken
 * sofort (kein "Speichern"); ungültige Zwischenstände werden nicht gespeichert.
 */
export function ProfileEditPage(props: Props) {
  const profile = useProfile();
  // Next.js hält besuchte Seiten versteckt am Leben (<Activity>). Jeder neue
  // Aufruf soll aber mit dem gespeicherten Stand starten, nicht mit einem alten
  // Entwurf – bfcacheId wechselt bei jeder neuen Navigation (nicht bei Zurück).
  const { bfcacheId } = useRouter();
  if (profile === undefined) {
    return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  }
  if (profile === null) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <PageHeader title={props.title} backHref="/profil" />
        <main className={`flex flex-col items-center gap-4 px-6 pt-10 text-center ${FAB_CLEARANCE}`}>
          <p className="text-base text-muted">Es gibt noch kein Haushaltsprofil.</p>
          <Link href="/profil" className={`${PRIMARY_BUTTON} w-full`}>
            Profil anlegen
          </Link>
        </main>
      </div>
    );
  }
  return <EditForm key={bfcacheId} {...props} profile={profile} />;
}

function EditForm({
  title,
  intro,
  children,
  prepare,
  canSave,
  profile,
}: Props & { profile: HouseholdProfile }) {
  const [initial] = useState(() => (prepare ? prepare(profile) : profile));
  const [draft, setDraftState] = useState(initial);
  const setDraft = (update: (draft: HouseholdProfile) => HouseholdProfile) => setDraftState(update);

  // Wirkt sofort: jede gültige Änderung wird gleich gespeichert (ohne "Speichern")
  const valid = !canSave || canSave(draft);
  useEffect(() => {
    if (draft !== initial && valid) saveProfile(draft);
  }, [draft, initial, valid]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={title} backHref="/profil" />
      <main className={PAGE_MAIN}>
        {intro && <p className="px-1 text-base text-muted">{intro}</p>}
        {children(draft, setDraft)}
        <p className="px-1 text-sm text-muted" role="status">
          {!valid ? "So geht's noch nicht ganz – ich übernehme es, sobald es passt." : "Gilt sofort – nichts wird gelöscht."}
        </p>
      </main>
    </div>
  );
}
