"use client";

// ESSEN im Beispiel-Tag: das Beispielgericht in derselben Bild-Kachel wie das
// echte Gericht (`DishTile`, Tafel 122: "ESSEN · 18:30", sonntags 12:30, Name,
// "25 Min · alles im Haus", Knöpfe „Rezept“ und „Wochenplan“). Nach dem Essen (18:30 + 90 Min) das zweite Beispielgericht
// für morgen ("MORGEN · Do · 18:30"). Antippen = genau dieses Gericht (Fenster mit „Für heute
// nehmen“ bzw. „Für morgen nehmen“ – erst dieser Knopf übernimmt es in den echten Plan; „Rezept
// ansehen ›“ zeigt das Beispiel-Rezept). (Das Schild BEISPIEL steht nur einmal oben.)

import Link from "next/link";
import { useState } from "react";
import { GerichtSheet } from "@/components/essen/GerichtSheet";
import { essenUnterzeile, takeLabel } from "@/lib/heute/essenKachel";
import type { RecipeCategory } from "@/lib/essen/cookbook";
import { demoDishAt } from "@/lib/essen/demoDish";
import { tomorrowLabel } from "@/lib/kalender/model";
import { addDays } from "@/lib/core/now";
import { DishPicture } from "@/components/essen/DishPicture";
import { BookOpen } from "lucide-react";
import { DishTile } from "@/components/essen/DishTile";
import { KochideeKnopf } from "@/components/essen/kochtipp/KochideeKnopf";
import { DemoBadge } from "@/components/heute/DemoBits";
import { buttonClass } from "@/components/ui/styles";

/** "Essen · 18:30" bzw. "Morgen · Do · 18:30" */
function demoMeal(today: string, minutes: number, todayWord: string) {
  const d = demoDishAt(today, minutes);
  return {
    ...d,
    when: `${d.tomorrow ? tomorrowLabel(addDays(today, 1)) : todayWord} · ${d.clock}`,
  };
}

/** `hat`: Name der Begleitung → Kochidee-Knopf oben rechts („Was anderes?“, am Beispiel-Tag ohne Blase) */
export function DemoFoodTile({
  half,
  today,
  minutes,
  hat,
  onTake,
  persons,
}: {
  half: boolean;
  today: string;
  minutes: number;
  hat?: string;
  /** Personen im (Beispiel-)Haushalt – das Rezept rechnet dafür um */
  persons: number;
  /** „Nehmen“: das Beispielgericht in den echten Plan (heute bzw. morgen) */
  onTake?: (dish: { title: string; category: RecipeCategory | null }, tomorrow: boolean) => void;
}) {
  const d = demoMeal(today, minutes, "Essen");
  const r = d.recipe;
  const id = encodeURIComponent(r.id);
  const [open, setOpen] = useState(false);
  return (
    <>
    <DishTile
      kopf={d.when}
      title={r.title}
      sub={essenUnterzeile({ minutes: r.prepMinutes, needs: [] })}
      picture={{ photo: d.photo, title: r.title }}
      open={onTake ? () => setOpen(true) : `/kochbuch/rezept?id=${id}`}
      half={half}
      label={`${d.when} · ${r.title} · Beispiel`}
      corner={hat && <KochideeKnopf name={hat} planned={r.title} demo />}
      links={{ label: "Rezept", icon: BookOpen, open: `/kochbuch/rezept?id=${id}&personen=${persons}`, data: "rezept" }}
      rechts={half ? "Woche" : "Wochenplan"}
    />
    {open && onTake && (
      <GerichtSheet
        dish={{ title: r.title, category: r.category, minutes: r.prepMinutes, photo: d.photo }}
        take={takeLabel(d.tomorrow ? "morgen" : "heute")}
        onTake={() => {
          setOpen(false);
          onTake({ title: r.title, category: r.category }, d.tomorrow);
        }}
        onClose={() => setOpen(false)}
        recipeHref={`/kochbuch/rezept?id=${id}`}
      />
    )}
    </>
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
