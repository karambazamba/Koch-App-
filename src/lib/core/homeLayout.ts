// Startseite (`wasgibts.startseite` v9): welche Kacheln auf "Heute" stehen,
// in welcher Reihenfolge, wie groß (XS/S/M) und in welcher Farbe (`farbe`, nur
// aus der Palette `heute/kachelFarben`, fehlt = automatisch; Tafel 108).
// Festes Raster (Tafel 118, `heute/raster.ts`): 2 Spalten, Grund-Zeile = halbe
// S-Höhe; XS = halb breit und halb hoch, S = halb breit und quadratisch, M =
// ganz breit und so hoch wie S. L gibt es nicht mehr (alte L → M). Die Höhe
// hängt nie vom Inhalt ab. Essen und Einkauf sind ein Paar (stehen immer
// direkt hintereinander, wandern zusammen). Standard je Haushalt (Tafel 119,
// `defaultHome`). Neue Kacheln landen an ihrem Platz in der
// Standard-Reihenfolge. Rein + Speicher, damit Oberfläche und Lotte (Werkzeug
// startseite_anpassen) gleich rechnen. Entfernen löscht nie etwas.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { farbLabel, gueltigeFarbe, type KachelFarbe } from "@/lib/heute/kachelFarben";
import type { Haushalt } from "@/lib/core/haushalt";

export type HomeTileId = "pinnwand" | "termine" | "aufgaben" | "wetter" | "essen" | "einkauf" | "timer" | "sport" | "notizen" | "vorrat" | "post" | "spendentopf" | "tipps" | "wundertuete";
export type TileSize = "XS" | "S" | "M";
export type HomeTile = { id: HomeTileId; visible: boolean; size: TileSize; farbe?: KachelFarbe };

/** Alle Größen, klein → groß (Umschalter im Bearbeiten zeigt nur die erlaubten) */
export const TILE_SIZES: TileSize[] = ["XS", "S", "M"];

/**
 * Alle Kacheln in Standard-Reihenfolge (Familie / zu zweit, Tafel 119).
 * `sizes`: erlaubte Größen (Tafel 118), `size`: Standard; `feature`: gehört
 * zu einem Baustein (wird beim Hinzufügen eingeschaltet); `soon`: gibt es
 * noch nicht ("bald"); `fresh`: "NEU".
 */
export const HOME_TILES: { id: HomeTileId; label: string; hint: string; sizes: TileSize[]; size: TileSize; feature?: "vorrat" | "regiontipps" | "sport" | "notizen" | "spendentopf" | "pinnwand" | "wundertuete"; soon?: boolean; fresh?: boolean }[] = [
  { id: "pinnwand", label: "Pinnwand", hint: "Zettel für alle, wie am Kühlschrank", sizes: ["S", "M"], size: "S", feature: "pinnwand", fresh: true },
  { id: "wetter", label: "Wetter", hint: "Heute und die nächsten Stunden", sizes: ["XS", "S", "M"], size: "XS", fresh: true },
  { id: "notizen", label: "Notizen", hint: "Schnellnotiz + Angeheftetes", sizes: ["XS", "S", "M"], size: "XS", feature: "notizen" },
  { id: "termine", label: "Termine", hint: "Die nächsten von heute", sizes: ["S", "M"], size: "M" },
  { id: "aufgaben", label: "Aufgaben", hint: "Was heute dran ist", sizes: ["S", "M"], size: "M" },
  { id: "essen", label: "Essen", hint: "Gericht von heute", sizes: ["S", "M"], size: "S" },
  { id: "einkauf", label: "Einkaufsliste", hint: "Was ihr braucht, nach Laden", sizes: ["S", "M"], size: "S" },
  { id: "wundertuete", label: "Wundertüte", hint: "Jeden Tag was Neues: Witze, Plattdeutsch und Angeberwissen", sizes: ["S", "M"], size: "S", feature: "wundertuete", fresh: true },
  { id: "spendentopf", label: "Spendentopf", hint: "Jeder Euro geht in eure Region", sizes: ["M"], size: "M", feature: "spendentopf", fresh: true },
  { id: "tipps", label: "Tipps fürs Wochenende", hint: "Was in eurer Nähe los ist", sizes: ["M"], size: "M", feature: "regiontipps", fresh: true },
  { id: "timer", label: "Timer", hint: "Bis zu 5 Timer und eine Stoppuhr", sizes: ["XS", "S"], size: "XS", fresh: true },
  { id: "sport", label: "Sport", hint: "Stempelkarte der Woche", sizes: ["XS", "S", "M"], size: "XS", feature: "sport", fresh: true },
  { id: "vorrat", label: "Im Haus", hint: "Bald aufbrauchen und spontan daraus kochen", sizes: ["XS", "S"], size: "XS", feature: "vorrat" },
  { id: "post", label: "Post", hint: "Briefe und Rechnungen", sizes: ["S", "M"], size: "M", soon: true },
];

