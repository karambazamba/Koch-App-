// Meldet die vorhandenen Werkzeuge im Register an (Bereich je Werkzeug).
// Essen aus planTools.ts, cookbookTools.ts und pantryTools.ts, Einkauf aus
// shoppingTools.ts, Termine und Aufgaben aus calendarTools.ts (Bereich
// "alltag"), Mails aus mailTools.ts (Bereich "post"). Die Reihenfolge ist
// fest (Prompt-Caching) – neue Werkzeuge nur hinten anhängen.

import { registerTool, type BegleitungTool } from "@/lib/begleitung/registry";
import { PLAN_TOOLS } from "@/lib/begleitung/planTools";
import { COOKBOOK_TOOLS } from "@/lib/begleitung/cookbookTools";
import { SHOPPING_TOOLS } from "@/lib/begleitung/shoppingTools";
import { PANTRY_TOOLS } from "@/lib/begleitung/pantryTools";
import { CALENDAR_TOOLS } from "@/lib/begleitung/calendarTools";
import { HOME_TOOLS } from "@/lib/begleitung/homeTools";
import { MAIL_TOOLS } from "@/lib/begleitung/mailTools";
import { NOTE_TOOLS } from "@/lib/begleitung/noteTools";
import { DAY_TOOLS } from "@/lib/begleitung/dayTools";
import { HOUSEHOLD_TOOLS } from "@/lib/begleitung/householdTools";
import { TIP_TOOLS } from "@/lib/begleitung/tipTools";

const FOOD_TOOLS: BegleitungTool[] = [
  PLAN_TOOLS.woche_lesen,
  COOKBOOK_TOOLS.kochbuch_durchsuchen,
  PLAN_TOOLS.gericht_setzen,
  PLAN_TOOLS.platz_leeren,
  PLAN_TOOLS.doppelt_kochen,
  PLAN_TOOLS.gericht_verschieben,
  PLAN_TOOLS.vorgaben_aendern,
  COOKBOOK_TOOLS.rezept_erstellen,
  SHOPPING_TOOLS.einkaufsliste_hinzufuegen,
  PANTRY_TOOLS.vorrat_hinzufuegen,
  PLAN_TOOLS.wunsch_merken,
];

for (const tool of [...FOOD_TOOLS, ...CALENDAR_TOOLS, ...NOTE_TOOLS, ...HOME_TOOLS, ...MAIL_TOOLS, ...DAY_TOOLS, ...HOUSEHOLD_TOOLS, ...TIP_TOOLS]) registerTool(tool);

export { toolDefinitions, runRegisteredTool } from "@/lib/begleitung/registry";
