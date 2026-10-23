"use client";

// Fenster zur Mikrofon-Freigabe (Tafel 27), erst bei Bedarf geladen:
// - „Darf ich zuhören?“ (einmalig vor der ersten Frage des Geräts, mit
//   nachgebautem System-Dialog; „Okay, frag mich“ startet erst dann)
// - „Ich kann dich gerade nicht hören“ (gesperrt bzw. Diktieren aus): vier
//   nummerierte Schritte, „Zeig’s mir“, „Nochmal versuchen“, „Lieber tippen“
// - „Zeig’s mir“: Schritt für Schritt wischbar, nachgebaute Einstellungen mit
//   orange markierter Zeile und Fingerkreis.

import { useState, useSyncExternalStore } from "react";
import { Mic, MicOff, Play } from "lucide-react";
import { StepGuide, StepList } from "@/components/ui/StepGuide";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/styles";
import { markHintSeen } from "@/lib/core/hints";
import { closeMicSheet, iosMajor, micPlatform, micState, micSteps, micSubscribe, preAskText, setMicPermission, withMicTimeout, type MicBlock, type MicPlatform } from "@/lib/core/mic";

const platform = (): MicPlatform => (typeof navigator === "undefined" ? "andere" : micPlatform(navigator.userAgent));

/** „Lieber tippen“: Fenster zu, Fokus ins Textfeld neben dem Mikro */
function preferTyping() {
  const origin = micState().origin;
  closeMicSheet();
  const field = origin?.closest("form, footer, section, [role=dialog]")?.querySelector<HTMLElement>("textarea, input:not([type=hidden]):not([type=checkbox])");
  setTimeout(() => field?.focus(), 50);
}

export function MicSheets() {
  const sheet = useSyncExternalStore(micSubscribe, () => micState().sheet, () => null);
  if (!sheet) return null;
  return sheet.kind === "fragen" ? <PreAsk then={sheet.then} /> : <Help block={sheet.block} />;
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
          <p className="px-4 pb-3 pt-4 font-semibold leading-snug">{p === "ios" ? "„Was gibt’s?“ möchte auf das Mikrofon zugreifen" : "Was gibt’s? möchte dein Mikrofon verwenden"}</p>
          <div className="grid grid-cols-2 border-t border-line">
            <span className="py-2.5 text-muted">{p === "ios" ? "Nicht erlauben" : "Nicht zulassen"}</span>
            <span className="border-l border-line py-2.5 font-extrabold text-accent-strong ring-2 ring-inset ring-accent">{text.allow}</span>
          </div>
        </div>
        <p className="-mt-2 text-sm text-muted">↑ so sieht die Frage aus</p>
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
          Lieber tippen
        </button>
      </div>
    </Sheet>
  );
}

function Help({ block }: { block: MicBlock }) {
  const p = platform();
  const steps = micSteps(p, block, typeof navigator === "undefined" ? null : iosMajor(navigator.userAgent), typeof location === "undefined" ? undefined : location.host);
  const [guide, setGuide] = useState(false);
  const [still, setStill] = useState(false);
  const retry = async () => {
    if (block === "diktat_aus") return closeMicSheet();
    try {
      const stream = await withMicTimeout(navigator.mediaDevices.getUserMedia({ audio: true }));
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      closeMicSheet();
    } catch {
      // Noch aus: zurück zur Übersicht mit freundlichem Satz
      setGuide(false);
      setStill(true);
    }
  };
  if (guide) return <StepGuide steps={steps} onBack={() => setGuide(false)} onDone={retry} onClose={closeMicSheet} lastLabel="Nochmal versuchen" />;
  return (
    <Sheet title="Ich kann dich gerade nicht hören" onClose={closeMicSheet} layer="above">
      <div className="flex flex-col gap-3 pb-3">
        <span className="flex h-14 w-14 items-center justify-center self-center rounded-full bg-fill-strong text-muted">
          <MicOff className="h-7 w-7" strokeWidth={2.25} aria-hidden />
        </span>
        <p className="text-base font-semibold">{block === "diktat_aus" ? "Die Diktierfunktion ist aus. So machst du sie an:" : "Das Mikrofon ist aus. So machst du es an:"}</p>
        <StepList steps={steps} />
        <p className="text-sm text-muted">Dann zurück zu mir und nochmal tippen.</p>
        {still && (
          <p className="rounded-field bg-warn-soft px-3 py-2 text-sm font-semibold text-warn-ink" role="status">
            Hm, noch aus. Schau nochmal bei Schritt 3.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setGuide(true)} className={buttonClass("secondary", "md")}>
            <Play className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Zeig’s mir
          </button>
          <button type="button" onClick={retry} className={buttonClass("primary", "md")}>
            Nochmal versuchen
          </button>
        </div>
        <button type="button" onClick={preferTyping} className="hit mx-auto min-h-11 text-[15px] font-semibold text-muted">
          Lieber tippen
        </button>
      </div>
    </Sheet>
  );
}
