"use client";

// Mikro-Check im Browser (Tafel 86): prüft der Reihe nach die Spracherkennung
// (muss im Tipp starten), das Mikrofon (getUserMedia mit Zeitlimit) und ob
// Ton ankommt (kurzer Pegel-Test „Sag mal kurz Moin“). Jeder Schritt landet
// im Mikro-Protokoll. Die Auswertung ist rein (`core/micCheck`).

import { useCallback, useRef, useState } from "react";
import { claimMic, getMicWithRetry, micPlatform, micCheckOk, micSettleWait, releaseMic } from "@/lib/core/mic";
import { diagnose, ergebnisAusFehler, tonAngekommen, vielleichtPrivat, type CheckErgebnis, type MicFehler } from "@/lib/core/micCheck";
import { micLog } from "@/lib/core/micLog";

const CHECK_ID = "mikro-check";
const TON_MS = 4000;
const ERKENNUNG_MS = 3500;

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onresult: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Spracherkennung kurz starten: „ok“ sobald sie zuhört, sonst der Fehlername */
function probeErkennung(): Promise<string> {
  const W = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  const Rec = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  if (!Rec) return Promise.resolve("nicht_da");
  return new Promise((resolve) => {
    let done = false;
    const rec = new Rec();
    const finish = (result: string) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      rec.onstart = rec.onaudiostart = rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {
        // schon beendet
      }
      resolve(result);
    };
    const timer = setTimeout(() => finish("ok"), ERKENNUNG_MS);
    rec.lang = "de-DE";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setTimeout(() => finish("ok"), 600);
    rec.onaudiostart = () => finish("ok");
    rec.onresult = () => finish("ok");
    rec.onerror = (e) => finish(e.error === "no-speech" || e.error === "aborted" ? "ok" : e.error || "fehler");
    rec.onend = () => setTimeout(() => finish("ok"), 50);
    try {
      rec.start();
    } catch (e) {
      finish(e instanceof Error ? e.name : "fehler");
    }
  });
}

/** Pegel messen, bis Ton ankommt (oder die Zeit um ist) */
async function probeTon(stream: MediaStream, onPegel: (p: number) => void): Promise<boolean> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return true;
  const ctx = new Ctx();
  try {
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    const pegel: number[] = [];
    // Laufzeit, nicht Uhrzeit (die Uhr kann stehen, z. B. im Testmodus)
    const start = performance.now();
    while (performance.now() - start < TON_MS) {
      await wait(100);
      analyser.getFloatTimeDomainData(data);
      const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);
      const p = Math.min(1, rms * 6);
      pegel.push(p);
      onPegel(p);
      if (tonAngekommen(pegel)) return true;
    }
    return false;
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

async function privatVerdacht(): Promise<boolean> {
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  const quota = await navigator.storage
    ?.estimate?.()
    .then((e) => e.quota ?? null)
    .catch(() => null);
  return vielleichtPrivat(quota ?? null, standalone);
}

/** `serverOhr`: Mia hört über den Server – dann nur „Mikrofon erlaubt? Ton kommt an?“ */
export function useMicCheck(start: MicFehler | null, serverOhr = false) {
  const [ergebnis, setErgebnis] = useState<CheckErgebnis>(() => (start ? ergebnisAusFehler(start) : { mikro: "ungeprueft", erkennung: "ungeprueft", ton: "ungeprueft" }));
  const [fehler, setFehler] = useState<MicFehler | null>(start);
  const [laeuft, setLaeuft] = useState(false);
  const [sprich, setSprich] = useState(false);
  const [pegel, setPegel] = useState(0);
  const running = useRef(false);

  /** Im Tipp aufrufen (die Spracherkennung startet sofort) */
  const pruefen = useCallback(() => {
    if (running.current) return;
    running.current = true;
    setLaeuft(true);
    setFehler(null);
    const platform = micPlatform(navigator.userAgent);
    let r: CheckErgebnis = { mikro: "ungeprueft", erkennung: serverOhr ? "ok" : "laeuft", ton: "ungeprueft" };
    const show = (patch: Partial<CheckErgebnis>) => {
      r = { ...r, ...patch };
      setErgebnis(r);
    };
    setErgebnis(r);
    micLog("Mikro-Check: Start");
    const erkennung = serverOhr ? Promise.resolve("ok") : probeErkennung();
    void (async () => {
      const e = await erkennung;
      micLog(serverOhr ? "Mikro-Check: Ohr vom Server, ohne Spracherkennung" : `Mikro-Check: Spracherkennung ${e}`);
      show(e === "ok" ? { erkennung: "ok" } : { erkennung: "fehler", erkennungFehler: e });
      const settle = micSettleWait();
      await wait(Math.max(settle, 350));
      show({ mikro: "laeuft" });
      let stream: MediaStream | null = null;
      claimMic(CHECK_ID, () => stream?.getTracks().forEach((t) => t.stop()));
      try {
        stream = await getMicWithRetry(() => navigator.mediaDevices.getUserMedia({ audio: true }), micLog);
        micLog("Mikro-Check: getUserMedia ok");
        show({ mikro: "ok", ton: "laeuft" });
        setSprich(true);
        const ton = await probeTon(stream, setPegel);
        micLog(`Mikro-Check: Ton ${ton ? "ok" : "still"}`);
        show({ ton: ton ? "ok" : "fehler" });
      } catch (err) {
        const name = err instanceof Error ? err.name : "Fehler";
        micLog(`Mikro-Check: getUserMedia ${name}`);
        show({ mikro: "fehler", mikroFehler: name });
      } finally {
        stream?.getTracks().forEach((t) => t.stop());
        releaseMic(CHECK_ID);
        setSprich(false);
        setPegel(0);
      }
      // Mikro gesperrt: ob die Erkennung geht, lässt sich dann nicht sagen
      if (r.mikro === "fehler" && r.erkennung === "fehler") show({ erkennung: "ungeprueft" });
      const privat = r.mikro === "fehler" || r.erkennung === "fehler" || r.ton === "fehler" ? await privatVerdacht() : false;
      const f = diagnose(r, platform, privat);
      micLog(`Mikro-Check: ${f ?? "alles ok"}`);
      setFehler(f);
      if (!f) micCheckOk();
      running.current = false;
      setLaeuft(false);
    })();
  }, [serverOhr]);

  const fertig = !laeuft && ergebnis.mikro === "ok" && ergebnis.erkennung === "ok" && ergebnis.ton === "ok";
  return { ergebnis, fehler, laeuft, sprich, pegel, pruefen, fertig };
}
