"use client";

// Raum-Wahl der Fenster „Neue Aufgabe“/„Neuer Termin“ (A-034): Mia wählt vor
// (aus dem Satz, gelernt oder Standard: Termine Familie, Aufgaben Ich), von
// Hand gewählt geht vor. Beim allerersten Mal der Satz „Hab … gewählt.
// Tippen zum Ändern.“ Korrigiert man, lernt Mia das Stichwort.

import { useMemo, useState } from "react";
import type { Room } from "@/lib/core/entries";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { loadEntries } from "@/lib/kalender/store";
import { arbeitsWorte, raumRaten, type RaumArt, type RaumHilfen } from "@/lib/kalender/raum/raten";
import { gelernteRaeume, raumHinweisGesehen, raumHinweisOffen, raumLernen } from "@/lib/kalender/raum/gedaechtnis";
import { chipRaum, istKorrektur, raumZumSpeichern, vorgewaehltText } from "@/lib/kalender/raum/wahl";

export function useRaumWahl(art: RaumArt, vorher: Room | null, text: string) {
  const haushalt = useHaushalt();
  const [hand, setHand] = useState<Room | null>(null);
  const [all] = useState(() => loadEntries());
  const hilfen: RaumHilfen = useMemo(() => ({ gelernt: gelernteRaeume(), arbeitWorte: arbeitsWorte(all) }), [all]);
  // Beim Bearbeiten ist der gespeicherte Raum der Vorschlag
  const vorschlag = vorher ?? raumRaten(text, art, hilfen).raum;
  const raum = chipRaum({ hand, vorschlag, haushalt });
  const [hinweisAn] = useState(() => vorher === null && raumHinweisOffen());
  const hinweis = hinweisAn && hand === null && text.trim() ? vorgewaehltText(vorschlag, haushalt) : null;

  const waehlen = (r: Room) => {
    setHand(r);
    if (hinweisAn) raumHinweisGesehen();
  };

  /** Was gespeichert wird – und Mia lernt, wenn man korrigiert hat */
  const speichern = (titel: string): Room => {
    const r = raumZumSpeichern(raum, { art, vorher, vorschlag, haushalt });
    if (istKorrektur({ hand, vorschlag, haushalt })) raumLernen(titel, r);
    if (hinweisAn) raumHinweisGesehen();
    return r;
  };

  return { raum, haushalt, hinweis, hilfen, waehlen, speichern, zuruecksetzen: () => setHand(null) };
}