const IDS = HOME_TILES.map((t) => t.id);
const rank = (id: HomeTileId) => IDS.indexOf(id);

export const tileMeta = (id: HomeTileId) => HOME_TILES.find((t) => t.id === id)!;

export const tileLabel = (id: HomeTileId) => HOME_TILES.find((t) => t.id === id)?.label ?? id;

/**
 * Standard je Haushalt (Tafel 119) – für neue Nutzer und den Beispiel-Tag.
 * Familie / zu zweit: Pinnwand S | Wetter XS über Notizen XS · Termine M ·
 * Aufgaben M · Essen S | Einkauf S. Allein (Pinnwand aus): Wetter XS + Sport
 * XS | Notizen XS + Im Haus XS · Termine M · Aufgaben M · Essen S | Einkauf S.
 * Timer hat keinen festen Platz (erscheint nur, solange einer läuft).
 */
const STANDARD: Record<"gemeinsam" | "allein", HomeTileId[]> = {
  gemeinsam: ["pinnwand", "wetter", "notizen", "termine", "aufgaben", "essen", "einkauf"],
  allein: ["wetter", "sport", "notizen", "vorrat", "termine", "aufgaben", "essen", "einkauf"],
};

/**
 * Kacheln, die nur ganz neue Nutzer beim ersten Start dazubekommen (A-022:
 * Mias Wundertüte als S direkt hinter Essen + Einkauf, `ersteStartseite`).
 * Bestehenden schieben sie sich nie in die Anordnung, auch nicht beim
 * Haushaltswechsel; der Tafel-119-Standard bleibt, wie er ist.
 */
const NUR_NEU: HomeTileId[] = ["wundertuete"];

const standardOf = (h: Haushalt) => STANDARD[h === "allein" ? "allein" : "gemeinsam"];

/** Standard-Anordnung eines Haushalts: sichtbare in ihrer Reihenfolge, dahinter alle übrigen (unsichtbar) */
export function defaultHome(haushalt: Haushalt = "familie"): HomeTile[] {
  const on = standardOf(haushalt);
  const order = [...on, ...IDS.filter((id) => !on.includes(id))];
  return order.map((id) => ({ id, visible: on.includes(id), size: tileMeta(id).size }));
}

/** Startseite beim allerersten Start: Standard des Haushalts + die Wundertüte (S) hinter Essen + Einkauf */
export function ersteStartseite(haushalt: Haushalt = "familie"): HomeTile[] {
  return NUR_NEU.reduce((tiles, id) => applyHomeChange(tiles, { tile: id, action: "zeigen" }), defaultHome(haushalt));
}

/** Standard für Familie / zu zweit (Launch 1.0: mit Notizen; Im Haus nur über die Auswahl) */
export const DEFAULT_HOME: HomeTile[] = defaultHome("familie");

const PAIR: [HomeTileId, HomeTileId] = ["essen", "einkauf"];
const partnerOf = (id: HomeTileId): HomeTileId | null => (id === "essen" ? "einkauf" : id === "einkauf" ? "essen" : null);

