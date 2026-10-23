// Einkaufsliste: Berechnung aus dem Wochenplan. Artikel aus Rezepten werden
// bei jedem Anzeigen neu zusammengerechnet ("Doppelt kochen" = doppelte
// Mengen, kleiner Haushalt = auf die Personen des Tages umgerechnet) und mit
// den eigenen Artikeln der Woche nach Abteilung sortiert.

import type { Recipe } from "@/lib/essen/cookbook";
import type { PlanWeek } from "@/lib/essen/mealPlan";
import { formatTotal, roundSmall, unitFamily } from "@/lib/einkauf/amounts";
import { SECTIONS, sectionFor } from "@/lib/einkauf/sections";
import { SHOPPING, sortBy } from "@/lib/core/sort";
import { EMPTY_LIST, lower, type ListItem, type ShoppingList, type ShoppingSettings, type WeekList } from "@/lib/einkauf/listModel";

export function buildShoppingList(
  week: PlanWeek,
  recipes: Record<string, Recipe>,
  list: WeekList = EMPTY_LIST,
  settings: Pick<ShoppingSettings, "products" | "itemShops"> = { products: {}, itemShops: {} },
  /** Kleiner Haushalt (1–2 Personen): Rezeptmengen auf die Personen des Tages umrechnen */
  options: { small?: boolean; manualOnly?: boolean } = {},
): ShoppingList {
  type Acc = { name: string; family: string; total: number; hasAmount: boolean; dishes: string[]; days: string[]; optional: boolean; scaled: boolean };
  const acc = new Map<string, Acc>();
  const missing: string[] = [];

  // "Ich koche spontan": keine Wochenliste aus dem Plan – nur eigene Artikel
  for (const day of options.manualOnly ? [] : week.days) {
    if (day.away) continue;
    const short = day.weekday.slice(0, 2);
    const entry = day.slot.entry;
    if (!entry) continue;
    const recipe = entry.recipeId ? recipes[entry.recipeId] : undefined;
    const ingredients = recipe?.ingredients.filter((i) => i.name.trim()) ?? [];
    const label = entry.stored.kind === "wish" ? `${entry.kidName}s Wunsch „${entry.title}“` : entry.title;
    if (ingredients.length === 0) {
      missing.push(`${label} (${short})`);
      continue;
    }
    // Doppelt kochen → doppelte Mengen
    let times = entry.double ? 2 : 1;
    // Kleiner Haushalt: nur so viel wie für die Personen des Tages (Backen bleibt ganz)
    // Für diesen Tag umgerechnet ("heute nur zu zweit"): genau auf diese Personenzahl
    const override = entry.stored.kind !== "wish" ? entry.stored.persons : undefined;
    const scale =
      recipe && recipe.kind !== "backen" && day.persons && recipe.servings > 0 && (override ? override !== recipe.servings : options.small && recipe.servings > day.persons * times);
    if (scale) times = (day.persons! * times) / recipe!.servings;
    const dish = `${entry.title} (${short})${entry.double ? " ×2" : ""}`;
    for (const ing of ingredients) {
      const { family, factor } = unitFamily(ing.unit);
      const key = `${ing.name.trim().toLowerCase()}|${family}`;
      const item = acc.get(key) ?? { name: ing.name.trim(), family, total: 0, hasAmount: false, dishes: [], days: [], optional: true, scaled: false };
      // Lockeres Wochenende: nur eine Idee – Zutaten optional
      if (day.weekend !== "locker") item.optional = false;
      if (ing.amount !== null) {
        item.total += ing.amount * factor * times;
        item.hasAmount = true;
        if (scale) item.scaled = true;
      }
      if (!item.dishes.includes(dish)) item.dishes.push(dish);
      if (!item.days.includes(day.weekday)) item.days.push(day.weekday);
      acc.set(key, item);
    }
  }

  const display = (key: string, name: string) => list.renamed?.[key] ?? settings.products[lower(name)] ?? name;
  const shopOf = (name: string) => settings.itemShops[lower(name)] ?? "";

  const generated: ListItem[] = [...acc.entries()].map(([key, a]) => {
    const name = display(key, a.name);
    return {
      key,
      name,
      originalName: a.name,
      amount: a.hasAmount ? formatTotal(a.scaled ? roundSmall(a.total, a.family) : a.total, a.family) : a.family,
      section: sectionFor(a.name),
      dishes: a.dishes,
      days: a.days,
      shop: shopOf(name),
      optional: a.optional,
      checked: list.checked.includes(key),
      hidden: list.have.includes(key),
    };
  });
  const manual: ListItem[] = list.manual.map((m) => {
    const name = settings.products[lower(m.name)] ?? m.name;
    return {
      key: `m:${m.id}`,
      name,
      originalName: m.name,
      amount: m.amount,
      section: m.section,
      dishes: m.dish ? [m.dish] : [],
      days: m.day ? [m.day] : [],
      shop: shopOf(name),
      manualId: m.id,
      ...(m.von ? { von: m.von } : {}),
      ...(m.now ? { now: true } : {}),
      checked: m.done,
      hidden: false,
    };
  });

  const items = sortBy([...generated, ...manual], ...SHOPPING);
  const visible = items.filter((i) => !i.hidden);
  return {
    items,
    missing,
    openCount: visible.filter((i) => !i.checked).length,
    doneCount: visible.filter((i) => i.checked).length,
  };
}

/** Offene Artikel als Text zum Teilen (WhatsApp, Nachricht …) – optional nur ein Laden */
export function shoppingListText(list: ShoppingList, title: string, shop?: string): string {
  const lines = [title];
  const open = list.items.filter((i) => !i.checked && !i.hidden && (shop === undefined || i.shop === shop));
  for (const section of SECTIONS) {
    const items = open.filter((i) => i.section === section.value);
    if (items.length === 0) continue;
    lines.push("", `${section.emoji} ${section.label}`);
    for (const item of items) lines.push(`- ${item.amount ? `${item.amount} ` : ""}${item.name}`);
  }
  return lines.join("\n");
}
