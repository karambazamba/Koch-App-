"use client";

// Ein Zettel an der Kühlschranktür (Tafel 106): Papier je Inhalt –
// Haftnotiz in der Farbe der Person, Karoblatt (Kinder), Polaroid (Foto),
// Kassenbon (Sprachnachricht: gezackte Oberkante, „SPRACHNACHRICHT“, ▶,
// Tonwelle, Dauer). Fest leicht schief, oben ein Magnet („Bleibt hängen“:
// roter Pin), unten Avatar-Kreis mit Initiale, Name und Zeit, rechts der
// Haken-Kreis für „Erledigt“ (blass mit Haken, „erledigt von Lisa“, nach 3 s
// gleitet er weich ins Archiv). Antippen oder lange drücken öffnet das Menü.

import { useEffect, useMemo, useState } from "react";
import { Check, ImageIcon, Play } from "lucide-react";
import { GLEIT_MS, formatDauer, doneLine, leavesIn, magnetOf, memoUnheard, reactionLine, tiltOf, zettelTon, type PinMessage, type ZettelFarbe } from "@/lib/pinnwand";
import { fotoStore } from "@/lib/pinnwand/fotoStore";
import { pinMetaLine } from "@/components/pinnwand/PinSheets";
import { MemoWave } from "@/components/pinnwand/MemoParts";
import { PlayButton, useMemoPlayer } from "@/components/pinnwand/MemoRow";
import { Magnet } from "@/components/pinnwand/Magnet";
import { now } from "@/lib/core/now";
import { entryOf, toneOf, type BoardItem } from "@/components/pinnwand/useBoard";

