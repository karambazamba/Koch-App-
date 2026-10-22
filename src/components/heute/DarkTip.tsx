"use client";

// Einmal leise ab dem 3. Tag: "Abends lieber dunkel?" – Automatisch übernimmt
// Hell/Dunkel wie das Handy, "Nein danke" lässt Hell. Danach nie wieder.

import { useEffect } from "react";
import { finishDarkTip, noteDarkTipStart, showDarkTip, useDarkTip } from "@/lib/core/darkTip";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import type { HouseholdProfile } from "@/lib/einstellungen/profile";

/** `quiet`: gerade nicht zeigen (Beispiel-Tag, anderer Hinweis) – die Tage zählen trotzdem */
export function DarkTip({ profile, today, quiet = false }: { profile: HouseholdProfile; today: string; quiet?: boolean }) {
  const state = useDarkTip();
  useEffect(() => noteDarkTipStart(today), [today]);
  if (quiet || !showDarkTip(state, today, profile.themeSet)) return null;
  return (
    <div className="flex items-center gap-2 rounded-card bg-surface px-3.5 py-2.5 text-[14px] shadow-card" role="note">
      <span aria-hidden>🌙</span>
      <span className="flex-1 font-semibold">Abends lieber dunkel?</span>
      <button
        type="button"
        onClick={() => {
          saveProfile({ ...profile, theme: "auto", themeSet: true });
          finishDarkTip();
        }}
        className="hit shrink-0 font-extrabold text-accent-strong"
      >
        Automatisch
      </button>
      <button type="button" onClick={finishDarkTip} className="hit ml-2 shrink-0 font-bold text-muted">
        Nein danke
      </button>
    </div>
  );
}
