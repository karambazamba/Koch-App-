"use client";

// Beispiel-Tag auf der Einkaufsliste: dieselben Sachen wie in der Einkauf-
// Kachel (DEMO_SHOPS), im neuen Aufbau nach Laden, leise „Beispiel“. Nichts
// davon steht in echten Speichern; die erste echte Eingabe ersetzt es (die
// Liste ist dann nicht mehr leer).

import { ItemTile, TILE_GRID } from "@/components/einkauf/kacheln/ItemTile";
import { GruppenListe } from "@/components/einkauf/ListeTeile";
import { DEMO_SHOPS, demoTiles, useDemo } from "@/lib/core/demo";
import { todayIso } from "@/lib/core/now";
import { ladenGruppen } from "@/lib/einkauf/kacheln/gruppen";
import { sectionFor, type ListItem } from "@/lib/einkauf/shoppingList";

/** Beispiel-Artikel als Listen-Einträge @public für Tests */
export const beispielItems = (): ListItem[] =>
  DEMO_SHOPS.flatMap((g) =>
    g.names.map((name) => ({ key: `beispiel:${name}`, name, originalName: name, amount: "", section: sectionFor(name), dishes: [], days: [], shop: g.shop, checked: false, hidden: false })),
  );

/** Das Beispiel (oder null, wenn kein Beispiel-Tag ist) */
export function useEinkaufBeispiel() {
  const demo = useDemo();
  // Ohne Beispiel (auch beim Vorrendern auf dem Server) gar nicht erst nach „heute“ fragen
  if (!demo || !demoTiles(demo, todayIso()).includes("einkauf")) return null;
  const items = beispielItems();
  return (
    <div className="flex flex-col gap-4" data-beispiel-einkauf>
      <p className="px-1 text-xs font-semibold text-muted">Beispiel</p>
      <GruppenListe
        gruppen={ladenGruppen(items, DEMO_SHOPS.map((g) => g.shop))}
        nachLaden
        tiles={(list) => (
          <div className={TILE_GRID.normal}>
            {list.map((i) => (
              <ItemTile key={i.key} name={i.name} section={i.section} label={`${i.name} (Beispiel)`} onTap={() => {}} />
            ))}
          </div>
        )}
      />
    </div>
  );
}
