// Startseite (`wasgibts.startseite` v3): welche Kacheln auf "Heute" stehen,
// in welcher Reihenfolge und wie groß (S/M/L). L und M = volle Breite; S =
// halbe Breite – zwei S direkt hintereinander stehen nebeneinander, eine
// einzelne S wird breit. Essen und Einkauf sind ein Paar (stehen immer
// direkt hintereinander, wandern zusammen). Neue Kacheln landen an ihrem
// Platz in der Standard-Reihenfolge. Rein + Speicher, damit Oberfläche und
// Lotte (Werkzeug startseite_anpassen) gleich rechnen. Entfernen löscht nie
// etwas.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

export type HomeTileId = "pinnwand" | "termine" | "aufgaben" | "wetter" | "essen" | "einkauf" | "timer" | "sport" | "notizen" | "vorrat" | "morgen" | "post" | "spendentopf" | "tipps";
export type TileSize = "S" | "M" | "L";
export type HomeTile = { id: HomeTileId; visible: boolean; size: TileSize };

/**
 * Alle Kacheln in Standard-Reihenfolge. `sizes`: erlaubte Größen, `size`:
 * Standard; `feature`: gehört zu einem Baustein (wird beim Hinzufügen
 * eingeschaltet); `soon`: gibt es noch nicht ("bald"); `fresh`: "NEU".
 */
export const HOME_TILES: { id: HomeTileId; label: string; hint: string; sizes: TileSize[]; size: TileSize; feature?: "vorrat" | "regiontipps"; soon?: boolean; fresh?: boolean }[] = [
  { id: "pinnwand", label: "Pinnwand", hint: "Kurze Nachrichten an die Familie", sizes: ["S", "M", "L"], size: "S", fresh: true },
  { id: "wetter", label: "Wetter", hint: "Heute und die nächsten Tage", sizes: ["S", "M", "L"], size: "S", fresh: true },
  { id: "termine", label: "Termine", hint: "Die nächsten von heute", sizes: ["S", "M", "L"], size: "M" },
  { id: "aufgaben", label: "Aufgaben", hint: "Was heute dran ist", sizes: ["S", "M", "L"], size: "M" },
  { id: "essen", label: "Essen", hint: "Gericht von heute", sizes: ["S", "M", "L"], size: "S" },
  { id: "einkauf", label: "Einkauf", hint: "Die Einkaufsliste", sizes: ["S", "M", "L"], size: "S" },
  { id: "spendentopf", label: "Spendentopf", hint: "Jeder Euro geht in eure Region", sizes: ["M"], size: "M", fresh: true },
  { id: "tipps", label: "Tipps fürs Wochenende", hint: "Was in eurer Nähe los ist", sizes: ["M", "L"], size: "M", feature: "regiontipps", fresh: true },
  { id: "timer", label: "Timer", hint: "Bis zu 5 Timer und eine Stoppuhr", sizes: ["S", "M"], size: "M", fresh: true },
  { id: "sport", label: "Sport", hint: "Wochenziel und Trainings", sizes: ["S", "M", "L"], size: "M", fresh: true },
  { id: "notizen", label: "Notizen", hint: "Schnellnotiz + Angeheftetes", sizes: ["S", "M", "L"], size: "M" },
  { id: "vorrat", label: "Vorrat", hint: "Kühlschrank, Tiefkühler, Schrank", sizes: ["S", "M"], size: "S", feature: "vorrat" },
  { id: "morgen", label: "Morgen", hint: "Vorschau ab 16 Uhr", sizes: ["M"], size: "M" },
  { id: "post", label: "Post", hint: "Briefe und Rechnungen", sizes: ["S", "M"], size: "M", soon: true },
];

const IDS = HOME_TILES.map((t) => t.id);
const rank = (id: HomeTileId) => IDS.indexOf(id);

export const tileMeta = (id: HomeTileId) => HOME_TILES.find((t) => t.id === id)!;

export const tileLabel = (id: HomeTileId) => HOME_TILES.find((t) => t.id === id)?.label ?? id;

const ON_BY_DEFAULT: HomeTileId[] = ["pinnwand", "wetter", "termine", "aufgaben", "essen", "einkauf", "spendentopf", "vorrat"];

/**
 * Standard: Pinnwand + Wetter (klein nebeneinander), Termine, Aufgaben, Essen +
 * Einkauf (Vorrat nur mit Baustein). Die Reihenfolge ist die gespeicherte –
 * sie ändert sich nie von selbst.
 */
export const DEFAULT_HOME: HomeTile[] = HOME_TILES.map((t) => ({ id: t.id, visible: ON_BY_DEFAULT.includes(t.id), size: t.size }));

const PAIR: [HomeTileId, HomeTileId] = ["essen", "einkauf"];
const partnerOf = (id: HomeTileId): HomeTileId | null => (id === "essen" ? "einkauf" : id === "einkauf" ? "essen" : null);

