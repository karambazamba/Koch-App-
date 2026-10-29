"use client";

// MIAS WUNDERTÜTE (A-022; Tafel 137/140, A-052; Lösung erst nach Antippen
// A-059, Tafel 145): Kachel S/M mit Witzen, Plattdeutsch und Angeberwissen,
// keine Punkte. Kopf je Sorte: „Platt för Plietsche“ mit Anker, sonst
// „Wundertüte“ mit Geschenk und kleiner Sorte („WITZ“, „ANGEBERWISSEN“).
// Vorn nur die Frage, der Witz-Anfang bzw. das Platt-Wort (möglichst in
// höchstens 2 Zeilen, sonst kleiner, nie „…“, nie getrennt: `useEinpassen`),
// unten „Antippen für die Lösung“. Antippen dreht die Karte um (0,6 s,
// reduced-motion: Überblenden): hinten die Lösung bzw. Pointe im weißen Feld
// und unten rechts „Mehr ›“ (eigene Tippfläche ≥ 44 px) – nur darüber geht es
// zur Seite /wundertuete. Nochmal antippen = zurück. Schrift immer in voller
// Farbe (Tinte oder Kachel-Akzent, ≥ 4,5:1). An einem neuen Tag kommt von
// selbst die nächste Karte, nie doppelt. Wasserzeichen: Anker bzw. Geschenk.
// Beispiel-Tag: „Was heißt ‚Kiek mol an‘?“ (nie gespeichert); „Beispiel“ nur
// für VoiceOver – sichtbar steht das eine leise Schild an der Pinnwand (Tafel 119).

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Anchor, ChevronRight, Gift, RotateCw, type LucideIcon } from "lucide-react";
import { TILE, TILE_LABEL } from "@/components/ui/styles";
import { KachelWasserzeichen, WASSERZEICHEN_STRICH } from "@/components/ui/KachelWasserzeichen";
import type { TileSize } from "@/lib/core/homeLayout";
import { clearDemoTile } from "@/lib/core/demo";
import { SATZ_KURZ, useNameEinpassen, useSchriftEinpassen, type Versuch } from "@/components/wundertuete/useEinpassen";
import { merkeAufgedeckt } from "@/lib/wundertuete/aufgedeckt";
import { useWundertuete, wtZeigen } from "@/lib/wundertuete/store";
import { karteVon } from "@/lib/wundertuete/auswahl";
import { lageAus } from "@/lib/wundertuete/lage";
import type { Haushalt } from "@/lib/core/haushalt";
import { useForecast } from "@/lib/wetter/client";
import { BEISPIEL_KARTE } from "@/lib/wundertuete/pool";
import { ANTIPPEN, KOMMT_BALD, antwortTeile, ohneFett, sorteMeta, type Eintrag, type SorteMeta } from "@/lib/wundertuete/sorten";

const SYMBOL: Record<SorteMeta["symbol"], LucideIcon> = { gift: Gift, anchor: Anchor };

/** Schriftstufen (px), von groß nach klein: die erste, bei der alles ganz zu sehen ist (M breiter, also größer) */
export const TEXT_STUFEN: Record<"S" | "M", readonly number[]> = { S: [19, 17, 15.5, 14, 13, 12, 11.5], M: [23, 21, 19, 17, 15.5, 14, 13] };
/** Rückseite: Frage klein, Lösung im weißen Feld (Tafel 145) */
const HINTEN_STUFEN: Record<"S" | "M", readonly number[]> = { S: [16, 15, 14, 13, 12, 11.5, 11, 10.5, 10], M: [19, 17, 15.5, 14, 13, 12, 11.5, 11] };

/** Vorn: die Frage möglichst in höchstens 2 Zeilen (A-059), erst dann kleiner ohne Grenze */
const VORN: Versuch[] = [...SATZ_KURZ.map((v) => ({ ...v, zeilen: 2 })), ...SATZ_KURZ];
/** Hinten: mit der Frage über der Lösung; passt das nicht, nur die Lösung (`data-ohne-frage`), zuletzt ohne kleine Sorte (`data-knapp`) */
const HINTEN: Versuch[] = [
  { vorbereiten: (k) => (k?.toggleAttribute("data-ohne-frage", false), k?.toggleAttribute("data-knapp", false)) },
  { vorbereiten: (k) => k?.toggleAttribute("data-ohne-frage", true) },
  // Ganz knapp (iPhone SE, lange Antwort, langes Wort wie „Küstenseeschwalbe“): auch ohne die kleine Sorte, schmaleres Feld; der Kopf bleibt
  { vorbereiten: (k) => k?.toggleAttribute("data-knapp", true) },
];

/** Antwort mit fetten Wörtern (**…**) */
const Antwort = ({ text }: { text: string }) => <>{antwortTeile(text).map((t, i) => (t.fett ? <strong key={i} className="font-extrabold">{t.text}</strong> : <span key={i}>{t.text}</span>))}</>;

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

