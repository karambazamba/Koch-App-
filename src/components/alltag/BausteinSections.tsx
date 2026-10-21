"use client";

// Eingeschaltete Bausteine auf der Essen-Seite – im selben Design wie alles
// andere: Abschnitts-Titel, weiße Karten, ein Link zur ausführlichen Seite.

import Link from "next/link";
import { CakeSlice, Carrot, ChevronRight } from "lucide-react";
import { IconBadge } from "@/components/ui/IconBadge";
import { CARD, SECTION_TITLE } from "@/components/ui/styles";
import { DishPicture } from "./DishPicture";
import { useFeature } from "@/lib/core/features";
import { useRecipes } from "@/lib/essen/cookbook";
import { dishTone } from "@/lib/essen/dishLook";
import { PANTRY_PLACES, usePantry } from "@/lib/essen/pantry";
import { openHelper } from "@/lib/lotte/open";

const SECTION = "flex flex-col gap-2";
const HEAD = "flex items-center justify-between";
const MORE = "flex h-10 items-center gap-0.5 text-sm font-bold text-accent-strong";

export function BausteinSections() {
  const recipesOn = useFeature("rezepte");
  const bakingOn = useFeature("backen");
  const pantryOn = useFeature("vorrat");
  const spontanOn = useFeature("spontan");
  const recipes = useRecipes();
  const pantry = usePantry();
  const list = recipes ? Object.values(recipes).filter((r) => r.kind !== "backen").sort((a, b) => b.cookedCount - a.cookedCount).slice(0, 8) : [];
  return (
    <>
      {spontanOn && (
        <section className={SECTION} aria-label="Spontan kochen">
          <button type="button" onClick={() => openHelper("spontan")} className={`${CARD} flex items-center gap-3 p-4 text-left active:scale-[0.99]`}>
            <IconBadge icon={Carrot} />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">Spontan kochen</span>
              <span className="block text-sm text-muted">Ideen aus dem, was da ist</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
          </button>
        </section>
      )}
      {recipesOn && (
        <section className={SECTION} aria-label="Unsere Rezepte">
          <div className={HEAD}>
            <h2 className={SECTION_TITLE}>Unsere Rezepte</h2>
            <Link href="/kochbuch" className={MORE}>
              Alle <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
          {list.length ? (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" data-no-swipe>
              {list.map((r) => (
                <Link key={r.id} href={`/kochbuch/rezept?id=${r.id}`} className={`${CARD} flex w-32 shrink-0 flex-col overflow-hidden`}>
                  <DishPicture title={r.title} ingredients={r.ingredients.map((i) => i.name)} category={r.category} tone={dishTone(r.title, r.category)} alt="" small className="aspect-[4/3] w-full" />
                  <span className="flex flex-col gap-1 p-3">
                    <span className="line-clamp-2 text-sm font-bold leading-snug">{r.title}</span>
                    {r.prepMinutes && <span className="text-xs text-muted">{r.prepMinutes} Min</span>}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Link href="/kochbuch" className={`${CARD} p-4 text-base text-muted`}>
              Noch keine eigenen Rezepte – tipp auf „Alle“ oder erzähl einfach eins.
            </Link>
          )}
        </section>
      )}
      {bakingOn && (
        <section className={SECTION} aria-label="Backen">
          <Link href="/kochbuch?filter=backen" className={`${CARD} flex items-center gap-3 p-4`}>
            <IconBadge icon={CakeSlice} />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">Zusammen backen</span>
              <span className="block text-sm text-muted">Backrezepte mit Timer und Kinder-Schritten</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
          </Link>
        </section>
      )}
      {/* Vorrat mit Inhalt steht oben als „Das ist da“; leer: ein freundlicher Einstieg (ohne Zähler) */}
      {pantryOn && pantry && pantry.length === 0 && (
        <section className={SECTION} aria-label="Vorrat">
          <Link href="/vorrat" className={`${CARD} flex items-center gap-3 p-4 active:scale-[0.99]`}>
            <span className="text-2xl" aria-hidden>
              {PANTRY_PLACES[0].emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">Vorrat</span>
              <span className="block text-sm text-muted">Trag ein, was da ist – dann passen die Ideen.</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
          </Link>
        </section>
      )}
    </>
  );
}
