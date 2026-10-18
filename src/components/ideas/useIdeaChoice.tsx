"use client";

import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Idea } from "@/lib/ideas";
import type { Recipe } from "@/lib/cookbook";
import type { HouseholdProfile } from "@/lib/profile";
import { showToast } from "@/lib/toast";
import { addForToday, chooseIdea } from "@/lib/useIdeas";

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`);

/**
 * Idee auswählen: wird "Heute". Braucht sie noch etwas, fragt Lotte, ob sie's
 * für heute auf die Liste setzen soll. Danach "Rückgängig".
 */
export function useIdeaChoice(): { choose: (idea: Idea, profile: HouseholdProfile, today: Date, recipes: Record<string, Recipe>) => void; dialog: ReactNode } {
  // Erst fragen, dann übernehmen – sonst verschwindet die Ideen-Karte (und mit ihr die Frage)
  const [pending, setPending] = useState<{ idea: Idea; profile: HouseholdProfile; today: Date; recipes: Record<string, Recipe> } | null>(null);
  const choose = (idea: Idea, profile: HouseholdProfile, today: Date, recipes: Record<string, Recipe>) => {
    if (idea.needs.length) {
      setPending({ idea, profile, today, recipes });
      return;
    }
    showToast({ text: `Heute gibt's ${idea.title} ✓`, undo: chooseIdea(idea, profile, today, recipes) });
  };
  const dialog = pending ? (
    <ConfirmDialog
      title="Soll ich dir das für heute auf die Liste setzen?"
      text={`Dafür brauchst du noch: ${list(pending.idea.needs)}.`}
      confirmLabel="Auf die Liste"
      cancelLabel="Haben wir"
      onCancel={() => {
        setPending(null);
        showToast({ text: `Heute gibt's ${pending.idea.title} ✓`, undo: chooseIdea(pending.idea, pending.profile, pending.today, pending.recipes) });
      }}
      onConfirm={() => {
        setPending(null);
        const undoList = addForToday(pending.idea.needs, pending.profile, pending.today);
        const undo = chooseIdea(pending.idea, pending.profile, pending.today, pending.recipes);
        showToast({
          text: `Heute gibt's ${pending.idea.title} ✓ Steht unter „Für heute“ auf der Liste.`,
          undo: () => {
            undoList();
            undo();
          },
        });
      }}
    />
  ) : null;
  return { choose, dialog };
}
