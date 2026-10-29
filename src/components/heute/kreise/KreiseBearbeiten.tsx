"use client";

// „Startseite bearbeiten“ → Abschnitt „Kreise oben“ (A-050, Tafel 143): je
// Kreis an/aus und die Reihenfolge – ziehen am Griff (oder die Knöpfe „Nach
// oben/unten“ für Screenreader und Tastatur). Hinweis „Höchstens 5 Kreise“.
// Steht an der Stelle der Reihe. Einschalten schaltet den Baustein mit ein
// (Sport, Durchatmen); Ausschalten blendet nur aus, nichts wird gelöscht.
// „Was los?“ erscheint, wenn die Quelle an ist (A-055); einschalten schaltet
// den Baustein „Was los?“ mit ein.

import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, ChevronUp, Flag, GripVertical, Puzzle, SportShoe, Timer as TimerIcon, Wind, type LucideIcon } from "lucide-react";
import { setFeature, useBausteine } from "@/lib/core/features";
import { saveKreise, useKreise } from "@/lib/core/homeLayout";
import { MAX_KREISE, STANDARD_KREISE, aendereKreise, kreisMeta, ordneKreise, type Kreis, type KreisId } from "@/lib/heute/kreise";
import { setWasLos, useWasLosAn, useWasLosDaten } from "@/lib/region/client";
import { buzz } from "@/components/heute/actions";
import { SECTION_TITLE } from "@/components/ui/styles";

const SYMBOL: Record<KreisId, LucideIcon> = { sport: SportShoe, pause: Wind, waslos: Flag, raetsel: Puzzle, timer: TimerIcon };
/** Baustein, der zum Kreis gehört (an = Baustein mit an) */
const BAUSTEIN: Partial<Record<KreisId, "sport" | "durchatmen">> = { sport: "sport", pause: "durchatmen" };
const ZEILE = 48;

export function KreiseBearbeiten() {
  const kreise = useKreise() ?? STANDARD_KREISE;
  const bausteine = useBausteine();
  const [zug, setZug] = useState<{ id: KreisId; start: number; dy: number } | null>(null);
  const wasLosQuelle = useWasLosDaten()?.quelle;
  const wasLosAn = useWasLosAn();
  const zeigbar = kreise.filter((k) => k.id !== "waslos" || (wasLosQuelle !== undefined && wasLosQuelle !== "aus"));
  const istAn = (k: Kreis) => k.an && (k.id === "waslos" ? Boolean(wasLosAn) : !BAUSTEIN[k.id] || Boolean(bausteine?.includes(BAUSTEIN[k.id]!)));

  const schalte = (k: Kreis, an: boolean) => {
    const b = BAUSTEIN[k.id];
    if (an && b) setFeature(b, true);
    if (an && k.id === "waslos") setWasLos(true);
    saveKreise(aendereKreise(kreise, { kreis: k.id, aktion: an ? "an" : "aus" }));
    buzz();
  };
  const schiebe = (id: KreisId, um: number) => {
    const ids = zeigbar.map((k) => k.id);
    const von = ids.indexOf(id);
    const nach = Math.max(0, Math.min(ids.length - 1, von + um));
    if (von === nach) return;
    ids.splice(nach, 0, ...ids.splice(von, 1));
    saveKreise(ordneKreise(kreise, ids));
    buzz();
  };
  // Ziehen am Griff: Zeile folgt dem Finger, beim Loslassen rastet sie ein
  const runter = (id: KreisId) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setZug({ id, start: e.clientY, dy: 0 });
  };
  const bewege = (e: ReactPointerEvent) => zug && setZug({ ...zug, dy: e.clientY - zug.start });
  const los = () => {
    if (zug) schiebe(zug.id, Math.round(zug.dy / ZEILE));
    setZug(null);
  };

  return (
    <section className="flex flex-col gap-2 rounded-card border-2 border-dashed border-line-strong p-3" aria-label="Kreise oben" data-kreise-bearbeiten data-keep-edit data-no-swipe>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={SECTION_TITLE}>Kreise oben</h2>
        <p className="text-[13px] text-muted">Höchstens {MAX_KREISE} Kreise</p>
      </div>
      <ul className="flex flex-col" onPointerMove={bewege} onPointerUp={los} onPointerCancel={los}>
        {zeigbar.map((k, n) => {
          const meta = kreisMeta(k.id);
          const Icon = SYMBOL[k.id];
          const an = istAn(k);
          const gezogen = zug?.id === k.id;
          return (
            <li key={k.id} className={`flex items-center gap-2 bg-background ${gezogen ? "relative z-10 rounded-field shadow-card" : ""}`} style={{ height: ZEILE, transform: gezogen ? `translateY(${zug.dy}px)` : undefined }} data-kreis-zeile={k.id}>
              <span onPointerDown={runter(k.id)} className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-muted" aria-hidden>
                <GripVertical className="h-5 w-5" strokeWidth={2} />
              </span>
              <span data-tone={meta.tone} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tile text-tile-accent ${an ? "" : "opacity-50"}`} aria-hidden>
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <span className={`min-w-0 flex-1 text-[16px] font-semibold ${an ? "" : "text-muted"}`}>{meta.wort}</span>
              <span className="sr-only">
                <button type="button" onClick={() => schiebe(k.id, -1)} disabled={n === 0}>
                  {meta.wort} nach oben
                </button>
                <button type="button" onClick={() => schiebe(k.id, 1)} disabled={n === zeigbar.length - 1}>
                  {meta.wort} nach unten
                </button>
              </span>
              <span className="hidden gap-0.5 [@media(pointer:fine)]:flex" aria-hidden>
                <button type="button" tabIndex={-1} onClick={() => schiebe(k.id, -1)} disabled={n === 0} className="flex h-9 w-9 items-center justify-center rounded-full text-muted disabled:opacity-30">
                  <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <button type="button" tabIndex={-1} onClick={() => schiebe(k.id, 1)} disabled={n === zeigbar.length - 1} className="flex h-9 w-9 items-center justify-center rounded-full text-muted disabled:opacity-30">
                  <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </span>
              {/* Tippfläche 44 × 44 um den Schalter */}
              <label className="flex h-11 w-11 shrink-0 items-center justify-center">
                <input type="checkbox" role="switch" checked={an} onChange={(e) => schalte(k, e.target.checked)} aria-label={`${meta.wort} oben zeigen`} className="h-6 w-6 accent-accent" data-kreis-schalter={k.id} />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
