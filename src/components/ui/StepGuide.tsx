"use client";

// Schritt-Anleitungen (Mikrofon anmachen, schönere Stimme laden): nummerierte
// Karten mit nachgebauten Symbolen (`StepList`) und „Zeig’s mir“ Bild für
// Bild (`StepGuide`): nachgebauter Einstellungen-Bildschirm, gesuchte Zeile
// orange umrandet + Fingerkreis, wischbar, „Schritt 2 von 4“, Punkte unten.

import { useRef, useState } from "react";
import { Check, Compass, Download, Keyboard, LayoutGrid, Mic, Settings, Share, ShieldCheck, SlidersHorizontal, Trash2, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/styles";
import type { MicStep, StepIcon } from "@/lib/core/mic";

const ICONS: Record<StepIcon, { icon: LucideIcon; tone: string }> = {
  zahnrad: { icon: Settings, tone: "bg-fill-strong text-ink" },
  allgemein: { icon: Settings, tone: "bg-fill-strong text-ink" },
  apps: { icon: LayoutGrid, tone: "bg-work text-on-accent" },
  safari: { icon: Compass, tone: "bg-work text-on-accent" },
  mikro: { icon: Mic, tone: "bg-accent text-on-accent" },
  diktat: { icon: Mic, tone: "bg-accent text-on-accent" },
  erlauben: { icon: Check, tone: "bg-good text-on-accent" },
  regler: { icon: SlidersHorizontal, tone: "bg-fill-strong text-ink" },
  berechtigungen: { icon: ShieldCheck, tone: "bg-work text-on-accent" },
  tastatur: { icon: Keyboard, tone: "bg-fill-strong text-ink" },
  teilen: { icon: Share, tone: "bg-work text-on-accent" },
  entfernen: { icon: Trash2, tone: "bg-fill-strong text-ink" },
  sichern: { icon: Download, tone: "bg-accent text-on-accent" },
};

function StepIconBadge({ icon }: { icon: StepIcon }) {
  const { icon: Icon, tone } = ICONS[icon];
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${tone}`}>
      <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
    </span>
  );
}

/** Nummerierte Schritt-Karten */
export function StepList({ steps }: { steps: MicStep[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((s, i) => (
        <li key={s.text} className="flex items-center gap-3 rounded-field bg-surface px-3 py-2.5">
          <span className="w-5 shrink-0 text-center text-[15px] font-extrabold text-accent-strong">{i + 1}</span>
          <StepIconBadge icon={s.icon} />
          <span className="text-[15px] leading-snug">{s.text}</span>
        </li>
      ))}
    </ol>
  );
}

/** Ein nachgebauter Einstellungen-Bildschirm mit markierter Zeile */
function FakeScreen({ step }: { step: MicStep }) {
  return (
    <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-card border border-line bg-background shadow-card" aria-hidden>
      <p className="border-b border-line bg-surface px-4 py-2.5 text-center text-[13px] font-bold">{step.screen.title}</p>
      <ul className="flex flex-col gap-1.5 p-3">
        {step.screen.rows.map((row, i) => (
          <li key={row} className={`relative flex h-10 items-center rounded-field bg-surface px-3 text-[14px] ${i === step.screen.target ? "font-bold ring-2 ring-accent" : "text-muted"}`}>
            {row}
            {i === step.screen.target && <span className="absolute -bottom-2 right-6 h-7 w-7 rounded-full border-2 border-accent bg-accent-soft opacity-90" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** „Zeig’s mir“: Schritt für Schritt; am Ende `lastLabel` (z. B. „Nochmal versuchen“) */
export function StepGuide({ steps, onBack, onDone, onClose, lastLabel }: { steps: MicStep[]; onBack: () => void; onDone: () => void; onClose: () => void; lastLabel: string }) {
  const [at, setAt] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setAt(i);
  };
  const last = at === steps.length - 1;
  return (
    <Sheet title="Zeig’s mir" onClose={onClose} layer="above">
      <div className="flex flex-col gap-3 pb-3">
        <span className="text-center text-[12px] font-extrabold uppercase tracking-wide text-muted">
          Schritt {at + 1} von {steps.length}
        </span>
        <div
          ref={track}
          data-no-swipe
          onScroll={(e) => setAt(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
          aria-live="polite"
        >
          {steps.map((s, i) => (
            <section key={s.text} className="flex w-full shrink-0 snap-center flex-col gap-3 px-1" aria-label={`Schritt ${i + 1}`} aria-hidden={i !== at}>
              <FakeScreen step={s} />
              <p className="text-center text-base font-semibold leading-snug">{s.text}</p>
            </section>
          ))}
        </div>
        <div className="flex justify-center gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s.text} className={`h-2 w-2 rounded-full ${i === at ? "bg-accent" : "bg-line-strong"}`} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => (at === 0 ? onBack() : go(at - 1))} className={buttonClass("secondary", "md")}>
            Zurück
          </button>
          <button type="button" onClick={() => (last ? onDone() : go(at + 1))} className={buttonClass("primary", "md")}>
            {last ? lastLabel : "Weiter"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
