"use client";

import Link from "next/link";
import { useState } from "react";
import { CARD, buttonClass } from "@/components/ui/styles";
import { EMPTY_STOCK_HINT } from "@/lib/essen/dishIdeas";
import { openHelper } from "@/lib/lotte/open";
import type { Idea } from "@/lib/essen/ideas";
import { putAside, useTodayIdeas } from "@/lib/essen/useIdeas";
import { showDeleted } from "@/lib/core/toast";
import { IdeaCards, type CardIdea } from "./IdeaCards";
import { IdeaSheet } from "./IdeaSheet";
import { useIdeaChoice } from "./useIdeaChoice";

const DECK = 3;

/** Idee (heute) → Karte; Wünsche zeigen, wer sich's wünscht */
export const ideaCard = (idea: Idea): CardIdea => ({
  id: idea.id,
  title: idea.title,
  category: idea.category,
  minutes: idea.minutes,
  recipeId: idea.recipeId,
  needs: idea.needs,
  note: idea.wishId ? idea.reason : undefined,
});

/**
 * Heute-Karte ohne Gericht: "Was gibt's heute?" mit genau 3 Ideen – gleich
 * dargestellt wie im Chat und auf der Ideen-Seite ("Heute" übernimmt).
 */
export function IdeasCard({ when = "heute" }: { when?: "heute" | "morgen" }) {
  const tomorrow = when === "morgen";
  const data = useTodayIdeas([], { tomorrow });
  const { choose, dialog } = useIdeaChoice(when);
  const label = tomorrow ? "Morgen" : "Heute";
  const [openId, setOpenId] = useState<string | null>(null);

  if (!data) return <section className={`${CARD} h-44 animate-pulse`} aria-label={label} />;
  const deck = data.ideas.slice(0, DECK);
  const open = deck.find((i) => i.id === openId);

  if (!deck.length) {
    return (
      <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label={label}>
        <p className="text-xs font-bold uppercase tracking-wider text-accent-strong">Was gibt&apos;s {when}?</p>
        <p className="text-lg font-bold leading-snug">Mehr Ideen hab ich gerade nicht – sollen wir schauen, was da ist?</p>
        <button type="button" onClick={() => openHelper("spontan")} className={`${buttonClass("secondary")} w-full`}>
          Ja, zeig mal
        </button>
      </section>
    );
  }

  const pick = (idea: Idea) => {
    setOpenId(null);
    choose(idea, data.profile, data.today, data.recipes);
  };
  const dismiss = (idea: Idea) => {
    setOpenId(null);
    const undo = putAside(data.todayIso, idea);
    if (undo) showDeleted(undo, "Weggeräumt");
  };
  const byId = (card: CardIdea) => deck.find((i) => i.id === card.id);

  return (
    <section className="flex flex-col gap-1.5" aria-label={label}>
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-strong">Was gibt&apos;s {when}?</p>
        {data.nearlyEmpty ? (
          // Vorrat (fast) leer: kurzer Hinweis oben rechts (passt ohne Scrollen)
          <button type="button" onClick={() => openHelper("spontan")} aria-label={EMPTY_STOCK_HINT} className="text-xs font-semibold text-muted underline">
            Sag mir, was da ist
          </button>
        ) : (
          <Link href="/ideen" className="text-xs font-semibold text-muted underline">
            Mehr Ideen
          </Link>
        )}
      </div>
      <IdeaCards
        ideas={deck.map(ideaCard)}
        dense
        action={label}
        onToday={(card) => {
          const idea = byId(card);
          if (idea) pick(idea);
        }}
        onOpen={(card) => setOpenId(card.id)}
      />
      {open && <IdeaSheet idea={open} when={when} onChoose={() => pick(open)} onDismiss={() => dismiss(open)} onClose={() => setOpenId(null)} />}
      {dialog}
    </section>
  );
}
