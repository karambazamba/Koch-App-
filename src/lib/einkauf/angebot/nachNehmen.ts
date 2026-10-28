// „Nehmen“ in der Rezept-Vorschau (A-046) bietet die Zutaten an – über das
// Wochenplan-Angebot (A-040, Tafel 127): Das Gericht steht im Plan, seine
// Zutaten liegen oben auf der Laden-Seite bereit. Gleich danach fragt eine
// kleine Meldung „Auf die Liste: Eier, Limette +2?“ mit „Alle dazu“
// (Grundsachen nie). Nichts anzubieten (alles im Haus, spontan, Woche noch
// im alten Stand) = still.

import { showToast } from "@/lib/core/toast";
import { composeWeek, loadMealPlans } from "@/lib/essen/mealPlan";
import { DEFAULT_SHOPPING_DAY, weekStartFor, type WeekPlan } from "@/lib/essen/weekPlan";
import type { Recipe } from "@/lib/essen/cookbook";
import { isSmallHousehold, planningVisible, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { buildShoppingList, planAlsAngebot } from "@/lib/einkauf/buildList";
import { store, loadShoppingSettings } from "@/lib/einkauf/listStore";
import { addManualItem } from "@/lib/einkauf/listEdits";
import { alsEintrag, angebotFrage, angebotFuerGericht } from "@/lib/einkauf/angebot/angebot";
import type { ListItem } from "@/lib/einkauf/listModel";

type Daten = { profile: HouseholdProfile; weekPlans: Record<string, WeekPlan>; recipes: Record<string, Recipe> };

/** Was es nach „Nehmen“ für dieses Gericht anzubieten gibt (leer = nichts) */
function zutatenNachNehmen(data: Daten, titel: string, date: string, needs: readonly string[] | null = null): { weekStart: string; items: ListItem[] } {
  const weekStart = weekStartFor(new Date(`${date}T12:00:00`), data.profile.shoppingDay || DEFAULT_SHOPPING_DAY);
  const settings = loadShoppingSettings();
  // Spontan (kein Plan sichtbar) bzw. Woche noch im alten Stand (Zutaten kommen von selbst): nichts anbieten
  if (!planningVisible(data.profile, weekStart) || !planAlsAngebot(weekStart, settings.angebotAb)) return { weekStart, items: [] };
  const week = composeWeek(weekStart, data.profile, data.weekPlans, loadMealPlans(), data.recipes);
  const list = buildShoppingList(week, data.recipes, store.load()?.weeks[weekStart], settings, { small: isSmallHousehold(data.profile), angebot: true });
  return { weekStart, items: angebotFuerGericht(list.angebot, titel, settings.alwaysList, needs) };
}

/** Nach „Nehmen“: Zutaten anbieten – „Alle dazu“ setzt sie wie auf der Laden-Seite drauf */
export function zutatenAnbieten(data: Daten, titel: string, date: string, needs: readonly string[] | null = null): boolean {
  const { weekStart, items } = zutatenNachNehmen(data, titel, date, needs);
  if (!items.length) return false;
  showToast({
    text: angebotFrage(items),
    action: { label: "Alle dazu", run: () => items.forEach((i) => addManualItem(weekStart, alsEintrag(i))), doneText: "Steht drauf." },
  });
  return true;
}

