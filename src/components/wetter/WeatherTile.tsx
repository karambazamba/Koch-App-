"use client";

// WETTER mit Himmel (Tafel 120, Raster Tafel 118): Look „Farbig“ = stiller
// Himmel je Wetter und Tag/Nacht, Look „Schlicht“ = weiß; in JEDER Größe
// rechts oben eine kleine, ruhige Szene (`WetterSzene`: Sonne, leicht
// bewölkt, bewölkt, Regen, Gewitter, Schnee, Wind – nur wenn er auffällt
// (`windZeigen`) –, Nacht), leicht angeschnitten, nicht animiert. Der Text
// steht links und nie unter der Zeichnung:
// XS = Temperatur groß + EIN kurzer Satz (≤ 22 Zeichen, „ab 15 Uhr Regen“);
// S = dazu ↑ max / ↓ min; M = dazu die nächsten Stunden im 2-Stunden-Abstand.
// Offline: letzte Werte mit „Stand 8:10“. Antippen → Wetter-Seite.

import Link from "next/link";
import type { TileSize } from "@/lib/core/homeLayout";
import type { AppLook } from "@/lib/einstellungen/profileModel";
import { round, todayRange } from "@/lib/wetter/forecast";
import { isNight, weatherGroup } from "@/lib/wetter/view";
import { kachelHimmel, kachelLage, kachelSatz, kachelSzene, kachelWind, kachelZeile, szeneAus, zweiStunden } from "@/lib/wetter/kachel";
import { windSpoken, windZeigen } from "@/lib/wetter/wind";
import { useForecast } from "@/lib/wetter/client";
import { tomorrowLabel } from "@/lib/kalender/model";
import { shortClock } from "@/components/notizen/Schnellnotiz";
import { WeatherSymbol } from "@/components/wetter/WeatherSymbol";
import { WetterSzene } from "@/components/wetter/WetterSzene";
import { TILE, TILE_LABEL } from "@/components/ui/styles";

const BOX = `${TILE} wx-himmel relative flex h-full w-full flex-col overflow-hidden text-left`;
const PAD: Record<TileSize, string> = { XS: "px-3 py-2.5", S: "p-3", M: "p-3" };
/** Platz rechts für die Szene: der Text läuft nie darunter */
const FREI: Record<TileSize, string> = { XS: "pr-12", S: "pr-16", M: "pr-24" };
const TEMP: Record<TileSize, string> = { XS: "text-[26px]", S: "text-[40px]", M: "text-[40px]" };
const LABEL = `relative flex min-w-0 items-center gap-1.5 ${TILE_LABEL}`;

