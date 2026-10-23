"use client";

// Bausteine der Sprachnachrichten: Tonwelle, Mikro-Knopf (Kachel-Akzent, nicht
// Orange – Orange ist Mias Mikro) und die Aufnahme-Leiste (Verwerfen, roter
// Punkt, Zeit, Welle, Senden). Antippen startet, die Aufnahme läuft frei (wie
// bei WhatsApp); Halten bleibt als Abkürzung (loslassen = senden, nach oben
// schieben = frei sprechen). Per Tastatur/VoiceOver: Antippen startet, „Senden“
// beendet.

import { useEffect, useRef, useState } from "react";
import { Lock, Mic, MicOff, SendHorizontal, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MIC_BLOCKED, useMicBlocked } from "@/components/ui/MicPermission";
import { formatDauer } from "@/lib/pinnwand";
import { LOCK_PX, timeWarns } from "@/lib/pinnwand/recorderState";
import { micRanThisSession } from "@/lib/core/mic";
import type { MemoRecorder } from "@/components/pinnwand/useMemoRecorder";

/** Tonwelle: Balken, gespielt = Akzent, Rest blass. `fit`: Balken werden schmaler statt abgeschnitten (kleine Kachel) */
export function MemoWave({ wave, progress = 0, className = "", fit = false }: { wave: number[]; progress?: number; className?: string; fit?: boolean }) {
  return (
    <span className={`flex h-6 items-center ${fit ? "gap-px" : "gap-[2px]"} ${className}`} aria-hidden>
      {wave.map((v, i) => (
        <span
          key={i}
          className={`${fit ? "min-w-0 max-w-[3px] flex-1" : "w-[3px] shrink-0"} rounded-full bg-tile-accent transition-opacity duration-150 ${(i + 0.5) / wave.length <= progress ? "opacity-100" : "opacity-35"}`}
          style={{ height: `${Math.round(18 + v * 82)}%` }}
        />
      ))}
    </span>
  );
}

