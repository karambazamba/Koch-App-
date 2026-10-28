import { BackButton } from "@/components/ui/BackButton";
import { ErsterBesuch } from "@/components/begleitung/denktmit/ErsterBesuch";

type Props = {
  title: string;
  /** Rechts oben nur ein Knopf: Seiten-Plus (`PagePlus`) oder "…" */
  action?: React.ReactNode;
  /** Wohin "Zurück" führt, wenn es in der App keinen Verlauf gibt */
  backHref?: string;
  /** Kleine Zeile unter dem Titel, z. B. „22. Oktober · morgen“ */
  subtitle?: string;
  /** Mias Tipp beim ersten Besuch: „Zeig mal“, wenn die Seite etwas zu zeigen hat */
  tippZeigMal?: () => void;
};

/**
 * Einheitlicher Kopf aller Unterseiten: oben "‹ <vorherige Seite>" und rechts
 * höchstens ein Knopf (＋ oder „···“), darunter der große Titel (30/800). Zur
 * Startseite führt die Leiste unten (`ui/Leiste`). Direkt darunter, im
 * normalen Seitenfluss (nicht im festen Kopf), steht beim ersten Besuch Mias
 * Tipp für diese Seite (`ErsterBesuch`). Ist ein Fenster aus dem Kopf offen
 * („···“), fällt der Weichzeichner weg – sonst wäre der Kopf der Rahmen für
 * `position: fixed` und das Fenster nur so hoch wie der Kopf.
 */
export function PageHeader({ title, backHref = "/", action, subtitle, tippZeigMal }: Props) {
  return (
    <>
      <header data-sticky-header className="sticky top-0 z-10 flex flex-col bg-background/90 px-4 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur has-[[role=dialog]]:z-30 has-[[role=dialog]]:backdrop-filter-none">
        <div className="flex h-12 items-center justify-between gap-3">
          <BackButton fallback={backHref} />
          {action}
        </div>
        <h1 className="truncate text-[30px] font-extrabold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-[15px] font-semibold text-muted">{subtitle}</p>}
      </header>
      <ErsterBesuch zeigMal={tippZeigMal} className="mx-4 mt-2" />
    </>
  );
}
