"use client";

import Link from "next/link";
import { Settings, Users } from "lucide-react";
import { IconBadge } from "@/components/ui/IconBadge";
import { CARD, buttonClass } from "@/components/ui/styles";
import { MEAL_TIME_LABELS } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";

/**
 * "Hallo Familie Müller" unter dem Logo. Steht "Familie" schon im
 * Haushaltsnamen, wird es nicht verdoppelt. Ohne Namen: nichts.
 */
export function FamilyGreeting() {
  const profile = useProfile();
  const name = profile?.householdName.trim() ?? "";
  // Feste Höhe, damit beim Laden nichts springt
  return (
    <p className="min-h-6 text-base text-muted">
      {name && (/^familie\s/i.test(name) ? `Hallo ${name}` : `Hallo Familie ${name}`)}
    </p>
  );
}

/** Nur ohne Profil: Einladung, das Haushaltsprofil anzulegen. */
export function WelcomeCard() {
  const profile = useProfile();
  if (profile !== null) return null;
  return (
    <section className={`${CARD} p-5`}>
      <div className="flex items-center gap-3">
        <IconBadge icon={Users} />
        <h2 className="text-xl font-extrabold tracking-tight">Willkommen! 👋</h2>
      </div>
      <p className="mt-3 text-base text-muted">
        Erzähl uns kurz von deinem Haushalt – dann passen alle Vorschläge zu euch.
      </p>
      <Link href="/profil" className={`${buttonClass("primary", "lg")} mt-4 w-full`}>
        Haushaltsprofil anlegen
      </Link>
    </section>
  );
}

/** Kompakte Haushalts-Zeile ganz unten, z. B. "5 Personen · zusammen warm abends, Sa–So mittags". */
export function HouseholdRow() {
  const profile = useProfile();

  if (profile === undefined) {
    return <div className={`${CARD} h-14 animate-pulse`} />;
  }
  if (profile === null) return null;

  const count = profile.persons.length;
  const weekday = MEAL_TIME_LABELS[profile.warmMeal.weekday];
  const weekend = MEAL_TIME_LABELS[profile.warmMeal.weekend];

  return (
    <Link
      href="/profil"
      aria-label="Haushaltsprofil bearbeiten"
      className={`${CARD} flex min-h-14 items-center gap-3 px-4 py-3 text-sm text-muted transition active:scale-[0.99]`}
    >
      <span className="flex-1">
        <span className="whitespace-nowrap font-semibold text-ink">
          {count} {count === 1 ? "Person" : "Personen"}
        </span>
        {" · "}
        <span className="whitespace-nowrap">zusammen warm {weekday}</span>
        {weekend !== weekday && (
          <>
            {", "}
            <span className="whitespace-nowrap">Sa–So {weekend}</span>
          </>
        )}
      </span>
      <Settings className="h-5 w-5 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
    </Link>
  );
}
