// Kleine Text-Hilfen für die Oberfläche (rein).

/** Ohne Emojis – für Kacheln, Termin-Titel und Laden-Zeilen ("☕ Kaffeepause" → "Kaffeepause") */
export function withoutEmoji(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]️?(‍[\p{Extended_Pictographic}]️?)*/gu, "")
    .replace(/️/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
