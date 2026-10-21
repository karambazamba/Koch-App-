// Bild zu einem Gericht ohne eigenes Foto: erst das eingebaute Bild
// (/gerichte/<slug>.webp, npm run gerichte-bilder), sonst live gezeichnet aus
// dishArt + renderDishSvg als data-URL – im Speicher gemerkt, ohne Server.

import type { RecipeCategory } from "./cookbook";
import { dishArt, dishSlug } from "./dishArt";
import { DISH_IMAGES } from "./dishImageList";
import { renderDishSvg } from "./dishSvg";

const live = new Map<string, string>();
const LIVE_MAX = 150;

/** Eingebautes Bild des Gerichts oder null */
export function builtinDishImage(title: string): string | null {
  const slug = dishSlug(title);
  return slug && DISH_IMAGES.has(slug) ? `/gerichte/${slug}.webp` : null;
}

/** Live gezeichnetes Bild (data-URL); null, wenn das Zeichnen scheitert */
function liveDishImage(title: string, ingredients: string[] = [], category?: RecipeCategory | null): string | null {
  const key = `${title.trim().toLowerCase()}|${category ?? ""}|${ingredients.join(",")}`;
  const hit = live.get(key);
  if (hit) return hit;
  try {
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderDishSvg(dishArt(title, ingredients, category)))}`;
    if (live.size >= LIVE_MAX) live.delete(live.keys().next().value!);
    live.set(key, url);
    return url;
  } catch {
    return null;
  }
}

/** Reihenfolge ohne eigenes Foto: eingebaut → live gezeichnet */
export function dishImage(title: string, ingredients?: string[], category?: RecipeCategory | null): string | null {
  if (!title.trim()) return null;
  return builtinDishImage(title) ?? liveDishImage(title, ingredients, category);
}
