"use client";

// Beispiel-Tag: der Streifen oben („Beispiel · tipp überall rein · Hinweise aus“)
// und das Fenster beim Antippen eines Beispiels.

import { Sheet } from "@/components/ui/Sheet";
import type { DayItem } from "@/lib/kalender/model";
import { buttonClass } from "@/components/ui/styles";
import { clearDemo, hinweiseAusblenden, markDemoAsked } from "@/lib/core/demo";
import { neuEintragen } from "@/lib/kalender/eintragen/oeffnen";

export function DemoBadge() {
  return <span className="rounded-md bg-demo px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wider text-demo-ink">BEISPIEL</span>;
}

/**
 * Beispiel-Tag: EIN Streifen oben unter dem Kopf (Tafel 150) – „Beispiel ·
 * tipp überall rein“ und rechts „Hinweise aus“ (blendet die grauen
 * Erklärsätze aus), danach „Eigenen starten“. Keine gestrichelten Rahmen,
 * keine Schilder an den Kacheln. Nach dem ersten Eigenen einmal „Alle
 * Beispiele entfernen?“.
 */
export function DemoRow({ ask = false, hinweise = false }: { ask?: boolean; hinweise?: boolean }) {
  return (
    <div className="flex min-h-11 items-center gap-2.5 rounded-field bg-fill px-3.5 py-1.5 text-[13.5px] font-semibold text-muted" role="note" aria-label="Beispiel-Tag" data-demo-streifen>
      {ask ? (
        <>
          <span className="min-w-0 flex-1 text-ink">Alle Beispiele entfernen?</span>
          <button type="button" onClick={() => (markDemoAsked(), clearDemo())} className="hit shrink-0 font-extrabold text-accent-strong">
            Ja
          </button>
          <button type="button" onClick={markDemoAsked} className="hit ml-2 shrink-0 font-bold text-muted">
            Behalten
          </button>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1">Beispiel · tipp überall rein</span>
          {hinweise ? (
            <button type="button" onClick={hinweiseAusblenden} className="hit shrink-0 font-extrabold text-accent-strong" data-hinweise-aus>
              Hinweise aus
            </button>
          ) : (
            <button type="button" onClick={clearDemo} className="hit shrink-0 font-extrabold text-accent-strong">
              Eigenen starten
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Grauer Erklärsatz unter Jetzt-Karte bzw. Kreisen (Tafel 150, nur in der Demo) */
export function DemoHinweis({ text }: { text: string }) {
  return (
    <p className="-mt-1.5 text-center text-[12.5px] leading-snug text-muted" data-demo-hinweis>
      {text}
    </p>
  );
}

/** Antippen eines Beispiels: kurz erklären, Eigenes eintragen oder alle Beispiele leeren */
function DemoSheet({ title, addLabel, onAdd, onClose }: { title: string; addLabel: string; onAdd: () => void; onClose: () => void }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="flex flex-col gap-3 pb-3">
        <p className="text-base leading-snug">Das ist nur ein Beispiel. Trag einfach Eigenes ein – dann verschwinden die Beispiele hier.</p>
        <button type="button" onClick={onAdd} className={buttonClass("primary", "lg")}>
          {addLabel}
        </button>
        <button type="button" onClick={() => (clearDemo(), onClose())} className={buttonClass("ghost", "md")}>
          Alle Beispiele leeren
        </button>
      </div>
    </Sheet>
  );
}

/** Beispiel-Termin bzw. -Aufgabe angetippt: erklären, dann gleich Eigenes eintragen */
export function DemoItemSheet({ item, today, onClose }: { item: DayItem; today: string; onClose: () => void }) {
  const termin = item.entry.typ === "termin";
  return <DemoSheet title={item.title} addLabel={termin ? "Eigenen Termin eintragen" : "Eigene Aufgabe eintragen"} onAdd={() => (onClose(), neuEintragen(termin ? "termin" : "aufgabe", termin ? today : undefined))} onClose={onClose} />;
}
