"use client";

// Band oben über allen Seiten, wenn ein Timer fertig ist: "⏰ Nudeln sind
// fertig – OK". Bei offener App klingt ein freundlicher Ton (wiederholt bis
// zum Antippen, höchstens 1 Minute; Android vibriert, iPhone kann das als
// Web-App nicht). Lief der Timer ab, während die App zu war: beim Öffnen
// still "⏰ Nudeln war um 18:30 fertig".

import { useEffect } from "react";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { now } from "@/lib/core/now";
import { useNowMs } from "@/lib/core/useNowMs";
import { ackTimers, isExpired, RING_MS, type Timer } from "@/lib/timer/model";
import { changeTimers, useTimers } from "@/lib/timer/store";
import { chime } from "@/lib/timer/sound";

// Uhrzeit des Geräts (steht in Europe/Berlin) – wie überall auf der Startseite
const CLOCK = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
const PLURAL = /^(nudeln|kartoffeln|eier|brötchen|pommes|spätzle|plätzchen|kekse|muffins|waffeln|pfannkuchen|möhren|erbsen|bohnen|linsen|klöße|knödel)$/i;

/** "Nudeln sind fertig" / "Reis ist fertig" */
export const doneText = (t: Pick<Timer, "name">) => `${t.name} ${PLURAL.test(t.name.trim()) ? "sind" : "ist"} fertig`;

let visibleSince: number | null = null;
const visibleSinceNow = () => (visibleSince ??= now().getTime());
function subscribeVisible(onChange: () => void) {
  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    visibleSince = now().getTime();
    onChange();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => document.removeEventListener("visibilitychange", onVisible);
}

export function TimerAlarm() {
  const state = useTimers();
  const due = state?.timers.some((t) => !t.acked && t.pausedLeft === null) ?? false;
  const nowMs = useNowMs(due, 1000);
  // Seit wann die App sichtbar ist: was davor ablief, war "verpasst" (still), danach klingelt es
  const since = useExternalStore(subscribeVisible, visibleSinceNow, () => 0);
  const expired = (state?.timers ?? []).filter((t) => !t.acked && isExpired(t, nowMs));
  const ringing = expired.filter((t) => t.endsAt >= since && nowMs - t.endsAt < RING_MS);
  const ringKey = ringing.map((t) => t.id).join();

  useEffect(() => {
    if (!ringKey) return;
    const ring = () => {
      chime();
      try {
        navigator.vibrate?.([250, 120, 250]);
      } catch {
        // ohne Vibration (iPhone)
      }
    };
    ring();
    const id = window.setInterval(ring, 2500);
    return () => window.clearInterval(id);
  }, [ringKey]);

  if (!expired.length) return null;
  const ok = () => changeTimers((s) => ackTimers(s, expired.map((t) => t.id)));
  const first = expired[0];
  const missed = first.endsAt < since;
  const text = missed ? `${first.name} war um ${CLOCK.format(new Date(first.endsAt))} fertig` : doneText(first);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <div
        role="alert"
        aria-label="Timer fertig"
        className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl bg-bar px-4 py-3 text-on-bar shadow-lg"
        style={ringing.length ? { animation: "ring-pulse 1.2s ease-in-out infinite" } : undefined}
      >
        <span className="text-xl" aria-hidden>
          ⏰
        </span>
        <span className="min-w-0 flex-1 text-base font-bold leading-snug">
          {first.emoji !== "⏱" ? `${first.emoji} ` : ""}
          {text}
          {expired.length > 1 ? ` (+${expired.length - 1})` : ""}
        </span>
        <button type="button" onClick={ok} className="h-11 shrink-0 rounded-full bg-on-bar px-5 text-sm font-extrabold text-bar active:scale-95">
          OK
        </button>
      </div>
    </div>
  );
}
