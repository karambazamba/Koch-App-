"use client";

// Daten für die Jetzt-Karte zusammensuchen (Termine mit Notiz, Aufgaben,
// Regen zur Zeit eines Draußen-Termins, Pinnwand, Essen, Packliste, Timer …)
// und in die reine Punkte-Logik (`jetztTopics`, Tafel 60) geben. Im Beispiel-Tag kommen die Beispiele hinein – die
// Karte zeigt dann passende Beispiel-Themen je Uhrzeit.

import { useForecast } from "@/lib/wetter/client";
import { isRainy } from "@/lib/wetter/forecast";
import { guessSport, sportById } from "@/lib/sport/model";
import { addDays, toIsoDate } from "@/lib/core/now";
import { tomorrowLabel, type DayItem } from "@/lib/kalender/model";
import { formatDauer, memoUnheard, pinMeta, visibleMemos, visiblePins, type MemoMessage, type PinMessage } from "@/lib/pinnwand";
import { shortClock } from "@/components/notizen/Schnellnotiz";
import { hiddenToday, useJetzt } from "@/lib/heute/jetztStore";
import { isOutdoor, jetztTopics, type JetztInput, type JetztTermin } from "@/lib/heute/jetztTopics";
import type { HomeTileId } from "@/lib/core/homeLayout";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { shopGroups } from "@/lib/einkauf/shopGroups";
import { DEMO_SHOPS } from "@/lib/core/demo";
import { jetztTip, type TipView } from "@/lib/tipps/model";
import { tipWhen } from "@/components/tipps/TipBits";
import { tipTags } from "@/lib/tipps/categories";

export type JetztSource = {
  today: string;
  minutes: number;
  me: string;
  calm: boolean;
  upcoming: DayItem[];
  tomorrow: DayItem[];
  urgent: DayItem[];
  dueToday: DayItem[];
  pins: PinMessage[] | undefined;
  memos?: MemoMessage[] | undefined;
  nowMs: number;
  dish: JetztInput["dish"];
  /** Termine/Aufgaben heute und morgen (für Geburtstage) */
  todayAll: DayItem[];
  dinnerFree: boolean;
  leisure: JetztInput["leisure"];
  tip: string | null;
  /** Tipps aus der Region (nur wenn an), mit Kindern im Haushalt, am Wochenende schon weggewischt */
  regionTips: TipView[] | null;
  regionHidden: string | null;
  /** Training heute (für Packliste und Wetter) */
  training: { key: string; title: string; time: string } | null;
  timer: JetztInput["timer"];
  cookingStep: string | null;
  reminder: JetztInput["reminder"];
  pause: string | null;
  demo: boolean;
  kids: boolean;
  /** Woche für „Kurzer Wochencheck?“ (schon ohne Ruhe/Pause/Beispiel) – sonst null */
  weekCheck: string | null;
  /** Beispiel-Einkauf statt der echten Liste */
  demoShop: boolean;
  /** Sichtbare Kacheln */
  tiles: HomeTileId[];
  /** Kacheln, die schon „Morgen“ zeigen (Termine bzw. Morgen-Kachel) */
  tomorrowTiles?: HomeTileId[];
};

const termin = (i: DayItem): JetztTermin => {
  const data = i.entry.typ === "termin" ? (i.entry.data as { place?: string; note?: string }) : {};
  const place = data.place?.trim() || undefined;
  const sport = guessSport(i.title);
  return { key: i.key, title: i.title, time: i.time ?? "", date: i.date, work: i.room === "arbeit", place, note: data.note?.trim() || undefined, outdoor: isOutdoor(i.title, place, sport ? sportById(sport).outdoor : false) };
};

