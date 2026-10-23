// Küchenhelfer: Vorschau eines Vorschlags – pro Änderung "vorher → nachher",
// gruppiert nach Tag. Gerechnet wird mit denselben Funktionen wie beim
// Übernehmen; abgewählte Änderungen zählen für spätere Zeilen nicht mit.

import type { RecipeCategory } from "@/lib/essen/cookbook";
import { MEAL_TIME_LABELS, personLabel } from "@/lib/einstellungen/profile";
import { SECTIONS } from "@/lib/einkauf/shoppingList";
import { REMINDERS, repeatLabel, weekdayShort, type CalendarEntry } from "@/lib/kalender/model";
import { clockLabel } from "@/lib/kalender/answers";
import { describeHomeChange, tileLabel } from "@/lib/core/homeLayout";
import { pauseLabel } from "@/lib/essen/spontan";
import { bausteinOf, type Feature } from "@/lib/core/features";
import { formatPantryItem, PANTRY_PLACES } from "@/lib/vorrat/pantry";
import { formatWeekRange, planForWeek } from "@/lib/essen/weekPlan";
import { sportById } from "@/lib/sport/model";
import { householdIntroSummary } from "@/lib/einstellungen/householdIntro";
import { berlinTime } from "@/lib/core/now";
import {
  applyOps,
  findSlot,
  selectedOps,
  weekOf,
  PLAN_RECIPE_PREFIX,
  type AssistantData,
  type ChangeOp,
  type NewRecipe,
} from "@/lib/begleitung/ops";

export type PreviewRow = {
  /** Kennung der Änderung (zum An-/Abwählen) */
  opId: string;
  /** Gruppe, z. B. "Do 22.10.", "Vorgaben 19.10. – 25.10.", "Einkaufsliste" */
  group: string;
  order: number;
  label: string;
  before: string | null;
  after: string;
  category?: RecipeCategory | null;
  newRecipe?: NewRecipe;
  /** Mehrere Zeilen (Vorgaben) */
  lines?: string[];
};

const dayDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
};

export function previewRows(data: AssistantData, ops: ChangeOp[], selected: Set<string>): PreviewRow[] {
  const effective = new Set(selectedOps(ops, selected).map((op) => op.id));
  const recipesByRef = Object.fromEntries(
    ops.flatMap((op) => (op.type === "add_recipe" ? [[op.recipe.ref, op.recipe] as const] : [])),
  );
  const weekStarts = [...new Set(ops.flatMap((op) => ("slot" in op ? [op.slot.weekStart] : "from" in op ? [op.from.weekStart] : "weekStart" in op ? [op.weekStart] : [])))].sort();
  const weekIndex = (ws: string) => Math.max(0, weekStarts.indexOf(ws));

  let state = data;
  let refs: Record<string, string> = {};
  const rows: PreviewRow[] = [];

  for (const op of ops) {
    const row = describe(state, op, recipesByRef, weekIndex);
    if (row) rows.push(row);
    if (effective.has(op.id)) {
      const next = applyOps(state, [op], { refs });
      state = next.data;
      refs = next.refs;
    }
  }
  return rows.sort((a, b) => a.order - b.order);
}

const dayToday = () => berlinTime().iso;

