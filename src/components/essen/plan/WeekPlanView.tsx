"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ClipboardList, FolderOpen, History, Plus, Save, Share2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { CARD, CARD_LIST, ICON_BUTTON, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
import { DishPicture } from "@/components/essen/DishPicture";
import { SwapSheet, type SwapContext } from "@/components/essen/SwapSheet";
import { dishTone } from "@/lib/essen/dishLook";
import { effectivePlanStyle, helperName } from "@/lib/einstellungen/profile";
import { openHelper } from "@/lib/begleitung/open";
import { useRecipes } from "@/lib/essen/cookbook";
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
  toIsoDate,
  useToday,
  useWeekPlans,
  weekStartFor,
} from "@/lib/essen/weekPlan";
import {
  CookAgainSheet,
  EntrySheet,
  LoadTemplateSheet,
  MoveSheet,
  RecipePickerSheet,
  SaveTemplateSheet,
  TextEntrySheet,
} from "@/components/essen/plan/PlanSheets";

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

/**
 * /wochenplan: Zeitraum mit ‹ ›, sieben Zeilen (Bild, Gericht; frei = „Noch
 * frei“ + „Ideen“ = das eine Tausch-Fenster), „<Name>, füll die freien Tage“.
 * Seltenes im „…“: Vorlage, Frühere Wochen (Rückblick, nur lesen), Feste Tage
 * & Vorlieben, Plan teilen. Keine Zähler, Kosten oder Kategorie-Punkte.
 */
