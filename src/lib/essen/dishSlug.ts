// Dateiname eines Gerichts – klein und ohne Zeichen-Code, damit Seiten mit
// eingebauten Bildern das Zeichnen nicht mitladen.

/** Dateiname eines Gerichts: "Pasta mit Tomaten & Burrata" → "pasta-mit-tomaten-burrata" */
export function dishSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
