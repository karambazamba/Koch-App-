"use client";

import { useState } from "react";
import { Clock, Plus, Repeat } from "lucide-react";
import { CategoryDot } from "@/components/ui/Category";
import { buttonClass, chipClass } from "@/components/ui/styles";
import type { MarketAnswer, MarketIdea } from "@/lib/market";

export type MarketTarget = { date: string; weekday: string; replaces: string | null; label?: string };

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`);

/**
 * "Im Supermarkt fragen": 2–3 Ideen mit Zeit (eine ist gewählt), darunter was
 * dafür noch gebraucht wird → "Auf die Liste" (Jetzt mitnehmen) und
 * "Statt <Tag> einplanen".
 */
export function MarketBoard({
  answer,
  target,
  onAdd,
  onPlan,
}: {
  answer: MarketAnswer;
  target: MarketTarget | null;
  onAdd: (idea: MarketIdea) => void;
  onPlan: (idea: MarketIdea, target: MarketTarget) => void;
}) {
  const [chosen, setChosen] = useState(0);
  const idea = answer.ideas[chosen] ?? answer.ideas[0];
  if (!idea) return null;
  return (
    <div className="flex w-full flex-col gap-2" aria-label="Im Supermarkt">
      <ul className="w-full overflow-hidden rounded-card border border-line bg-surface shadow-card" role="radiogroup" aria-label="Ideen">
        {answer.ideas.map((it, i) => (
          <li key={it.title} className="border-b border-line last:border-b-0">
            <button
              type="button"
              role="radio"
              aria-checked={i === chosen}
              onClick={() => setChosen(i)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left ${i === chosen ? "bg-accent-soft" : ""}`}
            >
              {it.category ? <CategoryDot category={it.category} /> : <span className="w-2.5" aria-hidden />}
              <span className="min-w-0 flex-1 font-bold leading-snug">{it.title}</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm text-muted">
                <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {it.minutes} Min.
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        {idea.needs.length ? `Was du dafür noch brauchst: ${list(idea.needs)}` : "Dafür ist sonst alles da ✓"}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onAdd(idea)} className={buttonClass("primary", "sm")}>
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          Auf die Liste
        </button>
        {target && (
          <button type="button" onClick={() => onPlan(idea, target)} className={chipClass(false)}>
            <Repeat className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            {target.label ?? (target.replaces ? `Statt ${target.weekday} einplanen` : `Für ${target.weekday} einplanen`)}
          </button>
        )}
      </div>
    </div>
  );
}
