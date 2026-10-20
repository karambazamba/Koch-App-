"use client";

// Kacheln auf "Heute" je Größe (S/M/L): Essen, Einkauf, Notizen, Vorrat,
// Morgen. S = halbe Breite (allein: breit, gleicher Inhalt), M/L = volle
// Breite mit mehr Inhalt. Antippen öffnet die Seite, der kleine Knopf oben
// rechts legt schnell Neues an.

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, Check, Pin, PenLine, Refrigerator, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { CARD, buttonClass } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import { QuickAddButton } from "@/components/shopping/QuickAdd";
import { SchnellnotizSheet } from "@/components/notizen/Schnellnotiz";
import { clockLabel, itemText } from "@/lib/aufgaben/answers";
import type { DayItem } from "@/lib/aufgaben/model";
import type { TileSize } from "@/lib/core/homeLayout";
import { todayIso } from "@/lib/core/now";
import { toggleChecked } from "@/lib/einkauf/shoppingList";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { matchStock } from "@/lib/essen/dishIdeas";
import { loadMealPlans, replaceMealPlans, type PlanDay } from "@/lib/essen/mealPlan";
import { usePantry } from "@/lib/essen/pantry";
import { takeForToday } from "@/lib/essen/spontanTake";
import { useTodayIdeas } from "@/lib/essen/useIdeas";
import { useStock } from "@/lib/essen/useStock";
import { showToast } from "@/lib/core/toast";
import { sortNotes, useSchnellnotiz, useNotes } from "@/lib/notizen";
import type { HomeData } from "@/components/home/useHomeData";
import { buzz } from "./actions";
import { dishOf } from "./useMeals";

const HALF = `${CARD} relative flex min-h-[92px] flex-col p-3.5`;
const HALF_LABEL = "flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted";

