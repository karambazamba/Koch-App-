// Abgleich mit dem Haushalt (Etappe 3b) – die reine Logik, ohne Netz und ohne
// Browser (Speicher-Zugriff kommt von außen über `Io`, damit es testbar ist).
//
// - Erkennen: Jeder geteilte Speicher wird in Einträge zerlegt (docs.ts) und
//   mit dem zuletzt abgeglichenen Stand (`known`, Fingerabdruck je Eintrag)
//   verglichen. Neues/Geändertes bekommt einen Zeitstempel und kommt in die
//   Warteschlange; Verschwundenes wird als Löschen markiert (nie hart).
// - Anwenden: Änderungen anderer werden eingespielt, wenn sie neuer sind als
//   unser Stand (neueste Änderung je Eintrag gewinnt).
// - Übernahme: Beim ersten Mal mit einem Haushalt bleibt alles auf dem Gerät,
//   bis jemand „Mitnehmen“ tippt. Dann gewinnt, was schon im Haushalt liegt;
//   Neues vom Gerät kommt dazu, Listen-Einstellungen werden zusammengeführt.

import { ADAPTERS, adapterFor, countDocs, docHash, type Adapter, type CloudDoc, type LocalDoc } from "@/lib/konten/sync/docs";

/** Zuletzt abgeglichen: Speicher, Fingerabdruck, Zeit, Art, Raum (für das Löschen) */
type Known = { a: Adapter["name"]; h: string; g: string; t?: string; r?: "arbeit" | "ich"; del?: true };

export type SyncState = {
  version: 1;
  householdId: string | null;
  /** frage = auf dem Gerät liegt noch Eigenes, das (noch) nicht mitgenommen ist */
  takeover: "frage" | "fertig";
  /** Höchste schon geholte Nummer des Servers */
  cursor: number;
  known: Record<string, Known>;
  queue: CloudDoc[];
};

export interface Io {
  read(key: Adapter["key"]): Record<string, unknown> | null;
  write(key: Adapter["key"], value: Record<string, unknown>): void;
  /** Jetzt als ISO-Zeit */
  now(): string;
}

export const emptyState = (householdId: string | null = null): SyncState => ({ version: 1, householdId, takeover: "frage", cursor: 0, known: {}, queue: [] });

/** Gespeicherten Stand prüfen (kaputt/alt → neu anfangen, Daten auf dem Gerät bleiben ja) */
export function migrateSyncState(raw: unknown): SyncState | null {
  if (!raw || typeof raw !== "object" || (raw as SyncState).version !== 1) return null;
  const r = raw as SyncState;
  return {
    version: 1,
    householdId: typeof r.householdId === "string" ? r.householdId : null,
    takeover: r.takeover === "fertig" ? "fertig" : "frage",
    cursor: Number.isFinite(r.cursor) ? r.cursor : 0,
    known: r.known && typeof r.known === "object" ? r.known : {},
    queue: Array.isArray(r.queue) ? r.queue : [],
  };
}

const ms = (iso: string) => Date.parse(iso) || 0;

/** Speicher lesen – in der Version, die der Übersetzer kennt (ältere hebt `upgrade` an, ohne zu speichern) */
function readDocs(io: Io, a: Adapter): LocalDoc[] | null {
  const v = io.read(a.key);
  if (!v) return [];
  if (v.version === a.version) return a.toDocs(v);
  const up = a.upgrade?.(v);
  return up && up.version === a.version ? a.toDocs(up) : null;
}

/** Einen Zeitstempel, der sicher nach allem Bekannten liegt (Uhr des Geräts kann hinken) */
function stampAfter(io: Io, before?: string): string {
  const t = io.now();
  return before && ms(before) >= ms(t) ? new Date(ms(before) + 1).toISOString() : t;
}

const known = (a: Adapter, h: string, g: string, d: Pick<LocalDoc, "typ" | "raum">): Known => ({ a: a.name, h, g, t: d.typ, ...(d.raum === "arbeit" || d.raum === "ich" ? { r: d.raum } : {}) });

function enqueue(state: SyncState, doc: CloudDoc): SyncState {
  return { ...state, queue: [...state.queue.filter((q) => q.id !== doc.id), doc] };
}

/** Lokale Änderungen erkennen und in die Warteschlange legen */
export function detectChanges(state: SyncState, io: Io): SyncState {
  if (state.takeover !== "fertig") return state;
  let next = state;
  for (const a of ADAPTERS) {
    const docs = readDocs(io, a);
    if (!docs) continue;
    const seen = new Set<string>();
    for (const d of docs) {
      seen.add(d.id);
      const h = docHash(d);
      const k = next.known[d.id];
      if (k && !k.del && k.h === h) continue;
      const g = stampAfter(io, k?.g);
      next = enqueue({ ...next, known: { ...next.known, [d.id]: known(a, h, g, d) } }, { ...d, erstellt: d.erstellt ?? g, geaendert: g, geloescht: false });
    }
    for (const [id, k] of Object.entries(next.known)) {
      if (k.a !== a.name || k.del || seen.has(id)) continue;
      const g = stampAfter(io, k.g);
      next = enqueue({ ...next, known: { ...next.known, [id]: { ...k, g, del: true } } }, { id, typ: k.t ?? a.typs[0], raum: k.r ?? "familie", besitzer: null, erstellt: g, geaendert: g, geloescht: true, data: {} });
    }
  }
  return next;
}

