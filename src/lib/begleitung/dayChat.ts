"use client";

// Ohne KI (Notlösung) – Timer, Kochen, Sport und Startseiten-Modus sofort
// erledigen und kurz melden (Zurücknehmen bleibt für "Mach das rückgängig"):
// "Timer 10 Minuten für die Nudeln", "Wie lange noch?", "Stopp den
// Nudel-Timer", "Stoppuhr starten", "Ich fang an zu kochen", "Nächster
// Schritt", "Was kommt jetzt?", "War heute 5 km laufen", "Ich will 4× pro
// Woche Sport machen", "Wie oft war ich diese Woche beim Sport?", "Plan mir 3
// Trainings nächste Woche, am liebsten morgens", "Blende die Jetzt-Karte
// aus" (auch "Lass die Startseite immer gleich").

import { WEEKDAYS_SHORT_MO } from "@/lib/core/days";
import { changeEntries, loadEntries } from "@/lib/kalender/store";
import { createEntry } from "@/lib/core/entries";
import { now } from "@/lib/core/now";
import { applyHomeChange, loadHomeTiles, saveHomeTiles } from "@/lib/core/homeLayout";
import { pushUndo } from "@/lib/core/undo";
import { upsertEntry, type CalendarEntry } from "@/lib/kalender/model";
import { currentStep, loadCooking, nextStep, startCooking } from "@/lib/essen/kochSession";
import { nudgePhase } from "@/lib/heute/nudge";
import { jetztCommand } from "@/lib/heute/jetztCommand";
import { setJetztOn } from "@/lib/heute/jetztStore";
import { durationLabel, isExpired, leftMs, leftWords, parseTimerCommand, sortTimers } from "@/lib/timer/model";
import { loadTimers } from "@/lib/timer/store";
import { startTimer, stopTimerByName, stopwatch } from "@/lib/timer/actions";
import { loadForecast } from "@/lib/wetter/client";
import { isRainy } from "@/lib/wetter/forecast";
import {
  guessMinutes,
  hoursLabel,
  loadSport,
  monthName,
  monthStats,
  parseSportCommand,
  planTrainings,
  praiseFor,
  sportById,
  weekStatus,
  weekStreak,
} from "@/lib/sport";
import { addTraining, setSportGoal } from "@/lib/sport/actions";

type DayChatContext = {
  today: string;
  /** Mein Personen-ID (Sport-Termine) */
  me: string | null;
  /** Namen der anderen im Haushalt (deren Sport zählt nicht als meiner) */
  others?: string[];
  /** Heutiges Gericht mit Rezept-Schritten */
  cooking: { dish: string; recipe: string; steps: string[] } | null;
};

type DayChatReply = { text: string; undo?: () => void };

const COOK_START = /\b(ich\s+)?(fang\w*|beginn\w*)\s+(jetzt\s+|gleich\s+)?(an\s+)?(mit\s+dem\s+)?(zu\s+)?koch\w*|\bich\s+koche\s+jetzt\b|\bkochen\s+starten\b/i;
const NEXT_STEP = /^(nächster|naechster)\s+schritt\b|^weiter\b.*\b(schritt|kochen)?|^(schritt\s+)?(erledigt|fertig)\b.*\bschritt/i;
const WHAT_NOW = /^was\s+kommt\s+(jetzt|als\s+nächstes)\b|^welcher\s+schritt\b/i;

/** Sport-Kachel einblenden, wenn Lotte Sport nutzt (true = neu) */
function showSportTile(): boolean {
  const tiles = loadHomeTiles();
  if (tiles.find((t) => t.id === "sport")?.visible) return false;
  saveHomeTiles(applyHomeChange(tiles, { tile: "sport", action: "zeigen" }));
  return true;
}

