"use client";

// Kleine Zettel für die Pinnwand-Kachel (Tafel 107, Variante 1 „Fächer“):
// S = die drei neuesten aufgefächert (−10°, −2°, +7°), der vorderste
// (neueste) gut lesbar (bis 3 Zeilen), darunter klein der Name; M = drei
// nebeneinander. Sprachnachricht als „▶ 0:12“, Foto als
// Mini-Polaroid. Jeder Zettel führt zur Pinnwand an genau diesem Zettel; im
// Fächer (S) liegen sie übereinander, darum ist der ganze Fächer EIN Link und
// der Zettel unter dem Finger (der oberste sichtbare) bestimmt das Ziel –
// sonst wären die hinteren Zettel Knöpfe unter dem vorderen.
// Gerade Abgehaktes (Seite, Mia, Familie) steht wie an der Tür 1 s mit
// orangem Häkchen und gleitet dann weich weg.
// Leer (Variante 4): gestrichelter Zettel mit Magnet und ＋.

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { Check, Mic, Plus } from "lucide-react";
import { FAECHER_WINKEL, faecherLabel, faecherZiel, formatDauer, magnetOf, tiltOf, zettelTon, type ZettelFarbe } from "@/lib/pinnwand";
import { Magnet } from "@/components/pinnwand/Magnet";
import { FotoBild, useGehtIn } from "@/components/pinnwand/Zettel";
import { entryOf, toneOf, type BoardItem } from "@/components/pinnwand/useBoard";

type Mini = { item: BoardItem; tone?: ZettelFarbe | "mia" };

/** Was der Zettel für VoiceOver sagt */
function miniText(item: BoardItem): string {
  const e = entryOf(item);
  return item.kind === "memo" ? `Sprachnachricht von ${e.data.author}, ${formatDauer(item.memo.data.dauer)}` : `${e.data.author}: ${item.pin.data.text || "Foto"}`;
}

/** `link: false` = nur Papier (im Fächer ist der ganze Fächer der Link) */
function MiniZettel({ item, tone: forced, household, lines, demo, link = true, className = "", style }: Mini & { household: string[]; lines: number; demo: boolean; link?: boolean; className?: string; style?: CSSProperties }) {
  const e = entryOf(item);
  const tone = zettelTon(forced ?? toneOf(item, household));
  const papier = item.kind === "memo" ? "memo" : item.pin.data.papier;
  const foto = item.kind === "pin" && item.pin.data.papier === "foto";
  const text = miniText(item);
  const gehtIn = useGehtIn(e, !demo);
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
            <span className={`overflow-hidden whitespace-pre-line break-words font-extrabold leading-tight ${foto ? "text-[11px]" : "text-[14px]"}`} style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: foto ? 1 : lines }} data-freitext>
              {item.pin.data.text}
            </span>
          )
        )}
        <span className="truncate text-[11px] font-bold text-fridge-soft" data-freitext>{e.data.author}</span>
      </span>
      {e.data.erledigt && !demo && (
        <span className="pointer-events-none absolute bottom-1 right-1 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-on-accent" style={{ animation: "check-pop 0.4s ease-out" }} data-haken aria-hidden>
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
      )}
    </>
  );
  const cls = `zettel ${className.includes("absolute") ? "" : "relative"} block ${papier === "karo" ? "zettel-karo" : papier === "zettel" ? "" : "zettel-papier"} ${gehtIn !== null ? "zettel-geht" : ""} ${className}`;
  const st = { ...style, ...(gehtIn !== null ? { ["--geht-in" as string]: `${gehtIn}ms` } : {}), ...(papier === "zettel" ? { background: tone.bg } : {}) };
  if (!link)
    return (
      <span data-zettel={item.id} className={cls} style={st}>
        {body}
      </span>
    );
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

/** S: aufgefächert, der neueste vorn (rechts) – EIN Link, der Zettel unter dem Finger bestimmt das Ziel */
export function Faecher({ minis, household, demo }: { minis: Mini[]; household: string[]; demo: boolean }) {
  const router = useRouter();
  // hinten → vorn: der älteste der drei zuerst
  const back = [...minis].reverse();
  const off = FAECHER_WINKEL.length - back.length;
  const ids = minis.map((m) => m.item.id);
  const front = ids[0] ?? "";
  return (
    <Link
      href={demo ? "/pinnwand" : `/pinnwand?n=${front}`}
      aria-label={faecherLabel(minis.map((m) => miniText(m.item)), demo)}
      onClick={(e) => {
        if (demo) return;
        const tapped = (e.target as HTMLElement).closest<HTMLElement>("[data-zettel]")?.dataset.zettel;
        const ziel = faecherZiel(tapped, front, ids);
        if (ziel === front) return;
        e.preventDefault();
        router.push(`/pinnwand?n=${ziel}`);
      }}
      className="relative mx-auto block h-full w-full max-w-[220px]"
    >
      {back.map((m, i) => {
        const isFront = i === back.length - 1;
        const slot = i + off;
        return (
          <MiniZettel
            key={m.item.id}
            {...m}
            household={household}
            demo={demo}
            link={false}
            lines={isFront ? 3 : 1}
            className="absolute top-2 h-[92px] w-[64%]"
            style={{ ["--kippen" as string]: `${FAECHER_WINKEL[slot]}deg`, left: `${slot * 15}%`, zIndex: i + 1 }}
          />
        );
      })}
    </Link>
  );
}

/** M: drei nebeneinander */
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
