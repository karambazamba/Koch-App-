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
// (Ändern, eigene Produkte), shops.ts (Läden), staples.ts (Stammliste) und
// buildList.ts (Berechnung aus dem Wochenplan).

export { SECTIONS, sectionFor, type Section } from "./sections";
export type { ListItem, ShoppingList, ShoppingSettings, Staple, WeekList } from "./listModel";
export { loadShoppingSettings, useShoppingLists, useShoppingSettings } from "./listStore";
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
} from "./listEdits";
export { SHOP_SUGGESTIONS, addShop, allShops, removeShop, setItemShop } from "./shops";
export { addStaple, dueStaples, isStaple, removeStaple, rhythmLabel, stapleInterval } from "./staples";
export { buildShoppingList, shoppingListText } from "./buildList";
