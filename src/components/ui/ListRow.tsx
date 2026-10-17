import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { IconBadge } from "./IconBadge";

type Props = {
  href: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  /** Eigenes Element links statt Icon */
  leading?: ReactNode;
  /** Zusatz rechts vor dem Pfeil */
  trailing?: ReactNode;
  className?: string;
  "aria-label"?: string;
};

/** Zeile mit Icon links, Titel + grauem Untertitel und Pfeil rechts */
export function ListRow({ href, title, subtitle, icon, leading, trailing, className = "", ...rest }: Props) {
  return (
    <Link href={href} className={`flex min-h-16 items-center gap-3 px-4 py-3 transition active:bg-stone-50 ${className}`} {...rest}>
      {leading ?? (icon && <IconBadge icon={icon} />)}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-bold leading-snug text-ink">{title}</span>
        {subtitle && <span className="text-sm leading-snug text-muted">{subtitle}</span>}
      </span>
      {trailing}
      <ChevronRight className="h-5 w-5 shrink-0 text-stone-300" strokeWidth={2.25} aria-hidden />
    </Link>
  );
}
