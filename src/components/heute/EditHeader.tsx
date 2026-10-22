"use client";

// Kopf im Bearbeiten-Modus (sticky): links „+ Kachel“ (öffnet die Auswahl),
// rechts „Fertig“, darunter der Titel und der Hinweis. Beim allerersten
// Bearbeiten einmal der Tipp „Neue Kacheln holen“ (`AddTileTip`): Der Kopf
// liegt dann über der Abdunklung, nur der echte „+ Kachel“ bleibt hell und
// antippbar (alles andere lässt Tipps zur Abdunklung durch). Gesehen gilt
// beim Schließen (Merker „kachel-tipp“); Daten & App setzt das im Testmodus
// zurück.

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { AddTileTip } from "@/components/heute/AddTileTip";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";

const FADE_MS = 200;
const fadeMs = () => (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : FADE_MS);

export function EditHeader({ onAdd, onDone }: { onAdd: () => void; onDone: () => void }) {
  const seen = useHintSeen("kachel-tipp");
  const addButton = useRef<HTMLButtonElement>(null);
  // Einmal entscheiden, sobald der Speicher geladen ist – das Merken beim
  // Schließen darf die Entscheidung nicht mehr ändern
  const [tip, setTip] = useState<"zeigen" | "aus" | null>(null);
  if (tip === null && seen !== undefined) setTip(seen ? "aus" : "zeigen");
  const [shown, setShown] = useState(false);
  const leaving = useRef(false);
  useEffect(() => {
    if (tip !== "zeigen") return;
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [tip]);

  const open = tip === "zeigen";
  const lit = open && shown;
  /** Tipp schließen; mit `then` sofort (die Auswahl übernimmt den Verlaufseintrag) */
  const dismiss = (then?: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    markHintSeen("kachel-tipp");
    setShown(false);
    if (then) {
      setTip("aus");
      then();
      return;
    }
    window.setTimeout(() => {
      setTip("aus");
      addButton.current?.focus({ preventScroll: true });
    }, fadeMs());
  };

  return (
    <header
      className={`sticky top-0 -mx-4 flex flex-col gap-1 px-4 pb-2 pt-1 ${open ? "pointer-events-none z-[55]" : "z-20 bg-background/95 backdrop-blur"}`}
      aria-label="Startseite bearbeiten"
    >
      <div className="relative flex items-center justify-between gap-3">
        <button
          ref={addButton}
          type="button"
          onClick={open ? () => dismiss(onAdd) : onAdd}
          className={`pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-[background-color,color,box-shadow] duration-200 active:scale-95 motion-reduce:transition-none ${lit ? "bg-accent text-on-accent" : "bg-accent-soft text-accent-strong"}`}
          style={lit ? { boxShadow: "0 0 0 4px var(--app-tip-ring), 0 0 26px 8px color-mix(in srgb, var(--app-accent) 55%, transparent)" } : undefined}
        >
          <Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden />
          Kachel
        </button>
        <button
          type="button"
          onClick={onDone}
          inert={open}
          className={`h-10 rounded-full bg-accent px-5 text-sm font-bold text-on-accent transition-opacity duration-200 active:scale-95 motion-reduce:transition-none ${lit ? "opacity-30" : ""}`}
        >
          Fertig
        </button>
      </div>
      {/* Titel verschwindet unter der Karte (halb verdeckt wirkte er abgeschnitten) */}
      <div inert={open} className={`flex flex-col gap-1 transition-opacity duration-200 motion-reduce:transition-none ${lit ? "opacity-0" : ""}`}>
        <h1 className="text-[24px] font-extrabold leading-tight tracking-tight">Startseite bearbeiten</h1>
        <p className="text-sm text-muted">Festhalten &amp; ziehen · Irgendwo tippen = fertig</p>
      </div>
      {open && <AddTileTip anchor={addButton} shown={shown} onDismiss={() => dismiss()} />}
    </header>
  );
}
