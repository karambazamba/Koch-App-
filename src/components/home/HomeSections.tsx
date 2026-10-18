"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarDays, ChevronRight, Mic, Refrigerator, Settings, ShoppingCart, type LucideIcon } from "lucide-react";
import { HelperAvatar } from "@/components/assistant/HelperAvatar";
import { AppLogo } from "@/components/AppLogo";
import { CARD, buttonClass, chipClass } from "@/components/ui/styles";
import { personDotClass, useAppointments } from "@/lib/appointments";
import { dishStatus, type DishStatus } from "@/lib/dishStatus";
import { usePantry, usePantryUsed } from "@/lib/pantry";
import { QuickAddButton } from "@/components/shopping/QuickAdd";
import { useAssistantStatus } from "@/lib/assistant/client";
import { openHelper } from "@/lib/assistant/open";
import { dishEmoji } from "@/lib/dishEmoji";
import { helperName, isSmallHousehold, isSolo, mealClockFor, saveProfile } from "@/lib/profile";
import { dismissWelcome } from "@/lib/activity";
import { entriesWithoutSlot, loadMealPlans, mealPlansWithWeek, replaceMealPlans, useMealPlans } from "@/lib/mealPlan";
import { useWeekShoppingList } from "@/lib/useWeekShoppingList";
import { useTodayIdeas } from "@/lib/useIdeas";
import { isSpontanEntry, type HomeData } from "./useHomeData";
import { IdeasCard } from "@/components/ideas/IdeasCard";
import { showToast } from "@/lib/toast";
import { Lightbulb } from "lucide-react";

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

/** "✓ kennt ihr" bzw. "Neu ✨" neben dem Gerichtnamen */
function StatusLabel({ status, solo = false }: { status: DishStatus; solo?: boolean }) {
  return status === "bekannt" ? (
    <span className="whitespace-nowrap text-sm font-bold text-emerald-700">{solo ? "✓ kennst du" : "✓ kennt ihr"}</span>
  ) : (
    <span className="whitespace-nowrap text-sm font-bold text-accent-strong">Neu ✨</span>
  );
}

/**
 * Große Heute-Karte – der Blickfang. Bekannte Gerichte zeigen nur den Namen
 * (Rezept und Tauschen dezent), neue das Rezept Schritt für Schritt.
 * `afterMeal`: Essenszeit vorbei (dann kein "Los geht's" mehr).
 */
