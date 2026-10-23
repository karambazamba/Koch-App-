// Vorschau der Marke Mia (/brand, nur im Testmodus): BrandMark in allen
// Formen und die Dateien aus public/brand/ auf ihrem Grund.

import { BrandMark } from "@/components/ui/BrandMark";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, SECTION_TITLE } from "@/components/ui/styles";

const FILES = [
  { name: "mia-logo-hell", label: "Hell", bg: "bg-surface" },
  { name: "mia-logo-dunkel", label: "Dunkel", bg: "bg-[var(--app-brand-probe-dunkel)]" },
  { name: "mia-logo-auf-orange", label: "Auf Orange", bg: "bg-[var(--app-brand)]" },
  { name: "mia-icon", label: "Nur Icon", bg: "bg-surface" },
  { name: "mia-aufkleber", label: "Aufkleber", bg: "bg-fill" },
  { name: "mia-punkt", label: "Werbung", bg: "bg-surface" },
];

export function BrandPreview() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 pb-32 pt-4">
      <PageHeader title="Marke" />
      <section className="flex flex-col gap-3">
        <h2 className={SECTION_TITLE}>In der App</h2>
        <div className={`${CARD} flex flex-col items-start gap-4`}>
          <BrandMark height={48} />
          <BrandMark variant="icon" height={48} />
          <BrandMark variant="wort" height={40} />
          <BrandMark height={24} />
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className={SECTION_TITLE}>Dateien</h2>
        {FILES.map((f) => (
          <figure key={f.name} className="flex flex-col gap-1">
            <div className={`flex items-center rounded-card border border-line p-5 ${f.bg}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/brand/${f.name}.svg`} alt={`Mia – ${f.label}`} className="h-12 w-auto" />
            </div>
            <figcaption className="text-sm text-muted">
              {f.label} · {f.name}.svg
            </figcaption>
          </figure>
        ))}
      </section>
    </main>
  );
}
