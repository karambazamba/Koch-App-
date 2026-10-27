"use client";

// /vorrat = „Im Haus“ (Tafel 78/79): dieselben Kacheln wie im Einkauf, ohne
// Mengen – nur da oder nicht da. Oben ein kurzer Hinweis und die Chips
// Alle · Kühlschrank · Schrank · TK; dann „Bald aufbrauchen“, die Orte und
// „Aufgebraucht“. Antippen = aufgebraucht (blass), nochmal = wieder auf die
// Liste. Lange drücken = Sache ändern (`SacheSheet`: Ort, „Ist alle“,
// Entfernen). ＋ = Schnelleingabe. Unten „Was koch ich daraus?“ → Spontan
// kochen (wie unter Essen).

import { useState } from "react";
import { ChefHat, Refrigerator } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PagePlus } from "@/components/ui/QuickButton";
import { CARD, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { SacheSheet } from "@/components/vorrat/SacheSheet";
import { ItemTile, TILE_GRID } from "@/components/einkauf/kacheln/ItemTile";
import { openHelper } from "@/lib/begleitung/open";
import { openQuick } from "@/lib/core/schnelleingabe";
import { sectionFor } from "@/lib/einkauf/sections";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { toIsoDate, useToday } from "@/lib/essen/weekPlan";
import { soonBadge } from "@/lib/vorrat/haltbar";
import { HOUSE_CHIPS, houseSections, type HouseChip } from "@/lib/vorrat/imHaus";
import { backToList } from "@/lib/vorrat/kreislauf";
import { markPantryUsed, usePantryAll, type PantryItem } from "@/lib/vorrat/pantry";

export function PantryView() {
  const all = usePantryAll();
  const today = useToday();
  const shopping = useWeekShoppingList("current");
  const [chip, setChip] = useState<HouseChip>("alle");
  const [editing, setEditing] = useState<PantryItem | null>(null);

  if (all === undefined || !today) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const todayIso = toIsoDate(today);
  const sections = houseSections(all, todayIso, chip);
  const empty = !houseSections(all, todayIso).length;

  const tap = (item: PantryItem) => {
    if (!item.usedAt) markPantryUsed(item.id, todayIso);
    else if (shopping) backToList(item, shopping.weekStart);
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Im Haus" action={<PagePlus label="Ins Haus eintragen" onClick={() => openQuick({ kind: "imhaus" })} />} />
      <main className={PAGE_MAIN}>
        <p className="px-1 text-sm text-muted">Füllt sich von selbst: Was du beim Einkaufen abhakst, kommt rein. Was du kochst, geht raus.</p>

        {empty ? (
          <section className={`${CARD} flex flex-col items-center gap-2 px-5 py-8 text-center`}>
            <Refrigerator className="h-8 w-8 text-accent" strokeWidth={2} aria-hidden />
            <p className="text-[17px] font-bold">Noch ruhig hier.</p>
            <p className="text-sm text-muted">Was du einkaufst, landet hier von selbst.</p>
          </section>
        ) : (
          <>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Ort" data-no-swipe>
              {HOUSE_CHIPS.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={c.id === chip} onClick={() => setChip(c.id)} className={`${chipClass(c.id === chip)} shrink-0`}>
                  {c.label}
                </button>
              ))}
            </div>
            {sections.map((s) => (
              <section key={s.id} aria-label={s.title} className="flex flex-col gap-1.5">
                <h2 className={`${SECTION_TITLE} px-1`}>{s.title}</h2>
                <div className={TILE_GRID.normal}>
                  {s.items.map((item) => (
                    <ItemTile
                      key={item.id}
                      name={item.name}
                      section={sectionFor(item.name)}
                      badge={item.usedAt ? null : soonBadge(item, todayIso)}
                      faded={Boolean(item.usedAt)}
                      label={item.usedAt ? `${item.name} wieder auf die Liste` : `${item.name} aufgebraucht`}
                      onTap={() => tap(item)}
                      onLongPress={() => setEditing(item)}
                    />
                  ))}
                </div>
              </section>
            ))}
            {!sections.length && <p className="px-1 text-sm text-muted">Hier gerade nichts.</p>}
          </>
        )}

        <button type="button" onClick={() => openHelper("spontan")} className={`${buttonClass("primary", "lg")} w-full`}>
          <ChefHat className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          Was koch ich daraus?
        </button>
      </main>

      {editing && <SacheSheet item={editing} today={todayIso} weekStart={shopping?.weekStart ?? null} onClose={() => setEditing(null)} />}
    </div>
  );
}
