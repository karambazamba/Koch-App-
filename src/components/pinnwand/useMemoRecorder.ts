"use client";

// Aufnahme einer Sprachnachricht: MediaRecorder (iPhone audio/mp4 AAC, sonst
// audio/webm Opus, ~32 kbit/s mono), Pegel für die Tonwelle über einen
// Analyser. Ablauf (recorderState.ts): Antippen startet und die Aufnahme läuft
// frei, bis „Senden“ oder „Verwerfen“; Halten bleibt als Abkürzung (loslassen
// = senden, nach oben schieben = frei weiter). Mit 60 s oder beim Verlassen
// der App hält sie an und wartet. Während der Aufnahme: Bildschirm bleibt an,
// die Seite scrollt und wischt nicht, Zurück fragt „Verwerfen?“. Mikrofon-
// Freigabe beim ersten Mal; abgelehnt = ein freundlicher Satz. Der Ton geht in
// IndexedDB, der Eintrag in die Pinnwand.

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { MEMO_MIN_MS, WAVE_BARS, addMemo, changeMemos, createMemo, pickMemoMime, resample, type MemoMessage } from "@/lib/pinnwand";
import { MEMO_IDLE, discardNeedsUndo, memoReducer, timeAnnouncement, type MemoMode } from "@/lib/pinnwand/recorderState";
import { memoAudio } from "@/lib/pinnwand/memoAudio";
import { showToast } from "@/lib/core/toast";
import { useWakeLock } from "@/lib/core/wakeLock";
import { buzz } from "@/components/heute/actions";
import { hintSeen, markHintSeen } from "@/lib/core/hints";
import { classifyMicError, guardMic, micPlatform, micState, reportMicBlocked, setMicPermission } from "@/lib/core/mic";

type RecorderPhase = "idle" | "asking" | "recording" | "stopped";

type Live = {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  mime: string;
  ctx: AudioContext | null;
  startedAt: number;
  levels: number[];
  timer: ReturnType<typeof setInterval>;
};

/** Fertig aufgenommen, wartet auf Senden/Verwerfen */
type Take = { blob: Blob; mime: string; ms: number; levels: number[] };

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

const PHASE: Record<string, RecorderPhase> = { bereit: "idle", fragt: "asking", nimmt_auf: "recording", gestoppt: "stopped" };

/** Während der Aufnahme: Seite steht (kein Scrollen, kein Seitenwechsel per Wischen) */
function holdPage(on: boolean) {
  const html = document.documentElement;
  if (on) {
    html.setAttribute("data-no-swipe", "");
    html.style.overflow = "hidden";
  } else {
    html.removeAttribute("data-no-swipe");
    html.style.overflow = "";
  }
}

