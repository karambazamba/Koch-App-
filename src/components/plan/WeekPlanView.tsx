"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Heart,
  MapPin,
  Moon,
  PenLine,
  Repeat,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/plan/Sheet";
import { CategoryChip, CategoryDot, categoryLabel } from "@/components/ui/Category";
import { IconBadge } from "@/components/ui/IconBadge";
import {
  CARD,
  CARD_LIST,
  ICON_BUTTON,
  INPUT,
  INPUT_BASE,
  PAGE_MAIN,
  buttonClass,
  chipClass,
  tileClass,
} from "@/components/ui/styles";
import {
  RECIPE_CATEGORIES,
  sortRecipes,
  useRecipes,
  type Recipe,
  type RecipeCategory,
} from "@/lib/cookbook";
import {
  buildWeek,
  clearSlot,
  moveEntry,
  setEntry,
  storedForWeek,
  useMealPlans,
  type DaySlot,
  type PlanDay,
  type PlanWeek,
} from "@/lib/mealPlan";
import { guessDishCategory } from "@/lib/dishCategory";
import { WISH_MEAL_LABELS } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";
import {
  DEFAULT_SHOPPING_DAY,
  formatWeekRange,
  nextWeekStartFor,
  planForWeek,
  toIsoDate,
  weekStartFor,
  useToday,
  useWeekPlans,
} from "@/lib/weekPlan";

const SKELETON = <div className={`${CARD} m-4 h-64 animate-pulse`} />;

type SheetState =
  | { type: "entry"; key: string }
  | { type: "pick"; key: string }
  | { type: "text"; key: string }
  | { type: "move"; key: string }
  | null;

/** /wochenplan: aktuelle Woche, per Pfeil umschaltbar auf nächste Woche. */
export function WeekPlanView() {
  const today = useToday();
  const profile = useProfile();
  const weekPlans = useWeekPlans();
  const mealPlans = useMealPlans();
  const recipes = useRecipes();
  const [showNext, setShowNext] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);

  if (!today || profile === undefined || !weekPlans || !mealPlans || !recipes) return SKELETON;

  // Planungswoche ab Einkaufstag (Profil), 7 Tage
  const shoppingDay = profile?.shoppingDay ?? DEFAULT_SHOPPING_DAY;
  const weekStart = showNext ? nextWeekStartFor(today, shoppingDay) : weekStartFor(today, shoppingDay);
  const week = buildWeek(
    weekStart,
    profile,
    planForWeek(weekPlans, weekStart),
    storedForWeek(mealPlans, weekStart),
    recipes,
  );
  const todayIso = toIsoDate(today);
  const allSlots = week.days.filter((d) => !d.away).flatMap((d) => d.slots);
  const slotFor = (key: string) => allSlots.find((s) => s.key === key);
  const close = () => setSheet(null);
  const sheetSlot = sheet ? slotFor(sheet.key) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Wochenplan" />
      <main className={PAGE_MAIN}>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowNext(false)}
            disabled={!showNext}
            aria-label="Diese Woche"
            className={ICON_BUTTON}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
          <div className="text-center">
            <p className="text-lg font-bold">{showNext ? "Nächste Woche" : "Diese Woche"}</p>
            <p className="whitespace-nowrap text-sm text-muted">{formatWeekRange(weekStart)}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowNext(true)}
            disabled={showNext}
            aria-label="Nächste Woche"
            className={ICON_BUTTON}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <Summary week={week} />

        {!week.hasPlanRules && (
          <Link
            href={`/woche/check?woche=${weekStart}`}
            className={`${CARD} flex items-center gap-3 p-4 transition active:scale-[0.99]`}
          >
            <IconBadge icon={ClipboardList} />
            <span className="min-w-0 flex-1">
              <span className="block font-bold leading-snug">Noch keine Vorgaben für diese Woche</span>
              <span className="block text-sm text-muted">
                Wir nutzen eure Standardwoche. Zum Wochen-Check: Ausflüge, feste Gerichte, Wunschtag.
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-stone-300" strokeWidth={2.25} aria-hidden />
          </Link>
        )}

        {week.days.map((day) => (
          <DayCard
            key={day.weekday}
            day={day}
            isToday={day.date === todayIso}
            onOpen={(slot, type) => setSheet({ type, key: slot.key })}
          />
        ))}
      </main>

      {sheet && sheetSlot && sheet.type === "entry" && sheetSlot.entry && (
        <EntrySheet
          slot={sheetSlot}
          day={week.days.find((d) => d.slots.includes(sheetSlot))!}
          onClose={close}
          onSwap={() => setSheet({ type: "pick", key: sheetSlot.key })}
          onMove={() => setSheet({ type: "move", key: sheetSlot.key })}
          onDelete={() => {
            clearSlot(weekStart, sheetSlot);
            close();
          }}
        />
      )}
      {sheet && sheetSlot && sheet.type === "pick" && (
        <RecipePickerSheet
          recipes={recipes}
          hint={sheetSlot.hint ?? sheetSlot.entry?.category ?? null}
          title={slotTitle(sheetSlot)}
          onClose={close}
          onText={() => setSheet({ type: "text", key: sheetSlot.key })}
          onPick={(recipe) => {
            setEntry(weekStart, sheetSlot.key, {
              kind: "recipe",
              recipeId: recipe.id,
              title: recipe.title,
              category: recipe.category,
            });
            close();
          }}
        />
      )}
      {sheet && sheetSlot && sheet.type === "text" && (
        <TextEntrySheet
          title={slotTitle(sheetSlot)}
          hint={sheetSlot.hint}
          recipes={Object.values(recipes)}
          onClose={close}
          onSave={(title, category) => {
            setEntry(weekStart, sheetSlot.key, { kind: "text", title, category });
            close();
          }}
        />
      )}
      {sheet && sheetSlot && sheet.type === "move" && (
        <MoveSheet
          from={sheetSlot}
          week={week}
          onClose={close}
          onMove={(to) => {
            moveEntry(weekStart, sheetSlot, to);
            close();
          }}
        />
      )}
    </div>
  );
}

