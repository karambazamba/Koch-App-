"use client";

// Ein Zettel an der Kühlschranktür (Tafel 106): Papier je Inhalt –
// Haftnotiz in der Farbe der Person, Karoblatt (Kinder), Polaroid (Foto),
// Kassenbon (Sprachnachricht: gezackte Oberkante, „SPRACHNACHRICHT“, ▶,
// Tonwelle, Dauer). Fest leicht schief, oben ein Magnet („Bleibt hängen“:
// roter Pin), unten Avatar-Kreis mit Initiale, Name und Zeit, rechts der
// Haken-Kreis für „Erledigt“ – wie Aufgaben und Einkauf: Häkchen orange,
// „erledigt von Lisa“, 1 s stehen (nochmal tippen = doch nicht), dann gleitet
// er 0,8 s weich ins Archiv; nie durchgestrichen. Antippen öffnet das Menü
// (Foto: groß im Fenster). Tafel 123: Foto als Polaroid in Zettelgröße
// (quadratisch, object-fit cover), „OBEN“ klein rechts oben an Zetteln, die
// hängen bleiben (der Text bekommt rechts Platz), „Nur für mich“ grau-weiß
// mit grauem Pin und Schloss in der Meta-Zeile. Die Meta-Zeile ist eine
// Zeile: Name und Zeit, bei Platzmangel nur die Zeit – nie „Du · angeh…“.

import { useEffect, useMemo, useState } from "react";
import { Check, ImageIcon, Lock, Play } from "lucide-react";
import { GLEIT_MS, OBEN, formatDauer, doneLine, leavesIn, magnetOf, memoUnheard, reactionLine, tiltOf, zettelTon, type DoorEntry, type PinMessage, type ZettelFarbe } from "@/lib/pinnwand";
import { fotoStore } from "@/lib/pinnwand/fotoStore";
import { pinMetaPartsOf } from "@/components/pinnwand/PinSheets";
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

