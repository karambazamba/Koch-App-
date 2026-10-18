"use client";

import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { personLabel, type Person } from "@/lib/profile";
import { removePerson } from "@/lib/removePerson";
import { showToast } from "@/lib/toast";

export const LAST_PERSON_HINT = "Eine Person bleibt immer – sonst wüsste ich nicht, für wen ich koche 😊";

/**
 * Person entfernen: kurze Rückfrage, danach ein paar Sekunden "Rückgängig".
 * Die letzte Person bleibt (freundlicher Hinweis statt Löschen).
 */
export function usePersonRemoval(onRemoved?: () => void): { ask: (person: Person, persons: Person[]) => void; dialog: ReactNode } {
  const [pending, setPending] = useState<{ person: Person; label: string } | null>(null);
  const ask = (person: Person, persons: Person[]) => {
    if (persons.length <= 1) {
      showToast({ text: LAST_PERSON_HINT });
      return;
    }
    setPending({ person, label: personLabel(person, persons) });
  };
  const dialog = pending ? (
    <ConfirmDialog
      title={`${pending.label} entfernen?`}
      text="Allergien und Vorlieben gehen mit – Mengen und Pläne passe ich an."
      confirmLabel="Entfernen"
      danger
      onCancel={() => setPending(null)}
      onConfirm={() => {
        const result = removePerson(pending.person.id);
        setPending(null);
        if (result.ok) {
          showToast({ text: `${pending.label} entfernt`, undo: result.undo, undoneText: `${pending.label} ist wieder da ✓` });
          onRemoved?.();
        } else if (result.reason === "last") showToast({ text: LAST_PERSON_HINT });
      }}
    />
  ) : null;
  return { ask, dialog };
}
