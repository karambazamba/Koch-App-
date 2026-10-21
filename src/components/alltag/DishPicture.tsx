// Bild eines Gerichts: Foto (object-fit: cover, warme Hintergrundfarbe als
// Platzhalter beim Laden) – ohne Foto ein warmer Farbverlauf mit Symbol, nie
// ein kaputtes Bild.

import type { CSSProperties } from "react";

export function DishPicture({ photo, emoji, tone, alt, className = "", small = false }: { photo?: string; emoji: string; tone?: string; alt: string; className?: string; small?: boolean }) {
  const style = { "--dish": tone ?? "var(--color-accent)" } as CSSProperties;
  return (
    <span className={`dish-picture block overflow-hidden ${/\babsolute\b/.test(className) ? "" : "relative"} ${className}`} style={style}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- kleines, lokales Bild; im Service Worker gecacht
        <img src={photo} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="eager" decoding="async" />
      ) : (
        <span className={`absolute inset-0 flex items-center justify-center ${small ? "text-3xl" : "text-6xl"}`} role={alt ? "img" : undefined} aria-label={alt || undefined}>
          {emoji}
        </span>
      )}
    </span>
  );
}
