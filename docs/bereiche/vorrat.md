# Vorrat

Kurz: Merkt sich, was zu Hause ist – im Kühlschrank, Tiefkühler und
Vorratsschrank. Grundlage für „Das ist da“, „Daraus kannst du kochen“,
Spontan kochen und die Ideen der Begleitung. Alles sichtbare liegt hinter dem
Baustein **Vorrat & Tiefkühler** (`vorrat` in `src/lib/core/features.ts`).

## Wo im Code

- Daten und Regeln: `src/lib/vorrat/pantry.ts` (Orte, Mengen, Zusammenzählen,
  Zutaten-Abgleich `sameIngredient`/`ingredientStem`, Speicher).
- Vom Einkauf einräumen: `src/lib/vorrat/einraeumen.ts` (`toPutAway`,
  `markMoved`, `useMovedKeys`).
- Seite `/vorrat`: `src/app/vorrat/page.tsx` (`FeatureGate feature="vorrat"`)
  → `src/components/vorrat/PantryView.tsx` (`PantryView`, `PantryRow`,
  `EditSheet`).
- Kachel „Vorrat“ auf Heute: `PantryTile` in
  `src/components/heute/HomeTiles.tsx` (S/M; `HOME_TILES` in
  `src/lib/core/homeLayout.ts`, nur mit Baustein sichtbar).
- „Bald aufbrauchen“: `soonToUse` in `src/lib/essen/dishIdeas.ts`.
- Bestand für Ideen (Vorrat + Gekauftes): `useStock` in
  `src/lib/essen/useStock.ts`.
- Feste Reihenfolge: Regel `PANTRY` in `src/lib/core/sort.ts`.

## Daten und Speicher

- `wasgibts.vorrat` v2 (in der Sicherung):
  `{ version: 2, items: PantryItem[] }`. `PantryItem` = `id`, `name`,
  `amount` (Zahl oder `null` = ohne Menge), `unit` (leer = Stück), `addedAt`
  („YYYY-MM-DD“), `place` (`kuehlschrank` | `tiefkuehler` | `schrank`).
  Migration `migrateStore` in `pantry.ts`: v1 ohne Ort bekommt den
  naheliegenden Ort (`placeFor`); Einträge ohne `id`/`name` fallen weg,
  ungültige Mengen werden `null`; unbekannte Versionen werden nicht gelesen.
- `wasgibts.eingeraeumt` v1 (pro Gerät, nicht in der Sicherung):
  `{ version: 1, weeks: { <Wochenbeginn>: string[] } }` – Schlüssel der
  Einkaufs-Artikel, die schon eingeräumt wurden. Nur die letzten 8 Wochen, je
  Woche höchstens 200 Schlüssel; Kaputtes wird beim Laden aussortiert.

## So verhält es sich

- **Orte** (`PANTRY_PLACES`): Kühlschrank 🧊, Tiefkühler ❄️, Vorratsschrank 🥫 –
  auf der Seite als Segment-Schalter in dieser Reihenfolge. `placeFor` wählt
  den naheliegenden Ort: TK/Tiefkühl/Eis/Fischstäbchen → Tiefkühler, sonst
  nach Einkaufs-Abteilung (`sectionFor`): Tiefkühl → Tiefkühler,
  Vorrat/Getränke → Schrank, alles andere → Kühlschrank.
- **Eintragen**: Feld unter der Liste („z. B. 2 Karotten, Joghurt“). Der Text
  wird mit `parseLeftovers` zerlegt; auch Unbekanntes wird übernommen (wie
  geschrieben bzw. mit Vorschlag) – in den gerade gewählten Ort.
- **Zusammenzählen** (`addPantryItems`): gleiches Lebensmittel (Einzahl =
  Mehrzahl), gleiche Einheit, gleicher Ort → Menge wird addiert, Datum neu,
  Name passend zur Menge („3 Karotten“).
- **Liste je Ort** (`PantryRow`): Ort-Symbol, Name, kleine Info („seit
  gestern“, „seit 3 Tagen“, im Tiefkühler „seit 12.10.“), Menge mit −/+.
  Schritt 100 bei g/ml, sonst 1. − bis null = aufgebraucht: Eintrag weg,
  Meldung „<Name> aufgebraucht“ mit Rückgängig (`showDeleted`).
