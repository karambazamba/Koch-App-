// Eigenes, weiches Wetter-Symbol-Set (statt Linien-Icons): Sonne, Wolke,
// Tropfen, Flocken, Blitz, Nebel – Farben über Tokens (`--wx-*` in globals.css).

import { weatherKind, type WeatherKind } from "@/lib/wetter/forecast";

const Sun = ({ cx = 24, cy = 24, r = 10 }: { cx?: number; cy?: number; r?: number }) => (
  <g>
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return <line key={i} x1={cx + Math.cos(a) * (r + 3.5)} y1={cy + Math.sin(a) * (r + 3.5)} x2={cx + Math.cos(a) * (r + 7)} y2={cy + Math.sin(a) * (r + 7)} stroke="var(--wx-sun-2)" strokeWidth="3" strokeLinecap="round" />;
    })}
    <circle cx={cx} cy={cy} r={r} fill="var(--wx-sun)" stroke="var(--wx-sun-2)" strokeWidth="2" />
  </g>
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

function Motif({ kind }: { kind: WeatherKind }) {
  switch (kind) {
    case "klar":
      return <Sun />;
    case "heiter":
      return (
        <>
          <Sun cx={19} cy={18} r={8} />
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
    case "regen":
    case "schauer":
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

/** Wetter-Symbol zum WMO-Code (Größe über className, z. B. "h-8 w-8") */
export function WeatherSymbol({ code, className = "h-6 w-6" }: { code: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden>
      <Motif kind={weatherKind(code).kind} />
    </svg>
  );
}
