// Kurzfassung, die Mia beim Rezept-Schreiben mitliefert (rezept_erstellen, Feld „kurz“).

/** Kurzfassung von Mia (rezept_erstellen) übernehmen – nur bei passender Schrittzahl, sonst keine */
export function kurzVonMia(raw: unknown, schritte: number): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw.map((s) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "")).filter(Boolean);
  return list.length === schritte ? list : undefined;
}
