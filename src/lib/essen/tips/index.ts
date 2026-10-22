// Tipp-Sammlung: alle eingebauten Tipps (Profi-Tricks, Tipps zum Gericht,
// Spartipps, Reste, Vorrat). Ausgewählt wird in ./daily.ts (ein Satz oben auf Heute).

import { GERICHT_TIPS } from "@/lib/essen/tips/data/gericht";
import { PROFI_TIPS } from "@/lib/essen/tips/data/profi";
import { RESTE_TIPS } from "@/lib/essen/tips/data/reste";
import { SPAR_TIPS } from "@/lib/essen/tips/data/sparen";
import { VORRAT_TIPS } from "@/lib/essen/tips/data/vorrat";
import { WOCHENENDE_TIPS } from "@/lib/essen/tips/data/wochenende";
import type { Tip } from "@/lib/essen/tips/types";


export const ALL_TIPS: Tip[] = [...GERICHT_TIPS, ...PROFI_TIPS, ...SPAR_TIPS, ...RESTE_TIPS, ...VORRAT_TIPS, ...WOCHENENDE_TIPS];
