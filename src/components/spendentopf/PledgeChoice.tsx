"use client";

// Beitrags-Frage („Gemeinsam für <Region>“) – 2 € · 4 € · 7 € im Monat. Gespeichert wird nur
// „zugesagt“ (KEINE Zahlung, keine Zahlungsanbindung); danach kurz Danke, eine
// Münze fällt in den Topf, der Betrag steigt.

import { useState } from "react";
import { todayIso } from "@/lib/core/now";
import { POT_TEXTS, euro } from "@/lib/spendentopf/model";
import { changePot, usePotState } from "@/lib/spendentopf/store";
import { buzz } from "@/components/heute/actions";
import { PotGraphic } from "@/components/spendentopf/PotGraphic";

const PLEDGES = [2, 4, 7];

/** Zuletzt zugesagt (monotone Zeit) – die Karte bleibt fürs Danke noch kurz stehen */
let pledgedAt = -Infinity;
export const justPledged = () => performance.now() - pledgedAt < 2500;

/** Zusage speichern (nur „zugesagt“) */
function pledge(betrag: number) {
  pledgedAt = performance.now();
  changePot((s) => ({ ...s, pledge: { betrag, monat: todayIso().slice(0, 7), status: "zugesagt" }, ask: { ...s.ask, done: true } }));
}

export function PledgeChoice({ onDone }: { onDone?: () => void }) {
  const state = usePotState();
  const [thanks, setThanks] = useState(false);
  const current = state?.pledge?.betrag ?? null;
  return (
    <div className="flex flex-col gap-3">
      {!thanks && <p className="px-1 text-sm text-muted">{POT_TEXTS.askText}</p>}
      <div className="flex gap-2" role="radiogroup" aria-label="Beitrag im Monat">
        {PLEDGES.map((b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={current === b}
            onClick={() => {
              buzz();
              pledge(b);
              setThanks(true);
              if (onDone) window.setTimeout(onDone, 2600);
            }}
            className={`h-12 flex-1 rounded-field text-base font-extrabold transition active:scale-95 ${current === b ? "bg-accent text-on-accent" : "border border-line bg-surface text-ink"}`}
          >
            {euro(b)}
          </button>
        ))}
      </div>
      {thanks && (
        <div className="flex items-center gap-3 px-1" role="status">
          <PotGraphic size={44} drop />
          <span className="text-sm font-semibold">{POT_TEXTS.thanks}</span>
        </div>
      )}
      {!thanks && current && <p className="px-1 text-sm text-muted">Zugesagt: {euro(current)} im Monat. {POT_TEXTS.everyEuro}.</p>}
    </div>
  );
}
