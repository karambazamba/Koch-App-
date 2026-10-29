"use client";

// Übung als Vollbild (A-051, Tafel 138/2–5 und 139): oben ✕, Titel, Herz
// (Liebling) und die Art der Anleitung „Stimme + Klang · Nur Klang · Still“
// (pro Gerät gemerkt). Atmen: Mint, großes Wort der Phase + Sekunde, Kästchen
// bzw. Kreis, „Folge dem Punkt.“, Balken, „Noch 1:12“, „Mia zählt mit“ /
// „Pause“. Augen (Handy-Pause): dunkel, Ring mit Auge, großer Satz. Körper und
// Ankommen: großer Schritt-Text, einer nach dem anderen. Fokus: kurzes
// Gespräch, dann eine Minute Atmen. Nach 3 s wird es dunkel (nur schwacher
// Atem-Kreis, Ansage-Zeile, ✕ und Pause schwach), Antippen = kurz hell.
// Ende: „Gut gemacht.“ – kein Zähler, keine Serie, kein Feuerwerk.

import { useEffect, useRef, useState } from "react";
import { Heart, Mic, Pause, Play, X } from "lucide-react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { useBackCloses } from "@/lib/core/useBackCloses";
import { useWakeLock } from "@/lib/core/wakeLock";
import { reducedMotion } from "@/lib/core/hello";
import type { AssistantData } from "@/lib/begleitung/ops";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { ansageText } from "@/lib/durchatmen/ansagen";
import { oeffneDurchatmen } from "@/lib/durchatmen/oeffnen";
import { ARTEN, lieblingUmschalten, setArt, stummHinweisGesehen, useDurchatmen, type Art } from "@/lib/durchatmen/store";
import { endeSatz, restText, uebungVon, type Uebung } from "@/lib/durchatmen/uebungen";
import type { Stand } from "@/lib/durchatmen/ablauf";
import { AtemKreis, AugenRing, Kaestchen, SymbolBild } from "@/components/durchatmen/AtemAnimation";
import { FokusGespraech } from "@/components/durchatmen/FokusGespraech";
import { useUebungLauf } from "@/components/durchatmen/useUebungLauf";

const RUND = "hit flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-95";
const KNOPF = "hit inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-field text-[17px] font-extrabold active:scale-[0.98]";

export function UebungVollbild({ id, data, onClose }: { id: string; data: AssistantData | null; onClose: () => void }) {
  const u = uebungVon(id);
  if (!u) return null;
  return <Vollbild u={u} data={data} onClose={onClose} />;
}

