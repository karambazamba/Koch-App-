// Linien-Icon je Sportart (Knöpfe, Chips, Kachel, Wasserzeichen – nie Emojis)

import { Activity, Bike, Dumbbell, Flower2, Footprints, SportShoe, Trees, Volleyball, WavesLadder, type LucideIcon } from "lucide-react";
import { LAUFSCHUH } from "@/lib/sport/wasserzeichen";

const ICONS: Record<string, LucideIcon> = { laufen: Footprints, fitness: Dumbbell, rad: Bike, schwimmen: WavesLadder, yoga: Flower2, fussball: Volleyball, spazieren: Trees, [LAUFSCHUH]: SportShoe };

export function SportIcon({ sport, className = "h-4 w-4", strokeWidth = 2.25 }: { sport: string; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[sport] ?? Activity;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden data-sport-symbol={ICONS[sport] ? sport : "andere"} />;
}
