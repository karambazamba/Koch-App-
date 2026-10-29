"use client";

// Mias Stimme und Ohr vom Server (ElevenLabs) in der App. Vorlesen: Antwort in
// Stücken holen und nacheinander abspielen; feste Sätze kommen aus dem
// Zwischenspeicher. Innerhalb eines Gesprächs bleibt es Mias Stimme: erste
// Silbe bis 2,5 s (Denk-Zeichen), Fehler still einmal nachladen, erst nach
// zwei Fehlern in Folge das Handy bis die Bühne zugeht (`ersatz`, A-035).
// Zuhören live (`ohrLive.ts`): hier nur der Einmal-Schlüssel vom eigenen Server
// und ob es geht. Ersatz ganz hinten: die eigene Aufnahme (`aufnahme.ts`) geht
// an `/api/hoeren`, Text kommt zurück. Klappt es nicht, einmal still nochmal,
// dann null. Pinnwand-Sprachnachrichten laufen nie hierüber.

import { useEffect, useState } from "react";
import { now, toIsoDate } from "@/lib/core/now";
import { useEinwilligungen } from "@/lib/datenschutz/einwilligung";
import { recordStimme } from "@/lib/begleitung/usage";
import { stueckeFuerStimme } from "@/lib/begleitung/vorlesText";
import { accessHeaders, deviceId, serverStimme, serverStimmeJetzt } from "@/lib/begleitung/zugang";
import { micLog } from "@/lib/core/micLog";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { GERAET_HEADER, HOEREN_ENDPOINT, OHR_TOKEN_ENDPOINT, STIMME_ENDPOINT, STIMME_GRENZEN, ZEICHEN_HEADER, festerSatz, type StimmeStatus } from "@/lib/begleitung/stimmeProtokoll";

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
  setWartet(false);
  abbrechen?.();
  abbrechen = null;
  try {
    audio?.pause();
  } catch {
    // schon still
  }
}

const heute = () => toIsoDate(now());

// --- Ein Gespräch, eine Stimme (A-035) ---------------------------------------
// Gespräch = Bühne auf bis zu. Klappt Mias Stimme einmal nicht, bleibt die
// Antwort als Text stehen und Mia lädt still einmal nach (Denk-Zeichen auf der
// Bühne). Erst nach zwei Fehlern in Folge spricht für den Rest des Gesprächs
// das Handy, mit kleinem Hinweis. Jeder Ersatz steht mit Grund im Mikro-Protokoll.

/** Nach so vielen Fehlern in Folge spricht das Handy bis zum Ende des Gesprächs */
const FEHLER_BIS_HANDY = 2;
/** Kleiner Hinweis unter Mia, wenn das Handy übernimmt (so lange sichtbar) */
export const HANDY_HINWEIS = "Netz wackelt, ich sprech kurz mit Handy-Stimme.";
const HINWEIS_MS = 6000;
/** Vorwärmen höchstens so oft (Bühne mehrmals kurz hintereinander auf) */
const WARM_ABSTAND_MS = 60_000;

let fehlerInFolge = 0;
let handyBisEnde = false;
let hinweis: string | null = null;
let hinweisTimer: ReturnType<typeof setTimeout> | null = null;
/** Mia wartet auf ihre erste Silbe (Denk-Zeichen statt Stille) */
let wartet = false;
/** Gründe ohne Fehler (nicht eingerichtet …) nur einmal je Gespräch ins Protokoll */
const gemeldet = new Set<string>();
let warmAm = -Infinity;
const lageListeners = new Set<() => void>();
const lageGeaendert = () => lageListeners.forEach((l) => l());

function setWartet(on: boolean) {
  if (wartet === on) return;
  wartet = on;
  lageGeaendert();
}

function setHinweis(text: string | null) {
  if (hinweisTimer) clearTimeout(hinweisTimer);
  hinweisTimer = text ? setTimeout(() => setHinweis(null), HINWEIS_MS) : null;
  hinweis = text;
  lageGeaendert();
}

/** Neues bzw. beendetes Gespräch: wieder Mias Stimme, Fehler vergessen */
function gespraechZuruecksetzen() {
  fehlerInFolge = 0;
  handyBisEnde = false;
  gemeldet.clear();
  setHinweis(null);
}

