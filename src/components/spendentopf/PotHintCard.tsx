"use client";

// Startseite, unter der Jetzt-Karte (höchstens ein Hinweis): zu Beginn der
// Abstimmung „2.344 € im Topf – stimmt jetzt ab!“ (bis abgestimmt oder „Alles klar“,
// einmal im Jahr) – später als Web-Push. Sonst nach ca. 4 Wochen einmal
// „Gemeinsam für <Region>“ mit Beitrag vormerken (Vorschau) bzw. zusagen ·
// „Alles klar“ = später (höchstens 3×). Im Stil der Seiten-Tipps (`SeitenTipp`).

import { useEffect, useState } from "react";
import { SeitenTipp } from "@/components/begleitung/denktmit/SeitenTipp";
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
      <SeitenTipp
        text={hint.text}
        label="Spendentopf: Abstimmung"
        id="spendentopf"
        onOk={() => changePot((s) => ({ ...s, voteCardHidden: [...s.voteCardHidden, year] }))}
        aktion={{ label: "Abstimmen", href: "/spendentopf" }}
      />
    );
  return (
    <SeitenTipp text={POT_TEXTS.together(region?.name)} label={POT_TEXTS.together(region?.name)} id="spendentopf" onOk={() => changePot((s) => ({ ...s, ask: askLater(s.ask, todayIso()) }))}>
      {/* Nach dem Danke blendet sich die Karte selbst aus */}
      <PledgeChoice onDone={() => setGone(true)} />
    </SeitenTipp>
  );
}
