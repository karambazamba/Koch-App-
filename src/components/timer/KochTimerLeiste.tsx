"use client";

// Kleine Leiste „⏱ 7:42 · Tomatensoße“ (Tafel 122): der nächste laufende
// Timer, oben auf Rezeptseite und im Kochmodus. Ohne laufenden Timer nichts.

import { Timer as TimerIcon } from "lucide-react";
import { useNowMs } from "@/lib/core/useNowMs";
import { formatLeft, isRunning, leftMs } from "@/lib/timer/model";
import { useTimers } from "@/lib/timer/store";

export function KochTimerLeiste({ dunkel = false }: { dunkel?: boolean }) {
  const state = useTimers();
  const nowMs = useNowMs(Boolean(state?.timers.length), 500);
  const next = (state?.timers ?? []).filter((t) => isRunning(t, nowMs)).sort((a, b) => a.endsAt - b.endsAt)[0];
  if (!next) return null;
  return (
    <div
      role="timer"
      aria-label={`Timer ${next.name}: noch ${formatLeft(leftMs(next, nowMs))}`}
      className={`flex h-9 items-center gap-2 self-start rounded-full px-3 text-[14px] font-bold tabular-nums ${dunkel ? "bg-cook-soft text-cook-ink" : "bg-accent-soft text-accent-strong"}`}
      data-timer-leiste
    >
      <TimerIcon className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
      <span>{formatLeft(leftMs(next, nowMs))}</span>
      <span className="truncate font-semibold">· {next.name}</span>
    </div>
  );
}