- Antippen öffnet „Im Vorrat ändern“: Menge, Einheit (`PANTRY_UNITS`), Name,
  Ort (Chips) – „Speichern“ oder „Löschen“ (Löschen hier ohne Rückgängig).
- Sortierung (`PANTRY`): Bald aufbrauchen → Ort → Name (deutsch).
- **Bald aufbrauchen** (`soonToUse`): im Kühlschrank seit 2 oder mehr Tagen
  (nicht Gekauftes `b:…` oder eben Gesagtes `s:…`). Oben auf der Seite eine
  hellorange Karte mit bis zu 4 Sachen (mit −/+) und „Rezept dazu“ →
  Essen-Reiter (`/?seite=essen`).
- **Vom Einkauf einräumen**: grüne Zeile oben, nur wenn passend. Sie zeigt
  abgehakte Artikel der laufenden Einkaufswoche, die nicht „Haben wir schon“
  sind, noch nicht im Vorrat stehen (`sameIngredient`) und nicht schon
  eingeräumt wurden. „Einräumen“ trägt alle ohne Menge an ihren
  naheliegenden Ort ein und merkt sie (`markMoved`); zurück mit „Mach das
  rückgängig“ (`pushUndo`).
- Leer (Kühlschrank): „Noch nichts eingetragen – erzähl <Name> einfach, was
  übrig ist.“ Unten „Spontan kochen mit <Name>“ (Spontan-Modus im Chat).
- **Nach dem Essen** (`markCooked` in `src/lib/essen/mealDone.ts`): passende
  Zutaten aus Kühlschrank und Tiefkühler werden entfernt, der Schrank bleibt.
  „Auf morgen verschieben“ im Wochenplan legt sie zurück.
- **Kachel auf Heute**: „Bald aufbrauchen“ mit 2 (S) bzw. 4 (M) Sachen, sonst
  „Zuletzt dazu“; leer „+ eintragen“. Antippen → `/vorrat`.
- **Essen-Reiter**: „Das ist da“ (Chips, Bald aufbrauchen zuerst mit Sanduhr,
  höchstens 8, dann „+ N“ → `/vorrat`); bei leerem Vorrat der Einstieg „Trag
  ein, was da ist – dann passen die Ideen.“ (`BausteinSections`). Beides nur
  mit Baustein.

## Begleitung (Mia)

- Werkzeug `vorrat_hinzufuegen` (`src/lib/begleitung/pantryTools.ts`, Bereich
  „essen“): Sachen mit Menge, Einheit, Ort → Op `add_pantry`, Vorschau mit
  „Übernehmen“. Eingetragen wird erst beim Übernehmen (`commitSideOps` in
  `src/lib/begleitung/client.ts`, mit Rückgängig). Ist der Baustein aus, wird
  er eingeschaltet und die Begleitung (Standard Mia) sagt, wo der Vorrat
  steht.
- Die KI bekommt den Bestand kompakt im Kontext (`prompt.ts`: Name, Menge,
  Ort, „seit 4 Tagen – bald verbrauchen“, Gekauftes).
- Ohne KI: Im Spontan-Modus genannte Zutaten landen im Vorrat („Notiert ✓“)
  und schalten den Baustein frei (`useSpontanChat.ts`). „Zeig mir den Vorrat“
  schaltet den Baustein ein bzw. öffnet `/vorrat` (`bausteinRule`,
  `useChatRules.ts`). „Wir fahren spontan los, was nehmen wir mit?“ →
  Ausflugs-Snacks aus dem Vorrat (`snackReply` in `src/lib/essen/spontan.ts`).

## Tests

- `tests/vorrat/vorratOrte.test.ts` – Orte, Bruch-Mengen, gleiche Zutat,
  Migration v1 → v2, Zusammenzählen, Ändern/Löschen/Ersetzen, Merker fürs
  Einräumen (8 Wochen, Reparatur, falsche Version).
- `tests/vorrat/einraeumen.test.ts` – Auswahl für „Vom Einkauf einräumen“.
- Verbrauch nach dem Essen: `tests/essen/nachDemEssen.test.ts`.
- Durchklick: Ablauf `vorrat` in `e2e/ablaeufe/essen.mjs` („Bald aufbrauchen“
  sichtbar, Paprika + 1 im Speicher).
