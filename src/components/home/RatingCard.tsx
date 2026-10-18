"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { HelperAvatar } from "@/components/assistant/HelperAvatar";
import { CARD, INPUT_BASE, buttonClass, chipClass } from "@/components/ui/styles";
import { useRecipes } from "@/lib/cookbook";
import { useMealPlans } from "@/lib/mealPlan";
import { helperName } from "@/lib/profile";
import { DOWN_REASONS, rateDown, rateUp, skipRating, type RatingCandidate } from "@/lib/ratings";
import { useProfile } from "@/lib/useProfile";
import { addDays, toIsoDate, useToday, useWeekPlans } from "@/lib/weekPlan";
import { useRatingCandidate } from "./useRatingCandidate";

/** "heute", "gestern" oder der Wochentag */
export function dayLabel(candidate: RatingCandidate, today: Date): string {
  const iso = toIsoDate(today);
  if (candidate.date === iso) return "heute";
  if (candidate.date === addDays(iso, -1)) return "gestern";
  return `am ${candidate.weekday}`;
}

/**
 * Startseite: Nach dem Kochen fragt der Küchenhelfer "Wie war …?" (👍/👎).
 * Bei 👎 optional ein Grund – das Gericht kommt auf die "Nie wieder"-Liste.
 */
export function RatingCard() {
  const candidate = useRatingCandidate();
  const today = useToday();
  const profile = useProfile();
  const recipes = useRecipes();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const [down, setDown] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [thanks, setThanks] = useState<string | null>(null);

  if (thanks) {
    return (
      <section className={`${CARD} flex items-center gap-3 p-4`} role="status">
        <HelperAvatar size={36} variant="badge" />
        <p className="flex-1 text-base font-semibold">{thanks}</p>
        <button type="button" onClick={() => setThanks(null)} className={buttonClass("ghost", "sm")}>
          OK
        </button>
      </section>
    );
  }
  if (!candidate || !today || !profile || !recipes || !weekPlans || !mealPlans) return null;
  const name = helperName(profile);
  const downOpen = down === candidate.date;

  const confirmDown = (why: string) => {
    rateDown(candidate, why, { profile, recipes, weekPlans, mealPlans }, today);
    setDown(null);
    setReason("");
    setThanks(`Verstanden – ${candidate.title} kommt mir nicht mehr auf den Tisch.`);
  };

  return (
    <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Bewerten">
      <div className="flex items-center gap-3">
        <HelperAvatar size={36} variant="badge" />
        <p className="min-w-0 flex-1 text-base">
          <span className="text-sm text-muted">
            {name} fragt · {dayLabel(candidate, today)}
          </span>
          <span className="block text-lg font-bold leading-snug">Wie war {candidate.title}?</span>
        </p>
      </div>

      {!downOpen ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                rateUp(candidate, profile, recipes);
                setThanks("Freut mich! 😋 Gibt's bald wieder.");
              }}
              className={buttonClass("secondary", "lg")}
            >
              <ThumbsUp className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
              Lecker
            </button>
            <button type="button" onClick={() => setDown(candidate.date)} className={buttonClass("secondary", "lg")}>
              <ThumbsDown className="h-5 w-5 text-muted" strokeWidth={2} aria-hidden />
              Nicht so
            </button>
          </div>
          <button type="button" onClick={() => skipRating(candidate)} className="self-center text-sm font-semibold text-muted underline">
            Haben wir nicht gekocht
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{"Schade! Woran lag's? Dann schlag ich es nie wieder vor."}</p>
          <div className="flex flex-wrap gap-2">
            {DOWN_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => confirmDown(r)} className={chipClass(false)}>
                {r}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              confirmDown(reason);
            }}
          >
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              placeholder="Anderer Grund …"
              aria-label="Anderer Grund"
              className={`${INPUT_BASE} h-11 min-w-0 flex-1 px-3`}
            />
            <button type="submit" className={buttonClass("primary", "sm")}>
              {reason.trim() ? "Speichern" : "Ohne Grund"}
            </button>
          </form>
          <button type="button" onClick={() => setDown(null)} className="self-center text-sm font-semibold text-muted underline">
            Doch nicht
          </button>
        </div>
      )}
    </section>
  );
}
