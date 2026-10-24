// Datenschutz, Impressum, Nutzungsbedingungen: eine ruhige Leseseite –
// großer Titel, optional „Kurz gesagt“ in Karten, darunter die Abschnitte,
// unten Stand und Entwurfs-Hinweis. Links zu den beiden anderen Seiten.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, NOTE, PAGE_MAIN, SECTION_TITLE } from "@/components/ui/styles";
import { APP_VERSION } from "@/lib/core/app";
import { ENTWURF, KURZ_GESAGT, RECHTSTEXTE_STAND, type Abschnitt } from "@/lib/datenschutz/rechtstexte";

const SEITEN = [
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/impressum", label: "Impressum" },
  { href: "/nutzungsbedingungen", label: "Nutzungsbedingungen" },
];

/** Kleine Links zu den drei Seiten (Einstellungen, Begrüßung, Anmelden) */
export function RechtLinks({ className = "", dicht = false, nur }: { className?: string; dicht?: boolean; nur?: string[] }) {
  return (
    <nav aria-label="Rechtliches" className={`flex flex-wrap items-center justify-center gap-x-3 text-xs font-semibold text-muted ${className}`}>
      {SEITEN.filter((s) => !nur || nur.includes(s.href)).map((s) => (
        <Link key={s.href} href={s.href} className={`hit inline-flex items-center ${dicht ? "h-4" : "h-11"}`}>
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

export function RechtstextView({ title, abschnitte, kurz = false }: { title: string; abschnitte: Abschnitt[]; kurz?: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={title} backHref="/profil" />
      <main className={PAGE_MAIN}>
        {kurz && (
          <section className="flex flex-col gap-2" aria-label="Kurz gesagt">
            <h2 className={`px-1 ${SECTION_TITLE}`}>Kurz gesagt</h2>
            <ul className="flex flex-col gap-2">
              {KURZ_GESAGT.map((k) => (
                <li key={k.titel} className={`${CARD} px-4 py-3`}>
                  <p className="text-[15px] font-bold">{k.titel}</p>
                  <p className="text-[15px] text-muted">{k.text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        {abschnitte.map((a) => (
          <section key={a.titel} className="flex flex-col gap-1.5 px-1" aria-label={a.titel}>
            <h2 className={SECTION_TITLE}>{a.titel}</h2>
            {a.absaetze.map((t) => (
              <p key={t} className="text-[15px] leading-relaxed">
                {t}
              </p>
            ))}
          </section>
        ))}
        <p className={NOTE}>
          Stand {RECHTSTEXTE_STAND.datum} · App {APP_VERSION}. {ENTWURF}
        </p>
        <RechtLinks />
      </main>
    </div>
  );
}
