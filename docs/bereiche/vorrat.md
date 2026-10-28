# Im Haus (früher Vorrat)

Kurz: Was zu Hause ist – ohne Mengen, nur da oder nicht da. Füllt sich von
selbst (im Einkauf Abgehaktes kommt rein, Gekochtes geht raus), vergisst
still, wenn man nicht pflegt, und sieht aus wie der Einkauf. Gehört zu
„Mia 1.0“ (zusammen mit Spontan kochen): Baustein **Im Haus** (`vorrat` in
`src/lib/core/features.ts`) ist für alle an – neue Nutzer über `DEFAULT_ON`,
bisherige einmal beim Start (`launchUebernahme`, Feld `imHaus`). Man kann ihn
in „Mehr Funktionen“ abschalten (Daten bleiben); Abhaken im Einkauf, „Hab …
gekauft“, ＋ oder Mia schalten ihn dann wieder frei. Die Kachel steht nie von
selbst auf der Startseite, nur über die Kachel-Auswahl. Intern heißt alles
weiter Vorrat (`src/lib/vorrat/`, `/vorrat`, `wasgibts.vorrat`).

## Wo im Code

- Regeln an EINER Stelle: `src/lib/vorrat/haltbar.ts` – Orte (`placeFor`),
  Sorten und „vermutlich noch da“-Zeiten (`HALTBAR_TAGE`), `isGone`,
  `isUnsure`, `isSoon`, `soonBadge`, Grundsachen (`GRUNDSACHEN`), Nicht-Essen
  (`isFood`), ein Eintrag (`PantryItem`, `cleanPantryItem`).
- Speicher: `src/lib/vorrat/pantry.ts` (Migration, rein/raus, Ort merken,
  aufgebraucht, still aufräumen, Zutaten-Abgleich `sameIngredient`).
- Kreislauf: `src/lib/vorrat/kreislauf.ts` (`boughtToHouse`,
  `unboughtFromHouse`, `backToList`, `istAlle` = raus und auf die Liste,
  Sätze ohne KI `pantrySentence`).
- Seite: `src/lib/vorrat/imHaus.ts` (`houseSections`, `houseTile`,
  `HOUSE_TILE_MAX`, `imHausReihe`, `IM_HAUS_CHIPS`) →
  `src/components/vorrat/PantryView.tsx`; eine Sache ändern (Ort, „Ist alle“,
  Entfernen): `src/components/vorrat/SacheSheet.tsx`.
- Bereich unter Essen: `src/components/essen/ImHausBereich.tsx`.
- Kachel auf Heute: `PantryTile` in `src/components/heute/HomeTiles.tsx`
  (A-045: Name immer ganz vor dem Schild, Schild 10,5 px, sonst Umbruch in
  die nächste Zeile).
- Gleiche Kachel wie im Einkauf: `ItemTile`
  (`src/components/einkauf/kacheln/ItemTile.tsx`, mit `badge` und `faded`).
- Ehrliche Zutaten-Zeile: `matchStock(names, stock, today)` und `stockLine`
  in `src/lib/essen/dishIdeas.ts`.

## Daten und Speicher

- `wasgibts.vorrat` v4 (in der Sicherung, im Haushalt geteilt):
  `{ version: 4, items: PantryItem[], places: { <name klein>: Ort } }`.
  `PantryItem` = `id`, `name`, `addedAt` („YYYY-MM-DD“), `place` = Gruppe
  (`kuehlschrank` | `schrank` = Vorrat | `obstgemuese` | `brot` |
  `tiefkuehler`), `usedAt` (aufgebraucht).
- Migration v1/v2/v3 → v4 (`migratePantry`): Mengen und Einheiten fallen weg,
  Namen ohne Zahl („3 Karotten“ → „Karotten“), v1 ohne Ort bekommt den
  naheliegenden Ort; bis v3 lagen Obst, Gemüse und Brot im Kühlschrank oder
  Schrank – sie wandern in „Obst & Gemüse“ bzw. „Brot“, außer der Ort wurde
  für die Sorte selbst gewählt (`places`). Nichts Gültiges geht verloren. Der
  Abgleich liest ältere Geräte genauso (`fromDocs` → `migratePantry`).
- Abgleich (`docs.ts`): je Sache `vr:<id>`, dazu einmal `vr:orte`. Ältere
  Geräte mit Mengen werden sauber gelesen (`cleanPantryItem`).