function describe(
  state: AssistantData,
  op: ChangeOp,
  recipesByRef: Record<string, NewRecipe>,
  weekIndex: (ws: string) => number,
): PreviewRow | null {
  /** Gruppe und Reihenfolge eines Tages */
  const place = (weekStart: string, weekday: string) => {
    const week = weekOf(state, weekStart);
    const index = week.days.findIndex((d) => d.weekday === weekday);
    const day = week.days[index];
    return {
      week,
      day,
      group: `${weekday.slice(0, 2)} ${day ? dayDate(day.date) : ""}`.trim(),
      order: weekIndex(weekStart) * 100 + Math.max(0, index),
      label: day ? `Hauptgericht · ${MEAL_TIME_LABELS[day.mealTime]}` : "Hauptgericht",
    };
  };

  switch (op.type) {
    case "set_meal":
    case "clear_slot": {
      const p = place(op.slot.weekStart, op.slot.weekday);
      const before = findSlot(p.week, op.slot.weekday)?.entry?.title ?? "frei";
      const after = op.type === "set_meal" ? `${op.dish.title}${op.double ? " (doppelt – Reste für morgen)" : ""}` : "frei";
      if (before === after && op.type === "clear_slot") return null;
      return {
        opId: op.id,
        group: p.group,
        order: p.order,
        label: p.label,
        before,
        after,
        category: op.type === "set_meal" ? op.dish.category : null,
        newRecipe: op.type === "set_meal" && op.dish.kind === "new_recipe" ? recipesByRef[op.dish.ref] : undefined,
      };
    }
    case "set_double": {
      const p = place(op.slot.weekStart, op.slot.weekday);
      const entry = findSlot(p.week, op.slot.weekday)?.entry;
      if (!entry || entry.double === op.double) return null;
      return {
        opId: op.id,
        group: p.group,
        order: p.order,
        label: p.label,
        before: null,
        after: op.double ? `${entry.title} doppelt kochen – Reste für morgen` : `${entry.title} nicht mehr doppelt kochen`,
        category: entry.category,
      };
    }
    case "move_meal": {
      const p = place(op.from.weekStart, op.from.weekday);
      const from = findSlot(p.week, op.from.weekday)?.entry;
      const to = findSlot(p.week, op.to.weekday)?.entry;
      if (!from) return null;
      return {
        opId: op.id,
        group: p.group,
        order: p.order,
        label: `verschieben → ${op.to.weekday}`,
        before: from.title,
        after: to ? `getauscht mit ${to.title}` : "verschoben",
        category: from.category,
      };
    }
    case "update_week": {
      const plan = planForWeek(state.weekPlans, op.weekStart);
      const keys = Object.keys(op.changes);
      // Nur ein Wunsch → beim Tag des Wunsches zeigen
      if (keys.length === 1 && op.changes.wish) {
        const wish = op.changes.wish;
        const p = place(op.weekStart, wish.weekday);
        const kid = state.profile.persons.find((x) => x.id === wish.kidId);
        return {
          opId: op.id,
          group: p.group,
          order: p.order,
          label: p.label,
          before: findSlot(p.week, wish.weekday)?.entry?.title ?? "frei",
          after: `${wish.text || "Wunsch"} – Wunsch von ${kid ? personLabel(kid, state.profile.persons) : "Kind"} 🎉`,
        };
      }
      const counts = weekOf(state, op.weekStart).counts;
      const c = op.changes;
      const lines: string[] = [];
      const num = (label: string, before: number, after?: number) => {
        if (after !== undefined && after !== before) lines.push(`${label}: ${before} → ${after}`);
      };
      num("Fleisch-Tage", counts.fleisch.target, c.meatDays);
      num("Veggie-Tage", counts.vegetarisch.target, c.vegetarianDays);
      num("Fisch-Tage", counts.fisch.target, c.fishDays);
      if (c.awayDays) lines.push(`Ausflugstage: ${(plan?.awayDays ?? []).join(", ") || "keine"} → ${c.awayDays.join(", ") || "keine"}`);
      if (c.cheatDay !== undefined || c.cheatDayWeekday !== undefined) {
        const on = c.cheatDay ?? plan?.cheatDay ?? state.profile.weekRules.cheatDay;
        const dayName = c.cheatDayWeekday ?? plan?.cheatDayWeekday ?? "";
        lines.push(`Cheat Day 🍕: ${on ? dayName || "an" : "aus"}`);
      }
      if (c.wish === null) lines.push("Wunsch entfernt");
      if (c.wish) {
        const kid = state.profile.persons.find((x) => x.id === c.wish!.kidId);
        const name = kid ? personLabel(kid, state.profile.persons) : "Kind";
        lines.push(`Wunsch 🎉: ${name} wünscht sich ${c.wish.text || "etwas"} (${c.wish.weekday})`);
      }
      if (lines.length === 0) return null;
      return {
        opId: op.id,
        group: `Vorgaben ${formatWeekRange(op.weekStart)}`,
        order: weekIndex(op.weekStart) * 100 - 1,
        label: "Wochen-Check",
        before: null,
        after: lines[0],
        lines,
      };
    }
    case "add_recipe":
      if (op.recipe.ref.startsWith(PLAN_RECIPE_PREFIX)) return null;
      return { opId: op.id, group: "Kochbuch", order: 10_000, label: "neues Rezept", before: null, after: op.recipe.title, category: op.recipe.category, newRecipe: op.recipe };
    case "add_shopping": {
      const section = SECTIONS.find((s) => s.value === op.section)?.label ?? "";
      const forWhat = [op.day ? `für ${op.day}` : "", op.dish ? `(${op.dish})` : "", op.shop ? `bei ${op.shop}` : ""].filter(Boolean).join(" ");
      return { opId: op.id, group: "Einkaufsliste", order: 20_000, label: section, before: null, after: [op.amount, op.name, forWhat].filter(Boolean).join(" ") };
    }
    case "remove_shopping":
      return { opId: op.id, group: "Einkaufsliste", order: 20_100, label: "von der Liste", before: op.names.join(", "), after: "weg" };
    case "clear_shopping":
      return { opId: op.id, group: "Einkaufsliste", order: 20_100, label: `Woche ${formatWeekRange(op.weekStart)}`, before: "alles", after: "Liste leer" };
    case "clear_week":
      return { opId: op.id, group: "Wochenplan", order: -1, label: formatWeekRange(op.weekStart), before: "alle Gerichte", after: "Woche wieder frei" };
    case "home":
      return { opId: op.id, group: "Startseite", order: 30_000, label: tileLabel(op.change.tile), before: null, after: describeHomeChange(op.change) };
    case "set_persons": {
      const p = place(op.slot.weekStart, op.slot.weekday);
      const entry = findSlot(p.week, op.slot.weekday)?.entry;
      if (!entry) return null;
      return { opId: op.id, group: p.group, order: p.order, label: "nur für diesen Tag", before: p.day?.persons ? `${p.day.persons} Personen` : null, after: `${entry.title} für ${op.persons ?? "alle"} Personen – Zutaten und Einkaufsliste passen sich an` };
    }
    case "set_pause":
      return {
        opId: op.id,
        group: "Pause",
        order: -3,
        label: op.pause ? "Urlaub / Pause" : "Pause",
        before: null,
        after: op.pause ? `${pauseLabel(op.pause)} – an diesen Tagen plane ich nichts` : "Pause beenden – alles wie gewohnt",
      };
    case "set_feature": {
      const b = bausteinOf(op.feature as Feature);
      return { opId: op.id, group: "Mehr Funktionen", order: 30_200, label: b?.name ?? op.feature, before: null, after: op.on ? `einschalten – ${b?.where ?? ""}` : "ausschalten (Daten bleiben)" };
    }
    case "app_command":
      return { opId: op.id, group: "In der App", order: 30_100, label: "ausführen", before: null, after: `„${op.text}“` };
    case "undo_last":
      return { opId: op.id, group: "Rückgängig", order: -2, label: "letzte Änderung", before: null, after: "zurücknehmen" };
    case "add_pantry": {
      const place = PANTRY_PLACES.find((p) => p.value === op.place);
      return { opId: op.id, group: "Vorrat", order: 21_000, label: place?.label ?? "Vorrat", before: null, after: formatPantryItem(op) };
    }
    case "add_wish":
      return { opId: op.id, group: "Wünsche", order: 22_000, label: `Wunsch von ${op.who}`, before: null, after: `${op.dish} 🎉 – ganz oben bei den Ideen` };
    case "upsert_entry": {
      const e = op.entry;
      const before = state.entries?.find((x) => x.id === e.id);
      const whenOf = (e: CalendarEntry) => e.typ === "termin" ? `${weekdayShort(e.data.date)} ${dayDate(e.data.date)} · ${clockLabel(e.data.start)}${e.data.end ? `–${clockLabel(e.data.end)}` : ""}` : e.data.due ? `bis ${weekdayShort(e.data.due)} ${dayDate(e.data.due)}` : e.data.date ? `${weekdayShort(e.data.date)} ${dayDate(e.data.date)}${e.data.time ? ` · ${clockLabel(e.data.time)}` : ""}` : "ohne Tag";
      const when = whenOf(e);
      const extra = [repeatLabel(e.data.repeat, e.typ === "termin" ? e.data.date : e.data.date), e.data.reminder !== "aus" ? `Erinnerung ${REMINDERS.find((r) => r.value === e.data.reminder)?.short ?? ""}` : "", e.raum === "arbeit" ? "Arbeit" : ""].filter(Boolean);
      return {
        opId: op.id,
        group: e.typ === "termin" ? "Termine" : "Aufgaben",
        order: e.typ === "termin" ? 23_000 : 23_500,
        label: op.isNew || !before ? when : e.data.title,
        before: !op.isNew && before ? whenOf(before) : null,
        after: op.isNew || !before ? [e.data.title, ...extra].join(" · ") : [when, ...extra].join(" · "),
      };
    }
    case "remove_entry":
      return { opId: op.id, group: "Termine & Aufgaben", order: 24_000, label: op.onlyDate ? `nur ${weekdayShort(op.onlyDate)} ${dayDate(op.onlyDate)}` : "löschen", before: op.title, after: "gelöscht" };
    case "done_entry":
      return { opId: op.id, group: "Termine & Aufgaben", order: 24_000, label: "abhaken", before: null, after: `${op.title} ✓ erledigt` };
    case "upsert_note": {
      const n = op.note.data;
      const content = n.kind === "liste" ? (n.items ?? []).slice(-3).map((i) => i.text).join(", ") : (n.text ?? "").slice(0, 80);
      return {
        opId: op.id,
        group: "Notizen",
        order: 25_000,
        label: `${n.emoji ?? ""} ${n.title}`.trim(),
        before: null,
        after: op.change ?? (op.isNew ? (n.kind === "liste" ? `neue Liste${content ? `: ${content}` : ""}` : `neu${content ? `: ${content}` : ""}`) : content || "geändert"),
      };
    }
    case "remove_note":
      return { opId: op.id, group: "Notizen", order: 25_000, label: "löschen", before: op.title, after: "gelöscht" };
    case "set_schnellnotiz":
      return { opId: op.id, group: "Schnellnotiz", order: 25_500, label: "✎ Schnellnotiz", before: null, after: op.change };
    case "add_pin":
      return { opId: op.id, group: "Pinnwand", order: 25_600, label: "📌 Pinnwand", before: null, after: op.text };
    case "set_helper": {
      const h = op.helper;
      const after = [h.name, h.art ? (h.art === "assistent" ? "Assistent · männliche Stimme" : "Assistentin · weibliche Stimme") : null].filter(Boolean).join(" · ");
      return { opId: op.id, group: "Begleitung", order: 25_650, label: "Ich", before: state.profile.helper.name, after };
    }
    case "set_household":
      return { opId: op.id, group: "Familie", order: 25_660, label: "Wer dazugehört", before: null, after: householdIntroSummary(op.intro, state.profile) };
    case "set_jetzt":
      return { opId: op.id, group: "Startseite", order: 25_700, label: "Jetzt-Karte", before: null, after: op.on ? "✨ an" : "aus" };
    case "add_training": {
      const s = sportById(op.training.sport);
      const when = op.training.date === dayToday() ? "heute" : `${weekdayShort(op.training.date)} ${dayDate(op.training.date)}`;
      return { opId: op.id, group: "Sport", order: 25_800, label: `${s.emoji} eintragen`, before: null, after: `${s.label} · ${op.training.minutes} Min${op.training.km ? ` · ${op.training.km} km` : ""} · ${when}` };
    }
    case "set_sport_goal":
      return { opId: op.id, group: "Sport", order: 25_810, label: "Wochenziel", before: state.sport ? `${state.sport.goal}×` : null, after: `${op.goal}× pro Woche` };
    case "add_timer":
    case "stop_timer":
    case "stopwatch":
    case "cook_step":
    case "start_cooking":
      return null;
    case "move_entry":
      return { opId: op.id, group: "Termine & Aufgaben", order: 24_000, label: "verschieben", before: `${op.title} · ${weekdayShort(op.date)} ${dayDate(op.date)}`, after: `${weekdayShort(op.to)} ${dayDate(op.to)}${op.time ? ` · ${clockLabel(op.time)}` : ""}` };
  }
}
