"use client";

// Fenster zur Mikrofon-Freigabe (Tafel 27), erst bei Bedarf geladen:
// - „Darf ich zuhören?“ (einmalig vor der ersten Frage des Geräts, mit
//   nachgebautem System-Dialog; „Okay, frag mich“ startet erst dann)
// - „Ich kann dich gerade nicht hören“ (gesperrt bzw. Diktieren aus): vier
//   nummerierte Schritte, „Zeig’s mir“, „Nochmal versuchen“, „Lieber tippen“
// - „Zeig’s mir“: Schritt für Schritt wischbar, nachgebaute Einstellungen mit
//   orange markierter Zeile und Fingerkreis.

import { useRef, useState, useSyncExternalStore } from "react";
import { Check, Compass, Keyboard, LayoutGrid, Mic, MicOff, Play, Settings, ShieldCheck, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/styles";
import { markHintSeen } from "@/lib/core/hints";
import { closeMicSheet, iosMajor, micPlatform, micState, micSteps, micSubscribe, preAskText, setMicPermission, type MicBlock, type MicPlatform, type MicStep, type StepIcon } from "@/lib/core/mic";

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
};

const platform = (): MicPlatform => (typeof navigator === "undefined" ? "andere" : micPlatform(navigator.userAgent));

/** „Lieber tippen“: Fenster zu, Fokus ins Textfeld neben dem Mikro */
function preferTyping() {
  const origin = micState().origin;
  closeMicSheet();
  const field = origin?.closest("form, footer, section, [role=dialog]")?.querySelector<HTMLElement>("textarea, input:not([type=hidden]):not([type=checkbox])");
  setTimeout(() => field?.focus(), 50);
}

export function MicSheets() {
  const sheet = useSyncExternalStore(micSubscribe, () => micState().sheet, () => null);
  if (!sheet) return null;
  return sheet.kind === "fragen" ? <PreAsk then={sheet.then} /> : <Help block={sheet.block} />;
}

function PreAsk({ then }: { then: () => void }) {
  const p = platform();
  const text = preAskText(p);
  return (
    <Sheet title={text.title} onClose={closeMicSheet} layer="above">
      <div className="flex flex-col items-center gap-4 pb-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <Mic className="h-8 w-8" strokeWidth={2.25} aria-hidden />
        </span>
        <p className="text-base leading-snug">{text.text}</p>
        {/* Nachgebauter System-Dialog */}
        <div className="w-full max-w-[280px] overflow-hidden rounded-card border border-line bg-surface text-[14px] shadow-card" aria-hidden>
          <p className="px-4 pb-3 pt-4 font-semibold leading-snug">{p === "ios" ? "„Was gibt’s?“ möchte auf das Mikrofon zugreifen" : "Was gibt’s? möchte dein Mikrofon verwenden"}</p>
          <div className="grid grid-cols-2 border-t border-line">
            <span className="py-2.5 text-muted">{p === "ios" ? "Nicht erlauben" : "Nicht zulassen"}</span>
            <span className="border-l border-line py-2.5 font-extrabold text-accent-strong ring-2 ring-inset ring-accent">{text.allow}</span>
          </div>
        </div>
        <p className="-mt-2 text-sm text-muted">↑ so sieht die Frage aus</p>
        <button
          type="button"
          onClick={() => {
            markHintSeen("mikro-gefragt");
            closeMicSheet();
            then();
          }}
          className={`${buttonClass("primary", "lg")} w-full`}
        >
          Okay, frag mich
        </button>
        <button type="button" onClick={preferTyping} className="hit min-h-11 text-[15px] font-semibold text-muted">
          Lieber tippen
        </button>
      </div>
    </Sheet>
  );
}

function StepIconBadge({ icon }: { icon: StepIcon }) {
  const { icon: Icon, tone } = ICONS[icon];
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${tone}`}>
      <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
    </span>
  );
}

function Help({ block }: { block: MicBlock }) {
  const p = platform();
  const steps = micSteps(p, block, typeof navigator === "undefined" ? null : iosMajor(navigator.userAgent), typeof location === "undefined" ? undefined : location.host);
  const [guide, setGuide] = useState(false);
  const [still, setStill] = useState(false);
  const retry = async () => {
    if (block === "diktat_aus") return closeMicSheet();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      closeMicSheet();
    } catch {
      // Noch aus: zurück zur Übersicht mit freundlichem Satz
      setGuide(false);
      setStill(true);
    }
  };
  if (guide) return <Guide steps={steps} onBack={() => setGuide(false)} onRetry={retry} />;
  return (
    <Sheet title="Ich kann dich gerade nicht hören" onClose={closeMicSheet} layer="above">
      <div className="flex flex-col gap-3 pb-3">
        <span className="flex h-14 w-14 items-center justify-center self-center rounded-full bg-fill-strong text-muted">
          <MicOff className="h-7 w-7" strokeWidth={2.25} aria-hidden />
        </span>
        <p className="text-base font-semibold">{block === "diktat_aus" ? "Die Diktierfunktion ist aus. So machst du sie an:" : "Das Mikrofon ist aus. So machst du es an:"}</p>
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={s.text} className="flex items-center gap-3 rounded-field bg-surface px-3 py-2.5">
              <span className="w-5 shrink-0 text-center text-[15px] font-extrabold text-accent-strong">{i + 1}</span>
              <StepIconBadge icon={s.icon} />
              <span className="text-[15px] leading-snug">{s.text}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">Dann zurück zu mir und nochmal tippen.</p>
        {still && (
          <p className="rounded-field bg-warn-soft px-3 py-2 text-sm font-semibold text-warn-ink" role="status">
            Hm, noch aus. Schau nochmal bei Schritt 3.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setGuide(true)} className={buttonClass("secondary", "md")}>
            <Play className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Zeig’s mir
          </button>
          <button type="button" onClick={retry} className={buttonClass("primary", "md")}>
            Nochmal versuchen
          </button>
        </div>
        <button type="button" onClick={preferTyping} className="hit mx-auto min-h-11 text-[15px] font-semibold text-muted">
          Lieber tippen
        </button>
      </div>
    </Sheet>
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

function Guide({ steps, onBack, onRetry }: { steps: MicStep[]; onBack: () => void; onRetry: () => void }) {
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
    <Sheet title="Zeig’s mir" onClose={closeMicSheet} layer="above">
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
          <button type="button" onClick={() => (last ? onRetry() : go(at + 1))} className={buttonClass("primary", "md")}>
            {last ? "Nochmal versuchen" : "Weiter"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
