"use client";

// Pinnwand: „wer · wann“-Zeile und das Text-Fenster (bis 140 Zeichen,
// „Anheften“) – nur noch als „Mehr Details“ hinter der Schnelleingabe (Tafel 76).

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { INPUT_BASE, buttonClass } from "@/components/ui/styles";
import { todayIso, toIsoDate } from "@/lib/core/now";
import { PIN_MAX, addPin, changePins, createPin, pinMeta, type PinQuote } from "@/lib/pinnwand";
import { shortClock } from "@/components/notizen/Schnellnotiz";
import { buzz } from "@/components/heute/actions";

export const pinMetaLine = (m: { erstellt: string; data: { author: string } }, me: string) => pinMeta(m, me, todayIso(), shortClock, (iso) => toIsoDate(new Date(iso)));

/** „Mehr Details“ der Schnelleingabe: Textfeld (max. 140, mehrzeilig), "Anheften" */
export function PinWriteSheet({ me, onClose, initialText = "", quote = null }: { me: string; onClose: () => void; initialText?: string; quote?: PinQuote | null }) {
  const [text, setText] = useState(initialText.slice(0, PIN_MAX));
  const save = () => {
    const pin = createPin(text, me, quote);
    if (!pin) return;
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
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, PIN_MAX))}
            placeholder="z. B. Bin um 20 Uhr da"
            aria-label="Nachricht"
            rows={3}
            autoFocus
            maxLength={PIN_MAX}
            className={`${INPUT_BASE} min-w-0 flex-1 resize-none px-4 py-3`}
          />
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
