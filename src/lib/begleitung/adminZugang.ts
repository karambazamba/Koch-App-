// Nur Server: Zugang für Entwickler-Aufrufe (Prüfstand, Ansagen erzeugen) mit
// „Authorization: Bearer <PRUEFSTAND_SECRET bzw. CRON_SECRET>“ – zeitkonstanter
// Vergleich. Ohne Geheimnis ist alles zu.

export function adminErlaubt(request: Request): boolean {
  const secret = process.env.PRUEFSTAND_SECRET || process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
