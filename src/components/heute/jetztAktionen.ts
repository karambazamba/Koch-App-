"use client";

// Was die Jetzt-Karte selbst tut (A-054), damit `TodayPage` schlank bleibt:
// „Auf die Liste: Eier“ setzt die Zutaten still auf die Einkaufsliste (über
// das Wochenplan-Angebot, `einkauf/angebot`), und freitags die Wochenende-
// Karte – Vorschläge (Mia fragen, Essen 7 Tage, still „Großeinkauf“ am
// Samstag), „Mit Mia planen“ (Bühne mit dem Wochenende als Thema) und
// „Später“ (für heute weg, gemerkt in `wasgibts.jetzt` über das
// Speicher-Verzeichnis). Dazu die Daten fürs Wochenende.

import { buzz } from "@/components/heute/actions";
import { dishOf } from "@/components/essen/useMeals";
import type { HomeData } from "@/components/heute/useHomeData";
import type { WochenendAktionen } from "@/components/heute/JetztCard";
import type { JetztSource } from "@/components/heute/useJetztTopics";
import { openHelper } from "@/lib/begleitung/open";
import { createEntry } from "@/lib/core/entries";
import { addDays } from "@/lib/core/now";
import { zutatenDraufsetzen } from "@/lib/einkauf/angebot/nachNehmen";
import { composeWeek, loadMealPlans } from "@/lib/essen/mealPlan";
import { weekStartFor } from "@/lib/essen/weekPlan";
import { doneJetztTopic } from "@/lib/heute/jetztStore";
import type { JetztTopic } from "@/lib/heute/jetztTopics";
import { WOCHENENDE_FRAGE, wochenendeZeit } from "@/lib/heute/wochenende";
import { itemsForDay, sanitizeEntry, upsertEntry, type CalendarEntry } from "@/lib/kalender/model";
import { quickTaskData } from "@/lib/kalender/quick";
import { changeEntries } from "@/lib/kalender/store";

/** Steht an diesem Tag schon ein Gericht (oder ein Ausflug)? */
function essenGeplant(data: HomeData, iso: string): boolean {
  const week = data.week.days.some((d) => d.date === iso)
    ? data.week
    : composeWeek(weekStartFor(new Date(`${iso}T12:00:00`), data.profile.shoppingDay || "Montag"), data.profile, data.weekPlans, loadMealPlans(), data.recipes);
  const day = week.days.find((d) => d.date === iso);
  return Boolean(day && (day.away || dishOf(day)));
}

/** Freitag 12–20 Uhr: Einträge am Samstag und Sonntag und ob dort schon gegessen wird – sonst null */
export function wochenendQuelle(data: HomeData, entries: CalendarEntry[], minutes: number): JetztSource["weekend"] {
  if (!wochenendeZeit(data.todayIso, minutes)) return null;
  const sa = addDays(data.todayIso, 1);
  const so = addDays(data.todayIso, 2);
  return {
    items: [...itemsForDay(entries, sa, data.todayIso), ...itemsForDay(entries, so, data.todayIso)].filter((i) => i.room !== "arbeit"),
    essen: { sa: essenGeplant(data, sa), so: essenGeplant(data, so) },
  };
}

export function jetztAktionen(o: { data: HomeData; onOpenFood: () => void }): { onAktion: (t: JetztTopic) => void; wochenende: WochenendAktionen } {
  const today = o.data.todayIso;
  const weg = (t: JetztTopic) => {
    doneJetztTopic(t.id, today);
    buzz();
  };
  return {
    // „Auf die Liste: Eier“: still drauf (Hinzufügen meldet sich nicht), das Thema ist für heute erledigt
    onAktion: (t) => {
      if (t.aktion?.art !== "liste") return;
      zutatenDraufsetzen(o.data, t.aktion.gericht, today, t.aktion.namen);
      weg(t);
    },
    wochenende: {
      onChip: (c) => {
        if (c.ziel.art === "fragen") return openHelper(undefined, c.ziel.text);
        if (c.ziel.art === "essen") return o.onOpenFood();
        const task = sanitizeEntry(createEntry("aufgabe", quickTaskData(c.ziel.title, { date: c.ziel.date }, today)) as CalendarEntry);
        if (task) changeEntries((list) => upsertEntry(list, task));
        buzz();
      },
      onPlan: () => openHelper(undefined, WOCHENENDE_FRAGE),
      onSpaeter: weg,
    },
  };
}
