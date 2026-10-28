"use client";

// Mias Ohr live im Browser: Mikrofon (über `core/mic`, nur EIN „Erlauben“),
// Ton als Werte für `ohrLive.ts` und der echte Websocket. Der Ton geht nur an
// den Anbieter und wird nirgends abgelegt. Nur `useSpeechInput` (Bühne) nutzt
// das; Pinnwand-Sprachnachrichten haben ihre eigene Aufnahme.

import { getMicWithRetry, noteMicRan, setMicPermission } from "@/lib/core/mic";
import { micLog } from "@/lib/core/micLog";
import type { LiveDeps, LiveMikro, LiveSocket } from "@/lib/begleitung/ohrLive";
import { ohrToken } from "@/lib/begleitung/stimmeClient";

async function mikroAn(ton: (werte: Float32Array, rate: number) => void): Promise<LiveMikro> {
  const stream = await getMicWithRetry(() => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }), micLog);
  setMicPermission("granted");
  noteMicRan();
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  let ctx: AudioContext;
  try {
    ctx = new AC();
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }
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
  micLog(`Ohr live: Mikrofon an (${ctx.sampleRate} Hz)`);
  return {
    stoppen: () => {
      proc.onaudioprocess = null;
      try {
        quelle.disconnect();
        proc.disconnect();
      } catch {
        // schon getrennt
      }
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close().catch(() => {});
    },
  };
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
