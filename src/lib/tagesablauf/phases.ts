// Tagesphasen (nur bei "Mitdenkend"): Die gespeicherte Kachel-Sortierung
// bleibt die Grundlage. Eine Phase schiebt Passendes nach oben, klappt
// Unpassendes zu einer Zeile zusammen oder blendet es aus – sie löscht nie
// etwas und ändert die gespeicherte Sortierung nicht.
//
// Phasen sind eine erweiterbare Liste (Name, Start-/Endbedingung als
// `active`, Vorrang-Kacheln, zusammenklappen, ausblenden, Schild, Lotte-Satz)
// – weitere (z. B. Wochenende) kommen ohne Umbau dazu. Vorrang bei
// Überschneidung über `rank`: Kochen > Sport > Feierabend > Morgen >
// Tagsüber. Rein (ohne Speicher), damit Startseite, Lotte und Tests gleich
// rechnen.

import type { HomeTile, HomeTileId, TileSize } from "../core/homeLayout";
import { clockMinutes, minutesClock, type DayRoutine } from "./settings";

export type PhaseId = "morgen" | "tagsueber" | "kochen" | "sport" | "feierabend";

export type PhaseTone = "morgen" | "kochen" | "sport" | "feierabend";

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
  /** Neues auf der Pinnwand */
  pinNew: boolean;
};

/** Eine Kachel, die eine Phase nach oben holt (optional in anderer Größe; `force` = auch wenn sie sonst nicht auf der Startseite ist) */
export type TopTile = { id: HomeTileId; size?: TileSize; force?: boolean };

