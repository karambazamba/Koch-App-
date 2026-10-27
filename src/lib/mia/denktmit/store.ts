// Mia denkt mit: was sie sich merkt (Speicher-Verzeichnis „wasgibts.miadenkt“).
// Wie gesprächig, welche Kachel schon vorgestellt (Später-Zähler), welche
// Seite schon besucht, Antworten auf Muster- und Mitdenken-Fragen (jede Frage
// nur einmal), Essens-Rituale, gezeigte Hinweise je Tag und die Sprüche der
// letzten 30 Tage. Alles einzeln löschbar („Was Mia sich merkt“).

import { addDays } from "@/lib/core/now";
import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import type { Gespraechig } from "@/lib/mia/denktmit/regeln";

type MusterAntwort = { antwort: "ja" | "nein"; satz: string; am: string };

/** Freitags gibt’s Pizza: fest einplanen (Wochentag 0 = Mo) */
export type Ritual = { weekday: number; title: string; recipeId?: string };

export type DenktState = {
  version: 1;
  level: Gespraechig;
  /** Kachel → wie oft „Später“, fertig (Zeig mal / benutzt) */
  vorgestellt: Record<string, { spaeter: number; fertig: boolean; zuletzt?: string }>;
  /** Seiten, auf denen die Erster-Besuch-Karte schon stand */
  besucht: string[];
  /** Muster- und Mitdenken-Fragen: Schlüssel → Antwort (nie zweimal fragen) */
  antworten: Record<string, MusterAntwort>;
  rituale: Ritual[];
  /** Tage, an denen ein Ritual schon eingeplant wurde (nicht wieder, wenn man es entfernt) */
  eingeplant: string[];
  /** Ungefragte Hinweise je Tag: welche standen (nur die letzten 7 Tage) */
  tage: Record<string, string[]>;
  /** Sprüche der letzten 30 Tage */
  sprueche: { text: string; date: string }[];
};

const LEVELS: Gespraechig[] = ["ruhig", "normal", "gespraechig"];

export const EMPTY_DENKT: DenktState = { version: 1, level: "normal", vorgestellt: {}, besucht: [], antworten: {}, rituale: [], eingeplant: [], tage: {}, sprueche: [] };

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Gespeichertes lesen; Unbekanntes fällt still weg, nichts geht verloren, was lesbar ist */
export function migrateDenkt(raw: unknown): DenktState | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  const vorgestellt: DenktState["vorgestellt"] = {};
  if (isObj(raw.vorgestellt))
    for (const [k, v] of Object.entries(raw.vorgestellt)) if (isObj(v)) vorgestellt[k] = { spaeter: typeof v.spaeter === "number" ? v.spaeter : 0, fertig: v.fertig === true, ...(typeof v.zuletzt === "string" ? { zuletzt: v.zuletzt } : {}) };
  const antworten: DenktState["antworten"] = {};
  if (isObj(raw.antworten))
    for (const [k, v] of Object.entries(raw.antworten))
      if (isObj(v) && (v.antwort === "ja" || v.antwort === "nein")) antworten[k] = { antwort: v.antwort, satz: typeof v.satz === "string" ? v.satz : "", am: typeof v.am === "string" ? v.am : "" };
  const rituale = Array.isArray(raw.rituale)
    ? raw.rituale.filter((r): r is Ritual => isObj(r) && typeof r.weekday === "number" && typeof r.title === "string").map((r) => ({ weekday: r.weekday, title: r.title, ...(typeof r.recipeId === "string" ? { recipeId: r.recipeId } : {}) }))
    : [];
  const tage: DenktState["tage"] = {};
  if (isObj(raw.tage)) for (const [k, v] of Object.entries(raw.tage)) tage[k] = strings(v);
  const sprueche = Array.isArray(raw.sprueche) ? raw.sprueche.filter((s): s is { text: string; date: string } => isObj(s) && typeof s.text === "string" && typeof s.date === "string") : [];
  return {
    version: 1,
    level: LEVELS.includes(raw.level as Gespraechig) ? (raw.level as Gespraechig) : "normal",
    vorgestellt,
    besucht: strings(raw.besucht),
    antworten,
    rituale,
    eingeplant: strings(raw.eingeplant),
    tage,
    sprueche: sprueche.map((s) => ({ text: s.text, date: s.date })),
  };
}

const store = createLocalStore("wasgibts.miadenkt", migrateDenkt);

export const loadDenkt = (): DenktState => store.load() ?? EMPTY_DENKT;

function change(fn: (s: DenktState) => DenktState) {
  store.save(fn(loadDenkt()));
}

export function useDenkt(): DenktState | undefined {
  return useExternalStore(store.subscribe, loadDenkt, () => undefined);
}

export const setGespraechig = (level: Gespraechig) => change((s) => ({ ...s, level }));

/** „Alles klar“, „Zeig mal“ oder benutzt: diese Kachel nie wieder vorstellen */
export const vorstellungFertig = (tile: string) => change((s) => ({ ...s, vorgestellt: { ...s.vorgestellt, [tile]: { ...(s.vorgestellt[tile] ?? { spaeter: 0 }), fertig: true } } }));

/** Erster Besuch einer Seite: Karte stand da (nie wieder) */
export const seiteBesucht = (seite: string) => change((s) => (s.besucht.includes(seite) ? s : { ...s, besucht: [...s.besucht, seite] }));

/** Frage beantwortet (Ja/Nein, Später zählt bei Mitdenken als Nein) */
export const antworten = (key: string, antwort: "ja" | "nein", satz: string, today: string) => change((s) => ({ ...s, antworten: { ...s.antworten, [key]: { antwort, satz, am: today } } }));

export const ritualMerken = (r: Ritual) => change((s) => ({ ...s, rituale: [...s.rituale.filter((x) => x.weekday !== r.weekday), r] }));

export const ritualEingeplant = (date: string) => change((s) => (s.eingeplant.includes(date) ? s : { ...s, eingeplant: [...s.eingeplant, date].slice(-30) }));

/** Ein ungefragter Hinweis stand heute (jeder zählt einmal; alte Tage fallen weg) */
export const hinweisGezaehlt = (key: string, today: string) =>
  change((s) => {
    if (s.tage[today]?.includes(key)) return s;
    const cut = addDays(today, -7);
    const tage = Object.fromEntries(Object.entries(s.tage).filter(([d]) => d > cut));
    return { ...s, tage: { ...tage, [today]: [...(tage[today] ?? []), key] } };
  });

/** Spruch für heute festhalten (einmal am Tag; älter als 30 Tage fällt weg) */
export const spruchGezeigt = (text: string, today: string) =>
  change((s) => {
    if (s.sprueche.some((x) => x.date === today)) return s;
    const cut = addDays(today, -30);
    return { ...s, sprueche: [...s.sprueche.filter((x) => x.date > cut), { text, date: today }] };
  });

/** „Was Mia sich merkt“: einen Eintrag vergessen */
export function vergessen(art: "antwort" | "ritual" | "vorgestellt", key: string) {
  change((s) => {
    if (art === "antwort") {
      const { [key]: _gone, ...rest } = s.antworten;
      void _gone;
      return { ...s, antworten: rest };
    }
    if (art === "ritual") return { ...s, rituale: s.rituale.filter((r) => String(r.weekday) !== key) };
    const { [key]: _v, ...rest } = s.vorgestellt;
    void _v;
    return { ...s, vorgestellt: rest };
  });
}
