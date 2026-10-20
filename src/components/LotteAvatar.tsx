"use client";

import { avatarHex } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";

/** Dunkle Icon-Farben bekommen im Dunkel-Modus (und auf der dunklen Leiste) einen feinen hellen Rand */
const DARK_COLORS = new Set(["#2B4470", "#3E3A37", "#A33B67"]);

/**
 * Gesicht der Begleitung (Name frei wählbar): ruhige weiße Sprechblase mit
 * mittiger Spitze, senkrechten Augen und dezentem Lächeln im farbigen Kreis –
 * dasselbe Motiv wie das App-Icon (scripts/generate-icons.mjs). Die Farbe ist
 * die gewählte Icon-Farbe (`color` oder aus dem Profil); das App-Icon bleibt
 * immer orange. Die eine Komponente für alle Stellen (Leiste, Chat, Satz auf
 * der Startseite, Kennenlernen, Einstellungen, Hinweise).
 */
export function LotteAvatar({ size, color }: { size: number; color?: string }) {
  const profile = useProfile();
  const c = color ?? avatarHex(profile?.helper.farbe);
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden className="begleitung-avatar shrink-0" data-farbe={c} data-dunkel={DARK_COLORS.has(c.toUpperCase()) || undefined}>
      <circle cx="40" cy="40" r="40" fill={c} />
      <circle className="begleitung-ring" cx="40" cy="40" r="39.2" fill="none" />
      <g transform="translate(11.2 12.5) scale(.72)">
        <rect x="8" y="10" width="64" height="52" rx="20" fill="#fff" />
        <path d="M33 60 L40 72 L47 60 Z" fill="#fff" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
        <g transform="translate(40 36) scale(1.05) translate(-40 -36)">
          <rect x="27.5" y="29" width="5" height="10" rx="2.5" fill={c} />
          <rect x="47.5" y="29" width="5" height="10" rx="2.5" fill={c} />
          <path d="M31 45.5c5 4 13 4 18 0" stroke={c} strokeWidth="4.2" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
