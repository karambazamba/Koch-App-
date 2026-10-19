// Termine des Tages für die alte Heute-Karte (HeroCard, nur mit "Alte
// Funktionen anzeigen"). Quelle sind jetzt die Termine im neuen Modell
// (aufgaben/, `wasgibts.eintraege`); die alten Termine aus `wasgibts.termine`
// wurden dorthin übernommen.

import { itemsForDay } from "../aufgaben/model";
import { useEntries } from "../aufgaben/store";
import { todayIso } from "./now";

export type Appointment = {
  id: string;
  /** "HH:MM" */
  time: string;
  /** true = "bis 17:30", sonst Beginn */
  until?: boolean;
  title: string;
  /** Person aus dem Profil (für den Farbpunkt) */
  personId: string | null;
  who: string;
};

const EMPTY: Appointment[] = [];

/** Termine an einem Tag ("YYYY-MM-DD"), nach Uhrzeit */
export function useAppointments(date: string | undefined): Appointment[] {
  const entries = useEntries();
  if (!date || !entries) return EMPTY;
  return itemsForDay(entries, date, todayIso())
    .filter((i) => i.entry.typ === "termin" && !i.done)
    .map((i) => ({ id: i.key, time: i.time ?? "", title: i.title, personId: i.entry.typ === "termin" ? (i.entry.data.who?.[0] ?? null) : null, who: "" }));
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
