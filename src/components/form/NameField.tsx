"use client";

type Props = {
  /** Wer gemeint ist, z. B. "Erwachsene:r 1" */
  who: string;
  emoji: string;
  value: string;
  onChange: (value: string) => void;
};

/** Deutlich erkennbares Namensfeld mit Label und Stift-Symbol. */
export function NameField({ who, emoji, value, onChange }: Props) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-base font-bold text-stone-700">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        {who} – Name
      </span>
      <span className="relative flex items-center">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="pointer-events-none absolute left-4 h-6 w-6 fill-none stroke-orange-500"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Name eingeben (optional)"
          autoComplete="off"
          enterKeyHint="next"
          className="h-14 w-full rounded-2xl border-2 border-orange-200 bg-orange-50/60 pl-13 pr-4 text-lg font-semibold outline-none placeholder:font-normal placeholder:text-stone-400 focus:border-orange-500 focus:bg-white"
        />
      </span>
    </label>
  );
}
