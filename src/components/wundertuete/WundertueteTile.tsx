"use client";

// MIAS WUNDERTÜTE (A-022; Tafel 137/140, A-052): Kachel S/M mit Witzen,
// Plattdeutsch und Angeberwissen, keine Punkte. Kopf je Sorte: „Platt för
// Plietsche“ mit Anker, sonst „Wundertüte“ mit Geschenk und kleiner Sorte
// („WITZ“, „ANGEBERWISSEN“). Groß das Wort, die Frage oder der Witz (die
// Schrift passt sich der Fläche an, nie „…“, `useEinpassen`); beim Witz steht
// die Pointe gleich darunter, bei Platt und Wissen unten „Antippen für die
// Lösung“ – Antippen öffnet die Seite /wundertuete, dort steht die Lösung
// groß (die Kachel lügt nicht). An einem neuen Tag kommt von selbst die
// nächste Karte, nie doppelt. Wasserzeichen: Anker bzw. Geschenk.
// Beispiel-Tag: „Was heißt ‚Kiek mol an‘?“ (nie gespeichert); „Beispiel“ nur
// für VoiceOver – sichtbar steht das eine leise Schild an der Pinnwand (Tafel 119).

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Anchor, Gift, type LucideIcon } from "lucide-react";
import { TILE, TILE_LABEL } from "@/components/ui/styles";
import { KachelWasserzeichen, WASSERZEICHEN_STRICH } from "@/components/ui/KachelWasserzeichen";
import type { TileSize } from "@/lib/core/homeLayout";
import { clearDemoTile } from "@/lib/core/demo";
import { useNameEinpassen, useSchriftEinpassen } from "@/components/wundertuete/useEinpassen";
import { useWundertuete, wtZeigen } from "@/lib/wundertuete/store";
import { karteVon } from "@/lib/wundertuete/auswahl";
import { lageAus } from "@/lib/wundertuete/lage";
import type { Haushalt } from "@/lib/core/haushalt";
import { useForecast } from "@/lib/wetter/client";
import { BEISPIEL_KARTE } from "@/lib/wundertuete/pool";
import { ANTIPPEN, KOMMT_BALD, sorteMeta, type Eintrag, type SorteMeta } from "@/lib/wundertuete/sorten";

const SYMBOL: Record<SorteMeta["symbol"], LucideIcon> = { gift: Gift, anchor: Anchor };

/** Schriftstufen (px), von groß nach klein: die erste, bei der alles ganz zu sehen ist (M breiter, also größer) */
export const TEXT_STUFEN: Record<"S" | "M", readonly number[]> = { S: [19, 17, 15.5, 14, 13, 12, 11.5], M: [23, 21, 19, 17, 15.5, 14, 13] };

/** Satz unten bei Platznot kürzer (`data-eng`, useEinpassen) */
const ANTIPPEN_KURZ = "Antippen: Lösung";

/**
 * Wasserzeichen bei „Platt för Plietsche“ (Tafel 140): ein Anker im Stil von
 * `KachelWasserzeichen` (leise, die Schrift steht frei); sonst das Geschenk
 * über `KachelWasserzeichen` direkt in der Kachel.
 */
function Anker() {
  return (
    <span className="kachel-wasserzeichen pointer-events-none absolute -bottom-[30px] -right-[30px] -z-10 flex h-[150px] w-[150px] -rotate-[8deg] select-none [&>svg]:h-full [&>svg]:w-full" data-kachel="wundertuete" data-symbol="anchor" data-art="frei" aria-hidden>
      <Anchor strokeWidth={WASSERZEICHEN_STRICH} aria-hidden />
    </span>
  );
}

