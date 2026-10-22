// Sortieren: EINE Stelle für alle festen Reihenfolgen der App. Jede Liste
// nimmt hier ihre benannte Regel – nie ein eigenes `localeCompare`.
//
// Grundsätze:
// - Deutsche Sortierung (Umlaute richtig, Zahlen natürlich: „Tag 2“ vor „Tag 10“,
//   Groß/klein egal).
// - Stabil: Bei Gleichstand bleibt die Reihenfolge, wie sie hereinkommt – und
//   die Regeln enden immer mit der Erstellungszeit, damit nichts springt.
// - Leere Felder stehen hinten (außer eine Regel sagt etwas anderes).
// - Rein: keine Zeit, kein Speicher – nur vergleichen.

export type Cmp<T> = (a: T, b: T) => number;

const collator = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

/** Text vergleichen (deutsch, natürlich, ohne Groß/klein); leer zuletzt */
export function compareText(a?: string | null, b?: string | null): number {
  const x = (a ?? "").trim();
  const y = (b ?? "").trim();
  if (!x || !y) return Number(!x) - Number(!y);
  return collator.compare(x, y);
}

/** Stabil nach mehreren Regeln sortieren (neue Liste, die alte bleibt) */
export function sortBy<T>(list: readonly T[], ...rules: Cmp<T>[]): T[] {
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      for (const rule of rules) {
        const r = rule(a.item, b.item);
        if (r) return r;
      }
      return a.index - b.index;
    })
    .map((x) => x.item);
}

// --- Bausteine -------------------------------------------------------------------

/** Was `pred` erfüllt, kommt zuerst */
export const first = <T>(pred: (x: T) => unknown): Cmp<T> => (a, b) => Number(Boolean(pred(b))) - Number(Boolean(pred(a)));

/** Aufsteigend nach Schlüssel (ISO-Datum, Uhrzeit …); leer zuletzt */
const asc = <T>(key: (x: T) => string | null | undefined): Cmp<T> => (a, b) => {
  const x = key(a) || "";
  const y = key(b) || "";
  if (!x || !y) return Number(!x) - Number(!y);
  return x < y ? -1 : x > y ? 1 : 0;
};

/** Absteigend nach Schlüssel (neueste zuerst); leer zuletzt */
const desc = <T>(key: (x: T) => string | null | undefined): Cmp<T> => (a, b) => {
  const x = key(a) || "";
  const y = key(b) || "";
  if (!x || !y) return Number(!x) - Number(!y);
  return x < y ? 1 : x > y ? -1 : 0;
};

/** Zahl aufsteigend (fehlend zuletzt) */
export const ascNum = <T>(key: (x: T) => number | null | undefined): Cmp<T> => (a, b) => {
  const x = key(a);
  const y = key(b);
  if (x == null || y == null) return Number(x == null) - Number(y == null);
  return x - y;
};

/** Zahl absteigend (fehlend zuletzt) */
const descNum = <T>(key: (x: T) => number | null | undefined): Cmp<T> => (a, b) => {
  const x = key(a);
  const y = key(b);
  if (x == null || y == null) return Number(x == null) - Number(y == null);
  return y - x;
};

/** Regeln für eine andere Form benutzen (z. B. Notiz → { pinned, geaendert }) */
export const via = <T, U>(map: (x: T) => U, rules: readonly Cmp<U>[]): Cmp<T>[] => rules.map((rule) => (a, b) => rule(map(a), map(b)));

/** Nach Name (deutsch) */
export const byName = <T>(key: (x: T) => string | null | undefined): Cmp<T> => (a, b) => compareText(key(a), key(b));

// --- Termine und Aufgaben ---------------------------------------------------------

type Timed = { time: string | null; stamp: string };

/**
 * Innerhalb einer Gruppe: mit Uhrzeit nach Uhrzeit, ohne danach; sonst nach
 * Anlegen (älteste zuerst, neue landen hinten) – nie nach Alphabet.
 */
export const timeThenCreated: Cmp<Timed> = (a, b) => asc<Timed>((x) => x.time)(a, b) || asc<Timed>((x) => x.stamp)(a, b);

type TerminLike = { date: string; time: string | null; stamp: string };

/** Termine: Tag → ganztägig zuerst → Uhrzeit → Erstellungszeit */
export const TERMINE: Cmp<TerminLike>[] = [asc((t) => t.date), first((t) => t.time === null), asc((t) => t.time), asc((t) => t.stamp)];

// --- Einkauf ----------------------------------------------------------------------

/** Abteilungen in Laufweg-Reihenfolge (wie man durch den Laden geht) */
export const SECTION_WALK = ["obst-gemuese", "brot", "kuehlregal", "fleisch-fisch", "vorrat", "getraenke", "tiefkuehl", "sonstiges"] as const;

const sectionRank = (s: string) => {
  const i = (SECTION_WALK as readonly string[]).indexOf(s);
  return i < 0 ? SECTION_WALK.length : i;
};

type ShoppingLike = { section: string; name: string; manualId?: string; checked?: boolean; now?: boolean };

