"use client";

// Einmal-Tipp beim allerersten Bearbeiten der Startseite: Abdunklung über den
// ganzen Bildschirm, „+ Kachel“ hervorgehoben darüber (an der Stelle des
// echten Knopfs), darunter eine weiße Karte mit Spitze genau zur Mitte des
// Knopfs. „Verstanden“ oder ein Tipp auf die Abdunklung schließt; ein Tipp
// auf „+ Kachel“ schließt und öffnet sofort die Auswahl. Ein- und Ausblenden
// ~200 ms (ohne Bewegung bei „Bewegung reduzieren“).

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { useBackCloses } from "@/lib/core/useBackCloses";

const FADE_MS = 200;
const EDGE = 16;
const GAP = 14;
const ARROW = 16;

type Rect = { top: number; left: number; width: number; height: number };

/** Lage des echten Knopfs (folgt Drehen, Größe und Scrollen) */
function useAnchorRect(anchor: RefObject<HTMLElement | null>): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (r) setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [anchor]);
  return rect;
}

export function AddTileTip({ anchor, onClose, onAdd }: { anchor: RefObject<HTMLElement | null>; onClose: () => void; onAdd: () => void }) {
  const rect = useAnchorRect(anchor);
  const [shown, setShown] = useState(false);
  const leaving = useRef(false);
  const ok = useRef<HTMLButtonElement>(null);

  // Einblenden im nächsten Bild, Fokus zuerst auf „Verstanden“
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (rect) ok.current?.focus({ preventScroll: true });
  }, [rect]);

  const close = (then?: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    setShown(false);
    then?.();
    window.setTimeout(onClose, FADE_MS);
  };

  // Zurück-Geste und Escape schließen wie „Verstanden“
  useBackCloses(() => close());
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!rect) return null;
  const centerX = rect.left + rect.width / 2;
  // Spitze auf die Knopf-Mitte, aber innerhalb der runden Ecken der Karte
  const arrowLeft = Math.max(22, centerX - EDGE - ARROW / 2);

  // Über ein Portal an <body>: der Kopf (backdrop-blur) würde `fixed` sonst an sich binden
  return createPortal(
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ease-out motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
      data-keep-edit
      data-no-swipe
      data-no-longpress
    >
      <button type="button" aria-label="Tipp schließen" tabIndex={-1} onClick={() => close()} className="absolute inset-0 h-full w-full cursor-default bg-tip-scrim" />

      {/* „+ Kachel“ über der Abdunklung, genau über dem echten Knopf */}
      <button
        type="button"
        onClick={() => close(onAdd)}
        className="absolute flex items-center justify-center gap-1.5 rounded-full border-4 border-on-accent bg-accent text-sm font-bold text-on-accent active:scale-95"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: "0 0 26px 8px color-mix(in srgb, var(--app-accent) 55%, transparent)",
        }}
      >
        <Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden />
        Kachel
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tipp-kacheln-titel"
        aria-describedby="tipp-kacheln-text"
        className="absolute rounded-pair bg-surface px-6 pb-6 pt-7 text-center shadow-card"
        style={{ top: rect.top + rect.height + GAP, left: EDGE, right: EDGE }}
      >
        <span aria-hidden className="absolute -top-2 h-4 w-4 rotate-45 bg-surface" style={{ left: arrowLeft }} />
        <h2 id="tipp-kacheln-titel" className="text-[24px] font-extrabold leading-tight tracking-tight">
          Neue Kacheln holen
        </h2>
        <p id="tipp-kacheln-text" className="mt-2 text-[17px] leading-snug">
          Tippe auf <strong className="font-extrabold text-tip-ink">+ Kachel</strong>, um zum Beispiel einen Timer oder deinen Sport hinzuzufügen.
        </p>
        <button ref={ok} type="button" onClick={() => close()} className="mt-5 h-[52px] w-full rounded-full bg-accent text-[17px] font-bold text-on-accent active:scale-[0.98]">
          Verstanden
        </button>
      </div>
    </div>,
    document.body,
  );
}
