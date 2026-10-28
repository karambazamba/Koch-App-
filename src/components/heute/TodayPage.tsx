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
import { PenLine, Settings } from "lucide-react";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { DEFAULT_HOME, markHomeTipSeen, tileMeta, useHomeTiles, useHomeTipSeen, type HomeTile, type HomeTileId } from "@/lib/core/homeLayout";
import { useWelcomeFinished } from "@/lib/einstellungen/welcomeStore";
import { HomeBoard } from "@/components/heute/HomeBoard";
import { FoodTile, NotesTile, PantryTile, ShoppingTile } from "@/components/heute/HomeTiles";
import { WeatherTile } from "@/components/wetter/WeatherTile";
import { PinboardTile } from "@/components/pinnwand/PinboardTile";
import { TimerTile } from "@/components/timer/TimerTile";
import { Sheet } from "@/components/ui/Sheet";
import { CookingTile } from "@/components/essen/CookingTile";
import { DemoFoodTile } from "@/components/essen/DemoFoodTile";
import { JetztCard, JetztPlaceholder } from "@/components/heute/JetztCard";
import { DeinTag } from "@/components/heute/DeinTag";
import { onOpenDeinTag } from "@/lib/heute/deinTag";
import { useJetztTopics } from "@/components/heute/useJetztTopics";
import { takeHelloFlight } from "@/lib/core/hello";
import { SportTile } from "@/components/sport/SportTile";
import { useHomePhase } from "@/components/heute/useHomePhase";
import { arbeitsEnde, type PhaseContext } from "@/lib/heute/phases";
import { DEFAULT_ROUTINE, usePreview, useRoutine } from "@/lib/heute/tagesablauf";
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
import { isUrgent, itemsForDay, taskOverview, tomorrowLabel, upcomingTermine, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { aufgabenFuerTag, aufgabenTag, aufgabenUebersicht, aufMorgen } from "@/lib/kalender/mitwandern";
import { listenAnsicht } from "@/lib/kalender/liste/ordnung";
import { AufgabenSection, TermineSection, type DemoProps } from "@/components/heute/MiniCards";
import { useDemoDay } from "@/components/heute/useDemoDay";
import { DemoItemSheet, DemoRow } from "@/components/heute/DemoBits";
import { EditHeader } from "@/components/heute/EditHeader";
import { useHomeEditing } from "@/components/heute/useHomeEditing";
import { Pressable } from "@/components/heute/Pressable";
import { DarkTip } from "@/components/heute/DarkTip";
import { showDarkTip, showLookTip, useDarkTip } from "@/lib/core/darkTip";
import { appSince } from "@/lib/core/activity";
import { hinweisGezeigt, naechsterHinweis, useHinweiseGezeigt } from "@/lib/core/hinweise";
import { hatVisible, noteKochtippDay, useKochtipp } from "@/lib/essen/kochtipp/store";
import { PotHintCard, usePotHint } from "@/components/spendentopf/PotHintCard";
import { usePotState } from "@/lib/spendentopf/store";
import { liveInvite } from "@/lib/spendentopf/model";
import { POT_STATUS } from "@/lib/spendentopf/regions";
import { SpendentopfTile } from "@/components/spendentopf/SpendentopfTile";
import { clearDemoTile, hideDemoItem, toggleDemoDone } from "@/lib/core/demo";
import { showDone, showToast } from "@/lib/core/toast";
import { dueReminder } from "@/lib/kalender/reminders";
import { markReminderSeen, useSeenReminders } from "@/lib/kalender/store";
import { greeting } from "@/lib/kalender/summary";
import { addDays } from "@/lib/core/now";
import { takeDish } from "@/components/heute/takeDish";
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
import { HALTEN_TIPP, LEISTE_NEU } from "@/lib/heute/miaName";
import { SeitenTipp } from "@/components/begleitung/denktmit/SeitenTipp";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { InviteHintCard, useInviteHint } from "@/components/konten/InviteHintCard";
import { termineTile } from "@/lib/heute/termineKachel";
import { haushaltOf } from "@/lib/core/haushalt";
import { kidsWay, vorlaufVon } from "@/lib/heute/abendDaten";
import { abendLage } from "@/lib/heute/abendThema";
import { useMiaDenkt } from "@/components/begleitung/denktmit/useMiaDenkt";
import { MiaKarte } from "@/components/begleitung/denktmit/MiaKarte";


/** Name für die Begrüßung: die erste Person im Haushalt (meist man selbst) */
const firstName = (data: HomeData) => data.profile.persons[0]?.name.trim() ?? "";

/** Seite je Kachel (ganze Kachel = Seite); Timer hat keine eigene Seite (Fenster) */
const TILE_PAGE: Partial<Record<HomeTileId, string>> = {
  termine: "/?seite=kalender",
  aufgaben: "/aufgaben",
  essen: "/?seite=essen",
  einkauf: "/einkaufsliste",
  wetter: "/wetter",
  pinnwand: "/pinnwand",
  notizen: "/notizen",
  vorrat: "/vorrat",
  sport: "/sport",
  spendentopf: "/spendentopf",
  tipps: "/tipps",
};

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
  // Bausteine Tipps / Wochenend-Ideen: als leises Thema der Jetzt-Karte an ruhigen Tagen
  const tipsOn = useFeature("tipps");
  const weekendOn = useFeature("wochenendIdeen");
  const pantryOn = useFeature("vorrat");
  // Launch 1.0: Sport, Notizen, Spendentopf nur als Baustein (wer sie nutzt, behält sie)
  const sportOn = useFeature("sport");
  const notesOn = useFeature("notizen");
  const potOn = useFeature("spendentopf");
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
  const workEnd = arbeitsEnde(allItems);
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
  const demoDay = useDemoDay(entries, data.todayIso, minutes, helperName(data.profile), Boolean(dish), haushaltOf(data.profile.householdType));
  const [demoItem, setDemoItem] = useState<DayItem | null>(null);
  const demoProps: DemoProps = { label: demoDay.label, done: demoDay.done, onToggle: (i) => (buzz(), toggleDemoDone(i.entry.id)), onGone: (i) => showDone(hideDemoItem(i.entry.id)), onOpen: setDemoItem };
  const overview = taskOverview(entries, data.todayIso);
  const workless = (list: typeof overview.heute) => (view.hideWork ? list.filter((i) => i.room !== "arbeit") : list);

  // Kacheln: genau die gespeicherte Reihenfolge und Größe – im Bearbeiten-Modus dieselbe
  const visible = all.filter((t) => t.visible && !tileMeta(t.id).soon && (t.id !== "vorrat" || pantryOn) && (t.id !== "tipps" || regionOn) && (t.id !== "sport" || sportOn) && (t.id !== "notizen" || notesOn) && (t.id !== "spendentopf" || potOn));

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
  const tomorrowPrep = vorlaufVon(data, stock);
  const demoDish = demoDay.tiles.includes("essen");
  const hat = Boolean(kochtipp && hatVisible(kochtipp, data.profile.display === "alles", demoDish));
  const demoMeal = demoDishAt(data.todayIso, minutes);
  // Höchstens EIN Hinweis unter der Jetzt-Karte (zentral in core/hinweise.ts)
  const demoOn = demoDay.tiles.length > 0;
  const potHint = usePotHint(demoOn || potOn !== true);
  const miaHint = useMiaHomeHint(data.profile.miaHomeHint);
  const inviteHint = useInviteHint(data.profile, data.todayIso, demoOn);
  const darkState = useDarkTip();
  const lookOn = showLookTip(darkState, data.todayIso, data.profile.look);
  const gezeigt = useHinweiseGezeigt();
  const leisteNeu = useHintSeen("leiste-neu");
  const hinweis = gezeigt
    ? naechsterHinweis(
        {
          "mia-name-neu": miaHint,
          "leiste-neu": leisteNeu === false,
          einladen: Boolean(inviteHint),
          spendentopf: Boolean(potHint),
          "startseite-halten": tipSeen === false && welcomed,
          "lieber-schlicht": lookOn,
          "abends-dunkel": !lookOn && showDarkTip(darkState, data.todayIso, data.profile.themeSet) && !(darkState && !darkState.look && data.profile.look === "farbig"),
        },
        { today: data.todayIso, since: appSince(), demo: demoOn, gezeigt },
      )
    : null;
  useEffect(() => {
    if (hinweis) hinweisGezeigt(hinweis, data.todayIso);
  }, [hinweis, data.todayIso]);
  const runningTimer = timers ? sortTimers(timers.timers.filter((x) => isRunning(x, nowMs)), nowMs)[0] : undefined;
  const steps = recipe?.steps ?? [];
  const step = cookingNow && cooking ? currentStep(steps.length, cooking.steps[recipe?.id ?? dish ?? ""] ?? []) : null;
  const cookingStep = step !== null && steps[step] ? steps[step] : null;
  const match = recipe && stock ? matchStock(recipe.ingredients.map((i) => i.name), stock, data.todayIso) : null;
  const needs = match?.needs ?? null;
  // Alles ist heute (Tafel 103): eigens erwähnt wird nur eine Frist, die heute endet
  const dueToday = workless(overview.heute).filter((i) => i.entry.typ === "aufgabe" && i.entry.data.due === data.todayIso);
  const training = ctx?.sport.training;
  const leisure = evening && notes ? leisureIdea(notes, data.todayIso) : null;
  const regionTips = useTipsWindow(data.todayIso, regionOn && !demoDay.tiles.length);
  const potState = usePotState();
  // Mia denkt mit: höchstens eine Karte am Tag (nur, wenn kein anderer Hinweis steht), sonst vielleicht ein Spruch
  // Jetzt-Karte: Essen von heute (Beispielgericht nur, solange es heute noch dran ist – danach steht es für morgen da)
  const jetztDish = demoDish
    ? demoMeal.tomorrow
      ? null
      : { name: demoMeal.recipe.title, clock: demoMeal.clock, minutes: demoMeal.recipe.prepMinutes, ready: true, missing: [], demo: true }
    : dish && !data.day?.away
      ? { name: dish, clock: dishClock, minutes: recipe?.prepMinutes ?? null, ready: Boolean(needs && !needs.length), missing: needs ?? [], unsure: match?.unsure ?? [] }
      : null;
  const jetztUpcoming = demoDay.termine && !demoDay.label ? demoDay.termine : demoDay.termine ? [] : termine;
  // Abends steht die Startseite auf morgen: offene Aufgaben wandern still mit (kalender/mitwandern.ts)
  const mitwandern = { heute: data.todayIso, abends: aufMorgen(abendLage({ minutes, evening, cookingStep, upcoming: jetztUpcoming, dish: jetztDish })) };
  // Die eine Liste wie auf der Aufgaben-Seite (dringend → neu → Erstellungszeit, ohne Geparktes aus Listen); nach Feierabend ohne Arbeit, dafür „Arbeit · 5 für morgen“
  const tasksJetzt = listenAnsicht(aufgabenUebersicht(entries, mitwandern).heute).jetzt;
  const tasksAll = workless(tasksJetzt);
  const tasks = tasksAll;
  const arbeitMorgen = view.hideWork ? tasksJetzt.length - tasksAll.length : 0;
  const tasksTomorrow = workless(aufgabenFuerTag(entries, tomorrowIso, mitwandern));
  const denkt = useMiaDenkt({ data, entries, items: allItems, minutes, visible: visible.map((t) => t.id), demo: demoOn, pause: Boolean(paused), ruhe: evening && routine.ruhe, besetzt: Boolean(hinweis), me: name || "Ich", onOpenFood });
  const mia = useMiaRoutinen({ today: data.todayIso, minutes, entries, termine: allItems, tomorrow: tomorrowAll, profile: data.profile, me: name || "Ich", regen: null, demo: Boolean(demoDay.termine) || demoDay.tiles.length > 0 });
  const jetzt = useJetztTopics({
    routinen: mia.routinen,
    today: data.todayIso,
    minutes,
    me: name || "Ich",
    calm: (evening && routine.ruhe) || weekday >= 5,
    // Beispiel-Tag mit weniger als 2 Terminen heute: die Beispiele gelten für morgen
    upcoming: jetztUpcoming,
    tomorrow: demoDay.termine && demoDay.label ? demoDay.termine : [...tomorrowAll.filter((i) => i.entry.typ === "termin" && (!view.hideWork || i.room !== "arbeit")), ...tasksTomorrow],
    urgent: view.tasksRest ? [] : tasksAll.filter(isUrgent).filter((i) => !i.done),
    dueToday: view.tasksRest ? [] : dueToday.filter((i) => !i.done),
    pins: demoDay.tiles.includes("pinnwand") ? [] : pins,
    memos: demoDay.tiles.includes("pinnwand") ? [] : memos,
    nowMs,
    dish: jetztDish,
    dinnerFree: !dish && !over && !data.day?.away && Boolean(dishClock && dishClock >= "15:00"),
    todayAll: allItems,
    training: training && !demoDay.tiles.length ? { key: `sport:${data.todayIso}`, title: training.title, time: `${String(Math.floor(training.start / 60)).padStart(2, "0")}:${String(training.start % 60).padStart(2, "0")}` } : null,
    timer: runningTimer ? { name: runningTimer.name, left: leftWords(runningTimer.endsAt - nowMs) } : null,
    cookingStep,
    reminder: reminder ? { key: reminder.key, text: reminder.text } : null,
    pause: paused && data.profile.pause ? pauseLabel(data.profile.pause) : null,
    leisure: leisure ? { text: leisure.item.text, href: `/notizen/bearbeiten?id=${leisure.note.id}` } : null,
    tip: tip?.text ?? null,
    spruch: denkt.spruch,
    regionTips: regionTips?.tips ?? null,
    potInvite: potState ? liveInvite(POT_STATUS, potState.pledge, potState.liveAsked) : null,
    kids: hasKids(data.profile),
    regionHidden: tipSettings.jetztAus,
    demo: demoDay.tiles.length > 0,
    demoShop: demoDay.tiles.includes("einkauf"),
    weekCheck: demoDay.tiles.length || paused || (evening && routine.ruhe) ? null : weekCheckKey(data.todayIso, minutes),
    kuehlCheck: denkt.kuehlcheck,
    tiles: visible.map((t) => t.id),
    // Abends (Tafel 98): EIN Thema über morgen – Haushalt, Kita/Schule, Essen mit Vorlauf
    evening,
    solo: haushaltOf(data.profile.householdType) === "allein",
    kidsWay: kidsWay(data.profile.persons),
    tomorrowDish: tomorrowPrep,
  });
  const spruchSteht = jetzt.topics[0]?.kind === "spruch";
  // Kurz-Check „Im Haus“ zählt als der eine Hinweis des Tages – sobald er in der Jetzt-Karte steht
  const kuehlSteht = jetzt.topics.some((t) => t.kind === "kuehlcheck");
  useEffect(() => {
    if (spruchSteht) denkt.spruchGesehen();
    if (kuehlSteht) denkt.kuehlcheckGesehen();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- einmal, wenn er steht
  }, [spruchSteht, kuehlSteht]);
  // Antippen der Jetzt-Karte = „Dein Tag“ mit dem Thema hervorgehoben (Tafel 66 B); läuft ein Timer: der Timer.
  // Wochencheck und Pause bleiben Handlungen, kein Tagesinhalt.
  const openTopic = (t: JetztTopic) => {
    noteJetztTap(t.kind);
    if (t.kind === "erinnerung" && reminder) markReminderSeen(reminder.key);
    if (t.target && "action" in t.target) {
      // Timer-Kachel da: dorthin scrollen; sonst das Timer-Fenster (eine Seite /timer gibt es nicht)
      if (t.target.action === "timer") {
        const kachel = document.querySelector('[data-tile~="timer"]');
        return kachel ? kachel.scrollIntoView({ behavior: "smooth", block: "center" }) : setTimerOpen(true);
      }
      if (t.target.action === "pause") return endPause();
      if (t.target.action === "wochencheck") {
        weekCheckDone(t.id.slice("wochencheck:".length));
        return openHelper("wochencheck");
      }
    }
    // Region-Tipp, Spendentopf und Kurz-Check haben keinen Platz in „Dein Tag“ – sie öffnen ihre Seite
    if ((t.kind === "spendentopf" || t.kind === "region" || t.kind === "kuehlcheck") && t.target && "href" in t.target) return router.push(t.target.href);
    setDayTopic({ topic: t });
  };
  const [timerOpen, setTimerOpen] = useState(false);
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

  /** Ganze Kachel = Seite (Termine öffnet den Kalender, er steht auf „Heute“) */
  const tileHref = (id: HomeTileId): string | null => TILE_PAGE[id] ?? null;

  const renderTile = (tile: HomeTile, half: boolean, edit: boolean) => {
    switch (tile.id) {
      case "termine":
        if (demoDay.termine) return <TermineSection rows={demoDay.termine.map((item) => ({ item, state: null }))} href={TILE_PAGE.termine!} today={data.todayIso} size={tile.size} half={half} demo={demoProps} />;
        return <TermineSection rows={terminTile.rows} label={terminTile.label} href={TILE_PAGE.termine!} today={data.todayIso} size={tile.size} half={half} />;
      case "aufgaben":
        if (demoDay.tasks) return <AufgabenSection items={demoDay.tasks} today={data.todayIso} size={tile.size} half={half} demo={demoProps} />;
        return <AufgabenSection items={tasks} total={tasks.length} today={data.todayIso} label={mitwandern.abends ? tomorrowLabel(tomorrowIso) : null} addOn={aufgabenTag(mitwandern)} size={tile.size} half={half} arbeitMorgen={arbeitMorgen} />;
      case "essen":
        if (demoDish)
          return (
            <DemoFoodTile
              half={half}
              today={data.todayIso}
              minutes={minutes}
              hat={hat && !edit ? helperName(data.profile) : undefined}
              onTake={edit ? undefined : (d, tomorrow) => takeDish(data, d, tomorrow ? addDays(data.todayIso, 1) : data.todayIso) && clearDemoTile("essen")}
            />
          );
        if (cookingNow && dish && !edit) return <CookingTile dish={dish} recipe={recipe} today={data.todayIso} half={tile.size === "S"} onOpen={onOpenFood} onEaten={eaten} />;
        return <FoodTile data={data} dish={dish} over={over} dishClock={dishClock} onOpen={onOpenFood} size={tile.size} onCook={dish && !over && !edit ? cookNow : undefined} hat={hat && !edit ? { quiet: cookingNow } : null} />;
      case "einkauf":
        return <ShoppingTile half={half} size={tile.size} demo={demoDay.tiles.includes("einkauf")} />;
      case "notizen":
        return <NotesTile size={tile.size} />;
      case "vorrat":
        return <PantryTile size={tile.size} />;
      case "wetter":
        return <WeatherTile size={tile.size} half={half} today={data.todayIso} minutes={minutes} look={data.profile.look} tomorrow={Boolean(view.weatherTomorrow) && !edit} />;
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
            // Kopf (Tafel 55/96): links die Marke, rechts das Datum und „···“ (Einstellungen, Startseite bearbeiten) – die Begrüßung bleibt für VoiceOver
            <header className="flex h-9 items-center justify-between gap-3 pt-1">
              <h1 className="sr-only">
                {greeting(minutes)}
                {name ? `, ${name}.` : "!"}
              </h1>
              <BrandMark height={30} />
              <span className="flex items-center gap-2">
                <p className="text-[15px] font-semibold text-muted">{headerDate(data.today)}</p>
                <MoreMenu
                  title="Startseite"
                  items={[
                    { label: "Einstellungen", icon: Settings, onClick: () => router.push("/profil") },
                    { label: "Startseite bearbeiten", icon: PenLine, onClick: editing.open },
                  ]}
                />
              </span>
            </header>
          )}

          {jetzt.on && (editing.on ? <JetztPlaceholder /> : <JetztCard topics={jetzt.topics} name={helperName(data.profile)} onOpen={openTopic} onSkip={skipTopic} arrive={arrive} />)}

          {!editing.on && (
            <>
              {/* Höchstens ein Hinweis, Reihenfolge und „nur einmal“ in core/hinweise.ts; alle im Stil der Seiten-Tipps (SeitenTipp) */}
              {hinweis === "mia-name-neu" && <MiaNameHint />}
              {hinweis === "leiste-neu" && <SeitenTipp text={LEISTE_NEU} label="Neu" id="leiste-neu" onOk={() => markHintSeen("leiste-neu")} />}
              {hinweis === "einladen" && inviteHint && <InviteHintCard text={inviteHint} today={data.todayIso} />}
              {hinweis === "spendentopf" && potHint && <PotHintCard hint={potHint} />}
              {denkt.karte && <MiaKarte {...denkt.karte} />}
              <DarkTip profile={data.profile} today={data.todayIso} quiet={hinweis !== "lieber-schlicht" && hinweis !== "abends-dunkel"} />
              {hinweis === "startseite-halten" && <SeitenTipp text={HALTEN_TIPP} label="Tipp" id="startseite-halten" onOk={markHomeTipSeen} />}
            </>
          )}

          {!editing.on && demoDay.tiles.length > 0 && <DemoRow ask={demoDay.ask} />}

          <div className={arrive ? "tiles-arrive" : undefined}>
            <HomeBoard tiles={visible} all={all} editing={editing.on} render={renderTile} hrefFor={tileHref} picking={picking} onPicking={setPicking} glow={editing.on ? null : denkt.glow} vorstellen={denkt.vorstellung} />
          </div>

          {timerOpen && (
            <Sheet title="Timer" onClose={() => setTimerOpen(false)}>
              <div className="pb-3">
                <TimerTile size="M" />
              </div>
            </Sheet>
          )}
          {demoItem && <DemoItemSheet item={demoItem} today={data.todayIso} onClose={() => setDemoItem(null)} />}
          {dayTopic && (
            <DeinTag
              today={data.todayIso}
              dateLabel={headerDate(data.today)}
              minutes={minutes}
              termine={allItems.filter((i) => i.entry.typ === "termin")}
              tomorrow={tomorrowAll.filter((i) => i.entry.typ === "termin")}
              tasks={allItems.filter((i) => i.entry.typ === "aufgabe")}
              tomorrowTasks={tasksTomorrow}
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
    </>
  );
}
