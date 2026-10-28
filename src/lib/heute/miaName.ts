// „App heißt Mia“: Auf dem iPhone bleibt unter einem schon installierten Icon
// der alte Name stehen, bis man die Web-App neu hinzufügt. Einmal, leise und
// nur dort, wo es hilft (iPhone/iPad, als Web-App geöffnet, vor der
// Umbenennung installiert) bieten wir das an – mit Sichern vorher, denn beim
// Entfernen vom Home-Bildschirm löscht iOS die Daten der Web-App.

import type { MicPlatform, MicStep } from "@/lib/core/mic";

export const MIA_HOME_HINT = (name: string) =>
  `Ich heiße jetzt ${name}. Damit der neue Name unter dem Icon steht: App vom Home-Bildschirm entfernen und in Safari neu hinzufügen. Vorher kurz sichern, dann bleiben deine Daten.`;

/** Hinweis zeigen? Nur iPhone/iPad als Web-App, nur einmal, nur bei alter Installation */
export const showMiaHomeHint = (o: { platform: MicPlatform; standalone: boolean; fromBefore: boolean; seen: boolean }) =>
  o.platform === "ios" && o.standalone && o.fromBefore && !o.seen;

/**
 * Schritte (iOS 17/18): Sichern → Icon lange drücken, „App entfernen“,
 * „Löschen“ → Safari öffnen → Teilen, „Zum Home-Bildschirm“, „Hinzufügen“ →
 * in der neuen App „Daten wiederherstellen“.
 */
export function miaHomeSteps(host: string, name: string): MicStep[] {
  return [
    { text: "Erst sichern: Einstellungen → Daten & App → „Daten sichern“ (Datei in „Dateien“ ablegen)", icon: "sichern", screen: { title: "Daten & App", rows: ["Daten sichern", "Daten wiederherstellen", "Meine Daten exportieren"], target: 0 } },
    { text: `Halte das Icon auf dem Home-Bildschirm gedrückt → „App entfernen“ → „Löschen“`, icon: "entfernen", screen: { title: "Home-Bildschirm", rows: ["Home-Bildschirm bearbeiten", "Teilen", "App entfernen"], target: 2 } },
    { text: `Öffne Safari und gib ${host} ein`, icon: "safari", screen: { title: "Safari", rows: [host, "Favoriten", "Häufig besucht"], target: 0 } },
    { text: "Tippe unten auf Teilen (Quadrat mit Pfeil) → „Zum Home-Bildschirm“ → „Hinzufügen“", icon: "teilen", screen: { title: "Teilen", rows: ["Kopieren", "Zur Leseliste", "Zum Home-Bildschirm"], target: 2 } },
    { text: `Öffne ${name} vom neuen Icon → „Schon mal genutzt? Daten wiederherstellen“`, icon: "erlauben", screen: { title: name, rows: ["Los geht’s", "Daten wiederherstellen"], target: 1 } },
  ];
}

/** Leiste unten neu (Tafel 96): einmal kurz Mia */
export const LEISTE_NEU = "Unten findest du jetzt Kalender, Heute und Essen. Ein Tipp, und du bist da.";

/** Startseite halten (einmal, ab dem 4. Tag) */
export const HALTEN_TIPP = "Halte die Startseite gedrückt, dann kannst du Kacheln dazuholen oder wegnehmen.";
