"use client";

// Einkauf-Kachel M (A-050, Tafel 140 unten): EINE Reihe Laden-Chips
// nebeneinander, gleich breit – links Strich in Ladenfarbe, Name (14 px, notfalls
// 13 px) fett, rechts die Anzahl in Ladenfarbe. Mehr Läden: „+n weitere“
// (grau, gleiche Breite) öffnet die Einkaufsliste; ein Laden-Chip die
// Laden-Seite. Gemessen wird die echte Breite der Reihe (`ladenChips`).

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { ladenChips, textBreite, type LadenChip, type Messen } from "@/lib/einkauf/kacheln/ladenChips";
import { ladenHref } from "@/lib/einkauf/seite/karten";
import { shopTone } from "@/lib/einkauf/shopGroups";
import { leuchtSchluessel } from "@/lib/heute/aufleuchten";

/** Breite eines Elements (ResizeObserver), vorher eine übliche Handy-Breite */
function useBreite<T extends HTMLElement>(start = 315): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [breite, setBreite] = useState(start);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mess = () => setBreite(el.getBoundingClientRect().width || start);
    mess();
    const ro = new ResizeObserver(mess);
    ro.observe(el);
    return () => ro.disconnect();
  }, [start]);
  return [ref, breite];
}

/** Echte Textbreite in der Schrift der Seite (Canvas), ohne Browser geschätzt */
let leinwand: CanvasRenderingContext2D | null | undefined;
const messen: Messen = (text, px) => {
  if (typeof document === "undefined") return textBreite(text, px);
  if (leinwand === undefined) leinwand = document.createElement("canvas").getContext("2d");
  if (!leinwand) return textBreite(text, px);
  leinwand.font = `800 ${px}px ${getComputedStyle(document.body).fontFamily}`;
  return leinwand.measureText(text).width;
};

export function LadenChipReihe({ rows, demo }: { rows: { shop: string | null; count: number; names: string[] }[]; demo: boolean }) {
  const [ref, breite] = useBreite<HTMLUListElement>();
  const { chips, px } = ladenChips(rows, breite, messen);
  return (
    <ul ref={ref} className="mt-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, chips.length)}, minmax(0, 1fr))` }} aria-label="Nach Laden" data-laden-chips={chips.length}>
      {chips.map((c) => (
        <li key={c.art === "laden" ? (c.shop ?? "egal") : "weitere"} className="min-w-0">
          <Chip chip={c} px={px} demo={demo} />
        </li>
      ))}
    </ul>
  );
}

function Chip({ chip, px, demo }: { chip: LadenChip; px: number; demo: boolean }) {
  if (chip.art === "weitere")
    return (
      <Link href="/einkaufsliste" onClick={(e) => e.stopPropagation()} className="flex h-10 items-center justify-center rounded-field bg-fill px-2 text-[13px] font-bold whitespace-nowrap text-muted" data-zeile data-laden-chip="weitere">
        +{chip.anzahl} weitere
      </Link>
    );
  const tone = chip.shop ? `var(--app-shop-${shopTone(chip.shop)})` : "var(--app-faint)";
  return (
    <Link
      href={demo || !chip.shop ? "/einkaufsliste" : ladenHref(chip.shop)}
      onClick={(e) => e.stopPropagation()}
      className="relative flex h-10 min-w-0 items-center gap-1 overflow-hidden rounded-field pl-2.5 pr-2"
      style={{ background: chip.shop ? `var(--app-shop-${shopTone(chip.shop)}-soft)` : "var(--app-fill)" }}
      aria-label={`${chip.label}: ${chip.count} ${chip.count === 1 ? "Sache" : "Sachen"}${demo ? " · Beispiel" : ""}`}
      data-zeile
      data-laden-zeile
      data-laden-chip={chip.label}
      data-leuchte={chip.names.map((n) => leuchtSchluessel("einkauf", n)).join(" ")}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: tone }} aria-hidden />
      <span className="min-w-0 flex-1 whitespace-nowrap font-bold leading-tight" style={{ fontSize: px }}>
        {chip.label}
      </span>
      <span className="shrink-0 font-extrabold tabular-nums" style={{ fontSize: px, color: chip.shop ? tone : undefined }}>
        {chip.count}
      </span>
    </Link>
  );
}
