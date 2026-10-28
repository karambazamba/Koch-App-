"use client";

// Kleine Zettel für die Pinnwand-Kachel (Tafel 107, Variante 1 „Fächer“):
// S = die drei neuesten aufgefächert (−10°, −2°, +7°), der vorderste
// (neueste) gut lesbar (bis 3 Zeilen), darunter klein der Name; M = drei
// nebeneinander; L = bis 6 im Raster. Sprachnachricht als „▶ 0:12“, Foto als
// Mini-Polaroid. Jeder Zettel ist ein Link zur Pinnwand an genau diesem
// Zettel. Leer (Variante 4): gestrichelter Zettel mit Magnet und ＋.

import Link from "next/link";
import type { CSSProperties } from "react";
import { Mic, Plus } from "lucide-react";
import { FAECHER_WINKEL, formatDauer, magnetOf, tiltOf, zettelTon, type ZettelFarbe } from "@/lib/pinnwand";
import { Magnet } from "@/components/pinnwand/Magnet";
import { FotoBild } from "@/components/pinnwand/Zettel";
import { entryOf, toneOf, type BoardItem } from "@/components/pinnwand/useBoard";

type Mini = { item: BoardItem; tone?: ZettelFarbe | "mia" };

function MiniZettel({ item, tone: forced, household, lines, demo, className = "", style }: Mini & { household: string[]; lines: number; demo: boolean; className?: string; style?: CSSProperties }) {
  const e = entryOf(item);
  const tone = zettelTon(forced ?? toneOf(item, household));
  const papier = item.kind === "memo" ? "memo" : item.pin.data.papier;
  const foto = item.kind === "pin" && item.pin.data.papier === "foto";
  const text = item.kind === "memo" ? `Sprachnachricht von ${e.data.author}, ${formatDauer(item.memo.data.dauer)}` : `${e.data.author}: ${item.pin.data.text || "Foto"}`;
  const body = (
    <>
      <span className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2">
        <Magnet form={magnetOf(papier, item.kind === "pin" && item.pin.data.pinned)} color={tone.mag} size={16} />
      </span>
      <span className={`flex h-full flex-col justify-between gap-1 ${foto ? "p-1.5" : "px-2.5 pb-1.5 pt-3"}`}>
        {foto && item.kind === "pin" && <FotoBild pin={item.pin} className="max-h-[52px]" />}
        {item.kind === "memo" ? (
          <span className="text-[15px] font-extrabold tabular-nums">▶ {formatDauer(item.memo.data.dauer)}</span>
        ) : (
          item.pin.data.text && (
            <span className={`overflow-hidden whitespace-pre-line break-words font-extrabold leading-tight ${foto ? "text-[11px]" : "text-[14px]"}`} style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: foto ? 1 : lines }}>
              {item.pin.data.text}
            </span>
          )
        )}
        <span className="truncate text-[11px] font-bold text-fridge-soft">{e.data.author}</span>
      </span>
    </>
  );
  const cls = `zettel ${className.includes("absolute") ? "" : "relative"} block ${papier === "karo" ? "zettel-karo" : papier === "zettel" ? "" : "zettel-papier"} ${className}`;
  const st = { ...style, ...(papier === "zettel" ? { background: tone.bg } : {}) };
  return demo ? (
    <Link href="/pinnwand" className={cls} style={st} aria-label={`Beispiel: ${text}`}>
      {body}
    </Link>
  ) : (
    <Link href={`/pinnwand?n=${item.id}`} className={cls} style={st} aria-label={`${text} – auf der Pinnwand öffnen`}>
      {body}
    </Link>
  );
}

/** S: aufgefächert, der neueste vorn (rechts) */
export function Faecher({ minis, household, demo }: { minis: Mini[]; household: string[]; demo: boolean }) {
  // hinten → vorn: der älteste der drei zuerst
  const back = [...minis].reverse();
  const off = FAECHER_WINKEL.length - back.length;
  return (
    <div className="relative mx-auto h-full w-full max-w-[220px]">
      {back.map((m, i) => {
        const front = i === back.length - 1;
        const slot = i + off;
        return (
          <MiniZettel
            key={m.item.id}
            {...m}
            household={household}
            demo={demo}
            lines={front ? 3 : 1}
            className="absolute top-2 h-[92px] w-[64%]"
            style={{ ["--kippen" as string]: `${FAECHER_WINKEL[slot]}deg`, left: `${slot * 15}%`, zIndex: i + 1 }}
          />
        );
      })}
    </div>
  );
}

/** M (drei nebeneinander) und L (bis 6 im Raster) */
export function ZettelReihe({ minis, household, demo }: { minis: Mini[]; household: string[]; demo: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3 pt-2">
      {minis.map((m) => (
        <MiniZettel key={m.item.id} {...m} household={household} demo={demo} lines={4} className="h-[104px]" style={{ ["--kippen" as string]: `${tiltOf(m.item.id) * 0.6}deg` }} />
      ))}
    </div>
  );
}

/** Leer: gestrichelter Zettel mit Magnet und ＋, darunter „Erster Zettel?“ / „Oder 🎙 Sprachnachricht“ */
export function LeererZettel({ onWrite, onRecord }: { onWrite: () => void; onRecord: (() => void) | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <button type="button" onClick={onWrite} aria-label="Erster Zettel" className="zettel zettel-leer relative flex h-[52px] w-[64px] items-center justify-center text-tile-accent">
        <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2">
          <Magnet form="punkt" color="var(--app-zettel-mia-mag)" size={16} />
        </span>
        <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
      <button type="button" onClick={onWrite} className="text-[13px] font-extrabold text-ink">
        Erster Zettel?
      </button>
      {onRecord && (
        <button type="button" onClick={onRecord} aria-label="Sprachnachricht aufnehmen" className="hit flex items-center gap-1 text-[12px] font-semibold text-tile-accent">
          Oder <Mic className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden /> Sprachnachricht
        </button>
      )}
    </div>
  );
}
