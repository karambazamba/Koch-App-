"use client";

// Essen-Reiter „Kochen mit dem, was da ist“: „Das ist da“ (Vorrat als Chips,
// Bald-aufbrauchen zuerst, nur mit Baustein Vorrat) und „Daraus kannst du
// kochen“ (drei Ideen mit Bild, Zeit und Grund; „alles im Haus“ → „Heute“,
// sonst „auf die Liste: …“ → „+ Einkauf“ legt das Fehlende für heute auf die
// Liste und zeigt „✓ Liste“). Ersetzt das alte Nebeneinander aus Vorrat-
// Kacheln und Chat-Vorschlägen.

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronRight, Hourglass, Plus } from "lucide-react";
import { CARD, SECTION_TITLE, chipClass } from "@/components/ui/styles";
import { DishPicture } from "./DishPicture";
import { useFeature } from "@/lib/core/features";
import { usePantry } from "@/lib/essen/pantry";
import { soonToUse } from "@/lib/essen/dishIdeas";
import { dishTone } from "@/lib/essen/dishLook";
import { useTodayIdeas } from "@/lib/essen/useIdeas";
import type { Idea } from "@/lib/essen/ideas";
import { takeForToday } from "@/lib/essen/spontanTake";
import { loadMealPlans, replaceMealPlans } from "@/lib/essen/mealPlan";
import { addManualItem, removeManualItem, sectionFor } from "@/lib/einkauf/shoppingList";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { pushUndo } from "@/lib/core/undo";
import { showToast } from "@/lib/core/toast";
import type { HomeData } from "@/components/home/useHomeData";

const HEAD = "flex items-center justify-between px-1";
const MORE = "flex h-10 items-center gap-0.5 text-[15px] font-bold text-accent-strong";
const CHIPS_SHOWN = 8;
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/** „Das ist da“: Vorrat als Chips (nur mit Baustein Vorrat und wenn etwas da ist) */
export function StockChips({ today }: { today: string }) {
  const pantryOn = useFeature("vorrat");
  const pantry = usePantry();
  if (!pantryOn || !pantry?.length) return null;
  const soon = soonToUse(pantry, today);
  const rest = pantry.filter((p) => !soon.includes(p));
  const shown = [...soon, ...rest].slice(0, CHIPS_SHOWN);
  const more = pantry.length - shown.length;
  return (
    <section className="flex flex-col gap-2" aria-label="Das ist da">
      <div className={HEAD}>
        <h2 className={SECTION_TITLE}>Das ist da</h2>
        <Link href="/vorrat" className={MORE}>
          Vorrat <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {shown.map((p) => (
          <span key={p.id} className={`${soon.includes(p) ? chipClass(true).replace("border-accent", "border-accent-soft") : chipClass(false)} pointer-events-none`}>
            {soon.includes(p) && <Hourglass className="h-3.5 w-3.5" strokeWidth={2.25} aria-label="bald aufbrauchen" />}
            {p.name}
          </span>
        ))}
        {more > 0 && (
          <Link href="/vorrat" className={chipClass(false, "muted")}>
            + {more}
          </Link>
        )}
      </div>
    </section>
  );
}

/** „Daraus kannst du kochen“: drei Ideen aus dem Bestand */
export function CookIdeas({ data, over, planned }: { data: HomeData; over: boolean; planned?: string | null }) {
  const ideas = useTodayIdeas([], { tomorrow: over });
  const shopping = useWeekShoppingList("current");
  const [listed, setListed] = useState<string[]>([]);
  // Was schon geplant ist, steht oben – hier nur andere Ideen
  const list = (ideas?.ideas ?? []).filter((i) => !planned || i.title.toLowerCase() !== planned.toLowerCase()).slice(0, 3);
  if (!list.length || !shopping) return null;

  const take = (idea: Idea) => {
    const before = loadMealPlans();
    const result = takeForToday({ profile: data.profile, weekPlans: data.weekPlans, mealPlans: before, recipes: data.recipes }, data.today, idea, { spontan: data.planStyle === "spontan" });
    if (!result.ok) return showToast({ text: result.text });
    replaceMealPlans(result.weeks);
    pushUndo(`„${idea.title}“ für heute`, () => replaceMealPlans(before));
  };
  const toList = (idea: Idea) => {
    const day = WEEKDAYS[data.today.getDay()];
    const ids = idea.needs.map((name) => addManualItem(shopping.weekStart, { name, amount: "", section: sectionFor(name), day, dish: idea.title }));
    setListed((l) => [...l, idea.id]);
    pushUndo(`Zutaten für „${idea.title}“`, () => ids.forEach((id) => removeManualItem(shopping.weekStart, id)));
  };

  return (
    <section className="flex flex-col gap-2" aria-label="Daraus kannst du kochen">
      <div className={HEAD}>
        <h2 className={SECTION_TITLE}>{over ? "Ideen für morgen" : "Daraus kannst du kochen"}</h2>
      </div>
      <ul className={`${CARD} divide-y divide-line overflow-hidden`}>
        {list.map((idea) => {
          const ready = idea.needs.length === 0;
          const done = listed.includes(idea.id);
          const href = idea.recipeId ? `/kochbuch/rezept?id=${encodeURIComponent(idea.recipeId)}` : null;
          const body = (
            <>
              <DishPicture title={idea.title} category={idea.category ?? undefined} tone={dishTone(idea.title, idea.category ?? undefined)} alt="" small className="h-14 w-14 shrink-0 rounded-field" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-bold">{idea.title}</span>
                <span className="truncate text-[13px] text-muted">{[idea.minutes ? `${idea.minutes} Min` : "", idea.reason].filter(Boolean).join(" · ")}</span>
                <span className={`mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold ${ready ? "text-good-ink" : "text-accent-strong"}`}>
                  {ready && <span className="h-2 w-2 rounded-full bg-good" aria-hidden />}
                  {ready ? "alles im Haus" : `auf die Liste: ${idea.needs.slice(0, 2).join(", ")}${idea.needs.length > 2 ? " …" : ""}`}
                </span>
              </span>
            </>
          );
          return (
            <li key={idea.id} className="flex items-center gap-3 px-3 py-2.5">
              {href ? (
                <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
                  {body}
                </Link>
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>
              )}
              {ready && !over ? (
                <button type="button" onClick={() => take(idea)} className="hit shrink-0 rounded-full bg-accent px-3 py-1.5 text-[13px] font-bold text-on-accent">
                  Heute
                </button>
              ) : !ready ? (
                <button type="button" disabled={done} onClick={() => toList(idea)} className={`hit flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold ${done ? "bg-good-soft text-good-ink" : "bg-accent-soft text-accent-strong"}`}>
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden /> : <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
                  {done ? "Liste" : "Einkauf"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
