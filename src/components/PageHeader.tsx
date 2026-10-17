import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ICON_BUTTON } from "@/components/ui/styles";

type Props = {
  title: string;
  backHref?: string;
};

/** Einheitliche Kopfzeile aller Unterseiten: Zurück-Pfeil und großer Titel */
export function PageHeader({ title, backHref = "/" }: Props) {
  return (
    <header
      data-sticky-header
      className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur"
    >
      <Link href={backHref} aria-label="Zurück" className={ICON_BUTTON}>
        <ChevronLeft className="h-6 w-6" strokeWidth={2.25} aria-hidden />
      </Link>
      <h1 className="min-w-0 truncate text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
    </header>
  );
}
