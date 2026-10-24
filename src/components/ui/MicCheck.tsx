"use client";

// Mikro-Check (Tafel 86): Mia sagt selbst, was fehlt. Häkchen-Liste
// (Mikrofon erlaubt · Diktierfunktion und Spracherkennung · Ton kommt an;
// hört Mia über den Server zu, nur Mikrofon und Ton),
// darunter NUR die Schritte für den fehlenden Schalter (iPhone: drei Schalter
// an drei Stellen), „Zeig’s mir“ Schritt für Schritt, am Ende immer
// „Nochmal testen“. „Details“ zeigt das Mikro-Protokoll mit Kopieren.
// Öffnet sich automatisch, sobald Zuhören scheitert, und über Einstellungen →
// Mia → „Mikrofon prüfen“.

import { useState } from "react";
import { Check, ChevronDown, CircleHelp, Copy, Loader2, Mic, Play, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { StepGuide, StepList } from "@/components/ui/StepGuide";
import { buttonClass } from "@/components/ui/styles";
import { closeMicSheet, iosMajor, micPlatform, type MicBlock } from "@/lib/core/mic";
import { useServerOhr } from "@/lib/begleitung/stimmeClient";
import { MENUE_HINWEIS, checkZeilen, SEITEN_KASTEN, anleitung, fehlerSatz, schalterFuer, type PruefStand } from "@/lib/core/micCheck";
import { useMicLog } from "@/lib/core/micLog";
import { useMicCheck } from "@/lib/core/useMicCheck";

const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent);

function Stand({ stand }: { stand: PruefStand }) {
  if (stand === "ok") return <Check className="h-5 w-5 text-good" strokeWidth={3} aria-label="ok" />;
  if (stand === "fehler") return <X className="h-5 w-5 text-danger" strokeWidth={3} aria-label="aus" />;
  if (stand === "laeuft") return <Loader2 className="h-5 w-5 animate-spin text-muted" strokeWidth={2.5} aria-label="prüfe" />;
  return <CircleHelp className="h-5 w-5 text-faint" strokeWidth={2} aria-label="noch nicht geprüft" />;
}

/** „Details“: das Mikro-Protokoll mit Kopieren */
function Details() {
  const log = useMicLog();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = log.map((e) => `${new Date(e.at).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin" })} ${e.text}`).join("\n");
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="hit mx-auto inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold text-muted">
        Details <ChevronDown className={`h-4 w-4 ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="flex flex-col gap-2 rounded-field bg-fill px-3 py-2.5" data-mikro-protokoll>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[12px] leading-snug text-muted">{text || "Noch nichts aufgeschrieben."}</pre>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(`${ua()}\n${text}`).then(() => setCopied(true), () => undefined);
            }}
            className="hit inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] font-bold text-accent-strong"
          >
            <Copy className="h-4 w-4" aria-hidden /> {copied ? "Kopiert" : "Kopieren"}
          </button>
        </div>
      )}
    </div>
  );
}

export function MicCheck({ start, onTyping }: { start: MicBlock | null; onTyping: () => void }) {
  const platform = micPlatform(ua());
  const ohr = useServerOhr();
  const check = useMicCheck(start, ohr);
  const [guide, setGuide] = useState(false);
  const fehler = check.fehler;
  const schalter = fehler ? schalterFuer(fehler, platform) : [];
  const steps = fehler && fehler !== "privat" ? anleitung(platform, iosMajor(ua()), schalter, typeof location === "undefined" ? undefined : location.host) : [];
  const nochmal = () => {
    setGuide(false);
    check.pruefen();
  };
  if (guide && steps.length) return <StepGuide steps={steps} onBack={() => setGuide(false)} onDone={nochmal} onClose={closeMicSheet} lastLabel="Nochmal testen" hinweis={MENUE_HINWEIS} />;
  return (
    <Sheet title="Mikrofon prüfen" onClose={closeMicSheet} layer="above">
      <div className="flex flex-col gap-3 pb-3" data-mikro-check>
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-field bg-surface" aria-label="Prüfung">
          {checkZeilen(ohr).map((z) => (
            <li key={z.id} className="flex min-h-12 items-center justify-between gap-3 px-3.5 text-[15px] font-semibold" data-pruef={z.id} data-stand={check.ergebnis[z.id]}>
              <span>{z.text}</span>
              <Stand stand={check.ergebnis[z.id]} />
            </li>
          ))}
        </ul>

        {check.sprich && (
          <div className="flex flex-col items-center gap-2 py-1" role="status">
            <p className="text-base font-bold">Sag mal kurz „Moin“</p>
            <span className="h-2 w-40 overflow-hidden rounded-full bg-fill-strong" aria-hidden>
              <span className="block h-full rounded-full bg-good" style={{ width: `${Math.round(check.pegel * 100)}%` }} />
            </span>
          </div>
        )}

        {check.fertig && (
          <p className="flex items-center gap-2 rounded-field bg-good-soft px-3 py-2.5 text-[15px] font-semibold text-good-ink" role="status">
            <Check className="h-5 w-5" strokeWidth={3} aria-hidden /> Alles bereit. Ich hör dich.
          </p>
        )}

        {fehler && !check.laeuft && (
          <>
            <p className="text-base font-semibold">{fehlerSatz(fehler, platform)}</p>
            {steps.length > 0 && <StepList steps={steps} />}
            {platform === "ios" && schalter.includes("seite") && (
              <div className="rounded-field border border-line bg-surface px-3.5 py-3" data-seiten-kasten>
                <p className="text-[15px] font-bold">{SEITEN_KASTEN.titel}</p>
                <p className="text-[14px] leading-snug text-muted">{SEITEN_KASTEN.text}</p>
              </div>
            )}
            {steps.length > 0 && <p className="text-[13px] text-muted">{MENUE_HINWEIS}</p>}
          </>
        )}

        {!check.laeuft && (
          <div className={`grid gap-2 ${steps.length && fehler ? "grid-cols-2" : "grid-cols-1"}`}>
            {steps.length > 0 && fehler && (
              <button type="button" onClick={() => setGuide(true)} className={buttonClass("secondary", "md")}>
                <Play className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Zeig’s mir
              </button>
            )}
            {check.fertig ? (
              <button type="button" onClick={closeMicSheet} className={buttonClass("primary", "md")}>
                Fertig
              </button>
            ) : (
              <button type="button" onClick={check.pruefen} className={buttonClass("primary", "md")}>
                <Mic className="h-4 w-4" strokeWidth={2.5} aria-hidden /> {fehler || start ? "Nochmal testen" : "Jetzt prüfen"}
              </button>
            )}
          </div>
        )}
        {!check.fertig && (
          <button type="button" onClick={onTyping} className="hit mx-auto min-h-11 text-[15px] font-semibold text-muted">
            Lieber tippen
          </button>
        )}
        <Details />
      </div>
    </Sheet>
  );
}
