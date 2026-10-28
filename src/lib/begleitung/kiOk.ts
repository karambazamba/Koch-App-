// Karte „Mia braucht kurz dein OK“ (KI-Einwilligung, Platz 23; A-027): nennt
// nur die Anbieter, die gerade wirklich gebraucht werden – Anthropic immer,
// ElevenLabs nur, wenn Mias Stimme bzw. Ohr vom Server aktiv ist
// (`stimme`-Status). „Nicht jetzt“ schließt nur die Karte (bis das Gespräch
// wieder geöffnet wird); die Einwilligung bleibt unerteilt, der Zugangscode
// („Später“) bleibt unberührt.

import type { StimmeStatus } from "@/lib/begleitung/stimmeProtokoll";

/** Ist Mias Stimme oder Ohr über den Server eingerichtet? */
export const stimmeVomServer = (status: { stimme?: StimmeStatus } | undefined) => Boolean(status?.stimme?.sprechen || status?.stimme?.hoeren);

/** Der erklärende Satz der Karte (ohne „Mehr dazu“) */
export function kiOkText(stimme: boolean): string {
  const ki = "Damit ich mitdenken kann, geht dein Satz mit dem Nötigen verschlüsselt an unseren KI-Anbieter (Anthropic).";
  const sprache = " Sprichst du mit mir, gehen Aufnahme und Antwort dafür kurz an unseren Sprach-Anbieter (ElevenLabs).";
  return `${ki}${stimme ? sprache : ""} Nicht für Werbung.`;
}

/** Steht die Karte? `weggeklickt` = „Nicht jetzt“ in diesem Gespräch */
export function kiOkKarteZeigen(o: { askConsent: boolean; weggeklickt: boolean; kochtipp: boolean }): boolean {
  return o.askConsent && !o.weggeklickt && !o.kochtipp;
}
