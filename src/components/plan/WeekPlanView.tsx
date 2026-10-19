"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ClipboardList, FolderOpen, History, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CategoryDot } from "@/components/ui/Category";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, ICON_BUTTON, PAGE_MAIN, buttonClass } from "@/components/ui/styles";
import { useRecipes, type Recipe } from "@/lib/essen/cookbook";
import { estimateCost } from "@/lib/essen/costs";
import {
  clearSlot,
  composeWeek,
  loadMealPlans,
  moveEntry,
  replaceMealPlans,
  setDouble,
  setEntry,
  setNote,
  useMealPlans,
  type MealEntry,
  type PlanDay,
  type PlanWeek,
  type ResolvedEntry,
} from "@/lib/essen/mealPlan";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { moveToTomorrow, unmarkCooked, useCookedDays } from "@/lib/essen/mealDone";
import { showToast } from "@/lib/core/toast";
import { applyTemplate, saveTemplate, templateDays, useTemplates } from "@/lib/essen/templates";
import {
  DEFAULT_SHOPPING_DAY,
  addDays,
  formatWeekRange,
  planForWeek,
  toIsoDate,
  useToday,
  useWeekPlans,
  weekStartFor,
} from "@/lib/essen/weekPlan";
import { DayCard, DayStrip, UpcomingDays } from "./DayView";
import {
  CookAgainSheet,
  EntrySheet,
  LoadTemplateSheet,
  MoveSheet,
  RecipePickerSheet,
  SaveTemplateSheet,
  TextEntrySheet,
} from "./PlanSheets";
import { WeekListView } from "./WeekListView";

const SKELETON = <div className={`${CARD} m-4 h-64 animate-pulse`} />;

/** So weit lässt sich zurückblättern (Rückblick) */
const MAX_BACK = 26;

type SheetState =
  | { type: "entry" | "pick" | "text" | "move" | "again"; weekday: string }
  | { type: "save" | "load" }
  | null;

function weekLabel(offset: number): string {
  if (offset === 0) return "Diese Woche";
  if (offset === 1) return "Nächste Woche";
  if (offset === -1) return "Letzte Woche";
  return `Vor ${-offset} Wochen`;
}

/** Geschätzte Kosten der Woche (nur Gerichte mit Rezept) */
function weekCost(week: PlanWeek, recipes: Record<string, Recipe>): number {
  return week.days.reduce((sum, d) => {
    const e = d.slot.entry;
    const r = e?.recipeId ? recipes[e.recipeId] : undefined;
    const cost = r && !d.away ? (estimateCost(r, d.persons) ?? 0) : 0;
    return sum + cost * (e?.double ? 2 : 1);
  }, 0);
}

/**
 * /wochenplan: Tag-Ansicht (Tagesleiste + große Karte + "Danach") oder
 * Woche-Ansicht (kompakte Liste, Gerichte per Ziehen tauschen). Vor- und
 * zurückblättern; vergangene Wochen nur lesen ("Nochmal kochen").
 */
