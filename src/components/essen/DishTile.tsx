"use client";

// ESSEN-Kachel mit Bild – EINE Komponente für den Beispiel-Tag und das echte
// Gericht: Bild vollflächig, unten ein weicher Verlauf mit weißer Schrift
// („ESSEN · 18:30“, Name, „alles im Haus · 25 Min“), darunter „Ich koche
// jetzt ›“. Oben rechts der Kochidee-Knopf (eigenes Element).

import Link from "next/link";
import type { ReactNode } from "react";
import { DishPicture } from "@/components/essen/DishPicture";
import type { RecipeCategory } from "@/lib/essen/cookbook";

type Picture = { photo?: string; title: string; ingredients?: string[]; category?: RecipeCategory | null };

export function DishTile({
  when,
  title,
  sub,
  picture,
  open,
  cook,
  half,
  label,
  corner,
}: {
  when: string;
  title: string;
  sub?: string;
  picture: Picture;
  /** Antippen: Seite (Link) oder eigener Schritt */
  open: string | (() => void);
  /** „Ich koche jetzt ›“: Link oder Schritt; ohne = kein Knopf */
  cook?: string | (() => void);
  half: boolean;
  label: string;
  corner?: ReactNode;
}) {
  const body = (
    <>
      <DishPicture photo={picture.photo} title={picture.title} ingredients={picture.ingredients} category={picture.category} alt="" className="absolute inset-0" />
      <span className="dish-shade absolute inset-0" aria-hidden />
      <span className={`absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3 text-on-color ${cook ? "pb-11" : ""}`}>
        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">{when}</span>
        <span className={`line-clamp-2 font-extrabold leading-tight ${half ? "text-[16px]" : "text-[20px]"}`}>{title}</span>
        {sub && <span className="text-xs font-semibold opacity-90">{sub}</span>}
      </span>
    </>
  );
  const frame = `relative block h-full w-full overflow-hidden rounded-card text-left shadow-card ${half ? "min-h-[168px]" : "min-h-[180px]"}`;
  const cookClass = "absolute bottom-0 left-0 flex h-11 items-center px-3 text-[13px] font-bold text-on-color";
  return (
    <section className="relative h-full" aria-label={when}>
      {typeof open === "string" ? (
        <Link href={open} aria-label={label} className={frame}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={open} aria-label={label} className={frame}>
          {body}
        </button>
      )}
      {cook &&
        (typeof cook === "string" ? (
          <Link href={cook} className={cookClass}>
            Ich koche jetzt ›
          </Link>
        ) : (
          <button type="button" onClick={cook} className={cookClass}>
            Ich koche jetzt ›
          </button>
        ))}
      {corner}
    </section>
  );
}
