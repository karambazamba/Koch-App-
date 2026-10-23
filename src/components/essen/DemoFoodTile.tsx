"use client";

// ESSEN im Beispiel-Tag: das Beispielgericht mit Bild vollflächig, unten ein
// weicher dunkler Verlauf mit weißer Schrift ("ESSEN · 18:30", Name, "alles im
// Haus · 25 Min"). Nach dem Essen (18:30 + 90 Min) das zweite Beispielgericht
// für morgen ("MORGEN · Do · 18:30"). Antippen = Beispiel-Rezept. (Das Schild BEISPIEL steht
// nur einmal oben in der Beispiel-Zeile.)

import Link from "next/link";
import { demoDishAt } from "@/lib/essen/demoDish";
import { tomorrowLabel } from "@/lib/kalender/model";
import { addDays } from "@/lib/core/now";
import { DishPicture } from "@/components/essen/DishPicture";
import { KochtippHat } from "@/components/essen/kochtipp/KochtippHat";
import { DemoBadge } from "@/components/heute/DemoBits";
import { buttonClass } from "@/components/ui/styles";

/** "Essen · 18:30" bzw. "Morgen · Do · 18:30" */
function demoMeal(today: string, minutes: number, todayWord: string) {
  const d = demoDishAt(minutes);
  return {
    ...d,
    when: `${d.tomorrow ? tomorrowLabel(addDays(today, 1)) : todayWord} · ${d.clock}`,
  };
}

/** `hat`: Name der Begleitung → Kochmütze oben rechts (am Beispiel-Tag ohne Blase) */
export function DemoFoodTile({
  half,
  today,
  minutes,
  hat,
}: {
  half: boolean;
  today: string;
  minutes: number;
  hat?: string;
}) {
  const d = demoMeal(today, minutes, "Essen");
  const r = d.recipe;
  return (
    <div className="relative h-full">
      <Link
        href={`/kochbuch/rezept?id=${encodeURIComponent(r.id)}`}
        aria-label={`${d.when} · ${r.title} · Beispiel`}
        className={`relative block h-full overflow-hidden rounded-card shadow-card ${half ? "min-h-[168px]" : "min-h-[180px]"}`}
      >
        <DishPicture photo={d.photo} alt="" className="absolute inset-0" />
        <span className="dish-shade absolute inset-0" aria-hidden />
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3 text-on-color">
          <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">
            {d.when}
          </span>
          <span
            className={`line-clamp-2 font-extrabold leading-tight ${half ? "text-[16px]" : "text-[20px]"}`}
          >
            {r.title}
          </span>
          <span className="text-xs font-semibold opacity-90">
            alles im Haus · {r.prepMinutes} Min
          </span>
        </span>
      </Link>
      {hat && <KochtippHat name={hat} demo />}
    </div>
  );
}

/** Essen-Reiter im Beispiel-Tag: das Beispielgericht als "Heute" bzw. "Morgen" */
export function DemoDishHero({
  today,
  minutes,
}: {
  today: string;
  minutes: number;
}) {
  const d = demoMeal(today, minutes, "Heute");
  const r = d.recipe;
  const href = (path: string) => `${path}?id=${encodeURIComponent(r.id)}`;
  return (
    <section
      className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
      aria-label={`${d.when} · ${r.title} · Beispiel`}
    >
      <Link href={href("/kochbuch/rezept")} className="relative block">
        <DishPicture
          photo={d.photo}
          alt={r.title}
          className="aspect-[16/10] w-full"
        />
        <span className="absolute left-3 top-3">
          <DemoBadge />
        </span>
      </Link>
      <div className="flex flex-col gap-1 p-4">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
          {d.when}
        </span>
        <h2 className="text-[22px] font-extrabold leading-tight">{r.title}</h2>
        <p className="text-sm text-muted">
          alles im Haus · {r.prepMinutes} Min
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link
            href={href("/kochbuch/rezept")}
            className={buttonClass("soft", "md")}
          >
            Rezept ansehen
          </Link>
          <Link
            href={href("/kochbuch/kochen")}
            className={buttonClass("primary", "md")}
          >
            Kochen starten
          </Link>
        </div>
      </div>
    </section>
  );
}
