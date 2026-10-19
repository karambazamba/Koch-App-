"use client";

// Seite "Heute": Begrüßung, EIN Satz von Lotte (oder eine fällige
// Erinnerung), die Karte mit Terminen/Aufgaben, Kacheln Essen und Einkauf,
// ab 16 Uhr eine leise Vorschau auf morgen. Leere Karten erscheinen nicht.

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeftRight, CalendarDays, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { DEFAULT_HOME, useHomeTiles, type TileSize } from "@/lib/core/homeLayout";
import { HomeCustomizerSheet } from "./HomeCustomizer";
import { buzz } from "./actions";
import { LotteAvatar } from "@/components/LotteAvatar";
import { CARD, buttonClass } from "@/components/ui/styles";
import { QuickAddButton } from "@/components/shopping/QuickAdd";
import { clockLabel, itemText } from "@/lib/aufgaben/answers";
import { itemsForDay, type CalendarEntry } from "@/lib/aufgaben/model";
import { dueReminder } from "@/lib/aufgaben/reminders";
import { markReminderSeen, useSeenReminders } from "@/lib/aufgaben/store";
import { greeting, todaySentence } from "@/lib/aufgaben/summary";
import { addDays } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { helperName, mealClockFor, pausedOn, saveProfile } from "@/lib/einstellungen/profile";
import { pauseLabel } from "@/lib/essen/spontan";
import { pushUndo } from "@/lib/core/undo";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import { loadMealPlans, replaceMealPlans, type PlanDay } from "@/lib/essen/mealPlan";
import { takeForToday } from "@/lib/essen/spontanTake";
import { useTodayIdeas } from "@/lib/essen/useIdeas";
import { openHelper } from "@/lib/lotte/open";
import type { HomeData } from "@/components/home/useHomeData";
import { DayItemsCard } from "./Items";
import { dishOf } from "./useMeals";

const DATE = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

/** Name für die Begrüßung: die erste Person im Haushalt (meist man selbst) */
const firstName = (data: HomeData) => data.profile.persons[0]?.name.trim() ?? "";

export function TodayPage({ data, entries, minutes, onOpenFood }: { data: HomeData; entries: CalendarEntry[]; minutes: number; onOpenFood: () => void }) {
  const seen = useSeenReminders();
  const cooked = useCookedDays();
  const items = itemsForDay(entries, data.todayIso, data.todayIso);
  const name = firstName(data);
  const over = Boolean(cooked && mealIsOver(data.day, data.profile, minutes, cooked));
  const dish = over ? null : dishOf(data.day);
  const dishClock = data.day ? mealClockFor(data.profile, data.day.weekday) : null;
  const reminder = dueReminder(entries, data.todayIso, minutes, seen);
  const tomorrowIso = addDays(data.todayIso, 1);
  const tomorrowItems = minutes >= 16 * 60 ? itemsForDay(entries, tomorrowIso, data.todayIso).filter((i) => !i.done) : [];
  const tomorrowDish = minutes >= 16 * 60 ? dishOf(data.tomorrow) : null;
  const openItems = items.filter((i) => !i.done);
  // Pause (Urlaub) – sichtbar und mit einem Tipp beendet
  const paused = pausedOn(data.profile, data.todayIso);
  const endPause = () => {
    const before = data.profile;
    saveProfile({ ...before, pause: null });
    showToast({ text: "Pause beendet ✓", undo: pushUndo("das Beenden der Pause", () => saveProfile(before)), undoneText: "Rückgängig gemacht." });
  };
  const tiles = useHomeTiles();
  const [customize, setCustomize] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-0.5 pt-1">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">
          {greeting(minutes)}
          {name ? `, ${name}` : ""}.
        </h1>
        <p className="text-sm font-medium text-muted">{DATE.format(data.today)}</p>
      </header>

      <LotteSays
        text={reminder ? reminder.text : paused && data.profile.pause ? `Pause ${pauseLabel(data.profile.pause)} – genießt die Zeit ☀️` : todaySentence({ items, dish, dishClock })}
        name={helperName(data.profile)}
        action={
          reminder
            ? { label: "Okay", onClick: () => markReminderSeen(reminder.key) }
            : paused
              ? { label: "Pause beenden", onClick: endPause }
              : !dish && !over && minutes < 20 * 60 && !data.day?.away
              ? { label: "Essensidee?", onClick: () => openHelper(undefined, "Was gibt's heute?") }
              : null
        }
      />

      {(tiles ?? DEFAULT_HOME).filter((t) => t.visible).map((tile) => (
        <Pressable key={tile.id} onLongPress={() => setCustomize(true)}>
          {tile.id === "termine" ? (
            tile.size === "ausfuehrlich" ? (
              <DayItemsCard items={items} title="Heute" titleHref={`/tag?datum=${data.todayIso}`} />
            ) : (
              <CompactTile href={`/tag?datum=${data.todayIso}`} label="Termine & Aufgaben" icon={<CalendarDays className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />} line={openItems.length ? openItems.map(itemText).join(", ") : items.length ? "Alles erledigt 🌙" : "Heute nichts eingetragen"} />
            )
          ) : tile.id === "essen" ? (
            tile.size === "ausfuehrlich" ? (
              <FoodTile data={data} dish={dish} over={over} onOpen={onOpenFood} />
            ) : (
              <CompactTile
                onClick={onOpenFood}
                label={over ? "Essen morgen" : `Essen${dish && dishClock ? ` · ${clockLabel(dishClock)}` : ""}`}
                icon={<UtensilsCrossed className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />}
                line={(over ? dishOf(data.tomorrow) : dish) ?? (data.day?.away ? "Heute kein Kochtag" : "Noch frei – Ideen ansehen")}
              />
            )
          ) : tile.id === "einkauf" ? (
            <ShoppingTile size={tile.size} />
          ) : (tomorrowItems.length > 0 || tomorrowDish) && (
            tile.size === "ausfuehrlich" ? (
              <section className="rounded-card border-2 border-dashed border-line px-4 py-3" aria-label="Morgen">
                <Link href={`/tag?datum=${tomorrowIso}`} className="block">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Morgen</h2>
                  <ul className="mt-1 flex flex-col gap-1 text-base">
                    {tomorrowItems.slice(0, 3).map((i) => (
                      <li key={i.key} className="truncate">
                        {itemText(i)}
                      </li>
                    ))}
                    {tomorrowItems.length > 3 && <li className="text-sm text-muted">und noch {tomorrowItems.length - 3} mehr</li>}
                    {tomorrowDish && <li className="truncate text-muted">🍽 {tomorrowDish}</li>}
                  </ul>
                </Link>
              </section>
            ) : (
              <section className="rounded-card border-2 border-dashed border-line" aria-label="Morgen">
                <Link href={`/tag?datum=${tomorrowIso}`} className="flex items-center gap-2 px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Morgen</span>
                  <span className="min-w-0 flex-1 truncate text-base">{[...tomorrowItems.map(itemText), tomorrowDish ? `🍽 ${tomorrowDish}` : ""].filter(Boolean).join(" · ")}</span>
                </Link>
              </section>
            )
          )}
        </Pressable>
      ))}
      {customize && <HomeCustomizerSheet onClose={() => setCustomize(false)} />}
    </div>
  );
}

