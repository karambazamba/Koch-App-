"use client";

// Lotte liest vor – Sprachausgabe des Browsers (Web Speech API), kostenlos und
// ohne Server. Einstellungen gelten pro Gerät (die Stimmen sind je Gerät
// verschieden) unter `wasgibts.vorlesen`. Fehler der Sprachausgabe stören nie:
// geht es nicht (kein Ton, stumm geschaltet, keine Stimme), passiert einfach nichts.

import { setAvatarFlag } from "@/lib/core/avatarState";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import { cleanForSpeech, speechChunks } from "@/lib/begleitung/vorlesText";
import { audioFreischalten, mitMiasStimme, serverStimmeStoppen } from "@/lib/begleitung/stimmeClient";
import { useEffect, useState } from "react";
import { createLocalStore, readRaw, writeRaw } from "@/lib/core/localStore";
import type { HelperVoice } from "@/lib/einstellungen/profile";
import { useExternalStore } from "@/lib/core/useExternalStore";
import type { StorageKey } from "@/lib/core/storage";

// --- Einstellungen --------------------------------------------------------------

/** auto = vorlesen, wenn per Mikrofon gefragt wurde; an = immer; aus = nie */
export type ReadMode = "auto" | "an" | "aus";
export type SpeechRate = "langsam" | "normal" | "schnell";

/** mia = Mias Stimme vom Server (falls eingerichtet), handy = Stimme des Handys */
export type VoiceSource = "mia" | "handy";

export type SpeechSettings = {
  version: 1;
  mode: ReadMode;
  /** Wer spricht: Mias Stimme (Standard) oder die des Handys */
  quelle: VoiceSource;
  /** Gewählte Stimme (voiceURI); leer = automatisch passend zu weiblich/männlich */
  voice: string;
  rate: SpeechRate;
};

export const READ_MODES: { value: ReadMode; label: string; hint: string; short: string }[] = [
  { value: "auto", label: "Wenn du mit mir sprichst", hint: "Getippte Fragen beantworte ich still.", short: "Bei Sprache" },
  { value: "an", label: "Immer", hint: "Auch jeden Schritt beim Kochen.", short: "Immer" },
  { value: "aus", label: "Nie", hint: "Antippen des Lautsprechers geht trotzdem.", short: "Nie" },
];

export const SPEECH_RATES: { value: SpeechRate; label: string; rate: number }[] = [
  { value: "langsam", label: "Langsam", rate: 0.8 },
  // Natürlich wie das Gerät (Tafel 28: Tempo 1,0)
  { value: "normal", label: "Normal", rate: 1 },
  { value: "schnell", label: "Schnell", rate: 1.2 },
];

const DEFAULTS: SpeechSettings = { version: 1, mode: "auto", quelle: "mia", voice: "", rate: "normal" };
const LEGACY_ON: SpeechSettings = { ...DEFAULTS, mode: "an" };
/** Früher: nur an/aus im Küchenhelfer-Kopf */
const LEGACY_KEY = "wasgibts.kuechenhelfer.vorlesen";

function migrate(raw: unknown): SpeechSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<SpeechSettings>;
  return {
    version: 1,
    mode: READ_MODES.some((m) => m.value === d.mode) ? (d.mode as ReadMode) : "auto",
    quelle: d.quelle === "handy" ? "handy" : "mia",
    voice: typeof d.voice === "string" ? d.voice : "",
    rate: SPEECH_RATES.some((r) => r.value === d.rate) ? (d.rate as SpeechRate) : "normal",
  };
}

const store = createLocalStore("wasgibts.vorlesen", migrate);

export function loadSpeechSettings(): SpeechSettings {
  const saved = store.load();
  if (saved) return saved;
  // Alter Schalter "an" bleibt an; sonst Standard (automatisch)
  try {
    if (readRaw(LEGACY_KEY) === "1") return LEGACY_ON;
  } catch {
    // ohne Speicher: Standard
  }
  return DEFAULTS;
}

/** Alten Schalter einmalig übernehmen, damit der alte Schlüssel weg kann */
export function adoptLegacySpeech() {
  try {
    if (!store.load() && readRaw(LEGACY_KEY) === "1") store.save(LEGACY_ON);
  } catch {
    // ohne Speicher nichts zu tun
  }
}

export function saveSpeechSettings(changes: Partial<Omit<SpeechSettings, "version">>) {
  store.save({ ...loadSpeechSettings(), ...changes, version: 1 });
}

