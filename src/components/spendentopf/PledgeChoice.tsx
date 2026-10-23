"use client";

// Beitrags-Frage („Gemeinsam für <Region>“): Monatlich/Einmalig, 3 € · 6 € ·
// 10 € oder ein eigener Betrag, dann EIN Knopf. In der Vorschau heißt er
// „6 € im Monat vormerken“ und es fließt kein Geld (gespeichert als
// „vorgemerkt“, änderbar/löschbar); live „… zusagen“ (nur „zugesagt“ – KEINE
// Zahlung). Danach kurz Danke, eine Münze fällt in den Topf.

import { useState } from "react";
import { todayIso } from "@/lib/core/now";
import { POT_TEXTS, euro, pledgeLabel, type PledgeArt } from "@/lib/spendentopf/model";
import { POT_STATUS } from "@/lib/spendentopf/regions";
import { changePot, usePotState } from "@/lib/spendentopf/store";
import { buzz } from "@/components/heute/actions";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { PotGraphic } from "@/components/spendentopf/PotGraphic";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import type { Pledge } from "@/lib/spendentopf/store";

const AMOUNTS = [3, 6, 10];
const DEFAULT = 6;

/** Zuletzt vorgemerkt/zugesagt (monotone Zeit) – die Karte bleibt fürs Danke noch kurz stehen */
let pledgedAt = -Infinity;
export const justPledged = () => performance.now() - pledgedAt < 2500;

/** Vormerkung (Vorschau) bzw. Zusage (live) speichern – nie eine Zahlung */
function pledge(betrag: number, art: PledgeArt) {
  pledgedAt = performance.now();
  changePot((s) => ({ ...s, pledge: { betrag, art, monat: todayIso().slice(0, 7), status: POT_STATUS === "live" ? "zugesagt" : "vorgemerkt" }, ask: { ...s.ask, done: true } }));
}

/** Vormerkung/Zusage löschen – echtes Löschen: „Gelöscht · Rückgängig“ */
function removePledge(saved: Pledge) {
  changePot((s) => ({ ...s, pledge: null }));
  const undo = pushUndo("Beitrag gelöscht", () => changePot((s) => ({ ...s, pledge: saved })));
  showToast({ text: "Gelöscht", undo, undoneText: "Wieder da", seconds: 3, small: true });
}

export function PledgeChoice({ onDone }: { onDone?: () => void }) {
  const state = usePotState();
  const saved = state?.pledge ?? null;
  const preview = POT_STATUS !== "live";
  const [art, setArt] = useState<PledgeArt>(saved?.art ?? "monatlich");
  const [betrag, setBetrag] = useState<number>(saved?.betrag ?? DEFAULT);
  const [own, setOwn] = useState(saved ? !AMOUNTS.includes(saved.betrag) : false);
  const [thanks, setThanks] = useState(false);
  const verb = preview ? "vormerken" : "zusagen";

  if (thanks)
    return (
      <div className="flex items-center gap-3 px-1" role="status">
        <PotGraphic size={44} drop />
        <span className="text-sm font-semibold">{preview ? POT_TEXTS.thanksPreview : POT_TEXTS.thanks}</span>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-sm text-muted">{POT_TEXTS.askText}</p>
      <div className="flex gap-2" role="radiogroup" aria-label="Wie oft">
        {(["monatlich", "einmalig"] as const).map((a) => (
          <button key={a} type="button" role="radio" aria-checked={art === a} onClick={() => setArt(a)} className={chipClass(art === a)}>
            {a === "monatlich" ? "Monatlich" : "Einmalig"}
          </button>
        ))}
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label="Betrag">
        {AMOUNTS.map((b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={!own && betrag === b}
            onClick={() => (setOwn(false), setBetrag(b))}
            className={`h-12 flex-1 rounded-field text-base font-extrabold transition active:scale-95 ${!own && betrag === b ? "bg-accent text-on-accent" : "border border-line bg-surface text-ink"}`}
          >
            {euro(b)}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={own} onClick={() => setOwn(true)} className={`h-12 flex-1 rounded-field text-[15px] font-bold transition active:scale-95 ${own ? "bg-accent text-on-accent" : "border border-line bg-surface text-ink"}`}>
          Eigener
        </button>
      </div>
      {own && (
        <label className="flex items-center gap-2 px-1">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            value={betrag || ""}
            onChange={(e) => setBetrag(Math.max(0, Math.min(500, Math.round(Number(e.target.value) || 0))))}
            className="h-12 w-28 rounded-field border border-line bg-surface px-3 text-base font-bold"
            aria-label="Eigener Betrag in Euro"
          />
          <span className="text-base font-semibold">€</span>
        </label>
      )}
      <button
        type="button"
        disabled={betrag < 1}
        onClick={() => {
          buzz();
          pledge(betrag, art);
          setThanks(true);
          if (onDone) window.setTimeout(onDone, 2600);
        }}
        className={buttonClass("primary", "lg")}
      >
        {pledgeLabel(betrag, art)} {verb}
      </button>
      {preview && <p className="px-1 text-center text-xs text-muted">{POT_TEXTS.noMoney}</p>}
      {saved && (
        <p className="flex flex-wrap items-center gap-x-2 px-1 text-sm text-muted">
          <span>
            {saved.status === "vorgemerkt" ? "Vorgemerkt" : "Zugesagt"}: {pledgeLabel(saved.betrag, saved.art)}.
          </span>
          <button type="button" onClick={() => removePledge(saved)} className="hit font-bold text-accent-strong">
            {saved.status === "vorgemerkt" ? "Vormerkung löschen" : "Zusage löschen"}
          </button>
        </p>
      )}
    </div>
  );
}
