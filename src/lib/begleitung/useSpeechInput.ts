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
// 1,2 s Stille nach dem letzten Wort, beim Antippen oder bei „fertig“
// (eine Fortsetzung kurz danach hängt an, `nachklapp.ts`).
// Ein gesperrtes Mikro meldet `core/mic` (Mikro-Check, grauer Knopf).
// Wege auf der Bühne (Auftrag A-026), der Reihe nach (`ohrWeg`):
// 1. live über ElevenLabs Realtime (`ohrLive.ts`): Text beim Sprechen, Ende
//    von selbst (VAD), nur Mikrofon-Freigabe nötig;
// 2. klappt Schlüssel oder Verbindung nicht: Spracherkennung des Browsers;
// 3. gibt es die nicht (oder ist sie auf dem iPhone aus): eigene Aufnahme
//    (`aufnahme.ts`, Satzende am Pegel), Text vom Server.
// Die Browser-Erkennung selbst (Wachhund, Notausgang, erzwungenes Ende) steckt
// in `spracherk().ts`; vor jedem Zuhören verstummt Mia (`vorDemZuhoeren`),
// und kommt die App aus dem Hintergrund zurück, ist alles zurückgesetzt.
// A-056 (kein Wort verlieren): Auf der Bühne läuft das Mikrofon schon im
// Antippen an (Vorlauf, `ohrPuffer.ts`) – live und eigene Aufnahme bekommen
// zuerst den gepufferten Anfang. Scheitert live und war schon etwas zu
// hören, übernimmt die eigene Aufnahme den Puffer (sonst wie bisher der
// Browser). `bereit` (Ring „Ich höre“) erst, wenn wirklich Ton kommt.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { setAvatarFlag } from "@/lib/core/avatarState";
import { hintSeen } from "@/lib/core/hints";
import { MIC_SETTLE_MS, claimMic, classifyMicError, guardMic, micPlatform, micSettleWait, micState, micSubscribe, releaseMic, reportMicBlocked } from "@/lib/core/mic";
import { micLog } from "@/lib/core/micLog";
import { aufnahmeStarten, type Aufnahme } from "@/lib/begleitung/aufnahme";
import { aufnahmeVerstehen, liveGeklappt, liveGescheitert, liveOhr, ohrTokenVorwaermen, serverOhr } from "@/lib/begleitung/stimmeClient";
import { ohrLiveStarten } from "@/lib/begleitung/ohrLive";
import { liveDeps } from "@/lib/begleitung/ohrLiveBrowser";
import { bereitSignal, ohrVorbereiten, vorlaufJetzt, vorlaufNehmen, vorlaufVerwerfen } from "@/lib/begleitung/ohrMikro";
import type { Vorlauf } from "@/lib/begleitung/ohrPuffer";
import { ohrWeg, spracheMoeglich } from "@/lib/begleitung/ohrWeg";
import { tempoOhr } from "@/lib/begleitung/tempo";
import { serverStimme, serverStimmeJetzt } from "@/lib/begleitung/zugang";
import type { StimmeStatus } from "@/lib/begleitung/stimmeProtokoll";
import { WARTEN_AB_MS } from "@/lib/begleitung/mitschrift";
import { BELEGT, NICHT_GEKLAPPT, NOCHMAL, Spracherkennung, remember, stripStopWord, vorDemZuhoeren, type Anzeige, type RecognitionClass } from "@/lib/begleitung/spracherkennung";

function speechRecognitionClass(): RecognitionClass | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Bühne: so lange höchstens auf den Stand von Mias Ohr warten, bevor sie zuhört (sonst der Browser) */
const STATUS_WARTEN_MS = 1500;

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
   * Browser nach Stille, hört Mia still weiter; abgeschickt wird nach 1,2 s
   * Stille nach dem letzten Wort, beim Antippen (stop) oder bei „fertig“
   * (höchstens 2 Minuten am Stück).
   */
  buehne?: boolean;
};

export { stripStopWord };

