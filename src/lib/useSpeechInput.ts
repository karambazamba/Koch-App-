"use client";

// Spracheingabe (Web Speech API, Deutsch) für "Was ist noch da?" und den
// Küchenhelfer. Fehler werden nur bei echten Problemen gemeldet – nicht, wenn
// selbst beendet wurde oder schon etwas erkannt ist.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Minimal-Typen für die Web Speech API (nicht in allen TS-Libs enthalten)
type SpeechResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: SpeechResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function speechRecognitionClass(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

/** Gibt es Spracheingabe? Erst im Browser bekannt (beim Vorrendern `null`). */
export function useSpeechSupported(): boolean | null {
  return useSyncExternalStore(noopSubscribe, () => Boolean(speechRecognitionClass()), () => null);
}

type Options = {
  /** Jede Sprechpause liefert einen fertigen Abschnitt */
  onFinal: (text: string) => void;
  /** Aufnahme vorbei (selbst beendet oder Stille) */
  onEnd?: () => void;
};

export function useSpeechInput({ onFinal, onEnd }: Options) {
  const supported = useSpeechSupported();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  const stoppedByUserRef = useRef(false);
  const heardRef = useRef(false);
  // Immer die aktuellen Rückrufe nutzen, ohne die Erkennung neu zu starten
  const callbacks = useRef({ onFinal, onEnd });
  useEffect(() => {
    callbacks.current = { onFinal, onEnd };
  });

  // Beim Verlassen nicht weiter zuhören
  useEffect(() => () => recognitionRef.current?.stop(), []);

  const start = useCallback(() => {
    const Recognition = speechRecognitionClass();
    if (!Recognition) return;
    setError("");
    stoppedByUserRef.current = false;
    heardRef.current = false;
    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result[0].transcript.trim()) heardRef.current = true;
        if (result.isFinal) callbacks.current.onFinal(result[0].transcript);
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    recognition.onerror = (e) => {
      const blocked = e.error === "not-allowed" || e.error === "service-not-allowed";
      // Kein Fehler, wenn selbst beendet ("aborted") oder schon etwas erkannt wurde
      if (!blocked && (e.error === "aborted" || stoppedByUserRef.current || heardRef.current)) return;
      setError(
        blocked
          ? "Das Mikrofon ist nicht erlaubt – bitte in den Einstellungen freigeben oder einfach tippen."
          : e.error === "no-speech"
            ? "Ich habe nichts gehört – nochmal versuchen?"
            : "Spracheingabe hat nicht geklappt – tipp es einfach ein.",
      );
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
      callbacks.current.onEnd?.();
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    stoppedByUserRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  return { supported, listening, interim, error, start, stop };
}
