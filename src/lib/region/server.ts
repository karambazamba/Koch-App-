// „Was los?“ – nur auf dem Server. Not-Schalter REGION_TIPPS_QUELLE (Vercel):
// „aus“ = kein Abruf, die App zeigt nichts (Kreis und Hinweise verschwinden
// still); sonst Kreis Ostholstein. Beispieldaten nur im Testbetrieb
// (REGION_TIPPS_QUELLE=demo oder TIPS_SOURCE=demo, nie mit
// VERCEL_ENV=production). Speicher: Supabase-Tabelle `region_events` – lesen
// mit dem öffentlichen Schlüssel (RLS: nur SELECT), schreiben nur mit dem
// geheimen Schlüssel aus Vercel. Geheimnisse nie im Code, nie im Log.

import { addDays, nowIso } from "@/lib/core/now";
import { supabasePublic } from "@/lib/konten/serverEnv";
import { demoEvents } from "@/lib/region/demo";
import { holeKreisOh, kreisHolen, type AbrufErgebnis, type Holer } from "@/lib/region/kreisOh/abruf";
import { letzterTag, sanitizeEvent, TAGE_VORAUS, type RegionEvent, type RegionQuelle } from "@/lib/region/model";
import { gesperrteIds } from "@/lib/region/sperrliste";

/** Welche Quelle gilt? */
export function regionQuelle(env: Record<string, string | undefined> = process.env): RegionQuelle {
  const v = (env.REGION_TIPPS_QUELLE ?? "an").trim().toLowerCase();
  if (["aus", "off", "0", "nein", "false"].includes(v)) return "aus";
  const testbetrieb = env.VERCEL_ENV !== "production";
  if (testbetrieb && (v === "demo" || (env.TIPS_SOURCE ?? "").trim().toLowerCase() === "demo")) return "demo";
  return "kreisoh";
}

/** Letzter Lauf des täglichen Abrufs (für „Für Entwickler“) */
export type RegionStatus = { lauf: string; treffer: number; grund: string };

export interface RegionSpeicher {
  lesen(von: string, bis: string): Promise<RegionEvent[] | null>;
  schreiben(events: RegionEvent[]): Promise<boolean>;
  /** Abgelaufenes (letzter Tag vor heute) und Gesperrtes löschen */
  aufraeumen(heute: string, gesperrt: string[]): Promise<boolean>;
  leseStatus(): Promise<RegionStatus | null>;
  schreibeStatus(s: RegionStatus): Promise<boolean>;
}

const SPALTEN = "id,quelle,titel,datum,bis_datum,beginn,ende,ganztags,ort,gemeinde,link,kategorien";

/**
 * Supabase über REST; null = nicht eingerichtet. `geheim` = geheimer Schlüssel
 * zum Schreiben – nur die Cron-Route reicht ihn herein (lesen geht ohne).
 */
export function supabaseSpeicher(geheim: string | null = null): RegionSpeicher | null {
  const pub = supabasePublic();
  if (!pub) return null;
  const lesend = { apikey: pub.key, authorization: `Bearer ${pub.key}` };
  const schreibend = geheim ? { apikey: geheim, authorization: `Bearer ${geheim}`, "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" } : null;
  const rest = `${pub.url}/rest/v1`;
  return {
    async lesen(von, bis) {
      const res = await fetch(`${rest}/region_events?select=${SPALTEN}&letzter_tag=gte.${von}&datum=lte.${bis}&order=datum.asc&limit=1000`, { headers: lesend, cache: "no-store" });
      if (!res.ok) return null;
      return ((await res.json()) as unknown[]).map(sanitizeEvent).filter((e): e is RegionEvent => e !== null);
    },
    async schreiben(events) {
      if (!schreibend || !events.length) return Boolean(schreibend);
      const stamp = nowIso();
      const rows = events.map((e) => ({ ...e, letzter_tag: letzterTag(e), aktualisiert: stamp }));
      const res = await fetch(`${rest}/region_events?on_conflict=id`, { method: "POST", headers: schreibend, body: JSON.stringify(rows) });
      return res.ok;
    },
    async aufraeumen(heute, gesperrt) {
      if (!schreibend) return false;
      const alt = await fetch(`${rest}/region_events?letzter_tag=lt.${heute}`, { method: "DELETE", headers: schreibend });
      const ids = gesperrt.filter((id) => /^[\w.-]+$/.test(id));
      const weg = ids.length ? await fetch(`${rest}/region_events?id=in.(${ids.map((i) => `"${i}"`).join(",")})`, { method: "DELETE", headers: schreibend }) : null;
      return alt.ok && (!weg || weg.ok);
    },
    async leseStatus() {
      const res = await fetch(`${rest}/region_status?id=eq.1&select=lauf,treffer,grund`, { headers: lesend, cache: "no-store" });
      if (!res.ok) return null;
      const [row] = (await res.json()) as RegionStatus[];
      return row ?? null;
    },
    async schreibeStatus(s) {
      if (!schreibend) return false;
      const res = await fetch(`${rest}/region_status?on_conflict=id`, { method: "POST", headers: schreibend, body: JSON.stringify([{ id: 1, ...s }]) });
      return res.ok;
    },
  };
}

