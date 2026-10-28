"use client";

// Startseite, unter der Jetzt-Karte (höchstens ein Hinweis, im Stil der
// Seiten-Tipps): „Soll Lisa auch sehen, was du einträgst?“ → „Familie
// einladen“ (ohne Konto erst anmelden, danach gleich weiter zum Einladen) /
// „Alles klar“ (wie früher „Später“).

import { SeitenTipp } from "@/components/begleitung/denktmit/SeitenTipp";
import { appSince } from "@/lib/core/activity";
import { useCloudMode } from "@/lib/konten/backend";
import { useCachedAccount } from "@/lib/konten/cache";
import { einladenText, laterEinladen, useEinladenState } from "@/lib/konten/einladenHinweis";
import type { HouseholdProfile } from "@/lib/einstellungen/profileModel";
import { useEinladenKnopf } from "@/lib/einstellungen/useHaushalt";

export function useInviteHint(profile: HouseholdProfile, today: string, quiet: boolean): string | null {
  const cloud = useCloudMode();
  const state = useEinladenState();
  const members = useCachedAccount().household?.members.length ?? 0;
  if (quiet || !state || !cloud) return null;
  const second = profile.persons.find((p, i) => i > 0 && p.role === "erwachsen" && p.name.trim());
  return einladenText(state, { today, since: appSince(), cloud: cloud === "supabase" || cloud === "test", members, secondAdult: second?.name.trim() ?? null });
}

export function InviteHintCard({ text, today }: { text: string; today: string }) {
  const einladen = useEinladenKnopf();
  return <SeitenTipp text={text} label={einladen} id="einladen" onOk={() => laterEinladen(today)} aktion={{ label: einladen, href: "/konto?einladen=1" }} />;
}
