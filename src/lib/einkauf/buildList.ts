// Einkaufsliste: Berechnung aus dem Wochenplan. Artikel aus Rezepten werden
// bei jedem Anzeigen neu zusammengerechnet ("Doppelt kochen" = doppelte
// Mengen, kleiner Haushalt = auf die Personen des Tages umgerechnet) und mit
// den eigenen Artikeln der Woche nach Abteilung sortiert.
// Nachtrag A-018: Rezeptmengen werden auf übliche Packungen gerundet (die
// Rezeptmenge steht klein als Hinweis „250 ml für Lasagne“), und gleiche
// Sachen im selben Laden stehen nur einmal da (`einkauf/zusammen`) – auch
// Rezept-Zutat und eigener Artikel. Gespeichert bleibt alles wie es ist.
// A-040 (Tafel 127): auf der Liste steht nur der Name – Rezeptmengen sind nie
// eine Menge (Hinweis und Packungs-Vorschlag nur fürs Zeilen-Fenster). Mit
// `angebot` sind die Zutaten aus dem Plan ein Angebot (`angebot`), keine
// Zeilen; was davon schon auf der Liste steht, wird nicht mehr angeboten.

import type { Recipe } from "@/lib/essen/cookbook";
import type { PlanWeek } from "@/lib/essen/mealPlan";
import { formatTotal, roundSmall, unitFamily } from "@/lib/einkauf/amounts";
import { SECTIONS, sectionFor } from "@/lib/einkauf/sections";
import { SHOPPING, sortBy } from "@/lib/core/sort";
import { EMPTY_LIST, lower, type ListItem, type ShoppingList, type ShoppingSettings, type WeekList } from "@/lib/einkauf/listModel";
import { shopChoice } from "@/lib/einkauf/shopRules";
import { gleicheSache, mengenAddieren, normalform } from "@/lib/einkauf/zusammen/zusammen";
import { einkaufsMenge, packungAus, rezeptHinweis } from "@/lib/einkauf/zusammen/packung";

/** Sind die Plan-Zutaten dieser Woche ein Angebot (A-040)? Wochen vor `angebotAb` (Stand vor v8) rechnen wie früher */
export const planAlsAngebot = (weekStart: string, angebotAb?: string) => !angebotAb || weekStart >= angebotAb;

