"use client";

import Link from "next/link";
import { useRef } from "react";
import { BookOpen, Clock, Coins, MapPin, MoreHorizontal, Plus, Repeat, RotateCcw, Soup, StickyNote, Users, X } from "lucide-react";
import { CATEGORY_DOT, CategoryChip, EMPTY_DOT } from "@/components/ui/Category";
import { CARD, buttonClass } from "@/components/ui/styles";
import type { Recipe } from "@/lib/cookbook";
import { estimateCost } from "@/lib/costs";
import { dishEmoji } from "@/lib/dishEmoji";
import type { PlanDay } from "@/lib/mealPlan";
import { MEAL_TIME_LABELS } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";

const SHORT_DATE = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
};

/** Farbe des Kategorie-Punkts eines Tages (leer = grau) */
export function dayDot(day: PlanDay): string {
  if (day.away) return "bg-transparent border border-stone-300";
  const category = day.slot.entry?.category ?? (day.cheat && !day.slot.entry ? "cheatday" : null);
  return category ? CATEGORY_DOT[category] : EMPTY_DOT;
}

/** Gerichtname wie angezeigt (Wunsch mit Namen) */
export function dishTitle(day: PlanDay): string {
  const entry = day.slot.entry;
  if (!entry) return "";
  return entry.stored.kind === "wish" ? `${entry.kidName} wünscht sich: ${entry.title}` : entry.title;
}

