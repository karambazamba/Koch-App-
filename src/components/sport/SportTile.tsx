"use client";

// SPORT – Pastell-Kachel als Stempelkarte (A-044, Tafel 132), im Raster XS,
// S oder M. XS (A-048, Tafel 135) = zwei kleine Stempel links, rechts „Heute“
// / „8:00 · Laufen“ (ganz schmal ohne Stempel). S = die Felder dieser
// Woche (Stempel, leere gestrichelt) und darunter groß das Nächste
// („Do · 8:00“), klein die Sportart. M = Felder links, rechts „Als Nächstes“
// mit Wetter zur Trainingszeit („Laufen · ☀ 9°“). Geschafft = Kachel grün,
// „Geschafft.“ / „Diese Woche“. Leer = „Diese Woche ist noch frei.“ Plus =
// „Training eintragen“, die Kachel antippen = Sport-Seite. Kein
// Wasserzeichen (auch nicht in XS): die Stempel sind das Bild. Beispiel-Tag
// allein (Tafel 119): „2 von 3 diese Woche“.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { clearDemoTile } from "@/lib/core/demo";
import { QuickButton } from "@/components/ui/QuickButton";
import { TILE, TILE_LABEL } from "@/components/ui/styles";
import type { CalendarEntry, DayItem } from "@/lib/kalender/model";
import { weekdayShort } from "@/lib/kalender/model";
import { clockLabel } from "@/lib/kalender/answers";
import type { TileSize } from "@/lib/core/homeLayout";
import { addDays } from "@/lib/core/now";
import { nextTraining, trainingsBetween, useSport } from "@/lib/sport";
import { XS_BEISPIEL, stempelkarte, xsFelder, xsZeilen, type Feld, type XsFeld } from "@/lib/sport/stempel";
import { useForecast } from "@/lib/wetter/client";
import { round } from "@/lib/wetter/forecast";
import { WeatherSymbol } from "@/components/wetter/WeatherSymbol";
import { StempelFeld, StempelZeichen, feldText, useNeueStempel, type StempelGroesse } from "@/components/sport/Stempel";
import { SportEintragen } from "@/components/sport/SportEintragen";

const BOX = `${TILE} flex flex-col gap-2.5 p-3.5`;

/** Beispiel-Tag (allein): Zeile der Sport-Kachel – nie in echten Speichern */
const DEMO_SPORT = "2 von 3 diese Woche";

/** „Do · 8:00“ (heute: „Heute · 8:00“) */
const kachelWann = (item: Pick<DayItem, "date" | "time">, today: string) => [item.date === today ? "Heute" : weekdayShort(item.date), item.time ? clockLabel(item.time) : null].filter(Boolean).join(" · ");

/** Feldgröße in der Kachel: S bis 2 Felder 54 px, sonst kleiner; M etwas größer */
const groesse = (size: TileSize, felder: number): StempelGroesse => (size === "M" ? (felder <= 3 ? "m" : "mini") : felder <= 2 ? "s" : "mini");

