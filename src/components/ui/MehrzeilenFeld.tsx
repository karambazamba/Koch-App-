"use client";

// Ein Feld für Text mit Absätzen (Notizen-Schnellfeld, Schnelleingabe von
// Notiz und Pinnwand, Notiz bearbeiten mit `voll`): wächst mit bis 6 Zeilen, dann scrollt es. Return =
// neue Zeile; gespeichert wird nur über den Knopf daneben („Sichern“ / ➤).
// Angezeigt wird der Text überall mit `whitespace-pre-line`.

import { useLayoutEffect, useRef, type Ref } from "react";
import { INPUT_BASE } from "@/components/ui/styles";

/** Höchstens 6 Zeilen à 1,5em + Innenabstand, dann scrollen */
const MAX_HEIGHT = "max-h-[calc(6*1.5em+1.5rem)]";

export function MehrzeilenFeld({
  value,
  onChange,
  label,
  placeholder,
  autoFocus = false,
  className = "",
  voll = false,
  ref,
}: {
  value: string;
  onChange: (text: string) => void;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** Ganze Seite (Notiz bearbeiten): ohne Rahmen, wächst ohne Grenze mit */
  voll?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}) {
  const own = useRef<HTMLTextAreaElement | null>(null);
  // Höhe an den Inhalt (auch nach dem Leeren nach dem Sichern)
  useLayoutEffect(() => {
    const el = own.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        own.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      autoFocus={autoFocus}
      rows={1}
      enterKeyHint="enter"
      className={voll ? `w-full resize-none overflow-hidden bg-transparent text-[17px] leading-relaxed placeholder:text-faint focus:outline-none ${className}` : `${INPUT_BASE} ${MAX_HEIGHT} min-h-12 min-w-0 flex-1 resize-none overflow-y-auto px-4 py-3 leading-normal ${className}`}
      data-mehrzeilig
    />
  );
}
