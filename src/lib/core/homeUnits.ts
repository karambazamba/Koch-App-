// Einheiten und Reihen der Startseiten-Kacheln (`HomeBoard`): Essen + Einkauf
// als Paar, zwei einzelne S nebeneinander – und das kurze Aufleuchten einer
// eben hinzugefügten Kachel.

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

/** Reihen aus Einheiten: ein Paar ist eine Reihe; zwei einzelne S nebeneinander */
export function rowsOf(units: Unit[]): Unit[][] {
  const rows: Unit[][] = [];
  const single = (u?: Unit) => u && u.tiles.length === 1 && u.tiles[0].size === "S";
  for (let i = 0; i < units.length; i++) {
    if (single(units[i]) && single(units[i + 1])) {
      rows.push([units[i], units[i + 1]]);
      i++;
    } else rows.push([units[i]]);
  }
  return rows;
}

/**
 * Mia stellt eine Kachel vor (Tafel 101): steht sie in dieser Reihe, kommt der
 * Tipp direkt unter die Reihe, der Pfeil zeigt auf die Kachel – links/rechts
 * bei halben Kacheln (zwei S, Essen + Einkauf, eine einzelne S), sonst mittig.
 */
export function pfeilZu(row: Unit[], id: HomeTileId): "links" | "mitte" | "rechts" | null {
  const at = row.findIndex((u) => u.tiles.some((t) => t.id === id));
  if (at < 0) return null;
  if (row.length === 2) return at === 0 ? "links" : "rechts";
  const unit = row[0];
  if (unit.tiles.length === 2) return unit.tiles[0].id === id ? "links" : "rechts";
  return unit.tiles[0].size === "S" ? "links" : "mitte";
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
