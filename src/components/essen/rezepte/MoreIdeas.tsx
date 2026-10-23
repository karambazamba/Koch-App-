"use client";

// „Mehr Ideen“ unter jedem Rezept: eine wischbare Reihe mit bis zu 8 Ideen
// (jeden Tag eine andere Mischung, siehe lib/essen/mehrIdeen/mix.ts). 2,5
// Karten sichtbar, Einrasten pro Karte, endlos in beide Richtungen (die Liste
// liegt dreifach da und springt unbemerkt in die Mitte zurück). Keine Pfeile,
// keine Punkte. Für Tastatur und Screenreader zählt nur die mittlere Liste.
// Wischen hier wechselt nie die Seite (`data-no-swipe`). Dieselbe Reihe steht
// auch auf der Essen-Seite („Ideen für heute“) – dort mit „Fürs Abendessen“.

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { DishPicture } from "@/components/essen/DishPicture";
import { SECTION_TITLE } from "@/components/ui/styles";
import { dishTone } from "@/lib/essen/dishLook";
import { demoLook, DEMO_RECIPES } from "@/lib/essen/demoDish";
import { useRecipes } from "@/lib/essen/cookbook";
import { BUILTIN_COOK } from "@/lib/essen/kochen";
import { moreIdeas, type MixCard } from "@/lib/essen/mehrIdeen/mix";
import { noteIdeaInterest, noteIdeasShown, useIdeaInterest } from "@/lib/essen/mehrIdeen/store";
import { recentDishTitles } from "@/lib/essen/kochtipp/recent";
import { useMealPlans } from "@/lib/essen/mealPlan";
import { toIsoDate, useToday, useWeekPlans } from "@/lib/essen/weekPlan";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { useStock } from "@/lib/essen/useStock";
import type { Recipe } from "@/lib/essen/cookbook";

function IdeaCard({ card, hidden, take }: { card: MixCard; hidden: boolean; take?: { label: string; onTake: (r: Recipe) => void } }) {
  const r = card.recipe;
  const look = demoLook(r.id);
  return (
    <li aria-hidden={hidden || undefined} className="w-[calc((100%-1rem)/2.5)] shrink-0 snap-start">
      <div className="flex h-full flex-col rounded-card border border-line bg-surface p-1.5 shadow-card">
        <Link href={`/kochbuch/rezept?id=${encodeURIComponent(r.id)}`} tabIndex={hidden ? -1 : undefined} onClick={() => noteIdeaInterest(r)} className="flex flex-1 flex-col gap-1.5" aria-label={`${r.title}${r.prepMinutes ? ` · ${r.prepMinutes} Min` : ""}`}>
          <DishPicture photo={look?.photo} title={r.title} ingredients={r.ingredients.map((i) => i.name)} category={r.category} tone={look?.tone ?? dishTone(r.title, r.category)} alt="" className="aspect-square w-full rounded-field" small />
          <span className="line-clamp-2 px-1 text-[13px] font-bold leading-tight">{r.title}</span>
          <span className="mt-auto flex flex-wrap items-center gap-x-1.5 px-1 pb-1 text-xs text-muted">
            {r.prepMinutes ? <span>{r.prepMinutes} Min</span> : null}
            {card.label && <span className="font-semibold text-accent-strong">{card.label}</span>}
          </span>
        </Link>
        {take && (
          <button type="button" tabIndex={hidden ? -1 : undefined} onClick={() => (noteIdeaInterest(r), take.onTake(r))} className="hit mt-0.5 min-h-9 rounded-full bg-accent-soft px-2 text-[12.5px] font-bold text-accent-strong active:scale-95">
            {take.label}
          </button>
        )}
      </div>
    </li>
  );
}

export function MoreIdeas({
  current,
  demo = false,
  title = "Mehr Ideen",
  exclude = null,
  take,
}: {
  current: string;
  demo?: boolean;
  title?: string;
  /** Titel, der schon geplant ist (steht nie in der Reihe) */
  exclude?: string | null;
  take?: { label: string; onTake: (r: Recipe) => void };
}) {
  const recipes = useRecipes();
  const profile = useProfile();
  const stock = useStock();
  const today = useToday();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const interest = useIdeaInterest();
  const scroller = useRef<HTMLUListElement>(null);

  const cards = useMemo(() => {
    if (!recipes || !today || profile === undefined) return [];
    const own = Object.values(recipes);
    const recent = profile && weekPlans && mealPlans ? recentDishTitles({ profile, weekPlans, mealPlans, recipes }, today, 7) : [];
    return moreIdeas({
      recipes: demo ? [...DEMO_RECIPES, ...BUILTIN_COOK] : [...BUILTIN_COOK, ...own],
      current,
      date: toIsoDate(today),
      household: profile?.householdName || "haushalt",
      avoid: profile ? profile.persons.flatMap((p) => [...p.allergies, ...p.dislikes]) : [],
      recent: exclude ? [...recent, exclude] : recent,
      stock: stock ?? [],
      interest,
    });
  }, [recipes, today, profile, weekPlans, mealPlans, stock, interest, current, demo, exclude]);

  const loop = cards.length >= 3;
  const ids = cards.map((c) => c.recipe.id).join("|");
  useEffect(() => {
    if (ids && today) noteIdeasShown(ids.split("|"), toIsoDate(today));
  }, [ids, today]);

  // Breite einer Liste (Abstand vom 1. Eintrag der ersten zur zweiten Kopie)
  const setWidth = () => {
    const items = scroller.current?.children;
    if (!items || items.length < cards.length * 2) return 0;
    return (items[cards.length] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft;
  };
  // Start in der mittleren Kopie
  useLayoutEffect(() => {
    const el = scroller.current;
    const w = setWidth();
    if (el && loop && w) el.scrollLeft = w;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, loop]);
  // Endlos: nach dem Einrasten unbemerkt in die mittlere Kopie zurück
  useEffect(() => {
    const el = scroller.current;
    if (!el || !loop) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      const w = setWidth();
      if (!w) return;
      if (el.scrollLeft < w * 0.5) el.scrollLeft += w;
      else if (el.scrollLeft >= w * 1.5) el.scrollLeft -= w;
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(settle, 140);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, loop]);

  if (!cards.length) return null;
  const copies = loop ? [0, 1, 2] : [1];
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className={`${SECTION_TITLE} ${take ? "px-1" : ""}`}>{title}</h3>
      <ul ref={scroller} data-no-swipe className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {copies.flatMap((copy) => cards.map((c) => <IdeaCard key={`${copy}-${c.recipe.id}`} card={c} hidden={copy !== 1} take={take} />))}
      </ul>
    </section>
  );
}