/**
 * Einkaufsliste: Abteilung im Laufweg → aus Rezepten nach Name → eigene in der
 * Reihenfolge, in der sie eingetragen wurden. (Jetzt mitnehmen, Für heute und
 * Abgehaktes trennt die Ansicht selbst.)
 */
export const SHOPPING: Cmp<ShoppingLike>[] = [
  ascNum((i) => sectionRank(i.section)),
  first((i) => !i.manualId),
  (a, b) => (!a.manualId && !b.manualId ? compareText(a.name, b.name) : 0),
];

/** Läden-Gruppen: meiste Sachen zuerst, dann Name; „Egal wo“ (ohne Laden) zuletzt */
export const SHOP_GROUPS: Cmp<{ shop: string | null; count: number }>[] = [first((g) => g.shop), descNum((g) => g.count), byName((g) => g.shop)];

/** Läden (Auswahl, Einstellungen): meistgenutzt → Name */
export const SHOPS: Cmp<{ name: string; uses: number }>[] = [descNum((s) => s.uses), byName((s) => s.name)];

// --- Vorrat -----------------------------------------------------------------------

/** Vorrat: Bald aufbrauchen → Ort (Kühlschrank, Tiefkühler, Schrank) → Name */
const PLACE_ORDER = ["kuehlschrank", "tiefkuehler", "schrank"];
export const PANTRY: Cmp<{ name: string; place?: string; soon?: boolean }>[] = [
  first((p) => p.soon),
  ascNum((p) => {
    const i = PLACE_ORDER.indexOf(p.place ?? "");
    return i < 0 ? PLACE_ORDER.length : i;
  }),
  byName((p) => p.name),
];

// --- Rezepte, Ideen ---------------------------------------------------------------

type RecipeLike = { title: string; favorite?: boolean; lastCookedAt?: string | null; cookedCount?: number; createdAt?: string };

/** Rezepte: Lieblinge → zuletzt gekocht → oft gekocht → Name */
export const RECIPES: Cmp<RecipeLike>[] = [first((r) => r.favorite), desc((r) => r.lastCookedAt), descNum((r) => r.cookedCount ?? 0), byName((r) => r.title), asc((r) => r.createdAt)];

/**
 * Wie gut passt ein Rezept zur Suche? 0 = Titel beginnt damit, 1 = ein Wort im
 * Titel beginnt damit, 2 = steht im Titel, 3 = in den Zutaten, -1 = gar nicht.
 */
export function searchRank(query: string, title: string, ingredients: readonly string[] = []): number {
  const q = query.trim().toLocaleLowerCase("de");
  if (!q) return 0;
  const t = title.toLocaleLowerCase("de");
  if (t.startsWith(q)) return 0;
  if (t.split(/[\s\-–&,]+/).some((w) => w.startsWith(q))) return 1;
  if (t.includes(q)) return 2;
  if (ingredients.some((i) => i.toLocaleLowerCase("de").includes(q))) return 3;
  return -1;
}

/** Ideen: Punkte → bei Gleichstand die schnellere zuerst */
export const IDEAS: Cmp<{ score: number; minutes: number | null }>[] = [descNum((i) => i.score), ascNum((i) => i.minutes)];

// --- Notizen, Pinnwand, Tipps -----------------------------------------------------

/** Notizen: angeheftet → zuletzt geändert */
export const NOTES: Cmp<{ pinned?: boolean; geaendert: string }>[] = [first((n) => n.pinned), desc((n) => n.geaendert)];

/** Pinnwand: angeheftet → neueste (Ungelesenes rutscht nie nach unten – es ist immer neu) */
export const PINS: Cmp<{ pinned?: boolean; at: string }>[] = [first((p) => p.pinned), desc((p) => p.at)];

/**
 * Tipps: Tag/Uhrzeit (Beginn) → Entfernung → Titel. Feste Regel aus v0.37:
 * KARAMBA nie bevorzugt – nur bei genau gleicher Uhrzeit zuerst.
 */
export const TIPS: Cmp<{ beginn: string; km?: number; titel: string; karamba?: boolean }>[] = [
  asc((t) => t.beginn),
  first((t) => t.karamba),
  ascNum((t) => t.km),
  byName((t) => t.titel),
];

// --- Startseite ------------------------------------------------------------------

/** Kachel-Auswahl: „Neu“ oben, sonst Standard-Reihenfolge (springt beim Antippen nicht) */
export const TILE_PICKER: Cmp<{ fresh?: boolean }>[] = [first((t) => t.fresh)];

// --- Personen ---------------------------------------------------------------------

type PersonLike = { name: string; role?: string; age?: number | null; ageGroup?: string };

const AGE_GROUP = ["schulkind", "kitakind", "kleinkind"];

/**
 * Personen (nur Anzeige – `persons[0]` bleibt „ich“): Erwachsene → Kinder nach
 * Alter (älteste zuerst) → Name.
 */
export const PERSONS: Cmp<PersonLike>[] = [
  first((p) => p.role !== "kind"),
  descNum((p) => p.age),
  ascNum((p) => (p.role === "kind" && p.ageGroup ? AGE_GROUP.indexOf(p.ageGroup) : null)),
  byName((p) => p.name),
];