export type PhaseView = {
  /** Schild unter dem Datum (Tagsüber: keins) */
  badge: { emoji: string; label: string; detail: string; tone: PhaseTone } | null;
  /** Kurze Erklärung beim Antippen des Schilds */
  explain: string;
  top: TopTile[];
  /** Zu einer Zeile zusammengeklappt ("Heute noch: …") */
  collapse: HomeTileId[];
  hide: HomeTileId[];
  /** Raum Arbeit ausblenden (Feierabend, Nicht-Arbeitstag) */
  hideWork: boolean;
  /** Termine: nur Familie und nur, was heute noch kommt */
  familyUpcomingOnly?: boolean;
  /** Wetter zeigt morgen */
  weatherTomorrow?: boolean;
  /** Bildschirm anlassen (Kochen) */
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

const clockLabel = (m: number) => minutesClock(m).replace(/^0(\d)/, "$1");
const hourLabel = (m: number) => (m % 60 ? clockLabel(m) : `${Math.floor(m / 60)} Uhr`);

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

export const PHASES: PhaseDef[] = [
  {
    id: "kochen",
    label: "Kochen",
    rank: 50,
    active: (ctx) => cookingStart(ctx) !== null,
    view: (ctx) => ({
      badge: { emoji: "🍳", label: "Kochen", detail: `seit ${clockLabel(cookingStart(ctx) ?? ctx.minutes)}`, tone: "kochen" },
      explain: "Beim Kochen steht das Essen mit den Schritten oben, darunter die Timer. Einkauf und Wetter machen kurz Pause, der Rest wartet in einer Zeile.",
      top: [{ id: "essen", size: "L" }, { id: "timer", size: "M", force: true }],
      collapse: ["termine", "aufgaben", "pinnwand"],
      hide: ["einkauf", "wetter"],
      hideWork: !isWorkday(ctx),
      wakeLock: true,
    }),
  },
  {
    id: "sport",
    label: "Sport",
    rank: 40,
    active: (ctx) => Boolean(ctx.sport.on && ctx.sport.training && ctx.minutes >= ctx.sport.training.start - 60 && ctx.minutes < ctx.sport.training.end),
    view: (ctx) => ({
      badge: { emoji: "🏃", label: "Sport", detail: `heute ${clockLabel(ctx.sport.training?.start ?? ctx.minutes)}`, tone: "sport" },
      explain: "Eine Stunde vor dem Training steht Sport oben – mit Packliste und Wetter.",
      top: [{ id: "sport", size: "M" }],
      collapse: [],
      hide: [],
      hideWork: !isWorkday(ctx),
    }),
  },
  {
    id: "feierabend",
    label: "Feierabend",
    rank: 30,
    active: (ctx) => ctx.minutes < MORNING_FROM || ctx.minutes >= eveningStart(ctx),
    view: (ctx) => ({
      badge: { emoji: "🌙", label: "Feierabend", detail: `ab ${hourLabel(ctx.minutes < MORNING_FROM ? clockMinutes(ctx.routine.feierabendAb) : eveningStart(ctx))}`, tone: "feierabend" },
      explain: "Im Feierabend zeige ich nur Familie und Freizeit. Arbeit, Termine und Aufgaben machen Pause bis morgen früh.",
      top: [{ id: "pinnwand" }, { id: "termine" }, { id: "wetter", size: "S" }, { id: "notizen" }],
      collapse: [],
      // Nachts (bis 5 Uhr) auch keine Termine des neuen Tages
      hide: ["aufgaben", "einkauf", "morgen", "essen", "vorrat", "post", "sport", "timer", ...(ctx.minutes < MORNING_FROM ? (["termine"] as HomeTileId[]) : [])],
      hideWork: true,
      familyUpcomingOnly: true,
      weatherTomorrow: true,
    }),
  },
  {
    id: "morgen",
    label: "Morgens",
    rank: 20,
    active: (ctx) => ctx.minutes >= MORNING_FROM && ctx.minutes < clockMinutes(ctx.routine.morgenBis),
    view: (ctx) => ({
      badge: { emoji: "☀️", label: "Morgens", detail: "Überblick für den Tag", tone: "morgen" },
      explain: "Morgens stehen oben Pinnwand, Wetter, Termine und Aufgaben – der Überblick für den Tag.",
      // Pinnwand nur bei Neuem; Pinnwand + Wetter dann klein nebeneinander
      top: ctx.pinNew ? [{ id: "pinnwand", size: "S" }, { id: "wetter", size: "S" }, { id: "termine" }, { id: "aufgaben" }] : [{ id: "wetter" }, { id: "termine" }, { id: "aufgaben" }],
      collapse: [],
      hide: [],
      hideWork: !isWorkday(ctx),
    }),
  },
  {
    id: "tagsueber",
    label: "Tagsüber",
    rank: 10,
    active: () => true,
    view: (ctx) => ({ badge: null, explain: "", top: [], collapse: [], hide: [], hideWork: !isWorkday(ctx) }),
  },
];

/** Die Phase, die gerade gilt (höchster Vorrang unter den aktiven) */
export function currentPhase(ctx: PhaseContext, phases: PhaseDef[] = PHASES): { def: PhaseDef; view: PhaseView } {
  const def = [...phases].sort((a, b) => b.rank - a.rank).find((p) => p.active(ctx)) ?? phases[phases.length - 1];
  return { def, view: def.view(ctx) };
}

/** "Immer gleich": keine Phase, nur Arbeit an freien Tagen bleibt sichtbar wie gespeichert */
export const STEADY_VIEW: PhaseView = { badge: null, explain: "", top: [], collapse: [], hide: [], hideWork: false };

/**
 * Kacheln für die Anzeige: Vorrang-Kacheln nach oben (in Phasen-Reihenfolge,
 * ggf. andere Größe), Rest in der gespeicherten Reihenfolge; Ausgeblendetes
 * fällt weg, Zusammengeklapptes kommt in `collapsed`. `available` = Kacheln,
 * die eine Phase erzwingen darf (`force`), auch wenn sie nicht sichtbar sind.
 * `extraTop` (z. B. ein laufender Timer) steht direkt nach den Vorrang-Kacheln
 * bzw. ganz oben, wenn die Phase nichts nach oben holt.
 */
export function arrangeHome(visible: HomeTile[], view: PhaseView, opts: { available?: HomeTile[]; skip?: HomeTileId[]; extraTop?: TopTile[] } = {}): { tiles: HomeTile[]; collapsed: HomeTile[] } {
  const skip = new Set(opts.skip ?? []);
  const byId = new Map(visible.map((t) => [t.id, t]));
  const top: HomeTile[] = [];
  const used = new Set<HomeTileId>();
  const hidden = new Set(view.hide);
  const take = (want: TopTile, extra = false) => {
    if (used.has(want.id) || skip.has(want.id) || (!extra && hidden.has(want.id))) return;
    const tile = byId.get(want.id) ?? (want.force ? opts.available?.find((t) => t.id === want.id) : undefined);
    if (!tile) return;
    used.add(want.id);
    top.push({ ...tile, visible: true, size: want.size ?? tile.size });
  };
  view.top.forEach((t) => take(t));
  // Ein laufender Timer steht immer da, auch wenn die Phase Timer sonst ausblendet
  (opts.extraTop ?? []).forEach((t) => take(t, true));
  const hide = new Set(view.hide);
  const collapse = new Set(view.collapse);
  const rest: HomeTile[] = [];
  const collapsed: HomeTile[] = [];
  for (const t of visible) {
    if (used.has(t.id) || skip.has(t.id)) continue;
    if (hide.has(t.id)) continue;
    if (collapse.has(t.id)) collapsed.push(t);
    else rest.push(t);
  }
  return { tiles: [...top, ...rest], collapsed };
}