export function useMemoRecorder({ me, onSent }: { me: string; onSent?: (memo: MemoMessage) => void }) {
  const [state, dispatch] = useReducer(memoReducer, MEMO_IDLE);
  const [levels, setLevels] = useState<number[]>([]);
  const [note, setNote] = useState<string | null>(null);
  /** Zurück während der Aufnahme: „Verwerfen?“ */
  const [askDiscard, setAskDiscard] = useState(false);
  const live = useRef<Live | null>(null);
  const take = useRef<Take | null>(null);
  /** Nach dem Anhalten gleich senden (Loslassen beim Halten, „Senden“ während der Aufnahme) */
  const sendAfterStop = useRef(false);
  const meRef = useRef(me);
  const sentRef = useRef(onSent);
  useEffect(() => {
    meRef.current = me;
    sentRef.current = onSent;
  });
  const phase = PHASE[state.phase];
  const busy = phase !== "idle";

  const cleanup = (s: Live) => {
    clearInterval(s.timer);
    s.stream.getTracks().forEach((t) => t.stop());
    void s.ctx?.close().catch(() => undefined);
  };

  const save = useCallback((t: Take) => {
    if (t.ms < MEMO_MIN_MS || !t.blob.size) return setNote("Das war sehr kurz – einfach nochmal antippen und sprechen.");
    const memo = createMemo({ author: meRef.current, dauer: t.ms / 1000, mime: t.blob.type || t.mime, wave: resample(t.levels, WAVE_BARS * 2) });
    void memoAudio
      .save(memo.id, t.blob)
      .then(() => {
        changeMemos((all) => addMemo(all, memo));
        buzz();
        showToast({ text: "Gesendet", small: true, seconds: 1.5 });
        sentRef.current?.(memo);
      })
      .catch(() => setNote("Die Sprachnachricht ließ sich gerade nicht speichern."));
  }, []);

  /** Aufnahme anhalten – die Aufnahme bleibt (take) bis Senden/Verwerfen */
  const stopLive = useCallback(() => {
    const s = live.current;
    live.current = null;
    setLevels([]);
    if (!s) return;
    const ms = performance.now() - s.startedAt;
    s.recorder.onstop = () => {
      cleanup(s);
      take.current = { blob: new Blob(s.chunks, { type: s.recorder.mimeType || s.mime }), mime: s.mime, ms, levels: s.levels };
      if (sendAfterStop.current) {
        sendAfterStop.current = false;
        const t = take.current;
        take.current = null;
        save(t);
      }
    };
    try {
      if (s.recorder.state !== "inactive") s.recorder.stop();
      else s.recorder.onstop?.(new Event("stop"));
    } catch {
      cleanup(s);
    }
  }, [save]);

  const send = useCallback(() => {
    setAskDiscard(false);
    dispatch({ type: "send" });
    if (live.current) {
      sendAfterStop.current = true;
      stopLive();
    } else if (take.current) {
      const t = take.current;
      take.current = null;
      save(t);
    }
  }, [save, stopLive]);

  const discard = useCallback(() => {
    setAskDiscard(false);
    const ms = live.current ? performance.now() - live.current.startedAt : (take.current?.ms ?? 0);
    dispatch({ type: "discard" });
    sendAfterStop.current = false;
    stopLive();
    if (!discardNeedsUndo(ms)) {
      take.current = null;
      return;
    }
    // Länger aufgenommen: „Verworfen · Rückgängig“ – zurück holt die fertige Aufnahme
    showToast({
      text: "Verworfen",
      small: true,
      seconds: 3,
      undo: () => take.current && dispatch({ type: "undo", ms: take.current.ms }),
      undoneText: "Wieder da",
    });
  }, [stopLive]);

  const begin = useCallback(
    async (mode: MemoMode) => {
      if (live.current || state.phase !== "bereit") return;
      take.current = null;
      setNote(null);
      dispatch({ type: "start", mode });
      buzz();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      } catch (e) {
        dispatch({ type: "denied" });
        const name = e instanceof DOMException ? e.name : "";
        const block = classifyMicError(name, micPlatform(navigator.userAgent));
        // Gesperrt: großes Hilfe-Fenster (core/mic) statt Kleingedrucktem
        if (block) reportMicBlocked(block);
        else setNote(name === "NotFoundError" || name === "OverconstrainedError" ? "Ich finde gerade kein Mikrofon." : DENIED_TEXT());
        return;
      }
      markHintSeen("mikro-gefragt");
      setMicPermission("granted");
      const mime = pickMemoMime((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32_000 });
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        dispatch({ type: "denied" });
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
      const s: Live = { stream, recorder, chunks, mime, ctx, startedAt: performance.now(), levels: [], timer: 0 as unknown as ReturnType<typeof setInterval> };
      s.timer = setInterval(() => {
        const ms = performance.now() - s.startedAt;
        s.levels.push(read ? read() : 0.2 + 0.3 * Math.abs(Math.sin(ms / 180)));
        setLevels(s.levels.slice(-WAVE_BARS));
        dispatch({ type: "tick", ms });
      }, 100);
      live.current = s;
      recorder.start(250);
      dispatch({ type: "ready" });
    },
    [state.phase],
  );

  /** Gesperrt → Hilfe; allererstes Mal → erst „Darf ich zuhören?“; sonst sofort */
  const start = useCallback(
    async (mode: MemoMode) => {
      const asked = hintSeen("mikro-gefragt");
      const m = micState();
      if (m.block || (!asked && !m.granted)) return guardMic(() => void begin(mode), asked);
      await begin(mode);
    },
    [begin],
  );

  // Halten: loslassen = senden (ab 0,3 s), kurz = frei weiter, hochgeschoben = frei weiter
  const release = useCallback(
    (pressMs: number, slideUp: boolean) => {
      const next = memoReducer(state, { type: "release", pressMs, slideUp });
      if (next.outcome === "gesendet") send();
      else dispatch({ type: "release", pressMs, slideUp });
    },
    [state, send],
  );

  // 60 s erreicht → Aufnahme anhalten (wartet auf Senden/Verwerfen)
  useEffect(() => {
    if (state.phase === "gestoppt" && live.current) stopLive();
  }, [state.phase, stopLive]);

  // App/Seite verlassen → anhalten; beim Zurückkommen steht die Frage da
  useEffect(() => {
    if (state.phase !== "nimmt_auf") return;
    const onHide = () => {
      if (document.visibilityState === "hidden") dispatch({ type: "hidden" });
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [state.phase]);

  // Bildschirm an, Seite steht still
  useWakeLock(state.phase === "nimmt_auf");
  useEffect(() => {
    holdPage(busy);
    return () => holdPage(false);
  }, [busy]);

  // Zurück (Pfeil, Geste, Android) während der Aufnahme: nicht still verlieren, sondern fragen
  useEffect(() => {
    if (!busy) return;
    try {
      window.history.pushState({ ...(window.history.state ?? {}), memo: true }, "");
    } catch {
      return;
    }
    const onPop = () => {
      if ((window.history.state as { memo?: boolean } | null)?.memo) return;
      if (live.current) dispatch({ type: "hidden" });
      setAskDiscard(true);
      window.history.pushState({ ...(window.history.state ?? {}), memo: true }, "");
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if ((window.history.state as { memo?: boolean } | null)?.memo) window.history.back();
    };
  }, [busy]);

  // VoiceOver: Zeit alle 10 s (der Text ändert sich nur alle 10 s → wird dann angesagt)
  const announce = timeAnnouncement(Math.floor(state.ms / 10_000) * 10_000) ?? "";

  // Seite verlassen (Komponente weg) = verwerfen
  useEffect(
    () => () => {
      const s = live.current;
      live.current = null;
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

  return {
    phase,
    mode: state.mode,
    elapsed: state.ms,
    levels,
    note,
    announce,
    askDiscard,
    keep: () => setAskDiscard(false),
    start,
    release,
    send,
    discard,
    clearNote: () => setNote(null),
  };
}

export type MemoRecorder = ReturnType<typeof useMemoRecorder>;
