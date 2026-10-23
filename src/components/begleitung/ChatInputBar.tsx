"use client";

// Tippen auf der Bühne (unter der kleinen Mia): Mikro-Streifen, Hinweis zur
// Spracheingabe, Vorschläge, mehrzeiliges Feld (Enter schickt ab) und Senden.
// Kein Mikrofon-Knopf – sprechen heißt: Mia antippen.

import { useEffect, type RefObject } from "react";
import { ArrowUp } from "lucide-react";
import { INPUT_BASE } from "@/components/ui/styles";
import type { useSpeechInput } from "@/lib/begleitung/useSpeechInput";
import { SuggestionChips } from "@/components/begleitung/SuggestionChips";
import { MicStrip } from "@/components/ui/MicPermission";

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
};

export function ChatInputBar({ inputRef, input, setInput, name, canType, busy, speech, dictationHint, suggestions, onSubmit }: Props) {
  // Eingabefeld wächst mit (eingefügte Mails), höchstens ~6 Zeilen
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [input, inputRef]);

  return (
        <footer className="safe-bottom flex w-full flex-col gap-2 px-4 pt-2">
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
            <button
              type="submit"
              disabled={!canType || busy || !input.trim()}
              aria-label="Senden"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm transition active:scale-95 disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          </form>
        </footer>
  );
}
