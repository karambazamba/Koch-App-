// Zubehör für Mias Gesicht (Tafel 81/82, Punkt 8) – als SVG-Gruppe im
// 80er-Raster des Avatars (Kreis Mitte 40/40, Radius 40). Immer nur EINS;
// welches, rechnet `miaLook` (src/lib/mia/zubehoer.ts). Farben sind Inhalt
// (wie die Gerichte-Bilder), keine Knöpfe. Die Sonne liegt halb HINTER Mia
// (BegleitungAvatar zeichnet sie vor dem Körper), Gelb über `--app-sonne`.

import type { Zubehoer } from "@/lib/mia/zubehoer";

export function MiaZubehoer({ was }: { was: Zubehoer }) {
  switch (was) {
    case "kuerbis":
      return (
        <g className="av-zubehoer" data-zubehoer="kuerbis" transform="translate(54 52)">
          <ellipse cx="13" cy="15" rx="13" ry="11" fill="#F28C28" stroke="#fff" strokeWidth="2.4" />
          <path d="M8 6c-2 5-2 13 0 19M18 6c2 5 2 13 0 19" fill="none" stroke="#D9701A" strokeWidth="1.6" />
          <path d="M13 4c0-2.5 1-4 3-5" fill="none" stroke="#5E7D3A" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M8 13l2.5-2.5L13 13zM13 13l2.5-2.5L18 13z" fill="#5A3A1A" />
          <path d="M8 18c3 2.5 7 2.5 10 0" fill="none" stroke="#5A3A1A" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );
    case "weihnachtsmuetze":
      return (
        <g className="av-zubehoer" data-zubehoer="weihnachtsmuetze">
          <path d="M22 10c8-12 26-16 40-6 3 2 6 6 8 10" fill="#D94B3D" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <rect x="16" y="6" width="40" height="9" rx="4.5" fill="#fff" transform="rotate(-10 36 10)" />
          <circle cx="71" cy="16" r="5" fill="#fff" />
        </g>
      );
    case "partyhut":
      return (
        <g className="av-zubehoer" data-zubehoer="partyhut" transform="rotate(14 52 2)">
          <path d="M40 10L52 -18L64 10z" fill="#7C6CD8" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <path d="M45 -1l14 0M48 -9l8 0" stroke="#FFD34E" strokeWidth="3" strokeLinecap="round" />
          <circle cx="52" cy="-19" r="3.5" fill="#FFD34E" />
        </g>
      );
    case "kochmuetze":
      return (
        <g className="av-zubehoer" data-zubehoer="kochmuetze">
          <path d="M24 12c-6-1-8-9-2-12 2-7 11-8 15-3 4-5 13-4 15 3 6 3 4 11-2 12z" fill="#fff" stroke="#E6DED6" strokeWidth="1.6" />
          <rect x="26" y="9" width="24" height="6" rx="2" fill="#fff" stroke="#E6DED6" strokeWidth="1.6" />
        </g>
      );
    case "schal":
      return (
        <g className="av-zubehoer" data-zubehoer="schal">
          <path d="M10 62c18 10 42 10 60 0l2 7c-20 11-44 11-64 0z" fill="#4C7BD9" stroke="#fff" strokeWidth="1.6" />
          <path d="M54 68l4 12 7-2-4-12z" fill="#4C7BD9" stroke="#fff" strokeWidth="1.6" />
          <path d="M18 66l4 3M30 69l3 2M44 69l3-1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );
    case "schirm":
      return (
        <g className="av-zubehoer" data-zubehoer="schirm" transform="translate(52 -14) rotate(18 12 12)">
          <path d="M0 12a12 12 0 0 1 24 0c-2-2-4-2-6 0-2-2-4-2-6 0-2-2-4-2-6 0-2-2-4-2-6 0z" fill="#3E8EDE" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 12v13c0 2.5-3.5 2.5-3.5 0" fill="none" stroke="#5A4A3A" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "sonnenbrille":
      return (
        <g className="av-zubehoer" data-zubehoer="sonnenbrille">
          <rect x="26" y="32" width="13" height="9" rx="3.5" fill="#2E2A27" />
          <rect x="41" y="32" width="13" height="9" rx="3.5" fill="#2E2A27" />
          <path d="M38.5 35h3" stroke="#2E2A27" strokeWidth="2" />
          <path d="M29 34.5h4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".6" />
        </g>
      );
    case "sonne":
      return (
        <g className="av-zubehoer av-sonne" data-zubehoer="sonne">
          <g className="av-sonne-strahlen" stroke="var(--app-sonne)" strokeWidth="2.6" strokeLinecap="round">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
              const r = (a * Math.PI) / 180;
              const p = (d: number) => `${(68 + Math.cos(r) * d).toFixed(1)} ${(12 + Math.sin(r) * d).toFixed(1)}`;
              return <path key={a} d={`M${p(13)}L${p(18)}`} />;
            })}
          </g>
          <circle cx="68" cy="12" r="9.5" fill="var(--app-sonne)" stroke="#fff" strokeWidth="1.6" />
        </g>
      );
    case "osterei":
      return (
        <g className="av-zubehoer" data-zubehoer="osterei" transform="translate(58 50)">
          <path d="M9 0C4 0 0 9 0 15a9 9 0 0 0 18 0C18 9 14 0 9 0z" fill="#9BD3A6" stroke="#fff" strokeWidth="2" />
          <path d="M1.5 12c3-2 5 2 7.5 0s4.5-2 7.5 0" fill="none" stroke="#F2B84B" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "konfetti":
      return (
        <g className="av-zubehoer av-konfetti" data-zubehoer="konfetti">
          <rect x="4" y="2" width="5" height="3" rx="1" fill="#F2B84B" transform="rotate(-20 6 3)" />
          <rect x="68" y="0" width="5" height="3" rx="1" fill="#7C6CD8" transform="rotate(25 70 1)" />
          <circle cx="76" cy="18" r="2" fill="#4C7BD9" />
          <circle cx="2" cy="22" r="2" fill="#D94B3D" />
          <rect x="34" y="-8" width="5" height="3" rx="1" fill="#5FB37A" transform="rotate(10 36 -6)" />
        </g>
      );
  }
}