export type LaufErgebnis = { quelle: RegionQuelle; treffer: number; geschrieben: boolean; grund: AbrufErgebnis["grund"] | "aus" | "demo" | "ohne-speicher"; seiten: number };

/**
 * Täglicher Lauf (5:00 Berlin): heute bis +14 Tage holen und schreiben,
 * Abgelaufenes und Gesperrtes löschen. 0 Treffer oder Fehler: vorhandene
 * Daten bleiben bis zu ihrem Ablauf, der Status sagt „Quelle liefert nichts“.
 * Beispieldaten werden nie gespeichert.
 */
export async function aktualisiereRegion(o: { quelle: RegionQuelle; heute: string; speicher: RegionSpeicher | null; holen?: Holer; gesperrt?: Set<string>; abrufen?: (heute: string, bis: string) => Promise<AbrufErgebnis> }): Promise<LaufErgebnis> {
  if (o.quelle === "aus") return { quelle: "aus", treffer: 0, geschrieben: false, grund: "aus", seiten: 0 };
  if (o.quelle === "demo") return { quelle: "demo", treffer: demoEvents(o.heute).length, geschrieben: false, grund: "demo", seiten: 0 };
  if (!o.speicher) return { quelle: o.quelle, treffer: 0, geschrieben: false, grund: "ohne-speicher", seiten: 0 };
  const gesperrt = o.gesperrt ?? gesperrteIds();
  const bis = addDays(o.heute, TAGE_VORAUS);
  const abruf = await (o.abrufen ? o.abrufen(o.heute, bis) : holeKreisOh({ heute: o.heute, bis, holen: o.holen ?? kreisHolen }));
  const events = abruf.events.filter((e) => !gesperrt.has(e.id));
  const geschrieben = events.length ? await o.speicher.schreiben(events) : false;
  await o.speicher.aufraeumen(o.heute, [...gesperrt]);
  await o.speicher.schreibeStatus({ lauf: nowIso(), treffer: events.length, grund: events.length ? "ok" : abruf.grund });
  return { quelle: o.quelle, treffer: events.length, geschrieben, grund: events.length ? "ok" : abruf.grund, seiten: abruf.seiten };
}

/** Noch kein echter Lauf (frisch ausgeliefert oder vor dem fertigen Parser): Status fehlt oder „wartet“ */
export const nochNieGelaufen = (s: RegionStatus | null) => !s || s.grund === "wartet";

/**
 * Erster Lauf gleich nach der Auslieferung statt erst um 5:00: nur wenn noch
 * nie echt abgerufen wurde. Schreibt zuerst „laeuft“, damit es nur einmal
 * passiert (die App fragt oft). `speicher` mit Schreibrecht reicht die Route
 * herein. Liefert, ob gelaufen.
 */
export async function ersterLauf(heute: string, o: { quelle?: RegionQuelle; speicher: RegionSpeicher | null; holen?: Holer }): Promise<boolean> {
  const quelle = o.quelle ?? regionQuelle();
  if (quelle !== "kreisoh") return false;
  const { speicher } = o;
  if (!speicher || !nochNieGelaufen(await speicher.leseStatus())) return false;
  if (!(await speicher.schreibeStatus({ lauf: nowIso(), treffer: 0, grund: "laeuft" }))) return false;
  await aktualisiereRegion({ quelle, heute, speicher, holen: o.holen });
  cache.clear();
  return true;
}

export type RegionAntwort = { quelle: RegionQuelle; events: RegionEvent[]; status: RegionStatus | null };

const STUNDE = 60 * 60 * 1000;
const cache = new Map<string, { at: number; antwort: RegionAntwort }>();

/** Für die App: heute bis +14 Tage (1 Stunde zwischengespeichert) */
export async function ladeRegion(heute: string, o: { quelle?: RegionQuelle; speicher?: RegionSpeicher | null; jetzt?: number } = {}): Promise<RegionAntwort> {
  const quelle = o.quelle ?? regionQuelle();
  if (quelle === "aus") return { quelle, events: [], status: null };
  if (quelle === "demo") return { quelle, events: demoEvents(heute), status: { lauf: `${heute}T03:00:00.000Z`, treffer: demoEvents(heute).length, grund: "demo" } };
  const jetzt = o.jetzt ?? Date.now();
  const hit = cache.get(heute);
  if (hit && jetzt - hit.at < STUNDE) return hit.antwort;
  const speicher = o.speicher === undefined ? supabaseSpeicher() : o.speicher;
  if (!speicher) return { quelle, events: [], status: null };
  const gesperrt = gesperrteIds();
  const [events, status] = await Promise.all([speicher.lesen(heute, addDays(heute, TAGE_VORAUS)), speicher.leseStatus()]);
  const antwort: RegionAntwort = { quelle, events: (events ?? []).filter((e) => !gesperrt.has(e.id)), status };
  // Nur Gelesenes merken (bei einem Fehler beim nächsten Mal neu versuchen)
  if (events) {
    cache.set(heute, { at: jetzt, antwort });
    if (cache.size > 5) cache.delete(cache.keys().next().value!);
  }
  return antwort;
}
