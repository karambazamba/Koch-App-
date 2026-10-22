"use client";

// TIMER – M: Kopf "TIMER" (+ "2 laufen"), der wichtigste Timer mit
// Fortschrittsring, Emoji, Restzeit groß, Name "Nudeln · 10 Min", Knöpfe
// +1 · Pause/Weiter · ✕; weitere Timer als schmale Zeilen, die Stoppuhr; unten
// Schnellknöpfe 5 · 10 · 15 Min · Stoppuhr (lange drücken = eigene Dauer +
// Name). S: nächster Timer klein, sonst "Timer starten". Alles rechnet mit
// der Endzeit (stimmt nach Hintergrund, Sperre, Neustart sofort).

import { useRef, useState } from "react";
import { Pause, Play, Plus, RotateCcw, Timer as TimerIcon, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { QuickButton } from "@/components/ui/QuickButton";
import { INPUT, TILE, TILE_LABEL, buttonClass, chipClass } from "@/components/ui/styles";
import type { TileSize } from "@/lib/core/homeLayout";
import { useNowMs } from "@/lib/core/useNowMs";
import {
  durationLabel,
  formatLeft,
  isExpired,
  isPaused,
  leftMs,
  pauseTimer,
  plusMinute,
  removeTimer,
  resetStopwatch,
  resumeTimer,
  shownOnTile,
  sortTimers,
  stopwatchMs,
  type Timer,
} from "@/lib/timer/model";
import { changeTimers, useTimers } from "@/lib/timer/store";
import { startTimer, stopwatch } from "@/lib/timer/actions";
import { buzz } from "@/components/heute/actions";

const QUICK = [5, 10, 15];

export function TimerTile({ size = "M" }: { size?: TileSize }) {
  const state = useTimers();
  const [custom, setCustom] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const active = Boolean(state && (state.timers.length || state.stopwatch?.startedAt));
  const nowMs = useNowMs(active);
  if (!state) return <section className={`${TILE} h-24 animate-pulse`} aria-label="Timer" />;
  const timers = sortTimers(state.timers.filter((t) => shownOnTile(t, nowMs)), nowMs);
  const running = timers.filter((t) => !isExpired(t, nowMs) && !isPaused(t)).length;
  const sw = state.stopwatch;
  const main = timers[0];
  const start = (minutes: number, name?: string) => {
    if (startTimer({ minutes, name })) buzz();
  };
  const sheet = custom !== null && <CustomTimerSheet minutes={custom} onClose={() => setCustom(null)} onStart={(m, n) => (start(m, n), setCustom(null))} />;

  if (size === "S") {
    return (
      <>
        <section className={`${TILE} flex min-h-[92px] flex-col p-3.5`} aria-label="Timer">
          <button type="button" onClick={() => (main || sw ? setOpen(true) : setCustom(10))} className="flex flex-1 flex-col items-start gap-1 text-left">
            <span className={`flex items-center gap-1.5 ${TILE_LABEL}`}>
              <TimerIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Timer{running > 1 ? ` · ${running} laufen` : ""}
            </span>
            {main ? (
              <span className="flex items-baseline gap-1.5">
                <span aria-hidden>{main.emoji}</span>
                <span className="text-[22px] font-extrabold tabular-nums leading-none" role="timer" aria-label={`${main.name}: ${isExpired(main, nowMs) ? "fertig" : formatLeft(leftMs(main, nowMs))}`}>
                  {isExpired(main, nowMs) ? "fertig" : formatLeft(leftMs(main, nowMs))}
                </span>
                <span className="truncate text-[13px] text-muted">{main.name}</span>
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
          <Sheet title="Timer" onClose={() => setOpen(false)}>
            <div className="pb-3">
              <TimerTile size="M" />
            </div>
          </Sheet>
        )}
      </>
    );
  }

  return (
    <>
      <section className={`${TILE} flex flex-col gap-2 p-3.5`} aria-label="Timer">
        <div className={`flex items-center gap-1.5 pr-8 ${TILE_LABEL}`}>
          <TimerIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          <span>Timer</span>
          {running > 1 && <span className="font-semibold normal-case tracking-normal">· {running} laufen</span>}
        </div>
        <span className="absolute right-3.5 top-3">
          <QuickButton icon={Plus} label="Neuer Timer" onClick={() => setCustom(10)} />
        </span>
        {main && <MainTimer timer={main} nowMs={nowMs} />}
        {timers.slice(1).map((t) => (
          <TimerRow key={t.id} timer={t} nowMs={nowMs} />
        ))}
        {sw && <StopwatchRow ms={stopwatchMs(sw, nowMs)} running={Boolean(sw.startedAt)} />}
        {!main && !sw && <p className="text-[14px] text-muted">Bereit, wenn du ihn brauchst.</p>}
        <div className="flex flex-wrap gap-1.5 pt-0.5" aria-label="Schnell starten">
          {QUICK.map((m) => (
            <HoldButton key={m} label={`${m} Min`} aria={`Timer ${m} Minuten`} onTap={() => start(m)} onHold={() => setCustom(m)} />
          ))}
          <HoldButton label="Stoppuhr" aria="Stoppuhr starten" onTap={() => (stopwatch("start"), buzz())} onHold={() => setCustom(10)} />
        </div>
      </section>
      {sheet}
    </>
  );
}

/** Fortschrittsring (SVG) */
function Ring({ part, children }: { part: number; children: React.ReactNode }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-line" />
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-accent" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, part)))} />
      </svg>
      <span className="text-2xl" aria-hidden>
        {children}
      </span>
    </span>
  );
}

