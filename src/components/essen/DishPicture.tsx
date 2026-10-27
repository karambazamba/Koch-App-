"use client";

// Bild eines Gerichts, überall gleich: eigenes Foto → eingebautes Bild
// (/gerichte/…) → live gezeichnet (dishArt + renderDishSvg). Die einfache
// Teller-Zeichnung nur noch als Notlösung. Kleine Bilder (`small`) zeigen
// einen Ausschnitt auf den Teller, damit man das Essen erkennt. Warme
// Hintergrundfarbe (`tone`) als Platzhalter beim Laden, nie ein kaputtes Bild.
// `leer`: kein Gericht („Noch frei“, „Kein Kochtag“) – gezeichneter leerer
// Teller mit Besteck, damit die Essen-Kachel nie ohne Bild ist.

import { useEffect, useState, type CSSProperties } from "react";
import type { RecipeCategory } from "@/lib/essen/cookbook";
import { cachedDishImage, drawDishImage } from "@/lib/essen/dishImages";

type Props = {
  title?: string;
  ingredients?: string[];
  category?: RecipeCategory | null;
  photo?: string;
  tone?: string;
  alt: string;
  className?: string;
  small?: boolean;
  /** Kein Gericht: leerer Teller mit Besteck */
  leer?: boolean;
};

export function DishPicture({ title, ingredients, category, photo, tone, alt, className = "", small = false, leer = false }: Props) {
  const [broken, setBroken] = useState<string | null>(null);
  const [, setDrawn] = useState(0);
  const style = { "--dish": tone ?? "var(--app-accent)" } as CSSProperties;
  const cached = leer ? null : photo ? photo : title ? cachedDishImage(title, ingredients, category) : null;
  const drawing = cached === undefined;
  const ingredientKey = ingredients?.join(",") ?? "";
  // Kein eingebautes Bild: einmal zeichnen (das Zeichnen wird erst dann geladen)
  useEffect(() => {
    if (!drawing || !title) return;
    let alive = true;
    void drawDishImage(title, ingredientKey ? ingredientKey.split(",") : [], category).then(() => alive && setDrawn((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [drawing, title, ingredientKey, category]);
  const wanted = cached ?? null;
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
          {leer ? <EmptyPlate /> : !drawing && <Plate small={small} />}
        </span>
      )}
    </span>
  );
}

/** Kein Gericht: leerer Teller von oben, links Gabel, rechts Messer */
function EmptyPlate() {
  return (
    <svg viewBox="0 0 140 100" className="h-[78%] max-h-36 w-auto -translate-y-[12%]" aria-hidden>
      <circle cx="70" cy="52" r="38" fill="rgb(0 0 0 / 0.10)" />
      <circle cx="70" cy="50" r="38" fill="#fffdf9" />
      <circle cx="70" cy="50" r="28" fill="#f4eee6" />
      <circle cx="70" cy="50" r="28" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
      <path d="M17 18v14M21 18v14M25 18v14M17 32c0 4 8 4 8 0M21 34v48" stroke="#fffdf9" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M119 18c-6 6-6 22 0 26v38" stroke="#fffdf9" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
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
