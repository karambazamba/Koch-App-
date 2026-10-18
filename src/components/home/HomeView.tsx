"use client";

import { WelcomeCard } from "@/components/HouseholdCard";
import { CARD } from "@/components/ui/styles";
import { helperName, pausedOn } from "@/lib/profile";
import { useLottePlace } from "./LottePlace";
import { BentoCards, HeroCard, HomeBottomBar, HomeHeader, PauseCard } from "./HomeSections";
import { useActivity, welcomeDue } from "@/lib/activity";
import { useHomeData } from "./useHomeData";
import { useRatingCandidate } from "./useRatingCandidate";

/**
 * Startseite "Heute" – genau sechs Elemente: Kopf, Heute-Karte, Lottes Platz
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
  const lotte = useLottePlace(data, { welcome });

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
            {paused ? <PauseCard data={data} /> : <HeroCard data={data} afterMeal={rating?.date === data.todayIso} />}
            {lotte}
            <BentoCards data={data} />
          </>
        )}
      </main>
      {data && <HomeBottomBar name={helperName(data.profile)} />}
    </>
  );
}