export type HomeAction =
  | "zeigen"
  | "ausblenden"
  | "klein"
  | "mittel"
  | "gross"
  | "hoch"
  | "runter"
  | "nach_oben"
  | "nach_unten"
  | "standard"
  // alt (v0.11): kompakt = klein, ausführlich = groß
  | "kompakt"
  | "ausfuehrlich";
export type HomeChange = { tile: HomeTileId; action: HomeAction };

export const HOME_ACTIONS: HomeAction[] = ["zeigen", "ausblenden", "klein", "mittel", "gross", "hoch", "runter", "nach_oben", "nach_unten", "standard"];

/** Größe, die eine Kachel haben darf (sonst ihr Standard) */
const fitSize = (id: HomeTileId, size: unknown): TileSize => {
  const meta = tileMeta(id);
  return meta.sizes.includes(size as TileSize) ? (size as TileSize) : meta.size;
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
    tiles.push({ id, visible: (t as HomeTile).visible !== false, size: fitSize(id, (t as HomeTile).size) });
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

/** Standard-Anordnung: Reihenfolge und Größen wie am Anfang, sichtbar bleibt, was sichtbar ist */
export function standardLayout(tiles: HomeTile[]): HomeTile[] {
  const list = sanitizeHome(tiles);
  return HOME_TILES.map((m) => ({ id: m.id, visible: list.find((t) => t.id === m.id)?.visible ?? false, size: m.size }));
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
    case "klein":
    case "kompakt":
      return size("S");
    case "mittel":
      return size("M");
    case "gross":
    case "ausfuehrlich":
      return size("L");
    case "hoch":
      return moveBlock(list, change.tile, "hoch");
    case "runter":
      return moveBlock(list, change.tile, "runter");
    case "nach_oben":
      return moveBlock(list, change.tile, "oben");
    case "nach_unten":
      return moveBlock(list, change.tile, "unten");
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
    default:
      return `${name} ist verschoben.`;
  }
}

type HomeStore = { version: 4; tiles: HomeTile[]; tipSeen: boolean };

type RawTile = { id?: string; visible?: boolean; size?: string };

/**
 * Migration: v1 "Termine & Aufgaben" → Aufgaben direkt hinter Termine; v2 →
 * v3: Größen S/M/L (Essen, Einkauf, Vorrat klein, sonst mittel), die Kachel
 * "Kladde" wird zur Notizen-Kachel an derselben Stelle.
 */
export function migrateHome(raw: unknown): HomeStore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { version?: number; tiles?: unknown; tipSeen?: unknown };
  if (r.version === 4) return { version: 4, tiles: sanitizeHome(r.tiles), tipSeen: r.tipSeen === true };
  if (r.version === 3) return { version: 4, tiles: withPotTile(sanitizeHome(r.tiles)), tipSeen: r.tipSeen === true };
  if (r.version !== 1 && r.version !== 2) return null;
  let old = (Array.isArray(r.tiles) ? r.tiles : []).filter((t): t is RawTile => Boolean(t) && typeof t === "object");
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
  const tiles = old.map((t) => ({ id: t.id as HomeTileId, visible: t.visible !== false, size: IDS.includes(t.id as HomeTileId) ? tileMeta(t.id as HomeTileId).size : "M" }));
  // Bisherige Nutzer (v1) kennen die Startseite schon – kein Hinweis mehr
  return { version: 4, tiles: withPotTile(sanitizeHome(tiles)), tipSeen: r.version === 1 ? true : r.tipSeen === true };
}

/**
 * v3 → v4: die Spendentopf-Kachel ist standardmäßig an – bei bisherigen
 * Nutzern einmal ans Ende der sichtbaren Kacheln (die übrige Anordnung bleibt
 * genau, wie sie ist; entfernen geht wie bei jeder Kachel).
 */
function withPotTile(tiles: HomeTile[]): HomeTile[] {
  const pot = tiles.find((t) => t.id === "spendentopf");
  if (!pot || pot.visible) return tiles;
  const rest = tiles.filter((t) => t.id !== "spendentopf");
  const lastVisible = rest.map((t) => t.visible).lastIndexOf(true);
  rest.splice(lastVisible + 1, 0, { ...pot, visible: true });
  return rest;
}

const store = createLocalStore("wasgibts.startseite", migrateHome);

export function loadHomeTiles(): HomeTile[] {
  return store.load()?.tiles ?? DEFAULT_HOME;
}

export function saveHomeTiles(tiles: HomeTile[]) {
  store.save({ version: 4, tiles: sanitizeHome(tiles), tipSeen: store.load()?.tipSeen ?? false });
}

/** Einmaliger Hinweis "Halte die Startseite gedrückt …" */
export function useHomeTipSeen(): boolean | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data?.tipSeen ?? false);
}

export function markHomeTipSeen() {
  store.save({ version: 4, tiles: loadHomeTiles(), tipSeen: true });
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