export function SportTile({ size = "S", entries, today, minutes, me, demo = false }: { size?: TileSize; entries: CalendarEntry[]; today: string; minutes: number; me: string | null; demo?: boolean }) {
  const sport = useSport();
  const { forecast } = useForecast();
  const [adding, setAdding] = useState(false);
  // Beispiel-Tag: erstes eigenes Training → Beispiel verschwindet für immer
  const hasOwn = Boolean(sport?.trainings.length);
  useEffect(() => {
    if (demo && hasOwn) clearDemoTile("sport");
  }, [demo, hasOwn]);
  if (!sport) return <section className={`${BOX} h-full animate-pulse`} aria-label="Sport" />;
  const karte = stempelkarte(sport, entries, today, minutes, me);
  const recent = [...new Set(trainingsBetween(sport, entries, addDays(today, -60), today, today, me).reverse().map((t) => t.data.sport))];
  const next = nextTraining(entries, today, minutes, me);
  const hour = next?.time ? Number(next.time.slice(0, 2)) : null;
  const weatherAt = next && hour !== null ? forecast?.hours.find((h) => h.date === next.date && h.hour === hour) : undefined;
  const showDemo = demo && !hasOwn;
  const leer = !karte.felder.some((f) => f.art === "stempel") && !next;
  const zustand = showDemo ? "beispiel" : karte.geschafft ? "geschafft" : leer ? "leer" : "normal";
  const xs = xsZeilen(karte, next, today, showDemo);
  return (
    <>
      <section
        className={`${size === "XS" ? `${TILE} flex flex-col justify-between px-3 py-2.5` : BOX} isolate h-full overflow-hidden`}
        aria-label={showDemo ? "Sport · Beispiel" : "Sport"}
        data-groesse={size}
        data-sport-zustand={zustand}
        data-geschafft={karte.geschafft && !showDemo ? "" : undefined}
      >
        {/* Die ganze Kachel öffnet die Sport-Seite; das Plus liegt darüber */}
        <Link href="/sport" className="absolute inset-0 rounded-card" aria-label="Sport öffnen" />
        <span className={`pointer-events-none relative pr-8 ${TILE_LABEL}`}>Sport</span>
        <span className={`absolute z-10 ${size === "XS" ? "right-2 top-2" : "right-3.5 top-3"}`}>
          <QuickButton icon={Plus} label="Training eintragen" onClick={() => setAdding(true)} />
        </span>
        {size === "XS" ? (
          <div className="pointer-events-none relative flex min-h-[30px] min-w-0 items-center gap-2" data-zeile data-sport-xs>
            <span className="sr-only">{xs.vorlesen}</span>
            <XsFelder felder={showDemo ? XS_BEISPIEL : xsFelder(karte.felder)} />
            <p className="flex min-w-0 flex-1 flex-col leading-tight" aria-hidden>
              <span className="whitespace-nowrap text-[14px] font-extrabold tabular-nums">{xs.oben}</span>
              {/* „8:00 · Laufen“: Teile mit Abstand statt Leerzeichen am Rand (das schluckt flex – „8:00 ·Laufen“, Tafel 135) */}
              <span className="flex min-w-0 gap-1 whitespace-nowrap text-[12.5px] font-semibold text-muted">
                {xs.zeit && <span className="shrink-0 tabular-nums">{xs.zeit}</span>}
                {xs.zeit && <span className="shrink-0">·</span>}
                <span className={xs.freitext ? "min-w-0 truncate" : undefined} data-freitext={xs.freitext || undefined}>{xs.unten}</span>
              </span>
            </p>
          </div>
        ) : showDemo ? (
          <p className="pointer-events-none relative text-[15px] font-bold leading-snug">{DEMO_SPORT}</p>
        ) : (
          <div className={`pointer-events-none relative flex ${size === "M" ? "items-center gap-4" : "flex-1 flex-col gap-2.5"}`}>
            <Felder felder={karte.felder} size={size} />
            <Unterzeile size={size} karte={karte} next={next} leer={leer} today={today} weather={weatherAt} />
          </div>
        )}
      </section>
      {adding && <SportEintragen today={today} recent={recent} onClose={() => setAdding(false)} />}
    </>
  );
}

/** XS: zwei kleine Felder (30 px); ganz schmal (Board unter 320 px) ohne – dann hat der Text den Platz */
function XsFelder({ felder }: { felder: XsFeld[] }) {
  return (
    <span className="flex shrink-0 gap-1 @max-[320px]:hidden" aria-hidden data-sport-felder>
      {felder.map((f, i) => (f.art === "stempel" ? <StempelZeichen key={f.stempel.id} stempel={f.stempel} groesse="xs" /> : <StempelFeld key={`feld-${i}`} feld={f} groesse="xs" mitZeit={false} />))}
    </span>
  );
}

function Felder({ felder, size }: { felder: Feld[]; size: TileSize }) {
  const neu = useNeueStempel(felder.flatMap((f) => (f.art === "stempel" ? [f.stempel.id] : [])));
  const g = groesse(size, felder.length);
  return (
    <ol className={`flex shrink-0 flex-wrap ${g === "mini" ? "gap-1.5" : "gap-2.5"} ${size === "M" ? "max-w-[55%]" : ""}`} aria-label="Diese Woche">
      {felder.map((f, i) => (
        <li key={f.art === "stempel" ? f.stempel.id : `feld-${i}`} aria-label={feldText(f)}>
          <StempelFeld feld={f} groesse={g} neu={f.art === "stempel" && neu(f.stempel.id)} mitZeit={false} />
        </li>
      ))}
    </ol>
  );
}

function Unterzeile({ size, karte, next, leer, today, weather }: { size: TileSize; karte: ReturnType<typeof stempelkarte>; next: DayItem | null; leer: boolean; today: string; weather?: { code: number; temp: number } }) {
  if (karte.geschafft)
    return (
      <p className="flex min-w-0 flex-col">
        <span className="text-[19px] font-extrabold leading-tight text-tile-accent">Geschafft.</span>
        <span className="text-[13px] font-semibold text-tile-accent">Diese Woche</span>
      </p>
    );
  if (leer) return <p className="text-[15px] font-bold leading-snug">Diese Woche ist noch frei.</p>;
  if (!next) return <p className="text-[15px] font-bold leading-snug">{karte.satz}</p>;
  return (
    <p className="flex min-w-0 flex-col">
      {size === "M" && <span className="text-[11px] font-extrabold uppercase tracking-wide text-tile-accent">Als Nächstes</span>}
      <span className="text-[19px] font-extrabold leading-tight tabular-nums">{kachelWann(next, today)}</span>
      <span className="flex min-w-0 items-center gap-1 whitespace-nowrap text-[13px] text-muted">
        <span className="truncate" data-freitext>{next.title}</span>
        {size === "M" && weather && (
          <>
            <span aria-hidden>·</span>
            <WeatherSymbol code={weather.code} className="h-4 w-4" />
            {round(weather.temp)}°
          </>
        )}
      </span>
    </p>
  );
}
