"use client";

// Essen – das eine Fenster eines Tages (Tafel 97, Bild 2), für JEDEN Tag in
// beiden Ansichten: großes Bild, „DONNERSTAG · 29.10. · 18:30“, Name, Zeit ·
// Personen · Vorrat-Satz, EIN großer Knopf „Rezept ansehen“, drei kleine
// („⇄ Tauschen“, „Anderer Tag“, „Kein Kochtag“) und „Oder lieber“ mit drei
// Ideen. Freier Tag: „Noch frei“ und die Ideen. Nichts darüber hinaus. Idee
// antippen = Rezept-Vorschau (A-038), „Nehmen“ trägt ein.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftRight, CalendarArrowUp, Moon } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD, buttonClass } from "@/components/ui/styles";
import { DishPicture } from "@/components/essen/DishPicture";
import { buzz } from "@/components/heute/actions";
import type { HomeData } from "@/components/heute/useHomeData";
import { dishOf } from "@/components/essen/useMeals";
import { clockLabel } from "@/lib/kalender/answers";
import { weekdayLong, weekdayShort } from "@/lib/kalender/model";
import { mealClockFor } from "@/lib/einstellungen/profile";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { dishTone } from "@/lib/essen/dishLook";
import { matchStock, stockLine } from "@/lib/essen/dishIdeas";
import { findRecipe, recipeHref } from "@/lib/essen/baking";
import { rezeptIdFuer } from "@/lib/essen/kochen";
import { loadMealPlans, replaceMealPlans, type PlanDay } from "@/lib/essen/mealPlan";
import { takeForDay } from "@/lib/essen/spontanTake";
import { useTodayIdeas } from "@/lib/essen/useIdeas";
import { merkeGezeigt } from "@/lib/essen/ideenGezeigt";
import { useStock } from "@/lib/essen/useStock";
import { loadWeekPlans, replaceWeekPlans } from "@/lib/essen/weekPlan";
import { naechsteIdee } from "@/lib/heute/essenKachel";
import { dochKochtag, fensterKopf, keinKochtag, tagLabel, verschiebe, verschiebeText } from "@/lib/essen/sieben";

import { useVorschau } from "@/components/essen/vorschau/useVorschau";
import { ideeVorschlag } from "@/components/essen/SwapSheet";

type Idee = { title: string; recipeId?: string; category: PlanDay["slot"]["hint"]; minutes?: number | null };

