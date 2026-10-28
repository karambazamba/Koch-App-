// Einkauf wie Bring (Tafel 35): eigene, gezeichnete Symbole für die
// häufigsten Artikel – flache Formen in warmen Farben, im Code gezeichnet
// (keine fremden Bilder, keine KI; docs/credits.md). Zuordnung:
// lib/einkauf/kacheln/symbols.ts. Ohne eigene Zeichnung → Linien-Symbol der
// Abteilung (Kühlregal, Obst, Gemüse, Drogerie …), nie ein Buchstabe und nie
// Korb oder Karton (Tafel 102; lib/einkauf/kacheln/abteilung.ts).

import type { ReactNode } from "react";
import { Apple, Beef, Carrot, Croissant, CupSoda, Refrigerator, Snowflake, SprayCan, Utensils, Wheat, type LucideIcon } from "lucide-react";
import type { SymbolId } from "@/lib/einkauf/kacheln/symbols";
import { abteilungSymbol, type AbteilungSymbol } from "@/lib/einkauf/kacheln/abteilung";

/** Linien-Symbol je Abteilung (für Artikel ohne eigene Zeichnung) */
const ABTEILUNG: Record<AbteilungSymbol, LucideIcon> = {
  obst: Apple,
  "obst-gemuese": Carrot,
  brot: Croissant,
  kuehlregal: Refrigerator,
  "fleisch-fisch": Beef,
  vorrat: Wheat,
  getraenke: CupSoda,
  tiefkuehl: Snowflake,
  drogerie: SprayCan,
  sonstiges: Utensils,
};

// Farben der Zeichnungen (wie bei den Gerichtsbildern fest, nicht Teil des Designs)
const C = {
  weiss: "#ffffff", creme: "#fbf3e2", milch: "#eef4fb", blau: "#5b8fd6", dunkelblau: "#2f5aa8", gelb: "#f6c443", senf: "#e0a526",
  orange: "#f08a2c", rot: "#e0533d", dunkelrot: "#b23a2c", rosa: "#f2a7a0", gruen: "#5aa55a", hellgruen: "#9ccc65", dunkelgruen: "#2f7d3a",
  braun: "#a8692f", hellbraun: "#d9a066", dunkelbraun: "#6b4226", lila: "#8a5cc2", grau: "#9aa3ad", hellgrau: "#d8dde3", schwarz: "#3a3330", tuerkis: "#3fb3b0",
};

