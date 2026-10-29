"use client";

// TIMER-Kachel (nur wählbar, XS/S im festen Raster, Tafel 118): S = nächster
// Timer, sonst "Timer starten"; XS = EINE Zeile „Nudeln · 7:42“. Antippen
// öffnet das Timer-Fenster (A-050, Tafel 137/3, `TimerFenster`), Plus = eigene
// Dauer + Name. Auf der Startseite zeigt sonst der Timer-Kreis oben den
// laufenden Timer. Alles rechnet mit der Endzeit (stimmt nach Hintergrund,
// Sperre, Neustart sofort).

import dynamic from "next/dynamic";
import { useState } from "react";
import { Plus, Timer as TimerIcon } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { QuickButton } from "@/components/ui/QuickButton";
import { INPUT, TILE, TILE_LABEL, buttonClass, chipClass } from "@/components/ui/styles";
import type { TileSize } from "@/lib/core/homeLayout";
import { useNowMs } from "@/lib/core/useNowMs";
import { formatLeft, isExpired, leftMs, shownOnTile, sortTimers, stopwatchMs } from "@/lib/timer/model";
import { useTimers } from "@/lib/timer/store";
import { startTimer } from "@/lib/timer/actions";
import { buzz } from "@/components/heute/actions";
import { KachelWasserzeichen } from "@/components/ui/KachelWasserzeichen";

// Das Timer-Fenster (A-050, Tafel 137/3) erst beim Öffnen laden
const TimerFenster = dynamic(() => import("@/components/timer/TimerFenster").then((m) => m.TimerFenster));

export function TimerTile({ size = "XS" }: { size?: TileSize }) {
  const state = useTimers();
  const [custom, setCustom] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const active = Boolean(state && (state.timers.length || state.stopwatch?.startedAt));
  const nowMs = useNowMs(active);
  if (!state) return <section className={`${TILE} h-24 animate-pulse`} aria-label="Timer" />;
  const timers = sortTimers(state.timers.filter((t) => shownOnTile(t, nowMs)), nowMs);
  const sw = state.stopwatch;
  const main = timers[0];
  const start = (minutes: number, name?: string) => {
    if (startTimer({ minutes, name })) buzz();
  };
  const sheet = custom !== null && <CustomTimerSheet minutes={custom} onClose={() => setCustom(null)} onStart={(m, n) => (start(m, n), setCustom(null))} />;

  if (size === "XS") {
    const left = main ? (isExpired(main, nowMs) ? "fertig" : formatLeft(leftMs(main, nowMs))) : sw ? formatLeft(stopwatchMs(sw, nowMs)) : null;
    return (
      <>
        <section className={`${TILE} isolate flex h-full flex-col justify-between overflow-hidden px-3 py-2.5`} aria-label="Timer" data-groesse="XS">
          <KachelWasserzeichen kachel="timer" size="XS" />
          <button type="button" onClick={() => (main || sw ? setOpen(true) : setCustom(10))} className="flex min-w-0 flex-1 flex-col items-start justify-between text-left">
            <span className={`flex items-center gap-1.5 ${TILE_LABEL}`}>
              <TimerIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              <span className="kachel-frei">Timer</span>
            </span>
            <span className="flex w-full min-w-0 items-baseline gap-1.5 pr-10 text-[15px] font-bold leading-tight @max-[320px]:pr-0" role={main ? "timer" : undefined}>
              {main && <span className="kachel-frei min-w-0 truncate" data-freitext>{main.name} ·</span>}
              <span className="kachel-frei shrink-0 tabular-nums">{left ?? "Timer starten"}</span>
            </span>
          </button>
        </section>
        {sheet}
        {open && (
          <TimerFenster onClose={() => setOpen(false)} />
        )}
      </>
    );
  }

  if (size === "S") {
    return (
      <>
        <section className={`${TILE} isolate flex h-full flex-col overflow-hidden p-3.5`} aria-label="Timer" data-groesse="S">
          <KachelWasserzeichen kachel="timer" size="S" frei />
          <button type="button" onClick={() => (main || sw ? setOpen(true) : setCustom(10))} className="flex flex-1 flex-col items-start gap-1 text-left">
            <span className={`flex items-center gap-1.5 ${TILE_LABEL}`}>
              <TimerIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Timer
            </span>
            {main ? (
              <span className="flex items-baseline gap-1.5">
                <span className="text-[22px] font-extrabold tabular-nums leading-none" role="timer" aria-label={`${main.name}: ${isExpired(main, nowMs) ? "fertig" : formatLeft(leftMs(main, nowMs))}`}>
                  {isExpired(main, nowMs) ? "fertig" : formatLeft(leftMs(main, nowMs))}
                </span>
                <span className="kachel-frei truncate text-[13px] text-muted" data-freitext>{main.name}</span>
              </span>
            ) : sw ? (
              <span className="text-[20px] font-extrabold tabular-nums">{formatLeft(stopwatchMs(sw, nowMs))}</span>
            ) : (
              <span className="text-[15px] font-bold">Timer starten</span>
            )}
          </button>
          <span className="absolute right-3.5 top-3">
            <QuickButton icon={Plus} label="Neuer Timer" onClick={() => setCustom(10)} />
          </span>
        </section>
        {sheet}
        {open && (
          <TimerFenster onClose={() => setOpen(false)} />
        )}
      </>
    );
  }

  return null;
}

/** Eigener Timer: Dauer + Name */
export function CustomTimerSheet({ minutes, onClose, onStart }: { minutes: number; onClose: () => void; onStart: (minutes: number, name: string) => void }) {
  const [min, setMin] = useState(String(minutes));
  const [name, setName] = useState("");
  const value = Number(min.replace(",", "."));
  const ok = Number.isFinite(value) && value > 0 && value <= 600;
  return (
    <Sheet title="Neuer Timer" onClose={onClose}>
      <form
        className="flex flex-col gap-3 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onStart(value, name);
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">Wie lange? (Minuten)</span>
          <input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} className={INPUT} aria-label="Minuten" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[3, 5, 8, 10, 12, 15, 20, 25, 30, 45, 60].map((m) => (
            <button key={m} type="button" onClick={() => setMin(String(m))} className={chipClass(min === String(m))}>
              {m}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">Wofür? (optional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Nudeln" maxLength={30} className={INPUT} aria-label="Name des Timers" />
        </label>
        <button type="submit" disabled={!ok} className={buttonClass("primary", "lg")}>
          Timer starten
        </button>
      </form>
    </Sheet>
  );
}