export function dayChat(text: string, ctx: DayChatContext): DayChatReply | null {
  const t = text.trim();
  const nowMs = now().getTime();

  // --- Jetzt-Karte an/aus (auch "Startseite immer gleich" / "… soll mitdenken") ---
  const jetzt = jetztCommand(t);
  if (jetzt !== null) {
    const undo = pushUndo(jetzt ? "„Jetzt-Karte an“" : "„Jetzt-Karte aus“", setJetztOn(jetzt));
    return {
      text: jetzt
        ? "Erledigt ✓ Die Jetzt-Karte steht wieder oben – mit dem Wichtigsten für den Moment."
        : "Erledigt ✓ Die Jetzt-Karte ist aus. Die Kacheln bleiben ohnehin immer so, wie du sie sortiert hast. Wieder an: Einstellungen → Startseite & Tageszeiten.",
      undo,
    };
  }

  // --- Timer ---
  const timer = parseTimerCommand(t);
  if (timer) {
    if (timer.kind === "start") {
      const started = startTimer({ minutes: timer.minutes, name: timer.name });
      if (!started) return { text: "Fünf Timer laufen schon – sobald einer fertig ist, geht der nächste." };
      // Ohne Timer-Kachel blendet startTimer sie ein – dann sagen, wo er steht
      const where = started.tileShown ? " Der Timer steht jetzt auf der Startseite." : "";
      return { text: `Läuft ⏱ ${started.timer.name} – ${durationLabel(started.timer.durationMs)}.${where}`, undo: pushUndo("den Timer", started.undo) };
    }
    if (timer.kind === "stop") {
      const stopped = stopTimerByName(timer.name);
      return { text: stopped ? `Gestoppt: ${stopped.name}.` : "Gerade läuft kein passender Timer." };
    }
    if (timer.kind === "stopwatch") {
      stopwatch(timer.action);
      return { text: timer.action === "start" ? "Stoppuhr läuft ⏱" : "Stoppuhr angehalten." };
    }
    const live = sortTimers(loadTimers().timers.filter((x) => !x.acked), nowMs);
    if (!live.length) return { text: "Gerade läuft kein Timer." };
    return { text: live.map((x) => (isExpired(x, nowMs) ? `${x.name} ist fertig.` : `${x.name}: ${leftWords(leftMs(x, nowMs))}${x.pausedLeft !== null ? " (pausiert)" : ""}.`)).join(" ") };
  }

  // --- Kochen ---
  if (COOK_START.test(t)) {
    const undo = pushUndo("„Ich koche jetzt“", startCooking());
    nudgePhase();
    const c = ctx.cooking;
    const cur = c ? currentStep(c.steps.length, loadCooking().steps[c.recipe] ?? []) : null;
    return { text: c ? `Los geht’s mit ${c.dish} 🍳${cur !== null ? ` Jetzt: ${c.steps[cur]}` : ""} Die Schritte stehen in der Essen-Kachel.` : "Los geht’s 🍳 Die Schritte stehen in der Essen-Kachel.", undo };
  }
  if ((NEXT_STEP.test(t) || WHAT_NOW.test(t)) && ctx.cooking?.steps.length) {
    const c = ctx.cooking;
    if (WHAT_NOW.test(t)) {
      const cur = currentStep(c.steps.length, loadCooking().steps[c.recipe] ?? []);
      return { text: cur === null ? "Alle Schritte sind fertig – guten Appetit!" : `Schritt ${cur + 1} von ${c.steps.length}: ${c.steps[cur]}` };
    }
    const step = nextStep(c.recipe, c.steps.length);
    if (step.done === null) return { text: "Alle Schritte sind fertig – guten Appetit!" };
    return { text: step.next === null ? "Abgehakt ✓ Das war der letzte Schritt – guten Appetit!" : `Abgehakt ✓ Jetzt Schritt ${step.next + 1}: ${c.steps[step.next]}`, undo: pushUndo("den Kochschritt", step.undo) };
  }

  // --- Sport ---
  const sport = parseSportCommand(t, ctx.today, ctx.others);
  if (sport) {
    const state = loadSport();
    const entries = loadEntries();
    if (sport.kind === "goal") {
      const undo = setSportGoal(sport.goal);
      const shown = showSportTile();
      return { text: `Wochenziel: ${sport.goal}× pro Woche ✓${shown ? " Die Sport-Kachel steht jetzt auf der Startseite." : ""}`, undo };
    }
    if (sport.kind === "add") {
      const minutes = sport.minutes ?? guessMinutes(sport.sport, sport.km);
      const data = { sport: sport.sport, minutes, date: sport.date, ...(sport.km ? { km: sport.km } : {}) };
      const { undo } = addTraining(data);
      const after = loadSport();
      const week = weekStatus(after, entries, ctx.today, ctx.me);
      const shown = showSportTile();
      const kind = sportById(sport.sport);
      const status = week.count > week.goal ? " Bonusrunde! 🔥" : week.count === week.goal ? " Wochenziel geschafft." : "";
      return { text: `Eingetragen ${kind.emoji} ${kind.label}, ${minutes} Min${sport.km ? `, ${sport.km} km` : ""}. ${praiseFor(after, entries, data, ctx.today, ctx.me)}${status}${shown ? " Die Sport-Kachel steht jetzt auf der Startseite." : ""}`, undo };
    }
    if (sport.kind === "stats") {
      const week = weekStatus(state, entries, ctx.today, ctx.me);
      const m = monthStats(state, entries, ctx.today, ctx.me);
      const streak = weekStreak(state, entries, ctx.today, ctx.me);
      if (sport.what === "monat" || sport.km)
        return { text: `${monthName(ctx.today)}: ${m.count} ${m.count === 1 ? "Einheit" : "Einheiten"}, ${hoursLabel(m.minutes)}${m.km ? `, ${m.km} km` : ""}.${streak >= 2 ? ` ${streak} Wochen in Folge geschafft 🔥` : ""}` };
      return { text: week.count ? `Diese Woche ${week.count}× – ${week.count >= week.goal ? (week.count > week.goal ? "Bonusrunde! 🔥" : "Wochenziel geschafft 🎉") : `Ziel sind ${week.goal}.`}` : "Diese Woche ist noch frisch – bereit, wenn du’s bist." };
    }
    // Trainings planen: freie Lücken, Wunsch-Tageszeit, Wetter (falls bekannt)
    const fc = loadForecast();
    const plan = planTrainings({
      entries,
      today: ctx.today,
      count: sport.count,
      part: sport.part,
      week: sport.week,
      me: ctx.me,
      rainAt: fc ? (date, hour) => {
        const h = fc.hours.find((x) => x.date === date && x.hour === hour);
        return h ? isRainy(h) : null;
      } : undefined,
    });
    if (!plan.slots.length) return { text: `Da finde ich gerade keine freie Lücke. ${plan.notes.join(" ")}`.trim() };
    const created: CalendarEntry[] = plan.slots.map((s) => createEntry("termin", { title: s.title, date: s.date, start: s.start, end: s.end, label: "Sport", reminder: "30" as const, ...(ctx.me ? { who: [ctx.me] } : {}) }) as CalendarEntry);
    const undo = pushUndo("die geplanten Trainings", changeEntries((list) => created.reduce((acc, e) => upsertEntry(acc, e), list)));
    const shown = showSportTile();
    const day = (iso: string) => WEEKDAYS_SHORT_MO[(new Date(`${iso}T12:00:00`).getDay() + 6) % 7];
    return {
      text: `Eingeplant ✓ ${plan.slots.map((s) => `${day(s.date)} ${s.start} ${s.title}`).join(", ")} – mit Erinnerung 30 Min vorher.${plan.notes.length ? ` ${plan.notes.join(". ")}.` : ""}${shown ? " Die Sport-Kachel steht jetzt auf der Startseite." : ""}`,
      undo,
    };
  }
  return null;
}