export function buildShoppingList(
  week: PlanWeek,
  recipes: Record<string, Recipe>,
  list: WeekList = EMPTY_LIST,
  settings: Pick<ShoppingSettings, "products" | "itemShops" | "shopRules" | "learned"> = { products: {}, itemShops: {} },
  /** Kleiner Haushalt (1–2 Personen): Rezeptmengen auf die Personen des Tages umrechnen; `angebot` = Plan-Zutaten nur anbieten (A-040) */
  options: { small?: boolean; manualOnly?: boolean; angebot?: boolean } = {},
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
  // Feste Laden-Regeln gelten überall (Rezept, Plan, Stammartikel, eigene Artikel); dann der gemerkte Laden.
  // Bewusst „Egal wo“ (leerer Laden) ≠ noch ohne Laden (nichts bekannt)
  const shopOf = (name: string, original: string): Pick<ListItem, "shop" | "anywhere"> => {
    const own = shopChoice(name, settings);
    const choice = own || lower(original) === lower(name) ? own : (shopChoice(original, settings) ?? own);
    return choice === "" ? { shop: "", anywhere: true } : { shop: choice ?? "" };
  };

  // Gleiche Sache aus mehreren Rezepten (Einzahl/Mehrzahl, andere Einheit) = eine Zeile.
  // Schlüssel bleibt der der ersten Zutat („zutat|einheitenfamilie“) – Häkchen bleiben gültig.
  const gruppen = new Map<string, { key: string; teile: Acc[] }>();
  for (const [key, a] of acc) {
    const g = gruppen.get(normalform(a.name) || key);
    if (g) g.teile.push(a);
    else gruppen.set(normalform(a.name) || key, { key, teile: [a] });
  }
  const menge = (a: Acc) => (a.hasAmount ? formatTotal(a.scaled ? roundSmall(a.total, a.family) : a.total, a.family) : "");

  const generated: ListItem[] = [...gruppen.values()].map(({ key, teile }) => {
    const a = teile[0];
    const name = display(key, a.name);
    const dishes = [...new Set(teile.flatMap((t) => t.dishes))];
    const rezeptMenge = teile.map(menge).reduce(mengenAddieren, "");
    // Übliche Packung nur als Vorschlag (bei einer Einheit); auf der Liste steht keine Menge
    const mit = teile.filter((t) => t.hasAmount);
    const total = mit.length ? mit.reduce((n, t) => n + (t.scaled ? roundSmall(t.total, t.family) : t.total), 0) : null;
    const packung = teile.every((t) => t.family === a.family) ? einkaufsMenge(a.name, total, a.family) : "";
    const hinweis = rezeptHinweis(rezeptMenge, dishes);
    return {
      key,
      name,
      originalName: a.name,
      amount: "",
      ...(packung ? { packung } : {}),
      ...(rezeptMenge ? { rezeptMenge } : {}),
      section: sectionFor(a.name),
      dishes,
      days: [...new Set(teile.flatMap((t) => t.days))],
      ...shopOf(name, a.name),
      optional: teile.every((t) => t.optional),
      checked: list.checked.includes(key),
      hidden: list.have.includes(key),
      ...(hinweis ? { hinweis } : {}),
      ...(list.fertig?.includes(key) ? { fertig: true } : {}),
    };
  });
  const manual: ListItem[] = list.manual.map((m) => {
    const name = settings.products[lower(m.name)] ?? m.name;
    const key = `m:${m.id}`;
    const hinweis = m.rezeptMenge ? rezeptHinweis(m.rezeptMenge, m.dish ? [m.dish] : []) : "";
    const packung = m.rezeptMenge ? packungAus(m.name, m.rezeptMenge) : "";
    return {
      key,
      name,
      originalName: m.name,
      amount: m.amount,
      section: m.section,
      dishes: m.dish ? [m.dish] : [],
      days: m.day ? [m.day] : [],
      ...shopOf(name, m.name),
      manualId: m.id,
      ...(m.von ? { von: m.von } : {}),
      ...(m.now ? { now: true } : {}),
      checked: m.done,
      hidden: false,
      ...(hinweis ? { hinweis } : {}),
      ...(packung ? { packung } : {}),
      ...(m.rezeptMenge ? { rezeptMenge: m.rezeptMenge } : {}),
      ...(list.fertig?.includes(key) ? { fertig: true } : {}),
    };
  });

  // Angebot (A-040): Plan-Zutaten, die noch nicht (auch nicht abgehakt) auf der Liste stehen
  const angebot = options.angebot ? generated.filter((g) => !g.hidden && !g.checked && !list.manual.some((m) => gleicheSache(m.name, g.name) || gleicheSache(m.name, g.originalName))) : [];
  const items = sortBy(zusammenlegen(options.angebot ? manual : [...generated, ...manual]), ...SHOPPING);
  const visible = items.filter((i) => !i.hidden);
  return {
    items,
    angebot,
    missing,
    openCount: visible.filter((i) => !i.checked).length,
    doneCount: visible.filter((i) => i.checked).length,
  };
}

/**
 * Gleiche Sache im selben Laden (gleicher Stand: offen bzw. abgehakt) = eine
 * Zeile: eigene Artikel kommen zur Rezept-Zutat bzw. zum ersten eigenen
 * Artikel dazu (`teile`, Mengen addiert). Ausgeblendetes bleibt für sich.
 */
function zusammenlegen(items: ListItem[]): ListItem[] {
  const out: ListItem[] = [];
  for (const i of items) {
    const ziel = i.manualId && !i.hidden ? out.find((o) => !o.hidden && o.checked === i.checked && Boolean(o.fertig) === Boolean(i.fertig) && lower(o.shop) === lower(i.shop) && Boolean(o.anywhere) === Boolean(i.anywhere) && gleicheSache(o.name, i.name)) : undefined;
    if (!ziel) {
      out.push(i);
      continue;
    }
    const merged: ListItem = {
      ...ziel,
      amount: mengenAddieren(ziel.amount, i.amount),
      dishes: [...new Set([...ziel.dishes, ...i.dishes])],
      days: [...new Set([...ziel.days, ...i.days])],
      teile: [...(ziel.teile ?? []), i.manualId!],
      ...(i.now ? { now: true } : {}),
      ...(!ziel.hinweis && i.hinweis ? { hinweis: i.hinweis } : {}),
      ...(!ziel.von && i.von ? { von: i.von } : {}),
    };
    out[out.indexOf(ziel)] = merged;
  }
  return out;
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
