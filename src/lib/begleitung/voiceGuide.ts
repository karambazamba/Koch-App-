// Stimme – weg vom Blech-Klang (Tafel 28): Gibt es auf dem Gerät eine gute
// deutsche Stimme (Premium/Erweitert, Android: Google)? Wenn nicht, bietet
// Mia EINMAL an, eine zu laden – mit Schritten je Gerät und iOS-Version
// (bis iOS 18 „Gesprochene Inhalte“, ab iOS 26 „Lesen & Sprechen“).

import { APP_NAME } from "@/lib/core/app";
import type { MicPlatform, MicStep } from "@/lib/core/mic";
import { germanVoices } from "@/lib/begleitung/speech";

type VoiceLike = Pick<SpeechSynthesisVoice, "name" | "voiceURI" | "lang" | "localService">;

/** Gute Stimme = Premium/Erweitert/Enhanced/Natural/Neural oder eine Google-Netzstimme */
const GOOD = /premium|enhanced|erweitert|natural|neural|google/i;

/** Die beste gute deutsche Stimme – oder null (dann klingt es blechern) */
export function goodVoice(voices: VoiceLike[]): VoiceLike | null {
  return germanVoices(voices as SpeechSynthesisVoice[]).find((v) => GOOD.test(`${v.name} ${v.voiceURI}`)) ?? null;
}

/** Name für Menschen: „Anna (Premium)“ – Kennungen wie „com.apple…“ weg */
export function voiceLabel(v: Pick<VoiceLike, "name">): string {
  return v.name.replace(/\s*\((?:deutsch|german)[\s\S]*$/i, "").trim();
}

/** Hinweis-Karte im Chat: nur, wenn das Gerät keine gute Stimme hat */
export function voiceOfferText(platform: MicPlatform): string {
  return `Klinge ich blechern? 🤖 Dein ${platform === "ios" ? "iPhone" : "Handy"} hat eine viel schönere Stimme für mich. Einmal laden, dauert 1 Minute.`;
}

/** Wichtig auf dem iPhone: geladen ist noch nicht ausgewählt */
export const VOICE_HINWEIS = "Laden allein reicht nicht. Danach die Stimme antippen.";

/**
 * Schritte zum Laden (Tafel 86). iPhone ab iOS 26 (unbekannt = neueste):
 * Bedienungshilfen → „Lesen & Sprechen“ (unter „Sehen“) → „Stimmen“ →
 * „Deutsch“ → Premium/Erweitert laden → antippen → Mia neu öffnen; fehlt
 * „Stimmen“ dort: „Gesprochene Inhalte“. Bis iOS 18: „Gesprochene Inhalte“.
 * Android: Text-in-Sprache-Ausgabe → Sprachausgabe von Google → ⚙ →
 * Sprachdaten installieren → Deutsch (Samsung: Allgemeine Verwaltung).
 */
export function voiceSteps(platform: MicPlatform, ios: number | null): MicStep[] {
  const neu: MicStep = { text: `${APP_NAME} ganz schließen und neu öffnen`, icon: "neustart", screen: { title: "App-Umschalter", rows: [APP_NAME, "Fotos"], target: 0, wischen: true } };
  if (platform === "android")
    return [
      { text: "Einstellungen → „Bedienungshilfen“ (Samsung: „Allgemeine Verwaltung“)", icon: "zahnrad", screen: { title: "Einstellungen", rows: ["Akku", "Bedienungshilfen", "Allgemeine Verwaltung"], target: 1 } },
      { text: "„Text-in-Sprache-Ausgabe“ (Samsung: „Text-zu-Sprache“)", icon: "allgemein", screen: { title: "Bedienungshilfen", rows: ["Schriftgröße", "Text-in-Sprache-Ausgabe", "Untertitel"], target: 1 } },
      { text: "„Sprachausgabe von Google“ → ⚙", icon: "regler", screen: { title: "Text-in-Sprache", rows: ["Sprachausgabe von Google  ⚙", "Sprechgeschwindigkeit"], target: 0 } },
      { text: "„Sprachdaten installieren“ → „Deutsch“", icon: "sichern", screen: { title: "Sprachdaten", rows: ["Deutsch (Deutschland)", "Englisch", "Französisch"], target: 0 } },
      { ...neu, text: `${APP_NAME} neu öffnen` },
    ];
  const alt = ios !== null && ios <= 18;
  return [
    { text: "Einstellungen → „Bedienungshilfen“", icon: "zahnrad", screen: { title: "Einstellungen", rows: ["Allgemein", "Bedienungshilfen", "Hintergrundbild"], target: 1 } },
    alt
      ? { text: "„Gesprochene Inhalte“ → „Stimmen“", icon: "allgemein", screen: { title: "Bedienungshilfen", rows: ["VoiceOver", "Zoomen", "Gesprochene Inhalte"], target: 2 } }
      : {
          text: "„Lesen & Sprechen“ (unter „Sehen“) → „Stimmen“. Gibt es dort kein „Stimmen“: „Gesprochene Inhalte“ → „Stimmen“.",
          icon: "allgemein",
          screen: { title: "Bedienungshilfen · Sehen", rows: ["VoiceOver", "Zoomen", "Lesen & Sprechen"], target: 2 },
        },
    { text: "„Deutsch“", icon: "tastatur", screen: { title: "Stimmen", rows: ["Chinesisch", "Deutsch", "Englisch"], target: 1 } },
    { text: "Eine Stimme mit „Premium“ oder „Erweitert“ laden (Wolke, am besten im WLAN)", icon: "sichern", screen: { title: "Deutsch", rows: ["Anna", "Anna (Erweitert)", "Anna (Premium)  ☁︎"], target: 2 } },
    { text: "Die geladene Stimme antippen, bis das Häkchen da ist", icon: "erlauben", screen: { title: "Deutsch", rows: ["Anna", "Anna (Premium)  ✓"], target: 1 } },
    neu,
  ];
}

// --- Neue Stimme gefunden? (nach Rückkehr in die App) ----------------------------------

/** Gute deutsche Stimmen (Kennungen), die das Gerät gerade hat */
export function goodVoiceIds(voices: VoiceLike[]): string[] {
  return germanVoices(voices as SpeechSynthesisVoice[])
    .filter((v) => GOOD.test(`${v.name} ${v.voiceURI}`))
    .map((v) => v.voiceURI);
}

/**
 * Eine gute Stimme, die neu dazugekommen ist (nicht schon bekannt und nicht
 * gerade gewählt) – oder null. `bekannt === null` (erster Blick) = nichts
 * vorschlagen, nur merken.
 */
export function neueStimme(good: string[], bekannt: string[] | null, gewaehlt: string): string | null {
  if (bekannt === null) return null;
  return good.find((id) => !bekannt.includes(id) && id !== gewaehlt) ?? null;
}
