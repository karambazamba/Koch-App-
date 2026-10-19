"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";
import { LotteAvatar } from "@/components/LotteAvatar";
import { useHealthTip, useWeekPraise } from "@/components/assistant/useHealthTip";
import { Sheet } from "@/components/plan/Sheet";
import { CARD_LIST, chipClass } from "@/components/ui/styles";
import { isQuiet, markAsked, useActivity, wasAsked } from "@/lib/core/activity";
import { useAssistantStatus } from "@/lib/lotte/client";
import { openHelper } from "@/lib/lotte/open";
import { declineTip, markTipShown, tryTip, undoTip } from "@/lib/essen/healthTips";
import { composeWeek, useMealPlans, type PlanDay, type StoredEntry } from "@/lib/essen/mealPlan";
import { isPaused, noteAnswered, noteDismissed, noteShown, useNudges, type NudgeKind } from "@/lib/core/nudges";
import { sameIngredient, updatePantryItem, usePantry, type PantryItem } from "@/lib/essen/pantry";
import { hasKids, isSmallHousehold, isSolo, mealClockFor, pausedOn, saveProfile } from "@/lib/einstellungen/profile";
import { DOWN_REASONS, rateDown, rateUp, useRatings, type Rating, type RatingCandidate } from "@/lib/essen/ratings";
import { addManualItem, removeManualItems, sectionFor, setHave, toggleChecked, type ListItem } from "@/lib/einkauf/shoppingList";
import { perishables } from "@/lib/essen/spontan";
import { finishTipsToday, tipDeck, useTipCardState } from "@/lib/essen/tips";
import { markTwistShown, markTwistTaken, twistAllowed, twistFor, unmarkTwistTaken, useTwists } from "@/lib/essen/twists";
import { dishStatus } from "@/lib/essen/dishStatus";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { useWeekendForecast } from "@/lib/core/weather";
import { plansOften, plansRarely } from "@/lib/essen/planDetect";
import { addDays, nextWeekStartFor, planningWeekStart, toIsoDate, useWeekPlan, weekStartFor } from "@/lib/essen/weekPlan";
import { WelcomeBack } from "./HomeSections";
import { TipCard } from "./TipCard";
import { useMinutes, useRatingCandidate } from "./useRatingCandidate";
import { answerLeftovers, leftoverProne, useCookedDays, type CookedDay, type LeftoverAnswer } from "@/lib/essen/mealDone";
import type { HomeData } from "./useHomeData";

type Chip = { label: string; href?: string; onClick?: () => void; quiet?: boolean };
/** `maxChips`: sonst höchstens 2; `onSwipe`: seitlich wegwischen */
type Note = { kind: NudgeKind; text: string; chips: Chip[]; onOpen?: () => void; maxChips?: number; onSwipe?: () => void };

const WEEKDAY = new Intl.DateTimeFormat("de-DE", { weekday: "long" });
const MONTH = new Intl.DateTimeFormat("de-DE", { month: "long" });

