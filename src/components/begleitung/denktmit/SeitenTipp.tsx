"use client";

// Mias Tipp im Seitenfluss (Tafel 101): direkt unter dem Seitentitel bzw. auf
// der Startseite unter der vorgestellten Kachel (mit Pfeil zur Kachel). Warmer
// Verlauf wie die Jetzt-Karte, feiner orange Rand, links das kleine
// Mia-Gesicht (nicht antippbar, ohne Ring), darüber „MIA“, dann 1–2 Sätze.
// „Alles klar“ schließt weich nach oben; „Zeig mal“ nur, wenn es etwas zu
// zeigen gibt. Schiebt den Inhalt nach unten, schwebt nie über der Liste.
// Derselbe Stil für ALLE einmaligen Hinweise der Startseite (unter der
// Jetzt-Karte, `core/hinweise.ts`): dann mit eigenem zweiten Knopf (`aktion`,
// z. B. „Schlicht ansehen“) statt „Zeig mal“.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { buttonClass } from "@/components/ui/styles";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import { helperName } from "@/lib/einstellungen/profile";

/** So lange gleitet die Karte nach oben weg (ms, Bewegung 0,8–1,2 s) */
const TIPP_ZU_MS = 800;

/** Wo der Pfeil zur vorgestellten Kachel sitzt (halbe Kachel links/rechts oder volle Breite) */
type TippPfeil = "links" | "mitte" | "rechts";
const PFEIL_X: Record<TippPfeil, string> = { links: "left-[22%]", mitte: "left-1/2", rechts: "left-[78%]" };

/** Zweiter Knopf (weiß): tut etwas bzw. führt hin; `bleibt` = der Tipp schließt danach nicht von selbst */
export type TippAktion = { label: string; onClick?: () => void; href?: string; bleibt?: boolean };

type Props = {
  text: string;
  /** „Alles klar“: erst weich weg, dann gemerkt */
  onOk: () => void;
  /** „Zeig mal“ (weiß) – nur, wenn es auf der Seite etwas zu zeigen gibt */
  zeigMal?: () => void;
  /** Eigener zweiter Knopf statt „Zeig mal“ */
  aktion?: TippAktion;
  /** Weiteres unter dem Text (z. B. eine Auswahl) */
  children?: ReactNode;
  pfeil?: TippPfeil;
  label?: string;
  className?: string;
  /** Für Durchklick und Tests: welcher Tipp das ist */
  id?: string;
};

export function SeitenTipp({ text, onOk, zeigMal, aktion, children, pfeil, label = "Kurz erklärt", className = "", id }: Props) {
  const [zu, setZu] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);
  const knopf: TippAktion | null = aktion ?? (zeigMal ? { label: "Zeig mal", onClick: zeigMal } : null);
  const schliessen = (dann: () => void) => {
    if (zu) return;
    setZu(true);
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(dann, reduced ? 300 : TIPP_ZU_MS);
  };
  return (
    <div
      role="note"
      aria-label={label}
      data-seiten-tipp
      data-tipp={id}
      className={`relative flex gap-3 rounded-card border border-accent/35 bg-linear-to-br from-jetzt-from to-jetzt-to px-4 py-3 transition-[transform,opacity] duration-[800ms] ease-(--mia-ease) motion-reduce:duration-300 ${zu ? "pointer-events-none -translate-y-3 opacity-0 motion-reduce:translate-y-0" : ""} ${className}`}
    >
      {pfeil && <span aria-hidden data-tipp-pfeil={pfeil} className={`absolute -top-[7px] h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-t border-l border-accent/35 bg-jetzt-from ${PFEIL_X[pfeil]}`} />}
      <BegleitungAvatar size={36} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <p className="text-[12px] font-extrabold tracking-wider text-accent-strong uppercase">{helperName()}</p>
          <p className="text-[15px] font-semibold leading-snug">{tidyMiaText(text)}</p>
        </div>
        {children}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => schliessen(onOk)} className={`${buttonClass("primary", "sm")} min-h-11`}>
            Alles klar
          </button>
          {knopf &&
            (knopf.href ? (
              <Link href={knopf.href} onClick={knopf.onClick} className={`${buttonClass("secondary", "sm")} min-h-11`}>
                {knopf.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  knopf.onClick?.();
                  if (!knopf.bleibt) schliessen(onOk);
                }}
                className={`${buttonClass("secondary", "sm")} min-h-11`}
              >
                {knopf.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
