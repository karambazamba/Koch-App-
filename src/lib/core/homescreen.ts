// Homescreen-App erkennen (iPhone/Android) und die Hinweise zum App-Icon in der
// Lieblingsfarbe: Beim Kennenlernen (nur im Browser) "Jetzt zum Home-Bildschirm
// hinzufügen"; beim späteren Farbwechsel auf dem iPhone, dass das Icon bleibt.

import { CLOUD_SYNC } from "./app";

/** Als Homescreen-App geöffnet (nicht im Browser) */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

/** iPhone/iPad (auch iPad mit Desktop-Kennung) */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Kurze Anleitung zum Hinzufügen – je nach Gerät */
export function addToHomeSteps(): string[] {
  return isIOS() ? ["Unten auf Teilen □↑ tippen", "„Zum Home-Bildschirm“ wählen"] : ["Oben rechts auf ⋮ tippen", "„Zum Startbildschirm hinzufügen“ wählen"];
}

/**
 * Nach einem Farbwechsel: Auf dem iPhone bleibt das Homescreen-Icon, bis man die
 * App neu hinzufügt. Solange alles nur auf dem Gerät liegt, mit Warnung.
 */
export function iconChangeHint(): string | null {
  if (!isStandalone() || !isIOS()) return null;
  return `Das Icon auf dem Homescreen bleibt, bis du die App neu hinzufügst.${CLOUD_SYNC ? "" : " Vorher unter Einstellungen → Daten & App „Daten sichern“ – nach dem neuen Hinzufügen dort wieder einspielen."}`;
}
