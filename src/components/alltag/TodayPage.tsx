"use client";

// Seite "Heute": Begrüßung, EIN Satz von Lotte (oder eine fällige
// Erinnerung), dann die Kacheln in der eigenen Reihenfolge und Größe
// (`HomeBoard`). Lange drücken, der Link unten, die Einstellungen oder Lotte
// öffnen den Bearbeiten-Modus direkt hier: Kopf "Startseite bearbeiten" +
// "Fertig", Kacheln wackeln, ziehen, "–", S · M · L.

import { greetOncePerDay, setAvatarSleeping } from "@/lib/core/avatarState";
import Link from "next/link";
import { Sheet } from "@/components/plan/Sheet";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, PenLine } from "lucide-react";
import { DEFAULT_HOME, markHomeTipSeen, onHomeEditRequest, tileMeta, useHomeTiles, useHomeTipSeen, type HomeTile, type HomeTileId } from "@/lib/core/homeLayout";
import { useWelcomeFinished } from "@/lib/einstellungen/welcomeStore";
import { HomeBoard } from "./HomeBoard";
import { FoodTile, MorgenTile, NotesTile, PantryTile, ShoppingTile } from "./HomeTiles";
import { WeatherTile } from "./WeatherTile";
import { PinboardTile } from "./PinboardTile";
import { TimerTile } from "./TimerTile";
import { CookingTile } from "./CookingTile";
import { SportTile } from "@/components/sport/SportTile";
import { useHomePhase } from "./useHomePhase";
import { arrangeHome, type PhaseContext, type PhaseTone, type TopTile } from "@/lib/tagesablauf/phases";
import { clockMinutes, DEFAULT_ROUTINE, usePreview, useRoutine } from "@/lib/tagesablauf/settings";
import { nudgePhase } from "@/lib/tagesablauf/nudge";
import { now, toIsoDate } from "@/lib/core/now";
import { useWakeLock } from "@/lib/core/wakeLock";
import { useNowMs } from "@/lib/core/useNowMs";
import { isExpired, isRunning, leftWords, sortTimers, timersActive } from "@/lib/timer/model";
import { useTimers } from "@/lib/timer/store";
import { currentStep, startCooking, stopCooking, useCooking } from "@/lib/kochen/session";
import { cookableEntry, markCooked, unmarkCooked } from "@/lib/essen/mealDone";
import { hasUnread, usePins } from "@/lib/pinnwand";
import { leisureIdea } from "@/lib/notizen/model";
import { useNotes } from "@/lib/notizen";
import { todaysTraining, useSport, weekStatus } from "@/lib/sport";
import { weekdayIndex } from "@/lib/aufgaben/model";
import { buzz } from "./actions";
import { LotteAvatar } from "@/components/LotteAvatar";
import { buttonClass } from "@/components/ui/styles";
import { isUrgent, itemsForDay, openTaskCount, orderedTasks, taskOverview, upcomingTermine, type CalendarEntry } from "@/lib/aufgaben/model";
import { AufgabenSection, TermineSection } from "./MiniCards";
import { dueReminder } from "@/lib/aufgaben/reminders";
import { markReminderSeen, useSeenReminders } from "@/lib/aufgaben/store";
import { greeting, homeSentence, type SentencePart } from "@/lib/aufgaben/summary";
import { addDays } from "@/lib/core/now";
import { hasKids, helperName, mealClockFor, pausedOn } from "@/lib/einstellungen/profile";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import { useFeature } from "@/lib/core/features";
import { pauseLabel } from "@/lib/essen/spontan";
import { pushUndo } from "@/lib/core/undo";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import { openHelper } from "@/lib/lotte/open";
import type { HomeData } from "@/components/home/useHomeData";
import { dishOf } from "./useMeals";

const DATE = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

/** Name für die Begrüßung: die erste Person im Haushalt (meist man selbst) */
const firstName = (data: HomeData) => data.profile.persons[0]?.name.trim() ?? "";

