"use client";

// Für Entwickler (Auftrag „Mia auf Claude-Niveau“): KI-Kosten der letzten 7
// Tage auf diesem Gerät und der Prüfstand (120 Alltagssätze durch die echte
// Mia, Ziel ≥ 95 %). Der Prüfstand braucht das Prüfstand-Geheimnis aus Vercel
// (PRUEFSTAND_SECRET) – es wird nur für diesen Aufruf eingetippt, nie
// gespeichert, nie angezeigt.

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, CARD_LIST, PAGE_MAIN, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { toIsoDate, useToday } from "@/lib/core/now";
import { lastWeekCosts } from "@/lib/begleitung/usage";
import { helperName } from "@/lib/einstellungen/profile";
import type { PruefErgebnis } from "@/lib/begleitung/pruefstand/bewerten";

const BATCH = 20;

export function AdminView() {
  // Erst im Browser (beim Vorrendern gibt es kein „heute“ und keinen Speicher)
  const today = useToday();
  const cost = today ? lastWeekCosts(toIsoDate(today)) : { requests: 0, small: 0, large: 0, upgraded: 0, usd: 0 };
  const [secret, setSecret] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<PruefErgebnis[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResults([]);
    let von = 0;
    let gesamt = Infinity;
    try {
      while (von < gesamt) {
        const res = await fetch("/api/pruefstand", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${secret}` }, body: JSON.stringify({ von, bis: von + BATCH }) });
        if (!res.ok) throw new Error(res.status === 401 ? "Das Geheimnis passt nicht." : "Hat grad nicht geklappt.");
        const body = (await res.json()) as { gesamt: number; bis: number; results: PruefErgebnis[] };
        gesamt = body.gesamt;
        von = body.bis;
        setResults((r) => [...r, ...body.results]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hat grad nicht geklappt.");
    } finally {
      setRunning(false);
    }
  };
  const ok = results.filter((r) => r.ok).length;

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
            <span>Kosten (dieses Gerät)</span>
            <span className="text-right font-bold tabular-nums">{cost.usd.toFixed(2)} $</span>
          </div>
        </section>
        <section className="flex flex-col gap-2" aria-label="Prüfstand">
          <h2 className={`px-1 ${SECTION_TITLE}`}>Prüfstand</h2>
          <p className="px-1 text-sm text-muted">{`120 Alltagssätze durch ${helperName(null)}. Ziel: mindestens 95 % richtig. Kostet ein paar Cent.`}</p>
          <input
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Prüfstand-Geheimnis"
            aria-label="Prüfstand-Geheimnis"
            className="h-12 rounded-field border border-line bg-surface px-3 text-base"
          />
          <button type="button" disabled={!secret || running} onClick={run} className={buttonClass("primary", "lg")}>
            {running ? `Läuft … ${results.length} von 120` : "Prüfstand starten"}
          </button>
          {error && <p className="px-1 text-sm font-semibold text-muted" role="status">{error}</p>}
          {results.length > 0 && (
            <>
              <p className="px-1 text-base font-bold" role="status">
                {ok} von {results.length} richtig ({Math.round((ok / results.length) * 100)} %)
              </p>
              <ul className={CARD_LIST}>
                {results.map((r) => (
                  <li key={r.text} className="flex flex-col gap-0.5 px-4 py-2.5">
                    <span className="text-[15px] font-semibold">
                      {r.ok ? "✓" : "✗"} {r.text}
                    </span>
                    <span className="text-[13px] text-muted">
                      {r.antwort || "–"} · {(r.ms / 1000).toFixed(1)} s{r.gruende.length ? ` · ${r.gruende.join("; ")}` : ""}
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
