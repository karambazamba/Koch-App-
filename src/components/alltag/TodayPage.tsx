"use client";

// Seite "Heute": Begrüßung, die Jetzt-Karte (Mias EIN Thema für den Moment –
// feste Höhe, Farbe je Tageszeit) und darunter die Kacheln in der EINEN
// gespeicherten Reihenfolge und Größe (`HomeBoard`). Die Anordnung ändert
// sich nie von selbst; Tagesphasen ändern nur Inhalte (Kochschritte in der
// Essen-Kachel, Ruhe nach Feierabend). Lange drücken, der Link unten, die
// Einstellungen oder Lotte öffnen den Bearbeiten-Modus direkt hier: Kopf
// "Startseite bearbeiten" + "Fertig", Kacheln wackeln, ziehen, "–", S · M · L.

import { greetOncePerDay, setAvatarSleeping } from "@/lib/core/avatarState";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { DEFAULT_HOME, markHomeTipSeen, onHomeEditRequest, tileMeta, useHomeTiles, useHomeTipSeen, type HomeTile, type HomeTileId } from "@/lib/core/homeLayout";
import { useWelcomeFinished } from "@/lib/einstellungen/welcomeStore";
import { HomeBoard } from "./HomeBoard";
import { FoodTile, MorgenTile, NotesTile, PantryTile, ShoppingTile } from "./HomeTiles";
import { WeatherTile } from "./WeatherTile";
import { PinboardTile } from "./PinboardTile";
import { TimerTile } from "./TimerTile";
import { CookingTile } from "./CookingTile";
import { DemoFoodTile } from "./DemoFoodTile";
import { JetztCard, JetztPlaceholder } from "./JetztCard";
import { useJetztTopics } from "./useJetztTopics";
import { takeHelloFlight } from "@/lib/core/hello";
import { SportTile } from "@/components/sport/SportTile";
import { useHomePhase } from "./useHomePhase";
import type { PhaseContext } from "@/lib/tagesablauf/phases";
import { clockMinutes, DEFAULT_ROUTINE, usePreview, useRoutine } from "@/lib/tagesablauf/settings";
import { nudgePhase } from "@/lib/tagesablauf/nudge";
import { now, toIsoDate } from "@/lib/core/now";
import { useWakeLock } from "@/lib/core/wakeLock";
import { useNowMs } from "@/lib/core/useNowMs";
import { isExpired, isRunning, leftWords, sortTimers } from "@/lib/timer/model";
import { useTimers } from "@/lib/timer/store";
import { currentStep, startCooking, stopCooking, useCooking } from "@/lib/kochen/session";
import { cookableEntry, markCooked, unmarkCooked } from "@/lib/essen/mealDone";
import { usePins } from "@/lib/pinnwand";
import { leisureIdea } from "@/lib/notizen/model";
import { useNotes } from "@/lib/notizen";
import { todaysTraining } from "@/lib/sport";
import { weekdayIndex } from "@/lib/aufgaben/model";
import { buzz } from "./actions";
import { isUrgent, itemsForDay, openTaskCount, orderedTasks, taskOverview, upcomingTermine, type CalendarEntry, type DayItem } from "@/lib/aufgaben/model";
import { AufgabenSection, TermineSection, type DemoProps } from "./MiniCards";
import { useDemoDay } from "./useDemoDay";
import { DemoItemSheet, DemoRow } from "./DemoBits";
import { EditHeader } from "./EditHeader";
import { DarkTip } from "./DarkTip";
import { PotHintCard, usePotHint } from "@/components/spendentopf/PotHintCard";
import { SpendentopfTile } from "@/components/spendentopf/SpendentopfTile";
import { hideDemoItem, toggleDemoDone } from "@/lib/core/demo";
import { showDone, showToast } from "@/lib/core/toast";
import { dueReminder } from "@/lib/aufgaben/reminders";
import { markReminderSeen, useSeenReminders } from "@/lib/aufgaben/store";
import { greeting } from "@/lib/aufgaben/summary";
import { addDays } from "@/lib/core/now";
import { hasKids, helperName, mealClockFor, pausedOn } from "@/lib/einstellungen/profile";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import { useFeature } from "@/lib/core/features";
import { pauseLabel } from "@/lib/essen/spontan";
import { pushUndo } from "@/lib/core/undo";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import { matchStock } from "@/lib/essen/dishIdeas";
import { useStock } from "@/lib/essen/useStock";
import { DEMO_DISH } from "@/lib/essen/demoDish";
import { openHelper } from "@/lib/lotte/open";
import { hideJetztTopic, noteJetztSkip, noteJetztTap } from "@/lib/jetzt/store";
import type { JetztTopic } from "@/lib/jetzt/topics";
import type { HomeData } from "@/components/home/useHomeData";
import { dishOf } from "./useMeals";
import { TipsTile } from "@/components/tipps/TipsTile";
import { hideJetztTipWeekend, useTipSettings, useTipsOn, useTipsWindow } from "@/lib/tipps/client";
import { weekendKey } from "@/lib/tipps/model";

