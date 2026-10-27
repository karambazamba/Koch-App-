"use client";

// Ein Prüfstand-Lauf auf „Für Entwickler“: Prüfstand (Aktionen, Ziel ≥ 95 %)
// oder Prüfstand „Ton“ (wie Mia klingt, Ziel ≥ 90 %). Das Geheimnis kommt
// von der Seite (nur eingetippt, nie gespeichert). Der Lauf geht in kleinen
// Häppchen (`pruefstand/lauf.ts`), zeigt den Fortschritt, macht nach einem
// Verbindungsabbruch mit „Weiter“ dort weiter und listet am Ende die
// Fehlschläge zum Kopieren.

import { useState } from "react";
import { CARD_LIST, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import type { PruefErgebnis } from "@/lib/begleitung/pruefstand/bewerten";
import type { PruefSatz } from "@/lib/begleitung/pruefstand/saetze";
import type { TonSatz } from "@/lib/begleitung/pruefstand/ton";
import { fehlerText, laufQuote, pruefLauf, type Abruf } from "@/lib/begleitung/pruefstand/lauf";

type Props = {
  /** Überschrift, z. B. „Prüfstand“ oder „Prüfstand Ton“ */
  titel: string;
  /** "ton" = Prüfstand „Ton“, sonst der Prüfstand mit Aktionen */
  art?: "ton";
  saetze: (PruefSatz | TonSatz)[];
  /** Ein Satz unter der Überschrift (Anzahl, Ziel, Kosten) */
  hinweis: string;
  dauer: string;
  secret: string;
};

export function PruefstandLauf({ titel, art, saetze, hinweis, dauer, secret }: Props) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<PruefErgebnis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [abbruch, setAbbruch] = useState<number | null>(null);
  const [fertig, setFertig] = useState(false);
  const [kopiert, setKopiert] = useState(false);

  const abruf: Abruf = async (von, bis) => {
    const res = await fetch("/api/pruefstand", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${secret}` }, body: JSON.stringify({ von, bis, ...(art ? { art } : {}) }) });
    if (!res.ok) return { status: res.status };
    return { status: res.status, results: ((await res.json()) as { results: PruefErgebnis[] }).results };
  };

  /** Starten (von vorn) oder nach einem Abbruch ab dort weiter */
  const run = async (from: number | null) => {
    setRunning(true);
    setError(null);
    setAbbruch(null);
    setFertig(false);
    setKopiert(false);
    const start = from === null ? { von: 0, results: [] } : { von: from, results };
    if (from === null) setResults([]);
    const stand = await pruefLauf(saetze, abruf, start, (s) => setResults(s.results));
    setResults(stand.results);
    setRunning(false);
    if (stand.zugang) return setError("Das Geheimnis passt nicht.");
    if (stand.abbruch !== null) {
      setAbbruch(stand.abbruch);
      return setError(`Verbindung abgebrochen bei Satz ${stand.abbruch + 1}. Nochmal ab hier?`);
    }
    setFertig(true);
  };
  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fehlerText(results, saetze, titel));
      setKopiert(true);
    } catch {
      setError("Kopieren ging grad nicht.");
    }
  };

  return (
    <section className="flex flex-col gap-2" aria-label={titel}>
      <h2 className={`px-1 ${SECTION_TITLE}`}>{titel}</h2>
      <p className="px-1 text-sm text-muted">{hinweis}</p>
      <p className="px-1 text-sm text-muted">{dauer}</p>
      <button type="button" disabled={!secret || running} onClick={() => run(null)} className={buttonClass("primary", "lg")}>
        {running ? `Läuft … ${results.length} von ${saetze.length}` : `${titel} starten`}
      </button>
      {error && (
        <div className="flex items-center gap-3 px-1" role="status">
          <p className="flex-1 text-sm font-semibold text-muted">{error}</p>
          {abbruch !== null && !running && (
            <button type="button" onClick={() => run(abbruch)} className={buttonClass("soft", "sm")}>
              Weiter
            </button>
          )}
        </div>
      )}
      {results.length > 0 && (
        <>
          <p className="px-1 text-base font-bold" role="status">
            {ok} von {results.length} richtig ({laufQuote(results)} %)
          </p>
          {fertig && failed.length > 0 && (
            <div className="flex items-center gap-3 px-1">
              <p className="flex-1 text-sm text-muted">{failed.length} Fehlschläge – Satz, erwartet, bekommen.</p>
              <button type="button" onClick={copy} className={buttonClass("soft", "sm")}>
                {kopiert ? "Kopiert" : "Kopieren"}
              </button>
            </div>
          )}
          <ul className={CARD_LIST}>
            {/* Am Ende nur die Fehlschläge (wie beim Kopieren), während des Laufs alles */}
            {(fertig ? failed : results).map((r) => (
              <li key={r.text} className="flex flex-col gap-0.5 px-4 py-2.5">
                <span className="text-[15px] font-semibold">
                  {r.ok ? "✓" : "✗"} {r.text}
                </span>
                <span className="text-[13px] text-muted">
                  {r.antwort || "–"} · {(r.ms / 1000).toFixed(1)} s{r.gruende.length ? ` · ${r.gruende.join("; ")}` : ""}{r.warnung ? ` · ${r.warnung}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
