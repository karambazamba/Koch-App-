"use client";

// Daten für die Jetzt-Karte zusammensuchen (Termine mit Notiz, Aufgaben,
// Regen zur Zeit eines Draußen-Termins, Pinnwand, Essen, Packliste, Timer …)
// und in die reine Punkte-Logik (`jetztTopics`, Tafel 60) geben. Im Beispiel-Tag kommen die Beispiele hinein – die
// Karte zeigt dann passende Beispiel-Themen je Uhrzeit.

import { useForecast } from "@/lib/wetter/client";
import { isRainy } from "@/lib/wetter/forecast";
import { stormForPlan } from "@/lib/wetter/wind";
import { guessSport, sportById } from "@/lib/sport/model";
import { addDays, toIsoDate } from "@/lib/core/now";
import { tomorrowLabel, type DayItem } from "@/lib/kalender/model";
import { formatDauer, memoUnheard, pinMeta, activeMemos, activePins, type MemoMessage, type PinMessage } from "@/lib/pinnwand";
import { shortClock } from "@/components/notizen/Schnellnotiz";
import { hiddenToday, useJetzt } from "@/lib/heute/jetztStore";
import { isOutdoor, jetztTopics, type JetztInput, type JetztTermin } from "@/lib/heute/jetztTopics";
import { anlassOf } from "@/lib/kalender/anlass";
import type { HomeTileId } from "@/lib/core/homeLayout";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { shopGroups } from "@/lib/einkauf/shopGroups";
import { DEMO_SHOPS } from "@/lib/core/demo";
import { jetztTip, type TipView } from "@/lib/tipps/model";
import { tipWhen } from "@/components/tipps/TipBits";
import { tipTags } from "@/lib/tipps/categories";
import { useEffect } from "react";
import { newsForCard } from "@/lib/konten/wer";
import { markFamilyNewsShown, useFamilyNews } from "@/lib/konten/neuigkeiten";
import { useMails } from "@/lib/mails/konto";
import { mailThema } from "@/lib/mails/vorschlag";

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
  /** Spruch des Tages (Mia denkt mit) */
  spruch?: string | null;
  /** Tipps aus der Region (nur wenn an), mit Kindern im Haushalt, am Wochenende schon weggewischt */
  regionTips: TipView[] | null;
  potInvite?: { title: string; detail: string } | null;
  routinen?: JetztInput["routinen"];
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
  /** Kurz-Check „Im Haus“ (Woche, schon nach den Regeln von „Mia denkt mit“) – sonst null */
  kuehlCheck?: string | null;
  /** Beispiel-Einkauf statt der echten Liste */
  demoShop: boolean;
  /** Sichtbare Kacheln */
  tiles: HomeTileId[];
  /** Abends (Tafel 98): Feierabend-Phase, Haushalt allein, Weg der Kinder, Gericht von morgen mit Vorlauf */
  evening?: boolean;
  solo?: boolean;
  kidsWay?: JetztInput["kidsWay"];
  tomorrowDish?: JetztInput["tomorrowDish"];
};

const termin = (i: DayItem): JetztTermin => {
  const data = i.entry.typ === "termin" ? (i.entry.data as { place?: string; note?: string }) : {};
  const place = data.place?.trim() || undefined;
  const sport = guessSport(i.title);
  const anlass = anlassOf(i.title, i.label);
  return { key: i.key, title: i.title, time: i.time ?? "", date: i.date, work: i.room === "arbeit", place, note: data.note?.trim() || undefined, outdoor: isOutdoor(i.title, place, sport ? sportById(sport).outdoor : false), ...(anlass ? { anlass } : {}) };
};

