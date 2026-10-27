"use client";

// Kochidee im Gespräch (Tafel 65): drei Vorschläge als Zeilen (Bild, Titel,
// Minuten, Zutaten-Zeile, „Nehmen“), die einladende Mia-Karte („Ganz was
// anderes?“ / „Passt nicht?“ – Mia selbst ist der Knopf, kein Pfeil, kein
// Mikrofon) und das Ergebnis als Karussell zum Durchwischen (nächste Karte
// schaut hervor, Punkte darunter, zuletzt „Noch was anderes?“).

import Link from "next/link";
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { DishPicture } from "@/components/essen/DishPicture";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { dishTone } from "@/lib/essen/dishLook";
import { ingredientLine } from "@/lib/essen/kochtipp/idee";
import type { CookCard } from "@/lib/essen/kochtipp/pick";
import { useRecipes } from "@/lib/essen/cookbook";
import { recipeHref } from "@/lib/essen/baking";

/** Grün „alles im Haus“, grau „vermutlich im Haus: …“ bzw. orange „auf die Liste: …“ */
function Line({ card }: { card: CookCard }) {
  return <span className={`text-[13px] font-semibold ${card.needs.length ? "text-accent-strong" : card.unsure?.length ? "text-muted" : "text-good-ink"}`}>{ingredientLine(card)}</span>;
}

/** Ein Vorschlag als Zeile (ohne Frage, gleich beim Öffnen) */
export function IdeaRow({ card, live, onTake }: { card: CookCard; live: boolean; onTake: () => void }) {
  return (
    <article className="flex items-center gap-3 rounded-card border border-line bg-surface p-2.5" aria-label={`Vorschlag: ${card.title}`}>
      <DishPicture title={card.title} ingredients={card.ingredients} category={card.category} tone={dishTone(card.title, card.category)} alt="" className="h-16 w-16 shrink-0 rounded-field object-cover" small />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 text-[15px] font-extrabold leading-snug">{card.title}</span>
        <span className="text-[13px] text-muted">{card.minutes} Min</span>
        <Line card={card} />
      </div>
      {live && (
        <button type="button" onClick={onTake} className={`${buttonClass("primary", "sm")} shrink-0`}>
          Nehmen
        </button>
      )}
    </article>
  );
}

/** Mia lädt ein: ganze Karte antippbar, Mia pulsiert und zwinkert */
export function MiaInvite({ title, text, examples, onTalk, onExample }: { title: string; text: string; examples?: string[]; onTalk: () => void; onExample?: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={onTalk} className="mia-einladen flex w-full items-center gap-3.5 rounded-card border border-accent/25 bg-accent-soft/60 p-3 text-left active:scale-[0.99]">
        <span className="relative shrink-0 rounded-full shadow-float" aria-hidden>
          <span className="mia-wellen" />
          <span className="mia-wellen zwei" />
          <span className="mia-zwinkern mia-atmet block">
            <BegleitungAvatar size={60} groesse="gross" />
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[16px] font-extrabold text-ink">{title}</span>
          <span className="text-[14px] leading-snug text-muted">{text}</span>
        </span>
      </button>
      {examples && onExample && (
        <div className="flex flex-wrap gap-2">
          {examples.map((e) => (
            <button key={e} type="button" onClick={() => onExample(e)} className={chipClass(false)}>
              „{e}“
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ergebnis-Karte im Karussell */
function ResultCard({ card, persons, onTake, onNavigate }: { card: CookCard; persons: number; onTake: () => void; onNavigate: () => void }) {
  // Link nur, wenn es das Rezept (noch) gibt
  const href = recipeHref(useRecipes(), card.recipeId);
  const chips = card.ingredients.slice(0, 6);
  return (
    <article className="flex w-[82%] shrink-0 snap-start flex-col overflow-hidden rounded-card border border-line bg-surface" aria-label={`Vorschlag: ${card.title}`}>
      <DishPicture title={card.title} ingredients={card.ingredients} category={card.category} tone={dishTone(card.title, card.category)} alt="" className="h-36 w-full object-cover" />
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3 className="text-lg font-extrabold leading-snug">{card.title}</h3>
        <p className="text-[14px] text-muted">
          {card.minutes} Min · für {persons}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((i) => {
            const has = card.uses.some((u) => u.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(u.toLowerCase())) || !card.needs.includes(i);
            return (
              <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${has ? "bg-good-soft text-good-ink" : "bg-fill text-muted"}`}>
                {has && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
                {i}
              </span>
            );
          })}
        </div>
        <Line card={card} />
        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          {href ? (
            <Link href={href} onClick={onNavigate} className={buttonClass("secondary", "md")}>
              Rezept ansehen
            </Link>
          ) : (
            <span />
          )}
          <button type="button" onClick={onTake} className={buttonClass("primary", "md")}>
            Nehmen
          </button>
        </div>
      </div>
    </article>
  );
}

/** Drei passende Gerichte zum Durchwischen, zuletzt „Noch was anderes?“ */
export function IdeaCarousel({ cards, persons, live, onTake, onMore, onNavigate }: { cards: CookCard[]; persons: number; live: boolean; onTake: (card: CookCard) => void; onMore: () => void; onNavigate: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = cards.length + 1;
  return (
    <div className={`flex w-full flex-col gap-2 ${live ? "" : "opacity-60"}`}>
      <div
        ref={track}
        data-no-swipe
        aria-label="Vorschläge zum Durchwischen"
        onScroll={(e) => {
          const el = e.currentTarget;
          const first = el.firstElementChild as HTMLElement | null;
          if (!first) return;
          setActive(Math.min(count - 1, Math.round(el.scrollLeft / (first.offsetWidth + 12))));
        }}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none]"
      >
        {cards.map((c) => (
          <ResultCard key={c.title} card={c} persons={persons} onTake={() => live && onTake(c)} onNavigate={onNavigate} />
        ))}
        <button type="button" onClick={onMore} disabled={!live} className="flex w-[82%] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong bg-surface p-6 text-center">
          <BegleitungAvatar size={64} groesse="gross" />
          <span className="text-[17px] font-extrabold">Noch was anderes?</span>
          <span className="text-[14px] text-muted">Drei neue zu denselben Wünschen</span>
        </button>
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className={`h-1.5 rounded-full ${i === active ? "w-5 bg-accent" : "w-1.5 bg-line-strong"}`} />
        ))}
      </div>
    </div>
  );
}

/** Bei geplantem Gericht oben gestrichelt: „<Gericht> – bleibt, wenn du nichts nimmst“ */
export function StaysLine({ dish }: { dish: string }) {
  return <p className="rounded-field border border-dashed border-line-strong px-3 py-2 text-[14px] text-muted">{dish} – bleibt, wenn du nichts nimmst</p>;
}