export function TodayPage({ data, entries, minutes, realMinutes, onOpenFood }: { data: HomeData; entries: CalendarEntry[]; minutes: number; realMinutes?: number; onOpenFood: () => void }) {
  const seen = useSeenReminders();
  const cooked = useCookedDays();
  const allItems = itemsForDay(entries, data.todayIso, data.todayIso);
  const name = firstName(data);
  const me = data.profile.persons[0]?.id ?? null;
  const over = Boolean(cooked && mealIsOver(data.day, data.profile, minutes, cooked));
  const dish = over ? null : dishOf(data.day);
  const dishClock = data.day ? mealClockFor(data.profile, data.day.weekday) : null;
  const reminder = dueReminder(entries, data.todayIso, minutes, seen);
  const tomorrowIso = addDays(data.todayIso, 1);
  const tomorrowAll = itemsForDay(entries, tomorrowIso, data.todayIso).filter((i) => !i.done);
  const tomorrowItems = minutes >= 16 * 60 ? tomorrowAll : [];
  const tomorrowDish = minutes >= 16 * 60 ? dishOf(data.tomorrow) : null;
  // Bausteine Tipps / Wochenend-Ideen: nur über diesen einen Satz – und nur an ruhigen Tagen (nichts mehr offen)
  const tipsOn = useFeature("tipps");
  const weekendOn = useFeature("wochenendIdeen");
  const pantryOn = useFeature("vorrat");
  const [tipOpen, setTipOpen] = useState(false);
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
  const all = tiles ?? DEFAULT_HOME;

  // --- Tagesphase -------------------------------------------------------------------
  const routine = useRoutine() ?? DEFAULT_ROUTINE;
  const preview = usePreview();
  const timers = useTimers();
  const cooking = useCooking(data.todayIso);
  const pins = usePins();
  const sport = useSport();
  const notes = useNotes();
  const think = routine.mode === "mitdenkend";
  const timerLive = Boolean(timers && timers.timers.some((t) => !isExpired(t, now().getTime())));
  const nowMs = useNowMs(timerLive, 15_000);
  // Uhrzeiten aus echten Zeitstempeln (Timer, "Ich koche jetzt") – in der Vorschau mitverschoben
  const offset = realMinutes !== undefined ? minutes - realMinutes : 0;
  // Wie `useMinutes`: Uhrzeit des Geräts (steht in Europe/Berlin)
  const minuteOf = (ms: number | null) => {
    if (ms === null) return null;
    const d = new Date(ms);
    const iso = toIsoDate(d);
    return iso === data.todayIso ? d.getHours() * 60 + d.getMinutes() + offset : iso < data.todayIso ? -1 : 24 * 60;
  };
  const sportTile = all.find((t) => t.id === "sport");
  const workToday = allItems.filter((i) => i.entry.typ === "termin" && i.room === "arbeit" && i.time);
  const workEnd = workToday.length ? Math.max(...workToday.map((i) => (i.end ? clockMinutes(i.end) : clockMinutes(i.time!) + 60))) : null;
  const ctx: PhaseContext | null = timers && cooking && pins
    ? {
        minutes,
        weekday: preview?.weekday ?? weekdayIndex(data.todayIso),
        routine,
        mealClock: dish && !over && dishClock && !data.day?.away ? dishClock : null,
        cooking: {
          manualAt: minuteOf(cooking.manualAt),
          timerRunning: timers.timers.some((t) => isRunning(t, nowMs)),
          firstTimerAt: minuteOf(timers.firstAt),
          lastTimerEnd: minuteOf(timers.lastEnd),
        },
        sport: { on: Boolean(sportTile?.visible), training: todaysTraining(entries, data.todayIso, me) },
        workEnd,
        pinNew: hasUnread(pins, name || "Ich", nowMs),
      }
    : null;
  const phase = useHomePhase(ctx, { routine, preview, today: data.todayIso, editing: editing.on });
  const view = phase.view;
  // Avatar: schläft im Feierabend mit "Ruhe nach Feierabend"; begrüßt einmal am Tag beim ersten Öffnen
  const sleepy = phase.def?.id === "feierabend" && routine.ruhe;
  useEffect(() => {
    setAvatarSleeping(sleepy);
  }, [sleepy]);
  useEffect(() => () => setAvatarSleeping(false), []);
  useEffect(() => {
    if (!sleepy) greetOncePerDay(data.todayIso);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, []);
  const cookingNow = phase.def?.id === "kochen";
  useWakeLock(Boolean(view.wakeLock) && !editing.on);
  // Tipp-Sammlung (150 Tipps) erst laden, wenn Tipps oder Wochenend-Ideen an sind
  const [tipModule, setTipModule] = useState<typeof import("@/lib/essen/tips/daily") | null>(null);
  useEffect(() => {
    if ((tipsOn || weekendOn) && !tipModule) void import("@/lib/essen/tips/daily").then((m) => setTipModule(m));
  }, [tipsOn, weekendOn, tipModule]);

  // Arbeit ausblenden (Feierabend, freie Tage); im Feierabend nur Familien-Termine, die heute noch kommen
  const items = view.hideWork ? allItems.filter((i) => i.room !== "arbeit") : allItems;
  const openItems = items.filter((i) => !i.done);
  const tip =
    tipModule && (tipsOn || weekendOn) && !openItems.length
      ? tipModule.dailyTip(data.todayIso, { dish, tips: Boolean(tipsOn), weekendIdeas: Boolean(weekendOn), kids: hasKids(data.profile), persons: data.profile.persons.length })
      : null;
  const upcoming = upcomingTermine(entries, data.todayIso, minutes).filter((i) => !view.hideWork || i.room !== "arbeit");
  const termine = view.familyUpcomingOnly ? upcoming.filter((i) => i.room === "familie") : upcoming;
  const termineAll = view.familyUpcomingOnly ? termine : items.filter((i) => i.entry.typ === "termin");
  const overview = taskOverview(entries, data.todayIso);
  const workless = (list: typeof overview.heute) => (view.hideWork ? list.filter((i) => i.room !== "arbeit") : list);
  // EINE Reihenfolge: dringend → heute → Frist → diese Woche (Startseite zeigt bis diese Woche)
  const tasks = workless(orderedTasks(entries, data.todayIso).filter((i) => isUrgent(i) || i.group === "heute" || i.group === "woche"));
  const moreTasks = Math.max(0, openTaskCount(entries, data.todayIso) - Math.min(3, tasks.length));

  // Kacheln: gespeicherte Reihenfolge, Phase holt Passendes nach oben (ändert nie die gespeicherte Sortierung)
  const visible = all.filter((t) => t.visible && !tileMeta(t.id).soon && (t.id !== "vorrat" || pantryOn));
  const skip: HomeTileId[] = [];
  if (view.familyUpcomingOnly && !termine.length) skip.push("termine");
  const top = view.top.filter((t) => t.id !== "essen" || !cookingNow || Boolean(dish));
  const extraTop: TopTile[] = think && timers && timersActive(timers, nowMs) ? [{ id: "timer", force: true }] : [];
  const arranged = editing.on ? { tiles: visible, collapsed: [] as HomeTile[] } : arrangeHome(visible, { ...view, top }, { available: all, skip, extraTop });
  const unread = pins ? pins.filter((m) => m.data.author !== (name || "Ich") && !m.data.readBy.includes(name || "Ich")).length : 0;

  const entry = cookableEntry(data.day);
  const recipe = entry?.recipeId ? data.recipes[entry.recipeId] : undefined;
  const eaten = () => {
    if (!entry || !data.day) return;
    markCooked(data.day.date, entry, data.recipes, { how: "marked" });
    const undoCook = stopCooking();
    pushUndo("„Gegessen“", () => {
      unmarkCooked(data.day!.date);
      undoCook();
    });
    buzz();
    nudgePhase();
  };
  const cookNow = () => {
    pushUndo("„Ich koche jetzt“", startCooking());
    buzz();
    nudgePhase();
  };

  const sentence = homeSentence({
    minutes,
    termineToday: termineAll,
    termineUpcoming: termine,
    tasksToday: workless(overview.heute),
    urgent: tasks.filter(isUrgent),
    tasksDoneToday: overview.erledigt.filter((i) => i.date === data.todayIso).length,
    dueToday: workless(overview.heute).filter((i) => !i.carried && i.entry.typ === "aufgabe" && (i.entry.data.due === data.todayIso || i.entry.data.date === data.todayIso)),
    dinnerOpen: !dish && !over && !data.day?.away && Boolean(dishClock && dishClock >= "15:00"),
    tomorrowTermine: tomorrowAll.filter((i) => i.entry.typ === "termin"),
    tomorrowTasks: tomorrowAll.filter((i) => i.entry.typ === "aufgabe"),
    seen: seen ?? [],
  });
  // Lottes Satz je Phase: Timer-Stand oder aktueller Schritt, Training, Feierabend
  const phaseParts = ((): SentencePart[] | null => {
    if (!phase.def || !timers) return null;
    if (phase.def.id === "kochen") {
      const t = sortTimers(timers.timers.filter((x) => isRunning(x, nowMs)), nowMs)[0];
      if (t) return [{ t: `${t.name}: ` }, { t: `${leftWords(t.endsAt - nowMs)}.`, b: true }];
      const steps = recipe?.steps ?? [];
      const cur = currentStep(steps.length, cooking?.steps[recipe?.id ?? dish ?? ""] ?? []);
      if (cur !== null && steps[cur]) return [{ t: "Jetzt: " }, { t: steps[cur].length > 34 ? `${steps[cur].slice(0, 33).trimEnd()}…` : steps[cur], b: true }];
      return null;
    }
    if (phase.def.id === "sport" && ctx?.sport.training && sport) {
      const t = ctx.sport.training;
      const week = weekStatus(sport, entries, data.todayIso, me);
      const at = t.start % 60 ? clockLabelOf(t.start) : `${Math.floor(t.start / 60)} Uhr`;
      if (week.count + 1 === week.goal) return [{ t: `Heute ${at} Sport – dann ist dein Wochenziel geschafft.` }];
      return [{ t: "Heute " }, { t: `${at} ${t.title}.`, b: true }];
    }
    if (phase.def.id === "feierabend") return [{ t: "Schönen Feierabend – für heute ist alles getan." }];
    return null;
  })();
  const allDone = !reminder && !paused && !phaseParts && sentence.parts.length === 1 && sentence.parts[0].t.startsWith("Alles geschafft");

  const renderTile = (tile: HomeTile, half: boolean, edit: boolean) => {
    switch (tile.id) {
      case "termine":
        return <TermineSection items={termine} all={termineAll} href={`/tag?datum=${data.todayIso}`} today={data.todayIso} size={tile.size} />;
      case "aufgaben":
        return <AufgabenSection items={tasks} more={moreTasks} today={data.todayIso} size={tile.size} />;
      case "essen":
        if (cookingNow && dish && !edit) return <CookingTile dish={dish} clock={dishClock} persons={data.day?.persons ?? null} recipe={recipe} today={data.todayIso} onEaten={eaten} />;
        return <FoodTile data={data} dish={dish} over={over} dishClock={dishClock} onOpen={onOpenFood} size={tile.size} onCook={think && dish && !over && !edit ? cookNow : undefined} />;
      case "einkauf":
        return <ShoppingTile half={half} size={tile.size} />;
      case "notizen":
        return <NotesTile name={helperName(data.profile)} size={tile.size} />;
      case "vorrat":
        return <PantryTile size={tile.size} />;
      case "wetter":
        return <WeatherTile size={tile.size} half={half} today={data.todayIso} minutes={minutes} termine={termine.flatMap((t) => (t.time ? [{ title: t.title, time: t.time }] : []))} tomorrow={Boolean(view.weatherTomorrow) && !edit} />;
      case "pinnwand":
        return <PinboardTile size={tile.size} me={name || "Ich"} />;
      case "timer":
        return <TimerTile size={tile.size} />;
      case "sport":
        return <SportTile size={tile.size} entries={entries} today={data.todayIso} minutes={minutes} me={me} />;
      case "morgen":
        return <MorgenTile date={tomorrowIso} items={tomorrowItems} dish={tomorrowDish} href={`/tag?datum=${tomorrowIso}`} placeholder={edit} />;
      default:
        return null;
    }
  };

  const leisure = phase.def?.id === "feierabend" && notes ? leisureIdea(notes, data.todayIso) : null;
  const wandering = phase.def?.id === "feierabend" ? workless(overview.heute).filter((i) => i.entry.typ === "aufgabe").length : 0;

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
              <header className="flex flex-col gap-1 pt-1">
                <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">
                  {greeting(minutes)}
                  {name ? `, ${name}.` : "!"}
                </h1>
                <p className="text-sm font-medium text-muted">{DATE.format(data.today)}</p>
                {think && phase.phaseId && phase.phaseId !== "tagsueber" && ctx && (
                  <PhaseBadge phase={phase} />
                )}
              </header>

              <div key={allDone ? "geschafft" : "satz"} style={allDone ? { animation: "done-glow 0.9s ease-out" } : undefined}>
                <LotteSays
                  parts={
                    reminder
                      ? [{ t: reminder.text }]
                      : paused && data.profile.pause
                        ? [{ t: `Pause ${pauseLabel(data.profile.pause)} – genießt die Zeit ☀️` }]
                        : phaseParts
                          ? phaseParts
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
                        : !phaseParts && tip && !openItems.length && !sentence.action
                          ? tipOpen
                            ? null
                            : { label: "Mehr dazu", onClick: () => setTipOpen(true) }
                          : null
                  }
                  oneLine={!reminder && !paused && !phaseParts && !(tip && !openItems.length && !sentence.action)}
                  onTap={!reminder && !paused && !phaseParts && sentence.action === "essen" ? () => openHelper(undefined, "Was gibt's heute Abend?") : undefined}
                />
              </div>

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

          <div key={editing.on ? "bearbeiten" : phase.key + (phase.showingAll ? ":alle" : "")} className="flex flex-col gap-3" style={editing.on ? undefined : { animation: "phase-in 0.35s ease-out" }}>
            <HomeBoard tiles={arranged.tiles} all={all} editing={editing.on} render={renderTile} onExit={editing.close} />
            {arranged.collapsed.length > 0 && (
              <CollapsedLine
                tiles={arranged.collapsed}
                termine={termine.length}
                tasks={workless(overview.heute).length}
                unread={unread}
                render={(t) => renderTile(t, false, false)}
              />
            )}
            {phase.def?.id === "feierabend" && !editing.on && (
              <>
                {leisure && (
                  <Link href={`/notizen/bearbeiten?id=${leisure.note.id}`} className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
                    <span className="text-xl" aria-hidden>
                      {leisure.note.data.emoji ?? "🌙"}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Freizeit-Idee · {leisure.note.data.title}</span>
                      <span className="truncate text-base font-bold">{leisure.item.text}</span>
                    </span>
                  </Link>
                )}
                {wandering > 0 && (
                  <p className="px-1 text-sm text-muted">
                    {wandering === 1 ? "1 Aufgabe wandert auf morgen" : `${wandering} Aufgaben wandern auf morgen`}
                  </p>
                )}
              </>
            )}
          </div>

          {!editing.on && phase.def && phase.def.id !== "tagsueber" && (
            <p className="mt-1 px-1 text-center text-sm text-muted">
              {phase.def.id === "feierabend" ? "💼 Arbeit, Termine und Aufgaben machen Pause bis morgen früh. " : ""}
              <button type="button" onClick={phase.showAll} className="-my-3 inline-flex h-11 items-center font-bold text-accent-strong underline">
                Alles zeigen
              </button>
            </p>
          )}

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

const clockLabelOf = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

const BADGE_TONE: Record<PhaseTone, string> = {
  morgen: "bg-phase-morgen text-phase-morgen-ink",
  kochen: "bg-phase-kochen text-phase-kochen-ink",
  sport: "bg-phase-sport text-phase-sport-ink",
  feierabend: "bg-phase-feierabend text-phase-feierabend-ink",
};

/** Kleines Schild unter dem Datum ("🍳 Kochen · seit 18:10"); antippen = Fenster mit kurzer Erklärung.
 *  Nach "Normale Ansicht"/"Alles zeigen" nur noch der leise Chip "✨ Wieder mitdenken". */
function PhaseBadge({ phase }: { phase: ReturnType<typeof useHomePhase> }) {
  const [open, setOpen] = useState(false);
  const def = phase.def ?? null;
  const badge = def ? phase.view.badge : null;
  if (phase.showingAll)
    return (
      <button type="button" onClick={phase.resume} className="-my-1 inline-flex h-8 items-center gap-1 self-start rounded-full bg-segment px-3 text-[13px] font-semibold text-muted">
        <span aria-hidden>✨</span> Wieder mitdenken
      </button>
    );
  if (!def || !badge) return null;
  const title = `${badge.emoji ? `${badge.emoji} ` : ""}${badge.label}`;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={`-my-1 inline-flex h-8 items-center gap-1 self-start rounded-full px-3 text-[13px] font-bold ${BADGE_TONE[badge.tone]}`} aria-label={`Tagesphase: ${badge.label} · ${badge.detail}`}>
        {badge.emoji && <span aria-hidden>{badge.emoji}</span>}
        {badge.label} · <span className="font-semibold">{badge.detail}</span>
      </button>
      {open && (
        <Sheet title={title} onClose={() => setOpen(false)}>
          <p className="text-base leading-snug">{phase.view.explain}</p>
          <div className="flex flex-col gap-2 pb-2">
            <button
              type="button"
              onClick={() => {
                phase.showAll();
                setOpen(false);
              }}
              className={buttonClass("soft", "md")}
            >
              Normale Ansicht
            </button>
            <Link href="/profil/tagesablauf" onClick={() => setOpen(false)} className={buttonClass("ghost", "md")}>
              Einstellungen
            </Link>
          </div>
        </Sheet>
      )}
    </>
  );
}

/** Zusammengeklapptes in einer Zeile: "Heute noch: 1 Aufgabe · Pinnwand 1 neu ›" – antippen klappt auf */
function CollapsedLine({ tiles, termine, tasks, unread, render }: { tiles: HomeTile[]; termine: number; tasks: number; unread: number; render: (t: HomeTile) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const has = (id: HomeTileId) => tiles.some((t) => t.id === id);
  const parts = [
    has("termine") && termine ? `${termine} ${termine === 1 ? "Termin" : "Termine"}` : "",
    has("aufgaben") && tasks ? `${tasks} ${tasks === 1 ? "Aufgabe" : "Aufgaben"}` : "",
    has("pinnwand") ? (unread ? `Pinnwand ${unread} neu` : "Pinnwand") : "",
  ].filter(Boolean);
  const text = parts.length ? `Heute noch: ${parts.join(" · ")}` : tiles.map((t) => tileMeta(t.id).label).join(", ");
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-12 items-center gap-2 rounded-card border border-line bg-surface px-4 text-left text-[15px] font-semibold shadow-card">
        <span className="min-w-0 flex-1 truncate">{text}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-90" : ""}`} strokeWidth={2.5} aria-hidden />
      </button>
      {open && tiles.map((t) => <div key={t.id}>{render(t)}</div>)}
    </div>
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
      // Ein Fenster im Bearbeiten-Modus (z. B. das Kachel-Menü) wurde geschlossen – der Modus bleibt
      if ((window.history.state as { homeEdit?: boolean } | null)?.homeEdit) return;
      pushed.current = false;
      setOn(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [on]);
  return { on, open, close };
}

/** Lottes EIN Satz (wichtige Teile fett, eine Zeile) mit höchstens einem Knopf; `onTap` = der Satz selbst ist antippbar */
function LotteSays({ parts, name, action, oneLine = false, onTap }: { parts: SentencePart[]; name: string; action: { label: string; onClick: () => void } | null; oneLine?: boolean; onTap?: () => void }) {
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
