// Ordnen an der Kühlschranktür (Tafel 123): Reihenfolge, Größe und die Ecke
// „Nur für mich“ – rein, damit Seite, Kachel, Mia und Tests gleich rechnen.
//
// - Reihenfolge: „Bleibt hängen“ (OBEN) steht vorn, sonst zählt der Platz
//   `sort` (kleiner = weiter vorn). Ohne `sort` zählt die Zeit: neueste vorn
//   (Schlüssel = −Sekunden seit 1970). So bleibt die bisherige Reihenfolge
//   alter Zettel ohne Umschreiben erhalten, und neue Zettel landen vorn.
// - Ziehen ändert nur den gezogenen Zettel: er bekommt einen Platz zwischen
//   seinen neuen Nachbarn (kein Umnummerieren aller – weniger Abgleich,
//   keine Streitfälle). „Nach oben“ = vor alle anderen seiner Gruppe.
// - Größe: klein = halbe Breite, groß = volle Breite; Standard klein.
// - „Nur für mich“ (`privat`) liegt unter einer gestrichelten Linie ganz
//   unten; im Haushalt „allein“ ohne Linie (dort ist eh alles privat).

import { ascNum, first, sortBy, via, type Cmp } from "@/lib/core/sort";
import { twoColumns, type DoorEntry, type Groesse } from "@/lib/pinnwand/tuer";

type Ordered = Pick<DoorEntry, "id" | "erstellt"> & { data: Pick<DoorEntry["data"], "pinned" | "sort"> };

const sec = (iso: string) => (Date.parse(iso) || 0) / 1000;

/** Platz an der Tür: `sort`, sonst nach der Zeit (neueste vorn) */
const orderKey = (e: Ordered) => (typeof e.data.sort === "number" ? e.data.sort : -sec(e.erstellt));

/** Gruppe an der Tür: „Bleibt hängen“ vorn, dann der Rest */
const groupOf = (e: Ordered) => (e.data.pinned ? 0 : 1);

/** Die Regel für die Tür (über `core/sort`): Bleibt hängen → Platz → ID (stabil) */
const TUER: Cmp<Ordered>[] = [first((e) => e.data.pinned), ascNum(orderKey)];

/** Reihenfolge an der Tür (Zettel und Sprachnachrichten gemischt: `of` liefert den Eintrag) */
export const doorOrderBy = <T>(items: readonly T[], of: (item: T) => Ordered): T[] => sortBy(items, ...via(of, TUER));

/** Reihenfolge an der Tür */
export const doorOrder = <T extends Ordered>(items: readonly T[]): T[] => doorOrderBy(items, (e) => e);

/**
 * Neuer Platz für `id`, wenn er in `ordered` (schon in Tür-Reihenfolge) an
 * Stelle `to` landen soll. Bleibt in seiner Gruppe („Bleibt hängen“ vorn);
 * Ziel außerhalb wird an den Rand der Gruppe gesetzt. null = nichts ändert sich.
 */
export function sortForMove<T extends Ordered>(ordered: readonly T[], id: string, to: number): number | null {
  const from = ordered.findIndex((e) => e.id === id);
  if (from < 0) return null;
  const moved = ordered[from];
  const rest = ordered.filter((e) => e.id !== id);
  const g = groupOf(moved);
  const start = rest.filter((e) => groupOf(e) < g).length;
  const end = start + rest.filter((e) => groupOf(e) === g).length;
  const at = Math.min(Math.max(to, start), end);
  if (at === from) return null;
  const before = at > start ? rest[at - 1] : null;
  const after = at < end ? rest[at] : null;
  if (!before && !after) return orderKey(moved);
  if (!before) return orderKey(after!) - 1;
  if (!after) return orderKey(before) + 1;
  return (orderKey(before) + orderKey(after)) / 2;
}

/** „Nach oben“: vor alle anderen seiner Gruppe (und vor alles, was bis jetzt geschrieben wurde) */
export function sortForTop<T extends Ordered>(items: readonly T[], id: string, nowMs: number): number | null {
  const me = items.find((e) => e.id === id);
  if (!me) return null;
  const keys = items.filter((e) => e.id !== id && groupOf(e) === groupOf(me)).map(orderKey);
  return Math.min(-nowMs / 1000, ...keys) - 1;
}

/** Liste nach einer Verschiebung (für die Vorschau beim Ziehen): `id` an Stelle `to` */
export function moveInList<T extends { id: string }>(list: readonly T[], id: string, to: number): T[] {
  const item = list.find((e) => e.id === id);
  if (!item) return [...list];
  const rest = list.filter((e) => e.id !== id);
  const at = Math.min(Math.max(0, to), rest.length);
  return [...rest.slice(0, at), item, ...rest.slice(at)];
}

/** Die Tür in zwei Bereiche: für alle oben, „Nur für mich“ unten (allein: alles in einem, ohne Linie) */
export function wandBereiche<T>(items: readonly T[], privatOf: (item: T) => boolean, allein: boolean): { alle: T[]; privat: T[] } {
  if (allein) return { alle: [...items], privat: [] };
  return { alle: items.filter((i) => !privatOf(i)), privat: items.filter(privatOf) };
}

/** Ein Abschnitt der Wand: zwei Spalten kleiner Zettel oder ein großer über die volle Breite */
export type WandBlock<T> = { art: "paar"; spalten: [T[], T[]] } | { art: "breit"; item: T };

/**
 * Wand in Abschnitte (Tafel 123 A): kleine Zettel füllen zwei Spalten (immer
 * in die kürzere), ein großer Zettel liegt quer über beide – davor wird
 * abgeschlossen, danach geht es wieder in zwei Spalten weiter.
 */
export function wandBlocks<T>(items: readonly T[], groesseOf: (item: T) => Groesse, heightOf: (item: T) => number): WandBlock<T>[] {
  const out: WandBlock<T>[] = [];
  let run: T[] = [];
  const flush = () => {
    if (run.length) out.push({ art: "paar", spalten: twoColumns(run, heightOf) });
    run = [];
  };
  for (const item of items) {
    if (groesseOf(item) === "gross") {
      flush();
      out.push({ art: "breit", item });
    } else run.push(item);
  }
  flush();
  return out;
}

/** Größe umschalten-Wert für den Schalter „Klein | Groß“ */
export const GROESSEN: readonly { value: Groesse; label: string }[] = [
  { value: "klein", label: "Klein" },
  { value: "gross", label: "Groß" },
];

/**
 * Titel des Fensters nach langem Drücken (Tafel 123 C): der Zettel in
 * Anführungszeichen, höchstens etwa 28 Zeichen – gekürzt nur zwischen Wörtern
 * („Samstag Omas Geburtstag. …“), nie mitten im Wort. Ohne Text: „Foto“.
 */
export function zettelTitel(text: string, max = 28): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "Foto";
  const words = t.split(" ");
  let out = words[0];
  for (const w of words.slice(1)) {
    if (`${out} ${w}`.length > max) break;
    out = `${out} ${w}`;
  }
  return `„${out}${out.length < t.length ? " …" : ""}“`;
}
