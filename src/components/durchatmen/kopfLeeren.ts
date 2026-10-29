"use client";

// „Kopf leeren“ (A-051): Mia sortiert in Aufgaben, Termine, Notizen (und
// Einkauf). KI zuerst: `[Kopf leeren] …` an die bestehende Begleitung, nur
// kleine, sichere Änderungen werden sofort übernommen (wie überall, mit
// „Rückgängig“ und „Mia hat schon …“). Ohne KI – oder wenn sie nichts
// Sicheres liefert – der Regel-Weg (`kopfLeerenOhneKi`).

import { aiUsable, askAssistant, commitOps } from "@/lib/begleitung/client";
import { isSafeOp, noteMiaDone } from "@/lib/begleitung/miaDone";
import type { AssistantData, ChangeOp } from "@/lib/begleitung/ops";
import { ergebnisse, type Ergebnis } from "@/lib/begleitung/ergebnis";
import { clockNow } from "@/lib/begleitung/localAnswers";
import { berlinTime, now } from "@/lib/core/now";
import { DEFAULT_SHOPPING_DAY, planningWeekStart, weekStartFor } from "@/lib/essen/weekPlan";
import { gelernteRaeume } from "@/lib/kalender/raum/gedaechtnis";
import { loadCalendarEntries } from "@/lib/kalender/useCalendarEntries";
import { shopRulesForMia } from "@/lib/einkauf/shopRules";
import { kopfLeerenOhneKi } from "@/lib/durchatmen/fokus";

/** Was „Kopf leeren“ sofort übernehmen darf */
const KOPF_OPS = new Set<ChangeOp["type"]>(["upsert_entry", "upsert_note", "add_shopping", "add_pin"]);

export async function kopfLeeren(text: string, data: AssistantData): Promise<{ karten: Ergebnis[]; undo: (() => void) | null }> {
  const heute = now();
  const today = berlinTime(heute).iso;
  const shoppingDay = data.profile.shoppingDay || DEFAULT_SHOPPING_DAY;
  let ops: ChangeOp[] = [];
  try {
    if (await aiUsable()) {
      const r = await askAssistant([{ role: "user", text: `[Kopf leeren] ${text}` }], [], data, today, weekStartFor(heute, shoppingDay), 0, { clock: clockNow() });
      ops = r.ops.filter((op) => KOPF_OPS.has(op.type) && isSafeOp(op));
    }
  } catch {
    ops = [];
  }
  if (!ops.length) {
    const { minutes } = berlinTime(heute);
    ops = kopfLeerenOhneKi(text, {
      today,
      nowMinutes: minutes,
      persons: data.profile.persons.map((p) => ({ id: p.id, name: p.name })),
      laeden: shopRulesForMia().meine,
      weekStart: planningWeekStart(heute, shoppingDay).weekStart,
      aufDerListe: [],
      entries: loadCalendarEntries(),
      gelernt: gelernteRaeume(),
    });
  }
  if (!ops.length) return { karten: [], undo: null };
  const committed = commitOps(data, ops, new Set(ops.map((op) => op.id)), text);
  noteMiaDone(ops, committed.undo);
  return { karten: ergebnisse(ops), undo: committed.undo };
}
