import { describe, expect, it } from "vitest";
import {
  EMPTY_TIMERS,
  ackTimers,
  addTimer,
  durationLabel,
  findTimer,
  formatLeft,
  isExpired,
  isPaused,
  isRunning,
  leftMs,
  leftWords,
  parseTimerCommand,
  pauseStopwatch,
  pauseTimer,
  plusMinute,
  pruneTimers,
  removeTimer,
  resetStopwatch,
  resumeTimer,
  sanitizeTimers,
  shownOnTile,
  sortTimers,
  startStopwatch,
  stopwatchMs,
  timerPushPlan,
  type TimerState,
} from "@/lib/timer/model";

const T0 = Date.parse("2026-10-21T16:00:00Z");
const MIN = 60_000;

function start(s: TimerState, minutes: number, name?: string, at = T0) {
  const r = addTimer(s, { minutes, name }, at);
  if (!r) throw new Error("kein Timer");
  return r;
}

describe("Timer: rechnen mit Endzeit", () => {
  it("neuer Timer: Endzeit, Name, passendes Symbol", () => {
    const { state, timer } = start(EMPTY_TIMERS, 10, "Nudeln");
    expect(timer).toMatchObject({ name: "Nudeln", emoji: "🍝", durationMs: 10 * MIN, endsAt: T0 + 10 * MIN, pausedLeft: null, acked: false });
    expect(state.timers).toHaveLength(1);
    expect(state.firstAt).toBe(T0);
    expect(state.lastEnd).toBe(T0 + 10 * MIN);
    // nach Hintergrund/Neustart stimmt die Restzeit sofort
    expect(leftMs(timer, T0 + 4 * MIN)).toBe(6 * MIN);
    expect(leftMs(timer, T0 + 11 * MIN)).toBe(0);
    expect(isRunning(timer, T0 + 9 * MIN)).toBe(true);
    expect(isExpired(timer, T0 + 10 * MIN)).toBe(true);
  });

  it("ohne Namen heißt er nach der Dauer; Symbole nach Stichwort", () => {
    expect(start(EMPTY_TIMERS, 5).timer).toMatchObject({ name: "Timer 5 Min", emoji: "⏱" });
    expect(start(EMPTY_TIMERS, 5, "  ").timer.name).toBe("Timer 5 Min");
    expect(start(EMPTY_TIMERS, 8, "Eier").timer.emoji).toBe("🥚");
    expect(start(EMPTY_TIMERS, 20, "Wäsche").timer.emoji).toBe("🧺");
    expect(start(EMPTY_TIMERS, 40, "Brötchen aufbacken").timer.emoji).toBe("🥖");
    expect(start(EMPTY_TIMERS, 3, "Ein sehr sehr langer Timer-Name über dreißig Zeichen").timer.name).toHaveLength(30);
    const fromStep = addTimer(EMPTY_TIMERS, { minutes: 12, name: "Backen", emoji: "🧁", step: "Kuchen in den Ofen" }, T0)!;
    expect(fromStep.timer).toMatchObject({ emoji: "🧁", step: "Kuchen in den Ofen" });
  });

  it("ungültige Dauer oder schon 5 laufen = null; Erledigte zählen nicht mit", () => {
    expect(addTimer(EMPTY_TIMERS, { minutes: 0 }, T0)).toBeNull();
    expect(addTimer(EMPTY_TIMERS, { minutes: Number.NaN }, T0)).toBeNull();
    expect(addTimer(EMPTY_TIMERS, { minutes: 25 * 60 }, T0)).toBeNull();
    let s = EMPTY_TIMERS;
    for (let i = 0; i < 5; i++) s = start(s, 10 + i).state;
    expect(addTimer(s, { minutes: 3 }, T0)).toBeNull();
    // einer abgelaufen und gesehen → Platz für einen neuen
    s = { ...s, timers: s.timers.map((t, i) => (i === 0 ? { ...t, endsAt: T0 - 1, acked: true } : t)) };
    const r = addTimer(s, { minutes: 3 }, T0)!;
    expect(r.state.timers).toHaveLength(5);
  });

  it("Kochen: erster Start bleibt, solange der nächste innerhalb von 15 Min nach dem letzten Ende kommt", () => {
    const a = start(EMPTY_TIMERS, 10, "Reis");
    const b = start(a.state, 5, "Ei", T0 + 20 * MIN);
    expect(b.state.firstAt).toBe(T0);
    const c = start(a.state, 5, "Tee", T0 + 30 * MIN);
    expect(c.state.firstAt).toBe(T0 + 30 * MIN);
  });

  it("+1 Minute – auch nach Ablauf (läuft dann wieder) und pausiert", () => {
    const { state, timer } = start(EMPTY_TIMERS, 1, "Tee");
    const plus = plusMinute(state, timer.id, T0 + 30_000);
    expect(plus.timers[0].endsAt).toBe(T0 + 2 * MIN);
    expect(plus.lastEnd).toBe(T0 + 2 * MIN);
    const late = plusMinute({ ...state, timers: [{ ...timer, acked: true }] }, timer.id, T0 + 5 * MIN);
    expect(late.timers[0]).toMatchObject({ endsAt: T0 + 6 * MIN, acked: false });
    const paused = pauseTimer(state, timer.id, T0 + 20_000);
    expect(plusMinute(paused, timer.id, T0 + 99 * MIN).timers[0].pausedLeft).toBe(40_000 + MIN);
    expect(plusMinute(state, "gibtsnicht", T0)).toEqual(state);
  });

  it("Pause merkt die Restzeit, Weiter rechnet die neue Endzeit", () => {
    const { state, timer } = start(EMPTY_TIMERS, 10, "Kartoffeln");
    const paused = pauseTimer(state, timer.id, T0 + 4 * MIN);
    expect(isPaused(paused.timers[0])).toBe(true);
    expect(leftMs(paused.timers[0], T0 + 60 * MIN)).toBe(6 * MIN);
    // doppelt pausieren ändert nichts, abgelaufen pausieren auch nicht
    expect(pauseTimer(paused, timer.id, T0 + 5 * MIN)).toEqual(paused);
    expect(pauseTimer(state, timer.id, T0 + 11 * MIN).timers[0].pausedLeft).toBeNull();
    const resumed = resumeTimer(paused, timer.id, T0 + 20 * MIN);
    expect(resumed.timers[0]).toMatchObject({ pausedLeft: null, endsAt: T0 + 26 * MIN });
    expect(resumed.lastEnd).toBe(T0 + 26 * MIN);
    expect(resumeTimer(state, timer.id, T0)).toEqual({ ...state, lastEnd: state.lastEnd });
    expect(resumeTimer(state, "nix", T0)).toEqual(state);
  });

  it("Entfernen: vorzeitig beendet zählt fürs Kochen bis jetzt", () => {
    const a = start(EMPTY_TIMERS, 10, "Reis");
    const b = start(a.state, 30, "Ofen");
    const removed = removeTimer(b.state, b.timer.id, T0 + 5 * MIN);
    expect(removed.timers.map((t) => t.name)).toEqual(["Reis"]);
    expect(removed.lastEnd).toBe(T0 + 10 * MIN);
    // ein pausierter zählt bis jetzt
    const paused = pauseTimer(b.state, a.timer.id, T0 + MIN);
    expect(removeTimer(paused, b.timer.id, T0 + 5 * MIN).lastEnd).toBe(T0 + 5 * MIN);
    // abgelaufen entfernt: letztes Ende bleibt
    const expired = removeTimer(a.state, a.timer.id, T0 + 20 * MIN);
    expect(expired.lastEnd).toBe(a.state.lastEnd);
    expect(removeTimer(a.state, "nix", T0).lastEnd).toBe(a.state.lastEnd);
    expect(ackTimers(b.state, [a.timer.id]).timers.map((t) => t.name)).toEqual(["Ofen"]);
  });

  it("Reihenfolge: Abgelaufenes zuerst, dann was als Nächstes fertig wird, Pausiertes zuletzt", () => {
    let s = start(EMPTY_TIMERS, 10, "Reis").state;
    s = start(s, 3, "Ei").state;
    s = start(s, 1, "Tee").state;
    s = start(s, 20, "Ofen").state;
    s = pauseTimer(s, s.timers[3].id, T0 + 30_000);
    const sorted = sortTimers(s.timers, T0 + 90_000).map((t) => t.name);
    expect(sorted).toEqual(["Tee", "Ei", "Reis", "Ofen"]);
  });

  it("auf der Kachel: abgelaufen noch 1 Minute; lange vergessene werden weggeräumt", () => {
    const { state, timer } = start(EMPTY_TIMERS, 1, "Tee");
    expect(shownOnTile(timer, T0 + 90_000)).toBe(true);
    expect(shownOnTile(timer, T0 + 2 * MIN)).toBe(false);
    expect(pruneTimers(state, T0 + 12 * 60 * MIN).timers).toHaveLength(1);
    expect(pruneTimers(state, T0 + 13 * 60 * MIN).timers).toHaveLength(0);
  });
});

