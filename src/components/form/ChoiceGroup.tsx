"use client";

import type { LucideIcon } from "lucide-react";
import { CARD, tileClass } from "@/components/ui/styles";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

type BaseProps<T extends string> = {
  label: string;
  /** Kleiner Zusatz unter dem Label, z. B. "Mehrfachauswahl möglich" */
  hint?: string;
  options: Option<T>[];
  columns?: 2 | 3 | 4;
  /** "plain" ohne eigene Karte, z. B. innerhalb einer anderen Karte */
  variant?: "card" | "plain";
};

const GRID = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

function ChoiceTiles<T extends string>({
  label,
  hint,
  options,
  columns = 3,
  variant = "card",
  isSelected,
  onPick,
}: BaseProps<T> & { isSelected: (value: T) => boolean; onPick: (value: T) => void }) {
  return (
    <fieldset className={variant === "card" ? `${CARD} p-4` : ""}>
      <legend className="sr-only">{label}</legend>
      <div className="mb-3" aria-hidden>
        <p className="text-base font-bold">{label}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <div className={`grid gap-2 ${GRID[columns]}`}>
        {options.map((option) => {
          const selected = isSelected(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onPick(option.value)}
              className={tileClass(selected)}
            >
              {option.icon && <option.icon className="h-5 w-5" strokeWidth={2} aria-hidden />}
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Einfachauswahl als große, antippbare Kacheln. */
export function ChoiceGroup<T extends string>({
  value,
  onChange,
  ...props
}: BaseProps<T> & { value: T; onChange: (value: T) => void }) {
  return <ChoiceTiles {...props} isSelected={(v) => v === value} onPick={onChange} />;
}
