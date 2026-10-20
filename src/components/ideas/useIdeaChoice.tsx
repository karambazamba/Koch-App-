"use client";

import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Idea } from "@/lib/essen/ideas";
import type { Recipe } from "@/lib/essen/cookbook";
import type { HouseholdProfile } from "@/lib/einstellungen/profile";
import { pushUndo } from "@/lib/core/undo";
import { addForToday, chooseIdea } from "@/lib/essen/useIdeas";

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`);

/**
 * Idee auswählen: wird "Heute". Braucht sie noch etwas, fragt Lotte, ob sie's
 * für heute auf die Liste setzen soll. Danach "Rückgängig".
 */
export function useIdeaChoice(when: "heute" | "morgen" = "heute"): { choose: (idea: Idea, profile: HouseholdProfile, today: Date, recipes: Record<string, Recipe>) => void; dialog: ReactNode } {
  // Erst fragen, dann übernehmen – sonst verschwindet die Ideen-Karte (und mit ihr die Frage)
  const When = when === "morgen" ? "Morgen" : "Heute";
  const [pending, setPending] = useState<{ idea: Idea; profile: HouseholdProfile; today: Date; recipes: Record<string, Recipe> } | null>(null);
  const choose = (idea: Idea, profile: HouseholdProfile, today: Date, recipes: Record<string, Recipe>) => {
    if (idea.needs.length) {
      setPending({ idea, profile, today, recipes });
      return;
    }
    pushUndo(`${When} gibt’s ${idea.title}`, chooseIdea(idea, profile, today, recipes));
  };
  const dialog = pending ? (
    <ConfirmDialog
      title={`Soll ich dir das für ${when} auf die Liste setzen?`}
      text={`Dafür brauchst du noch: ${list(pending.idea.needs)}.`}
      confirmLabel="Auf die Liste"
      cancelLabel="Haben wir"
      onCancel={() => {
        setPending(null);
        pushUndo(`${When} gibt’s ${pending.idea.title}`, chooseIdea(pending.idea, pending.profile, pending.today, pending.recipes));
      }}
      onConfirm={() => {
        setPending(null);
        const undoList = addForToday(pending.idea.needs, pending.profile, pending.today);
        const undo = chooseIdea(pending.idea, pending.profile, pending.today, pending.recipes);
        pushUndo(`${When} gibt’s ${pending.idea.title}`, () => {
          undoList();
          undo();
        });
      }}
    />
  ) : null;
  return { choose, dialog };
}
