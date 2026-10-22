"use client";

// Welche Tagesphase gerade gilt (für Inhalte der Kacheln, nie für die
// Anordnung). Sie wechselt nur beim Öffnen/Zurückkehren in die App oder nach
// 30 s ohne Berührung (nie während Tippen/Scrollen, nie im Bearbeiten-Modus) –
// bewusste Schritte ("Ich koche jetzt", Timer, "Gegessen ✓") und die
// Zeit-Vorschau wirken sofort.

import { useEffect, useRef, useState } from "react";
import { PHASES, currentPhase, type PhaseContext, type PhaseDef, type PhaseId, type PhaseView } from "@/lib/heute/phases";
import { usePhaseNudge } from "@/lib/heute/nudge";
import type { TimePreview } from "@/lib/heute/tagesablauf";

const IDLE_MS = 30_000;
const NONE: PhaseView = { hideWork: false };

type HomePhase = { def: PhaseDef | null; view: PhaseView };

export function useHomePhase(ctx: PhaseContext | null, opts: { preview: TimePreview | null; today: string; editing: boolean }): HomePhase {
  const live = ctx ? currentPhase(ctx) : null;
  const liveId: PhaseId = live?.def.id ?? "tagsueber";
  const [shown, setShown] = useState<PhaseId>(liveId);
  // Sofort wechseln bei: Vorschau, bewusstem Schritt, neuem Tag
  const nudge = usePhaseNudge();
  const sig = `${opts.preview ? `${opts.preview.clock}/${opts.preview.weekday}` : ""}|${nudge}|${opts.today}`;
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

  if (!ctx) return { def: null, view: NONE };
  const def = PHASES.find((p) => p.id === shown) ?? live!.def;
  return { def, view: def.view(ctx) };
}
