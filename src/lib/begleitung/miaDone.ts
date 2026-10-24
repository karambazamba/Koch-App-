// „Mia hat schon …“ (`wasgibts.mia.erledigt` v1): was Mia heute still selbst
// erledigt hat (Einkauf, Termin, Aufgabe, Pinnwand, Notiz, Im Haus). Steht
// oben in „Dein Tag“, jeder Punkt antippbar; „Rückgängig“ geht, solange die
// App offen ist (die Rücknahme lebt nur im Arbeitsspeicher). Ältere Tage
// fallen still weg. Auch Grundlage für Platz 12 („Familienmanagerin“).

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { now, todayIso } from "@/lib/core/now";
import type { ChangeOp } from "@/lib/begleitung/ops";

export type MiaDone = { id: string; text: string; href: string | null; day: string; at: number };
type DoneState = { version: 1; items: MiaDone[] };

const MAX = 20;

function migrateMiaDone(raw: unknown): DoneState | null {
  if (!raw || typeof raw !== "object" || (raw as DoneState).version !== 1) return null;
  const items = Array.isArray((raw as DoneState).items) ? (raw as DoneState).items : [];
  return { version: 1, items: items.filter((i): i is MiaDone => Boolean(i) && typeof i.id === "string" && typeof i.text === "string" && typeof i.day === "string") };
}

const store = createLocalStore("wasgibts.mia.erledigt", migrateMiaDone);
const undos = new Map<string, () => void>();

/**
 * Was Mia sofort selbst macht (ohne „Übernehmen“): kleine, sichere Dinge.
 * Große (Wochenplan, Rezept, Mail, Löschen) bleiben Vorschläge.
 */
const SAFE_OP_TYPES = new Set<ChangeOp["type"]>(["add_shopping", "add_pin", "add_pantry", "use_pantry", "add_wish", "done_entry"]);
export const isSafeOp = (op: ChangeOp) => SAFE_OP_TYPES.has(op.type) || ((op.type === "upsert_entry" || op.type === "upsert_note") && op.isNew);

/** Kurz, was passiert ist – und wo es steht */
function doneLine(op: ChangeOp): { text: string; href: string | null } | null {
  switch (op.type) {
    case "add_shopping":
      return { text: `${op.name} auf die Liste`, href: "/einkaufsliste" };
    case "add_pin":
      return { text: "Nachricht an die Pinnwand", href: "/pinnwand" };
    case "add_pantry":
      return { text: `${op.name} im Haus vermerkt`, href: "/vorrat" };
    case "use_pantry":
      return { text: `${op.name} ist alle`, href: "/vorrat" };
    case "add_wish":
      return { text: `Wunsch: ${op.dish}`, href: "/?seite=essen" };
    case "done_entry":
      return { text: `${op.title} abgehakt`, href: "/aufgaben" };
    case "upsert_entry":
      return { text: `${op.entry.data.title} eingetragen`, href: op.entry.typ === "termin" ? `/tag?datum=${op.entry.data.date}` : "/aufgaben" };
    case "upsert_note":
      return { text: `Notiz „${op.note.data.title}“`, href: "/notizen" };
    default:
      return null;
  }
}

/** Erledigtes merken (mit Rücknahme für diese Sitzung) */
export function noteMiaDone(ops: ChangeOp[], undo: () => void) {
  const day = todayIso();
  const lines = ops.map(doneLine).filter((l): l is { text: string; href: string | null } => l !== null);
  if (!lines.length) return;
  const at = now().getTime();
  const fresh = lines.map((l, i) => ({ id: `${at}-${i}`, ...l, day, at }));
  // Alle Zeilen einer Antwort teilen sich eine Rücknahme
  for (const f of fresh) undos.set(f.id, () => {
    undo();
    for (const g of fresh) undos.delete(g.id);
    store.save({ version: 1, items: (store.load()?.items ?? []).filter((x) => !fresh.some((g) => g.id === x.id)) });
  });
  const kept = (store.load()?.items ?? []).filter((x) => x.day === day);
  store.save({ version: 1, items: [...kept, ...fresh].slice(-MAX) });
}

/** Rücknahme eines Punkts (null = nicht mehr möglich, z. B. nach Neustart) */
export const miaDoneUndo = (id: string): (() => void) | null => undos.get(id) ?? null;

/** Heute Erledigtes (ohne React) @public */
export const miaDoneOn = (today: string): MiaDone[] => (store.load()?.items ?? []).filter((i) => i.day === today);

/** Heute Erledigtes */
export function useMiaDone(today: string | undefined): MiaDone[] {
  const s = useExternalStore(store.subscribe, store.load, () => null);
  return today ? (s?.items ?? []).filter((i) => i.day === today) : [];
}
