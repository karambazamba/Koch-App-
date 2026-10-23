"use client";

// Startseite, unter der Jetzt-Karte (höchstens ein Hinweis): zu Beginn der
// Abstimmung „2.344 € im Topf – stimmt jetzt ab!“ (bis abgestimmt oder ✕,
// einmal im Jahr) – später als Web-Push. Sonst nach ca. 4 Wochen einmal
// „Gemeinsam für <Region>“ mit 2 € · 4 € · 7 € · Später (höchstens 3×).

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { CARD, buttonClass } from "@/components/ui/styles";
import { todayIso } from "@/lib/core/now";
import { POT_TEXTS, activePot, askDue, askLater, euro, potPhase, potTotal } from "@/lib/spendentopf/model";
import { changePot, notePotStart, useFamilyRegion, usePotState } from "@/lib/spendentopf/store";
import { PledgeChoice, justPledged } from "@/components/spendentopf/PledgeChoice";

export type PotHint = { kind: "vote"; text: string } | { kind: "ask" } | null;

export function usePotHint(quiet: boolean): PotHint {
  const state = usePotState();
  const { region } = useFamilyRegion();
  const today = todayIso();
  useEffect(() => notePotStart(today), [today]);
  if (!state || quiet) return null;
  const year = Number(today.slice(0, 4));
  const pot = activePot(region, state.support);
  if (pot && potPhase(today) === "abstimmen" && !state.votes[String(year)] && !state.voteCardHidden.includes(year)) return { kind: "vote", text: `${euro(potTotal(pot, state.pledge?.betrag ?? null))} im Topf – stimmt jetzt ab!` };
  if (askDue(state.ask, today, Boolean(state.pledge)) || justPledged()) return { kind: "ask" };
  return null;
}

export function PotHintCard({ hint }: { hint: Exclude<PotHint, null> }) {
  const year = Number(todayIso().slice(0, 4));
  const [gone, setGone] = useState(false);
  const { region } = useFamilyRegion();
  if (gone) return null;
  if (hint.kind === "vote")
    return (
      <div className={`${CARD} flex items-center gap-3 px-4 py-3`} role="note" aria-label="Spendentopf: Abstimmung">
        <p className="flex-1 text-[15px] font-bold leading-snug">{hint.text}</p>
        <Link href="/spendentopf" className={buttonClass("primary", "sm")}>
          Abstimmen
        </Link>
        <button type="button" onClick={() => changePot((s) => ({ ...s, voteCardHidden: [...s.voteCardHidden, year] }))} aria-label="Ausblenden" className="hit flex h-6 w-6 items-center justify-center text-muted">
          <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    );
  return (
    <div className={`${CARD} flex flex-col gap-2 px-4 py-3.5`} role="note" aria-label={POT_TEXTS.together(region?.name)}>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-[16px] font-extrabold leading-snug">{POT_TEXTS.together(region?.name)}</p>
        <button type="button" onClick={() => changePot((s) => ({ ...s, ask: askLater(s.ask, todayIso()) }))} className="hit shrink-0 text-sm font-bold text-muted">
          Später
        </button>
      </div>
      {/* Nach dem Danke blendet sich die Karte selbst aus */}
      <PledgeChoice onDone={() => setGone(true)} />
    </div>
  );
}
