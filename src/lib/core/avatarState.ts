// Zustand des Avatars der Begleitung – zentral, damit alle Avatare auf der
// Seite gleich reagieren. Die App setzt ihn selbst (nie der Nutzer):
// zuhoeren (Mikrofon an), sprechen (beim Vorlesen, nur während Worte kommen),
// denken (KI-Antwort lädt), verwirrt (statt Fehlermeldung, kurz), freuen (Lob),
// herzen (Danke: Herzchen-Augen + Herzen) und
// begruessen (einmalig), schlafen (Feierabend mit Ruhe), sonst ruhig.
// Vorlage der Animationen: docs/vorlagen/avatar-animation.md (CSS in globals.css).

import { readRaw, writeRaw } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import type { StorageKey } from "@/lib/core/storage";

export type AvatarZustand = "ruhig" | "begruessen" | "zuhoeren" | "denken" | "sprechen" | "freuen" | "herzen" | "verwirrt" | "schlafen";
type Laufend = "zuhoeren" | "denken" | "sprechen";
type Einmalig = "begruessen" | "freuen" | "herzen" | "verwirrt";

/** Dauer der einmaligen Zustände (Animation der Vorlage + kurzer Nachklang) */
const EINMALIG_MS: Record<Einmalig, number> = { begruessen: 1800, freuen: 1400, herzen: 1800, verwirrt: 3500 };

const counts: Record<Laufend, number> = { zuhoeren: 0, denken: 0, sprechen: 0 };
let shot: { zustand: Einmalig; nonce: number; until: number } | null = null;
let sleeping = false;
let awake = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let snapshot: { zustand: AvatarZustand; nonce: number } = { zustand: "ruhig", nonce: 0 };
const listeners = new Set<() => void>();

/** Rangfolge: zuhören > sprechen > denken > verwirrt > freuen/begrüßen > schlafen > ruhig */
function resolveZustand(s: { counts: Record<Laufend, number>; shot: Einmalig | null; sleeping: boolean }): AvatarZustand {
  if (s.counts.zuhoeren > 0) return "zuhoeren";
  if (s.counts.sprechen > 0) return "sprechen";
  if (s.counts.denken > 0) return "denken";
  if (s.shot) return s.shot;
  if (s.sleeping) return "schlafen";
  return "ruhig";
}

function emit() {
  const active = shot && shot.until > Date.now() ? shot : null;
  const zustand = resolveZustand({ counts, shot: active?.zustand ?? null, sleeping: sleeping && !awake });
  const nonce = active?.nonce ?? 0;
  if (zustand !== snapshot.zustand || nonce !== snapshot.nonce) snapshot = { zustand, nonce };
  listeners.forEach((l) => l());
}

/** Laufender Zustand an/aus (mehrere Quellen gleichzeitig möglich, z. B. zwei Mikrofone) */
export function setAvatarFlag(zustand: Laufend, on: boolean) {
  counts[zustand] = Math.max(0, counts[zustand] + (on ? 1 : -1));
  if (zustand === "zuhoeren" && on) awake = true;
  emit();
}

/** Einmaliger Zustand (begrüßen, freuen, verwirrt) – startet die Animation neu, danach zurück */
export function triggerAvatar(zustand: Einmalig) {
  shot = { zustand, nonce: Date.now(), until: Date.now() + EINMALIG_MS[zustand] };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    shot = null;
    emit();
  }, EINMALIG_MS[zustand]);
  emit();
}

/** Feierabend mit Ruhe: Avatar schläft (Antippen der Leiste weckt ihn bis zum nächsten Wechsel) */
export function setAvatarSleeping(on: boolean) {
  if (on === sleeping) return;
  sleeping = on;
  awake = false;
  emit();
}

/** Aufwecken (Leiste angetippt) */
export function wakeAvatar() {
  if (!sleeping || awake) return;
  awake = true;
  emit();
}

const GREET_KEY: StorageKey = "wasgibts.avatargruss";

/** Einmal am Tag beim ersten Öffnen begrüßen */
export function greetOncePerDay(today: string) {
  try {
    if (readRaw(GREET_KEY) === today) return false;
    writeRaw(GREET_KEY, today);
  } catch {
    return false;
  }
  triggerAvatar("begruessen");
  return true;
}

export function useAvatarZustand(): { zustand: AvatarZustand; nonce: number } {
  return useExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => ({ zustand: "ruhig" as AvatarZustand, nonce: 0 }),
  );
}

/** Nur für Tests: alles zurücksetzen @public */
export function resetAvatarForTests() {
  counts.zuhoeren = counts.denken = counts.sprechen = 0;
  shot = null;
  sleeping = awake = false;
  emit();
}
