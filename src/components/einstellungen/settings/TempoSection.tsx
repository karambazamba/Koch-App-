"use client";

// Für Entwickler: „Tempo: Median der letzten 20“ – wie schnell Mia im Gespräch
// reagiert (nur Zahlen, nur dieses Gerät; Messung in `begleitung/tempo.ts`).

import { CARD, SECTION_TITLE } from "@/components/ui/styles";
import { clearTempo, tempoUebersicht, useTempo } from "@/lib/begleitung/tempo";

const ZEILEN: { feld: "reaktion" | "stille" | "server" | "modell" | "token" | "satz" | "fertig"; label: string }[] = [
  { feld: "reaktion", label: "Letztes Wort → erste Reaktion" },
  { feld: "stille", label: "Letztes Wort → abgeschickt" },
  { feld: "server", label: "Abgeschickt → Server erhalten" },
  { feld: "modell", label: "Server → erstes Wort (KI)" },
  { feld: "token", label: "Abgeschickt → erstes Wort" },
  { feld: "satz", label: "Abgeschickt → erster Satz vorgelesen" },
  { feld: "fertig", label: "Abgeschickt → fertig" },
];

/** „1,2 s“ bzw. „–“ */
const sekunden = (ms: number | null) => (ms === null ? "–" : `${(ms / 1000).toFixed(1).replace(".", ",")} s`);

export function TempoSection() {
  const messungen = useTempo();
  const t = tempoUebersicht(messungen);
  return (
    <section className="flex flex-col gap-2" aria-label="Tempo">
      <h2 className={`px-1 ${SECTION_TITLE}`}>Tempo: Median der letzten 20</h2>
      <div className={`${CARD} grid grid-cols-[1fr_auto] gap-3 p-4 text-[15px]`} data-tempo>
        {ZEILEN.map((z) => (
          <span key={z.feld} className="contents">
            <span>{z.label}</span>
            <span className="text-right font-bold tabular-nums">{sekunden(t[z.feld])}</span>
          </span>
        ))}
        <span>Gespräche (davon ohne KI)</span>
        <span className="text-right font-bold tabular-nums">
          {t.anzahl} ({t.sofort})
        </span>
      </div>
      {t.anzahl > 0 && (
        <button type="button" onClick={clearTempo} className="hit min-h-11 self-start px-1 text-[15px] font-semibold text-accent-strong">
          Messungen löschen
        </button>
      )}
    </section>
  );
}
