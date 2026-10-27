// Ganztägige Termine (Tafel 98): statt „Tag“ steht „Ganztägig“ in der
// Uhrzeit-Spalte. Geburtstag, Jahrestag, Hochzeitstag (Stichwort oder
// Etikett) bekommen davor ein kleines Linien-Symbol in Rosé (Geschenk bzw.
// Herz). In halben Kacheln reicht das Symbol (ohne Anlass: Kalender-Symbol).
// Die Spalte ist dann so breit, dass nichts umbricht.

import { CalendarDays, Gift, Heart } from "lucide-react";
import { ganztagAnzeige } from "@/lib/kalender/anlass";

const SYMBOL = { Gift, Heart, CalendarDays } as const;

/** Breite der Uhrzeit-Spalte: schmal nur mit Uhrzeiten, breiter, sobald ein ganztägiger Eintrag dabei ist */
export function zeitSpalte(ganztags: boolean, schrift: "klein" | "gross"): string {
  if (schrift === "klein") return ganztags ? "w-[90px]" : "w-[38px]";
  return ganztags ? "w-[100px]" : "w-12";
}

export function GanztagMarke({ title, label, kurz = false }: { title: string; label?: string | null; kurz?: boolean }) {
  const a = ganztagAnzeige(title, label, kurz);
  const Icon = a.symbol ? SYMBOL[a.symbol] : null;
  return (
    <span className={`inline-flex items-center gap-[3px] whitespace-nowrap ${a.rose ? "text-rosee" : ""}`} data-ganztaegig={a.symbol ?? "ja"}>
      {Icon && <Icon className="h-[0.85em] w-[0.85em] shrink-0" strokeWidth={2.5} aria-hidden />}
      {a.text}
    </span>
  );
}
