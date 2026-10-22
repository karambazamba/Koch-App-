"use client";

// Kopf im Bearbeiten-Modus (sticky): links „+ Kachel“ (öffnet die Auswahl),
// rechts „Fertig“, darunter der Titel und der Hinweis. Beim allerersten
// Bearbeiten einmal der Tipp „Neue Kacheln holen“ (`AddTileTip`) – gleich beim
// Zeigen als gesehen gemerkt, danach nie wieder (Daten & App → „Tipps wieder
// zeigen“ setzt das zurück).

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { AddTileTip } from "@/components/heute/AddTileTip";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";

export function EditHeader({ onAdd, onDone }: { onAdd: () => void; onDone: () => void }) {
  const seen = useHintSeen("kachel-hinzufuegen");
  const addButton = useRef<HTMLButtonElement>(null);
  // Einmal entscheiden, sobald der Speicher geladen ist – das Merken unten
  // darf den offenen Tipp nicht wieder schließen
  const [tip, setTip] = useState<"zeigen" | "aus" | null>(null);
  if (tip === null && seen !== undefined) setTip(seen ? "aus" : "zeigen");
  useEffect(() => {
    if (tip === "zeigen") markHintSeen("kachel-hinzufuegen");
  }, [tip]);
  return (
    <header className="sticky top-0 z-20 -mx-4 flex flex-col gap-1 bg-background/95 px-4 pb-2 pt-1 backdrop-blur" aria-label="Startseite bearbeiten">
      <div className="relative flex items-center justify-between gap-3">
        <button ref={addButton} type="button" onClick={onAdd} className="flex min-h-11 items-center gap-1.5 rounded-full bg-accent-soft px-4 text-sm font-bold text-accent-strong active:scale-95">
          <Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden />
          Kachel
        </button>
        <button type="button" onClick={onDone} className="h-10 rounded-full bg-accent px-5 text-sm font-bold text-on-accent active:scale-95">
          Fertig
        </button>
      </div>
      <h1 className="text-[24px] font-extrabold leading-tight tracking-tight">Startseite bearbeiten</h1>
      <p className="text-sm text-muted">Festhalten &amp; ziehen · Danebentippen = fertig</p>
      {tip === "zeigen" && <AddTileTip anchor={addButton} onAdd={onAdd} onClose={() => setTip("aus")} />}
    </header>
  );
}
