"use client";

// Kochmodus (Tafel 122): dunkler Bildschirm, oben „✕“ (beendet ohne
// Nachfrage, der Schritt bleibt für heute gemerkt), „Schritt 3 von 6“ und
// Punkte. Ein Schritt pro Bildschirm, große Schrift (gut lesbar aus einem
// Meter). Steht eine Zeit im Schritt, gibt es „Timer 10 Min“ – derselbe Timer
// wie überall (`timer/`), er läuft beim Blättern weiter und meldet sich mit
// Ton und Karte. Unten „Zurück“ und „Weiter“ (je 56 px), Wischen geht auch.
// Bildschirm bleibt an (Wake Lock, wo es geht). Mia hört mit, wenn das Mikro
// an ist (`KochOhr`). Letzter Schritt: „Gegessen“ (beim Gericht von heute).

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Timer, Volume2, VolumeX, X } from "lucide-react";
import { useWakeLock } from "@/lib/core/wakeLock";
import { todayIso } from "@/lib/core/now";
import { endCooking, markStepsBefore, setCookAt, stepTimerName, useCooking } from "@/lib/essen/kochSession";
import { startSchritt, type KochBefehl } from "@/lib/essen/kochModus";
import { startStepTimer } from "@/lib/timer/actions";
import { formatAmount, personsParam, scaledAmount, useRecipes, type Recipe } from "@/lib/essen/cookbook";
import { useRecipeLookup } from "@/lib/essen/baking";
import { kidStepLabel, ovenText, stepMinutes } from "@/lib/essen/baking/steps";
import { personLabel, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { saveSpeechSettings, speak, speechSupported, stopSpeaking, unlockSpeech, useSpeechSettings } from "@/lib/begleitung/speech";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { MachineToggle, MachineStepView, useMachineView } from "@/components/essen/rezepte/MachineSteps";
import { KochTimerLeiste } from "@/components/timer/KochTimerLeiste";
import { KochOhr } from "@/components/essen/rezepte/KochOhr";
import { gegessen, useHeuteGericht } from "@/components/essen/rezepte/heuteGericht";

/** Schritt für Schritt kochen bzw. "Zusammen backen" */
export function CookMode() {
  const params = useSearchParams();
  const { bfcacheId } = useRouter();
  const id = params.get("id") ?? "";
  // "?personen=2": die im Rezept gewählte Personenzahl
  const persons = personsParam(params.get("personen"));
  return <CookSteps key={`${bfcacheId}|${id}|${persons}`} id={id} persons={persons} />;
}

const FRAME = "fixed inset-0 z-40 flex flex-col bg-cook text-cook-ink";
const BIG = "flex h-14 items-center justify-center gap-1 rounded-field text-[18px] font-extrabold active:scale-[0.98]";
/** Wischen: so weit (px) zur Seite, und nicht vom linken Rand (dort ist „eine Ebene zurück“) */
const SWIPE_PX = 60;
const EDGE_PX = 28;

function CookSteps({ id, persons }: { id: string; persons: number | null }) {
  const router = useRouter();
  const lookup = useRecipeLookup();
  const recipes = useRecipes();
  const profile = useProfile();
  const heute = useHeuteGericht();
  const session = useCooking(todayIso());
  const [step, setStep] = useState<number | null>(null);
  const machine = useMachineView(profile);
  const speech = useSpeechSettings();
  const reading = speech.mode === "an";
  const [said, setSaid] = useState("");
  const swipe = useRef<{ x: number; y: number } | null>(null);
  useWakeLock();
  // Beim Verlassen nicht weiterreden
  useEffect(() => () => stopSpeaking(), []);
  // Jeder Schritt wird beim Öffnen vorgelesen, wenn Vorlesen an ist
  useEffect(() => {
    if (reading && said) speak(said, { id: "kochen", gender: profile?.helper.voice });
  }, [said, reading, profile?.helper.voice]);
  const recipe = lookup?.(id);
  const useMachine = Boolean(recipe && machine.on && recipe.machineSteps.length > 0);
  // Schritt für heute merken (✕ und Kachel „Schritt 3 von 6“); die Schritte davor gelten als erledigt
  useEffect(() => {
    if (!recipe || step === null) return;
    setCookAt(recipe.id, step);
    if (step >= 1 && !useMachine) markStepsBefore(recipe.id, Math.min(step - 1, recipe.steps.length));
  }, [step, recipe, useMachine]);

  if (lookup === undefined || profile === undefined || session === undefined || recipes === undefined) return <div className={FRAME} />;
  if (!recipe) {
    return (
      <div className={`${FRAME} items-center justify-center gap-4 px-6 text-center`}>
        <p className="text-lg">Dieses Rezept gibt es nicht (mehr).</p>
        <Link href="/kochbuch" className={`${BIG} bg-on-color px-6 text-on-photo-dark`}>
          Zu den Rezepten
        </Link>
      </div>
    );
  }

  const baking = recipe.kind === "backen";
  const steps = useMachine ? recipe.machineSteps.map((m) => m.text) : recipe.steps;
  const total = steps.length;
  // Wieder einsteigen, wo ✕ heute war (sonst bei den Zutaten)
  if (step === null) {
    setStep(startSchritt(session.at[recipe.id], total));
    return <div className={FRAME} />;
  }
  const isToday = Boolean(heute && heute.recipeId === recipe.id && !heute.over);
  // Backen bleibt beim Rezept (Stück), Kochen nimmt die gewählten Personen (beim Gericht von heute: der Haushalt)
  const servings = baking ? recipe.servings : (persons ?? (isToday ? heute?.persons : null) ?? recipe.servings);
  const amountOf = (amount: number | null) => (baking ? amount : scaledAmount(amount, recipe.servings, servings));
  const back = `/kochbuch/rezept?id=${encodeURIComponent(recipe.id)}${!baking && persons ? `&personen=${persons}` : ""}`;
  const current = step >= 1 && step <= total ? steps[step - 1] : "";
  const minutes = current ? stepMinutes(current) : null;
  const kid = !useMachine && step >= 1 ? kidFor(recipe, step - 1, profile) : null;
  const spoken = stepSpeech(recipe, step, total, current, kid, amountOf);
  if (spoken !== said) setSaid(spoken);
  const last = step >= total;

  const go = (to: number) => setStep(Math.min(Math.max(0, to), total));
  const finish = () => {
    if (isToday && heute) {
      gegessen(heute, recipes);
      router.push("/");
      return;
    }
    endCooking(recipe.id);
    router.push(back);
  };
  const timer = (min: number, name?: string) => {
    unlockSpeech();
    startStepTimer(current || `Timer ${min} Min`, min, name || (current ? stepTimerName(current) : ""));
  };
  const onBefehl = (b: KochBefehl) => {
    if (b.kind === "weiter") return last ? undefined : go(step + 1);
    if (b.kind === "zurueck") return go(step - 1);
    if (b.kind === "nochmal") return speak(spoken, { id: "kochen", gender: profile?.helper.voice });
    if (b.kind === "timer") return timer(b.minutes, b.name);
    return last ? finish() : go(step + 1);
  };
  const toggleReading = () => {
    unlockSpeech();
    if (reading) {
      saveSpeechSettings({ mode: "aus" });
      stopSpeaking();
    } else saveSpeechSettings({ mode: "an" });
  };

  return (
    <div className={`${FRAME} px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)]`} data-kochmodus>
      <header className="flex items-center gap-2">
        <Link href={back} aria-label="Kochmodus beenden" className="hit -ml-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-cook-soft" data-koch-ende>
          <X className="h-6 w-6" strokeWidth={2.25} aria-hidden />
        </Link>
        <p className="min-w-0 flex-1 truncate text-[17px] font-extrabold" aria-live="polite" data-koch-schritt>
          {step === 0 ? "Zutaten" : `Schritt ${step} von ${total}`}
        </p>
        <span className="flex gap-1.5" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i < step ? "bg-accent" : "border border-cook-muted"}`} />
          ))}
        </span>
        {speechSupported() && (
          <button type="button" onClick={toggleReading} aria-pressed={reading} aria-label={reading ? "Vorlesen aus" : "Vorlesen an"} className="hit -mr-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-cook-soft">
            {reading ? <Volume2 className="h-5 w-5" strokeWidth={2.25} aria-hidden /> : <VolumeX className="h-5 w-5 text-cook-muted" strokeWidth={2.25} aria-hidden />}
          </button>
        )}
      </header>

      <div className="mt-2">
        <KochTimerLeiste dunkel />
      </div>

      <main
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-6"
        onPointerDown={(e) => (swipe.current = e.clientX > EDGE_PX ? { x: e.clientX, y: e.clientY } : null)}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(e.clientY - s.y)) return;
          if (dx < 0 && !last) go(step + 1);
          if (dx > 0) go(step - 1);
        }}
        data-no-swipe
      >
        {step === 0 ? (
          <section className="flex flex-col gap-3" aria-label="Zutaten">
            <h1 className="text-[26px] font-extrabold leading-tight">{recipe.title}</h1>
            {(recipe.oven || recipe.pan) && <p className="text-[17px] font-semibold text-cook-muted">{[recipe.oven ? ovenText(recipe.oven) : "", recipe.pan].filter(Boolean).join(" · ")}</p>}
            <p className="text-[15px] font-bold text-cook-muted">
              Für {servings} {baking ? "Stück" : servings === 1 ? "Person" : "Personen"}
            </p>
            {recipe.ingredients.length === 0 ? (
              <p className="text-[18px] text-cook-muted">Keine Zutaten eingetragen.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[19px]">
                {recipe.ingredients.map((i) => (
                  <li key={i.id} className="flex gap-3">
                    <span className="w-24 shrink-0 whitespace-nowrap text-right font-bold text-cook-muted">
                      {formatAmount(amountOf(i.amount))} {i.unit}
                    </span>
                    <span>{i.name}</span>
                  </li>
                ))}
              </ul>
            )}
            {recipe.machineSteps.length > 0 && <MachineToggle view={machine} />}
          </section>
        ) : (
          <section className="flex flex-col gap-5" aria-label={`Schritt ${step}`}>
            {kid && <p className="self-start rounded-field bg-cook-soft px-3 py-2 text-[17px] font-bold">{kid} darf jetzt:</p>}
            <p className="text-[24px] font-bold leading-snug" data-koch-text>
              {current}
            </p>
            {useMachine && <MachineStepView step={recipe.machineSteps[step - 1]} />}
            {minutes !== null && (
              <button type="button" onClick={() => timer(minutes)} className="flex h-12 items-center gap-2 self-start rounded-full bg-accent px-5 text-[17px] font-extrabold text-on-accent active:scale-[0.97]" data-koch-timer>
                <Timer className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                Timer {minutes} Min
              </button>
            )}
          </section>
        )}
      </main>

      <div className="grid grid-cols-2 gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => go(step - 1)} className={`${BIG} bg-cook-soft`}>
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Zurück
          </button>
        ) : (
          <Link href={back} className={`${BIG} bg-cook-soft`}>
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Rezept
          </Link>
        )}
        {last && step > 0 ? (
          <button type="button" onClick={finish} className={`${BIG} bg-on-color text-on-photo-dark`} data-koch-fertig>
            {isToday ? "Gegessen" : "Fertig"}
          </button>
        ) : (
          <button type="button" onClick={() => go(step + 1)} className={`${BIG} bg-on-color text-on-photo-dark`} data-koch-weiter>
            {step === 0 ? "Los geht’s" : "Weiter"}
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        )}
      </div>
      <div className="mt-3">
        <KochOhr onBefehl={onBefehl} />
      </div>
    </div>
  );
}

/** Was beim Vorlesen gesagt wird: Zutaten oder ein Schritt */
function stepSpeech(recipe: Recipe, step: number, total: number, current: string, kid: string | null, amountOf: (amount: number | null) => number | null): string {
  if (step === 0) {
    const items = recipe.ingredients.map((i) => [formatAmount(amountOf(i.amount)), i.unit, i.name].filter(Boolean).join(" "));
    return items.length ? `${recipe.title}. Das brauchst du: ${items.join(", ")}.` : recipe.title;
  }
  return `Schritt ${step} von ${total}. ${kid ? `${kid} darf jetzt: ` : ""}${current}`;
}

/** Kinder-Schritt: nur mit Kindern im Haushalt, Namen reihum */
function kidFor(recipe: Recipe, index: number, profile: HouseholdProfile | null): string | null {
  if (!profile) return null;
  const kids = profile.persons.filter((p) => p.role === "kind");
  const order = recipe.kidSteps.indexOf(index);
  if (!kids.length || order < 0) return null;
  return kidStepLabel(kids.map((k) => personLabel(k, profile.persons)), order);
}
