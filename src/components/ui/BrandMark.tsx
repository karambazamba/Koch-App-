"use client";

// Marke Mia (Teil 1): Logo als Komponente – „lockup“ (Icon + Schriftzug, das
// Hauptlogo), „icon“ (wenig Platz) oder „wort“ (nur „Mia“). Der Schriftzug
// ist ein Pfad (src/lib/core/brand.ts), folgt Hell/Dunkel über den Token
// --app-brand-wort; das Icon bleibt immer im Mia-Orange. Maße wie die Dateien
// in public/brand/ (Versalhöhe M = 0,62 × Icon, Abstand 0,22 × Icon).

import { useId } from "react";
import { BRAND, BRAND_DARK, WORD_CAP, WORD_PATH, WORD_WIDTH } from "@/lib/core/brand";

const ICON = 80;
const CAP = 0.62 * ICON;
const GAP = 0.22 * ICON;
const WORD_W = (WORD_WIDTH * CAP) / WORD_CAP;
const PAD = 2;

function Icon({ id, x = 0 }: { id: string; x?: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect width="80" height="80" rx="18" fill={`url(#${id})`} />
      <g transform="translate(4.8 6.8) scale(.88)">
        <rect x="8" y="10" width="64" height="52" rx="20" fill="#fff" />
        <path d="M33 60 L40 72 L47 60 Z" fill="#fff" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
        <g transform="translate(40 36) scale(1.05) translate(-40 -36)" fill={BRAND}>
          <rect x="27.5" y="29" width="5" height="10" rx="2.5" />
          <rect x="47.5" y="29" width="5" height="10" rx="2.5" />
          <path d="M31 45.5c5 4 13 4 18 0" stroke={BRAND} strokeWidth="4.2" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}

function Word({ x, y, cap }: { x: number; y: number; cap: number }) {
  return <path d={WORD_PATH} transform={`translate(${x} ${y}) scale(${cap / WORD_CAP})`} fill="var(--app-brand-wort)" />;
}

export function BrandMark({ variant = "lockup", height = 32, className = "" }: { variant?: "lockup" | "icon" | "wort"; height?: number; className?: string }) {
  const id = `mia-${useId().replace(/:/g, "")}`;
  // Nur „Mia“: Versalhöhe = ganze Höhe (Platz für den runden i-Punkt oben)
  const box = variant === "icon" ? [0, 0, ICON, ICON] : variant === "wort" ? [0, -8, (WORD_WIDTH / WORD_CAP) * 100 + PAD, 112] : [0, 0, ICON + GAP + WORD_W + PAD, ICON];
  const width = (height * box[2]) / box[3];
  return (
    <svg viewBox={box.join(" ")} width={width} height={height} role="img" aria-label="Mia" className={`shrink-0 ${className}`} data-brand={variant}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor={BRAND_DARK} />
          <stop offset="1" stopColor={BRAND} />
        </linearGradient>
      </defs>
      {variant !== "wort" && <Icon id={id} />}
      {variant === "lockup" && <Word x={ICON + GAP} y={(ICON - CAP) / 2} cap={CAP} />}
      {variant === "wort" && <Word x={0} y={0} cap={100} />}
    </svg>
  );
}
