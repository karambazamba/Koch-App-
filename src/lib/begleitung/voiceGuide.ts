// Stimme – weg vom Blech-Klang (Tafel 28): Gibt es auf dem Gerät eine gute
// deutsche Stimme (Premium/Erweitert, Android: Google)? Wenn nicht, bietet
// Mia EINMAL an, eine zu laden – mit Schritten je Gerät und iOS-Version
// (bis iOS 18 „Gesprochene Inhalte“, ab iOS 26 „Lesen & Sprechen“).

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
  return `Klinge ich blechern? 🤖 Dein ${platform === "ios" ? "iPhone" : "Handy"} hat eine viel schönere Stimme für mich. Einmal laden – dauert 1 Minute.`;
}

/**
 * Schritte zum Laden. iOS ab 26 (unbekannt = neueste): Bedienungshilfen →
 * Lesen & Sprechen → Stimmen; bis iOS 18: Bedienungshilfen → Gesprochene
 * Inhalte → Stimmen. Android: Text-in-Sprache-Ausgabe → Google →
 * Sprachdaten installieren.
 */
export function voiceSteps(platform: MicPlatform, ios: number | null): MicStep[] {
  if (platform === "android")
    return [
      { text: "Öffne Einstellungen → Bedienungshilfen (oder System → Sprachen)", icon: "zahnrad", screen: { title: "Einstellungen", rows: ["Akku", "Bedienungshilfen", "System"], target: 1 } },
      { text: "Tippe auf „Text-in-Sprache-Ausgabe“", icon: "allgemein", screen: { title: "Bedienungshilfen", rows: ["Schriftgröße", "Text-in-Sprache-Ausgabe", "Untertitel"], target: 1 } },
      { text: "Bevorzugtes Modul: Google → Zahnrad → „Sprachdaten installieren“", icon: "regler", screen: { title: "Text-in-Sprache", rows: ["Bevorzugtes Modul: Google", "Sprachdaten installieren", "Sprechgeschwindigkeit"], target: 1 } },
      { text: "Deutsch → Stimme laden", icon: "erlauben", screen: { title: "Sprachdaten", rows: ["Deutsch (Deutschland)", "Englisch", "Französisch"], target: 0 } },
    ];
  const spoken = ios !== null && ios <= 18 ? "Gesprochene Inhalte" : "Lesen & Sprechen";
  return [
    { text: "Öffne Einstellungen → Bedienungshilfen", icon: "zahnrad", screen: { title: "Einstellungen", rows: ["Allgemein", "Bedienungshilfen", "Hintergrundbild"], target: 1 } },
    { text: `Tippe auf „${spoken}“, dann „Stimmen“`, icon: "allgemein", screen: { title: "Bedienungshilfen", rows: ["VoiceOver", "Zoomen", spoken, "Audiobeschreibungen"], target: 2 } },
    { text: "Wähle „Deutsch“", icon: "tastatur", screen: { title: "Stimmen", rows: ["Chinesisch", "Deutsch", "Englisch"], target: 1 } },
    { text: "Bei „Anna (Premium)“ auf die Wolke tippen (ca. 400 MB, am besten im WLAN). Gibt es kein Premium: „Anna (Erweitert)“.", icon: "erlauben", screen: { title: "Deutsch", rows: ["Anna", "Anna (Erweitert)", "Anna (Premium)  ☁︎"], target: 2 } },
  ];
}
