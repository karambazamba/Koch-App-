"use client";

// „Rezept“ bei einem eigenen Eintrag ohne Rezept (Tafel 122): kein Fehler,
// kein leerer Bildschirm – ein kurzes Fenster mit dem Namen, „Mia schreibt
// dir ein Rezept dazu“ und „Ja, gern“ (holt Mia mit genau dieser Bitte).

import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/styles";
import { DishPicture } from "@/components/essen/DishPicture";
import { openHelper } from "@/lib/begleitung/open";
import type { RecipeCategory } from "@/lib/essen/cookbook";

/** Die Bitte an Mia @public (Tests) */
export const rezeptBitte = (title: string) => `Schreib mir ein Rezept für ${title.trim()}.`;

export function OhneRezeptSheet({ title, category, name, onClose }: { title: string; category?: RecipeCategory | null; name: string; onClose: () => void }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="flex flex-col gap-3 pb-3" data-ohne-rezept>
        <DishPicture title={title} category={category ?? null} alt="" className="aspect-[16/9] w-full overflow-hidden rounded-card" />
        <p className="text-[16px]">{name} schreibt dir ein Rezept dazu.</p>
        <button
          type="button"
          onClick={() => {
            onClose();
            openHelper(undefined, rezeptBitte(title));
          }}
          className={`${buttonClass("primary", "lg")} w-full`}
        >
          Ja, gern
        </button>
      </div>
    </Sheet>
  );
}
