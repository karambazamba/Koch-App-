"use client";

// Mia denkt mit auf der Startseite: sammelt Muster, Mitdenken und Vorstellen
// (Logik rein in lib/mia/denktmit), wählt die EINE Karte des Tages und führt
// die Knöpfe aus. Kleines erledigt sie sofort mit kurzer Bestätigung (Serie,
// Gericht, Pinnwand, Aufgabe). Der Kurz-Check „Im Haus“ (Sonntag ab 17 Uhr)
// ist eine dieser Karten („Los geht’s“ / „Heute nicht“). Keinen Spruch mehr
// in der Jetzt-Karte (A-054: dort nur, was man heute braucht).

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { KartenKnopf } from "@/components/begleitung/denktmit/MiaKarte";
import type { HomeData } from "@/components/heute/useHomeData";
import { takeDish } from "@/components/heute/takeDish";
import { dishOf } from "@/components/essen/useMeals";
import { appSince } from "@/lib/core/activity";
import { createEntry } from "@/lib/core/entries";
import { feiertage } from "@/lib/core/feiertage";
import { addDays } from "@/lib/core/now";
import { byName, sortBy } from "@/lib/core/sort";
import { showToast } from "@/lib/core/toast";
import { useCookedDays } from "@/lib/essen/mealDone";
import { changeEntries } from "@/lib/kalender/store";
import { weekdayIndex, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { changePins, createPin } from "@/lib/pinnwand";
import { useForecast } from "@/lib/wetter/client";
import { hoursToday, isRainy } from "@/lib/wetter/forecast";
import { haushaltOf } from "@/lib/core/haushalt";
import { heutigeKarte, type DenktKarte, type Umfeld } from "@/lib/mia/denktmit/auswahl";
import { mitdenkTipps } from "@/lib/mia/denktmit/mitdenken";
import { findeEssenMuster, findeMuster, ritualTag, serieAus } from "@/lib/mia/denktmit/muster";
import { antworten, hinweisGezaehlt, ritualEingeplant, ritualMerken, useDenkt, vorstellungFertig } from "@/lib/mia/denktmit/store";
import { naechsteVorstellung } from "@/lib/mia/denktmit/vorstellen";
import type { HomeTileId } from "@/lib/core/homeLayout";
import { useFeature } from "@/lib/core/features";
import { usePantry } from "@/lib/vorrat/pantry";
import { KUEHLCHECK_DETAIL, KUEHLCHECK_HREF, KUEHLCHECK_TITEL, kuehlCheckErledigt, kuehlCheckFaellig, useKuehlCheck } from "@/lib/vorrat/kuehlcheck";

type Input = {
  data: HomeData;
  entries: CalendarEntry[];
  items: DayItem[];
  minutes: number;
  visible: HomeTileId[];
  demo: boolean;
  pause: boolean;
  ruhe: boolean;
  /** Ein anderer Hinweis steht schon unter der Jetzt-Karte */
  besetzt: boolean;
  me: string;
  onOpenFood: () => void;
};

type DenktAnzeige = { satz: string; label: string; knoepfe: KartenKnopf[] };
/** Mia stellt eine Kachel vor: Tipp direkt unter der Kachel (Tafel 101) */
export type VorstellAnzeige = { tile: HomeTileId; text: string; ok: () => void; zeigMal?: () => void };

type DenktErgebnis = {
  karte: DenktAnzeige | null;
  vorstellung: VorstellAnzeige | null;
  glow: HomeTileId | null;
};

export function useMiaDenkt(o: Input): DenktErgebnis {
  const router = useRouter();
  const s = useDenkt();
  const cooked = useCookedDays();
  const { forecast } = useForecast();
  const today = o.data.todayIso;
  const profile = o.data.profile;
  const hour = Math.floor(o.minutes / 60);
  const umfeld: Umfeld = { today, hour, pause: o.pause, ruhe: o.ruhe, demo: o.demo };
  const vorratOn = useFeature("vorrat");
  const pantry = usePantry();
  const kuehlErledigt = useKuehlCheck();
  const kuehlWoche = kuehlErledigt === undefined || !pantry ? null : kuehlCheckFaellig({ today, minutes: o.minutes, vorratOn: vorratOn === true, sachen: pantry.length, erledigt: kuehlErledigt });

  const kandidaten = useMemo((): DenktKarte[] => {
    if (!s) return [];
    const out: DenktKarte[] = [];
    if (kuehlWoche) out.push({ art: "kuehlcheck", key: `kuehlcheck:${kuehlWoche}`, satz: `${KUEHLCHECK_TITEL} ${KUEHLCHECK_DETAIL}`, woche: kuehlWoche });
    const m = findeMuster(o.entries, today, s.antworten);
    if (m) out.push({ art: "muster", key: m.key, satz: m.satz, muster: m });
    const e = cooked ? findeEssenMuster(cooked, today, s.antworten, s.rituale, haushaltOf(profile.householdType) === "allein") : null;
    if (e) out.push({ art: "essen", key: e.key, satz: e.satz, muster: e });
    const rain = forecast ? hoursToday(forecast, today).find((h) => isRainy(h) && h.hour > hour) : undefined;
    const termine = o.items.filter((i) => i.entry.typ === "termin" && i.time && !i.done).map((i) => ({ title: i.title, time: i.time! }));
    const quick = sortBy(Object.values(o.data.recipes).filter((r) => r.prepMinutes !== null && r.prepMinutes <= 20), byName((r) => r.title))[0];
    const tipps = mitdenkTipps(
      {
        today,
        minutes: o.minutes,
        weekday: weekdayIndex(today),
        feiertag: Boolean(feiertage(Number(today.slice(0, 4)))[today]),
        regenAb: rain ? `${String(rain.hour).padStart(2, "0")}:00` : null,
        aufgaben: o.items.filter((i) => i.entry.typ === "aufgabe" && !i.done).map((i) => i.title),
        termine,
        kinder: profile.persons.filter((p) => p.role === "kind" && p.name.trim()).map((p) => p.name.trim()),
        partner: profile.persons.find((p, i) => i > 0 && p.role === "erwachsen" && p.name.trim())?.name.trim() ?? null,
        gericht: Boolean(dishOf(o.data.day)),
        schnell: quick ? { title: quick.title, recipeId: quick.id } : null,
      },
      s.antworten,
    );
    for (const t of tipps) out.push({ art: "mitdenken", key: t.key, satz: t.satz, tipp: t });
    const v = naechsteVorstellung(s, o.visible, { today, since: appSince() });
    if (v) out.push({ art: "vorstellen", key: `vorstellen:${v.tile}`, satz: v.text, v });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Stunde reicht als Takt
  }, [s, kuehlWoche, cooked, forecast, o.entries, o.items, o.visible, today, hour, o.data.recipes, o.data.day, profile]);

  const karte = s && !o.besetzt ? heutigeKarte(kandidaten, s, umfeld) : null;
  useEffect(() => {
    if (karte) hinweisGezaehlt(karte.key, today);
  }, [karte?.key, today]); // eslint-disable-line react-hooks/exhaustive-deps

  // Essens-Rituale still einplanen (heute oder morgen, wenn dort noch nichts steht; je Tag nur einmal)
  useEffect(() => {
    if (!s || o.demo || !s.rituale.length) return;
    const tomorrow = addDays(today, 1);
    for (const r of s.rituale) {
      const date = ritualTag(r, today, s.eingeplant, (d) => (d === today ? Boolean(dishOf(o.data.day)) : d === tomorrow ? Boolean(dishOf(o.data.tomorrow)) : true));
      if (!date) continue;
      ritualEingeplant(date);
      takeDish(o.data, { title: r.title, recipeId: r.recipeId, category: null }, date);
    }
  }, [s, today, o.demo, o.data]);


  const done = (text: string) => showToast({ text, seconds: 3, small: true });
  const knoepfe = (k: DenktKarte): KartenKnopf[] => {
    switch (k.art) {
      case "muster":
        return [
          {
            label: `Ja, jeden ${["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"][k.muster.weekday]}`,
            onClick: () => {
              changeEntries((list, stamp) => [...list, { ...serieAus(k.muster, today), erstellt: stamp, geaendert: stamp }]);
              antworten(k.key, "ja", k.satz, today);
              done("Steht drin.");
            },
          },
          { label: "Nein", onClick: () => antworten(k.key, "nein", k.satz, today) },
        ];
      case "essen":
        return [
          {
            label: "Ja, fest einplanen",
            onClick: () => {
              ritualMerken({ weekday: k.muster.weekday, title: k.muster.title, recipeId: k.muster.recipeId });
              antworten(k.key, "ja", k.satz, today);
              done("Plan ich ein.");
            },
          },
          { label: "Nein", onClick: () => antworten(k.key, "nein", k.satz, today) },
        ];
      case "mitdenken":
        return k.tipp.knoepfe.map((b) => ({
          label: b.label,
          onClick: () => {
            antworten(k.key, b.aktion === "anderes" ? "nein" : "ja", k.satz, today);
            if (b.aktion === "wer-bringt" && b.wert) {
              const pin = createPin(`${b.wert} bringt heute.`, o.me);
              if (pin) changePins((list) => [pin, ...list]);
              done("Steht an der Pinnwand.");
            }
            if (b.aktion === "ich-bringe" && b.wert) {
              changeEntries((list) => [...list, createEntry("aufgabe", { title: `${b.wert} bringen`, date: today, reminder: "aus" }) as CalendarEntry]);
              done("Steht drin.");
            }
            if (b.aktion === "nehmen") {
              const r = Object.values(o.data.recipes).find((x) => x.title === b.wert);
              takeDish(o.data, { title: b.wert ?? "", recipeId: r?.id, category: r?.category ?? null }, today);
            }
            if (b.aktion === "anderes") o.onOpenFood();
          },
        }));
      case "kuehlcheck":
        return [
          { label: "Los geht’s", onClick: () => router.push(KUEHLCHECK_HREF) },
          { label: "Heute nicht", onClick: () => kuehlCheckErledigt(k.woche) },
        ];
      case "vorstellen":
        return [];
    }
  };

  // Vorstellen: „Alles klar“ = nie wieder für diese Kachel, „Zeig mal“ öffnet ihre Seite
  const vorstellen = karte?.art === "vorstellen" ? karte.v : null;
  const vorstellung: VorstellAnzeige | null = vorstellen && {
    tile: vorstellen.tile as HomeTileId,
    text: vorstellen.text,
    ok: () => vorstellungFertig(vorstellen.tile),
    // Ohne eigene Seite (Timer) gibt es nichts zu zeigen – die Kachel steht ja direkt darüber
    zeigMal: vorstellen.href
      ? () => {
          vorstellungFertig(vorstellen.tile);
          if (vorstellen.href.startsWith("/?seite=essen")) o.onOpenFood();
          else router.push(vorstellen.href);
        }
      : undefined,
  };

  return {
    karte: karte && karte.art !== "vorstellen" ? { satz: karte.satz, label: "Mitgedacht", knoepfe: knoepfe(karte) } : null,
    vorstellung,
    glow: vorstellung?.tile ?? null,
  };
}