export function HeroCard({ data, afterMeal }: { data: HomeData; afterMeal: boolean }) {
  const { day, recipes, profile } = data;
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
          <p className="text-xs font-bold uppercase tracking-wider text-accent-strong">Heute</p>
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
          <p className="text-sm text-muted">{isSolo(profile) ? `Wenn du was brauchst, frag ${helperName(profile)} einfach.` : `Wenn ihr was braucht, fragt ${helperName(profile)} einfach.`}</p>
        </section>
      );
    }
    // Kein Gericht für heute: ganz normal – drei Ideen (für alle Kochstile)
    return <IdeasCard />;
  }

  const title = entry ? entry.title : `Reste von ${day!.leftovers}`;
  const wish = entry?.stored.kind === "wish";
  const status: DishStatus | null = entry ? dishStatus(entry, recipes) : null;
  const special = wish && entry?.kidName
    ? `${possessive(entry.kidName)} Wunsch 🎉`
    : leftoversOnly
      ? "Reste"
      : day?.cheat
        ? "Cheat Day 🍕"
        : day?.leftovers
          ? `Reste von ${day.leftovers}`
          : entry?.double
            ? isSmallHousehold(profile)
              ? "reicht für morgen"
              : "doppelt – Reste für morgen"
            : "";
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const emoji = wish ? "🎉" : dishEmoji(title, entry?.category ?? null);
  const recipeHref = recipe ? `/kochbuch/rezept?id=${encodeURIComponent(recipe.id)}` : null;
  // Neu (oder "gern nach Rezept"): das Rezept steht im Vordergrund
  const recipeFirst = Boolean(recipe && !afterMeal && (status === "neu" || profile.cookingStyle === "rezept"));
  // Aus den Ideen gewählt: "Andere Idee" statt Tauschen im Plan
  const spontanChoice = isSpontanEntry(day);
  const otherIdea = () => {
    if (!day) return;
    const before = loadMealPlans();
    replaceMealPlans(mealPlansWithWeek(before, data.week.weekStart, (entries) => entriesWithoutSlot(entries, day.slot)));
    showToast({ text: "Okay – hier sind wieder Ideen.", undo: () => replaceMealPlans(before) });
  };
  const facts = [
    special,
    recipe?.prepMinutes ? `${recipe.prepMinutes} Min.` : "",
    day?.persons ? `${day.persons} Pers.` : "",
    // Beim Rezept im Vordergrund: wie viel es ist
    recipeFirst && recipe ? `${plural(recipe.steps.length, "Schritt", "Schritte")} · ${plural(recipe.ingredients.length, "Zutat", "Zutaten")}` : "",
  ].filter(Boolean);

  return (
    <section className={`${CARD} flex flex-col overflow-hidden`} aria-label="Heute">
      <Link href={recipeHref ?? (data.planStyle === "spontan" ? "/ideen" : "/wochenplan")} className="flex flex-col active:opacity-90">
        {/* Bildfeld: so groß, wie der Bildschirm hergibt (ohne Scrollen) */}
        <div className="relative flex h-[clamp(3.5rem,calc(100dvh-38rem),11rem)] items-center justify-center bg-linear-to-br from-accent-soft via-accent-soft to-accent/45">
          <span className="absolute left-4 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-accent-strong">
            {/* Lockeres Wochenende: eine Idee ohne Uhrzeit */}
            {day?.weekend === "locker" ? (isSolo(profile) ? "Falls du Lust hast" : "Falls ihr Lust habt") : `Heute · ${clock}`}
          </span>
          <span className="text-5xl drop-shadow-sm [@media(min-height:740px)]:text-6xl" aria-hidden>
            {emoji}
          </span>
        </div>
        <div className="px-4 pt-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight">{title}</h2>
            {status && <StatusLabel status={status} solo={isSolo(profile)} />}
          </div>
          {facts.length > 0 && <p className="mt-0.5 text-sm text-muted">{facts.join(" · ")}</p>}
        </div>
      </Link>
      {recipeFirst && recipe ? (
        <div className="px-4 pb-4 pt-2.5">
          <Link
            href={recipe.steps.length > 0 ? `/kochbuch/kochen?id=${encodeURIComponent(recipe.id)}` : recipeHref!}
            className={`${buttonClass("primary")} w-full`}
          >
            {recipe.steps.length > 0 ? "Los geht's – Schritt für Schritt" : "Rezept ansehen"}
          </Link>
        </div>
      ) : entry ? (
        <p className="flex gap-1.5 px-4 pb-3 pt-1 text-sm text-muted">
          {recipeHref && (
            <>
              <Link href={recipeHref} className="font-semibold underline-offset-2 active:underline">
                Rezept ansehen
              </Link>
              <span aria-hidden>·</span>
            </>
          )}
          {spontanChoice ? (
            <button type="button" onClick={otherIdea} className="font-semibold underline-offset-2 active:underline">
              Andere Idee
            </button>
          ) : (
            <Link href="/wochenplan?tauschen=heute" className="font-semibold underline-offset-2 active:underline">
              Tauschen
            </Link>
          )}
        </p>
      ) : (
        <div className="pb-3" />
      )}
      {appointments.length > 0 && (
        <ul className="border-t border-line px-4 py-2" aria-label="Termine">
          {appointments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 py-1 text-sm">
              <span className="w-11 shrink-0 tabular-nums text-muted">{a.time}</span>
              <span className={`h-2 w-2 shrink-0 rounded-full ${personDotClass(a.personId, profile.persons)}`} aria-hidden />
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
    else router.push(data.planStyle === "spontan" ? "/ideen" : "/wochenplan");
  };
  return (
    <section className="flex items-start gap-2.5" aria-label="Willkommen zurück">
      <HelperAvatar size={40} variant="badge" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="rounded-2xl rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-snug text-ink">
          Hey, schön, dass du da bist! 😊 {isSolo(profile) ? "Hattest du" : "Hattet ihr"} eine gute Zeit? Frisch starten oder noch Pause?
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

/** Drei kleine Karten nebeneinander mit Live-Inhalt */
export function BentoCards({ data }: { data: HomeData }) {
  const shopping = useWeekShoppingList("planning");
  const recipeCount = Object.keys(data.recipes).length;
  const pantryUsed = usePantryUsed();
  const pantryCount = usePantry()?.length ?? 0;
  const tomorrowDish = data.tomorrow && !data.tomorrow.away ? data.tomorrow.slot.entry?.title : undefined;
  const count = shopping?.list.openCount ?? 0;
  const ideaCount = Math.min(3, useTodayIdeas()?.ideas.length ?? 0);
  // Für welchen Einkauf: nächster Einkaufstag, heute oder die laufende Woche
  const forLabel = !shopping
    ? ""
    : data.planStyle === "spontan"
      ? "Einkaufsliste"
    : shopping.isNext
      ? `Für ${data.profile.shoppingDay || "Montag"}`
      : shopping.weekStart === data.todayIso
        ? "Für heute"
        : "Diese Woche";
  return (
    <nav aria-label="Bereiche" className="mt-auto grid grid-cols-3 gap-2.5">
      {data.planStyle === "spontan" ? (
        <BentoCard href="/ideen" label="Ideen" icon={Lightbulb} value={ideaCount ? `${ideaCount} für heute` : "Für heute"} />
      ) : (
        <BentoCard
          href="/wochenplan"
          label="Woche"
          icon={CalendarDays}
          // "Mal so, mal so": freie Tage sind normal – kein Zähler
          value={tomorrowDish ? `Morgen: ${tomorrowDish}` : data.planStyle === "mix" ? "Plan & Ideen" : `${data.week.planned}/${data.week.total} geplant`}
        />
      )}
      <div className="relative">
        {count > 0 ? (
          <BentoCard href="/einkaufsliste" label="Einkauf" icon={ShoppingCart} value={forLabel} sub={`${count} ${count === 1 ? "Sache" : "Sachen"}`} />
        ) : (
          // Leere Liste: nur Titel und Plus
          <BentoCard href="/einkaufsliste" label={"Einkaufs\u00ADliste"} icon={ShoppingCart} />
        )}
        {shopping && <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} small className="absolute -right-1.5 -top-1.5" />}
      </div>
      {/* Dritte Kachel: Vorrat, sobald er je genutzt wurde – sonst Rezepte */}
      {pantryUsed ? (
        <BentoCard href="/vorrat" label="Vorrat" icon={Refrigerator} value={`${pantryCount} ${pantryCount === 1 ? "Sache" : "Sachen"}`} />
      ) : (
        <BentoCard href="/kochbuch" label="Rezepte" icon={BookOpen} value={`${recipeCount} ${recipeCount === 1 ? "Rezept" : "Rezepte"}`} />
      )}
    </nav>
  );
}

function BentoCard({ href, label, icon: Icon, value, sub }: { href: string; label: string; icon: LucideIcon; value?: string; sub?: string }) {
  return (
    <Link href={href} className={`${CARD} flex h-full flex-col gap-0.5 px-3 py-2.5 transition active:scale-[0.98]`}>
      <Icon className="mb-0.5 h-4.5 w-4.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
      <span className="hyphens-manual text-[13px] font-bold leading-tight text-muted">{label}</span>
      {value && <span className={`${sub ? "truncate" : "line-clamp-2"} text-sm font-bold leading-snug text-ink`}>{value}</span>}
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </Link>
  );
}

/**
 * Unten fest: breiter Knopf "Spontan kochen" und darunter die Eingabeleiste
 * "Sag <Name>, was ansteht …" mit Mikrofon im Feld.
 */
export function HomeBottomBar({ name }: { name: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-linear-to-t from-background via-background to-transparent px-4 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-lg flex-col gap-2">
        <button
          type="button"
          onClick={() => openHelper("spontan")}
          className="flex h-13 items-center gap-3 rounded-2xl border-2 border-accent/60 bg-surface px-1.5 text-left shadow-card transition active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xl" aria-hidden>
            🥕
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold leading-tight">Spontan kochen</span>
            <span className="block text-sm leading-tight text-muted">mit dem, was da ist</span>
          </span>
          <ChevronRight className="mr-1 h-5 w-5 shrink-0 text-accent" strokeWidth={2.25} aria-hidden />
        </button>
        <div className="flex h-15 items-center gap-2 rounded-full border border-line bg-surface pl-1.5 pr-1.5 shadow-card">
          <button type="button" onClick={() => openHelper()} className="flex h-full min-w-0 flex-1 items-center gap-2 text-left">
            <HelperAvatar size={44} variant="badge" />
            <span className="truncate text-base text-muted">Sag {name}, was ansteht …</span>
          </button>
          <button
            type="button"
            onClick={() => openHelper("voice")}
            aria-label={`${name} etwas sagen`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-md transition active:scale-95"
          >
            <Mic className="h-6 w-6" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
