"use client";

// Fenster zur Mikrofon-Freigabe (Tafel 27), erst bei Bedarf geladen:
// - „Darf ich zuhören?“ (einmalig vor der ersten Frage des Geräts, mit
//   nachgebautem System-Dialog; „Okay, frag mich“ startet erst dann)
// - seit Tafel 86 der Mikro-Check (`MicCheck`): Häkchen-Liste, nur die
//   Schritte für den fehlenden Schalter, „Zeig’s mir“, „Nochmal testen“.

import { useSyncExternalStore } from "react";
import { Mic } from "lucide-react";
import { MicCheck } from "@/components/ui/MicCheck";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/styles";
import { markHintSeen } from "@/lib/core/hints";
import { closeMicSheet, micPlatform, micState, micSubscribe, preAskText, type MicPlatform } from "@/lib/core/mic";
import { APP_NAME } from "@/lib/core/app";

const platform = (): MicPlatform => (typeof navigator === "undefined" ? "andere" : micPlatform(navigator.userAgent));

/** „Lieber schreiben“: Fenster zu, Fokus ins Textfeld neben dem Mikro */
function preferTyping() {
  const origin = micState().origin;
  closeMicSheet();
  const field = origin?.closest("form, footer, section, [role=dialog]")?.querySelector<HTMLElement>("textarea, input:not([type=hidden]):not([type=checkbox])");
  setTimeout(() => field?.focus(), 50);
}

export function MicSheets() {
  const sheet = useSyncExternalStore(micSubscribe, () => micState().sheet, () => null);
  if (!sheet) return null;
  return sheet.kind === "fragen" ? <PreAsk then={sheet.then} /> : <MicCheck start={sheet.fehler} onTyping={preferTyping} />;
}

function PreAsk({ then }: { then: () => void }) {
  const p = platform();
  const text = preAskText(p);
  return (
    <Sheet title={text.title} onClose={closeMicSheet} layer="above">
      <div className="flex flex-col items-center gap-4 pb-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <Mic className="h-8 w-8" strokeWidth={2.25} aria-hidden />
        </span>
        <p className="text-base leading-snug">{text.text}</p>
        {/* Nachgebauter System-Dialog */}
        <div className="w-full max-w-[280px] overflow-hidden rounded-card border border-line bg-surface text-[14px] shadow-card" aria-hidden>
          <p className="px-4 pb-3 pt-4 font-semibold leading-snug">{p === "ios" ? `„${APP_NAME}“ möchte auf das Mikrofon zugreifen` : `${APP_NAME} möchte dein Mikrofon verwenden`}</p>
          <div className="grid grid-cols-2 border-t border-line">
            <span className="py-2.5 text-muted">{p === "ios" ? "Nicht erlauben" : "Nicht zulassen"}</span>
            <span className="border-l border-line py-2.5 font-extrabold text-accent-strong ring-2 ring-inset ring-accent">{text.allow}</span>
          </div>
        </div>
        <p className="-mt-2 text-sm text-muted">↑ so sieht die Frage aus</p>
        {text.zusatz && <p className="text-[15px] font-semibold">{text.zusatz}</p>}
        <button
          type="button"
          onClick={() => {
            markHintSeen("mikro-gefragt");
            closeMicSheet();
            then();
          }}
          className={`${buttonClass("primary", "lg")} w-full`}
        >
          Okay, frag mich
        </button>
        <button type="button" onClick={preferTyping} className="hit min-h-11 text-[15px] font-semibold text-muted">
          Lieber schreiben
        </button>
      </div>
    </Sheet>
  );
}
