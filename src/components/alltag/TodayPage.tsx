"use client";

// Seite "Heute": Begrüßung, EIN Satz von Lotte (oder eine fällige
// Erinnerung), dann die Kacheln in der eigenen Reihenfolge und Größe
// (`HomeBoard`). Lange drücken, der Link unten, die Einstellungen oder Lotte
// öffnen den Bearbeiten-Modus direkt hier: Kopf "Startseite bearbeiten" +
// "Fertig", Kacheln wackeln, ziehen, "–", S · M · L.

import { useEffect, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { DEFAULT_HOME, markHomeTipSeen, onHomeEditRequest, tileMeta, useHomeTiles, useHomeTipSeen, type HomeTile } from "@/lib/core/homeLayout";
import { useWelcomeFinished } from "@/lib/einstellungen/welcomeStore";
import { HomeBoard } from "./HomeBoard";
import { FoodTile, MorgenTile, NotesTile, PantryTile, ShoppingTile } from "./HomeTiles";
import { WeatherTile } from "./WeatherTile";
import { PinboardTile } from "./PinboardTile";
import { buzz } from "./actions";
import { LotteAvatar } from "@/components/LotteAvatar";
import { buttonClass } from "@/components/ui/styles";
import { itemsForDay, openTaskCount, taskOverview, upcomingTermine, type CalendarEntry } from "@/lib/aufgaben/model";
import { AufgabenSection, TermineSection } from "./MiniCards";
import { dueReminder } from "@/lib/aufgaben/reminders";
import { markReminderSeen, useSeenReminders } from "@/lib/aufgaben/store";
import { greeting, homeSentence, type SentencePart } from "@/lib/aufgaben/summary";
import { addDays } from "@/lib/core/now";
import { hasKids, helperName, mealClockFor, pausedOn, saveProfile } from "@/lib/einstellungen/profile";
import { useFeature } from "@/lib/core/features";
import { dailyTip } from "@/lib/essen/tips/daily";
import { pauseLabel } from "@/lib/essen/spontan";
import { pushUndo } from "@/lib/core/undo";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
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
    pushUndo("das Beenden der Pause", () => saveProfile(before));
    buzz();
  };
  const tiles = useHomeTiles();
  const tipSeen = useHomeTipSeen();
  const welcomed = useWelcomeFinished();
  const editing = useHomeEditing();
  const termine = upcomingTermine(entries, data.todayIso, minutes);
  const termineAll = items.filter((i) => i.entry.typ === "termin");
  const overview = taskOverview(entries, data.todayIso);
  const tasks = [...overview.heute, ...overview.woche];
  const moreTasks = Math.max(0, openTaskCount(entries, data.todayIso) - Math.min(3, tasks.length));
  // Kacheln in Reihen; Bausteine nur, wenn sie an sind; "bald" nie
  const all = tiles ?? DEFAULT_HOME;
  const visible = all.filter((t) => t.visible && !tileMeta(t.id).soon && (t.id !== "vorrat" || pantryOn));

  const sentence = homeSentence({
    minutes,
    termineToday: termineAll,
    termineUpcoming: termine,
    tasksToday: overview.heute,
    tasksDoneToday: overview.erledigt.filter((i) => i.date === data.todayIso).length,
    dueToday: overview.heute.filter((i) => !i.carried && i.entry.typ === "aufgabe" && (i.entry.data.due === data.todayIso || i.entry.data.date === data.todayIso)),
    dinnerOpen: !dish && !over && !data.day?.away && Boolean(dishClock && dishClock >= "15:00"),
    tomorrowTermine: tomorrowAll.filter((i) => i.entry.typ === "termin"),
    tomorrowTasks: tomorrowAll.filter((i) => i.entry.typ === "aufgabe"),
    seen: seen ?? [],
  });

  const renderTile = (tile: HomeTile, half: boolean, edit: boolean) => {
    switch (tile.id) {
      case "termine":
        return <TermineSection items={termine} all={termineAll} href={`/tag?datum=${data.todayIso}`} today={data.todayIso} size={tile.size} />;
      case "aufgaben":
        return <AufgabenSection items={tasks} more={moreTasks} today={data.todayIso} size={tile.size} />;
      case "essen":
        return <FoodTile data={data} dish={dish} over={over} dishClock={dishClock} onOpen={onOpenFood} size={tile.size} />;
      case "einkauf":
        return <ShoppingTile half={half} size={tile.size} />;
      case "notizen":
        return <NotesTile name={helperName(data.profile)} size={tile.size} />;
      case "vorrat":
        return <PantryTile size={tile.size} />;
      case "wetter":
        return <WeatherTile size={tile.size} half={half} today={data.todayIso} minutes={minutes} termine={termine.flatMap((t) => (t.time ? [{ title: t.title, time: t.time }] : []))} />;
      case "pinnwand":
        return <PinboardTile size={tile.size} me={name || "Ich"} />;
      case "morgen":
        return <MorgenTile items={tomorrowItems} dish={tomorrowDish} href={`/tag?datum=${tomorrowIso}`} placeholder={edit} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Lange drücken irgendwo auf der Startseite → Bearbeiten-Modus direkt hier */}
      <Pressable onLongPress={() => !editing.on && editing.open()} disabled={editing.on}>
        <div className="flex flex-col gap-3" data-no-swipe={editing.on ? true : undefined}>
          {editing.on ? (
            <header className="sticky top-0 z-20 -mx-4 flex flex-col gap-0.5 bg-background/95 px-4 pb-2 pt-1 backdrop-blur" aria-label="Startseite bearbeiten">
              <div className="flex items-center gap-3">
                <h1 className="flex-1 text-[24px] font-extrabold leading-tight tracking-tight">Startseite bearbeiten</h1>
                <button type="button" onClick={editing.close} className="h-10 rounded-full bg-bar px-5 text-sm font-bold text-on-bar active:scale-95">
                  Fertig
                </button>
              </div>
              <p className="text-sm text-muted">Gedrückt halten &amp; ziehen · Größe unten rechts · – entfernt</p>
            </header>
          ) : (
            <>
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
            </>
          )}

          <HomeBoard tiles={visible} all={all} editing={editing.on} render={renderTile} onExit={editing.close} />

          {!editing.on && (
            <button type="button" onClick={editing.open} className="mt-2 flex h-11 items-center justify-center gap-1.5 self-center text-sm font-semibold text-muted">
              <PenLine className="h-4 w-4" strokeWidth={2} aria-hidden />
              Startseite bearbeiten
            </button>
          )}
          {editing.on && <div className="min-h-24 flex-1" onClick={editing.close} aria-hidden />}
        </div>
      </Pressable>
    </>
  );
}

