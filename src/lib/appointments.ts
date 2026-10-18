// Termine des Tages auf der Heute-Karte (später Premium: Kalender-Anbindung).
// Vorerst gibt es keine Quelle – die Struktur steht, damit Termine dort
// erscheinen können, sobald es sie gibt.

export type Appointment = {
  id: string;
  /** "HH:MM" */
  time: string;
  title: string;
  /** Person aus dem Profil (für den Farbpunkt) */
  personId: string | null;
  /** Wer bringt/holt, z. B. "Lisa bringt" */
  who: string;
};

/** Termine an einem Tag ("YYYY-MM-DD") – noch ohne Kalender immer leer */
export function useAppointments(date: string | undefined): Appointment[] {
  void date;
  return [];
}

/** Farbpunkt je Person (nur als kleiner Punkt, Reihenfolge wie im Profil) */
const PERSON_DOTS = ["bg-accent", "bg-sky-500", "bg-emerald-500", "bg-violet-500", "bg-amber-400", "bg-pink-500"];

export function personDotClass(personId: string | null, persons: { id: string }[]): string {
  const index = personId ? persons.findIndex((p) => p.id === personId) : -1;
  return index < 0 ? "bg-stone-300" : PERSON_DOTS[index % PERSON_DOTS.length];
}
