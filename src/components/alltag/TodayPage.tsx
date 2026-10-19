"use client";

// Seite "Heute": Begrüßung, EIN Satz von Lotte (oder eine fällige
// Erinnerung), die Karte mit Terminen/Aufgaben, Kacheln Essen und Einkauf,
// ab 16 Uhr eine leise Vorschau auf morgen. Leere Karten erscheinen nicht.

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeftRight, NotebookPen, PenLine, Refrigerator, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { DEFAULT_HOME, markHomeTipSeen, tileMeta, tileRows, useHomeTiles, useHomeTipSeen } from "@/lib/core/homeLayout";
import { useWelcomeFinished } from "@/lib/einstellungen/welcomeStore";
import { HomeEditSheet } from "./HomeCustomizer";
import { buzz } from "./actions";
import { LotteAvatar } from "@/components/LotteAvatar";
import { CARD, buttonClass } from "@/components/ui/styles";
import { QuickAddButton } from "@/components/shopping/QuickAdd";
import { clockLabel, itemText } from "@/lib/aufgaben/answers";
import { itemsForDay, openTaskCount, taskOverview, upcomingTermine, type CalendarEntry } from "@/lib/aufgaben/model";
import { sortNotes, useNotes } from "@/lib/notizen";
import { KladdeTile } from "@/components/notizen/Kladde";
import { QuickButton } from "@/components/ui/QuickButton";
import { AufgabenSection, TermineSection } from "./MiniCards";
import { dueReminder } from "@/lib/aufgaben/reminders";
import { markReminderSeen, useSeenReminders } from "@/lib/aufgaben/store";
import { greeting, homeSentence, type SentencePart } from "@/lib/aufgaben/summary";
import { addDays } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { hasKids, helperName, mealClockFor, pausedOn, saveProfile } from "@/lib/einstellungen/profile";
import { useFeature } from "@/lib/core/features";
import { dailyTip } from "@/lib/essen/tips/daily";
import { usePantry } from "@/lib/essen/pantry";
import { pauseLabel } from "@/lib/essen/spontan";
import { pushUndo } from "@/lib/core/undo";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import { loadMealPlans, replaceMealPlans, type PlanDay } from "@/lib/essen/mealPlan";
import { takeForToday } from "@/lib/essen/spontanTake";
import { useTodayIdeas } from "@/lib/essen/useIdeas";
import { openHelper } from "@/lib/lotte/open";
import type { HomeData } from "@/components/home/useHomeData";
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
  const tomorrowAll = itemsForDay(entries, tomorrowIso, data.todayIso).filter((i) => !i.done);
  const tomorrowItems = minutes >= 16 * 60 ? tomorrowAll : [];
  const tomorrowDish = minutes >= 16 * 60 ? dishOf(data.tomorrow) : null;
  const openItems = items.filter((i) => !i.done);
  // Bausteine Tipps / Wochenend-Ideen: nur über diesen einen Satz – und nur an ruhigen Tagen (nichts mehr offen)
  const tipsOn = useFeature("tipps");
  const weekendOn = useFeature("wochenendIdeen");
  const pantryOn = useFeature("vorrat");
  const [tipOpen, setTipOpen] = useState(false);
  const tip =
    (tipsOn || weekendOn) && !openItems.length
      ? dailyTip(data.todayIso, { dish, tips: Boolean(tipsOn), weekendIdeas: Boolean(weekendOn), kids: hasKids(data.profile), persons: data.profile.persons.length })
      : null;
  // Pause (Urlaub) – sichtbar und mit einem Tipp beendet
  const paused = pausedOn(data.profile, data.todayIso);
  const endPause = () => {
    const before = data.profile;
    saveProfile({ ...before, pause: null });
    showToast({ text: "Pause beendet ✓", undo: pushUndo("das Beenden der Pause", () => saveProfile(before)), undoneText: "Rückgängig gemacht." });
  };
  const tiles = useHomeTiles();
  const tipSeen = useHomeTipSeen();
  const welcomed = useWelcomeFinished();
  const [editing, setEditing] = useState(false);
  // Termine = feste Uhrzeit (Kärtchen), Aufgaben = zu erledigen (Zeilen) – je höchstens zwei
  const termine = upcomingTermine(entries, data.todayIso, minutes);
  const overview = taskOverview(entries, data.todayIso);
  const tasks = [...overview.heute, ...overview.woche];
  const moreTasks = Math.max(0, openTaskCount(entries, data.todayIso) - Math.min(3, tasks.length));
  // Kacheln in Reihen; Bausteine nur, wenn sie an sind; "bald" nie
  const visible = (tiles ?? DEFAULT_HOME).filter((t) => t.visible && !tileMeta(t.id).soon && (t.id !== "vorrat" || pantryOn));
  const rows = tileRows(visible);

  const sentence = homeSentence({
    minutes,
    termineToday: items.filter((i) => i.entry.typ === "termin"),
    termineUpcoming: termine,
    tasksToday: overview.heute,
    tasksDoneToday: overview.erledigt.filter((i) => i.date === data.todayIso).length,
    dueToday: overview.heute.filter((i) => !i.carried && i.entry.typ === "aufgabe" && (i.entry.data.due === data.todayIso || i.entry.data.date === data.todayIso)),
    dinnerOpen: !dish && !over && !data.day?.away && Boolean(dishClock && dishClock >= "15:00"),
    tomorrowTermine: tomorrowAll.filter((i) => i.entry.typ === "termin"),
    tomorrowTasks: tomorrowAll.filter((i) => i.entry.typ === "aufgabe"),
    seen: seen ?? [],
  });

  const renderTile = (tile: (typeof visible)[number], half: boolean) => {
    switch (tile.id) {
      case "termine":
        return <TermineSection items={termine} href={`/tag?datum=${data.todayIso}`} today={data.todayIso} />;
      case "aufgaben":
        return <AufgabenSection items={tasks} more={moreTasks} today={data.todayIso} />;
      case "essen":
        return <FoodTile data={data} dish={dish} over={over} dishClock={dishClock} onOpen={onOpenFood} />;
      case "einkauf":
        return <ShoppingTile half={half} />;
      case "kladde":
        return <KladdeTile name={helperName(data.profile)} />;
      case "notizen":
        return <NotesTile />;
      case "vorrat":
        return <PantryTile />;
      case "morgen":
        return (tomorrowItems.length > 0 || tomorrowDish) ? (
          <section className="rounded-card border-2 border-dashed border-line" aria-label="Morgen">
            <Link href={`/tag?datum=${tomorrowIso}`} className="flex items-center gap-2 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Morgen</span>
              <span className="min-w-0 flex-1 truncate text-base">{[...tomorrowItems.map(itemText), tomorrowDish ? `🍽 ${tomorrowDish}` : ""].filter(Boolean).join(" · ")}</span>
            </Link>
          </section>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <>
    {/* Lange drücken irgendwo auf der Startseite → "Startseite bearbeiten" */}
    <Pressable onLongPress={() => setEditing(true)}>
      <div className="flex flex-col gap-3">
        <header className="flex flex-col gap-0.5 pt-1">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">
            {greeting(minutes)}
            {name ? `, ${name}.` : "!"}
          </h1>
          <p className="text-sm font-medium text-muted">{DATE.format(data.today)}</p>
        </header>

        <LotteSays
          parts={
            reminder
              ? [{ t: reminder.text }]
              : paused && data.profile.pause
                ? [{ t: `Pause ${pauseLabel(data.profile.pause)} – genießt die Zeit ☀️` }]
                : tip && !openItems.length && !sentence.action
                  ? [{ t: tipOpen ? `${tip.text} ${tip.detail}` : tip.text }]
                  : sentence.parts
          }
          name={helperName(data.profile)}
          action={
            reminder
              ? { label: "Okay", onClick: () => markReminderSeen(reminder.key) }
              : paused
                ? { label: "Pause beenden", onClick: endPause }
                : tip && !openItems.length && !sentence.action
                  ? tipOpen
                    ? null
                    : { label: "Mehr dazu", onClick: () => setTipOpen(true) }
                  : null
          }
          oneLine={!reminder && !paused && !(tip && !openItems.length && !sentence.action)}
          onTap={!reminder && !paused && sentence.action === "essen" ? () => openHelper(undefined, "Was gibt's heute Abend?") : undefined}
        />

        {tipSeen === false && welcomed && (
          <div className="flex items-start gap-3 rounded-2xl bg-accent-soft px-4 py-3" role="status">
            <p className="flex-1 text-[15px] leading-snug text-accent-strong">Tipp: Halte die Startseite gedrückt, um Kacheln hinzuzufügen oder zu entfernen.</p>
            <button type="button" onClick={markHomeTipSeen} className="shrink-0 text-sm font-bold text-accent-strong underline">
              Verstanden
            </button>
          </div>
        )}

        {rows.map((row) =>
          row.length === 2 ? (
            <div key={row.map((t) => t.id).join("+")} className="grid grid-cols-2 gap-2">
              {row.map((tile) => (
                <div key={tile.id} className="min-w-0">
                  {renderTile(tile, true)}
                </div>
              ))}
            </div>
          ) : (
            <div key={row[0].id}>{renderTile(row[0], false)}</div>
          ),
        )}

        <button type="button" onClick={() => setEditing(true)} className="mt-2 flex h-11 items-center justify-center gap-1.5 self-center text-sm font-semibold text-muted">
          <PenLine className="h-4 w-4" strokeWidth={2} aria-hidden />
          Startseite bearbeiten
        </button>
      </div>
    </Pressable>
    {editing && <HomeEditSheet onClose={() => setEditing(false)} />}
    </>
  );
}

/** Lottes EIN Satz (wichtige Teile fett, eine Zeile) mit höchstens einem Knopf; `onTap` = der Satz selbst ist antippbar */
export function LotteSays({ parts, name, action, oneLine = false, onTap }: { parts: SentencePart[]; name: string; action: { label: string; onClick: () => void } | null; oneLine?: boolean; onTap?: () => void }) {
  const text = parts.map((p, i) => (p.b ? <strong key={i} className={`font-extrabold ${onTap ? "text-accent-strong underline decoration-2 underline-offset-2" : ""}`}>{p.t}</strong> : <span key={i}>{p.t}</span>));
  return (
    <section className="flex items-center gap-3" aria-label={`${name} sagt`}>
      <LotteAvatar size={32} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        {onTap ? (
          <button type="button" onClick={onTap} className="-my-2 min-h-11 w-full truncate text-left text-base font-medium leading-snug" role="status">
            {text}
          </button>
        ) : (
          <p className={`w-full text-base font-medium leading-snug ${oneLine ? "truncate" : ""}`} role="status">
            {text}
          </p>
        )}
        {action && (
          <button type="button" onClick={action.onClick} className={buttonClass("soft", "sm")}>
            {action.label}
          </button>
        )}
      </div>
    </section>
  );
}

const HALF = `${CARD} relative flex min-h-[92px] flex-col p-3.5`;
const HALF_LABEL = "flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted";

/** Halbe Kachel Essen: Gericht (bzw. Idee), ⇄ = andere Idee; Antippen → Essen-Seite */
function FoodTile({ data, dish, over, dishClock, onOpen }: { data: HomeData; dish: string | null; over: boolean; dishClock: string | null; onOpen: () => void }) {
  const ideas = useTodayIdeas([], { tomorrow: over });
  const [alt, setAlt] = useState<number | null>(null);
  const list = ideas?.ideas ?? [];
  const idea = alt !== null && list.length ? list[alt % list.length] : null;
  const day: PlanDay | undefined = over ? data.tomorrow : data.day;
  const title = idea ? idea.title : (over ? dishOf(data.tomorrow) : dish) ?? (day?.away ? (day.paused ? "Pause" : "Kein Kochtag") : "Noch frei");
  const sub = idea ? `Idee · ${idea.minutes ?? "?"} Min` : !dish && !day?.away && list.length ? `${Math.min(3, list.length)} Ideen ansehen` : "";
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
    <section className={HALF} aria-label={over ? "Essen morgen" : `Essen${dish && dishClock ? ` · ${clockLabel(dishClock)}` : ""}`}>
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col items-start gap-1 text-left">
        <span className={`${HALF_LABEL} pr-6`}>
          <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
          <span className="truncate">{over ? "Morgen" : `Essen${dish && dishClock ? ` · ${clockLabel(dishClock)}` : ""}`}</span>
        </span>
        <span className="line-clamp-2 text-[15px] font-bold leading-snug">{title}</span>
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
    </section>
  );
}

