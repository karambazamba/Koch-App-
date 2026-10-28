// Sofort sprechen (Auftrag „Mia schneller und flüssiger“, rein): Die Antwort
// kommt gestreamt; der erste vollständige Satz wird vorgelesen, sobald er da
// ist, der Rest schließt nahtlos an, wenn die Antwort fertig ist. Dauert es
// länger als 1,2 s ohne Antwort, sagt Mia einmal kurz „Mhm.“ (nie beim
// Sofort-Weg, nie während sie zuhört). Die Hook-Seite steht in
// `components/begleitung/useMiaSprechen.ts`.

/** Ab dann sagt Mia „Mhm.“, wenn noch nichts da ist */
export const MHM_AB_MS = 1200;
export const MHM = "Mhm.";

/** Punkte, die kein Satzende sind: Abkürzungen und Wochentage („z. B.“, „ca.“, „Do.“) */
const ABK = /(?:^|[\s(])(?:z|B|b|d|h|u|a|o|ca|bzw|ggf|usw|evtl|inkl|mind|Nr|nr|Std|std|Min|min|Mo|Di|Mi|Do|Fr|Sa|So|Jan|Feb|Mär|Apr|Jun|Jul|Aug|Sep|Sept|Okt|Nov|Dez|St|Dr|Hr|Fr)$/;

/**
 * Erster vollständiger Satz eines wachsenden Textes – nur, wenn danach schon
 * etwas kommt (sonst könnte der Satz noch weitergehen). Daten („21. Oktober“),
 * Uhrzeiten („16.30“) und Abkürzungen trennen nicht.
 */
export function ersterSatz(text: string): string | null {
  const re = /[.!?…]+(?=\s+\S)/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const vor = text.slice(0, m.index);
    const zeichen = m[0];
    if (zeichen.startsWith(".") && (/\d$/.test(vor) || ABK.test(vor))) continue;
    const satz = text.slice(0, m.index + zeichen.length).trim();
    if (satz.replace(/[^\p{L}\p{N}]/gu, "").length >= 2) return satz;
  }
  return null;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Was nach dem schon Gesagten noch vorgelesen wird. Beginnt die fertige
 * Antwort mit dem schon gesprochenen Satz: nur der Rest (angehängt). Sonst
 * (neue Runde nach Werkzeugen) die ganze Antwort, ebenfalls angehängt.
 */
export function nochZuSagen(gesagt: string, ganz: string): { text: string; anhaengen: boolean } {
  if (!gesagt) return { text: ganz, anhaengen: false };
  const g = norm(gesagt);
  if (norm(ganz).startsWith(g)) {
    // Gleiche Länge an Zeichen ohne Leerraum überspringen (Leerzeichen können abweichen)
    let n = 0;
    let i = 0;
    const ziel = g.replace(/\s/g, "").length;
    while (i < ganz.length && n < ziel) {
      if (!/\s/.test(ganz[i])) n++;
      i++;
    }
    return { text: ganz.slice(i).trim(), anhaengen: true };
  }
  return { text: ganz, anhaengen: true };
}

/** Jetzt „Mhm.“ sagen? Einmal je Frage, nur wenn vorgelesen wird und noch nichts da ist */
export function mhmFaellig(o: { seitMs: number; hatText: boolean; schonGesagt: boolean; sofort: boolean; liest: boolean; hoert: boolean }): boolean {
  return o.liest && !o.sofort && !o.hoert && !o.schonGesagt && !o.hatText && o.seitMs >= MHM_AB_MS;
}
