// Mia denkt mit: Regeln für alles Ungefragte (rein). Höchstens EIN
// ungefragter Hinweis pro Tag, „Gesprächig“ bis zwei; nie 22–7 Uhr, nie im
// Pause- oder Ruhemodus; „Ruhig“ = nur Muster-Fragen, keine Vorstellungen.
// Jede Frage nur einmal. Einen „Spruch des Tages“ gibt es seit A-054 nicht
// mehr (die Jetzt-Karte zeigt nur, was man heute braucht).

export type Gespraechig = "ruhig" | "normal" | "gespraechig";

export const GESPRAECHIG: { value: Gespraechig; label: string; detail: string }[] = [
  { value: "ruhig", label: "Ruhig", detail: "Nur Fragen zu Gewohnheiten" },
  { value: "normal", label: "Normal", detail: "Ein Hinweis am Tag" },
  { value: "gespraechig", label: "Gesprächig", detail: "Bis zu zwei Hinweise am Tag" },
];

export type HinweisArt = "vorstellen" | "muster" | "mitdenken";

export type Lage = { hour: number; pause: boolean; ruhe: boolean; level: Gespraechig; heute: number; demo: boolean };

/** Nachts (22–7 Uhr) ist absolute Ruhe */
export const nachtruhe = (hour: number) => hour >= 22 || hour < 7;

/** Darf jetzt etwas Ungefragtes kommen? `heute` = schon gezeigte Hinweise heute */
export function darf(art: HinweisArt, l: Lage): boolean {
  if (nachtruhe(l.hour) || l.pause || l.ruhe) return false;
  // Beispiel-Tag: keine Vorstellungen, keine Muster, kein Mitdenken
  if (l.demo) return false;
  if (l.level === "ruhig" && art !== "muster") return false;
  return l.heute < (l.level === "gespraechig" ? 2 : 1);
}