function slotTitle(slot: DaySlot): string {
  const [weekday] = slot.key.split("|");
  return `${weekday} ${WISH_MEAL_LABELS[slot.meal]}`;
}

function Summary({ week }: { week: PlanWeek }) {
  const items = (["fleisch", "vegetarisch", "fisch"] as const).map((c) => {
    const { planned, target } = week.counts[c];
    const done = planned >= target;
    return (
      <span
        key={c}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-700"
      >
        <CategoryDot category={c} />
        {planned}/{target} {categoryLabel(c, true)}
        {done && <Check className="h-4 w-4 text-accent" strokeWidth={2.5} aria-label="erfüllt" />}
      </span>
    );
  });
  return (
    <section className={`${CARD} flex flex-col gap-2 p-4`} aria-label="Zusammenfassung">
      <p className="text-lg font-bold">
        <span className="whitespace-nowrap">
          {week.planned}/{week.total} geplant
        </span>
      </p>
      <div className="flex flex-wrap gap-2">{items}</div>
    </section>
  );
}

function DayCard({
  day,
  isToday,
  onOpen,
}: {
  day: PlanDay;
  isToday: boolean;
  onOpen: (slot: DaySlot, type: "entry" | "pick" | "text") => void;
}) {
  const [, m, d] = day.date.split("-");
  return (
    <section
      aria-label={day.weekday}
      className={`${CARD} flex flex-col gap-3 p-4 ${isToday ? "ring-2 ring-accent" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold">
          {day.weekday}{" "}
          <span className="font-normal text-muted">
            {Number(d)}.{Number(m)}.
          </span>
          {isToday && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">heute</span>
          )}
        </h3>
        {day.cheat && !day.away && <CategoryChip category="cheatday">Cheat Day 🍕</CategoryChip>}
      </div>
      {day.away ? (
        <p className="flex items-center gap-2 rounded-xl bg-stone-50 px-4 py-3 font-semibold text-muted">
          <MapPin className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
          Ausflug – nichts kochen
        </p>
      ) : (
        day.slots.map((slot) => <SlotRow key={slot.key} slot={slot} onOpen={onOpen} />)
      )}
    </section>
  );
}

function SlotRow({
  slot,
  onOpen,
}: {
  slot: DaySlot;
  onOpen: (slot: DaySlot, type: "entry" | "pick" | "text") => void;
}) {
  const MealIcon = slot.meal === "mittags" ? Sun : Moon;
  const label = (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
      <MealIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
      {slot.meal === "mittags" ? "Mittag" : "Abend"}
    </span>
  );
  const { entry } = slot;

  if (entry) {
    const wish = entry.stored.kind === "wish";
    return (
      <button
        type="button"
        onClick={() => onOpen(slot, "entry")}
        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition active:scale-[0.99] ${
          wish ? "border-accent/40 bg-accent-soft" : "border-line bg-stone-50/60"
        }`}
      >
        <span className="w-20 shrink-0">{label}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug">
            {wish ? `${entry.kidName} wünscht sich: ${entry.title} 🎉` : entry.title}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted">
            {entry.category && <CategoryDot category={entry.category} />}
            {entry.category ? categoryLabel(entry.category, true) : wish ? "Wunschtag" : "ohne Kategorie"}
            {entry.origin === "fest" && " · fest eingeplant"}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-stone-300" strokeWidth={2.25} aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-stone-300 p-3">
      <div className="flex items-center justify-between gap-2">
        {label}
        <span className="flex items-center gap-2 text-sm font-semibold text-muted">
          Noch offen
          {slot.hint && <CategoryChip category={slot.hint} short />}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onOpen(slot, "pick")}
          className={`${tileClass(false, "soft")} leading-tight`}
        >
          <BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden />
          Aus Kochbuch wählen
        </button>
        <button
          type="button"
          onClick={() => onOpen(slot, "text")}
          className={`${tileClass(false)} leading-tight`}
        >
          <PenLine className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
          Selbst eintragen
        </button>
        <button
          type="button"
          disabled
          title="Kommt bald"
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-line px-1 py-2 text-center text-sm font-bold leading-tight text-stone-400"
        >
          <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
          Von KI vorschlagen lassen
          <span className="text-xs font-semibold">kommt bald</span>
        </button>
      </div>
    </div>
  );
}

