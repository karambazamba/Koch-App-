"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Sheet } from "@/components/plan/Sheet";
import {
  RECIPE_CATEGORIES,
  categoryInfo,
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
import { WISH_MEAL_LABELS } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";
import {
  currentMonday,
  formatWeekRange,
  nextMonday,
  toIsoDate,
  useToday,
  useWeekPlans,
} from "@/lib/weekPlan";

const SKELETON = <div className="m-4 h-64 animate-pulse rounded-3xl bg-white/70" />;

/** Kurzform der Kategorien für Hinweise und Zusammenfassung */
const SHORT: Record<RecipeCategory, string> = {
  fleisch: "Fleisch",
  vegetarisch: "Veggie",
  fisch: "Fisch",
  cheatday: "Cheat Day",
};

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

  const weekStart = showNext ? nextMonday(today) : currentMonday(today);
  const week = buildWeek(
    weekStart,
    profile,
    weekPlans[weekStart] ?? null,
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
      <main className="safe-bottom flex flex-1 flex-col gap-4 px-4 pb-8 pt-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowNext(false)}
            disabled={!showNext}
            aria-label="Diese Woche"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm active:scale-95 disabled:opacity-30"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-xl font-extrabold">{showNext ? "Nächste Woche" : "Diese Woche"}</p>
            <p className="whitespace-nowrap text-sm text-stone-500">{formatWeekRange(weekStart)}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowNext(true)}
            disabled={showNext}
            aria-label="Nächste Woche"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm active:scale-95 disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <Summary week={week} />

        {!week.hasPlanRules && (
          <Link
            href={`/woche/check?woche=${weekStart}`}
            className="flex items-center gap-3 rounded-3xl border-2 border-orange-300 bg-orange-50 p-4 text-orange-900 active:scale-[0.98]"
          >
            <span className="text-3xl" aria-hidden>
              📋
            </span>
            <span className="flex-1">
              <span className="block font-extrabold">Noch keine Vorgaben für diese Woche</span>
              <span className="block text-sm">
                Wir nutzen eure Standardwoche. Zum Wochen-Check: Ausflüge, feste Gerichte, Wunschtag.
              </span>
            </span>
            <span className="text-2xl" aria-hidden>
              ›
            </span>
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
        className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ${
          done ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-700"
        }`}
      >
        {categoryInfo(c).emoji} {planned}/{target} {SHORT[c]}
      </span>
    );
  });
  return (
    <section className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm" aria-label="Zusammenfassung">
      <p className="text-lg font-extrabold">
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
      className={`flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm ${isToday ? "ring-2 ring-orange-400" : ""}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-extrabold">
          {day.weekday}{" "}
          <span className="font-semibold text-stone-500">
            {Number(d)}.{Number(m)}.
          </span>
          {isToday && <span className="ml-2 text-sm font-bold text-orange-600">heute</span>}
        </h3>
        {day.cheat && !day.away && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
            🍕 Cheat Day
          </span>
        )}
      </div>
      {day.away ? (
        <p className="rounded-2xl bg-sky-50 px-4 py-3 font-semibold text-sky-800">🚗 Ausflug – nichts kochen</p>
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
  const label = slot.meal === "mittags" ? "☀️ Mittag" : "🌙 Abend";
  const { entry } = slot;

  if (entry) {
    const wish = entry.stored.kind === "wish";
    return (
      <button
        type="button"
        onClick={() => onOpen(slot, "entry")}
        className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left active:scale-[0.98] ${
          wish ? "border-amber-300 bg-amber-50" : "border-stone-100 bg-stone-50"
        }`}
      >
        <span className="w-20 shrink-0 text-sm font-semibold text-stone-500">{label}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-tight">
            {wish ? `${entry.kidName} wünscht sich: ${entry.title} 🎉` : entry.title}
          </span>
          <span className="block text-sm text-stone-500">
            {entry.category ? `${categoryInfo(entry.category).emoji} ${SHORT[entry.category]}` : wish ? "Wunschtag" : "ohne Kategorie"}
            {entry.origin === "fest" && " · fest eingeplant"}
          </span>
        </span>
        <span className="text-xl text-stone-300" aria-hidden>
          ›
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-stone-200 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-stone-500">{label}</span>
        <span className="text-base font-bold text-stone-600">
          Noch offen
          {slot.hint && (
            <span className="ml-2 whitespace-nowrap rounded-full bg-orange-50 px-2 py-0.5 text-sm text-orange-700">
              {categoryInfo(slot.hint).emoji} {SHORT[slot.hint]}
            </span>
          )}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onOpen(slot, "pick")}
          className="min-h-12 rounded-xl bg-orange-100 px-1 text-sm font-bold text-orange-800 active:scale-95"
        >
          📖 Aus Kochbuch wählen
        </button>
        <button
          type="button"
          onClick={() => onOpen(slot, "text")}
          className="min-h-12 rounded-xl bg-stone-100 px-1 text-sm font-bold text-stone-700 active:scale-95"
        >
          ✏️ Selbst eintragen
        </button>
        <button
          type="button"
          disabled
          title="Kommt bald"
          className="flex min-h-12 flex-col items-center justify-center rounded-xl bg-violet-50 px-1 text-sm font-bold text-violet-400"
        >
          ✨ Von KI vorschlagen lassen
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
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xl font-extrabold">
          {wish ? `${entry.kidName} wünscht sich: ${entry.title} 🎉` : entry.title}
        </p>
        <p className="text-stone-500">
          {entry.category ? `${categoryInfo(entry.category).emoji} ${categoryInfo(entry.category).label}` : wish ? "Wunschtag" : "ohne Kategorie"}
          {entry.origin === "fest" && " · fest eingeplant im Wochen-Check"}
        </p>
        {entry.recipeId && (
          <Link
            href={`/kochbuch/rezept?id=${encodeURIComponent(entry.recipeId)}`}
            className="mt-3 flex h-12 items-center justify-center rounded-2xl bg-orange-100 font-bold text-orange-800 active:scale-95"
          >
            📖 Rezept ansehen
          </Link>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onSwap} className="h-14 rounded-2xl bg-white font-bold shadow-sm active:scale-95">
          🔄 Tauschen
        </button>
        <button type="button" onClick={onMove} className="h-14 rounded-2xl bg-white font-bold shadow-sm active:scale-95">
          ↔️ Verschieben
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="h-14 rounded-2xl bg-white font-bold text-rose-700 shadow-sm active:scale-95"
        >
          🗑 Löschen
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
        <p className="rounded-2xl bg-white p-4 text-stone-600 shadow-sm">
          Noch keine Rezepte im Kochbuch.{" "}
          <Link href="/kochbuch/bearbeiten" className="font-bold text-orange-700 underline">
            Rezept anlegen
          </Link>{" "}
          oder{" "}
          <button type="button" onClick={onText} className="font-bold text-orange-700 underline">
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
            className="h-12 rounded-2xl border-2 border-stone-200 bg-white px-4 text-lg outline-none focus:border-orange-400"
          />
          <div role="group" aria-label="Kategorie" className="flex flex-wrap gap-2">
            {[{ value: "alle" as const, label: "Alle" }, ...RECIPE_CATEGORIES.map((c) => ({ value: c.value, label: `${c.emoji} ${SHORT[c.value]}` }))].map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`h-10 rounded-full border-2 px-3 text-sm font-bold ${
                  filter === f.value ? "border-orange-500 bg-orange-500 text-white" : "border-stone-200 bg-white text-stone-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="text-stone-500">Kein passendes Rezept.</p>
          ) : (
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-sm">
              {list.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onPick(r)}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-orange-50"
                  >
                    <span className="text-2xl" aria-hidden>
                      {categoryInfo(r.category).emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-lg font-bold">
                      {r.favorite ? "♥ " : ""}
                      {r.title}
                    </span>
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
  onClose,
  onSave,
}: {
  title: string;
  hint: RecipeCategory | null;
  onClose: () => void;
  onSave: (title: string, category: RecipeCategory | null) => void;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<RecipeCategory | null>(hint);
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
        className="h-14 rounded-2xl border-2 border-stone-200 bg-white px-4 text-lg outline-none focus:border-orange-400"
      />
      <div role="group" aria-label="Kategorie" className="grid grid-cols-2 gap-2">
        {RECIPE_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={category === c.value}
            onClick={() => setCategory(category === c.value ? null : c.value)}
            className={`h-12 rounded-2xl border-2 font-bold ${
              category === c.value ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-200 bg-white text-stone-700"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!text.trim()}
        onClick={() => onSave(text.trim(), category)}
        className="h-14 rounded-2xl bg-orange-500 text-lg font-extrabold text-white shadow-md active:scale-95 disabled:opacity-40"
      >
        Eintragen ✓
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
      <p className="text-sm text-stone-500">Ist der Platz belegt, werden die Gerichte getauscht.</p>
      <ul className="flex flex-col gap-2">
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
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-2 text-left shadow-sm active:scale-[0.98]"
                  >
                    <span className="whitespace-nowrap font-bold">
                      {d.weekday.slice(0, 2)} {WISH_MEAL_LABELS[s.meal]}
                    </span>
                    <span className="min-w-0 truncate text-sm text-stone-500">
                      {s.entry ? `⇄ ${s.entry.title}` : "frei"}
                    </span>
                  </button>
                </li>
              )),
          )}
      </ul>
    </Sheet>
  );
}
