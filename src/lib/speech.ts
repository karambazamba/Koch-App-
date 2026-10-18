"use client";

// Lotte liest vor – Sprachausgabe des Browsers (Web Speech API), kostenlos und
// ohne Server. Einstellungen gelten pro Gerät (die Stimmen sind je Gerät
// verschieden) unter `wasgibts.vorlesen`. Fehler der Sprachausgabe stören nie:
// geht es nicht (kein Ton, stumm geschaltet, keine Stimme), passiert einfach nichts.

import { useEffect, useState } from "react";
import { createLocalStore } from "./localStore";
import type { HelperVoice } from "./profile";
import { useExternalStore } from "./useExternalStore";

// --- Einstellungen --------------------------------------------------------------

/** auto = vorlesen, wenn per Mikrofon gefragt wurde; an = immer; aus = nie */
export type ReadMode = "auto" | "an" | "aus";
export type SpeechRate = "langsam" | "normal" | "schnell";

export type SpeechSettings = {
  version: 1;
  mode: ReadMode;
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
  { value: "langsam", label: "Langsam", rate: 0.85 },
  { value: "normal", label: "Normal", rate: 1 },
  { value: "schnell", label: "Schnell", rate: 1.2 },
];

const DEFAULTS: SpeechSettings = { version: 1, mode: "auto", voice: "", rate: "normal" };
const LEGACY_ON: SpeechSettings = { ...DEFAULTS, mode: "an" };
/** Früher: nur an/aus im Küchenhelfer-Kopf */
const LEGACY_KEY = "wasgibts.kuechenhelfer.vorlesen";

function migrate(raw: unknown): SpeechSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<SpeechSettings>;
  return {
    version: 1,
    mode: READ_MODES.some((m) => m.value === d.mode) ? (d.mode as ReadMode) : "auto",
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
    if (localStorage.getItem(LEGACY_KEY) === "1") return LEGACY_ON;
  } catch {
    // ohne Speicher: Standard
  }
  return DEFAULTS;
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

export type VoiceQuality = "natuerlich" | "gut" | "einfach" | "effekt";

/**
 * Wie natürlich klingt eine Stimme? Aus Name und Kennung (voiceURI):
 * Edge "Online (Natural)", iPhone/Mac "Premium"/"Erweitert", Google- und
 * Netz-Stimmen klingen deutlich besser als "compact"/"Desktop"-Stimmen.
 */
export function voiceScore(v: SpeechSynthesisVoice): number {
  const id = `${v.name} ${v.voiceURI}`;
  if (NOVELTY.test(id)) return -10;
  let score = 0;
  if (/natural|neural|wavenet|studio/i.test(id)) score += 6;
  else if (/premium/i.test(id)) score += 5;
  else if (/enhanced|erweitert|verbessert/i.test(id)) score += 4;
  else if (/google|network|online/i.test(id) || v.localService === false) score += 3;
  if (/compact|kompakt|desktop/i.test(id)) score -= 1;
  if (/de[-_]de/i.test(v.lang)) score += 1;
  return score;
}

export function voiceQuality(v: SpeechSynthesisVoice): VoiceQuality {
  const s = voiceScore(v);
  return s < 0 ? "effekt" : s >= 5 ? "natuerlich" : s >= 3 ? "gut" : "einfach";
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

/** Gewählte Stimme oder die passende automatische */
export function chooseVoice(voices: SpeechSynthesisVoice[], settings: SpeechSettings, gender: HelperVoice): SpeechSynthesisVoice | null {
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

// --- Text fürs Vorlesen -------------------------------------------------------------

const UNITS: [RegExp, string][] = [
  [/(\d)\s?kg\b/g, "$1 Kilogramm"],
  [/(\d)\s?g\b/g, "$1 Gramm"],
  [/(\d)\s?ml\b/g, "$1 Milliliter"],
  [/(\d)\s?l\b/g, "$1 Liter"],
  [/(\d)\s?EL\b/g, "$1 Esslöffel"],
  [/(\d)\s?TL\b/g, "$1 Teelöffel"],
  [/(\d)\s?°\s?C\b/g, "$1 Grad"],
  [/\bMin\.(?=\s|$|[,)])/g, "Minuten"],
  [/\bStd\.(?=\s|$|[,)])/g, "Stunden"],
  [/\bPers\.(?=\s|$|[,)])/g, "Personen"],
  [/\bPck\.(?=\s|$|[,)])/g, "Packung"],
  [/\bz\.\s?B\./g, "zum Beispiel"],
  [/\bca\./g, "circa"],
  [/\bbzw\./g, "beziehungsweise"],
  [/\bggf\./g, "gegebenenfalls"],
];

