"use client";

// Timer aus der Oberfläche oder von Lotte starten/stoppen – mit allem, was
// dazugehört: Ton freischalten (iPhone), einmaliger Hinweis, Phase sofort auf
// "Kochen". Auf der Startseite zeigt ihn der Timer-Kreis oben (A-050, Tafel
// 143: Restzeit im Kreis, Position 1) – eine Kachel wird nicht mehr eingeblendet.

import { showToast } from "@/lib/core/toast";
import { now } from "@/lib/core/now";
import { nudgePhase } from "@/lib/heute/nudge";
import { addTimer, findTimer, removeTimer, startStopwatch, pauseStopwatch, isExpired, type Timer } from "@/lib/timer/model";
import { changeTimers, loadTimers } from "@/lib/timer/store";
import { unlockTimerSound } from "@/lib/timer/sound";

const TIMER_HINT = "Der Ton kommt, solange die App geöffnet ist. Erinnerungen bei geschlossener App kommen bald per Mitteilung.";
const TIMER_FULL = "Fünf Timer laufen schon – sobald einer fertig ist, geht der nächste.";

/**
 * Timer starten; null = schon 5 laufen. `quiet` = kein Hinweis (z. B. im Chat,
 * der selbst antwortet).
 */
export function startTimer(input: { name?: string; minutes: number; step?: string }, opts: { quiet?: boolean } = {}): { timer: Timer; undo: () => void } | null {
  unlockTimerSound();
  const before = loadTimers();
  const result = addTimer(before, input, now().getTime());
  if (!result) {
    if (!opts.quiet) showToast({ text: TIMER_FULL });
    return null;
  }
  const firstTime = !before.hintSeen;
  const undo = changeTimers(() => ({ ...result.state, hintSeen: true }));
  if (firstTime) showToast({ text: TIMER_HINT, seconds: 8 });
  nudgePhase();
  return { timer: result.timer, undo };
}

/** Timer nach Name stoppen ("Stopp den Nudel-Timer"); liefert den gestoppten */
export function stopTimerByName(name: string): Timer | null {
  const nowMs = now().getTime();
  const live = loadTimers().timers.filter((t) => !isExpired(t, nowMs));
  const hit = findTimer(live, name);
  if (!hit) return null;
  changeTimers((s, n) => removeTimer(s, hit.id, n));
  return hit;
}

export function stopwatch(action: "start" | "stop") {
  unlockTimerSound();
  changeTimers((s, n) => (action === "start" ? startStopwatch(s, n) : pauseStopwatch(s, n)));
  nudgePhase();
}

/**
 * Timer aus einem Rezept-Schritt (Kochmodus und Timer-Chip auf der
 * Rezeptseite, Tafel 122): derselbe Timer wie überall, läuft beim Blättern
 * weiter, meldet sich mit Ton und Karte (`TimerAlarm`). Läuft für diesen
 * Schritt schon einer, kein zweiter. true = läuft (neu oder schon).
 */
export function startStepTimer(step: string, minutes: number, name: string): boolean {
  const nowMs = now().getTime();
  if (loadTimers().timers.some((t) => t.step === step && !isExpired(t, nowMs))) return true;
  return startTimer({ name, minutes, step }) !== null;
}
