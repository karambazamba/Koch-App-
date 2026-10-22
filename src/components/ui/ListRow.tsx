import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { IconBadge } from "@/components/ui/IconBadge";

type Props = {
  /** Ziel – oder statt Link ein Knopf mit `onClick` */
  href?: string;
  onClick?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  /** Eigenes Element links statt Icon */
  leading?: ReactNode;
  /** Zusatz rechts vor dem Pfeil */
  trailing?: ReactNode;
  /** Aktueller Wert rechts (in Akzentfarbe) */
  value?: ReactNode;
  /** Icon-Hintergrund: Akzent (Standard) oder zurückhaltend grau */
  tone?: "accent" | "neutral";
  className?: string;
  "aria-label"?: string;
};

/** Zeile mit Icon links, Titel + grauem Untertitel und Pfeil rechts */
export function ListRow({ href, onClick, title, subtitle, icon, leading, trailing, value, tone = "accent", className = "", ...rest }: Props) {
  const content = (
    <>
      {leading ?? (icon && <IconBadge icon={icon} tone={tone} />)}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-bold leading-snug text-ink">{title}</span>
        {subtitle && <span className="text-sm leading-snug text-muted">{subtitle}</span>}
      </span>
      {trailing}
      {value !== undefined && value !== "" && <span className="max-w-[40%] shrink-0 truncate text-right text-sm font-bold text-accent-strong">{value}</span>}
      <ChevronRight className="h-5 w-5 shrink-0 text-faint" strokeWidth={2.25} aria-hidden />
    </>
  );
  const rowClass = `flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition active:bg-background ${className}`;
  if (!href) {
    return (
      <button type="button" onClick={onClick} className={rowClass} {...rest}>
        {content}
      </button>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={rowClass} {...rest}>
      {content}
    </Link>
  );
}
