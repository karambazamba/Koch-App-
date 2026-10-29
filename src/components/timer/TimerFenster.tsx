"use client";

// Timer-Fenster (A-050, Tafel 137/3): Kopf „Timer“ / „Läuft weiter, auch wenn
// du die App schließt“. Oben die laufenden Timer (Ring mit Restzeit, Name,
// „von 10:00“, Pause bzw. Weiter, ✕), darunter „Neuer Timer“: sechs Felder
// 3 · 5 · 10 · 15 · 20 Min · Eigene – ein Tipp startet sofort. Unten der
// Hinweis, dass Mia das auch kann. Die Stoppuhr steht nur da, wenn sie läuft
// bzw. angehalten ist. Öffnet vom Timer-Kreis oben, der Jetzt-Karte und der
// Timer-Kachel; man bleibt auf der Startseite.

import { useState } from "react";
import { Pause, Play, RotateCcw, Timer as TimerIcon, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { FensterKopf } from "@/components/heute/kreise/FensterKopf";
import { CustomTimerSheet } from "@/components/timer/TimerTile";
import { buzz } from "@/components/heute/actions";
import { useNowMs } from "@/lib/core/useNowMs";
import { formatLeft, isExpired, isPaused, leftMs, pauseTimer, removeTimer, resetStopwatch, resumeTimer, shownOnTile, sortTimers, stopwatchMs, type Timer } from "@/lib/timer/model";
import { changeTimers, useTimers } from "@/lib/timer/store";
import { startTimer, stopwatch } from "@/lib/timer/actions";
import { helperName } from "@/lib/einstellungen/profile";

/** Die sechs Felder (Minuten); „Eigene“ öffnet Dauer + Name */
export const TIMER_FELDER = [3, 5, 10, 15, 20];

export const TIMER_UNTERZEILE = "Läuft weiter, auch wenn du die App schließt";
/** „Oder sag Mia: ‚Timer 12 Minuten für die Eier‘“ – mit dem Namen der Begleitung */
export const timerMiaHinweis = (name: string) => `Oder sag ${name}: „Timer 12 Minuten für die Eier“`;

const aendern = (change: Parameters<typeof changeTimers>[0]) => {
  buzz();
  changeTimers(change);
};

export function TimerFenster({ onClose }: { onClose: () => void }) {
  const state = useTimers();
  const [eigene, setEigene] = useState(false);
  const aktiv = Boolean(state && (state.timers.length || state.stopwatch?.startedAt));
  const nowMs = useNowMs(aktiv);
  const timers = state ? sortTimers(state.timers.filter((t) => shownOnTile(t, nowMs)), nowMs) : [];
  const sw = state?.stopwatch;
  const start = (minutes: number, name?: string) => {
    if (startTimer({ minutes, name })) buzz();
  };
  return (
    <>
      <Sheet title="Timer" onClose={onClose} header={<FensterKopf icon={TimerIcon} tone="timer" titel="Timer" unter={TIMER_UNTERZEILE} onClose={onClose} />}>
        <div className="flex flex-col gap-4 pb-4" data-timer-fenster>
          {timers.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="Laufende Timer">
              {timers.map((t) => (
                <TimerKarte key={t.id} timer={t} nowMs={nowMs} />
              ))}
            </ul>
          )}
          {sw && <Stoppuhr ms={stopwatchMs(sw, nowMs)} laeuft={Boolean(sw.startedAt)} />}
          <section className="flex flex-col gap-2" aria-label="Neuer Timer">
            <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-muted">Neuer Timer</h3>
            <div className="grid grid-cols-3 gap-2">
              {TIMER_FELDER.map((m) => (
                <button key={m} type="button" onClick={() => start(m)} aria-label={`Timer ${m} Minuten starten`} className="flex h-[68px] flex-col items-center justify-center rounded-field bg-fill active:scale-95" data-timer-feld={m}>
                  <span className="text-[24px] font-extrabold leading-none tabular-nums">{m}</span>
                  <span className="text-[12.5px] font-semibold text-muted">Min</span>
                </button>
              ))}
              <button type="button" onClick={() => setEigene(true)} className="flex h-[68px] items-center justify-center rounded-field bg-accent-soft text-[16px] font-bold text-accent-strong active:scale-95" data-timer-feld="eigene">
                Eigene
              </button>
            </div>
          </section>
          {!sw && (
            <button type="button" onClick={() => (stopwatch("start"), buzz())} className="hit self-center text-[14px] font-semibold text-muted underline">
              Stoppuhr starten
            </button>
          )}
          <p className="text-center text-[13.5px] text-muted">{timerMiaHinweis(helperName())}</p>
        </div>
      </Sheet>
      {eigene && <CustomTimerSheet minutes={12} onClose={() => setEigene(false)} onStart={(m, n) => (start(m, n), setEigene(false))} />}
    </>
  );
}

