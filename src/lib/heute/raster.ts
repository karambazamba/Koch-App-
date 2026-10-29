// Festes Raster der Startseite (Tafel 118) – rein und testbar: 2 Spalten,
// Grund-Zeile = halbe S-Höhe. XS = 1 Spalte × 1 Zeile, S = 1 × 2
// (quadratisch), M = 2 × 2 (ganz breit, so hoch wie S). Essen + Einkauf
// (beide S) sind EINE Einheit (2 × 2). Die gespeicherte Reihenfolge wird der
// Reihe nach dicht gefüllt: jede Einheit kommt an den ersten freien Platz, an
// den sie passt (oben vor unten, links vor rechts); zwei XS hintereinander
// bilden ein Paar (übereinander = ein S-Platz, oder nebeneinander als halbe
// Zeile vor etwas Breitem), eine einzelne S/XS zieht die nächste passende
// Kachel nach oben. Was ohne
// Partner frei bleibt, ist eine Lücke (ruhig leer, im Bearbeiten „＋ Kachel“).
// Das Raster hängt nie vom Bearbeiten-Modus ab. Höhe (A-048, Tafel 135): feste
// Grund-Zeilen für alles mit Bild oder eigener Fläche; ein Band aus zwei
// Grund-Zeilen, in dem nur Listen-Kacheln (Termine, Aufgaben, Einkauf, Notizen – auch
// im Paar mit Essen) liegen, wird EINE Zeile so hoch wie ihr Inhalt
// (`zeilenPlan`).

import { applyHomeChange, fitSize, reorderVisible, tileMeta, type HomeTile, type HomeTileId, type TileSize } from "@/lib/core/homeLayout";
import { unitsOf, type Unit } from "@/lib/core/homeUnits";

/** Breite (Spalten) und Höhe (Grund-Zeilen) je Größe */
export const SPAN: Record<TileSize, { w: 1 | 2; h: 1 | 2 }> = { XS: { w: 1, h: 1 }, S: { w: 1, h: 2 }, M: { w: 2, h: 2 } };

/** Abstand zwischen den Kacheln (px) – muss zu `gap-2` im Board passen */
export const RASTER_GAP = 8;

/**
 * Mindesthöhe einer Grund-Zeile: auf ganz schmalen Geräten (iPhone SE 1,
 * 320 px) wäre S nur 140 px hoch und der Inhalt passte nicht ganz hinein
 * (A-045 „nichts abgeschnitten“) – dort wird S etwas höher als breit.
 */
const ZEILE_MIN = 80;

/** Höhe einer Grund-Zeile aus der Breite des Boards: zwei Zeilen + Abstand = S = (Breite − Abstand) / 2, mindestens `ZEILE_MIN` */
export const grundZeile = (breite: number) => Math.max(ZEILE_MIN, (breite - 3 * RASTER_GAP) / 4);

/** CSS-Wert der Grund-Zeile (100cqw = Breite des Boards) */
export const ZEILE_CSS = `max(${ZEILE_MIN}px, calc((100cqw - ${3 * RASTER_GAP}px) / 4))`;

export type Platz = { key: string; col: 0 | 1; row: number; w: 1 | 2; h: 1 | 2 };
export type Luecke = { col: 0 | 1; row: number; h: 1 | 2 };
export type Raster = { plaetze: Platz[]; rows: number; luecken: Luecke[] };

/** Fläche einer Einheit: das Paar Essen + Einkauf = 2 × 2, sonst nach Größe */
const spanOf = (u: Unit) => (u.tiles.length === 2 ? { w: 2 as const, h: 2 as const } : SPAN[u.tiles[0].size]);

const isXS = (u?: Unit) => Boolean(u && u.tiles.length === 1 && u.tiles[0].size === "XS");

/**
 * Dicht füllen: jede Einheit an den ersten freien Platz, an den sie passt
 * (oben vor unten, links vor rechts). Zwei XS hintereinander sind ein Paar:
 * übereinander (= ein S-Platz, Tafel 118) – nebeneinander als halbe Zeile
 * nur, wenn danach nichts Halbes kommt, das den S-Platz daneben füllen
 * könnte (sonst bliebe dort eine Lücke).
 */
