// Linien-Icon je Sportart (Stempel, Knöpfe, Chips, Kachel – nie Emojis)

import { Activity, Bike, Dumbbell, Flower2, SportShoe, Trees, Volleyball, WavesLadder, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { laufen: SportShoe, fitness: Dumbbell, rad: Bike, schwimmen: WavesLadder, yoga: Flower2, fussball: Volleyball, volleyball: Volleyball, spazieren: Trees };

/** Linien-Symbol einer Sportart (sonst Activity) – z. B. für den Sport-Kreis oben (A-050) */
export const sportSymbol = (sport: string | null | undefined): LucideIcon => (sport && ICONS[sport]) || SportShoe;

export function SportIcon({ sport, className = "h-4 w-4", strokeWidth = 2.25 }: { sport: string; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[sport] ?? Activity;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden data-sport-symbol={ICONS[sport] ? sport : "andere"} />;
}