/** Text in fester Fläche: Schrift so groß wie möglich, nie abgeschnitten, nie getrennt */
function Eingepasst({ stufen, text, versuche, children }: { stufen: readonly number[]; text: string; versuche: Versuch[]; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inhalt = useRef<HTMLDivElement>(null);
  useSchriftEinpassen(box, inhalt, stufen, text, versuche);
  return (
    <div ref={box} className="mt-0.5 min-h-0 flex-1 overflow-hidden">
      <div ref={inhalt} lang="de" className="break-normal hyphens-none" style={{ fontSize: stufen[0] }}>
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
      <Icon className="h-3.5 w-3.5 shrink-0 text-tile-accent" strokeWidth={2} aria-hidden />
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
          <Gift className="h-3.5 w-3.5 shrink-0 text-tile-accent" strokeWidth={2} aria-hidden />
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
  return <Karte key={karte.id} karte={karte} size={size} demo={demo} />;
}

/** Die Karte zum Umdrehen: vorn die Frage, hinten die Lösung im weißen Feld und „Mehr ›“ */
function Karte({ karte, size, demo }: { karte: Eintrag; size: TileSize; demo: boolean }) {
  const [gedreht, setGedreht] = useState(false);
  const meta = sorteMeta(karte.sorte);
  const stufe = size === "M" ? "M" : "S";
  const loesung = karte.hinten ? ohneFett(karte.hinten) : "";
  const label = `${meta.titel}${meta.label ? ` · ${meta.label}` : ""}${demo ? " · Beispiel" : ""}: ${karte.vorne}${gedreht ? (loesung ? ` ${meta.frage ? "Lösung: " : ""}${loesung}` : "") : ` · ${ANTIPPEN}`}`;
  const drehen = () => {
    if (demo) clearDemoTile("wundertuete");
    merkeAufgedeckt(karte.id, !gedreht);
    setGedreht(!gedreht);
  };
  const taste = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    drehen();
  };
  const flaeche = `${TILE.replace(/(^| )relative(?= |$)/, " ").trim()} absolute inset-0 flex flex-col overflow-hidden p-3`;
  const kopf = (
    <>
      <Kopf meta={meta} />
      {meta.label && (
        <span className="-mt-0.5 shrink-0 text-[11px] font-extrabold uppercase leading-tight tracking-wide text-tile-accent" data-sorte-label>
          <span className="kachel-frei">{meta.label}</span>
        </span>
      )}
    </>
  );
  return (
    <div className="wt-karte wt-neu relative block h-full min-h-0 select-none" data-karte={karte.id} data-sorte={karte.sorte} data-groesse={size} data-gedreht={gedreht || undefined} data-wundertuete>
      <div role="button" tabIndex={0} aria-pressed={gedreht} aria-label={label} onClick={drehen} onKeyDown={taste} className="wt-buehne absolute inset-0 rounded-card outline-none" data-drehen>
        <div className="wt-dreh relative h-full w-full">
          <section className={`wt-seite wt-vorne isolate ${flaeche}`} data-tone={meta.tone} inert={gedreht} data-seite-karte="vorn">
            {meta.symbol === "anchor" ? <Anker /> : <KachelWasserzeichen kachel="wundertuete" size={size} frei />}
            {kopf}
            <Eingepasst stufen={TEXT_STUFEN[stufe]} text={`${karte.id}|${size}|vorn`} versuche={VORN}>
              <p className="font-extrabold leading-[1.2]" data-frage>
                {karte.vorne}
              </p>
            </Eingepasst>
            <span className="mt-1 flex shrink-0 items-center gap-1 text-[12px] font-bold leading-tight text-tile-accent" data-unten={ANTIPPEN}>
              <RotateCw className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
              <span className="kachel-frei" data-hinweis="voll">
                {ANTIPPEN}
              </span>
              <span className="kachel-frei" data-hinweis="kurz">
                {ANTIPPEN_KURZ}
              </span>
            </span>
          </section>
          <section className={`wt-seite wt-hinten isolate ${flaeche}`} data-tone={meta.tone} inert={!gedreht} data-seite-karte="hinten">
            {meta.symbol === "anchor" ? <Anker /> : <KachelWasserzeichen kachel="wundertuete" size={size} frei />}
            {kopf}
            <Eingepasst stufen={HINTEN_STUFEN[stufe]} text={`${karte.id}|${size}|hinten`} versuche={HINTEN}>
              <p className="text-[0.8em] font-extrabold leading-[1.2]" data-frage>
                {karte.vorne}
              </p>
              {karte.hinten && (
                <p className="wt-feld mt-1.5 rounded-field bg-tile-inner px-2.5 py-2 font-extrabold leading-[1.2] text-tile-accent" data-loesung={meta.frage || undefined} data-pointe={meta.frage ? undefined : true}>
                  <Antwort text={karte.hinten} />
                </p>
              )}
            </Eingepasst>
            {/* Platz für „Mehr ›“ unten rechts */}
            <span className="h-[26px] shrink-0" aria-hidden />
          </section>
        </div>
      </div>
      {gedreht && (
        <Link href="/wundertuete" className="absolute bottom-0 right-0 z-10 flex min-h-11 min-w-11 items-end justify-end p-2" aria-label="Mehr aus der Wundertüte" data-mehr>
          <span className="flex items-center gap-0.5 rounded-full bg-tile-inner py-1 pl-2.5 pr-1.5 text-[12px] font-extrabold leading-none text-tile-accent">
            Mehr <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
          </span>
        </Link>
      )}
    </div>
  );
}
