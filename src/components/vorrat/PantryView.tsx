"use client";

// /vorrat = „Im Haus“ (Tafel 102): oben „Was ist da?“ – der runde Knopf holt
// Mia, die gleich zuhört und einsortiert (kein eigenes Mikro-Feld). Darunter
// die Sachen als Chips (Symbol + Name) in Gruppen Kühlschrank · Vorrat · Obst
// & Gemüse · Brot · Tiefkühl, nur Gruppen mit Inhalt; oranger Punkt = bald
// aufbrauchen (Legende einmal unten). Aufgebrauchtes nur als eine Zeile mit
// „Auf die Liste“. Chip antippen = kleines Fenster (Gruppe, aufgebraucht,
// löschen). ＋ = Schnelleingabe für mehrere Sachen. „Was koch ich daraus?“
// schwebt über der Leiste – nichts liegt darunter.

import { useState } from "react";
import { ChefHat, Mic, Refrigerator } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PagePlus } from "@/components/ui/QuickButton";
import { CARD, PAGE_MAIN_KNOPF, SECTION_TITLE, UEBER_LEISTE, buttonClass } from "@/components/ui/styles";
import { SacheSheet } from "@/components/vorrat/SacheSheet";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { openHelper } from "@/lib/begleitung/open";
import { openQuick } from "@/lib/core/schnelleingabe";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { toIsoDate, useToday } from "@/lib/essen/weekPlan";
import { aufgebrauchtZeile, houseGroups } from "@/lib/vorrat/imHaus";
import { aufDieListe } from "@/lib/vorrat/kreislauf";
import { usePantryAll, type PantryItem } from "@/lib/vorrat/pantry";

export function PantryView() {
  const all = usePantryAll();
  const today = useToday();
  const shopping = useWeekShoppingList("current");
  const [editing, setEditing] = useState<PantryItem | null>(null);

  if (all === undefined || !today) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const todayIso = toIsoDate(today);
  const { groups, used } = houseGroups(all, todayIso);
  const zeile = aufgebrauchtZeile(used);
  const anySoon = groups.some((g) => g.items.some((i) => i.soon));

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Im Haus" action={<PagePlus label="Mehrere Sachen eintragen" onClick={() => openQuick({ kind: "imhaus" })} />} />
      <main className={PAGE_MAIN_KNOPF}>
        <section className={`${CARD} flex items-center gap-3 p-4`} aria-label="Was ist da?">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-extrabold">Was ist da?</h2>
            <p className="text-sm text-muted">Kurz reinsprechen, ich sortier’s ein.</p>
          </div>
          <button type="button" onClick={() => openHelper("imhaus")} aria-label="Reinsprechen" className="hit flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-float transition active:scale-95" data-reinsprechen>
            <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </section>

        {!groups.length && !zeile ? (
          <section className={`${CARD} flex flex-col items-center gap-2 px-5 py-8 text-center`}>
            <Refrigerator className="h-8 w-8 text-accent" strokeWidth={2} aria-hidden />
            <p className="text-[17px] font-bold">Noch ruhig hier.</p>
            <p className="text-sm text-muted">Was du einkaufst, landet hier von selbst.</p>
          </section>
        ) : null}

        {groups.map((g) => (
          <section key={g.id} aria-label={g.title} className="flex flex-col gap-2" data-gruppe={g.id}>
            <h2 className={`${SECTION_TITLE} px-1`}>{g.title}</h2>
            <ul className="flex flex-wrap gap-2">
              {g.items.map(({ item, soon }) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(item)}
                    aria-label={soon ? `${item.name}, bald aufbrauchen` : item.name}
                    className="hit inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface pl-1.5 pr-3 text-[15px] font-semibold transition active:scale-95"
                    data-sache={item.name}
                  >
                    <ItemSymbol id={symbolFor(item.name)} name={item.name} className="h-7 w-7 shrink-0" />
                    {item.name}
                    {soon && <span className="ml-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" data-bald aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {zeile && (
          <section className={`${CARD} flex items-center gap-3 px-4 py-3`} aria-label="Aufgebraucht" data-aufgebraucht>
            <p className="min-w-0 flex-1 text-[15px] text-muted">{zeile}</p>
            {shopping && (
              <button type="button" onClick={() => aufDieListe(used, shopping.weekStart)} className={`${buttonClass("secondary", "sm")} shrink-0`}>
                Auf die Liste
              </button>
            )}
          </section>
        )}

        {anySoon && (
          <p className="flex items-center gap-2 px-1 text-sm text-muted" data-legende>
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
            bald aufbrauchen
          </p>
        )}
      </main>

      <div className="pointer-events-none fixed inset-x-0 z-20 mx-auto max-w-lg px-4" style={{ bottom: UEBER_LEISTE }}>
        <button type="button" onClick={() => openHelper("spontan")} className={`${buttonClass("primary", "lg")} pointer-events-auto w-full shadow-float`} data-was-koch-ich>
          <ChefHat className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          Was koch ich daraus?
        </button>
      </div>

      {editing && <SacheSheet item={editing} today={todayIso} onClose={() => setEditing(null)} />}
    </div>
  );
}
