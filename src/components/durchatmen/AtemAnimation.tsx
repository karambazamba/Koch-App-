"use client";

// Bilder der Übungen (A-051, Tafel 138/139): Kästchen mit wanderndem Punkt,
// atmender Kreis, Ring-Countdown (Handy-Pause) und das ruhige Symbol (Körper,
// Ankommen, Augen). Nur transform/opacity; `prefers-reduced-motion` = kein
// Wandern, kein Wachsen – nur Überblenden.

import type { Stand } from "@/lib/durchatmen/ablauf";
import { ansageText } from "@/lib/durchatmen/ansagen";
import type { Sorte, Uebung } from "@/lib/durchatmen/uebungen";
import { SORTE_STIL, SorteSymbol } from "@/components/durchatmen/DurchatmenFenster";

const EASE = "cubic-bezier(.16,1,.3,1)";

/** Punkt auf dem Kästchen: Seite je Phase (ein oben, halten rechts, aus unten, halten links) */
function punkt(stand: Stand): [number, number] {
  const a = stand.phaseAnteil;
  const lo = 30;
  const hi = 190;
  const w = hi - lo;
  switch (stand.phaseIndex) {
    case 0:
      return [lo + a * w, lo];
    case 1:
      return [hi, lo + a * w];
    case 2:
      return [hi - a * w, hi];
    default:
      return [lo, hi - a * w];
  }
}

export function Kaestchen({ stand, still }: { stand: Stand; still: boolean }) {
  const [x, y] = punkt(stand);
  return (
    <svg viewBox="0 0 220 220" className="h-auto w-[min(52vw,210px)] text-atem-tief" aria-hidden data-animation="kaestchen">
      <rect x="30" y="30" width="160" height="160" rx="30" fill="none" stroke="var(--app-atem-soft)" strokeWidth="10" />
      <text x="110" y="20" textAnchor="middle" className="fill-current text-[13px] font-bold">ein</text>
      <text x="110" y="214" textAnchor="middle" className="fill-current text-[13px] font-bold">aus</text>
      <text x="206" y="110" textAnchor="middle" className="fill-current text-[13px] font-bold" transform="rotate(90 206 110)">halten</text>
      {!still && (
        <circle cx="0" cy="0" r="11" fill="var(--app-surface)" stroke="currentColor" strokeWidth="5" style={{ transform: `translate(${x}px, ${y}px)`, transition: "transform 100ms linear" }} />
      )}
    </svg>
  );
}

/** Kreis wächst beim Einatmen, wird beim Ausatmen kleiner */
function atemSkala(stand: Stand): number {
  const p = stand.phase ?? "";
  const klein = 0.62;
  if (p === "ein") return klein + (1 - klein) * stand.phaseAnteil;
  if (p === "nochmal-ein") return 0.85 + 0.15 * stand.phaseAnteil;
  if (p === "aus" || p === "lang-aus") return 1 - (1 - klein) * stand.phaseAnteil;
  return 1;
}

export function AtemKreis({ stand, still, dunkel = false, klein = false }: { stand: Stand; still: boolean; dunkel?: boolean; klein?: boolean }) {
  const s = still ? 1 : atemSkala(stand);
  const wort = stand.phase ? ansageText(stand.phase) : "";
  return (
    <div className={`relative flex items-center justify-center ${klein ? "h-[min(44vw,170px)] w-[min(44vw,170px)]" : "h-[min(58vw,230px)] w-[min(58vw,230px)]"}`} aria-hidden data-animation="kreis">
      <span
        className={`absolute inset-0 rounded-full ${dunkel ? "bg-atem-dunkel-soft" : "bg-atem-soft"}`}
        style={{ transform: `scale(${s})`, transition: `transform 400ms ${EASE}` }}
      />
      <span
        className={`absolute inset-[18%] rounded-full ${dunkel ? "bg-atem-dunkel-soft" : "bg-atem-tief"}`}
        style={{ transform: `scale(${s})`, transition: `transform 400ms ${EASE}` }}
      />
      <span key={wort} className={`relative text-[28px] font-extrabold motion-safe:animate-[pager-fade_0.8s_ease-out] ${dunkel ? "text-atem-dunkel-ink" : "text-atem-on"}`}>
        {wort}
      </span>
    </div>
  );
}

/** Ring-Countdown mit Symbol der Sorte und Restzeit (Handy-Pause hell, alle im Dunkeln, Tafel 146) */
export function RestRing({ stand, sorte = "augen", klein = false }: { stand: Stand; sorte?: Sorte; klein?: boolean }) {
  const r = 84;
  const umfang = 2 * Math.PI * r;
  const sek = Math.ceil(stand.rest / 1000);
  const Icon = SORTE_STIL[sorte].icon;
  return (
    <div className={`relative flex items-center justify-center text-atem-dunkel-ink ${klein ? "h-[min(44vw,176px)] w-[min(44vw,176px)]" : "h-[min(56vw,220px)] w-[min(56vw,220px)]"}`} data-animation="ring">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--app-atem-dunkel-soft)" strokeWidth="8" />
        <circle cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={umfang} strokeDashoffset={umfang * stand.anteil} />
      </svg>
      <span className="relative flex flex-col items-center gap-1">
        <Icon className="h-8 w-8" strokeWidth={1.8} aria-hidden />
        <span className="text-[30px] font-extrabold tabular-nums" data-restzeit>{`${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, "0")}`}</span>
      </span>
    </div>
  );
}

/** Körper, Ankommen, Augen: großes Symbol, atmet ganz leicht */
export function SymbolBild({ u, still }: { u: Uebung; still: boolean }) {
  return (
    <div className={still ? "" : "motion-safe:animate-[av-breathe_4s_ease-in-out_infinite]"} aria-hidden data-animation="symbol">
      <SorteSymbol sorte={u.sorte} size={120} />
    </div>
  );
}
