"use client";

// Welche Tagesphase die Startseite gerade zeigt. Die Phase wechselt nur beim
// Öffnen/Zurückkehren in die App oder nach 30 s ohne Berührung (nie während
// Tippen/Scrollen, nie im Bearbeiten-Modus) – bewusste Schritte ("Ich koche
// jetzt", Timer, "Gegessen ✓"), Vorschau und Umschalten wirken sofort.
// "Immer gleich" = keine Phase.

import { useEffect, useRef, useState } from "react";
import { PHASES, STEADY_VIEW, currentPhase, type PhaseContext, type PhaseDef, type PhaseId, type PhaseView } from "@/lib/tagesablauf/phases";
import { setShowAll, usePhaseNudge, useShowAll } from "@/lib/tagesablauf/nudge";
import type { DayRoutine, TimePreview } from "@/lib/tagesablauf/settings";

const IDLE_MS = 30_000;

type HomePhase = {
  /** null = "Immer gleich" oder "Alles zeigen" */
  def: PhaseDef | null;
  view: PhaseView;
  /** Die Phase, die eigentlich gilt (auch bei "Alles zeigen") */
  phaseId: PhaseId | null;
  showAll: () => void;
  /** "Alles zeigen" ist gerade an */
  showingAll: boolean;
  key: string;
};

export function useHomePhase(ctx: PhaseContext | null, opts: { routine: DayRoutine; preview: TimePreview | null; today: string; editing: boolean }): HomePhase {
  const steady = opts.routine.mode === "gleich";
  const live = ctx ? currentPhase(ctx) : null;
  const liveId: PhaseId = live?.def.id ?? "tagsueber";
  const [shown, setShown] = useState<PhaseId>(liveId);
  // Sofort wechseln bei: Vorschau, Modus, bewusstem Schritt
  const nudge = usePhaseNudge();
  const sig = `${opts.routine.mode}|${opts.preview ? `${opts.preview.clock}/${opts.preview.weekday}` : ""}|${nudge}|${opts.today}`;
  const [lastSig, setLastSig] = useState(sig);
  if (sig !== lastSig) {
    setLastSig(sig);
    if (shown !== liveId) setShown(liveId);
  }
  // Sonst nur beim Zurückkehren oder nach 30 s Ruhe
  const liveRef = useRef(liveId);
  const editingRef = useRef(opts.editing);
  const lastTouch = useRef(0);
  useEffect(() => {
    liveRef.current = liveId;
    editingRef.current = opts.editing;
  });
  useEffect(() => {
    lastTouch.current = performance.now();
    const touch = () => (lastTouch.current = performance.now());
    const apply = () => !editingRef.current && setShown(liveRef.current);
    const onVisible = () => document.visibilityState === "visible" && apply();
    const tick = window.setInterval(() => {
      if (performance.now() - lastTouch.current >= IDLE_MS) apply();
    }, 5000);
    const events = ["pointerdown", "keydown", "scroll", "touchstart", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(tick);
      events.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const showAllKey = useShowAll();
  const key = `${opts.today}:${shown}`;
  if (steady || !ctx) return { def: null, view: STEADY_VIEW, phaseId: null, showAll: () => {}, showingAll: false, key };
  const def = PHASES.find((p) => p.id === shown) ?? live!.def;
  const showingAll = showAllKey === key && def.id !== "tagsueber";
  const view = def.view(ctx);
  return {
    def: showingAll ? null : def,
    // "Alles zeigen": normale Ansicht, nur Arbeit an freien Tagen bleibt weg
    view: showingAll ? { ...STEADY_VIEW, hideWork: PHASES.find((p) => p.id === "tagsueber")!.view(ctx).hideWork } : view,
    phaseId: def.id,
    showAll: () => setShowAll(key),
    showingAll,
    key,
  };
}
