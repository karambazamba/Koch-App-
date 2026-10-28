"use client";

// Kachel „Tipps fürs Wochenende“ (Mo–Do „Tipps diese Woche“), nur M im festen
// Raster: zwei Karten nebeneinander mit Icon, Titel und Tag + Uhrzeit, rechts
// oben „Alle“ (Ort und Etikett im Fenster). Höchstens ein KARAMBA-Eintrag pro Woche.

import Link from "next/link";
import { useState } from "react";
import type { TileSize } from "@/lib/core/homeLayout";
import { TILE, TILE_INNER, TILE_LABEL } from "@/components/ui/styles";
import { tileTips, tileTitle, type TipView } from "@/lib/tipps/model";
import { useTipsWindow } from "@/lib/tipps/client";
import { KarambaLine, TipIcon, tipWhen } from "@/components/tipps/TipBits";
import { TipSheet } from "@/components/tipps/TipSheet";

export function TipsTile({ size, today }: { size: TileSize; today: string }) {
  const data = useTipsWindow(today);
  const [open, setOpen] = useState<TipView | null>(null);
  const list = data ? tileTips(data.tips, today, 2) : [];
  const title = tileTitle(today);
  return (
    <section className={`${TILE} flex h-full flex-col gap-2 overflow-hidden p-3`} aria-label={title} data-groesse={size}>
      <div className="flex items-center justify-between">
        <Link href="/tipps" className={TILE_LABEL}>
          {title}
          {data?.mode === "demo" ? " · Beispiel" : ""}
        </Link>
        <Link href="/tipps" className="text-[13px] font-bold text-tile-accent">
          Alle
        </Link>
      </div>
      {data === undefined ? (
        <div className="grid h-24 grid-cols-2 gap-2">
          <span className={`${TILE_INNER} animate-pulse`} />
          <span className={`${TILE_INNER} animate-pulse`} />
        </div>
      ) : list.length === 0 ? (
        <Link href="/tipps" className={`${TILE_INNER} px-3 py-3 text-[14px] font-semibold text-muted`}>
          Gerade nichts in eurer Nähe. Umkreis ansehen
        </Link>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {list.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => setOpen(t)} className={`${TILE_INNER} flex h-full w-full flex-col items-start gap-1 p-2.5 text-left`} aria-label={`${t.titel} – ${tipWhen(t)}, ${t.ort_name}`}>
                <TipIcon tip={t} size={24} />
                {t.karamba && <KarambaLine />}
                <span className="break-words text-[14px] font-bold leading-snug">{t.titel}</span>
                <span className="text-[12px] font-semibold text-muted">{tipWhen(t)}</span>
                <span className="break-words text-[12px] leading-snug text-muted">{t.ort_name}</span>
                {tipTags(t, 1)[0] && <span className="mt-auto rounded-full bg-tipp-soft px-2 py-0.5 text-[11px] font-bold text-tipp">{tipTags(t, 1)[0]}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <TipSheet tip={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