function names(list: string[]): string {
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} und ${list[1]}`;
  if (list.length === 3) return `${list[0]}, ${list[1]} und ${list[2]}`;
  return `${list[0]}, ${list[1]} und ${list.length - 2} weitere Sachen`;
}

const clockOf = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const minutesOf = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};

/** Getrocknete Hülsenfrüchte brauchen eine Nacht im Wasser */
const SOAK = /(getrocknet|trocken)\w*\s+(kichererbsen|bohnen|erbsen)|(kichererbsen|bohnen|erbsen)\s*\(getrocknet\)/i;

/**
 * Lottes Platz unter der Heute-Karte: immer höchstens EINE Sache – oder
 * Stille. Die erste zutreffende Stufe gewinnt:
 * 1. Zeitkritisch heute/morgen (Startzeit, Auftauen, Einweichen, Einkauf für morgen)
 * 2. Vorrat (❄️ Tiefkühler) oder Reste verwandeln
 * 3. Planung (nächste Woche, Grill-Idee, Wochenende frei)
 * 4. Bewertung eines neuen Gerichts (abends bis zum nächsten Morgen)
 * 5. Tipp (Lob, Tipps, Twist, Gesundheit – mit Gesten)
 * 6. Nichts
 * Vorrang davor: Willkommen zurück, Pause, "leiser werden", freies Wochenende.
 * Jede Art, die 3× ignoriert wird, pausiert 2 Wochen (nudges.ts).
 */
export function useLottePlace(data: HomeData | null | undefined, opts: { welcome: boolean }): ReactNode | null {
  const nudges = useNudges();
  const status = useAssistantStatus(true);
  const current = useWeekShoppingList("current");
  const next = useWeekShoppingList("next");
  const target = data ? planningWeekStart(data.today, data.profile.shoppingDay || "Montag") : null;
  const targetPlan = useWeekPlan(target?.weekStart);
  // "Dranbleiben": nächste Woche schon ab 4 Tage vorher anbieten
  const nextStart = data ? nextWeekStartFor(data.today, data.profile.shoppingDay || "Montag") : undefined;
  const nextPlan = useWeekPlan(nextStart);
  const mode = data?.profile.helperMode ?? "normal";
  const health = useHealthTip();
  const activity = useActivity();
  const mealPlans = useMealPlans();
  const rated = useRatings();
  const cooked = useCookedDays();
  const pantry = usePantry();
  const minutes = useMinutes();
  const rating = useRatingCandidate();
  const tipState = useTipCardState();
  const twists = useTwists();
  const router = useRouter();
  const todayIso = data?.todayIso ?? "";
  const isFriday = data ? WEEKDAY.format(data.today) === "Freitag" : false;
  const forecast = useWeekendForecast(
    data?.profile.weather,
    data && isFriday && !pausedOn(data.profile, todayIso) ? todayIso : null,
    todayIso ? addDays(todayIso, 1) : "",
    todayIso ? addDays(todayIso, 2) : "",
  );
  const praise = useWeekPraise();
  const [done, setDone] = useState<{ text: string; undo?: () => void } | null>(null);
  const [tomorrowOpen, setTomorrowOpen] = useState(false);
  // Bewertungsfrage festhalten, damit nach der Antwort kurz "Freut mich!" stehen bleibt
  const [keptRating, setKeptRating] = useState<RatingCandidate | null>(null);
  if (rating && rating.date !== keptRating?.date) setKeptRating(rating);

  const ready = Boolean(
    data && target && nudges && current && next && targetPlan !== undefined && activity && mealPlans && rated && cooked && pantry && minutes !== undefined && tipState && twists,
  );
  const allowed = (kind: NudgeKind) => Boolean(nudges && !isPaused(nudges, kind, todayIso));
  const once = (key: string, label: string, onClick?: () => void): Chip => ({
    label,
    onClick: () => {
      markAsked(key);
      onClick?.();
    },
  });

  // --- Stufe 1–3: Hinweise ------------------------------------------------------
  const note = ((): Note | null => {
    if (!ready || !data || !target || !activity || !pantry || minutes === undefined || !mealPlans || !rated) return null;
    const { profile, day, tomorrow } = data;
    // Spontan: nie Planungs-Hinweise, keine Lücken-Texte
    const spontan = data.planStyle === "spontan";

    // Pause: nur kurz vor dem Ende höchstens eine Nachricht
    if (pausedOn(profile, todayIso)) {
      const until = profile.pause?.until;
      const key = `pause-ende:${until}`;
      if (until && addDays(until, -2) <= todayIso && !wasAsked(activity, key)) {
        const back = WEEKDAY.format(new Date(`${addDays(until, 1)}T12:00:00`));
        return {
          kind: "pause",
          text: `Ihr seid bald wieder da – soll ich für ${back} schon was vorbereiten?`,
          chips: [
            once(key, "Ja, gern", () => (status?.ready ? openHelper(undefined, `Bereite bitte schon was für ${back} vor.`) : router.push(spontan ? "/ideen" : "/wochenplan"))),
            once(key, "Nein danke"),
          ],
        };
      }
      return null;
    }
    // Leiser werden: 3 Tage unbeachtet → Stille, bis wieder jemand selbst etwas tut
    if (isQuiet(activity, todayIso)) return null;
    // Freies Wochenende: nichts – nur auf Nachfrage
    if (day?.weekend === "frei") return null;

    // 1. Zeitkritisch
    const entry = day && !day.away ? day.slot.entry : null;
    const recipe = entry?.recipeId ? data.recipes[entry.recipeId] : undefined;
    // Startzeit: lange Gerichte rechtzeitig anfangen (nicht am lockeren Wochenende – ohne Uhrzeit)
    if (recipe?.prepMinutes && recipe.prepMinutes >= 45 && day && !day.weekend && allowed("startzeit")) {
      const meal = minutesOf(mealClockFor(profile, day.weekday));
      const start = meal - recipe.prepMinutes;
      if (minutes >= start - 180 && minutes < start) {
        return {
          kind: "startzeit",
          text: `${recipe.title} braucht etwa ${recipe.prepMinutes} Minuten – wenn du um ${clockOf(start)} anfängst, ist um ${clockOf(meal)} alles fertig.`,
          chips: [{ label: "Rezept ansehen", href: `/kochbuch/rezept?id=${encodeURIComponent(recipe.id)}` }, { label: "Danke" }],
        };
      }
    }
    // Für morgen (lockeres/freies Wochenende: keine Erinnerungen)
    const tEntry = tomorrow && !tomorrow.away && !tomorrow.weekend ? tomorrow.slot.entry : null;
    const tRecipe = tEntry?.recipeId ? data.recipes[tEntry.recipeId] : undefined;
    const tasks = tomorrowTasks(tomorrow, tRecipe?.ingredients.map((i) => i.name) ?? [], pantry, current?.list.items ?? [], next?.list.items ?? [], [current, next]);
    const openTomorrow = () => setTomorrowOpen(true);
    if (tEntry && tasks.thaw && minutes >= 12 * 60 && allowed("auftauen")) {
      const item = tasks.thaw;
      const move = () => {
        updatePantryItem(item.id, { place: "kuehlschrank" });
        setDone({ text: `Alles klar ✓ ${item.name} liegt im Vorrat jetzt im Kühlschrank.`, undo: () => updatePantryItem(item.id, { place: "tiefkuehler" }) });
      };
      return {
        kind: "auftauen",
        text: `❄️ Für ${tEntry.title} morgen: ${item.name} heute Abend aus dem Tiefkühler in den Kühlschrank – dann ist es rechtzeitig aufgetaut.`,
        chips: [{ label: "Mach ich", onClick: move }, { label: "Schon erledigt", onClick: move }],
        onOpen: openTomorrow,
      };
    }
    const soakKey = `einweichen:${tomorrow?.date}`;
    if (tEntry && tasks.soak && minutes >= 12 * 60 && !wasAsked(activity, soakKey) && allowed("einweichen")) {
      return {
        kind: "einweichen",
        text: `Die ${tasks.soak.replace(SOAK, (m) => m.replace(/(getrocknet|trocken)\w*\s*|\s*\(getrocknet\)/i, ""))} für morgen heute Abend in Wasser einweichen? Über Nacht werden sie schön weich.`,
        chips: [once(soakKey, "Mach ich"), once(soakKey, "Nehmen Dose")],
        onOpen: openTomorrow,
      };
    }
    if (tEntry && tasks.shopping && tasks.shopping.items.length > 0 && allowed("einkauf-morgen")) {
      const { items, weekStart } = tasks.shopping;
      return {
        kind: "einkauf-morgen",
        text: `Für morgen hab ich ${names(items.map((i) => i.name))} schon auf die Liste gesetzt.`,
        chips: [
          { label: "Zur Liste", href: "/einkaufsliste" },
          {
            label: "Haben wir schon",
            onClick: () => {
              items.forEach((i) => setHave(weekStart, i.key, true));
              setDone({ text: "Alles klar, hab's von der Liste genommen." });
            },
          },
        ],
        onOpen: openTomorrow,
      };
    }

    // Modus "Ganz locker": nur Zeitkritisches
    if (mode === "locker") return null;

    // 2. Vorrat. Zuerst nach dem Essen einmal: "Ist was übrig geblieben?" (bis zum nächsten Morgen)
    const mealDate = minutes < 10 * 60 ? addDays(todayIso, -1) : todayIso;
    const meal = cooked?.[mealDate];
    // Erst die Bewertung eines neuen Gerichts (und ihr "Freut mich!"), dann die Reste-Frage
    const ratingFirst = (rating && rating.date === mealDate) || keptRating?.date === mealDate;
    if (meal && !meal.leftovers && !ratingFirst && leftoverProne(meal.title) && !(mealDate === todayIso && day?.slot.entry?.double) && allowed("reste")) {
      const answer = (a: LeftoverAnswer, text: string) => () => {
        const undo = answerLeftovers(mealDate, a, todayIso);
        if (a !== "nein") setDone({ text, undo });
      };
      return {
        kind: "reste",
        // Kurz (eine Zeile, passt auch aufs kleine iPhone) – welches Gericht, ist klar
        text: mealDate === todayIso ? "Ist was übrig geblieben?" : "Ist von gestern was übrig?",
        chips: [
          { label: "Kühlschrank", onClick: answer("kuehlschrank", `Notiert ✓ ${meal.title} steht im Kühlschrank.`) },
          { label: "Eingefroren", onClick: answer("tiefkuehler", `Notiert ✓ ${meal.title} liegt im Tiefkühler.`) },
          { label: "Nein", onClick: answer("nein", "") },
        ],
        maxChips: 3,
        // Wegwischen = nichts übrig
        onSwipe: () => {
          noteAnswered("reste", todayIso);
          answerLeftovers(mealDate, "nein", todayIso);
        },
      };
    }

    // ❄️ lange im Tiefkühler, Reste verwandeln, vor der Pause aufbrauchen
    const oldFrozen = pantry
      .filter((p) => p.place === "tiefkuehler" && p.addedAt && p.addedAt <= addDays(todayIso, -60) && !wasAsked(activity, `tk:${p.id}`))
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt))[0];
    if (oldFrozen && allowed("vorrat")) {
      const since = MONTH.format(new Date(`${oldFrozen.addedAt}T12:00:00`));
      return {
        kind: "vorrat",
        text: spontan
          ? `❄️ Im Tiefkühler liegt seit ${since} noch ${oldFrozen.name} – soll ich dir was damit vorschlagen?`
          : `❄️ Im Tiefkühler liegt seit ${since} noch ${oldFrozen.name} – soll ich's diese Woche einplanen?`,
        chips: [
          once(`tk:${oldFrozen.id}`, "Ja, gern", () =>
            spontan
              ? openHelper("spontan")
              : status?.ready
                ? openHelper(undefined, `Plan bitte ${oldFrozen.name} aus dem Tiefkühler diese Woche ein.`)
                : router.push("/wochenplan"),
          ),
          { label: "Nicht jetzt", onClick: () => noteDismissed("vorrat", todayIso), quiet: true },
        ],
      };
    }
    const leftover = pantry
      .filter((p) => p.place === "kuehlschrank" && p.addedAt && p.addedAt <= addDays(todayIso, -2) && perishables([p]).length > 0 && !wasAsked(activity, `rest:${p.id}:${p.addedAt}`))
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt))[0];
    if (leftover && allowed("reste")) {
      const from = WEEKDAY.format(new Date(`${leftover.addedAt}T12:00:00`));
      const restKey = `rest:${leftover.id}:${leftover.addedAt}`;
      // Kleiner Haushalt: portionsweise Einfrieren gleich mit anbieten
      return isSmallHousehold(profile)
        ? {
            kind: "reste",
            text: `Seit ${from} im Kühlschrank: ${leftover.name} – was Schnelles draus machen oder portionsweise einfrieren?`,
            chips: [
              once(restKey, "Was draus machen", () => openHelper("spontan", undefined, ["reste"])),
              once(restKey, "Einfrieren", () => {
                updatePantryItem(leftover.id, { place: "tiefkuehler", addedAt: todayIso });
                setDone({ text: `Ab in den Tiefkühler ✓ ${leftover.name}`, undo: () => updatePantryItem(leftover.id, { place: "kuehlschrank", addedAt: leftover.addedAt }) });
              }),
            ],
          }
        : {
            kind: "reste",
            text: `Seit ${from} im Kühlschrank: ${leftover.name} – soll ich was Schnelles draus zaubern?`,
            chips: [
              once(restKey, "Ja, zeig mal", () => openHelper("spontan", undefined, ["reste"])),
              once(restKey, "Nein danke"),
            ],
          };
    }
    const pause = profile.pause;
    if (pause && todayIso < pause.from && pause.from <= addDays(todayIso, 3)) {
      const fresh = perishables(pantry);
      const key = `pause-start:${pause.from}`;
      if (fresh.length > 0 && !wasAsked(activity, key)) {
        return {
          kind: "pause",
          text: spontan
            ? `Im Kühlschrank ist noch ${names(fresh)} – soll ich dir bis zur Pause Ideen dafür zeigen?`
            : `Im Kühlschrank ist noch ${names(fresh)} – soll ich das in die letzten Tage einplanen?`,
          chips: [
            once(key, "Ja, gern", () =>
              status?.ready && !spontan ? openHelper(undefined, `Plan bitte ${names(fresh)} in die Tage bis zur Pause ein.`) : openHelper("spontan", undefined, ["reste"]),
            ),
            once(key, "Nein danke"),
          ],
        };
      }
    }

    // 3. Planung – je nach Kochstil. Erst die einmaligen Fragen (sanft erkennen)
    const shoppingDay = profile.shoppingDay || "Montag";
    if (profile.planStyle === "plan" && !wasAsked(activity, "frage-spontan") && plansRarely(mealPlans, shoppingDay, todayIso, activity.since) && allowed("wochenplanung")) {
      return {
        kind: "wochenplanung",
        text: `${isSolo(profile) ? "Du kochst" : "Ihr kocht"} eher spontan, oder? Soll ich die Planung ausblenden?`,
        chips: [
          once("frage-spontan", "Ja", () => {
            saveProfile({ ...profile, planStyle: "spontan", planWeek: null });
            setDone({ text: "Gemacht ✓ Die Planung ist ausgeblendet – gespeichert bleibt alles.", undo: () => saveProfile(profile) });
          }),
          once("frage-spontan", "Nein, passt so"),
        ],
      };
    }
    if (profile.planStyle === "spontan" && !wasAsked(activity, "frage-planen") && plansOften(activity.asked, todayIso) && allowed("wochenplanung")) {
      return {
        kind: "wochenplanung",
        text: `${isSolo(profile) ? "Du planst" : "Ihr plant"} ja öfter mal selbst – soll ich die Planung wieder einblenden?`,
        chips: [
          once("frage-planen", "Ja", () => {
            saveProfile({ ...profile, planStyle: "mix", planWeek: null });
            setDone({ text: "Gemacht ✓ Wochenplan ist wieder da – freie Tage sind ganz normal.", undo: () => saveProfile(profile) });
          }),
          once("frage-planen", "Nein, passt so"),
        ],
      };
    }
    if (data.planStyle === "plan" && target.isNext && !targetPlan && allowed("wochenplanung")) {
      return {
        kind: "wochenplanung",
        text: "Nächste Woche ist noch frei – in 2 Minuten geplant?",
        chips: [
          status?.ready
            ? { label: "Ja, gern", onClick: () => openHelper(undefined, "Plan mir bitte die nächste Woche.") }
            : { label: "Ja, gern", href: "/woche/check" },
          { label: "Später", onClick: () => noteDismissed("wochenplanung", todayIso), quiet: true },
        ],
      };
    }
    // Modus "Dranbleiben": früher an die nächste Woche denken, freie Tage der
    // nächsten zwei Tage anbieten – immer als Angebot
    if (data.planStyle === "plan" && mode === "dranbleiben" && nextStart && nextPlan === null && nextStart <= addDays(todayIso, 4) && allowed("wochenplanung")) {
      return {
        kind: "wochenplanung",
        text: "Soll ich die nächste Woche schon mal vorbereiten? Dauert nur 2 Minuten.",
        chips: [
          status?.ready
            ? { label: "Ja, gern", onClick: () => openHelper(undefined, "Plan mir bitte die nächste Woche.") }
            : { label: "Ja, gern", href: `/woche/check?woche=${nextStart}` },
          { label: "Später", onClick: () => noteDismissed("wochenplanung", todayIso), quiet: true },
        ],
      };
    }
    const freeDay = data.planStyle === "plan" && mode === "dranbleiben"
      ? data.week.days.find((d) => d.date >= todayIso && d.date <= addDays(todayIso, 2) && !d.away && !d.paused && !d.weekend && !d.slot.entry && !wasAsked(activity, `frei:${d.date}`))
      : undefined;
    if (freeDay && allowed("wochenplanung")) {
      const key = `frei:${freeDay.date}`;
      const when = freeDay.date === todayIso ? "Heute" : freeDay.weekday;
      return {
        kind: "wochenplanung",
        text: `${when} ist noch frei – soll ich dir was Schnelles vorschlagen?`,
        chips: [
          once(key, "Ja, gern", () => (status?.ready ? openHelper(undefined, `Schlag mir bitte was Schnelles für ${freeDay.weekday} vor.`) : router.push("/wochenplan"))),
          once(key, "Nein danke"),
        ],
      };
    }
    const grillKey = `grill:${todayIso}`;
    if (forecast?.good && !wasAsked(activity, grillKey) && allowed("grill")) {
      return {
        kind: "grill",
        text: `Am Wochenende wird's schön ☀️ (bis ${forecast.maxTemp} °C) – Lust auf Grillen? Ich setz gern Würstchen, Grillgemüse und Brot auf die Liste.`,
        chips: [
          once(grillKey, "Ja, auf die Liste", () => {
            for (const name of ["Würstchen", "Grillgemüse", "Grillkäse", "Baguette"]) addManualItem(target.weekStart, { name, amount: "", section: sectionFor(name) });
            setDone({ text: "Steht drauf ✓ Würstchen, Grillgemüse, Grillkäse und Baguette." });
          }),
          once(grillKey, "Nein danke"),
        ],
      };
    }
    // "Mal so, mal so" mit "Ganze Woche": höchstens einmal pro Woche anbieten, die nächste Woche vorzubereiten
    const weekKey = `ganze-woche:${data.week.weekStart}`;
    if (data.planStyle === "mix" && profile.mixSuggest === "woche" && target.isNext && !targetPlan && !wasAsked(activity, weekKey) && allowed("wochenplanung")) {
      return {
        kind: "wochenplanung",
        text: "Soll ich dir für nächste Woche ein paar Gerichte vorschlagen?",
        chips: [
          once(weekKey, "Ja, gern", () => (status?.ready ? openHelper(undefined, "Schlag mir bitte Gerichte für die nächste Woche vor – freie Tage dürfen frei bleiben.") : router.push("/woche/check"))),
          once(weekKey, "Nein danke"),
        ],
      };
    }
    // "Mal so, mal so": höchstens einmal pro Woche die nächsten 2 Tage anbieten
    const twoDaysKey = `zwei-tage:${data.week.weekStart}`;
    const nextTwo = [tomorrow, ...data.week.days.filter((d) => d.date === addDays(todayIso, 2))].filter(Boolean);
    if (data.planStyle === "mix" && profile.mixSuggest === "zwei" && !wasAsked(activity, twoDaysKey) && nextTwo.some((d) => d && !d.away && !d.paused && d.weekend !== "frei" && !d.slot.entry) && allowed("wochenplanung")) {
      return {
        kind: "wochenplanung",
        text: "Soll ich dir die nächsten 2 Tage vorschlagen?",
        chips: [
          once(twoDaysKey, "Ja, gern", () =>
            status?.ready ? openHelper(undefined, "Schlag mir bitte Gerichte für die nächsten 2 Tage vor.") : router.push("/ideen"),
          ),
          once(twoDaysKey, "Nein danke"),
        ],
      };
    }
    if (!spontan && profile.weekendStyle !== "frei" && !wasAsked(activity, "wochenende-frei") && weekendsSkipped(data, mealPlans, rated, cooked ?? {}) >= 3) {
      return {
        kind: "wochenende",
        text: `Am Wochenende ${isSolo(profile) ? "kochst du" : "kocht ihr"} oft spontan – soll ich Samstag und Sonntag einfach frei lassen?`,
        chips: [
          once("wochenende-frei", "Ja, gern", () => {
            saveProfile({ ...profile, weekendStyle: "frei" });
            setDone({ text: "Gemacht ✓ Am Wochenende halte ich mich raus." });
          }),
          once("wochenende-frei", "Nein, passt so"),
        ],
      };
    }
    return null;
  })();

  // --- Stufe 4: Bewertung, Stufe 5: Lob und Tipps --------------------------------
  // "Ganz locker": keine Bewertungsfragen, kein Lob, keine Tipps
  const quietDay = !ready || !data || !activity || pausedOn(data.profile, todayIso) || isQuiet(activity, todayIso) || data.day?.weekend === "frei" || mode === "locker";
  const ratingNow = rating ?? (keptRating && keptRating.date >= addDays(todayIso, -1) ? keptRating : null);
  const showRating = !note && !quietDay && ratingNow ? ratingNow : null;
  const showPraise = !note && !showRating && !quietDay && praise && allowed("lob") ? praise : null;

  // Twist: bekanntes Gericht, kein Wunschessen, Twist-Regeln (2× pro Woche, nicht an zwei Tagen hintereinander)
  const entry = data?.day && !data.day.away ? data.day.slot.entry : null;
  const twistBase =
    data && entry && twists && entry.stored.kind !== "wish" && dishStatus(entry, data.recipes) === "bekannt" && !twists.taken[todayIso] && twistAllowed(twists, todayIso, data.week.weekStart)
      ? twistFor(entry.title)
      : null;
  const deck =
    !note && !showRating && !showPraise && !quietDay && data && tipState && allowed("tipp")
      ? tipDeck({
          date: todayIso,
          weekStart: weekStartFor(data.today, data.profile.shoppingDay || "Montag"),
          level: data.profile.tips,
          state: tipState,
          dish: entry && entry.stored.kind !== "wish" && !data.day?.cheat ? entry.title : null,
          twist: twistBase,
          health: health ? { key: health.tip.key, title: health.tip.title, text: health.tip.text } : null,
          household: data.profile.householdType,
          kids: hasKids(data.profile),
          weekendIdeas: data.profile.weekendIdeas,
          planning: data.planStyle !== "spontan",
        })
      : [];
  const tipToday = tipState?.today?.date === todayIso ? tipState.today : null;
  const tipIndex = tipToday?.index ?? 0;
  const showTips = deck.length > 0 && !tipToday?.gone && tipIndex < deck.length;
  const currentCard = showTips ? deck[tipIndex] : null;

  const kind: NudgeKind | null = note?.kind ?? (showRating ? "bewertung" : showPraise ? "lob" : currentCard ? "tipp" : null);
  const cardId = currentCard?.id;
  useEffect(() => {
    if (!kind || opts.welcome) return;
    noteShown(kind, todayIso);
  }, [kind, todayIso, opts.welcome]);
  useEffect(() => {
    if (!cardId) return;
    if (cardId.startsWith("twist:")) markTwistShown(todayIso);
    if (cardId.startsWith("gesund:") && health) markTipShown(health.weekStart, health.tip.key);
  }, [cardId, todayIso, health]);

  if (!data) return null;
  if (opts.welcome) return <WelcomeBack data={data} />;
  if (done) {
    return (
      <Bubble text={done.text}>
        {done.undo && (
          <button
            type="button"
            onClick={() => {
              done.undo?.();
              setDone({ text: "Okay, wieder wie vorher." });
            }}
            className={chipClass(false, "muted")}
          >
            Rückgängig
          </button>
        )}
      </Bubble>
    );
  }
  if (note) {
    return (
      <>
        <Bubble text={note.text} onOpen={note.onOpen} onSwipe={note.onSwipe}>
          {note.chips.slice(0, note.maxChips ?? 2).map((c) =>
            c.href ? (
              <Link key={c.label} href={c.href} onClick={() => noteAnswered(note.kind, todayIso)} className={chipClass(false)}>
                {c.label}
              </Link>
            ) : (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  if (!c.quiet) noteAnswered(note.kind, todayIso);
                  c.onClick?.();
                }}
                className={chipClass(false)}
              >
                {c.label}
              </button>
            ),
          )}
        </Bubble>
        {tomorrowOpen && data.tomorrow && (
          <TomorrowSheet
            day={data.tomorrow}
            tasks={tomorrowTasks(
              data.tomorrow,
              (data.tomorrow.slot.entry?.recipeId ? data.recipes[data.tomorrow.slot.entry.recipeId]?.ingredients.map((i) => i.name) : []) ?? [],
              pantry ?? [],
              current?.list.items ?? [],
              next?.list.items ?? [],
              [current, next],
            )}
            todayIso={todayIso}
            onClose={() => setTomorrowOpen(false)}
          />
        )}
      </>
    );
  }
  if (showRating) return <RatingBubble key={showRating.date} candidate={showRating} data={data} />;
  if (showPraise) {
    return (
      <Bubble text={showPraise}>
        <button type="button" onClick={() => noteAnswered("lob", todayIso)} className={chipClass(false)}>
          Danke 😊
        </button>
      </Bubble>
    );
  }
  if (currentCard) {
    return (
      <TipCard
        deck={deck}
        index={tipIndex}
        date={todayIso}
        showHint={!tipState?.hintShownOn || tipState.hintShownOn === todayIso}
        onGesture={(g) => (g === "gone" ? noteDismissed("tipp", todayIso) : noteAnswered("tipp", todayIso))}
        onAction={(c) => {
          finishTipsToday(todayIso);
          if (c.kind === "twist" && twistBase && data.day) {
            const weekStart = data.week.weekStart;
            const manualId = twistBase.item
              ? addManualItem(weekStart, { name: twistBase.item, amount: "", section: sectionFor(twistBase.item), day: data.day.weekday })
              : undefined;
            markTwistTaken(todayIso, { key: twistBase.key, manualId, weekStart });
            setDone({
              text: `Gemacht ✓ Heute mit Twist: ${twistBase.idea}.${twistBase.item ? ` ${twistBase.item} steht unter „Für heute“ auf der Liste.` : ""}`,
              undo: () => {
                if (manualId) removeManualItems(weekStart, [manualId]);
                unmarkTwistTaken(todayIso);
              },
            });
          }
          if (c.kind === "gesund" && health) {
            const recipe = data.recipes[health.tip.recipeId];
            if (!recipe) return;
            const previous = tryTip(health.tip, recipe);
            setDone({ text: "Ausprobiert ✓ Steht jetzt so im Rezept.", undo: previous ? () => undoTip(health.tip, previous) : undefined });
          }
        }}
        onDismiss={(c) => {
          if (c.kind === "gesund" && health) declineTip(health.tip);
        }}
      />
    );
  }
  return null;
}

