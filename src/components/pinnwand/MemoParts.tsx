"use client";

// Bausteine der Sprachnachrichten: Tonwelle, Mikro-Knopf (Kachel-Akzent, nicht
// Orange – Orange ist Mias Mikro) und die Aufnahme-Zeile (roter Punkt, Zeit,
// Welle). Gedrückt halten = Aufnahme, Loslassen = senden, zur Seite wischen =
// verwerfen; per Tastatur/VoiceOver: Antippen startet, „Senden“ beendet.

import { useRef, useState } from "react";
import { Mic, Send, X } from "lucide-react";
import { formatDauer } from "@/lib/pinnwand";
import type { MemoRecorder } from "@/components/pinnwand/useMemoRecorder";

/** Ab dieser Strecke zur Seite gilt Loslassen als Verwerfen */
const CANCEL_PX = 70;

/** Tonwelle: Balken, gespielt = Akzent, Rest blass */
export function MemoWave({ wave, progress = 0, className = "" }: { wave: number[]; progress?: number; className?: string }) {
  return (
    <span className={`flex h-6 items-center gap-[2px] ${className}`} aria-hidden>
      {wave.map((v, i) => (
        <span
          key={i}
          className={`w-[3px] shrink-0 rounded-full bg-tile-accent transition-opacity duration-150 ${(i + 0.5) / wave.length <= progress ? "opacity-100" : "opacity-35"}`}
          style={{ height: `${Math.round(18 + v * 82)}%` }}
        />
      ))}
    </span>
  );
}

/** Mikro für Sprachnachrichten: gedrückt halten (Finger/Maus), Tastatur = Antippen-Start */
export function MemoMic({ recorder, size = 26, onCancelArmed }: { recorder: MemoRecorder; size?: number; onCancelArmed?: (armed: boolean) => void }) {
  const startX = useRef<number | null>(null);
  const [armed, setArmed] = useState(false);
  const active = recorder.phase !== "idle";
  const arm = (v: boolean) => {
    setArmed(v);
    onCancelArmed?.(v);
  };
  return (
    <button
      type="button"
      data-no-swipe
      data-no-longpress
      aria-label={recorder.tapMode ? "Sprachnachricht senden" : active ? "Aufnahme läuft – loslassen zum Senden" : "Sprachnachricht an alle – gedrückt halten"}
      aria-pressed={active}
      onPointerDown={(e) => {
        if (e.button !== 0 || recorder.tapMode) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        startX.current = e.clientX;
        arm(false);
        void recorder.start();
      }}
      onPointerMove={(e) => {
        if (startX.current === null) return;
        const far = Math.abs(e.clientX - startX.current) > CANCEL_PX;
        if (far !== armed) arm(far);
      }}
      onPointerUp={() => {
        if (startX.current === null) return;
        startX.current = null;
        recorder.finish(!armed);
        arm(false);
      }}
      onPointerCancel={() => {
        if (startX.current === null) return;
        startX.current = null;
        recorder.finish(false);
        arm(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        // Tastatur oder Bedienungshilfe (kein Finger davor): Tippen startet, nochmal Tippen sendet
        if (e.detail !== 0) return;
        if (recorder.phase === "idle") void recorder.start({ tap: true });
        else recorder.finish(true);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`hit relative flex shrink-0 touch-none select-none items-center justify-center rounded-full transition-transform duration-150 [-webkit-touch-callout:none] ${active ? "scale-[1.3] bg-tile-accent text-on-accent" : "bg-tile-inner text-tile-accent active:scale-95"}`}
      style={{ width: size, height: size }}
    >
      <Mic className="h-[55%] w-[55%]" strokeWidth={2.5} aria-hidden />
    </button>
  );
}

/** Zeile während der Aufnahme: roter Punkt, Zeit, Welle – und der Hinweis zum Verwerfen */
export function RecordingRow({ recorder, armed }: { recorder: MemoRecorder; armed: boolean }) {
  const waiting = recorder.phase === "asking";
  const bars = [...Array.from({ length: Math.max(0, 28 - recorder.levels.length) }, () => 0), ...recorder.levels];
  return (
    <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
      <div className="flex items-center gap-2.5 rounded-full bg-tile-inner px-3 py-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-danger ${waiting ? "opacity-40" : "animate-pulse"}`} aria-hidden />
        <span className="w-9 shrink-0 text-[14px] font-bold tabular-nums">{formatDauer(recorder.elapsed / 1000)}</span>
        <MemoWave wave={bars} progress={1} className="min-w-0 flex-1 overflow-hidden" />
        {recorder.tapMode && (
          <>
            <button type="button" onClick={() => recorder.finish(false)} aria-label="Verwerfen" className="hit flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted">
              <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
            <button type="button" onClick={() => recorder.finish(true)} aria-label="Senden" className="hit flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tile-accent text-on-accent">
              <Send className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            </button>
          </>
        )}
      </div>
      <span className={`px-1 text-xs ${armed ? "font-bold text-danger" : "text-muted"}`}>
        {waiting ? "Mikrofon wird vorbereitet …" : recorder.tapMode ? "Aufnahme läuft – Senden oder ✕" : armed ? "Loslassen = verwerfen" : "Loslassen = senden · zur Seite wischen = verwerfen"}
      </span>
    </div>
  );
}

/** Freundlicher Satz unter der Pinnwand (z. B. Mikrofon nicht erlaubt) */
export function MemoNote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="px-1 text-[13px] leading-snug text-muted" role="status">
      {text}
    </p>
  );
}
