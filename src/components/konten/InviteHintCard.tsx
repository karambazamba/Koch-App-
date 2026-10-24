"use client";

// Startseite, unter der Jetzt-Karte (höchstens ein Hinweis, ohne Mia-Gesicht): „Soll Lisa auch
// sehen, was du einträgst?“ → „Familie einladen“ (ohne Konto erst anmelden,
// danach gleich weiter zum Einladen) / „Später“.

import Link from "next/link";
import { CARD, buttonClass } from "@/components/ui/styles";
import { appSince } from "@/lib/core/activity";
import { useCloudMode } from "@/lib/konten/backend";
import { useCachedAccount } from "@/lib/konten/cache";
import { einladenText, laterEinladen, useEinladenState } from "@/lib/konten/einladenHinweis";
import type { HouseholdProfile } from "@/lib/einstellungen/profileModel";

export function useInviteHint(profile: HouseholdProfile, today: string, quiet: boolean): string | null {
  const cloud = useCloudMode();
  const state = useEinladenState();
  const members = useCachedAccount().household?.members.length ?? 0;
  if (quiet || !state || !cloud) return null;
  const second = profile.persons.find((p, i) => i > 0 && p.role === "erwachsen" && p.name.trim());
  return einladenText(state, { today, since: appSince(), cloud: cloud === "supabase" || cloud === "test", members, secondAdult: second?.name.trim() ?? null });
}

export function InviteHintCard({ text, today }: { text: string; today: string }) {
  return (
    <div className={`${CARD} flex items-center gap-3 px-4 py-3`} role="note" aria-label="Familie einladen">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[15px] font-bold leading-snug">{text}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/konto?einladen=1" className={buttonClass("primary", "sm")}>
            Familie einladen
          </Link>
          <button type="button" onClick={() => laterEinladen(today)} className={`${buttonClass("ghost", "sm")} text-muted`}>
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
