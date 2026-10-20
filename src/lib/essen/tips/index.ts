
import { GERICHT_TIPS } from "./data/gericht";
import { PROFI_TIPS } from "./data/profi";
import { RESTE_TIPS } from "./data/reste";
import { SPAR_TIPS } from "./data/sparen";
import { VORRAT_TIPS } from "./data/vorrat";
import { WOCHENENDE_TIPS } from "./data/wochenende";
import type { Tip } from "./types";

;

export const ALL_TIPS: Tip[] = [...GERICHT_TIPS, ...PROFI_TIPS, ...SPAR_TIPS, ...RESTE_TIPS, ...VORRAT_TIPS, ...WOCHENENDE_TIPS];
