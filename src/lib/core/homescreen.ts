// Homescreen-App erkennen (iPhone/Android) und der Hinweis zum App-Icon in der
// Lieblingsfarbe: beim Farbwechsel auf dem iPhone, dass das Icon bleibt.

import { cloudSync } from "@/lib/konten/cache";

/** Als Homescreen-App geöffnet (nicht im Browser) */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

/** iPhone/iPad (auch iPad mit Desktop-Kennung) */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * Nach einem Farbwechsel: Auf dem iPhone bleibt das Homescreen-Icon, bis man die
 * App neu hinzufügt. Solange alles nur auf dem Gerät liegt, mit Warnung.
 */
export function iconChangeHint(): string | null {
  if (!isStandalone() || !isIOS()) return null;
  return `Das Icon auf dem Homescreen bleibt, bis du die App neu hinzufügst.${cloudSync() ? "" : " Vorher unter Einstellungen → Daten & App „Daten sichern“ – nach dem neuen Hinzufügen dort wieder einspielen."}`;
}