/** Was für morgen ansteht: Auftauen, Einweichen, Einkauf */
function tomorrowTasks(
  tomorrow: PlanDay | undefined,
  ingredients: string[],
  pantry: PantryItem[],
  currentItems: ListItem[],
  nextItems: ListItem[],
  lists: ({ weekStart: string } | undefined)[],
): { thaw: PantryItem | null; soak: string | null; shopping: { items: ListItem[]; weekStart: string } | null } {
  const entry = tomorrow && !tomorrow.away ? tomorrow.slot.entry : null;
  if (!tomorrow || !entry) return { thaw: null, soak: null, shopping: null };
  const thaw = pantry.find((p) => p.place === "tiefkuehler" && ingredients.some((n) => sameIngredient(n, p.name))) ?? null;
  const soak = ingredients.find((n) => SOAK.test(n)) ?? null;
  const label = `${entry.title} (${tomorrow.weekday.slice(0, 2)})`;
  const index = lists.findIndex((s) => s && s.weekStart <= tomorrow.date && tomorrow.date < addDays(s.weekStart, 7));
  const items = (index === 0 ? currentItems : index === 1 ? nextItems : []).filter((i) => !i.checked && !i.hidden && i.dishes.some((d) => d.startsWith(label)));
  return { thaw, soak, shopping: index >= 0 ? { items, weekStart: lists[index]!.weekStart } : null };
}

