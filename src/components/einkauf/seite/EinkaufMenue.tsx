"use client";

// „···“ auf der Seite „Einkauf“ (Auftrag Punkt 7): alles Seltene an einer
// Stelle – Woche wechseln, Zuletzt gekauft, Gerichte ohne Zutaten,
// Stammliste, Liste teilen, Meine Läden bearbeiten. Die Seite selbst bleibt
// so klar wie die Kachel.

import { useState } from "react";
import { CalendarRange, ChefHat, History, Repeat, Share2, Store } from "lucide-react";
import { MoreMenu, type MoreItem } from "@/components/ui/MoreMenu";
import { Sheet } from "@/components/ui/Sheet";
import { CARD_LIST, buttonClass } from "@/components/ui/styles";
import { StaplesSheet } from "@/components/einkauf/ShoppingParts";
import { MeineLaedenSheet } from "@/components/einkauf/MeineLaeden";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { setHave, toggleChecked, type ListItem, type ShoppingSettings } from "@/lib/einkauf/shoppingList";

type Offen = "zuletzt" | "gerichte" | "stamm" | "laeden" | null;

export function EinkaufMenue({
  weekStart,
  isNext,
  planning,
  onWoche,
  gekauft,
  schonDa,
  ohneZutaten,
  settings,
  myShops,
  onShare,
}: {
  weekStart: string;
  isNext: boolean;
  /** Mit Wochenplan (sonst gibt es nur die laufende Woche) */
  planning: boolean;
  onWoche: () => void;
  /** Zuletzt gekauft (abgehakt) */
  gekauft: ListItem[];
  /** „Haben wir schon“ (diese Woche ausgeblendet) */
  schonDa: ListItem[];
  /** Gerichte ohne Zutaten */
  ohneZutaten: string[];
  settings: ShoppingSettings;
  myShops: string[];
  onShare: () => void;
}) {
  const [offen, setOffen] = useState<Offen>(null);
  const items: MoreItem[] = [
    ...(planning ? [{ label: isNext ? "Diese Woche zeigen" : "Nächste Woche zeigen", icon: CalendarRange, onClick: onWoche }] : []),
    { label: "Zuletzt gekauft", icon: History, onClick: () => setOffen("zuletzt") },
    ...(planning && ohneZutaten.length ? [{ label: "Gerichte ohne Zutaten", icon: ChefHat, onClick: () => setOffen("gerichte") }] : []),
    { label: "Stammliste", icon: Repeat, onClick: () => setOffen("stamm") },
    { label: "Liste teilen", icon: Share2, onClick: onShare },
    { label: "Meine Läden bearbeiten", icon: Store, onClick: () => setOffen("laeden") },
  ];
  const zeile = (i: ListItem, knopf: { label: string; onClick: () => void }) => (
    <li key={i.key} className="flex min-h-12 items-center gap-3 px-4 py-1.5">
      <ItemSymbol id={symbolFor(i.name, settings.products)} name={i.name} className="h-6 w-6 shrink-0" />
      <span className="min-w-0 flex-1 truncate font-semibold text-muted">{i.name}</span>
      <button type="button" onClick={knopf.onClick} className={buttonClass("soft", "sm")}>
        {knopf.label}
      </button>
    </li>
  );
  return (
    <>
      <MoreMenu title="Einkauf" items={items} />
      {offen === "zuletzt" && (
        <Sheet title="Zuletzt gekauft" onClose={() => setOffen(null)}>
          {gekauft.length + schonDa.length === 0 ? (
            <p className="pb-3 text-[15px] text-muted">Hier steht, was ihr diese Woche gekauft habt.</p>
          ) : (
            <ul className={`${CARD_LIST} mb-3`} data-zuletzt-gekauft>
              {gekauft.map((i) => zeile(i, { label: "Doch kaufen", onClick: () => toggleChecked(weekStart, i) }))}
              {schonDa.map((i) => zeile(i, { label: "Doch kaufen", onClick: () => setHave(weekStart, i.key, false) }))}
            </ul>
          )}
        </Sheet>
      )}
      {offen === "gerichte" && (
        <Sheet title="Gerichte ohne Zutaten" onClose={() => setOffen(null)}>
          <p className="pb-3 text-[15px] text-muted">{ohneZutaten.join(", ")}. Was ihr dafür braucht, geht über Einsprechen oder Aussuchen.</p>
        </Sheet>
      )}
      {offen === "stamm" && <StaplesSheet settings={settings} onClose={() => setOffen(null)} />}
      {offen === "laeden" && <MeineLaedenSheet shops={settings.shops} myShops={myShops} rules={settings.shopRules} onClose={() => setOffen(null)} />}
    </>
  );
}
