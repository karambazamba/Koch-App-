"use client";

import { useState } from "react";
import { WelcomeCard } from "@/components/HouseholdCard";
import { CARD } from "@/components/ui/styles";
import { helperName, pausedOn } from "@/lib/profile";
import { useHelperNote } from "./HelperNote";
import { BentoCards, HeroCard, HomeBottomBar, HomeHeader, PauseCard, RatingRow, WelcomeBack } from "./HomeSections";
import { useActivity, welcomeDue } from "@/lib/activity";
import { useHomeData } from "./useHomeData";
import { useRatingCandidate } from "./useRatingCandidate";
import type { RatingCandidate } from "@/lib/ratings";

/**
 * Startseite "Heute": Kopf, große Heute-Karte, evtl. schmale Bewertungszeile,
 * höchstens ein Satz vom Küchenhelfer, drei kleine Karten und unten fest
 * "Spontan kochen" und die Eingabeleiste. Passt ohne Scrollen aufs iPhone –
 * die Heute-Karte nimmt sich den freien Platz.
 */
export function HomeView() {
  const data = useHomeData();
  const rating = useRatingCandidate();
  // Frage festhalten, damit nach der Antwort kurz "Freut mich!" stehen bleibt
  const [kept, setKept] = useState<RatingCandidate | null>(null);
  if (rating && rating.date !== kept?.date) setKept(rating);
  const shownRating = kept && kept.date === data?.todayIso ? kept : null;
  const activity = useActivity();
  const paused = Boolean(data && pausedOn(data.profile, data.todayIso));
  const welcome = Boolean(data && activity && welcomeDue(activity, data.todayIso));
  // Höchstens ein Satz vom Helfer – und dann kein Twist (immer nur ein Angebot)
  const helperNote = useHelperNote(welcome && !paused ? null : data);

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
            {paused ? (
              <PauseCard data={data} />
            ) : (
              <div className="flex flex-col gap-1.5">
                <HeroCard data={data} afterMeal={Boolean(shownRating)} twist={!helperNote && !welcome} />
                {shownRating && <RatingRow key={shownRating.date} candidate={shownRating} data={data} />}
              </div>
            )}
            {welcome && !paused ? <WelcomeBack data={data} /> : helperNote}
            <BentoCards data={data} />
          </>
        )}
      </main>
      {data && <HomeBottomBar name={helperName(data.profile)} />}
    </>
  );
}
