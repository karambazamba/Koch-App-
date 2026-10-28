// „Im Haus“ vergisst von selbst (Tafel 78/79, Punkt 5) – an EINER Stelle:
// - Jede Sorte hat eine „vermutlich noch da“-Zeit ab Eintrag. Danach
//   verschwindet der Eintrag still (kein Toast, keine Nachfrage).
// - In der ersten Hälfte gilt er als sicher da, danach nur „vermutlich“.
// - „Bald aufbrauchen“ = Frisches im letzten Drittel seiner Zeit, mit Schild
//   „heute“/„morgen“ (Orange) bzw. „bis Sa“ (Gelb) – nie rot.
// - Grundsachen (Salz, Pfeffer, Öl …) gelten immer als da und stehen nicht da.
// - Nur Lebensmittel kommen rein (Drogerie/Haushalt nicht).
// Rein: Datum rein, Werte raus.

import { sectionFor } from "@/lib/einkauf/sections";

/**
 * Wo es liegt – zugleich die Gruppe auf der Seite (Tafel 102): Kühlschrank,
 * Vorrat (intern `schrank`), Obst & Gemüse, Brot, Tiefkühl. Seit v4.
 */
export type PantryPlace = "kuehlschrank" | "schrank" | "obstgemuese" | "brot" | "tiefkuehler";

/** Sorte für die Haltbarkeit */
export type Sorte = "fleisch" | "frisch" | "knolle" | "trocken" | "tk";

/** „vermutlich noch da“ in Tagen ab Eintrag (änderbar nur hier) */
export const HALTBAR_TAGE: Record<Sorte, number> = { fleisch: 3, frisch: 7, knolle: 21, trocken: 42, tk: 90 };

/** Grundsachen: immer da, nie angezeigt */
export const GRUNDSACHEN =
  /^(salz|meersalz|pfeffer|öl|olivenöl|rapsöl|sonnenblumenöl|zucker|puderzucker|mehl|essig|balsamico|gewürze?|paprikapulver|currypulver|curry|muskat|oregano|thymian|zimt|backpulver|natron|lorbeer\w*|kreuzkümmel|chiliflocken|vanillezucker)$/i;

/** Kein Lebensmittel (Drogerie, Haushalt, Tier) – kommt nicht nach „Im Haus“ */
const NICHT_ESSEN =
  /(windel|feuchttücher|klopapier|toilettenpapier|küchenrolle|taschentücher|servietten|spülmittel|spültabs|tabs|klarspüler|waschmittel|weichspüler|putzmittel|schwamm|schwämme|müllbeutel|mülltüten|alufolie|frischhaltefolie|backpapier|gefrierbeutel|batterie|zahnpasta|zahnbürste|zahnseide|shampoo|spülung|duschgel|seife|deo|creme|pflaster|wattepads|rasierer|binden|tampons|katzenfutter|hundefutter|katzenstreu|kerzen|blumen|glühbirne)/i;

export const isFood = (name: string) => Boolean(name.trim()) && !NICHT_ESSEN.test(name);
export const isGrundsache = (name: string) => GRUNDSACHEN.test(name.trim());

const TK = /^(tk|tiefkühl)|(^|[\s-])tk([\s-]|$)|tiefgekühlt|gefroren|eiscreme|^eis$|fischstäbchen|tiefkühlpizza|tk-/i;
const KNOLLE = /(kartoffel|zwiebel|knoblauch|kürbis|süßkartoffel|ingwer)/i;
const TROCKEN = /(nudel|spaghetti|penne|fusilli|reis|linsen|bohnen aus der dose|konserve|dose|mehl|haferflocken|müsli|cornflakes|couscous|bulgur|quinoa|zucker|kaffee|tee|honig|marmelade|nutella|passata|tomatenmark|kokosmilch|brühe|chips|kekse|schokolade|knäckebrot|zwieback|nüsse|mandeln)/i;
const SCHRANK_FRISCH = /(apfel|äpfel|banane|tomate|zwiebel|kartoffel|knoblauch|kürbis)/i;
/** Brot und Gebäck (eigene Gruppe „Brot“) */
const BROT = /(brot|brötchen|toast|baguette|croissant|brezel|semmel|kuchen|torte|waffel)/i;

/** Naheliegender Ort; gemerkte Orte (`gemerkt`, Name klein → Ort) gehen vor */
export function placeFor(name: string, gemerkt: Record<string, PantryPlace> = {}): PantryPlace {
  const n = name.trim();
  const remembered = gemerkt[n.toLowerCase()];
  if (remembered) return remembered;
  if (TK.test(n)) return "tiefkuehler";
  const section = sectionFor(n);
  if (section === "tiefkuehl") return "tiefkuehler";
  if (section === "getraenke") return "schrank";
  if (section === "brot" || BROT.test(n)) return "brot";
  if (section === "vorrat") return "schrank";
  if (section === "obst-gemuese" || KNOLLE.test(n) || SCHRANK_FRISCH.test(n)) return "obstgemuese";
  if (TROCKEN.test(n)) return "schrank";
  return "kuehlschrank";
}