/** Text in fester Fläche: Schrift so groß wie möglich, nie abgeschnitten */
function Eingepasst({ stufen, text, children }: { stufen: readonly number[]; text: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inhalt = useRef<HTMLDivElement>(null);
  useSchriftEinpassen(box, inhalt, stufen, text);
  return (
    <div ref={box} className="mt-0.5 min-h-0 flex-1 overflow-hidden">
      <div ref={inhalt} lang="de" className="hyphens-auto break-words" style={{ fontSize: stufen[0] }}>
        {children}
      </div>
    </div>
  );
}

function Kopf({ meta }: { meta: SorteMeta }) {
  const Icon = SYMBOL[meta.symbol];
  const name = useRef<HTMLSpanElement>(null);
  useNameEinpassen(name, meta.id);
  return (
    <div className="flex h-[26px] shrink-0 items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-tile-label" strokeWidth={2} aria-hidden />
      <span ref={name} className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap ${TILE_LABEL}`}>
        <span data-name="voll">{meta.titel}</span>
        <span data-name="kurz" hidden>
          {meta.kurz}
        </span>
      </span>
    </div>
  );
}

/** Alles gesehen, Mia hat (noch) nichts Neues: freundlich, nie eine Wiederholung */
function KommtBald({ size }: { size: TileSize }) {
  return (
    <Link href="/wundertuete" className="block h-full" data-wundertuete data-kommt-bald aria-label={`Wundertüte: ${KOMMT_BALD.alles}`}>
      <section className={`${TILE} isolate flex h-full flex-col overflow-hidden p-3`} data-tone="notizen" data-groesse={size}>
        <KachelWasserzeichen kachel="wundertuete" size={size} frei />
        <div className="flex h-[26px] shrink-0 items-center gap-1.5">
          <Gift className="h-3.5 w-3.5 shrink-0 text-tile-label" strokeWidth={2} aria-hidden />
          <span className={`min-w-0 flex-1 ${TILE_LABEL}`}>Wundertüte</span>
        </div>
        <p className="mt-1 text-[15px] font-extrabold leading-snug">
          <span className="kachel-frei">{KOMMT_BALD.alles}</span>
        </p>
      </section>
    </Link>
  );
}

export function WundertueteTile({ size = "S", today, minutes, haushalt, gericht, demo = false }: { size?: TileSize; today: string; minutes: number; haushalt: Haushalt; gericht: string | null; demo?: boolean; name: string }) {
  const stand = useWundertuete();
  const { forecast } = useForecast();
  const lage = lageAus({ heute: today, minuten: minutes, haushalt, forecast, gericht });
  // Karte des Tages (an einem neuen Tag die nächste, gilt ab dann als gesehen)
  const key = `${lage.heute}|${lage.wetter ?? ""}|${lage.gericht ?? ""}`;
  useEffect(() => {
    if (!demo) wtZeigen(lage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur, wenn sich die Lage ändert
  }, [demo, key]);
  const vonHeute = stand?.aktuell?.tag === lage.heute ? stand.aktuell : null;
  const karte: Eintrag | undefined = demo ? BEISPIEL_KARTE : stand && vonHeute ? karteVon(stand, vonHeute.id) : undefined;
  if (!karte && stand && !stand.aktuell && stand.gesehen.length) return <KommtBald size={size} />;
  if (!karte) return <section className={`${TILE} h-full animate-pulse`} data-tone="notizen" aria-label="Wundertüte" data-groesse={size} />;
  const meta = sorteMeta(karte.sorte);
  const stufe = size === "M" ? "M" : "S";
  const label = `${meta.titel}${meta.label ? ` · ${meta.label}` : ""}${demo ? " · Beispiel" : ""}: ${karte.vorne}${meta.frage ? ` · ${ANTIPPEN}` : karte.hinten ? ` ${karte.hinten}` : ""}`;
  return (
    <Link
      href="/wundertuete"
      onClick={() => demo && clearDemoTile("wundertuete")}
      aria-label={label}
      className="wt-karte relative block h-full min-h-0 select-none outline-none"
      data-karte={karte.id}
      data-sorte={karte.sorte}
      data-groesse={size}
      data-wundertuete
    >
      <section key={karte.id} className={`wt-vorne wt-neu isolate ${TILE.replace(/(^| )relative(?= |$)/, " ").trim()} absolute inset-0 flex flex-col overflow-hidden p-3`} data-tone={meta.tone}>
        {meta.symbol === "anchor" ? <Anker /> : <KachelWasserzeichen kachel="wundertuete" size={size} frei />}
        <Kopf meta={meta} />
        {meta.label && (
          <span className="-mt-0.5 shrink-0 text-[11px] font-extrabold uppercase leading-tight tracking-wide text-tile-accent" data-sorte-label>
            <span className="kachel-frei">{meta.label}</span>
          </span>
        )}
        <Eingepasst stufen={TEXT_STUFEN[stufe]} text={`${karte.id}|${size}`}>
          <p className="font-extrabold leading-[1.2]" data-frage>
            {karte.vorne}
          </p>
          {!meta.frage && karte.hinten && (
            <p className="mt-1 text-[0.8em] font-semibold leading-snug" data-pointe>
              {karte.hinten}
            </p>
          )}
        </Eingepasst>
        {meta.frage && (
          <span className="mt-1 shrink-0 text-[12px] font-bold leading-tight text-tile-accent" data-unten={ANTIPPEN}>
            <span className="kachel-frei" data-hinweis="voll">
              {ANTIPPEN}
            </span>
            <span className="kachel-frei" data-hinweis="kurz">
              {ANTIPPEN_KURZ}
            </span>
          </span>
        )}
      </section>
    </Link>
  );
}
