"use client";

// Die einzigen Schilder an einer Aufgabe bzw. einem Termin (Tafel 103/104/
// 114, A-021): „Geschäftlich“ (klein, blau, Token work) und auf der
// Aufgaben-Seite „neu“ (heute angelegt, am nächsten Tag weg). Familie hat
// kein Kennzeichen, kein Punkt pro Zeile.

import type { Room } from "@/lib/core/entries";
import { GESCHAEFTLICH } from "@/lib/core/haushalt";

const SCHILD = "shrink-0 rounded-full px-1.5 py-px font-bold leading-snug";

/** Schild je Raum: „Geschäftlich“ blau, Familie nichts */
export function RaumSchild({ room, klein = false }: { room: Room; klein?: boolean }) {
  if (room !== "arbeit") return null;
  return <span className={`${SCHILD} bg-work-soft text-work ${klein ? "text-[10.5px]" : "text-[11px]"}`} data-schild="arbeit">{GESCHAEFTLICH}</span>;
}

export function NeuSchild() {
  return <span className={`${SCHILD} bg-accent-soft text-[11px] text-accent-strong`}>neu</span>;
}
