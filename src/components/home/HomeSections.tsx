"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Mic, Settings, ShoppingCart, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { HelperAvatar } from "@/components/assistant/HelperAvatar";
import { AppLogo } from "@/components/AppLogo";
import { CARD, buttonClass, chipClass } from "@/components/ui/styles";
import { useAppointments } from "@/lib/appointments";
import { useAssistantStatus } from "@/lib/assistant/client";
import { openHelper } from "@/lib/assistant/open";
import { dishEmoji } from "@/lib/dishEmoji";
import { noteAnswered, noteDismissed, noteShown } from "@/lib/nudges";
import { helperName, mealClockFor, saveProfile } from "@/lib/profile";
import { dismissWelcome } from "@/lib/activity";
import { DOWN_REASONS, rateDown, rateUp, type RatingCandidate } from "@/lib/ratings";
import { entriesWithoutSlot, mealPlansWithWeek, replaceMealPlans, useMealPlans } from "@/lib/mealPlan";
import { useWeekShoppingList } from "@/lib/useWeekShoppingList";
import type { HomeData } from "./useHomeData";

const DATE = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

/** Kopf: Logo, darunter das Datum, rechts das Zahnrad */
export function HomeHeader({ today }: { today: Date | undefined }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1>
          <AppLogo />
        </h1>
        <p className="min-h-5 text-sm text-muted">{today ? DATE.format(today) : ""}</p>
      </div>
      <Link
        href="/profil"
        aria-label="Profil und Einstellungen"
        className="mt-1 flex h-10 w-10 items-center justify-center rounded-full text-muted transition active:bg-stone-100"
      >
        <Settings className="h-5 w-5" strokeWidth={2} aria-hidden />
      </Link>
    </header>
  );
}

/** "Mathis' Wunsch" bzw. "Ellas Wunsch" */
const possessive = (name: string) => (/[sxzß]$/i.test(name) ? `${name}'` : `${name}s`);