/** Mikro für Sprachnachrichten: antippen = Aufnahme startet (läuft frei); halten = loslassen sendet, hochschieben = frei sprechen */
export function MemoMic({ recorder, size = 26, tapOnly = false }: { recorder: MemoRecorder; size?: number; tapOnly?: boolean }) {
  const press = useRef<{ at: number; y: number; up: boolean } | null>(null);
  /** Der Klick, den der Browser nach dem Loslassen schickt, gehört noch zum Start */
  const swallowClick = useRef(false);
  const [locking, setLocking] = useState(false);
  const active = recorder.phase !== "idle";
  const freeMode = active && recorder.mode === "tippen";
  const blocked = useMicBlocked();
  return (
    <button
      type="button"
      data-no-swipe
      data-no-longpress
      aria-label={blocked ? "Mikro aus – so machst du es an" : freeMode ? "Senden" : active ? "Aufnahme läuft – loslassen zum Senden" : "Aufnahme starten"}
      aria-pressed={active}
      onPointerDown={(e) => {
        // Kachel: nur antippen (das Mikro verschwindet während der Aufnahme – Halten ginge ins Leere)
        if (e.button !== 0 || freeMode || tapOnly) return;
        // Erstes Mal in dieser Sitzung: erst beim Loslassen starten (Klick) – auf dem
        // iPhone erscheint die Mikro-Frage nur bei einem echten Antippen
        if (recorder.phase === "idle" && !micRanThisSession()) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        press.current = { at: performance.now(), y: e.clientY, up: false };
        void recorder.start("halten");
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (!p) return;
        const up = p.y - e.clientY > LOCK_PX;
        if (up !== p.up) {
          p.up = up;
          setLocking(up);
        }
      }}
      onPointerUp={() => {
        const p = press.current;
        press.current = null;
        setLocking(false);
        if (!p) return;
        swallowClick.current = true;
        // Landet der nachgeschobene Klick woanders, darf die Sperre nicht den nächsten echten Tipp schlucken
        setTimeout(() => (swallowClick.current = false), GHOST_CLICK_MS);
        recorder.release(performance.now() - p.at, p.up);
      }}
      onPointerCancel={() => {
        // Der Browser hat übernommen (z. B. Scrollen) – nichts verlieren: frei weiter
        const p = press.current;
        press.current = null;
        setLocking(false);
        if (p) recorder.release(0, true);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (swallowClick.current) {
          swallowClick.current = false;
          return;
        }
        // Während freier Aufnahme: Mikro nochmal = senden
        if (freeMode && e.detail !== 0) return recorder.send();
        // Erstes Antippen in dieser Sitzung (bzw. Kachel): startet beim Loslassen, läuft frei
        if (e.detail !== 0 && recorder.phase === "idle" && (tapOnly || !micRanThisSession())) return void recorder.start("tippen");
        // Tastatur oder Bedienungshilfe (kein Finger davor): antippen startet, nochmal sendet
        if (e.detail !== 0) return;
        if (recorder.phase === "idle") void recorder.start("tippen");
        else recorder.send();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`hit relative flex shrink-0 touch-none select-none items-center justify-center rounded-full transition-transform duration-150 [-webkit-touch-callout:none] ${blocked ? MIC_BLOCKED : active ? "bg-tile-accent text-on-accent" : "bg-tile-inner text-tile-accent active:scale-95"} ${active && !freeMode ? "scale-[1.3]" : ""}`}
      style={{ width: size, height: size }}
    >
      {blocked ? <MicOff className="h-[50%] w-[50%]" strokeWidth={2.5} aria-hidden /> : locking ? <Lock className="h-[50%] w-[50%]" strokeWidth={2.5} aria-hidden /> : <Mic className="h-[55%] w-[55%]" strokeWidth={2.5} aria-hidden />}
    </button>
  );
}

/**
 * Aufnahme-Leiste: links Verwerfen, Mitte roter Punkt + Zeit + Welle, rechts
 * Senden. `compact` (Kachel, Tafel 80): EINE weiße Pille (44 px) wie bei
 * WhatsApp – Mülleimer, Punkt, Zeit, Welle (wird schmaler, nie abgeschnitten),
 * rechts ➤; passt in S (176 px) und M.
 */
/** So lange nach dem Erscheinen zählen Klicks auf die Aufnahme-Zeile nicht (Geister-Klick vom Mikro) */
const GHOST_CLICK_MS = 450;

export function RecordingRow({ recorder, compact = false }: { recorder: MemoRecorder; compact?: boolean }) {
  const waiting = recorder.phase === "asking";
  const stopped = recorder.phase === "stopped";
  const holding = recorder.mode === "halten";
  const bars = [...Array.from({ length: Math.max(0, 28 - recorder.levels.length) }, () => 0), ...recorder.levels];
  // Die Zeile erscheint unter dem Finger, der eben das Mikro angetippt hat: dessen
  // nachgeschobener Klick darf nicht gleich „Senden“/„Verwerfen“ treffen
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = performance.now();
  }, []);
  const fresh = () => performance.now() - shownAt.current < GHOST_CLICK_MS;
  const discard = (
    <button type="button" onClick={() => !fresh() && recorder.discard()} aria-label="Verwerfen" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:scale-95">
      <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
    </button>
  );
  const send = (
    <button type="button" onClick={() => !fresh() && recorder.send()} aria-label="Senden" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tile-accent text-on-accent active:scale-95">
      <SendHorizontal className="h-5 w-5" strokeWidth={2.5} aria-hidden />
    </button>
  );
  const time = (
    <>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-danger ${waiting || stopped ? "opacity-40" : "animate-pulse"}`} aria-hidden />
      <span className={`shrink-0 text-[14px] font-bold tabular-nums ${timeWarns(recorder.elapsed) ? "text-accent-strong" : ""}`}>{formatDauer(recorder.elapsed / 1000)}</span>
      <MemoWave wave={bars} progress={1} className="min-w-0 flex-1 overflow-hidden" />
    </>
  );
  return (
    <div className="flex flex-col gap-1.5" data-no-swipe>
      {compact ? (
        <>
          <div className="flex h-11 min-w-0 items-center gap-1 rounded-full bg-tile-inner pl-0.5 pr-[3px]">
            <button type="button" onClick={() => !fresh() && recorder.discard()} aria-label="Verwerfen" className="hit flex h-8 w-6 shrink-0 items-center justify-center rounded-full text-muted active:scale-95">
              <Trash2 className="h-[17px] w-[17px]" strokeWidth={2.25} aria-hidden />
            </button>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full bg-danger ${waiting || stopped ? "opacity-40" : "animate-pulse"}`} aria-hidden />
            <span className={`shrink-0 text-[13px] font-bold tabular-nums ${timeWarns(recorder.elapsed) ? "text-accent-strong" : ""}`}>{formatDauer(recorder.elapsed / 1000)}</span>
            <MemoWave wave={bars.slice(-14)} progress={1} fit className="min-w-0 flex-1 overflow-hidden" />
            <button type="button" onClick={() => !fresh() && recorder.send()} aria-label="Senden" className="hit flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-tile-accent text-on-accent active:scale-95">
              <SendHorizontal className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
          <span className="px-1 text-[12px] leading-snug text-muted" role="status">
            {waiting ? "Mikrofon wird vorbereitet …" : stopped ? "Fertig aufgenommen – senden oder verwerfen?" : "Aufnahme läuft – sprich einfach"}
          </span>
          <span className="px-1 text-[11px] leading-tight text-muted" aria-hidden>
            <SendHorizontal className="inline h-3 w-3 align-[-2px]" strokeWidth={2.5} /> senden · <Trash2 className="inline h-3 w-3 align-[-2px]" strokeWidth={2.25} /> verwerfen
          </span>
        </>
      ) : (
        <>
          <div className="flex h-12 items-center gap-2">
            {discard}
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-tile-inner px-3">{time}</div>
            {send}
          </div>
          <span className="px-1 text-xs text-muted" role="status">
            {waiting ? "Mikrofon wird vorbereitet …" : stopped ? "Memo fertig aufgenommen – Senden oder Verwerfen?" : holding ? "Loslassen = senden · nach oben schieben = frei sprechen" : "Aufnahme läuft – sprich einfach"}
          </span>
        </>
      )}
      <span className="sr-only" aria-live="polite">
        {recorder.announce}
      </span>
      {recorder.askDiscard && <ConfirmDialog title="Sprachnachricht verwerfen?" text="Die Aufnahme ist dann weg." confirmLabel="Verwerfen" cancelLabel="Behalten" danger onConfirm={recorder.discard} onCancel={recorder.keep} />}
    </div>
  );
}

/** Freundlicher Satz unter der Pinnwand (z. B. Mikrofon nicht erlaubt) */
export function MemoNote({ text, onResend }: { text: string | null; onResend?: () => void }) {
  if (!text && !onResend) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 px-1 text-[13px] leading-snug text-muted" role="status">
      {text}
      {onResend && (
        <button type="button" onClick={onResend} className="hit font-bold text-tile-accent">
          Nochmal senden
        </button>
      )}
    </p>
  );
}
