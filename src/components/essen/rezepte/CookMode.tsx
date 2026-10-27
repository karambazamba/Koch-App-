"use client";

import { useWakeLock } from "@/lib/core/wakeLock";
import { markStepsBefore } from "@/lib/essen/kochSession";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChefHat, ChevronLeft, ChevronRight, RotateCcw, Timer, Volume2, VolumeX, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, FAB_CLEARANCE, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { formatAmount, personsParam, scaledAmount, type Recipe } from "@/lib/essen/cookbook";
import { useRecipeLookup } from "@/lib/essen/baking";
import { kidStepLabel, ovenText, stepMinutes } from "@/lib/essen/baking/steps";
import { personLabel, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { saveSpeechSettings, speak, speechSupported, stopSpeaking, unlockSpeech, useSpeechSettings } from "@/lib/begleitung/speech";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { MachineToggle, MachineStepView, useMachineView } from "@/components/essen/rezepte/MachineSteps";

/** Schritt für Schritt kochen bzw. "Zusammen backen" */
export function CookMode() {
  const params = useSearchParams();
  const { bfcacheId } = useRouter();
  const id = params.get("id") ?? "";
  // "?personen=2": die im Rezept gewählte Personenzahl
  const persons = personsParam(params.get("personen"));
  // Jeder neue Aufruf beginnt wieder bei den Zutaten
  return <CookSteps key={`${bfcacheId}|${id}|${persons}`} id={id} persons={persons} />;
}

type RunningTimer = { label: string; endsAt: number; minutes: number };

function CookSteps({ id, persons }: { id: string; persons: number | null }) {
  const lookup = useRecipeLookup();
  const profile = useProfile();
  const [step, setStep] = useState(0);
  const [timer, setTimer] = useState<RunningTimer | null>(null);
  const machine = useMachineView(profile);
  const speech = useSpeechSettings();
  const reading = speech.mode === "an";
  const [said, setSaid] = useState("");
  useWakeLock();
  // Beim Verlassen nicht weiterreden
  useEffect(() => () => stopSpeaking(), []);
  // Jeder Schritt wird beim Öffnen vorgelesen, wenn Vorlesen an ist
  useEffect(() => {
    if (reading && said) speak(said, { id: "kochen", gender: profile?.helper.voice });
  }, [said, reading, profile?.helper.voice]);
  // Schritt für die Koch-Kachel merken („Schritt 3 von 6“; Maschinen-Schritte zählen anders)
  useEffect(() => {
    const r = lookup?.(id);
    if (!r || step < 1 || (machine.on && r.machineSteps.length > 0)) return;
    markStepsBefore(r.id, Math.min(step - 1, r.steps.length));
  }, [step, id, lookup, machine.on]);

  if (lookup === undefined || profile === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const recipe = lookup(id);
  if (!recipe) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <PageHeader title="Schritt für Schritt" backHref="/kochbuch" />
        <main className={`flex flex-col items-center gap-4 px-6 pt-10 text-center ${FAB_CLEARANCE}`}>
          <p className="text-base">Dieses Rezept gibt es nicht (mehr).</p>
          <Link href="/kochbuch" className={buttonClass("secondary")}>
            Zu den Rezepten
          </Link>
        </main>
      </div>
    );
  }

  const baking = recipe.kind === "backen";
  // Backen bleibt beim Rezept (Stück), Kochen nimmt die gewählten Personen
  const servings = baking ? recipe.servings : (persons ?? recipe.servings);
  const amountOf = (amount: number | null) => (baking ? amount : scaledAmount(amount, recipe.servings, servings));
  const useMachine = machine.on && recipe.machineSteps.length > 0;
  const steps = useMachine ? recipe.machineSteps.map((m) => m.text) : recipe.steps;
  // 0 = Zutaten, 1…n = Schritte, n+1 = fertig
  const total = steps.length;
  const done = step > total;
  const back = `/kochbuch/rezept?id=${encodeURIComponent(recipe.id)}${!baking && servings !== recipe.servings ? `&personen=${servings}` : ""}`;
  const current = step >= 1 && step <= total ? steps[step - 1] : "";
  const minutes = current ? stepMinutes(current) : null;
  const kid = !useMachine && step >= 1 && !done ? kidFor(recipe, step - 1, profile) : null;
  const spoken = stepSpeech(recipe, step, total, current, kid, baking, amountOf);
  if (spoken !== said) setSaid(spoken);
  const toggleReading = () => {
    unlockSpeech();
    if (reading) {
      saveSpeechSettings({ mode: "aus" });
      stopSpeaking();
    } else {
      saveSpeechSettings({ mode: "an" });
    }
  };
  const again = () => {
    unlockSpeech();
    speak(spoken, { id: "kochen", gender: profile?.helper.voice });
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={baking ? "Zusammen backen" : "Schritt für Schritt"} backHref={back} />
      <main className={PAGE_MAIN}>
        <div>
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight">{recipe.title}</h2>
          <div className="mt-3 flex gap-1" aria-hidden>
            {Array.from({ length: total + 1 }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-fill-strong"}`} />
            ))}
          </div>
        </div>

        {recipe.machineSteps.length > 0 && <MachineToggle view={machine} />}

        {speechSupported() && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={toggleReading} aria-pressed={reading} className={chipClass(reading)}>
              {reading ? <Volume2 className="h-4 w-4" strokeWidth={2.25} aria-hidden /> : <VolumeX className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
              Vorlesen {reading ? "an" : "aus"}
            </button>
            <button type="button" onClick={again} className={chipClass(false)}>
              <RotateCcw className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Nochmal
            </button>
          </div>
        )}

        {timer && <TimerBar timer={timer} onClear={() => setTimer(null)} />}

        {step === 0 ? (
          <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Zutaten">
            {(recipe.oven || recipe.pan) && (
              <p className="rounded-field bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-strong">
                {[recipe.oven ? ovenText(recipe.oven) : "", recipe.pan].filter(Boolean).join(" · ")}
              </p>
            )}
            <h3 className={SECTION_TITLE}>Das brauchst du ({servings} {baking ? "Stück" : servings === 1 ? "Person" : "Personen"})</h3>
            {recipe.ingredients.length === 0 ? (
              <p className="text-sm text-muted">Keine Zutaten eingetragen.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recipe.ingredients.map((i) => (
                  <li key={i.id} className="flex gap-3 py-2 text-base">
                    <span className="w-20 shrink-0 whitespace-nowrap text-right font-semibold text-muted">
                      {formatAmount(amountOf(i.amount))} {i.unit}
                    </span>
                    <span>{i.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : done ? (
          <section className={`${CARD} flex flex-col items-center gap-2 p-6 text-center`} aria-label="Fertig">
            <ChefHat className="h-12 w-12 text-accent" strokeWidth={1.75} aria-hidden />
            <p className="text-xl font-extrabold">{baking ? "Fertig – lasst es euch schmecken!" : "Fertig – guten Appetit!"}</p>
          </section>
        ) : (
          <section className={`${CARD} flex flex-col gap-3 p-5`} aria-label={`Schritt ${step}`} aria-live="polite">
            <p className="text-sm font-bold text-accent">
              Schritt {step} von {total}
            </p>
            {kid && <p className="rounded-field bg-accent-soft px-3 py-2 text-base font-bold text-accent-strong">{kid} darf jetzt:</p>}
            <p className="text-xl leading-relaxed">{current}</p>
            {useMachine && <MachineStepView step={recipe.machineSteps[step - 1]} />}
            {minutes !== null && (!timer || timer.label !== current) && (
              <button
                type="button"
                onClick={() => setTimer({ label: current, minutes, endsAt: Date.now() + minutes * 60_000 })}
                className={`${chipClass(false)} self-start`}
              >
                <Timer className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                {minutes} Min – ich sag Bescheid
              </button>
            )}
          </section>
        )}

        {/* Weiter/Zurück am Inhaltsende, nicht fixiert */}
        <div className="grid grid-cols-2 gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className={buttonClass("secondary", "lg")}>
              <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              Zurück
            </button>
          ) : (
            <Link href={back} className={buttonClass("secondary", "lg")}>
              Rezept
            </Link>
          )}
          {done ? (
            <Link href="/" className={buttonClass("primary", "lg")}>
              Zur Startseite
            </Link>
          ) : (
            <button type="button" onClick={() => setStep((s) => s + 1)} className={buttonClass("primary", "lg")}>
              {step === 0 ? "Los geht’s" : step === total ? "Fertig" : "Weiter"}
              <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

/** Was beim Vorlesen gesagt wird: Zutaten, ein Schritt oder "Fertig" */
function stepSpeech(recipe: Recipe, step: number, total: number, current: string, kid: string | null, baking: boolean, amountOf: (amount: number | null) => number | null): string {
  if (step === 0) {
    const items = recipe.ingredients.map((i) => [formatAmount(amountOf(i.amount)), i.unit, i.name].filter(Boolean).join(" "));
    return items.length ? `${recipe.title}. Das brauchst du: ${items.join(", ")}.` : recipe.title;
  }
  if (step > total) return baking ? "Fertig – lasst es euch schmecken!" : "Fertig – guten Appetit!";
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

/** Sichtbarer Timer – läuft über alle Schritte weiter, am Ende Ton und Vibration */
function TimerBar({ timer, onClear }: { timer: RunningTimer; onClear: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const rang = useRef(false);
  const left = Math.max(0, timer.endsAt - now);
  const finished = left === 0;

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [finished]);
  useEffect(() => {
    if (!finished || rang.current) return;
    rang.current = true;
    ring();
  }, [finished]);

  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);
  return (
    <div role="timer" aria-live={finished ? "assertive" : "off"} className={`sticky top-2 z-10 flex items-center gap-3 rounded-card px-4 py-3 shadow-card ${finished ? "bg-accent text-on-accent" : "border border-line bg-surface"}`}>
      <Timer className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold tabular-nums">{finished ? "Zeit ist um!" : `${mm}:${String(ss).padStart(2, "0")}`}</span>
        <span className={`block truncate text-xs ${finished ? "text-on-accent/90" : "text-muted"}`}>{timer.label}</span>
      </span>
      <button type="button" onClick={onClear} aria-label={finished ? "Timer schließen" : "Timer abbrechen"} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-scrim">
        <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}

/** Kurzer Gong (Web Audio) und Vibration – wo der Browser das kann */
function ring() {
  try {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  } catch {
    // kein Vibrieren möglich
  }
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.3);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    // kein Ton möglich
  }
}

