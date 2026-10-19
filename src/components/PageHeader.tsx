import Link from "next/link";
import { AppIcon } from "@/components/AppLogo";
import { BackButton } from "@/components/BackButton";

type Props = {
  title: string;
  /** Knopf rechts neben dem Titel (z. B. rundes "+") */
  action?: React.ReactNode;
  /** Wohin "Zurück" führt, wenn es in der App keinen Verlauf gibt */
  backHref?: string;
};

/**
 * Einheitliche Kopfzeile aller Unterseiten: Zurück-Pfeil (eine Ebene zurück,
 * wie die Geste), großer Titel und rechts das App-Icon als Weg zur Startseite.
 */
export function PageHeader({ title, backHref = "/", action }: Props) {
  return (
    <header
      data-sticky-header
      className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur"
    >
      <BackButton fallback={backHref} />
      <h1 className="min-w-0 flex-1 truncate text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
      {action}
      {/* 44px Tippfläche um das 32px-Icon */}
      <Link
        href="/"
        aria-label="Zur Startseite"
        className="-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition active:scale-95"
      >
        <AppIcon size={32} />
      </Link>
    </header>
  );
}
