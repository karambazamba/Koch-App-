// Einheiten der Startseiten-Kacheln (`HomeBoard`, Raster in `heute/raster.ts`):
// Essen + Einkauf als Paar – und das kurze Aufleuchten einer eben
// hinzugefügten Kachel.

import type { HomeTile, HomeTileId } from "@/lib/core/homeLayout";

export type Unit = { key: string; tiles: HomeTile[] };

/** Essen + Einkauf (beide S, direkt hintereinander) = eine Einheit, sonst je Kachel eine */
export function unitsOf(tiles: HomeTile[]): Unit[] {
  const units: Unit[] = [];
  for (let i = 0; i < tiles.length; i++) {
    const a = tiles[i];
    const b = tiles[i + 1];
    if (a.id === "essen" && b?.id === "einkauf" && a.size === "S" && b.size === "S") {
      units.push({ key: "essen+einkauf", tiles: [a, b] });
      i++;
    } else units.push({ key: a.id, tiles: [a] });
  }
  return units;
}

/** Nach dem Hinzufügen: zur neuen Kachel scrollen und sie kurz sanft aufleuchten lassen */
export function glowTile(id: HomeTileId) {
  let tries = 0;
  const find = () => {
    const el = document.querySelector<HTMLElement>(`[data-unit][data-tile~="${id}"]`);
    if (!el) return void (++tries < 20 && requestAnimationFrame(find));
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("tile-glow");
    void el.offsetWidth;
    el.classList.add("tile-glow");
    window.setTimeout(() => el.classList.remove("tile-glow"), 1800);
  };
  requestAnimationFrame(find);
}
