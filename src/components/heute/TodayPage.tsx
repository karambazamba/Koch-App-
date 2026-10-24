"use client";

// Seite "Heute": Begrüßung, die Jetzt-Karte (Mias EIN Thema für den Moment –
// feste Höhe, Pfirsich-Verlauf) und darunter die Kacheln in der EINEN
// gespeicherten Reihenfolge und Größe (`HomeBoard`). Die Anordnung ändert
// sich nie von selbst; Tagesphasen ändern nur Inhalte (Kochschritte in der
// Essen-Kachel, Ruhe nach Feierabend). Lange drücken, der Link unten, die
// Einstellungen oder Lotte öffnen den Bearbeiten-Modus direkt hier: Kopf
// "Startseite bearbeiten" + "Fertig", Kacheln wackeln, ziehen, "–", S · M · L.

import { useMiaRoutinen } from "@/components/heute/useMiaRoutinen";
import { greetOncePerDay } from "@/lib/core/avatarState";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PenLine } from "lucide-react";
import { DEFAULT_HOME, markHomeTipSeen, tileMeta, useHomeTiles, useHomeTipSeen, type HomeTile, type HomeTileId } from "@/lib/core/homeLayout";
import { useWelcomeFinished } from "@/lib/einstellungen/welcomeStore";
import { HomeBoard } from "@/components/heute/HomeBoard";
import { FoodTile, MorgenTile, NotesTile, PantryTile, ShoppingTile } from "@/components/heute/HomeTiles";
import { WeatherTile } from "@/components/wetter/WeatherTile";
import { PinboardTile } from "@/components/pinnwand/PinboardTile";
import { TimerTile } from "@/components/timer/TimerTile";
import { CookingTile } from "@/components/essen/CookingTile";
import { DemoFoodTile } from "@/components/essen/DemoFoodTile";
import { JetztCard, JetztPlaceholder } from "@/components/heute/JetztCard";
import { DeinTag } from "@/components/heute/DeinTag";
import { onOpenDeinTag } from "@/lib/heute/deinTag";
import { useJetztTopics } from "@/components/heute/useJetztTopics";
import { takeHelloFlight } from "@/lib/core/hello";
import { SportTile } from "@/components/sport/SportTile";
import { useHomePhase } from "@/components/heute/useHomePhase";
import type { PhaseContext } from "@/lib/heute/phases";
import { clockMinutes, DEFAULT_ROUTINE, usePreview, useRoutine } from "@/lib/heute/tagesablauf";
import { nudgePhase } from "@/lib/heute/nudge";
import { berlinTime, now, toIsoDate } from "@/lib/core/now";
import { useWakeLock } from "@/lib/core/wakeLock";
import { useNowMs } from "@/lib/core/useNowMs";
import { isExpired, isRunning, leftWords, sortTimers } from "@/lib/timer/model";
import { useTimers } from "@/lib/timer/store";
import { currentStep, startCooking, stopCooking, useCooking } from "@/lib/essen/kochSession";
import { cookableEntry, markCooked, unmarkCooked } from "@/lib/essen/mealDone";
import { useMemos, usePins } from "@/lib/pinnwand";
import { leisureIdea } from "@/lib/notizen/model";
import { useNotes } from "@/lib/notizen";
import { todaysTraining } from "@/lib/sport";
import { weekdayIndex } from "@/lib/kalender/model";
import { buzz } from "@/components/heute/actions";
import { EditDoneBar } from "@/components/heute/EditDoneBar";
import { isUrgent, itemsForDay, openTaskCount, orderedTasks, taskOverview, upcomingTermine, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { AufgabenSection, TermineSection, type DemoProps } from "@/components/heute/MiniCards";
import { useDemoDay } from "@/components/heute/useDemoDay";
import { DemoItemSheet, DemoRow } from "@/components/heute/DemoBits";
import { EditHeader } from "@/components/heute/EditHeader";
import { useHomeEditing } from "@/components/heute/useHomeEditing";
import { Pressable } from "@/components/heute/Pressable";
import { DarkTip } from "@/components/heute/DarkTip";
import { hatVisible, noteKochtippDay, useKochtipp } from "@/lib/essen/kochtipp/store";
import { PotHintCard, usePotHint } from "@/components/spendentopf/PotHintCard";
import { usePotState } from "@/lib/spendentopf/store";
import { liveInvite } from "@/lib/spendentopf/model";
import { POT_STATUS } from "@/lib/spendentopf/regions";
import { SpendentopfTile } from "@/components/spendentopf/SpendentopfTile";
import { hideDemoItem, toggleDemoDone } from "@/lib/core/demo";
import { showDone, showToast } from "@/lib/core/toast";
import { dueReminder } from "@/lib/kalender/reminders";
import { markReminderSeen, useSeenReminders } from "@/lib/kalender/store";
import { greeting } from "@/lib/kalender/summary";
import { addDays } from "@/lib/core/now";
import { hasKids, helperName, mealClockFor, pausedOn } from "@/lib/einstellungen/profile";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import { useFeature } from "@/lib/core/features";
import { pauseLabel } from "@/lib/essen/spontan";
import { pushUndo } from "@/lib/core/undo";
import { mealIsOver, useCookedDays } from "@/lib/essen/mealDone";
import { matchStock } from "@/lib/essen/dishIdeas";
import { useStock } from "@/lib/essen/useStock";
import { demoDishAt } from "@/lib/essen/demoDish";
import { openHelper } from "@/lib/begleitung/open";
import { doneJetztTopic, noteJetztSkip, noteJetztTap, weekCheckDone } from "@/lib/heute/jetztStore";
import { weekCheckKey } from "@/lib/kalender/wochencheck";
import type { JetztTopic } from "@/lib/heute/jetztTopics";
import type { HomeData } from "@/components/heute/useHomeData";
import { dishOf } from "@/components/essen/useMeals";
import { TipsTile } from "@/components/tipps/TipsTile";
import { hideJetztTipWeekend, useTipSettings, useTipsOn, useTipsWindow } from "@/lib/tipps/client";
import { weekendKey } from "@/lib/tipps/model";
import { BrandMark } from "@/components/ui/BrandMark";
import { headerDate } from "@/lib/heute/kopfDatum";
import { MiaNameHint, useMiaHomeHint } from "@/components/heute/MiaNameHint";
import { InviteHintCard, useInviteHint } from "@/components/konten/InviteHintCard";
import { termineTile } from "@/lib/heute/termineKachel";


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
  const memos = useMemos();
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
  // Avatar: begrüßt einmal am Tag beim ersten Öffnen (nachts schläft Mia – useMiaLook)
  useEffect(() => {
    const m = berlinTime().minutes;
    if (m >= 6 * 60 && m < 22 * 60) greetOncePerDay(data.todayIso);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, []);
  const cookingNow = Boolean(view.cooking);
  // Kochmütze (Kochtipp): ab dem 3. Nutzungstag, früher auf Nachfrage oder mit „Alles zeigen“
  const kochtipp = useKochtipp();
  useEffect(() => noteKochtippDay(data.todayIso), [data.todayIso]);
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
  // Termine-Kachel: läuft 30 Min, „gleich“, alles vorbei → „Morgen · Sa“ (lib/heute/termineKachel.ts)
  const terminTile = termineTile(
    items.filter((i) => i.entry.typ === "termin" && (!view.familyUpcomingOnly || i.room === "familie")),
    tomorrowAll.filter((i) => i.entry.typ === "termin" && (!view.hideWork || i.room !== "arbeit")),
    tomorrowIso,
    minutes,
  );
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
  const hat = Boolean(kochtipp && hatVisible(kochtipp, data.profile.display === "alles", demoDish));
  const demoMeal = demoDishAt(data.todayIso, minutes);
  const potHint = usePotHint(demoDay.tiles.length > 0);
  const miaHint = useMiaHomeHint(data.profile.miaHomeHint);
  const inviteHint = useInviteHint(data.profile, data.todayIso, demoDay.tiles.length > 0 || tipSeen === false || miaHint);
  const runningTimer = timers ? sortTimers(timers.timers.filter((x) => isRunning(x, nowMs)), nowMs)[0] : undefined;
  const steps = recipe?.steps ?? [];
  const step = cookingNow && cooking ? currentStep(steps.length, cooking.steps[recipe?.id ?? dish ?? ""] ?? []) : null;
  const match = recipe && stock ? matchStock(recipe.ingredients.map((i) => i.name), stock, data.todayIso) : null;
  const needs = match?.needs ?? null;
  const dueToday = workless(overview.heute).filter((i) => !i.carried && i.entry.typ === "aufgabe" && (i.entry.data.due === data.todayIso || i.entry.data.date === data.todayIso));
  const training = ctx?.sport.training;
  const leisure = evening && notes ? leisureIdea(notes, data.todayIso) : null;
  const regionTips = useTipsWindow(data.todayIso, regionOn && !demoDay.tiles.length);
  const potState = usePotState();
  const mia = useMiaRoutinen({ today: data.todayIso, minutes, entries, termine: allItems, tomorrow: tomorrowAll, profile: data.profile, me: name || "Ich", regen: null, demo: Boolean(demoDay.termine) || demoDay.tiles.length > 0 });
  const jetzt = useJetztTopics({
    routinen: mia.routinen,
    today: data.todayIso,
    minutes,
    me: name || "Ich",
    calm: (evening && routine.ruhe) || weekday >= 5,
    // Beispiel-Tag mit weniger als 2 Terminen heute: die Beispiele gelten für morgen
    upcoming: demoDay.termine && !demoDay.label ? demoDay.termine : demoDay.termine ? [] : termine,
    tomorrow: demoDay.termine && demoDay.label ? demoDay.termine : tomorrowAll.filter((i) => !view.hideWork || i.room !== "arbeit"),
    urgent: view.tasksRest ? [] : tasksAll.filter(isUrgent).filter((i) => !i.done),
    dueToday: view.tasksRest ? [] : dueToday.filter((i) => !i.done),
    pins: demoDay.tiles.includes("pinnwand") ? [] : pins,
    memos: demoDay.tiles.includes("pinnwand") ? [] : memos,
    nowMs,
    // Beispielgericht nur, solange es heute noch dran ist (danach steht es für morgen da)
    dish: demoDish
      ? demoMeal.tomorrow
        ? null
        : { name: demoMeal.recipe.title, clock: demoMeal.clock, minutes: demoMeal.recipe.prepMinutes, ready: true, missing: [], demo: true }
      : dish && !data.day?.away
        ? { name: dish, clock: dishClock, minutes: recipe?.prepMinutes ?? null, ready: Boolean(needs && !needs.length), missing: needs ?? [], unsure: match?.unsure ?? [] }
        : null,
    dinnerFree: !dish && !over && !data.day?.away && Boolean(dishClock && dishClock >= "15:00"),
    todayAll: allItems,
    training: training && !demoDay.tiles.length ? { key: `sport:${data.todayIso}`, title: training.title, time: `${String(Math.floor(training.start / 60)).padStart(2, "0")}:${String(training.start % 60).padStart(2, "0")}` } : null,
    timer: runningTimer ? { name: runningTimer.name, left: leftWords(runningTimer.endsAt - nowMs) } : null,
    cookingStep: step !== null && steps[step] ? steps[step] : null,
    reminder: reminder ? { key: reminder.key, text: reminder.text } : null,
    pause: paused && data.profile.pause ? pauseLabel(data.profile.pause) : null,
    leisure: leisure ? { text: leisure.item.text, href: `/notizen/bearbeiten?id=${leisure.note.id}` } : null,
    tip: tip?.text ?? null,
    regionTips: regionTips?.tips ?? null,
    potInvite: potState ? liveInvite(POT_STATUS, potState.pledge, potState.liveAsked) : null,
    kids: hasKids(data.profile),
    regionHidden: tipSettings.jetztAus,
    demo: demoDay.tiles.length > 0,
    demoShop: demoDay.tiles.includes("einkauf"),
    weekCheck: demoDay.tiles.length || paused || (evening && routine.ruhe) ? null : weekCheckKey(data.todayIso, minutes),
    tiles: visible.map((t) => t.id),
    tomorrowTiles: [
      ...((demoDay.termine && demoDay.label && visible.some((t) => t.id === "termine")) || visible.some((t) => t.id === "morgen") ? (["termine"] as HomeTileId[]) : []),
      ...(view.weatherTomorrow && visible.some((t) => t.id === "wetter") ? (["wetter"] as HomeTileId[]) : []),
    ],
  });
  // Antippen der Jetzt-Karte = „Dein Tag“ mit dem Thema hervorgehoben (Tafel 66 B); läuft ein Timer: der Timer.
  // Wochencheck und Pause bleiben Handlungen, kein Tagesinhalt.
  const openTopic = (t: JetztTopic) => {
    noteJetztTap(t.kind);
    if (t.kind === "erinnerung" && reminder) markReminderSeen(reminder.key);
    if (t.target && "action" in t.target) {
      if (t.target.action === "timer") return document.querySelector('[data-tile~="timer"]')?.scrollIntoView({ behavior: "smooth", block: "center" }) ?? router.push("/timer");
      if (t.target.action === "pause") return endPause();
      if (t.target.action === "wochencheck") {
        weekCheckDone(t.id.slice("wochencheck:".length));
        return openHelper("wochencheck");
      }
    }
    // Region-Tipp und Spendentopf haben keinen Platz in „Dein Tag“ – sie öffnen ihre Seite
    if ((t.kind === "spendentopf" || t.kind === "region") && t.target && "href" in t.target) return router.push(t.target.href);
    setDayTopic({ topic: t });
  };
  const [dayTopic, setDayTopic] = useState<{ topic: JetztTopic | null } | null>(null);
  // Mia: „Was steht heute an?“ öffnet „Dein Tag“ (ohne Thema)
  useEffect(() => onOpenDeinTag(() => setDayTopic({ topic: null })), []);
  // Weiterwischen: etwas weniger Interesse; ein Region-Tipp kommt dieses Wochenende nicht wieder
  const skipTopic = (t: JetztTopic) => {
    noteJetztSkip(t.kind);
    if (t.kind === "region") hideJetztTipWeekend(weekendKey(data.todayIso));
  };
  // „Erledigt“: abhaken (Erinnerung gesehen) und das Thema für heute weglegen – die Karte zeigt kurz ✓
  const doneTopic = (t: JetztTopic) => {
    if (t.kind === "erinnerung" && reminder) markReminderSeen(reminder.key);
    doneJetztTopic(t.id, data.todayIso);
    buzz();
  };

  const renderTile = (tile: HomeTile, half: boolean, edit: boolean) => {
    switch (tile.id) {
      case "termine":
        if (demoDay.termine) return <TermineSection rows={demoDay.termine.map((item) => ({ item, state: null }))} href={`/tag?datum=${data.todayIso}`} today={data.todayIso} size={tile.size} half={half} demo={demoProps} />;
        return <TermineSection rows={terminTile.rows} label={terminTile.label} href={`/tag?datum=${terminTile.label ? tomorrowIso : data.todayIso}`} today={data.todayIso} size={tile.size} half={half} />;
      case "aufgaben":
        if (demoDay.tasks) return <AufgabenSection items={demoDay.tasks} today={data.todayIso} size={tile.size} half={half} demo={demoProps} />;
        return <AufgabenSection items={tasks} total={view.tasksRest ? 0 : openTaskCount(entries, data.todayIso)} today={data.todayIso} size={tile.size} half={half} />;
      case "essen":
        if (demoDish) return <DemoFoodTile half={half} today={data.todayIso} minutes={minutes} hat={hat && !edit ? helperName(data.profile) : undefined} />;
        if (cookingNow && dish && !edit) return <CookingTile dish={dish} clock={dishClock} persons={data.day?.persons ?? null} recipe={recipe} today={data.todayIso} onEaten={eaten} />;
        return <FoodTile data={data} dish={dish} over={over} dishClock={dishClock} onOpen={onOpenFood} size={tile.size} onCook={dish && !over && !edit ? cookNow : undefined} hat={hat && !edit ? { quiet: cookingNow } : null} />;
      case "einkauf":
        return <ShoppingTile half={half} size={tile.size} demo={demoDay.tiles.includes("einkauf")} />;
      case "notizen":
        return <NotesTile name={helperName(data.profile)} size={tile.size} />;
      case "vorrat":
        return <PantryTile size={tile.size} />;
      case "wetter":
        return <WeatherTile size={tile.size} half={half} today={data.todayIso} minutes={minutes} termine={termine.flatMap((t) => (t.time ? [{ title: t.title, time: t.time }] : []))} tomorrow={Boolean(view.weatherTomorrow) && !edit} />;
      case "pinnwand":
        return <PinboardTile size={tile.size} me={name || "Ich"} demo={demoDay.tiles.includes("pinnwand")} />;
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
            // Kopf (Tafel 55): links die Marke, rechts das Datum – die Begrüßung bleibt für VoiceOver
            <header className="flex h-9 items-center justify-between gap-3 pt-1">
              <h1 className="sr-only">
                {greeting(minutes)}
                {name ? `, ${name}.` : "!"}
              </h1>
              <BrandMark height={30} />
              <p className="text-[15px] font-semibold text-muted">{headerDate(data.today)}</p>
            </header>
          )}

          {jetzt.on && (editing.on ? <JetztPlaceholder /> : <JetztCard topics={jetzt.topics} name={helperName(data.profile)} onOpen={openTopic} onSkip={skipTopic} arrive={arrive} />)}

          {!editing.on && (
            <>
              {/* Höchstens ein Hinweis: „Mia neu hinzufügen“ (iPhone), Spendentopf (Abstimmung bzw. Beitrags-Frage), dann der Dunkel-Tipp */}
              {miaHint && <MiaNameHint />}
              {potHint && !miaHint && <PotHintCard hint={potHint} />}
              {inviteHint && !potHint && !miaHint && <InviteHintCard text={inviteHint} today={data.todayIso} />}
              <DarkTip profile={data.profile} today={data.todayIso} quiet={demoDay.tiles.length > 0 || tipSeen === false || Boolean(potHint) || miaHint || Boolean(inviteHint)} />
              {tipSeen === false && welcomed && !demoDay.tiles.length && (
                <div className="flex items-start gap-3 rounded-card bg-accent-soft px-4 py-3" role="status">
                  <p className="flex-1 text-[15px] leading-snug text-accent-strong">Tipp: Halte die Startseite gedrückt, um Kacheln hinzuzufügen oder zu entfernen.</p>
                  <button type="button" onClick={markHomeTipSeen} className="hit shrink-0 text-sm font-bold text-accent-strong underline">
                    Verstanden
                  </button>
                </div>
              )}
            </>
          )}

          {!editing.on && demoDay.tiles.length > 0 && <DemoRow ask={demoDay.ask} />}

          <div className={arrive ? "tiles-arrive" : undefined}>
            <HomeBoard tiles={visible} all={all} editing={editing.on} render={renderTile} picking={picking} onPicking={setPicking} onDone={editing.close} />
          </div>

          {demoItem && <DemoItemSheet item={demoItem} today={data.todayIso} onClose={() => setDemoItem(null)} />}
          {dayTopic && (
            <DeinTag
              today={data.todayIso}
              dateLabel={headerDate(data.today)}
              minutes={minutes}
              termine={allItems.filter((i) => i.entry.typ === "termin")}
              tomorrow={tomorrowAll.filter((i) => i.entry.typ === "termin")}
              tasks={allItems.filter((i) => i.entry.typ === "aufgabe")}
              dish={
                dish && !data.day?.away
                  ? { name: dish, clock: dishClock, minutes: recipe?.prepMinutes ?? null, ready: Boolean(needs && !needs.length), missing: needs ?? [], unsure: match?.unsure ?? [], cookHref: recipe ? `/kochbuch/kochen?id=${encodeURIComponent(recipe.id)}` : null }
                  : null
              }
              shop={jetzt.shop}
              pins={(pins ?? []).filter((p) => p.erstellt.slice(0, 10) === data.todayIso || toIsoDate(new Date(p.erstellt)) === data.todayIso)}
              topic={dayTopic.topic}
              fragen={mia.fragen}
              onTopicDone={doneTopic}
              onClose={() => setDayTopic(null)}
            />
          )}

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
      {editing.on && !picking && <EditDoneBar onDone={editing.close} onAdd={() => setPicking(true)} />}
    </>
  );
}
