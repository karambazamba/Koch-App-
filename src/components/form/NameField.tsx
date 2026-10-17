"use client";

import { Baby, PenLine, User, type LucideIcon } from "lucide-react";
import { INPUT_BASE } from "@/components/ui/styles";
import { focusNextInChain } from "@/lib/useMobileKeyboard";

export const PERSON_ICONS: Record<"erwachsen" | "kind", LucideIcon> = { erwachsen: User, kind: Baby };

type Props = {
  /** Wer gemeint ist, z. B. "Erwachsene:r 1" */
  who: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  /** Letztes Feld der Eingabekette → Enter schließt die Tastatur */
  isLast?: boolean;
  /** Kompakter, für viele Namensfelder untereinander */
  compact?: boolean;
};

/** Deutlich erkennbares Namensfeld mit Label und Stift-Symbol. */
export function NameField({
  who,
  icon: Icon,
  value,
  onChange,
  isLast = false,
  compact = false,
}: Props) {
  return (
    <label className={`flex flex-col ${compact ? "gap-1" : "gap-2"}`}>
      <span
        className={`flex items-center gap-2 font-semibold text-muted ${compact ? "text-sm" : "text-base"}`}
      >
        <Icon className="h-4 w-4 text-accent" strokeWidth={2.25} aria-hidden />
        {who} – Name
      </span>
      <span className="relative flex items-center">
        <PenLine className="pointer-events-none absolute left-4 h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Name eingeben (optional)"
          autoComplete="off"
          enterKeyHint={isLast ? "done" : "next"}
          data-enter-chain
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              focusNextInChain(e.currentTarget);
            }
          }}
          className={`${INPUT_BASE} ${compact ? "h-12" : "h-14"} w-full pl-12 pr-4 text-lg font-semibold placeholder:font-normal`}
        />
      </span>
    </label>
  );
}
