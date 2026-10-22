// Mittagessen und Alter einer Person als kurze Texte bzw. Vorschläge – für
// die Personen-Felder im Profil und die Übersicht in den Einstellungen.

import type { KidAgeGroup, Person } from "@/lib/einstellungen/profile";

/** Kurzform fürs Mittagessen unter der Woche, z. B. für die Übersicht. */
export function lunchSummary(person: Person): string {
  const lunch = person.weekdayLunch ?? (person.role === "kind" ? "auswaerts" : "zuhause");
  if (lunch === "zuhause") return "zu Hause";
  if (lunch === "manchmal") return "manchmal zu Hause";
  return person.role === "kind" ? "in Kita/Schule" : "auswärts";
}

/** Vorschlag für die Altersgruppe, wenn ein Alter eingetragen wird. */
export function ageGroupForAge(age: number): KidAgeGroup {
  if (age < 3) return "kleinkind";
  if (age < 6) return "kitakind";
  return "schulkind";
}
