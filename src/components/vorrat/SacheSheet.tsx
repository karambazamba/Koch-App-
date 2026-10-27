"use client";

// Eine Sache aus „Im Haus“ ansehen und ändern – auf der Seite „Im Haus“ (lange
// drücken) und unter Essen (Chip antippen): Ort (gilt ab jetzt für diese
// Sorte), „Ist alle“ (raus und auf die Einkaufsliste) und Entfernen.

import { ShoppingCart, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { showDeleted, showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { istAlle } from "@/lib/vorrat/kreislauf";
import { PANTRY_PLACES, loadPantryAll, removePantryItem, replacePantry, setPantryPlace, type PantryItem } from "@/lib/vorrat/pantry";

export function SacheSheet({ item, today, weekStart, onClose }: { item: PantryItem; today: string; weekStart: string | null; onClose: () => void }) {
  const remove = () => {
    const before = loadPantryAll();
    removePantryItem(item.id);
    onClose();
    showDeleted(() => replacePantry(before));
  };
  const alle = () => {
    if (!weekStart) return;
    const done = istAlle([item.name], today, weekStart);
    const text = done.toList.length ? `Auf die Liste: ${item.name}` : `${item.name} ist raus`;
    // Still melden; Rückgängig geht über Mia („Mach das rückgängig“)
    pushUndo(text, done.undo);
    onClose();
    showToast({ text, small: true });
  };
  return (
    <Sheet title={item.name} onClose={onClose}>
      <div className="flex flex-col gap-4 pb-3">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Wo liegt das? Merk ich mir für {item.name}.</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ort">
            {PANTRY_PLACES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={item.place === p.value}
                onClick={() => {
                  setPantryPlace(item.id, p.value);
                  onClose();
                }}
                className={chipClass(item.place === p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {!item.usedAt && weekStart && (
          <button type="button" onClick={alle} className={buttonClass("secondary", "md")}>
            <ShoppingCart className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Ist alle · auf die Liste
          </button>
        )}
        <button type="button" onClick={remove} className={`${buttonClass("ghost", "md")} text-danger`}>
          <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Entfernen
        </button>
      </div>
    </Sheet>
  );
}
