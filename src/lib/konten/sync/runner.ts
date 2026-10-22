"use client";

// Abgleich im Browser (Etappe 3b): verbindet die reine Logik (engine.ts) mit
// den Speichern, dem Netz und Realtime. Läuft nur mit Haushalt; wird von
// `SyncRunner` erst bei Bedarf geladen.
//
// Ablauf: Speichern auf dem Gerät → kurz warten → Änderungen erkennen →
// hochladen → holen, was andere geändert haben. Ohne Netz bleibt alles in
// der Warteschlange (`wasgibts.abgleich`) und geht beim nächsten Mal mit.

import { createLocalStore, notifyStore, onLocalSave, readRaw, writeRaw } from "@/lib/core/localStore";
import { now, nowIso } from "@/lib/core/now";
import { getBackend, type CloudBackend } from "@/lib/konten/backend";
import { fail, ok, type Result } from "@/lib/konten/model";
import { ADAPTERS, takeoverSummary, type CloudDoc } from "@/lib/konten/sync/docs";
import { applyRemote, detectChanges, emptyState, localCounts, markSent, migrateSyncState, takeOver, type Io, type SyncState } from "@/lib/konten/sync/engine";
import { resetSyncStatus, setSyncStatus } from "@/lib/konten/sync/status";

const stateStore = createLocalStore("wasgibts.abgleich", migrateSyncState);

const io: Io = {
  read: (key) => {
    try {
      const v = JSON.parse(readRaw(key) ?? "null") as unknown;
      return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  },
  write: (key, value) => {
    writeRaw(key, JSON.stringify(value));
    notifyStore(key);
  },
  now: nowIso,
};

const SYNCED = new Set<string>(ADAPTERS.map((a) => a.key));
const RETRY_MS = 15_000;
const FALLBACK_MS = 60_000;

type Run = { householdId: string; backend: CloudBackend; stop: () => void };
let current: Run | null = null;
let busy = false;
let again = false;
let timer: number | undefined;
let offlineSince: number | null = null;

const load = (householdId: string): SyncState => {
  const s = stateStore.load();
  return s && s.householdId === householdId ? s : emptyState(householdId);
};
const save = (s: SyncState) => {
  stateStore.save(s);
  setSyncStatus({ pending: s.queue.length });
};

function offline(failed: boolean) {
  if (failed) offlineSince ??= now().getTime();
  else offlineSince = null;
  setSyncStatus({ offlineSince });
}

/** Alles holen seit `cursor` (in Stücken) */
async function pullAll(backend: CloudBackend, cursor: number): Promise<CloudDoc[] | null> {
  const docs: CloudDoc[] = [];
  for (let since = cursor, i = 0; i < 40; i++) {
    const r = await backend.pullEntries(since);
    if (!r.ok) return null;
    docs.push(...r.value.docs);
    if (!r.value.more || !r.value.docs.length) break;
    since = Math.max(...r.value.docs.map((d) => d.rev ?? since));
  }
  return docs;
}

/** Ein Durchgang: erkennen, hochladen, holen (nie zwei gleichzeitig) */
async function cycle() {
  const run = current;
  if (!run) return;
  if (busy) {
    again = true;
    return;
  }
  busy = true;
  try {
    let s = detectChanges(load(run.householdId), io);
    save(s);
    let failed = false;
    if (s.queue.length) {
      const sending = s.queue;
      const r = await run.backend.pushEntries(sending);
      if (r.ok) s = markSent(s, sending);
      else failed = true;
    }
    if (!failed) {
      const docs = await pullAll(run.backend, s.cursor);
      if (docs) s = applyRemote(s, io, docs).state;
      else failed = true;
    }
    if (current === run) save(s);
    offline(failed);
    if (failed) schedule(RETRY_MS);
  } finally {
    busy = false;
    if (again) {
      again = false;
      schedule(300);
    }
  }
}

function schedule(ms: number) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void cycle(), ms);
}

function startLoop(run: Run) {
  const offSave = onLocalSave((key) => SYNCED.has(key) && schedule(700));
  const offWatch = run.backend.watchEntries(run.householdId, () => schedule(300));
  const onOnline = () => schedule(0);
  const onVisible = () => document.visibilityState === "visible" && schedule(0);
  const every = window.setInterval(() => schedule(0), FALLBACK_MS);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);
  run.stop = () => {
    offSave();
    offWatch();
    window.clearInterval(every);
    window.clearTimeout(timer);
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
  };
  schedule(0);
}

/** Abgleich für diesen Haushalt starten (nochmal aufrufen schadet nicht) */
export async function startSync(householdId: string): Promise<void> {
  if (current?.householdId === householdId) return;
  stopSync();
  const backend = await getBackend();
  if (!backend) return;
  const run: Run = { householdId, backend, stop: () => {} };
  current = run;
  const s = load(householdId);
  save(s);
  if (s.takeover === "fertig") {
    setSyncStatus({ phase: "bereit", summary: "" });
    return startLoop(run);
  }
  const summary = takeoverSummary(localCounts(io));
  if (summary) return setSyncStatus({ phase: "uebernahme", summary });
  // Nichts Eigenes auf dem Gerät → ohne Frage loslegen
  await confirmTakeover();
}

/** „Mitnehmen“: Haushalt laden, Eigenes dazulegen, ab jetzt abgleichen */
export async function confirmTakeover(): Promise<Result> {
  const run = current;
  if (!run) return fail("Gerade keine Verbindung – gleich nochmal?");
  const remote = await pullAll(run.backend, 0);
  if (!remote) {
    offline(true);
    return fail("Gerade keine Verbindung – gleich nochmal?");
  }
  const s = takeOver(load(run.householdId), io, remote);
  save(s);
  setSyncStatus({ phase: "bereit", summary: "" });
  startLoop(run);
  return ok(true);
}

export function stopSync() {
  current?.stop();
  current = null;
  resetSyncStatus();
}

/** Beim Abmelden: Stand des Abgleichs vergessen (die Daten selbst bleiben) */
export function forgetSync() {
  stopSync();
  writeRaw("wasgibts.abgleich", null);
}
