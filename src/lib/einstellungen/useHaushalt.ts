"use client";

// Haushaltsart aus dem Profil (Mia für alle) – für die Wörter je Art.

import { einladenKnopf, haushaltOf, raumName, verbindenTitel, type Haushalt } from "@/lib/core/haushalt";
import { useProfile } from "@/lib/einstellungen/useProfile";

export function useHaushalt(): Haushalt {
  return haushaltOf(useProfile()?.householdType);
}

/** Sichtbarer Name des gemeinsamen Bereichs: „Privat“, „Wir“ oder „Familie“ */
export const useRaumName = () => raumName(useHaushalt());

/** Knopf zum Einladen: „Jemanden dazuholen“, „Partner einladen“, „Familie einladen“ */
export const useEinladenKnopf = () => einladenKnopf(useHaushalt());

/** Überschrift „Mit jemandem teilen“ / „Zu zweit verbinden“ / „Familie verbinden“ */
export const useVerbindenTitel = () => verbindenTitel(useHaushalt());
