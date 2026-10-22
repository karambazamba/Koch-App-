"use client";

import { useId, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { INPUT, buttonClass, chipClass } from "@/components/ui/styles";

type Props = {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** Vorschläge zum schnellen Antippen */
  suggestions?: string[];
  tone?: "orange" | "red";
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

  // Allergien in Rot – ein Warnhinweis, keine Deko
  const chip = (selected: boolean) => chipClass(selected, tone === "red" ? "danger" : "accent");

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="text-base font-bold">
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
              className={chip(has(item))}
            >
              {has(item) && <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />}
              {item}
            </button>
          ))}
          {custom.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              aria-label={`${item} entfernen`}
              className={chip(true)}
            >
              {item}
              <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
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
              // Eintrag übernommen → Tastatur schließen
              e.currentTarget.blur();
            }
          }}
          enterKeyHint="done"
          className={`${INPUT} flex-1`}
        />
        <button
          type="button"
          onClick={addDraft}
          disabled={!draft.trim()}
          className={buttonClass("primary")}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Dazu
        </button>
      </div>
    </div>
  );
}