export function TagFenster({ data, day, tage, onClose }: { data: HomeData; day: PlanDay; tage: PlanDay[]; onClose: () => void }) {
  const ideas = useTodayIdeas();
  const stock = useStock();
  const [andererTag, setAndererTag] = useState(false);
  const [alt, setAlt] = useState<number | null>(null);
  const vorschau = useVorschau();
  const dish = dishOf(day);
  const entry = day.away ? null : day.slot.entry;
  const shoppingDay = data.profile.shoppingDay || "Montag";
  const pool: Idee[] = (ideas?.ideas ?? []).filter((i) => i.title !== dish);
  const oderLieber = pool.slice(0, 3);
  const shownKey = oderLieber.map((i) => i.title).join("|");
  // Gezeigte Ideen merken: nicht genommen → an den nächsten Tagen weiter hinten
  useEffect(() => {
    if (shownKey && ideas) merkeGezeigt(shownKey.split("|"), ideas.todayIso);
  }, [shownKey, ideas]);

  // Jedes Gericht hat ein Rezept: eigenes bzw. eingebautes (über den Titel)
  const recipeId = entry ? (entry.recipeId ?? rezeptIdFuer(entry.title)) : null;
  const recipe = recipeId ? findRecipe(data.recipes, recipeId) : undefined;
  const persons = entry && entry.stored.kind !== "wish" ? (entry.stored.persons ?? day.persons) : day.persons;
  const href = recipeHref(data.recipes, recipeId, persons);
  const match = recipe && stock ? matchStock(recipe.ingredients.map((i) => i.name), stock, data.todayIso) : null;
  const vorrat = match ? stockLine(match).text : null;
  const clock = clockLabel(mealClockFor(data.profile, day.weekday)) || null;
  const facts = [recipe?.prepMinutes ? `${recipe.prepMinutes} Min` : null, persons ? `${persons} Personen` : null, vorrat].filter(Boolean).join(" · ");

  const nimm = (idea: Idee) => {
    const before = loadMealPlans();
    const result = takeForDay({ profile: data.profile, weekPlans: data.weekPlans, mealPlans: before, recipes: data.recipes }, data.today, { ...idea, recipeId: idea.recipeId ?? rezeptIdFuer(idea.title) ?? undefined }, day.date, {
      spontan: data.planStyle === "spontan",
    });
    if (!result.ok) return showToast({ text: result.text });
    replaceMealPlans(result.weeks);
    buzz();
    showToast({ text: result.text, undo: pushUndo(result.text, () => replaceMealPlans(before)), undoneText: "Wieder wie vorher", seconds: 4, small: true });
    onClose();
  };
  // ⇄ Tauschen: die nächste Idee, nie dieselbe zweimal hintereinander
  const tauschen = () => {
    const i = naechsteIdee(pool.map((p) => p.title), alt, dish);
    if (i === null) return;
    setAlt(i);
    nimm(pool[i]);
  };
  const nach = (ziel: PlanDay) => {
    const before = loadMealPlans();
    const next = verschiebe(before, day, ziel, shoppingDay);
    if (!next) return;
    replaceMealPlans(next);
    buzz();
    const text = verschiebeText(ziel);
    showToast({ text, undo: pushUndo(text, () => replaceMealPlans(before)), undoneText: "Wieder wie vorher", seconds: 4, small: true });
    onClose();
  };
  const kochtag = () => {
    const before = loadWeekPlans();
    const next = day.away ? dochKochtag(before, day, shoppingDay) : keinKochtag(before, day, shoppingDay, data.profile.weekRules);
    replaceWeekPlans(next);
    buzz();
    const text = day.away ? "Wieder ein Kochtag" : "Kein Kochtag";
    showToast({ text, undo: pushUndo(text, () => replaceWeekPlans(before)), undoneText: "Wieder wie vorher", seconds: 4, small: true });
    onClose();
  };

  const titel = dish ?? (day.away ? (day.paused ? "Pause" : "Kein Kochtag") : "Noch frei");
  return (
    <Sheet title={tagLabel(day.date, data.todayIso, weekdayShort)} onClose={onClose} tall>
      <div className="flex flex-col gap-4 pb-3" data-tag-fenster={day.date}>
        <div className="relative -mx-4 -mt-2 h-48 overflow-hidden">
          <DishPicture title={dish ?? undefined} category={entry?.category} tone={dish ? dishTone(dish, entry?.category) : undefined} alt="" className="absolute inset-0" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-extrabold uppercase tracking-wider text-accent-strong">{fensterKopf(day.date, weekdayLong, clock)}</p>
          <h2 className="text-[26px] font-extrabold leading-tight tracking-tight">{titel}</h2>
          {dish && facts && <p className="text-[15px] text-muted">{facts}</p>}
        </div>

        {dish && href && (
          <Link href={href} className={buttonClass("primary", "lg")} onClick={onClose}>
            Rezept ansehen
          </Link>
        )}

        {andererTag ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Auf welchen Tag?">
            {tage
              .filter((t) => t.date !== day.date)
              .map((t) => (
                <button key={t.date} type="button" onClick={() => nach(t)} className={buttonClass("secondary", "sm")}>
                  {tagLabel(t.date, data.todayIso, weekdayShort)}
                </button>
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {dish && (
              <button type="button" onClick={tauschen} className={`${buttonClass("secondary", "sm")} gap-1`}>
                <ArrowLeftRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Tauschen
              </button>
            )}
            {dish && (
              <button type="button" onClick={() => setAndererTag(true)} className={`${buttonClass("secondary", "sm")} gap-1`}>
                <CalendarArrowUp className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Anderer Tag
              </button>
            )}
            <button type="button" onClick={kochtag} className={`${buttonClass("secondary", "sm")} gap-1 ${dish ? "" : "col-span-3"}`}>
              <Moon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              {day.away ? "Doch kochen" : "Kein Kochtag"}
            </button>
          </div>
        )}

        {!day.away && oderLieber.length > 0 && (
          <section className="flex flex-col gap-2" aria-label={dish ? "Oder lieber" : "Ideen"}>
            <h3 className="text-[15px] font-extrabold">{dish ? "Oder lieber" : "Wie wär’s mit"}</h3>
            {oderLieber.map((i, n) => {
              const v = ideeVorschlag(i, day.persons);
              const tun = (id?: string) => nimm(id ? { ...i, recipeId: id } : i);
              return (
                <div key={i.title} className="flex flex-col gap-1">
                  <article className={`${CARD} flex items-center gap-3 p-2.5`} aria-label={`Vorschlag: ${i.title}`}>
                    <button type="button" onClick={() => vorschau.zeigen(v, tun)} aria-label={`${i.title} – reinschauen`} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]" data-vorschau-oeffnen>
                      <DishPicture title={i.title} category={i.category} tone={dishTone(i.title, i.category)} alt="" small className="h-12 w-12 shrink-0 rounded-full" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold">{i.title}</span>
                        {i.minutes ? <span className="block text-sm text-muted">{i.minutes} Min</span> : null}
                      </span>
                    </button>
                    <button type="button" onClick={() => vorschau.nehmen(v, tun)} className={`${buttonClass("soft", "sm")} shrink-0`}>
                      Nehmen
                    </button>
                  </article>
                  {vorschau.hinweis(n)}
                </div>
              );
            })}
          </section>
        )}
      </div>
      {vorschau.fenster}
    </Sheet>
  );
}
