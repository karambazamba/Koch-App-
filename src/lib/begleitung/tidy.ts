// Mia spricht knapp: jede KI-Antwort läuft vor Anzeige, Vorlesen und Push
// durch tidyMiaText(). Gedankenstriche als Satzverbindung werden zu Punkt
// bzw. Komma, Spiegelstriche am Zeilenanfang fallen weg, Doppel-Ausrufezeichen
// werden einfach, höchstens ein „!“ pro Nachricht. Rein, damit testbar.

const DASH = /\s+[–—]\s+/g;

/** „Regen ab 14 Uhr – Regenjacke für Mathis?“ → „Regen ab 14 Uhr. Regenjacke für Mathis?“ */
function joinParts(text: string): string {
  return text.replace(/([^\s])\s+[–—]\s+(\S)/g, (_all, before: string, after: string) => {
    // Zahlen-Spannen („9 – 11 Uhr“, „19.10. – 25.10.“) bleiben, nur als Bindestrich ohne Leerzeichen
    if (/\d/.test(before) && /\d/.test(after)) return `${before}–${after}`;
    // Nach Satzzeichen genügt ein Leerzeichen
    if (/[.!?:,;]/.test(before)) return `${before} ${after}`;
    // Großbuchstabe danach (Nomen oder neuer Satz) → neuer Satz; klein → Komma
    return /[A-ZÄÖÜ„"]/.test(after) ? `${before}. ${after}` : `${before}, ${after}`;
  });
}

export function tidyMiaText(text: string): string {
  let out = text
    .split("\n")
    // Spiegelstriche/Aufzählungszeichen am Zeilenanfang weg
    .map((line) => line.replace(/^\s*(?:[-•–—*]|\d+[.)])\s+/, ""))
    .join("\n");
  out = joinParts(out).replace(DASH, ", ");
  out = out.replace(/!{2,}/g, "!").replace(/\?{2,}/g, "?");
  // Höchstens ein „!“: alle bis auf das letzte werden zu Punkten
  const bangs = out.split("!").length - 1;
  if (bangs > 1) {
    let seen = 0;
    out = out.replace(/!/g, () => (++seen < bangs ? "." : "!"));
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
