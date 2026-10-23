"use client";

// Abgleich im Browser (Etappe 3b): verbindet die reine Logik (engine.ts) mit
// den Speichern, dem Netz und Realtime. Läuft nur mit Haushalt; wird von
// `SyncRunner` erst bei Bedarf geladen.
//
// Ablauf: Speichern auf dem Gerät → kurz warten → Änderungen erkennen →
// hochladen → holen, was andere geändert haben. Ohne Netz bleibt alles in
// der Warteschlange (`wasgibts.abgleich`) und geht beim nächsten Mal mit.
// Sprachnachrichten (Etappe 3c): vor jedem Durchgang wird der Ton neuer Memos
// hochgeladen; erst dann wird das Memo geteilt. Fremde Töne holt
// `setMemoRemote` beim Abspielen. Abgelaufene Dateien räumt der Server
// (Cron) weg – und, falls der nicht läuft, einmal je Start die App.

import { createLocalStore, notifyStore, onLocalSave, readRaw, writeRaw } from "@/lib/core/localStore";
import { now, nowIso } from "@/lib/core/now";
import { getBackend, type CloudBackend } from "@/lib/konten/backend";
import { fail, ok, type Result } from "@/lib/konten/model";
import { ADAPTERS, takeoverSummary, type CloudDoc } from "@/lib/konten/sync/docs";
import { applyRemote, detectChanges, emptyState, localCounts, markSent, migrateSyncState, takeOver, type Io, type SyncState } from "@/lib/konten/sync/engine";
import { resetSyncStatus, setSyncStatus } from "@/lib/konten/sync/status";
import { expiredMemoFiles, uploadPendingMemos } from "@/lib/konten/memoShare";
import { memoAudio, setMemoRemote } from "@/lib/pinnwand/memoAudio";
import { changeMemos, loadMemos } from "@/lib/pinnwand/store";

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
    await shareMemos(run);
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

/** Ton neuer Memos hochladen, dann den Pfad am Memo vermerken (wird damit geteilt) */
async function shareMemos(run: Run) {
  await uploadPendingMemos({
    householdId: run.householdId,
    memos: loadMemos,
    load: (memo) => memoAudio.load(memo),
    upload: (path, blob) => run.backend.uploadMemo(path, blob),
    setPath: (id, path) => void changeMemos((list) => list.map((m) => (m.id === id ? { ...m, geaendert: nowIso(), data: { ...m.data, storagePath: path } } : m))),
  }).catch(() => 0);
}

/** Abgelaufene Ton-Dateien des Haushalts wegräumen (falls der Server-Cron nicht läuft) */
async function tidyMemoFiles(run: Run) {
  const files = await run.backend.listMemos(run.householdId).catch(() => null);
  if (!files?.ok) return;
  const old = expiredMemoFiles(files.value, now().getTime());
  if (old.length) await run.backend.removeMemos(old).catch(() => null);
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
  setMemoRemote((path) => run.backend.downloadMemo(path));
  void tidyMemoFiles(run);
  run.stop = () => {
    setMemoRemote(null);
    offSave();
    offWatch();
    window.clearInterval(every);
    window.clearTimeout(timer);
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
  };
  schedule(0);
}

let starting: { householdId: string; done: Promise<void> } | null = null;

/** Abgleich für diesen Haushalt starten (nochmal aufrufen schadet nicht) */
export function startSync(householdId: string): Promise<void> {
  if (starting?.householdId === householdId) return starting.done;
  const done = begin(householdId);
  starting = { householdId, done };
  return done;
}

/**
 * Wie startSync, aber ohne Frage mitnehmen – für den Ablauf „Anmelden“ von
 * der Begrüßung, der vorher sagt: „Was schon auf diesem Handy ist, nehmen wir mit.“
 */
export async function startSyncTakingOver(householdId: string): Promise<Result> {
  await startSync(householdId);
  if (current?.householdId !== householdId) return fail("Gerade keine Verbindung – gleich nochmal?");
  return load(householdId).takeover === "fertig" ? ok(true) : confirmTakeover();
}

async function begin(householdId: string): Promise<void> {
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

let confirming: Promise<Result> | null = null;

/** „Mitnehmen“: Haushalt laden, Eigenes dazulegen, ab jetzt abgleichen (doppelt tippen schadet nicht) */
export function confirmTakeover(): Promise<Result> {
  confirming ??= takeOverOnce().finally(() => {
    confirming = null;
  });
  return confirming;
}

async function takeOverOnce(): Promise<Result> {
  const run = current;
  if (!run) return fail("Gerade keine Verbindung – gleich nochmal?");
  if (load(run.householdId).takeover === "fertig") return ok(true);
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
  starting = null;
  resetSyncStatus();
}

/** Beim Abmelden: Stand des Abgleichs vergessen (die Daten selbst bleiben) */
export function forgetSync() {
  stopSync();
  writeRaw("wasgibts.abgleich", null);
}
