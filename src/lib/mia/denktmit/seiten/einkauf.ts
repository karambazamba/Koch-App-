// Mia denkt mit: Texte für „Einkauf“ (Kachel vorstellen, erster Besuch der Seite).
// Die Einkaufsliste stellt sich beim ersten Mal mit drei kurzen Zeilen vor
// (A-040/A-041), die Laden-Seite einmal mit einer Zeile (je Laden-Seite das
// erste Mal überhaupt, nicht je Laden).

export const EINKAUF = {
  kachel: "Das ist eure Einkaufsliste. Sag mir einfach „Milch“, ich trag’s ein.",
  seite: "Ich merk mir, wo du was kaufst.\nSag einfach ‚Tomaten auf die Liste‘, den Laden such ich aus.\nAbgehakt ist weg. Fürs Rezept leg ich dir Zutaten oben hin.",
  href: "/einkaufsliste",
} as const;

/** Schlüssel des ersten Besuchs: Einkaufsliste (neu seit A-040, damit auch Bisherige sie einmal sehen) und Laden-Seite */
export const EINKAUF_LISTE_SEITE = "seite:einkaufsliste";
export const EINKAUF_LADEN_SEITE = "seite:einkauf-laden";

/** Laden-Seite, einmal: „Abhaken, was im Wagen liegt. Ich merk mir das für Rewe.“ */
export const einkaufLadenTipp = (shop: string) => (shop.trim() ? `Abhaken, was im Wagen liegt. Ich merk mir das für ${shop.trim()}.` : "Abhaken, was im Wagen liegt.");