export function WeatherTile({
  size = "XS",
  today,
  minutes,
  look = "farbig",
  tomorrow = false,
}: {
  size?: TileSize;
  today: string;
  minutes: number;
  /** Look der Startseite: „Farbig“ = Himmel, „Schlicht“ = weiß mit kleiner, blasser Szene */
  look?: AppLook;
  /** Feierabend: das Wetter von morgen */
  tomorrow?: boolean;
}) {
  const { forecast, stale, failed, place } = useForecast();
  const label = `Wetter · ${place}`;
  const schlicht = look === "schlicht";
  if (!forecast)
    return (
      <Link href="/wetter" className={`${BOX} ${PAD[size]}`} data-himmel={schlicht ? "schlicht" : "bewoelkt"} data-groesse={size} aria-label={label}>
        <span className={LABEL}>
          <span className="min-w-0 break-words">{label}</span>
        </span>
        <span className="relative mt-auto text-[13px] font-semibold leading-snug text-muted">{failed ? "Gerade keine Wetterdaten." : "Wetter lädt …"}</span>
      </Link>
    );
  const next = forecast.days.find((d) => d.date > today);
  if (tomorrow && next) {
    const sky = kachelHimmel(weatherGroup(next.code), false, look, next.wind ?? null);
    const szene = szeneAus(weatherGroup(next.code), next.code, false, next.wind ?? null);
    const satz = next.wet > 0 ? "Schirm einpacken" : next.text;
    return (
      <Link href="/wetter?tag=morgen" className={`${BOX} ${PAD[size]}`} data-himmel={sky.key} data-ton={sky.ton ?? undefined} data-groesse={size} data-szene={szene} aria-label={`Wetter ${tomorrowLabel(next.date)} · ${place}: ${round(next.max)}°, ${satz} – öffnen`}>
        <WetterSzene szene={szene} size={size} schlicht={schlicht} />
        <span className={`${LABEL} ${FREI[size]}`}>
          <span className="min-w-0 break-words">{tomorrowLabel(next.date)}</span>
        </span>
        {/* XS: der Satz steht unter der Szene (volle Breite, eine Zeile); auf ganz schmalen Geräten (Board < 320 px, iPhone SE 1) bricht schon „Morgen · Do“ um – dann lieber ohne Satz als überquellen */}
        <span className={`relative mt-auto flex flex-col ${size === "XS" ? "" : FREI[size]}`}>
          <span className={`${TEMP[size]} font-extrabold tabular-nums leading-none`}>
            {round(next.max)}°{size !== "XS" && <span className="wx-soft text-[15px] font-semibold"> / {round(next.min)}°</span>}
          </span>
          <span className={`text-[13px] font-semibold leading-snug ${size === "XS" ? "mt-0.5 @max-[320px]:hidden" : "mt-1"}`} data-wetter-zeile>
            {satz}
          </span>
        </span>
      </Link>
    );
  }
  const nowHour = Math.floor(minutes / 60);
  const night = isNight(today, minutes);
  const wind = kachelWind(forecast, today, nowHour);
  const sky = kachelHimmel(kachelLage(forecast, today, nowHour), night, look, wind);
  const szene = kachelSzene(forecast, today, nowHour, night);
  const satz = kachelSatz(forecast, today, nowHour, night);
  const line = kachelZeile(forecast, today, nowHour);
  const range = todayRange(forecast, today);
  const hours = size === "M" ? zweiStunden(forecast, today, nowHour) : [];
  const temp = round(forecast.current.temp);
  const spoken = [`${temp}°`, `${line.wort}${line.rest ? `, ${line.rest}` : ""}`, windZeigen(wind) ? windSpoken(wind) : null].filter(Boolean).join(", ");
  return (
    <Link href="/wetter" className={`${BOX} ${PAD[size]}`} data-himmel={sky.key} data-ton={sky.ton ?? undefined} data-groesse={size} data-szene={szene} aria-label={`${label}: ${spoken} – öffnen`}>
      <WetterSzene szene={szene} size={size} schlicht={schlicht} />
      <span className={`${LABEL} ${FREI[size]}`}>
        <span className="min-w-0 break-words">{size === "XS" ? "Wetter" : label}</span>
        {stale && <span className="shrink-0 font-semibold normal-case tracking-normal">· {shortClock(forecast.fetchedAt)}</span>}
      </span>
      {size === "S" ? (
        // S: Temperatur oben links neben der Szene (nur so breit wie die Zahl), Satz und ↑/↓ unten (unter der Szene ist Platz)
        <>
          <span className={`relative mt-1 self-start ${TEMP.S} font-extrabold tabular-nums leading-none`}>{temp}°</span>
          <span className="relative mt-auto flex flex-col">
            <span className="text-[13px] font-semibold leading-snug" data-wetter-zeile>
              {satz}
            </span>
            {range && (
              <span className="wx-soft text-[14px] font-semibold tabular-nums" aria-label={`Höchstens ${range.max}°, mindestens ${range.min}°`}>
                ↑ {range.max}° ↓ {range.min}°
              </span>
            )}
          </span>
        </>
      ) : (
        <span className={`relative flex flex-col ${size === "XS" ? "mt-auto" : `mt-1 ${FREI.M}`}`}>
          <span className="flex items-baseline gap-2">
            <span className={`${TEMP[size]} font-extrabold tabular-nums leading-none`}>{temp}°</span>
            {size === "M" && range && (
              <span className="wx-soft text-[14px] font-semibold tabular-nums" aria-label={`Höchstens ${range.max}°, mindestens ${range.min}°`}>
                ↑ {range.max}° ↓ {range.min}°
              </span>
            )}
          </span>
          <span className="mt-0.5 text-[13px] font-semibold leading-snug" data-wetter-zeile>
            {satz}
          </span>
        </span>
      )}
      {hours.length > 0 && (
        <span className="wx-linie relative mt-auto grid grid-cols-4 border-t pt-1" aria-label="Nächste Stunden" data-stunden>
          {hours.map((h) => (
            <span key={h.key} className="flex flex-col items-center">
              <span className="wx-soft text-[12px] font-semibold tabular-nums leading-tight">{h.hour}</span>
              <WeatherSymbol code={h.code} night={h.night} className="h-6 w-6" />
              <span className="text-[14px] font-extrabold tabular-nums leading-tight">{h.temp}°</span>
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}
