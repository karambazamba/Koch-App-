"use client";

// Eine Zeile als Knopf: Tippen = öffnen, lange drücken = `onLang` (A-034:
// „Für Familie / Nur ich / Arbeit“). Ohne `onLang` ein ganz normaler Knopf.

import type { ReactNode } from "react";
import { useLangDruecken } from "@/components/ui/useLangDruecken";

export function LangKnopf({ onTap, onLang, className, label, children }: { onTap: () => void; onLang?: (() => void) | null; className?: string; label?: string; children: ReactNode }) {
  const lang = useLangDruecken(onLang ?? null);
  return (
    <button type="button" {...lang.griffe} onClick={() => lang.geklickt() && onTap()} className={className} aria-label={label}>
      {children}
    </button>
  );
}
