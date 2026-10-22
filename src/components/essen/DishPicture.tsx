"use client";

// Bild eines Gerichts, überall gleich: eigenes Foto → eingebautes Bild
// (/gerichte/…) → live gezeichnet (dishArt + renderDishSvg). Die einfache
// Teller-Zeichnung nur noch als Notlösung. Kleine Bilder (`small`) zeigen
// einen Ausschnitt auf den Teller, damit man das Essen erkennt. Warme
// Hintergrundfarbe (`tone`) als Platzhalter beim Laden, nie ein kaputtes Bild.

import { useState, type CSSProperties } from "react";
import type { RecipeCategory } from "@/lib/essen/cookbook";
import { dishImage } from "@/lib/essen/dishImages";

type Props = {
  title?: string;
  ingredients?: string[];
  category?: RecipeCategory | null;
  photo?: string;
  tone?: string;
  alt: string;
  className?: string;
  small?: boolean;
};

export function DishPicture({ title, ingredients, category, photo, tone, alt, className = "", small = false }: Props) {
  const [broken, setBroken] = useState<string | null>(null);
  const style = { "--dish": tone ?? "var(--app-accent)" } as CSSProperties;
  const wanted = photo ?? (title ? dishImage(title, ingredients, category) : null);
  const src = wanted && wanted !== broken ? wanted : null;
  return (
    <span className={`dish-picture block overflow-hidden ${/\babsolute\b/.test(className) ? "" : "relative"} ${className}`} style={style}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- kleines, lokales Bild bzw. data-URL; im Service Worker gecacht
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover ${small && !photo ? "scale-[1.3] object-[52%_50%]" : ""}`}
          loading="eager"
          decoding="async"
          onError={() => setBroken(src)}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center" role={alt ? "img" : undefined} aria-label={alt || undefined}>
          <Plate small={small} />
        </span>
      )}
    </span>
  );
}

/** Notlösung: Teller von oben, Essen in der Farbe des Gerichts */
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
