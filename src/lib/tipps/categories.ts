// Unsere Filter für Tipps und die Zuordnung der Kategorien aus der Quelle
// (Landesdatenbank) – hier anpassen, wenn die Quelle andere Namen liefert.
// Groß-/Kleinschreibung egal; ein Stichwort reicht ("Kinderkino" → kinder).

export type TipFilter = "kinder" | "regen" | "draussen" | "kostenlos" | "musik" | "maerkte" | "sport";

/** Filter-Chips auf /tipps (Reihenfolge = Anzeige) */
export const TIP_CHIPS: { id: TipFilter; label: string }[] = [
  { id: "kinder", label: "Für Kinder" },
  { id: "regen", label: "Bei Regen" },
  { id: "draussen", label: "Draußen" },
  { id: "kostenlos", label: "Kostenlos" },
  { id: "musik", label: "Musik" },
];

/** @public Kategorie-Stichwort der Quelle → unser Filter (Zuordnung zum Anpassen) */
export const CATEGORY_MAP: [RegExp, TipFilter][] = [
  [/kinder|familie|jugend|laterne|puppen/i, "kinder"],
  [/konzert|musik|chor|orgel|jazz|band/i, "musik"],
  [/markt|basar|flohmarkt|kunsthandwerk/i, "maerkte"],
  [/sport|lauf|wander|rad|schwimm|turnier|yoga/i, "sport"],
  [/kino|theater|museum|ausstellung|lesung|bibliothek|bücherei|workshop|basteln/i, "regen"],
  [/natur|wanderung|führung im freien|strand|park|open air/i, "draussen"],
];

type TipLike = { kategorien: string[]; fuer_kinder: boolean; drinnen: boolean | null; kostenlos: boolean };

/** Welche Filter passen zu einem Tipp */
export function filtersOf(t: TipLike): TipFilter[] {
  const set = new Set<TipFilter>();
  for (const k of t.kategorien) for (const [re, f] of CATEGORY_MAP) if (re.test(k)) set.add(f);
  if (t.fuer_kinder) set.add("kinder");
  if (t.drinnen === true) set.add("regen");
  if (t.drinnen === false) set.add("draussen");
  if (t.drinnen === true) set.delete("draussen");
  if (t.drinnen === false) set.delete("regen");
  if (t.kostenlos) set.add("kostenlos");
  return [...set];
}

const LABEL: Record<TipFilter, string> = { kinder: "Für Kinder", regen: "Drinnen", draussen: "Draußen", kostenlos: "Kostenlos", musik: "Musik", maerkte: "Markt", sport: "Sport" };

/** Etiketten für Zeile/Detail (höchstens `max`) */
export function tipTags(t: TipLike & { alter_ab?: number | null }, max = 3): string[] {
  const order: TipFilter[] = ["kinder", "kostenlos", "musik", "maerkte", "sport", "regen", "draussen"];
  const own = filtersOf(t);
  const tags = order.filter((f) => own.includes(f)).map((f) => LABEL[f]);
  if (t.alter_ab) tags.splice(1, 0, `ab ${t.alter_ab} J.`);
  return tags.slice(0, max);
}

/** Icon-Art eines Tipps (Linien-Icons, keine Emojis) */
export type TipIcon = "musik" | "markt" | "sport" | "kinder" | "ticket" | "natur" | "herz";

export function tipIcon(t: TipLike & { titel?: string }): TipIcon {
  const text = `${t.kategorien.join(" ")} ${t.titel ?? ""}`;
  if (/konzert|musik|chor|orgel/i.test(text)) return "musik";
  if (/markt|basar/i.test(text)) return "markt";
  if (/sport|lauf|schwimm|rad|yoga/i.test(text)) return "sport";
  if (/kino|theater|museum|ausstellung/i.test(text)) return "ticket";
  if (/natur|wander|park|strand|laterne/i.test(text)) return "natur";
  if (t.fuer_kinder) return "kinder";
  return "herz";
}
