"use client";

// MIAS WUNDERTÜTE (A-022, Tafel 116): eine Kachel, die jeden Tag anders
// heißt. Vorne: Kopf (Symbol + Sorte), die Frage groß und fett (die Schrift
// passt sich der Fläche an, nie „…“, `useEinpassen`), unten links der Hinweis der Sorte, unten rechts drei Punkte = wie
// oft diese Karte schon da war. Antippen dreht sie um (sanfte 3D-Drehung,
// reduced-motion = Überblenden): hinten weiß mit farbigem Rand, Antwort mit
// EINEM fetten Wort, „Nochmal tippen = Neues“, oben rechts Teilen. Ohne
// Rückseite (Tischrunde, Wer zuerst) bringt Antippen gleich die nächste.
// S und M sind dieselbe Karte, M nur breiter mit größerer Frage. Beispiel-Tag:
// eine feste Karte Angeberwissen (nie gespeichert); „Beispiel“ nur für
// VoiceOver – sichtbar steht das eine leise Schild an der Pinnwand (Tafel 119).

import { useEffect, useRef, useState } from "react";
import { Anchor, Calendar, Dice5, Lightbulb, MessageSquare, Puzzle, Scale, Share, type LucideIcon } from "lucide-react";
import { TILE, TILE_LABEL } from "@/components/ui/styles";
import { KachelWasserzeichen } from "@/components/ui/KachelWasserzeichen";
import { QuickButton } from "@/components/ui/QuickButton";
import type { TileSize } from "@/lib/core/homeLayout";
import { now } from "@/lib/core/now";
import { clearDemoTile } from "@/lib/core/demo";
import { showToast } from "@/lib/core/toast";
import { buzz } from "@/components/heute/actions";
import { useNameEinpassen, useSchriftEinpassen } from "@/components/wundertuete/useEinpassen";
import { useWundertuete, wtAnzeigen, wtWeiter } from "@/lib/wundertuete/store";
import { ANZEIGEN_MAX, hatRueckseite, istAbends, tippAktion } from "@/lib/wundertuete/auswahl";
import { lageAus } from "@/lib/wundertuete/lage";
import type { Haushalt } from "@/lib/core/haushalt";
import { useForecast } from "@/lib/wetter/client";
import { BEISPIEL_KARTE, eintragVon } from "@/lib/wundertuete/pool";
import { antwortTeile, hinweisFuer, hinweisKurzFuer, sorteMeta, teilText, type Eintrag, type SorteMeta } from "@/lib/wundertuete/sorten";

const SYMBOL: Record<SorteMeta["symbol"], LucideIcon> = { lightbulb: Lightbulb, anchor: Anchor, puzzle: Puzzle, calendar: Calendar, message: MessageSquare, scale: Scale, dice: Dice5 };

/** Schriftstufen (px), von groß nach klein: die erste, bei der alles ganz zu sehen ist (M breiter, also größer) */
export const FRAGE_STUFEN: Record<"S" | "M", readonly number[]> = { S: [17, 15.5, 14, 13, 12], M: [21, 19, 17, 15.5, 14] };
export const ANTWORT_STUFEN: Record<"S" | "M", readonly number[]> = { S: [14.5, 13.5, 12.5, 12, 11.5], M: [17, 15.5, 14, 13] };

/** Text in fester Fläche: Schrift so groß wie möglich, nie abgeschnitten */
function Eingepasst({ stufen, text, className, data, children }: { stufen: readonly number[]; text: string; className: string; data: "frage" | "antwort"; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inhalt = useRef<HTMLParagraphElement>(null);
  useSchriftEinpassen(box, inhalt, stufen, text);
  return (
    <div ref={box} className="mt-1 min-h-0 flex-1 overflow-hidden">
      <p ref={inhalt} lang="de" className={`hyphens-auto break-words ${className}`} style={{ fontSize: stufen[0] }} {...{ [`data-${data}`]: true }}>
        {children}
      </p>
    </div>
  );
}

function Kopf({ meta, knopf }: { meta: SorteMeta; knopf?: React.ReactNode }) {
  const Icon = SYMBOL[meta.symbol];
  const name = useRef<HTMLSpanElement>(null);
  useNameEinpassen(name, `${meta.id}|${Boolean(knopf)}`);
  return (
    <div className="flex h-[26px] shrink-0 items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-tile-label" strokeWidth={2} aria-hidden />
      <span ref={name} className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap ${TILE_LABEL}`}>
        <span data-name="voll">{meta.name}</span>
        <span data-name="kurz" hidden>
          {meta.kurz}
        </span>
      </span>
      {knopf}
    </div>
  );
}

/** Drei Punkte: so oft war diese Karte schon da (nur Anzeige, kein Zähler zum Sammeln) */
function Punkte({ an }: { an: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1" aria-hidden data-punkte={an}>
      {Array.from({ length: ANZEIGEN_MAX }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full bg-tile-accent ${i < an ? "" : "opacity-30"}`} />
      ))}
    </span>
  );
}

