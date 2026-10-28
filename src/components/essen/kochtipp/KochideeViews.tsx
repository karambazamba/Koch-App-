"use client";

// Kochidee im Gespräch (Tafel 65): drei Vorschläge als Zeilen (Bild, Titel,
// Minuten, Zutaten-Zeile, „Nehmen“), darunter Vorschlags-Knöpfe („Oder
// worauf hast du Lust?“ – keine zweite Mia, die große unten bleibt die
// einzige antippbare) und das Ergebnis als Karussell zum Durchwischen
// (nächste Karte schaut hervor, Punkte darunter, zuletzt „Noch was anderes?“).
// Karte antippen (überall außer „Nehmen“) = Rezept-Vorschau (A-038, `onOpen`).

import { useRef, useState, type ReactNode } from "react";
import { Check, RefreshCw } from "lucide-react";
import { SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { DishPicture } from "@/components/essen/DishPicture";
import { dishTone } from "@/lib/essen/dishLook";
import { ingredientLine } from "@/lib/essen/kochtipp/idee";
import type { CookCard } from "@/lib/essen/kochtipp/pick";
import type { Vorschlag } from "@/lib/essen/vorschau";

/** Kochidee-Karte → Vorschlag für die Vorschau */
export const cardVorschlag = (card: CookCard, persons?: number): Vorschlag => ({ title: card.title, category: card.category, minutes: card.minutes, recipeId: card.recipeId, needs: card.needs, unsure: card.unsure, ingredients: card.ingredients, persons });

/** Grün „alles im Haus“, grau „vermutlich im Haus: …“ bzw. orange „auf die Liste: …“ */
function Line({ card }: { card: CookCard }) {
  return <span className={`text-[13px] font-semibold ${card.needs.length ? "text-accent-strong" : card.unsure?.length ? "text-muted" : "text-good-ink"}`}>{ingredientLine(card)}</span>;
}

/** Ein Vorschlag als Zeile (ohne Frage, gleich beim Öffnen); antippen = Vorschau, „Nehmen“ = eintragen */
export function IdeaRow({ card, live, onTake, onOpen, hinweis }: { card: CookCard; live: boolean; onTake: () => void; onOpen: () => void; hinweis?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <article className="flex items-center gap-3 rounded-card border border-line bg-surface p-2.5" aria-label={`Vorschlag: ${card.title}`}>
        <button type="button" onClick={onOpen} aria-label={`${card.title} – reinschauen`} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]" data-vorschau-oeffnen>
          <DishPicture title={card.title} ingredients={card.ingredients} category={card.category} tone={dishTone(card.title, card.category)} alt="" className="h-16 w-16 shrink-0 rounded-field object-cover" small />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="line-clamp-2 text-[15px] font-extrabold leading-snug">{card.title}</span>
            <span className="text-[13px] text-muted">{card.minutes} Min</span>
            <Line card={card} />
          </span>
        </button>
        {live && (
          <button type="button" onClick={onTake} className={`${buttonClass("primary", "sm")} shrink-0`}>
            Nehmen
          </button>
        )}
      </article>
      {hinweis}
    </div>
  );
}

/**
 * „Oder worauf hast du Lust?“ – Vorschlags-Knöpfe (weiß, Rand und Text
 * Orange); ein Tipp schickt den Satz als eigene Nachricht ab. Keine zweite
 * Mia: auf der Bühne ist nur die große Mia unten antippbar.
 */
export function IdeaSuggestions({ suggestions, onPick }: { suggestions: string[]; onPick: (text: string) => void }) {
  if (!suggestions.length) return null;
  return (
    <section aria-label="Oder worauf hast du Lust?" className="flex flex-col gap-2 pt-1" data-vorschlaege>
      <h3 className={SECTION_TITLE}>Oder worauf hast du Lust?</h3>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button key={s} type="button" onClick={() => onPick(s)} className={chipClass(false, "vorschlag")}>
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Ergebnis-Karte im Karussell; antippen (außer „Nehmen“) = Vorschau */
function ResultCard({ card, persons, onTake, onOpen }: { card: CookCard; persons: number; onTake: () => void; onOpen: () => void }) {
  const chips = card.ingredients.slice(0, 6);
  return (
    <article className="flex w-[82%] shrink-0 snap-start flex-col overflow-hidden rounded-card border border-line bg-surface" aria-label={`Vorschlag: ${card.title}`}>
      <button type="button" onClick={onOpen} aria-label={`${card.title} – reinschauen`} className="flex flex-1 flex-col text-left" data-vorschau-oeffnen>
        <DishPicture title={card.title} ingredients={card.ingredients} category={card.category} tone={dishTone(card.title, card.category)} alt="" className="h-36 w-full object-cover" />
        <span className="flex flex-col gap-2 px-3.5 pt-3.5">
          <span className="text-lg font-extrabold leading-snug">{card.title}</span>
          <span className="text-[14px] text-muted">
            {card.minutes} Min · für {persons}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {chips.map((i) => {
              const has = card.uses.some((u) => u.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(u.toLowerCase())) || !card.needs.includes(i);
              return (
                <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${has ? "bg-good-soft text-good-ink" : "bg-fill text-muted"}`}>
                  {has && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
                  {i}
                </span>
              );
            })}
          </span>
          <Line card={card} />
        </span>
      </button>
      <div className="mt-auto grid grid-cols-2 gap-2 p-3.5 pt-3">
        <button type="button" onClick={onOpen} className={buttonClass("secondary", "md")}>
          Rezept ansehen
        </button>
        <button type="button" onClick={onTake} className={buttonClass("primary", "md")}>
          Nehmen
        </button>
      </div>
    </article>
  );
}

/** Drei passende Gerichte zum Durchwischen, zuletzt „Noch was anderes?“ */
export function IdeaCarousel({ cards, persons, live, onTake, onOpen, onMore }: { cards: CookCard[]; persons: number; live: boolean; onTake: (card: CookCard) => void; onOpen: (card: CookCard) => void; onMore: () => void }) {
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
          <ResultCard key={c.title} card={c} persons={persons} onTake={() => live && onTake(c)} onOpen={() => onOpen(c)} />
        ))}
        <button type="button" onClick={onMore} disabled={!live} className="flex w-[82%] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong bg-surface p-6 text-center">
          <RefreshCw className="h-9 w-9 text-accent-strong" strokeWidth={2} aria-hidden />
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
