"use client";

// Eine Nachricht auf der Pinnwand-Seite mit Gesten wie bei WhatsApp (Tafel 70):
// nach LINKS wischen = löschen (nur eigene; rote Fläche „Löschen“ – ganz
// durchwischen oder antippen), nach RECHTS wischen = antworten (blaue Fläche),
// LANGE DRÜCKEN (0,4 s, leichtes Vibrieren) = Reaktionen + Menü. Fremde
// Nachrichten federn beim Linkswischen nur zurück. Für VoiceOver dieselben
// Aktionen als unsichtbare Knöpfe. Wischen hier wechselt nie die Seite.

import { useRef, useState, type ReactNode } from "react";
import { Reply, Trash2 } from "lucide-react";

const HOLD_MS = 400;
/** Ab hier zählt die Bewegung als Wischen (kein Lange-Drücken mehr) */
const SLOP = 10;
/** Antworten ab dieser Strecke nach rechts */
const REPLY_AT = 72;
/** Offen stehende Löschen-Fläche */
const OPEN_AT = 96;

type Props = {
  label: string;
  mine: boolean;
  onDelete: () => void;
  onReply: () => void;
  onHold: () => void;
  highlight?: boolean;
  children: ReactNode;
};

export function SwipeRow({ label, mine, onDelete, onReply, onHold, highlight = false, children }: Props) {
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; swiping: boolean; held: boolean } | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const row = useRef<HTMLDivElement>(null);
  const clearHold = () => hold.current && (clearTimeout(hold.current), (hold.current = null));

  const settle = (x: number) => {
    const width = row.current?.offsetWidth ?? 360;
    setDragging(false);
    if (x <= -width * 0.55 && mine) {
      setDx(0);
      setOpen(false);
      onDelete();
    } else if (x <= -OPEN_AT * 0.7 && mine) {
      setDx(-OPEN_AT);
      setOpen(true);
    } else {
      if (x >= REPLY_AT) onReply();
      setDx(0);
      setOpen(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-card" data-no-swipe data-no-longpress>
      {/* Flächen hinter der Nachricht */}
      <div className="absolute inset-0 flex items-stretch justify-between" aria-hidden>
        <span className={`flex items-center gap-1.5 bg-work pl-4 pr-6 text-[14px] font-bold text-on-accent ${dx > 0 ? "" : "invisible"}`}>
          <Reply className="h-5 w-5" strokeWidth={2.25} />
          Antworten
        </span>
        <button type="button" tabIndex={-1} onClick={onDelete} className={`flex items-center gap-1.5 bg-danger pl-6 pr-4 text-[14px] font-bold text-on-accent ${dx < 0 && mine ? "" : "invisible"}`}>
          <Trash2 className="h-5 w-5" strokeWidth={2.25} />
          Löschen
        </button>
      </div>
      <div
        ref={row}
        role="group"
        aria-label={label}
        className={`relative touch-pan-y select-none [-webkit-touch-callout:none] ${dragging ? "" : "transition-transform duration-300 ease-out"} ${highlight ? "pin-hervor" : ""}`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        // Android meldet langes Drücken als „contextmenu“ (und bricht die Berührung ab) – das zählt auch
        onContextMenu={(e) => {
          e.preventDefault();
          if (start.current?.held || start.current?.swiping || (e.target as Element).closest("button, a")) return;
          clearHold();
          start.current = null;
          navigator.vibrate?.(12);
          onHold();
        }}
        onPointerDown={(e) => {
          if ((e.target as Element).closest("button, a")) return;
          start.current = { x: e.clientX, y: e.clientY, base: open ? -OPEN_AT : 0, swiping: false, held: false };
          clearHold();
          hold.current = setTimeout(() => {
            if (!start.current || start.current.swiping) return;
            start.current.held = true;
            navigator.vibrate?.(12);
            onHold();
          }, HOLD_MS);
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s || s.held) return;
          const mx = e.clientX - s.x;
          const my = e.clientY - s.y;
          if (!s.swiping) {
            if (Math.abs(my) > SLOP && Math.abs(my) > Math.abs(mx)) return (clearHold(), (start.current = null));
            if (Math.abs(mx) < SLOP) return;
            s.swiping = true;
            clearHold();
            setDragging(true);
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          }
          const raw = s.base + mx;
          // Fremde Nachrichten: nach links nur ein kurzes Federn
          setDx(raw < 0 && !mine ? Math.max(raw * 0.25, -28) : Math.min(raw, 120));
        }}
        onPointerUp={(e) => {
          clearHold();
          const s = start.current;
          start.current = null;
          if (s?.swiping) settle(s.base + e.clientX - s.x);
          else if (open && !s?.held) {
            setDx(0);
            setOpen(false);
          }
        }}
        onPointerCancel={() => {
          // Nicht den Lange-Drücken-Zeitgeber abbrechen: Android bricht beim Halten ab, bevor „contextmenu“ kommt
          if (!start.current?.swiping) return;
          clearHold();
          start.current = null;
          setDragging(false);
          setDx(0);
          setOpen(false);
        }}
      >
        {children}
      </div>
      {/* Ohne Gesten (VoiceOver, Tastatur): dieselben Aktionen */}
      <span className="sr-only">
        <button type="button" onClick={onReply}>
          Antworten
        </button>
        <button type="button" onClick={onHold}>
          Reagieren
        </button>
        {mine && (
          <button type="button" onClick={onDelete}>
            Löschen
          </button>
        )}
      </span>
    </div>
  );
}