/** Große Heute-Karte – der Blickfang. Tippen öffnet das Rezept. */
export function HeroCard({ data, onSuggest }: { data: HomeData; onSuggest: () => void }) {
  const { day, recipes, profile, firstTime } = data;
  const appointments = useAppointments(data.todayIso);
  const entry = day?.slot.entry;
  const recipe = entry?.recipeId ? recipes[entry.recipeId] : undefined;
  const clock = day ? mealClockFor(profile, day.weekday) : "";

  if (day?.away) {
    return (
      <section className={`${CARD} flex items-center gap-4 p-5`} aria-label="Heute">
        <span className="text-5xl" aria-hidden>
          🏕️
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Heute</p>
          <p className="mt-1 text-xl font-extrabold leading-tight tracking-tight">Ausflug – heute wird nicht gekocht</p>
        </div>
      </section>
    );
  }

  const leftoversOnly = !entry && day?.leftovers;
  if (!entry && !leftoversOnly) {
    // Planen ist freiwillig – nie als Fehler oder Warnung
    if (day?.weekend === "frei") {
      return (
        <section className={`${CARD} flex flex-col items-center gap-2 p-6 text-center`} aria-label="Heute">
          <span className="text-5xl" aria-hidden>
            🏖
          </span>
          <p className="text-lg font-bold leading-snug">Wochenende – genießt es.</p>
          <p className="text-sm text-muted">Wenn ihr was braucht, fragt {helperName(profile)} einfach.</p>
        </section>
      );
    }
    return (
      <section className={`${CARD} flex flex-col items-center gap-3 p-6 text-center`} aria-label="Heute">
        <span className="text-5xl" aria-hidden>
          🍽️
        </span>
        <p className="text-lg font-bold leading-snug">Spontan heute? Frag {helperName(profile)} einfach 😊</p>
        <button type="button" onClick={onSuggest} className={`${buttonClass("secondary", "lg")} w-full`}>
          Ideen holen
        </button>
      </section>
    );
  }

  const title = entry ? entry.title : `Reste von ${day!.leftovers}`;
  const special = entry?.stored.kind === "wish" && entry.kidName
    ? `${possessive(entry.kidName)} Wunsch 🎉`
    : leftoversOnly
      ? "Reste"
      : day?.cheat
        ? "Cheat Day 🍕"
        : firstTime
          ? "Neu"
          : entry?.double
            ? "doppelt – Reste für morgen"
            : "";
  const facts = [special, recipe?.prepMinutes ? `${recipe.prepMinutes} Min.` : "", day?.persons ? `${day.persons} Pers.` : ""].filter(Boolean);
  const emoji = entry?.stored.kind === "wish" ? "🎉" : dishEmoji(title, entry?.category ?? null);

  return (
    <section className={`${CARD} overflow-hidden`} aria-label="Heute">
      <Link href={entry?.recipeId ? `/kochbuch/rezept?id=${encodeURIComponent(entry.recipeId)}` : "/wochenplan"} className="block active:opacity-90">
        <div className="relative flex h-28 items-center justify-center [@media(max-height:620px)]:h-16 bg-linear-to-br from-accent-soft via-accent-soft to-accent/45">
          <span className="absolute left-4 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-accent-strong">
            {/* Lockeres Wochenende: eine Idee ohne Uhrzeit */}
            {day?.weekend === "locker" ? "Falls ihr Lust habt" : `Heute · ${clock}`}
          </span>
          <span className="text-6xl drop-shadow-sm [@media(max-height:620px)]:text-4xl" aria-hidden>
            {emoji}
          </span>
        </div>
        <div className="px-4 pb-3 pt-3">
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight">{title}</h2>
          {facts.length > 0 && <p className="mt-0.5 text-sm text-muted">{facts.join(" · ")}</p>}
        </div>
      </Link>
      {appointments.length > 0 && (
        <ul className="border-t border-line px-4 py-2" aria-label="Termine">
          {appointments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 py-1 text-sm">
              <span className="w-11 shrink-0 tabular-nums text-muted">{a.time}</span>
              <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{a.title}</span>
              {a.who && <span className="shrink-0 text-xs text-muted">{a.who}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Pause: ruhig, ohne Hinweise – mit "Pause beenden" */
export function PauseCard({ data }: { data: HomeData }) {
  const pause = data.profile.pause;
  return (
    <section className={`${CARD} flex flex-col items-center gap-3 p-6 text-center`} aria-label="Pause">
      <span className="text-5xl" aria-hidden>
        ☀️
      </span>
      <p className="text-lg font-bold leading-snug">
        {pause?.until ? `Pause bis ${LONG_DATE.format(new Date(`${pause.until}T12:00:00`))}` : "Pause"} – genießt die Zeit ☀️
      </p>
      <button type="button" onClick={() => saveProfile({ ...data.profile, pause: null })} className={`${buttonClass("secondary", "lg")} w-full`}>
        Pause beenden
      </button>
    </section>
  );
}

/** Nach 3+ Tagen einmal warm begrüßen – kein Rückblick auf Verpasstes */
export function WelcomeBack({ data }: { data: HomeData }) {
  const mealPlans = useMealPlans();
  const status = useAssistantStatus(true);
  const router = useRouter();
  const { todayIso, profile, week } = data;
  const fresh = () => {
    // Alte, unerledigte Planung ab heute still verwerfen
    if (mealPlans) {
      const weeks = mealPlansWithWeek(mealPlans, week.weekStart, (entries) =>
        week.days.filter((d) => d.date >= todayIso && d.slot.entry).reduce((acc, d) => entriesWithoutSlot(acc, d.slot), entries),
      );
      replaceMealPlans(weeks);
    }
    if (profile.pause) saveProfile({ ...profile, pause: null });
    dismissWelcome(todayIso);
    if (status?.configured) openHelper(undefined, "Wir starten frisch – schlag mir bitte was für die nächsten Tage vor.");
    else router.push("/wochenplan");
  };
  return (
    <section className="flex items-start gap-2.5" aria-label="Willkommen zurück">
      <HelperAvatar size={40} variant="badge" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="rounded-2xl rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-snug text-ink">
          Hey, schön, dass du da bist! 😊 Hattet ihr eine gute Zeit? Frisch starten oder noch Pause?
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={fresh} className={chipClass(false)}>
            Frisch starten
          </button>
          <button
            type="button"
            onClick={() => {
              saveProfile({ ...profile, pause: { from: todayIso, until: null } });
              dismissWelcome(todayIso);
            }}
            className={chipClass(false)}
          >
            Noch Pause
          </button>
        </div>
      </div>
    </section>
  );
}

const LONG_DATE = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "long" });

/** Schmale Zeile "Wie war …?" 👍 / 👎 / ✕ – nur bei neuen Gerichten */
export function RatingRow({ candidate, data }: { candidate: RatingCandidate; data: HomeData }) {
  const mealPlans = useMealPlans();
  const [down, setDown] = useState(false);
  const [thanks, setThanks] = useState("");
  const { todayIso } = data;

  useEffect(() => {
    noteShown("bewertung", todayIso);
  }, [todayIso]);

  if (thanks === "zu") return null;
  if (thanks) return <p className="px-1 text-sm text-muted" role="status">{thanks}</p>;
  if (down) {
    const finish = (reason: string) => {
      if (mealPlans) rateDown(candidate, reason, { profile: data.profile, recipes: data.recipes, weekPlans: data.weekPlans, mealPlans }, data.today);
      noteAnswered("bewertung", todayIso);
      setThanks(`Alles klar – ${candidate.title} kommt nicht wieder.`);
    };
    return (
      <div className="flex items-center gap-2 overflow-x-auto px-1 text-sm" aria-label="Grund" data-no-swipe>
        <span className="shrink-0 text-muted">{"Woran lag's?"}</span>
        {DOWN_REASONS.slice(0, 3).map((r) => (
          <button key={r} type="button" onClick={() => finish(r)} className={`${chipClass(false)} shrink-0`}>
            {r}
          </button>
        ))}
        <button type="button" onClick={() => finish("")} className={`${chipClass(false, "muted")} shrink-0`}>
          egal
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 px-1" aria-label="Bewerten">
      <p className="min-w-0 flex-1 truncate text-sm text-muted">Wie war {candidate.title}?</p>
      <button
        type="button"
        aria-label="Lecker"
        onClick={() => {
          rateUp(candidate, data.profile, data.recipes);
          noteAnswered("bewertung", todayIso);
          setThanks("Freut mich! 😋");
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full text-accent active:bg-stone-100"
      >
        <ThumbsUp className="h-5 w-5" strokeWidth={2} aria-hidden />
      </button>
      <button type="button" aria-label="Nicht so" onClick={() => setDown(true)} className="flex h-9 w-9 items-center justify-center rounded-full text-muted active:bg-stone-100">
        <ThumbsDown className="h-5 w-5" strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Nicht fragen"
        onClick={() => {
          noteDismissed("bewertung", todayIso);
          setThanks("zu");
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400 active:bg-stone-100"
      >
        <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}

/** Drei kleine Karten nebeneinander mit Live-Inhalt */
export function BentoCards({ data }: { data: HomeData }) {
  const shopping = useWeekShoppingList("planning");
  const recipeCount = Object.keys(data.recipes).length;
  const tomorrowDish = data.tomorrow && !data.tomorrow.away ? data.tomorrow.slot.entry?.title : undefined;
  const open = shopping?.list.openCount ?? 0;
  const cards = [
    { href: "/wochenplan", label: "Woche", icon: CalendarDays, value: tomorrowDish ? `Morgen: ${tomorrowDish}` : `${data.week.planned}/${data.week.total} geplant` },
    { href: "/einkaufsliste", label: "Einkauf", icon: ShoppingCart, value: open > 0 ? `${open} offen` : "Alles da ✓" },
    { href: "/kochbuch", label: "Kochbuch", icon: BookOpen, value: `${recipeCount} ${recipeCount === 1 ? "Rezept" : "Rezepte"}` },
  ];
  return (
    <nav aria-label="Bereiche" className="grid grid-cols-3 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Link key={c.href} href={c.href} className={`${CARD} flex min-h-20 flex-col justify-between gap-1.5 p-3 [@media(max-height:620px)]:min-h-0 transition active:scale-[0.98]`}>
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
              <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
              <span className="truncate">{c.label}</span>
            </span>
            <span className="line-clamp-2 text-sm font-bold leading-snug text-ink">{c.value}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Unten fest: "Sag <Name>, was ansteht …" mit großem Mikrofon */
export function HomeAskBar({ name }: { name: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-linear-to-t from-background via-background to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2">
        <button
          type="button"
          onClick={() => openHelper()}
          className="flex h-14 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-surface pl-1.5 pr-4 text-left shadow-card"
        >
          <HelperAvatar size={44} variant="badge" />
          <span className="truncate text-base text-muted">Sag {name}, was ansteht …</span>
        </button>
        <button
          type="button"
          onClick={() => openHelper("voice")}
          aria-label={`${name} etwas sagen`}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-lg transition active:scale-95"
        >
          <Mic className="h-7 w-7" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** "Ja, schlag was vor": mit KI im Chat, sonst zum Wochenplan */
export function useSuggestToday(): () => void {
  const status = useAssistantStatus(true);
  const router = useRouter();
  return () => (status?.configured ? openHelper(undefined, "Schlag mir bitte etwas für heute vor.") : router.push("/wochenplan"));
}
