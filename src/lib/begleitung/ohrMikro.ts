"use client";

// Mias Mikrofon für das Ohr vom Server (A-026, A-056): EIN Ton-Kontext (noch im
// Antippen angelegt), Mikrofon über `core/mic` (nur EIN „Erlauben“) und der
// Vorlauf (`ohrPuffer.ts`): Das Mikrofon läuft schon im Antippen an (Mia-Knopf
// in der Leiste bzw. Mia auf der Bühne) und puffert, bis eine Runde ihn nimmt;
// dazu ein leiser Ton bzw. kurzes Vibrieren „bereit“. Klein gehalten (ohne
// Websocket und Server-Abrufe), weil der Mia-Knopf in der Leiste es lädt. Der
// Ton bleibt im Arbeitsspeicher und wird nirgends abgelegt.

import { getMicWithRetry, noteMicRan, setMicPermission } from "@/lib/core/mic";
import { micLog } from "@/lib/core/micLog";
import type { LiveMikro } from "@/lib/begleitung/ohrLive";
import { vorlaufStarten, type Vorlauf } from "@/lib/begleitung/ohrPuffer";

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

/** Ton-Kontext noch im Antippen anlegen (iPhone startet ihn nur nach einer Berührung) */
export function ohrVorbereiten() {
  try {
    if (typeof window !== "undefined" && (window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)) tonKontext();
  } catch {
    // ohne Ton-Kontext hört Mia über den Browser
  }
}

/**
 * „Bereit“: kurz vibrieren (Android) und ein leiser, kurzer Ton (iPhone kann
 * nicht vibrieren) – erst wenn das Mikrofon wirklich aufnimmt.
 */
export function bereitSignal() {
  try {
    navigator.vibrate?.(12);
  } catch {
    // kein Vibrieren
  }
  const ctx = geteilt;
  if (!ctx || ctx.state !== "running") return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.04, t + 0.02);
    gain.gain.linearRampToValueAtTime(0, t + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  } catch {
    // leise ist auch gut
  }
}

/** Der Vorlauf, den gerade niemand genommen hat (höchstens einer) */
let vorlauf: Vorlauf | null = null;

/**
 * Mikrofon SOFORT an und puffern (im Antippen aufrufen). Läuft schon einer,
 * bleibt es dabei. Nimmt ihn niemand, geht er nach 5 s leise aus.
 */
export function vorlaufJetzt(): Vorlauf | null {
  if (vorlauf?.aktiv()) return vorlauf;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  ohrVorbereiten();
  vorlauf = vorlaufStarten({ mikro: mikroAn, uhr: () => performance.now(), log: micLog });
  return vorlauf;
}

/** Den laufenden Vorlauf übernehmen (danach gehört er dem Aufrufer) */
export function vorlaufNehmen(): Vorlauf | null {
  const v = vorlauf?.aktiv() ? vorlauf : null;
  vorlauf = null;
  return v;
}

/** Vorlauf verwerfen (z. B. der Browser hört zu, der braucht das Mikro selbst) */
export function vorlaufVerwerfen(): boolean {
  const v = vorlaufNehmen();
  v?.stoppen();
  return Boolean(v);
}

export function mikroAn(ton: (werte: Float32Array, rate: number) => void): Promise<LiveMikro> {
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
    const proc = ctx.createScriptProcessor(2048, 1, 1);
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