describe("Timer: Anzeige", () => {
  it("Restzeit, Dauer und Worte", () => {
    expect(formatLeft(598_000)).toBe("9:58");
    expect(formatLeft(3_723_000)).toBe("1:02:03");
    expect(formatLeft(-5)).toBe("0:00");
    expect(durationLabel(45_000)).toBe("45 Sek");
    expect(durationLabel(10 * MIN)).toBe("10 Min");
    expect(durationLabel(90 * MIN)).toBe("1 Std 30 Min");
    expect(durationLabel(120 * MIN)).toBe("2 Std");
    expect(leftWords(30_000)).toBe("noch 30 Sekunden");
    expect(leftWords(60_000)).toBe("noch 1 Minute");
    expect(leftWords(4 * MIN)).toBe("noch 4 Minuten");
    expect(leftWords(65 * MIN)).toBe("noch 1 Stunde 5 Minuten");
    expect(leftWords(61 * MIN)).toBe("noch 1 Stunde 1 Minute");
    expect(leftWords(120 * MIN)).toBe("noch 2 Stunden");
  });
});

describe("Stoppuhr", () => {
  it("starten, anhalten, weiter, zurücksetzen", () => {
    let s = startStopwatch(EMPTY_TIMERS, T0);
    expect(startStopwatch(s, T0 + 5000)).toBe(s);
    expect(stopwatchMs(s.stopwatch!, T0 + 10_000)).toBe(10_000);
    s = pauseStopwatch(s, T0 + 10_000);
    expect(pauseStopwatch(s, T0 + 20_000)).toBe(s);
    expect(stopwatchMs(s.stopwatch!, T0 + 99_000)).toBe(10_000);
    s = startStopwatch(s, T0 + 20_000);
    expect(stopwatchMs(s.stopwatch!, T0 + 25_000)).toBe(15_000);
    expect(resetStopwatch(s).stopwatch).toBeNull();
    expect(pauseStopwatch(EMPTY_TIMERS, T0)).toBe(EMPTY_TIMERS);
  });
});

