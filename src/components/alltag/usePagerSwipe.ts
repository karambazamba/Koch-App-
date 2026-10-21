"use client";

// Wischen zwischen Kalender · Heute · Essen wie in einer iPhone-App: Die Seite
// folgt dem Finger 1:1, die Nachbarseite schaut am Rand herein. Die Richtung
// wird einmal pro Geste festgelegt (> 10 px, mehr waagerecht als senkrecht) –
// senkrechtes Scrollen bleibt unberührt. Loslassen: Wechsel ab 25 % der
// Breite oder bei schnellem Wisch (> 0,35 px/ms), sonst federt die Seite
// zurück; am Rand gedämpft (Gummiband). Bewegt wird nur per transform direkt
// am Element (kein React-Rendern während des Wischens).

import { useEffect, useRef } from "react";

export const PAGER_MS = 280;
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";
const LOCK_PX = 10;
const SWITCH_SHARE = 0.25;
const FLING_SPEED = 0.35;

/** Wischen nur außerhalb von Feldern, markierten Bereichen und Fenstern */
const ignoreSwipe = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable], [data-no-swipe], [role=dialog]"));

/** Reine Entscheidung beim Loslassen: -1 = Seite links, 1 = Seite rechts, 0 = zurückfedern @public */
export function swipeDecision(dx: number, velocity: number, width: number, canPrev: boolean, canNext: boolean): -1 | 0 | 1 {
  const far = Math.abs(dx) > width * SWITCH_SHARE;
  const fast = Math.abs(velocity) > FLING_SPEED && Math.sign(velocity) === Math.sign(dx);
  if (!far && !fast) return 0;
  if (dx < 0 && canNext) return 1;
  if (dx > 0 && canPrev) return -1;
  return 0;
}

/** Gummiband am Rand: Bewegung gedämpft */
const rubber = (dx: number, width: number) => (dx * width * 0.35) / (width + Math.abs(dx) * 0.6);

type Handles = {
  /** Aktuelle Seite, Nachbar links/rechts (null = Rand) */
  panels: () => { current: HTMLElement | null; prev: HTMLElement | null; next: HTMLElement | null };
  /** Nachbarn auf ihre gemerkte Scrollhöhe legen (vor dem Herein-Schauen) */
  prepare: () => void;
  /** Segment-Schalter mitführen (Anteil einer Seite, -1 … 1) */
  progress: (share: number, animate: boolean) => void;
  /** Wechsel festschreiben (nach der Animation) */
  commit: (step: -1 | 1) => void;
  /** Etwas anfassen → Nachbarn rendern lassen */
  warm: () => void;
};

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Seiten verschieben (aktuelle um dx, Nachbarn daneben) */
function placePanels(h: ReturnType<Handles["panels"]>, dx: number, width: number, animate: boolean) {
  const set = (el: HTMLElement | null, x: number) => {
    if (!el) return;
    el.style.transition = animate ? `transform ${PAGER_MS}ms ${EASE}` : "none";
    el.style.transform = x ? `translate3d(${x}px,0,0)` : "";
  };
  set(h.current, dx);
  set(h.prev, dx - width);
  set(h.next, dx + width);
  for (const el of [h.prev, h.next]) if (el) el.style.visibility = dx || animate ? "visible" : "";
}

/** Gleitender Wechsel (auch für Tippen auf den Schalter) */
export function slideTo(handles: Handles, step: -1 | 1, onDone?: () => void) {
  const width = window.innerWidth;
  const p = handles.panels();
  if (reduced() || !(step < 0 ? p.prev : p.next)) {
    handles.commit(step);
    onDone?.();
    return;
  }
  handles.prepare();
  placePanels(p, 0, width, false);
  // erst im nächsten Bild starten, damit die Ausgangslage steht
  requestAnimationFrame(() => {
    placePanels(p, -step * width, width, true);
    handles.progress(step, true);
    window.setTimeout(() => {
      handles.commit(step);
      onDone?.();
    }, PAGER_MS);
  });
}

export function usePagerSwipe(root: React.RefObject<HTMLElement | null>, handles: Handles, enabled: boolean) {
  const h = useRef(handles);
  useEffect(() => {
    h.current = handles;
  });
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled) return;
    let start: { x: number; y: number } | null = null;
    let mode: "none" | "x" | "y" = "none";
    let dx = 0;
    let samples: { x: number; t: number }[] = [];
    let busy = false;
    const width = () => window.innerWidth;

    const onStart = (e: TouchEvent) => {
      if (busy || e.touches.length > 1 || ignoreSwipe(e.target)) {
        start = null;
        return;
      }
      h.current.warm();
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      mode = "none";
      dx = 0;
      samples = [{ x: start.x, t: e.timeStamp }];
    };
    const onMove = (e: TouchEvent) => {
      if (!start || mode === "y") return;
      const t = e.touches[0];
      const mx = t.clientX - start.x;
      const my = t.clientY - start.y;
      if (mode === "none") {
        if (Math.abs(mx) < LOCK_PX && Math.abs(my) < LOCK_PX) return;
        if (Math.abs(mx) <= Math.abs(my)) {
          mode = "y";
          return;
        }
        mode = "x";
        h.current.prepare();
      }
      e.preventDefault();
      samples.push({ x: t.clientX, t: e.timeStamp });
      if (samples.length > 6) samples.shift();
      const p = h.current.panels();
      const edge = (mx > 0 && !p.prev) || (mx < 0 && !p.next);
      dx = edge ? rubber(mx, width()) : mx;
      if (reduced()) return;
      placePanels(p, dx, width(), false);
      h.current.progress(edge ? 0 : -dx / width(), false);
    };
    const onEnd = (e: TouchEvent) => {
      if (!start || mode !== "x") {
        start = null;
        return;
      }
      start = null;
      const recent = samples.filter((s) => e.timeStamp - s.t < 120);
      const first = recent[0] ?? samples[0];
      const last = samples[samples.length - 1];
      const velocity = last && first && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
      const p = h.current.panels();
      const step = swipeDecision(dx, velocity, width(), Boolean(p.prev), Boolean(p.next));
      if (reduced()) {
        if (step) h.current.commit(step);
        return;
      }
      busy = true;
      if (!step) {
        placePanels(p, 0, width(), true);
        h.current.progress(0, true);
        window.setTimeout(() => {
          placePanels(p, 0, width(), false);
          busy = false;
        }, PAGER_MS);
        return;
      }
      placePanels(p, -step * width(), width(), true);
      h.current.progress(step, true);
      window.setTimeout(() => {
        h.current.commit(step);
        busy = false;
      }, PAGER_MS);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [root, enabled]);
}
