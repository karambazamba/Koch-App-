"use client";

// SPENDENTOPF-Kachel (Gold, volle Breite): Topf, Region, Betrag und eine
// Statuszeile. Während der Abstimmung der Knopf „Abstimmen“, sonst „Euer
// Beitrag“ bzw. „Gemeinsam für <Region>“. Region ohne Topf: „noch kein Topf“.
// Antippen öffnet die Seite.

import Link from "next/link";
import { TILE, TILE_LABEL, buttonClass } from "@/components/ui/styles";
import { todayIso } from "@/lib/core/now";
import { POT_TEXTS, activePot, euro, potPhase, potTotal, voteDaysLeft } from "@/lib/spendentopf/model";
import { useFamilyRegion, usePotState } from "@/lib/spendentopf/store";
import { PotGraphic } from "@/components/spendentopf/PotGraphic";

export function SpendentopfTile() {
  const state = usePotState();
  const { region } = useFamilyRegion();
  if (!state) return <section className={`${TILE} h-28 animate-pulse`} aria-label="Spendentopf" />;
  const today = todayIso();
  const pot = activePot(region, state.support);
  const voting = Boolean(pot) && potPhase(today) === "abstimmen" && !state.votes[today.slice(0, 4)];
  const left = voteDaysLeft(today);
  const status = !pot
    ? `${region?.name ?? "Eure Region"} – noch kein Topf`
    : voting
      ? `Abstimmen: noch ${left} ${left === 1 ? "Tag" : "Tage"}`
      : state.pledge
        ? `Euer Beitrag: ${euro(state.pledge.betrag)} im Monat · zugesagt`
        : POT_TEXTS.together(region?.name);
  return (
    <section className={`${TILE} flex flex-col gap-2 p-3.5`} aria-label="Spendentopf">
      <Link href="/spendentopf" className="flex items-center gap-3" aria-label="Spendentopf öffnen">
        <PotGraphic size={52} empty={!pot} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`${TILE_LABEL} truncate`}>
            Spendentopf · {pot?.name ?? region?.name ?? "Region wählen"}
            {pot?.beispiel ? " · Beispiel" : ""}
          </span>
          {pot ? <span className="text-[24px] font-extrabold leading-tight tabular-nums">{euro(potTotal(pot, state.pledge?.betrag ?? null))}</span> : <span className="text-[15px] font-bold leading-snug">Bescheid geben oder mithelfen</span>}
          <span className="truncate text-[13px] font-semibold text-muted">{status}</span>
        </span>
      </Link>
      {voting && (
        <Link href="/spendentopf" className={`${buttonClass("primary", "sm")} self-start`}>
          Abstimmen
        </Link>
      )}
    </section>
  );
}
