// Termine des Tages auf der Heute-Karte (später Premium: Kalender-Anbindung).
// Quelle vorerst: per Gespräch notierte Termine ("Jonne hat Dienstag bis 17:30
// Turnen"), gespeichert unter `wasgibts.termine`. Vergangene verschwinden leise.

import { createLocalStore } from "./localStore";
import { useExternalStore } from "./useExternalStore";

export type Appointment = {
  id: string;
  /** "HH:MM" */
  time: string;
  /** true = "bis 17:30" (z. B. Turnen bis 17:30), sonst Beginn */
  until?: boolean;
  title: string;
  /** Person aus dem Profil (für den Farbpunkt) */
  personId: string | null;
  /** Wer bringt/holt, z. B. "Lisa bringt" */
  who: string;
};

/** Gespeicherter Termin mit Tag */
export type StoredAppointment = Appointment & { date: string };

type AppointmentStore = { version: 1; items: StoredAppointment[] };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function migrate(raw: unknown): AppointmentStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<AppointmentStore>;
  if (d.version !== 1 || !Array.isArray(d.items)) return null;
  return {
    version: 1,
    items: d.items
      .filter((a): a is StoredAppointment => Boolean(a) && typeof a.id === "string" && typeof a.title === "string" && DATE.test(String(a.date)))
      .map((a) => ({
        id: a.id,
        date: a.date,
        time: TIME.test(String(a.time)) ? a.time : "",
        until: a.until === true || undefined,
        title: a.title,
        personId: typeof a.personId === "string" ? a.personId : null,
        who: typeof a.who === "string" ? a.who : "",
      })),
  };
}

const store = createLocalStore("wasgibts.termine", migrate);
const EMPTY: StoredAppointment[] = [];

export function loadAppointments(): StoredAppointment[] {
  return store.load()?.items ?? EMPTY;
}

/** Alle Termine ersetzen (Übernehmen/Rückgängig); Vergangenes vor `today` fällt weg */
export function replaceAppointments(items: StoredAppointment[], today?: string) {
  store.save({ version: 1, items: today ? items.filter((a) => a.date >= today) : items });
}

const byTime = (a: Appointment, b: Appointment) => (a.time || "99").localeCompare(b.time || "99");

/** Termine an einem Tag ("YYYY-MM-DD"), nach Uhrzeit */
export function useAppointments(date: string | undefined): Appointment[] {
  const data = useExternalStore(store.subscribe, store.load, () => null);
  if (!date || !data) return EMPTY;
  return data.items.filter((a) => a.date === date).sort(byTime);
}

/** "bis 17:30" bzw. "17:30" */
export function appointmentTime(a: Pick<Appointment, "time" | "until">): string {
  return a.time ? `${a.until ? "bis " : ""}${a.time}` : "";
}

/** Farbpunkt je Person (nur als kleiner Punkt, Reihenfolge wie im Profil) */
const PERSON_DOTS = ["bg-accent", "bg-sky-500", "bg-emerald-500", "bg-violet-500", "bg-amber-400", "bg-pink-500"];

export function personDotClass(personId: string | null, persons: { id: string }[]): string {
  const index = personId ? persons.findIndex((p) => p.id === personId) : -1;
  return index < 0 ? "bg-stone-300" : PERSON_DOTS[index % PERSON_DOTS.length];
}
