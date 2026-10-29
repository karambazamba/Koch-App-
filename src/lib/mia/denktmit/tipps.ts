// Einstellungen → Mia → „Tipps nochmal zeigen“: Mias Seiten-Tipps (erster
// Besuch, z. B. Einkaufsliste und Laden-Seite), die einmaligen Hinweise der
// Startseite und die kleinen Einkauf-Tipps („Merk ich mir, wenn du bei Rewe
// abhakst.“, „Hab Rewe genommen, wie letztes Mal.“) kommen wieder. Fragen
// (Mikrofon, Stimme) bleiben beantwortet.

import { hinweiseZuruecksetzen } from "@/lib/core/hinweise";
import { TIPP_HINWEISE, hintsZuruecksetzen } from "@/lib/core/hints";
import { besucheZuruecksetzen } from "@/lib/mia/denktmit/store";

export const TIPPS_NOCHMAL_TEXT = "Kommen beim nächsten Mal wieder.";

export function tippsNochmalZeigen() {
  besucheZuruecksetzen();
  hinweiseZuruecksetzen();
  hintsZuruecksetzen(TIPP_HINWEISE);
}
