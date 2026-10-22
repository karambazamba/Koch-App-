// Linien-Icon je Sportart (Knöpfe, Chips, Kachel – nie Emojis)

import { Activity, Bike, Dumbbell, Flower2, Footprints, Trees, Volleyball, WavesLadder, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { laufen: Footprints, fitness: Dumbbell, rad: Bike, schwimmen: WavesLadder, yoga: Flower2, fussball: Volleyball, spazieren: Trees };

export function SportIcon({ sport, className = "h-4 w-4" }: { sport: string; className?: string }) {
  const Icon = ICONS[sport] ?? Activity;
  return <Icon className={className} strokeWidth={2.25} aria-hidden />;
}