export function packe(units: Unit[]): Raster {
  const used: [boolean, boolean][] = [];
  const free = (r: number, c: number) => !used[r]?.[c];
  const fits = (r: number, c: number, w: number, h: number) => {
    if (c + w > 2) return false;
    for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) if (!free(r + dr, c + dc)) return false;
    return true;
  };
  const first = (w: number, h: number) => {
    for (let r = 0; ; r++) for (let c = 0; c + w <= 2; c++) if (fits(r, c, w, h)) return { r, c };
  };
  const take = (r: number, c: number, w: number, h: number) => {
    for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) (used[r + dr] ??= [false, false])[c + dc] = true;
  };
  const plaetze: Platz[] = [];
  const put = (key: string, r: number, c: number, w: 1 | 2, h: 1 | 2) => {
    take(r, c, w, h);
    plaetze.push({ key, col: c as 0 | 1, row: r, w, h });
  };
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (isXS(u) && isXS(units[i + 1])) {
      const next = units[i + 1];
      const stack = first(1, 2);
      const after = units[i + 2];
      const nebeneinander = stack.c === 0 && (!after || spanOf(after).w === 2) && fits(stack.r, 0, 2, 1);
      if (nebeneinander) {
        put(u.key, stack.r, 0, 1, 1);
        put(next.key, stack.r, 1, 1, 1);
      } else {
        put(u.key, stack.r, stack.c, 1, 1);
        put(next.key, stack.r + 1, stack.c, 1, 1);
      }
      i++;
      continue;
    }
    const { w, h } = spanOf(u);
    const at = first(w, h);
    put(u.key, at.r, at.c, w, h);
  }
  const rows = used.length;
  const luecken: Luecke[] = [];
  for (const c of [0, 1] as const) {
    for (let r = 0; r < rows; r++) {
      if (!free(r, c)) continue;
      const zwei = r + 1 < rows && free(r + 1, c);
      luecken.push({ col: c, row: r, h: zwei ? 2 : 1 });
      if (zwei) r++;
    }
  }
  luecken.sort((a, b) => a.row - b.row || a.col - b.col);
  return { plaetze, rows, luecken };
}

/** Listen-Kacheln (A-048, Klarstellung Tafel 135): ihre Höhe kommt aus dem Inhalt (Kopf + 1 bis 3 Zeilen bzw. leer ein Satz, darunter 14 px Rand) */
export const INHALT_KACHELN: readonly HomeTileId[] = ["termine", "aufgaben", "einkauf", "notizen"];

/** Einheit mit Höhe = Inhalt: eine Listen-Kachel – oder das Paar Essen + Einkauf (Essen ist dann so hoch wie Einkauf bzw. sein eigener Inhalt) */
export const inhaltsHoch = (u: Unit) => u.tiles.some((t) => INHALT_KACHELN.includes(t.id)) && u.tiles.every((t) => INHALT_KACHELN.includes(t.id) || t.id === "essen");

/**
 * Zeilen der Anzeige (A-048): `zeilen[i]` = „fest“ (eine Grund-Zeile,
 * `ZEILE_CSS`) oder „inhalt“ (EINE Zeile, so hoch wie der Inhalt – `auto`),
 * `von[r]` = Anzeige-Zeile der Grund-Zeile r. Ein Band aus zwei Grund-Zeilen
 * wird „inhalt“, wenn jede Einheit darin genau dieses Band füllt und
 * inhaltshoch ist (Lücken daneben bleiben leer); sonst bleiben beide fest –
 * zwei Kacheln in einer Reihe sind so immer gleich hoch, aber nur so hoch,
 * wie die höhere braucht.
 */
export function zeilenPlan(r: Raster, units: Unit[]): { zeilen: ("fest" | "inhalt")[]; von: number[] } {
  const zeilen: ("fest" | "inhalt")[] = [];
  const von: number[] = [];
  const unitOf = new Map(units.map((u) => [u.key, u]));
  for (let row = 0; row < r.rows; ) {
    const drin = r.plaetze.filter((p) => p.row <= row + 1 && p.row + p.h > row);
    const band = row + 1 < r.rows && drin.length > 0 && drin.every((p) => p.row === row && p.h === 2 && Boolean(unitOf.get(p.key)) && inhaltsHoch(unitOf.get(p.key)!));
    von[row] = zeilen.length;
    if (band) {
      von[row + 1] = zeilen.length;
      zeilen.push("inhalt");
      row += 2;
    } else {
      zeilen.push("fest");
      row += 1;
    }
  }
  return { zeilen, von };
}

/** Anzeige-Fläche eines Platzes (bzw. einer Lücke): erste Anzeige-Zeile und wie viele Zeilen */
export function anzeigeZeilen(plan: ReturnType<typeof zeilenPlan>, p: { row: number; h: number }): { start: number; span: number } {
  const start = plan.von[p.row] ?? plan.zeilen.length;
  return { start, span: plan.zeilen[start] === "inhalt" ? 1 : p.h };
}

