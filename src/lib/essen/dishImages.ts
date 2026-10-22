// Bild zu einem Gericht ohne eigenes Foto: erst das eingebaute Bild
// (/gerichte/<slug>.webp, npm run gerichte-bilder), sonst live gezeichnet aus
// dishArt + renderDishSvg als data-URL – im Speicher gemerkt, ohne Server.
// Das Zeichnen (dishArt/dishSvg/…) wird erst geladen, wenn ein Bild fehlt.

import type { RecipeCategory } from "@/lib/essen/cookbook";
import { dishSlug } from "@/lib/essen/dishSlug";
import { DISH_IMAGES } from "@/lib/essen/dishImageList";

const live = new Map<string, string | null>();
const LIVE_MAX = 150;

/** Eingebautes Bild des Gerichts oder null */
export function builtinDishImage(title: string): string | null {
  const slug = dishSlug(title);
  return slug && DISH_IMAGES.has(slug) ? `/gerichte/${slug}.webp` : null;
}

const liveKey = (title: string, ingredients: string[] = [], category?: RecipeCategory | null) =>
  `${title.trim().toLowerCase()}|${category ?? ""}|${ingredients.join(",")}`;

/** Schon gezeichnetes Bild: data-URL, null (Zeichnen scheiterte) oder undefined (noch nicht gezeichnet) */
export function cachedDishImage(title: string, ingredients?: string[], category?: RecipeCategory | null): string | null | undefined {
  if (!title.trim()) return null;
  const builtin = builtinDishImage(title);
  if (builtin) return builtin;
  return live.get(liveKey(title, ingredients, category));
}

/** Live zeichnen (lädt das Zeichnen beim ersten Mal); null, wenn es scheitert */
export async function drawDishImage(title: string, ingredients: string[] = [], category?: RecipeCategory | null): Promise<string | null> {
  const key = liveKey(title, ingredients, category);
  const hit = live.get(key);
  if (hit !== undefined) return hit;
  let url: string | null = null;
  try {
    const [{ dishArt }, { renderDishSvg }] = await Promise.all([import("@/lib/essen/dishArt"), import("@/lib/essen/dishSvg")]);
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderDishSvg(dishArt(title, ingredients, category)))}`;
  } catch {
    url = null;
  }
  if (live.size >= LIVE_MAX) live.delete(live.keys().next().value!);
  live.set(key, url);
  return url;
}
