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
import {
  LIMITS,
  createPerson,
  loadProfile,
  personLabel,
  personRoleLabel,
  saveProfile,
  type Person,
  type PersonRole,
} from "@/lib/profile";

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
  const router = useRouter();
  const [newPerson] = useState(() => (newRole ? createPerson(newRole) : null));
  const personId = newPerson?.id ?? id;

  /** Entfernt die Person aus dem gespeicherten Profil (ungespeicherte Änderungen verfallen). */
  const remove = (person: Person, label: string) => {
    const saved = loadProfile();
    if (!saved || !window.confirm(`${label} wirklich aus der Familie entfernen?`)) return;
    const isKid = person.role === "kind";
    saveProfile({
      ...saved,
      adults: isKid ? saved.adults : saved.adults - 1,
      kids: isKid ? saved.kids - 1 : saved.kids,
      persons: saved.persons.filter((p) => p.id !== person.id),
    });
    router.push("/profil");
  };

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
            }
          : profile
      }
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
            {!newPerson && (person.role === "kind" || draft.adults > LIMITS.adults.min) && (
              <button
                type="button"
                onClick={() => remove(person, personLabel(person, draft.persons))}
                className={`${buttonClass("danger")} mt-2 self-center`}
              >
                <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                Person entfernen
              </button>
            )}
          </>
        );
      }}
    </ProfileEditPage>
  );
}
