// Mias Stimme und Ohr über den Server (ElevenLabs) – was App und Server sich
// teilen: Adressen, Grenzen, feste Sätze, geschätzte Kosten. Der Schlüssel
// (ELEVENLABS_API_KEY) bleibt auf dem Server; fehlt er, spricht und hört die
// App wie bisher über den Browser. Pinnwand-Sprachnachrichten gehen nie hierher.

import { vorlesText } from "@/lib/begleitung/vorlesText";

export const STIMME_ENDPOINT = "/api/stimme";
export const HOEREN_ENDPOINT = "/api/hoeren";
/** Kurzlebiger Einmal-Schlüssel fürs Live-Zuhören (der echte Schlüssel bleibt auf dem Server) */
export const OHR_TOKEN_ENDPOINT = "/api/stimme/ohr-token";
/** Gerätekennung bei Aufnahmen (der Körper ist der Ton selbst) */
export const GERAET_HEADER = "x-mia-geraet";
/** Vorgelesene Zeichen (Antwort-Header, für die Kosten-Übersicht) */
export const ZEICHEN_HEADER = "x-mia-zeichen";

export const STIMME_GRENZEN = {
  /** Zeichen je Vorlese-Stück (die App teilt lange Antworten in Sätze) */
  zeichen: 600,
  /** Längste Aufnahme am Stück */
  aufnahmeMs: 60_000,
  /** Größte Aufnahme in Bytes (60 s Sprache sind weit darunter) */
  audioBytes: 3_000_000,
  /** So lange darf die erste Silbe dauern, sonst spricht die Stimme des Handys */
  ersteSilbeMs: 1000,
};

/** Was die App über die Server-Stimme wissen muss (Teil des KI-Status) */
export type StimmeStatus = {
  /** Mias Stimme (Text → Ton) ist eingerichtet */
  sprechen: boolean;
  /** Mias Ohr (Ton → Text) ist eingerichtet */
  hoeren: boolean;
  /** Kennung von Stimme und Modell – ändert sich die Stimme, laden feste Sätze neu */
  v: string;
  /** Live-Zuhören (Text beim Sprechen, Ende von selbst) ist eingerichtet – fehlt bei älteren Servern */
  live?: boolean;
};

/**
 * Häufige feste Sätze: einmal erzeugt, danach aus dem Zwischenspeicher
 * (Server, Netz und Gerät) – spart Kosten und Zeit.
 */
export const FESTE_SAETZE = [
  "Steht drin.",
  "Ist drauf.",
  "Klappt.",
  "Erledigt.",
  "Hab ich.",
  "Mach ich.",
  "Moin! Was steht an?",
  "Moin! So klinge ich.",
  "Hat grad nicht geklappt. Nochmal?",
  "Bin grad offline. Ich mach’s, sobald wieder Netz da ist.",
  // Auftrag „Mia schneller“: kurze Reaktion und Bestätigungen des Sofort-Wegs (nur hinten anhängen – die Nummern sind Adressen)
  "Mhm.",
  "Is drauf.",
  "Steht alles drauf.",
  "Läuft.",
  "Notiert.",
  "Hängt an der Pinnwand.",
] as const;

const vergleich = (s: string) => vorlesText(s).toLowerCase();

/** Nummer des festen Satzes (nach dem Bereinigen gleich), sonst -1 */
export function festerSatz(text: string): number {
  const t = vergleich(text);
  return t ? FESTE_SAETZE.findIndex((s) => vergleich(s) === t) : -1;
}

/**
 * Geschätzte Kosten (US-Dollar) für die Übersicht „KI-Kosten letzte 7 Tage“ –
 * Richtwerte aus der Preisliste, keine Abrechnung.
 */
export const STIMME_KOSTEN = { jeZeichen: 0.00011, jeSekunde: 0.4 / 3600 };
