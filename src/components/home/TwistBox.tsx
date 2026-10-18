"use client";

import { useEffect } from "react";
import { removeManualItems, addManualItem, sectionFor } from "@/lib/shoppingList";
import { markTwistShown, markTwistTaken, twistAllowed, twistFor, unmarkTwistTaken, useTwists } from "@/lib/twists";
import type { HomeData } from "./useHomeData";

/**
 * "✨ Lust auf einen Twist?" – dezent umrandet in der Heute-Karte, nur bei
 * bekannten Gerichten und höchstens 2× pro Woche. Antippen übernimmt den
 * Twist für heute (Zutat unter "Heute holen"), sonst einfach ignorieren.
 */
export function TwistBox({ data, title }: { data: HomeData; title: string }) {
  const twists = useTwists();
  const { todayIso, week, day } = data;
  const twist = twistFor(title);
  const taken = twists?.taken[todayIso];
  const show = Boolean(twists && twist && day && (taken || twistAllowed(twists, todayIso, week.weekStart)));

  useEffect(() => {
    if (show) markTwistShown(todayIso);
  }, [show, todayIso]);

  if (!show || !twist || !day) return null;

  if (taken) {
    return (
      <div className="mx-4 mb-3 rounded-xl border border-dashed border-accent/50 px-3 py-2.5 text-sm" role="status">
        <p className="font-semibold text-ink">✨ Heute mit Twist: {twist.idea}</p>
        <p className="mt-0.5 text-muted">
          {taken.manualId && twist.item ? `${twist.item} steht unter „Heute holen“ · ` : ""}
          <button
            type="button"
            onClick={() => {
              if (taken.manualId && taken.weekStart) removeManualItems(taken.weekStart, [taken.manualId]);
              unmarkTwistTaken(todayIso);
            }}
            className="font-semibold underline"
          >
            Rückgängig
          </button>
        </p>
      </div>
    );
  }

  const take = () => {
    const manualId = twist.item
      ? addManualItem(week.weekStart, { name: twist.item, amount: "", section: sectionFor(twist.item), day: day.weekday })
      : undefined;
    markTwistTaken(todayIso, { key: twist.key, manualId, weekStart: week.weekStart });
  };

  return (
    <button
      type="button"
      onClick={take}
      className="mx-4 mb-3 rounded-xl border border-dashed border-accent/50 px-3 py-2.5 text-left text-sm leading-snug text-ink active:bg-accent-soft"
    >
      ✨ Lust auf einen Twist? {twist.idea} – {twist.minutes} Min extra.
    </button>
  );
}
