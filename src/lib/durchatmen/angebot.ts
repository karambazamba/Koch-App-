// Leises Angebot „Kurz durchatmen?“ in der Jetzt-Karte (A-051) – rein:
// höchstens 2× am Tag (zwei verschiedene Anlässe), nie nachts (vor 7 und ab
// 21 Uhr), nie als Mitteilung, abschaltbar (Einstellungen → Durchatmen).
// Anlässe: drei Termine am Stück (Abstand höchstens 20 Min.) sind gerade
// vorbei (bis 90 Min. danach) oder das Nachmittagstief (14:30–16:30).
// Ein Anlass, der heute schon stand, darf weiter stehen (gleiche Karte).

/** Termin heute mit Uhrzeit (Minuten seit Mitternacht; ohne Ende zählt 1 Stunde) */
type AngebotTermin = { start: number; ende: number | null };

export type AngebotLage = {
  heute: string;
  minuten: number;
  /** Schalter in den Einstellungen */
  an: boolean;
  /** Was heute schon stand (`wasgibts.durchatmen` → angebote) */
  gezeigt: { tag: string; anlaesse: string[] };
  termine: AngebotTermin[];
};

const ANGEBOTE_PRO_TAG = 2;
const FRUEH = 7 * 60;
const SPAET = 21 * 60;
const LUECKE = 20;
const DANACH = 90;

/** Drei Termine am Stück, deren letzter gerade (bis 90 Min.) vorbei ist → Anlass „termine:<Ende>“ */
function nachTerminen(termine: AngebotTermin[], minuten: number): string | null {
  const liste = [...termine].sort((a, b) => a.start - b.start).map((t) => ({ start: t.start, ende: t.ende ?? t.start + 60 }));
  let kette = 0;
  let ende = -Infinity;
  let treffer: number | null = null;
  for (const t of liste) {
    kette = t.start - ende <= LUECKE ? kette + 1 : 1;
    ende = Math.max(ende, t.ende);
    if (kette >= 3 && ende <= minuten && minuten - ende <= DANACH) treffer = ende;
  }
  return treffer === null ? null : `termine:${treffer}`;
}

/** Anlass für ein Angebot jetzt – oder null */
export function durchatmenAngebot(l: AngebotLage): string | null {
  if (!l.an || l.minuten < FRUEH || l.minuten >= SPAET) return null;
  const heute = l.gezeigt.tag === l.heute ? l.gezeigt.anlaesse : [];
  const anlass = nachTerminen(l.termine, l.minuten) ?? (l.minuten >= 14 * 60 + 30 && l.minuten < 16 * 60 + 30 ? "nachmittag" : null);
  if (!anlass) return null;
  if (heute.includes(anlass)) return anlass;
  return heute.length < ANGEBOTE_PRO_TAG ? anlass : null;
}

/**
 * Fertiges Thema für die Jetzt-Karte (niedrige Priorität, leise) – so bleibt
 * die Karte selbst fast unberührt und lässt sich leicht auf eine neue
 * Rangliste übertragen (A-054). `detail` z. B. „1 Min · Handy-Pause“.
 */
export function durchatmenThema(anlass: string, heute: string, detail: string) {
  return { id: `durchatmen:${heute}:${anlass}`, kind: "durchatmen" as const, title: "Kurz durchatmen?", detail, score: 30, target: { action: "durchatmen" as const }, button: "Öffnen" as const };
}
