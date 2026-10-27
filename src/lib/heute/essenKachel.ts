// Essen-Kachel (Auftrag „Essen-Kachel – immer Bild, gezeigtes Gericht immer
// wählbar“), rein: Was zeigt die Kachel? Jedes gezeigte Gericht (heute
// geplant, morgen geplant, Vorschlag) ist eine Bild-Kachel; „Ideen ansehen“
// gibt es nur, wenn gar kein Gericht gezeigt wird. Ein Vorschlag lässt sich
// nehmen – tagsüber für heute, nach dem Essen für morgen.

export type FoodView =
  /** Geplantes Gericht: „Essen · 18:30“ bzw. „Morgen · Mo“, kein Zusatz */
  | { kind: "geplant"; title: string; when: "heute" | "morgen" }
  /** Nur Vorschlag (⇄ bzw. Idee): leise „Vorschlag“ unter dem Namen */
  | { kind: "vorschlag"; title: string; takeFor: "heute" | "morgen" }
  /** Kein Gericht: „Noch frei“ (bzw. „Kein Kochtag“), „Ideen ansehen“ nur mit Ideen */
  | { kind: "frei"; title: string; ideen: boolean };

export function foodTileView(o: {
  /** Nach dem Abendessen: die Kachel zeigt morgen */
  over: boolean;
  /** Heute geplantes Gericht */
  today: string | null;
  /** Morgen geplantes Gericht */
  tomorrow: string | null;
  /** Mit ⇄ gewählte Idee */
  idea: string | null;
  /** Kein Kochtag / Pause (Text statt Gericht) */
  away: string | null;
  /** Wie viele Ideen es gibt */
  ideas: number;
}): FoodView {
  if (o.idea) return { kind: "vorschlag", title: o.idea, takeFor: o.over ? "morgen" : "heute" };
  const planned = o.over ? o.tomorrow : o.today;
  if (planned) return { kind: "geplant", title: planned, when: o.over ? "morgen" : "heute" };
  return { kind: "frei", title: o.away ?? "Noch frei", ideen: o.ideas > 0 };
}

/** Knopf im Gericht-Fenster */
export const takeLabel = (takeFor: "heute" | "morgen") => (takeFor === "morgen" ? "Für morgen nehmen" : "Für heute nehmen");