/** Gesendetes aus der Warteschlange nehmen (nur, wenn es seitdem nicht wieder geändert wurde) */
export function markSent(state: SyncState, sent: CloudDoc[]): SyncState {
  const done = new Map(sent.map((d) => [d.id, d.geaendert]));
  return { ...state, queue: state.queue.filter((q) => done.get(q.id) !== q.geaendert) };
}

// --- Änderungen anderer einspielen --------------------------------------------------

const asLocal = (d: CloudDoc): LocalDoc => ({ id: d.id, typ: d.typ, raum: d.raum, besitzer: d.besitzer, erstellt: d.erstellt, data: d.data });

const uniq = <T>(xs: T[], key: (x: T) => string = (x) => JSON.stringify(x)) => [...new Map(xs.map((x) => [key(x), x])).values()];
const objOf = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Bei der Übernahme: Listen-Einstellungen und Wochen-Häkchen zusammenführen statt überschreiben */
function mergeOnTakeover(typ: string, mine: unknown, theirs: unknown): unknown {
  const m = objOf(mine);
  const t = objOf(theirs);
  if (typ === "einkauf-einstellungen")
    return {
      products: { ...objOf(m.products), ...objOf(t.products) },
      itemShops: { ...objOf(m.itemShops), ...objOf(t.itemShops) },
      shops: uniq([...arr(t.shops), ...arr(m.shops)]),
      staples: uniq([...arr(t.staples), ...arr(m.staples)], (s) => String(objOf(s).id ?? JSON.stringify(s))),
    };
  if (typ === "einkauf-woche") return { ...m, ...t, checked: uniq([...arr(t.checked), ...arr(m.checked)]), have: uniq([...arr(t.have), ...arr(m.have)]) };
  return theirs;
}

/**
 * Herunter geladene Einträge einspielen. Neuer als unser Stand → übernehmen
 * (gelöscht → entfernen). Liefert den neuen Stand und, wie viele Einträge sich
 * auf dem Gerät geändert haben.
 */
export function applyRemote(state: SyncState, io: Io, docs: CloudDoc[]): { state: SyncState; changed: number } {
  let next: SyncState = { ...state, cursor: Math.max(state.cursor, ...docs.map((d) => d.rev ?? 0)) };
  let changed = 0;
  const byAdapter = new Map<Adapter, CloudDoc[]>();
  for (const d of docs) {
    const a = adapterFor(d.typ);
    if (!a) continue;
    const k = next.known[d.id];
    if (k && ms(k.g) >= ms(d.geaendert)) continue;
    const queued = next.queue.find((q) => q.id === d.id);
    if (queued && ms(queued.geaendert) >= ms(d.geaendert)) continue;
    byAdapter.set(a, [...(byAdapter.get(a) ?? []), d]);
  }
  for (const [a, incoming] of byAdapter) {
    const local = readDocs(io, a);
    if (!local) continue;
    const merged = new Map(local.map((d) => [d.id, d]));
    for (const d of incoming) {
      if (d.geloescht) merged.delete(d.id);
      else merged.set(d.id, asLocal(d));
    }
    const value = a.fromDocs([...merged.values()], io.read(a.key));
    io.write(a.key, value);
    // Fingerabdruck aus dem, was jetzt wirklich im Speicher steht
    const after = new Map(a.toDocs(value).map((d) => [d.id, d]));
    const knownNext = { ...next.known };
    for (const d of incoming) {
      const now = after.get(d.id);
      knownNext[d.id] = d.geloescht || !now ? { a: a.name, h: "", g: d.geaendert, t: d.typ, del: true } : known(a, docHash(now), d.geaendert, now);
    }
    next = { ...next, known: knownNext, queue: next.queue.filter((q) => !incoming.some((d) => d.id === q.id && ms(d.geaendert) >= ms(q.geaendert))) };
    changed += incoming.length;
  }
  return { state: next, changed };
}

// --- Übernahme ------------------------------------------------------------------

/** Was auf dem Gerät liegt und mitgenommen würde (für die Vorschau) */
export function localCounts(io: Io): Record<string, number> {
  return countDocs(ADAPTERS.flatMap((a) => readDocs(io, a) ?? []));
}

/**
 * „Mitnehmen“: erst alles aus dem Haushalt (`remote`, komplett geladen)
 * einspielen – was es dort schon gibt, gewinnt –, dann alles Übrige vom Gerät
 * in die Warteschlange. Zweimal hintereinander ändert nichts mehr.
 */
export function takeOver(state: SyncState, io: Io, remote: CloudDoc[]): SyncState {
  if (state.takeover === "fertig") return state;
  const remoteById = new Map(remote.map((d) => [d.id, d]));
  const mineBefore = new Map(ADAPTERS.flatMap((a) => readDocs(io, a) ?? []).map((d) => [d.id, d]));
  let next = applyRemote({ ...state, known: {}, queue: [] }, io, remote).state;
  next = { ...next, takeover: "fertig" };
  // Zusammengeführtes (Listen-Einstellungen) wieder hochladen
  for (const [id, mine] of mineBefore) {
    const theirs = remoteById.get(id);
    if (!theirs || theirs.geloescht || (theirs.typ !== "einkauf-einstellungen" && theirs.typ !== "einkauf-woche")) continue;
    const a = adapterFor(theirs.typ);
    const docs = a && readDocs(io, a);
    if (!a || !docs) continue;
    const merged = docs.map((d) => (d.id === id ? { ...d, data: mergeOnTakeover(d.typ, mine.data, d.data) } : d));
    io.write(a.key, a.fromDocs(merged, io.read(a.key)));
  }
  return detectChanges(next, io);
}