/** Raster der sichtbaren Kacheln in gespeicherter Reihenfolge */
export const rasterOf = (tiles: HomeTile[]) => packe(unitsOf(tiles));

/**
 * Wo Mias Tipp unter einer Kachel eingeschoben werden darf: die erste
 * Zeilen-Grenze ab ihrer Unterkante, über die keine andere Kachel reicht.
 */
export function trennZeile(r: Raster, key: string): number | null {
  const p = r.plaetze.find((x) => x.key === key);
  if (!p) return null;
  for (let b = p.row + p.h; b <= r.rows; b++) if (!r.plaetze.some((x) => x.row < b && x.row + x.h > b)) return b;
  return r.rows;
}

/** Pfeil von Mias Tipp zur Kachel: halbe Kacheln links/rechts, breite mittig, im Paar je nach Hälfte */
export function pfeilZu(units: Unit[], r: Raster, id: HomeTileId): "links" | "mitte" | "rechts" | null {
  const unit = units.find((u) => u.tiles.some((t) => t.id === id));
  const p = unit && r.plaetze.find((x) => x.key === unit.key);
  if (!unit || !p) return null;
  if (unit.tiles.length === 2) return unit.tiles[0].id === id ? "links" : "rechts";
  if (p.w === 2) return "mitte";
  return p.col === 0 ? "links" : "rechts";
}

/** Läuft ein Timer und steht die Timer-Kachel nicht auf der Startseite: als XS ganz oben, danach wieder weg */
export function mitLaufendemTimer(shown: HomeTile[], laeuft: boolean): HomeTile[] {
  if (!laeuft || shown.some((t) => t.id === "timer")) return shown;
  return [{ id: "timer", visible: true, size: "XS" }, ...shown];
}

/** Größe, mit der eine Kachel eine Lücke füllt (zwei Zeilen: S, wenn erlaubt; eine Zeile: XS) */
export function groesseFuer(id: HomeTileId, luecke: Luecke): TileSize | null {
  const sizes = tileMeta(id).sizes;
  if (luecke.h === 2 && sizes.includes("S")) return "S";
  return sizes.includes("XS") ? "XS" : null;
}

/** Kacheln, die in eine Lücke passen (nicht das Paar Essen + Einkauf) */
export const passtInLuecke = (id: HomeTileId, luecke: Luecke) => id !== "essen" && id !== "einkauf" && !tileMeta(id).soon && groesseFuer(id, luecke) !== null;

const keyOf = (r: Raster) => r.plaetze.map((p) => `${p.key}@${p.col},${p.row}`);

/**
 * „＋ Kachel“ in einer Lücke: die Kachel kommt sichtbar in passender Größe an
 * die Stelle der Reihenfolge, an der sie genau diese Lücke füllt – möglichst
 * ohne dass eine andere Kachel rückt. `shown` = sichtbare Kacheln auf dem
 * Board (Reihenfolge), `all` = gespeicherte Anordnung.
 */
export function fuelleLuecke(all: HomeTile[], shown: HomeTile[], luecke: Luecke, id: HomeTileId): HomeTile[] {
  const size = groesseFuer(id, luecke);
  if (!size || !passtInLuecke(id, luecke)) return all;
  const before = all.find((t) => t.id === id);
  const tile: HomeTile = { ...(before ?? { id }), id, visible: true, size: fitSize(id, size) };
  const rest = shown.filter((t) => t.id !== id);
  const old = new Set(keyOf(rasterOf(rest)));
  let best: HomeTile[] | null = null;
  for (let k = 0; k <= rest.length; k++) {
    const order = [...rest.slice(0, k), tile, ...rest.slice(k)];
    const r = rasterOf(order);
    const p = r.plaetze.find((x) => x.key === id);
    if (!p || p.col !== luecke.col || p.row !== luecke.row) continue;
    const ruhig = keyOf(r).filter((x) => !x.startsWith(`${id}@`)).every((x) => old.has(x));
    if (ruhig || !best) best = order;
    if (ruhig) break;
  }
  const order = best ?? [...rest, tile];
  const placed = all.map((t) => (t.id === id ? tile : t));
  const next = reorderVisible(before ? placed : [...placed, tile], order.map((t) => t.id));
  return next.find((t) => t.id === id)?.visible ? next : applyHomeChange(next, { tile: id, action: "zeigen" });
}
