// Denkpause ohne zerrissenen Satz (Auftrag „Mia schneller“, rein): Mia schickt
// schon nach 1,2 s Stille ab. Spricht man kurz danach weiter („Milch auf die
// Liste … und Eier“), zählt das als Fortsetzung: Die eben abgeschickte Frage
// wird zurückgezogen (Anfrage abgebrochen, Sofort-Erledigtes zurückgenommen)
// und beides zusammen neu geschickt. Maßgeblich ist, wann das erste Wort der
// neuen Aufnahme erkannt wird – der Erkenner meldet Wörter etwas verzögert.

/** Fortsetzung innerhalb so vieler ms nach dem Abschicken hängt an */
export const NACHKLAPP_MS = 1500;
/** So viel später meldet der Erkenner ein Wort, als es gesagt wurde */
export const ERKENNER_VERZUG_MS = 400;

/** Zeit in ms (monoton) – für Abstände, nicht für „jetzt“ (das ist `now()`) */
export const jetztMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Ist das erste Wort einer neuen Aufnahme eine Fortsetzung der eben gesendeten Frage? */
export function istNachklapp(gesendetAm: number | null | undefined, ersteWortAm: number): boolean {
  if (gesendetAm === null || gesendetAm === undefined) return false;
  const d = ersteWortAm - gesendetAm;
  return d >= 0 && d <= NACHKLAPP_MS + ERKENNER_VERZUG_MS;
}

/** Beides zusammen; liefert der Browser den alten Teil nochmal mit, nicht doppelt */
export function zusammen(vorher: string, nachher: string): string {
  const v = vorher.trim();
  const n = nachher.trim();
  if (!v) return n;
  if (!n) return v;
  if (n.toLowerCase().startsWith(v.toLowerCase())) return n;
  return `${v.replace(/[.!?]+$/, "")} ${n}`;
}

/**
 * Abgeschickte Frage für eine mögliche Fortsetzung merken. Von Hand beendet
 * (Mia angetippt) ist sie fertig: nichts hängt mehr an, die nächste Aufnahme
 * ist eine neue Frage.
 */
export function fuerNachklapp(text: string, am: number, vonHand: boolean): { text: string; am: number } | null {
  return vonHand ? null : { text, am };
}
