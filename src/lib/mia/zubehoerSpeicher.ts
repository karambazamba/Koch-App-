// Mias Zubehör merken (A-058, `wasgibts.miazubehoer` v1, pro Gerät, nicht in
// der Sicherung): die Tagesentscheidung „sonnig“ – damit Mia beim Neuladen
// gleich aussieht und nicht je Stunde springt – und wann die kurzen Momente
// zuletzt liefen (Abstände 30 Min bzw. 5 Min beim Antippen). Zeit nur über
// `now()`; die Regeln selbst stehen rein in `zubehoer.ts`.

import { readRaw, writeRaw } from "@/lib/core/localStore";
import { berlinTime, now } from "@/lib/core/now";
import { miaMoment, momentGemerkt, sonnigerTag, type MiaLage, type MiaMoment, type MiaZuletzt, type MomentAnlass } from "@/lib/mia/zubehoer";

type Speicher = { version: 1; sonnentag: { date: string; sonnig: boolean } | null; zuletzt: MiaZuletzt };

const KEY = "wasgibts.miazubehoer";
const LEER: Speicher = { version: 1, sonnentag: null, zuletzt: {} };
const zahl = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : undefined);

/** Gespeicherten Stand prüfen (unbekannt/defekt → leer) @public */
export function migrateZubehoer(raw: unknown): Speicher {
  if (!raw || typeof raw !== "object" || (raw as Speicher).version !== 1) return LEER;
  const r = raw as Partial<Speicher>;
  const t = r.sonnentag;
  const z = (r.zuletzt ?? {}) as Record<string, unknown>;
  const zuletzt: MiaZuletzt = {};
  for (const k of ["blaetter", "wackeln", "sonne"] as const) {
    const v = zahl(z[k]);
    if (v !== undefined) zuletzt[k] = v;
  }
  return { version: 1, sonnentag: t && typeof t.date === "string" && typeof t.sonnig === "boolean" ? { date: t.date, sonnig: t.sonnig } : null, zuletzt };
}

function laden(): Speicher {
  try {
    return migrateZubehoer(JSON.parse(readRaw(KEY) ?? "null"));
  } catch {
    return LEER;
  }
}

const speichern = (s: Speicher) => writeRaw(KEY, JSON.stringify(s));

type Stunde = Parameters<typeof sonnigerTag>[0][number];

/**
 * Heute ein sonniger Tag? Einmal am Tag aus den Stunden entschieden und
 * gemerkt; danach gilt die gemerkte Entscheidung den ganzen Tag. null = noch
 * keine Entscheidung möglich (keine Wetterdaten für heute).
 */
export function tagSonnig(hours: Stunde[]): boolean | null {
  const heute = berlinTime().iso;
  const s = laden();
  if (s.sonnentag?.date === heute) return s.sonnentag.sonnig;
  const sonnig = sonnigerTag(hours, heute);
  if (sonnig !== null) speichern({ ...s, sonnentag: { date: heute, sonnig } });
  return sonnig;
}

/** Kurzer Moment jetzt? Wenn ja, wird die Zeit gleich gemerkt (je Gerät) */
export function momentJetzt(lage: MiaLage, anlass: MomentAnlass, ruhig: boolean): MiaMoment | null {
  const s = laden();
  const nowMs = now().getTime();
  const m = miaMoment(lage, s.zuletzt, nowMs, { anlass, ruhig });
  if (m) speichern({ ...s, zuletzt: momentGemerkt(s.zuletzt, m, nowMs) });
  return m;
}
