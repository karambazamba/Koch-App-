"use client";

// Mias Stimme und Ohr vom Server (ElevenLabs) in der App. Vorlesen: Antwort in
// Stücken holen und nacheinander abspielen; feste Sätze kommen aus dem
// Zwischenspeicher. Kommt die erste Silbe nicht in ~1 s (oder ist nichts
// eingerichtet), liest still die Stimme des Handys weiter (`ersatz`).
// Zuhören: die eigene Aufnahme (`aufnahme.ts`) geht an `/api/hoeren`, Text kommt
// zurück. Klappt es nicht, einmal still nochmal, dann null. Pinnwand-
// Sprachnachrichten laufen nie hierüber.

import { useEffect, useState } from "react";
import { now, toIsoDate } from "@/lib/core/now";
import { useEinwilligungen } from "@/lib/datenschutz/einwilligung";
import { recordStimme } from "@/lib/begleitung/usage";
import { speechChunks } from "@/lib/begleitung/vorlesText";
import { accessHeaders, deviceId, serverStimme } from "@/lib/begleitung/zugang";
import { GERAET_HEADER, HOEREN_ENDPOINT, STIMME_ENDPOINT, STIMME_GRENZEN, ZEICHEN_HEADER, festerSatz } from "@/lib/begleitung/stimmeProtokoll";

/** Kleinste stille WAV-Datei – zum Freischalten der Wiedergabe beim ersten Tippen */
const STILL = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

let audio: HTMLAudioElement | null = null;

/**
 * iPhone: Ton spielt nur nach einer Berührung. Beim ersten Tippen EIN
 * Abspieler still starten – danach darf genau dieser jederzeit spielen.
 */
export function audioFreischalten() {
  if (audio || typeof window === "undefined" || typeof Audio === "undefined") return;
  try {
    audio = new Audio();
    audio.preload = "auto";
    audio.src = STILL;
    void audio.play()?.catch(() => {});
  } catch {
    audio = null;
  }
}

let lauf = 0;
let abbrechen: (() => void) | null = null;

/** Vorlesen vom Server sofort beenden */
export function serverStimmeStoppen() {
  lauf++;
  abbrechen?.();
  abbrechen = null;
  try {
    audio?.pause();
  } catch {
    // schon still
  }
}

const heute = () => toIsoDate(now());

type Stueck = { blob: Blob; zeichen: number };

/** Ein Stück Ton holen: fester Satz aus dem Zwischenspeicher, sonst frisch */
async function holen(text: string, v: string, signal: AbortSignal): Promise<Stueck> {
  const nr = festerSatz(text);
  const r =
    nr >= 0
      ? await fetch(`${STIMME_ENDPOINT}?satz=${nr}&v=${encodeURIComponent(v)}`, { signal })
      : await fetch(STIMME_ENDPOINT, {
          method: "POST",
          signal,
          cache: "no-store",
          headers: { "content-type": "application/json", ...accessHeaders() },
          body: JSON.stringify({ text, geraet: deviceId() }),
        });
  if (!r.ok) throw new Error("stimme");
  return {
    blob: await r.blob(),
    zeichen: Number(r.headers.get(ZEICHEN_HEADER)) || 0,
  };
}

const bisSpaetestens = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("zeit")), ms))]);

