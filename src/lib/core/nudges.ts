// "Der Küchenhelfer nervt nie": Gedächtnis für Hinweise und Regeln für Push.
//
// Jede Art von Hinweis (Bewertung, Einkauf für morgen, Tipp …) merkt sich,
// wann sie gezeigt und ob darauf reagiert wurde. Bleibt sie 3× hintereinander
// unbeantwortet (oder wird weggeklickt), pausiert sie 2 Wochen.
// Push gibt es noch nicht – `pushAllowed()` legt die Regeln schon fest:
// höchstens 1 proaktive Mitteilung pro Tag, Ruhezeit 20:00–7:00.

import { useExternalStore } from "./useExternalStore";
import { noteProactiveAnswered, noteProactiveShown } from "./activity";
import { createLocalStore } from "./localStore";
import { helperMessage, type HouseholdProfile } from "../einstellungen/profile";
import { addDays } from "../essen/weekPlan";

export type NudgeKind =
  | "bewertung"
  | "einkauf-morgen"
  | "startzeit"
  | "auftauen"
  | "einweichen"
  | "vorrat"
  | "reste"
  | "wochenplanung"
  | "lob"
  | "tipp"
  | "pause"
  | "wochenende"
  | "grill";

export const IGNORE_LIMIT = 3;
export const PAUSE_DAYS = 14;

type KindState = {
  /** Zuletzt gezeigt am "YYYY-MM-DD" */
  lastShown?: string;
  /** Auf das zuletzt Gezeigte reagiert? */
  answered?: boolean;
  /** Unbeantwortet in Folge */
  ignored: number;
  /** Pausiert bis einschließlich "YYYY-MM-DD" */
  pausedUntil?: string;
};

type NudgeStore = { version: 1; kinds: Partial<Record<NudgeKind, KindState>>; pushes: string[] };

function migrate(raw: unknown): NudgeStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<NudgeStore>;
  if (d.version !== 1) return null;
  return { version: 1, kinds: d.kinds && typeof d.kinds === "object" ? d.kinds : {}, pushes: Array.isArray(d.pushes) ? d.pushes : [] };
}

const store = createLocalStore("wasgibts.hinweise", migrate);
const EMPTY: NudgeStore = { version: 1, kinds: {}, pushes: [] };

export function useNudges(): NudgeStore | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? EMPTY);
}

/** Zustand einer Art, mit einem offenen Ignorieren von einem früheren Tag eingerechnet */
function effective(state: KindState | undefined, today: string): KindState {
  const s: KindState = { ignored: 0, ...state };
  if (s.lastShown && s.lastShown < today && !s.answered) {
    s.ignored += 1;
    s.answered = true;
    if (s.ignored >= IGNORE_LIMIT) {
      s.pausedUntil = addDays(s.lastShown, PAUSE_DAYS);
      s.ignored = 0;
    }
  }
  return s;
}

/** Ist diese Art gerade pausiert? */
export function isPaused(data: NudgeStore, kind: NudgeKind, today: string): boolean {
  const s = effective(data.kinds[kind], today);
  return Boolean(s.pausedUntil && s.pausedUntil >= today);
}

function update(kind: NudgeKind, today: string, change: (s: KindState) => KindState) {
  const data = store.load() ?? EMPTY;
  store.save({ ...data, kinds: { ...data.kinds, [kind]: change(effective(data.kinds[kind], today)) } });
}

/** Gezeigt (einmal pro Tag zählt) */
export function noteShown(kind: NudgeKind, today: string) {
  noteProactiveShown(today);
  const current = (store.load() ?? EMPTY).kinds[kind];
  if (current?.lastShown === today) return;
  update(kind, today, (s) => ({ ...s, lastShown: today, answered: false }));
}

/** Darauf reagiert → Zähler zurück */
export function noteAnswered(kind: NudgeKind, today: string) {
  noteProactiveAnswered(today);
  update(kind, today, (s) => ({ ...s, lastShown: today, answered: true, ignored: 0 }));
}

/** Weggeklickt (✕, "Später") → zählt wie Ignorieren */
export function noteDismissed(kind: NudgeKind, today: string) {
  noteProactiveAnswered(today);
  update(kind, today, (s) => {
    const ignored = s.ignored + 1;
    return ignored >= IGNORE_LIMIT
      ? { lastShown: today, answered: true, ignored: 0, pausedUntil: addDays(today, PAUSE_DAYS) }
      : { ...s, lastShown: today, answered: true, ignored };
  });
}

// --- Push (vorbereitet) ---------------------------------------------------------

export const QUIET_FROM = 20;
export const QUIET_UNTIL = 7;
export const MAX_PROACTIVE_PER_DAY = 1;

/**
 * Darf jetzt eine proaktive Mitteilung raus? Nicht in der Ruhezeit
 * (20:00–7:00), höchstens eine pro Tag, nie in der Pause, nach "leiser
 * werden" oder am freien Wochenende. Selbst eingestellte Erinnerungen
 * zählen nicht und laufen nicht hierüber.
 */
export function pushAllowed(
  now: Date,
  sentToday: number,
  context?: { paused?: boolean; quiet?: boolean; weekendFree?: boolean },
): boolean {
  // Pause, "leiser werden" und freies Wochenende: gar keine proaktiven Mitteilungen
  if (context?.paused || context?.quiet || context?.weekendFree) return false;
  const h = now.getHours();
  if (h >= QUIET_FROM || h < QUIET_UNTIL) return false;
  return sentToday < MAX_PROACTIVE_PER_DAY;
}

/** Text der Bewertungs-Mitteilung: "Lotte: Wie war Shakshuka? 👍 👎" */
export function ratingPushText(profile: Pick<HouseholdProfile, "helper">, title: string): string {
  return helperMessage(profile, `Wie war ${title}? 👍 👎`);
}

/** Zeitpunkt für "Wie war …?": 1 Stunde nach dem Essen, sonst (Ruhezeit) gar nicht */
export function ratingPushTime(date: string, mealClock: string): Date | null {
  const [h, m] = mealClock.split(":").map(Number);
  const at = new Date(`${date}T00:00:00`);
  at.setHours(h + 1, m, 0, 0);
  return pushAllowed(at, 0) ? at : null;
}