/** Avatar-Kreis mit Initiale in der Farbe der Person */
function ZettelAvatar({ name, color, size = 20 }: { name: string; color: string; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full font-extrabold text-on-accent" style={{ width: size, height: size, fontSize: Math.round(size * 0.5), background: color }} aria-hidden>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** Bild eines Foto-Zettels (vom Gerät, sonst aus dem Haushalt) */
export function FotoBild({ pin, className = "" }: { pin: Pick<PinMessage, "id" | "data">; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    void fotoStore.load(pin).then((blob) => {
      if (!alive) return;
      if (!blob) return setMissing(true);
      made = URL.createObjectURL(blob);
      setUrl(made);
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [pin]);
  const ratio = pin.data.foto ? `${pin.data.foto.w} / ${pin.data.foto.h}` : "4 / 3";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- Bild vom Gerät (Blob-Adresse), nicht optimierbar
    <img src={url} alt={pin.data.text ? `Foto: ${pin.data.text}` : "Foto"} className={`block w-full object-cover ${className}`} style={{ aspectRatio: ratio, maxHeight: 220 }} />
  ) : (
    <span className={`flex w-full items-center justify-center bg-fill text-faint ${className}`} style={{ aspectRatio: ratio, maxHeight: 220 }} aria-label={missing ? "Foto liegt auf einem anderen Handy" : "Foto lädt"}>
      <ImageIcon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

type Props = { item: BoardItem; me: string; household: string[]; highlight?: boolean; onOpen: () => void; onDone?: () => void; tone?: ZettelFarbe | "mia"; demo?: boolean };

export function Zettel({ item, me, household, highlight = false, onOpen, onDone, tone: forced, demo = false }: Props) {
  const entry = entryOf(item);
  const tone = zettelTon(forced ?? toneOf(item, household));
  const done = entry.data.erledigt;
  const pinned = item.kind === "pin" && item.pin.data.pinned;
  const papier = item.kind === "memo" ? "memo" : item.pin.data.papier;
  const meta = demo ? entry.data.author : done ? doneLine(done, me) : pinned ? `${entry.data.author === me ? "Du" : entry.data.author} · bleibt hängen` : pinMetaLine(entry, me);
  // Abgehakt an der Tür: einmal je Abhaken ausrechnen, wann er hinausgleitet (sonst springt die Bewegung neu an)
  const doneAt = onDone ? done?.am : undefined;
  const gehtIn = useMemo(() => {
    const left = doneAt ? leavesIn(entry, now().getTime()) : null;
    return left === null ? null : Math.max(0, left - GLEIT_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur je Abhaken neu
  }, [doneAt]);
  const reacted = reactionLine(entry.data.reactions);
  const player = useMemoPlayer();
  const paperClass = papier === "karo" ? "zettel-karo" : papier === "foto" ? "zettel-papier p-2 pb-2.5" : papier === "memo" ? "zettel-papier zettel-bon" : "";
  const label =
    item.kind === "memo" ? `Sprachnachricht von ${entry.data.author}, ${formatDauer(item.memo.data.dauer)}` : `${item.pin.data.papier === "foto" ? "Foto" : "Zettel"} von ${entry.data.author}: ${item.pin.data.text}`;
  return (
    <div
      id={onDone ? `n-${item.id}` : undefined}
      className={`zettel relative select-none [-webkit-touch-callout:none] ${paperClass} ${highlight ? "zettel-hervor" : ""} ${gehtIn !== null ? "zettel-geht" : ""}`}
      style={{ ["--kippen" as string]: `${tiltOf(item.id)}deg`, ...(gehtIn !== null ? { ["--geht-in" as string]: `${gehtIn}ms` } : {}), ...(papier === "zettel" ? { background: tone.bg } : {}) }}
      data-erledigt={done ? "" : undefined}
      data-papier={papier}
    >
      <button
        type="button"
        className="absolute inset-0 z-0"
        style={{ borderRadius: "inherit" }}
        aria-label={`${label}. ${meta}. Antippen für mehr`}
        onClick={onOpen}
        onContextMenu={(e) => {
          e.preventDefault();
          onOpen();
        }}
      />
      <span className="pointer-events-none absolute -top-2.5 left-1/2 z-10 -translate-x-1/2">
        <Magnet form={magnetOf(papier, pinned)} color={tone.mag} />
      </span>
      <div className={`pointer-events-none relative flex flex-col gap-1.5 ${papier === "foto" ? "" : "px-3 pb-2.5 pt-4"}`}>
        {item.kind === "pin" && item.pin.data.replyTo && (
          <span className="text-[12px] font-bold text-fridge-soft">↪ {item.pin.data.replyTo.author}</span>
        )}
        {item.kind === "pin" && item.pin.data.papier === "foto" && <FotoBild pin={item.pin} />}
        {item.kind === "pin" && item.pin.data.text && (
          <p className={`zettel-text whitespace-pre-line break-words font-bold leading-snug ${papier === "foto" ? "px-1 pt-1 text-[15px]" : "text-[16px]"}`}>{item.pin.data.text}</p>
        )}
        {item.kind === "memo" && (
          <>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-fridge-soft">Sprachnachricht</span>
            <span className="zettel-text flex items-center gap-2">
              {demo ? (
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-on-accent" style={{ background: tone.mag }} aria-hidden>
                  <Play className="ml-[2px] h-3.5 w-3.5 fill-current" strokeWidth={2} />
                </span>
              ) : (
                <PlayButton memo={item.memo} me={me} household={household} size={30} color={tone.mag} />
              )}
              <MemoWave wave={item.memo.data.wave} progress={player.id === item.id ? player.progress : 0} fit className="min-w-0 flex-1 overflow-hidden" color={tone.mag} />
              <span className="shrink-0 text-[13px] font-bold tabular-nums">{formatDauer(item.memo.data.dauer)}</span>
            </span>
          </>
        )}
        {reacted && <span className="text-[13px] text-fridge-soft">{reacted}</span>}
        {/* Name · Zeit immer ganz lesbar: lieber zweizeilig als abgeschnitten; rechts bleibt Platz für den Haken-Kreis */}
        <span className={`flex min-h-[30px] items-center gap-1.5 pr-8 text-[12px] font-semibold leading-tight text-fridge-soft ${papier === "foto" ? "px-1" : ""}`} data-meta>
          <ZettelAvatar name={entry.data.author} color={tone.mag} />
          <span className="min-w-0 break-words">{meta}</span>
          {item.kind === "memo" && memoUnheard(item.memo, me) && !done && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tone.mag }} aria-label="Noch nicht gehört" />}
        </span>
      </div>
      {onDone && (
      <button
        type="button"
        onClick={onDone}
        aria-pressed={Boolean(done)}
        aria-label={done ? "Doch nicht erledigt" : "Erledigt"}
        className="hit absolute bottom-1 right-1 z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full"
      >
        <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full ${done ? "bg-good text-on-accent" : "border-2 border-fridge-soft opacity-40"}`}>
          {done && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
        </span>
      </button>
      )}
    </div>
  );
}
