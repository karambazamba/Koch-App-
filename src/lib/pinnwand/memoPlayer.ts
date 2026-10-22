// Abspielen der Sprachnachrichten: immer nur eins gleichzeitig. Der Ton wird
// vorab als Adresse bereitgelegt (`prepareMemo`, beim Anzeigen), damit
// `playMemo` direkt im Antippen startet – das iPhone spielt sonst nach einem
// Warten auf die Datenbank nicht ab. Zustand (welches, wie weit) für die
// Tonwelle über `subscribeMemoPlayer`/`memoPlayerState`.

import { memoAudio } from "@/lib/pinnwand/memoAudio";
import type { MemoMessage } from "@/lib/pinnwand/memo";

export type MemoPlayerState = { id: string | null; progress: number };

let state: MemoPlayerState = { id: null, progress: 0 };
const listeners = new Set<() => void>();
const urls = new Map<string, string>();
const loading = new Map<string, Promise<string | null>>();
let audio: HTMLAudioElement | null = null;
let frame = 0;

const set = (next: MemoPlayerState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const memoPlayerState = () => state;
export const memoPlayerIdle = (): MemoPlayerState => IDLE;
const IDLE: MemoPlayerState = { id: null, progress: 0 };

export function subscribeMemoPlayer(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Ton bereitlegen (Adresse aus dem Speicher) */
export function prepareMemo(memo: Pick<MemoMessage, "id" | "data">): Promise<string | null> {
  const ready = urls.get(memo.id);
  if (ready) return Promise.resolve(ready);
  let job = loading.get(memo.id);
  if (!job) {
    job = memoAudio.load(memo).then((blob) => {
      loading.delete(memo.id);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urls.set(memo.id, url);
      return url;
    });
    loading.set(memo.id, job);
  }
  return job;
}

export function stopMemo() {
  cancelAnimationFrame(frame);
  if (audio) {
    audio.pause();
    audio.onended = null;
    audio = null;
  }
  if (state.id) set(IDLE);
}

function start(id: string, url: string, onStart?: () => void): boolean {
  stopMemo();
  const el = new Audio(url);
  audio = el;
  set({ id, progress: 0 });
  const tick = () => {
    if (audio !== el) return;
    const total = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    if (total) set({ id, progress: Math.min(1, el.currentTime / total) });
    frame = requestAnimationFrame(tick);
  };
  el.onended = () => {
    if (audio !== el) return;
    cancelAnimationFrame(frame);
    audio = null;
    set({ id, progress: 1 });
    setTimeout(() => state.id === id && state.progress === 1 && set(IDLE), 400);
  };
  el.play().then(
    () => {
      onStart?.();
      frame = requestAnimationFrame(tick);
    },
    () => audio === el && stopMemo(),
  );
  return true;
}

/** Abspielen bzw. anhalten; liefert, ob es (wahrscheinlich) losging */
export function playMemo(memo: Pick<MemoMessage, "id" | "data">, onStart?: () => void): boolean {
  if (state.id === memo.id) {
    stopMemo();
    return false;
  }
  const url = urls.get(memo.id);
  if (url) return start(memo.id, url, onStart);
  // Noch nicht bereit: laden und dann versuchen (am Computer klappt das, am iPhone evtl. erst beim zweiten Tippen)
  void prepareMemo(memo).then((u) => u && start(memo.id, u, onStart));
  return true;
}

/** Bereitgelegte Adresse freigeben (Memo gelöscht) */
export function forgetMemo(id: string) {
  const url = urls.get(id);
  if (url) URL.revokeObjectURL(url);
  urls.delete(id);
}
