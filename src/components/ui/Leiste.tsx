"use client";

// Leiste unten (Tafel 96, Stil B1): schwebend, weiß, rund, drei Reiter
// Kalender · Heute · Essen und rechts Mia, die etwas herausragt. Der Reiter des
// Bereichs, zu dem die Seite gehört, leuchtet orange. Logik rein in
// `core/leiste.ts`. Ausgeblendet (weich, nur transform/opacity) bei Tastatur,
// Fenstern, Mia-Bühne, Bearbeiten und auf den Seiten ohne Leiste.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar, LayoutGrid, Utensils, type LucideIcon } from "lucide-react";
import { MiaButton } from "@/components/begleitung/MiaButton";
import { BEREICHE, bereichVon, bereichWaehlen, istHauptseite, tabSchritt, type Bereich } from "@/lib/core/leiste";
import { stepsToHome } from "@/lib/core/navigation";
import { useKnopfLinks } from "@/lib/mia/knopf";

const ICON: Record<Bereich, LucideIcon> = { kalender: Calendar, heute: LayoutGrid, essen: Utensils };

export function Leiste({ name, weg, buehne }: { name: string; weg: boolean; buehne: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();
  const links = useKnopfLinks();
  const url = `${pathname}${search ? `?${search}` : ""}`;
  const aktiv = bereichVon(url);

  const tippen = (tab: Bereich) => {
    const s = tabSchritt(tab, url, stepsToHome(istHauptseite));
    if (s.art === "oben" || s.art === "wechseln") return bereichWaehlen(tab);
    // Von einer Unterseite: im Verlauf zurück zur Hauptseite (Scrollhöhe bleibt), dort auf den Reiter
    bereichWaehlen(tab);
    if (s.art === "zurueck") return window.history.go(-s.schritte);
    router.push(s.url);
  };

  const mia = (
    <span className="relative w-[64px] shrink-0 self-stretch">
      <span className="absolute -top-[30px] left-1/2 -translate-x-1/2">
        <MiaButton name={name} links={links} />
      </span>
    </span>
  );

  return (
    <nav
      className="leiste pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      aria-label="Bereiche"
      data-begleitung-leiste
      data-leiste
      data-weg={weg || undefined}
      data-buehne={buehne || undefined}
    >
      <div className="pointer-events-auto flex h-[66px] items-stretch rounded-card bg-surface px-1.5 shadow-float" role="tablist" aria-label="Kalender, Heute, Essen" data-leiste-flaeche>
        {links && mia}
        {BEREICHE.map((b) => {
          const Icon = ICON[b.value];
          const an = aktiv === b.value;
          return (
            <button
              key={b.value}
              type="button"
              role="tab"
              aria-selected={an}
              onClick={() => tippen(b.value)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-field active:scale-95 ${an ? "text-accent" : "text-muted"}`}
              data-reiter={b.value}
            >
              <Icon className="h-6 w-6" strokeWidth={an ? 2.4 : 1.9} aria-hidden />
              <span className={`text-[12px] leading-none ${an ? "font-extrabold" : "font-semibold"}`}>{b.label}</span>
            </button>
          );
        })}
        {!links && mia}
      </div>
    </nav>
  );
}
