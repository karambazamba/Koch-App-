// Nutzt Mia Sport (Training, Wochenziel, Trainings planen), muss man es sehen
// können (Grundregel „Volle Kontrolle“): Baustein an und der Sport-Kreis oben
// (A-050, Tafel 143) – keine Kachel mehr, die sich in die Anordnung schiebt.

import { unlockFeature } from "@/lib/core/features";
import { loadKreise, saveKreise } from "@/lib/core/homeLayout";
import { aendereKreise } from "@/lib/heute/kreise";

/** Satz, wenn der Kreis dafür erst erschienen ist */
export const SPORT_OBEN = "Sport steht jetzt oben als Kreis.";

/** Sport-Baustein an und Sport-Kreis an; true = vorher nicht zu sehen */
export function zeigeSportKreis(): boolean {
  const baustein = unlockFeature("sport");
  const kreise = loadKreise();
  if (kreise.find((k) => k.id === "sport")?.an) return baustein;
  saveKreise(aendereKreise(kreise, { kreis: "sport", aktion: "an" }));
  return true;
}
