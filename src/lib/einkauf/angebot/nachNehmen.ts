// „Nehmen“ in der Rezept-Vorschau (A-046) bietet die Zutaten an – über das
// Wochenplan-Angebot (A-040, Tafel 127): Das Gericht steht im Plan, seine
// Zutaten liegen oben auf der Laden-Seite bereit. Gleich danach fragt eine
// kleine Meldung „Auf die Liste: Eier, Limette +2?“ mit „Alle dazu“
// (Grundsachen nie). Kennt die Liste das Rezept nicht (eingebautes Rezept,
// „Ich koche spontan“), gilt, was die Vorschau „auf die Liste“ nannte.
// Nichts anzubieten (alles im Haus, steht schon drauf) = still.

import { showToast } from "@/lib/core/toast";
import { composeWeek, loadMealPlans } from "@/lib/essen/mealPlan";
import { DEFAULT_SHOPPING_DAY, weekStartFor, weekdayName, type WeekPlan } from "@/lib/essen/weekPlan";
import type { Recipe } from "@/lib/essen/cookbook";
import { isSmallHousehold, planningVisible, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { buildShoppingList, planAlsAngebot } from "@/lib/einkauf/buildList";
import { store, loadShoppingSettings } from "@/lib/einkauf/listStore";
import { addManualItem } from "@/lib/einkauf/listEdits";
import { sectionFor } from "@/lib/einkauf/sections";
import { istGrundsache } from "@/lib/einkauf/kacheln/gruppen";
import { gleicheSache } from "@/lib/einkauf/zusammen/zusammen";
import { alsEintrag, angebotFrage, angebotFuerGericht } from "@/lib/einkauf/angebot/angebot";
import type { ManualItem } from "@/lib/einkauf/listModel";

type Daten = { profile: HouseholdProfile; weekPlans: Record<string, WeekPlan>; recipes: Record<string, Recipe> };
type Eintrag = Omit<ManualItem, "id" | "done">;

/** Was es nach „Nehmen“ für dieses Gericht anzubieten gibt (leer = nichts) */
function zutatenNachNehmen(data: Daten, titel: string, date: string, needs: readonly string[] | null): { weekStart: string; eintraege: Eintrag[] } {
  const tag = new Date(`${date}T12:00:00`);
  const weekStart = weekStartFor(tag, data.profile.shoppingDay || DEFAULT_SHOPPING_DAY);
  const settings = loadShoppingSettings();
  const planning = planningVisible(data.profile, weekStart);
  const week = composeWeek(weekStart, data.profile, data.weekPlans, loadMealPlans(), data.recipes);
  const list = buildShoppingList(week, data.recipes, store.load()?.weeks[weekStart], settings, {
    small: isSmallHousehold(data.profile),
    manualOnly: !planning,
    angebot: planAlsAngebot(weekStart, settings.angebotAb),
  });
  const ausPlan = angebotFuerGericht(list.angebot, titel, settings.alwaysList, needs);
  if (ausPlan.length) return { weekStart, eintraege: ausPlan.map(alsEintrag) };
  // Rezept nicht in der Liste (eingebaut, spontan): was die Vorschau nannte – ohne Grundsachen und ohne, was schon draufsteht oder angeboten wird
  const steht = [...list.items.filter((i) => !i.hidden), ...list.angebot];
  const namen = [...new Set((needs ?? []).map((n) => n.trim()).filter(Boolean))].filter((n) => !istGrundsache(n) && !steht.some((i) => gleicheSache(i.name, n) || gleicheSache(i.originalName, n)));
  return { weekStart, eintraege: namen.map((name) => ({ name, amount: "", section: sectionFor(name), day: weekdayName(tag), dish: titel })) };
}

/** Nach „Nehmen“: Zutaten anbieten – „Alle dazu“ setzt sie wie auf der Laden-Seite drauf */
export function zutatenAnbieten(data: Daten, titel: string, date: string, needs: readonly string[] | null = null): boolean {
  const { weekStart, eintraege } = zutatenNachNehmen(data, titel, date, needs);
  if (!eintraege.length) return false;
  showToast({
    text: angebotFrage(eintraege),
    action: { label: "Alle dazu", run: () => eintraege.forEach((e) => addManualItem(weekStart, e)), doneText: "Steht drauf." },
  });
  return true;
}