describe("Timer finden und Sätze verstehen", () => {
  const list = [start(EMPTY_TIMERS, 10, "Nudeln").timer, start(EMPTY_TIMERS, 5, "Eier").timer];

  it("nach Namen, auch mit Wortstamm; ohne Namen der erste", () => {
    expect(findTimer(list, "Nudel-Timer")?.name).toBe("Nudeln");
    expect(findTimer(list, "eier")?.name).toBe("Eier");
    expect(findTimer(list, "Nudeln")?.name).toBe("Nudeln");
    expect(findTimer(list, "Timer")?.name).toBe("Nudeln");
    expect(findTimer(list, "Reis")).toBeUndefined();
  });

  it("Timer stellen in verschiedenen Formen", () => {
    expect(parseTimerCommand("Timer 10 Minuten für die Nudeln")).toEqual({ kind: "start", minutes: 10, name: "Nudeln" });
    expect(parseTimerCommand("Stell einen Timer auf zwanzig Minuten")).toMatchObject({ kind: "start", minutes: 20 });
    // Dativ („in einer halben Stunde“, „in einer Stunde“) – bis v0.47.5 nicht erkannt
    expect(parseTimerCommand("Weck mich in einer halben Stunde")).toMatchObject({ kind: "start", minutes: 30 });
    expect(parseTimerCommand("Erinner mich in einer Stunde")).toMatchObject({ kind: "start", minutes: 60 });
    expect(parseTimerCommand("Timer in einer Minute")).toMatchObject({ kind: "start", minutes: 1 });
    expect(parseTimerCommand("Timer eine Dreiviertelstunde")).toMatchObject({ kind: "start", minutes: 45 });
    expect(parseTimerCommand("Timer Viertelstunde Brötchen")).toMatchObject({ kind: "start", minutes: 15 });
    expect(parseTimerCommand("Timer 2 Stunden Braten")).toEqual({ kind: "start", minutes: 120, name: "Braten" });
    expect(parseTimerCommand("Timer 30 Sekunden")).toMatchObject({ kind: "start", minutes: 0.5, name: "" });
    expect(parseTimerCommand("Sag Bescheid in 1,5 Minuten")).toMatchObject({ kind: "start", minutes: 1.5 });
    expect(parseTimerCommand("Timer gleich")).toBeNull();
    expect(parseTimerCommand("Timer quatsch minuten")).toBeNull();
  });

  it("stoppen, Stand, Stoppuhr", () => {
    expect(parseTimerCommand("Stopp den Nudel-Timer")).toEqual({ kind: "stop", name: "nudel" });
    expect(parseTimerCommand("Timer stoppen")).toEqual({ kind: "stop", name: "" });
    expect(parseTimerCommand("Wie lange noch?")).toEqual({ kind: "status" });
    expect(parseTimerCommand("Nudeln – wie lange noch?")).toEqual({ kind: "status" });
    expect(parseTimerCommand("Stoppuhr starten")).toEqual({ kind: "stopwatch", action: "start" });
    expect(parseTimerCommand("Stoppuhr stopp")).toEqual({ kind: "stopwatch", action: "stop" });
    expect(parseTimerCommand("Was gibt's heute?")).toBeNull();
  });
});

