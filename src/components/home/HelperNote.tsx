"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { HelperAvatar } from "@/components/assistant/HelperAvatar";
import { useHealthTip, useWeekPraise } from "@/components/assistant/useHealthTip";
import { chipClass } from "@/components/ui/styles";
import { useAssistantStatus } from "@/lib/assistant/client";
import { openHelper } from "@/lib/assistant/open";
import type { Recipe } from "@/lib/cookbook";
import { declineTip, markTipShown, tryTip, undoTip } from "@/lib/healthTips";
import { isPaused, noteAnswered, noteDismissed, noteShown, useNudges, type NudgeKind } from "@/lib/nudges";
import { addManualItem, sectionFor, setHave } from "@/lib/shoppingList";
import { isQuiet, markAsked, useActivity, wasAsked } from "@/lib/activity";
import { composeWeek, useMealPlans, type StoredEntry } from "@/lib/mealPlan";
import { usePantry } from "@/lib/pantry";
import { pausedOn, saveProfile } from "@/lib/profile";
import { useRatings, type Rating } from "@/lib/ratings";
import { perishables } from "@/lib/spontan";
import { useWeekendForecast } from "@/lib/weather";
import { useRouter } from "next/navigation";
import { useWeekShoppingList } from "@/lib/useWeekShoppingList";
import { addDays, planningWeekStart, toIsoDate, useWeekPlan, weekStartFor } from "@/lib/weekPlan";
import type { HomeData } from "./useHomeData";

type Chip = { label: string; href?: string; onClick?: () => void };
type Note = { kind: NudgeKind; text: string; chips: Chip[] };

