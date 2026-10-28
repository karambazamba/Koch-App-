"use client";

// Mias eigene Aufnahme für das Ohr vom Server: Mikrofon (nur EIN „Erlauben“,
// die Spracherkennung des Handys ist egal), MediaRecorder und ein Pegel-Messer,
// der das Satzende erkennt (`lauschen.ts`). Die Aufnahme bleibt im Speicher,
// bis sie an `/api/hoeren` geht – sie wird nirgends abgelegt. Benutzt nur
// `useSpeechInput` (Bühne); Pinnwand-Sprachnachrichten haben ihre eigene.

import { getMicWithRetry, noteMicRan, setMicPermission } from "@/lib/core/mic";
import { micLog } from "@/lib/core/micLog";
import { lauschSchritt, neuesLauschen, pegelVon } from "@/lib/begleitung/lauschen";

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

export function aufnahmeStarten(rueck: Rueckmeldung): Aufnahme {
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