const act = (change: Parameters<typeof changeTimers>[0]) => {
  buzz();
  changeTimers(change);
};

function MainTimer({ timer, nowMs }: { timer: Timer; nowMs: number }) {
  const done = isExpired(timer, nowMs);
  const left = leftMs(timer, nowMs);
  return (
    <div className="flex items-center gap-3">
      <Ring part={done ? 1 : 1 - left / timer.durationMs}>{timer.emoji}</Ring>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[30px] font-extrabold tabular-nums leading-none" role="timer" aria-label={`${timer.name}: ${done ? "fertig" : formatLeft(left)}`}>
          {done ? "fertig ✓" : formatLeft(left)}
        </span>
        <span className="truncate text-[13.5px] text-muted">
          {timer.name}
          {timer.name.startsWith("Timer ") ? "" : ` · ${durationLabel(timer.durationMs)}`}
          {isPaused(timer) ? " · pausiert" : ""}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => act((s, n) => plusMinute(s, timer.id, n))} aria-label={`${timer.name}: eine Minute mehr`} className="h-11 min-w-11 rounded-full bg-tile-inner px-2 text-sm font-bold text-tile-accent active:scale-95">
          +1
        </button>
        {!done && (
          <button
            type="button"
            onClick={() => act((s, n) => (isPaused(timer) ? resumeTimer(s, timer.id, n) : pauseTimer(s, timer.id, n)))}
            aria-label={isPaused(timer) ? `${timer.name} weiter` : `${timer.name} pausieren`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-segment active:scale-95"
          >
            {isPaused(timer) ? <Play className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : <Pause className="h-4 w-4" strokeWidth={2.5} aria-hidden />}
          </button>
        )}
        <button type="button" onClick={() => act((s, n) => removeTimer(s, timer.id, n))} aria-label={`${timer.name} beenden`} className="flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-fill">
          <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function TimerRow({ timer, nowMs }: { timer: Timer; nowMs: number }) {
  const done = isExpired(timer, nowMs);
  return (
    <div className="flex min-h-11 items-center gap-2 border-t border-line pt-1.5">
      <span aria-hidden>{timer.emoji}</span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{timer.name}</span>
      <span className="text-[15px] font-bold tabular-nums" role="timer" aria-label={`${timer.name}: ${done ? "fertig" : formatLeft(leftMs(timer, nowMs))}`}>
        {done ? "fertig ✓" : formatLeft(leftMs(timer, nowMs))}
      </span>
      {!done && (
        <button type="button" onClick={() => act((s, n) => (isPaused(timer) ? resumeTimer(s, timer.id, n) : pauseTimer(s, timer.id, n)))} aria-label={isPaused(timer) ? `${timer.name} weiter` : `${timer.name} pausieren`} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-fill">
          {isPaused(timer) ? <Play className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : <Pause className="h-4 w-4" strokeWidth={2.5} aria-hidden />}
        </button>
      )}
      <button type="button" onClick={() => act((s, n) => removeTimer(s, timer.id, n))} aria-label={`${timer.name} beenden`} className="flex h-10 w-10 items-center justify-center rounded-full text-muted active:bg-fill">
        <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}

function StopwatchRow({ ms, running }: { ms: number; running: boolean }) {
  return (
    <div className="flex min-h-11 items-center gap-2 border-t border-line pt-1.5">
      <TimerIcon className="h-4 w-4 shrink-0 text-tile-accent" strokeWidth={2} aria-hidden />
      <span className="flex-1 text-[14px] font-semibold">Stoppuhr</span>
      <span className="text-[15px] font-bold tabular-nums" role="timer" aria-label={`Stoppuhr: ${formatLeft(ms)}`}>
        {formatLeft(ms)}
      </span>
      <button type="button" onClick={() => (stopwatch(running ? "stop" : "start"), buzz())} aria-label={running ? "Stoppuhr anhalten" : "Stoppuhr weiter"} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-fill">
        {running ? <Pause className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : <Play className="h-4 w-4" strokeWidth={2.5} aria-hidden />}
      </button>
      <button type="button" onClick={() => act((s) => resetStopwatch(s))} aria-label="Stoppuhr zurücksetzen" className="flex h-10 w-10 items-center justify-center rounded-full text-muted active:bg-fill">
        <RotateCcw className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}

/** Schnellknopf: Tippen = starten, lange drücken (0,5 s) = eigene Dauer + Name */
function HoldButton({ label, aria, onTap, onHold }: { label: string; aria: string; onTap: () => void; onHold: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <button
      type="button"
      aria-label={aria}
      onPointerDown={(e) => {
        e.stopPropagation();
        held.current = false;
        clear();
        timer.current = setTimeout(() => {
          held.current = true;
          buzz();
          onHold();
        }, 500);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (held.current) {
          held.current = false;
          return;
        }
        onTap();
      }}
      className={`${chipClass(false)} select-none [-webkit-touch-callout:none]`}
    >
      {label}
    </button>
  );
}

/** Eigener Timer: Dauer + Name */
function CustomTimerSheet({ minutes, onClose, onStart }: { minutes: number; onClose: () => void; onStart: (minutes: number, name: string) => void }) {
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