export type HomeAction =
  | "zeigen"
  | "ausblenden"
  | "mini"
  | "klein"
  | "mittel"
  | "gross"
  | "hoch"
  | "runter"
  | "nach_oben"
  | "nach_unten"
  | "standard"
  // Farbe aus der Palette (HomeChange.farbe; "auto" = zurück auf automatisch)
  | "farbe"
  // alt (v0.11): kompakt = klein, ausführlich = groß
  | "kompakt"
  | "ausfuehrlich";
export type HomeChange = { tile: HomeTileId; action: HomeAction; farbe?: KachelFarbe | "auto" };

export const HOME_ACTIONS: HomeAction[] = ["zeigen", "ausblenden", "mini", "klein", "mittel", "gross", "hoch", "runter", "nach_oben", "nach_unten", "standard", "farbe"];

/** Kachel mit Farbe (nur gültige Töne; automatisch = Feld fehlt) */
function withFarbe(tile: Omit<HomeTile, "farbe">, farbe: unknown): HomeTile {
  const f = gueltigeFarbe(tile.id, farbe);
  return f ? { ...tile, farbe: f } : { id: tile.id, visible: tile.visible, size: tile.size };
}

const RANG: Record<string, number> = { XS: 0, S: 1, M: 2, L: 3 };

/**
 * Größe, die eine Kachel haben darf: erlaubt bleibt; sonst die nächste
 * erlaubte (altes L → M, M bei Timer/Sport/Im Haus → S, bei Gleichstand die
 * größere); Unbekanntes → Standard.
 */
export const fitSize = (id: HomeTileId, size: unknown): TileSize => {
  const meta = tileMeta(id);
  if (meta.sizes.includes(size as TileSize)) return size as TileSize;
  const r = RANG[size as string];
  if (r === undefined) return meta.size;
  return [...meta.sizes].sort((a, b) => Math.abs(RANG[a] - r) - Math.abs(RANG[b] - r) || RANG[b] - RANG[a])[0];
};

/** Essen und Einkauf direkt hintereinander (Essen zuerst), wenn beide sichtbar sind */
function keepPair(list: HomeTile[]): HomeTile[] {
  const a = list.findIndex((t) => t.id === PAIR[0]);
  const b = list.findIndex((t) => t.id === PAIR[1]);
  if (a < 0 || b < 0 || !list[a].visible || !list[b].visible || b === a + 1) return list;
  // Der Partner kommt an die Stelle des ersten der beiden
  const copy = list.filter((t) => t.id !== PAIR[0] && t.id !== PAIR[1]);
  copy.splice(Math.min(a, b), 0, list[a], list[b]);
  return copy;
}

/** Prüfen: unbekannte Kacheln weg, fehlende an ihren Standard-Platz, Größen erlaubt, Paar beisammen */
export function sanitizeHome(raw: unknown): HomeTile[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<HomeTileId>();
  const tiles: HomeTile[] = [];
  for (const t of list) {
    if (!t || typeof t !== "object") continue;
    const id = (t as HomeTile).id;
    if (!IDS.includes(id) || seen.has(id)) continue;
    seen.add(id);
    tiles.push(withFarbe({ id, visible: (t as HomeTile).visible !== false, size: fitSize(id, (t as HomeTile).size) }, (t as HomeTile).farbe));
  }
  for (const d of DEFAULT_HOME) if (!seen.has(d.id)) tiles.push({ ...d, visible: false });
  return keepPair(tiles);
}

