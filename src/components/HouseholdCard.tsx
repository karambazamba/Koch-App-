"use client";

import Link from "next/link";
import { formatWarmMeals } from "@/lib/profile";
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
    <p className="min-h-6 text-base text-stone-500">
      {name && (/^familie\s/i.test(name) ? `Hallo ${name}` : `Hallo Familie ${name}`)}
    </p>
  );
}

/** Nur ohne Profil: Einladung, das Haushaltsprofil anzulegen. */
export function WelcomeCard() {
  const profile = useProfile();
  if (profile !== null) return null;
  return (
    <section className="rounded-3xl bg-orange-500 p-5 text-white shadow-md">
      <h2 className="text-xl font-extrabold">Willkommen! 👋</h2>
      <p className="mt-1 text-lg">
        Erzähl uns kurz von deinem Haushalt – dann passen alle Vorschläge zu euch.
      </p>
      <Link
        href="/profil"
        className="mt-4 flex h-14 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-orange-600 active:scale-95"
      >
        Haushaltsprofil anlegen
      </Link>
    </section>
  );
}

/** Kompakte Haushalts-Zeile ganz unten, z. B. "5 Personen · warm mittags & abends". */
export function HouseholdRow() {
  const profile = useProfile();

  if (profile === undefined) {
    return <div className="h-14 animate-pulse rounded-2xl bg-white/70" />;
  }
  if (profile === null) return null;

  const count = profile.persons.length;
  const weekday = formatWarmMeals(profile.warmMeal.weekday);
  const weekend = formatWarmMeals(profile.warmMeal.weekend);

  return (
    <Link
      href="/profil"
      aria-label="Haushaltsprofil bearbeiten"
      className="flex min-h-14 items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-stone-600 shadow-sm active:scale-[0.98]"
    >
      <span className="flex-1 text-base">
        <span className="whitespace-nowrap font-semibold text-stone-700">
          {count} {count === 1 ? "Person" : "Personen"}
        </span>
        {" · "}
        <span className="whitespace-nowrap">warm {weekday}</span>
        {weekend !== weekday && (
          <>
            {", "}
            <span className="whitespace-nowrap">Sa–So {weekend}</span>
          </>
        )}
      </span>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-6 w-6 shrink-0 fill-none stroke-stone-400"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    </Link>
  );
}