export function useJetztTopics(src: JetztSource) {
  const state = useJetzt();
  const { forecast } = useForecast();
  const shopping = useWeekShoppingList("planning");
  const openItems = (shopping?.list.items ?? []).filter((i) => !i.checked && !i.hidden);
  const topShop = src.demoShop ? DEMO_SHOPS[0] : shopGroups(openItems, 1).find((g) => g.shop) ?? null;
  const tomorrowIso = addDays(src.today, 1);
  const timed = src.upcoming.filter((i) => i.time).map(termin);
  // Neueste ungelesene Nachricht bzw. ungehörte Sprachnachricht (nur „Sprachnachricht · 0:12“, nie ein Inhalt)
  const unread = [
    ...(src.pins ? visiblePins(src.pins, src.nowMs).filter((m) => m.data.author !== src.me && !m.data.readBy.includes(src.me)) : []).map((m) => ({ id: m.id, erstellt: m.erstellt, data: { author: m.data.author, text: m.data.text } })),
    ...(src.memos ? visibleMemos(src.memos, src.nowMs).filter((m) => memoUnheard(m, src.me)) : []).map((m) => ({ id: m.id, erstellt: m.erstellt, data: { author: m.data.author, text: `Sprachnachricht · ${formatDauer(m.data.dauer)}` } })),
  ].sort((a, b) => b.erstellt.localeCompare(a.erstellt))[0];
  const birthday = (list: DayItem[], when: "heute" | "morgen") => list.filter((i) => /geburtstag/i.test(i.title) || /geburtstag/i.test(i.label ?? "")).map((i) => ({ title: i.title, date: i.date, when }));
  const sportKind = src.training ? sportById(guessSport(src.training.title) ?? "") : null;
  // Wetter nur mit Planbezug: Regen zur Stunde eines Draußen-Termins bzw. -Trainings
  const outside = [...timed.filter((t) => t.outdoor), ...(src.training && sportKind?.outdoor ? [{ key: src.training.key, title: src.training.title, time: src.training.time }] : [])];
  const wet = forecast
    ? outside.find((t) => {
        const h = forecast.hours.find((x) => x.date === src.today && x.hour === Number(t.time.slice(0, 2)));
        return h ? isRainy(h) : false;
      })
    : undefined;
  const todayDay = forecast?.days.find((d) => d.date === src.today);
  const region = src.regionTips ? jetztTip(src.regionTips, { today: src.today, minutes: src.minutes, rainy: todayDay ? todayDay.wet > 0 : null, kids: src.kids, hiddenWeekend: src.regionHidden }) : null;
  const input: JetztInput = {
    minutes: src.minutes,
    today: src.today,
    calm: src.calm,
    upcoming: timed,
    tomorrow: {
      label: tomorrowLabel(tomorrowIso),
      date: tomorrowIso,
      items: [...src.tomorrow].sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99")).map(termin),
    },
    urgent: src.urgent.map((i) => ({ key: i.key, title: i.title, work: i.room === "arbeit" })),
    dueToday: src.dueToday.map((i) => ({ key: i.key, title: i.title, work: i.room === "arbeit" })),
    pin: unread ? { id: unread.id, author: unread.data.author, text: unread.data.text, when: pinMeta(unread, src.me, src.today, shortClock, (iso) => toIsoDate(new Date(iso))).split(" · ")[1] ?? "" } : null,
    planWeather: wet ? { key: wet.key, title: wet.title, time: wet.time, word: "Regen" } : null,
    dish: src.dish,
    birthdays: [...birthday(src.todayAll.filter((i) => i.date === src.today), "heute"), ...birthday(src.tomorrow, "morgen")],
    sport: src.training && sportKind ? { ...src.training, pack: sportKind.pack } : null,
    shop: topShop?.shop ? { shop: topShop.shop, names: topShop.names } : null,
    timer: src.timer,
    cookingStep: src.cookingStep,
    reminder: src.reminder,
    pause: src.pause,
    dinnerFree: src.dinnerFree,
    leisure: src.leisure,
    tip: src.tip,
    region: region ? { id: region.id, title: `Tipp: ${region.titel}`, detail: [tipWhen(region), region.ort_name, tipTags(region, 1)[0]].filter(Boolean).join(" · ") } : null,
    kids: src.kids,
    weekCheck: src.weekCheck && state.weekOff !== src.weekCheck ? src.weekCheck : null,
    demo: src.demo,
    tiles: src.tiles,
    tomorrowTiles: src.tomorrowTiles ?? [],
    weights: state.weights,
    hidden: hiddenToday(state, src.today),
  };
  return { on: state.on, topics: jetztTopics(input) };
}
