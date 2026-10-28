"use client";

import { Check, ChevronRight, Pencil, Sparkles, Trash2 } from "lucide-react";
import type { AssistantData, ChangeOp, NewRecipe } from "@/lib/begleitung/ops";
import { previewRows, type PreviewRow } from "@/lib/begleitung/preview";
import { alsRezept } from "@/lib/essen/vorschau/laden";
import type { Vorschlag } from "@/lib/essen/vorschau";
import { useVorschau, type Vorschau } from "@/components/essen/vorschau/useVorschau";
import { CategoryDot } from "@/components/ui/Category";
import { CARD, buttonClass } from "@/components/ui/styles";
import type { Proposal } from "@/components/begleitung/chatTypes";

type Props = {
  data: AssistantData;
  proposal: Proposal;
  adjusting: boolean;
  onToggle: (opId: string) => void;
  /** Vorschau (A-038): Mia hat das Rezept zu einem Gericht eben geschrieben – an den Vorschlag hängen */
  onUseRecipe: (opId: string, recipe: NewRecipe) => void;
  onApply: () => void;
  onAdjust: () => void;
  onDiscard: () => void;
};

/** Vorschau des Vorschlags: pro Tag "vorher → nachher", einzeln abwählbar */
/** Gericht einer Zeile zum Reinschauen (neues KI-Rezept, Rezept oder nur der Name) */
function rowVorschlag(op: ChangeOp | undefined, row: PreviewRow): Vorschlag | null {
  if (op?.type === "set_meal")
    return { title: op.dish.title, category: op.dish.category, minutes: row.newRecipe?.prepMinutes ?? null, recipeId: op.dish.kind === "recipe" ? op.dish.recipeId : undefined, rezept: row.newRecipe ? alsRezept(row.newRecipe) : undefined };
  if (row.newRecipe) return { title: row.newRecipe.title, category: row.newRecipe.category, minutes: row.newRecipe.prepMinutes, rezept: alsRezept(row.newRecipe) };
  return null;
}

export function ProposalCard({ data, proposal, adjusting, onToggle, onUseRecipe, onApply, onAdjust, onDiscard }: Props) {
  // Gerichte erst anschauen (A-038): „Nehmen“ = diese Zeile wählen; Mias neues Rezept hängt am Vorschlag, nicht im Kochbuch
  const vorschau = useVorschau({ insKochbuch: false });
  const rows = previewRows(data, proposal.ops, proposal.selected);
  const count = new Set(rows.filter((r) => proposal.selected.has(r.opId)).map((r) => r.opId)).size;
  const groups = rows.reduce<{ name: string; rows: PreviewRow[] }[]>((list, row) => {
    const last = list[list.length - 1];
    if (last && last.name === row.group) last.rows.push(row);
    else list.push({ name: row.group, rows: [row] });
    return list;
  }, []);

  return (
    <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Vorschlag">
      <div>
        <h3 className="text-lg font-bold">Das würde ich machen:</h3>
        <p className="text-sm text-muted">
          {adjusting ? "Sag oder schreib unten, was anders sein soll." : "Gespeichert wird erst mit „Passt“ oder einem „Ja“."}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Keine Änderungen.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.name} className="flex flex-col gap-1">
              <h4 className="text-sm font-bold text-muted">{group.name}</h4>
              <ul className="flex flex-col gap-1">
                {group.rows.map((row) => (
                  <Row
                    key={`${row.opId}-${row.label}`}
                    row={row}
                    vorschlag={rowVorschlag(proposal.ops.find((op) => op.id === row.opId), row)}
                    vorschau={vorschau}
                    checked={proposal.selected.has(row.opId)}
                    onToggle={() => onToggle(row.opId)}
                    onUseRecipe={(neu) => onUseRecipe(row.opId, neu)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[auto_1fr_1.4fr] gap-2">
        <button type="button" onClick={onDiscard} aria-label="Verwerfen" className="inline-flex h-12 w-12 items-center justify-center rounded-field border border-line bg-surface text-danger transition active:scale-95">
          <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
        <button type="button" onClick={onAdjust} className={buttonClass("secondary")}>
          <Pencil className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Ändern
        </button>
        <button type="button" onClick={onApply} disabled={count === 0} className={buttonClass("primary")}>
          <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Passt{count > 0 ? ` (${count})` : ""}
        </button>
      </div>
      {vorschau.fenster}
    </section>
  );
}

function Row({ row, vorschlag, vorschau, checked, onToggle, onUseRecipe }: { row: PreviewRow; vorschlag: Vorschlag | null; vorschau: Vorschau; checked: boolean; onToggle: () => void; onUseRecipe: (recipe: NewRecipe) => void }) {
  const recipe = row.newRecipe;
  return (
    <li className={`rounded-field border px-3 py-2 transition ${checked ? "border-line bg-surface" : "border-dashed border-line bg-background opacity-60"}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 h-5 w-5 shrink-0 accent-accent" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-muted">{row.label}</span>
          {row.lines ? (
            row.lines.map((line) => (
              <span key={line} className="text-[15px] font-semibold leading-snug">
                {line}
              </span>
            ))
          ) : (
            <span className="text-[15px] leading-snug">
              {row.before !== null && (
                <>
                  <span className="text-muted line-through decoration-line-strong">{row.before}</span>
                  <span className="text-muted"> → </span>
                </>
              )}
              <span className="font-semibold">{row.after}</span>
            </span>
          )}
          {(row.category || recipe) && (
            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              {row.category && <CategoryDot category={row.category} />}
              {recipe && (
                <span className="inline-flex items-center gap-1 font-semibold text-accent-strong">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  neues KI-Rezept · {recipe.servings} Pers.{recipe.prepMinutes ? ` · ${recipe.prepMinutes} Min.` : ""}
                </span>
              )}
            </span>
          )}
        </span>
      </label>
      {vorschlag && (
        <div className="pl-8">
          <button
            type="button"
            onClick={() =>
              vorschau.zeigen(vorschlag, (_id, geladen) => {
                if (geladen) onUseRecipe(geladen.neu);
                else if (!checked) onToggle();
              })
            }
            className="hit mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent-strong"
            data-vorschau-oeffnen
          >
            Rezept ansehen
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      )}
    </li>
  );
}
