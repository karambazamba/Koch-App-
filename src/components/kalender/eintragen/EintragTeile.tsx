"use client";

// Gemeinsame Teile der Fenster „Neue Aufgabe“ und „Neuer Termin“ (Tafel
// 114): das EINE Feld mit dem orangen ↑, darunter EINE Zeile – die Raum-Wahl
// `ui/RaumChips` („Familie · Ich · Arbeit“, für Aufgaben und Termine dieselbe,
// A-034; Mia wählt vor), Glocke
// (42 px, an = Orange) und leise „Mehr ›“ – dazu die Zeile „Erinnern … ✕“,
// die „Mehr“-Zeilen und Chips zum Antippen.

import { forwardRef, type ReactNode } from "react";
import { ArrowUp, Bell, ChevronRight, X } from "lucide-react";
import type { Room } from "@/lib/core/entries";
import type { Haushalt } from "@/lib/core/haushalt";
import { RaumChips } from "@/components/ui/RaumChips";

/** Feld nicht verlassen – die Tastatur bleibt auf */
export const halten = (e: { preventDefault: () => void }) => e.preventDefault();

/** Das eine Feld mit ↑ (Return = speichern) */
export const EintragFeld = forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; placeholder: string; label: string; bereit: boolean; onPaste?: (text: string) => boolean }>(function EintragFeld({ value, onChange, placeholder, label, bereit, onPaste }, ref) {
  return (
    <div className="flex items-center gap-2 rounded-field border border-line bg-fill p-1.5 pl-1 focus-within:border-accent">
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => onPaste?.(e.clipboardData.getData("text")) && e.preventDefault()}
        placeholder={placeholder}
        aria-label={label}
        autoFocus
        enterKeyHint="send"
        autoComplete="off"
        className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[17px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-faint"
      />
      <button
        type="submit"
        aria-label="Speichern"
        aria-disabled={!bereit}
        onPointerDown={halten}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-opacity active:scale-95 ${bereit ? "" : "opacity-35"}`}
      >
        <ArrowUp className="h-5 w-5" strokeWidth={2.75} aria-hidden />
      </button>
    </div>
  );
});

/** Raum-Chips, Glocke, „Mehr ›“ in EINER Zeile (darunter höchstens der einmalige Satz „Hab … gewählt“) */
export function EintragZeile(p: { raum: Room; haushalt: Haushalt; onRaum: (r: Room) => void; hinweis?: string | null; glockeAn: boolean; glockeAuf: boolean; onGlocke: () => void; mehrAuf: boolean; onMehr: () => void }) {
  return (
    <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <RaumChips value={p.raum} haushalt={p.haushalt} onChange={p.onRaum} />
      </div>
      <button
        type="button"
        onPointerDown={halten}
        onClick={p.onGlocke}
        aria-label="Erinnern"
        aria-expanded={p.glockeAuf}
        aria-pressed={p.glockeAn}
        data-glocke
        className={`hit flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-field border bg-surface transition active:scale-95 ${p.glockeAn || p.glockeAuf ? "border-accent text-accent-strong" : "border-line text-muted"}`}
      >
        <Bell className="h-5 w-5" strokeWidth={2} aria-hidden />
      </button>
      <button type="button" onPointerDown={halten} onClick={p.onMehr} aria-expanded={p.mehrAuf} className="hit flex h-11 shrink-0 items-center gap-0.5 pl-1 text-[15px] font-semibold text-muted" data-mehr>
        Mehr <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
    {p.hinweis && (
      <p className="px-1 text-[13px] text-muted" data-raum-hinweis>
        {p.hinweis}
      </p>
    )}
    </div>
  );
}

/** „Erinnern heute 16:00 ✕“ */
export function ErinnernZeile({ text, onWeg }: { text: string; onWeg: () => void }) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-field bg-accent-soft pl-3 text-[15px] font-bold text-accent-strong" data-erinnern>
      <Bell className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="flex-1">{text}</span>
      <button type="button" onPointerDown={halten} onClick={onWeg} aria-label="Nicht erinnern" className="hit flex h-11 w-11 items-center justify-center text-muted">
        <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}

/** Chips zum Antippen (Glocke, Tag, Uhrzeit …) – waagerecht wischbar */
export function Wahl<T extends string>({ label, value, options, onPick }: { label: string; value?: T | null; options: { value: T; label: string }[]; onPick: (v: T) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onPointerDown={halten}
          onClick={() => onPick(o.value)}
          className={`hit inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-[15px] font-semibold active:scale-95 ${value === o.value ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-surface text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Eine Zeile in „Mehr“: links Name, rechts Wert ›; aufgeklappt darunter die Wahl */
export function MehrZeile({ label, wert, auf, onClick, children }: { label: string; wert: string; auf: boolean; onClick: () => void; children?: ReactNode }) {
  return (
    <div className="flex flex-col">
      <button type="button" onClick={onClick} aria-expanded={auf} className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-base font-semibold">
        <span className="flex-1">{label}</span>
        <span className="text-muted">{wert}</span>
        <ChevronRight className={`h-4 w-4 text-muted transition-transform ${auf ? "rotate-90" : ""}`} strokeWidth={2.5} aria-hidden />
      </button>
      {auf && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export const HINWEIS = "px-1 text-[13px] text-muted";
