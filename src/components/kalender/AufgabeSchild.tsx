"use client";

// Die einzigen Kennzeichen an einer Aufgabe bzw. einem Termin – in allen
// Listen und im Kalender gleich (A-034): Familie ohne Kennzeichen, „Ich“ mit
// kleinem grauem Schloss, „Arbeit“ mit blauem Schild; auf der Aufgaben-Seite
// dazu „neu“ (heute angelegt, am nächsten Tag weg). Allein ist „Ich“ der
// Normalfall („Privat“) – dort ohne Schloss. Kein Punkt pro Zeile.

import { Lock } from "lucide-react";
import type { Room } from "@/lib/core/entries";
import { ARBEIT } from "@/lib/core/haushalt";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";

const SCHILD = "shrink-0 rounded-full px-1.5 py-px font-bold leading-snug";

/** Kennzeichen je Raum: Ich = graues Schloss, Arbeit = blaues Schild, Familie nichts */
export function RaumSchild({ room, klein = false }: { room: Room; klein?: boolean }) {
  const haushalt = useHaushalt();
  if (room === "ich" && haushalt !== "allein") return <Lock className={`${klein ? "h-3 w-3" : "h-3.5 w-3.5"} shrink-0 text-ich`} strokeWidth={2.5} aria-label="Nur ich" data-schild="ich" />;
  if (room !== "arbeit") return null;
  return (
    <span className={`${SCHILD} bg-work-soft text-work ${klein ? "text-[10.5px]" : "text-[11px]"}`} data-schild="arbeit">
      {ARBEIT}
    </span>
  );
}

export function NeuSchild() {
  return <span className={`${SCHILD} bg-accent-soft text-[11px] text-accent-strong`}>neu</span>;
}
