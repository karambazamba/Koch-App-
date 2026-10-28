"use client";

// Die einzigen Schilder an einer Aufgabe bzw. einem Termin (Tafel 103/104/
// 114): „Ich“ (klein, grün, Token ich) und „Arbeit“ (klein, blau, Token work),
// auf der Aufgaben-Seite dazu „neu“ (heute angelegt, am nächsten Tag weg).
// Familie/Wir hat kein Kennzeichen, kein Punkt pro Zeile. Allein ist „Ich“
// der Normalfall – dort ohne Schild.

import type { Room } from "@/lib/core/entries";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";

const SCHILD = "shrink-0 rounded-full px-1.5 py-px font-bold leading-snug";

/** Schild je Raum: „Ich“ grün, „Arbeit“ blau, Familie nichts */
export function RaumSchild({ room, klein = false }: { room: Room; klein?: boolean }) {
  const haushalt = useHaushalt();
  const size = klein ? "text-[10.5px]" : "text-[11px]";
  if (room === "arbeit") return <span className={`${SCHILD} bg-work-soft text-work ${size}`} data-schild="arbeit">Arbeit</span>;
  if (room === "ich" && haushalt !== "allein") return <span className={`${SCHILD} bg-ich-soft text-ich ${size}`} data-schild="ich">Ich</span>;
  return null;
}

export function NeuSchild() {
  return <span className={`${SCHILD} bg-accent-soft text-[11px] text-accent-strong`}>neu</span>;
}
