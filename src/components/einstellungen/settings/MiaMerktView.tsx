"use client";

// Einstellungen → Mia → „Was ich mir merke“: alle gemerkten Muster und
// Antworten (Ja/Nein), Essens-Rituale und feste Läden – einzeln löschbar.
// Vergessen heißt: Mia darf wieder fragen bzw. plant nichts mehr fest ein.

import { X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD_LIST, PAGE_MAIN, SECTION_TITLE, SUBTLE } from "@/components/ui/styles";
import { useShoppingSettings } from "@/lib/einkauf/listStore";
import { removeShopRule } from "@/lib/einkauf/shopRules";
import { merkListe, type MerkEintrag } from "@/lib/mia/denktmit/merken";
import { useDenkt, vergessen } from "@/lib/mia/denktmit/store";

export function MiaMerktView() {
  const s = useDenkt();
  const shop = useShoppingSettings();
  const liste = s && shop ? merkListe(s, shop.shopRules ?? {}) : null;
  const weg = (e: MerkEintrag) => (e.art === "laden" ? removeShopRule(e.key) : vergessen(e.art, e.key));
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Was ich mir merke" backHref="/profil/kuechenhelfer" />
      <main className={PAGE_MAIN}>
        {liste && !liste.length && <p className={`px-1 ${SUBTLE}`}>Noch nichts. Ich merk mir nur, was du mir sagst oder was sich oft wiederholt.</p>}
        {liste &&
          (["Gewohnheiten", "Läden"] as const).map((gruppe) => {
            const rows = liste.filter((e) => e.gruppe === gruppe);
            if (!rows.length) return null;
            return (
              <section key={gruppe} className="flex flex-col gap-2" aria-label={gruppe}>
                <h2 className={`px-1 ${SECTION_TITLE}`}>{gruppe}</h2>
                <ul className={CARD_LIST}>
                  {rows.map((e) => (
                    <li key={`${e.art}:${e.key}`} className="flex min-h-14 items-center gap-3 px-4 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold leading-snug">{e.titel}</p>
                        {e.wert && <p className={SUBTLE}>{e.wert}</p>}
                      </div>
                      <button type="button" onClick={() => weg(e)} className="hit flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted" aria-label={`${e.titel} vergessen`}>
                        <X className="h-5 w-5" strokeWidth={2} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
      </main>
    </div>
  );
}
