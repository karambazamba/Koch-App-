// Jetzt-Karte (`wasgibts.jetzt` v1): an/aus (Standard an), die heute mit ✕
// ausgeblendeten Themen und das Interesse je Thema-Art – lokal und langsam
// gelernt: Antippen +1, Weiterwischen −0,5, Ausblenden −1,5 (begrenzt auf ±6).

import { createLocalStore } from "../core/localStore";
import { useExternalStore } from "../core/useExternalStore";
import type { JetztKind } from "./topics";

export type JetztState = { version: 1; on: boolean; day: string; hidden: string[]; weights: Partial<Record<JetztKind, number>> };

const EMPTY: JetztState = { version: 1, on: true, day: "", hidden: [], weights: {} };
const LIMIT = 6;

const store = createLocalStore("wasgibts.jetzt", (raw: unknown): JetztState | null => {
  if (!raw || typeof raw !== "object" || (raw as JetztState).version !== 1) return null;
  const d = raw as JetztState;
  const weights: JetztState["weights"] = {};
  if (d.weights && typeof d.weights === "object")
    for (const [k, v] of Object.entries(d.weights)) if (typeof v === "number" && Number.isFinite(v)) weights[k as JetztKind] = Math.max(-LIMIT, Math.min(LIMIT, v));
  return {
    version: 1,
    on: d.on !== false,
    day: typeof d.day === "string" ? d.day : "",
    hidden: Array.isArray(d.hidden) ? d.hidden.filter((x) => typeof x === "string") : [],
    weights,
  };
});

export const loadJetzt = (): JetztState => store.load() ?? EMPTY;

export function useJetzt(): JetztState {
  return useExternalStore(store.subscribe, loadJetzt, () => EMPTY);
}

/** Ausgeblendete Themen gelten nur heute */
export const hiddenToday = (s: JetztState, today: string) => (s.day === today ? s.hidden : []);

export function setJetztOn(on: boolean): () => void {
  const before = loadJetzt();
  store.save({ ...before, on });
  return () => store.save({ ...loadJetzt(), on: before.on });
}

const learn = (s: JetztState, kind: JetztKind, delta: number): JetztState["weights"] => ({ ...s.weights, [kind]: Math.max(-LIMIT, Math.min(LIMIT, (s.weights[kind] ?? 0) + delta)) });

/** Thema angetippt (mehr Interesse) */
export function noteJetztTap(kind: JetztKind) {
  const s = loadJetzt();
  store.save({ ...s, weights: learn(s, kind, 1) });
}

/** Weitergewischt (etwas weniger Interesse) */
export function noteJetztSkip(kind: JetztKind) {
  const s = loadJetzt();
  store.save({ ...s, weights: learn(s, kind, -0.5) });
}

/** ✕: Thema für heute ausblenden (weniger Interesse); gibt das Zurücknehmen zurück */
export function hideJetztTopic(id: string, kind: JetztKind, today: string): () => void {
  const before = loadJetzt();
  const hidden = before.day === today ? before.hidden : [];
  store.save({ ...before, day: today, hidden: [...new Set([...hidden, id])], weights: learn(before, kind, -1.5) });
  return () => store.save({ ...loadJetzt(), day: before.day, hidden: before.hidden, weights: before.weights });
}

/** "Ausgeblendete Themen zurücksetzen": nichts mehr ausgeblendet, Interesse von vorn */
export function resetJetztTopics() {
  store.save({ ...loadJetzt(), day: "", hidden: [], weights: {} });
}