describe("Speicher prüfen und Push vorbereiten", () => {
  it("prüft gespeicherte Timer", () => {
    expect(sanitizeTimers(null)).toEqual(EMPTY_TIMERS);
    const s = sanitizeTimers({
      timers: [{ id: "a", endsAt: T0, name: "Sehr langer Name, der weit über dreißig Zeichen geht", emoji: "🍝🍝🍝", step: 5 }, { id: 3, endsAt: T0 }, null, { id: "b", endsAt: T0, durationMs: 1000, pausedLeft: 500, startedAt: 1, acked: true, step: "Schritt" }],
      stopwatch: { startedAt: "x", elapsedMs: 50 },
      hintSeen: true,
      firstAt: T0,
      lastEnd: "nein",
    });
    expect(s.timers).toHaveLength(2);
    expect(s.timers[0]).toEqual({ id: "a", name: "Sehr langer Name, der weit übe", emoji: "🍝🍝", durationMs: 60_000, endsAt: T0, pausedLeft: null, startedAt: T0, acked: false });
    expect(s.timers[1]).toMatchObject({ pausedLeft: 500, startedAt: 1, acked: true, step: "Schritt" });
    expect(s.stopwatch).toEqual({ startedAt: null, elapsedMs: 50 });
    expect(s).toMatchObject({ hintSeen: true, firstAt: T0, lastEnd: null });
    expect(sanitizeTimers({ timers: [{ id: "x", endsAt: T0, emoji: 5 }] }).timers[0]).toMatchObject({ name: "Timer", emoji: "⏱" });
  });

  it("Timer-Ende als planbare Mitteilung, pausiert nicht", () => {
    const { timer } = start(EMPTY_TIMERS, 10, "Nudeln");
    expect(timerPushPlan(timer, "Mia")).toEqual({ at: new Date(T0 + 10 * MIN).toISOString(), title: "Mia: 🍝 Nudeln", body: "Nudeln ist fertig." });
    expect(timerPushPlan({ ...timer, pausedLeft: 1000 }, "Mia")).toBeNull();
  });
});
