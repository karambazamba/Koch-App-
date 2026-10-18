"use client";

/** Umschalter mit 2–3 Möglichkeiten, z. B. "Tag | Woche" */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-stone-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 flex-1 rounded-lg text-sm font-bold transition ${
            value === o.value ? "bg-surface text-ink shadow-card" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
