// Tagesphasen: Sie ändern nie die Kachel-Anordnung (die bleibt, wie sie
// gespeichert ist) – nur Inhalte: beim Kochen zeigt die Essen-Kachel die
// Schritte (Bildschirm bleibt an), im Feierabend mit "Ruhe nach Feierabend"
// machen Arbeit und Aufgaben Pause und Termine zeigen nur Familie, an freien
// Tagen ist Arbeit weg. Die Jetzt-Karte nimmt die Phase für ihre Themen.
//
// Phasen sind eine erweiterbare Liste (Name, Start-/Endbedingung als
// `active`, Inhalte als `view`) – weitere kommen ohne Umbau dazu. Vorrang bei
// Überschneidung über `rank`: Kochen > Sport > Feierabend > Morgen >
// Tagsüber. Rein (ohne Speicher), damit Startseite, Lotte und Tests gleich
// rechnen.

import { clockMinutes, type DayRoutine } from "@/lib/heute/tagesablauf";
import type { DayItem } from "@/lib/kalender/model";

export type PhaseId = "morgen" | "tagsueber" | "kochen" | "sport" | "feierabend";


export type PhaseContext = {
  /** Minuten seit Mitternacht (Europe/Berlin, ggf. Vorschau) */
  minutes: number;
  /** 0 = Mo … 6 = So */
  weekday: number;
  routine: DayRoutine;
  /** Heutiges Essen mit Uhrzeit ("HH:MM"), solange es nicht gegessen ist */
  mealClock: string | null;
  /** Kochen: von Hand gestartet (Minuten), läuft ein Timer, erster Timer-Start, Ende des letzten Timers */
  cooking: { manualAt: number | null; timerRunning: boolean; firstTimerAt: number | null; lastTimerEnd: number | null };
  /** Sport-Kachel aktiv und heutiges Training (Termin mit Etikett Sport) */
  sport: { on: boolean; training: { start: number; end: number; title: string } | null };
  /** Ende des letzten Arbeit-Termins heute (Minuten) */
  workEnd: number | null;
};

export type PhaseView = {
  /** Raum Arbeit ausblenden (Feierabend mit Ruhe, Nicht-Arbeitstag) */
  hideWork: boolean;
  /** Termine: nur Familie und nur, was heute noch kommt */
  familyUpcomingOnly?: boolean;
  /** Aufgaben machen Pause (Feierabend mit Ruhe) */
  tasksRest?: boolean;
  /** Wetter zeigt morgen */
  weatherTomorrow?: boolean;
  /** Essen-Kachel zeigt die Kochschritte, Bildschirm bleibt an */
  cooking?: boolean;
  wakeLock?: boolean;
};

export type PhaseDef = {
  id: PhaseId;
  label: string;
  /** Höher gewinnt bei Überschneidung */
  rank: number;
  active: (ctx: PhaseContext) => boolean;
  view: (ctx: PhaseContext) => PhaseView;
};

/** Ist heute ein Arbeitstag? */
const isWorkday = (ctx: Pick<PhaseContext, "weekday" | "routine">) => ctx.routine.arbeitstage.includes(ctx.weekday);

// --- Kochen ---------------------------------------------------------------------------

const MEAL_AFTER = 45;
const TIMER_AFTER = 15;
/** Von Hand gestartet, ohne Timer: so lange bleibt das Kochen */
const MANUAL_MAX = 60;

/** Wann das Kochen begann bzw. beginnt (null = kein Kochen) */
function cookingStart(ctx: PhaseContext): number | null {
  const starts: number[] = [];
  const { cooking, mealClock, routine, minutes } = ctx;
  if (cooking.timerRunning && cooking.firstTimerAt !== null) starts.push(cooking.firstTimerAt);
  // Nach dem letzten Timer noch 15 Minuten
  if (!cooking.timerRunning && cooking.lastTimerEnd !== null && cooking.firstTimerAt !== null && minutes < cooking.lastTimerEnd + TIMER_AFTER && minutes >= cooking.firstTimerAt) starts.push(cooking.firstTimerAt);
  if (cooking.manualAt !== null && minutes >= cooking.manualAt) {
    const until = Math.max(cooking.manualAt + MANUAL_MAX, cooking.lastTimerEnd !== null ? cooking.lastTimerEnd + TIMER_AFTER : 0, cooking.timerRunning ? minutes + 1 : 0, mealClock ? clockMinutes(mealClock) + MEAL_AFTER : 0);
    if (minutes < until) starts.push(cooking.manualAt);
  }
  if (routine.kochenAuto && mealClock) {
    const meal = clockMinutes(mealClock);
    if (minutes >= meal - routine.kochenMin && minutes < meal + MEAL_AFTER) starts.push(meal - routine.kochenMin);
  }
  return starts.length ? Math.min(...starts) : null;
}

