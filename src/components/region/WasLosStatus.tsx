"use client";

// „Für Entwickler“ → „Was los?“: Quelle, letzter Lauf, Treffer und der
// Hinweis „Was los?: Quelle liefert nichts“ (nur hier, nie für Nutzer).

import { CARD, SECTION_TITLE } from "@/components/ui/styles";
import { quellenHinweis } from "@/lib/region/model";
import { useWasLosDaten } from "@/lib/region/client";

const QUELLE = { kreisoh: "Kreis Ostholstein", demo: "Beispieldaten (Testbetrieb)", aus: "aus (REGION_TIPPS_QUELLE)" } as const;

export function WasLosStatus() {
  const d = useWasLosDaten();
  const hinweis = d ? quellenHinweis(d.quelle, d.status) : null;
  const lauf = d?.status?.lauf ? new Date(d.status.lauf).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }) : "–";
  return (
    <section className="flex flex-col gap-2" aria-label="Was los?">
      <h2 className={`px-1 ${SECTION_TITLE}`}>Was los?</h2>
      <div className={`${CARD} grid grid-cols-2 gap-3 p-4 text-[15px]`}>
        <span>Quelle</span>
        <span className="text-right font-bold">{d ? QUELLE[d.quelle] : "…"}</span>
        <span>Letzter Lauf</span>
        <span className="text-right font-bold tabular-nums">{lauf}</span>
        <span>Treffer</span>
        <span className="text-right font-bold tabular-nums">{d?.status?.treffer ?? 0}</span>
        <span>In 14 Tagen</span>
        <span className="text-right font-bold tabular-nums">{d?.events.length ?? 0}</span>
      </div>
      {hinweis && (
        <p className="rounded-field bg-warn-soft px-4 py-3 text-sm font-semibold text-warn-ink" data-was-los-hinweis>
          {hinweis}
        </p>
      )}
    </section>
  );
}