/** Ein Stück abspielen; true = ganz gespielt, false = abgebrochen/Fehler */
function abspielen(a: HTMLAudioElement, blob: Blob, anfang: () => void): Promise<boolean> {
  const url = URL.createObjectURL(blob);
  return new Promise<boolean>((resolve) => {
    const fertig = (ok: boolean) => {
      a.onended = null;
      a.onerror = null;
      a.onplaying = null;
      abbrechen = null;
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    abbrechen = () => fertig(false);
    a.onplaying = anfang;
    a.onended = () => fertig(true);
    a.onerror = () => fertig(false);
    a.src = url;
    const p = a.play();
    if (p) p.catch(() => fertig(false));
  });
}

type Rueckmeldung = {
  /** Ton läuft (Mia spricht) */
  anfang: () => void;
  /** Alles vorgelesen */
  ende: () => void;
  /** Weiter mit der Stimme des Handys – mit dem Text, der noch nicht gesprochen wurde */
  ersatz: (rest: string) => void;
};

/**
 * Bereinigten Text mit Mias Stimme vorlesen. Nichts eingerichtet, erste Silbe
 * zu spät oder ein Fehler: still mit der Stimme des Handys weiter.
 */
export async function mitMiasStimme(text: string, cb: Rueckmeldung): Promise<void> {
  const mine = ++lauf;
  const status = await bisSpaetestens(serverStimme(), 400).catch(() => null);
  if (mine !== lauf) return;
  if (!status?.sprechen || !audio) return cb.ersatz(text);
  const a = audio;
  // Längere Stücke als beim Handy: weniger Abrufe, natürlicher Satzfluss
  const stuecke = speechChunks(text, 300);
  const ctrl = new AbortController();
  const geholt = stuecke.map((s) => holen(s, status.v, ctrl.signal));
  geholt.forEach((p) => p.catch(() => {}));
  for (let i = 0; i < stuecke.length; i++) {
    let stueck: Stueck;
    try {
      stueck = i === 0 ? await bisSpaetestens(geholt[0], STIMME_GRENZEN.ersteSilbeMs) : await geholt[i];
    } catch {
      ctrl.abort();
      if (mine === lauf) cb.ersatz(stuecke.slice(i).join(" "));
      return;
    }
    if (mine !== lauf) return ctrl.abort();
    const ok = await abspielen(a, stueck.blob, cb.anfang);
    if (stueck.zeichen) recordStimme(heute(), { zeichen: stueck.zeichen });
    if (mine !== lauf) return ctrl.abort();
    if (!ok) {
      ctrl.abort();
      return cb.ersatz(stuecke.slice(i).join(" "));
    }
  }
  cb.ende();
}

/** Server-Ohr hat „aus“ gemeldet – bis zum Neuladen wieder der Browser */
let ohrAus = false;

/** Hört Mia gerade über den Server zu? (sofort, ohne Warten) */
export function serverOhr(stand: { hoeren: boolean } | null): boolean {
  return !ohrAus && Boolean(stand?.hoeren) && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

/**
 * Aufnahme in Text verwandeln. Fehler: einmal still nochmal, dann null.
 * Die Aufnahme geht nur an `/api/hoeren` und wird nirgends aufgehoben.
 */
export async function aufnahmeVerstehen(blob: Blob, dauerMs: number): Promise<string | null> {
  for (let versuch = 0; versuch < 2; versuch++) {
    try {
      const r = await fetch(HOEREN_ENDPOINT, {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": blob.type || "audio/webm",
          [GERAET_HEADER]: deviceId(),
          "x-mia-dauer": String(Math.round(dauerMs)),
          ...accessHeaders(),
        },
        body: blob,
      });
      if (r.status === 503) {
        ohrAus = true;
        return null;
      }
      if (!r.ok) continue;
      const body = (await r.json()) as { text?: string; sekunden?: number };
      recordStimme(heute(), {
        sekunden: body.sekunden ?? Math.round(dauerMs / 1000),
      });
      return typeof body.text === "string" ? body.text : "";
    } catch {
      // einmal still nochmal
    }
  }
  return null;
}

/** Ist Mias Stimme vom Server da? (für die Einstellungen; erst false, dann geprüft) */
export function useMiasStimme(): boolean {
  const consent = useEinwilligungen().erteilt("ki");
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let aktiv = true;
    void serverStimme().then((s) => aktiv && setOk(Boolean(s?.sprechen)));
    return () => {
      aktiv = false;
    };
  }, [consent]);
  return consent && ok;
}

/** Hört Mia gerade über den Server zu? (für den Mikro-Check) */
export function useServerOhr(): boolean {
  const consent = useEinwilligungen().erteilt("ki");
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let aktiv = true;
    void serverStimme().then((s) => aktiv && setOk(serverOhr(s)));
    return () => {
      aktiv = false;
    };
  }, [consent]);
  return consent && ok;
}
