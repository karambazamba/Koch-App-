# Im Haus (früher Vorrat)

Kurz: Was zu Hause ist – ohne Mengen, nur da oder nicht da. Füllt sich von
selbst (im Einkauf Abgehaktes kommt rein, Gekochtes geht raus), vergisst
still, wenn man nicht pflegt, und sieht aus wie der Einkauf. Alles Sichtbare
liegt hinter dem Baustein **Im Haus** (`vorrat` in `src/lib/core/features.ts`,
aus als Standard); Abhaken im Einkauf, „Hab … gekauft“ oder ＋ schalten ihn
frei. Intern heißt alles weiter Vorrat (`src/lib/vorrat/`, `/vorrat`,
`wasgibts.vorrat`).

## Wo im Code

- Regeln an EINER Stelle: `src/lib/vorrat/haltbar.ts` – Orte (`placeFor`),
  Sorten und „vermutlich noch da“-Zeiten (`HALTBAR_TAGE`), `isGone`,
  `isUnsure`, `isSoon`, `soonBadge`, Grundsachen (`GRUNDSACHEN`), Nicht-Essen
  (`isFood`), ein Eintrag (`PantryItem`, `cleanPantryItem`).
- Speicher: `src/lib/vorrat/pantry.ts` (Migration, rein/raus, Ort merken,
  aufgebraucht, still aufräumen, Zutaten-Abgleich `sameIngredient`).
- Kreislauf: `src/lib/vorrat/kreislauf.ts` (`boughtToHouse`,
  `unboughtFromHouse`, `backToList`, Sätze ohne KI `pantrySentence`).
- Seite: `src/lib/vorrat/imHaus.ts` (`houseSections`, `houseTile`) →
  `src/components/vorrat/PantryView.tsx`.
- Kachel auf Heute: `PantryTile` in `src/components/heute/HomeTiles.tsx`.
- Gleiche Kachel wie im Einkauf: `ItemTile`
  (`src/components/einkauf/kacheln/ItemTile.tsx`, mit `badge` und `faded`).
- Ehrliche Zutaten-Zeile: `matchStock(names, stock, today)` und `stockLine`
  in `src/lib/essen/dishIdeas.ts`.

## Daten und Speicher

- `wasgibts.vorrat` v3 (in der Sicherung, im Haushalt geteilt):
  `{ version: 3, items: PantryItem[], places: { <name klein>: Ort } }`.
  `PantryItem` = `id`, `name`, `addedAt` („YYYY-MM-DD“), `place`
  (`kuehlschrank` | `schrank` | `tiefkuehler`), `usedAt` (aufgebraucht).
- Migration v1/v2 → v3 (`migratePantry`): Mengen und Einheiten fallen weg,
  Namen ohne Zahl („3 Karotten“ → „Karotten“), v1 ohne Ort bekommt den
  naheliegenden Ort; nichts Gültiges geht verloren.
- Abgleich (`docs.ts`): je Sache `vr:<id>`, dazu einmal `vr:orte`. Ältere
  Geräte mit Mengen werden sauber gelesen (`cleanPantryItem`).
- `wasgibts.eingeraeumt` ist ausgemustert (`RETIRED_KEYS`).

## So verhält es sich

- **Orte automatisch**: Milch, Käse, Sahne, Fleisch, Gemüse → Kühlschrank;
  Kartoffeln, Nudeln, Reis, Zwiebeln, Konserven, Brot, Tomaten, Äpfel →
  Schrank; TK-Ware, Fischstäbchen, Eis → Tiefkühler. Lange drücken = Ort
  ändern; gilt ab dann für diese Sorte (`places`).
- **Vergisst von selbst** (still, keine Nachfrage): Fleisch/Fisch 3 Tage,
  Milchprodukte/Obst/Gemüse/Brot 7, Kartoffeln/Zwiebeln 21, Trockenes 42,
  Tiefkühler 90. Danach verschwindet der Eintrag. Grundsachen (Salz, Pfeffer,
  Öl, Zucker, Mehl, Essig, Gewürze) gelten immer als da und stehen nicht da.
- **Kreislauf**: Im Einkauf abhaken → rein (nur Lebensmittel, Drogerie nicht),
  Meldung „Im Haus: Brot, Äpfel · Rückgängig“ (kurz Nacheinanderes in EINER
  Meldung); Haken weg → wieder raus. Antippen im Haus = aufgebraucht (blass
  unter „Aufgebraucht“, 3 Tage), nochmal = wieder auf die Liste („Steht
  wieder auf der Liste · Rückgängig“). Gekocht (`markCooked`) → Zutaten raus.
  ＋ = Schnelleingabe „IM HAUS“.
- **Seite**: Hinweis „Füllt sich von selbst …“, Chips Alle · Kühlschrank ·
  Schrank · TK, Abschnitte Bald aufbrauchen → Kühlschrank → Schrank →
  Tiefkühler → Aufgebraucht, unten „Was kann ich daraus kochen?“ → Kochidee.
- **Bald aufbrauchen**: nur Frisches im letzten Drittel seiner Zeit, Schild
  „heute“/„morgen“ (Orange) bzw. „bis Sa“ (Gelb), nie rot.
- **Kachel** (S/M): „Bald aufbrauchen“ (2 bzw. 4 Zeilen à 30 px), sonst
  „Zuletzt eingekauft“; „Daraus kochen“ → Kochidee; leer „Was du einkaufst,
  landet hier von selbst.“
- **Ehrlich**: „alles im Haus“ (grün) nur, wenn die Zutaten in der ersten
  Hälfte ihrer Zeit sind; sonst „vermutlich im Haus: …“ (grau); fehlt etwas,
  „auf die Liste: …“. Leeres „Im Haus“ → nie „im Haus“.

## Begleitung (Mia)

- `vorrat_hinzufuegen` („Hab Hähnchen gekauft“, „Chili eingefroren“) und
  `vorrat_aufgebraucht` („Die Milch ist alle“) in
  `src/lib/begleitung/pantryTools.ts` → Ops `add_pantry`/`use_pantry`, sofort
  mit Rückgängig (`miaDone.ts`). Ohne KI dieselben Sätze über
  `pantrySentence` (`useChatRules.ts`). Kontext: „Im Haus (vermutlich da, ohne
  Mengen): …“.

## Tests

- `tests/vorrat/imHaus.test.ts` – Orte, Ablauf je Sorte, vermutlich, Schilder,
  Grundsachen, Migration ohne Mengen, Ort merken, aufgebraucht, Seite und
  Kachel, Kreislauf (auch über `toggleChecked`), Mia-Sätze, ehrliche Zeile,
  Abgleich.
- Gekocht: `tests/essen/nachDemEssen.test.ts`.
- Durchklick: Ablauf `imHaus` in `e2e/ablaeufe/essen.mjs`.
