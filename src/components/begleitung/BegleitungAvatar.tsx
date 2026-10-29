"use client";

import type { CSSProperties } from "react";
import { useAvatarZustand, type AvatarZustand } from "@/lib/core/avatarState";
import { avatarHex } from "@/lib/einstellungen/profile";
import type { Zubehoer } from "@/lib/mia/zubehoer";
import { MiaBlaetter, MiaZubehoer } from "@/components/begleitung/MiaZubehoer";

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
export function BegleitungAvatar({ size, color, zustand, groesse: fest, stabil = false, zubehoer = null, stimmung, blaetter = false }: { size: number; color?: string; zustand?: AvatarZustand; groesse?: "klein" | "gross"; /** Zustand wechselt am selben Element (kein Neuaufbau) – für Abläufe wie den Hallo-Bildschirm */ stabil?: boolean; /** EIN Zubehör (Kürbis, Mütze …) aus `miaLook` */ zubehoer?: Zubehoer | null; /** verschlafen (6–8 Uhr) bzw. ruhig (ab 19 Uhr) – nur Atmen/Blick */ stimmung?: "verschlafen" | "ruhig"; /** Herbstblätter wehen vorbei, Mia kneift kurz die Augen (A-058) */ blaetter?: boolean }) {
  const shared = useAvatarZustand();
  // Mia ist immer orange (Marke); `color` nur für feste Vorschauen
  const c = color ?? avatarHex("orange");
  const z = zustand ?? shared.zustand;
  // Einmalige Zustände starten bei jedem Auslösen neu (neues Element)
  const key = stabil ? "stabil" : zustand ? z : z === "begruessen" || z === "freuen" || z === "herzen" || z === "verwirrt" ? `${z}-${shared.nonce}` : z;
  // Leiste zählt als klein (ganz still), Chat-Kopf und Vorstellung als groß (blinzeln)
  const groesse = fest ?? (size < 44 ? "klein" : size >= 56 ? "gross" : "");
  return (
    <span key={key} className={`avatar ${groesse} inline-flex shrink-0`} data-zustand={z} data-stimmung={stimmung} data-kneifen={blaetter || undefined} style={{ "--c": c, width: size, height: size } as CSSProperties} aria-hidden>
      <svg width={size} height={size} viewBox="0 0 80 80" overflow="visible" className="begleitung-avatar" data-farbe={c} data-dunkel={DARK_COLORS.has(c.toUpperCase()) || undefined}>
        {/* Sonne halb hinter Mia (oben rechts) */}
        {zubehoer === "sonne" && <MiaZubehoer was="sonne" />}
        <circle className="av-ring" cx="40" cy="40" r="40" fill="none" stroke="var(--c)" strokeWidth="3" />
        <g className="av-body">
          <circle cx="40" cy="40" r="40" fill="var(--c)" />
          <circle className="begleitung-ring" cx="40" cy="40" r="39.2" fill="none" />
          <g transform="translate(11.2 12.5) scale(.72)">
            <rect x="8" y="10" width="64" height="52" rx="20" fill="#fff" />
            <path d="M33 60 L40 72 L47 60 Z" fill="#fff" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
            <g transform="translate(40 36) scale(1.05) translate(-40 -36)">
              {/* av-look: Blickrichtung (Augen folgen dem Finger, Hallo-Bildschirm) */}
              <g className="av-look">
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
              </g>
              {/* Kurz zugekniffen (Wind, A-058): „> <“ */}
              <g className="av-kneifen" fill="none" stroke="var(--c)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M27 30.5l5.5 3.5-5.5 3.5" />
                <path d="M53 30.5l-5.5 3.5 5.5 3.5" />
              </g>
              <path className="av-flat" d="M33 47h14" stroke="var(--c)" strokeWidth="4.2" strokeLinecap="round" />
              <path className="av-mouth" d="M31 45.5c5 4 13 4 18 0" stroke="var(--c)" strokeWidth="4.2" fill="none" strokeLinecap="round" />
            </g>
          </g>
        </g>
        {zubehoer && zubehoer !== "sonne" && <MiaZubehoer was={zubehoer} />}
        {blaetter && <MiaBlaetter />}
        {/* Zwei kleine "z" – als Linien gezeichnet (kein Text, damit sie nicht im Seitentext/Vorlesen auftauchen) */}
        <g className="av-zzz" fill="none" stroke="var(--c)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M64.5 4.5h6l-6 7h6" />
          <path d="M73 -3.5h4.5l-4.5 5h4.5" strokeWidth="1.9" />
        </g>
        {/* Danke: zwei, drei kleine Herzen steigen auf */}
        <g className="av-herzen" fill="var(--c)">
          <path d="M66 10c-2-3-6-1-4 2l4 4 4-4c2-3-2-5-4-2z" />
          <path d="M14 6c-1.6-2.4-4.8-.8-3.2 1.6l3.2 3.2 3.2-3.2c1.6-2.4-1.6-4-3.2-1.6z" />
          <path d="M74 26c-1.2-1.8-3.6-.6-2.4 1.2l2.4 2.4 2.4-2.4c1.2-1.8-1.2-3-2.4-1.2z" />
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