/**
 * Bearbeiten-Modus: öffnen (lange drücken, Link, Einstellungen/Lotte über
 * `requestHomeEdit`), schließen ("Fertig", Zurück, freie Fläche). Zurück
 * (Pfeil/Geste) schließt nur den Modus – dafür ein eigener Verlaufseintrag.
 */
function useHomeEditing() {
  const [on, setOn] = useState(false);
  const pushed = useRef(false);
  const open = () => {
    if (pushed.current) return;
    buzz();
    setOn(true);
    window.scrollTo({ top: 0 });
    try {
      window.history.pushState({ ...(window.history.state ?? {}), homeEdit: true }, "");
      pushed.current = true;
    } catch {
      pushed.current = false;
    }
  };
  const close = () => {
    setOn(false);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    }
  };
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });
  useEffect(() => onHomeEditRequest(() => openRef.current()), []);
  useEffect(() => {
    if (!on) return;
    const onPop = () => {
      pushed.current = false;
      setOn(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [on]);
  return { on, open, close };
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

/** Langes Drücken (500 ms) öffnet "Startseite bearbeiten"; normales Tippen und Wischen bleiben, wie sie sind */
function Pressable({ children, onLongPress, disabled = false }: { children: React.ReactNode; onLongPress: () => void; disabled?: boolean }) {
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
        // Nicht im Bearbeiten-Modus, nicht in Eingabefeldern und Fenstern (Menü, Schnell-Eintrag …)
        if (disabled || (e.target as Element).closest("input, textarea, [role=dialog]")) return;
        start.current = { x: e.clientX, y: e.clientY };
        cancel();
        timer.current = setTimeout(() => {
          fired.current = true;
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
