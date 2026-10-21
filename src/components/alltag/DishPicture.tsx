// Bild eines Gerichts: Foto (object-fit: cover, warme Hintergrundfarbe als
// Platzhalter beim Laden) – ohne Foto eine Teller-Zeichnung in der Farbe des
// Gerichts (`dishTone`), nie ein kaputtes Bild und kein Emoji.

import type { CSSProperties } from "react";

export function DishPicture({ photo, tone, alt, className = "", small = false }: { photo?: string; tone?: string; alt: string; className?: string; small?: boolean }) {
  const style = { "--dish": tone ?? "var(--app-accent)" } as CSSProperties;
  return (
    <span className={`dish-picture block overflow-hidden ${/\babsolute\b/.test(className) ? "" : "relative"} ${className}`} style={style}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- kleines, lokales Bild; im Service Worker gecacht
        <img src={photo} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="eager" decoding="async" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center" role={alt ? "img" : undefined} aria-label={alt || undefined}>
          <Plate small={small} />
        </span>
      )}
    </span>
  );
}

/** Teller von oben: heller Rand, Essen in der Farbe des Gerichts mit ein paar Stückchen */
function Plate({ small }: { small: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={small ? "h-[78%] w-[78%]" : "h-[86%] max-h-40 w-auto"} aria-hidden>
      <circle cx="50" cy="52" r="40" fill="rgb(0 0 0 / 0.10)" />
      <circle cx="50" cy="50" r="40" fill="#fffdf9" />
      <circle cx="50" cy="50" r="31" fill="#f4eee6" />
      <path d="M30 52c0-11 9-21 21-21 11 0 19 8 19 18 0 12-9 20-20 20-11 0-20-6-20-17z" fill="var(--dish)" />
      <circle cx="42" cy="45" r="4" fill="#fff" opacity="0.55" />
      <circle cx="56" cy="56" r="3.2" fill="#fff" opacity="0.4" />
      <circle cx="58" cy="43" r="2.6" fill="rgb(0 0 0 / 0.18)" />
      <circle cx="45" cy="59" r="2.4" fill="rgb(0 0 0 / 0.15)" />
    </svg>
  );
}
