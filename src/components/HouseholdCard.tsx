"use client";

import Link from "next/link";
import { formatWarmMeals } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";

/** Zeigt auf der Startseite den Stand des Haushaltsprofils. */
export function HouseholdCard() {
  const profile = useProfile();

  if (profile === undefined) {
    return <div className="h-32 animate-pulse rounded-3xl bg-white/70" />;
  }

  if (profile === null) {
    return (
      <section className="rounded-3xl bg-orange-500 p-5 text-white shadow-md">
        <h2 className="text-xl font-extrabold">Willkommen! 👋</h2>
        <p className="mt-1 text-lg">
          Erzähl uns kurz von deinem Haushalt – dann passen alle Vorschläge zu
          euch.
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

  const allergyCount = new Set(profile.persons.flatMap((p) => p.allergies)).size;
  const adults = `${profile.adults} ${profile.adults === 1 ? "Erwachsene:r" : "Erwachsene"}`;
  const kids = `${profile.kids} ${profile.kids === 1 ? "Kind" : "Kinder"}`;
  const weekday = formatWarmMeals(profile.warmMeal.weekday);
  const weekend = formatWarmMeals(profile.warmMeal.weekend);

  return (
    <section className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm">
      <span className="text-4xl" aria-hidden>
        🏡
      </span>
      <div className="flex-1">
        <h2 className="text-xl font-extrabold">
          {profile.householdName.trim() || "Euer Haushalt"}
        </h2>
        {/* Zahl und Wort zusammenhalten – kein Umbruch zwischen "1" und "Kind" */}
        <p className="text-stone-600">
          <span className="whitespace-nowrap">{adults}</span>
          {profile.kids > 0 && (
            <>
              {" · "}
              <span className="whitespace-nowrap">{kids}</span>
            </>
          )}
        </p>
        <p className="text-stone-600">
          Warm essen: {weekday}
          {weekend !== weekday && ` (Wochenende: ${weekend})`}
          {allergyCount > 0 && (
            <>
              {" · "}
              <span className="whitespace-nowrap">
                {allergyCount} {allergyCount === 1 ? "Allergie" : "Allergien"}
              </span>
            </>
          )}
        </p>
      </div>
      <Link
        href="/profil"
        className="rounded-2xl bg-orange-100 px-4 py-3 font-bold text-orange-700 active:scale-95"
      >
        Ändern
      </Link>
    </section>
  );
}