function names(list: string[]): string {
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} und ${list[1]}`;
  if (list.length === 3) return `${list[0]}, ${list[1]} und ${list[2]}`;
  return `${list[0]}, ${list[1]} und ${list.length - 2} weitere Sachen`;
}

/**
 * Höchstens ein Satz vom Küchenhelfer – nur wenn es etwas Wichtiges gibt,
 * immer als Angebot oder Erledigt-Meldung, mit höchstens 2 Antworten.
 * Reihenfolge: Einkauf für morgen, nächste Woche planen, Lob, Gesundheits-Tipp.
 * Eine Art, die 3× ignoriert wurde, pausiert 2 Wochen.
 *
 * Als Hook, damit die Startseite weiß, ob gerade ein Satz da ist (dann kein
 * Twist – immer nur ein Angebot auf einmal). `data` null = aus.
 */
export function useHelperNote(data: HomeData | null | undefined): ReactNode | null {
  const nudges = useNudges();
  const status = useAssistantStatus(true);
  const current = useWeekShoppingList("current");
  const next = useWeekShoppingList("next");
  const target = data ? planningWeekStart(data.today, data.profile.shoppingDay || "Montag") : null;
  const targetPlan = useWeekPlan(target?.weekStart);
  const tip = useHealthTip();
  const activity = useActivity();
  const mealPlans = useMealPlans();
  const rated = useRatings();
  const pantry = usePantry();
  const router = useRouter();
  const isFriday = data ? WEEKDAY.format(data.today) === "Freitag" : false;
  const todayIso = data?.todayIso ?? "";
  const forecast = useWeekendForecast(
    data?.profile.weather,
    data && isFriday && !pausedOn(data.profile, todayIso) ? todayIso : null,
    todayIso ? addDays(todayIso, 1) : "",
    todayIso ? addDays(todayIso, 2) : "",
  );
  const praise = useWeekPraise();
  const [done, setDone] = useState<{ text: string; undo?: () => void } | null>(null);

  const note = ((): Note | null => {
    if (!data || !target || !nudges || !current || !next || targetPlan === undefined || !activity || !mealPlans || !rated) return null;
    const allowed = (kind: NudgeKind) => !isPaused(nudges, kind, todayIso);
    const { profile } = data;
    const once = (key: string, label: string, onClick?: () => void): Chip => ({
      label,
      onClick: () => {
        markAsked(key);
        onClick?.();
      },
    });

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
            once(key, "Ja, gern", () => (status?.configured ? openHelper(undefined, `Bereite bitte schon was für ${back} vor.`) : router.push("/wochenplan"))),
            once(key, "Nein danke"),
          ],
        };
      }
      return null;
    }
    // Leiser werden: 3 Tage unbeachtet → Stille, bis wieder jemand selbst etwas tut
    if (isQuiet(activity, todayIso)) return null;
    // Freies Wochenende: keine Hinweise – nur auf Nachfrage. Locker: keine
    // Erinnerungen ans Wochenend-Essen (siehe unten), Planung für nächste Woche ja.
    if (data.day?.weekend === "frei") return null;

    // Vor der Pause: Verderbliches aufbrauchen?
    const pause = profile.pause;
    if (pause && todayIso < pause.from && pause.from <= addDays(todayIso, 3) && pantry) {
      const fresh = perishables(pantry);
      const key = `pause-start:${pause.from}`;
      if (fresh.length > 0 && !wasAsked(activity, key)) {
        return {
          kind: "pause",
          text: `Im Kühlschrank ist noch ${names(fresh)} – soll ich das in die letzten Tage einplanen?`,
          chips: [
            once(key, "Ja, gern", () =>
              status?.configured ? openHelper(undefined, `Plan bitte ${names(fresh)} in die Tage bis zur Pause ein.`) : openHelper("spontan"),
            ),
            once(key, "Nein danke"),
          ],
        };
      }
    }

    // 1. Für morgen fehlt noch etwas
    const tomorrow = data.tomorrow;
    // Für ein lockeres/freies Wochenende keine Erinnerungen
    const entry = tomorrow && !tomorrow.away && !tomorrow.weekend ? tomorrow.slot.entry : null;
    if (entry && allowed("einkauf-morgen")) {
      const label = `${entry.title} (${tomorrow!.weekday.slice(0, 2)})`;
      const shopping = [current, next].find((s) => s.weekStart <= tomorrow!.date && tomorrow!.date < addWeek(s.weekStart));
      const missing = (shopping?.list.items ?? []).filter((i) => !i.checked && !i.hidden && i.dishes.some((d) => d.startsWith(label)));
      if (shopping && missing.length > 0) {
        return {
          kind: "einkauf-morgen",
          text: `Für morgen hab ich ${names(missing.map((i) => i.name))} schon auf die Liste gesetzt.`,
          chips: [
            { label: "Zur Liste", href: "/einkaufsliste" },
            {
              label: "Haben wir schon",
              onClick: () => {
                missing.forEach((i) => setHave(shopping.weekStart, i.key, true));
                setDone({ text: "Alles klar, hab's von der Liste genommen." });
              },
            },
          ],
        };
      }
    }

    // 2. Nächste Woche ist noch ganz offen
    if (target.isNext && !targetPlan && allowed("wochenplanung")) {
      return {
        kind: "wochenplanung",
        text: "Nächste Woche ist noch frei – soll ich schon mal was vorschlagen?",
        chips: [
          status?.configured
            ? { label: "Ja, gern", onClick: () => openHelper(undefined, "Plan mir bitte die nächste Woche.") }
            : { label: "Ja, gern", href: "/woche/check" },
          { label: "Später", onClick: () => noteDismissed("wochenplanung", todayIso) },
        ],
      };
    }

    // Freitags bei gutem Wetter EIN Grill-Vorschlag (nur mit Zustimmung)
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

    // Wochenenden wurden 3× in Folge nicht gekocht → EINMAL "frei" anbieten
    if (profile.weekendStyle !== "frei" && !wasAsked(activity, "wochenende-frei") && weekendsSkipped(data, mealPlans, rated) >= 3) {
      return {
        kind: "wochenende",
        text: "Am Wochenende kocht ihr oft spontan – soll ich Samstag und Sonntag einfach frei lassen?",
        chips: [
          once("wochenende-frei", "Ja, gern", () => {
            saveProfile({ ...profile, weekendStyle: "frei" });
            setDone({ text: "Gemacht ✓ Am Wochenende halte ich mich raus." });
          }),
          once("wochenende-frei", "Nein, passt so"),
        ],
      };
    }

    // 3. Lob zum Wochenrückblick
    if (praise && allowed("lob")) return { kind: "lob", text: praise, chips: [{ label: "Danke 😊" }] };

    // 4. Sanfter Gesundheits-Tipp
    if (tip && allowed("tipp")) {
      const recipe: Recipe | undefined = data.recipes[tip.tip.recipeId];
      if (recipe) {
        return {
          kind: "tipp",
          text: `Kleine Idee für ${tip.tip.title}: ${tip.tip.text}`,
          chips: [
            {
              label: "Ausprobieren",
              onClick: () => {
                const previous = tryTip(tip.tip, recipe);
                setDone({ text: "Ausprobiert ✓ Steht jetzt so im Rezept.", undo: previous ? () => undoTip(tip.tip, previous) : undefined });
              },
            },
            { label: "Nein danke", onClick: () => declineTip(tip.tip) },
          ],
        };
      }
    }
    return null;
  })();

  const kind = note?.kind;
  useEffect(() => {
    if (!kind) return;
    noteShown(kind, todayIso);
    if (kind === "tipp" && tip) markTipShown(tip.weekStart, tip.tip.key);
  }, [kind, todayIso, tip]);

  if (!data) return null;
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
  if (!note) return null;
  return (
    <Bubble text={note.text}>
      {note.chips.slice(0, 2).map((c) =>
        c.href ? (
          <Link key={c.label} href={c.href} onClick={() => noteAnswered(note.kind, todayIso)} className={chipClass(false)}>
            {c.label}
          </Link>
        ) : (
          <button
            key={c.label}
            type="button"
            onClick={() => {
              if (c.label !== "Später") noteAnswered(note.kind, todayIso);
              c.onClick?.();
            }}
            className={chipClass(false)}
          >
            {c.label}
          </button>
        ),
      )}
    </Bubble>
  );
}

const addWeek = (weekStart: string) => addDays(weekStart, 7);

const WEEKDAY = new Intl.DateTimeFormat("de-DE", { weekday: "long" });

/**
 * Wie viele der letzten Wochenenden in Folge hatten geplante Gerichte, von
 * denen keins gekocht wurde (keine Bewertung, Rezept nicht als gekocht
 * vermerkt)? Ein Wochenende ohne Plan beendet die Folge.
 */
function weekendsSkipped(data: HomeData, mealPlans: Record<string, Record<string, StoredEntry>>, rated: Record<string, Rating>): number {
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
      return rated[date] === "up" || rated[date] === "down" || Boolean(recipe?.lastCookedAt?.startsWith(date));
    });
    if (cooked) break;
    count++;
  }
  return count;
}

function Bubble({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <section className="flex items-start gap-2.5" aria-label="Küchenhelfer">
      <HelperAvatar size={40} variant="badge" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="rounded-2xl rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-snug text-ink">{text}</p>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}
