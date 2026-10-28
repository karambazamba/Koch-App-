"use client";

// Rezeptseite „Zutaten“ (Tafel 122): Liste mit Kästchen zum Abhaken (nur
// heute gemerkt), Mengen passend zur Personenzahl. Was nicht im Haus ist,
// bekommt rechts ein kleines „+ Liste“ (steht es schon drauf: „auf der Liste“).
// `vorschau` (A-038, Vorschlag erst anschauen): dieselbe Liste nur zum Lesen –
// keine Kästchen, kein „+ Liste“ (das macht „Nehmen“).

import type { ReactNode } from "react";
import { Check, Plus } from "lucide-react";
import { CARD, SECTION_TITLE } from "@/components/ui/styles";
import { todayIso } from "@/lib/core/now";
import { pushUndo } from "@/lib/core/undo";
import { formatAmount, scaledAmount, type Recipe } from "@/lib/essen/cookbook";
import { matchStock, realStock } from "@/lib/essen/dishIdeas";
import { toggleZutat, useCooking } from "@/lib/essen/kochSession";
import { useStock } from "@/lib/essen/useStock";
import { addManualItem, removeManualItems } from "@/lib/einkauf/listEdits";
import { alsEinkauf } from "@/lib/einkauf/zusammen/packung";
import { sectionFor } from "@/lib/einkauf/sections";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { sameIngredient } from "@/lib/vorrat/pantry";

export function RezeptZutaten({ recipe, scaleTo, kopfRechts, vorschau = false }: { recipe: Recipe; scaleTo: number | null; kopfRechts: ReactNode; vorschau?: boolean }) {
  const session = useCooking(todayIso());
  const stock = useStock();
  const shopping = useWeekShoppingList("planning");
  const done = session?.zutaten[recipe.id] ?? [];
  const needs = stock && realStock(stock).length ? matchStock(recipe.ingredients.map((i) => i.name), stock, todayIso()).needs : [];
  const onList = (name: string) => Boolean(shopping?.list.items.some((i) => !i.checked && !i.hidden && sameIngredient(i.name, name)));
  // Wie Einkauf neu: Menge auf die Packung gerundet, Rezeptmenge als Hinweis
  const aufDieListe = (name: string, menge: number | null, unit: string) => {
    if (!shopping) return;
    const id = addManualItem(shopping.weekStart, { name, ...alsEinkauf(name, menge, unit), section: sectionFor(name), dish: recipe.title });
    pushUndo(`${name} auf die Liste`, () => removeManualItems(shopping.weekStart, [id]));
  };
  return (
    <section className={`${CARD} p-4`} aria-label="Zutaten">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className={SECTION_TITLE}>Zutaten</h2>
        {kopfRechts}
      </div>
      {recipe.ingredients.length === 0 ? (
        <p className="text-sm text-muted">Keine Zutaten eingetragen.</p>
      ) : (
        <ul className="divide-y divide-line">
          {recipe.ingredients.map((i) => {
            const menge = scaledAmount(i.amount, recipe.servings, scaleTo);
            const amount = [formatAmount(menge), i.unit].filter(Boolean).join(" ");
            const checked = done.includes(i.id);
            const missing = !checked && needs.includes(i.name.trim());
            if (vorschau)
              return (
                <li key={i.id} className="flex min-h-10 items-center py-1.5 text-base" data-zutat>
                  <span className="min-w-0">
                    {amount && <span className="font-semibold">{amount} </span>}
                    {i.name}
                  </span>
                </li>
              );
            return (
              <li key={i.id} className="flex min-h-11 items-center gap-2">
                <button type="button" role="checkbox" aria-checked={checked} onClick={() => toggleZutat(recipe.id, i.id)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 py-1.5 text-left text-base" data-zutat>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${checked ? "border-accent bg-accent text-on-accent" : "border-line-strong"}`} aria-hidden>
                    {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <span className={`min-w-0 ${checked ? "text-muted line-through" : ""}`}>
                    {amount && <span className="font-semibold">{amount} </span>}
                    {i.name}
                  </span>
                </button>
                {missing &&
                  (onList(i.name) ? (
                    <span className="shrink-0 text-[13px] font-semibold text-muted">auf der Liste</span>
                  ) : (
                    <button type="button" onClick={() => aufDieListe(i.name, menge, i.unit)} aria-label={`${i.name} auf die Liste`} className="hit flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-accent-soft px-2.5 text-[13px] font-bold text-accent-strong active:scale-95" data-plus-liste>
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                      Liste
                    </button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
