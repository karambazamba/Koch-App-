"use client";

// Kochtipp-Karte im Chat: Bild, Abzeichen („alles im Haus“, „fast alles im
// Haus“, „Resteessen“, „Einkauf nötig“), Titel, „für 2 ▾ · 25 Min · nimmt
// dein Hähnchen …“ (genutzte Zutaten grün), „auf die Liste: …“ und die
// Knöpfe „Anderes“ / „Machen wir“ (nur an der neuesten Karte).

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Check, ChevronDown, Dices, Recycle, ShoppingCart } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { DishPicture } from "@/components/essen/DishPicture";
import { dishTone } from "@/lib/essen/dishLook";
import { BADGE_LABEL, type CookBadge, type CookCard } from "@/lib/essen/kochtipp/pick";

const BADGE_ICON = { alles: Check, fast: Check, reste: Recycle, einkauf: ShoppingCart } satisfies Record<CookBadge, unknown>;
const BADGE_TONE: Record<CookBadge, string> = { alles: "bg-good-soft text-good-ink", fast: "bg-good-soft text-good-ink", reste: "bg-good-soft text-good-ink", einkauf: "bg-accent-soft text-accent-strong" };

type Props = { card: CookCard; persons: number; live: boolean; onPersons: (n: number) => void; onAnother: () => void; onTake: () => void; onNavigate: () => void };

export function KochtippCard({ card, persons, live, onPersons, onAnother, onTake, onNavigate }: Props) {
  const Icon = BADGE_ICON[card.badge];
  const ref = useRef<HTMLElement>(null);
  // Neue Karte ganz ins Bild holen (sie ist höher als eine Blase)
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => ref.current?.scrollIntoView({ block: "end", behavior: "smooth" }), 80);
    return () => clearTimeout(t);
  }, [live, card.title]);
  return (
    <article ref={ref} className={`w-full max-w-sm shrink-0 overflow-hidden rounded-card border border-line bg-surface ${live ? "" : "opacity-60"}`} aria-label={`Vorschlag: ${card.title}`}>
      <div className="relative">
        <DishPicture title={card.title} ingredients={card.ingredients} category={card.category} tone={dishTone(card.title, card.category)} alt="" className="h-36 w-full object-cover" />
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${BADGE_TONE[card.badge]}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
          {BADGE_LABEL[card.badge]}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 p-3.5">
        <h3 className="text-lg font-extrabold leading-snug">{card.title}</h3>
        <p className="flex flex-wrap items-center gap-x-1.5 text-[14px] text-muted">
          <label className="relative inline-flex items-center font-semibold text-ink">
            <span>für {persons}</span>
            <ChevronDown className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            <select value={persons} onChange={(e) => onPersons(Number(e.target.value))} disabled={!live} aria-label="Für wie viele Personen?" className="absolute inset-0 text-base opacity-0">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  für {n}
                </option>
              ))}
            </select>
          </label>
          <span aria-hidden>·</span>
          <span>{card.minutes} Min</span>
          {card.uses.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>
                nimmt dein{card.uses.length === 1 ? "" : "e"} <span className="font-semibold text-good-ink">{card.uses.slice(0, 3).join(", ")}</span>
              </span>
            </>
          )}
        </p>
        {card.needs.length > 0 && (
          <Link href="/einkaufsliste" onClick={onNavigate} className="self-start text-[14px] font-semibold text-accent-strong underline">
            auf die Liste: {card.needs.slice(0, 3).join(", ")}
          </Link>
        )}
        {live && (
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button type="button" onClick={onAnother} className={buttonClass("secondary", "md")}>
              <Dices className="h-4 w-4" strokeWidth={2.25} aria-hidden /> Anderes
            </button>
            <button type="button" onClick={onTake} className={buttonClass("primary", "md")}>
              Machen wir
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
