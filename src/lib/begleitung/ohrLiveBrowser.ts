"use client";

// Mias Ohr live im Browser: Mikrofon (über `core/mic`, nur EIN „Erlauben“),
// Ton als Werte für `ohrLive.ts` und der echte Websocket. Der Ton geht nur an
// den Anbieter und wird nirgends abgelegt. Nur `useSpeechInput` (Bühne) nutzt
// das; Pinnwand-Sprachnachrichten haben ihre eigene Aufnahme.

import { getMicWithRetry, noteMicRan, setMicPermission } from "@/lib/core/mic";
import { micLog } from "@/lib/core/micLog";
import type { LiveDeps, LiveMikro, LiveSocket } from "@/lib/begleitung/ohrLive";
import { ohrToken } from "@/lib/begleitung/stimmeClient";

/**
 * EIN Ton-Kontext für alle Runden: noch im Antippen angelegt (iPhone startet ihn
 * nur nach einer Berührung) und danach behalten – so läuft er auch, wenn Mia
 * nach ihrer Antwort von selbst wieder zuhört.
 */
let geteilt: AudioContext | null = null;

function tonKontext(): AudioContext {
  if (!geteilt || geteilt.state === "closed") {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    geteilt = new AC();
  }
  void geteilt.resume?.().catch(() => {});
  return geteilt;
}

function mikroAn(ton: (werte: Float32Array, rate: number) => void): Promise<LiveMikro> {
  // Vor dem ersten await: der Kontext entsteht noch im Antippen
  let ctx: AudioContext;
  try {
    ctx = tonKontext();
  } catch (e) {
    return Promise.reject(e);
  }
  return getMicWithRetry(() => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }), micLog).then((stream) => {
    setMicPermission("granted");
    noteMicRan();
    void ctx.resume?.().catch(() => {});
    const spur = stream.getAudioTracks()[0];
    const quelle = ctx.createMediaStreamSource(stream);
    // ScriptProcessor: läuft überall (auch iPhone) ohne eigene Worklet-Datei
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (e) => {
      // Stummgeschaltete Spur (Telefonat, Bildschirmaufnahme) liefert nichts – der Wachhund merkt das
      if (spur?.muted) return;
      ton(new Float32Array(e.inputBuffer.getChannelData(0)), ctx.sampleRate);
    };
    quelle.connect(proc);
    // Ohne Ausgang läuft der Prozessor in manchen Browsern nicht – stumm anschließen
    const stumm = ctx.createGain();
    stumm.gain.value = 0;
    proc.connect(stumm).connect(ctx.destination);
    micLog(`Ohr live: Mikrofon an (${ctx.sampleRate} Hz, ${ctx.state})`);
    return {
      laeuft: () => ctx.state === "running",
      stoppen: () => {
        proc.onaudioprocess = null;
        try {
          quelle.disconnect();
          proc.disconnect();
          stumm.disconnect();
        } catch {
          // schon getrennt
        }
        stream.getTracks().forEach((t) => t.stop());
      },
    };
  });
}

/** Die echten Teile für eine Zuhör-Runde */
export function liveDeps(): LiveDeps {
  return {
    token: ohrToken,
    mikro: mikroAn,
    socket: (url) => new WebSocket(url) as unknown as LiveSocket,
    log: micLog,
    uhr: () => performance.now(),
  };
}
