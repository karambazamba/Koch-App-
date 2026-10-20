"use client";

import type { CSSProperties } from "react";
import { useAvatarZustand, type AvatarZustand } from "@/lib/core/avatarState";
import { avatarHex } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";

/** Dunkle Icon-Farben bekommen im Dunkel-Modus (und auf der dunklen Leiste) einen feinen hellen Rand */
const DARK_COLORS = new Set(["#2B4470", "#3E3A37", "#A33B67"]);

/**
 * Gesicht der Begleitung (Name frei wählbar): ruhige weiße Sprechblase mit
 * mittiger Spitze, senkrechten Augen und dezentem Lächeln im Kreis in der
 * Lieblingsfarbe (`color` oder aus dem Profil) – dasselbe Motiv wie das
 * App-Icon (MOTIF in scripts/generate-icons.mjs). Die eine Komponente für alle
 * Stellen. Lebendig nach docs/vorlagen/avatar-animation.md: der Zustand kommt
 * zentral aus `avatarState` (alle Avatare reagieren gleich) – nur wo es passt
 * fest vorgegeben (`zustand`, z. B. Auswahl-Karten "ruhig", Vorstellung
 * "begruessen"). `.klein` (< 44 px) und `.gross` (≥ 56 px) steuern Blinzeln
 * und Denk-Punkte.
 */
export function LotteAvatar({ size, color, zustand, groesse: fest }: { size: number; color?: string; zustand?: AvatarZustand; groesse?: "klein" | "gross" }) {
  const profile = useProfile();
  const shared = useAvatarZustand();
  const c = color ?? avatarHex(profile?.helper.farbe);
  const z = zustand ?? shared.zustand;
  // Einmalige Zustände starten bei jedem Auslösen neu (neues Element)
  const key = zustand ? z : z === "begruessen" || z === "freuen" || z === "verwirrt" ? `${z}-${shared.nonce}` : z;
  // Leiste zählt als klein (ganz still), Chat-Kopf und Vorstellung als groß (blinzeln)
  const groesse = fest ?? (size < 44 ? "klein" : size >= 56 ? "gross" : "");
  return (
    <span key={key} className={`avatar ${groesse} inline-flex shrink-0`} data-zustand={z} style={{ "--c": c, width: size, height: size } as CSSProperties} aria-hidden>
      <svg width={size} height={size} viewBox="0 0 80 80" overflow="visible" className="begleitung-avatar" data-farbe={c} data-dunkel={DARK_COLORS.has(c.toUpperCase()) || undefined}>
        <circle className="av-ring" cx="40" cy="40" r="40" fill="none" stroke="var(--c)" strokeWidth="3" />
        <g className="av-body">
          <circle cx="40" cy="40" r="40" fill="var(--c)" />
          <circle className="begleitung-ring" cx="40" cy="40" r="39.2" fill="none" />
          <g transform="translate(11.2 12.5) scale(.72)">
            <rect x="8" y="10" width="64" height="52" rx="20" fill="#fff" />
            <path d="M33 60 L40 72 L47 60 Z" fill="#fff" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
            <g transform="translate(40 36) scale(1.05) translate(-40 -36)">
              <g className="av-eyes">
                <rect x="27.5" y="29" width="5" height="10" rx="2.5" fill="var(--c)" />
                <rect x="47.5" y="29" width="5" height="10" rx="2.5" fill="var(--c)" />
              </g>
              <g className="av-happy" fill="none" stroke="var(--c)" strokeWidth="3.6" strokeLinecap="round">
                <path d="M26.5 35c2-3.5 5-3.5 7 0" />
                <path d="M46.5 35c2-3.5 5-3.5 7 0" />
              </g>
              <g className="av-closed" fill="none" stroke="var(--c)" strokeWidth="3.6" strokeLinecap="round">
                <path d="M26.5 35c2 2.5 5 2.5 7 0" />
                <path d="M46.5 35c2 2.5 5 2.5 7 0" />
              </g>
              <path className="av-flat" d="M33 47h14" stroke="var(--c)" strokeWidth="4.2" strokeLinecap="round" />
              <path className="av-mouth" d="M31 45.5c5 4 13 4 18 0" stroke="var(--c)" strokeWidth="4.2" fill="none" strokeLinecap="round" />
            </g>
          </g>
        </g>
        <g className="av-zzz" fill="var(--c)" fontWeight="800">
          <text x="64" y="12" fontSize="11">z</text>
          <text x="72" y="3" fontSize="8">z</text>
        </g>
        <g className="av-dots" fill="var(--c)">
          <circle cx="66" cy="8" r="2.6" />
          <circle cx="73" cy="3" r="2.6" />
          <circle cx="80" cy="-2" r="2.6" />
        </g>
      </svg>
    </span>
  );
}
