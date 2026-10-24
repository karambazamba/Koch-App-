// Mitteilungen (Tafel 77): Standard-Erinnerung für neue Termine, Schalter je
// Art, und wann Mia nach Mitteilungen fragt. `wasgibts.mitteilungen` v1 (pro
// Gerät, nicht in der Sicherung – die Erlaubnis gehört zum Gerät).
// Fragen: NIE beim ersten Start; nur im passenden Moment (erster Termin mit
// Uhrzeit, erste Pinnwand-Nachricht); eigene Frage VOR der Systemabfrage;
// nach „Lieber nicht“ höchstens noch einmal nach 14 Tagen.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { REMINDERS, type Reminder } from "@/lib/kalender/model";

export type NotifyKind = "erinnerungen" | "pinnwand" | "abgeben" | "einkauf" | "morgen";

export const NOTIFY_KINDS: { id: NotifyKind; title: string; hint: string }[] = [
  { id: "erinnerungen", title: "Erinnerungen", hint: "An Terminen und Aufgaben mit Uhrzeit" },
  { id: "pinnwand", title: "Pinnwand", hint: "Wenn jemand etwas an die Pinnwand hängt" },
  { id: "abgeben", title: "Abgeben", hint: "Wenn dir jemand eine Aufgabe gibt" },
  { id: "einkauf", title: "Einkauf unterwegs", hint: "Wenn jemand gleich im Laden ist" },
  { id: "morgen", title: "Morgen-Überblick", hint: "Kurz, was der Tag bringt" },
];

export type NotifySettings = {
  version: 1;
  defaultReminder: Reminder;
  kinds: Record<NotifyKind, boolean>;
  /** Mias Frage: „ja“/„nein“ und wann zuletzt gefragt */
  answer: "ja" | "nein" | null;
  askedAt: string | null;
  asks: number;
  /** Schon gemeldete Erinnerungen ("<key>#<tag>"), damit nichts doppelt kommt */
  sent: string[];
};

export const DEFAULT_NOTIFY: NotifySettings = {
  version: 1,
  defaultReminder: "30",
  kinds: { erinnerungen: true, pinnwand: true, abgeben: true, einkauf: true, morgen: false },
  answer: null,
  askedAt: null,
  asks: 0,
  sent: [],
};

export function migrateNotify(raw: unknown): NotifySettings | null {
  if (!raw || typeof raw !== "object" || (raw as NotifySettings).version !== 1) return null;
  const r = raw as Partial<NotifySettings>;
  const kinds = (r.kinds ?? {}) as Partial<Record<NotifyKind, unknown>>;
  return {
    version: 1,
    defaultReminder: REMINDERS.some((x) => x.value === r.defaultReminder) ? (r.defaultReminder as Reminder) : "30",
    kinds: Object.fromEntries(NOTIFY_KINDS.map((k) => [k.id, typeof kinds[k.id] === "boolean" ? kinds[k.id] : DEFAULT_NOTIFY.kinds[k.id]])) as Record<NotifyKind, boolean>,
    answer: r.answer === "ja" || r.answer === "nein" ? r.answer : null,
    askedAt: typeof r.askedAt === "string" ? r.askedAt : null,
    asks: Number(r.asks) || 0,
    sent: Array.isArray(r.sent) ? r.sent.filter((s): s is string => typeof s === "string").slice(-200) : [],
  };
}

/** Was das Gerät kann: erlaubt, abgelehnt, noch offen, oder gar nicht (iPhone im Safari-Tab, alter Browser) */
export type Permission = "granted" | "denied" | "default" | "unsupported";

const STATUS: Record<Permission, string> = {
  granted: "An",
  default: "Noch nicht erlaubt",
  denied: "Aus (im Gerät)",
  unsupported: "Hier nicht möglich",
};

/** Kurzer Status (Einstellungen, rechts) */
export const notifyStatusLabel = (p: Permission | null) => (p ? STATUS[p] : undefined);

export type AskMoment = "erster-termin" | "pinnwand";

/** Was jetzt passiert: Mias Frage, die Homescreen-Anleitung oder nichts */
export function askDecision(s: NotifySettings, permission: Permission, opts: { today: string; iosTab: boolean; demo: boolean; firstStart: boolean }): "frage" | "homescreen" | null {
  if (opts.demo || opts.firstStart || permission === "granted" || permission === "denied") return null;
  if (s.answer === "ja" && permission !== "unsupported") return null;
  if (s.answer === "nein") {
    if (s.asks >= 2 || !s.askedAt) return null;
    const days = (Date.parse(opts.today) - Date.parse(s.askedAt.slice(0, 10))) / 86_400_000;
    if (days < 14) return null;
  }
  if (permission === "unsupported") return opts.iosTab && s.answer !== "ja" ? "homescreen" : null;
  return "frage";
}

/** Die eigene Frage im passenden Moment */
export function askText(moment: AskMoment, reminder: Reminder): { title: string; text: string } {
  const lead = REMINDERS.find((r) => r.value === reminder)?.label ?? "30 Minuten vorher";
  return moment === "pinnwand"
    ? { title: "Soll ich Bescheid sagen?", text: "Wenn jemand etwas an die Pinnwand hängt, sag ich kurz Bescheid." }
    : { title: "Soll ich dich erinnern?", text: reminder === "aus" ? "Ich sag kurz vorher Bescheid." : `${lead.replace(/^\w/, (c) => c.toUpperCase())} sag ich kurz Bescheid.` };
}

const store = createLocalStore("wasgibts.mitteilungen", migrateNotify);

export const loadNotify = (): NotifySettings => store.load() ?? DEFAULT_NOTIFY;
export function changeNotify(change: (s: NotifySettings) => NotifySettings) {
  store.save(change(loadNotify()));
}
export function useNotify(): NotifySettings | undefined {
  const s = useExternalStore(store.subscribe, store.load, () => undefined);
  return s === undefined ? undefined : (s ?? DEFAULT_NOTIFY);
}
