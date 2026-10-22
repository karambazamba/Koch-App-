"use client";

import { useProfile } from "@/lib/einstellungen/useProfile";
import { isSmallHousehold } from "@/lib/einstellungen/profile";

// Bottom-Sheets des Wochenplans: Eintrag bearbeiten, aus dem Kochbuch wählen,
// selbst eintragen, verschieben. Vorlagen und "Nochmal kochen" stehen in
// TemplateSheets.tsx.

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, BookOpen, Check, Heart, Repeat, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CategoryChip, CategoryDot, categoryLabel } from "@/components/ui/Category";
import { CARD, CARD_LIST, INPUT, INPUT_BASE, buttonClass, chipClass, tileClass } from "@/components/ui/styles";
import { RECIPE_CATEGORIES, setRecipeKnown, sortRecipes, type Recipe, type RecipeCategory } from "@/lib/essen/cookbook";
import { recipeIsKnown } from "@/lib/essen/dishStatus";
import { guessDishCategory } from "@/lib/essen/dishCategory";
import type { DaySlot, PlanDay, PlanWeek } from "@/lib/essen/mealPlan";

export { CookAgainSheet, LoadTemplateSheet, SaveTemplateSheet } from "@/components/essen/plan/TemplateSheets";

export function EntrySheet({
  slot,
  day,
  recipe,
  onDouble,
  onClose,
  onSwap,
  onMove,
  onDelete,
}: {
  slot: DaySlot;
  day: PlanDay;
  /** Rezept aus dem Kochbuch (für "Kennen wir") */
  recipe?: Recipe;
  onDouble: (double: boolean) => void;
  onClose: () => void;
  onSwap: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const entry = slot.entry!;
  const wish = entry.stored.kind === "wish";
  const profile = useProfile();
  const small = profile ? isSmallHousehold(profile) : false;
  return (
    <Sheet title={`${day.weekday} · Hauptgericht`} onClose={onClose}>
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
      {recipe && <KnownSwitch recipe={recipe} />}
      <label className={`${CARD} flex cursor-pointer items-center gap-3 p-4`}>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{small ? "Reicht für morgen" : "Doppelt kochen – Reste für morgen"}</span>
          <span className="block text-sm text-muted">
            {small ? "Gleich für zwei Tage einkaufen und kochen – morgen ist schon was da." : "Doppelte Mengen auf der Einkaufsliste, morgen gibt es die Reste."}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={entry.double}
          onChange={(e) => onDouble(e.target.checked)}
          className="h-6 w-6 shrink-0 accent-accent"
        />
      </label>
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

/** "Kennen wir": bekannte Gerichte zeigen auf der Startseite nur den Namen */
export function KnownSwitch({ recipe }: { recipe: Recipe }) {
  const known = recipeIsKnown(recipe);
  // Oft genug gekocht → bekannt, auch ohne Markierung
  const automatic = !recipe.known && known;
  return (
    <label className={`${CARD} flex cursor-pointer items-center gap-3 p-4`}>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">Kennen wir</span>
        <span className="block text-sm text-muted">
          {automatic ? "Schon öfter gekocht – das Rezept gibt’s trotzdem auf Antippen." : "Dann reicht auf der Startseite der Name, das Rezept gibt’s auf Antippen."}
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label="Kennen wir"
        checked={known}
        disabled={automatic}
        onChange={(e) => setRecipeKnown(recipe.id, e.target.checked)}
        className="h-6 w-6 shrink-0 accent-accent"
      />
    </label>
  );
}

export function RecipePickerSheet({
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
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-background"
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

export function TextEntrySheet({
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

export function MoveSheet({
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
          .filter((d) => !d.away && d.slot.key !== from.key)
          .map((d) => (
            <li key={d.slot.key}>
              <button
                type="button"
                onClick={() => onMove(d.slot)}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left active:bg-background"
              >
                <span className="whitespace-nowrap font-bold">{d.weekday}</span>
                <span className="flex min-w-0 items-center gap-1 truncate text-sm text-muted">
                  {d.slot.entry ? (
                    <>
                      <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                      <span className="truncate">{d.slot.entry.title}</span>
                    </>
                  ) : (
                    "frei"
                  )}
                </span>
              </button>
            </li>
          ))}
      </ul>
    </Sheet>
  );
}
