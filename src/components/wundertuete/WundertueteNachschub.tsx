"use client";

// Für Entwickler (A-052): Vorrat von Wundertüte und Rätseln für diesen
// Haushalt. Plattdeutsch und Angeberwissen kommen nur aus geprüften Paketen:
// unter 50 ungesehenen steht „… Paket nötig (n übrig)“ – dann ist der
// Monatsauftrag A-039 dran. Witze und Rätsel legt Mia per KI nach (20 im
// Voraus). Dazu der Knopf, der das Rätsel-Fenster öffnet (bis Paket A den
// Mini-Kreis auf der Startseite anbindet).

import { useState } from "react";
import { CARD, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { RaetselFenster } from "@/components/raetsel/RaetselFenster";
import { PAKET_NOETIG_AB, uebrigAusPaketen } from "@/lib/wundertuete/auswahl";
import { WT_POOL } from "@/lib/wundertuete/pool";
import { useWundertuete } from "@/lib/wundertuete/store";
import { RT_POOL } from "@/lib/raetsel/auswahl";
import { useRaetsel } from "@/lib/raetsel/store";
import { ungesehen } from "@/lib/wundertuete/vorrat";

export function WundertueteNachschub() {
  const wt = useWundertuete();
  const rt = useRaetsel();
  const [fenster, setFenster] = useState(false);
  if (!wt || !rt) return null;
  const zeilen: [string, number, boolean][] = [
    ["Plattdeutsch", uebrigAusPaketen(wt, "platt"), true],
    ["Angeberwissen", uebrigAusPaketen(wt, "angeberwissen"), true],
    ["Witze (mit Mias Nachschub)", ungesehen(WT_POOL, wt, (x) => x.sorte === "witz").length, false],
    ["Rätsel (mit Mias Nachschub)", ungesehen(RT_POOL, rt).length, false],
  ];
  return (
    <section className="flex flex-col gap-2" aria-label="Wundertüte und Rätsel">
      <h2 className={`px-1 ${SECTION_TITLE}`}>Wundertüte und Rätsel</h2>
      <div className={`${CARD} grid grid-cols-[1fr_auto] gap-3 p-4 text-[15px]`} data-wt-vorrat>
        {zeilen.map(([name, n, paket]) =>
          paket && n < PAKET_NOETIG_AB ? (
            <span key={name} className="col-span-2 font-bold text-accent-strong" data-paket-noetig={name}>
              {name}: Paket nötig ({n} übrig)
            </span>
          ) : (
            <span key={name} className="contents">
              <span>{name}: ungesehen</span>
              <span className="text-right font-bold tabular-nums">{n}</span>
            </span>
          ),
        )}
        <button type="button" className={`${buttonClass("secondary", "sm")} col-span-2`} onClick={() => setFenster(true)}>
          Rätsel-Fenster öffnen
        </button>
      </div>
      {fenster && <RaetselFenster onClose={() => setFenster(false)} />}
    </section>
  );
}