/** Checkliste "Für morgen" – öffnet sich beim Antippen eines Morgen-Hinweises */
function TomorrowSheet({
  day,
  tasks,
  todayIso,
  onClose,
}: {
  day: PlanDay;
  tasks: ReturnType<typeof tomorrowTasks>;
  todayIso: string;
  onClose: () => void;
}) {
  return (
    <Sheet title={`Für morgen: ${day.slot.entry?.title ?? ""}`} onClose={onClose}>
      <ul className={`${CARD_LIST} mb-2`} aria-label="Für morgen">
        {tasks.thaw && (
          <li className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">❄️ {tasks.thaw.name} aus dem Tiefkühler in den Kühlschrank</span>
            <button type="button" onClick={() => updatePantryItem(tasks.thaw!.id, { place: "kuehlschrank" })} className={chipClass(false)}>
              Erledigt
            </button>
          </li>
        )}
        {tasks.soak && <li className="px-4 py-3">💧 {tasks.soak} heute Abend einweichen</li>}
        {tasks.shopping?.items.map((item) => (
          <li key={item.key} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">🛒 {item.name}</span>
            <button type="button" onClick={() => toggleChecked(tasks.shopping!.weekStart, item, todayIso)} className={chipClass(false)}>
              Hab ich
            </button>
          </li>
        ))}
        {!tasks.thaw && !tasks.soak && !tasks.shopping?.items.length && <li className="px-4 py-3 text-muted">Alles vorbereitet ✓</li>}
      </ul>
    </Sheet>
  );
}

