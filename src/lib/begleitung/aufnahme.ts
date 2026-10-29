"use client";

// Mias eigene Aufnahme für das Ohr vom Server: Mikrofon (nur EIN „Erlauben“,
// die Spracherkennung des Handys ist egal), MediaRecorder und ein Pegel-Messer,
// der das Satzende erkennt (`lauschen.ts`). Die Aufnahme bleibt im Speicher,
// bis sie an `/api/hoeren` geht – sie wird nirgends abgelegt. Benutzt nur
// `useSpeechInput` (Bühne); Pinnwand-Sprachnachrichten haben ihre eigene.
// A-056: Mit Vorlauf (`ohrPuffer.ts`, Mikro seit dem Antippen an) wird nichts
// neu gestartet: der gepufferte Anfang plus alles danach geht als WAV
// (16 kHz) an den Server – so fehlt auch hier kein Wort. Läuft die
// Ton-Verarbeitung nicht (vom Browser angehalten), nimmt Mia wie früher mit
// dem MediaRecorder auf.

import { getMicWithRetry, noteMicRan, setMicPermission } from "@/lib/core/mic";
import { micLog } from "@/lib/core/micLog";
import { lauschSchritt, neuesLauschen, pegelVon } from "@/lib/begleitung/lauschen";
import { LIVE_RATE, Umrechner } from "@/lib/begleitung/echtzeitProtokoll";
import { pcmZuWav, verbinden, type Vorlauf } from "@/lib/begleitung/ohrPuffer";
import { STIMME_GRENZEN } from "@/lib/begleitung/stimmeProtokoll";

export type Aufnahme = {
  /** Jetzt Schluss (Antippen, „fertig“): was da ist, wird verstanden */
  stoppen: () => void;
  /** Abbrechen: nichts wird verschickt */
  abbrechen: () => void;
};

type Rueckmeldung = {
  /** Es wird gesprochen */
  laut: () => void;
  /** Es ist still, gleich wird abgeschickt (Ring) */
  wartet: (an: boolean) => void;
  /** Aufnahme vorbei: Ton (null = nichts gesagt) und Dauer */
  fertig: (ton: Blob | null, ms: number) => void;
  /** Mikrofon ging nicht (Fehlername von getUserMedia) */
  fehler: (name: string) => void;
};

const TYPEN = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/aac"];

/** Ohne Ton so lange = Mikro belegt (wie live und Browser) */
const WACHE_MS = 1500;

/**
 * Eigene Aufnahme aus dem Vorlauf: Pegel aus den Werten, Ton als WAV. Kommt
 * kein Ton, weil die Ton-Verarbeitung angehalten ist, übernimmt `ersatz`.
 */
function ausVorlauf(v: Vorlauf, rueck: Rueckmeldung, ersatz: () => Aufnahme): Aufnahme {
  let vorbei = false;
  let wartet = false;
  let stand = neuesLauschen();
  let pegel = 0;
  let tonDa = false;
  let umrechner: Umrechner | null = null;
  const teile: Int16Array[] = [];
  let werteGesamt = 0;
  const beginn = v.gestartetAm;
  const jetzt = () => performance.now();
  let weiter: Aufnahme | null = null;

  const beenden = (mitTon: boolean) => {
    if (vorbei) return;
    vorbei = true;
    clearInterval(takt);
    v.stoppen();
    const ms = jetzt() - beginn;
    const pcm = verbinden(teile);
    if (!mitTon || !pcm.length) return rueck.fertig(null, ms);
    const wav = pcmZuWav(pcm, LIVE_RATE);
    rueck.fertig(new Blob([wav.buffer as ArrayBuffer], { type: "audio/wav" }), ms);
  };

  v.nehmen((werte, rate) => {
    if (vorbei) return;
    tonDa = true;
    pegel = pegelVon(werte);
    umrechner ??= new Umrechner(rate);
    const pcm = umrechner.push(werte);
    // Höchstens die längste Aufnahme (60 s) – mehr nimmt der Server nicht
    if (werteGesamt + pcm.length > (LIVE_RATE * STIMME_GRENZEN.aufnahmeMs) / 1000) return;
    teile.push(pcm);
    werteGesamt += pcm.length;
  }).catch(() => {
    if (vorbei) return;
    vorbei = true;
    clearInterval(takt);
    v.stoppen();
    // Mikro über den Vorlauf ging nicht: wie früher (der meldet einen echten Fehler selbst)
    weiter = ersatz();
  });
  micLog("Ohr: Aufnahme läuft (aus dem Vorlauf, WAV)");

  const takt = setInterval(() => {
    if (vorbei) return;
    if (!tonDa) {
      if (jetzt() - beginn < WACHE_MS) return;
      vorbei = true;
      clearInterval(takt);
      const angehalten = v.laeuft() === false;
      v.stoppen();
      // Angehaltene Ton-Verarbeitung ist kein belegtes Mikro: wie früher mit dem MediaRecorder
      if (angehalten) {
        micLog("Ohr: Ton-Verarbeitung angehalten, MediaRecorder");
        weiter = ersatz();
        return;
      }
      micLog("Ohr: Mikro belegt, kein Ton");
      return rueck.fehler("belegt");
    }
    const vorher = stand.gesprochen;
    const r = lauschSchritt(stand, pegel, jetzt() - beginn);
    stand = r.s;
    if (!vorher && stand.gesprochen) rueck.laut();
    const w = r.aktion === "wartet";
    if (w !== wartet) rueck.wartet((wartet = w));
    if (r.aktion === "fertig") beenden(true);
    else if (r.aktion === "nichts") beenden(false);
  }, 50);

  return {
    stoppen: () => (weiter ? weiter.stoppen() : beenden(true)),
    abbrechen: () => {
      if (weiter) return weiter.abbrechen();
      if (vorbei) return;
      vorbei = true;
      clearInterval(takt);
      v.stoppen();
    },
  };
}

