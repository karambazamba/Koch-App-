"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import type { RecipeCategory } from "@/lib/essen/cookbook";
import { dishTone } from "@/lib/essen/dishLook";
import { DishPicture } from "@/components/alltag/DishPicture";

/** Eine Idee, wie sie überall gleich aussieht (Chat, Ideen-Seite, "Was gibt's heute?") */
export type CardIdea = {
  id: string;
  title: string;
  category: RecipeCategory | null;
  minutes: number | null;
  recipeId?: string;
  /** Was dafür noch gebraucht wird (leer = alles im Haus) */
  needs: string[];
  /** Kurzer Vorspann, z. B. "Mathis' Wunsch 🎉" */
  note?: string;
};

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`);

/** "25 Min · alles im Haus" bzw. "35 Min · auf die Liste: Kokosmilch" */
function ideaMeta(idea: CardIdea): { time: string; stock: string; ready: boolean } {
  return {
    time: idea.minutes !== null ? `${idea.minutes} Min` : "",
    stock: idea.needs.length ? `auf die Liste: ${list(idea.needs.slice(0, 2))}${idea.needs.length > 2 ? " …" : ""}` : "alles im Haus",
    ready: idea.needs.length === 0,
  };
}

/**
 * Kompakte Ideen-Karten: Emoji links, Name fett, darunter Zeit und was es
 * noch braucht, rechts "Heute". Tippen öffnet das Rezept (bzw. `onOpen`).
 */
export function IdeaCards({
  ideas,
  label = "Ideen",
  onToday,
  onOpen,
  onNavigate,
  dense = false,
  action = "Heute",
}: {
  ideas: CardIdea[];
  label?: string;
  onToday: (idea: CardIdea) => void;
  /** Ohne Rezept (Klassiker, Wunsch): Details zeigen */
  onOpen?: (idea: CardIdea) => void;
  /** Vor dem Wechsel zur Rezeptseite (z. B. Panel schließen) */
  onNavigate?: () => void;
  /** Etwas flacher (Startseite) */
  dense?: boolean;
  /** Knopf rechts ("Heute" bzw. nach dem Essen "Morgen") */
  action?: "Heute" | "Morgen";
}) {
  return (
    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card" aria-label={label}>
      {ideas.map((idea) => {
        const meta = ideaMeta(idea);
        const body = (
          <>
            <DishPicture title={idea.title} category={idea.category} tone={dishTone(idea.title, idea.category)} alt="" small className={`shrink-0 rounded-full ${dense ? "h-9 w-9" : "h-12 w-12"}`} />
            <span className="min-w-0 flex-1">
              <span className={`block truncate font-bold ${dense ? "leading-tight" : "leading-snug"}`}>{idea.title}</span>
              <span className={`flex min-w-0 items-center gap-1 text-sm text-muted ${dense ? "leading-tight" : ""}`}>
                {idea.note && <span className="truncate font-semibold text-accent-strong">{idea.note} ·</span>}
                {meta.time && <span className="shrink-0">{meta.time} ·</span>}
                <span className={`truncate ${meta.ready ? "font-semibold text-good-ink" : ""}`}>{meta.stock}</span>
              </span>
            </span>
            {(idea.recipeId || onOpen) && <ChevronRight className="h-4 w-4 shrink-0 text-faint" strokeWidth={2.25} aria-hidden />}
          </>
        );
        const area = `flex min-w-0 flex-1 items-center gap-3 text-left ${dense ? "py-1" : "py-2.5"}`;
        return (
          <li key={idea.id} className="flex items-center gap-2 pl-3 pr-3">
            {idea.recipeId ? (
              <Link href={`/kochbuch/rezept?id=${encodeURIComponent(idea.recipeId)}`} onClick={onNavigate} className={area} aria-label={`${idea.title} – Rezept`}>
                {body}
              </Link>
            ) : onOpen ? (
              <button type="button" onClick={() => onOpen(idea)} className={area} aria-label={`${idea.title} – mehr dazu`}>
                {body}
              </button>
            ) : (
              <span className={area}>{body}</span>
            )}
            <button type="button" onClick={() => onToday(idea)} aria-label={`${idea.title} ${action.toLowerCase()}`} className={`${buttonClass("soft", "sm")} shrink-0 ${dense ? "my-1" : ""}`}>
              {action}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