/** Ein laufender Timer: Ring mit Restzeit, Name, „von 10:00“, Pause/Weiter, ✕ */
function TimerKarte({ timer, nowMs }: { timer: Timer; nowMs: number }) {
  const fertig = isExpired(timer, nowMs);
  const left = leftMs(timer, nowMs);
  const anteil = fertig ? 0 : timer.durationMs > 0 ? left / timer.durationMs : 0;
  const r = 27;
  const u = 2 * Math.PI * r;
  return (
    <li className="flex items-center gap-3 rounded-card bg-accent-soft/60 p-3" data-timer-karte>
      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
        <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="kreis-ring-timer-leer" />
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" strokeLinecap="round" className="kreis-ring-timer" strokeDasharray={u} strokeDashoffset={u * (1 - anteil)} />
        </svg>
        <span className="text-[16px] font-extrabold tabular-nums" role="timer" aria-label={`${timer.name}: ${fertig ? "fertig" : formatLeft(left)}`}>
          {fertig ? "✓" : formatLeft(left)}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[17px] font-bold" data-freitext>{timer.name}</span>
        <span className="text-[13.5px] text-muted">{fertig ? "fertig" : `von ${formatLeft(timer.durationMs)}${isPaused(timer) ? " · pausiert" : ""}`}</span>
      </span>
      {!fertig && (
        <button
          type="button"
          onClick={() => aendern((s, n) => (isPaused(timer) ? resumeTimer(s, timer.id, n) : pauseTimer(s, timer.id, n)))}
          aria-label={isPaused(timer) ? `${timer.name} weiter` : `${timer.name} pausieren`}
          className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-surface px-3.5 text-[14px] font-bold active:scale-95"
        >
          {isPaused(timer) ? "Weiter" : "Pause"}
        </button>
      )}
      <button type="button" onClick={() => aendern((s, n) => removeTimer(s, timer.id, n))} aria-label={`${timer.name} stoppen`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-muted active:scale-95">
        <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </button>
    </li>
  );
}

function Stoppuhr({ ms, laeuft }: { ms: number; laeuft: boolean }) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-card bg-fill px-3 py-1.5">
      <TimerIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
      <span className="flex-1 text-[15px] font-semibold">Stoppuhr</span>
      <span className="text-[16px] font-bold tabular-nums" role="timer" aria-label={`Stoppuhr: ${formatLeft(ms)}`}>
        {formatLeft(ms)}
      </span>
      <button type="button" onClick={() => (stopwatch(laeuft ? "stop" : "start"), buzz())} aria-label={laeuft ? "Stoppuhr anhalten" : "Stoppuhr weiter"} className="flex h-11 w-11 items-center justify-center rounded-full active:bg-fill-strong">
        {laeuft ? <Pause className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : <Play className="h-4 w-4" strokeWidth={2.5} aria-hidden />}
      </button>
      <button type="button" onClick={() => aendern((s) => resetStopwatch(s))} aria-label="Stoppuhr zurücksetzen" className="flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-fill-strong">
        <RotateCcw className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