/** Wo eine neu sichtbare Kachel hinkommt: direkt nach der nächsten sichtbaren, die laut Standard davor steht */
function placeByStandard(list: HomeTile[], tile: HomeTile): HomeTile[] {
  const rest = list.filter((t) => t.id !== tile.id);
  const partner = partnerOf(tile.id);
  const p = partner ? rest.findIndex((t) => t.id === partner && t.visible) : -1;
  if (p >= 0) {
    // Paar: Essen links neben, Einkauf rechts neben den anderen
    rest.splice(tile.id === "essen" ? p : p + 1, 0, tile);
    return rest;
  }
  let at = 0;
  for (let i = rest.length - 1; i >= 0; i--) {
    if (rest[i].visible && rank(rest[i].id) < rank(tile.id)) {
      at = i + 1;
      break;
    }
  }
  if (!at) {
    // Nichts davor sichtbar: vor die erste sichtbare Kachel
    const first = rest.findIndex((t) => t.visible);
    at = first < 0 ? 0 : first;
  }
  rest.splice(at, 0, tile);
  return rest;
}

/**
 * Standard-Anordnung: Reihenfolge, Größen und Farben wie am Anfang des
 * Haushalts (ohne Angabe: allein, wenn die Pinnwand nicht sichtbar ist),
 * sichtbar bleibt, was sichtbar ist.
 */
export function standardLayout(tiles: HomeTile[], haushalt?: Haushalt): HomeTile[] {
  const list = sanitizeHome(tiles);
  const h = haushalt ?? (list.find((t) => t.id === "pinnwand")?.visible ? "familie" : "allein");
  return keepPair(defaultHome(h).map((d) => ({ id: d.id, visible: list.find((t) => t.id === d.id)?.visible ?? false, size: d.size })));
}

/** Kachel (bzw. das Paar Essen + Einkauf) als Block an eine neue Stelle */
function moveBlock(list: HomeTile[], id: HomeTileId, to: "hoch" | "runter" | "oben" | "unten"): HomeTile[] {
  const partner = partnerOf(id);
  const together = partner && list.find((t) => t.id === partner)?.visible && list.find((t) => t.id === id)?.visible;
  const ids = together ? PAIR : [id];
  const block = list.filter((t) => ids.includes(t.id));
  const rest = list.filter((t) => !ids.includes(t.id));
  const start = list.findIndex((t) => ids.includes(t.id));
  const visibleRest = rest.map((t, i) => (t.visible ? i : -1)).filter((i) => i >= 0);
  let at: number;
  if (to === "oben") at = visibleRest[0] ?? 0;
  else if (to === "unten") at = (visibleRest[visibleRest.length - 1] ?? rest.length - 1) + 1;
  else {
    // Eine sichtbare Kachel weiter
    const before = visibleRest.filter((i) => i < start);
    const after = visibleRest.filter((i) => i >= start);
    at = to === "hoch" ? (before.length ? before[before.length - 1] : start) : after.length ? after[0] + 1 : start;
    // Nie zwischen Essen und Einkauf: am ganzen Paar vorbei
    if (rest[at - 1]?.id === PAIR[0] && rest[at]?.id === PAIR[1] && rest[at - 1].visible && rest[at].visible) at += to === "hoch" ? -1 : 1;
  }
  rest.splice(Math.max(0, Math.min(rest.length, at)), 0, ...block);
  return rest;
}

/** Eine Änderung anwenden (rein) */
export function applyHomeChange(tiles: HomeTile[], change: HomeChange): HomeTile[] {
  const list = sanitizeHome(tiles);
  const i = list.findIndex((t) => t.id === change.tile);
  if (change.action === "standard") return standardLayout(list);
  if (i < 0) return list;
  const set = (patch: Partial<HomeTile>) => list.map((t, n) => (n === i ? { ...t, ...patch } : t));
  const size = (s: TileSize) => set({ size: fitSize(change.tile, s), visible: true });
  switch (change.action) {
    case "zeigen":
      if (list[i].visible) return list;
      return placeByStandard(list, { ...list[i], visible: true, size: tileMeta(change.tile).size });
    case "ausblenden":
      return set({ visible: false });
    case "mini":
      return size("XS");
    case "klein":
    case "kompakt":
      return size("S");
    case "mittel":
    case "gross":
    case "ausfuehrlich":
      return size("M");
    case "hoch":
      return moveBlock(list, change.tile, "hoch");
    case "runter":
      return moveBlock(list, change.tile, "runter");
    case "nach_oben":
      return moveBlock(list, change.tile, "oben");
    case "nach_unten":
      return moveBlock(list, change.tile, "unten");
    case "farbe":
      return list.map((t, n) => (n === i ? withFarbe(t, change.farbe) : t));
  }
}