function EntrySheet({
  slot,
  day,
  onClose,
  onSwap,
  onMove,
  onDelete,
}: {
  slot: DaySlot;
  day: PlanDay;
  onClose: () => void;
  onSwap: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const entry = slot.entry!;
  const wish = entry.stored.kind === "wish";
  return (
    <Sheet title={`${day.weekday} ${WISH_MEAL_LABELS[slot.meal]}`} onClose={onClose}>
      <div className={`${CARD} p-4`}>
        <p className="text-xl font-extrabold tracking-tight">
          {wish ? `${entry.kidName} wünscht sich: ${entry.title} 🎉` : entry.title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          {entry.category ? <CategoryChip category={entry.category} /> : wish ? "Wunschtag" : "ohne Kategorie"}
          {entry.origin === "fest" && <span>fest eingeplant im Wochen-Check</span>}
        </p>
        {entry.recipeId && (
          <Link
            href={`/kochbuch/rezept?id=${encodeURIComponent(entry.recipeId)}`}
            className={`${buttonClass("soft")} mt-4 w-full`}
          >
            <BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden />
            Rezept ansehen
          </Link>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onSwap} className={tileClass(false)}>
          <Repeat className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
          Tauschen
        </button>
        <button type="button" onClick={onMove} className={tileClass(false)}>
          <ArrowLeftRight className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
          Verschieben
        </button>
        <button type="button" onClick={onDelete} className={tileClass(false, "danger")}>
          <Trash2 className="h-5 w-5" strokeWidth={2} aria-hidden />
          Löschen
        </button>
      </div>
    </Sheet>
  );
}

function RecipePickerSheet({
  recipes,
  hint,
  title,
  onClose,
  onPick,
  onText,
}: {
  recipes: Record<string, Recipe>;
  hint: RecipeCategory | null;
  title: string;
  onClose: () => void;
  onPick: (recipe: Recipe) => void;
  onText: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RecipeCategory | "alle">(hint ?? "alle");
  const q = query.trim().toLowerCase();
  const list = sortRecipes(Object.values(recipes), "beliebt").filter(
    (r) => (filter === "alle" || r.category === filter) && (!q || r.title.toLowerCase().includes(q)),
  );
  const empty = Object.keys(recipes).length === 0;

  return (
    <Sheet title={`Aus Kochbuch: ${title}`} onClose={onClose}>
      {empty ? (
        <p className={`${CARD} p-4 text-muted`}>
          Noch keine Rezepte im Kochbuch.{" "}
          <Link href="/kochbuch/bearbeiten" className="font-bold text-accent-strong underline">
            Rezept anlegen
          </Link>{" "}
          oder{" "}
          <button type="button" onClick={onText} className="font-bold text-accent-strong underline">
            selbst eintragen
          </button>
          .
        </p>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rezept suchen"
            aria-label="Rezept suchen"
            className={INPUT}
          />
          <div role="group" aria-label="Kategorie" className="flex flex-wrap gap-2">
            {[{ value: "alle" as const, label: "Alle" }, ...RECIPE_CATEGORIES.map((c) => ({ value: c.value, label: categoryLabel(c.value, true) }))].map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={chipClass(filter === f.value)}
              >
                {f.value !== "alle" && <CategoryDot category={f.value} />}
                {f.label}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="text-muted">Kein passendes Rezept.</p>
          ) : (
            <ul className={CARD_LIST}>
              {list.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onPick(r)}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-stone-50"
                  >
                    <CategoryDot category={r.category} />
                    <span className="min-w-0 flex-1 truncate text-base font-bold">{r.title}</span>
                    {r.favorite && (
                      <Heart className="h-4 w-4 shrink-0 fill-accent text-accent" strokeWidth={2} aria-label="Favorit" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Sheet>
  );
}

function TextEntrySheet({
  title,
  hint,
  recipes,
  onClose,
  onSave,
}: {
  title: string;
  hint: RecipeCategory | null;
  recipes: Recipe[];
  onClose: () => void;
  onSave: (title: string, category: RecipeCategory | null) => void;
}) {
  const [text, setText] = useState("");
  // Kategorie kommt vom Gericht (gewählt oder erkannt), nie vom Platz-Hinweis
  const [picked, setPicked] = useState<RecipeCategory | null | undefined>(undefined);
  const category = picked === undefined ? guessDishCategory(text, recipes) : picked;
  return (
    <Sheet title={`Selbst eintragen: ${title}`} onClose={onClose}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="z. B. Nudeln mit Tomatensoße"
        aria-label="Gericht"
        enterKeyHint="done"
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) onSave(text.trim(), category);
        }}
        className={`${INPUT_BASE} h-14 w-full px-4 text-lg`}
      />
      {hint && (
        <p className="text-sm text-muted">
          Vorschlag für diesen Tag: {categoryLabel(hint)} – Kategorie nur wählen, wenn das Gericht dazu passt.
        </p>
      )}
      <div role="group" aria-label="Kategorie" className="grid grid-cols-2 gap-2">
        {RECIPE_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={category === c.value}
            onClick={() => setPicked(category === c.value ? null : c.value)}
            className={chipClass(category === c.value)}
          >
            <CategoryDot category={c.value} />
            {c.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!text.trim()}
        onClick={() => onSave(text.trim(), category)}
        className={`${buttonClass("primary", "lg")} w-full`}
      >
        <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        Eintragen
      </button>
    </Sheet>
  );
}

function MoveSheet({
  from,
  week,
  onClose,
  onMove,
}: {
  from: DaySlot;
  week: PlanWeek;
  onClose: () => void;
  onMove: (to: DaySlot) => void;
}) {
  return (
    <Sheet title={`„${from.entry!.title}“ verschieben`} onClose={onClose}>
      <p className="text-sm text-muted">Ist der Platz belegt, werden die Gerichte getauscht.</p>
      <ul className={CARD_LIST}>
        {week.days
          .filter((d) => !d.away)
          .flatMap((d) =>
            d.slots
              .filter((s) => s.key !== from.key)
              .map((s) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => onMove(s)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left active:bg-stone-50"
                  >
                    <span className="whitespace-nowrap font-bold">
                      {d.weekday.slice(0, 2)} {WISH_MEAL_LABELS[s.meal]}
                    </span>
                    <span className="flex min-w-0 items-center gap-1 truncate text-sm text-muted">
                      {s.entry ? (
                        <>
                          <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                          <span className="truncate">{s.entry.title}</span>
                        </>
                      ) : (
                        "frei"
                      )}
                    </span>
                  </button>
                </li>
              )),
          )}
      </ul>
    </Sheet>
  );
}
