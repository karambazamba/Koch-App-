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
