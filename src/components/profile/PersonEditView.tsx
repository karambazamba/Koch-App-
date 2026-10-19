"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { NameField, PERSON_ICONS } from "@/components/form/NameField";
import { ProfileEditPage } from "@/components/profile/ProfileEditPage";
import { PersonHeading } from "@/components/profile/PersonHeading";
import { CARD, buttonClass } from "@/components/ui/styles";
import { PersonLunchFields, PersonPreferencesFields } from "@/components/profile/editors";
import { LAST_PERSON_HINT, usePersonRemoval } from "@/components/profile/PersonRemoval";
import { useGoBack } from "@/lib/core/useGoBack";
import {
  createPerson,
  personLabel,
  personRoleLabel,
  fitHouseholdType,
  type Person,
  type PersonRole,
} from "@/lib/einstellungen/profile";

/**
 * Bearbeiten einer einzelnen Person: /profil/person?id=…
 * Neue Person anlegen: /profil/person?neu=erwachsen bzw. ?neu=kind
 * (wird erst mit "Speichern" übernommen).
 */
export function PersonEditView() {
  const params = useSearchParams();
  const { bfcacheId } = useRouter();
  const neu = params.get("neu");
  const newRole: PersonRole | null = neu === "erwachsen" || neu === "kind" ? neu : null;
  // Neu mounten bei jeder neuen Navigation und jeder anderen Person – sonst
  // würde Next.js den alten Entwurf (oder dieselbe "neue" Person) wiederverwenden.
  return (
    <PersonEditor
      key={`${bfcacheId}|${params.toString()}`}
      newRole={newRole}
      id={params.get("id")}
    />
  );
}

function PersonEditor({ newRole, id }: { newRole: PersonRole | null; id: string | null }) {
  const [newPerson] = useState(() => (newRole ? createPerson(newRole) : null));
  const personId = newPerson?.id ?? id;

  const goBack = useGoBack();
  // Entfernt die Person aus dem gespeicherten Profil (ungespeicherte Änderungen verfallen)
  const removal = usePersonRemoval(() => goBack("/profil"));

  return (
    <ProfileEditPage
      title={newPerson ? (newPerson.role === "kind" ? "Neues Kind" : "Neue:r Erwachsene:r") : "Person bearbeiten"}
      prepare={(profile) =>
        newPerson
          ? {
              ...profile,
              adults: profile.adults + (newPerson.role === "erwachsen" ? 1 : 0),
              kids: profile.kids + (newPerson.role === "kind" ? 1 : 0),
              persons: [...profile.persons, newPerson],
              householdType: fitHouseholdType(profile.householdType, [...profile.persons, newPerson]),
            }
          : profile
      }
      intro="Name, Allergien und was jemand nicht mag – Allergien halte ich immer strikt ein."
      canSave={(draft) => draft.persons.some((p) => p.id === personId)}
    >
      {(draft, setDraft) => {
        const person = draft.persons.find((p) => p.id === personId);
        if (!person) {
          return (
            <div className="flex flex-col items-center gap-4 pt-8 text-center">
              <p className="text-base text-muted">Diese Person gibt es nicht (mehr).</p>
              <Link href="/profil" className={buttonClass("secondary")}>
                Zur Übersicht
              </Link>
            </div>
          );
        }
        const change = (changes: Partial<Person>) =>
          setDraft((d) => ({
            ...d,
            persons: d.persons.map((p) => (p.id === person.id ? { ...p, ...changes } : p)),
          }));
        return (
          <>
            <PersonHeading person={person} persons={draft.persons} />
            <section className={`${CARD} p-4`}>
              <NameField
                who={personRoleLabel(person, draft.persons)}
                icon={PERSON_ICONS[person.role]}
                value={person.name}
                onChange={(name) => change({ name })}
                isLast
              />
            </section>
            <section className={`${CARD} flex flex-col gap-6 p-4`}>
              <PersonPreferencesFields person={person} onChange={change} />
            </section>
            <section className={`${CARD} flex flex-col gap-6 p-4`}>
              <PersonLunchFields person={person} onChange={change} />
            </section>
            {!newPerson &&
              (draft.persons.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removal.ask(person, draft.persons)}
                  className={`${buttonClass("danger")} mt-2 self-center`}
                >
                  <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  {personLabel(person, draft.persons)} entfernen
                </button>
              ) : (
                <p className="mt-2 px-1 text-center text-sm text-muted">{LAST_PERSON_HINT}</p>
              ))}
            {removal.dialog}
          </>
        );
      }}
    </ProfileEditPage>
  );
}