const DATE = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

/** Name für die Begrüßung: die erste Person im Haushalt (meist man selbst) */
const firstName = (data: HomeData) => data.profile.persons[0]?.name.trim() ?? "";

export function TodayPage({ data, entries, minutes, realMinutes, onOpenFood }: { data: HomeData; entries: CalendarEntry[]; minutes: number; realMinutes?: number; onOpenFood: () => void }) {
  const router = useRouter();
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
  // Bausteine Tipps / Wochenend-Ideen: als leises Thema der Jetzt-Karte an ruhigen Tagen
  const tipsOn = useFeature("tipps");
  const weekendOn = useFeature("wochenendIdeen");
  const pantryOn = useFeature("vorrat");
  const regionOn = useTipsOn();
  const tipSettings = useTipSettings();
  const paused = pausedOn(data.profile, data.todayIso);
  // Pause (Urlaub) beenden – über die Jetzt-Karte, mit Rückgängig
  const endPause = () => {
    const before = data.profile;
    saveProfile({ ...before, pause: null });
    showToast({ text: "Pause beendet", undo: pushUndo("das Beenden der Pause", () => saveProfile(before)), undoneText: "Pause läuft wieder", seconds: 4, small: true });
    buzz();
  };
  const tiles = useHomeTiles();
  const tipSeen = useHomeTipSeen();
  const welcomed = useWelcomeFinished();
  const editing = useHomeEditing();
  const [picking, setPicking] = useState(false);
  const all = tiles ?? DEFAULT_HOME;
  const stock = useStock();
  // Direkt vom Hallo-Bildschirm: Mia fliegt in die Jetzt-Karte, Kacheln erscheinen nacheinander
  const [arrive] = useState(takeHelloFlight);

  // --- Tagesphase (nur Inhalte, nie die Anordnung) ------------------------------------
  const routine = useRoutine() ?? DEFAULT_ROUTINE;
  const preview = usePreview();
  const timers = useTimers();
  const cooking = useCooking(data.todayIso);
  const pins = usePins();
  const notes = useNotes();
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
  const weekday = preview?.weekday ?? weekdayIndex(data.todayIso);
  const ctx: PhaseContext | null = timers && cooking
    ? {
        minutes,
        weekday,
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
      }
    : null;
  const phase = useHomePhase(ctx, { preview, today: data.todayIso, editing: editing.on });
  const view = phase.view;
  const evening = phase.def?.id === "feierabend";
  // Avatar: schläft im Feierabend mit "Ruhe nach Feierabend"; begrüßt einmal am Tag beim ersten Öffnen
  const sleepy = evening && routine.ruhe;
  useEffect(() => {
    setAvatarSleeping(sleepy);
  }, [sleepy]);
  useEffect(() => () => setAvatarSleeping(false), []);
  useEffect(() => {
    if (!sleepy) greetOncePerDay(data.todayIso);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, []);
  const cookingNow = Boolean(view.cooking);
  useWakeLock(Boolean(view.wakeLock) && !editing.on);
  // Tipp-Sammlung (150 Tipps) erst laden, wenn Tipps oder Wochenend-Ideen an sind
  const [tipModule, setTipModule] = useState<typeof import("@/lib/essen/tips/daily") | null>(null);
  useEffect(() => {
    if ((tipsOn || weekendOn) && !tipModule) void import("@/lib/essen/tips/daily").then((m) => setTipModule(m));
  }, [tipsOn, weekendOn, tipModule]);

  // Arbeit ausblenden (Ruhe nach Feierabend, freie Tage); im Feierabend nur Familien-Termine, die heute noch kommen
  const items = view.hideWork ? allItems.filter((i) => i.room !== "arbeit") : allItems;
  const openItems = items.filter((i) => !i.done);
  const tip =
    tipModule && (tipsOn || weekendOn) && !openItems.length
      ? tipModule.dailyTip(data.todayIso, { dish, tips: Boolean(tipsOn), weekendIdeas: Boolean(weekendOn), kids: hasKids(data.profile), persons: data.profile.persons.length })
      : null;
  const upcoming = upcomingTermine(entries, data.todayIso, minutes).filter((i) => !view.hideWork || i.room !== "arbeit");
  const termine = view.familyUpcomingOnly ? upcoming.filter((i) => i.room === "familie") : upcoming;
  const termineAll = view.familyUpcomingOnly ? termine : items.filter((i) => i.entry.typ === "termin");
  // Beispiel-Tag (erster Start): Beispiele in denselben Kacheln, auch im Bearbeiten-Modus als Vorschau
  const demoDay = useDemoDay(entries, data.todayIso, minutes, helperName(data.profile), Boolean(dish));
  const [demoItem, setDemoItem] = useState<DayItem | null>(null);
  const demoProps: DemoProps = { label: demoDay.label, done: demoDay.done, onToggle: (i) => (buzz(), toggleDemoDone(i.entry.id)), onGone: (i) => showDone(hideDemoItem(i.entry.id)), onOpen: setDemoItem };
  const overview = taskOverview(entries, data.todayIso);
  const workless = (list: typeof overview.heute) => (view.hideWork ? list.filter((i) => i.room !== "arbeit") : list);
  // EINE Reihenfolge: dringend → heute → Frist → diese Woche (Startseite zeigt bis diese Woche)
  const tasksAll = workless(orderedTasks(entries, data.todayIso).filter((i) => isUrgent(i) || i.group === "heute" || i.group === "woche"));
  const tasks = view.tasksRest ? [] : tasksAll;

  // Kacheln: genau die gespeicherte Reihenfolge und Größe – im Bearbeiten-Modus dieselbe
  const visible = all.filter((t) => t.visible && !tileMeta(t.id).soon && (t.id !== "vorrat" || pantryOn) && (t.id !== "tipps" || regionOn));
  // Erste Reihe (zwei S nebeneinander zählen zusammen) – was dort steht, wiederholt die Jetzt-Karte nicht
  const firstTiles: HomeTileId[] = visible.length ? (visible[0].size === "S" && visible[1]?.size === "S" ? [visible[0].id, visible[1].id] : [visible[0].id]) : [];

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

  // --- Jetzt-Karte ----------------------------------------------------------------------
  const demoDish = demoDay.tiles.includes("essen");
  const potHint = usePotHint(demoDay.tiles.length > 0);
  const runningTimer = timers ? sortTimers(timers.timers.filter((x) => isRunning(x, nowMs)), nowMs)[0] : undefined;
  const steps = recipe?.steps ?? [];
  const step = cookingNow && cooking ? currentStep(steps.length, cooking.steps[recipe?.id ?? dish ?? ""] ?? []) : null;
  const needs = recipe && stock ? matchStock(recipe.ingredients.map((i) => i.name), stock).needs : null;
  const dueToday = workless(overview.heute).filter((i) => !i.carried && i.entry.typ === "aufgabe" && (i.entry.data.due === data.todayIso || i.entry.data.date === data.todayIso));
  const training = ctx?.sport.training;
  const leisure = evening && notes ? leisureIdea(notes, data.todayIso) : null;
  const hadSomething = termineAll.length > 0 || overview.erledigt.some((i) => i.date === data.todayIso);
  const regionTips = useTipsWindow(data.todayIso, regionOn && !demoDay.tiles.length);
  const jetzt = useJetztTopics({
    today: data.todayIso,
    minutes,
    me: name || "Ich",
    calm: (evening && routine.ruhe) || weekday >= 5,
    // Beispiel-Tag ab 21 Uhr: die Beispiele gelten für morgen
    upcoming: demoDay.termine && !demoDay.label ? demoDay.termine : demoDay.termine ? [] : termine,
    tomorrow: demoDay.termine && demoDay.label ? demoDay.termine : tomorrowAll.filter((i) => !view.hideWork || i.room !== "arbeit"),
    urgent: view.tasksRest ? [] : tasksAll.filter(isUrgent).filter((i) => !i.done),
    dueToday: view.tasksRest ? [] : dueToday.filter((i) => !i.done),
    allDone: !demoDay.tiles.length && hadSomething && !termine.length && !tasksAll.filter((i) => !i.done).length,
    pins: demoDay.tiles.includes("pinnwand") ? [] : pins,
    nowMs,
    dish: demoDish
      ? { name: DEMO_DISH.recipe.title, clock: DEMO_DISH.clock, minutes: DEMO_DISH.recipe.prepMinutes, ready: true, missing: [], demo: true }
      : dish && !data.day?.away
        ? { name: dish, clock: dishClock, minutes: recipe?.prepMinutes ?? null, ready: Boolean(needs && !needs.length), missing: needs ?? [] }
        : null,
    dinnerFree: !dish && !over && !data.day?.away && Boolean(dishClock && dishClock >= "15:00"),
    todayAll: allItems,
    sport: sportTile?.visible && training ? { today: `Heute ${Math.floor(training.start / 60)}:${String(training.start % 60).padStart(2, "0")} ${training.title}` } : null,
    timer: runningTimer ? { name: runningTimer.name, left: leftWords(runningTimer.endsAt - nowMs) } : null,
    cookingStep: step !== null && steps[step] ? steps[step] : null,
    reminder: reminder ? { key: reminder.key, text: reminder.text } : null,
    pause: paused && data.profile.pause ? pauseLabel(data.profile.pause) : null,
    leisure: leisure ? { text: leisure.item.text, href: `/notizen/bearbeiten?id=${leisure.note.id}` } : null,
    tip: tip?.text ?? null,
    regionTips: regionTips?.tips ?? null,
    kids: hasKids(data.profile),
    regionHidden: tipSettings.jetztAus,
    demo: demoDay.tiles.length > 0,
    demoShop: demoDay.tiles.includes("einkauf"),
    firstTiles,
  });
  const openTopic = (t: JetztTopic) => {
    noteJetztTap(t.kind);
    if (t.kind === "erinnerung" && reminder) markReminderSeen(reminder.key);
    if (!t.target) return;
    if ("href" in t.target) return router.push(t.target.href);
    if (t.target.action === "essen") return onOpenFood();
    if (t.target.action === "ideen") return openHelper("spontan");
    if (t.target.action === "pause") return endPause();
    document.querySelector(`[data-tile~="${t.target.action === "timer" ? "timer" : "pinnwand"}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const hideTopic = (t: JetztTopic) => {
    if (t.kind === "region") hideJetztTipWeekend(weekendKey(data.todayIso));
    if (t.kind === "erinnerung" && reminder) markReminderSeen(reminder.key);
    const undo = hideJetztTopic(t.id, t.kind, data.todayIso);
    buzz();
    showToast({ text: "Für heute ausgeblendet", undo, undoneText: "Wieder da", seconds: 3, small: true });
  };

  const renderTile = (tile: HomeTile, half: boolean, edit: boolean) => {
    switch (tile.id) {
      case "termine":
        if (demoDay.termine) return <TermineSection items={demoDay.termine} href={`/tag?datum=${data.todayIso}`} today={data.todayIso} size={tile.size} half={half} demo={demoProps} />;
        return <TermineSection items={termine} all={termineAll} href={`/tag?datum=${data.todayIso}`} today={data.todayIso} size={tile.size} half={half} />;
      case "aufgaben":
        if (demoDay.tasks) return <AufgabenSection items={demoDay.tasks} today={data.todayIso} size={tile.size} half={half} demo={demoProps} />;
        return <AufgabenSection items={tasks} total={view.tasksRest ? 0 : openTaskCount(entries, data.todayIso)} today={data.todayIso} size={tile.size} half={half} />;
      case "essen":
        if (demoDish) return <DemoFoodTile half={half} />;
        if (cookingNow && dish && !edit) return <CookingTile dish={dish} clock={dishClock} persons={data.day?.persons ?? null} recipe={recipe} today={data.todayIso} onEaten={eaten} />;
        return <FoodTile data={data} dish={dish} over={over} dishClock={dishClock} onOpen={onOpenFood} size={tile.size} onCook={dish && !over && !edit ? cookNow : undefined} />;
      case "einkauf":
        return <ShoppingTile half={half} size={tile.size} demo={demoDay.tiles.includes("einkauf")} />;
      case "notizen":
        return <NotesTile name={helperName(data.profile)} size={tile.size} />;
      case "vorrat":
        return <PantryTile size={tile.size} />;
      case "wetter":
        return <WeatherTile size={tile.size} half={half} today={data.todayIso} minutes={minutes} termine={termine.flatMap((t) => (t.time ? [{ title: t.title, time: t.time }] : []))} tomorrow={Boolean(view.weatherTomorrow) && !edit} />;
      case "pinnwand":
        return <PinboardTile size={tile.size} me={name || "Ich"} demo={demoDay.tiles.includes("pinnwand")} helper={helperName(data.profile)} />;
      case "timer":
        return <TimerTile size={tile.size} />;
      case "sport":
        return <SportTile size={tile.size} entries={entries} today={data.todayIso} minutes={minutes} me={me} />;
      case "spendentopf":
        return <SpendentopfTile />;
      case "tipps":
        return <TipsTile size={tile.size} today={data.todayIso} />;
      case "morgen":
        return <MorgenTile date={tomorrowIso} items={tomorrowItems} dish={tomorrowDish} href={`/tag?datum=${tomorrowIso}`} placeholder={edit} />;
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
            <EditHeader onAdd={() => setPicking(true)} onDone={editing.close} />
          ) : (
            <header className="flex flex-col gap-1 pt-1">
              <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">
                {greeting(minutes)}
                {name ? `, ${name}.` : "!"}
              </h1>
              <p className="text-sm font-medium text-muted">{DATE.format(data.today)}</p>
            </header>
          )}

          {jetzt.on && (editing.on ? <JetztPlaceholder /> : <JetztCard topics={jetzt.topics} name={helperName(data.profile)} onOpen={openTopic} onHide={hideTopic} onSkip={(t) => noteJetztSkip(t.kind)} arrive={arrive} />)}

          {!editing.on && (
            <>
              {/* Höchstens ein Hinweis: Spendentopf (Abstimmung bzw. Beitrags-Frage) vor dem Dunkel-Tipp */}
              {potHint && <PotHintCard hint={potHint} />}
              <DarkTip profile={data.profile} today={data.todayIso} quiet={demoDay.tiles.length > 0 || tipSeen === false || Boolean(potHint)} />
              {tipSeen === false && welcomed && !demoDay.tiles.length && (
                <div className="flex items-start gap-3 rounded-card bg-accent-soft px-4 py-3" role="status">
                  <p className="flex-1 text-[15px] leading-snug text-accent-strong">Tipp: Halte die Startseite gedrückt, um Kacheln hinzuzufügen oder zu entfernen.</p>
                  <button type="button" onClick={markHomeTipSeen} className="shrink-0 text-sm font-bold text-accent-strong underline">
                    Verstanden
                  </button>
                </div>
              )}
            </>
          )}

          {!editing.on && demoDay.tiles.length > 0 && <DemoRow ask={demoDay.ask} />}

          <div className={arrive ? "tiles-arrive" : undefined}>
            <HomeBoard tiles={visible} all={all} editing={editing.on} render={renderTile} picking={picking} onPicking={setPicking} />
          </div>

          {demoItem && <DemoItemSheet item={demoItem} today={data.todayIso} onClose={() => setDemoItem(null)} />}

          {!editing.on && (
            <button type="button" onClick={editing.open} className="mt-2 flex h-11 items-center justify-center gap-1.5 self-center text-sm font-semibold text-muted">
              <PenLine className="h-4 w-4" strokeWidth={2} aria-hidden />
              Startseite bearbeiten
            </button>
          )}
          {/* Freie Fläche unten: Danebentippen beendet (zentral in useHomeEditing) */}
          {editing.on && <div className="min-h-24 flex-1" aria-hidden />}
        </div>
      </Pressable>
    </>
  );
}

/**
 * Bearbeiten-Modus: öffnen (lange drücken, Link, Einstellungen/Lotte über
 * `requestHomeEdit`), schließen ("Fertig", Zurück, Danebentippen). Zurück
 * (Pfeil/Geste) schließt nur den Modus – dafür ein eigener Verlaufseintrag.
 * Danebentippen zentral: ein echter Klick (kein Wisch – nach dem Scrollen
 * schickt der Browser keinen) auf jede freie Fläche beendet; Kacheln (Menü),
 * Knöpfe, Links, Felder, Fenster und die Mia-Leiste nicht. Der Seiten-Schalter
 * wechselt wie gewohnt und beendet dabei den Modus.
 */
function useHomeEditing() {
  const [on, setOn] = useState(false);
  const pushed = useRef(false);
  const open = () => {
    if (pushed.current) return;
    buzz();
    openedAt.current = performance.now();
    setOn(true);
    window.scrollTo({ top: 0 });
    try {
      window.history.pushState({ ...(window.history.state ?? {}), homeEdit: true }, "");
      pushed.current = true;
    } catch {
      pushed.current = false;
    }
  };
  const openedAt = useRef(0);
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
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!on) return;
    const onClick = (e: MouseEvent) => {
      // Der Klick, der den Modus geöffnet hat (langes Drücken, Link), zählt nicht
      if (performance.now() - openedAt.current < 600) return;
      const t = e.target instanceof Element ? e.target : null;
      if (!t || !t.isConnected) return;
      if (t.closest('[role="tab"]')) {
        // Seite wechselt (router.replace) – den Modus still beenden, ohne Zurück
        pushed.current = false;
        setOn(false);
        return;
      }
      if (t.closest('[role="dialog"], [role="alertdialog"], [data-unit], [data-lotte-leiste], [data-keep-edit], button, a, input, textarea, select, label')) return;
      closeRef.current();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [on]);
  return { on, open, close };
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