/**
 * Vorlesbarer Text: ohne Emojis, Sonderzeichen und Markdown; Einheiten und
 * Abkürzungen ausgeschrieben, Uhrzeiten natürlich ("17:30" → "17 Uhr 30").
 */
export function cleanForSpeech(text: string): string {
  let t = text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // Links
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Modifier}|[\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/[✓✔✗✕×•]/g, "")
    .replace(/[*_`#>~|]+/g, " ")
    .replace(/\s*[→⇒]\s*/g, ", ")
    .replace(/\s+[·–—]\s+/g, ", ")
    .replace(/[„“”"«»]/g, "")
    // Klammern, Schrägstriche und Auslassungen klingen vorgelesen holprig
    .replace(/\s*\(([^)]*)\)/g, ", $1,")
    .replace(/(\d+)\s*\/\s*(\d+)/g, "$1 von $2")
    .replace(/([A-Za-zÄÖÜäöüß])\s*\/\s*(?=[A-Za-zÄÖÜäöüß])/g, "$1 oder ")
    .replace(/…|\.{3}/g, ".")
    .replace(/\bMo\s*[–-]\s*Fr\b/g, "Montag bis Freitag")
    .replace(/\bSa\s*[–-]\s*So\b/g, "Samstag und Sonntag");
  // Uhrzeiten: "07:30" → "7 Uhr 30", "18:00" → "18 Uhr"
  t = t.replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (_, h: string, m: string) => `${Number(h)} Uhr${m === "00" ? "" : ` ${Number(m)}`}`);
  for (const [re, to] of UNITS) t = t.replace(re, to);
  return t
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([,.!?:])(?:\s*,)+/g, "$1")
    .replace(/^[\s,]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** In Sätze bis ~200 Zeichen teilen – Chrome bricht lange Äußerungen sonst nach ~15 s ab */
export function speechChunks(text: string, max = 200): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  for (const s of sentences) {
    const last = chunks[chunks.length - 1];
    if (last && (last + s).length <= max) chunks[chunks.length - 1] = last + s;
    else chunks.push(s);
  }
  return chunks.map((c) => c.trim()).filter(Boolean);
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

/**
 * Text vorlesen (vorher bereinigt, in Sätzen). `id` kennzeichnet, was gerade
 * läuft (für den Lautsprecher-Knopf). Läuft schon etwas, wird es ersetzt.
 */
export function speak(text: string, options: { id?: string; gender?: HelperVoice; voice?: string } = {}) {
  if (!speechSupported()) return;
  const chunks = speechChunks(cleanForSpeech(text));
  stopSpeaking();
  if (!chunks.length) return;
  const mine = ++token;
  setSpeaking(options.id ?? "text");
  // Stimmen laden manchmal verzögert – kurz darauf warten, sonst Standardstimme
  if (currentVoices().length) say(chunks, options, mine);
  else whenVoicesReady(() => mine === token && say(chunks, options, mine));
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

function say(chunks: string[], options: { id?: string; gender?: HelperVoice; voice?: string }, mine: number) {
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
      if (i === chunks.length - 1) {
        const done = () => mine === token && setSpeaking(null);
        u.onend = done;
        u.onerror = done; // z. B. stumm geschaltet oder abgebrochen – einfach nichts tun
      }
      window.speechSynthesis.speak(u);
    });
  } catch {
    if (mine === token) setSpeaking(null);
  }
}

export function stopSpeaking() {
  token++;
  if (speakingId !== null) setSpeaking(null);
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
