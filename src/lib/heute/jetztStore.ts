// Jetzt-Karte (`wasgibts.jetzt` v1): an/aus (Standard an) und die heute
// weggelegten Themen („Erledigt“, „Auf die Liste“, „Später“). Seit A-054
// gilt eine feste Rangliste – das früher gelernte Interesse je Thema-Art
// (`weights`) wird nicht mehr gelernt, nur noch gelesen (alte Sicherungen).
// `weekOff`: früher die Woche ohne „Kurzer Wochencheck?“ – seit A-054 steht
// der Wochencheck nicht mehr in der Karte (Mia: „Wochencheck“); das Feld wird
// nur noch gelesen, damit alte Daten und Sicherungen gültig bleiben.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

export type JetztState = { version: 1; on: boolean; day: string; hidden: string[]; weights: Partial<Record<string, number>>; weekOff?: string };

const EMPTY: JetztState = { version: 1, on: true, day: "", hidden: [], weights: {} };
const LIMIT = 6;

const store = createLocalStore("wasgibts.jetzt", (raw: unknown): JetztState | null => {
  if (!raw || typeof raw !== "object" || (raw as JetztState).version !== 1) return null;
  const d = raw as JetztState;
  const weights: JetztState["weights"] = {};
  if (d.weights && typeof d.weights === "object")
    for (const [k, v] of Object.entries(d.weights)) if (typeof v === "number" && Number.isFinite(v)) weights[k] = Math.max(-LIMIT, Math.min(LIMIT, v));
  return {
    version: 1,
    on: d.on !== false,
    day: typeof d.day === "string" ? d.day : "",
    hidden: Array.isArray(d.hidden) ? d.hidden.filter((x) => typeof x === "string") : [],
    weights,
    ...(typeof d.weekOff === "string" ? { weekOff: d.weekOff } : {}),
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

/** „Erledigt“, „Auf die Liste“ oder „Später“: Thema für heute weg */
export function doneJetztTopic(id: string, today: string) {
  const s = loadJetzt();
  const hidden = s.day === today ? s.hidden : [];
  store.save({ ...s, day: today, hidden: [...new Set([...hidden, id])] });
}

/** "Ausgeblendete Themen zurücksetzen": nichts mehr ausgeblendet, Interesse von vorn */
export function resetJetztTopics() {
  store.save({ ...loadJetzt(), day: "", hidden: [], weights: {} });
}
