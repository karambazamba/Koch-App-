// Stilles Muster im Himmel der Wetter-Kachel (inline-SVG, keine Bilder, keine
// Animation): feine Regentropfen, helle Punkte für Schnee, ein paar weiche
// Wolken, eine angedeutete Sonne bzw. nachts ein Mond, bei Gewitter ein
// kleiner Blitz. Farbe über `--sky-motiv` (Klasse `wx-motiv`), sehr dezent.

import { useId } from "react";
import type { HimmelMuster as Muster } from "@/lib/wetter/kachel";

/** Tropfen wie auf der Vorlage: kleine Tränen in unregelmäßigem Raster (64 × 64) */
const DROPS: [number, number, number][] = [[8, 6, 1], [40, 14, 0.8], [22, 30, 1.1], [54, 40, 0.9], [6, 48, 0.8], [34, 54, 1]];
const FLAKES: [number, number, number][] = [[10, 8, 2.2], [42, 12, 1.5], [24, 30, 2], [56, 38, 1.6], [8, 50, 1.6], [36, 56, 2.3]];

const Cloud = ({ x, y, s }: { x: number; y: number; s: number }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M10 30h34a10 10 0 0 0 1-20 14 14 0 0 0-26-3A11 11 0 0 0 10 30z" fill="currentColor" />
);

export function HimmelMuster({ muster }: { muster: Muster }) {
  const id = `wx${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (muster === "tropfen" || muster === "punkte")
    return (
      <svg className="wx-motiv pointer-events-none absolute inset-0 h-full w-full" aria-hidden data-muster={muster}>
        <defs>
          <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse">
            {muster === "tropfen"
              ? DROPS.map(([x, y, s]) => <path key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`} d="M0 0c-1.6 2.4-2.4 3.6-2.4 4.6a2.4 2.4 0 0 0 4.8 0c0-1-.8-2.2-2.4-4.6z" fill="currentColor" opacity="0.3" />)
              : FLAKES.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="currentColor" opacity="0.6" />)}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    );
  return (
    <svg viewBox="0 0 120 120" className="wx-motiv pointer-events-none absolute -right-5 -top-5 h-32 w-32" aria-hidden data-muster={muster}>
      {muster === "sonne" && (
        <>
          <circle cx="78" cy="42" r="30" fill="currentColor" opacity="0.18" />
          <circle cx="78" cy="42" r="18" fill="currentColor" opacity="0.4" />
        </>
      )}
      {muster === "mond" && (
        <>
          <path d="M84 22a20 20 0 1 0 14 32 16 16 0 0 1-14-32z" fill="currentColor" opacity="0.45" />
          <circle cx="40" cy="30" r="1.6" fill="currentColor" opacity="0.6" />
          <circle cx="56" cy="64" r="1.2" fill="currentColor" opacity="0.5" />
          <circle cx="30" cy="58" r="1" fill="currentColor" opacity="0.5" />
        </>
      )}
      {muster === "wolken" && (
        <g opacity="0.45">
          <Cloud x={40} y={20} s={1.3} />
          <Cloud x={10} y={58} s={0.8} />
        </g>
      )}
      {muster === "blitz" && <path d="M76 52l-9 15h8l-5 14 14-18h-8l5-11z" fill="currentColor" opacity="0.7" />}
    </svg>
  );
}
