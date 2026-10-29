"use client";

// Einmal-Tipp beim allerersten Bearbeiten der Startseite: Abdunklung über den
// ganzen Bildschirm, darunter eine Karte mit Spitze genau zur Mitte des echten
// „+ Kachel“ (den hebt `EditHeader` selbst über die Abdunklung – keine Kopie).
// Abdunklung, „Verstanden“, Zurück und Escape schließen; solange der Tipp offen
// ist, scrollt die Seite nicht und der Fokus bleibt zwischen „+ Kachel“ und
// „Verstanden“. Ein- und Ausblenden steuert `EditHeader` (`shown`).

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useBackCloses } from "@/lib/core/useBackCloses";

const EDGE = 16;
const GAP = 14;
const ARROW = 16;

type Rect = { top: number; left: number; width: number; height: number };

/** Lage des echten Knopfs – neu bei Größe, Drehen, Schrift und Safe-Area */
function useAnchorRect(anchor: RefObject<HTMLElement | null>): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (r) setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (anchor.current) observer.observe(anchor.current);
    observer.observe(document.documentElement);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [anchor]);
  return rect;
}

export function AddTileTip({ anchor, shown, onDismiss }: { anchor: RefObject<HTMLElement | null>; shown: boolean; onDismiss: () => void }) {
  const rect = useAnchorRect(anchor);
  const ok = useRef<HTMLButtonElement>(null);

  // Fokus zuerst auf „Verstanden“
  const hasRect = rect !== null;
  useEffect(() => {
    if (hasRect) ok.current?.focus({ preventScroll: true });
  }, [hasRect]);

  // Seite dahinter nicht scrollen
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  // Zurück-Geste und Escape schließen wie „Verstanden“; Tab bleibt im Tipp
  useBackCloses(onDismiss);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
      if (e.key !== "Tab") return;
      const stops = [anchor.current, ok.current].filter((el): el is HTMLElement => Boolean(el));
      const at = stops.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      stops[(at + (e.shiftKey ? stops.length - 1 : 1)) % stops.length]?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!rect) return null;
  const centerX = rect.left + rect.width / 2;
  // Spitze auf die Knopf-Mitte, aber innerhalb der runden Ecken der Karte
  const arrowLeft = Math.max(22, centerX - EDGE - ARROW / 2);

  const fade = `transition-opacity duration-200 ease-out motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`;
  // Über ein Portal an <body>: der Kopf (backdrop-blur) würde `fixed` sonst an
  // sich binden. Abdunklung unter dem Kopf (z-50 < z-[55]), Karte darüber.
  return createPortal(
    <div data-keep-edit data-no-swipe data-no-longpress>
      <button type="button" aria-label="Tipp schließen" tabIndex={-1} onClick={onDismiss} className={`fixed inset-0 z-50 h-full w-full cursor-default touch-none bg-tip-scrim ${fade}`} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tipp-kacheln-titel"
        aria-describedby="tipp-kacheln-text"
        className={`fixed z-[60] touch-none rounded-pair bg-surface px-6 pb-6 pt-7 text-center shadow-card ${fade}`}
        style={{ top: rect.top + rect.height + GAP, left: EDGE, right: EDGE }}
      >
        <span aria-hidden className="absolute -top-2 h-4 w-4 rotate-45 bg-surface" style={{ left: arrowLeft }} />
        <h2 id="tipp-kacheln-titel" className="text-[24px] font-extrabold leading-tight tracking-tight">
          Neue Kacheln holen
        </h2>
        <p id="tipp-kacheln-text" className="mt-2 text-[17px] leading-snug">
          Tippe auf <strong className="font-extrabold text-accent-strong">+ Kachel</strong>, um zum Beispiel „Im Haus“ oder deine Sport-Karte hinzuzufügen.
        </p>
        <button ref={ok} type="button" onClick={onDismiss} className="mt-5 h-[52px] w-full rounded-full bg-accent text-[17px] font-bold text-on-accent active:scale-[0.98]">
          Verstanden
        </button>
      </div>
    </div>,
    document.body,
  );
}
