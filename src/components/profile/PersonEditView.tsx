"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { NameField } from "@/components/form/NameField";
import { ProfileEditPage } from "@/components/profile/ProfileEditPage";
import { PersonLunchFields, PersonPreferencesFields } from "@/components/profile/editors";
import {
  createPerson,
  personLabel,
  personRoleLabel,
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
  const [newPerson] = useState(() => (newRole ? createPerson(newRole) : null));
  const personId = newPerson?.id ?? id;

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
              <p className="text-lg">Diese Person gibt es nicht (mehr).</p>
              <Link href="/profil" className="font-bold text-orange-700 underline">
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
            <h2 className="text-2xl font-extrabold">
              {person.role === "erwachsen" ? "🧑" : "🧒"} {personLabel(person, draft.persons)}
            </h2>
            <section className="rounded-3xl bg-white p-4 shadow-sm">
              <NameField
                who={personRoleLabel(person, draft.persons)}
                emoji={person.role === "erwachsen" ? "🧑" : "🧒"}
                value={person.name}
                onChange={(name) => change({ name })}
                isLast
              />
            </section>
            <section className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm">
              <PersonPreferencesFields person={person} onChange={change} />
            </section>
            <section className="flex flex-col gap-5 rounded-3xl bg-white p-4 shadow-sm">
              <PersonLunchFields person={person} onChange={change} />
            </section>
          </>
        );
      }}
    </ProfileEditPage>
  );
}
