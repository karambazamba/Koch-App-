"use client";

// Mias Antwort auf „Was ist los?“: bis zu 3 Veranstaltungen als Karte, jede
// mit „In den Kalender“ (sofort, Raum Familie, Ergebnis-Karte mit
// Rückgängig), antippen öffnet das Detail. Darunter die Quelle.

import { useState } from "react";
import { CARD } from "@/components/ui/styles";
import { useEntries } from "@/lib/kalender/store";
import { tagKurz, type RegionEvent, type WasLosKarte } from "@/lib/region/model";
import { inDenKalender, istEingetragen } from "@/lib/region/client";
import { Eingetragen, Quellenzeile, WasLosZeile } from "@/components/region/WasLosTeile";
import { WasLosDetail } from "@/components/region/WasLosDetail";

export function WasLosKarten({ karten }: { karten: WasLosKarte[] }) {
  const entries = useEntries();
  const [detail, setDetail] = useState<WasLosKarte | null>(null);
  const [ergebnis, setErgebnis] = useState<{ id: string; eventId: string; titel: string; tag: string; undo: () => void } | null>(null);
  const quelle = karten.some((k) => k.event.quelle === "demo") ? "demo" : "kreisoh";
  const eintragen = (event: RegionEvent, tag: string) => {
    const r = inDenKalender(event, tag);
    if (r) setErgebnis({ id: r.entry.id, eventId: event.id, titel: event.titel, tag, undo: r.undo });
  };
  return (
    <section className="flex w-full flex-col gap-2" aria-label="Was los?" data-was-los-karten>
      <ul className={`${CARD} flex flex-col divide-y divide-line overflow-hidden px-3`}>
        {karten.map(({ event, tag }) => (
          <li key={event.id} className="flex flex-col">
            <span className="pt-2.5 text-[12px] font-extrabold uppercase tracking-wider text-waslos">{tagKurz(tag)}</span>
            <WasLosZeile event={event} eingetragen={istEingetragen(event.id, entries)} onOeffnen={() => setDetail({ event, tag })} onKalender={() => eintragen(event, tag)} />
            {ergebnis?.eventId === event.id && <div className="pb-3"><Eingetragen key={ergebnis.id} titel={ergebnis.titel} tag={ergebnis.tag} onUndo={() => (ergebnis.undo(), setErgebnis(null))} /></div>}
          </li>
        ))}
      </ul>
      <Quellenzeile quelle={quelle} />
      {detail && <WasLosDetail event={detail.event} tag={detail.tag} quelle={quelle} onClose={() => setDetail(null)} />}
    </section>
  );
}
