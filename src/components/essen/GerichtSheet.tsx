"use client";

// Ein Gericht aus der Essen-Kachel (Vorschlag oder Beispiel): Bild, Name, Zeit
// und Grund, was noch auf die Liste müsste, darunter der große Knopf „Für
// heute nehmen“ (abends „Für morgen nehmen“) und – falls es ein Rezept gibt –
// „Rezept ansehen ›“. Genau dieses Gericht, nicht die allgemeine Essen-Seite.

import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/styles";
import { DishPicture } from "@/components/essen/DishPicture";
import type { RecipeCategory } from "@/lib/essen/cookbook";

export type GerichtWahl = { title: string; recipeId?: string; category: RecipeCategory | null; minutes?: number | null; reason?: string; needs?: string[]; photo?: string };

export function GerichtSheet({ dish, take, onTake, onClose, recipeHref }: { dish: GerichtWahl; take: string; onTake: () => void; onClose: () => void; recipeHref?: string }) {
  const facts = [dish.minutes ? `${dish.minutes} Min` : "", dish.reason ?? ""].filter(Boolean).join(" · ");
  return (
    <Sheet title={dish.title} onClose={onClose}>
      <div className="flex flex-col gap-3 pb-3" data-gericht-fenster>
        <DishPicture photo={dish.photo} title={dish.title} category={dish.category} alt="" className="aspect-[16/10] w-full overflow-hidden rounded-card" />
        {facts && <p className="text-[15px] text-muted">{facts}</p>}
        {dish.needs && dish.needs.length > 0 && <p className="text-[15px]">Auf die Liste: {dish.needs.join(", ")}</p>}
        <button type="button" onClick={onTake} className={`${buttonClass("primary", "lg")} w-full`}>
          {take}
        </button>
        {recipeHref && (
          <Link href={recipeHref} onClick={onClose} className={`${buttonClass("ghost", "md")} self-center`}>
            Rezept ansehen ›
          </Link>
        )}
      </div>
    </Sheet>
  );
}
