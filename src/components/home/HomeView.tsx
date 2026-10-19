"use client";

import { WelcomeCard } from "@/components/HouseholdCard";
import { CARD } from "@/components/ui/styles";
import { helperName, pausedOn } from "@/lib/einstellungen/profile";
import { useLottePlace } from "./LottePlace";
import { BentoCards, HeroCard, HomeBottomBar, HomeHeader, PauseCard } from "./HomeSections";
import { useActivity, welcomeDue } from "@/lib/core/activity";
import { useHomeData } from "./useHomeData";
import { useMinutes, useRatingCandidate } from "./useRatingCandidate";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import { useLegacyFeatures } from "@/lib/core/features";
import { HomePager } from "@/components/alltag/HomePager";

/**
 * Startseite. Neustart (Standard): drei Seiten Woche · Heute · Essen
 * (HomePager) mit der Lotte-Leiste unten. Nur für die Entwicklung
 * (/?legacy=1) die frühere Startseite:
 * genau sechs Elemente: Kopf, Heute-Karte, Lottes Platz
 * (höchstens EINE Sache), drei Kacheln, "Spontan kochen" und die
 * Eingabeleiste. Passt ohne Scrollen aufs iPhone. Neue Funktionen bekommen
 * keinen eigenen Platz, sondern nutzen Lottes Platz, die Kacheln oder den
 * Küchenhelfer.
 */
export function HomeView() {
  const data = useHomeData();
  const rating = useRatingCandidate();
  const activity = useActivity();
  const paused = Boolean(data && pausedOn(data.profile, data.todayIso));
  const welcome = Boolean(data && activity && !paused && welcomeDue(activity, data.todayIso));
  const minutes = useMinutes();
  const cooked = useCookedDays();
  // Nach dem Essen (Essenszeit + 90 Min. oder "gekocht"): schon das nächste Essen zeigen
  const over = Boolean(data && minutes !== undefined && cooked && mealIsOver(data.day, data.profile, minutes, cooked));
  const legacy = useLegacyFeatures();
  const lotte = useLottePlace(legacy ? data : null, { welcome: welcome && Boolean(legacy) });

  // Neustart: drei Seiten Woche · Heute · Essen
  if (data && legacy === false) return <HomePager data={data} />;

  return (
    <>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-2.5 px-4 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+7.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <HomeHeader today={data?.today} />
        {data === undefined ? (
          <div className={`${CARD} h-52 animate-pulse`} />
        ) : data === null ? (
          <WelcomeCard />
        ) : (
          <>
            {legacy === undefined ? (
              <div className={`${CARD} h-24 animate-pulse`} />
            ) : legacy ? (
              <>
                {paused ? <PauseCard data={data} /> : <HeroCard data={data} afterMeal={rating?.date === data.todayIso} when={over ? "morgen" : "heute"} />}
                {lotte}
                <BentoCards data={data} />
              </>
            ) : null}
          </>
        )}
      </main>
      {data && <HomeBottomBar name={helperName(data.profile)} spontan={Boolean(legacy)} />}
    </>
  );
}