/** Sichtbare Kacheln neu ordnen (Ziehen im Bearbeiten-Modus); Ausgeblendete behalten ihren Platz dahinter */
export function reorderVisible(tiles: HomeTile[], order: HomeTileId[]): HomeTile[] {
  const list = sanitizeHome(tiles);
  const moved = order.map((id) => list.find((t) => t.id === id)).filter((t): t is HomeTile => Boolean(t));
  return sanitizeHome([...moved, ...list.filter((t) => !order.includes(t.id))]);
}

/** Kurze Beschreibung: "Wetter ist jetzt klein." */
export function describeHomeChange(change: HomeChange): string {
  const name = tileLabel(change.tile);
  switch (change.action) {
    case "zeigen":
      return `${name} steht jetzt auf der Startseite.`;
    case "ausblenden":
      return `${name} ist von der Startseite weg – unter „Startseite bearbeiten“ holst du es zurück.`;
    case "mini":
      return `${name} ist jetzt ganz klein.`;
    case "klein":
    case "kompakt":
      return `${name} ist jetzt klein.`;
    case "mittel":
      return `${name} ist jetzt mittelgroß.`;
    case "gross":
    case "ausfuehrlich":
      return `${name} ist jetzt groß.`;
    case "standard":
      return "Die Startseite steht wieder wie am Anfang.";
    case "farbe":
      return change.farbe && change.farbe !== "auto" && gueltigeFarbe(change.tile, change.farbe) ? `${name} ist jetzt ${farbLabel(change.farbe)}.` : `${name} hat wieder die eigene Farbe.`;
    default:
      return `${name} ist verschoben.`;
  }
}

type HomeStore = { version: 9; tiles: HomeTile[]; tipSeen: boolean };

type RawTile = { id?: string; visible?: boolean; size?: string };

/**
 * Migration: v1 "Termine & Aufgaben" → Aufgaben direkt hinter Termine; v2 →
 * v3: Größen S/M/L (Essen, Einkauf, Vorrat klein, sonst mittel), die Kachel
 * "Kladde" wird zur Notizen-Kachel an derselben Stelle. v6 → v7 (Tafel 98):
 * der Streifen „Ausblick morgen“ fällt weg – still, die übrige Anordnung bleibt.
 * v7 → v8 (Tafel 108): Kachel-Farben – alle bleiben automatisch. v8 → v9
 * (Tafel 118): festes Raster XS · S · M – Reihenfolge, Sichtbarkeit, Farben
 * und Größen bleiben, L wird M, nicht mehr erlaubte Größen die nächste
 * erlaubte (`fitSize`); keine Kachel verschwindet.
 */