export function aufnahmeStarten(rueck: Rueckmeldung, vorlauf: Vorlauf | null = null): Aufnahme {
  if (vorlauf?.aktiv()) return ausVorlauf(vorlauf, rueck, () => aufnahmeStarten(rueck));
  let vorbei = false;
  let stream: MediaStream | null = null;
  let rec: MediaRecorder | null = null;
  let ctx: AudioContext | null = null;
  let takt: ReturnType<typeof setInterval> | null = null;
  const teile: Blob[] = [];
  let beginn = performance.now();
  let stand = neuesLauschen();
  let wartet = false;

  const aufraeumen = () => {
    if (takt) clearInterval(takt);
    takt = null;
    stream?.getTracks().forEach((t) => t.stop());
    void ctx?.close().catch(() => {});
  };

  const beenden = (mitTon: boolean) => {
    if (vorbei) return;
    vorbei = true;
    if (takt) clearInterval(takt);
    const r = rec;
    if (!r || r.state === "inactive") {
      aufraeumen();
      return rueck.fertig(null, 0);
    }
    r.onstop = () => {
      aufraeumen();
      const ms = performance.now() - beginn;
      rueck.fertig(mitTon && teile.length ? new Blob(teile, { type: r.mimeType || "audio/webm" }) : null, ms);
    };
    r.stop();
  };

  getMicWithRetry(() => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }), micLog)
    .then((st) => {
      if (vorbei) return st.getTracks().forEach((t) => t.stop());
      stream = st;
      setMicPermission("granted");
      noteMicRan();
      const typ = TYPEN.find((t) => MediaRecorder.isTypeSupported?.(t));
      rec = new MediaRecorder(st, typ ? { mimeType: typ } : undefined);
      rec.ondataavailable = (e) => {
        if (e.data.size) teile.push(e.data);
      };
      rec.start(250);
      beginn = performance.now();
      stand = neuesLauschen();
      micLog(`Ohr: Aufnahme läuft (${rec.mimeType || "Standard"})`);
      // Pegel messen; ohne AudioContext hört Mia bis zum Antippen (höchstens 60 s)
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      let messen: (() => number) | null = null;
      if (AC) {
        ctx = new AC();
        void ctx.resume?.().catch(() => {});
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        ctx.createMediaStreamSource(st).connect(an);
        const buf = new Float32Array(an.fftSize);
        messen = () => {
          an.getFloatTimeDomainData(buf);
          return pegelVon(buf);
        };
      }
      // Mikro-Wachhund (wie bei Spracherkennung und live): liefert die Spur nach 1,5 s keinen Ton, ist das Mikro belegt
      const spur = st.getAudioTracks()[0];
      let tonGesehen = false;
      takt = setInterval(() => {
        if (!tonGesehen) {
          tonGesehen = Boolean(spur) && !spur.muted && spur.readyState === "live";
          if (!tonGesehen && performance.now() - beginn > 1500) {
            micLog("Ohr: Mikro belegt, kein Ton");
            vorbei = true;
            if (rec && rec.state !== "inactive") {
              rec.onstop = null;
              rec.stop();
            }
            aufraeumen();
            return rueck.fehler("belegt");
          }
          if (!tonGesehen) return;
        }
        const vorher = stand.gesprochen;
        const r = lauschSchritt(stand, messen ? messen() : 1, performance.now() - beginn);
        stand = messen ? r.s : { ...r.s, gesprochen: true, letzteLaut: performance.now() - beginn };
        if (!vorher && stand.gesprochen) rueck.laut();
        const w = r.aktion === "wartet";
        if (w !== wartet) rueck.wartet((wartet = w));
        if (r.aktion === "fertig") beenden(true);
        else if (r.aktion === "nichts") beenden(false);
      }, 50);
    })
    .catch((e: unknown) => {
      if (vorbei) return;
      vorbei = true;
      rueck.fehler(e instanceof Error ? e.name : "Error");
    });

  return {
    stoppen: () => beenden(true),
    abbrechen: () => {
      if (vorbei) return;
      vorbei = true;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        rec.stop();
      }
      aufraeumen();
    },
  };
}