export function useSpeechSettings(): SpeechSettings {
  return useExternalStore(store.subscribe, loadSpeechSettings, () => DEFAULTS);
}

/** Soll eine Antwort von selbst vorgelesen werden? */
export function shouldRead(mode: ReadMode, askedByVoice: boolean): boolean {
  return mode === "an" || (mode === "auto" && askedByVoice);
}

// --- Stimmen --------------------------------------------------------------------------

export function speechSupported(): boolean {
  return typeof window !== "undefined" && Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== "undefined";
}

const isGerman = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-").toLowerCase().startsWith("de");

// Bekannte deutsche Systemstimmen (iOS, macOS, Android/Chrome, Windows/Edge).
// Die Web Speech API kennt kein Geschlecht – daher über den Namen.
const FEMALE = /anna|petra|helena|katja|marlene|vicki|hedda|amala|seraphina|louisa|tanja|elke|gisela|ingrid|klara|maja|frauke|sabine|female|weiblich|google deutsch/i;
const MALE = /markus|yannick|viktor|hans|conrad|stefan|killian|florian|martin|ralf|bernd|kasper|klaus|\bmale\b|männlich|maennlich/i;
// Spaß-/Effektstimmen (iPhone/Mac "Eloquence" & Co.) klingen sehr nach Roboter – nie automatisch nehmen
const NOVELTY = /\b(eddy|flo|grandma|grandpa|oma|opa|reed|rocko|sandy|shelley|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph)\b|eloquence|novelty/i;

/** "Natürlichere" Stimmen: Premium/Enhanced/Erweitert (iPhone, Mac) – auch Natural/Neural (Edge) */
const NATURAL = /premium|enhanced|erweitert|natural|neural/i;

export function isNaturalVoice(v: SpeechSynthesisVoice): boolean {
  return NATURAL.test(`${v.name} ${v.voiceURI}`) && !NOVELTY.test(`${v.name} ${v.voiceURI}`);
}

/**
 * Reihenfolge der deutschen Stimmen: zuerst die natürlicheren (Premium vor
 * Enhanced/Erweitert), danach die übrigen – Google-/Netzstimmen vor
 * einfachen "compact"-Stimmen. Spaß-/Effektstimmen bekommen −10.
 */
function voiceScore(v: SpeechSynthesisVoice): number {
  const id = `${v.name} ${v.voiceURI}`;
  if (NOVELTY.test(id)) return -10;
  let score = 0;
  if (isNaturalVoice(v)) score += /premium|natural|neural/i.test(id) ? 6 : 5;
  else if (/google|network|online/i.test(id) || v.localService === false) score += 2;
  if (/compact|kompakt|desktop/i.test(id)) score -= 1;
  if (/de[-_]de/i.test(v.lang)) score += 1;
  return score;
}

/** Deutsche Stimmen des Geräts, natürlichste zuerst, ohne Spaß-/Effektstimmen */
export function germanVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((v) => isGerman(v) && voiceScore(v) >= 0).sort((a, b) => voiceScore(b) - voiceScore(a));
}

/**
 * Passende deutsche Stimme für "weiblich"/"männlich": die natürlichste mit
 * passendem Namen, sonst die natürlichste ohne erkennbar anderes Geschlecht,
 * sonst die beste deutsche, sonst keine (Standard des Geräts).
 */
export function pickVoice(voices: SpeechSynthesisVoice[], voice: HelperVoice): SpeechSynthesisVoice | null {
  const german = germanVoices(voices);
  const wanted = voice === "maennlich" ? MALE : FEMALE;
  const other = voice === "maennlich" ? FEMALE : MALE;
  return german.find((v) => wanted.test(v.name)) ?? german.find((v) => !other.test(v.name)) ?? german[0] ?? null;
}

/** Gibt es eine deutsche Stimme, die erkennbar zu weiblich/männlich passt? */
function hasMatchingVoice(voices: SpeechSynthesisVoice[], voice: HelperVoice): boolean {
  const wanted = voice === "maennlich" ? MALE : FEMALE;
  return germanVoices(voices).some((v) => wanted.test(v.name));
}

/** Wo man auf dem iPhone bessere Stimmen lädt */
export const VOICE_HINT = "Für eine passende Stimme: iPhone-Einstellungen → Bedienungshilfen → Lesen & Sprechen → Stimmen → Deutsch.";

const VOICE_HINT_KEY: StorageKey = "wasgibts.stimmenhinweis";

