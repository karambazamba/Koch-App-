// Magnete der Kühlschranktür (Tafel 106): Punkt (Zettel), Stern (Karoblatt),
// Apfel (Polaroid), Herz (Kassenbon) – eigene kleine Zeichnungen in der Farbe
// der Person; „Bleibt hängen“ hängt am roten Pin. Nur Schmuck (aria-hidden).

import type { MagnetForm } from "@/lib/pinnwand/tuer";

const STAR = "M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.1l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z";
const HEART = "M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z";

export function Magnet({ form, color, size = 22, className = "" }: { form: MagnetForm; color: string; size?: number; className?: string }) {
  const shine = "var(--app-fridge-paper)";
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`pointer-events-none drop-shadow-sm ${className}`} aria-hidden>
      {form === "punkt" && (
        <>
          <circle cx="12" cy="12" r="9" fill={color} />
          <circle cx="9" cy="8.5" r="3" fill={shine} opacity="0.55" />
        </>
      )}
      {form === "stern" && (
        <>
          <path d={STAR} fill={color} />
          <circle cx="10" cy="8.5" r="1.6" fill={shine} opacity="0.5" />
        </>
      )}
      {form === "herz" && (
        <>
          <path d={HEART} fill={color} />
          <circle cx="8.5" cy="10" r="1.7" fill={shine} opacity="0.5" />
        </>
      )}
      {form === "apfel" && (
        <>
          <path d="M12 7.5c2-2 6.5-1.6 7.3 2.6.8 4.4-2.6 10.4-5.4 10.4-1 0-1.3-.5-1.9-.5s-.9.5-1.9.5c-2.8 0-6.2-6-5.4-10.4C5.5 5.9 10 5.5 12 7.5z" fill={color} />
          <path d="M12 7.6c0-2 .6-3.6 1.8-4.6" stroke="var(--app-fridge-ink-soft)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M13.2 5c1.4-1.5 3.4-1.6 4.4-1.1-.6 1.5-2.4 2.3-4.4 1.1z" fill="var(--app-zettel-2-mag)" />
          <circle cx="9" cy="11" r="1.7" fill={shine} opacity="0.5" />
        </>
      )}
      {form === "pin" && (
        <>
          <path d="M12 13.5v8" stroke="var(--app-fridge-ink-soft)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="9" r="7" fill="var(--app-fridge-pin)" />
          <circle cx="9.5" cy="6.5" r="2.2" fill={shine} opacity="0.55" />
        </>
      )}
    </svg>
  );
}