/**
 * Ein Versuch ist gescheitert. true = still einmal nachladen; false = ab jetzt
 * (bis die Bühne zugeht) die Stimme des Handys, mit Hinweis.
 */
function fehlschlag(grund: string): boolean {
  fehlerInFolge++;
  if (fehlerInFolge < FEHLER_BIS_HANDY) {
    micLog(`Stimme: still nochmal (${grund})`);
    return true;
  }
  handyBisEnde = true;
  micLog(`Stimme: Ersatz Handy-Stimme bis Gesprächsende (${grund})`);
  setHinweis(HANDY_HINWEIS);
  return false;
}

/** Ersatz ohne Fehler (nichts eingerichtet, Ton nicht freigeschaltet) – einmal je Gespräch melden */
function ohneFehler(grund: string) {
  if (gemeldet.has(grund)) return;
  gemeldet.add(grund);
  micLog(`Stimme: Ersatz Handy-Stimme (${grund})`);
}

/**
 * Verbindung vorwärmen: kleiner Abruf beim eigenen Server (`?warm=1`), der
 * nur die Verbindung zum Anbieter öffnet – kein Sprechen, kein Kontingent.
 */
async function vorwaermen() {
  const s = await serverStimme().catch(() => null);
  if (!s?.sprechen || now().getTime() - warmAm < WARM_ABSTAND_MS) return;
  warmAm = now().getTime();
  try {
    await fetch(`${STIMME_ENDPOINT}?warm=1`, { cache: "no-store", headers: accessHeaders() });
  } catch {
    // nur Tempo – ohne geht es auch
  }
}

/**
 * Bühne geht auf: Gespräch beginnt (Mias Stimme, Fehler vergessen), Status
 * holen und merken, Verbindung vorwärmen. Zurück: Gespräch zu Ende.
 */
export function stimmeGespraech(vorlesen: boolean): () => void {
  gespraechZuruecksetzen();
  if (vorlesen) void vorwaermen();
  else void serverStimme().catch(() => null);
  return gespraechZuruecksetzen;
}

/** Für die Bühne: Gespräch an Auf/Zu der Bühne binden */
export function useStimmeGespraech(vorlesen: boolean) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => stimmeGespraech(vorlesen), []);
}

const lageAbo = (l: () => void) => {
  lageListeners.add(l);
  return () => {
    lageListeners.delete(l);
  };
};

/** Wartet Mia auf ihre erste Silbe? (Bühne zeigt dann das Denk-Zeichen) */
export function useStimmeWartet(): boolean {
  return useExternalStore(lageAbo, () => wartet, () => false);
}

/** Hinweis von eben (Handy übernimmt), sonst null */
export const stimmeHinweisJetzt = () => hinweis;

/** Kleiner Hinweis unter Mia (Handy übernimmt), sonst null */
export function useStimmeHinweis(): string | null {
  return useExternalStore(lageAbo, stimmeHinweisJetzt, () => null);
}

type Stueck = { blob: Blob; zeichen: number };

/** Fehler mit Grund fürs Mikro-Protokoll (nur Technik: Zeit, Status-Code) */
class StimmeFehler extends Error {}
const grundVon = (e: unknown) => (e instanceof StimmeFehler ? e.message : "Fehler");

/** Ein Stück Ton holen: fester Satz aus dem Zwischenspeicher, sonst frisch */
async function holen(text: string, v: string, signal: AbortSignal): Promise<Stueck> {
  const nr = festerSatz(text);
  let r: Response;
  try {
    r =
      nr >= 0
        ? await fetch(`${STIMME_ENDPOINT}?satz=${nr}&v=${encodeURIComponent(v)}`, { signal })
        : await fetch(STIMME_ENDPOINT, {
            method: "POST",
            signal,
            cache: "no-store",
            headers: { "content-type": "application/json", ...accessHeaders() },
            body: JSON.stringify({ text, geraet: deviceId() }),
          });
  } catch {
    throw new StimmeFehler("Fehler Netz");
  }
  if (!r.ok) throw new StimmeFehler(`Fehler ${r.status}`);
  try {
    return { blob: await r.blob(), zeichen: Number(r.headers.get(ZEICHEN_HEADER)) || 0 };
  } catch {
    throw new StimmeFehler("Fehler Netz");
  }
}

