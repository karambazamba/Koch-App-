"use client";

// Fenster „Was ist los in <Wohnort>?“ (A-055, Tafel 142/2–3): Fahne, Titel,
// „Veranstaltungen · bis 15 km“, ✕. Reiter Heute · Wochenende · 2 Wochen,
// Filter-Chips bei Wochenende und 2 Wochen (Familie: „Für Kinder“ zuerst),
// Liste nach Tagen. Der Kalender-Knopf trägt sofort ein (Raum Familie,
// Ergebnis-Karte „Eingetragen“ mit Rückgängig). Zeile antippen = Detail.
// Unten die Quelle. Den Mini-Kreis auf der Startseite baut Paket A und
// öffnet dieses Fenster (`<WasLosFenster onClose={…} />`).

import { useState } from "react";
import { X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { ICON_BUTTON, chipClass } from "@/components/ui/styles";
import { toIsoDate, todayIso, useMinutes, useToday } from "@/lib/core/now";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { useEntries } from "@/lib/kalender/store";
import { filterChips, type Filter } from "@/lib/region/kategorien";
import { hatEintraege14Tage, nachTagen, tagTitel, type RegionEvent, type Reiter } from "@/lib/region/model";
import { wohnortName } from "@/lib/region/orte";
import { inDenKalender, istEingetragen, useWasLosEinstellungen, useWasLosListe } from "@/lib/region/client";
import { Eingetragen, Quellenzeile, WasLosFahne, WasLosZeile } from "@/components/region/WasLosTeile";
import { WasLosDetail } from "@/components/region/WasLosDetail";

const REITER: { value: Reiter; label: string }[] = [
  { value: "heute", label: "Heute" },
  { value: "wochenende", label: "Wochenende" },
  { value: "zwei", label: "2 Wochen" },
];

/** Gar nichts in den nächsten 14 Tagen im Umkreis */
const NICHTS_IN_DER_NAEHE = "Gerade nichts in deiner Nähe.";

const LEER: Record<Reiter, string> = {
  heute: "Heute ist nichts eingetragen. Schau mal aufs Wochenende.",
  wochenende: "Fürs Wochenende ist noch nichts eingetragen.",
  zwei: "In den nächsten zwei Wochen ist nichts eingetragen.",
};

export function WasLosFenster({ onClose, start = "heute" }: { onClose: () => void; start?: Reiter }) {
  const liste = useWasLosListe();
  const einstellungen = useWasLosEinstellungen();
  const haushalt = useHaushalt();
  const entries = useEntries();
  const day = useToday();
  const minutes = useMinutes();
  const heute = day ? toIsoDate(day) : todayIso();
  const [reiter, setReiter] = useState<Reiter>(start);
  const [filter, setFilter] = useState<Filter>("alles");
  const [detail, setDetail] = useState<{ event: RegionEvent; tag: string } | null>(null);
  const [ergebnis, setErgebnis] = useState<{ id: string; eventId: string; titel: string; tag: string; undo: () => void } | null>(null);
  const ort = liste ? wohnortName(liste.ort) : "";
  const gruppen = liste ? nachTagen(liste.events, reiter, heute, minutes ?? 0, reiter === "heute" ? "alles" : filter) : [];
  const chips = filterChips(haushalt, einstellungen.kategorienAus);
  const eintragen = (event: RegionEvent, tag: string) => {
    const r = inDenKalender(event, tag);
    if (r) setErgebnis({ id: r.entry.id, eventId: event.id, titel: event.titel, tag, undo: r.undo });
  };

  const kopf = (
    <div className="flex items-start gap-3">
      <WasLosFahne />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="text-[22px] font-extrabold leading-tight tracking-tight">Was ist los in {ort || "deiner Nähe"}?</h2>
        <p className="text-[14px] font-semibold text-muted">Veranstaltungen · bis {einstellungen.umkreis} km</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Schließen" className={ICON_BUTTON}>
        <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );

  return (
    <>
      <Sheet title={`Was ist los in ${ort || "deiner Nähe"}?`} onClose={onClose} header={kopf} tall>
        <div className="flex flex-col gap-3 pb-2" data-was-los-fenster>
          <Segmented value={reiter} options={REITER} onChange={setReiter} label="Zeitraum" />
          {reiter !== "heute" && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
              {chips.map((c) => (
                <button key={c.id} type="button" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)} className={chipClass(filter === c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
          {liste === undefined ? (
            <div className="h-40 animate-pulse rounded-card bg-fill" aria-hidden />
          ) : gruppen.length === 0 ? (
            <p className="rounded-card bg-fill px-4 py-5 text-[15px] text-muted" data-leer>
              {/* Baustein an, aber in 14 Tagen nichts im Umkreis (A-063): freundlich statt Kreis verstecken */}
              {!hatEintraege14Tage(liste.events, heute, minutes ?? 0) ? NICHTS_IN_DER_NAEHE : filter !== "alles" && reiter !== "heute" ? "Dazu ist gerade nichts eingetragen." : LEER[reiter]}
            </p>
          ) : (
            gruppen.map((g) => (
              <section key={g.tag} className="flex flex-col" aria-label={tagTitel(g.tag, heute)}>
                <h3 className="pt-1 text-[13px] font-extrabold uppercase tracking-wider text-waslos">{tagTitel(g.tag, heute)}</h3>
                <ul className="flex flex-col divide-y divide-line">
                  {g.events.map((e) => (
                    <li key={e.id}>
                      <WasLosZeile event={e} eingetragen={istEingetragen(e.id, entries)} onOeffnen={() => setDetail({ event: e, tag: g.tag })} onKalender={() => eintragen(e, g.tag)} />
                      {/* Ergebnis-Karte direkt unter der Zeile – auch weiter unten in der Liste sichtbar */}
                      {ergebnis?.eventId === e.id && <div className="pb-3"><Eingetragen key={ergebnis.id} titel={ergebnis.titel} tag={ergebnis.tag} onUndo={() => (ergebnis.undo(), setErgebnis(null))} /></div>}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
          <Quellenzeile quelle={liste?.quelle} />
        </div>
      </Sheet>
      {detail && <WasLosDetail event={detail.event} tag={detail.tag} quelle={liste?.quelle} onClose={() => setDetail(null)} />}
    </>
  );
}
