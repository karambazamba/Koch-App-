"use client";

// „Hab ich so verstanden:“ (Tafel 102) – was Mia aus „Was ist da?“ gehört
// hat: + = kommt rein, − = ist weg (darunter „auf die Liste“ zum An- und
// Abwählen). Eine Zeile antippen nimmt sie raus. „Ändern“ = nochmal sagen,
// „Passt“ = einräumen. Ersetzt im Modus „Im Haus“ die allgemeine Vorschau.

import { Check, Minus, Pencil, Plus, ShoppingCart } from "lucide-react";
import { CARD, buttonClass, chipClass } from "@/components/ui/styles";
import type { ChangeOp } from "@/lib/begleitung/ops";
import { sameIngredient } from "@/lib/vorrat/pantry";

type Props = {
  ops: ChangeOp[];
  selected: Set<string>;
  onToggle: (opId: string) => void;
  onApply: () => void;
  onAdjust: () => void;
};

export function ImHausKarte({ ops, selected, onToggle, onApply, onAdjust }: Props) {
  const rein = ops.filter((op) => op.type === "add_pantry");
  const raus = ops.filter((op) => op.type === "use_pantry");
  const listeFuer = (name: string) => ops.find((op) => op.type === "add_shopping" && sameIngredient(op.name, name));
  const count = ops.filter((op) => op.type !== "add_shopping" && selected.has(op.id)).length;
  const row = (op: ChangeOp, plus: boolean) => {
    if (op.type !== "add_pantry" && op.type !== "use_pantry") return null;
    const on = selected.has(op.id);
    const liste = plus ? undefined : listeFuer(op.name);
    const Icon = plus ? Plus : Minus;
    return (
      <li key={op.id} className="flex items-center gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          onClick={() => {
            onToggle(op.id);
            // Ohne die Sache auch nicht „auf die Liste“
            if (liste && selected.has(liste.id) === on) onToggle(liste.id);
          }}
          className={`hit flex min-w-0 flex-1 items-center gap-2 rounded-field px-2 py-1.5 text-left text-[16px] font-semibold transition ${on ? "" : "text-muted line-through opacity-60"}`}
          data-zeile={plus ? "rein" : "raus"}
        >
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${plus ? "bg-good-soft text-good-ink" : "bg-fill text-muted"}`}>
            <Icon className="h-4 w-4" strokeWidth={2.75} aria-hidden />
          </span>
          <span className="truncate">{op.name}</span>
        </button>
        {liste && on && (
          <button type="button" aria-pressed={selected.has(liste.id)} onClick={() => onToggle(liste.id)} className={`${chipClass(selected.has(liste.id))} shrink-0`} data-auf-die-liste>
            <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            auf die Liste
          </button>
        )}
      </li>
    );
  };
  return (
    <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Hab ich so verstanden" data-im-haus-karte>
      <h3 className="text-lg font-bold">Hab ich so verstanden:</h3>
      <ul className="flex flex-col gap-1">
        {rein.map((op) => row(op, true))}
        {raus.map((op) => row(op, false))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onAdjust} className={buttonClass("secondary")}>
          <Pencil className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Ändern
        </button>
        <button type="button" onClick={onApply} disabled={count === 0} className={buttonClass("primary")}>
          <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Passt
        </button>
      </div>
    </section>
  );
}