export function useSpeechInput({ onTranscript, onEnd, long = false, buehne = false }: Options) {
  const browserKann = useSpeechSupported();
  /** Bühne: Mias Ohr vom Server (live oder Aufnahme) geht auch ohne Spracherkennung im Browser (null = noch unbekannt) */
  const [serverKann, setServerKann] = useState<boolean | null>(null);
  // Ohne Browser-Erkennung auf der Bühne: unbekannt, bis der Status da ist – nie vorschnell „gibt’s nicht“
  const supported = spracheMoeglich(browserKann, buehne, serverKann);
  /** Mikro gesperrt (geräteweit) – Knopf grau, Tipp öffnet die Hilfe */
  const blocked = useSyncExternalStore(micSubscribe, () => micState().block !== null, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  /** Bühne: es ist still, gleich wird abgeschickt (Ring läuft ab) */
  const [wartet, setWartet] = useState(false);
  /** Das Mikrofon nimmt wirklich auf (erst dann Ring „Ich höre“ und der leise „bereit“-Ton) */
  const [bereit, setBereit] = useState(false);
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

  /** Wann zuletzt ein Wort kam (Tempo: Sprechende → Abschicken; Fortsetzung nach Denkpause) */
  const letztesWort = useRef<number | null>(null);
  const anzeige = useRef<Anzeige>({
    listening: (on) => {
      setListening(on);
      flagListening(on);
      if (!on) setBereit(false);
    },
    bereit: () => setBereit(true),
    interim: setInterim,
    error: setError,
    wartet: setWartet,
    transcript: (text) => {
      if (text) letztesWort.current = performance.now();
      callbacks.current.onTranscript(text);
    },
    end: (text) => {
      tempoOhr("browser");
      callbacks.current.onEnd?.(text);
    },
  });
  // Die Erkennung entsteht beim ersten Gebrauch (nie beim Rendern)
  const erkennungRef = useRef<Spracherkennung | null>(null);
  const opts = useRef({ long, buehne });
  /** iPhone ohne Spracherkennung: Mias eigene Aufnahme übernimmt (true = übernommen) */
  const beiErkennungAus = useRef<() => boolean>(() => false);
  const erk = useCallback(
    () => (erkennungRef.current ??= new Spracherkennung({ micId: micId.current, ...opts.current, klasse: speechRecognitionClass, anzeige: () => anzeige.current, beiErkennungAus: () => beiErkennungAus.current() })),
    [],
  );

  /** Eigene Aufnahme bzw. Live-Runde (Ohr vom Server) und ihre Nummer – ältere melden nichts mehr */
  const ohrRef = useRef<Pick<Aufnahme, "stoppen" | "abbrechen"> | null>(null);
  const ohrLauf = useRef(0);
  /** Der Vorlauf dieser Runde (Mikro seit dem Antippen) – gehört uns, bis die Runde endet */
  const vorlaufRef = useRef<Vorlauf | null>(null);
  const vorlaufAus = useCallback(() => {
    vorlaufRef.current?.stoppen();
    vorlaufRef.current = null;
  }, []);
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
    vorlaufAus();
    if (hatteOhr) releaseMic(micId.current);
    erk().detach();
  }, [erk, vorlaufAus]);

  // Beim Verlassen (z. B. Chat schließen): abbrechen, nichts abschicken
  useEffect(() => () => detach(), [detach]);

  // Bühne: früh nachfragen, ob Mias Ohr vom Server da ist
  useEffect(() => {
    if (!buehne) return;
    let aktiv = true;
    void serverStimme().then((s) => {
      if (!aktiv) return;
      setServerKann(liveOhr(s) || serverOhr(s));
      // Einmal-Schlüssel schon bereitlegen (A-056) – dann steht die Verbindung meist sofort
      if (liveOhr(s)) void ohrTokenVorwaermen();
    });
    return () => {
      aktiv = false;
    };
  }, [buehne]);

  /** Bühne mit Mias Ohr vom Server: selbst aufnehmen, Satzende am Pegel, Text vom Server (mit Vorlauf: ab dem Antippen) */
  const beginOhr = useCallback((mitVorlauf: Vorlauf | null = null) => {
    erk().cancel();
    detach();
    const lauf = ++ohrLauf.current;
    const aktuell = () => lauf === ohrLauf.current;
    setError("");
    setInterim("");
    setWartet(false);
    const v = mitVorlauf ?? vorlaufNehmen() ?? (vorlaufJetzt(), vorlaufNehmen());
    vorlaufRef.current = v;
    if (v) v.beiBereit(() => aktuell() && (setBereit(true), bereitSignal()));
    else setBereit(true);
    const zuEnde = () => {
      ohrRef.current = null;
      vorlaufRef.current = null;
      releaseMic(micId.current);
      setListening(false);
      flagListening(false);
      setWartet(false);
      setBereit(false);
    };
    const ohr = aufnahmeStarten({
      laut: () => {},
      wartet: (an) => {
        if (!aktuell()) return;
        // Eigene Aufnahme: Stille beginnt WARTEN_AB_MS vor dem Ring
        if (an) letztesWort.current = performance.now() - WARTEN_AB_MS;
        setWartet(an);
      },
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
          tempoOhr("aufnahme");
          callbacks.current.onTranscript(text);
          remember(text);
          callbacks.current.onEnd?.(text);
        });
      },
      fehler: (name) => {
        if (!aktuell()) return;
        zuEnde();
        if (name === "belegt") return setError(BELEGT);
        const block = classifyMicError(name, micPlatform(navigator.userAgent));
        if (block) reportMicBlocked(block);
        else setError(NICHT_GEKLAPPT);
      },
    }, v);
    ohrRef.current = ohr;
    claimMic(micId.current, () => {
      ohrLauf.current++;
      ohr.abbrechen();
      zuEnde();
    });
    setListening(true);
    flagListening(true);
  }, [detach, erk, flagListening]);

  /** Ersatz, wenn live nicht klappt: Browser, sonst eigene Aufnahme, sonst ein ruhiger Satz */
  const ersatz = useCallback(() => {
    const weg = ohrWeg({ buehne: true, live: false, browser: Boolean(speechRecognitionClass()), aufnahme: serverOhr(serverStimmeJetzt()) });
    micLog(`Ohr: weiter über ${weg === "browser" ? "den Browser" : weg === "aufnahme" ? "die Aufnahme" : "nichts"}`);
    if (weg === "aufnahme") return beginOhr();
    if (weg === "browser") return erk().begin();
    setError(NOCHMAL);
  }, [beginOhr, erk]);

  /** Bühne live (ElevenLabs Realtime): Text beim Sprechen, Satzende von ElevenLabs, Antippen = sofort */
  const beginLive = useCallback(() => {
    erk().cancel();
    detach();
    const lauf = ++ohrLauf.current;
    const aktuell = () => lauf === ohrLauf.current;
    setError("");
    setInterim("");
    setWartet(false);
    // Mikro läuft meist schon seit dem Antippen; sonst jetzt (z. B. Weiterhören nach Mias Antwort)
    const v = vorlaufNehmen() ?? (vorlaufJetzt(), vorlaufNehmen());
    vorlaufRef.current = v;
    if (v) v.beiBereit(() => aktuell() && (setBereit(true), bereitSignal()));
    else setBereit(true);
    const zuEnde = () => {
      ohrRef.current = null;
      vorlaufRef.current = null;
      releaseMic(micId.current);
      setListening(false);
      flagListening(false);
      setWartet(false);
      setBereit(false);
      setInterim("");
    };
    const runde = ohrLiveStarten(
      {
        text: (ganz, vorlaeufig) => {
          if (!aktuell()) return;
          setInterim(vorlaeufig);
          anzeige.current.transcript(stripStopWord(ganz).text);
        },
        wartet: (an) => aktuell() && setWartet(an),
        fertig: (said, info) => {
          if (!aktuell()) return;
          v?.stoppen();
          zuEnde();
          liveGeklappt(info.sekunden);
          tempoOhr("live");
          const text = stripStopWord(said).text;
          if (text) {
            callbacks.current.onTranscript(text);
            remember(text);
          }
          callbacks.current.onEnd?.(text);
        },
        fehler: (art, name) => {
          if (!aktuell()) return;
          zuEnde();
          if (art === "verbindung") {
            liveGescheitert();
            // Schon etwas gesagt? Dann übernimmt die eigene Aufnahme den Puffer – nichts geht verloren
            if (v?.aktiv() && v.lautGehoert() && serverOhr(serverStimmeJetzt())) {
              micLog("Ohr: live ging nicht, Aufnahme übernimmt den Puffer");
              return beginOhr(v);
            }
            v?.stoppen();
            // Mikro kurz frei werden lassen (iPhone), dann der nächste Weg
            return void setTimeout(() => aktuell() && ersatz(), Math.max(micSettleWait(), v ? MIC_SETTLE_MS : 0));
          }
          v?.stoppen();
          if (name === "belegt") return setError(BELEGT);
          const block = classifyMicError(name, micPlatform(navigator.userAgent));
          if (block) reportMicBlocked(block);
          else setError(NICHT_GEKLAPPT);
        },
      },
      liveDeps(v),
    );
    ohrRef.current = runde;
    claimMic(micId.current, () => {
      ohrLauf.current++;
      runde.abbrechen();
      zuEnde();
    });
    setListening(true);
    flagListening(true);
  }, [beginOhr, detach, erk, ersatz, flagListening]);

  useEffect(() => {
    beiErkennungAus.current = () => {
      if (!buehne || !serverOhr(serverStimmeJetzt())) return false;
      setTimeout(beginOhr, 0);
      return true;
    };
  }, [buehne, beginOhr]);

  const waehlen = useCallback(
    (stand: StimmeStatus | null) => {
      const weg = ohrWeg({ buehne, live: liveOhr(stand), browser: Boolean(speechRecognitionClass()), aufnahme: serverOhr(stand) });
      if (weg === "live") return beginLive();
      if (weg === "aufnahme") return beginOhr();
      // Der Browser braucht das Mikro selbst: einen Vorlauf vorher freigeben
      if (vorlaufVerwerfen()) {
        const t = setTimeout(() => erk().begin(), MIC_SETTLE_MS);
        warteRef.current = () => clearTimeout(t);
        return;
      }
      erk().begin();
    },
    [buehne, beginLive, beginOhr, erk],
  );

  const begin = useCallback(() => {
    if (!buehne) return erk().begin();
    const bekannt = serverStimmeJetzt();
    if (bekannt) return waehlen(bekannt);
    // Bühne eben erst auf, Stand noch nicht gemerkt: kurz auf den Status warten –
    // sonst ginge es am Ohr vom Server vorbei (ohne Browser-Erkennung: gar nicht)
    let offen = true;
    const weiter = (s: StimmeStatus | null) => {
      if (!offen) return;
      offen = false;
      clearTimeout(t);
      warteRef.current = () => {};
      waehlen(s);
    };
    const t = setTimeout(() => weiter(serverStimmeJetzt()), STATUS_WARTEN_MS);
    warteRef.current = () => {
      offen = false;
      clearTimeout(t);
    };
    void serverStimme().then(weiter, () => weiter(null));
  }, [buehne, erk, waehlen]);

  /** Zuhören starten – gesperrt: Hilfe; allererstes Mal: erst „Darf ich zuhören?“ (im Tipp aufrufen) */
  const start = useCallback(
    () =>
      guardMic(() => {
        letztesWort.current = null;
        setBereit(false);
        // A-056: noch im Antippen Ton-Kontext an und – wenn Mia gleich über den Server hört – Mikro sofort an (Vorlauf)
        if (buehne) {
          ohrVorbereiten();
          const stand = serverStimmeJetzt();
          const weg = stand ? ohrWeg({ buehne, live: liveOhr(stand), browser: Boolean(speechRecognitionClass()), aufnahme: serverOhr(stand) }) : null;
          if (weg === "live" || weg === "aufnahme") vorlaufJetzt();
        }
        // Vor jedem Zuhören: Mia verstummt, kurz warten, bis das iPhone den Ton freigibt
        warteRef.current();
        warteRef.current = vorDemZuhoeren(() => {
          warteRef.current = () => {};
          begin();
        });
      }, hintSeen("mikro-gefragt")),
    [begin, buehne],
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
      setBereit(false);
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
    setBereit(false);
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
    setBereit(false);
  }, [detach, erk]);

  /** Zeitpunkt (performance.now) des letzten erkannten Wortes dieser Aufnahme, sonst null */
  const letztesWortAm = useCallback(() => letztesWort.current, []);

  return { supported, blocked, listening, bereit, interim, error, wartet, start, stop, cancel, reset, letztesWortAm };
}
