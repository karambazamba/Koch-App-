"use client";

import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { CategoryDot } from "@/components/ui/Category";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { sortedBases, type BaseCounts } from "@/lib/bases";
import type { Recipe } from "@/lib/cookbook";
import { formatPantryItem, type PantryItem } from "@/lib/pantry";
import type { NeverAgainEntry } from "@/lib/profile";
import { SPONTAN_FILTERS, spontanIdeas, type SpontanFilter, type SpontanIdea } from "@/lib/spontan";
import { EMPTY_STOCK_HINT, stockNearlyEmpty, usesLine } from "@/lib/dishIdeas";

/**
 * Spontan kochen: drei Ideen aus Vorrat und Kochbuch (schnellste zuerst,
 * ohne Einkauf), Filter-Chips und "Für heute übernehmen". Rechnet live –
 * Filter und neu Erzähltes ändern die Ideen sofort.
 */
export function SpontanBoard({
  recipes,
  pantry,
  neverAgain,
  baseCounts,
  filters,
  helperName,
  ready,
  onToggle,
  onTake,
  onAskMore,
  onNavigate,
}: {
  recipes: Record<string, Recipe>;
  /** Aktueller Bestand: Vorrat + Gekauftes + eben Gesagtes */
  pantry: PantryItem[];
  neverAgain: NeverAgainEntry[];
  /** Beliebtheit der Basen (Reihenfolge der Basis-Chips) */
  baseCounts: BaseCounts;
  filters: SpontanFilter[];
  helperName: string;
  /** KI eingerichtet → "Andere Ideen?" */
  ready: boolean;
  onToggle: (filter: SpontanFilter) => void;
  onTake: (idea: SpontanIdea) => void;
  onAskMore: () => void;
  onNavigate: () => void;
}) {
  const ideas = spontanIdeas(recipes, pantry, filters, neverAgain);
  return (
    <div className="flex w-full flex-col gap-2" aria-label="Spontan kochen">
      {stockNearlyEmpty(pantry) && <p className="text-sm font-semibold text-accent-strong">{EMPTY_STOCK_HINT}</p>}
      {pantry.length > 0 && (
        <p className="text-sm text-muted">
          Noch da: {pantry.slice(0, 6).map(formatPantryItem).join(", ")}
          {pantry.length > 6 ? " …" : ""}{" "}
          <Link href="/vorrat" onClick={onNavigate} className="font-semibold text-accent-strong underline">
            ändern
          </Link>
        </p>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Filter">
        {SPONTAN_FILTERS.map((f) => (
          <button key={f.value} type="button" aria-pressed={filters.includes(f.value)} onClick={() => onToggle(f.value)} className={chipClass(filters.includes(f.value))}>
            {f.label}
          </button>
        ))}
        {/* Basis nach Beliebtheit (ohne Quinoa – selten spontan da) */}
        {sortedBases(baseCounts)
          .filter((b) => b.id !== "quinoa")
          .map((b) => {
            const value: SpontanFilter = `basis:${b.id}`;
            return (
              <button key={b.id} type="button" aria-pressed={filters.includes(value)} onClick={() => onToggle(value)} className={chipClass(filters.includes(value))}>
                {b.label}
              </button>
            );
          })}
      </div>
      {ideas.length === 0 ? (
        <p className="rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 text-base leading-snug">
          {filters.includes("einkauf")
            ? "Damit fällt mir gerade nichts ein – erzähl mir, was noch da ist."
            : "Ohne Einkauf fällt mir damit gerade nichts ein – probier „🛒 1 Sache darf fehlen“ oder erzähl mir, was noch da ist."}
        </p>
      ) : (
        <ul className="w-full overflow-hidden rounded-card border border-line bg-surface shadow-card">
          {ideas.map((idea) => (
            <li key={idea.id} className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0">
              <div className="flex items-start gap-3">
                {idea.category && <CategoryDot category={idea.category} />}
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-snug">{idea.title}</span>
                  <span className="block text-sm text-muted">
                    {[
                      idea.minutes !== null ? `${idea.minutes} Min.` : "",
                      idea.uses.length ? usesLine(idea.uses, idea.extra, 3) : "geht meistens mit Grundzutaten",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {idea.recipeId && (
                  <Link
                    href={`/kochbuch/rezept?id=${encodeURIComponent(idea.recipeId)}`}
                    onClick={onNavigate}
                    aria-label={`Rezept ${idea.title} ansehen`}
                    className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center text-stone-400"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  </Link>
                )}
              </div>
              <button type="button" onClick={() => onTake(idea)} className={`${buttonClass("soft", "sm")} self-start`}>
                Für heute übernehmen
              </button>
            </li>
          ))}
        </ul>
      )}
      {ready && (
        <button type="button" onClick={onAskMore} className={`${chipClass(false, "muted")} self-start`}>
          <Sparkles className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Andere Ideen von {helperName}
        </button>
      )}
    </div>
  );
}
