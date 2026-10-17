"use client";

type Option<T extends string> = {
  value: T;
  label: string;
  emoji?: string;
};

type Props<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
  /** "plain" ohne eigene Karte, z. B. innerhalb einer anderen Karte */
  variant?: "card" | "plain";
};

const GRID = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

/** Einfachauswahl als große, antippbare Kacheln. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 3,
  variant = "card",
}: Props<T>) {
  return (
    <fieldset className={variant === "card" ? "rounded-3xl bg-white p-4 shadow-sm" : ""}>
      <legend className="sr-only">{label}</legend>
      <p className="mb-3 text-lg font-bold" aria-hidden>
        {label}
      </p>
      <div className={`grid gap-2 ${GRID[columns]}`}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-base font-bold transition active:scale-95 ${
                selected
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-stone-200 bg-white text-stone-700"
              }`}
            >
              {option.emoji && (
                <span className="text-2xl" aria-hidden>
                  {option.emoji}
                </span>
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
