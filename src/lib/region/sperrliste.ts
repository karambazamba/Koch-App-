// „Was los?“: Sperrliste für einzelne Veranstaltungen (wenn ein Veranstalter
// die Entfernung wünscht). Feste IDs hier im Code (z. B. "kreisoh-123456")
// und zusätzlich, ohne neue Version, über die Vercel-Variable
// REGION_TIPPS_SPERRE (Komma-getrennt). Gesperrtes wird nie geschrieben, beim
// nächsten Lauf gelöscht und nie ausgeliefert.

const SPERRLISTE: string[] = [];

/** Alle gesperrten IDs (Code + Umgebungsvariable) */
export function gesperrteIds(env: string | undefined = process.env.REGION_TIPPS_SPERRE): Set<string> {
  const extra = (env ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^[a-z]+-[\w.-]{1,40}$/i.test(s));
  return new Set([...SPERRLISTE, ...extra]);
}
