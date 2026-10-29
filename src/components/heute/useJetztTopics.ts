"use client";

// Daten für die Jetzt-Karte zusammensuchen (Termine mit Notiz und Ort, Regen
// heute, Essen mit dem, was auf die Liste könnte, Geburtstage aus dem
// Kalender, Timer, freitags das Wochenende …) und in die reine Rangliste
// (`jetztTopics`, A-054) geben. Im Beispiel-Tag kommt das Beispiel-Thema
// hinein.

import { useForecast } from "@/lib/wetter/client";
import { isRainy } from "@/lib/wetter/forecast";
import { stormForPlan } from "@/lib/wetter/wind";
import { guessSport, sportById } from "@/lib/sport/model";
import { addDays } from "@/lib/core/now";
import { tomorrowLabel, type DayItem } from "@/lib/kalender/model";
import { hiddenToday, useJetzt } from "@/lib/heute/jetztStore";
import { isOutdoor, jetztTopics, type JetztInput, type JetztTermin } from "@/lib/heute/jetztTopics";
import { wetterGrob, wochenendeZeit, type WochenendDaten } from "@/lib/heute/wochenende";
import { anlassOf } from "@/lib/kalender/anlass";
import type { HomeTileId } from "@/lib/core/homeLayout";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { shopGroups } from "@/lib/einkauf/shopGroups";
import { gleicheSache } from "@/lib/einkauf/zusammen/zusammen";
import { DEMO_SHOPS } from "@/lib/core/demo";
import { jetztTip, type TipView } from "@/lib/tipps/model";
import { tipWhen } from "@/components/tipps/TipBits";
import { tipTags } from "@/lib/tipps/categories";
import { useEffect } from "react";
import { newsForCard } from "@/lib/konten/wer";
import { markFamilyNewsShown, useFamilyNews } from "@/lib/konten/neuigkeiten";
import { useMails } from "@/lib/mails/konto";
import { useFeature } from "@/lib/core/features";
import { now } from "@/lib/core/now";
import { durchatmenAngebot } from "@/lib/durchatmen/angebot";
import { angebotGezeigt, useDurchatmen } from "@/lib/durchatmen/store";
import { kreisText, vorschlag } from "@/lib/durchatmen/vorschlag";
import { mailThema } from "@/lib/mails/vorschlag";

