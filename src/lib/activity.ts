// Ohne Druck: Wann war die App zuletzt offen, wann hat jemand selbst etwas
// getan? Daraus: einmaliges "Willkommen zurück" nach 3+ Tagen und "leiser
// werden" – bleiben proaktive Nachrichten an 3 Tagen unbeachtet, schweigt der
// Helfer, bis wieder jemand selbst etwas tut. Dazu einmalige Angebote
// (z. B. "Wochenende frei?"), die nie wiederholt werden.

import { useExternalStore } from "./useExternalStore";
import { createLocalStore } from "./localStore";

type ActivityStore = {
  version: 1;
  /** Zuletzt geöffnet "YYYY-MM-DD" */
  lastOpen?: string;
  /** Seit wann die App genutzt wird (erstes Öffnen, für "3 Wochen kaum geplant") */
  since?: string;
  /** Willkommen zurück fällig an diesem Tag (bis beantwortet) */
  welcomeDue?: string | null;
  /** Zuletzt selbst etwas getan */
  lastAction?: string;
  /** Tage mit proaktiver Nachricht: true = beachtet */
  proactive: Record<string, boolean>;
  /** Einmalige Angebote/Hinweise, die schon kamen */
  asked: Record<string, true>;
};

export const AWAY_DAYS = 3;
export const QUIET_AFTER = 3;

function migrate(raw: unknown): ActivityStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<ActivityStore>;
  if (d.version !== 1) return null;
  return {
    version: 1,
    lastOpen: typeof d.lastOpen === "string" ? d.lastOpen : undefined,
    since: typeof d.since === "string" ? d.since : undefined,
    welcomeDue: typeof d.welcomeDue === "string" ? d.welcomeDue : null,
    lastAction: typeof d.lastAction === "string" ? d.lastAction : undefined,
    proactive: d.proactive && typeof d.proactive === "object" ? d.proactive : {},
    asked: d.asked && typeof d.asked === "object" ? d.asked : {},
  };
}

const store = createLocalStore("wasgibts.aktivitaet", migrate);
const EMPTY: ActivityStore = { version: 1, proactive: {}, asked: {} };

export type Activity = ActivityStore;

export function useActivity(): ActivityStore | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? EMPTY);
}

function update(change: (a: ActivityStore) => ActivityStore) {
  store.save(change(store.load() ?? EMPTY));
}

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** Beim Öffnen der App: nach 3+ Tagen einmal "Willkommen zurück" */
export function recordOpen(today: string) {
  const a = store.load() ?? EMPTY;
  if (a.lastOpen === today) return;
  const away = a.lastOpen ? days(a.lastOpen, today) : 0;
  store.save({ ...a, lastOpen: today, since: a.since ?? today, welcomeDue: away >= AWAY_DAYS ? today : (a.welcomeDue ?? null) });
}

export function welcomeDue(a: ActivityStore, today: string): boolean {
  return a.welcomeDue === today;
}

export function dismissWelcome(today: string) {
  update((a) => ({ ...a, welcomeDue: null, lastAction: today }));
}

/** Jemand hat selbst etwas getan → Helfer darf wieder proaktiv sein */
export function noteUserAction(today: string) {
  const a = store.load() ?? EMPTY;
  if (a.lastAction === today) return;
  store.save({ ...a, lastAction: today });
}

/** Eine proaktive Nachricht wurde heute gezeigt */
export function noteProactiveShown(today: string) {
  const a = store.load() ?? EMPTY;
  if (today in a.proactive) return;
  store.save({ ...a, proactive: { ...a.proactive, [today]: false } });
}

/** … und beachtet */
export function noteProactiveAnswered(today: string) {
  update((a) => ({ ...a, proactive: { ...a.proactive, [today]: true }, lastAction: today }));
}

/**
 * Leiser werden: an 3 Tagen (seit dem letzten eigenen Tun) unbeachtet →
 * keine proaktiven Nachrichten mehr, bis wieder jemand selbst etwas tut.
 */
export function isQuiet(a: ActivityStore, today: string): boolean {
  const since = a.lastAction ?? "";
  const ignored = Object.entries(a.proactive).filter(([d, seen]) => !seen && d < today && d > since);
  return ignored.length >= QUIET_AFTER;
}

/** Einmaliges Angebot schon gezeigt? */
export function wasAsked(a: ActivityStore, key: string): boolean {
  return Boolean(a.asked[key]);
}

export function markAsked(key: string) {
  update((a) => ({ ...a, asked: { ...a.asked, [key]: true } }));
}

/** Heute als "YYYY-MM-DD" (lokale Zeit) */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
