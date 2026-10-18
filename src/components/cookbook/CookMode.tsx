"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CARD, FAB_CLEARANCE, PAGE_MAIN, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { formatAmount, useRecipes } from "@/lib/cookbook";

/** Schritt für Schritt kochen: erst die Zutaten, dann ein Schritt pro Seite */
export function CookMode() {
  const params = useSearchParams();
  const { bfcacheId } = useRouter();
  const id = params.get("id") ?? "";
  // Jeder neue Aufruf beginnt wieder bei den Zutaten
  return <CookSteps key={`${bfcacheId}|${id}`} id={id} />;
}

function CookSteps({ id }: { id: string }) {
  const recipes = useRecipes();
  const [step, setStep] = useState(0);
  useWakeLock();

  if (recipes === undefined) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const recipe = recipes[id];
  if (!recipe) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <PageHeader title="Schritt für Schritt" backHref="/kochbuch" />
        <main className={`flex flex-col items-center gap-4 px-6 pt-10 text-center ${FAB_CLEARANCE}`}>
          <p className="text-base">Dieses Rezept gibt es nicht (mehr).</p>
          <Link href="/kochbuch" className={buttonClass("secondary")}>
            Zum Kochbuch
          </Link>
        </main>
      </div>
    );
  }

  // 0 = Zutaten, 1…n = Schritte, n+1 = fertig
  const total = recipe.steps.length;
  const done = step > total;
  const back = `/kochbuch/rezept?id=${encodeURIComponent(recipe.id)}`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Schritt für Schritt" backHref={back} />
      <main className={PAGE_MAIN}>
        <div>
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight">{recipe.title}</h2>
          <div className="mt-3 flex gap-1" aria-hidden>
            {Array.from({ length: total + 1 }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-stone-200"}`} />
            ))}
          </div>
        </div>

        {step === 0 ? (
          <section className={`${CARD} p-4`} aria-label="Zutaten">
            <h3 className={`${SECTION_TITLE} mb-2`}>Das brauchst du ({recipe.servings} Personen)</h3>
            {recipe.ingredients.length === 0 ? (
              <p className="text-sm text-muted">Keine Zutaten eingetragen.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recipe.ingredients.map((i) => (
                  <li key={i.id} className="flex gap-3 py-2 text-base">
                    <span className="w-20 shrink-0 whitespace-nowrap text-right font-semibold text-muted">
                      {formatAmount(i.amount)} {i.unit}
                    </span>
                    <span>{i.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : done ? (
          <section className={`${CARD} flex flex-col items-center gap-2 p-6 text-center`} aria-label="Fertig">
            <span className="text-5xl" aria-hidden>
              😋
            </span>
            <p className="text-xl font-extrabold">Fertig – guten Appetit!</p>
          </section>
        ) : (
          <section className={`${CARD} flex flex-col gap-3 p-5`} aria-label={`Schritt ${step}`} aria-live="polite">
            <p className="text-sm font-bold uppercase tracking-wider text-accent">
              Schritt {step} von {total}
            </p>
            <p className="text-xl leading-relaxed">{recipe.steps[step - 1]}</p>
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
              {step === 0 ? "Los geht's" : step === total ? "Fertig" : "Weiter"}
              <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

/** Bildschirm beim Kochen anlassen (wo der Browser das kann) */
function useWakeLock() {
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<Sentinel> } };
    let sentinel: Sentinel | null = null;
    let cancelled = false;
    const request = () =>
      nav.wakeLock
        ?.request("screen")
        .then((s) => {
          if (cancelled) void s.release();
          else sentinel = s;
        })
        .catch(() => {});
    void request();
    // Nach dem Zurückkehren in die App neu anfordern
    const onVisible = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, []);
}
