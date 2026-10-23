"use client";

// Pinnwand: „wer · wann“-Zeile und das Text-Fenster (bis 140 Zeichen,
// „Anheften“) – nur noch als „Lieber Formular“-Weg hinter Mia (Tafel 69).

import { useState } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { INPUT_BASE, buttonClass } from "@/components/ui/styles";
import { todayIso, toIsoDate } from "@/lib/core/now";
import { PIN_MAX, addPin, changePins, createPin, pinMeta } from "@/lib/pinnwand";
import { takePinReply } from "@/lib/begleitung/open";
import { useSpeechInput } from "@/lib/begleitung/useSpeechInput";
import { shortClock } from "@/components/notizen/Schnellnotiz";
import { buzz } from "@/components/heute/actions";
import { MIC_BLOCKED, MicStrip } from "@/components/ui/MicPermission";

export const pinMetaLine = (m: { erstellt: string; data: { author: string } }, me: string) => pinMeta(m, me, todayIso(), shortClock, (iso) => toIsoDate(new Date(iso)));

/** Neue Nachricht: Textfeld (max. 140) mit Mikrofon, "Anheften" */
export function PinWriteSheet({ me, onClose }: { me: string; onClose: () => void }) {
  const [text, setText] = useState("");
  const speech = useSpeechInput({ onTranscript: (t) => setText(t.slice(0, PIN_MAX)), onEnd: (t) => t && setText(t.slice(0, PIN_MAX)) });
  const save = () => {
    const pin = createPin(text, me, takePinReply());
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
        <MicStrip />
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
              aria-label={speech.blocked ? "Mikro aus – so machst du es an" : speech.listening ? "Zuhören beenden" : "Einsprechen"}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${speech.blocked ? MIC_BLOCKED : "bg-accent text-on-accent"} active:scale-95 ${speech.listening ? "animate-pulse" : ""}`}
            >
              {speech.blocked ? <MicOff className="h-5 w-5" strokeWidth={2.25} aria-hidden /> : speech.listening ? <Square className="h-5 w-5 fill-current" strokeWidth={2} aria-hidden /> : <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />}
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
