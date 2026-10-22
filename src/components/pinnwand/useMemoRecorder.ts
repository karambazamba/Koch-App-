"use client";

// Aufnahme einer Sprachnachricht: MediaRecorder (iPhone audio/mp4 AAC, sonst
// audio/webm Opus, ~32 kbit/s mono), Pegel für die Tonwelle über einen
// Analyser. Mikrofon-Freigabe erst beim ersten Halten; abgelehnt = ein
// freundlicher Satz, wo man es erlaubt. Unter 1 s = nichts, nach 60 s wird
// automatisch gesendet. Der Ton geht in IndexedDB, der Eintrag in die
// Pinnwand.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MEMO_MAX_S, MEMO_MIN_MS, WAVE_BARS, addMemo, changeMemos, createMemo, pickMemoMime, resample, type MemoMessage } from "@/lib/pinnwand";
import { memoAudio } from "@/lib/pinnwand/memoAudio";
import { buzz } from "@/components/heute/actions";

export type RecorderPhase = "idle" | "asking" | "recording";

type Session = {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  mime: string;
  ctx: AudioContext | null;
  startedAt: number;
  levels: number[];
  timer: ReturnType<typeof setInterval>;
};

const isIos = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

const DENIED_TEXT = () =>
  isIos()
    ? "Für Sprachnachrichten brauche ich das Mikrofon. Erlauben kannst du es in den iPhone-Einstellungen unter Apps → Safari → Mikrofon."
    : "Für Sprachnachrichten brauche ich das Mikrofon. Erlauben kannst du es oben beim Schloss neben der Adresse → Berechtigungen → Mikrofon.";

function memoRecordingSupported(): boolean {
  return typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

const noSubscribe = () => () => undefined;

/** Kann dieses Gerät Sprachnachrichten aufnehmen? (beim Server-Rendern: nein) */
export function useCanRecordMemo(): boolean {
  return useSyncExternalStore(noSubscribe, memoRecordingSupported, () => false);
}

export function useMemoRecorder({ me, onSent }: { me: string; onSent?: (memo: MemoMessage) => void }) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [tapMode, setTapMode] = useState(false);
  const session = useRef<Session | null>(null);
  /** Losgelassen, bevor das Mikrofon bereit war */
  const released = useRef(false);
  const meRef = useRef(me);
  const sentRef = useRef(onSent);
  useEffect(() => {
    meRef.current = me;
    sentRef.current = onSent;
  });

  const cleanup = (s: Session) => {
    clearInterval(s.timer);
    s.stream.getTracks().forEach((t) => t.stop());
    void s.ctx?.close().catch(() => undefined);
  };

  const finish = useCallback((send: boolean) => {
    released.current = true;
    const s = session.current;
    session.current = null;
    setPhase("idle");
    setTapMode(false);
    setLevels([]);
    setElapsed(0);
    if (!s) return;
    const ms = performance.now() - s.startedAt;
    s.recorder.onstop = () => {
      cleanup(s);
      const blob = new Blob(s.chunks, { type: s.recorder.mimeType || s.mime });
      if (!send || ms < MEMO_MIN_MS || !blob.size) {
        if (send && ms < MEMO_MIN_MS) setNote("Zum Aufnehmen das Mikro gedrückt halten.");
        return;
      }
      const memo = createMemo({ author: meRef.current, dauer: ms / 1000, mime: blob.type || s.mime, wave: resample(s.levels, WAVE_BARS * 2) });
      void memoAudio
        .save(memo.id, blob)
        .then(() => {
          changeMemos((all) => addMemo(all, memo));
          buzz();
          sentRef.current?.(memo);
        })
        .catch(() => setNote("Die Sprachnachricht ließ sich gerade nicht speichern."));
    };
    try {
      if (s.recorder.state !== "inactive") s.recorder.stop();
      else s.recorder.onstop?.(new Event("stop"));
    } catch {
      cleanup(s);
    }
  }, []);

  const start = useCallback(
    async (opts: { tap?: boolean } = {}) => {
      if (session.current || phase !== "idle") return;
      released.current = false;
      setNote(null);
      setTapMode(Boolean(opts.tap));
      setPhase("asking");
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      } catch (e) {
        setPhase("idle");
        setTapMode(false);
        const name = e instanceof DOMException ? e.name : "";
        // Kein Mikrofon da – sonst ist es (fast immer) nicht erlaubt
        setNote(name === "NotFoundError" || name === "OverconstrainedError" ? "Ich finde gerade kein Mikrofon." : DENIED_TEXT());
        return;
      }
      // Beim ersten Mal fragt das Handy erst nach der Freigabe – wer da schon losgelassen hat, hält jetzt einfach nochmal
      if (released.current && !opts.tap) {
        stream.getTracks().forEach((t) => t.stop());
        setPhase("idle");
        setNote("Jetzt geht’s – Mikro gedrückt halten und sprechen.");
        return;
      }
      const mime = pickMemoMime((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32_000 });
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        setPhase("idle");
        setNote("Sprachnachrichten gehen auf diesem Gerät leider nicht.");
        return;
      }
      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      let ctx: AudioContext | null = null;
      let read: (() => number) | null = null;
      try {
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        read = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += ((v - 128) / 128) ** 2;
          return Math.min(1, Math.sqrt(sum / buf.length) * 4);
        };
      } catch {
        ctx = null;
      }
      const s: Session = { stream, recorder, chunks, mime, ctx, startedAt: performance.now(), levels: [], timer: 0 as unknown as ReturnType<typeof setInterval> };
      s.timer = setInterval(() => {
        const ms = performance.now() - s.startedAt;
        const level = read ? read() : 0.2 + 0.3 * Math.abs(Math.sin(ms / 180));
        s.levels.push(level);
        setLevels(s.levels.slice(-WAVE_BARS));
        setElapsed(ms);
        if (ms >= MEMO_MAX_S * 1000) finish(true);
      }, 100);
      session.current = s;
      recorder.start(250);
      buzz();
      setPhase("recording");
    },
    [phase, finish],
  );

  // Seite verlassen = verwerfen
  useEffect(
    () => () => {
      const s = session.current;
      session.current = null;
      if (s) {
        s.recorder.onstop = () => cleanup(s);
        try {
          s.recorder.stop();
        } catch {
          cleanup(s);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), note.length > 60 ? 9000 : 3500);
    return () => clearTimeout(t);
  }, [note]);

  return { phase, elapsed, levels, note, tapMode, start, finish, clearNote: () => setNote(null) };
}

export type MemoRecorder = ReturnType<typeof useMemoRecorder>;
