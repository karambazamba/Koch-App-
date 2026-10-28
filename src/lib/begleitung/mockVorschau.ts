// Testmodus: „Schreib mir ein Rezept für … Nur das Rezept, ohne Tag.“ (Vorschau,
// A-038) → genau ein rezept_erstellen ohne Platz, mit Kurzfassung. Die Zutaten
// kommen aus der Gerichte-Liste, sonst ein einfaches Grundrezept.

import { DISHES } from "@/lib/essen/dishIdeas";
import { vorschauTitel } from "@/lib/essen/vorschau/laden";
import { tools } from "@/lib/begleitung/mockShared";

/** Werkzeug-Aufruf für die Vorschau-Bitte, sonst null */
export function vorschauUses(content: string, system: string) {
  const titel = vorschauTitel(content);
  if (!titel) return null;
  const persons = Number(system.match(/, (\d+) Personen/)?.[1] ?? 4);
  const dish = DISHES.find((d) => d.title.toLowerCase() === titel.toLowerCase());
  const namen = dish?.needs.length ? dish.needs.slice(0, 6) : ["Zwiebel", "Knoblauch", "Tomaten", "Olivenöl"];
  return tools([
    {
      id: "mock_vorschau",
      name: "rezept_erstellen",
      input: {
        titel,
        kategorie: dish?.category === "fleisch" || dish?.category === "fisch" ? dish.category : "vegetarisch",
        portionen: persons,
        zubereitungszeit_min: dish?.minutes ?? 30,
        zutaten: namen.map((name, i) => ({ menge: i === 0 ? 100 * persons : null, einheit: i === 0 ? "g" : "", name })),
        schritte: ["Alles klein schneiden und bereitstellen.", "Zwiebel in etwas Öl glasig dünsten, den Rest dazugeben.", "10 Minuten garen, abschmecken und servieren."],
        kurz: ["Alles klein schneiden", "Zwiebel dünsten, Rest dazu", "10 Min garen, abschmecken"],
        fuer_plan: false,
      },
    },
  ]);
}