export type JetztSource = {
  today: string;
  minutes: number;
  /** Feierabend mit Ruhe oder Wochenende: nichts zu Arbeit */
  calm: boolean;
  upcoming: DayItem[];
  tomorrow: DayItem[];
  dish: JetztInput["dish"];
  /** „Im Haus“ wird gepflegt – nur dann bietet die Karte Zutaten für die Liste an */
  vorratDa: boolean;
  /** Termine/Aufgaben heute (für Geburtstage und Jahrestag) */
  todayAll: DayItem[];
  /** Freitag: Einträge am Samstag und Sonntag und ob dort schon ein Gericht steht */
  weekend: { items: DayItem[]; essen: { sa: boolean; so: boolean } } | null;
  /** Selbst eingeschaltete Bausteine */
  leisure: JetztInput["leisure"];
  tip: string | null;
  /** Tipps aus der Region (nur wenn an), mit Kindern im Haushalt, am Wochenende schon weggewischt */
  regionTips: TipView[] | null;
  regionHidden: string | null;
  potInvite?: { title: string; detail: string } | null;
  /** Training heute (für Gleich, Packliste und Wetter) */
  training: { key: string; title: string; time: string } | null;
  /** Für „Neu vom Haushalt“ (6 Std. frisch) */
  nowMs: number;
  timer: JetztInput["timer"];
  cookingStep: string | null;
  reminder: JetztInput["reminder"];
  pause: string | null;
  demo: boolean;
  /** Beispiel-Tag: Thema des Tages je Haushalt */
  demoThema?: JetztInput["demoThema"];
  kids: boolean;
  /** Beispiel-Einkauf statt der echten Liste (für „Dein Tag“) */
  demoShop: boolean;
  /** Sichtbare Kacheln */
  tiles: HomeTileId[];
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
  const birthday = (list: DayItem[], when: "heute" | "morgen") => list.filter((i) => anlassOf(i.title, i.label) === "geburtstag").map((i) => ({ title: i.title, date: i.date, when }));
  const jahrestag = src.todayAll.find((i) => i.date === src.today && anlassOf(i.title, i.label) === "jahrestag");
  const sportKind = src.training ? sportById(guessSport(src.training.title) ?? "") : null;
  // Regen heute (Stunden) – ob er etwas ändert, entscheidet die Rangliste (nur mit Plan)
  const rainHours = forecast ? forecast.hours.filter((h) => h.date === src.today && isRainy(h)).map((h) => h.hour) : [];
  // Wind nur ab „Stürmisch“ und nur mit Draußen-Plan (Tafel 87)
  const outside = [...timed.filter((t) => t.outdoor), ...(src.training && sportKind?.outdoor ? [{ key: src.training.key, title: src.training.title, time: src.training.time }] : [])];
  const storm = forecast ? stormForPlan(forecast.hours, src.today, Math.floor(src.minutes / 60), outside) : null;
  const todayDay = forecast?.days.find((d) => d.date === src.today);
  // Regen morgen früh (7–9 Uhr) – nur mit Plan zählt er
  const tomorrowRain = Boolean(forecast?.hours.some((h) => h.date === tomorrowIso && h.hour >= 7 && h.hour <= 9 && isRainy(h)));
  const region = src.regionTips ? jetztTip(src.regionTips, { today: src.today, minutes: src.minutes, rainy: todayDay ? todayDay.wet > 0 : null, kids: src.kids, hiddenWeekend: src.regionHidden }) : null;
  // Durchatmen (A-051): leises Angebot, höchstens 2× am Tag, nie nachts, abschaltbar
  const atemAn = useFeature("durchatmen");
  const atem = useDurchatmen();
  const minuten = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const atemAnlass =
    atemAn && atem && !src.demo
      ? durchatmenAngebot({
          heute: src.today,
          minuten: src.minutes,
          an: atem.angebot,
          gezeigt: atem.angebote,
          termine: src.todayAll.filter((i) => i.entry.typ === "termin" && i.time && i.date === src.today).map((i) => ({ start: minuten(i.time!), ende: i.end ? minuten(i.end) : null })),
        })
      : null;
  // Essen mit Folge: was fürs Gericht nicht im Haus ist und noch nicht auf der Liste steht
  const liste = src.dish && src.vorratDa && !src.dish.ready ? src.dish.missing.filter((m) => !openItems.some((i) => gleicheSache(i.name, m))) : [];
  // Freitag: Wochenende aus den eigenen Daten (Wetter, Essen, Einkauf, Termine)
  const sa = addDays(src.today, 1);
  const so = addDays(src.today, 2);
  const wochenende: WochenendDaten | null =
    src.weekend && !src.demo && wochenendeZeit(src.today, src.minutes)
      ? {
          tage: [
            { date: sa, kurz: "Sa", wetter: wetterGrob(forecast?.days.find((d) => d.date === sa)), essen: src.weekend.essen.sa },
            { date: so, kurz: "So", wetter: wetterGrob(forecast?.days.find((d) => d.date === so)), essen: src.weekend.essen.so },
          ],
          termine: src.weekend.items.filter((i) => i.entry.typ === "termin" && i.time && !i.done).map((i) => ({ key: i.key, date: i.date, time: i.time!, title: i.title })),
          einkauf: openItems.length,
          einkaufGeplant: src.weekend.items.some((i) => i.date === sa && /einkauf/i.test(i.title)),
          solo: src.solo,
        }
      : null;
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
    rainHours,
    storm: storm ? { key: storm.key, head: storm.head, detail: storm.detail } : null,
    tomorrowRain,
    dish: src.dish ? { ...src.dish, liste } : null,
    tomorrowDish: src.demo ? null : (src.tomorrowDish ?? null),
    birthdays: [...birthday(src.todayAll.filter((i) => i.date === src.today), "heute"), ...birthday(src.tomorrow, "morgen")],
    jahrestagHeute: jahrestag ? { key: jahrestag.key, title: jahrestag.title } : null,
    sport: src.training && sportKind ? { ...src.training, pack: sportKind.pack } : null,
    timer: src.timer,
    cookingStep: src.cookingStep,
    reminder: src.reminder,
    pause: src.pause,
    family: news ? { id: news.id, title: news.title, detail: news.detail, href: news.href } : null,
    wochenende,
    leisure: src.leisure,
    tip: src.tip,
    region: region ? { id: region.id, title: `Tipp: ${region.titel}`, detail: [tipWhen(region), region.ort_name, tipTags(region, 1)[0]].filter(Boolean).join(" · ") } : null,
    mail: mailTitle ? { id: `${mails[0].id}:${mails.length}`, title: mailTitle, detail: mails[0].subject || mails[0].senderDomain || "Weitergeleitet" } : null,
    potInvite: src.potInvite ?? null,
    demo: src.demo,
    demoThema: src.demoThema ?? null,
    tiles: src.tiles,
    solo: src.solo,
    kidsWay: src.kidsWay ?? null,
    durchatmen: atemAnlass ? { anlass: atemAnlass, detail: kreisText(vorschlag(now(), atem?.lieblinge ?? [])).join(" · ") } : null,
    hidden: hiddenToday(state, src.today),
  };
  const topics = jetztTopics(input);
  // Neuigkeit gezeigt → merken (kommt nie wieder, heute keine andere)
  const shownNews = news && topics.some((t) => t.id === `familie:${news.id}`) ? news.id : null;
  useEffect(() => {
    if (shownNews) markFamilyNewsShown(shownNews, src.today);
  }, [shownNews, src.today]);
  // Angebot stand in der Karte → Anlass für heute merken (höchstens 2 am Tag)
  const atemGezeigt = atemAnlass && topics.some((t) => t.kind === "durchatmen") ? atemAnlass : null;
  useEffect(() => {
    if (atemGezeigt) angebotGezeigt(atemGezeigt, src.today);
  }, [atemGezeigt, src.today]);
  return { on: state.on, topics, shop: topShop?.shop ? { shop: topShop.shop, names: topShop.names } : null };
}
