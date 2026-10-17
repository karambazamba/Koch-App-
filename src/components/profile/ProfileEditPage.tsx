"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, StickyActions } from "@/components/StickyActions";
import { CARD, PAGE_MAIN } from "@/components/ui/styles";
import { saveProfile, type HouseholdProfile } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";

type Props = {
  title: string;
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
 * Rahmen für eine einzelne Bearbeiten-Ansicht des Profils: arbeitet auf einem
 * Entwurf, "Speichern" übernimmt ihn und führt zurück zur Übersicht.
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
        <main className="flex flex-col items-center gap-4 px-6 pt-10 text-center">
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
  children,
  prepare,
  canSave,
  profile,
}: Props & { profile: HouseholdProfile }) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => (prepare ? prepare(profile) : profile));

  const save = () => {
    saveProfile(draft);
    router.push("/profil");
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={title} backHref="/profil" />
      <main className={PAGE_MAIN}>
        {children(draft, setDraft)}
      </main>
      <StickyActions>
        <Link href="/profil" className={SECONDARY_BUTTON}>
          Abbrechen
        </Link>
        <button
          type="button"
          onClick={save}
          disabled={canSave ? !canSave(draft) : false}
          className={PRIMARY_BUTTON}
        >
          Speichern ✓
        </button>
      </StickyActions>
    </div>
  );
}