/** Bewertung eines neuen Gerichts – auf Lottes Platz: 👍 / 👎 / ✕ */
function RatingBubble({ candidate, data }: { candidate: RatingCandidate; data: HomeData }) {
  const mealPlans = useMealPlans();
  const [down, setDown] = useState(false);
  const [thanks, setThanks] = useState("");
  const { todayIso } = data;
  if (thanks === "zu") return null;
  if (thanks) return <Bubble text={thanks} />;
  if (down) {
    const finish = (reason: string) => {
      if (mealPlans) rateDown(candidate, reason, { profile: data.profile, recipes: data.recipes, weekPlans: data.weekPlans, mealPlans }, data.today);
      noteAnswered("bewertung", todayIso);
      setThanks(`Alles klar – ${candidate.title} kommt nicht wieder.`);
    };
    return (
      <Bubble text={"Woran lag's?"}>
        {DOWN_REASONS.slice(0, 3).map((r) => (
          <button key={r} type="button" onClick={() => finish(r)} className={chipClass(false)}>
            {r}
          </button>
        ))}
        <button type="button" onClick={() => finish("")} className={chipClass(false, "muted")}>
          egal
        </button>
      </Bubble>
    );
  }
  const yesterday = candidate.date !== todayIso;
  return (
    <section className="flex items-center gap-2.5" aria-label="Bewerten">
      <LotteAvatar size={40} />
      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-surface py-1 pl-3.5 pr-1">
        <p className="min-w-0 flex-1 text-[15px] leading-snug text-ink">
          Wie war {yesterday ? "gestern " : ""}
          {candidate.title}?
        </p>
        <button
          type="button"
          aria-label="Lecker"
          onClick={() => {
            rateUp(candidate, data.profile, data.recipes);
            noteAnswered("bewertung", todayIso);
            setThanks("Freut mich! 😋");
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-accent active:bg-stone-100"
        >
          <ThumbsUp className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
        <button type="button" aria-label="Nicht so" onClick={() => setDown(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted active:bg-stone-100">
          <ThumbsDown className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Nicht fragen"
          onClick={() => {
            noteDismissed("bewertung", todayIso);
            setThanks("zu");
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-400 active:bg-stone-100"
        >
          <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </section>
  );
}

/**
 * Wie viele der letzten Wochenenden in Folge hatten geplante Gerichte, von
 * denen keins gekocht wurde (keine Bewertung, Rezept nicht als gekocht
 * vermerkt)? Ein Wochenende ohne Plan beendet die Folge.
 */
function weekendsSkipped(
  data: HomeData,
  mealPlans: Record<string, Record<string, StoredEntry>>,
  rated: Record<string, Rating>,
  cookedDays: Record<string, CookedDay>,
): number {
  let count = 0;
  const today = data.today;
  // Letzter vergangener Samstag
  const back = (today.getDay() + 1) % 7 || 7;
  for (let k = 0; k < 4; k++) {
    const saturday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back - 7 * k, 12);
    const dates = [toIsoDate(saturday), addDays(toIsoDate(saturday), 1)];
    const planned = dates.flatMap((date) => {
      const week = composeWeek(weekStartFor(new Date(`${date}T12:00:00`), data.profile.shoppingDay || "Montag"), data.profile, data.weekPlans, mealPlans, data.recipes);
      const day = week.days.find((d) => d.date === date);
      return day?.slot.entry && !day.away ? [{ date, entry: day.slot.entry }] : [];
    });
    if (planned.length === 0) break;
    const cooked = planned.some(({ date, entry }) => {
      const recipe = entry.recipeId ? data.recipes[entry.recipeId] : undefined;
      // Von selbst nach dem Essen vermerkt zählt hier nicht – nur, was jemand selbst getan hat
      const auto = cookedDays[date]?.how === "auto";
      return rated[date] === "up" || rated[date] === "down" || cookedDays[date]?.how === "marked" || (!auto && Boolean(recipe?.lastCookedAt?.startsWith(date)));
    });
    if (cooked) break;
    count++;
  }
  return count;
}

/** Avatar + Sprechblase; `onOpen`: Antippen der Blase öffnet mehr (z. B. "Für morgen") */
function Bubble({ text, children, onOpen, onSwipe }: { text: string; children?: ReactNode; onOpen?: () => void; onSwipe?: () => void }) {
  const [startX, setStartX] = useState<number | null>(null);
  const [dx, setDx] = useState(0);
  const swipe = onSwipe
    ? {
        onPointerDown: (e: React.PointerEvent) => setStartX(e.clientX),
        onPointerMove: (e: React.PointerEvent) => startX !== null && setDx(e.clientX - startX),
        onPointerUp: () => {
          if (Math.abs(dx) > 70) onSwipe();
          setStartX(null);
          setDx(0);
        },
        onPointerCancel: () => {
          setStartX(null);
          setDx(0);
        },
        style: { transform: dx ? `translateX(${dx}px)` : undefined, opacity: dx ? Math.max(0.3, 1 - Math.abs(dx) / 250) : undefined, touchAction: "pan-y" as const },
        "data-no-swipe": true,
      }
    : {};
  return (
    <section className="flex items-start gap-2.5" aria-label="Küchenhelfer" {...swipe}>
      <LotteAvatar size={40} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {onOpen ? (
          <button type="button" onClick={onOpen} className="rounded-2xl rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-left text-[15px] leading-snug text-ink">
            {text}
          </button>
        ) : (
          <p className="rounded-2xl rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-snug text-ink">{text}</p>
        )}
        {children && <div className="flex flex-wrap gap-x-1.5 gap-y-2">{children}</div>}
      </div>
    </section>
  );
}
