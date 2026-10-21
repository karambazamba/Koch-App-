"use client";

// Beispiel-Rezept (Beispiel-Tag): "Mehr Ideen" – drei
// weitere Beispiel-Ideen als kleine Karten mit Bild bzw. farbigem Hintergrund.

import Link from "next/link";
import { DEMO_MORE, DEMO_RECIPES, demoLook } from "@/lib/essen/demoDish";
import { DishPicture } from "@/components/alltag/DishPicture";
import { SECTION_TITLE } from "@/components/ui/styles";

export function DemoMoreIdeas({ current }: { current: string }) {
  const list = [...DEMO_MORE, DEMO_RECIPES[0]].filter((r) => r.id !== current).slice(0, 3);
  return (
    <section className="flex flex-col gap-2" aria-label="Mehr Ideen">
      <h3 className={SECTION_TITLE}>Mehr Ideen</h3>
      <div className="grid grid-cols-3 gap-2">
        {list.map((r) => {
          const look = demoLook(r.id);
          return (
            <Link key={r.id} href={`/kochbuch/rezept?id=${encodeURIComponent(r.id)}`} className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-1.5 shadow-card">
              <DishPicture photo={look?.photo} title={r.title} ingredients={r.ingredients.map((i) => i.name)} category={r.category} tone={look?.tone} alt="" className="aspect-square w-full rounded-field" small />
              <span className="line-clamp-2 px-1 text-[13px] font-bold leading-tight">{r.title}</span>
              <span className="px-1 pb-1 text-xs text-muted">{r.prepMinutes} Min</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
