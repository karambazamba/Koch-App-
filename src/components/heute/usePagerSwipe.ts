"use client";

// Wischen zwischen Kalender · Heute · Essen wie in einer iPhone-App: Die Seite
// folgt dem Finger 1:1, die Nachbarseite schaut am Rand herein. Die Richtung
// wird früh und einmal pro Geste festgelegt (`swipeAxis`: ab 6 px, waagerecht
// erst bei |dx| > 1,2 · |dy|) und bleibt dann fest. Waagerecht steht die Seite
// senkrecht still (Scrollhöhe gesperrt, senkrechter Fingeranteil zählt nicht),
// senkrecht gibt es kein seitliches Wischen. Dazu `touch-action: pan-y` am
// Pager und `overscroll-behavior-y: none` an html/body (kein Gummiband). Loslassen: Wechsel ab 25 % der
// Breite oder bei schnellem Wisch (> 0,35 px/ms), sonst federt die Seite
// zurück; am Rand gedämpft (Gummiband). Bewegt wird nur per transform direkt
// am Element (kein React-Rendern während des Wischens).
// A-059: Gewechselt wird nur bei einem klaren Seitenwisch (`heute/seitenWisch`:
// nicht vom unteren Rand, nicht vom linken Rand, |dx| ≥ 2·|dy|, ≥ 60 px);
// ein abgebrochener Wisch (touchcancel, z. B. App schließen) federt immer
// zurück. Geht die App binnen 500 ms nach einem Wisch-Wechsel in den
// Hintergrund, wird der Wechsel zurückgenommen.

import { useEffect, useRef } from "react";
import { seitenWisch, wischStartErlaubt, wischZuruecknehmen } from "@/lib/heute/seitenWisch";

const PAGER_MS = 280;
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";
const LOCK_PX = 6;
const AXIS_RATIO = 1.2;
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

/** Richtung einer Geste (rein): erst ab 6 px, waagerecht nur eindeutig – danach fest @public */
export function swipeAxis(mx: number, my: number): "none" | "x" | "y" {
  if (Math.abs(mx) < LOCK_PX && Math.abs(my) < LOCK_PX) return "none";
  return Math.abs(mx) > AXIS_RATIO * Math.abs(my) ? "x" : "y";
}

/** Senkrechtes Scrollen während des waagerechten Wischens sperren (Scrollhöhe bleibt) */
function lockScroll(): () => void {
  const y = window.scrollY;
  const html = document.documentElement;
  const before = html.style.overflow;
  html.style.overflow = "hidden";
  const hold = () => {
    if (window.scrollY !== y) window.scrollTo(0, y);
  };
  window.addEventListener("scroll", hold, { passive: true });
  return () => {
    window.removeEventListener("scroll", hold);
    html.style.overflow = before;
    hold();
  };
}

/** Safe-Area unten in px (Home-Indikator), einmal gemessen */
let safeUntenPx: number | null = null;
function safeUnten(): number {
  if (safeUntenPx !== null) return safeUntenPx;
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom)";
  document.body.appendChild(probe);
  safeUntenPx = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return safeUntenPx;
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
    /** Fingerweg ohne Gummiband (für die Entscheidung „klarer Seitenwisch“) */
    let roh = { dx: 0, dy: 0 };
    /** Letzter Wechsel per Wischen: wann (Zeitstempel des Loslassens), welche Richtung, Animation noch unterwegs */
    let wisch: { am: number; step: -1 | 1; timer: number | null } | null = null;
    let samples: { x: number; t: number }[] = [];
    let busy = false;
    let unlock: (() => void) | null = null;
    const release = () => {
      unlock?.();
      unlock = null;
    };
    const width = () => window.innerWidth;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      // Nicht vom unteren Rand (App schließen) und nicht vom linken Rand (Zurück)
      if (busy || e.touches.length > 1 || ignoreSwipe(e.target) || !wischStartErlaubt(t.clientX, t.clientY, window.innerHeight, safeUnten())) {
        start = null;
        return;
      }
      h.current.warm();
      start = { x: t.clientX, y: t.clientY };
      mode = "none";
      dx = 0;
      roh = { dx: 0, dy: 0 };
      samples = [{ x: start.x, t: e.timeStamp }];
    };
    const onMove = (e: TouchEvent) => {
      if (!start || mode === "y") return;
      const t = e.touches[0];
      const mx = t.clientX - start.x;
      const my = t.clientY - start.y;
      roh = { dx: mx, dy: my };
      if (mode === "none") {
        mode = swipeAxis(mx, my);
        if (mode !== "x") return;
        unlock = lockScroll();
        h.current.prepare();
      }
      // Waagerecht: nur dx zählt, die Seite bleibt senkrecht stehen
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
    /** Zurückfedern ohne Wechsel */
    const springBack = (p: ReturnType<Handles["panels"]>) => {
      if (reduced()) return;
      busy = true;
      placePanels(p, 0, width(), true);
      h.current.progress(0, true);
      window.setTimeout(() => {
        placePanels(p, 0, width(), false);
        busy = false;
      }, PAGER_MS);
    };
    const onEnd = (e: TouchEvent) => {
      release();
      if (!start || mode !== "x") {
        start = null;
        return;
      }
      const von = start;
      start = null;
      // Abgebrochen (z. B. App schließen) oder kein klarer Seitenwisch: nie wechseln
      if (e.type === "touchcancel" || !seitenWisch({ x: von.x, y: von.y, dx: roh.dx, dy: roh.dy, hoehe: window.innerHeight, safeUnten: safeUnten() })) {
        springBack(h.current.panels());
        return;
      }
      const recent = samples.filter((s) => e.timeStamp - s.t < 120);
      const first = recent[0] ?? samples[0];
      const last = samples[samples.length - 1];
      const velocity = last && first && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
      const p = h.current.panels();
      const step = swipeDecision(dx, velocity, width(), Boolean(p.prev), Boolean(p.next));
      if (step) wisch = { am: e.timeStamp, step, timer: null };
      if (reduced()) {
        if (step) h.current.commit(step);
        return;
      }
      if (!step) return springBack(p);
      busy = true;
      placePanels(p, -step * width(), width(), true);
      h.current.progress(step, true);
      const w = wisch;
      const timer = window.setTimeout(() => {
        if (w) w.timer = null;
        h.current.commit(step);
        busy = false;
      }, PAGER_MS);
      if (w) w.timer = timer;
    };
    // App direkt nach dem Wisch in den Hintergrund = Schließen, kein Seitenwechsel: zurück zur vorherigen Seite
    const onHidden = (e: Event) => {
      if (document.visibilityState !== "hidden" || !wisch) return;
      const w = wisch;
      wisch = null;
      if (!wischZuruecknehmen(w.am, e.timeStamp)) return;
      if (w.timer !== null) {
        // Animation noch unterwegs: gar nicht erst wechseln
        window.clearTimeout(w.timer);
        placePanels(h.current.panels(), 0, width(), false);
        busy = false;
        return;
      }
      h.current.commit(w.step === 1 ? -1 : 1);
    };
    document.addEventListener("visibilitychange", onHidden);
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      release();
      document.removeEventListener("visibilitychange", onHidden);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [root, enabled]);
}
