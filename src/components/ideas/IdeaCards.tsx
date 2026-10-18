"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import type { RecipeCategory } from "@/lib/cookbook";
import { dishEmoji } from "@/lib/dishEmoji";

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

/** "25 Min · alles im Haus" bzw. "35 Min · noch: Kokosmilch" */
export function ideaMeta(idea: CardIdea): { time: string; stock: string; ready: boolean } {
  return {
    time: idea.minutes !== null ? `${idea.minutes} Min` : "",
    stock: idea.needs.length ? `noch: ${list(idea.needs.slice(0, 2))}${idea.needs.length > 2 ? " …" : ""}` : "alles im Haus",
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
}) {
  return (
    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card" aria-label={label}>
      {ideas.map((idea) => {
        const meta = ideaMeta(idea);
        const body = (
          <>
            <span
              className={`flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-accent-soft to-accent/30 ${dense ? "h-10 w-10 text-2xl" : "h-12 w-12 text-[1.75rem]"}`}
              aria-hidden
            >
              {dishEmoji(idea.title, idea.category)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold leading-snug">{idea.title}</span>
              <span className="flex min-w-0 items-center gap-1 text-sm text-muted">
                {idea.note && <span className="truncate font-semibold text-accent-strong">{idea.note} ·</span>}
                {meta.time && <span className="shrink-0">{meta.time} ·</span>}
                <span className={`truncate ${meta.ready ? "font-semibold text-emerald-700" : ""}`}>{meta.stock}</span>
              </span>
            </span>
            {(idea.recipeId || onOpen) && <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={2.25} aria-hidden />}
          </>
        );
        const area = `flex min-w-0 flex-1 items-center gap-3 text-left ${dense ? "py-2" : "py-2.5"}`;
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
            <button type="button" onClick={() => onToday(idea)} aria-label={`${idea.title} heute`} className={`${buttonClass("soft", "sm")} shrink-0`}>
              Heute
            </button>
          </li>
        );
      })}
    </ul>
  );
}
