// Eingebaute Gerichte-Liste für alle Ideen ohne KI ("Was gibt's heute?",
// Spontan kochen, Testmodus): die 150 Alltagsgerichte aus gerichte/*.ts,
// jedes mit Gruppe, Beliebtheit, Kinder-Tauglichkeit und Rezept. Bilder
// entstehen aus Titel und Zutaten (dishArt, npm run gerichte-bilder).

export type { Season } from "@/lib/essen/gerichte/types";
export { GERICHTE as DISHES } from "@/lib/essen/gerichte";