export function useJetztTopics(src: JetztSource) {
  const state = useJetzt();
  const { forecast } = useForecast();
  const newsState = useFamilyNews();
  const news = newsState && !src.demo ? newsForCard(newsState, src.nowMs, src.today) : null;
  const shopping = useWeekShoppingList("planning");
  const mails = useMails().items ?? [];
  const mailTitle = src.demo ? null : mailThema(mails);
  const openItems = (shopping?.list.items ?? []).filter((i) => !i.checked && !i.hidden);
  const topShop = src.demoShop ? DEMO_SHOPS[0] : shopGroups(openItems, 1).find((g) => g.shop) ?? null;
  const tomorrowIso = addDays(src.today, 1);
  const timed = src.upcoming.filter((i) => i.time).map(termin);
  // Neueste ungelesene Nachricht bzw. ungehörte Sprachnachricht (nur „Sprachnachricht · 0:12“, nie ein Inhalt)
  const unread = [
    ...(src.pins ? activePins(src.pins, src.nowMs).filter((m) => m.data.author !== src.me && !m.data.readBy.includes(src.me)) : []).map((m) => ({ id: m.id, erstellt: m.erstellt, data: { author: m.data.author, text: m.data.text } })),
    ...(src.memos ? activeMemos(src.memos, src.nowMs).filter((m) => memoUnheard(m, src.me)) : []).map((m) => ({ id: m.id, erstellt: m.erstellt, data: { author: m.data.author, text: `Sprachnachricht · ${formatDauer(m.data.dauer)}` } })),
  ].sort((a, b) => b.erstellt.localeCompare(a.erstellt))[0];
  const birthday = (list: DayItem[], when: "heute" | "morgen") => list.filter((i) => /geburtstag/i.test(i.title) || /geburtstag/i.test(i.label ?? "")).map((i) => ({ title: i.title, date: i.date, when }));
  const jahrestag = src.todayAll.find((i) => i.date === src.today && anlassOf(i.title, i.label) === "jahrestag");
  const sportKind = src.training ? sportById(guessSport(src.training.title) ?? "") : null;
  // Wetter nur mit Planbezug: Regen zur Stunde eines Draußen-Termins bzw. -Trainings
  const outside = [...timed.filter((t) => t.outdoor), ...(src.training && sportKind?.outdoor ? [{ key: src.training.key, title: src.training.title, time: src.training.time }] : [])];
  const wet = forecast
    ? outside.find((t) => {
        const h = forecast.hours.find((x) => x.date === src.today && x.hour === Number(t.time.slice(0, 2)));
        return h ? isRainy(h) : false;
      })
    : undefined;
  // Wind nur ab „Stürmisch“ und nur mit Planbezug (Tafel 87)
  const storm = forecast && !wet ? stormForPlan(forecast.hours, src.today, Math.floor(src.minutes / 60), outside) : null;
  const todayDay = forecast?.days.find((d) => d.date === src.today);
  // Regen morgen früh (7–9 Uhr) – nur mit Plan zählt er (abendThema.ts)
  const tomorrowRain = Boolean(forecast?.hours.some((h) => h.date === tomorrowIso && h.hour >= 7 && h.hour <= 9 && isRainy(h)));
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
    planWeather: wet ? { key: wet.key, title: wet.title, time: wet.time, word: "Regen" } : storm ? { ...storm, word: "Wind" } : null,
    dish: src.dish,
    birthdays: [...birthday(src.todayAll.filter((i) => i.date === src.today), "heute"), ...birthday(src.tomorrow, "morgen")],
    jahrestagHeute: jahrestag ? { key: jahrestag.key, title: jahrestag.title } : null,
    sport: src.training && sportKind ? { ...src.training, pack: sportKind.pack } : null,
    shop: topShop?.shop ? { shop: topShop.shop, names: topShop.names } : null,
    timer: src.timer,
    cookingStep: src.cookingStep,
    reminder: src.reminder,
    pause: src.pause,
    dinnerFree: src.dinnerFree,
    leisure: src.leisure,
    tip: src.tip,
    spruch: src.spruch ?? null,
    potInvite: src.potInvite ?? null,
    mail: mailTitle ? { id: `${mails[0].id}:${mails.length}`, title: mailTitle, detail: mails[0].subject || mails[0].senderDomain || "Weitergeleitet" } : null,
    // Morgen-Info: Wetter nur mit Planbezug (Regen zur Zeit eines Draußen-Termins)
    routinen: src.demo || !src.routinen ? undefined : { ...src.routinen, morgen: src.routinen.morgen && wet ? { ...src.routinen.morgen, detail: `Ab ${Number(wet.time.slice(0, 2))} Uhr Regen. Regenjacke für ${wet.title}?` } : src.routinen.morgen },
    family: news ? { id: news.id, title: news.title, detail: news.detail, href: news.href } : null,
    region: region ? { id: region.id, title: `Tipp: ${region.titel}`, detail: [tipWhen(region), region.ort_name, tipTags(region, 1)[0]].filter(Boolean).join(" · ") } : null,
    kids: src.kids,
    weekCheck: src.weekCheck && state.weekOff !== src.weekCheck ? src.weekCheck : null,
    kuehlCheck: src.kuehlCheck ?? null,
    demo: src.demo,
    tiles: src.tiles,
    evening: src.evening,
    solo: src.solo,
    kidsWay: src.kidsWay ?? null,
    tomorrowRain,
    tomorrowDish: src.demo ? null : (src.tomorrowDish ?? null),
    weights: state.weights,
    hidden: hiddenToday(state, src.today),
  };
  const topics = jetztTopics(input);
  // Neuigkeit gezeigt → merken (kommt nie wieder, heute keine andere)
  const shownNews = news && topics.some((t) => t.id === `familie:${news.id}`) ? news.id : null;
  useEffect(() => {
    if (shownNews) markFamilyNewsShown(shownNews, src.today);
  }, [shownNews, src.today]);
  return { on: state.on, topics, shop: input.shop };
}
