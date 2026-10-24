"use client";

// Spracheingabe (Web Speech API, Deutsch) für die Bühne mit Mia, Eingabeleiste,
// "Was ist noch da?", Plus der Einkaufsliste, Kennenlernen und Rezept erzählen.
// Jede Aufnahme ist eine frische Sitzung: Die alte Erkennung wird sauber
// beendet, ihre Ergebnisse zählen nicht mehr. Der Hook liefert immer den
// GANZEN Text der aktuellen Aufnahme (nie angehängt). Die Mitschrift
// (`mitschrift.ts`) sorgt dafür, dass nichts verloren geht: Neustarts der
// Ergebnisliste werden angehängt, am Ende zählt auch der unfertige Teil.
// Auf der Bühne (`buehne`) schickt eine kurze Atempause nichts ab: beendet
// der Browser nach Stille, hört Mia still weiter; abgeschickt wird erst nach
// 2,5 s Stille nach dem letzten Wort, beim Antippen oder bei „fertig“.
// Ein gesperrtes Mikro meldet `core/mic` (Mikro-Check, grauer Knopf).
// Ist Mias Ohr vom Server eingerichtet (`stimmeClient`), nimmt die Bühne
// selbst auf (`aufnahme.ts`, nur Mikrofon-Freigabe nötig), erkennt das
// Satzende am Pegel und lässt den Ton auf dem Server verstehen; geht das
// nicht, hört sie wie bisher über den Browser.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { setAvatarFlag } from "@/lib/core/avatarState";
import { hintSeen } from "@/lib/core/hints";
import { claimMic, classifyMicError, guardMic, micPlatform, micState, micSubscribe, releaseMic, reportMicBlocked } from "@/lib/core/mic";
import { micLog } from "@/lib/core/micLog";
import { aufnahmeStarten, type Aufnahme } from "@/lib/begleitung/aufnahme";
import { aufnahmeVerstehen, serverOhr } from "@/lib/begleitung/stimmeClient";
import { serverStimme, serverStimmeJetzt } from "@/lib/begleitung/zugang";
import { BUEHNE_MAX_MS, NICHTS_MS, STILLE_MS, WARTEN_AB_MS, etwasGesagt, mitErgebnis, mitNeustart, mitschriftText, neueMitschrift, withoutPrevious, type Mitschrift } from "@/lib/begleitung/mitschrift";

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

/** Jede Spracheingabe ist ein eigener Mikro-Nutzer (core/mic: immer nur einer) */
let speechUsers = 0;

/**
 * Text der letzten Aufnahme und wann er abgeschickt wurde – geräteweit, nicht
 * je Eingabefeld: Der Browser kann ihn auch in einem neu geöffneten Feld
 * erneut mitliefern (nur „gerade eben“ und nur bei mehr als einem Wort).
 */
let previousText = "";
let previousAt = 0;
const remember = (text: string) => {
  if (!text) return;
  previousText = text;
  previousAt = Date.now();
};

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
  /**
   * Auf der Bühne mit Mia: eine kurze Atempause schickt nichts ab. Beendet der
   * Browser nach Stille, hört Mia still weiter; abgeschickt wird nach 2,5 s
   * Stille nach dem letzten Wort, beim Antippen (stop) oder bei „fertig“
   * (höchstens 2 Minuten am Stück).
   */
  buehne?: boolean;
};

