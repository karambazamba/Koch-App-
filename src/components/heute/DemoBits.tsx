"use client";

// Beispiel-Tag: die Zeile oben („So sieht ein Tag aus · Eigenen starten“)
// und das Fenster beim Antippen eines Beispiels.

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import type { DayItem } from "@/lib/kalender/model";
import { TaskQuickAdd } from "@/components/kalender/TaskQuickAdd";
import { TerminQuickAdd } from "@/components/kalender/TerminQuickAdd";
import { CARD, buttonClass } from "@/components/ui/styles";
import { clearDemo, markDemoAsked } from "@/lib/core/demo";

export function DemoBadge() {
  return <span className="rounded-md bg-demo px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wider text-demo-ink">BEISPIEL</span>;
}

/**
 * Beispiel-Tag: EINE weiße Zeile oben über den Kacheln – „[BEISPIEL] So sieht
 * ein Tag aus · Eigenen starten“. Keine gestrichelten Rahmen, keine Schilder
 * an den Kacheln. Nach dem ersten Eigenen einmal „Alle Beispiele entfernen?“.
 */
export function DemoRow({ ask = false }: { ask?: boolean }) {
  return (
    <div className={`${CARD} flex min-h-11 items-center gap-2.5 px-3.5 py-2 text-[13.5px] font-semibold`} role="note" aria-label="Beispiel-Tag">
      <DemoBadge />
      {ask ? (
        <>
          <span className="min-w-0 flex-1">Alle Beispiele entfernen?</span>
          <button type="button" onClick={() => (markDemoAsked(), clearDemo())} className="hit shrink-0 font-extrabold text-accent-strong">
            Ja
          </button>
          <button type="button" onClick={markDemoAsked} className="hit ml-2 shrink-0 font-bold text-muted">
            Behalten
          </button>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate">So sieht ein Tag aus</span>
          <button type="button" onClick={clearDemo} className="hit shrink-0 font-extrabold text-accent-strong">
            Eigenen starten
          </button>
        </>
      )}
    </div>
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
  const [adding, setAdding] = useState(false);
  const termin = item.entry.typ === "termin";
  if (adding) return termin ? <TerminQuickAdd onClose={onClose} defaultDate={today} /> : <TaskQuickAdd onClose={onClose} />;
  return <DemoSheet title={item.title} addLabel={termin ? "Eigenen Termin eintragen" : "Eigene Aufgabe eintragen"} onAdd={() => setAdding(true)} onClose={onClose} />;
}
