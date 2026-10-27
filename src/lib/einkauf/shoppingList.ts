// Einkaufsliste je Planungswoche.
//
// Artikel aus Rezepten werden nicht gespeichert, sondern bei jedem Anzeigen
// aus dem Wochenplan berechnet (buildShoppingList) – so ist die Liste immer
// aktuell. "Doppelt kochen" verdoppelt die Mengen eines Gerichts.
// Gespeichert werden je Woche nur eigene Artikel, Häkchen, "Haben wir schon"
// und einmalige Umbenennungen; Häkchen hängen an einem festen Schlüssel
// (Zutat + Einheit), damit sie Änderungen am Plan überstehen.
// Dazu, für den ganzen Haushalt: eigene Produkte (Zutat → euer Produkt, die
// Rezepte bleiben unverändert), Läden je Artikel und die Stammliste – häufig
// gekaufte Artikel mit gelerntem Kaufrhythmus (früher "Immer da").
// Speicherung lokal über localStore.
//
// Diese Datei ist der öffentliche Einstieg; die Teile liegen daneben:
// sections.ts (Abteilungen), amounts.ts (Mengen/Einheiten), listModel.ts
// (Datenmodell), listMigration.ts + listStore.ts (Speichern), listEdits.ts
// (Ändern, eigene Produkte), shops.ts (Läden), shopRules.ts (feste
// Laden-Regeln, Lernen im Einkaufsmodus), staples.ts (Stammliste) und
// buildList.ts (Berechnung aus dem Wochenplan).

export { SECTIONS, sectionFor, type Section } from "@/lib/einkauf/sections";
export type { ListItem, ShoppingList, ShoppingSettings, Staple, WeekList } from "@/lib/einkauf/listModel";
export { loadShoppingSettings, useShoppingLists, useShoppingSettings } from "@/lib/einkauf/listStore";
export {
  addManualItem,
  carryOverManual,
  removeManualItem,
  removeManualItems,
  removeProduct,
  renameItem,
  replaceShoppingLists,
  setHave,
  setProduct,
  skipStaple,
  takeStaple,
  toggleChecked,
  updateManualItem,
} from "@/lib/einkauf/listEdits";
export { SHOP_SUGGESTIONS, addShop, allShops, clearItemShop, removeShop, setItemShop } from "@/lib/einkauf/shops";
export { learnQuestion, noteShopCheck, removeShopRule, rulesByShop, setShopRule, shopForItem } from "@/lib/einkauf/shopRules";
export { addStaple, dueStaples, isStaple, removeStaple, rhythmLabel, stapleInterval } from "@/lib/einkauf/staples";
export { buildShoppingList, shoppingListText } from "@/lib/einkauf/buildList";
