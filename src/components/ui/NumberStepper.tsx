"use client";

import { Minus, Plus } from "lucide-react";
import { CARD } from "@/components/ui/styles";

type Props = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** "plain" ohne eigene Karte, z. B. mehrere Zähler in einer gemeinsamen Karte */
  variant?: "card" | "plain";
};

/** Zahlenauswahl mit großen Plus-/Minus-Knöpfen statt Tastatur. */
export function NumberStepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
  variant = "card",
}: Props) {
  const buttonClass =
    "flex h-12 w-12 items-center justify-center rounded-field bg-accent-soft text-accent-strong transition active:scale-95 disabled:opacity-30";

  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        variant === "card" ? `${CARD} p-4` : "py-3"
      }`}
    >
      <div>
        <p className="text-base font-bold">{label}</p>
        {hint && <p className="whitespace-nowrap text-sm text-muted">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`${label}: weniger`}
        >
          <Minus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </button>
        <span className="w-8 text-center text-2xl font-extrabold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`${label}: mehr`}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
