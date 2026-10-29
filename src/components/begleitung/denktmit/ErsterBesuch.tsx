"use client";

// Mia begleitet beim ersten Mal (Tafel 90, Bild 2; Tafel 101): beim ersten
// Besuch einer Seite steht Mias Tipp direkt unter dem Seitentitel im
// normalen Seitenfluss (`SeitenTipp`) – nie schwebend über der Liste. Der
// Besuch zählt mit „Alles klar“ oder beim Verlassen (auch als „benutzt“ für
// das Vorstellen); danach nie wieder. „Ruhig“ = kein Tipp.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SeitenTipp } from "@/components/begleitung/denktmit/SeitenTipp";
import { seiteBesucht, useDenkt } from "@/lib/mia/denktmit/store";
import { ersterBesuch } from "@/lib/mia/denktmit/vorstellen";

type Props = {
  /** Schlüssel der Seite; ohne = die aktuelle Adresse (Unterseiten mit `PageHeader`) */
  seite?: string;
  /** „Zeig mal“, wenn die Seite etwas zu zeigen hat (z. B. Einkauf → Meine Läden) */
  zeigMal?: () => void;
  className?: string;
  /** Eigener Text statt des Seiten-Texts (z. B. mit Laden-Namen) */
  text?: string;
};

export function ErsterBesuch({ seite, zeigMal, className, text: eigen }: Props) {
  const pathname = usePathname();
  const key = seite ?? pathname;
  const s = useDenkt();
  const offen = s ? ersterBesuch(s, key) : null;
  // Beim Verlassen der Seite zählt der Besuch (auch ohne „Alles klar“ und bei „Ruhig“)
  useEffect(() => {
    if (!offen) return;
    return () => seiteBesucht(key);
  }, [offen, key]);
  const text = s?.level === "ruhig" || !offen ? null : (eigen ?? offen);
  if (!text) return null;
  return <SeitenTipp text={text} id={key} onOk={() => seiteBesucht(key)} zeigMal={zeigMal} className={className} />;
}
