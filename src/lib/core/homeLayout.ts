// Startseite anpassen (`wasgibts.startseite`): Reihenfolge, Größe
// (kompakt/ausführlich) und sichtbar/ausgeblendet je Kachel auf "Heute".
// Rein + Speicher, damit Oberfläche und Lotte (Werkzeug startseite_anpassen)
// gleich rechnen. Ausblenden löscht nie etwas.

import { createLocalStore } from "./localStore";
import { useExternalStore } from "./useExternalStore";

export type HomeTileId = "termine" | "essen" | "einkauf" | "morgen";
export type TileSize = "kompakt" | "ausfuehrlich";
export type HomeTile = { id: HomeTileId; visible: boolean; size: TileSize };

export const HOME_TILES: { id: HomeTileId; label: string; hint: string }[] = [
  { id: "termine", label: "Termine & Aufgaben", hint: "Was heute ansteht" },
  { id: "essen", label: "Essen", hint: "Gericht von heute" },
  { id: "einkauf", label: "Einkauf", hint: "Die Einkaufsliste" },
  { id: "morgen", label: "Vorschau morgen", hint: "Ab 16 Uhr" },
];

export const tileLabel = (id: HomeTileId) => HOME_TILES.find((t) => t.id === id)?.label ?? id;

export const DEFAULT_HOME: HomeTile[] = [
  { id: "termine", visible: true, size: "ausfuehrlich" },
  { id: "essen", visible: true, size: "kompakt" },
  { id: "einkauf", visible: true, size: "kompakt" },
  { id: "morgen", visible: true, size: "kompakt" },
];

export type HomeAction = "zeigen" | "ausblenden" | "kompakt" | "ausfuehrlich" | "hoch" | "runter" | "nach_oben" | "nach_unten";
export type HomeChange = { tile: HomeTileId; action: HomeAction };

const IDS = HOME_TILES.map((t) => t.id);

/** Prüfen: unbekannte Kacheln weg, fehlende hinten anhängen */
export function sanitizeHome(raw: unknown): HomeTile[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<HomeTileId>();
  const tiles: HomeTile[] = [];
  for (const t of list) {
    if (!t || typeof t !== "object") continue;
    const id = (t as HomeTile).id;
    if (!IDS.includes(id) || seen.has(id)) continue;
    seen.add(id);
    tiles.push({ id, visible: (t as HomeTile).visible !== false, size: (t as HomeTile).size === "ausfuehrlich" ? "ausfuehrlich" : "kompakt" });
  }
  for (const d of DEFAULT_HOME) if (!seen.has(d.id)) tiles.push(d);
  return tiles;
}

/** Eine Änderung anwenden (rein) */
export function applyHomeChange(tiles: HomeTile[], change: HomeChange): HomeTile[] {
  const list = sanitizeHome(tiles);
  const i = list.findIndex((t) => t.id === change.tile);
  if (i < 0) return list;
  const set = (patch: Partial<HomeTile>) => list.map((t, n) => (n === i ? { ...t, ...patch } : t));
  const move = (to: number) => {
    const copy = [...list];
    const [tile] = copy.splice(i, 1);
    copy.splice(Math.max(0, Math.min(copy.length, to)), 0, tile);
    return copy;
  };
  switch (change.action) {
    case "zeigen":
      return set({ visible: true });
    case "ausblenden":
      return set({ visible: false });
    case "kompakt":
      return set({ size: "kompakt", visible: true });
    case "ausfuehrlich":
      return set({ size: "ausfuehrlich", visible: true });
    case "hoch":
      return move(i - 1);
    case "runter":
      return move(i + 1);
    case "nach_oben":
      return move(0);
    case "nach_unten":
      return move(list.length);
  }
}

/** Kurze Beschreibung: "Einkauf ist jetzt kompakt." */
export function describeHomeChange(change: HomeChange): string {
  const name = tileLabel(change.tile);
  switch (change.action) {
    case "zeigen":
      return `${name} steht wieder auf der Startseite.`;
    case "ausblenden":
      return `${name} ist von der Startseite weg – unter „Startseite anpassen“ holst du es zurück.`;
    case "kompakt":
      return `${name} ist jetzt kompakt.`;
    case "ausfuehrlich":
      return `${name} ist jetzt ausführlich.`;
    default:
      return `${name} ist verschoben.`;
  }
}

type HomeStore = { version: 1; tiles: HomeTile[] };

const store = createLocalStore("wasgibts.startseite", (raw: unknown): HomeStore | null => {
  if (!raw || typeof raw !== "object" || (raw as HomeStore).version !== 1) return null;
  return { version: 1, tiles: sanitizeHome((raw as HomeStore).tiles) };
});

export function loadHomeTiles(): HomeTile[] {
  return store.load()?.tiles ?? DEFAULT_HOME;
}

export function saveHomeTiles(tiles: HomeTile[]) {
  store.save({ version: 1, tiles: sanitizeHome(tiles) });
}

/** Änderung speichern; liefert Rückgängig */
export function changeHome(change: HomeChange): () => void {
  const before = loadHomeTiles();
  saveHomeTiles(applyHomeChange(before, change));
  return () => saveHomeTiles(before);
}

export function useHomeTiles(): HomeTile[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.tiles ?? DEFAULT_HOME;
}
