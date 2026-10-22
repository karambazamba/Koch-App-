"use client";

// Zeit-Rad (Tafel 26): Stunden und Minuten (5er-Schritte) als zwei wischbare
// Spalten mit Einrasten – wie die Uhr-Auswahl auf dem Handy. Antippen einer
// Zahl wählt sie ebenfalls (für Tastatur und Bedienungshilfen). Für Termine,
// Sport und alles, wo eine Uhrzeit gewählt wird.

import { useEffect, useRef } from "react";

const ROW = 40;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, "0");

function Column({ values, value, onChange, label }: { values: number[]; value: number; onChange: (v: number) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Beim Öffnen und bei Änderungen von außen zur Auswahl scrollen
  useEffect(() => {
    const el = ref.current;
    const i = values.indexOf(value);
    if (el && i >= 0 && Math.abs(el.scrollTop - i * ROW) > 2) el.scrollTo({ top: i * ROW });
  }, [value, values]);
  return (
    <div className="relative h-[200px] w-20 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-[80px] h-10 rounded-field bg-accent-soft" aria-hidden />
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        data-no-swipe
        onScroll={(e) => {
          const top = e.currentTarget.scrollTop;
          if (settle.current) clearTimeout(settle.current);
          settle.current = setTimeout(() => {
            const v = values[Math.min(values.length - 1, Math.max(0, Math.round(top / ROW)))];
            if (v !== value) onChange(v);
          }, 90);
        }}
        className="relative h-full snap-y snap-mandatory overflow-y-auto py-[80px] [scrollbar-width:none]"
      >
        {values.map((v) => (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={v === value}
            onClick={() => onChange(v)}
            className={`flex h-10 w-full snap-center items-center justify-center text-[22px] tabular-nums ${v === value ? "font-extrabold text-accent-strong" : "text-muted"}`}
          >
            {pad(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Zeit-Rad: `value` "HH:MM" (Minuten werden auf 5 gerundet) */
export function TimeWheel({ value, onChange }: { value: string; onChange: (hhmm: string) => void }) {
  const h = Math.min(23, Number(value.slice(0, 2)) || 0);
  const m = Math.min(55, Math.round((Number(value.slice(3, 5)) || 0) / 5) * 5);
  return (
    <div className="flex items-center justify-center gap-1" role="group" aria-label="Uhrzeit wählen">
      <Column values={HOURS} value={h} onChange={(v) => onChange(`${pad(v)}:${pad(m)}`)} label="Stunden" />
      <span className="text-[22px] font-extrabold" aria-hidden>
        :
      </span>
      <Column values={MINUTES} value={m} onChange={(v) => onChange(`${pad(h)}:${pad(v)}`)} label="Minuten" />
    </div>
  );
}