/** Lottes EIN Satz mit höchstens einem Knopf */
export function LotteSays({ text, name, action }: { text: string; name: string; action: { label: string; onClick: () => void } | null }) {
  return (
    <section className="flex items-start gap-3" aria-label={`${name} sagt`}>
      <LotteAvatar size={36} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2 pt-1.5">
        <p className="text-base font-medium leading-snug" role="status">
          {text}
        </p>
        {action && (
          <button type="button" onClick={action.onClick} className={buttonClass("soft", "sm")}>
            {action.label}
          </button>
        )}
      </div>
    </section>
  );
}

const TILE = `${CARD} relative flex flex-col gap-1 p-4`;

/** Kachel Essen: Gericht von heute (bzw. eine Idee), ⇄ = andere Idee */
function FoodTile({ data, dish, over, onOpen }: { data: HomeData; dish: string | null; over: boolean; onOpen: () => void }) {
  const ideas = useTodayIdeas([], { tomorrow: over });
  const [alt, setAlt] = useState<number | null>(null);
  const list = ideas?.ideas ?? [];
  const idea = alt !== null && list.length ? list[alt % list.length] : !dish && list.length ? list[0] : null;
  const day: PlanDay | undefined = over ? data.tomorrow : data.day;
  const title = idea ? idea.title : dish ?? (day?.away ? (day.paused ? "Pause" : "Kein Kochtag") : "Noch frei");
  const take = () => {
    if (!idea || over) return;
    const before = loadMealPlans();
    const result = takeForToday({ profile: data.profile, weekPlans: data.weekPlans, mealPlans: before, recipes: data.recipes }, data.today, idea, { spontan: data.planStyle === "spontan" });
    if (!result.ok) return showToast({ text: result.text });
    replaceMealPlans(result.weeks);
    setAlt(null);
    showToast({ text: result.text, undo: () => replaceMealPlans(before), undoneText: "Rückgängig gemacht." });
  };
  return (
    <section className={TILE} aria-label="Essen">
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col items-start gap-1 pr-8 text-left">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
          <UtensilsCrossed className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
          {over ? "Morgen" : "Essen"}
        </span>
        <span className="line-clamp-2 text-base font-bold leading-snug">{idea ? `Idee: ${title}` : title}</span>
        {!idea && dish && day && <span className="text-sm text-muted">{clockLabel(mealClockFor(data.profile, day.weekday))} Uhr</span>}
        {idea?.minutes && <span className="text-sm text-muted">{idea.minutes} Min</span>}
      </button>
      {list.length > 0 && (
        <button
          type="button"
          onClick={() => setAlt((a) => (a === null ? (dish ? 0 : 1) : a + 1))}
          aria-label="Andere Idee"
          className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center text-accent"
        >
          <ArrowLeftRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
      )}
      {idea && !over && (
        <button type="button" onClick={take} className={`${buttonClass("soft", "sm")} mt-1 self-start`}>
          Nehmen
        </button>
      )}
    </section>
  );
}

