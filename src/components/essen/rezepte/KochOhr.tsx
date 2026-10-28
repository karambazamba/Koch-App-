"use client";

// Mia hört im Kochmodus mit (Tafel 122): einmal „Mikro an“ getippt (gemerkt
// als `koch-ohr`) und das Mikro freigegeben, hört sie beim nächsten Mal still
// mit und versteht „Weiter“, „Zurück“, „Nochmal“, „Timer 10 Minuten“ und
// „Fertig“ (`kochBefehl`). Nie von selbst fragen. Unten eine Zeile mit dem
// kleinen Gesicht (nicht antippbar, ohne Ring). Spracheingabe nur über
// `useSpeechInput`; nach jedem Befehl `reset()`.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { useSpeechInput } from "@/lib/begleitung/useSpeechInput";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { micState, micSubscribe } from "@/lib/core/mic";
import { KOCH_SPRACHE_TEXT, kochBefehl, type KochBefehl } from "@/lib/essen/kochModus";

/** Nach einem Befehl bzw. dem Ende einer Aufnahme so lange warten, dann weiter zuhören */
const WIEDER_MS = 700;

export function KochOhr({ onBefehl }: { onBefehl: (b: KochBefehl) => void }) {
  const granted = useSyncExternalStore(micSubscribe, () => micState().granted, () => false);
  const gewollt = useHintSeen("koch-ohr") === true;
  const [aus, setAus] = useState(false);
  const an = granted && gewollt && !aus;
  const live = useRef(false);
  const befehl = useRef(onBefehl);
  const timer = useRef<number | null>(null);
  const speech = useSpeechInput({
    long: true,
    onTranscript: (text) => {
      // Nur die letzten Wörter zählen – Gespräche am Herd lösen nichts aus
      const b = kochBefehl(text.split(/\s+/).slice(-5).join(" "));
      if (!b) return;
      speech.reset();
      befehl.current(b);
      later();
    },
    onEnd: () => later(),
  });
  const startRef = useRef(speech.start);
  useEffect(() => {
    befehl.current = onBefehl;
    startRef.current = speech.start;
  });
  const later = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => live.current && micState().granted && !micState().block && startRef.current(), WIEDER_MS);
  };
  const { supported, cancel } = speech;
  // Gewollt und freigegeben → still mithören; beim Verlassen bzw. „aus“ aufhören
  useEffect(() => {
    if (!supported || !an) return;
    live.current = true;
    startRef.current();
    return () => {
      live.current = false;
      if (timer.current) window.clearTimeout(timer.current);
      cancel();
    };
  }, [supported, an, cancel]);
  if (!supported) return null;
  return (
    <div className="flex items-center gap-2.5 text-[14px] text-cook-muted" data-koch-ohr={an ? "an" : "aus"}>
      <BegleitungAvatar size={26} groesse="klein" />
      {an ? (
        <button type="button" onClick={() => setAus(true)} className="hit min-w-0 flex-1 text-left" aria-label={`${KOCH_SPRACHE_TEXT} Antippen: nicht mehr zuhören`}>
          {KOCH_SPRACHE_TEXT}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            markHintSeen("koch-ohr");
            setAus(false);
            if (micState().granted) return;
            speech.start();
          }}
          className="hit min-w-0 flex-1 text-left"
        >
          Mikro an, dann hör ich mit. {KOCH_SPRACHE_TEXT}
        </button>
      )}
    </div>
  );
}
