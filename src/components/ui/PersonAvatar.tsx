import { personTone } from "@/lib/pinnwand";

const TONES = ["bg-accent", "bg-work", "bg-person-3", "bg-person-4"];

/** Kreis mit Anfangsbuchstaben – feste Farbe je Person (Pinnwand, Sport, Aufgaben) */
export function PersonAvatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold text-on-accent ${TONES[personTone(name)]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