- `wasgibts.eingeraeumt` ist ausgemustert (`RETIRED_KEYS`).
- Baustein: `wasgibts.funktionen` v5 (`imHaus: true` = Übernahme für 1.0
  erledigt). Beim Update v4 → v5 ändern sich keine Daten; wer „Im Haus“ noch
  nicht an hatte, bekommt es an und die Kachel (stand im alten Standard
  unsichtbar mit `visible: true`) wird dabei auf `visible: false` gesetzt.

## So verhält es sich

- **Gruppen automatisch** (Tafel 102): Milch, Käse, Sahne, Fleisch →
  Kühlschrank; Nudeln, Reis, Konserven, Honig, Getränke → Vorrat; Obst und
  Gemüse (auch Kartoffeln, Zwiebeln, Tomaten, Äpfel) → Obst & Gemüse; Brot,
  Brötchen, Kuchen → Brot; TK-Ware, Fischstäbchen, Eis → Tiefkühl. Chip
  antippen → Gruppe ändern; gilt ab dann für diese Sorte (`places`).
- **Vergisst von selbst** (still, keine Nachfrage): Fleisch/Fisch 3 Tage,
  Milchprodukte/Obst/Gemüse/Brot 7, Kartoffeln/Zwiebeln 21, Trockenes 42,
  Tiefkühler 90. Danach verschwindet der Eintrag. Grundsachen (Salz, Pfeffer,
  Öl, Zucker, Mehl, Essig, Gewürze) gelten immer als da und stehen nicht da.
- **Kreislauf**: Im Einkauf gekauft → rein (nur Lebensmittel, Drogerie nicht).
  Auf der Laden-Seite erst mit „Einkauf fertig“: alles aus „Schon im Wagen“
  auf einmal, „Fertig. Liegt jetzt bei Im Haus.“ mit Rückgängig (nur mit
  Baustein, `einkauf/wagen`). `toggleChecked` mit Datum ohne `imHaus: false`
  legt wie bisher sofort rein („Im Haus: Brot, Äpfel · Rückgängig“, kurz
  Nacheinanderes in EINER Meldung); Haken weg → wieder raus. Antippen im Haus = aufgebraucht (blass
  unter „Aufgebraucht“, 3 Tage), nochmal = wieder auf die Liste („Steht
  wieder auf der Liste · Rückgängig“). Gekocht/„Gegessen“ (`markCooked`, auch
  automatisch nach der Essenszeit) → Zutaten raus (Rezept oder Klassiker aus
  `DISHES`), „Auf morgen verschieben“ holt sie zurück. „Eier sind alle“ (Mia,
  Regel, „Ist alle · auf die Liste“ im Fenster) → raus und auf die
  Einkaufsliste der laufenden Woche, was dort schon steht, nicht doppelt.
  ＋ = Schnelleingabe „IM HAUS“, mehrere auf einmal („Eier, Milch, Hack“).
- **Seite** (Tafel 102, `houseGroups`): oben Karte „Was ist da?“ / „Kurz
  reinsprechen, ich sortier’s ein.“ mit rundem Knopf → Mia-Bühne, hört gleich
  zu, Modus „Im Haus“ (kein eigenes Mikro-Feld). Darunter die Sachen als Chips
  (Symbol + Name) in den Gruppen mit Inhalt; oranger Punkt = bald
  aufbrauchen, Legende einmal unten. Aufgebrauchtes nur als EINE Zeile
  „Aufgebraucht: Thunfisch, Kuchen“ + „Auf die Liste“ (`aufDieListe`: alles
  auf die Liste, nichts doppelt, raus aus Im Haus, Rückgängig). Chip antippen
  = kleines Fenster (`SacheSheet`: Gruppe, „Aufgebraucht“, Löschen). ＋ =
  Schnelleingabe für mehrere Sachen. „Was koch ich daraus?“ schwebt über der
  Leiste (`UEBER_LEISTE`, Seite mit `PAGE_MAIN_KNOPF`), nichts liegt darunter.
- **Reinsprechen** (`src/lib/vorrat/reinsprechen.ts`): ein Satz, mehrere
  Sachen – „ist da“, „haben wir noch“, „gekauft“ = rein; „ist alle“, „haben
  wir nicht mehr“, „gar nicht im Haus“, „kein … mehr“ = raus. Satzteile
  werden nie zu Sachen. Mit KI geht der Satz als „[Im Haus] …“ an die KI
  (Werkzeuge `vorrat_hinzufuegen`/`vorrat_aufgebraucht`, Regel in der
  Beschreibung), ohne KI versteht die App ihn selbst (`imHausVerstehen`).
  Beides erscheint als „Hab ich so verstanden:“ (`ImHausKarte`): + rein, −
  raus mit „auf die Liste“ (abwählbar), Zeile antippen = weglassen, „Ändern“
  = Mia hört nochmal zu (neu Gesagtes ersetzt dieselbe Sache), „Passt“ =
  einräumen. Nie sofort; Schließen beendet den Modus. Dieselbe Erkennung
  nutzt die Schnelleingabe ＋.