export function WeekPlanView() {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const templates = useTemplates();
  const cookedDays = useCookedDays();
  const [view, setView] = useState<"tag" | "woche">("tag");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [openSheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState("");
  // Von der Startseite "Tauschen" (?tauschen=heute): Rezeptauswahl für heute
  // öffnen – einmal je Aufruf (bfcacheId wechselt bei jeder neuen Navigation)
  const params = useSearchParams();
  const { bfcacheId } = useRouter();
  const [swapHandled, setSwapHandled] = useState<string | null>(null);

  if (!today || profile === undefined || !weekPlans || !mealPlans || !recipes || !templates || !cookedDays) return SKELETON;

  // Planungswoche ab Einkaufstag (Profil), 7 Tage
  const shoppingDay = profile?.shoppingDay ?? DEFAULT_SHOPPING_DAY;
  const currentStart = weekStartFor(today, shoppingDay);
  const weekStart = addDays(currentStart, offset * 7);
  const week = composeWeek(weekStart, profile, weekPlans, mealPlans, recipes);
  const todayIso = toIsoDate(today);
  const readOnly = offset < 0;
  const defaultDay = week.days.find((d) => d.date === todayIso)?.weekday ?? week.days[0].weekday;
  const selectedDay = week.days.find((d) => d.weekday === selected) ?? week.days.find((d) => d.weekday === defaultDay)!;
  const index = week.days.indexOf(selectedDay);
  const swapToday = params.get("tauschen") === "heute" && swapHandled !== bfcacheId && offset === 0;
  const sheet: SheetState = openSheet ?? (swapToday ? { type: "pick", weekday: defaultDay } : null);
  const close = () => {
    setSheet(null);
    setSwapHandled(bfcacheId);
  };
  const sheetDay = sheet && "weekday" in sheet ? week.days.find((d) => d.weekday === sheet.weekday) : undefined;
  const budget = planForWeek(weekPlans, weekStart)?.budgetEuro ?? null;
  const cost = weekCost(week, recipes);

  const changeWeek = (next: number) => {
    setOffset(next);
    setSelected(null);
  };
  // Heute nach dem Essen (von selbst als gekocht vermerkt): doch nicht gekocht → auf morgen
  const moveTodayToTomorrow = () => {
    if (!profile) return;
    const before = loadMealPlans();
    const result = moveToTomorrow({ profile, weekPlans, mealPlans: before, recipes }, todayIso);
    if (!result) return;
    unmarkCooked(todayIso);
    replaceMealPlans(result.weeks);
    // Rückgängig: Plan wie vorher – dann zählt es wieder von selbst als gekocht
    showToast({ text: result.text, undo: () => replaceMealPlans(before) });
  };
  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Wochenplan" />
      <main className={PAGE_MAIN}>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => changeWeek(offset - 1)}
            disabled={offset <= -MAX_BACK}
            aria-label="Woche davor"
            className={ICON_BUTTON}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
          <div className="text-center">
            <p className="flex items-center justify-center gap-1.5 text-lg font-bold">
              {readOnly && <History className="h-4 w-4 text-muted" strokeWidth={2.25} aria-hidden />}
              {weekLabel(offset)}
            </p>
            <p className="whitespace-nowrap text-sm text-muted">
              {formatWeekRange(weekStart)}
              {readOnly && " · Rückblick"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => changeWeek(offset + 1)}
            disabled={offset >= 1}
            aria-label="Woche danach"
            className={ICON_BUTTON}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <Segmented
          label="Ansicht"
          value={view}
          onChange={setView}
          options={[
            { value: "tag", label: "Tag" },
            { value: "woche", label: "Woche" },
          ]}
        />

        <SummaryLine week={week} cost={profile?.display === "alles" || budget ? cost : 0} budget={budget} mixed={profile?.planStyle !== "plan"} />

        {!readOnly && !week.hasPlanRules && (
          <Link href={`/woche/check?woche=${weekStart}`} className="-mt-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-accent-strong">
            <ClipboardList className="h-4 w-4" strokeWidth={2} aria-hidden />
            Noch keine Vorgaben – zum Wochen-Check
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </Link>
        )}

        {view === "tag" ? (
          <>
            <DayStrip days={week.days} selected={selectedDay.weekday} todayIso={todayIso} onSelect={setSelected} />
            <DayCard
              key={selectedDay.date}
              day={selectedDay}
              recipes={recipes}
              readOnly={readOnly}
              onPlan={() => setSheet({ type: "pick", weekday: selectedDay.weekday })}
              onSwap={() => setSheet({ type: "pick", weekday: selectedDay.weekday })}
              onMore={() => setSheet({ type: "entry", weekday: selectedDay.weekday })}
              onCookAgain={() => setSheet({ type: "again", weekday: selectedDay.weekday })}
              onRemoveNote={() => setNote(weekStart, selectedDay.weekday, "")}
              onMoveTomorrow={!readOnly && selectedDay.date === todayIso && cookedDays[todayIso] && selectedDay.slot.entry ? moveTodayToTomorrow : undefined}
              onSwipe={(dir) => {
                const next = week.days[index + dir];
                if (next) setSelected(next.weekday);
              }}
            />
            <UpcomingDays days={week.days.slice(index + 1, index + 3)} onSelect={setSelected} />
          </>
        ) : (
          <WeekListView
            days={week.days}
            todayIso={todayIso}
            readOnly={readOnly}
            onOpen={(weekday) => {
              setSelected(weekday);
              setView("tag");
            }}
            onMove={(from, to) => moveEntry(weekStart, from.slot, to.slot)}
          />
        )}

        {!readOnly && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSheet({ type: "save" })}
              disabled={week.planned === 0}
              className={buttonClass("secondary", "sm")}
            >
              <Save className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
              Vorlage speichern
            </button>
            <button type="button" onClick={() => setSheet({ type: "load" })} className={buttonClass("secondary", "sm")}>
              <FolderOpen className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
              Vorlage laden
            </button>
          </div>
        )}
        <Link href="/kochbuch" className={`${buttonClass("soft")} w-full`}>
          <BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden />
          Unsere Rezepte
        </Link>
        {toast && (
          <p role="status" className="rounded-xl bg-accent-soft px-4 py-2 text-sm font-semibold text-accent-strong">
            {toast}
          </p>
        )}
      </main>

      {sheet?.type === "entry" && sheetDay?.slot.entry && (
        <EntrySheet
          slot={sheetDay.slot}
          day={sheetDay}
          recipe={sheetDay.slot.entry?.recipeId ? recipes[sheetDay.slot.entry.recipeId] : undefined}
          onDouble={(double) => setDouble(weekStart, sheetDay.slot, double)}
          onClose={close}
          onSwap={() => setSheet({ type: "pick", weekday: sheetDay.weekday })}
          onMove={() => setSheet({ type: "move", weekday: sheetDay.weekday })}
          onDelete={() => {
            clearSlot(weekStart, sheetDay.slot);
            close();
          }}
        />
      )}
      {sheet?.type === "pick" && sheetDay && (
        <RecipePickerSheet
          recipes={recipes}
          hint={sheetDay.slot.hint ?? sheetDay.slot.entry?.category ?? null}
          title={sheetDay.weekday}
          onClose={close}
          onText={() => setSheet({ type: "text", weekday: sheetDay.weekday })}
          onPick={(recipe) => {
            setEntry(weekStart, sheetDay.slot.key, { kind: "recipe", recipeId: recipe.id, title: recipe.title, category: recipe.category });
            close();
          }}
        />
      )}
      {sheet?.type === "text" && sheetDay && (
        <TextEntrySheet
          title={sheetDay.weekday}
          hint={sheetDay.slot.hint}
          recipes={Object.values(recipes)}
          onClose={close}
          onSave={(title, category) => {
            setEntry(weekStart, sheetDay.slot.key, { kind: "text", title, category });
            close();
          }}
        />
      )}
      {sheet?.type === "move" && sheetDay?.slot.entry && (
        <MoveSheet
          from={sheetDay.slot}
          week={week}
          onClose={close}
          onMove={(to) => {
            moveEntry(weekStart, sheetDay.slot, to);
            close();
          }}
        />
      )}
      {sheet?.type === "again" && sheetDay?.slot.entry && (
        <CookAgainSheet
          title={sheetDay.slot.entry.title}
          todayIso={todayIso}
          weeks={[0, 1].map((o) => ({
            label: weekLabel(o),
            week: composeWeek(addDays(currentStart, o * 7), profile, weekPlans, mealPlans, recipes),
          }))}
          onClose={close}
          onPick={(target, day: PlanDay) => {
            setEntry(target.weekStart, day.slot.key, againEntry(sheetDay.slot.entry!));
            close();
            flash(`„${sheetDay.slot.entry!.title}“ steht jetzt am ${day.weekday} im Plan.`);
          }}
        />
      )}
      {sheet?.type === "save" && (
        <SaveTemplateSheet
          count={Object.keys(templateDays(week)).length}
          onClose={close}
          onSave={(name) => {
            const t = saveTemplate(name, week);
            close();
            flash(`Vorlage „${t.name}“ gespeichert.`);
          }}
        />
      )}
      {sheet?.type === "load" && (
        <LoadTemplateSheet
          templates={templates}
          week={week}
          onClose={close}
          onApply={(template, weekdays) => {
            applyTemplate(mealPlans, weekStart, template, weekdays);
            close();
            flash(`${weekdays.length} ${weekdays.length === 1 ? "Tag" : "Tage"} aus „${template.name}“ übernommen.`);
          }}
        />
      )}
    </div>
  );
}

