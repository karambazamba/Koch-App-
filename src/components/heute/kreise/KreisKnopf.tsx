"use client";

// Ein Mini-Kreis (A-050, Tafel 143): Kreisfläche in der Kachelfarbe des
// Bereichs (`data-tone`, Look „Schlicht“: weiß mit feinem Rand), Linien-Symbol
// im Akzent, darunter genau EIN Wort. Einziges Zeichen: der Wochen-Ring bei
// Sport (Stücke = Ziel, geschafft grün) bzw. beim laufenden Timer die
// Restzeit groß im Kreis mit orangem Fortschritts-Ring. Keine Schilder,
// keine Zahlen, keine Plaketten. Angetippt (Fenster offen) = oranger Rand.

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ringBoegen, type kreisMasse } from "@/lib/heute/kreise";

type Masse = ReturnType<typeof kreisMasse>;

/** Kreisbogen als SVG-Pfad (Grad, 0 = oben, im Uhrzeigersinn) */
function bogen(c: number, r: number, von: number, bis: number): string {
  const p = (g: number) => {
    const rad = ((g - 90) * Math.PI) / 180;
    return `${(c + r * Math.cos(rad)).toFixed(2)} ${(c + r * Math.sin(rad)).toFixed(2)}`;
  };
  return `M ${p(von)} A ${r} ${r} 0 ${bis - von > 180 ? 1 : 0} 1 ${p(bis)}`;
}

/** Sport-Ring: Stücke wie das Wochenziel, gefüllte im Sport-Akzent, geschafft grün */
export function SportRing({ groesse, stuecke, voll, geschafft }: { groesse: number; stuecke: number; voll: number; geschafft: boolean }) {
  const c = groesse / 2;
  const r = c - 2.5;
  return (
    <svg className="pointer-events-none absolute inset-0" width={groesse} height={groesse} viewBox={`0 0 ${groesse} ${groesse}`} aria-hidden data-sport-ring={`${voll}/${stuecke}`} data-ring-geschafft={geschafft ? "" : undefined}>
      {ringBoegen(stuecke, stuecke > 1 ? 14 : 0).map((b, n) => (
        <path key={n} d={bogen(c, r, b.von, b.bis)} fill="none" strokeWidth={4} strokeLinecap="round" className={n < voll ? (geschafft ? "kreis-ring-gut" : "kreis-ring-voll") : "kreis-ring-leer"} />
      ))}
    </svg>
  );
}

/** Fortschritts-Ring des laufenden Timers (orange, nimmt mit der Restzeit ab) */
function TimerRing({ groesse, anteil }: { groesse: number; anteil: number }) {
  const c = groesse / 2;
  const r = c - 2.5;
  const umfang = 2 * Math.PI * r;
  return (
    <svg className="pointer-events-none absolute inset-0 -rotate-90" width={groesse} height={groesse} viewBox={`0 0 ${groesse} ${groesse}`} aria-hidden data-timer-ring>
      <circle cx={c} cy={c} r={r} fill="none" strokeWidth={4} className="kreis-ring-timer-leer" />
      <circle cx={c} cy={c} r={r} fill="none" strokeWidth={4} strokeLinecap="round" strokeDasharray={umfang} strokeDashoffset={umfang * (1 - anteil)} className="kreis-ring-timer" />
    </svg>
  );
}

export function KreisKnopf({
  id,
  wort,
  tone,
  farbe,
  icon: Icon,
  masse,
  label,
  offen: aktiv,
  onOpen,
  ring,
  timer,
}: {
  id: string;
  wort: string;
  tone: string;
  /** Gewählte Kachel-Farbe des Bereichs (Sport: die der Sport-Kachel) */
  farbe?: string;
  icon: LucideIcon;
  masse: Masse;
  /** Vorlese-Text (z. B. „Sport: 1 von 2 diese Woche“) */
  label: string;
  offen: boolean;
  onOpen: () => void;
  ring?: ReactNode;
  /** Läuft ein Timer: Restzeit groß im Kreis statt Symbol */
  timer?: { rest: string; anteil: number } | null;
}) {
  const { kreis, symbol, wort: wortPx } = masse;
  return (
    <button type="button" onClick={onOpen} aria-label={label} aria-haspopup="dialog" aria-expanded={aktiv} className="flex min-w-0 flex-col items-center gap-1.5 active:scale-95" data-kreis={id} data-aktiv={aktiv ? "" : undefined}>
      <span
        data-tone={timer ? undefined : tone}
        data-farbe={timer ? undefined : farbe}
        className={`kreis relative flex shrink-0 items-center justify-center rounded-full ${timer ? "bg-surface text-accent-strong" : "bg-tile text-tile-accent"} ${aktiv ? "kreis-aktiv" : ""}`}
        style={{ width: kreis, height: kreis }}
        aria-hidden
      >
        {timer ? (
          <>
            <TimerRing groesse={kreis} anteil={timer.anteil} />
            <span className={`font-extrabold tabular-nums leading-none ${timer.rest.length > 5 ? "text-[12px]" : kreis < 60 ? "text-[15px]" : "text-[17px]"}`} data-timer-rest>
              {timer.rest}
            </span>
          </>
        ) : (
          <>
            {ring}
            <Icon style={{ width: symbol, height: symbol }} strokeWidth={2} />
          </>
        )}
      </span>
      <span className="whitespace-nowrap font-bold leading-none text-ink" style={{ fontSize: wortPx }} data-kreis-wort>
        {wort}
      </span>
    </button>
  );
}