/** Kompakte Kachel: Titel + eine Zeile Vorschau, antippen öffnet die Seite */
function CompactTile({ label, line, icon, href, onClick, action }: { label: string; line: string; icon: React.ReactNode; href?: string; onClick?: () => void; action?: React.ReactNode }) {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
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

/** Langes Drücken (500 ms) öffnet "Startseite bearbeiten"; normales Tippen und Wischen bleiben, wie sie sind */
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
        // Nicht in Eingabefeldern und Fenstern (Menü, Schnell-Eintrag …)
        if ((e.target as Element).closest("input, textarea, [role=dialog]")) return;
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

/** Halbe Kachel Vorrat (Baustein) */
function PantryTile() {
  const pantry = usePantry();
  if (!pantry) return <section className={`${HALF} animate-pulse`} aria-label="Vorrat" />;
  return (
    <Link href="/vorrat" className={HALF} aria-label="Vorrat">
      <span className={HALF_LABEL}>
        <Refrigerator className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
        <span className="truncate">Vorrat{pantry.length ? ` · ${pantry.length}` : ""}</span>
      </span>
      <span className="mt-1 line-clamp-2 text-[14px] leading-snug">{pantry.length ? pantry.slice(0, 4).map((p) => p.name).join(", ") : "Noch nichts eingetragen"}</span>
    </Link>
  );
}

/** Kachel Einkauf (halb): Anzahl, erste Sachen, dunkler "+" (Schnell-Eintrag mit "Oft gekauft") */
function ShoppingTile({ half }: { half: boolean }) {
  const shopping = useWeekShoppingList("planning");
  if (!shopping) return <section className={`${HALF} animate-pulse`} aria-label="Einkauf" />;
  // "Jetzt mitnehmen" und selbst Eingetragenes zuerst, dann Zutaten aus Gerichten
  const open = shopping.list.items
    .filter((i) => !i.checked && !i.hidden)
    .sort((a, b) => Number(Boolean(b.now)) - Number(Boolean(a.now)) || Number(Boolean(b.manualId)) - Number(Boolean(a.manualId)));
  return (
    <section className={`${HALF} ${half ? "" : "min-h-0"}`} aria-label={open.length ? `Einkauf · ${open.length}` : "Einkauf"}>
      <Link href="/einkaufsliste" className="flex flex-1 flex-col gap-1">
        <span className={`${HALF_LABEL} pr-6`}>
          <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
          <span className="truncate">Einkauf{open.length ? ` · ${open.length}` : ""}</span>
        </span>
        {open.length ? (
          <span className={`${half ? "line-clamp-2" : "line-clamp-1"} text-[14px] font-semibold leading-snug`}>
            {open.slice(0, 8).map((i) => i.name).join(", ")}
          </span>
        ) : (
          <span className="text-[14px] text-muted">Liste ist leer</span>
        )}
      </Link>
      <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} quick className="absolute right-0.5 top-0.5" />
    </section>
  );
}

/** Kachel Notizen (nur über "Startseite anpassen"): angeheftete Notizen bzw. die neuesten */
function NotesTile() {
  const notes = useNotes();
  if (!notes) return <section className={`${CARD} h-16 animate-pulse`} aria-label="Notizen" />;
  const sorted = sortNotes(notes);
  const pinned = sorted.filter((n) => n.data.pinned);
  const shown = (pinned.length ? pinned : sorted).slice(0, 3);
  return (
    <CompactTile
      href="/notizen"
      label="Notizen"
      icon={<NotebookPen className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />}
      line={shown.length ? shown.map((n) => `${n.data.emoji ?? ""} ${n.data.title}`.trim()).join(" · ") : "Noch keine Notizen"}
    />
  );
}
