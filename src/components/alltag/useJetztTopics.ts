"use client";

// Daten für die Jetzt-Karte zusammensuchen (Termine, Aufgaben, Wetter,
// Pinnwand, Essen, Sport, Timer …) und in die reine Punkte-Logik
// (`jetztTopics`) geben. Im Beispiel-Tag kommen die Beispiele hinein – die
// Karte zeigt dann passende Beispiel-Themen je Uhrzeit.

import { useForecast } from "@/lib/wetter/client";
import { round, todayRange, weatherKind, weatherTip } from "@/lib/wetter/forecast";
import { dayWords } from "@/lib/wetter/view";
import { addDays, toIsoDate } from "@/lib/core/now";
import { tomorrowLabel, type DayItem } from "@/lib/aufgaben/model";
import { formatDauer, memoUnheard, pinMeta, visibleMemos, visiblePins, type MemoMessage, type PinMessage } from "@/lib/pinnwand";
import { shortClock } from "@/components/notizen/Schnellnotiz";
import { hiddenToday, useJetzt } from "@/lib/jetzt/store";
import { jetztTopics, type JetztInput, type JetztTermin } from "@/lib/jetzt/topics";
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
  allDone: boolean;
  pins: PinMessage[] | undefined;
  memos?: MemoMessage[] | undefined;
  nowMs: number;
  dish: JetztInput["dish"];
  dinnerFree: boolean;
  /** Termine/Aufgaben heute und morgen (für Geburtstage) */
  todayAll: DayItem[];
  sport: JetztInput["sport"];
  timer: JetztInput["timer"];
  cookingStep: string | null;
  reminder: JetztInput["reminder"];
  pause: string | null;
  leisure: JetztInput["leisure"];
  tip: string | null;
  demo: boolean;
  /** Tipps aus der Region (nur wenn an), mit Kindern im Haushalt, am Wochenende schon weggewischt */
  regionTips: TipView[] | null;
  kids: boolean;
  regionHidden: string | null;
  /** Beispiel-Einkauf statt der echten Liste */
  demoShop: boolean;
  firstTiles: HomeTileId[];
};

const termin = (i: DayItem): JetztTermin => ({
  key: i.key,
  title: i.title,
  time: i.time!,
  date: i.date,
  work: i.room === "arbeit",
  place: i.entry.typ === "termin" ? (i.entry.data as { place?: string }).place?.trim() || undefined : undefined,
});

export function useJetztTopics(src: JetztSource) {
  const state = useJetzt();
  const { forecast } = useForecast();
  const shopping = useWeekShoppingList("planning");
  const openItems = (shopping?.list.items ?? []).filter((i) => !i.checked && !i.hidden);
  const topShop = src.demoShop ? DEMO_SHOPS[0] : shopGroups(openItems, 1).find((g) => g.shop) ?? null;
  const tomorrowIso = addDays(src.today, 1);
  const timed = src.upcoming.filter((i) => i.time);
  const tips = timed.map((t) => ({ title: t.title, time: t.time! }));
  const hour = Math.floor(src.minutes / 60);
  const nowHour = forecast?.hours.find((h) => h.date === src.today && h.hour === hour);
  const range = forecast ? todayRange(forecast, src.today) : null;
  const tomorrowDay = forecast?.days.find((d) => d.date === tomorrowIso);
  // Neueste ungelesene Nachricht bzw. ungehörte Sprachnachricht (nur „Sprachnachricht · 0:12“, nie ein Inhalt)
  const unread = [
    ...(src.pins ? visiblePins(src.pins, src.nowMs).filter((m) => m.data.author !== src.me && !m.data.readBy.includes(src.me)) : []).map((m) => ({ id: m.id, erstellt: m.erstellt, data: { author: m.data.author, text: m.data.text } })),
    ...(src.memos ? visibleMemos(src.memos, src.nowMs).filter((m) => memoUnheard(m, src.me)) : []).map((m) => ({ id: m.id, erstellt: m.erstellt, data: { author: m.data.author, text: `Sprachnachricht · ${formatDauer(m.data.dauer)}` } })),
  ].sort((a, b) => b.erstellt.localeCompare(a.erstellt))[0];
  const birthday = (list: DayItem[], when: "heute" | "morgen") => list.filter((i) => /geburtstag/i.test(i.title) || /geburtstag/i.test(i.label ?? "")).map((i) => ({ title: i.title, date: i.date, when }));
  const todayDay = forecast?.days.find((d) => d.date === src.today);
  const rainy = todayDay ? todayDay.wet > 0 : null;
  const region = src.regionTips ? jetztTip(src.regionTips, { today: src.today, minutes: src.minutes, rainy, kids: src.kids, hiddenWeekend: src.regionHidden }) : null;
  const input: JetztInput = {
    minutes: src.minutes,
    today: src.today,
    calm: src.calm,
    upcoming: timed.map(termin),
    tomorrow: {
      label: tomorrowLabel(tomorrowIso),
      date: tomorrowIso,
      items: [...src.tomorrow].sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99")).map((i) => ({ title: i.title, time: i.time ?? undefined })),
      weather: tomorrowDay ? dayWords(tomorrowDay) : null,
    },
    urgent: src.urgent.map((i) => ({ key: i.key, title: i.title, work: i.room === "arbeit" })),
    dueToday: src.dueToday.map((i) => ({ key: i.key, title: i.title, work: i.room === "arbeit" })),
    allDone: src.allDone,
    pin: unread ? { id: unread.id, author: unread.data.author, text: unread.data.text, when: pinMeta(unread, src.me, src.today, shortClock, (iso) => toIsoDate(new Date(iso))).split(" · ")[1] ?? "" } : null,
    weatherTip: forecast ? weatherTip(forecast, src.today, src.minutes, tips) : null,
    weatherNow: nowHour ? { temp: round(nowHour.temp), text: forecast?.current.raining ? "Regen" : (todayDay?.text ?? weatherKind(nowHour.code).text), range: range ? `${round(range.min)} bis ${round(range.max)}°` : undefined } : null,
    dish: src.dish,
    dinnerFree: src.dinnerFree,
    birthdays: [...birthday(src.todayAll.filter((i) => i.date === src.today), "heute"), ...birthday(src.tomorrow, "morgen")],
    sport: src.sport,
    shop: topShop?.shop ? { shop: topShop.shop, names: topShop.names } : null,
    timer: src.timer,
    cookingStep: src.cookingStep,
    reminder: src.reminder,
    pause: src.pause,
    leisure: src.leisure,
    tip: src.tip,
    region: region ? { id: region.id, title: region.titel, detail: [tipWhen(region), region.ort_name, tipTags(region, 1)[0]].filter(Boolean).join(" · ") } : null,
    demo: src.demo,
    firstTiles: src.firstTiles,
    weights: state.weights,
    hidden: hiddenToday(state, src.today),
  };
  return { on: state.on, topics: jetztTopics(input) };
}
