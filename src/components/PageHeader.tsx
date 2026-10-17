import Link from "next/link";

type Props = {
  title: string;
  backHref?: string;
};

export function PageHeader({ title, backHref = "/" }: Props) {
  return (
    <header
      data-sticky-header
      className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
      <Link
        href={backHref}
        aria-label="Zurück"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm active:scale-95"
      >
        ←
      </Link>
      <h1 className="text-2xl font-extrabold">{title}</h1>
    </header>
  );
}
