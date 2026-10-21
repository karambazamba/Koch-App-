"use client";

// Eingeschaltete Bausteine auf der Essen-Seite – im selben Design wie alles
// andere: Abschnitts-Titel, weiße Karten, ein Link zur ausführlichen Seite.

import Link from "next/link";
import { CakeSlice, Carrot, ChevronRight } from "lucide-react";
import { IconBadge } from "@/components/ui/IconBadge";
import { CARD } from "@/components/ui/styles";
import { useFeature } from "@/lib/core/features";
import { useRecipes } from "@/lib/essen/cookbook";
import { dishEmoji } from "@/lib/essen/dishEmoji";
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
            <h2 className="text-lg font-bold">Unsere Rezepte</h2>
            <Link href="/kochbuch" className={MORE}>
              Alle <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
          {list.length ? (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" data-no-swipe>
              {list.map((r) => (
                <Link key={r.id} href={`/kochbuch/rezept?id=${r.id}`} className={`${CARD} flex w-32 shrink-0 flex-col gap-1 p-3`}>
                  <span className="text-2xl" aria-hidden>
                    {dishEmoji(r.title, r.category)}
                  </span>
                  <span className="line-clamp-2 text-sm font-bold leading-snug">{r.title}</span>
                  {r.prepMinutes && <span className="text-xs text-muted">{r.prepMinutes} Min</span>}
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
      {pantryOn && (
        <section className={SECTION} aria-label="Vorrat">
          <div className={HEAD}>
            <h2 className="text-lg font-bold">Vorrat</h2>
            <Link href="/vorrat" className={MORE}>
              Öffnen <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
          <Link href="/vorrat" className={`${CARD} grid grid-cols-3 divide-x divide-line`}>
            {PANTRY_PLACES.map((p) => (
              <span key={p.value} className="flex flex-col items-center gap-0.5 px-2 py-3">
                <span className="text-xl" aria-hidden>
                  {p.emoji}
                </span>
                <span className="text-sm font-bold">{p.short}</span>
                <span className="text-xs text-muted">{pantry ? `${pantry.filter((i) => i.place === p.value).length} Sachen` : "…"}</span>
              </span>
            ))}
          </Link>
        </section>
      )}
    </>
  );
}
