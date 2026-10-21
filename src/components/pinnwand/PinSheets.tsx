"use client";

// Pinnwand-Fenster: neue Nachricht (Textfeld bis 140 Zeichen, Mikrofon rechts,
// "Anheften") und Nachricht ansehen (reagieren, dauerhaft anheften, eigene
// löschen). Von der Kachel und der Seite /pinnwand genutzt.

import { useEffect, useState } from "react";
import { Mic, Pin, Square, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { INPUT_BASE, buttonClass, chipClass } from "@/components/ui/styles";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { now, todayIso, toIsoDate } from "@/lib/core/now";
import { showDeleted } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { PIN_MAX, REACTIONS, addPin, changePins, createPin, markPinsRead, pinMeta, removePin, setPinPinned, toggleReaction, type PinMessage } from "@/lib/pinnwand";
import { useSpeechInput } from "@/lib/lotte/useSpeechInput";
import { shortClock } from "@/components/notizen/Schnellnotiz";
import { buzz } from "@/components/alltag/actions";

export const pinMetaLine = (m: PinMessage, me: string) => pinMeta(m, me, todayIso(), shortClock, (iso) => toIsoDate(new Date(iso)));

/** Neue Nachricht: Textfeld (max. 140) mit Mikrofon, "Anheften" */
export function PinWriteSheet({ me, onClose }: { me: string; onClose: () => void }) {
  const [text, setText] = useState("");
  const speech = useSpeechInput({ onTranscript: (t) => setText(t.slice(0, PIN_MAX)), onEnd: (t) => t && setText(t.slice(0, PIN_MAX)) });
  const save = () => {
    const pin = createPin(text, me);
    if (!pin) return;
    speech.reset();
    changePins((all) => addPin(all, pin));
    buzz();
    onClose();
  };
  return (
    <Sheet title="An die Pinnwand" onClose={onClose}>
      <form
        className="flex flex-col gap-3 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="flex items-start gap-2">
          <textarea
            value={speech.listening ? speech.interim || text : text}
            onChange={(e) => setText(e.target.value.slice(0, PIN_MAX))}
            placeholder="z. B. Bin um 20 Uhr da"
            aria-label="Nachricht"
            rows={3}
            autoFocus
            maxLength={PIN_MAX}
            className={`${INPUT_BASE} min-w-0 flex-1 resize-none px-4 py-3`}
          />
          {speech.supported !== false && (
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-label={speech.listening ? "Zuhören beenden" : "Einsprechen"}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent active:scale-95 ${speech.listening ? "animate-pulse" : ""}`}
            >
              {speech.listening ? <Square className="h-5 w-5 fill-current" strokeWidth={2} aria-hidden /> : <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />}
            </button>
          )}
        </div>
        <span className="-mt-1 self-end text-xs text-muted">
          {text.length}/{PIN_MAX}
        </span>
        <button type="submit" disabled={!text.trim()} className={buttonClass("primary")}>
          Anheften
        </button>
      </form>
    </Sheet>
  );
}

/** Nachricht: reagieren, dauerhaft anheften, löschen (nur eigene) */
export function PinSheet({ message, me, onClose }: { message: PinMessage; me: string; onClose: () => void }) {
  const stamp = () => now().toISOString();
  useEffect(() => {
    changePins((all) => markPinsRead(all, me));
  }, [me]);
  const mine = message.data.author === me;
  return (
    <Sheet title="Pinnwand" onClose={onClose}>
      <div className="flex flex-col gap-4 pb-3">
        <div className="flex items-start gap-3">
          <PersonAvatar name={message.data.author} />
          <div className="flex min-w-0 flex-col">
            <p className="text-lg font-semibold leading-snug">{message.data.text}</p>
            <span className="text-sm text-muted">{pinMetaLine(message, me)}</span>
          </div>
        </div>
        <div className="flex gap-2" role="group" aria-label="Reagieren">
          {REACTIONS.map((r) => {
            const on = message.data.reactions[r]?.includes(me) ?? false;
            const count = message.data.reactions[r]?.length ?? 0;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                aria-label={`Mit ${r} reagieren`}
                onClick={() => {
                  buzz();
                  changePins((all) => toggleReaction(all, message.id, r, me, stamp()));
                }}
                className={`${chipClass(on)} text-lg`}
              >
                {r}
                {count > 0 && <span className="text-sm">{count}</span>}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => changePins((all) => setPinPinned(all, message.id, !message.data.pinned, stamp()))}
          className={buttonClass("secondary", "sm")}
        >
          <Pin className="h-4 w-4" strokeWidth={2} aria-hidden />
          {message.data.pinned ? "Nicht mehr dauerhaft – nach 3 Tagen weg" : "Dauerhaft anheften"}
        </button>
        {mine && (
          <button
            type="button"
            onClick={() => {
              const undo = changePins((all) => removePin(all, message.id));
              showDeleted(pushUndo("das Löschen der Pinnwand-Nachricht", undo));
              onClose();
            }}
            className={`${buttonClass("ghost", "sm")} text-danger`}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
            Löschen
          </button>
        )}
        {!message.data.pinned && <p className="text-xs text-muted">Nachrichten verschwinden nach 3 Tagen von selbst.</p>}
      </div>
    </Sheet>
  );
}
