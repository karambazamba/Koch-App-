"use client";

// Rätsel-Fenster (A-052, Tafel 137 Bild 4): kommt von unten (ui/Sheet),
// schließt per ✕, Runterwischen, Danebentippen und Zurück. Kopf mit rundem
// Symbol, „Rätsel“ und „Kinder raten zuerst“. Die Frage groß (27 px),
// darunter verdeckt „Antippen für die Lösung“; erst Antippen zeigt die Lösung
// im gestrichelten Kasten (A-059, Tafel 145). „Noch eins ›“ bringt beliebig
// oft das nächste (vor dem Aufdecken hell, aber tippbar), darunter „Antippen
// zeigt die Lösung · nie doppelt“. Nichts Ungesehenes mehr: „Neue Rätsel kommen bald.“ – nie eine
// Wiederholung. Kein Zähler, keine Punkte. Den Mini-Kreis auf der Startseite
// baut Paket A und öffnet dieses Fenster; bis dahin öffnet es „Für Entwickler“.

import { useEffect } from "react";
import { ChevronRight, Puzzle, RotateCw, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { ICON_BUTTON, buttonClass } from "@/components/ui/styles";
import { buzz } from "@/components/heute/actions";
import { raetselVon } from "@/lib/raetsel/auswahl";
import { raetselLoesen, raetselNoch, raetselOeffnen, useRaetsel } from "@/lib/raetsel/store";
import { ANTIPPEN, antwortTeile } from "@/lib/wundertuete/sorten";

const RAETSEL_KOMMEN_BALD = "Neue Rätsel kommen bald.";

export function RaetselFenster({ onClose }: { onClose: () => void }) {
  const stand = useRaetsel();
  useEffect(() => raetselOeffnen(), []);
  const raetsel = stand ? raetselVon(stand, stand.aktuell?.id) : undefined;
  const geloest = Boolean(stand?.aktuell?.geloest);
  const kopf = (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden>
        <Puzzle className="h-[22px] w-[22px]" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-extrabold tracking-tight">Rätsel</h2>
        <p className="text-[14px] text-muted">Kinder raten zuerst</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Schließen" className={ICON_BUTTON}>
        <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
  return (
    <Sheet title="Rätsel" onClose={onClose} header={kopf}>
      <div className="flex flex-col gap-5 pb-2 pt-2" data-raetsel-fenster>
        {!stand ? (
          <div className="h-40 animate-pulse rounded-card bg-fill" />
        ) : raetsel ? (
          <button
            type="button"
            className="wt-neu flex flex-col gap-4 text-left"
            key={raetsel.id}
            onClick={() => {
              if (geloest) return;
              buzz();
              raetselLoesen();
            }}
            aria-label={geloest ? `${raetsel.vorne} Lösung: ${raetsel.hinten?.replace(/\*\*/g, "")}` : `${raetsel.vorne} Antippen zeigt die Lösung`}
            data-raetsel={raetsel.id}
            data-geloest={geloest || undefined}
          >
            <span className="text-[27px] font-extrabold leading-tight tracking-tight hyphens-none" lang="de" data-frage>
              {raetsel.vorne}
            </span>
            {!geloest && raetsel.hinten && (
              <span className="flex min-h-24 items-center justify-center gap-2 rounded-card border-2 border-dashed border-accent/40 px-4 py-3 text-[17px] font-bold text-accent-strong" data-verdeckt>
                <RotateCw className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} aria-hidden />
                {ANTIPPEN}
              </span>
            )}
            {geloest && raetsel.hinten && (
              <span className="wt-neu rounded-card border-2 border-dashed border-accent/40 px-4 py-3" data-loesung>
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-accent-strong">Lösung</span>
                <span className="mt-1 block text-[22px] font-bold leading-snug text-accent-strong">
                  {antwortTeile(raetsel.hinten).map((t, i) => (t.fett ? <strong key={i} className="font-extrabold">{t.text}</strong> : <span key={i}>{t.text}</span>))}
                </span>
              </span>
            )}
          </button>
        ) : (
          <p className="py-6 text-[22px] font-extrabold leading-snug" data-kommt-bald>
            {RAETSEL_KOMMEN_BALD}
          </p>
        )}
        <button type="button" className={`${buttonClass("primary", "lg")} w-full transition-opacity ${raetsel && !geloest ? "opacity-45" : ""}`} onClick={() => (buzz(), raetselNoch())} data-noch-eins data-hell={(raetsel && !geloest) || undefined}>
          Noch eins <ChevronRight className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </button>
        <p className="text-center text-[14px] font-bold text-accent-strong">Antippen zeigt die Lösung · nie doppelt</p>
      </div>
    </Sheet>
  );
}