export function migrateHome(raw: unknown): HomeStore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { version?: number; tiles?: unknown; tipSeen?: unknown };
  const tipSeen = r.tipSeen === true;
  if (r.version === 9 || r.version === 8 || r.version === 7) return { version: 9, tiles: sanitizeHome(r.tiles), tipSeen };
  if (r.version === 6) return { version: 9, tiles: sanitizeHome(withoutMorgen(r.tiles)), tipSeen };
  if (r.version === 5) return { version: 9, tiles: lonelySToM(sanitizeHome(r.tiles)), tipSeen };
  if (r.version === 4) return { version: 9, tiles: lonelySToM(showOnce(sanitizeHome(r.tiles), "notizen")), tipSeen };
  if (r.version === 3) return { version: 9, tiles: lonelySToM(showOnce(withPotTile(sanitizeHome(r.tiles)), "notizen")), tipSeen };
  if (r.version !== 1 && r.version !== 2) return null;
  let old = withoutMorgen(r.tiles);
  if (r.version === 1) {
    const at = old.findIndex((t) => t.id === "termine");
    if (at >= 0 && !old.some((t) => t.id === "aufgaben")) old = [...old.slice(0, at + 1), { id: "aufgaben", visible: old[at].visible !== false }, ...old.slice(at + 1)];
  }
  // Kladde → Notizen (an derselben Stelle, wenn Notizen nicht schon sichtbar war)
  const kladde = old.find((t) => t.id === "kladde");
  const notes = old.find((t) => t.id === "notizen");
  if (kladde) {
    const notesShown = notes && notes.visible !== false;
    old = old
      .filter((t) => t.id !== "notizen" || notesShown || kladde.visible === false)
      .map((t) => (t.id === "kladde" ? (kladde.visible !== false && !notesShown ? { id: "notizen", visible: true } : null) : t))
      .filter((t): t is RawTile => Boolean(t));
  }
  // v2 kannte keine Größen: damals Essen, Einkauf, Vorrat klein, sonst mittel
  const V2_KLEIN = ["essen", "einkauf", "vorrat"];
  const tiles = old.map((t) => ({ id: t.id as HomeTileId, visible: t.visible !== false, size: (V2_KLEIN.includes(t.id ?? "") ? "S" : "M") as TileSize }));
  // Bisherige Nutzer (v1) kennen die Startseite schon – kein Hinweis mehr
  return { version: 9, tiles: lonelySToM(showOnce(withPotTile(sanitizeHome(tiles)), "notizen")), tipSeen: r.version === 1 ? true : tipSeen };
}

/** v6 → v7: „Ausblick morgen“ (Kachel-ID „morgen“) still entfernen */
function withoutMorgen(tiles: unknown): RawTile[] {
  return (Array.isArray(tiles) ? tiles : []).filter((t): t is RawTile => Boolean(t) && typeof t === "object" && (t as RawTile).id !== "morgen");
}

/**
 * v5 → v6: Eine einzelne S war bisher breit – seitdem ist jede S halb. Damit
 * sich beim Update nichts sichtbar verschiebt, wird sie einmal zu M (wie
 * damals: zwei S hintereinander standen nebeneinander, Essen + Einkauf als
 * Paar). @public
 */
export function lonelySToM(tiles: HomeTile[]): HomeTile[] {
  const shown = tiles.filter((t) => t.visible);
  const lonely = new Set<HomeTileId>();
  const small = (t?: HomeTile) => t?.size === "S";
  for (let i = 0; i < shown.length; i++) {
    const t = shown[i];
    if (t.id === "essen" && shown[i + 1]?.id === "einkauf" && small(t) && small(shown[i + 1])) {
      i++;
      continue;
    }
    const next = shown[i + 1];
    const nextPair = next?.id === "essen" && shown[i + 2]?.id === "einkauf" && small(next) && small(shown[i + 2]);
    if (small(t) && small(next) && !nextPair) i++;
    else if (small(t)) lonely.add(t.id);
  }
  return tiles.map((t) => (lonely.has(t.id) ? { ...t, size: fitSize(t.id, "M") } : t));
}

/**
 * v3 → v4: die Spendentopf-Kachel ist standardmäßig an – bei bisherigen
 * Nutzern einmal ans Ende der sichtbaren Kacheln (die übrige Anordnung bleibt
 * genau, wie sie ist; entfernen geht wie bei jeder Kachel).
 */
const withPotTile = (tiles: HomeTile[]) => showOnce(tiles, "spendentopf");

/** Eine Kachel einmal ans Ende der sichtbaren setzen (v4 → v5: Notizen gehören zu 1.0) */
function showOnce(tiles: HomeTile[], id: HomeTileId): HomeTile[] {
  const tile = tiles.find((t) => t.id === id);
  if (!tile || tile.visible) return tiles;
  const rest = tiles.filter((t) => t.id !== id);
  const lastVisible = rest.map((t) => t.visible).lastIndexOf(true);
  rest.splice(lastVisible + 1, 0, { ...tile, visible: true });
  return rest;
}

