"use client";

// Kopf im Bearbeiten-Modus (sticky): links „+ Kachel“ (öffnet die Auswahl),
// rechts „Fertig“, darunter der Titel und der Hinweis. Beim allerersten
// Bearbeiten einmal Mias kleine Sprechblase unter „+ Kachel“ – weg bei jedem
// Tipp oder nach 6 s, danach nie wieder.

import { useEffect } from "react";
import { Plus } from "lucide-react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";

const HINT_MS = 6000;

export function EditHeader({ onAdd, onDone }: { onAdd: () => void; onDone: () => void }) {
  const seen = useHintSeen("kachel-hinzufuegen");
  const showHint = seen === false;
  useEffect(() => {
    if (!showHint) return;
    const hide = () => markHintSeen("kachel-hinzufuegen");
    const timer = window.setTimeout(hide, HINT_MS);
    document.addEventListener("pointerdown", hide, { once: true });
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", hide);
    };
  }, [showHint]);
  return (
    <header className="sticky top-0 z-20 -mx-4 flex flex-col gap-1 bg-background/95 px-4 pb-2 pt-1 backdrop-blur" aria-label="Startseite bearbeiten">
      <div className="relative flex items-center justify-between gap-3">
        <button type="button" onClick={onAdd} className="flex min-h-11 items-center gap-1.5 rounded-full bg-accent-soft px-4 text-sm font-bold text-accent-strong active:scale-95">
          <Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden />
          Kachel
        </button>
        <button type="button" onClick={onDone} className="h-10 rounded-full bg-accent px-5 text-sm font-bold text-on-accent active:scale-95">
          Fertig
        </button>
        {showHint && (
          <div className="absolute left-0 top-full z-30 mt-2 flex max-w-[260px] items-start gap-2" role="status" data-keep-edit>
            <BegleitungAvatar size={28} />
            <p className="rounded-card rounded-tl-md border border-line bg-surface px-3 py-2 text-[13.5px] font-semibold leading-snug shadow-card">Hier holst du neue Kacheln dazu – z. B. Timer oder Sport.</p>
          </div>
        )}
      </div>
      <h1 className="text-[24px] font-extrabold leading-tight tracking-tight">Startseite bearbeiten</h1>
      <p className="text-sm text-muted">Festhalten &amp; ziehen · Danebentippen = fertig</p>
    </header>
  );
}
