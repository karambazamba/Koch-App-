// Besondere Tage (Tafel 98): Geburtstag, Jahrestag, Hochzeitstag – erkannt am
// Stichwort im Titel oder am Etikett („Kategorie“). Ganztägige Termine zeigen
// dann statt „Ganztägig“ allein ein kleines Symbol in Rosé davor (Herz bzw.
// Geschenk), die Jetzt-Karte fragt am Vorabend „Was Schönes geplant?“. Rein.

export type Anlass = "geburtstag" | "jahrestag";

/** Geburtstag bzw. Jahrestag/Hochzeitstag – sonst null */
export function anlassOf(title: string, label?: string | null): Anlass | null {
  const t = `${title} ${label ?? ""}`;
  if (/geburtstag/i.test(t)) return "geburtstag";
  if (/hochzeitstag|jahrestag/i.test(t)) return "jahrestag";
  return null;
}

/** Wer Geburtstag hat ("Geburtstag Oma", "Omas Geburtstag") – oder null */
export function birthdayName(title: string): string | null {
  const clean = title.replace(/\p{Extended_Pictographic}/gu, "").trim();
  const before = clean.match(/^(.+?)\s+geburtstag(?![a-zäöüß])/i);
  if (before) {
    const n = before[1].trim();
    // Genitiv: "Oma's"/"Omas" → Oma, "Klaus" bleibt Klaus
    if (/['’]s$/u.test(n)) return n.slice(0, -2);
    return /[aeioy]s$/i.test(n) ? n.slice(0, -1) : n;
  }
  const after = clean.match(/geburtstag(?:\s+von)?[\s:·-]+(.+)$/i);
  return after ? after[1].trim() || null : null;
}

/**
 * Der eigene Jahrestag („Hochzeitstag“, „Unser Jahrestag“) – dann „euer“ bzw.
 * allein „dein“. Steht mehr im Titel („Hochzeitstag Oma und Opa“), null.
 */
export function eigenerJahrestag(title: string): "Hochzeitstag" | "Jahrestag" | null {
  const m = title
    .replace(/\p{Extended_Pictographic}/gu, "")
    .trim()
    .match(/^(?:unser(?:er)?\s+)?(hochzeitstag|jahrestag)[.!]?$/i);
  if (!m) return null;
  return m[1].toLowerCase() === "hochzeitstag" ? "Hochzeitstag" : "Jahrestag";
}

/** Was in der Uhrzeit-Spalte eines ganztägigen Termins steht (halbe Kachel: nur das Symbol) */
export function ganztagAnzeige(title: string, label: string | null | undefined, kurz: boolean): { symbol: "Gift" | "Heart" | "CalendarDays" | null; text: "Ganztägig" | null; rose: boolean } {
  const anlass = anlassOf(title, label);
  const symbol = anlass === "geburtstag" ? "Gift" : anlass === "jahrestag" ? "Heart" : kurz ? "CalendarDays" : null;
  return { symbol, text: kurz ? null : "Ganztägig", rose: anlass !== null };
}