/**
 * Haushaltsart gewechselt (Einstellungen, Einladung): eine selbst geänderte
 * Anordnung wird NIE überschrieben. Steht noch genau der Standard des alten
 * Haushalts da, kommt der Standard des neuen (Farben bleiben); sonst nur
 * fehlende Standard-Kacheln dazu, bei „allein“ die Pinnwand ausgeblendet.
 */
export function homeForHaushalt(tiles: HomeTile[], from: Haushalt, to: Haushalt): HomeTile[] {
  const list = sanitizeHome(tiles);
  // Nur-für-Neue-Kacheln (Wundertüte) zählen beim Vergleich nicht mit und behalten ihre Sichtbarkeit
  const shape = (l: HomeTile[]) => l.filter((t) => t.visible && !NUR_NEU.includes(t.id)).map((t) => `${t.id}:${t.size}`).join();
  if (shape(list) === shape(defaultHome(from))) {
    const before = new Map(list.map((t) => [t.id, t]));
    return sanitizeHome(defaultHome(to).map((t) => (NUR_NEU.includes(t.id) ? { ...t, ...before.get(t.id) } : { ...t, farbe: before.get(t.id)?.farbe })));
  }
  let next = list;
  for (const id of standardOf(to)) if (!NUR_NEU.includes(id) && !next.find((t) => t.id === id)?.visible) next = applyHomeChange(next, { tile: id, action: "zeigen" });
  return to === "allein" ? applyHomeChange(next, { tile: "pinnwand", action: "ausblenden" }) : next;
}

const store = createLocalStore("wasgibts.startseite", migrateHome);

export function loadHomeTiles(): HomeTile[] {
  return store.load()?.tiles ?? DEFAULT_HOME;
}

export function saveHomeTiles(tiles: HomeTile[]) {
  store.save({ version: 9, tiles: sanitizeHome(tiles), tipSeen: store.load()?.tipSeen ?? false });
}

/** Einmaliger Hinweis "Halte die Startseite gedrückt …" */
export function useHomeTipSeen(): boolean | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data?.tipSeen ?? false);
}

export function markHomeTipSeen() {
  store.save({ version: 9, tiles: loadHomeTiles(), tipSeen: true });
}

/** Änderung speichern; liefert Rückgängig */
export function changeHome(change: HomeChange): () => void {
  const before = loadHomeTiles();
  saveHomeTiles(applyHomeChange(before, change));
  return () => saveHomeTiles(before);
}

/** Nutzt Lotte eine Kachel, die nicht auf der Startseite steht, kommt sie dazu (an ihren Platz); true = neu */
export function unlockHomeTile(id: HomeTileId): boolean {
  const tiles = loadHomeTiles();
  if (tiles.find((t) => t.id === id)?.visible) return false;
  saveHomeTiles(applyHomeChange(tiles, { tile: id, action: "zeigen" }));
  return true;
}

export function useHomeTiles(): HomeTile[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.tiles ?? DEFAULT_HOME;
}

// --- Bearbeiten-Modus öffnen (von überall: Einstellungen, Lotte, Link) -----------

let editRequested = false;
const editListeners = new Set<() => void>();

/** Bearbeiten-Modus auf der Startseite anfordern (die Startseite öffnet ihn beim nächsten Zeichnen) */
export function requestHomeEdit() {
  editRequested = true;
  editListeners.forEach((l) => l());
}

/** Anforderung abholen (einmal) */
function takeHomeEditRequest(): boolean {
  const was = editRequested;
  editRequested = false;
  return was;
}

/** Auf Anforderungen hören (auch eine, die schon vor dem Zeichnen kam); liefert Abmelden */
export function onHomeEditRequest(open: () => void): () => void {
  const check = () => {
    if (takeHomeEditRequest()) open();
  };
  editListeners.add(check);
  queueMicrotask(check);
  return () => {
    editListeners.delete(check);
  };
}
