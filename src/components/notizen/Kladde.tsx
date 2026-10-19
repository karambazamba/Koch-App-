"use client";

// Kladde = Schmierzettel. Als Kachel (Heute, oben auf Notizen): gelblich,
// höchstens drei Zeilen, nie höher als ca. 100 px; antippen oder ✎ öffnet
// das Kladde-Fenster (ca. 85 % hoch, Tastatur sofort offen, Cursor am Ende,
// speichert beim Tippen, "✨ <Name>, räum auf", "Leeren" mit Rückgängig).

import { useEffect, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import { Sheet } from "@/components/plan/Sheet";
import { QuickButton } from "@/components/ui/QuickButton";
import { buttonClass } from "@/components/ui/styles";
import { changeKladde, saveKladde, useKladde } from "@/lib/notizen";
import { now } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { openHelper } from "@/lib/lotte/open";

const CLOCK = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

/** "17:12" der letzten Änderung */
export const kladdeClock = (iso: string | null | undefined) => (iso ? CLOCK.format(new Date(iso)) : "");

/** Kachel: Kopf "✎ KLADDE · 17:12", ✎-Knopf, die ersten drei Zeilen, "+ N weitere Zeilen" */
export function KladdeTile({ name }: { name: string }) {
  const kladde = useKladde();
  const [open, setOpen] = useState(false);
  const lines = (kladde?.text ?? "").split(/\n/).map((l) => l.trim()).filter(Boolean);
  const clock = lines.length ? kladdeClock(kladde?.geaendert) : "";
  return (
    <>
      <section id="kladde" className="relative scroll-mt-24 rounded-2xl border border-kladde-line bg-kladde" aria-label="Kladde">
        <button type="button" onClick={() => setOpen(true)} className="flex max-h-[104px] w-full flex-col overflow-hidden px-3.5 py-2 pr-12 text-left" aria-label={lines.length ? "Kladde öffnen" : "Kladde: schnell was aufschreiben"}>
          {lines.length ? (
            <>
              <span className="mb-0.5 flex items-center gap-1.5 text-[11px] font-bold uppercase leading-tight tracking-wider text-kladde-ink">
                <PenLine className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                Kladde{clock && <span className="font-semibold normal-case tracking-normal"> · {clock}</span>}
              </span>
              {lines.slice(0, 3).map((l, i) => (
                <span key={i} className="block w-full truncate text-[12.5px] leading-[1.3]">
                  {l}
                </span>
              ))}
              {lines.length > 3 && <span className="text-[11px] leading-tight text-muted">+ {lines.length - 3} weitere Zeilen</span>}
            </>
          ) : (
            <span className="flex h-6 items-center gap-1.5 text-[13px] text-muted">
              <PenLine className="h-3.5 w-3.5 shrink-0 text-kladde-ink" strokeWidth={2} aria-hidden />
              Schnell was aufschreiben …
            </span>
          )}
        </button>
        <span className="absolute right-3.5 top-2.5">
          <QuickButton icon={PenLine} tone="kladde" label="In die Kladde schreiben" onClick={() => setOpen(true)} />
        </span>
      </section>
      {open && <KladdeSheet name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Kladde-Fenster */
export function KladdeSheet({ name, onClose }: { name: string; onClose: () => void }) {
  const kladde = useKladde();
  const area = useRef<HTMLTextAreaElement>(null);
  const [typed, setTyped] = useState(false);
  // Cursor ans Ende, Tastatur sofort offen
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [kladde === undefined]); // eslint-disable-line react-hooks/exhaustive-deps
  const text = kladde?.text ?? "";
  const saved = kladde?.geaendert ? (typed || now().getTime() - new Date(kladde.geaendert).getTime() < 60_000 ? "gerade eben" : kladdeClock(kladde.geaendert)) : "";
  return (
    <Sheet
      title="Kladde"
      onClose={onClose}
      tall
      header={
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-kladde-ink" strokeWidth={2.25} aria-hidden />
          <h2 className="flex-1 text-xl font-extrabold tracking-tight">Kladde</h2>
          <button type="button" onClick={onClose} className="h-10 rounded-full bg-bar px-5 text-sm font-bold text-on-bar active:scale-95">
            Fertig
          </button>
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-3 pb-3">
        <textarea
          ref={area}
          value={text}
          onChange={(e) => {
            setTyped(true);
            saveKladde(e.target.value);
          }}
          placeholder="Schnell was aufschreiben …"
          aria-label="Kladde"
          className="min-h-40 w-full flex-1 resize-none rounded-2xl border border-kladde-line bg-kladde p-4 text-base leading-relaxed placeholder:text-muted/70 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          {text.trim() && (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openHelper(undefined, "Räum meine Kladde auf");
                }}
                className={buttonClass("secondary", "sm")}
              >
                ✨ {name}, räum auf
              </button>
              <button
                type="button"
                onClick={() => {
                  const undo = changeKladde("");
                  showToast({ text: "Kladde geleert ✓", undo, undoneText: "Rückgängig gemacht." });
                }}
                className={buttonClass("ghost", "sm")}
              >
                Leeren
              </button>
            </>
          )}
          <span className="flex-1" />
          {text && saved && (
            <span className="text-xs text-muted" role="status">
              gespeichert · {saved}
            </span>
          )}
        </div>
      </div>
    </Sheet>
  );
}