/** Sorte eines Eintrags (Tiefkühler zählt immer als TK) */
export function sorteFor(name: string, place: PantryPlace): Sorte {
  if (place === "tiefkuehler") return "tk";
  if (sectionFor(name) === "fleisch-fisch") return "fleisch";
  if (KNOLLE.test(name)) return "knolle";
  const section = sectionFor(name);
  if (TROCKEN.test(name) || section === "vorrat" || section === "getraenke") return "trocken";
  return "frisch";
}

const DAY = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);

type Dated = { name: string; place: PantryPlace; addedAt: string };

/** Wie lange etwas schon da ist (Tage); ohne Datum = gerade eben */
const ageOf = (item: Dated, today: string) => (/^\d{4}-\d{2}-\d{2}$/.test(item.addedAt) ? Math.max(0, daysBetween(item.addedAt, today)) : 0);

const lifeOf = (item: Pick<Dated, "name" | "place">) => HALTBAR_TAGE[sorteFor(item.name, item.place)];

/** Zeit abgelaufen → verschwindet still */
export const isGone = (item: Dated, today: string) => ageOf(item, today) > lifeOf(item);

/** In der zweiten Hälfte seiner Zeit: nur noch „vermutlich im Haus“ */
export const isUnsure = (item: Dated, today: string) => ageOf(item, today) * 2 > lifeOf(item);

/** Frisches (bis 7 Tage) im letzten Drittel seiner Zeit */
export function isSoon(item: Dated, today: string): boolean {
  const life = lifeOf(item);
  if (life > HALTBAR_TAGE.frisch || isGone(item, today)) return false;
  return ageOf(item, today) * 3 >= life * 2;
}

const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** Schild bei Frischem im letzten Drittel: „heute“/„morgen“ (orange), „bis Sa“ (gelb) */
export function soonBadge(item: Dated, today: string): { text: string; tone: "orange" | "gelb" } | null {
  if (!isSoon(item, today)) return null;
  const left = lifeOf(item) - ageOf(item, today);
  if (left <= 0) return { text: "heute", tone: "orange" };
  if (left === 1) return { text: "morgen", tone: "orange" };
  const until = new Date(Date.parse(`${today}T12:00:00Z`) + left * DAY);
  return { text: `bis ${WEEKDAY[until.getUTCDay()]}`, tone: "gelb" };
}

// --- Ein Eintrag (rein, auch für den Abgleich) ------------------------------

export type PantryItem = {
  id: string;
  name: string;
  /** Wann reingekommen, "YYYY-MM-DD" (daraus: vermutlich noch da?) */
  addedAt: string;
  place: PantryPlace;
  /** „Aufgebraucht“ angetippt (bleibt 3 Tage blass stehen) */
  usedAt?: string | null;
};

const PLACES: PantryPlace[] = ["kuehlschrank", "schrank", "obstgemuese", "brot", "tiefkuehler"];
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
/** „3 Karotten“ → „Karotten“, „½ Brot“ → „Brot“ (Mengen gibt es nur im Einkauf) */
export const withoutAmount = (name: string) => name.replace(/^[\d½¼¾.,/\s]+(?=\S)/, "").trim() || name.trim();

/** Ein Eintrag aus altem oder fremdem Stand (Mengen fallen weg) @public */
export function cleanPantryItem(raw: unknown): PantryItem | null {
  if (!raw || typeof raw !== "object") return null;
  const i = raw as Record<string, unknown>;
  if (typeof i.id !== "string" || typeof i.name !== "string" || !i.name.trim()) return null;
  const name = withoutAmount(i.name);
  return {
    id: i.id,
    name,
    addedAt: isDate(i.addedAt) ? i.addedAt : "",
    // Bis v1 ohne Ort → naheliegender Ort
    place: PLACES.includes(i.place as PantryPlace) ? (i.place as PantryPlace) : placeFor(name),
    usedAt: isDate(i.usedAt) ? i.usedAt : null,
  };
}

/** v4: ohne Mengen, „aufgebraucht“, gemerkte Orte je Sorte (Name klein → Ort), Gruppen Obst & Gemüse und Brot */
export type PantryStore = { version: 4; items: PantryItem[]; places: Record<string, PantryPlace> };

const cleanPlaces = (raw: unknown): Record<string, PantryPlace> =>
  Object.fromEntries(Object.entries(raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}).filter((e): e is [string, PantryPlace] => PLACES.includes(e[1] as PantryPlace)));

/**
 * v1 (ohne Ort), v2 (mit Mengen), v3 (Kühlschrank/Schrank/Tiefkühler) → v4.
 * Bis v3 lag Obst, Gemüse und Brot im Kühlschrank oder Schrank: es wandert in
 * die neuen Gruppen – außer jemand hat den Ort für die Sorte selbst gewählt.
 * @public
 */
export function migratePantry(raw: unknown): PantryStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; items?: unknown; places?: unknown };
  if (![1, 2, 3, 4].includes(data.version as number) || !Array.isArray(data.items)) return null;
  const places = cleanPlaces(data.places);
  const items = data.items.map(cleanPantryItem).filter((i): i is PantryItem => Boolean(i));
  const regroup = (i: PantryItem): PantryItem => {
    if (places[i.name.trim().toLowerCase()] || (i.place !== "kuehlschrank" && i.place !== "schrank")) return i;
    const next = placeFor(i.name);
    return next === "obstgemuese" || next === "brot" ? { ...i, place: next } : i;
  };
  return { version: 4, items: (data.version as number) < 4 ? items.map(regroup) : items, places };
}
