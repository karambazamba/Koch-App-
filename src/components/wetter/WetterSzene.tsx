// Kleine, ruhige Szene rechts oben in der Wetter-Kachel (Tafel 120): eigene
// Zeichnungen als inline-SVG, leicht angeschnitten, NICHT animiert – Sonne,
// leicht bewölkt, bewölkt, Regen, Gewitter, Schnee, Wind, Nacht (Mond +
// Sterne). Farben nur über Tokens (`--app-szene-*`, Klassen `sz-*` in
// globals.css, hell/dunkel/auto); im Look „Schlicht“ kleiner und blasser.
// Der Text der Kachel steht links und nie unter der Zeichnung.

import type { TileSize } from "@/lib/core/homeLayout";
import type { WetterSzene as Szene } from "@/lib/wetter/kachel";

/** Weiche Wolke (Grundform 0–56 × 0–32) */
const Wolke = ({ x, y, s, dunkel = false }: { x: number; y: number; s: number; dunkel?: boolean }) => (
  <path className={dunkel ? "sz-wolke-2" : "sz-wolke"} transform={`translate(${x} ${y}) scale(${s})`} d="M11 32h34a11 11 0 0 0 1.2-21.9A15 15 0 0 0 17.4 6.6 12.6 12.6 0 0 0 11 32z" />
);

const Sonne = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <>
    <circle className="sz-hof" cx={cx} cy={cy} r={r * 1.45} />
    <circle className="sz-sonne" cx={cx} cy={cy} r={r} />
  </>
);

const TROPFEN: [number, number][] = [[30, 62], [44, 70], [58, 62], [72, 70], [38, 82], [64, 82]];
const FLOCKEN: [number, number, number][] = [[30, 64, 3], [46, 72, 2.6], [62, 64, 3], [76, 74, 2.6], [38, 84, 2.6], [58, 86, 3]];

function Motiv({ szene }: { szene: Szene }) {
  switch (szene) {
    case "sonne":
      return <Sonne cx={58} cy={40} r={24} />;
    case "leicht":
      return (
        <>
          <Sonne cx={64} cy={34} r={19} />
          <Wolke x={20} y={38} s={1.15} />
        </>
      );
    case "wolken":
      return (
        <>
          <Wolke x={14} y={14} s={0.85} dunkel />
          <Wolke x={30} y={32} s={1.2} />
        </>
      );
    case "regen":
      return (
        <>
          <Wolke x={20} y={14} s={1.25} />
          {TROPFEN.map(([x, y]) => (
            <path key={`${x}-${y}`} className="sz-tropfen" d={`M${x} ${y}l-3 8`} />
          ))}
        </>
      );
    case "gewitter":
      return (
        <>
          <Wolke x={18} y={12} s={1.25} dunkel />
          <path className="sz-blitz" d="M56 54l-10 16h8l-5 14 15-19h-8l6-11z" />
        </>
      );
    case "schnee":
      return (
        <>
          <Wolke x={20} y={14} s={1.25} />
          {FLOCKEN.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} className="sz-flocke" cx={x} cy={y} r={r} />
          ))}
        </>
      );
    case "wind":
      return (
        <>
          <Wolke x={44} y={14} s={0.8} />
          <path className="sz-wind" d="M14 52c18-3 36-3 56 0M18 64c20-3 40-3 62 0M14 76c16-2 32-2 48 0" />
        </>
      );
    case "nacht":
      return (
        <>
          <path className="sz-mond" d="M62 16a24 24 0 1 0 22 34 20 20 0 0 1-22-34z" />
          <circle className="sz-stern" cx={30} cy={26} r={2} />
          <circle className="sz-stern" cx={38} cy={64} r={1.6} />
          <circle className="sz-stern" cx={88} cy={74} r={1.8} />
        </>
      );
  }
}

/** Größe der Szene je Kachel-Größe (angeschnitten rechts oben) */
const GROESSE: Record<TileSize, string> = { XS: "-right-2 -top-3 h-[60px] w-[60px]", S: "-right-3 -top-3 h-[104px] w-[104px]", M: "-right-2 -top-4 h-[112px] w-[112px]" };

export function WetterSzene({ szene, size, schlicht = false }: { szene: Szene; size: TileSize; schlicht?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={`wx-szene pointer-events-none absolute ${GROESSE[size]} ${schlicht ? "origin-top-right scale-75" : ""}`} aria-hidden data-szene={szene}>
      <Motiv szene={szene} />
    </svg>
  );
}
