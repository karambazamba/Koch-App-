"use client";

type Props = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

/** Zahlenauswahl mit großen Plus-/Minus-Knöpfen statt Tastatur. */
export function NumberStepper({ label, hint, value, min, max, onChange }: Props) {
  const buttonClass =
    "flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-3xl font-bold text-orange-700 active:scale-95 disabled:opacity-30";

  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm">
      <div>
        <p className="text-lg font-bold">{label}</p>
        {hint && <p className="text-stone-500">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`${label}: weniger`}
        >
          −
        </button>
        <span className="w-8 text-center text-3xl font-extrabold" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`${label}: mehr`}
        >
          +
        </button>
      </div>
    </div>
  );
}
