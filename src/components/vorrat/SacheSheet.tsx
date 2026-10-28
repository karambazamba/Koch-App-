"use client";

// Eine Sache aus „Im Haus“ (Tafel 102) – kleines Fenster beim Antippen eines
// Chips (Seite „Im Haus“ und unter Essen): Gruppe ändern (gilt ab jetzt für
// diese Sorte), „Aufgebraucht“ (steht dann in der Zeile „Aufgebraucht: …“ mit
// „Auf die Liste“) und Löschen.

import { Check, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { showDeleted, showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { PANTRY_PLACES, loadPantryAll, markPantryUsed, removePantryItem, replacePantry, setPantryPlace, type PantryItem } from "@/lib/vorrat/pantry";

export function SacheSheet({ item, today, onClose }: { item: PantryItem; today: string; onClose: () => void }) {
  const remove = () => {
    const before = loadPantryAll();
    removePantryItem(item.id);
    onClose();
    showDeleted(() => replacePantry(before));
  };
  const used = () => {
    const before = loadPantryAll();
    markPantryUsed(item.id, today);
    const text = `${item.name} aufgebraucht`;
    onClose();
    showToast({ text, undo: pushUndo(text, () => replacePantry(before)), undoneText: "Wieder da", seconds: 4, small: true });
  };
  return (
    <Sheet title={item.name} onClose={onClose}>
      <div className="flex flex-col gap-4 pb-3">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Wohin gehört das? Merk ich mir für {item.name}.</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Gruppe">
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
        {!item.usedAt && (
          <button type="button" onClick={used} className={buttonClass("secondary", "md")}>
            <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Aufgebraucht
          </button>
        )}
        <button type="button" onClick={remove} className={`${buttonClass("ghost", "md")} text-danger`}>
          <Trash2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Löschen
        </button>
      </div>
    </Sheet>
  );
}
