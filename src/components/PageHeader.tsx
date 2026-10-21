import { BackButton } from "@/components/BackButton";

type Props = {
  title: string;
  /** Rechts oben nur ein Knopf: Seiten-Plus (`PagePlus`) oder "…" */
  action?: React.ReactNode;
  /** Wohin "Zurück" führt, wenn es in der App keinen Verlauf gibt */
  backHref?: string;
};

/**
 * Einheitlicher Kopf aller Unterseiten: oben "‹ <vorherige Seite>" und rechts
 * höchstens ein Knopf, darunter der große Titel (30/800).
 */
export function PageHeader({ title, backHref = "/", action }: Props) {
  return (
    <header data-sticky-header className="sticky top-0 z-10 flex flex-col bg-background/90 px-4 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="flex h-12 items-center justify-between gap-3">
        <BackButton fallback={backHref} />
        {action}
      </div>
      <h1 className="truncate text-[30px] font-extrabold leading-tight tracking-tight">{title}</h1>
    </header>
  );
}