/** Einmaliger Hinweis, wenn keine passende Stimme installiert ist (true = jetzt zeigen) */
function takeVoiceHint(voices: SpeechSynthesisVoice[], voice: HelperVoice): boolean {
  if (!voices.length || hasMatchingVoice(voices, voice)) return false;
  try {
    if (readRaw(VOICE_HINT_KEY)) return false;
    writeRaw(VOICE_HINT_KEY, "1");
  } catch {
    return false;
  }
  return true;
}

/** "▶ Stimme": kurzer Satz in der Stimme, die zur Art passt (automatisch gewählt) */
export function previewHelperVoice(name: string, voice: HelperVoice): boolean {
  unlockSpeech();
  // Mias Stimme (fester Satz, zwischengespeichert) bzw. die passende des Handys
  speak("Moin! So klinge ich.", { id: `probe-${name}`, gender: voice });
  return takeVoiceHint(currentVoices(), voice);
}

/** Gewählte Stimme oder die passende automatische */
function chooseVoice(voices: SpeechSynthesisVoice[], settings: SpeechSettings, gender: HelperVoice): SpeechSynthesisVoice | null {
  return (settings.voice && voices.find((v) => v.voiceURI === settings.voice)) || pickVoice(voices, gender);
}

function currentVoices(): SpeechSynthesisVoice[] {
  try {
    return speechSupported() ? window.speechSynthesis.getVoices() : [];
  } catch {
    return [];
  }
}

/** Stimmenliste – lädt auf manchen Geräten verzögert ("voiceschanged" abwarten) */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!speechSupported()) return;
    const update = () => setVoices(currentVoices());
    update();
    window.speechSynthesis.addEventListener?.("voiceschanged", update);
    // Safari meldet "voiceschanged" nicht immer – kurz nachschauen
    const timers = [300, 1200, 3000].map((ms) => setTimeout(update, ms));
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", update);
      timers.forEach(clearTimeout);
    };
  }, []);
  return voices;
}

// --- Vorlesen ---------------------------------------------------------------------------

/** Was gerade vorgelesen wird (Kennung, z. B. "turn-3"), sonst null */
let speakingId: string | null = null;
const listeners = new Set<() => void>();
const setSpeaking = (id: string | null) => {
  speakingId = id;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Kennung dessen, was gerade vorgelesen wird */
export function useSpeakingId(): string | null {
  return useExternalStore(subscribe, () => speakingId, () => null);
}

let unlocked = false;

/**
 * iPhone/iPad: Sprachausgabe startet erst nach einer Berührung. Beim ersten
 * Tippen (Mikrofon, Lautsprecher, Weiter …) eine stille Äußerung abspielen.
 */
export function unlockSpeech() {
  audioFreischalten();
  if (unlocked || !speechSupported()) return;
  unlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    // nichts zu tun
  }
}

let token = 0;

// Avatar spricht nur, während tatsächlich Worte kommen: an bei Beginn eines
// Satzes und bei jedem Wort (onboundary), in Pausen (> 0,6 s ohne Wort) und
// am Satzende wieder ruhig.
let talking = false;
let talkTimer: ReturnType<typeof setTimeout> | null = null;
function setTalking(on: boolean) {
  if (talkTimer) clearTimeout(talkTimer);
  talkTimer = null;
  if (on === talking) return;
  talking = on;
  setAvatarFlag("sprechen", on);
}
function wordSpoken() {
  setTalking(true);
  talkTimer = setTimeout(() => setTalking(false), 600);
}

type SpeakOptions = {
  id?: string;
  gender?: HelperVoice;
  voice?: string;
  quelle?: VoiceSource;
  /** Hinten anhängen, wenn gerade gesprochen wird (Rest einer gestreamten Antwort) – sonst ersetzen */
  anhaengen?: boolean;
  /** Erster Ton ist zu hören (Tempo: „erster Satz vorgelesen“) */
  beginnt?: () => void;
};

/** Was noch vorgelesen wird: Stücke nacheinander, gemeinsam eine Kennung */
let folge: Promise<void> = Promise.resolve();
let offen = 0;

/**
 * Text vorlesen (vorher bereinigt, in Sätzen). `id` kennzeichnet, was gerade
 * läuft (für den Lautsprecher-Knopf). Läuft schon etwas, wird es ersetzt –
 * oder mit `anhaengen` nahtlos dahinter gesprochen.
 */
