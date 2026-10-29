"use client";

// Kleine Teile für „Was los?“ (Tafel 142): Fahne, Zeile der Liste (Uhrzeit
// links, Titel ganz – nie „…“ –, Ort mit Ortssymbol, Schild „für Kinder“,
// runder Kalender-Knopf rechts), Ergebnis-Karte „Eingetragen“ mit
// Rückgängig (10 s) und die Quellenzeile.

import { useEffect, useState } from "react";
import { CalendarDays, CalendarPlus, Check, ChevronRight, Flag, MapPin } from "lucide-react";
import { chipClass } from "@/components/ui/styles";
import { raumLabel } from "@/lib/core/haushalt";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { KREIS_SEITE, OHNE_GEWAEHR, quellenZeile, tagKurz, zeitSpalte, type RegionEvent, type RegionQuelle } from "@/lib/region/model";

/** Runde Fahne in Blau (Kopf des Fensters, Mini-Kreis) */
export function WasLosFahne({ size = 44 }: { size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-waslos-soft text-waslos" style={{ width: size, height: size }} aria-hidden>
      <Flag className="h-[48%] w-[48%]" strokeWidth={2} />
    </span>
  );
}

/** Eine Veranstaltung in der Liste */
export function WasLosZeile({ event, eingetragen, onOeffnen, onKalender }: { event: RegionEvent; eingetragen: boolean; onOeffnen: () => void; onKalender: () => void }) {
  const kinder = event.kategorien.includes("kinder");
  return (
    <div className="flex items-center gap-2 py-3" data-waslos-zeile={event.id}>
      <button type="button" onClick={onOeffnen} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-label={`${event.titel}, ${zeitSpalte(event)}${event.ort ? `, ${event.ort}` : ""}`}>
        <span className="w-[4.4rem] shrink-0 pt-0.5 text-[15px] font-extrabold tabular-nums text-waslos">{zeitSpalte(event)}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-bold leading-snug text-ink">{event.titel}</span>
          {(event.ort || event.bis_datum) && (
            <span className="flex items-start gap-1 text-[13.5px] font-semibold leading-snug text-muted">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              <span>
                {event.ort}
                {event.bis_datum ? `${event.ort ? " · " : ""}bis ${tagKurz(event.bis_datum)}` : ""}
              </span>
            </span>
          )}
          {kinder && <FuerKinder />}
        </span>
      </button>
      <button
        type="button"
        onClick={onKalender}
        disabled={eingetragen}
        aria-label={eingetragen ? `${event.titel} steht im Kalender` : `${event.titel} in den Kalender`}
        className={`hit flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${eingetragen ? "bg-good-soft text-good-ink" : "bg-waslos-soft text-waslos"}`}
        data-kalender-knopf
      >
        {eingetragen ? <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden /> : <CalendarPlus className="h-5 w-5" strokeWidth={2} aria-hidden />}
      </button>
    </div>
  );
}

/** Schild „für Kinder“ (grün, ohne Emoji) */
export function FuerKinder() {
  return <span className="mt-0.5 self-start rounded-full bg-good-soft px-2 py-0.5 text-[12px] font-bold text-good-ink">für Kinder</span>;
}

/** Ergebnis-Karte nach dem Eintragen: „Eingetragen“, Termin · Familie, Rückgängig (10 s) */
export function Eingetragen({ titel, tag, onUndo }: { titel: string; tag: string; onUndo: () => void }) {
  const haushalt = useHaushalt();
  const [undo, setUndo] = useState(true);
  const [weg, setWeg] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setUndo(false), 10_000);
    return () => window.clearTimeout(t);
  }, []);
  if (weg) return null;
  return (
    <section className="flex flex-col gap-2" aria-label="Eingetragen" data-ergebnis-eingetragen>
      <div className="flex items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3 shadow-card">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-waslos-soft text-waslos" aria-hidden>
          <CalendarDays className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-bold leading-snug">{titel}</span>
          <span className="text-[13px] font-semibold text-muted">
            Termin · {raumLabel("familie", haushalt)} · {tagKurz(tag)}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-good-pill px-2.5 py-1 text-[13px] font-bold text-on-good-pill">
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
          Eingetragen
        </span>
      </div>
      {undo && (
        <button
          type="button"
          onClick={() => {
            onUndo();
            setWeg(true);
          }}
          className={`${chipClass(false, "muted")} self-start`}
        >
          Rückgängig
        </button>
      )}
    </section>
  );
}

/** Unten im Fenster: „Quelle: Kreis Ostholstein · kreis-oh.de ›“ */
export function Quellenzeile({ quelle, gewaehr = false }: { quelle: RegionQuelle | undefined; gewaehr?: boolean }) {
  return (
    <p className="flex flex-col items-center gap-0.5 px-1 pb-1 text-center text-[13px] text-muted" data-quelle>
      <a href={KREIS_SEITE} target="_blank" rel="noopener noreferrer" className="hit inline-flex items-center gap-0.5 font-semibold">
        {quellenZeile(quelle)}
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </a>
      {gewaehr && <span>{OHNE_GEWAEHR}</span>}
    </p>
  );
}