- **Unter Essen** (EIN Bereich statt „Spontan kochen“ und „Das ist da“):
  Überschrift „Im Haus“ mit ＋ und „Alle ›“; Chips (`imHausReihe`): „bald
  aufbrauchen“ zuerst (leicht orange, Sanduhr), dann das zuletzt
  Reingekommene, höchstens 8; Antippen = Sache öffnen. Darunter groß „Was koch
  ich daraus?“ = Spontan kochen; das Gespräch rechnet mit genau diesen Sachen
  in derselben Reihe („Noch da: …“). Leer: „Sag mir, was da ist, dann schlag
  ich was vor.“ + „Eintragen“. Ist der Baustein aus, fehlt der Bereich (mit
  Spontan-Ideen steht dann die alte Karte „Spontan kochen“).
- **Bald aufbrauchen**: nur Frisches im letzten Drittel seiner Zeit, Schild
  „heute“/„morgen“ (Orange) bzw. „bis Sa“ (Gelb), nie rot.
- **Kachel** (XS/S im festen Raster; Standard nur bei „allein“, sonst über die
  Auswahl): XS = EINE Zeile („Hähnchen · heute“), S = „Bald aufbrauchen“
  (2 Zeilen à 30 px), sonst „Zuletzt eingekauft“; unten
  „Was koch ich daraus?“ → Spontan kochen; leer „Sag mir, was da ist, dann
  schlag ich was vor.“ Zeilen in S (`HausZeile`, Tafel 124 A): Symbol 20 px,
  Name 14 px immer ganz (nie „Würstc…“), Schild 10,5 px rechts; passt beides
  nicht in eine Zeile, rutscht nur das Schild darunter. In S hinten still
  ein Kühlschrank als Wasserzeichen wie bei Sport (`--app-wasserzeichen-haus`:
  hell 9 %, dunkel 7 %, Schlicht Grau 6 %); XS ohne.
- **Mia denkt mit**: beim ersten Besuch der Essen-Seite einmal „Sag mir, was
  im Kühlschrank ist, dann koch ich mit dir spontan.“ (eigener Schlüssel
  `seite:essen-imhaus`, also auch für alle, die Essen schon kannten).
- **Kurz-Check** (Tafel 102, Punkt 3): siehe eigener Abschnitt unten.
- **Ehrlich**: „alles im Haus“ (grün) nur, wenn die Zutaten in der ersten
  Hälfte ihrer Zeit sind; sonst „vermutlich im Haus: …“ (grau); fehlt etwas,
  „auf die Liste: …“. Leeres „Im Haus“ → nie „im Haus“.

## Kurz-Check

Einmal pro Woche statt Pflegen: Sonntag ab 17 Uhr steht in der Jetzt-Karte
„Kurzer Kühlschrank-Check?“ · „20 Sekunden.“ (Symbol Kühlschrank, Knopf
„Öffnen“; abends, wenn die Karte nur EIN Thema zeigt, vor „Morgen ist ruhig.“).

- **Wann** (`src/lib/vorrat/kuehlcheck.ts`, `kuehlCheckFaellig`): Sonntag ab
  17:00 (Europe/Berlin über `now()`), Baustein „Im Haus“ an, mindestens eine
  Sache da, diese Woche noch nicht erledigt. Woche = ISO-Datum des Sonntags.
- **Zählt als der eine Hinweis des Tages**: Das Angebot ist eine Karte von
  „Mia denkt mit“ (`DenktKarte` Art `kuehlcheck` in
  `src/lib/mia/denktmit/auswahl.ts`, gilt dort wie ein Mitdenken-Hinweis) –
  also nie 22–7 Uhr, nicht in Pause oder Ruhe nach Feierabend, nicht im
  Beispiel-Tag, nicht bei Regler „Ruhig“, nicht wenn heute schon eine Karte
  stand (bei „Gesprächig“ bis zwei) und nicht, wenn ein anderer Hinweis
  unter der Jetzt-Karte steht. Gewählt in `useMiaDenkt` (zuerst unter den
  Kandidaten), angezeigt in der Jetzt-Karte (`kuehlCheck` in
  `jetztTopics`/`abendThema`), gezählt (`hinweisGezaehlt`) erst, wenn er dort
  wirklich steht (`TodayPage`). Antippen öffnet die Seite.
