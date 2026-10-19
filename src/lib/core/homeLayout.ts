// Startseite bearbeiten (`wasgibts.startseite` v2): welche Kacheln auf
// "Heute" stehen und in welcher Reihenfolge. Breiten sind fest (Termine,
// Aufgaben, Notizen voll; Essen, Einkauf, Kladde, Vorrat halb – zwei halbe
// nebeneinander werden automatisch gepaart). Rein + Speicher, damit
// Oberfläche und Lotte (Werkzeug startseite_anpassen) gleich rechnen.
// Entfernen löscht nie etwas.

import { createLocalStore } from "./localStore";
import { useExternalStore } from "./useExternalStore";

export type HomeTileId = "termine" | "aufgaben" | "essen" | "einkauf" | "kladde" | "notizen" | "morgen" | "vorrat" | "post";
export type TileSize = "kompakt" | "ausfuehrlich";
export type HomeTile = { id: HomeTileId; visible: boolean; size: TileSize };

export type TileWidth = "voll" | "halb";

/**
 * Alle Kacheln. `feature`: gehört zu einem Baustein (wird beim Hinzufügen
 * eingeschaltet); `soon`: gibt es noch nicht ("bald").
 */
export const HOME_TILES: { id: HomeTileId; label: string; hint: string; width: TileWidth; feature?: "vorrat"; soon?: boolean }[] = [
  { id: "termine", label: "Termine", hint: "Die nächsten drei von heute", width: "voll" },
  { id: "aufgaben", label: "Aufgaben", hint: "Was heute dran ist", width: "voll" },
  { id: "essen", label: "Essen", hint: "Gericht von heute", width: "halb" },
  { id: "einkauf", label: "Einkauf", hint: "Die Einkaufsliste", width: "halb" },
  { id: "kladde", label: "Kladde", hint: "Schnell was aufschreiben", width: "voll" },
  { id: "notizen", label: "Notizen", hint: "Angeheftete Notizen", width: "voll" },
  { id: "morgen", label: "Morgen", hint: "Vorschau ab 16 Uhr", width: "voll" },
  { id: "vorrat", label: "Vorrat", hint: "Kühlschrank, Tiefkühler, Schrank", width: "halb", feature: "vorrat" },
  { id: "post", label: "Post", hint: "Briefe und Rechnungen", width: "voll", soon: true },
];

export const tileMeta = (id: HomeTileId) => HOME_TILES.find((t) => t.id === id)!;

export const tileLabel = (id: HomeTileId) => HOME_TILES.find((t) => t.id === id)?.label ?? id;

export const DEFAULT_HOME: HomeTile[] = [
  { id: "termine", visible: true, size: "ausfuehrlich" },
  { id: "aufgaben", visible: true, size: "ausfuehrlich" },
  { id: "essen", visible: true, size: "kompakt" },
  { id: "einkauf", visible: true, size: "kompakt" },
  { id: "morgen", visible: true, size: "kompakt" },
  { id: "vorrat", visible: true, size: "kompakt" },
  // Standardmäßig nicht auf "Heute" (über "Startseite bearbeiten" hinzufügen)
  { id: "kladde", visible: false, size: "kompakt" },
  { id: "notizen", visible: false, size: "kompakt" },
  { id: "post", visible: false, size: "kompakt" },
];

/**
 * Sichtbare Kacheln in Reihen: halbe Kacheln direkt hintereinander stehen
 * nebeneinander, eine einzelne halbe nimmt die volle Breite.
 */
export function tileRows<T extends { id: HomeTileId }>(tiles: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < tiles.length; i++) {
    const a = tiles[i];
    const b = tiles[i + 1];
    if (b && tileMeta(a.id).width === "halb" && tileMeta(b.id).width === "halb") {
      rows.push([a, b]);
      i++;
    } else rows.push([a]);
  }
  return rows;
}

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
    case "zeigen": {
      // Kommt unten zu den sichtbaren Kacheln
      if (list[i].visible) return list;
      const shown = set({ visible: true });
      const [tile] = shown.splice(i, 1);
      const lastVisible = shown.map((t) => t.visible).lastIndexOf(true);
      shown.splice(lastVisible + 1, 0, tile);
      return shown;
    }
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
      return `${name} ist von der Startseite weg – unter „Startseite bearbeiten“ holst du es zurück.`;
    case "kompakt":
      return `${name} ist jetzt kompakt.`;
    case "ausfuehrlich":
      return `${name} ist jetzt ausführlich.`;
    default:
      return `${name} ist verschoben.`;
  }
}

type HomeStore = { version: 2; tiles: HomeTile[]; tipSeen: boolean };

/** v1 → v2: die Kachel "Termine & Aufgaben" wird zu "Termine" und "Aufgaben" (direkt dahinter) */
export function migrateHome(raw: unknown): HomeStore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { version?: number; tiles?: unknown; tipSeen?: unknown };
  if (r.version === 2) return { version: 2, tiles: sanitizeHome(r.tiles), tipSeen: r.tipSeen === true };
  if (r.version !== 1) return null;
  const old = Array.isArray(r.tiles) ? (r.tiles as HomeTile[]) : [];
  const at = old.findIndex((t) => t && t.id === "termine");
  const withTasks = at >= 0 && !old.some((t) => t?.id === "aufgaben") ? [...old.slice(0, at + 1), { id: "aufgaben" as const, visible: old[at].visible !== false, size: "ausfuehrlich" as const }, ...old.slice(at + 1)] : old;
  // Bisherige Nutzer kennen die Startseite schon – kein Hinweis mehr
  return { version: 2, tiles: sanitizeHome(withTasks), tipSeen: true };
}

const store = createLocalStore("wasgibts.startseite", migrateHome);

export function loadHomeTiles(): HomeTile[] {
  return store.load()?.tiles ?? DEFAULT_HOME;
}

export function saveHomeTiles(tiles: HomeTile[]) {
  store.save({ version: 2, tiles: sanitizeHome(tiles), tipSeen: store.load()?.tipSeen ?? false });
}

/** Einmaliger Hinweis "Halte die Startseite gedrückt …" */
export function useHomeTipSeen(): boolean | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data?.tipSeen ?? false);
}

export function markHomeTipSeen() {
  store.save({ version: 2, tiles: loadHomeTiles(), tipSeen: true });
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
