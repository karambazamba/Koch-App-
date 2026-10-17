"use client";

type Option<T extends string> = {
  value: T;
  label: string;
  emoji?: string;
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
    <fieldset className={variant === "card" ? "rounded-3xl bg-white p-4 shadow-sm" : ""}>
      <legend className="sr-only">{label}</legend>
      <div className="mb-3" aria-hidden>
        <p className="text-lg font-bold">{label}</p>
        {hint && <p className="text-sm text-stone-500">{hint}</p>}
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

/** Einfachauswahl als große, antippbare Kacheln. */
export function ChoiceGroup<T extends string>({
  value,
  onChange,
  ...props
}: BaseProps<T> & { value: T; onChange: (value: T) => void }) {
  return <ChoiceTiles {...props} isSelected={(v) => v === value} onPick={onChange} />;
}

/**
 * Mehrfachauswahl als Kacheln. Optionen in `exclusive` schließen alle anderen
 * aus. Die letzte gewählte Option lässt sich nicht abwählen (nie leer).
 */
export function MultiChoiceGroup<T extends string>({
  values,
  onChange,
  exclusive = [],
  ...props
}: BaseProps<T> & { values: T[]; onChange: (values: T[]) => void; exclusive?: T[] }) {
  const pick = (value: T) => {
    if (values.includes(value)) {
      if (values.length > 1) onChange(values.filter((v) => v !== value));
      return;
    }
    if (exclusive.includes(value)) {
      onChange([value]);
      return;
    }
    const kept = values.filter((v) => !exclusive.includes(v));
    // Reihenfolge wie in den Optionen, damit "mittags & abends" stabil bleibt.
    onChange(props.options.map((o) => o.value).filter((v) => v === value || kept.includes(v)));
  };

  return <ChoiceTiles {...props} isSelected={(v) => values.includes(v)} onPick={pick} />;
}
