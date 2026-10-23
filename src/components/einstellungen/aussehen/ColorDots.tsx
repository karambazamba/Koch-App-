"use client";

// 10 runde Farbtupfer für „Meine Farbe im Kalender“ (früher die Lieblingsfarbe
// der Begleitung – Mia ist seit v0.64 immer orange).

import { AVATAR_COLORS, type AvatarColor } from "@/lib/einstellungen/profile";

/** 10 runde Farbtupfer (2 Reihen à 5), aktiver mit Ring */
export function ColorDots({ value, onChange }: { value: AvatarColor; onChange: (c: AvatarColor) => void }) {
  return (
    <div className="grid grid-cols-5 justify-items-center gap-y-2" role="radiogroup" aria-label="Farbe">
      {AVATAR_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          aria-label={c.label}
          title={c.label}
          onClick={() => onChange(c.id)}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95 ${value === c.id ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`}
        >
          <span className="h-9 w-9 rounded-full border border-ink/20" style={{ background: c.hex }} />
        </button>
      ))}
    </div>
  );
}