export function speak(text: string, options: SpeakOptions = {}) {
  const clean = cleanForSpeech(tidyMiaText(text));
  if (options.anhaengen && speakingId !== null) {
    if (!clean) return;
    const mine = token;
    offen++;
    folge = folge.then(() => (mine === token ? sprich(clean, options, mine) : undefined)).then(() => fertig(mine));
    return;
  }
  stopSpeaking();
  if (!clean) return;
  const mine = ++token;
  offen = 1;
  setSpeaking(options.id ?? "text");
  folge = sprich(clean, options, mine).then(() => fertig(mine));
}

/** Ein Stück ist vorbei; war es das letzte, ist Mia still */
function fertig(mine: number) {
  if (mine !== token) return;
  offen = Math.max(0, offen - 1);
  if (offen > 0) return;
  setTalking(false);
  setSpeaking(null);
}

/** Ein Stück sprechen – Mias Stimme oder die des Handys; fertig, wenn alles gesagt ist */
function sprich(clean: string, options: SpeakOptions, mine: number): Promise<void> {
  let begonnen = false;
  const anfang = () => {
    if (mine !== token) return;
    setTalking(true);
    if (!begonnen) {
      begonnen = true;
      options.beginnt?.();
    }
  };
  /** Stimme des Handys – auch als stiller Ersatz, wenn Mias Stimme nicht kommt */
  const handy = (rest: string) =>
    new Promise<void>((resolve) => {
      if (mine !== token) return resolve();
      const chunks = speechChunks(rest);
      if (!chunks.length || !speechSupported()) return resolve();
      // Stimmen laden manchmal verzögert – kurz darauf warten, sonst Standardstimme
      if (currentVoices().length) say(chunks, options, mine, anfang, resolve);
      else whenVoicesReady(() => (mine === token ? say(chunks, options, mine, anfang, resolve) : resolve()));
    });
  // Probehören einer Handy-Stimme (`voice`) spricht immer mit dem Handy
  const quelle = options.quelle ?? (options.voice === undefined ? loadSpeechSettings().quelle : "handy");
  if (quelle === "handy") return handy(clean);
  return new Promise<void>((resolve) => {
    void mitMiasStimme(clean, {
      anfang,
      ende: () => {
        setTalking(false);
        resolve();
      },
      ersatz: (rest) => void handy(rest).then(resolve),
    });
  });
}

function whenVoicesReady(run: () => void) {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    window.speechSynthesis.removeEventListener?.("voiceschanged", go);
    run();
  };
  window.speechSynthesis.addEventListener?.("voiceschanged", go);
  setTimeout(go, 800);
}

function say(chunks: string[], options: { id?: string; gender?: HelperVoice; voice?: string }, mine: number, anfang: () => void, done: () => void) {
  const settings = loadSpeechSettings();
  // `voice` (Probehören): genau diese Stimme, "" = automatisch
  const chosen = options.voice === undefined ? settings : { ...settings, voice: options.voice };
  const voice = chooseVoice(currentVoices(), chosen, options.gender ?? "weiblich");
  const rate = SPEECH_RATES.find((r) => r.value === settings.rate)?.rate ?? 1;
  try {
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = voice?.lang ?? "de-DE";
      u.rate = rate;
      try {
        if (voice) u.voice = voice;
      } catch {
        // Stimme nicht setzbar → Standardstimme
      }
      u.onstart = anfang;
      u.onboundary = (e) => mine === token && e.name !== "sentence" && wordSpoken();
      u.onend = () => setTalking(false);
      if (i === chunks.length - 1) {
        const ende = () => {
          setTalking(false);
          done();
        };
        u.onend = ende;
        u.onerror = ende; // z. B. stumm geschaltet oder abgebrochen – einfach nichts tun
      }
      window.speechSynthesis.speak(u);
    });
  } catch {
    done();
  }
}

/** Spricht Mia gerade (eigene Stimme oder Stimme des Handys)? */
export function miaSprichtGerade(): boolean {
  if (speakingId !== null || talking) return true;
  try {
    return speechSupported() && window.speechSynthesis.speaking;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  token++;
  setTalking(false);
  if (speakingId !== null) setSpeaking(null);
  serverStimmeStoppen();
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // nichts zu tun
  }
}

/** Lautsprecher-Knopf: liest vor bzw. stoppt, wenn genau das gerade läuft */
export function toggleSpeak(text: string, id: string, gender?: HelperVoice) {
  unlockSpeech();
  if (speakingId === id) stopSpeaking();
  else speak(text, { id, gender });
}
