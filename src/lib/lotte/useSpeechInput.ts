"use client";

// Spracheingabe (Web Speech API, Deutsch) für Küchenhelfer, Eingabeleiste,
// "Was ist noch da?", Plus der Einkaufsliste, Kennenlernen und Rezept erzählen.
// Jede Aufnahme ist eine frische Sitzung: Die alte Erkennung wird sauber
// beendet, ihre Ergebnisse zählen nicht mehr. Der Hook liefert immer den
// GANZEN Text der aktuellen Aufnahme (nie angehängt) – so kann nichts doppelt
// oder von früher mitkommen. Fehler werden nur bei echten Problemen gemeldet.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { setAvatarFlag } from "../core/avatarState";

// Minimal-Typen für die Web Speech API (nicht in allen TS-Libs enthalten)
type SpeechResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
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
function useSpeechSupported(): boolean | null {
  return useSyncExternalStore(noopSubscribe, () => Boolean(speechRecognitionClass()), () => null);
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ");

/**
 * Text der letzten Aufnahme – geräteweit, nicht je Eingabefeld: Der Browser
 * kann ihn auch in einem anderen (neu geöffneten) Feld erneut mitliefern.
 */
let previousText = "";

/**
 * Fertige Abschnitte zu einem Text zusammensetzen. Manche Geräte (Android
 * Chrome) liefern fertige Abschnitte kumuliert ("Milch", "Milch und Eier") –
 * dann zählt nur der längere.
 */
export function joinFinals(finals: string[]): string {
  const kept: string[] = [];
  for (const raw of finals) {
    const f = norm(raw);
    if (!f) continue;
    const last = kept[kept.length - 1];
    if (last && f.toLowerCase().startsWith(last.toLowerCase())) kept[kept.length - 1] = f;
    else if (last && last.toLowerCase().startsWith(f.toLowerCase())) continue;
    else kept.push(f);
  }
  return kept.join(" ");
}

/**
 * Text einer neuen Aufnahme ohne den eben schon abgeschickten Text davor
 * (manche Browser liefern ihn in der nächsten Sitzung erneut mit: "alt neu").
 */
export function withoutPrevious(text: string, previous: string): string {
  const t = norm(text);
  const p = norm(previous);
  if (p && t.length > p.length && t.toLowerCase().startsWith(`${p.toLowerCase()} `)) return t.slice(p.length).trim();
  return t;
}

type Options = {
  /** Text der aktuellen Aufnahme bisher (fertig erkannte Teile) – ersetzt, nie anhängen */
  onTranscript: (text: string) => void;
  /** Aufnahme vorbei (selbst beendet oder Stille) – mit dem ganzen Text dieser Aufnahme */
  onEnd?: (text: string) => void;
};

export function useSpeechInput({ onTranscript, onEnd }: Options) {
  const supported = useSpeechSupported();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  // Avatar der Begleitung hört zu, solange dieses Mikrofon an ist
  const listeningFlag = useRef(false);
  const flagListening = useCallback((on: boolean) => {
    if (listeningFlag.current === on) return;
    listeningFlag.current = on;
    setAvatarFlag("zuhoeren", on);
  }, []);
  /** Nummer der aktuellen Sitzung – Ergebnisse älterer Sitzungen werden ignoriert */
  const sessionRef = useRef(0);
  // Immer die aktuellen Rückrufe nutzen, ohne die Erkennung neu zu starten
  const callbacks = useRef({ onTranscript, onEnd });
  useEffect(() => {
    callbacks.current = { onTranscript, onEnd };
  });

  /** Laufende Erkennung beenden, ohne dass noch etwas von ihr ankommt */
  const detach = useCallback(() => {
    flagListening(false);
    const old = recognitionRef.current;
    recognitionRef.current = null;
    sessionRef.current++;
    if (!old) return;
    old.onresult = null;
    old.onerror = null;
    old.onend = null;
    try {
      if (old.abort) old.abort();
      else old.stop();
    } catch {
      // schon beendet
    }
  }, [flagListening]);

  // Beim Verlassen (z. B. Chat schließen): abbrechen, nichts abschicken
  useEffect(() => () => detach(), [detach]);

  const start = useCallback(() => {
    const Recognition = speechRecognitionClass();
    if (!Recognition) return;
    detach();
    const session = sessionRef.current;
    const finals: string[] = [];
    let stoppedByUser = false;
    let heard = false;
    let text = "";
    setError("");
    setInterim("");

    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      if (session !== sessionRef.current) return;
      let pending = "";
      // Nur Ergebnisse dieser Aufnahme, ab resultIndex; fertige je Position merken
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const said = result[0]?.transcript ?? "";
        if (said.trim()) heard = true;
        if (result.isFinal) finals[i] = said;
        else pending += said;
      }
      text = withoutPrevious(joinFinals(finals.filter((f) => f !== undefined)), previousText);
      setInterim(pending);
      callbacks.current.onTranscript(text);
    };
    recognition.onerror = (e) => {
      if (session !== sessionRef.current) return;
      const blocked = e.error === "not-allowed" || e.error === "service-not-allowed";
      // Kein Fehler, wenn selbst beendet ("aborted") oder schon etwas erkannt wurde
      if (!blocked && (e.error === "aborted" || stoppedByUser || heard)) return;
      setError(
        blocked
          ? "Das Mikrofon ist nicht erlaubt – bitte in den Einstellungen freigeben oder einfach tippen."
          : e.error === "no-speech"
            ? "Ich habe nichts gehört – nochmal versuchen?"
            : "Spracheingabe hat nicht geklappt – tipp es einfach ein.",
      );
    };
    recognition.onend = () => {
      if (session !== sessionRef.current) return;
      // Was diese Erkennung danach noch meldet, zählt nicht mehr
      sessionRef.current++;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognitionRef.current = null;
      setListening(false);
      flagListening(false);
      setInterim("");
      if (text) previousText = text;
      callbacks.current.onEnd?.(text);
    };
    recognitionRef.current = recognition;
    (recognition as Recognition & { stopByUser?: () => void }).stopByUser = () => {
      stoppedByUser = true;
    };
    try {
      recognition.start();
      setListening(true);
      flagListening(true);
    } catch {
      recognitionRef.current = null;
      setError("Spracheingabe hat nicht geklappt – tipp es einfach ein.");
    }
  }, [detach, flagListening]);

  /** Aufnahme beenden – der erkannte Text wird über onEnd abgeschickt */
  const stop = useCallback(() => {
    const r = recognitionRef.current as (Recognition & { stopByUser?: () => void }) | null;
    if (!r) return;
    r.stopByUser?.();
    try {
      r.stop();
    } catch {
      // schon beendet
    }
  }, []);

  /** Aufnahme abbrechen – nichts wird abgeschickt, alles ist leer */
  const cancel = useCallback(() => {
    detach();
    setListening(false);
    setInterim("");
  }, [detach]);

  return { supported, listening, interim, error, start, stop, cancel };
}
