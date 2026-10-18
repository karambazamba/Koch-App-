"use client";

import { useRef, useState } from "react";
import { ChevronRight, Clock } from "lucide-react";
import { CARD, buttonClass } from "@/components/ui/styles";
import { dishEmoji } from "@/lib/dishEmoji";
import { EMPTY_STOCK_HINT, usesLine } from "@/lib/dishIdeas";
import { openHelper } from "@/lib/assistant/open";
import { nextIdea, putAside, useTodayIdeas } from "@/lib/useIdeas";
import { showToast } from "@/lib/toast";
import { IdeaSheet } from "./IdeaSheet";
import { useIdeaChoice } from "./useIdeaChoice";

const SWIPE = 50;
const DECK = 3;
const HINT_KEY = "wasgibts.ideen-hinweis";

const hintSeen = () => {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true;
  }
};

/**
 * Heute-Karte ohne Gericht: "Was gibt's heute?" mit 3 Ideen.
 * Wischen links = nicht jetzt, rechts = nächste Idee, tippen = mehr.
 */
export function IdeasCard() {
  const data = useTodayIdeas();
  const { choose, dialog } = useIdeaChoice();
  const [open, setOpen] = useState(false);
  const [dx, setDx] = useState(0);
  const [hint, setHint] = useState(() => !hintSeen());
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  if (!data) return <section className={`${CARD} h-44 animate-pulse`} aria-label="Heute" />;
  const deck = data.ideas.slice(0, DECK);
  const index = Math.min(data.index, Math.max(0, deck.length - 1));
  const idea = deck[index];
  const gestureDone = () => {
    if (!hint) return;
    setHint(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      // egal
    }
  };

  if (!idea) {
    return (
      <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Heute">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-strong">Was gibt&apos;s heute?</p>
        <p className="text-lg font-bold leading-snug">Mehr Ideen hab ich gerade nicht – sollen wir schauen, was da ist?</p>
        <button type="button" onClick={() => openHelper("spontan")} className={`${buttonClass("secondary")} w-full`}>
          Ja, zeig mal
        </button>
      </section>
    );
  }

  const pick = () => {
    gestureDone();
    setOpen(false);
    choose(idea, data.profile, data.today, data.recipes);
  };
  const dismiss = () => {
    gestureDone();
    setOpen(false);
    const undo = putAside(data.todayIso, idea);
    if (undo) showToast({ text: `${idea.reason} ist weggeräumt.`, undo });
  };

  return (
    <section className={`${CARD} flex flex-col gap-2.5 overflow-hidden p-4`} aria-label="Heute">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-strong">Was gibt&apos;s heute?</p>
        {data.nearlyEmpty ? (
          // Vorrat (fast) leer: kurzer Hinweis oben rechts (passt ohne Scrollen)
          <button type="button" onClick={() => openHelper("spontan")} aria-label={EMPTY_STOCK_HINT} className="text-xs font-semibold text-muted underline">
            Sag mir, was da ist
          </button>
        ) : hint ? (
          // Bis zur ersten Geste: kurzer Hinweis statt der Punkte
          <span className="text-xs text-muted">← nicht jetzt · nächste →</span>
        ) : deck.length > 1 && (
          <span className="flex gap-1" aria-label={`Idee ${index + 1} von ${deck.length}`}>
            {deck.map((d, i) => (
              <span key={d.id} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-accent" : "bg-stone-300"}`} aria-hidden />
            ))}
          </span>
        )}
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${idea.title} – mehr dazu`}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        }}
        onPointerMove={(e) => {
          if (!start.current || start.current.id !== e.pointerId) return;
          const moveX = e.clientX - start.current.x;
          if (Math.abs(moveX) > Math.abs(e.clientY - start.current.y)) setDx(moveX);
        }}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          setDx(0);
          if (!s) return;
          const moveX = e.clientX - s.x;
          const moveY = e.clientY - s.y;
          if (moveX <= -SWIPE) dismiss();
          else if (moveX >= SWIPE) {
            gestureDone();
            nextIdea(data.todayIso, deck.length, data.stockKey);
          } else if (Math.abs(moveX) < 8 && Math.abs(moveY) < 8) setOpen(true);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDx(0);
        }}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, opacity: dx ? Math.max(0.4, 1 - Math.abs(dx) / 240) : undefined, touchAction: "pan-y" }}
        className="flex cursor-pointer select-none items-center gap-3 transition-[transform,opacity] duration-75"
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-accent-soft to-accent/35 text-4xl" aria-hidden>
          {dishEmoji(idea.title, idea.category)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-extrabold leading-tight tracking-tight">{idea.title}</span>
          {/* Eine Zeile: Zeit, dann was aus dem Vorrat genutzt wird (bzw. der Grund) */}
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted">
            {idea.minutes !== null && (
              <span className="inline-flex shrink-0 items-center gap-1">
                <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> {idea.minutes} Min. ·
              </span>
            )}
            <span className="truncate font-semibold text-accent-strong">{idea.uses.length && !idea.wishId ? usesLine(idea.uses, idea.needs, 3) : idea.reason}</span>
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" strokeWidth={2.25} aria-hidden />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={pick} className={`${buttonClass("primary", "sm")} flex-1`}>
          Das gibt&apos;s heute
        </button>
        <button
          type="button"
          onClick={() => {
            gestureDone();
            nextIdea(data.todayIso, deck.length, data.stockKey);
          }}
          className={buttonClass("secondary", "sm")}
        >
          Andere Idee
        </button>
      </div>
      {open && <IdeaSheet idea={idea} onChoose={pick} onDismiss={dismiss} onClose={() => setOpen(false)} />}
      {dialog}
    </section>
  );
}
