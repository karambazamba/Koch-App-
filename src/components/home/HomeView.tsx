"use client";

import { useState } from "react";
import { WelcomeCard } from "@/components/HouseholdCard";
import { CARD } from "@/components/ui/styles";
import { helperName, pausedOn } from "@/lib/profile";
import { HelperNote } from "./HelperNote";
import { BentoCards, HeroCard, HomeAskBar, HomeHeader, PauseCard, RatingRow, WelcomeBack, useSuggestToday } from "./HomeSections";
import { useActivity, welcomeDue } from "@/lib/activity";
import { useHomeData } from "./useHomeData";
import { useRatingCandidate } from "./useRatingCandidate";
import type { RatingCandidate } from "@/lib/ratings";

/**
 * Startseite "Heute": Kopf, große Heute-Karte, evtl. schmale Bewertungszeile,
 * höchstens ein Satz vom Küchenhelfer, drei kleine Karten und unten fest die
 * Eingabeleiste. Passt ohne Scrollen aufs iPhone.
 */
export function HomeView() {
  const data = useHomeData();
  const rating = useRatingCandidate();
  const suggest = useSuggestToday();
  // Frage festhalten, damit nach der Antwort kurz "Freut mich!" stehen bleibt
  const [kept, setKept] = useState<RatingCandidate | null>(null);
  if (rating && rating.date !== kept?.date) setKept(rating);
  const shownRating = kept && kept.date === data?.todayIso ? kept : null;
  const activity = useActivity();
  const paused = Boolean(data && pausedOn(data.profile, data.todayIso));
  const welcome = Boolean(data && activity && welcomeDue(activity, data.todayIso));

  return (
    <>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-4 pb-[calc(max(1rem,env(safe-area-inset-bottom))+5rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
        <HomeHeader today={data?.today} />
        {data === undefined ? (
          <div className={`${CARD} h-52 animate-pulse`} />
        ) : data === null ? (
          <WelcomeCard />
        ) : (
          <>
            {paused ? (
              <PauseCard data={data} />
            ) : (
              <div className="flex flex-col gap-2">
                <HeroCard data={data} onSuggest={suggest} />
                {shownRating && <RatingRow key={shownRating.date} candidate={shownRating} data={data} />}
              </div>
            )}
            {welcome && !paused ? <WelcomeBack data={data} /> : <HelperNote data={data} />}
            <BentoCards data={data} />
          </>
        )}
      </main>
      {data && <HomeAskBar name={helperName(data.profile)} />}
    </>
  );
}
