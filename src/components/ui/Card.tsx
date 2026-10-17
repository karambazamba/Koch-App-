import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { CARD, SECTION_TITLE, SUBTLE } from "./styles";

type CardProps = ComponentPropsWithoutRef<"section"> & {
  /** Überschrift oben in der Karte */
  title?: ReactNode;
  /** Grauer Untertitel unter der Überschrift */
  subtitle?: ReactNode;
  /** Element rechts neben der Überschrift (z. B. ein Link) */
  action?: ReactNode;
  /** false = ohne Innenabstand (z. B. für Listen) */
  padded?: boolean;
};

/** Weiße Karte mit optionaler Überschrift */
export function Card({ title, subtitle, action, padded = true, className = "", children, ...rest }: CardProps) {
  return (
    <section className={`${CARD} ${padded ? "p-4" : ""} ${className}`} {...rest}>
      {(title || action) && (
        <div className={`flex items-start justify-between gap-3 ${padded ? "mb-3" : "px-4 pb-2 pt-4"}`}>
          <div className="min-w-0">
            {title && <h2 className={SECTION_TITLE}>{title}</h2>}
            {subtitle && <p className={SUBTLE}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
