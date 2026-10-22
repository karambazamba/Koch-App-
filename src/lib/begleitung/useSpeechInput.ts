"use client";

// Spracheingabe (Web Speech API, Deutsch) für Küchenhelfer, Eingabeleiste,
// "Was ist noch da?", Plus der Einkaufsliste, Kennenlernen und Rezept erzählen.
// Jede Aufnahme ist eine frische Sitzung: Die alte Erkennung wird sauber
// beendet, ihre Ergebnisse zählen nicht mehr. Der Hook liefert immer den
// GANZEN Text der aktuellen Aufnahme (nie angehängt) – so kann nichts doppelt
// oder von früher mitkommen. Fehler werden nur bei echten Problemen gemeldet;
// ein gesperrtes Mikro meldet `core/mic` (Hilfe-Fenster, grauer Knopf).

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { setAvatarFlag } from "@/lib/core/avatarState";
import { hintSeen, markHintSeen } from "@/lib/core/hints";
import { classifyMicError, guardMic, micPlatform, micState, micSubscribe, reportMicBlocked, setMicPermission } from "@/lib/core/mic";

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

/**
 * Mikrofon im selben Tipp freigeben lassen (iPhone und Android fragen nur bei
 * einer Berührung) – z. B. beim Sprech-Knopf des Hallo-Bildschirms, bevor die
 * Leiste mit `useSpeechInput` zuhört. Muss direkt im Tipp aufgerufen werden.
 * "ok" = darf zuhören, "blocked" = abgelehnt/kein Mikrofon, "none" = kein Sprechen im Browser.
 */
export async function primeMicrophone(): Promise<"ok" | "blocked" | "none"> {
  if (!speechRecognitionClass()) return "none";
  const media = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
  // Ohne Abfrage-Möglichkeit fragt die Erkennung selbst
  if (!media?.getUserMedia) return "ok";
  try {
    const stream = await media.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    // Gefragt und erlaubt: keine Vorab-Frage mehr nötig
    markHintSeen("mikro-gefragt");
    setMicPermission("granted");
    return "ok";
  } catch (e) {
    const block = classifyMicError((e as Error)?.name ?? "", micPlatform(navigator.userAgent));
    if (block) reportMicBlocked(block);
    return "blocked";
  }
}

type Options = {
  /** Text der aktuellen Aufnahme bisher (fertig erkannte Teile) – ersetzt, nie anhängen */
  onTranscript: (text: string) => void;
  /** Aufnahme vorbei (selbst beendet oder Stille) – mit dem ganzen Text dieser Aufnahme */
  onEnd?: (text: string) => void;
  /**
   * Langes Zuhören (Wochencheck): Pausen sind okay – beendet der Browser nach
   * Stille, hört es von selbst weiter und hängt an; Schluss mit „Fertig“
   * (Knopf oder gesagt: „fertig“, „das war’s“) oder nach 5 Minuten.
   */
  long?: boolean;
};

const LONG_MS = 5 * 60_000;
const STOP_WORDS = /[\s,.]*(?:fertig|das\s+war[’']?s)[\s.!]*$/i;
/** Langes Zuhören: „… fertig“ am Ende = Schluss (das Wort selbst gehört nicht zum Text) */
export const stripStopWord = (text: string) => (STOP_WORDS.test(text) ? { text: text.replace(STOP_WORDS, "").trim(), stop: true } : { text, stop: false });

export function useSpeechInput({ onTranscript, onEnd, long = false }: Options) {
  const supported = useSpeechSupported();
  /** Mikro gesperrt (geräteweit) – Knopf grau, Tipp öffnet die Hilfe */
  const blocked = useSyncExternalStore(micSubscribe, () => micState().block !== null, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<Recognition | null>(null);
  /** Text der laufenden Aufnahme bisher (für reset) */
  const textRef = useRef("");
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

  /** Neu starten beim langen Zuhören (Verweis, weil `begin` sich selbst aufruft) */
  const restart = useRef<(base: string, startedAt: number) => void>(() => {});
  const begin = useCallback((base = "", startedAt = Date.now()) => {
    const Recognition = speechRecognitionClass();
    if (!Recognition) return;
    detach();
    const session = sessionRef.current;
    const finals: string[] = [];
    let stoppedByUser = false;
    let heard = false;
    let text = "";
    textRef.current = "";
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
      const own = joinFinals(finals.filter((f) => f !== undefined));
      // Weiter zuhören (lang): an den bisherigen Text anhängen
      text = base ? `${base} ${own}`.trim() : withoutPrevious(own, previousText);
      if (long) {
        const said = stripStopWord(text);
        text = said.text;
        if (said.stop) {
          stoppedByUser = true;
          try {
            recognition.stop();
          } catch {
            // schon beendet
          }
        }
      }
      textRef.current = text;
      setInterim(pending);
      callbacks.current.onTranscript(text);
    };
    recognition.onerror = (e) => {
      if (session !== sessionRef.current) return;
      const block = classifyMicError(e.error, micPlatform(navigator.userAgent));
      if (block) {
        // Sofort zurück: kein hängender Stopp-Knopf, Hilfe statt Kleingedrucktem
        detach();
        setListening(false);
        setInterim("");
        reportMicBlocked(block);
        return;
      }
      // Kein Fehler, wenn selbst beendet ("aborted") oder schon etwas erkannt wurde
      if (e.error === "aborted" || stoppedByUser || heard) return;
      setError(
        e.error === "no-speech"
            ? "Ich habe nichts gehört – nochmal versuchen?"
            : "Spracheingabe hat nicht geklappt – tipp es einfach ein.",
      );
    };
    recognition.onend = () => {
      if (session !== sessionRef.current) return;
      // Lang: Stille beendet nicht – weiter zuhören und anhängen (höchstens 5 Minuten)
      if (long && !stoppedByUser && Date.now() - startedAt < LONG_MS) {
        restart.current(text, startedAt);
        return;
      }
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
  }, [detach, flagListening, long]);

  useEffect(() => {
    restart.current = begin;
  }, [begin]);

  /** Zuhören starten – gesperrt: Hilfe; allererstes Mal: erst „Darf ich zuhören?“ (im Tipp aufrufen) */
  const start = useCallback(() => guardMic(() => begin(), hintSeen("mikro-gefragt")), [begin]);

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

  /**
   * Beim Absenden IMMER zuerst aufrufen: Aufnahme verwerfen (keine Rückrufe
   * mehr) und den bisher erkannten Text als "schon abgeschickt" merken – so
   * kann weder onEnd noch die nächste Aufnahme ihn wieder ins Feld schreiben.
   */
  const reset = useCallback(() => {
    if (textRef.current) previousText = textRef.current;
    textRef.current = "";
    detach();
    setListening(false);
    setInterim("");
    setError("");
  }, [detach]);

  return { supported, blocked, listening, interim, error, start, stop, cancel, reset };
}