/** Gericht für "Nochmal kochen": ohne "doppelt", ein Wunsch wird zum normalen Gericht */
function againEntry(entry: ResolvedEntry): MealEntry {
  const { stored } = entry;
  if (stored.kind === "wish") return { kind: "text", title: entry.title, category: entry.category };
  const { double: _double, ...rest } = stored;
  void _double;
  return rest;
}

/** Schmale Zusammenfassung: x/7 geplant · Kategorien · Budget (Kosten nur bei "Alles zeigen" oder mit Budget) */
function SummaryLine({ week, cost, budget, mixed }: { week: PlanWeek; cost: number; budget: number | null; mixed: boolean }) {
  return (
    <p className="-mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-sm text-muted" aria-label="Zusammenfassung">
      {/* "Mal so, mal so": freie Tage sind normal – kein Zähler */}
      {!mixed && (
        <span className="font-bold text-ink">
          {week.planned}/{week.total} geplant
        </span>
      )}
      {(["vegetarisch", "fleisch", "fisch"] as const).map((c) => (
        <span key={c} className="inline-flex items-center gap-1 whitespace-nowrap">
          <CategoryDot category={c} />
          {week.counts[c].planned}/{week.counts[c].target}
        </span>
      ))}
      {(cost > 0 || budget) && (
        <span className="whitespace-nowrap">
          ~{cost} €{budget ? ` von ${budget} €` : ""}
        </span>
      )}
    </p>
  );
}
