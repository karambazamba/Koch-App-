"use client";

// Für Entwickler (Auftrag „Mia auf Claude-Niveau“): KI-Kosten der letzten 7
// Tage auf diesem Gerät und der Prüfstand (132 Alltagssätze durch die echte
// Mia, Ziel ≥ 95 %). Der Prüfstand braucht das Prüfstand-Geheimnis aus Vercel
// (PRUEFSTAND_SECRET) – es wird nur für diesen Aufruf eingetippt, nie
// gespeichert, nie angezeigt. Der Lauf geht in kleinen Häppchen
// (`pruefstand/lauf.ts`), zeigt den Fortschritt, macht nach einem
// Verbindungsabbruch mit „Weiter“ dort weiter und listet am Ende die
// Fehlschläge zum Kopieren.

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, CARD_LIST, PAGE_MAIN, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { toIsoDate, useToday } from "@/lib/core/now";
import { lastWeekCosts } from "@/lib/begleitung/usage";
import { helperName } from "@/lib/einstellungen/profile";
import type { PruefErgebnis } from "@/lib/begleitung/pruefstand/bewerten";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { fehlerText, laufQuote, pruefLauf, type Abruf } from "@/lib/begleitung/pruefstand/lauf";
import { MicLogList } from "@/components/einstellungen/settings/MicLogSection";

export function AdminView() {
  // Erst im Browser (beim Vorrendern gibt es kein „heute“ und keinen Speicher)
  const today = useToday();
  const cost = today ? lastWeekCosts(toIsoDate(today)) : { requests: 0, small: 0, large: 0, upgraded: 0, zeichen: 0, sekunden: 0, usd: 0 };
  const [secret, setSecret] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<PruefErgebnis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [abbruch, setAbbruch] = useState<number | null>(null);
  const [fertig, setFertig] = useState(false);
  const [kopiert, setKopiert] = useState(false);

  const abruf: Abruf = async (von, bis) => {
    const res = await fetch("/api/pruefstand", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${secret}` }, body: JSON.stringify({ von, bis }) });
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
    const stand = await pruefLauf(PRUEFSAETZE, abruf, start, (s) => setResults(s.results));
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
      await navigator.clipboard.writeText(fehlerText(results, PRUEFSAETZE));
      setKopiert(true);
    } catch {
      setError("Kopieren ging grad nicht.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Für Entwickler" backHref="/profil/daten" />
      <main className={`${PAGE_MAIN} gap-5`}>
        <section className="flex flex-col gap-2" aria-label="KI-Kosten letzte 7 Tage">
          <h2 className={`px-1 ${SECTION_TITLE}`}>KI-Kosten letzte 7 Tage</h2>
          <div className={`${CARD} grid grid-cols-2 gap-3 p-4 text-[15px]`}>
            <span>Anfragen</span>
            <span className="text-right font-bold tabular-nums">{cost.requests}</span>
            <span>davon klein / groß</span>
            <span className="text-right font-bold tabular-nums">
              {cost.small} / {cost.large}
            </span>
            <span>hochgeschaltet</span>
            <span className="text-right font-bold tabular-nums">{cost.upgraded}</span>
            <span>Vorgelesen (Zeichen)</span>
            <span className="text-right font-bold tabular-nums">{cost.zeichen}</span>
            <span>Zugehört (Sekunden)</span>
            <span className="text-right font-bold tabular-nums">{cost.sekunden}</span>
            <span>Kosten (dieses Gerät)</span>
            <span className="text-right font-bold tabular-nums">{cost.usd.toFixed(2)} $</span>
          </div>
        </section>
        <div className={`${CARD} overflow-hidden`}>
          <MicLogList as="section" />
        </div>
        <section className="flex flex-col gap-2" aria-label="Prüfstand">
          <h2 className={`px-1 ${SECTION_TITLE}`}>Prüfstand</h2>
          <p className="px-1 text-sm text-muted">{`${PRUEFSAETZE.length} Alltagssätze durch ${helperName(null)}. Ziel: mindestens 95 % richtig. Kostet ein paar Cent.`}</p>
          <input
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Prüfstand-Geheimnis"
            aria-label="Prüfstand-Geheimnis"
            className="h-12 rounded-field border border-line bg-surface px-3 text-base"
          />
          <p className="px-1 text-sm text-muted">Bildschirm anlassen, dauert ca. 5 Minuten.</p>
          <button type="button" disabled={!secret || running} onClick={() => run(null)} className={buttonClass("primary", "lg")}>
            {running ? `Läuft … ${results.length} von ${PRUEFSAETZE.length}` : "Prüfstand starten"}
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
      </main>
    </div>
  );
}