// --- Feierabend -----------------------------------------------------------------------

/** Ab wann Feierabend ist: Einstellung, aber frühestens nach dem letzten Arbeit-Termin */
export function eveningStart(ctx: Pick<PhaseContext, "routine" | "workEnd">): number {
  const base = clockMinutes(ctx.routine.feierabendAb);
  return ctx.routine.nachArbeit && ctx.workEnd !== null ? Math.max(base, ctx.workEnd) : base;
}

const MORNING_FROM = 5 * 60;

type ArbeitCtx = Pick<PhaseContext, "minutes" | "weekday" | "routine" | "workEnd">;

/** Feierabend nach Uhr: ab „Feierabend ab“ (frühestens nach dem letzten Arbeit-Termin) bis 5 Uhr */
export const istFeierabend = (ctx: Pick<PhaseContext, "minutes" | "routine" | "workEnd">) => ctx.minutes < MORNING_FROM || ctx.minutes >= eveningStart(ctx);

/**
 * Ruht die Arbeit? An freien Tagen immer, sonst im Feierabend mit „Ruhe nach
 * Feierabend“ – morgens (Phase Morgens) ist sie wieder da. EINE Regel für
 * Startseite, Aufgaben-Seite und Kachel (Tafel 103/104).
 */
export const arbeitRuht = (ctx: ArbeitCtx) => !isWorkday(ctx) || (ctx.routine.ruhe && istFeierabend(ctx));

/** Ende des letzten Arbeit-Termins (Minuten; ohne Ende zählt 1 Stunde) – null ohne */
export function arbeitsEnde(items: Pick<DayItem, "entry" | "room" | "time" | "end">[]): number | null {
  const work = items.filter((i) => i.entry.typ === "termin" && i.room === "arbeit" && i.time);
  return work.length ? Math.max(...work.map((i) => (i.end ? clockMinutes(i.end) : clockMinutes(i.time!) + 60))) : null;
}

export const PHASES: PhaseDef[] = [
  {
    id: "kochen",
    label: "Kochen",
    rank: 50,
    active: (ctx) => cookingStart(ctx) !== null,
    view: (ctx) => ({ hideWork: arbeitRuht(ctx), cooking: true, wakeLock: true }),
  },
  {
    id: "sport",
    label: "Sport",
    rank: 40,
    active: (ctx) => Boolean(ctx.sport.on && ctx.sport.training && ctx.minutes >= ctx.sport.training.start - 60 && ctx.minutes < ctx.sport.training.end),
    view: (ctx) => ({ hideWork: arbeitRuht(ctx) }),
  },
  {
    id: "feierabend",
    label: "Feierabend",
    rank: 30,
    active: istFeierabend,
    // Mit "Ruhe nach Feierabend": Arbeit und Aufgaben machen Pause, Termine nur Familie; Wetter zeigt morgen
    view: (ctx) => ({ hideWork: arbeitRuht(ctx), familyUpcomingOnly: ctx.routine.ruhe, tasksRest: ctx.routine.ruhe, weatherTomorrow: true }),
  },
  {
    id: "morgen",
    label: "Morgens",
    rank: 20,
    active: (ctx) => ctx.minutes >= MORNING_FROM && ctx.minutes < clockMinutes(ctx.routine.morgenBis),
    view: (ctx) => ({ hideWork: !isWorkday(ctx) }),
  },
  {
    id: "tagsueber",
    label: "Tagsüber",
    rank: 10,
    active: () => true,
    view: (ctx) => ({ hideWork: !isWorkday(ctx) }),
  },
];

/** Die Phase, die gerade gilt (höchster Vorrang unter den aktiven) */
export function currentPhase(ctx: PhaseContext, phases: PhaseDef[] = PHASES): { def: PhaseDef; view: PhaseView } {
  const def = [...phases].sort((a, b) => b.rank - a.rank).find((p) => p.active(ctx)) ?? phases[phases.length - 1];
  return { def, view: def.view(ctx) };
}
