"use client";

// Eingabe unten im Chat: Hinweis zur Spracheingabe, Vorschläge, mehrzeiliges
// Feld (Enter schickt ab) und rechts Mikrofon bzw. Senden-Knopf.

import { useEffect, type RefObject } from "react";
import { ArrowUp, Mic, MicOff, Square } from "lucide-react";
import { INPUT_BASE } from "@/components/ui/styles";
import type { useSpeechInput } from "@/lib/begleitung/useSpeechInput";
import { SuggestionChips } from "@/components/begleitung/SuggestionChips";
import { MIC_BLOCKED, MicStrip } from "@/components/ui/MicPermission";

type Props = {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  setInput: (text: string) => void;
  name: string;
  canType: boolean;
  busy: boolean;
  speech: ReturnType<typeof useSpeechInput>;
  dictationHint: boolean;
  suggestions: string[];
  onSubmit: (text: string) => void;
  onToggleMic: () => void;
};

export function ChatInputBar({ inputRef, input, setInput, name, canType, busy, speech, dictationHint, suggestions, onSubmit, onToggleMic }: Props) {
  // Eingabefeld wächst mit (eingefügte Mails), höchstens ~6 Zeilen
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [input, inputRef]);

  return (
        <footer className="safe-bottom flex flex-col gap-2 border-t border-line px-4 pt-3">
          <MicStrip />
          {(speech.error || dictationHint) && (
            <p className="text-sm text-muted" role="note">
              {speech.error ||
                "Spracheingabe gibt es in diesem Browser nicht – tipp aufs Mikrofon deiner Tastatur und diktiere einfach."}
            </p>
          )}
          {suggestions.length > 0 && <SuggestionChips suggestions={suggestions} onPick={onSubmit} />}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              // Selbst abgeschickt, während das Mikrofon läuft: Aufnahme verwerfen
              if (speech.listening) speech.cancel();
              onSubmit(input);
            }}
          >
            {/* Mehrzeilig, damit eingefügte Mails ihre Absätze behalten; Enter schickt ab */}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              disabled={!canType}
              enterKeyHint="send"
              aria-label="Nachricht schreiben"
              placeholder={`Sag ${name}, was ansteht …`}
              className={`${INPUT_BASE} field-sizing-content max-h-36 min-h-12 flex-1 resize-none px-4 py-3 leading-snug`}
            />
            {/* Mikrofon immer rechts; beim Tippen wird es zum Senden-Knopf */}
            {input.trim() ? (
            <button
              type="submit"
              disabled={!canType || busy || !input.trim()}
              aria-label="Senden"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm transition active:scale-95 disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
            ) : (
            <button
              type="button"
              onClick={onToggleMic}
              disabled={!canType || busy}
              aria-pressed={speech.listening}
              aria-label={speech.blocked ? "Mikro aus – so machst du es an" : speech.listening ? "Zuhören beenden" : "Frage einsprechen"}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${speech.blocked ? MIC_BLOCKED : "bg-accent text-on-accent shadow-md"} transition active:scale-95 disabled:opacity-40 ${
                speech.listening ? "animate-pulse ring-4 ring-accent/25" : ""
              }`}
            >
              {speech.blocked ? (
                <MicOff className="h-6 w-6" strokeWidth={2} aria-hidden />
              ) : speech.listening ? (
                <Square className="h-5 w-5 fill-current" strokeWidth={2} aria-hidden />
              ) : speech.supported === false ? (
                <MicOff className="h-6 w-6" strokeWidth={2} aria-hidden />
              ) : (
                <Mic className="h-6 w-6" strokeWidth={2} aria-hidden />
              )}
            </button>
            )}
          </form>
        </footer>
  );
}
