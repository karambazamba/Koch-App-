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
// Die Browser-Erkennung selbst (Wachhund, Notausgang, erzwungenes Ende) steckt
// in `spracherk().ts`; vor jedem Zuhören verstummt Mia (`vorDemZuhoeren`),
// und kommt die App aus dem Hintergrund zurück, ist alles zurückgesetzt.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { setAvatarFlag } from "@/lib/core/avatarState";
import { hintSeen } from "@/lib/core/hints";
import { claimMic, classifyMicError, guardMic, micPlatform, micState, micSubscribe, releaseMic, reportMicBlocked } from "@/lib/core/mic";
import { micLog } from "@/lib/core/micLog";
import { aufnahmeStarten, type Aufnahme } from "@/lib/begleitung/aufnahme";
import { aufnahmeVerstehen, serverOhr } from "@/lib/begleitung/stimmeClient";
import { serverStimme, serverStimmeJetzt } from "@/lib/begleitung/zugang";
import { Spracherkennung, remember, stripStopWord, vorDemZuhoeren, type Anzeige, type RecognitionClass } from "@/lib/begleitung/spracherkennung";

function speechRecognitionClass(): RecognitionClass | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

/** Gibt es Spracheingabe? Erst im Browser bekannt (beim Vorrendern `null`). */
function useSpeechSupported(): boolean | null {
  return useSyncExternalStore(noopSubscribe, () => Boolean(speechRecognitionClass()), () => null);
}

/** Jede Spracheingabe ist ein eigener Mikro-Nutzer (core/mic: immer nur einer) */
let speechUsers = 0;

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

export { stripStopWord };

export function useSpeechInput({ onTranscript, onEnd, long = false, buehne = false }: Options) {
  const supported = useSpeechSupported();
  /** Mikro gesperrt (geräteweit) – Knopf grau, Tipp öffnet die Hilfe */
  const blocked = useSyncExternalStore(micSubscribe, () => micState().block !== null, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  /** Bühne: es ist still, gleich wird abgeschickt (Ring läuft ab) */
  const [wartet, setWartet] = useState(false);
  // Avatar der Begleitung hört zu, solange dieses Mikrofon an ist
  const listeningFlag = useRef(false);
  const flagListening = useCallback((on: boolean) => {
    if (listeningFlag.current === on) return;
    listeningFlag.current = on;
    setAvatarFlag("zuhoeren", on);
  }, []);
  const [micName] = useState(() => `sprache-${++speechUsers}`);
  const micId = useRef(micName);
  // Immer die aktuellen Rückrufe nutzen, ohne die Erkennung neu zu starten
  const callbacks = useRef({ onTranscript, onEnd });
  useEffect(() => {
    callbacks.current = { onTranscript, onEnd };
  });

  const anzeige = useRef<Anzeige>({
    listening: (on) => {
      setListening(on);
      flagListening(on);
    },
    interim: setInterim,
    error: setError,
    wartet: setWartet,
    transcript: (text) => callbacks.current.onTranscript(text),
    end: (text) => callbacks.current.onEnd?.(text),
  });
  // Die Erkennung entsteht beim ersten Gebrauch (nie beim Rendern)
  const erkennungRef = useRef<Spracherkennung | null>(null);
  const opts = useRef({ long, buehne });
  const erk = useCallback(() => (erkennungRef.current ??= new Spracherkennung({ micId: micId.current, ...opts.current, klasse: speechRecognitionClass, anzeige: () => anzeige.current })), []);

  /** Eigene Aufnahme (Ohr vom Server) und ihre Nummer – ältere melden nichts mehr */
  const ohrRef = useRef<Aufnahme | null>(null);
  const ohrLauf = useRef(0);
  /** Wartet gerade auf Mias Verstummen (abbrechbar) */
  const warteRef = useRef<() => void>(() => {});

  /** Laufende Erkennung beenden, ohne dass noch etwas von ihr ankommt */
  const detach = useCallback(() => {
    warteRef.current();
    warteRef.current = () => {};
    ohrLauf.current++;
    const hatteOhr = ohrRef.current !== null;
    ohrRef.current?.abbrechen();
    ohrRef.current = null;
    if (hatteOhr) releaseMic(micId.current);
    erk().detach();
  }, [erk]);

  // Beim Verlassen (z. B. Chat schließen): abbrechen, nichts abschicken
  useEffect(() => () => detach(), [detach]);

  // Bühne: früh nachfragen, ob Mias Ohr vom Server da ist
  useEffect(() => {
    if (buehne) void serverStimme();
  }, [buehne]);

  /** Bühne mit Mias Ohr vom Server: selbst aufnehmen, Satzende am Pegel, Text vom Server */
  const beginOhr = useCallback(() => {
    erk().cancel();
    detach();
    const lauf = ++ohrLauf.current;
    const aktuell = () => lauf === ohrLauf.current;
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
      laut: () => {},
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
        else setError("Spracheingabe hat nicht geklappt. Schreib’s einfach.");
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
  }, [detach, erk, flagListening]);

  const begin = useCallback(() => {
    if (buehne && serverOhr(serverStimmeJetzt())) return beginOhr();
    erk().begin();
  }, [buehne, beginOhr, erk]);

  /** Zuhören starten – gesperrt: Hilfe; allererstes Mal: erst „Darf ich zuhören?“ (im Tipp aufrufen) */
  const start = useCallback(
    () =>
      guardMic(() => {
        // Vor jedem Zuhören: Mia verstummt, kurz warten, bis das iPhone den Ton freigibt
        warteRef.current();
        warteRef.current = vorDemZuhoeren(() => {
          warteRef.current = () => {};
          begin();
        });
      }, hintSeen("mikro-gefragt")),
    [begin],
  );

  // Zurück aus dem Hintergrund: laufendes Zuhören beenden, alles zurücksetzen
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      if (!erk().aktiv && !ohrRef.current) return;
      micLog("Hintergrund: Zuhören beendet");
      erk().cancel();
      detach();
      setListening(false);
      flagListening(false);
      setInterim("");
      setWartet(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [detach, erk, flagListening]);

  /** Aufnahme beenden – der erkannte Text wird über onEnd abgeschickt (hängt sie: neu zuhören) */
  const stop = useCallback(() => {
    if (ohrRef.current) return ohrRef.current.stoppen();
    erk().stop();
  }, [erk]);

  /** Aufnahme abbrechen – nichts wird abgeschickt, alles ist leer */
  const cancel = useCallback(() => {
    erk().cancel();
    detach();
    setListening(false);
    setInterim("");
    setWartet(false);
  }, [detach, erk]);

  /**
   * Beim Absenden IMMER zuerst aufrufen: Aufnahme verwerfen (keine Rückrufe
   * mehr) und den bisher erkannten Text als "schon abgeschickt" merken – so
   * kann weder onEnd noch die nächste Aufnahme ihn wieder ins Feld schreiben.
   */
  const reset = useCallback(() => {
    erk().reset();
    detach();
    setListening(false);
    setInterim("");
    setError("");
    setWartet(false);
  }, [detach, erk]);

  return { supported, blocked, listening, interim, error, wartet, start, stop, cancel, reset };
}
