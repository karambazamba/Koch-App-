// Welcher Weg hört zu? (rein, getestet in tests/begleitung/ohrLive.test.ts)
// Auftrag A-026: auf der Bühne zuerst live über ElevenLabs (Text beim
// Sprechen, Ende von selbst); geht das nicht, die Spracherkennung des Browsers
// (wie vor v0.98); erst wenn auch die fehlt, die eigene Aufnahme mit Text vom
// Server. Außerhalb der Bühne immer der Browser. „nichts“ = kein Weg da.

export type OhrWeg = "live" | "browser" | "aufnahme" | "nichts";

export function ohrWeg(o: { buehne: boolean; live: boolean; browser: boolean; aufnahme: boolean }): OhrWeg {
  if (o.buehne && o.live) return "live";
  if (o.browser) return "browser";
  if (o.buehne && o.aufnahme) return "aufnahme";
  return "nichts";
}

/**
 * Gibt es Spracheingabe? Browser-Erkennung reicht; auf der Bühne auch Mias Ohr
 * vom Server. null = noch unbekannt (Status unterwegs) – dann nie vorschnell
 * „gibt’s nicht“, sonst landet das Zuhören beim Öffnen im Tipp-Hinweis.
 */
export function spracheMoeglich(browser: boolean | null, buehne: boolean, server: boolean | null): boolean | null {
  return browser !== false || !buehne ? browser : server;
}
