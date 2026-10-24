// Prüfstand im Browser (rein, testbar): ruft /api/pruefstand in kleinen
// Häppchen (PRUEF_BATCH Sätze, je Aufruf sicher unter ~25 s – Vercel bricht
// lange Funktionen ab) der Reihe nach auf. Fehler je Aufruf: einmal still
// nochmal; antwortet der Server dann mit einem Fehler, zählen diese Sätze als
// „Fehler beim Aufruf“ und es geht weiter. Bricht die Verbindung ab (kein
// Netz, Bildschirm aus), hält der Lauf an und kann ab dort weitermachen.

import type { PruefErgebnis } from "@/lib/begleitung/pruefstand/bewerten";
import type { PruefSatz } from "@/lib/begleitung/pruefstand/saetze";

export const PRUEF_BATCH = 3;

/** Ein Aufruf: Sätze von–bis. Wirft bei abgebrochener Verbindung; `status` bei Server-Fehlern */
export type Abruf = (von: number, bis: number) => Promise<{ status: number; results?: PruefErgebnis[] }>;

export type LaufStand = {
  results: PruefErgebnis[];
  /** Nächster Satz (0-basiert) */
  von: number;
  /** Verbindung abgebrochen: hier geht es mit „Weiter“ weiter */
  abbruch: number | null;
  /** Geheimnis passt nicht */
  zugang: boolean;
};

const fehler = (s: PruefSatz): PruefErgebnis => ({ text: s.text, ok: false, gruende: ["Fehler beim Aufruf"], ms: 0, antwort: "", ops: [] });

/** Prüfstand laufen lassen – ab `start.von` mit den schon vorhandenen Ergebnissen */
export async function pruefLauf(saetze: PruefSatz[], abruf: Abruf, start: { von: number; results: PruefErgebnis[] } = { von: 0, results: [] }, onStand?: (s: LaufStand) => void, batch = PRUEF_BATCH): Promise<LaufStand> {
  let results = start.results.slice(0, start.von);
  let von = start.von;
  while (von < saetze.length) {
    const bis = Math.min(saetze.length, von + batch);
    let antwort: Awaited<ReturnType<Abruf>> | null = null;
    let netz = false;
    for (let versuch = 0; versuch < 2; versuch++) {
      try {
        antwort = await abruf(von, bis);
        netz = false;
        if (antwort.status === 401) return { results, von, abbruch: null, zugang: true };
        if (antwort.status >= 200 && antwort.status < 300 && antwort.results) break;
      } catch {
        netz = true;
        antwort = null;
      }
    }
    if (netz) {
      const stand = { results, von, abbruch: von, zugang: false };
      onStand?.(stand);
      return stand;
    }
    const ok = antwort && antwort.status >= 200 && antwort.status < 300 && antwort.results;
    results = [...results, ...(ok ? antwort!.results! : saetze.slice(von, bis).map(fehler))];
    von = bis;
    onStand?.({ results, von, abbruch: null, zugang: false });
  }
  return { results, von, abbruch: null, zugang: false };
}

/** Quote in Prozent (gerundet) */
export const laufQuote = (results: PruefErgebnis[]) => (results.length ? Math.round((results.filter((r) => r.ok).length / results.length) * 100) : 0);

/** Fehlschläge zum Kopieren: Satz, erwartet, bekommen, Gründe */
export function fehlerText(results: PruefErgebnis[], saetze: PruefSatz[]): string {
  const bad = results.filter((r) => !r.ok);
  const lines = bad.map((r) => {
    const s = saetze.find((x) => x.text === r.text);
    const erwartet = s ? [s.ops.length ? s.ops.join(" oder ") : "nur antworten", s.datum, s.zeit, s.person].filter(Boolean).join(", ") : "?";
    const bekommen = [r.ops.length ? r.ops.join(", ") : "keine Aktion", r.antwort ? `„${r.antwort}“` : ""].filter(Boolean).join(" · ");
    return `✗ ${r.text}\n  erwartet: ${erwartet}\n  bekommen: ${bekommen}\n  ${r.gruende.join("; ")}`;
  });
  return [`Prüfstand: ${results.length - bad.length} von ${results.length} richtig (${laufQuote(results)} %)`, ...lines].join("\n");
}