/** Kompakte Kachel: Titel + eine Zeile Vorschau, antippen öffnet die Seite */
function CompactTile({ label, line, icon, href, onClick, action }: { label: string; line: string; icon: React.ReactNode; href?: string; onClick?: () => void; action?: React.ReactNode }) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
        {icon}
        {label}
      </span>
      <span className="block truncate text-base font-semibold">{line}</span>
    </>
  );
  return (
    <section className={`${CARD} relative`} aria-label={label}>
      {href ? (
        <Link href={href} className={`flex min-h-16 flex-col justify-center gap-0.5 px-4 py-3 ${action ? "pr-14" : ""}`}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={`flex min-h-16 w-full flex-col justify-center gap-0.5 px-4 py-3 text-left ${action ? "pr-14" : ""}`}>
          {body}
        </button>
      )}
      {action && <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{action}</span>}
    </section>
  );
}

/** Langes Drücken (500 ms) öffnet "Startseite anpassen"; normales Tippen bleibt, wie es ist */
function Pressable({ children, onLongPress }: { children: React.ReactNode; onLongPress: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <div
      className="select-none [-webkit-touch-callout:none]"
      onPointerDown={(e) => {
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        cancel();
        timer.current = setTimeout(() => {
          fired.current = true;
          buzz();
          onLongPress();
        }, 500);
      }}
      onPointerMove={(e) => {
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        // Nach langem Drücken kein zusätzliches Antippen auslösen
        if (fired.current) {
          e.preventDefault();
          e.stopPropagation();
          fired.current = false;
        }
      }}
    >
      {children}
    </div>
  );
}

/** Kachel Einkauf: kompakt eine Zeile, ausführlich die ersten Sachen; "+" zum Tippen oder Einsprechen */
function ShoppingTile({ size }: { size: TileSize }) {
  const shopping = useWeekShoppingList("planning");
  if (!shopping) return <section className={`${CARD} h-16 animate-pulse`} aria-label="Einkauf" />;
  // "Jetzt mitnehmen" und selbst Eingetragenes zuerst, dann Zutaten aus Gerichten
  const open = shopping.list.items
    .filter((i) => !i.checked && !i.hidden)
    .sort((a, b) => Number(Boolean(b.now)) - Number(Boolean(a.now)) || Number(Boolean(b.manualId)) - Number(Boolean(a.manualId)));
  const plus = <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} small />;
  if (size === "kompakt") {
    const sachen = `${open.length} ${open.length === 1 ? "Sache" : "Sachen"}`;
    return (
      <CompactTile
        href="/einkaufsliste"
        label={open.length ? `Einkauf · ${sachen}` : "Einkauf"}
        icon={<ShoppingCart className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />}
        line={open.length ? `${open.slice(0, 3).map((i) => i.name).join(", ")}${open.length > 3 ? " …" : ""}` : "Liste ist leer"}
        action={plus}
      />
    );
  }
  return (
    <section className={TILE} aria-label="Einkauf">
      <Link href="/einkaufsliste" className="flex flex-1 flex-col items-start gap-1 pr-8">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
          <ShoppingCart className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
          Einkauf
        </span>
        {open.length ? (
          <ul className="flex w-full flex-col text-base">
            {open.slice(0, 6).map((i) => (
              <li key={i.key} className="flex justify-between gap-3 py-0.5">
                <span className="truncate font-semibold">{i.name}</span>
                {i.amount && <span className="shrink-0 text-sm text-muted">{i.amount}</span>}
              </li>
            ))}
            {open.length > 6 && <li className="text-sm text-muted">und {open.length - 6} mehr</li>}
          </ul>
        ) : (
          <span className="text-base font-bold leading-snug text-muted">Liste ist leer</span>
        )}
      </Link>
      <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} small className="absolute right-1.5 top-1.5" />
    </section>
  );
}
