"use client";

// Timer aus der Oberfläche oder von Lotte starten/stoppen – mit allem, was
// dazugehört: Ton freischalten (iPhone), einmaliger Hinweis, Phase sofort auf
// "Kochen", Timer-Kachel einblenden (bei "Mitdenkend" erscheint sie oben).

import { showToast } from "../core/toast";
import { now } from "../core/now";
import { nudgePhase } from "../tagesablauf/nudge";
import { addTimer, findTimer, removeTimer, startStopwatch, pauseStopwatch, isExpired, type Timer } from "./model";
import { changeTimers, loadTimers } from "./store";
import { unlockTimerSound } from "./sound";

export const TIMER_HINT = "Der Ton kommt, solange die App offen ist. Erinnerungen bei geschlossener App kommen bald per Mitteilung.";
export const TIMER_FULL = "Fünf Timer laufen schon – sobald einer fertig ist, geht der nächste.";

/** Timer starten; null = schon 5 laufen. `quiet` = kein Hinweis (z. B. im Chat, der selbst antwortet) */
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