export function WeekPlanView() {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const templates = useTemplates();
  const cookedDays = useCookedDays();
  const [offset, setOffset] = useState(0);
  const [swapDay, setSwapDay] = useState<PlanDay | null>(null);
  const [openSheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState("");
  // Von der Startseite "Tauschen" (?tauschen=heute): Rezeptauswahl für heute
  // öffnen – einmal je Aufruf (bfcacheId wechselt bei jeder neuen Navigation)
  const params = useSearchParams();
  const router = useRouter();
  const { bfcacheId } = router;
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
  const swapToday = params.get("tauschen") === "heute" && swapHandled !== bfcacheId && offset === 0;
  const sheet: SheetState = openSheet ?? (swapToday ? { type: "pick", weekday: defaultDay } : null);
  const close = () => {
    setSheet(null);
    setSwapHandled(bfcacheId);
  };
  const sheetDay = sheet && "weekday" in sheet ? week.days.find((d) => d.weekday === sheet.weekday) : undefined;

  const changeWeek = (next: number) => setOffset(next);
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

  const swapCtx: SwapContext | null = profile ? { today, todayIso, profile, recipes, weekPlans, planStyle: effectivePlanStyle(profile, currentStart) } : null;
  const free = week.days.some((d) => !d.away && !d.slot.entry && d.date >= todayIso);
  const share = async () => {
    const text = [`Wochenplan ${formatWeekRange(weekStart)}`, ...week.days.map((d) => `${d.weekday.slice(0, 2)}: ${d.slot.entry ? dishTitle(d) : d.away ? (d.paused ? "Pause" : "kein Kochtag") : "noch frei"}`)].join("\n");
    try {
      if (navigator.share) return void (await navigator.share({ title: "Wochenplan", text }));
      await navigator.clipboard.writeText(text);
      flash("Plan kopiert – jetzt in eine Nachricht einfügen.");
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") flash("Teilen hat nicht geklappt.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader
        title="Wochenplan"
        backHref="/?seite=essen"
        action={
          <MoreMenu
            title="Wochenplan"
            items={[
              { label: "Vorlage speichern", icon: Save, onClick: () => setSheet({ type: "save" }), disabled: readOnly || week.planned === 0 },
              { label: "Vorlage laden", icon: FolderOpen, onClick: () => setSheet({ type: "load" }), disabled: readOnly },
              { label: "Frühere Wochen", icon: History, onClick: () => changeWeek(-1) },
              { label: "Feste Tage & Vorlieben", icon: ClipboardList, href: `/woche/check?woche=${weekStart}` },
              { label: "Plan teilen", icon: Share2, onClick: () => void share() },
              { label: "Unsere Rezepte", icon: BookOpen, href: "/kochbuch" },
            ]}
          />
        }
      />
      <main className={PAGE_MAIN}>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => changeWeek(offset - 1)} disabled={offset <= -MAX_BACK} aria-label="Woche davor" className={ICON_BUTTON}>
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
          <div className="text-center">
            <p className="flex items-center justify-center gap-1.5 text-[17px] font-extrabold">
              {readOnly && <History className="h-4 w-4 text-muted" strokeWidth={2.25} aria-hidden />}
              {weekLabel(offset)}
            </p>
            <p className="whitespace-nowrap text-sm text-muted">
              {formatWeekRange(weekStart)}
              {readOnly && " · Rückblick"}
            </p>
          </div>
          <button type="button" onClick={() => changeWeek(offset + 1)} disabled={offset >= 1} aria-label="Woche danach" className={ICON_BUTTON}>
            <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <ol className={CARD_LIST} aria-label="Tage">
          {week.days.map((day) => {
            const entry = day.slot.entry;
            const past = day.date < todayIso;
            const fixed = entry?.origin === "fest";
            const open = () => {
              if (readOnly) return entry && setSheet({ type: "again", weekday: day.weekday });
              if (day.away) return;
              setSheet({ type: entry ? "entry" : "pick", weekday: day.weekday });
            };
            return (
              <li key={day.date} className={fixed ? "bg-accent-soft" : ""}>
                <div className="flex min-h-16 items-center gap-3 px-3 py-2">
                  <button type="button" onClick={open} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${day.weekday}: ${entry ? dishTitle(day) : day.away ? "kein Kochtag" : "noch frei"}`}>
                    <span className="flex w-9 shrink-0 flex-col items-center leading-tight">
                      <span className={`text-[13px] font-bold ${day.date === todayIso ? "text-accent-strong" : "text-muted"}`}>{day.weekday.slice(0, 2)}</span>
                      <span className="text-[17px] font-extrabold">{Number(day.date.slice(8))}</span>
                    </span>
                    {entry ? (
                      <DishPicture title={entry.title} category={entry.category} tone={dishTone(entry.title, entry.category)} alt="" small className={`h-11 w-11 shrink-0 rounded-full ${past && !readOnly ? "opacity-60" : ""}`} />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line-strong text-faint" aria-hidden>
                        {!day.away && <Plus className="h-4 w-4" strokeWidth={2.5} />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-base ${entry ? "font-bold" : "text-muted"}`}>{entry ? dishTitle(day) : day.away ? (day.paused ? "Pause" : "Kein Kochtag") : "Noch frei"}</span>
                      {fixed && <span className="block text-[13px] font-semibold text-accent-strong">fester Tag</span>}
                    </span>
                  </button>
                  {!entry && !day.away && !readOnly && !past && swapCtx && (
                    <button type="button" onClick={() => setSwapDay(day)} className={`${chipClass(false)} shrink-0`}>
                      Ideen
                    </button>
                  )}
                </div>
                {day.note && (
                  <p className="-mt-1 mb-2 ml-[60px] flex items-center gap-1 pr-3 text-sm text-muted">
                    <span className="min-w-0 flex-1 truncate">{day.note}</span>
                    {!readOnly && (
                      <button type="button" onClick={() => setNote(weekStart, day.weekday, "")} aria-label="Notiz entfernen" className="hit flex h-6 w-6 items-center justify-center text-faint">
                        <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                      </button>
                    )}
                  </p>
                )}
                {!readOnly && day.date === todayIso && cookedDays[todayIso] && entry && (
                  <button type="button" onClick={moveTodayToTomorrow} className="hit -mt-1 mb-2 ml-[60px] text-sm font-semibold text-muted">
                    Doch nicht gekocht? Auf morgen
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        {!readOnly && free && (
          <button type="button" onClick={() => openHelper(undefined, "Füll bitte die freien Tage dieser Woche mit Gerichten.")} className={`${buttonClass("soft")} w-full`}>
            {helperName(profile)}, füll die freien Tage
          </button>
        )}
        {toast && (
          <p role="status" className="rounded-field bg-accent-soft px-4 py-2 text-sm font-semibold text-accent-strong">
            {toast}
          </p>
        )}
      </main>

      {swapDay && swapCtx && <SwapSheet data={swapCtx} day={swapDay} onClose={() => setSwapDay(null)} />}
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


/** Gerichtname wie angezeigt (Wunsch mit Namen) */
function dishTitle(day: PlanDay): string {
  const entry = day.slot.entry;
  if (!entry) return "";
  return entry.stored.kind === "wish" ? `${entry.kidName} wünscht sich: ${entry.title}` : entry.title;
}
