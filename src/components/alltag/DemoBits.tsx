"use client";

// Beispiel-Tag: kleines "BEISPIEL"-Schild, das Fenster beim Antippen eines
// Beispiels und der Hinweis unten "Beispiele verschwinden, sobald du
// Eigenes einträgst. Jetzt leeren".

import { useState } from "react";
import { Sheet } from "@/components/plan/Sheet";
import type { DayItem } from "@/lib/aufgaben/model";
import { TaskQuickAdd } from "./TaskQuickAdd";
import { TerminQuickAdd } from "./TerminQuickAdd";
import { buttonClass } from "@/components/ui/styles";
import { clearDemo } from "@/lib/core/demo";

export function DemoBadge() {
  return <span className="rounded-md bg-demo px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wider text-demo-ink">BEISPIEL</span>;
}

/** Gestrichelter Rahmen um Beispiel-Inhalte */
export const DEMO_OUTLINE = "outline-[1.5px] outline-dashed outline-demo-line -outline-offset-[1.5px]";

export function DemoHint() {
  return (
    <div className="flex items-center gap-2 rounded-2xl border-[1.5px] border-demo-line bg-demo-soft px-3.5 py-2.5 text-[13px] font-semibold text-demo-ink" role="note">
      <span aria-hidden>✨</span>
      <span className="flex-1">Beispiele verschwinden, sobald du Eigenes einträgst.</span>
      <button type="button" onClick={clearDemo} className="hit shrink-0 font-extrabold text-quick-ink">
        Jetzt leeren
      </button>
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