/** Horizontale Tagesleiste: Wochentag, Datum, Kategorie-Punkt */
export function DayStrip({
  days,
  selected,
  todayIso,
  onSelect,
}: {
  days: PlanDay[];
  selected: string;
  todayIso: string;
  onSelect: (weekday: string) => void;
}) {
  return (
    <div role="tablist" aria-label="Tage" className="grid grid-cols-7 gap-1" data-no-swipe>
      {days.map((d) => {
        const active = d.weekday === selected;
        const today = d.date === todayIso;
        return (
          <button
            key={d.weekday}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${d.weekday} ${SHORT_DATE(d.date)}${today ? " (heute)" : ""}`}
            onClick={() => onSelect(d.weekday)}
            className={`flex flex-col items-center gap-1 rounded-xl py-2 transition ${
              active ? "bg-accent text-on-accent shadow-card" : today ? "text-accent-strong" : "text-ink"
            }`}
          >
            <span className={`text-xs font-bold uppercase ${active ? "text-on-accent/90" : today ? "" : "text-muted"}`}>{d.weekday.slice(0, 2)}</span>
            <span className="text-base font-extrabold leading-none">{SHORT_DATE(d.date).split(".")[0]}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${active && !d.slot.entry && !d.cheat ? "bg-on-accent/60" : dayDot(d)}`} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

type CardProps = {
  day: PlanDay;
  recipes: Record<string, Recipe>;
  readOnly: boolean;
  onPlan: () => void;
  onSwap: () => void;
  onMore: () => void;
  onCookAgain: () => void;
  onRemoveNote: () => void;
  /** Seitlich wischen: -1 = vorheriger, 1 = nächster Tag */
  onSwipe: (direction: -1 | 1) => void;
};

/** Große Karte für den gewählten Tag */
export function DayCard({ day, recipes, readOnly, onPlan, onSwap, onMore, onCookAgain, onRemoveNote, onSwipe }: CardProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const entry = day.slot.entry;
  const recipe = entry?.recipeId ? recipes[entry.recipeId] : undefined;
  const wish = entry?.stored.kind === "wish";
  // Kosten-Schätzung nur bei Darstellung "Alles zeigen"
  const showCost = useProfile()?.display === "alles";
  const cost = recipe && showCost ? estimateCost(recipe, day.persons) : null;
  const emoji = day.paused ? "☀️" : day.away ? "🏕️" : entry ? (wish ? "🎉" : dishEmoji(entry.title, entry.category)) : day.cheat ? "🍕" : "🍽️";
  const overline = `${day.weekday} · ${day.paused ? "Pause" : day.away ? "Ausflug" : day.weekend === "locker" ? "Falls ihr Lust habt" : MEAL_TIME_LABELS[day.mealTime]}`;

  return (
    <section
      aria-label={`${day.weekday} – ${entry ? dishTitle(day) : day.away ? "Ausflug" : "frei"}`}
      className={`${CARD} overflow-hidden`}
      onPointerDown={(e) => {
        start.current = (e.target as HTMLElement).closest("button, a") ? null : { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) onSwipe(dx < 0 ? 1 : -1);
      }}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className={`relative flex h-36 items-center justify-center bg-linear-to-br from-accent-soft via-accent-soft to-accent/45 ${
          entry || day.away || day.cheat ? "" : "opacity-60"
        }`}
      >
        <span className="text-7xl drop-shadow-sm" aria-hidden>
          {emoji}
        </span>
        {entry && !readOnly && (
          <button
            type="button"
            onClick={onMore}
            aria-label="Mehr: doppelt kochen, verschieben, löschen"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-card"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">{overline}</p>
          {day.away ? (
            <h2 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">
              {day.paused ? "Pause – genießt die Zeit" : "Ausflug – heute wird nicht gekocht"}
            </h2>
          ) : entry ? (
            <h2 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">{dishTitle(day)}</h2>
          ) : (
            <h2 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-muted">
              {day.weekend === "frei" ? "Wochenende – frei 🏖" : day.cheat ? "Cheat Day – worauf habt ihr Lust? 🍕" : readOnly ? "Nichts eingetragen" : "Noch frei"}
            </h2>
          )}
        </div>

        {!day.away && (
          <div className="flex flex-wrap items-center gap-2">
            {entry?.category && <CategoryChip category={entry.category} short />}
            {wish && <Chip>Wunschtag 🎉</Chip>}
            {day.cheat && !wish && entry?.category !== "cheatday" && <Chip>Cheat Day 🍕</Chip>}
            {!entry && day.slot.hint && !readOnly && <CategoryChip category={day.slot.hint} short>Vorschlag: {day.slot.hint === "vegetarisch" ? "Veggie" : day.slot.hint === "fleisch" ? "Fleisch" : day.slot.hint === "fisch" ? "Fisch" : "Cheat Day"}</CategoryChip>}
            {recipe?.prepMinutes ? (
              <Chip>
                <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {recipe.prepMinutes} Min.
              </Chip>
            ) : null}
            {day.persons ? (
              <Chip>
                <Users className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {day.persons} Pers.
              </Chip>
            ) : null}
            {cost !== null && (
              <Chip>
                <Coins className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />~{entry?.double ? cost * 2 : cost} €
              </Chip>
            )}
            {entry?.double && <Chip>doppelt – Reste für morgen</Chip>}
            {entry?.origin === "fest" && <Chip>fest eingeplant</Chip>}
          </div>
        )}

        {day.away && !day.paused && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <MapPin className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
            Eingetragen im Wochen-Check
          </p>
        )}
        {day.leftovers && !day.away && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Soup className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
            <span>
              Zweite Mahlzeit: <span className="font-semibold text-ink">Reste von {day.leftovers}</span>
            </span>
          </p>
        )}
        {day.note && (
          <p className="flex items-start gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-700">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
            <span className="min-w-0 flex-1">{day.note}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={onRemoveNote}
                aria-label={`Notiz am ${day.weekday} entfernen`}
                className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center text-stone-400"
              >
                <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
            )}
          </p>
        )}

        {!day.away &&
          (entry ? (
            <div className="grid grid-cols-2 gap-2">
              {readOnly ? (
                <button type="button" onClick={onCookAgain} className={buttonClass("secondary", "lg")}>
                  <RotateCcw className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
                  Nochmal kochen
                </button>
              ) : (
                <button type="button" onClick={onSwap} className={buttonClass("secondary", "lg")}>
                  <Repeat className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
                  Tauschen
                </button>
              )}
              {entry.recipeId ? (
                <Link href={`/kochbuch/rezept?id=${encodeURIComponent(entry.recipeId)}`} className={buttonClass("primary", "lg")}>
                  <BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden />
                  Rezept
                </Link>
              ) : (
                <span className={`${buttonClass("primary", "lg")} pointer-events-none opacity-40`} aria-disabled>
                  <BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden />
                  Rezept
                </span>
              )}
            </div>
          ) : (
            !readOnly && (
              <button type="button" onClick={onPlan} className={`${buttonClass("primary", "lg")} w-full`}>
                <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                Planen
              </button>
            )
          ))}
      </div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
      {children}
    </span>
  );
}

/** "Danach": die nächsten Tage als kompakte Zeilen */
export function UpcomingDays({ days, onSelect }: { days: PlanDay[]; onSelect: (weekday: string) => void }) {
  if (days.length === 0) return null;
  return (
    <section aria-label="Danach" className="flex flex-col gap-2">
      <h3 className="px-1 text-xs font-bold uppercase tracking-wider text-muted">Danach</h3>
      <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        {days.map((d) => (
          <li key={d.date} className="border-b border-line last:border-b-0">
            <button type="button" onClick={() => onSelect(d.weekday)} className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left active:bg-stone-50">
              <span className="w-8 shrink-0 text-sm font-bold text-muted">{d.weekday.slice(0, 2)}</span>
              <span className={`h-2 w-2 shrink-0 rounded-full ${dayDot(d)}`} aria-hidden />
              <span className={`min-w-0 flex-1 truncate ${d.slot.entry ? "font-semibold" : "text-muted"}`}>
                {d.paused ? "Pause ☀️" : d.away ? "Ausflug" : d.slot.entry ? dishTitle(d) : d.weekend === "frei" ? "Wochenende frei 🏖" : d.cheat ? "Cheat Day 🍕" : "frei"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
