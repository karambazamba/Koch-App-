"use client";

import { avatarHex } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";

/**
 * Gesicht der Begleitung (Name frei wählbar, früher fest "Lotte"): lächelnde
 * Sprechblase mit drei Härchen – dasselbe Motiv wie das App-Icon
 * (scripts/generate-icons.mjs). "circle" (Standard) = im farbigen Kreis, z. B.
 * in der Leiste unten und im Chat-Kopf; "plain" = nur die weiße Sprechblase.
 * Die Kreisfarbe ist die gewählte Icon-Farbe (`color` oder aus dem Profil);
 * im Dunkel-Modus etwas heller und mit hellem Rand (`.begleitung-avatar` in
 * globals.css). Das App-Icon bleibt immer orange.
 */
export function LotteAvatar({ size, variant = "circle", color }: { size: number; variant?: "circle" | "plain"; color?: string }) {
  const profile = useProfile();
  const fill = color ?? avatarHex(profile?.helper.farbe);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="begleitung-avatar shrink-0" data-farbe={fill}>
      {variant === "circle" && <circle className="begleitung-ring" cx="50" cy="50" r="48" fill={fill} stroke="rgba(255,255,255,0.18)" strokeWidth="2" />}
      <g transform={variant === "circle" ? "translate(21.2 20.5) scale(0.72)" : "translate(9 8.5) scale(1.03)"}>
        <path d="M18 22h44a12 12 0 0 1 12 12v18a12 12 0 0 1-12 12H38l-14 11V64h-6A12 12 0 0 1 6 52V34a12 12 0 0 1 12-12z" fill="#fff" />
        <path d="M28 21c-4-4 4-7 0-12M40 21c-4-4 4-7 0-12M52 21c-4-4 4-7 0-12" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="29" cy="40" r="4.6" fill={fill} />
        <circle cx="51" cy="40" r="4.6" fill={fill} />
        <path d="M27 49c7 8 19 8 26 0" stroke={fill} strokeWidth="5.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
