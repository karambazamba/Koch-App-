// Eigenes, buntes Wetter-Symbol-Set (statt Linien-Icons): Sonne gelb, Wolke
// hell mit feinem Rand, Tropfen blau (auch Sonne + Wolke + Tropfen für
// Schauer), Flocken, Blitz, Nebel; nachts statt Sonne ein Mond. Eine
// Komponente für Wetter-Seite, Kachel und Sport – Farben über Tokens (`--wx-*`).

import { weatherKind, type WeatherKind } from "@/lib/wetter/forecast";
import { windLook, type WindLevel } from "@/lib/wetter/wind";

const Sun = ({ cx = 24, cy = 24, r = 10 }: { cx?: number; cy?: number; r?: number }) => (
  <g>
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return <line key={i} x1={cx + Math.cos(a) * (r + 3.5)} y1={cy + Math.sin(a) * (r + 3.5)} x2={cx + Math.cos(a) * (r + 7)} y2={cy + Math.sin(a) * (r + 7)} stroke="var(--wx-sun-2)" strokeWidth="3" strokeLinecap="round" />;
    })}
    <circle cx={cx} cy={cy} r={r} fill="var(--wx-sun)" stroke="var(--wx-sun-2)" strokeWidth="2" />
  </g>
);

const Moon = ({ cx = 24, cy = 24, r = 10 }: { cx?: number; cy?: number; r?: number }) => (
  <path d={`M${cx + r * 0.35} ${cy - r}a${r} ${r} 0 1 0 ${r * 0.65} ${r * 1.55}a${r * 0.8} ${r * 0.8} 0 0 1-${r * 0.65}-${r * 1.55}z`} fill="var(--wx-moon)" stroke="var(--wx-moon-2)" strokeWidth="1.5" strokeLinejoin="round" />
);

const Cloud = ({ dark = false, y = 0 }: { dark?: boolean; y?: number }) => (
  <path
    d={`M14 ${36 + y}h21a8 8 0 0 0 .6-16 11 11 0 0 0-21-2.4A7.5 7.5 0 0 0 14 ${36 + y}z`}
    fill={dark ? "var(--wx-cloud-dark)" : "var(--wx-cloud)"}
    stroke={dark ? "var(--wx-cloud-dark-2)" : "var(--wx-cloud-2)"}
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

const Drop = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path d={`M${x} ${y}c-${1.8 * s} ${2.6 * s}-${2.6 * s} ${3.9 * s}-${2.6 * s} ${5 * s}a${2.6 * s} ${2.6 * s} 0 0 0 ${5.2 * s} 0c0-${1.1 * s}-${0.8 * s}-${2.4 * s}-${2.6 * s}-${5 * s}z`} fill="var(--wx-rain)" />
);

const Flake = ({ x, y }: { x: number; y: number }) => (
  <g stroke="var(--wx-snow)" strokeWidth="2" strokeLinecap="round">
    <line x1={x - 3} y1={y} x2={x + 3} y2={y} />
    <line x1={x - 1.5} y1={y - 2.6} x2={x + 1.5} y2={y + 2.6} />
    <line x1={x + 1.5} y1={y - 2.6} x2={x - 1.5} y2={y + 2.6} />
  </g>
);

function Motif({ kind, night }: { kind: WeatherKind; night: boolean }) {
  const Light = night ? Moon : Sun;
  switch (kind) {
    case "klar":
      return <Light />;
    case "heiter":
      return (
        <>
          <Light cx={19} cy={18} r={8} />
          <Cloud y={4} />
        </>
      );
    case "nebel":
      return (
        <>
          <Cloud y={-4} />
          <g stroke="var(--wx-cloud-2)" strokeWidth="3" strokeLinecap="round">
            <line x1="10" y1="38" x2="34" y2="38" />
            <line x1="15" y1="43" x2="39" y2="43" />
          </g>
        </>
      );
    case "niesel":
      return (
        <>
          <Cloud y={-5} />
          <Drop x={19} y={35} s={0.8} />
          <Drop x={29} y={37} s={0.8} />
        </>
      );
    case "schauer":
      // Sonne + Wolke + Tropfen: „Schauer möglich“ – zwischendurch auch Sonne
      return (
        <>
          <Light cx={17} cy={14} r={7} />
          <Cloud y={-3} />
          <Drop x={20} y={37} s={0.9} />
          <Drop x={30} y={39} s={0.9} />
        </>
      );
    case "regen":
      return (
        <>
          <Cloud y={-5} />
          <Drop x={16} y={34} />
          <Drop x={25} y={37} />
          <Drop x={34} y={34} />
        </>
      );
    case "schnee":
      return (
        <>
          <Cloud y={-5} />
          <Flake x={16} y={39} />
          <Flake x={25} y={42} />
          <Flake x={34} y={39} />
        </>
      );
    case "gewitter":
      return (
        <>
          <Cloud dark y={-5} />
          <path d="M25 30l-5 8h5l-3 8 8-10h-5l3-6z" fill="var(--wx-bolt)" stroke="var(--wx-bolt-2)" strokeWidth="1" strokeLinejoin="round" />
        </>
      );
    default:
      return <Cloud />;
  }
}

/** Wetter-Symbol zum WMO-Code (Größe über className, z. B. "h-8 w-8"); `night` = Mond statt Sonne */
export function WeatherSymbol({ code, className = "h-6 w-6", night = false }: { code: number; className?: string; night?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden>
      <Motif kind={weatherKind(code).kind} night={night} />
    </svg>
  );
}

/** Neigung des Windsacks je Stufe (Grad nach unten): je stärker, desto höher (Tafel 87) */
const SOCK_TILT: Record<WindLevel, number> = { kaum: 72, leicht: 55, maessig: 38, frisch: 20, lebhaft: 6, stark: 2, stuermisch: 0, sturm: 0, orkan: 0 };

/**
 * Windsack (Tafel 87): grauer Mast, Sack orange mit weißen Streifen (ab
 * „Sturm“ rot), steht je Stufe höher; ab „Lebhaft“ Windstriche daneben. Zeigt
 * nur die STÄRKE, nie die Richtung – die steht als Buchstaben daneben. Still,
 * ohne Animation.
 */
export function Windsock({ level, className = "h-5 w-5" }: { level: WindLevel; className?: string }) {
  const { striche, rot } = windLook(level);
  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden data-windsack={level}>
      <line x1="7" y1="45" x2="7" y2="5" stroke="var(--app-windsack-mast)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="7" cy="5" r="1.8" fill="var(--app-windsack-mast)" />
      <g transform={`rotate(${SOCK_TILT[level]} 7 9)`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const x = 7 + i * 7;
          const h0 = 6.5 - i * 0.9;
          const h1 = 6.5 - (i + 1) * 0.9;
          return <path key={i} d={`M${x} ${9 - h0}L${x + 7} ${9 - h1}L${x + 7} ${9 + h1}L${x} ${9 + h0}Z`} fill={i % 2 ? "var(--app-windsack-streifen)" : rot ? "var(--app-windsack-rot)" : "var(--app-windsack)"} />;
        })}
      </g>
      {Array.from({ length: striche }, (_, i) => {
        const y = 44 - i * 5;
        return <path key={i} d={`M${20 + i} ${y}H${42}q3 0 3-3`} fill="none" stroke="var(--app-windstrich)" strokeWidth="2" strokeLinecap="round" data-windstrich />;
      })}
    </svg>
  );
}