/** Bild eines Foto-Zettels (vom Gerät, sonst aus dem Haushalt); `square` = quadratischer Ausschnitt (Polaroid in Zettelgröße), `big` = ganz (Fenster) */
export function FotoBild({ pin, className = "", square = false, big = false }: { pin: Pick<PinMessage, "id" | "data">; className?: string; square?: boolean; big?: boolean }) {
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
  const ratio = square ? "1 / 1" : pin.data.foto ? `${pin.data.foto.w} / ${pin.data.foto.h}` : "4 / 3";
  const box = { aspectRatio: ratio, ...(square ? {} : { maxHeight: big ? "62vh" : 220 }) };
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- Bild vom Gerät (Blob-Adresse), nicht optimierbar
    <img src={url} alt={pin.data.text ? `Foto: ${pin.data.text}` : "Foto"} className={`block w-full ${big ? "object-contain" : "object-cover"} ${className}`} style={box} />
  ) : (
    <span className={`flex w-full items-center justify-center bg-fill text-faint ${className}`} style={box} aria-label={missing ? "Foto liegt auf einem anderen Handy" : "Foto lädt"}>
      <ImageIcon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

/**
 * Abgehakt und noch an der Tür: nach wie vielen ms er hinausgleitet (1 s
 * stehen, dann 0,8 s weich weg), sonst null. Einmal je Abhaken gerechnet,
 * sonst springt die Bewegung neu an. Seite und Kachel gleich.
 */
export function useGehtIn(entry: DoorEntry, aktiv = true): number | null {
  const doneAt = aktiv ? entry.data.erledigt?.am : undefined;
  return useMemo(() => {
    const left = doneAt ? leavesIn(entry, now().getTime()) : null;
    return left === null ? null : Math.max(0, left - GLEIT_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur je Abhaken neu
  }, [doneAt]);
}

type Props = {
  item: BoardItem;
  me: string;
  household: string[];
  highlight?: boolean;
  onOpen: () => void;
  onDone?: () => void;
  tone?: ZettelFarbe | "mia";
  demo?: boolean;
  /** Lange gedrückt: angehoben (Schatten, 1,06) */
  lifted?: boolean;
  /** Langes Drücken öffnet das Menü (Archiv, Menü); an der Tür übernimmt das die Wand (Fenster, Ziehen) */
  holdOpens?: boolean;
};

/** Name · Zeit in EINER Zeile: passt der Name nicht mehr, rutscht er in die (unsichtbare) zweite Zeile – die Zeit bleibt */
function MetaZeile({ wer, wann }: { wer: string; wann: string }) {
  return (
    <span className="flex h-[15px] min-w-0 flex-row-reverse flex-wrap justify-end gap-x-1 overflow-hidden" data-meta-zeile>
      <span className="shrink-0 whitespace-nowrap tabular-nums">{wann}</span>
      <span className="min-w-0 whitespace-nowrap">{wer} ·</span>
    </span>
  );
}

export function Zettel({ item, me, household, highlight = false, onOpen, onDone, tone: forced, demo = false, lifted = false, holdOpens = true }: Props) {
  const entry = entryOf(item);
  const privat = item.kind === "pin" && item.pin.data.privat;
  const tone = privat && !forced ? { bg: "var(--app-zettel-privat)", mag: "var(--app-zettel-privat-mag)" } : zettelTon(forced ?? toneOf(item, household));
  const done = entry.data.erledigt;
  const pinned = item.kind === "pin" && item.pin.data.pinned;
  const papier = item.kind === "memo" ? "memo" : item.pin.data.papier;
  const gross = entry.data.groesse === "gross";
  const parts = pinMetaPartsOf(entry, me);
  const meta = demo ? entry.data.author : done ? doneLine(done, me) : `${parts.wer} · ${parts.wann}`;
  // Abgehakt an der Tür: 1 s stehen, dann weich hinaus
  const gehtIn = useGehtIn(entry, Boolean(onDone));
  const reacted = reactionLine(entry.data.reactions);
  const player = useMemoPlayer();
  const paperClass = papier === "karo" ? (privat ? "zettel-privat" : "zettel-karo") : papier === "foto" ? "zettel-papier p-2 pb-2.5" : papier === "memo" ? "zettel-papier zettel-bon" : "";
  const label =
    item.kind === "memo" ? `Sprachnachricht von ${entry.data.author}, ${formatDauer(item.memo.data.dauer)}` : `${item.pin.data.papier === "foto" ? "Foto" : "Zettel"} von ${entry.data.author}: ${item.pin.data.text}`;
  return (
    <div
      id={onDone ? `n-${item.id}` : undefined}
      className={`zettel relative select-none [-webkit-touch-callout:none] ${paperClass} ${highlight ? "zettel-hervor" : ""} ${gehtIn !== null ? "zettel-geht" : ""} ${lifted ? "zettel-hebt" : ""}`}
      style={{ ["--kippen" as string]: `${tiltOf(item.id)}deg`, ...(gehtIn !== null ? { ["--geht-in" as string]: `${gehtIn}ms` } : {}), ...(papier === "zettel" ? { background: tone.bg } : {}) }}
      data-erledigt={done ? "" : undefined}
      data-papier={papier}
      data-groesse={entry.data.groesse ?? "klein"}
      data-privat={privat ? "" : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 z-0"
        style={{ borderRadius: "inherit" }}
        aria-label={`${label}. ${meta}${pinned ? ", bleibt hängen" : ""}${privat ? ", nur für mich" : ""}. Antippen für mehr`}
        onClick={onOpen}
        onContextMenu={(e) => {
          e.preventDefault();
          if (holdOpens) onOpen();
        }}
      />
      <span className="pointer-events-none absolute -top-2.5 left-1/2 z-10 -translate-x-1/2">
        <Magnet form={magnetOf(papier, pinned)} color={tone.mag} />
      </span>
      {pinned && !done && (
        <span className="pointer-events-none absolute right-2 top-1.5 z-10 text-[10px] font-extrabold uppercase leading-none tracking-[0.14em]" style={{ color: `color-mix(in srgb, ${tone.mag} 62%, var(--app-fridge-ink))` }} data-oben>
          {OBEN}
        </span>
      )}
      <div className={`pointer-events-none relative flex flex-col gap-1.5 ${papier === "foto" ? "" : `px-3 pb-2.5 pt-4 ${pinned ? "pr-12" : ""}`}`}>
        {item.kind === "pin" && item.pin.data.replyTo && (
          <span className="text-[12px] font-bold text-fridge-soft">↪ {item.pin.data.replyTo.author}</span>
        )}
        {item.kind === "pin" && item.pin.data.papier === "foto" && <FotoBild pin={item.pin} square={!gross} />}
        {item.kind === "pin" && item.pin.data.text && (
          <p className={`zettel-text whitespace-pre-line break-words font-bold leading-snug ${papier === "foto" ? `px-1 pt-1 text-[15px] ${pinned ? "pr-10" : ""}` : gross ? "text-[17px]" : "text-[16px]"}`}>{item.pin.data.text}</p>
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
        {/* Name · Zeit in einer Zeile, nie abgeschnitten: bei Platzmangel nur die Zeit; rechts bleibt Platz für den Haken-Kreis (pr-6 reicht bis knapp davor, Tafel 123: „Mathis · 12:08“ passt) */}
        <span className={`flex min-h-[30px] items-center gap-1.5 pr-6 text-[12px] font-semibold leading-tight text-fridge-soft ${papier === "foto" ? "px-1" : ""}`} data-meta>
          <ZettelAvatar name={entry.data.author} color={tone.mag} />
          {demo || done ? <span className="min-w-0 break-words">{meta}</span> : <MetaZeile wer={parts.wer} wann={parts.wann} />}
          {privat && <Lock className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />}
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
        <span
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full ${done ? "bg-accent text-on-accent" : "border-2 border-fridge-soft opacity-40"}`}
          style={done ? { animation: "check-pop 0.4s ease-out" } : undefined}
          data-haken
        >
          {done && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
        </span>
      </button>
      )}
    </div>
  );
}