function Vollbild({ u, data, onClose }: { u: Uebung; data: AssistantData | null; onClose: () => void }) {
  useBackCloses(onClose);
  const stand = useDurchatmen();
  const name = helperName(useProfile());
  const art: Art = stand?.art ?? "stimme";
  const liebling = Boolean(stand?.lieblinge.includes(u.id));
  const fokus = u.sorte === "fokus";
  const [teil, setTeil] = useState<"gespraech" | "laeuft" | "ende">(fokus ? "gespraech" : "laeuft");
  const [zaehlen, setZaehlen] = useState(false);
  const [still] = useState(reducedMotion);
  // Stumm-Schalter-Hinweis: einmal je Gerät, beim ersten Start mit Ton
  const [stumm] = useState(() => Boolean(stand && !stand.stummHinweis && art !== "still"));
  useEffect(() => {
    if (stumm) stummHinweisGesehen();
  }, [stumm]);
  const lauf = useUebungLauf(u, { aktiv: teil === "laeuft", art, zaehlen, onEnde: () => setTeil("ende") });
  useWakeLock(teil === "laeuft");
  // Seite dahinter nicht mitscrollen
  useEffect(() => {
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = vorher;
    };
  }, []);

  if (teil === "ende") return <Ende u={u} onClose={onClose} />;

  const augen = u.animation === "ring";
  const dunkel = teil === "laeuft" && lauf.dunkel;
  const bg = dunkel || augen ? "bg-atem-dunkel text-atem-dunkel-ink" : "bg-atem text-atem-ink";
  return (
    <div
      className={`fixed inset-0 z-[55] flex flex-col transition-colors duration-1000 ${bg}`}
      role="region"
      aria-label={u.titel}
      data-uebung-vollbild={u.id}
      data-dunkel={dunkel || undefined}
      onClick={() => dunkel && lauf.hell()}
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className={`flex items-center gap-2 transition-opacity duration-1000 ${dunkel ? "opacity-0" : ""}`}>
          <button type="button" onClick={onClose} aria-label="Schließen" className={`${RUND} ${augen ? "bg-atem-dunkel-soft" : "bg-surface"}`}>
            <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
          <h1 className="flex-1 text-center text-[17px] font-extrabold">{u.titel}</h1>
          <button type="button" onClick={() => lieblingUmschalten(u.id)} aria-pressed={liebling} aria-label={liebling ? "Kein Liebling mehr" : "Als Liebling merken"} className={`${RUND} ${augen ? "bg-atem-dunkel-soft" : "bg-surface"} text-accent`}>
            <Heart className="h-5 w-5" strokeWidth={2} fill={liebling ? "currentColor" : "none"} aria-hidden />
          </button>
        </header>
        {!dunkel && <ArtWahl art={art} augen={augen} />}
        {!dunkel && stumm && art !== "still" && <p className="mt-2 text-center text-sm font-semibold opacity-80">Für Ton bitte Stumm-Schalter aus.</p>}
        {dunkel ? (
          <Dunkel u={u} stand={lauf.stand} still={still} onPause={lauf.pause} onClose={onClose} />
        ) : fokus ? (
          <div className="mt-4 flex flex-1 flex-col">
            <FokusGespraech u={u} art={art} data={data} onAtmen={() => setTeil("laeuft")} onClose={onClose} atmen={teil === "laeuft" ? <FokusAtmen stand={lauf.stand} still={still} /> : null} />
          </div>
        ) : (
          <Hell u={u} stand={lauf.stand} still={still} />
        )}
        {!dunkel && teil === "laeuft" && (
          <div className="mt-4 flex gap-3">
            {u.sorte === "atmen" && art === "stimme" && (
              <button type="button" aria-pressed={zaehlen} onClick={() => setZaehlen((z) => !z)} className={`${KNOPF} ${zaehlen ? "bg-atem-soft" : "bg-surface"} text-atem-ink`}>
                <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                {name} zählt mit
              </button>
            )}
            <button type="button" onClick={lauf.pausiert ? lauf.weiter : lauf.pause} className={`${KNOPF} bg-atem-tief text-atem-on`}>
              {lauf.pausiert ? <Play className="h-5 w-5" strokeWidth={2.25} aria-hidden /> : <Pause className="h-5 w-5" strokeWidth={2.25} aria-hidden />}
              {lauf.pausiert ? "Weiter" : "Pause"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ArtWahl({ art, augen }: { art: Art; augen: boolean }) {
  return (
    <div className="mt-3 flex justify-center gap-2" role="radiogroup" aria-label="Anleitung">
      {ARTEN.map((a) => {
        const an = a.value === art;
        return (
          <button
            key={a.value}
            type="button"
            role="radio"
            aria-checked={an}
            onClick={() => setArt(a.value)}
            className={`hit inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-bold ${an ? "bg-atem-tief text-atem-on" : augen ? "bg-atem-dunkel-soft" : "bg-surface"}`}
          >
            {a.value === "stimme" && <Mic className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

function Fortschritt({ stand, dunkel = false }: { stand: Stand; dunkel?: boolean }) {
  return (
    <div className="mt-4 flex w-full flex-col items-center gap-2">
      <div className={`h-1.5 w-full max-w-xs overflow-hidden rounded-full ${dunkel ? "bg-atem-dunkel-soft" : "bg-atem-soft"}`}>
        <div className="h-full w-full origin-left rounded-full bg-current" style={{ transform: `scaleX(${stand.anteil})`, transition: "transform 100ms linear" }} />
      </div>
      <p className="text-sm font-semibold tabular-nums opacity-80" data-rest>
        {restText(stand.rest)}
      </p>
    </div>
  );
}

/** Heller Bildschirm je Sorte */
function Hell({ u, stand, still }: { u: Uebung; stand: Stand; still: boolean }) {
  if (u.sorte === "atmen")
    return (
      <div className="mt-3 flex flex-1 flex-col items-center justify-center text-center">
        <p key={stand.phase ?? ""} className="text-[40px] font-extrabold leading-none motion-safe:animate-[pager-fade_0.8s_ease-out]" data-phase={stand.phase ?? ""}>
          {stand.phase ? ansageText(stand.phase) : ""}
        </p>
        <p className="mt-1 text-[22px] font-bold tabular-nums opacity-80">{stand.phaseSekunde}</p>
        <div className="mt-4">{u.animation === "kaestchen" ? <Kaestchen stand={stand} still={still} /> : <AtemKreis stand={stand} still={still} />}</div>
        <p className="mt-4 text-[15px] opacity-80">{u.hilfe}</p>
        <Fortschritt stand={stand} />
      </div>
    );
  const satz = stand.schritt ? ansageText(stand.schritt) : "";
  if (u.animation === "ring")
    return (
      <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
        <AugenRing stand={stand} />
        <p key={satz} className="mt-8 text-[28px] font-extrabold leading-tight motion-safe:animate-[pager-fade_0.8s_ease-out]" data-schritt={stand.schritt ?? ""}>
          {satz}
        </p>
        <p className="mt-3 text-[15px] opacity-80">{u.hilfe}</p>
        <p className="mt-auto pt-6 text-[13px] opacity-60">Bildschirm wird gleich dunkel · leiser Gong am Ende</p>
      </div>
    );
  return (
    <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
      <SymbolBild u={u} still={still} />
      <p key={satz} className="mt-8 text-[28px] font-extrabold leading-tight motion-safe:animate-[pager-fade_0.8s_ease-out]" data-schritt={stand.schritt ?? ""}>
        {satz}
      </p>
      <p className="mt-3 text-[15px] opacity-80">{u.hilfe}</p>
      <Fortschritt stand={stand} />
    </div>
  );
}

/** Fokus: die Atem-Minute unter dem Gespräch */
function FokusAtmen({ stand, still }: { stand: Stand; still: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  // Die Atem-Minute ins Bild holen (unter dem Gespräch)
  useEffect(() => ref.current?.scrollIntoView({ block: "end", behavior: still ? "auto" : "smooth" }), [still]);
  return (
    <div ref={ref} className="mt-2 flex flex-col items-center">
      <AtemKreis stand={stand} still={still} klein />
      <p className="mt-2 text-sm font-semibold tabular-nums opacity-80" data-rest>
        {restText(stand.rest)}
      </p>
    </div>
  );
}

/** Handy weg: nur schwacher Atem-Kreis, kleine Ansage-Zeile, ✕ und Pause schwach */
function Dunkel({ u, stand, still, onPause, onClose }: { u: Uebung; stand: Stand; still: boolean; onPause: () => void; onClose: () => void }) {
  const zeile = stand.phase ? ansageText(stand.phase) : stand.schritt ? ansageText(stand.schritt) : "";
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center" data-dunkel-bild>
      <div className="opacity-70">{u.animation === "ring" ? <AugenRing stand={stand} /> : <AtemKreis stand={u.takt.length ? stand : { ...stand, phase: null }} still={still || !u.takt.length} dunkel />}</div>
      <p className="mt-10 flex max-w-xs items-center gap-2 text-[17px] font-semibold opacity-80" data-ansage>
        <Mic className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />„{zeile} …“
      </p>
      <p className="mt-auto pt-10 text-sm opacity-50">Antippen zum Hellmachen</p>
      <div className="mt-6 flex gap-3 opacity-50">
        <button type="button" onClick={(e) => (e.stopPropagation(), onClose())} aria-label="Schließen" className="hit flex h-12 w-14 items-center justify-center rounded-field border border-current">
          <X className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
        <button type="button" onClick={(e) => (e.stopPropagation(), onPause())} className="hit flex h-12 items-center rounded-field border border-current px-5 text-[16px] font-semibold">
          Pause
        </button>
      </div>
    </div>
  );
}

/** „Gut gemacht.“ – „Noch eine“ / „Fertig“, kein Zähler */
function Ende({ u, onClose }: { u: Uebung; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-atem text-atem-ink" role="region" aria-label="Gut gemacht" data-uebung-ende={u.id}>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <BegleitungAvatar size={104} zustand="ruhig" />
          <h1 className="mt-4 text-[32px] font-extrabold tracking-tight">Gut gemacht.</h1>
          <p className="text-[17px] opacity-80">{endeSatz(u.dauer)}</p>
        </div>
        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              oeffneDurchatmen();
            }}
            className={`${KNOPF} bg-surface text-atem-ink`}
          >
            Noch eine
          </button>
          <button type="button" onClick={onClose} className={`${KNOPF} bg-atem-tief text-atem-on`}>
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
