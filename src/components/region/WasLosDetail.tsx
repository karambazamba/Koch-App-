"use client";

// Detail einer Veranstaltung (Tafel 142/4): „SA 31. OKT · 17:00“, Titel groß,
// Ort. „In den Kalender“ (orange, sofort, Raum Familie) und „An die
// Pinnwand“ (Zettel „Sa 17:00 Nachtwächter-Rundgang · Wer kommt mit?“, so
// sieht ihn die Familie). „Mehr beim Kreis Ostholstein ›“ öffnet die
// Originalseite. Unten „Angaben vom Kreis Ostholstein, ohne Gewähr“.

import { useState } from "react";
import { CalendarPlus, Check, ChevronRight, MapPin, Pin, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { ICON_BUTTON, buttonClass } from "@/components/ui/styles";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { useEntries } from "@/lib/kalender/store";
import { pinnwandZettel, wannText, type RegionEvent, type RegionQuelle } from "@/lib/region/model";
import { anDiePinnwand, inDenKalender, istEingetragen } from "@/lib/region/client";
import { Eingetragen, FuerKinder, Quellenzeile } from "@/components/region/WasLosTeile";

export function WasLosDetail({ event, tag, quelle, onClose }: { event: RegionEvent; tag: string; quelle: RegionQuelle | undefined; onClose: () => void }) {
  const profile = useProfile();
  const entries = useEntries();
  const me = profile?.persons[0]?.name.trim() || "Ich";
  const [ergebnis, setErgebnis] = useState<{ id: string; undo: () => void } | null>(null);
  const [gepinnt, setGepinnt] = useState(false);
  const drin = istEingetragen(event.id, entries);
  const zettel = pinnwandZettel(event, tag);
  return (
    <Sheet
      title={event.titel}
      onClose={onClose}
      above
      header={
        <div className="flex justify-end">
          <button type="button" onClick={onClose} aria-label="Schließen" className={ICON_BUTTON}>
            <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-2" data-was-los-detail>
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-extrabold uppercase tracking-wider text-waslos">{wannText(event, tag)}</p>
          <h3 className="text-[26px] font-extrabold leading-tight tracking-tight">{event.titel}</h3>
          {event.ort && (
            <p className="flex items-start gap-1.5 text-[15px] text-ink">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
              <span>{event.ort}</span>
            </p>
          )}
          {event.kategorien.includes("kinder") && <FuerKinder />}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={drin}
            onClick={() => {
              const r = inDenKalender(event, tag);
              if (r) setErgebnis({ id: r.entry.id, undo: r.undo });
            }}
            className={`${buttonClass("primary", "md")} w-full whitespace-normal px-3 leading-tight`}
          >
            {drin ? <Check className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden /> : <CalendarPlus className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />}
            {drin ? "Im Kalender" : "In den Kalender"}
          </button>
          <button type="button" disabled={gepinnt} onClick={() => setGepinnt(anDiePinnwand(event, me, tag))} className={`${buttonClass("secondary", "md")} w-full whitespace-normal px-3 leading-tight`}>
            {gepinnt ? <Check className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden /> : <Pin className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />}
            {gepinnt ? "Hängt an der Pinnwand" : "An die Pinnwand"}
          </button>
        </div>
        {ergebnis && <Eingetragen key={ergebnis.id} titel={event.titel} tag={tag} onUndo={() => (ergebnis.undo(), setErgebnis(null))} />}
        <div className="flex flex-col gap-2 rounded-card bg-fill p-3.5">
          <p className="text-[13px] font-bold text-muted">Auf der Pinnwand sieht die Familie:</p>
          <p className="rounded-field px-3.5 py-3 text-[15px] font-bold leading-snug shadow-card" style={{ background: "var(--app-zettel-0)", color: "var(--app-fridge-ink)" }} data-zettel-vorschau>
            {zettel}
          </p>
        </div>
        {event.link && (
          <a href={event.link} target="_blank" rel="noopener noreferrer" className={`${buttonClass("secondary", "md")} w-full`} data-original-link>
            Mehr beim Kreis Ostholstein
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </a>
        )}
        <Quellenzeile quelle={quelle} gewaehr />
      </div>
    </Sheet>
  );
}