export function WundertueteTile({ size = "S", today, minutes, haushalt, gericht, demo = false, name }: { size?: TileSize; today: string; minutes: number; haushalt: Haushalt; gericht: string | null; demo?: boolean; name: string }) {
  const stand = useWundertuete();
  const { forecast } = useForecast();
  const lage = lageAus({ heute: today, minuten: minutes, haushalt, forecast, gericht });
  /** Welche Karte gerade umgedreht ist (eine neue Karte liegt immer vorne) */
  const [gedreht, setGedreht] = useState<string | null>(null);
  const abends = istAbends(lage.minuten);
  // Anzeige zählen (höchstens eine je halbe Stunde) bzw. die passende nächste Karte
  const key = `${lage.heute}|${abends}|${lage.haushalt}|${lage.wetter ?? ""}|${lage.gericht ?? ""}`;
  useEffect(() => {
    if (!demo) wtAnzeigen(lage, now().getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur, wenn sich die Lage ändert
  }, [demo, key]);
  const karte: Eintrag | undefined = demo ? BEISPIEL_KARTE : eintragVon(stand?.karte);
  const seite = karte && gedreht === karte.id ? "hinten" : "vorne";
  if (!karte) return <section className={`${TILE} h-full animate-pulse`} data-tone="sport" aria-label="Wundertüte" data-groesse={size} />;
  const meta = sorteMeta(karte.sorte);
  const stufe = size === "M" ? "M" : "S";
  const hinten = hatRueckseite(karte);
  const weiter = () => {
    buzz();
    setGedreht(null);
    if (demo) return clearDemoTile("wundertuete");
    wtWeiter(lage, now().getTime());
  };
  const tippen = () => (tippAktion(seite, karte) === "umdrehen" ? (buzz(), setGedreht(karte.id)) : weiter());
  const teilen = async () => {
    const text = teilText(karte, name);
    try {
      if (navigator.share) return void (await navigator.share({ text }));
      await navigator.clipboard.writeText(text);
      showToast({ text: "Kopiert", seconds: 2, small: true });
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") showToast({ text: "Teilen hat grad nicht geklappt.", seconds: 3, small: true });
    }
  };
  // Beide Seiten liegen genau übereinander in der Kachel-Fläche: `TILE` bringt
  // `relative` mit, das hier `absolute` schlagen würde (dann rutschte die
  // Rückseite unter die Vorderseite, aus der Kachel heraus) – daher ohne.
  const box = `${TILE.replace(/(^| )relative(?= |$)/, " ").trim()} absolute inset-0 flex flex-col overflow-hidden p-3`;
  const label = `${meta.name}${demo ? " · Beispiel" : ""}: ${karte.vorne}`;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={tippen}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        tippen();
      }}
      aria-label={seite === "vorne" ? `${label}${hinten ? " · Antippen = Antwort" : " · Antippen = Neues"}` : `Antwort: ${karte.hinten?.replace(/\*\*/g, "")} · Antippen = Neues`}
      className="wt-karte relative h-full min-h-0 select-none outline-none"
      data-seite={seite}
      data-karte={karte.id}
      data-sorte={karte.sorte}
      data-groesse={size}
      data-wundertuete
    >
      <div key={karte.id} className="wt-dreh wt-neu relative h-full">
        <section className={`wt-vorne isolate ${box}`} data-tone={meta.tone} inert={seite !== "vorne"} aria-hidden={seite !== "vorne"}>
          <KachelWasserzeichen kachel="wundertuete" size={size} frei />
          <Kopf meta={meta} />
          <Eingepasst stufen={FRAGE_STUFEN[stufe]} text={`${karte.id}|${size}`} className="font-extrabold leading-[1.22]" data="frage">
            {karte.vorne}
          </Eingepasst>
          <span className="mt-1 flex shrink-0 items-end justify-between gap-2">
            <span className="min-w-0 text-[12px] font-bold leading-tight text-tile-accent">
              <span className="kachel-frei" data-hinweis="voll">
                {hinweisFuer(karte.sorte, abends && lage.haushalt === "allein")}
              </span>
              <span className="kachel-frei" data-hinweis="kurz">
                {hinweisKurzFuer(karte.sorte, abends && lage.haushalt === "allein")}
              </span>
            </span>
            <Punkte an={demo ? 1 : Math.max(1, stand?.anzeigen ?? 1)} />
          </span>
        </section>
        {hinten && (
          <section className={`wt-hinten ${box} border-2 border-tile-accent bg-surface`} data-tone={meta.tone} data-rueckseite inert={seite !== "hinten"} aria-hidden={seite !== "hinten"}>
            <Kopf meta={meta} knopf={<QuickButton icon={Share} label="Teilen" onClick={() => void teilen()} />} />
            <Eingepasst stufen={ANTWORT_STUFEN[stufe]} text={`${karte.id}|${size}|hinten`} className="font-medium leading-snug" data="antwort">
              {antwortTeile(karte.hinten ?? "").map((t, i) => (t.fett ? <strong key={i} className="font-extrabold">{t.text}</strong> : <span key={i}>{t.text}</span>))}
            </Eingepasst>
            <span className="mt-1 shrink-0 text-[12px] font-bold leading-tight text-tile-accent">Nochmal tippen = Neues</span>
          </section>
        )}
      </div>
    </div>
  );
}
