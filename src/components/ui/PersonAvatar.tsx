import { personTone } from "@/lib/pinnwand";

const TONES = ["bg-accent", "bg-work", "bg-person-3", "bg-person-4"];

/**
 * Kreis mit Anfangsbuchstaben – feste Farbe je Person (Pinnwand, Sport,
 * Aufgaben). `soft`: in einer Pastell-Kachel weiß halbtransparent mit dem
 * Buchstaben im Kachel-Akzent.
 */
export function PersonAvatar({ name, size = 32, soft = false }: { name: string; size?: number; soft?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${soft ? "bg-tile-inner text-tile-accent" : `text-on-accent ${TONES[personTone(name)]}`}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
