"use client";

// ESSEN-Kachel mit Bild (final: A-046, Tafel 134) – EINE Komponente für den
// Beispiel-Tag und das echte Gericht: Bild füllt die Kachel, darüber ein
// Verlauf (unten dunkel, Token `--app-dish-tile-shade`, weiße Schrift ≥ 4,5:1).
// Oben links die Pille „Was anderes?“ mit Pfeil-Symbol (`corner`), unten links die kleine
// Statuszeile (10,5 px, „Kochidee · Heute“, „Essen · 18:30“, „Essen · Jetzt“),
// der Name (S 19 px, M 22 px, immer ganz, nie „…“ – `titelPx`) und die
// Zeile(n) darunter; unten rechts die weiße Pille „Wochenplan ›“ bzw.
// „Weiter kochen ›“ (`ui/KachelKnopf` als Pille, 32 px, Tippfläche 44 px,
// Stufen statt „…“). Keine großen Knöpfe mehr. Die ganze übrige Kachel
// öffnet `open` (Vorschau, Rezept, Kochmodus).

import Link from "next/link";
import type { ReactNode } from "react";
import { DishPicture } from "@/components/essen/DishPicture";
import { KachelKnopf as Knopf } from "@/components/ui/KachelKnopf";
import type { RecipeCategory } from "@/lib/essen/cookbook";
import { titelPx } from "@/lib/heute/essenKachel";

type Picture = { photo?: string; title: string; ingredients?: string[]; category?: RecipeCategory | null; leer?: boolean };

/** Pille unten rechts: Link oder Schritt */
type Pille = { label: string; open: string | (() => void); data?: string };

export function DishTile({
  kopf,
  title,
  sub,
  picture,
  open,
  half,
  label,
  corner,
  pille,
}: {
  /** „Essen · 18:30“, „Morgen · Do“ – angezeigt in Großbuchstaben */
  kopf: string;
  title: string;
  /** Zeilen unter dem Namen (`essenUnterzeilen`: S zwei, M eine) */
  sub?: string[];
  picture: Picture;
  /** Rest der Kachel antippen: Seite (Link) oder eigener Schritt */
  open: string | (() => void);
  half: boolean;
  label: string;
  /** Pille oben links */
  corner?: ReactNode;
  /** Pille unten rechts („Wochenplan ›“, „Weiter kochen ›“) */
  pille?: Pille;
}) {
  const px = titelPx(title, half ? "S" : "M");
  // Bereich heißt für VoiceOver immer „Essen …“, auch bei „Kochidee · Heute“ und „Morgen · Do“
  const bereich = /^Essen/i.test(kopf) ? kopf : `Essen · ${kopf}`;
  const body = (
    <>
      <DishPicture photo={picture.photo} title={picture.title} ingredients={picture.ingredients} category={picture.category} leer={picture.leer} alt="" className="absolute inset-0" />
      <span className="dish-tile-shade absolute inset-0" aria-hidden />
      <span className="relative flex flex-1 flex-col justify-end gap-0.5 px-3 pb-[50px] pt-11 text-on-color">
        <span className="text-[10.5px] font-extrabold uppercase leading-[13px] tracking-wider opacity-95" data-kopf>
          {kopf}
        </span>
        <span className="hyphens-auto font-extrabold leading-[1.06] tracking-tight [overflow-wrap:break-word]" style={{ fontSize: px }} data-titel>
          {title}
        </span>
        {sub?.map((zeile) => (
          <span key={zeile} className="text-[12px] font-semibold leading-[15px]" data-unterzeile>
            {zeile}
          </span>
        ))}
      </span>
    </>
  );
  // Feste Fläche im Raster der Startseite: das Bild füllt genau die Kachel (S quadratisch, M breit)
  const frame = "relative flex h-full w-full flex-col overflow-hidden rounded-card text-left shadow-card";
  return (
    <section className="relative h-full" aria-label={bereich} data-essen-kachel>
      {typeof open === "string" ? (
        <Link href={open} aria-label={label} className={frame} data-essen-antippen>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={open} aria-label={label} className={frame} data-essen-antippen>
          {body}
        </button>
      )}
      {pille && (
        <span className="absolute bottom-1 right-1 flex max-w-[calc(100%-8px)] justify-end" data-essen-pille>
          <Knopf label={pille.label} open={pille.open} data={pille.data} />
        </span>
      )}
      {corner}
    </section>
  );
}
