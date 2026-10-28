"use client";

// ESSEN-Kachel mit Bild (Tafel 122) – EINE Komponente für den Beispiel-Tag
// und das echte Gericht: Bild füllt die Kachel, darüber ein Verlauf (oben
// leicht, unten dunkel, Token `--app-dish-tile-shade`, weiße Schrift überall
// ≥ 4,5:1). Oben links die Pille (Kochidee „Was anderes?“ bzw. „Andere Idee“), in der
// Mitte linksbündig „ESSEN · 18:30“, der Name groß (S 20 px, M 24 px, höchstens
// 2 Zeilen, nie mitten im Wort abgeschnitten – `titelPx`) und die Unterzeile.
// Unten zwei gleich breite Knöpfe (je 44 px): links weiß mit oranger Schrift
// („Rezept“, „Vorschlag“, „Weiter kochen“), rechts weiß 85 % („Wochenplan“
// bzw. bei S „Woche“). Der Rest der Kachel öffnet `open`.

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays } from "lucide-react";
import { DishPicture } from "@/components/essen/DishPicture";
import type { RecipeCategory } from "@/lib/essen/cookbook";
import { titelAnzeige } from "@/lib/heute/essenKachel";

type Picture = { photo?: string; title: string; ingredients?: string[]; category?: RecipeCategory | null; leer?: boolean };

/** Ein Knopf unten: Link oder Schritt */
export type KachelKnopf = { label: string; icon: LucideIcon; open: string | (() => void); data?: string };

const KNOPF = "flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-field px-2 text-[14px] font-extrabold shadow-card active:scale-[0.97]";

function Knopf({ k, tone }: { k: KachelKnopf; tone: "links" | "rechts" }) {
  const Icon = k.icon;
  const cls = `${KNOPF} ${tone === "links" ? "bg-on-color text-on-photo-ink" : "bg-on-color/85 text-on-photo-dark"}`;
  const inner = (
    <>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="truncate">{k.label}</span>
    </>
  );
  const data = k.data ? { [`data-${k.data}`]: true } : {};
  return typeof k.open === "string" ? (
    <Link href={k.open} className={cls} {...data}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={k.open} className={cls} {...data}>
      {inner}
    </button>
  );
}

export function DishTile({
  kopf,
  title,
  sub,
  picture,
  open,
  half,
  label,
  corner,
  links,
  rechts,
}: {
  /** „Essen · 18:30“, „Morgen · Do“ – angezeigt in Großbuchstaben */
  kopf: string;
  title: string;
  sub?: string;
  picture: Picture;
  /** Rest der Kachel antippen: Seite (Link) oder eigener Schritt */
  open: string | (() => void);
  half: boolean;
  label: string;
  /** Pille oben links */
  corner?: ReactNode;
  links?: KachelKnopf | null;
  /** Rechter Knopf (Wochenplan); ohne = keiner */
  rechts?: string;
}) {
  const name = titelAnzeige(title, half ? "S" : "M");
  const body = (
    <>
      <DishPicture photo={picture.photo} title={picture.title} ingredients={picture.ingredients} category={picture.category} leer={picture.leer} alt="" className="absolute inset-0" />
      <span className="dish-tile-shade absolute inset-0" aria-hidden />
      <span className="absolute inset-x-3 bottom-[54px] top-10 flex flex-col justify-center gap-0.5 text-on-color">
        <span className="truncate whitespace-nowrap text-[11px] font-extrabold uppercase leading-[13px] tracking-wider opacity-95" data-kopf>
          {kopf}
        </span>
        <span className="line-clamp-2 font-extrabold leading-[1.06] tracking-tight [overflow-wrap:normal]" style={{ fontSize: name.px }} data-titel>
          {name.text}
        </span>
        {sub && (
          <span className="truncate text-[12px] font-semibold leading-[15px]" data-unterzeile>
            {sub}
          </span>
        )}
      </span>
    </>
  );
  const frame = `relative block h-full w-full overflow-hidden rounded-card text-left shadow-card ${half ? "min-h-[168px]" : "min-h-[180px]"}`;
  const knoepfe = [links, rechts ? { label: rechts, icon: CalendarDays, open: "/?seite=essen&zu=woche", data: "woche" } : null].filter((k): k is KachelKnopf => Boolean(k));
  return (
    <section className="relative h-full" aria-label={kopf}>
      {typeof open === "string" ? (
        <Link href={open} aria-label={label} className={frame}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={open} aria-label={label} className={frame}>
          {body}
        </button>
      )}
      {knoepfe.length > 0 && (
        <div className={`absolute inset-x-2 bottom-2 grid gap-2 ${knoepfe.length > 1 ? "grid-cols-2" : "grid-cols-1"}`} data-kachel-knoepfe>
          {knoepfe.map((k, i) => (
            <Knopf key={k.label} k={k} tone={i === 0 && links ? "links" : "rechts"} />
          ))}
        </div>
      )}
      {corner}
    </section>
  );
}
