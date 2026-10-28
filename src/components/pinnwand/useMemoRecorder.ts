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
// Mikro (core/mic): immer nur EIN Nutzer – vor der Aufnahme endet Mias
// Zuhören, danach werden Tracks, Analyser und AudioContext in JEDEM Fall
// freigegeben. Der AudioContext entsteht im Tipp (iPhone), getUserMedia hat
// ein Zeitlimit (4 s), und „sehr kurz“ gibt es nur, wenn wirklich Ton kam.

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { MEMO_MIN_MS, WAVE_BARS, addMemo, changeMemos, createMemo, pickMemoMime, resample, type MemoMessage, type ZettelFarbe } from "@/lib/pinnwand";
import { MEMO_IDLE, discardNeedsUndo, holdsMic, memoReducer, timeAnnouncement, type MemoMode } from "@/lib/pinnwand/recorderState";
import { memoAudio } from "@/lib/pinnwand/memoAudio";
import { showToast } from "@/lib/core/toast";
import { useWakeLock } from "@/lib/core/wakeLock";
import { buzz } from "@/components/heute/actions";
import { hintSeen, markHintSeen } from "@/lib/core/hints";
import { MIC_HANGS_TEXT, claimMic, classifyMicError, getMicWithRetry, guardMic, micOwner, micPlatform, micRanThisSession, micSettleWait, micState, noteMicRan, releaseMic, reportMicBlocked, setMicPermission } from "@/lib/core/mic";
import { micLog } from "@/lib/core/micLog";
import { APP_NAME } from "@/lib/core/app";
import { isIosBrowserTab } from "@/lib/core/homescreen";

type RecorderPhase = "idle" | "asking" | "recording" | "stopped";

/** Eigener Name beim Mikro-Verwalter */
const MIC_ID = "pinnwand";
/** So lange auf das „stop“ des Recorders warten, dann selbst aufräumen (iOS meldet es manchmal nie) */
const STOP_GRACE_MS = 1500;

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