const S: Record<SymbolId, ReactNode> = {
  milch: (
    <>
      <path d="M17 12h14l3 7v21a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V19z" fill={C.milch} />
      <path d="M17 6h14v6H17z" fill={C.blau} />
      <path d="M14 24h20v9H14z" fill={C.blau} />
    </>
  ),
  kaese: (
    <>
      <path d="M8 30 36 14l4 6v16H8z" fill={C.gelb} />
      <path d="M8 30h32v6H8z" fill={C.senf} />
      <circle cx="20" cy="27" r="2.4" fill={C.senf} />
      <circle cx="31" cy="23" r="1.8" fill={C.senf} />
    </>
  ),
  butter: (
    <>
      <path d="M9 24 21 16h18v14l-12 8H9z" fill={C.gelb} />
      <path d="M9 24h18v14H9z" fill={C.creme} />
      <path d="M27 24l12-8v14l-12 8z" fill={C.senf} />
    </>
  ),
  joghurt: (
    <>
      <path d="M12 16h24l-3 24H15z" fill={C.weiss} stroke={C.hellgrau} strokeWidth="1.5" />
      <path d="M11 12h26v5H11z" fill={C.rosa} />
      <path d="M14 26h20l-1 7H15z" fill={C.rosa} />
    </>
  ),
  eier: (
    <>
      <ellipse cx="18" cy="27" rx="7.5" ry="10" fill={C.creme} stroke={C.hellbraun} strokeWidth="1.5" />
      <ellipse cx="31" cy="29" rx="7.5" ry="10" fill={C.hellbraun} />
    </>
  ),
  sahne: (
    <>
      <path d="M15 14h18v26a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2z" fill={C.weiss} stroke={C.hellgrau} strokeWidth="1.5" />
      <path d="M17 8h14l2 6H15z" fill={C.dunkelblau} />
      <path d="M15 24h18v8H15z" fill={C.milch} />
    </>
  ),
  brot: (
    <>
      <path d="M8 26c0-8 7-12 16-12s16 4 16 12v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" fill={C.hellbraun} />
      <path d="M17 19l-2 6M24 18v7M31 19l2 6" stroke={C.braun} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  broetchen: (
    <>
      <ellipse cx="24" cy="28" rx="15" ry="10" fill={C.hellbraun} />
      <path d="M24 19v18" stroke={C.braun} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  toast: (
    <>
      <path d="M12 20c0-6 5-9 12-9s12 3 12 9c0 2-1 3-2 3v15H14V23c-1 0-2-1-2-3z" fill={C.hellbraun} />
      <path d="M17 24h14v11H17z" fill={C.creme} />
    </>
  ),
  kuchen: (
    <>
      <path d="M8 25 36 13l4 7z" fill={C.rosa} />
      <path d="M8 25l32-5v16L8 40z" fill={C.gelb} />
      <path d="M8 25l32-5v3L8 28z" fill={C.rosa} />
      <path d="M8 32l32-4v3L8 35z" fill={C.creme} />
      <circle cx="29" cy="15" r="3.2" fill={C.rot} />
      <path d="M27 12c1-2 3-2 4 0z" fill={C.gruen} />
    </>
  ),
  apfel: (
    <>
      <path d="M24 16c-4-3-12-2-12 8 0 9 6 16 12 14 6 2 12-5 12-14 0-10-8-11-12-8z" fill={C.rot} />
      <path d="M24 16c0-4 1-6 3-8" stroke={C.braun} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M26 12c3-3 7-3 8-2-2 3-5 4-8 2z" fill={C.gruen} />
    </>
  ),
  banane: (
    <>
      <path d="M10 18c2 12 12 20 28 18-2 4-8 6-14 5C14 39 8 29 10 18z" fill={C.gelb} />
      <path d="M10 18l-1-4 3 1z" fill={C.braun} />
    </>
  ),
  zitrone: (
    <>
      <ellipse cx="24" cy="26" rx="14" ry="10" fill={C.gelb} />
      <path d="M10 26l-3-1M38 26l3-1" stroke={C.senf} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  orange: (
    <>
      <circle cx="24" cy="27" r="12" fill={C.orange} />
      <path d="M24 15c2-3 6-4 8-3-2 3-5 4-8 3z" fill={C.gruen} />
    </>
  ),
  trauben: (
    <>
      {[[19, 18], [29, 18], [24, 25], [14, 25], [34, 25], [19, 32], [29, 32], [24, 39]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4.6" fill={C.lila} />
      ))}
      <path d="M24 13V8" stroke={C.braun} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  beeren: (
    <>
      <path d="M24 40c-8-4-12-10-12-16 0-5 5-8 12-8s12 3 12 8c0 6-4 12-12 16z" fill={C.rot} />
      <path d="M17 15c3 2 11 2 14 0-2-3-5-4-7-1-2-3-5-2-7 1z" fill={C.gruen} />
      {[[19, 24], [27, 23], [23, 30], [29, 31], [18, 31]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill={C.gelb} />
      ))}
    </>
  ),
  avocado: (
    <>
      <path d="M24 8c6 0 9 8 11 15 3 9-3 17-11 17s-14-8-11-17C15 16 18 8 24 8z" fill={C.dunkelgruen} />
      <path d="M24 13c4 0 6 6 7 11 2 6-2 12-7 12s-9-6-7-12c1-5 3-11 7-11z" fill={C.hellgruen} />
      <circle cx="24" cy="28" r="5" fill={C.braun} />
    </>
  ),
  tomate: (
    <>
      <circle cx="24" cy="27" r="13" fill={C.rot} />
      <path d="M18 15l6 3 6-3-3 5h-6z" fill={C.gruen} />
    </>
  ),
  gurke: (
    <>
      <rect x="7" y="19" width="34" height="11" rx="5.5" transform="rotate(-20 24 24)" fill={C.dunkelgruen} />
      <path d="M14 27l2-1M21 24l2-1M28 22l2-1" stroke={C.hellgruen} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  zucchini: (
    <g transform="rotate(30 24 24)">
      <path d="M10 19h24c3 0 5 2 5 5s-2 5-5 5H10c-2 0-3-2-3-5s1-5 3-5z" fill={C.gruen} />
      <path d="M13 22h17M15 26.5h16" stroke={C.dunkelgruen} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M3 23h5v2H3z" fill={C.hellgruen} />
      <ellipse cx="38" cy="24" rx="1.8" ry="4" fill={C.hellgruen} />
    </g>
  ),
  paprika: (
    <>
      <path d="M13 20c0-5 5-6 11-6s11 1 11 6c0 10-3 20-11 20s-11-10-11-20z" fill={C.rot} />
      <path d="M24 14v-5" stroke={C.dunkelgruen} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  karotte: (
    <>
      <path d="M30 14 12 38c-1 2 1 3 2 2l20-21z" fill={C.orange} />
      <path d="M30 14l3-6M31 15l6-3M32 16l6 1" stroke={C.gruen} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  zwiebel: (
    <>
      <path d="M24 12c-8 6-12 12-12 18 0 6 5 10 12 10s12-4 12-10c0-6-4-12-12-18z" fill={C.hellbraun} />
      <path d="M24 12V7" stroke={C.braun} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 16c-4 6-5 15 0 23M24 16c4 6 5 15 0 23" stroke={C.braun} strokeWidth="1.3" fill="none" />
    </>
  ),
  knoblauch: (
    <>
      <path d="M24 12c-9 5-13 11-13 18 0 6 6 10 13 10s13-4 13-10c0-7-4-13-13-18z" fill={C.creme} stroke={C.hellgrau} strokeWidth="1.5" />
      <path d="M24 14v25M18 18c-2 6-2 14 1 20M30 18c2 6 2 14-1 20" stroke={C.hellgrau} strokeWidth="1.3" fill="none" />
    </>
  ),
  kartoffel: (
    <>
      <path d="M11 27c0-8 7-13 15-12s11 6 11 12-5 12-13 12-13-4-13-12z" fill={C.hellbraun} />
      <circle cx="20" cy="24" r="1.2" fill={C.braun} />
      <circle cx="29" cy="30" r="1.2" fill={C.braun} />
      <circle cx="24" cy="33" r="1" fill={C.braun} />
    </>
  ),
  salat: (
    <>
      <circle cx="24" cy="28" r="13" fill={C.hellgruen} />
      <path d="M24 16c-6 4-8 12-2 22M24 16c6 4 8 12 2 22M14 24c4 0 8 2 10 6M34 24c-4 0-8 2-10 6" stroke={C.gruen} strokeWidth="1.6" fill="none" />
    </>
  ),
  brokkoli: (
    <>
      <path d="M21 28h6l2 12h-10z" fill={C.hellgruen} />
      <circle cx="17" cy="22" r="7" fill={C.dunkelgruen} />
      <circle cx="31" cy="22" r="7" fill={C.dunkelgruen} />
      <circle cx="24" cy="17" r="7" fill={C.gruen} />
    </>
  ),
  pilz: (
    <>
      <path d="M8 24c0-8 7-13 16-13s16 5 16 13z" fill={C.hellbraun} />
      <path d="M19 24h10l1 14a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z" fill={C.creme} />
    </>
  ),
  kraeuter: (
    <>
      <path d="M24 40V16M24 30l-8-6M24 24l7-6M24 34l7-4" stroke={C.dunkelgruen} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <ellipse cx="14" cy="22" rx="5" ry="3" transform="rotate(30 14 22)" fill={C.gruen} />
      <ellipse cx="33" cy="16" rx="5" ry="3" transform="rotate(-35 33 16)" fill={C.gruen} />
      <ellipse cx="33" cy="28" rx="5" ry="3" transform="rotate(-25 33 28)" fill={C.gruen} />
      <ellipse cx="24" cy="12" rx="3" ry="5" fill={C.gruen} />
    </>
  ),
  haehnchen: (
    <>
      <path d="M14 30c-4-8 4-18 13-16 8 2 11 11 6 17-4 5-14 6-19-1z" fill={C.hellbraun} />
      <path d="M16 31l-6 6" stroke={C.creme} strokeWidth="4" strokeLinecap="round" />
      <circle cx="9" cy="38" r="2.5" fill={C.creme} />
    </>
  ),
  fleisch: (
    <>
      <path d="M10 24c0-7 8-12 17-11s12 7 11 13-7 12-16 11-12-6-12-13z" fill={C.rot} />
      <path d="M17 24c2-4 9-5 12-1" stroke={C.rosa} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="29" cy="28" r="3" fill={C.creme} />
    </>
  ),
  wurst: (
    <>
      <path d="M10 30c4 6 24 6 28-8" stroke={C.dunkelrot} strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M14 31c4 3 14 3 19-4" stroke={C.rosa} strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </>
  ),
  aufschnitt: (
    <>
      <rect x="8" y="14" width="32" height="24" rx="4" fill={C.milch} />
      <circle cx="19" cy="26" r="8" fill={C.rosa} />
      <circle cx="19" cy="26" r="5" fill={C.weiss} opacity="0.35" />
      <circle cx="30" cy="27" r="8" fill={C.rot} />
      <circle cx="28" cy="25" r="1.3" fill={C.weiss} />
      <circle cx="32" cy="29" r="1.3" fill={C.weiss} />
      <circle cx="31" cy="24" r="1" fill={C.weiss} />
    </>
  ),
  fisch: (
    <>
      <path d="M8 24c6-8 18-10 26-2l6-5v14l-6-5c-8 8-20 6-26-2z" fill={C.blau} />
      <circle cx="15" cy="23" r="1.6" fill={C.weiss} />
    </>
  ),
  nudeln: (
    <>
      <path d="M17 10h14l2 6v22a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2V16z" fill={C.dunkelblau} />
      <path d="M17 18h14v14H17z" fill={C.creme} />
      <path d="M19 21l3 3-3 3M24 21l3 3-3 3M29 21l-1 1" stroke={C.senf} strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),
  reis: (
    <>
      <path d="M14 14c0-2 2-4 10-4s10 2 10 4l-2 24a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2z" fill={C.creme} stroke={C.hellgrau} strokeWidth="1.5" />
      <path d="M15 22h18v9H15z" fill={C.rot} />
    </>
  ),
  mehl: (
    <>
      <path d="M13 12h22l2 26a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2z" fill={C.creme} stroke={C.hellgrau} strokeWidth="1.5" />
      <path d="M24 20c-3 3-3 9 0 12 3-3 3-9 0-12z" fill={C.senf} />
    </>
  ),
  zucker: (
    <>
      <path d="M10 22l14-8 14 8v12l-14 8-14-8z" fill={C.weiss} stroke={C.hellgrau} strokeWidth="1.5" />
      <path d="M10 22l14 8 14-8M24 30v12" stroke={C.hellgrau} strokeWidth="1.5" fill="none" />
    </>
  ),
  oel: (
    <>
      <path d="M21 6h6v6l4 6v20a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2V18l4-6z" fill={C.gelb} />
      <path d="M21 4h6v4h-6z" fill={C.dunkelgruen} />
      <path d="M17 24h14v8H17z" fill={C.dunkelgruen} />
    </>
  ),
  salz: (
    <>
      <path d="M17 14h14v24a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2z" fill={C.weiss} stroke={C.hellgrau} strokeWidth="1.5" />
      <path d="M16 8h16v6H16z" fill={C.grau} />
      <circle cx="21" cy="11" r="0.9" fill={C.weiss} />
      <circle cx="27" cy="11" r="0.9" fill={C.weiss} />
    </>
  ),
  dose: (
    <>
      <path d="M13 14h22v24H13z" fill={C.hellgrau} />
      <ellipse cx="24" cy="14" rx="11" ry="3" fill={C.grau} />
      <path d="M13 20h22v12H13z" fill={C.rot} />
    </>
  ),
  gewuerz: (
    <>
      <path d="M17 16h14v22a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2z" fill={C.dunkelrot} />
      <path d="M17 10h14v6H17z" fill={C.schwarz} />
      <path d="M19 24h10v8H19z" fill={C.creme} />
    </>
  ),
  muesli: (
    <>
      <path d="M8 24h32c0 9-7 15-16 15S8 33 8 24z" fill={C.dunkelblau} />
      <ellipse cx="24" cy="24" rx="16" ry="4" fill={C.hellbraun} />
      <circle cx="19" cy="22" r="1.6" fill={C.rot} />
      <circle cx="28" cy="23" r="1.6" fill={C.braun} />
    </>
  ),
  kaffee: (
    <>
      <path d="M11 20h22v10c0 6-5 10-11 10s-11-4-11-10z" fill={C.weiss} stroke={C.hellgrau} strokeWidth="1.5" />
      <path d="M33 22c5 0 5 8 0 8" stroke={C.hellgrau} strokeWidth="2.5" fill="none" />
      <ellipse cx="22" cy="20" rx="11" ry="2.4" fill={C.dunkelbraun} />
      <path d="M18 14c0-2 2-2 2-4M24 14c0-2 2-2 2-4" stroke={C.hellgrau} strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </>
  ),
  tee: (
    <>
      <path d="M12 20h20v10c0 6-4 10-10 10s-10-4-10-10z" fill={C.hellgruen} />
      <path d="M32 22c5 0 5 8 0 8" stroke={C.hellgruen} strokeWidth="2.5" fill="none" />
      <path d="M22 20V10" stroke={C.grau} strokeWidth="1.2" />
      <path d="M19 8h6v5h-6z" fill={C.orange} />
    </>
  ),
  schokolade: (
    <>
      <path d="M12 10h24v28H12z" fill={C.dunkelbraun} />
      <path d="M12 10h24v10l-6-3-6 4-6-3-6 3z" fill={C.lila} />
      <path d="M24 22v16M12 30h24" stroke={C.braun} strokeWidth="1.3" />
    </>
  ),
  kekse: (
    <>
      <circle cx="24" cy="25" r="13" fill={C.hellbraun} />
      {[[19, 20], [28, 21], [22, 29], [30, 30], [17, 27]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill={C.dunkelbraun} />
      ))}
    </>
  ),
  honig: (
    <>
      <path d="M14 18h20v20a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" fill={C.gelb} />
      <path d="M14 18h20v3c-2 0-2 3-4 3s-2-3-4-3-2 4-4 4-2-4-4-4-2 2-4 2z" fill={C.senf} />
      <rect x="12" y="10" width="24" height="8" rx="2" fill={C.orange} />
      <path d="M17 28h14v8H17z" fill={C.creme} />
      <path d="M24 29l3 1.8v3.4L24 36l-3-1.8v-3.4z" fill={C.senf} />
    </>
  ),
  wasser: (
    <>
      <path d="M20 6h8v4l4 6v22a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V16l4-6z" fill={C.milch} stroke={C.blau} strokeWidth="1.5" />
      <path d="M19 4h10v3H19z" fill={C.blau} />
      <path d="M16 24h16v8H16z" fill={C.blau} />
    </>
  ),
  saft: (
    <>
      <path d="M15 14h18v24a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2z" fill={C.orange} />
      <path d="M15 14l4-6h10l4 6z" fill={C.gelb} />
      <circle cx="24" cy="27" r="4.5" fill={C.gelb} />
    </>
  ),
  bier: (
    <>
      <path d="M14 14h16v24a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z" fill={C.senf} />
      <path d="M30 18c5 0 5 10 0 10" stroke={C.hellgrau} strokeWidth="2.5" fill="none" />
      <path d="M13 14c0-3 3-4 5-4 1-2 5-2 6 0 2-1 6 0 6 4z" fill={C.weiss} />
    </>
  ),
  wein: (
    <>
      <path d="M16 8h16c0 10-3 15-8 15s-8-5-8-15z" fill={C.dunkelrot} />
      <path d="M24 23v12M18 38h12" stroke={C.grau} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  eis: (
    <>
      <path d="M16 22h16l-8 18z" fill={C.hellbraun} />
      <circle cx="20" cy="18" r="6" fill={C.rosa} />
      <circle cx="28" cy="18" r="6" fill={C.creme} />
      <circle cx="24" cy="12" r="5" fill={C.braun} />
    </>
  ),
  pizza: (
    <>
      <path d="M24 40 9 12c10-4 20-4 30 0z" fill={C.gelb} />
      <path d="M9 12c10-4 20-4 30 0l-2 4c-9-3-17-3-26 0z" fill={C.hellbraun} />
      <circle cx="21" cy="21" r="2.4" fill={C.rot} />
      <circle cx="28" cy="25" r="2.4" fill={C.rot} />
      <circle cx="24" cy="31" r="2" fill={C.rot} />
    </>
  ),
  klopapier: (
    <>
      <path d="M12 16h18v20H12z" fill={C.weiss} stroke={C.hellgrau} strokeWidth="1.5" />
      <ellipse cx="30" cy="26" rx="5" ry="10" fill={C.weiss} stroke={C.hellgrau} strokeWidth="1.5" />
      <ellipse cx="30" cy="26" rx="1.8" ry="3.6" fill={C.hellgrau} />
      <path d="M12 36v4h10" stroke={C.hellgrau} strokeWidth="1.5" fill="none" />
    </>
  ),
  windeln: (
    <>
      <path d="M8 16h32v6c0 10-8 18-16 18S8 32 8 22z" fill={C.weiss} stroke={C.hellgrau} strokeWidth="1.5" />
      <path d="M8 16h32v5H8z" fill={C.tuerkis} />
    </>
  ),
  spuelmittel: (
    <>
      <path d="M17 14h14l2 6v18a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2V20z" fill={C.hellgruen} />
      <path d="M21 8h6v6h-6z" fill={C.weiss} stroke={C.hellgrau} strokeWidth="1.2" />
      <circle cx="35" cy="12" r="3" fill={C.milch} stroke={C.blau} strokeWidth="1" />
      <circle cx="38" cy="19" r="2" fill={C.milch} stroke={C.blau} strokeWidth="1" />
    </>
  ),
  waschmittel: (
    <>
      <path d="M11 14h26v24a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2z" fill={C.tuerkis} />
      <path d="M26 10h8v4h-8z" fill={C.dunkelblau} />
      <circle cx="21" cy="27" r="5" fill={C.weiss} />
    </>
  ),
  zahnpasta: (
    <>
      <path d="M8 22h24l6 3-6 3H8z" fill={C.weiss} stroke={C.hellgrau} strokeWidth="1.5" />
      <path d="M8 22h10v6H8z" fill={C.blau} />
      <path d="M38 22h4v6h-4z" fill={C.rot} />
    </>
  ),
  shampoo: (
    <>
      <path d="M16 16h16v22a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2z" fill={C.lila} />
      <path d="M20 10h8v6h-8z" fill={C.weiss} stroke={C.hellgrau} strokeWidth="1.2" />
      <path d="M19 24h10v7H19z" fill={C.weiss} />
    </>
  ),
};

/** Symbol eines Artikels; ohne eigene Zeichnung das Symbol seiner Abteilung */
export function ItemSymbol({ id, name, className = "" }: { id: SymbolId | null; name: string; className?: string }) {
  if (!id) {
    const Icon = ABTEILUNG[abteilungSymbol(name)];
    return (
      <span className={`flex items-center justify-center text-muted ${className}`} data-abteilung={abteilungSymbol(name)} aria-hidden>
        <Icon className="h-[72%] w-[72%]" strokeWidth={2} />
      </span>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      {S[id]}
    </svg>
  );
}
