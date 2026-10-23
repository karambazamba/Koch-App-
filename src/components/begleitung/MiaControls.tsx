"use client";

// Unten in der Mia-Ansicht: „Tippen“ (öffnet das Feld in der Mitte) und groß
// „Sprechen“ (orange, pulsiert beim Zuhören). „Foto“ kommt mit „Foto → Termin“.

import { Keyboard, Mic, MicOff, Square } from "lucide-react";
import { MIC_BLOCKED } from "@/components/ui/MicPermission";
import type { useSpeechInput } from "@/lib/begleitung/useSpeechInput";

type Props = { speech: ReturnType<typeof useSpeechInput>; typing: boolean; disabled: boolean; onType: () => void; onMic: () => void };

export function MiaControls({ speech, typing, disabled, onType, onMic }: Props) {
  return (
    <div className="safe-bottom flex items-center justify-center gap-10 px-4 pt-2">
      <button type="button" onClick={onType} aria-pressed={typing} aria-label="Tippen" className={`hit flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card active:scale-95 ${typing ? "ring-2 ring-accent/40" : ""}`}>
        <Keyboard className="h-6 w-6" strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onMic}
        disabled={disabled}
        aria-pressed={speech.listening}
        aria-label={speech.blocked ? "Mikro aus – so machst du es an" : speech.listening ? "Zuhören beenden" : "Frage einsprechen"}
        className={`relative flex h-[76px] w-[76px] items-center justify-center rounded-full shadow-float transition active:scale-95 disabled:opacity-40 ${speech.blocked ? MIC_BLOCKED : "bg-accent text-on-accent"}`}
      >
        {speech.listening && <span className="mia-wellen" aria-hidden />}
        {speech.blocked || speech.supported === false ? (
          <MicOff className="h-8 w-8" strokeWidth={2} aria-hidden />
        ) : speech.listening ? (
          <Square className="h-7 w-7 fill-current" strokeWidth={2} aria-hidden />
        ) : (
          <Mic className="h-8 w-8" strokeWidth={2} aria-hidden />
        )}
      </button>
      {/* Platzhalter für „Foto“ – hält „Sprechen“ in der Mitte */}
      <span className="h-14 w-14" aria-hidden />
    </div>
  );
}