/** Höchstens `ms` warten; sonst Fehler mit Grund */
function bisSpaetestens<T>(p: Promise<T>, ms: number, grund: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const zeit = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new StimmeFehler(grund)), ms);
  });
  return Promise.race([p, zeit]).finally(() => clearTimeout(t));
}

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
 * Bereinigten Text mit Mias Stimme vorlesen. Gemerkter Status „sprechen“ →
 * sofort los; sonst höchstens `ersteSilbeMs` auf den Status warten. Erste
 * Silbe bis `ersteSilbeMs`, solange zeigt die Bühne das Denk-Zeichen. Fehler:
 * still einmal nachladen, beim zweiten in Folge das Handy bis Gesprächsende.
 */
export async function mitMiasStimme(text: string, cb: Rueckmeldung): Promise<void> {
  const mine = ++lauf;
  if (handyBisEnde) return cb.ersatz(text);
  setWartet(true);
  try {
    await vorlesen(text, cb, () => mine === lauf);
  } finally {
    if (mine === lauf) setWartet(false);
  }
}

async function vorlesen(text: string, cb: Rueckmeldung, aktuell: () => boolean): Promise<void> {
  const ms = STIMME_GRENZEN.ersteSilbeMs;
  // Status: gemerkt (beim Öffnen von App/Bühne geholt) oder kurz darauf warten
  let status: StimmeStatus | null | undefined = serverStimmeJetzt() ?? undefined;
  while (status === undefined) {
    try {
      status = await bisSpaetestens(serverStimme(), ms, "Status zu spät");
    } catch (e) {
      if (!aktuell()) return;
      if (!fehlschlag(grundVon(e))) return cb.ersatz(text);
    }
  }
  if (!aktuell()) return;
  const a = audio;
  if (!status?.sprechen || !a) {
    ohneFehler(status?.sprechen ? "Ton nicht freigeschaltet" : "nicht eingerichtet");
    return cb.ersatz(text);
  }
  const v = status.v;
  const anfang = () => {
    if (!aktuell()) return;
    setWartet(false);
    cb.anfang();
  };
  // Erster Satz allein (schneller erster Ton), danach längere Stücke: weniger Abrufe, natürlicher Satzfluss
  const stuecke = stueckeFuerStimme(text);
  const ctrl = new AbortController();
  const frisch = (s: string) => {
    const p = holen(s, v, ctrl.signal);
    p.catch(() => {});
    return p;
  };
  const geholt = stuecke.map(frisch);
  const handyAb = (i: number) => {
    ctrl.abort();
    cb.ersatz(stuecke.slice(i).join(" "));
  };
  for (let i = 0; i < stuecke.length; i++) {
    let versuch = geholt[i];
    let gezaehlt = false;
    for (;;) {
      let stueck: Stueck;
      try {
        stueck = i === 0 ? await bisSpaetestens(versuch, ms, "erste Silbe zu spät") : await versuch;
      } catch (e) {
        if (!aktuell()) return ctrl.abort();
        if (!fehlschlag(grundVon(e))) return handyAb(i);
        versuch = frisch(stuecke[i]);
        continue;
      }
      if (!aktuell()) return ctrl.abort();
      const ok = await abspielen(a, stueck.blob, anfang);
      if (stueck.zeichen && !gezaehlt) recordStimme(heute(), { zeichen: stueck.zeichen });
      gezaehlt = true;
      if (!aktuell()) return ctrl.abort();
      if (ok) {
        fehlerInFolge = 0;
        break;
      }
      if (!fehlschlag("Abspielen")) return handyAb(i);
      versuch = Promise.resolve(stueck);
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

/** Live-Zuhören hat „aus“ gemeldet bzw. ist zweimal hintereinander gescheitert – bis zum Neuladen nicht mehr */
let liveAus = false;
let liveFehler = 0;

/** Kann dieser Browser live zuhören? (Mikrofon, Ton-Verarbeitung, Websocket) */
function liveTechnik(): boolean {
  if (typeof window === "undefined") return false;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
  return Boolean(AC) && typeof WebSocket !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

/** Hört Mia live über den Server zu? (sofort, ohne Warten) */
export function liveOhr(stand: { live?: boolean } | null): boolean {
  return !liveAus && stand?.live === true && liveTechnik();
}

/** Eine Live-Runde ist gescheitert (Schlüssel/Verbindung); zweimal hintereinander = bis zum Neuladen Browser */
export function liveGescheitert() {
  if (++liveFehler >= 2) liveAus = true;
}

/** Eine Live-Runde hat geklappt: gestreamte Sekunden für die Kosten-Übersicht */
export function liveGeklappt(sekunden: number) {
  liveFehler = 0;
  if (sekunden > 0) recordStimme(heute(), { sekunden: Math.max(1, Math.round(sekunden)) });
}

type OhrSchluessel = { token: string; modell: string };

/** Ein Einmal-Schlüssel gilt 15 Min. – vorgewärmt nehmen wir ihn höchstens so lange (Rest = Luft fürs Verbinden) */
export const TOKEN_FRISCH_MS = 13 * 60_000;
/** Nach dem Verbrauch so lange warten, bevor der nächste geholt wird (stört das Verbinden nicht) */
const NACHFUELLEN_MS = 1500;
let vorrat: (OhrSchluessel & { am: number }) | null = null;
let holt: Promise<OhrSchluessel | null> | null = null;
let erneuern: ReturnType<typeof setTimeout> | null = null;
const frisch = () => (vorrat && now().getTime() - vorrat.am < TOKEN_FRISCH_MS ? vorrat : null);

/**
 * Schlüssel vorwärmen (A-056): beim Öffnen der App, wenn die Leiste sichtbar
 * wird und nach jedem Verbrauch. Vor Ablauf (13 Min.) wird er erneuert, aber
 * nur, solange die App sichtbar ist. Er kommt nur vom eigenen Server, liegt nur
 * im Arbeitsspeicher und steht nie im Protokoll.
 */
export function ohrTokenVorwaermen(): Promise<void> {
  if (typeof window === "undefined" || !liveOhr(serverStimmeJetzt())) return Promise.resolve();
  if (frisch()) return Promise.resolve();
  holt ??= tokenHolen().then((t) => {
    holt = null;
    if (t) {
      vorrat = { ...t, am: now().getTime() };
      if (erneuern) clearTimeout(erneuern);
      erneuern = setTimeout(() => {
        vorrat = null;
        if (document.visibilityState === "visible") void ohrTokenVorwaermen();
      }, TOKEN_FRISCH_MS);
    }
    return t;
  });
  return holt.then(() => {});
}

/** Einmal-Schlüssel fürs Live-Zuhören (gilt kurz und nur für eine Verbindung); vorgewärmt sofort, sonst frisch geholt; null = geht nicht */
export async function ohrToken(): Promise<OhrSchluessel | null> {
  if (!frisch() && holt) await holt;
  const v = frisch();
  vorrat = null;
  if (v) {
    // Gleich den nächsten bereitlegen (Mia hört nach ihrer Antwort oft wieder zu)
    setTimeout(() => void ohrTokenVorwaermen(), NACHFUELLEN_MS);
    micLog("Ohr live: Schlüssel war vorgewärmt");
    return { token: v.token, modell: v.modell };
  }
  return tokenHolen();
}

async function tokenHolen(): Promise<OhrSchluessel | null> {
  try {
    const r = await fetch(OHR_TOKEN_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json", ...accessHeaders() },
      body: JSON.stringify({ geraet: deviceId() }),
      signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(2500) : undefined,
    });
    if (r.status === 503) liveAus = true;
    if (!r.ok) return null;
    const b = (await r.json()) as { token?: unknown; modell?: unknown };
    if (typeof b.token !== "string" || !b.token) return null;
    return { token: b.token, modell: typeof b.modell === "string" && b.modell ? b.modell : "scribe_v2_realtime" };
  } catch {
    return null;
  }
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
    void serverStimme().then((s) => aktiv && setOk(serverOhr(s) || liveOhr(s)));
    return () => {
      aktiv = false;
    };
  }, [consent]);
  return consent && ok;
}
