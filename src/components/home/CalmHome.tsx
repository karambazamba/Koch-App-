"use client";

// Ruhige Startseite (Neustart): eine schlichte Karte fürs Essen und die
// Einkaufsliste als Karte – mehr nicht. Alles andere macht Lotte auf Zuruf.
// Die alte Startseite (Ideen, Lottes Platz, Kacheln) bleibt hinter
// "Alte Funktionen anzeigen (Test)".

import Link from "next/link";
import { ChevronRight, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { QuickAddButton } from "@/components/shopping/QuickAdd";
import { openHelper } from "@/lib/lotte/open";
import { helperName, mealClockFor } from "@/lib/einstellungen/profile";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import type { HomeData } from "./useHomeData";

/** Heute (bzw. nach dem Essen: morgen) – nur der Name des Gerichts */
export function CalmMealCard({ data, when }: { data: HomeData; when: "heute" | "morgen" }) {
  const day = when === "morgen" ? data.tomorrow : data.day;
  const label = when === "morgen" ? "Morgen" : "Heute";
  const entry = day && !day.away ? day.slot.entry : null;
  const name = helperName(data.profile);
  const text = day?.away
    ? day.paused
      ? "Pause – genießt die Zeit"
      : `${label} wird nicht gekocht`
    : entry
      ? entry.title
      : day?.weekend === "frei"
        ? "Wochenende – genießt es"
        : null;
  return (
    <section className={`${CARD} flex items-center gap-3 p-4`} aria-label={label}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden>
        <UtensilsCrossed className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-strong">
          {label}
          {entry && day ? ` · ${mealClockFor(data.profile, day.weekday)}` : ""}
        </p>
        {text ? (
          <p className="truncate text-lg font-bold leading-snug">{text}</p>
        ) : (
          <button type="button" onClick={() => openHelper(undefined, `Was gibt's ${when}?`)} className="text-left text-base leading-snug text-muted">
            Fürs Essen steht {when} nichts fest – <span className="font-semibold text-accent-strong">{name} fragen</span>
          </button>
        )}
      </div>
    </section>
  );
}

/** Einkaufsliste als Karte: die ersten Sachen, Plus zum Ergänzen */
export function ShoppingCard() {
  const shopping = useWeekShoppingList("planning");
  if (!shopping) return <section className={`${CARD} h-28 animate-pulse`} aria-label="Einkaufsliste" />;
  // Selbst Eingetragenes (und "Jetzt mitnehmen") zuerst, dann Zutaten aus Gerichten
  const open = shopping.list.items.filter((i) => !i.checked && !i.hidden).sort((a, b) => Number(Boolean(b.now)) - Number(Boolean(a.now)) || Number(Boolean(b.manualId)) - Number(Boolean(a.manualId)));
  const shown = open.slice(0, 4);
  return (
    <section className={`${CARD} relative flex flex-col gap-2 p-4`} aria-label="Einkaufsliste">
      <Link href="/einkaufsliste" className="flex items-center gap-3 pr-12">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden>
          <ShoppingCart className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold leading-snug">Einkaufsliste</span>
          <span className="block text-sm text-muted">{open.length ? `${open.length} ${open.length === 1 ? "Sache" : "Sachen"}` : "Gerade steht nichts drauf"}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
      </Link>
      <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} small className="absolute right-3 top-3" />
      {shown.length > 0 && (
        <ul className="flex flex-col divide-y divide-line border-t border-line pt-1" aria-label="Auf der Liste">
          {shown.map((item) => (
            <li key={item.key} className="flex items-baseline justify-between gap-3 py-1.5 text-base">
              <span className="min-w-0 truncate">{item.name}</span>
              {item.amount && <span className="shrink-0 text-sm text-muted">{item.amount}</span>}
            </li>
          ))}
          {open.length > shown.length && (
            <li className="py-1.5 text-sm text-muted">
              <Link href="/einkaufsliste" className="underline-offset-2 active:underline">
                und {open.length - shown.length} mehr
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