- **Seite** `/vorrat/check` (`src/components/vorrat/KuehlCheck.tsx`,
  Bereich wie `/vorrat`, Zurück ohne Verlauf zu „Im Haus“): ein Satz, alle
  Sachen, die da sind, als Kacheln (`checkSachen`: Bald aufbrauchen zuerst,
  dann Kühlschrank → Schrank → Tiefkühler; `ItemTile` mit `struck`). Antippen
  = weg (blass, durchgestrichen), nochmal = doch da. Am Inhaltsende „Fertig“
  bzw. „Fertig · 3 weg“ und „Heute nicht“.
- **Fertig** (`wegRaeumen`): genau die markierten Sachen sind aufgebraucht –
  wie Antippen auf „Im Haus“ (3 Tage blass, nochmal antippen = wieder auf die
  Liste), nicht gelöscht, damit nichts verloren geht. Meldung „Raus: Milch,
  Käse · Rückgängig“. **Heute nicht** ändert nichts. Beides legt die Woche weg.
- **Speicher**: `wasgibts.kuehlcheck` v1 `{ version: 1, woche }` – nur auf
  diesem Gerät, nicht in der Sicherung (Migration `migrateKuehlCheck`).

## Begleitung (Mia)

- `vorrat_hinzufuegen` („Hab Hähnchen gekauft“, „Hab noch Hack“, „Chili
  eingefroren“) und `vorrat_aufgebraucht` („Die Milch ist alle“ → raus und
  `add_shopping` für die aktuelle Woche, nicht doppelt) in
  `src/lib/begleitung/pantryTools.ts` → Ops `add_pantry`/`use_pantry`, sofort
  mit Rückgängig (`miaDone.ts`). Seit 1.0 kein „Kommt bald.“ mehr. Ohne KI
  dieselben Sätze über `pantrySentence` + `istAlle` (`useChatRules.ts`; „Hab
  noch …“ nur mit bekannten Lebensmitteln). Kontext: „Im Haus (vermutlich da,
  ohne Mengen): …“. Prüfstand: „Wir haben noch 4 Joghurt im Kühlschrank“ →
  `add_pantry`, „Zeig mir den Vorrat“ → `app_command`/`set_feature`/Antwort.

## Tests

- `tests/vorrat/imHaus.test.ts` – Orte, Ablauf je Sorte, vermutlich, Schilder,
  Grundsachen, Migration ohne Mengen, Ort merken, aufgebraucht, Seite und
  Kachel, Kreislauf (auch über `toggleChecked`), Mia-Sätze, ehrliche Zeile,
  Abgleich.
- `tests/vorrat/imHausEssen.test.ts` – Einkauf abhaken → Im Haus, Gegessen →
  raus, „… ist alle“ → raus + Liste, „Hab noch Hack“, Bereich unter Essen
  (Reihe, höchstens 8, „Was koch ich daraus?“ mit diesen Sachen), Kachel XS/S,
  Mia stellt es einmal vor. Übernahme für 1.0: `tests/core/launch.test.ts`.
- `tests/vorrat/kuehlcheck.test.ts` – Kurz-Check: Sonntag 16:59/17:00,
  Samstag, Baustein, leer, einmal pro Woche, Nacht/Pause/Ruhe/Beispiel,
  „Ruhig“, zählt als der eine Hinweis, Jetzt-Karte (auch abends), Seite
  (Kacheln, „Fertig · 3 weg“, genau die markierten, Rückgängig), Speicher.
- `tests/vorrat/reinsprechen.test.ts` – Satz → rein/raus (auch „gar nicht
  im Haus“, „kein … mehr“), nie Satzteile als Sache, Vorschlag und „Ändern“,
  Testmodus, Prüfstand (≥ 8 Sätze, `nieName`), Schnelleingabe (Fehler 28.10.),
  Seite (über der Leiste), Vergessen in den neuen Gruppen.
- Gekocht: `tests/essen/nachDemEssen.test.ts`.
- Durchklick: Abläufe `imHaus`, `imHausReinsprechen`, `kuehlcheck` und `imHausEssen` in `e2e/ablaeufe/essen.mjs`.
