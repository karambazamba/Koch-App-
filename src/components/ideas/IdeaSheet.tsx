"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { Sheet } from "@/components/plan/Sheet";
import { CARD, buttonClass } from "@/components/ui/styles";
import { dishEmoji } from "@/lib/essen/dishEmoji";
import type { Idea } from "@/lib/essen/ideas";

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} und ${items[items.length - 1]}`);

/** "Mehr" zu einer Idee: Grund, Zeit, was es noch braucht, Rezept */
export function IdeaSheet({
  idea,
  onChoose,
  onDismiss,
  onClose,
  when = "heute",
}: {
  idea: Idea;
  onChoose: () => void;
  onDismiss: () => void;
  onClose: () => void;
  when?: "heute" | "morgen";
}) {
  return (
    <Sheet title={idea.title} onClose={onClose}>
      <div className={`${CARD} flex items-center gap-4 p-4`}>
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-4xl" aria-hidden>
          {dishEmoji(idea.title, idea.category)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-accent-strong">{idea.reason}</p>
          {idea.minutes !== null && (
            <p className="flex items-center gap-1 text-sm text-muted">
              <Clock className="h-4 w-4" strokeWidth={2} aria-hidden /> etwa {idea.minutes} Min.
            </p>
          )}
        </div>
      </div>
      <p className="px-1 text-base">
        {[
          idea.uses.length ? `Nutzt aus dem Vorrat: ${list(idea.uses)}.` : "",
          idea.needs.length ? `Dafür brauchst du noch: ${list(idea.needs)}.` : idea.uses.length ? "Sonst ist alles da ✓" : "Geht meistens mit dem, was im Haus ist.",
        ]
          .filter(Boolean)
          .join(" ")}
      </p>
      {idea.recipeId && (
        <Link href={`/kochbuch/rezept?id=${encodeURIComponent(idea.recipeId)}`} onClick={onClose} className="px-1 font-semibold text-accent-strong underline">
          Rezept ansehen
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 pb-2">
        <button type="button" onClick={onDismiss} className={buttonClass("secondary", "lg")}>
          Nicht jetzt
        </button>
        <button type="button" onClick={onChoose} className={buttonClass("primary", "lg")}>
          Das gibt&apos;s {when}
        </button>
      </div>
    </Sheet>
  );
}