const LONG_MS = 5 * 60_000;
const STOP_WORDS = /[\s,.]*(?:fertig|das\s+war[’']?s)[\s.!]*$/i;
/** Langes Zuhören: „… fertig“ am Ende = Schluss (das Wort selbst gehört nicht zum Text) */
export const stripStopWord = (text: string) => (STOP_WORDS.test(text) ? { text: text.replace(STOP_WORDS, "").trim(), stop: true } : { text, stop: false });

export function useSpeechInput({ onTranscript, onEnd, long = false, buehne = false }: Options) {
  const supported = useSpeechSupported();
  /** Mikro gesperrt (geräteweit) – Knopf grau, Tipp öffnet die Hilfe */
  const blocked = useSyncExternalStore(micSubscribe, () => micState().block !== null, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  /** Bühne: es ist still, gleich wird abgeschickt (Ring läuft ab) */
  const [wartet, setWartet] = useState(false);
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
  const [micName] = useState(() => `sprache-${++speechUsers}`);
  const micId = useRef(micName);
  // Immer die aktuellen Rückrufe nutzen, ohne die Erkennung neu zu starten
  const callbacks = useRef({ onTranscript, onEnd });
  useEffect(() => {
    callbacks.current = { onTranscript, onEnd };
  });

  /** Eigene Aufnahme (Ohr vom Server) und ihre Nummer – ältere melden nichts mehr */
  const ohrRef = useRef<Aufnahme | null>(null);
  const ohrLauf = useRef(0);

  /** Laufende Erkennung beenden, ohne dass noch etwas von ihr ankommt */
  const detach = useCallback(() => {
    flagListening(false);
    ohrLauf.current++;
    ohrRef.current?.abbrechen();
    ohrRef.current = null;
    const old = recognitionRef.current;
    recognitionRef.current = null;
    sessionRef.current++;
    releaseMic(micId.current);
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

  /** Neu starten nach Stille (lang/Bühne) – Verweis, weil `begin` sich selbst aufruft */
  const restart = useRef<(m: Mitschrift, startedAt: number, neustarts: number) => void>(() => {});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Eine Aufnahme kann aus mehreren Erkennungen bestehen (Neustart nach Stille) – Zeitgeber gelten für die ganze Aufnahme */
  const aufnahmeRef = useRef(0);
  const finishRef = useRef<() => void>(() => {});
  const heardRef = useRef(false);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  // Bühne: früh nachfragen, ob Mias Ohr vom Server da ist
  useEffect(() => {
    if (buehne) void serverStimme();
  }, [buehne]);

  /** Bühne mit Mias Ohr vom Server: selbst aufnehmen, Satzende am Pegel, Text vom Server */
  const beginOhr = useCallback(() => {
    clearTimers();
    detach();
    const lauf = ++ohrLauf.current;
    const aktuell = () => lauf === ohrLauf.current;
    heardRef.current = false;
    textRef.current = "";
    setError("");
    setInterim("");
    setWartet(false);
    const zuEnde = () => {
      ohrRef.current = null;
      releaseMic(micId.current);
      setListening(false);
      flagListening(false);
      setWartet(false);
    };
    const ohr = aufnahmeStarten({
      laut: () => {
        heardRef.current = true;
      },
      wartet: (an) => aktuell() && setWartet(an),
      fertig: (ton, ms) => {
        if (!aktuell()) return;
        zuEnde();
        if (!ton) return callbacks.current.onEnd?.("");
        micLog(`Ohr: ${Math.round(ms / 100) / 10} s an den Server`);
        setAvatarFlag("denken", true);
        void aufnahmeVerstehen(ton, ms).then((said) => {
          setAvatarFlag("denken", false);
          if (!aktuell()) return;
          if (said === null) {
            setError("Hat grad nicht geklappt. Nochmal?");
            return callbacks.current.onEnd?.("");
          }
          const text = stripStopWord(said).text;
          textRef.current = text;
          callbacks.current.onTranscript(text);
          remember(text);
          callbacks.current.onEnd?.(text);
        });
      },
      fehler: (name) => {
        if (!aktuell()) return;
        zuEnde();
        const block = classifyMicError(name, micPlatform(navigator.userAgent));
        if (block) reportMicBlocked(block);
        else setError("Spracheingabe hat nicht geklappt. Tipp es einfach ein.");
      },
    });
    ohrRef.current = ohr;
    claimMic(micId.current, () => {
      ohrLauf.current++;
      ohr.abbrechen();
      zuEnde();
    });
    setListening(true);
    flagListening(true);
  }, [clearTimers, detach, flagListening]);

  const begin = useCallback(
    (fortsetzung: Mitschrift | null = null, startedAt = Date.now(), neustarts = 0) => {
      const weiter = fortsetzung !== null;
      if (buehne && !weiter && serverOhr(serverStimmeJetzt())) return beginOhr();
      const Recognition = speechRecognitionClass();
      if (!Recognition) return;
      // Beim Weiterhören die Zeitgeber (Stille, Ende) behalten
      if (!weiter) {
        clearTimers();
        aufnahmeRef.current++;
        heardRef.current = false;
      }
      const aufnahme = aufnahmeRef.current;
      detach();
      const session = sessionRef.current;
      let m: Mitschrift = fortsetzung ?? neueMitschrift();
      let stoppedByUser = false;
      let finished = false;
      if (weiter && etwasGesagt(m)) heardRef.current = true;
      const sinceSent = Date.now() - previousAt;
      let text = mitschriftText(m);
      textRef.current = text;
      setError("");
      if (!weiter) {
        setInterim("");
        setWartet(false);
      }

      const recognition = new Recognition();
      recognition.lang = "de-DE";
      recognition.continuous = true;
      recognition.interimResults = true;

      /** Jetzt Schluss: Erkennung beenden, onend schickt ab */
      const finish = () => {
        if (finished) return;
        finished = true;
        stoppedByUser = true;
        clearTimers();
        try {
          recognition.stop();
        } catch {
          // schon beendet
        }
      };
      finishRef.current = finish;
      const gleicheAufnahme = () => aufnahme === aufnahmeRef.current;
      /** Bühne: Stille-Uhr neu stellen (nach jedem erkannten Wort) */
      const stilleNeu = () => {
        if (!buehne) return;
        clearTimers();
        setWartet(false);
        timers.current.push(setTimeout(() => gleicheAufnahme() && setWartet(true), WARTEN_AB_MS));
        timers.current.push(setTimeout(() => gleicheAufnahme() && finishRef.current(), STILLE_MS));
      };

      recognition.onresult = (e) => {
        if (session !== sessionRef.current) return;
        const results = Array.from({ length: e.results.length }, (_, i) => ({ isFinal: e.results[i].isFinal, text: e.results[i][0]?.transcript ?? "" }));
        m = mitErgebnis(m, e.resultIndex, results);
        const said = mitschriftText(m);
        if (said) heardRef.current = true;
        // Neue Sitzung, die mit dem eben Abgeschickten beginnt: das nicht doppelt
        text = weiter || long ? said : withoutPrevious(said, previousText, sinceSent);
        if (long || buehne) {
          const s = stripStopWord(text);
          text = s.text;
          if (s.stop) finish();
        }
        textRef.current = text;
        setInterim(m.pending);
        callbacks.current.onTranscript(text);
        if (said) stilleNeu();
      };
      recognition.onerror = (e) => {
        if (session !== sessionRef.current) return;
        const block = classifyMicError(e.error, micPlatform(navigator.userAgent));
        if (block) {
          // Sofort zurück: kein hängender Stopp-Knopf, Mikro-Check statt Kleingedrucktem
          clearTimers();
          detach();
          setListening(false);
          setInterim("");
          setWartet(false);
          reportMicBlocked(block);
          return;
        }
        // Kein Fehler, wenn selbst beendet ("aborted") oder schon etwas erkannt wurde
        if (e.error === "aborted" || stoppedByUser || heardRef.current || buehne) return;
        setError(e.error === "no-speech" ? "Hab nichts gehört. Nochmal?" : "Spracheingabe hat nicht geklappt. Tipp es einfach ein.");
      };
      recognition.onend = () => {
        if (session !== sessionRef.current) return;
        const elapsed = Date.now() - startedAt;
        // Stille beendet nicht: still weiter zuhören und anhängen (lang: 5 Min., Bühne: 2 Min.)
        if (!stoppedByUser && ((long && elapsed < LONG_MS) || (buehne && elapsed < BUEHNE_MAX_MS))) {
          micLog(`Zuhören: Neustart ${neustarts + 1}`);
          restart.current(mitNeustart(m), startedAt, neustarts + 1);
          return;
        }
        // Was diese Erkennung danach noch meldet, zählt nicht mehr
        clearTimers();
        sessionRef.current++;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognitionRef.current = null;
        releaseMic(micId.current);
        setListening(false);
        flagListening(false);
        setInterim("");
        setWartet(false);
        // Am Ende zählt alles: fertige Teile plus der letzte unfertige
        const all = mitschriftText(m);
        let final = weiter || long ? all : withoutPrevious(all, previousText, sinceSent);
        if (long || buehne) final = stripStopWord(final).text;
        if (buehne) micLog(`Zuhören: fertig nach ${neustarts} Neustart(s)`);
        remember(final);
        callbacks.current.onEnd?.(final);
      };
      recognitionRef.current = recognition;
      // Mikro übernehmen: z. B. eine laufende Pinnwand-Aufnahme endet vorher sauber
      claimMic(micId.current, () => {
        clearTimers();
        detach();
        setListening(false);
        setInterim("");
        setWartet(false);
      });
      (recognition as Recognition & { stopByUser?: () => void }).stopByUser = finish;
      // Bühne: niemand sagt etwas → leise wieder aufhören; feste Obergrenze
      if (buehne && !weiter) {
        timers.current.push(setTimeout(() => gleicheAufnahme() && !heardRef.current && finishRef.current(), NICHTS_MS));
      }
      try {
        recognition.start();
        setListening(true);
        flagListening(true);
      } catch {
        recognitionRef.current = null;
        releaseMic(micId.current);
        setError("Spracheingabe hat nicht geklappt. Tipp es einfach ein.");
      }
    },
    [detach, flagListening, long, buehne, clearTimers, beginOhr],
  );

  useEffect(() => {
    restart.current = begin;
  }, [begin]);

  /** Zuhören starten – gesperrt: Hilfe; allererstes Mal: erst „Darf ich zuhören?“ (im Tipp aufrufen) */
  const start = useCallback(() => guardMic(() => begin(), hintSeen("mikro-gefragt")), [begin]);

  // Beim Verlassen keine Zeitgeber übrig lassen
  useEffect(() => clearTimers, [clearTimers]);

  /** Aufnahme beenden – der erkannte Text wird über onEnd abgeschickt */
  const stop = useCallback(() => {
    if (ohrRef.current) return ohrRef.current.stoppen();
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
    clearTimers();
    detach();
    setListening(false);
    setInterim("");
    setWartet(false);
  }, [detach, clearTimers]);

  /**
   * Beim Absenden IMMER zuerst aufrufen: Aufnahme verwerfen (keine Rückrufe
   * mehr) und den bisher erkannten Text als "schon abgeschickt" merken – so
   * kann weder onEnd noch die nächste Aufnahme ihn wieder ins Feld schreiben.
   */
  const reset = useCallback(() => {
    remember(textRef.current);
    textRef.current = "";
    clearTimers();
    detach();
    setListening(false);
    setInterim("");
    setError("");
    setWartet(false);
  }, [detach, clearTimers]);

  return { supported, blocked, listening, interim, error, wartet, start, stop, cancel, reset };
}
