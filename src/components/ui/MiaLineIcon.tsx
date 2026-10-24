// Mia als Linien-Icon (wie die lucide-Symbole: 24er Raster, Linienstärke 2,
// Farbe = currentColor). Abgeleitet aus `BegleitungAvatar` (gleiche Form,
// Maßstab 0,3): Umriss der Sprechblase mit mittiger Spitze, zwei senkrechte
// Augen, dezentes Lächeln. Für Stellen, an denen Mia als Symbol neben anderen
// Linien-Icons steht (Erster Start „Zeig mal“, Seiten-Tipps, Einstellungen → Mia)
// – das volle, farbige Gesicht bleibt `BegleitungAvatar`.

/** Sprechblase (abgerundet, Ecken 6) mit Spitze unten in der Mitte */
const BLASE = "M8.4 3h7.2a6 6 0 0 1 6 6v3.6a6 6 0 0 1-6 6h-1.5L12 21.6l-2.1-3H8.4a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6z";

export function MiaLineIcon({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden data-mia-umriss>
      <path d={BLASE} />
      <path d="M9 9.2v2.2M15 9.2v2.2" />
      <path d="M9.2 13.8c1.5 1.26 4.1 1.26 5.6 0" />
    </svg>
  );
}