/** ESSEN – S: Gericht + ⇄; M: breit mit Zeit, Zutaten-Status, ⇄; L: + Ideen für morgen */
export function FoodTile({ data, dish, over, dishClock, onOpen, size = "S", onCook }: { data: HomeData; dish: string | null; over: boolean; dishClock: string | null; onOpen: () => void; size?: TileSize; onCook?: () => void }) {
  const ideas = useTodayIdeas([], { tomorrow: over });
  const tomorrowIdeas = useTodayIdeas([], { tomorrow: true });
  const stock = useStock();
  const [alt, setAlt] = useState<number | null>(null);
  const list = ideas?.ideas ?? [];
  const idea = alt !== null && list.length ? list[alt % list.length] : null;
  const day: PlanDay | undefined = over ? data.tomorrow : data.day;
  const title = idea ? idea.title : (over ? dishOf(data.tomorrow) : dish) ?? (day?.away ? (day.paused ? "Pause" : "Kein Kochtag") : "Noch frei");
  const entry = day && !day.away ? day.slot.entry : null;
  const recipe = !idea && entry?.recipeId ? data.recipes[entry.recipeId] : undefined;
  const needs = recipe && stock ? matchStock(recipe.ingredients.map((i) => i.name), stock).needs : null;
  const facts =
    size === "S"
      ? []
      : [recipe?.prepMinutes ? `${recipe.prepMinutes} Min` : "", needs ? (needs.length ? `noch: ${needs.slice(0, 2).join(", ")}${needs.length > 2 ? " …" : ""}` : "alles im Haus") : ""].filter(Boolean);
  const sub = idea ? `Idee · ${idea.minutes ?? "?"} Min` : !dish && !day?.away && list.length ? `${Math.min(3, list.length)} Ideen ansehen` : facts.join(" · ");
  const take = () => {
    if (!idea || over) return;
    const before = loadMealPlans();
    const result = takeForToday({ profile: data.profile, weekPlans: data.weekPlans, mealPlans: before, recipes: data.recipes }, data.today, idea, { spontan: data.planStyle === "spontan" });
    if (!result.ok) return showToast({ text: result.text });
    replaceMealPlans(result.weeks);
    setAlt(null);
    buzz();
  };
  const label = over ? "Morgen" : `Essen${dish && dishClock ? ` · ${clockLabel(dishClock)}` : ""}`;
  return (
    <section className={HALF} aria-label={over ? "Essen morgen" : label}>
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col items-start gap-1 text-left">
        <span className={`${HALF_LABEL} pr-6`}>
          <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
          <span className="truncate">{label}</span>
        </span>
        <span className={`line-clamp-2 font-bold leading-snug ${size === "S" ? "text-[15px]" : "text-[18px]"}`}>{title}</span>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </button>
      {list.length > 0 && (
        <span className="absolute right-3.5 top-3">
          <QuickButton icon={ArrowLeftRight} label="Andere Idee" onClick={() => setAlt((a) => (a === null ? 0 : a + 1))} />
        </span>
      )}
      {idea && !over && (
        <button type="button" onClick={take} className={`${buttonClass("soft", "sm")} mt-1 self-start`}>
          Nehmen
        </button>
      )}
      {/* "Ich koche jetzt" (bei "Mitdenkend"): Rezept-Schritte und Timer kommen nach oben */}
      {onCook && !idea && (
        <button type="button" onClick={onCook} className="-mb-2 mt-0.5 flex h-11 items-center self-start text-[13px] font-bold text-accent-strong">
          🍳 Ich koche jetzt
        </button>
      )}
      {size === "L" && !over && (tomorrowIdeas?.ideas.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Ideen für morgen</span>
          <div className="flex flex-wrap gap-1.5">
            {tomorrowIdeas!.ideas.slice(0, 3).map((i) => (
              <button key={i.title} type="button" onClick={onOpen} className="rounded-full bg-accent-soft px-3 py-1 text-[13px] font-semibold text-accent-strong">
                {i.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** EINKAUF – S: Anzahl + erste Sachen; M: bis zu 6 zum Abhaken; L: bis zu 10. "+" = Schnell-Eintrag */
export function ShoppingTile({ half, size = "S" }: { half: boolean; size?: TileSize }) {
  const shopping = useWeekShoppingList("planning");
  if (!shopping) return <section className={`${HALF} animate-pulse`} aria-label="Einkauf" />;
  // "Jetzt mitnehmen" und selbst Eingetragenes zuerst, dann Zutaten aus Gerichten
  const open = shopping.list.items
    .filter((i) => !i.checked && !i.hidden)
    .sort((a, b) => Number(Boolean(b.now)) - Number(Boolean(a.now)) || Number(Boolean(b.manualId)) - Number(Boolean(a.manualId)));
  const max = size === "L" ? 10 : 6;
  return (
    <section className={HALF} aria-label={open.length ? `Einkauf · ${open.length}` : "Einkauf"}>
      <Link href="/einkaufsliste" className="flex flex-col gap-1">
        <span className={`${HALF_LABEL} pr-6`}>
          <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
          <span className="truncate">Einkauf{open.length ? ` · ${open.length}` : ""}</span>
        </span>
        {!open.length && <span className="text-[14px] text-muted">Liste ist leer</span>}
        {open.length > 0 && size === "S" && (
          <span className={`${half ? "line-clamp-2" : "line-clamp-1"} text-[14px] font-semibold leading-snug`}>{open.slice(0, 8).map((i) => i.name).join(", ")}</span>
        )}
      </Link>
      {open.length > 0 && size !== "S" && (
        <ul className="-mx-2 mt-0.5 grid grid-cols-2 gap-x-2" aria-label="Zum Abhaken">
          {open.slice(0, max).map((item) => (
            <li key={item.key}>
              <button
                type="button"
                role="checkbox"
                aria-checked={false}
                aria-label={`${item.name} abhaken`}
                onClick={() => {
                  buzz();
                  toggleChecked(shopping.weekStart, item, todayIso());
                }}
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left active:bg-stone-100"
              >
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-2 border-stone-300">
                  <Check className="h-3 w-3 text-transparent" strokeWidth={3} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open.length > max && size !== "S" && (
        <Link href="/einkaufsliste" className="mt-1 text-xs font-bold text-accent-strong">
          + {open.length - max} weitere
        </Link>
      )}
      <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} quick className="absolute right-0.5 top-0.5" />
    </section>
  );
}

/**
 * NOTIZEN (gelblich) – S: die ersten 2 Zeilen der Schnellnotiz; M: + angeheftete
 * als Chips; L: + die 3 neuesten Notizen. ✎ = Schnellnotiz-Fenster, Chip =
 * diese Notiz, Kachel = Notizen-Seite.
 */
export function NotesTile({ name, size = "M" }: { name: string; size?: TileSize }) {
  const schnellnotiz = useSchnellnotiz();
  const notes = useNotes();
  const [open, setOpen] = useState(false);
  const lines = (schnellnotiz?.text ?? "").split(/\n/).map((l) => l.trim()).filter(Boolean);
  const sorted = notes ? sortNotes(notes) : [];
  const pinned = sorted.filter((n) => n.data.pinned);
  const newest = [...(notes ?? [])].sort((a, b) => b.geaendert.localeCompare(a.geaendert)).filter((n) => !n.data.pinned).slice(0, 3);
  const shown = lines.slice(0, size === "S" ? 2 : 3);
  return (
    <>
      <section className="relative flex min-h-[92px] flex-col gap-1 rounded-2xl border border-schnellnotiz-line bg-schnellnotiz p-3.5" aria-label="Notizen">
        <Link href="/notizen" className="flex flex-col gap-0.5 pr-8" aria-label="Notizen öffnen">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase leading-tight tracking-wider text-schnellnotiz-ink">
            <PenLine className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            Notizen
          </span>
          {shown.length ? (
            shown.map((l, i) => (
              <span key={i} className="block w-full truncate text-[13px] leading-[1.35]">
                {l}
              </span>
            ))
          ) : (
            <span className="text-[13px] text-muted">Schnell was aufschreiben …</span>
          )}
          {lines.length > shown.length && <span className="text-[11px] leading-tight text-muted">+ {lines.length - shown.length} weitere Zeilen</span>}
        </Link>
        <span className="absolute right-3.5 top-3">
          <QuickButton icon={PenLine} tone="schnellnotiz" label="Schnellnotiz schreiben" onClick={() => setOpen(true)} />
        </span>
        {size !== "S" && pinned.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1.5" aria-label="Angeheftet">
            {pinned.slice(0, 6).map((n) => (
              <Link key={n.id} href={`/notizen/bearbeiten?id=${n.id}`} className="inline-flex max-w-full items-center gap-1 rounded-full border border-schnellnotiz-line bg-surface/70 px-2.5 py-1 text-[12.5px] font-semibold">
                <Pin className="h-3 w-3 shrink-0 text-schnellnotiz-ink" strokeWidth={2.25} aria-hidden />
                <span className="truncate">
                  {n.data.emoji ? `${n.data.emoji} ` : ""}
                  {n.data.title}
                </span>
              </Link>
            ))}
          </div>
        )}
        {size === "L" && newest.length > 0 && (
          <ul className="mt-1 flex flex-col gap-0.5 border-t border-schnellnotiz-line pt-1.5" aria-label="Neueste Notizen">
            {newest.map((n) => (
              <li key={n.id}>
                <Link href={`/notizen/bearbeiten?id=${n.id}`} className="flex min-h-9 items-center gap-2 text-[13.5px]">
                  <span aria-hidden>{n.data.emoji ?? "📝"}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{n.data.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {open && <SchnellnotizSheet name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

/** VORRAT (Baustein) – S: Anzahl + erste Sachen; M: mehr */
export function PantryTile({ size = "S" }: { size?: TileSize }) {
  const pantry = usePantry();
  if (!pantry) return <section className={`${HALF} animate-pulse`} aria-label="Vorrat" />;
  return (
    <Link href="/vorrat" className={HALF} aria-label="Vorrat">
      <span className={HALF_LABEL}>
        <Refrigerator className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
        <span className="truncate">Vorrat{pantry.length ? ` · ${pantry.length}` : ""}</span>
      </span>
      <span className={`mt-1 ${size === "S" ? "line-clamp-2" : "line-clamp-3"} text-[14px] leading-snug`}>
        {pantry.length ? pantry.slice(0, size === "S" ? 4 : 12).map((p) => p.name).join(", ") : "Noch nichts eingetragen"}
      </span>
    </Link>
  );
}

/** MORGEN (ab 16 Uhr, gestrichelt, eine Zeile). Im Bearbeiten-Modus immer sichtbar. */
export function MorgenTile({ items, dish, href, placeholder }: { items: DayItem[]; dish: string | null; href: string; placeholder?: boolean }) {
  if (!items.length && !dish && !placeholder) return null;
  return (
    <section className="rounded-card border-2 border-dashed border-line" aria-label="Morgen">
      <Link href={href} className="flex items-center gap-2 px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Morgen</span>
        <span className="min-w-0 flex-1 truncate text-base">{items.length || dish ? [...items.map(itemText), dish ? `🍽 ${dish}` : ""].filter(Boolean).join(" · ") : <span className="text-muted">Vorschau ab 16 Uhr</span>}</span>
      </Link>
    </section>
  );
}