export function useMemoRecorder({ me, onSent, farbe = null }: { me: string; onSent?: (memo: MemoMessage) => void; farbe?: ZettelFarbe | null }) {
  const [state, dispatch] = useReducer(memoReducer, MEMO_IDLE);
  const [levels, setLevels] = useState<number[]>([]);
  const [note, setNote] = useState<string | null>(null);
  /** Zurück während der Aufnahme: „Verwerfen?“ */
  const [askDiscard, setAskDiscard] = useState(false);
  /** Senden hat nicht geklappt: die Aufnahme bleibt (take), „Nochmal senden“ */
  const [unsent, setUnsent] = useState(false);
  const live = useRef<Live | null>(null);
  const take = useRef<Take | null>(null);
  /** Nach dem Anhalten gleich senden (Loslassen beim Halten, „Senden“ während der Aufnahme) */
  const sendAfterStop = useRef(false);
  /** Wartet gerade auf das Mikro (nach „Senden“/„Verwerfen“ davor: nicht mehr starten) */
  const waiting = useRef(false);
  const meRef = useRef(me);
  const sentRef = useRef(onSent);
  const farbeRef = useRef(farbe);
  useEffect(() => {
    meRef.current = me;
    sentRef.current = onSent;
    farbeRef.current = farbe;
  });
  const phase = PHASE[state.phase];
  const busy = phase !== "idle";

  const cleanup = (s: Live) => {
    clearInterval(s.timer);
    s.stream.getTracks().forEach((t) => t.stop());
    if (s.ctx && s.ctx.state !== "closed") void s.ctx.close().catch(() => undefined);
    s.ctx = null;
    releaseMic(MIC_ID);
  };

  const save = useCallback((t: Take) => {
    micLog(`Senden: ${t.blob.size} Bytes, ${Math.round(t.ms / 100) / 10} s`);
    // Kam gar kein Ton, lief die Aufnahme nie richtig – das ist nicht „zu kurz“
    if (!t.blob.size) return setNote(MIC_HANGS_TEXT);
    if (t.ms < MEMO_MIN_MS) return setNote("Das war sehr kurz – einfach nochmal antippen und sprechen.");
    const memo = createMemo({ author: meRef.current, dauer: t.ms / 1000, mime: t.blob.type || t.mime, wave: resample(t.levels, WAVE_BARS * 2), farbe: farbeRef.current });
    setUnsent(false);
    // Der Eintrag kommt erst nach dem Ablegen des Tons in die Pinnwand; klappt
    // das Ablegen nie, bleibt die Aufnahme – nichts geht verloren
    void memoAudio
      .save(memo.id, t.blob)
      .then((place) => {
        changeMemos((all) => addMemo(all, memo));
        buzz();
        showToast({ text: "Gesendet", small: true, seconds: 1.5 });
        if (place === "sitzung" && !hintSeen("memo-nur-sitzung")) {
          markHintSeen("memo-nur-sitzung");
          setNote(`Diese Sprachnachricht bleibt nur, bis du ${APP_NAME} schließt.`);
        }
        sentRef.current?.(memo);
      })
      .catch((e: unknown) => {
        micLog(`Senden fehlgeschlagen: ${e instanceof Error ? e.name || e.message : "Fehler"}`);
        take.current = t;
        setUnsent(true);
        setNote("Die Sprachnachricht ließ sich gerade nicht speichern.");
      });
  }, []);

  /** Nach einem Fehler: dieselbe Aufnahme nochmal senden */
  const resend = useCallback(() => {
    const t = take.current;
    if (!t) return setUnsent(false);
    take.current = null;
    setNote(null);
    save(t);
  }, [save]);

  /** Aufnahme anhalten – die Aufnahme bleibt (take) bis Senden/Verwerfen */
  const stopLive = useCallback(() => {
    const s = live.current;
    live.current = null;
    setLevels([]);
    if (!s) return;
    const ms = performance.now() - s.startedAt;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(grace);
      cleanup(s);
      take.current = { blob: new Blob(s.chunks, { type: s.recorder.mimeType || s.mime }), mime: s.mime, ms, levels: s.levels };
      if (sendAfterStop.current) {
        sendAfterStop.current = false;
        const t = take.current;
        take.current = null;
        save(t);
      }
    };
    // Kommt „stop“ nicht, trotzdem freigeben (sonst hängt das Mikro beim nächsten Mal)
    const grace = setTimeout(finish, STOP_GRACE_MS);
    s.recorder.onstop = finish;
    try {
      if (s.recorder.state !== "inactive") s.recorder.stop();
      else finish();
    } catch {
      finish();
    }
  }, [save]);

  const send = useCallback(() => {
    setAskDiscard(false);
    waiting.current = false;
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
    waiting.current = false;
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
      setUnsent(false);
      setNote(null);
      waiting.current = true;
      micLog(`Tipp: Aufnahme starten (${mode})`);
      const firstThisSession = !micRanThisSession();
      const askedBefore = hintSeen("mikro-gefragt");
      dispatch({ type: "start", mode });
      buzz();
      // Mia hört gerade zu? Erst sauber beenden (immer nur ein Mikro-Nutzer)
      claimMic(MIC_ID, () => {
        if (live.current) {
          sendAfterStop.current = false;
          dispatch({ type: "hidden" });
          stopLive();
        } else dispatch({ type: "denied" });
      });
      // iPhone: AudioContext im Tipp anlegen und starten, sonst bleibt er stumm
      let ctx: AudioContext | null = null;
      try {
        ctx = new AudioContext();
        void ctx.resume().catch(() => undefined);
      } catch {
        ctx = null;
      }
      const giveUp = (text: string | null) => {
        waiting.current = false;
        if (ctx) void ctx.close().catch(() => undefined);
        releaseMic(MIC_ID);
        dispatch({ type: "denied" });
        if (text) setNote(text);
      };
      let stream: MediaStream;
      try {
        // Eben erst abgegeben (Mia)? iOS braucht einen Moment
        const wait = micSettleWait();
        if (wait) await new Promise((r) => setTimeout(r, wait));
        stream = await getMicWithRetry(() => navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }), micLog);
        micLog("getUserMedia ok");
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        micLog(`getUserMedia: ${name || "Fehler"}`);
        if (name === "MicTimeout") return giveUp(MIC_HANGS_TEXT);
        const block = classifyMicError(name, micPlatform(navigator.userAgent));
        // Gesperrt: großes Hilfe-Fenster (core/mic) statt Kleingedrucktem
        if (block) {
          giveUp(null);
          reportMicBlocked(block);
          return;
        }
        return giveUp(name === "NotFoundError" || name === "OverconstrainedError" ? "Ich finde gerade kein Mikrofon." : DENIED_TEXT());
      }
      // Inzwischen hat jemand anderes das Mikro genommen (z. B. Mia) → leise aufhören
      // … oder es wurde schon gesendet/verworfen/die Seite verlassen
      if (micOwner() !== MIC_ID || !waiting.current) {
        stream.getTracks().forEach((t) => t.stop());
        if (ctx) void ctx.close().catch(() => undefined);
        if (micOwner() === MIC_ID) releaseMic(MIC_ID);
        dispatch({ type: "denied" });
        return;
      }
      waiting.current = false;
      noteMicRan();
      markHintSeen("mikro-gefragt");
      setMicPermission("granted");
      // Safari-Tab fragt jedes Mal neu nach dem Mikro – einmal den Weg übers Icon zeigen
      if (firstThisSession && askedBefore && isIosBrowserTab() && !hintSeen("mikro-homescreen")) {
        markHintSeen("mikro-homescreen");
        setNote(`Tipp: Über das ${APP_NAME}-Icon auf dem Homescreen fragt das iPhone nicht jedes Mal nach dem Mikrofon.`);
      }
      const mime = pickMemoMime((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32_000 });
      } catch (e) {
        micLog(`Recorder: ${e instanceof Error ? e.name : "Fehler"}`);
        stream.getTracks().forEach((t) => t.stop());
        giveUp("Sprachnachrichten gehen auf diesem Gerät leider nicht.");
        return;
      }
      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      // Pegel nur, wenn es klappt – die Aufnahme hängt nie davon ab
      let read: (() => number) | null = null;
      try {
        if (!ctx) throw new Error("kein AudioContext");
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
        read = null;
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
      micLog(`Recorder läuft (${recorder.mimeType || mime || "Standard"})`);
      dispatch({ type: "ready" });
    },
    [state.phase, stopLive],
  );

  /** Gesperrt → Hilfe; allererstes Mal → erst „Darf ich zuhören?“; sonst sofort */
  const start = useCallback(
    async (mode: MemoMode) => {
      // Eine Aufnahme wartet noch aufs Senden: erst die (nie still überschreiben)
      if (unsent && take.current) return resend();
      const asked = hintSeen("mikro-gefragt");
      const m = micState();
      if (m.block || (!asked && !m.granted)) return guardMic(() => void begin(mode), asked);
      await begin(mode);
    },
    [begin, unsent, resend],
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
      waiting.current = false;
      const s = live.current;
      live.current = null;
      if (!s) releaseMic(MIC_ID);
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
    /** Finger liegt noch auf dem Mikro (Halten): Mikro stehen lassen, sonst kommt das Loslassen nicht an */
    holding: holdsMic(state),
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
    unsent,
    resend,
    clearNote: () => setNote(null),
  };
}

export type MemoRecorder = ReturnType<typeof useMemoRecorder>;
