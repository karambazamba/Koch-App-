// Regel-Notlösung ohne KI für mehrere Sachen in einem Satz (A-056):
// „Aufgabe heute: Maler kommt und Bank anrufen“ → zwei Aufgaben, „Termin
// morgen 10 Uhr Zahnarzt und danach Bank“ → Termin + Aufgabe. Wie bei Mia mit
// KI: sofort erledigt, je Eintrag eine Ergebnis-Karte (A-037), EIN
// „Rückgängig“ nimmt alle zurück – auch in „Mia hat schon …“. Geht es nicht
// eindeutig, macht die Regel nichts (dann merkt Mia es sich und holt es nach).

import { mehrereOhneKi } from "@/lib/begleitung/aufteilen";
import { commitOps } from "@/lib/begleitung/client";
import { ergebnisse } from "@/lib/begleitung/ergebnis";
import { noteMiaDone } from "@/lib/begleitung/miaDone";
import { now } from "@/lib/core/now";
import { shopRulesForMia } from "@/lib/einkauf/shopRules";
import { DEFAULT_SHOPPING_DAY, planningWeekStart, toIsoDate } from "@/lib/essen/weekPlan";
import { gelernteRaeume } from "@/lib/kalender/raum/gedaechtnis";
import { loadCalendarEntries } from "@/lib/kalender/useCalendarEntries";
import type { RuleContext } from "@/components/begleitung/localRules";

/** true = erledigt (alle Einträge angelegt) */
export function mehrereRule(ctx: RuleContext, t: string): boolean {
  const { data, today } = ctx;
  if (!data || !today) return false;
  const r = mehrereOhneKi(t, {
    today: toIsoDate(today),
    nowMinutes: now().getHours() * 60 + now().getMinutes(),
    persons: data.profile.persons.map((p) => ({ id: p.id, name: p.name })),
    laeden: shopRulesForMia().meine,
    weekStart: planningWeekStart(today, data.profile.shoppingDay || DEFAULT_SHOPPING_DAY).weekStart,
    aufDerListe: [],
    entries: loadCalendarEntries(),
    gelernt: gelernteRaeume(),
  });
  if (!r) return false;
  const committed = commitOps(data, r.ops, new Set(r.ops.map((op) => op.id)), t);
  const undo = noteMiaDone(r.ops, committed.undo);
  const karten = ergebnisse(r.ops);
  ctx.setInput("");
  ctx.setChat((c) => ({
    ...c,
    turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text: r.reply, local: true, undo, quick: true, ...(karten.length ? { ergebnisse: karten } : {}) }],
  }));
  return true;
}
