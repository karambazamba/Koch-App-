"use client";

import { useId, useState } from "react";

type Props = {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** Vorschläge zum schnellen Antippen */
  suggestions?: string[];
  tone?: "orange" | "red";
};

const TONES = {
  orange: "border-orange-500 bg-orange-50 text-orange-800",
  red: "border-rose-500 bg-rose-50 text-rose-800",
};

/**
 * Liste von Begriffen: Vorschläge antippen oder eigene Einträge hinzufügen.
 * Ausgewählte Einträge erscheinen als Chips und lassen sich wieder entfernen.
 */
export function TagInput({
  label,
  placeholder,
  values,
  onChange,
  suggestions = [],
  tone = "orange",
}: Props) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  const has = (item: string) =>
    values.some((v) => v.toLowerCase() === item.toLowerCase());

  const toggle = (item: string) =>
    onChange(
      has(item)
        ? values.filter((v) => v.toLowerCase() !== item.toLowerCase())
        : [...values, item],
    );

  const addDraft = () => {
    const item = draft.trim();
    if (item && !has(item)) onChange([...values, item]);
    setDraft("");
  };

  const custom = values.filter(
    (v) => !suggestions.some((s) => s.toLowerCase() === v.toLowerCase()),
  );

  const chipClass = (selected: boolean) =>
    `rounded-full border-2 px-4 py-2 text-base font-semibold transition active:scale-95 ${
      selected ? TONES[tone] : "border-stone-200 bg-white text-stone-700"
    }`;

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="text-lg font-bold">
        {label}
      </label>

      {(suggestions.length > 0 || custom.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={has(item)}
              onClick={() => toggle(item)}
              className={chipClass(has(item))}
            >
              {has(item) ? "✓ " : ""}
              {item}
            </button>
          ))}
          {custom.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              aria-label={`${item} entfernen`}
              className={chipClass(true)}
            >
              {item} ✕
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          enterKeyHint="done"
          className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-stone-200 bg-white px-4 text-lg outline-none focus:border-orange-400"
        />
        <button
          type="button"
          onClick={addDraft}
          disabled={!draft.trim()}
          className="h-14 shrink-0 rounded-2xl bg-orange-500 px-5 text-lg font-bold text-white active:scale-95 disabled:opacity-40"
        >
          + Dazu
        </button>
      </div>
    </div>
  );
}
