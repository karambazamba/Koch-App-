# Einkauf

Kurz: Die Einkaufsliste rechnet sich aus dem Wochenplan selbst aus und nimmt
dazu eigene Artikel auf – getippt, gesprochen oder von der Begleitung. Sie
kennt Läden, lernt Stammartikel und eure Produkte und hat einen ruhigen
Einkaufsmodus für den Laden. Immer sichtbar (kein Baustein).

## Wo im Code

- Öffentlicher Einstieg: `src/lib/einkauf/shoppingList.ts` (reicht weiter an):
  `sections.ts` (Abteilungen, `sectionFor`), `amounts.ts` (Einheiten, Summen,
  `roundSmall`), `listModel.ts` (Typen), `listStore.ts` (Speicher, Hooks),
  `listMigration.ts` (v1–v3 → v4), `listEdits.ts` (abhaken, eigene Artikel,
  „Haben wir schon“, Produkte), `shops.ts` (Läden), `staples.ts`
  (Stammliste), `buildList.ts` (Berechnung, Teilen-Text).
- Woche + Liste als Hook: `useWeekShoppingList("planning" | "current" |
  "next")` in `src/lib/einkauf/useWeekShoppingList.ts`.
- Läden: `shopGroups.ts` (Gruppen, `shopTone`, `shopType`), `shopMode.ts`
  (gemerkter Chip, `shopModeLists`, `shopModeRequest`).
- Kacheln wie Bring (v0.66): `src/lib/einkauf/kacheln/` – `symbols.ts`
  (`symbolFor`: Stichwort → gezeichnetes Symbol, Sonderfälle zuerst, eigene
  Produkte nehmen das Symbol der Zutat), `view.ts` (`shopChips`,
  `filterByChip`, `resolveChip`, `walkOrder`, `isCompact` ab 24,
  `recentBought`, `catalog`), `basics.ts` (Grundsortiment für den Katalog),
  `abteilung.ts` (`abteilungSymbol`: Abteilung fürs Symbol, mit Drogerie;
  `symbolReihe`: Variante A der Kachel).
- Schnell-Eintrag/Sprache: `quickAdd.ts` (`parseQuickAdd`), `shoppingParse.ts`
  (`parseShoppingText`, `isShoppingRequest`, `parseProductStatement`).
- Oberfläche `src/components/einkauf/`: `ShoppingListView.tsx` (Seite
  `/einkaufsliste`), `ShoppingParts.tsx` (`ItemContent`, `EditItemSheet`
  mit Löschen/„Haben wir schon“, `StaplesSheet`), `StapleBar.tsx`,
  `QuickAdd.tsx` (`QuickAddButton`, `ShoppingQuickAdd`), `ShopMode.tsx`
  (`/einkaufsliste/laden?name=…`); `kacheln/ItemTile.tsx` (Kachel, Größen
  normal/compact/mini, `TILE_GRID`), `kacheln/ItemSymbol.tsx` (56 eigene
  Zeichnungen), `kacheln/CatalogSheet.tsx` („Mehr hinzufügen“).
- Kachel „Einkauf“ auf Heute: `ShoppingTile`/`ShopRows` in
  `src/components/heute/HomeTiles.tsx`. Chips auf dem Essen-Reiter:
  `ShoppingChips` in `src/components/essen/FoodPage.tsx`.
- Feste Reihenfolgen in `src/lib/core/sort.ts`: `SECTION_WALK`, `SHOPPING`,
  `SHOP_GROUPS`, `SHOPS`.

## Daten und Speicher

- `wasgibts.einkaufsliste` v6 (in der Sicherung, Abgleich `einkauf` v6):
  `{ version: 6, weeks, products, shops, itemShops, staples, myShops,
  shopsAsked, shopRules, learned, learnAsked, alwaysList }`. `myShops` =
  „Meine Läden“ in gewählter Reihenfolge, `shopsAsked` = Läden-Frage
  beantwortet, `shopRules` = feste Regeln (Artikel klein → Laden),
  `learned` = Zähler fürs Lernen im Einkaufsmodus, `learnAsked` = schon
  gefragt, `alwaysList` = Grundsachen, die trotzdem auf die Liste sollen
  (v4 → v5 → v6: leer, einmal fragen; nichts geht verloren).
  - `weeks[<Wochenbeginn>]` = `WeekList`: `manual` (eigene Artikel: `id`,
    `name`, `amount` als Text, `section`, `done`, optional `day` = Wochentag,
    `now` = „Jetzt mitnehmen“, `dish`), `checked` (Schlüssel abgehakter
    Rezept-Artikel), `have` („Haben wir schon“), `renamed` (nur diese Woche),
    `skippedStaples` („diesmal nicht“).
  - `products`: Zutat (klein) → euer Produkt. `shops`: eigene Läden.
    `itemShops`: Artikel (klein) → Laden; leerer Laden = bewusst „Egal wo“,
    kein Eintrag = „noch ohne Laden“ (seit vX; v6 hat nie leere Läden
    gespeichert, deshalb kein Formatwechsel: alles Bisherige gilt als „noch
    ohne Laden“, ältere Geräte im Haushalt lesen „“ wie bisher als ohne
    Laden). `staples`: Stammartikel (`name`,
    `amount`, `section`, `purchases` = letzte 12 Kauftage, `intervalDays`
    fest oder `null` = gelernt, `active`).
  - Migration `migrateStore` (`listMigration.ts`): v1 → leer mit
    Standard-Stammliste; v2/v3 „Immer da“ (`basics`) → Stammartikel mit festem
    7-Tage-Rhythmus; abgehakte Basics bleiben als erledigte eigene Artikel der
    Woche erhalten. Ungültige Einträge fallen weg, nie ganze Wochen.
  - Ohne gespeicherten Stand gilt eine Standard-Stammliste (Brot, Aufschnitt,
    Käse, Butter, Milch, Joghurt, Obst – je wöchentlich, `basicsToStaples(null)`).
- Artikel aus Rezepten werden nie gespeichert, nur ihr Häkchen (Schlüssel
  „zutat|einheitenfamilie“) – so übersteht es Änderungen am Plan.
- `wasgibts.einkaufsansicht` v2 (pro Gerät, nicht in der Sicherung):
  `{ version: 2, chip: "alle" | "ohne" | "laden:<Name>" | "meist" }`.
  Migration `migrateShopView`: v1 „abteilung“ → „alle“, v1 „laden“ →
  „meist“ (= der Laden mit den meisten Sachen, `resolveChip`).
- Kachel-Farben je Abteilung: Tokens `--app-shop-section-<abteilung>`
  (hell und dunkel in `globals.css`).

## So verhält es sich

- **Erst einsortieren, dann einkaufen (vX, Tafel 99, `einsortieren.ts`,
  `components/einkauf/Einsortieren.tsx`)**:
  - Zwei klare Momente: in der Einkaufsliste (zu Hause) öffnet Antippen das
    Fenster „Wo kaufst du das?“ – nie „gekauft“. Abgehakt wird im
    Einkaufsmodus („Bei Rewe einkaufen“, Antippen = gekauft wie bisher) oder
    über „Schon gekauft“ im Fenster. Hinweis: „Antippen: Laden wählen.
    Abhaken im Laden.“ Lange drücken = „Artikel bearbeiten“ wie bisher.
  - Drei Zustände je Artikel (`ListItem.shop` / `anywhere`, `shopChoice`):
    Laden · bewusst „Egal wo“ · noch ohne Laden (`ohneLaden`).
  - Zone „Noch ohne Laden · 6“ ganz oben (nur unter „Alle“ mit „Meine
    Läden“; gestrichelt, warm, „Antippen = Laden wählen“); leer = weg.
    Darüber die Mia-Zeile „6 Sachen noch ohne Laden.“ + „Mia sortiert“ – nur,
    wenn Mia etwas davon kennt (`sortierVorschlaege`: Gelerntes aus dem
    Einkaufsmodus, ein gemerkter ähnlicher Name mit genau einem Laden; nie
    raten). Danach „5 einsortiert · Rückgängig“. Feste Regeln und gemerkte
    Läden greifen schon beim Eintragen (Hand, Mia, Wochenplan).
  - Fenster (`WoKaufstDuSheet`, `ui/Sheet`): Symbol, Name, „100 g · für
    Gemüselasagne“; „Meine Läden“ als große Knöpfe (2 Spalten, Farbpunkt,
    aktueller bzw. vorgeschlagener Laden in Ladenfarbe hervorgehoben) + „Egal
    wo“; Häkchen „Spinat immer bei Rewe“ (vorausgewählt = feste Regel); unten
    „Schon gekauft“ (bei Gekauftem „Doch kaufen“) · „Ändern“ · „Löschen“ bzw.
    „Haben wir schon“. Ein Tipp: Artikel wandert, Fenster schließt, Meldung
    „Spinat → Rewe. Merk ich mir. · Rückgängig“ (ausdrücklich gewünscht),
    der Artikel ist kurz umrandet. Ohne „Meine Läden“ zeigt das Fenster die
    ersten Läden der Frage; ein gewählter Laden kommt zu „Meine Läden“.
  - Liste danach: Abschnitte je Laden in der Reihenfolge „Meine Läden“, dann
    andere, „Egal wo“ nur mit bewusst gewählten Sachen.
  - Beim Hinzufügen („Kommt auf die Liste für“) ist ohne gemerkten Laden
    und ohne Reiter nichts vorgewählt → „Noch ohne Laden“; „Egal wo“ nur, wenn
    man es antippt (`ladenMerken`).
  - Startseiten-Kachel: IMMER die Läden aus „Meine Läden“ als Zeilen
    (Streifen, 2 Symbole, Zahl; mit 0 nur Name + 0), S/M bis 3 + „+ Rossmann
    1“, L alle; Kopf kurz „EINKAUF“ (nie abgeschnitten); darunter leise
    „16 ohne Laden · Sortieren ›“, vollständig, notfalls zweizeilig (öffnet die
    Liste an der Zone, `#ohne-laden`). Der Symbol-Haufen (Variante A) ist
    weg. Ohne „Meine Läden“: eine neutrale Zeile „Liste“ mit allem ohne
    Laden; leere Liste: „Liste ist leer. …“ statt lauter Nullen.

- **Einkaufsliste aufgeräumt + Läden (v0.119, Tafel 88/89/91/92,
  `meineLaeden.ts`, `kacheln/gruppen.ts`, `shopRules.ts`,
  `components/einkauf/MeineLaeden.tsx`, `ListeTeile.tsx`)**:
  - Läden-Frage einmal nach der Liste bzw. dem Beispiel: „In welchen Läden
    kaufst du ein?“, Chips mit Häkchen (`FRAGE_LAEDEN`), Feld „Anderer Laden,
    z. B. Famila“ + ＋ („Selbst eingetragen“, max. 30 Zeichen, eigene Farbe),
    „Fertig“, leise „Später …“. Läden an Artikeln sind vorgewählt.
  - Laden-Reihe immer sichtbar: Alle · meine Läden · „Ohne Laden“ nur wenn
    nötig · ＋ (Sheet „Meine Läden“: wählen, anlegen, entfernen, sortieren, je
    Laden „Immer hier: …“ mit Entfernen). Antippen filtert; „Bei Lidl
    einkaufen ›“ öffnet den Einkaufsmodus, großer Knopf „＋ Zu Lidl
    hinzufügen“. Beim Hinzufügen „Kommt auf die Liste für“ mit Vorwahl.
  - „Alle“ nach Laden in der Reihenfolge von „Meine Läden“ (Kopf „● Edeka 7 ·
    Einkaufen ›“, „Egal wo“ zuletzt), ohne eigene Läden nach Abteilung;
    Laden gewählt = Laufweg (Obst & Gemüse … Drogerie).
  - Kacheln in 3 Spalten, Name mit Silbentrennung, kein Gericht-Schild mehr
    („für …“ im Bearbeiten-Sheet). Grundsachen aus Rezepten (Salz, Pfeffer,
    Mehl …) in die Karte „Hast du bestimmt im Haus“, antippen = auf die Liste,
    „Immer auf die Liste“ wird gemerkt. „Bald wieder fällig“ als schmale
    Zeile, „Zuletzt gekauft“ und „Gerichte ohne Zutaten“ zugeklappt,
    Wochenwechsel in einer Zeile.
  - Feste Regeln („Tomaten kaufe ich immer bei Rewe“) gelten überall (Hand,
    Mia, Wochenplan, Rezept, Stammliste; ähnliche Namen nur eindeutig). Von
    Hand umgestellt zieht die Regel mit. Lernen: zweimal hintereinander im
    Einkaufsmodus desselben Ladens abgehakt → still gemerkt, einmal je Artikel
    „Butter kaufst du meist bei Lidl. Soll ich mir das merken?“.
  - Einkauf-Kachel C2: je Laden eine Zeile in Ladenfarbe (Streifen, 2
    Symbole, Zahl), S/M bis 3 + „+ Rossmann 3“, L alle; Zeile = Liste mit
    diesem Laden. Beispiel-Tag: Edeka, Rewe, Lidl, Rossmann (`DEMO_SHOPS`).
  - (bis vX: nur „Egal wo“ = Symbolreihe, Variante A – entfallen.) Artikel ohne Zeichnung zeigen überall das
    Linien-Symbol ihrer Abteilung (Obst, Kühlregal, Drogerie …), nie einen
    Buchstaben. Neue Zeichnung „Aufschnitt“ (Salami, Schinken, Mortadella);
    Würstchen/Wiener = Wurst, Frischkäse/Cheddar … = Käse.

- **Einfach wie Bring (v0.66)**: Jeder Artikel ist eine quadratische Kachel
  in der Farbe seiner Abteilung (Symbol, Name, Menge, oben links das
  Gericht); 3 Spalten, ab 390 px 4, ab 24 Artikeln eine Stufe kleiner.
  Tippen = gekauft (seit vX: Tippen = „Wo kaufst du das?“, s. o.; gekauft
  bleibt 2 s stehen, dann „Zuletzt gekauft“). Lange drücken =
  „Artikel bearbeiten“ (mit Löschen bzw. „Haben wir schon“). Oben Chips
  „Alle“ + Läden (meiste zuerst) + „Ohne Laden“ (seit v0.113 die Laden-Reihe
  mit „Meine Läden“, s. o.). Abschnitte: Jetzt mitnehmen · Für heute · Bald
  wieder fällig · Für die Woche (bzw. „Auf der Liste“) · Zuletzt gekauft.
  Unten groß „Mehr hinzufügen“ (rechts bleibt Platz für Mia): Katalog mit
  Suche + Mikro (mehrere mit Komma, `parseQuickAdd`), „Oft gekauft“ zuerst,
  dann alles im Laufweg; antippen wählt aus/ab, „N ausgewählt“, „Fertig“
  übernimmt alles (abgewählt: Eigenes fällt weg, Zutaten → „Haben wir
  schon“). Startseiten-Kachel M: 4 kleine Kacheln, L: 8, + „und N weitere“;
  Tippen = gekauft mit „Gekauft · Rückgängig“.

- **Welche Woche**: Die Planungswoche beginnt am Einkaufstag (Profil
  `shoppingDay`, Standard Montag). „planning“ = ab 2 Tage vor dem nächsten
  Einkaufstag schon die nächste Woche (`planningWeekStart`). Oben ‹ › für
  „Diese Woche“/„Nächste Woche“. Beim Kochstil „spontan“: immer die laufende
  Woche, ohne Artikel aus dem Plan (`manualOnly`), kein Umschalter; offene
  eigene Artikel früherer Wochen wandern mit (`carryOverManual`).
- **Aus dem Plan** (`buildShoppingList`): Zutaten aller Gerichte der Woche
  (nicht an Ausflugs-/Pausetagen), Mengen je Einheitenfamilie addiert
  (g/kg, ml/l; 1500 g → „1,5 kg“), „doppelt kochen“ = ×2. Ein für den Tag
  umgerechnetes Gericht („heute nur zu zweit“) wird auf diese Personenzahl
  gerechnet; ein kleiner Haushalt (`isSmallHousehold`: Haushaltstyp
  single/paar) auf die Personen des Tages, aufgerundet (`roundSmall`; Backen
  bleibt ganz). Zutaten nur fürs lockere Wochenende heißen „optional“.
  Gerichte ohne Zutaten: „Ohne Zutaten: … – selbst ergänzen.“
- Angezeigter Name: „nur diesmal“ umbenannt → euer Produkt → Rezeptname.
- **Abteilungen im Laufweg** (`SECTION_WALK`): Obst & Gemüse → Brot &
  Backwaren → Kühlregal → Fleisch & Fisch → Vorrat/Trockenware → Getränke →
  Tiefkühl → Sonstiges. Abteilung per Stichwort (`sectionFor`, Sonderfälle
  zuerst: „Kokosmilch“ ≠ Milch). Innerhalb: Rezept-Artikel nach Name, eigene
  in der Reihenfolge des Eintragens (`SHOPPING`).
- **Oben, von oben nach unten**: großes Feld „Was brauchst du?“ (mit
  Mikrofon, mehrere mit Komma, „Oft gekauft“) · Umschalter „Nach Abteilung |
  Nach Laden“ · „Einkaufen bei [Laden] …“ (bis 4 Läden mit offenen Sachen,
  meiste zuerst) · „Jetzt mitnehmen“ (`now`, bis abgehakt) · „Für heute“
  (offene Artikel mit heutigem Wochentag, immer aus der laufenden Woche) ·
  „Für die Woche“ · „Bald wieder fällig“ (Stammartikel).
- **Zeile** (`ItemContent`): runder Haken, Name, kleines Etikett des
  Gerichts (z. B. „Pasta“), Info-Knopf „Für …“, Menge rechts. Nach links
  wischen (`SwipeRow`): „Haben wir“ (Rezept-Artikel) bzw. „Löschen“ (eigene,
  mit „Gelöscht · Rückgängig“) und „Bearbeiten“. Langes Drücken = Info.
- **Abhaken**: bleibt ~2 s durchgestrichen stehen und rutscht dann unter
  „Erledigte anzeigen“ (eingeklappt, ohne Zähler). „Haben wir schon –
  anzeigen“ mit „Doch kaufen“. Abhaken lernt den Kauf für die Stammliste.
- **Bearbeiten** (`EditItemSheet`): Name, Menge (nur eigene), Laden (Chips
  „Egal“, alle Läden, „Neuer Laden“). Umbenannt → „Immer so?“ – „Ja, immer“
  speichert ein eigenes Produkt (Rezepte bleiben gleich), „Nur diesmal“
  gilt nur diese Woche.
- **Läden**: Vorschläge `SHOP_SUGGESTIONS` (Aldi, Lidl, Edeka, Rewe,
  Rossmann, dm, Wochenmarkt, Bäcker) + eigene (bis 30 Zeichen), Auswahl nach
  Nutzung sortiert (`SHOPS`). Fester Farbpunkt je Laden (`shopTone`: bekannte
  Läden fester Ton, sonst aus dem Namen; Tokens `--app-shop-1…8`), keine
  Logos. „Nach Laden“: Gruppen meiste offene zuerst, „Ohne Laden“ zuletzt,
  am Gruppenkopf „Einkaufen“ und Teilen.
- **Einkaufsmodus** (`ShopMode`, Titel „Bei REWE“): „Gibt’s hier“ · „Egal wo“
  (ohne Laden) · „Andere Läden“ (eingeklappt, Namen) · „Im Korb“.
  Bildschirm bleibt an (`useWakeLock`). Leer: „Alles für REWE im Korb.“
  „Fertig“ = eine Ebene zurück. **Lernen**: wird hier etwas ohne Laden
  abgehakt, merkt sich die Liste den Laden („Gemerkt für REWE: …“), zurück
  mit „Mach das rückgängig“.
- **Stammartikel** (`staples.ts`): Rhythmus fest oder gelernt (Median der
  Abstände ≥ 3 Tage zwischen Kauftagen). Fällig, wenn nie gekauft (fester
  Rhythmus) oder letzter Kauf + Rhythmus bis zur Wochenmitte erreicht und
  nicht schon auf der Liste. „Bald wieder fällig“: antippen = übernehmen,
  × = diesmal nicht. „Stammliste ansehen“: Rhythmus („jede Woche“, „alle 2
  Wochen“, „· gelernt“), entfernen (mit Rückgängig), „Jede Woche“ hinzufügen.
- **Schnell-Eintrag** (`parseQuickAdd`): „Milch, Windeln und Müsli von
  Rossmann“ → Artikel mit Menge und Laden. Sicher erkannt (Lebensmittel,
  Abteilungs-Stichwort, Drogerie/Haushalt, eigene Produkte/Läden/Stammliste)
  → direkt auf die Liste, still (kein Rückgängig-Band, „Mach das
  rückgängig“ geht). Unsicheres als grauer Chip „Meintest du …?“ bzw. „„…“
  so lassen“ – nie automatisch korrigiert. Diktat über `useSpeechInput`,
  beim Absenden `reset()`. Das Fenster „Auf die Liste“ kommt vom Plus (Seite,
  Kachel, Essen-Reiter) und aus „Was möchtest du eintragen?“.
- **Teilen**: „Liste teilen“ bzw. je Laden – offene Artikel als Text nach
  Abteilung (`shoppingListText`), über das Teilen-Menü, sonst in die
  Zwischenablage.
- **Kachel auf Heute**: S bis zu 3 Läden als Zeilen (Farbpunkt, Name,
  Artikel), ohne Läden 3 Sachen + „und N weitere“; M 6, L 10 zum Abhaken.
  Jetzt-Karte 15:00–19:30: „Auf dem Heimweg? 3 Sachen bei REWE“ → Einkaufsmodus.
- **Familie Bescheid sagen** (Einkauf Teil 6, `src/lib/einkauf/unterwegs/`,
  `components/einkauf/unterwegs/BescheidAsk.tsx`): nur mit Konto. Beim ersten
  Einkaufsmodus einmal „Familie Bescheid sagen?“ [Ja, immer] [Nein] – gemerkt
  pro Gerät (`wasgibts.einkaufbescheid`), änderbar in Einstellungen →
  Mitteilungen („Familie beim Einkaufen Bescheid sagen“). Bei „Ja“ wird der
  Einkauf geteilt (`wasgibts.einkaufswege`, Abgleich-Typ `unterwegs`, Doc
  `uw:<id>`, 2 Tage, nicht in der Sicherung): Laden, Name, Start und die 2
  häufigsten fälligen Stammartikel (`tripSuggestions`). Der Server schickt den
  anderen „Felix ist gleich bei REWE. Braucht ihr noch was?“ mit Knöpfen
  „+ Butter“, „+ Kaffee“, „Nichts, danke“ (Service Worker →
  `/einkaufsliste?plus=Butter`, die Liste setzt es still drauf:
  `plusFromLink`). Neues von anderen während des Einkaufs steht gelb mit „Neu
  von Lisa · gerade eben“ (`newDuringTrip`: was beim Start noch nicht auf der
  Liste war). „Fertig eingekauft“ meldet „Eingekauft ✓ – 9 Sachen bei REWE“
  (`boughtCount`). Nur 7–20 Uhr, nie in der Pause; zählt nicht als proaktive
  Mitteilung. Auf der Jetzt-Karte der anderen leise „Felix ist gleich bei
  REWE“ (`newsFromDocs`).
- **Steh grad davor** (Clip „Einer sagt’s, alle wissen’s“): setzt jemand
  während eines geteilten Einkaufs etwas drauf, schickt der Server der
  Person im Laden „Lisa hat Milch auf die Liste gesetzt.“ mit Knopf „Steh
  grad davor“ (Service Worker → `/einkaufsliste?davor=<konto>|<sache>`,
  `davorFromLink`, `useDavorLink`); im Einkaufsmodus steht derselbe Knopf
  unter der gelben Zeile. Die Antwort hängt am geteilten Einkauf
  (`antworten`: an wen, welche Sache, wann; je Person und Sache einmal,
  höchstens 20; `answerTrip`, `sendAnswer`) und kommt bei der Person, die es
  draufsetzte, als Mitteilung „Felix zu Milch: Steh grad davor.“ und
  30 Min. leise oben in der Einkaufsliste an (`AntwortZeile`,
  `answersForMe`). Gleiche Grenzen wie oben (7–20 Uhr, nie in der Pause,
  Schalter „Einkauf unterwegs“, nicht proaktiv).

## Begleitung (Mia)

- `einkaufsliste_hinzufuegen` (`src/lib/begleitung/shoppingTools.ts`): Artikel
  mit Menge, Abteilung, `fuer_tag`, `gericht`, `laden` → Op `add_shopping`
  (Vorschau „Übernehmen“; der Laden wird beim Übernehmen gemerkt).
- `laden_regel` (Op `set_shop_rule`, sofort mit Rückgängig: „Merk ich mir.
  Tomaten → Rewe.“, leerer Laden = Regel weg, Artikel bewusst „Egal wo“) und `laeden_anzeigen` („Was
  kauf ich wo?“) in `shoppingTools.ts`; Mia sieht Läden und Regeln im
  Kontext. Ohne KI dasselbe über `parseShopRule` bzw.
  `isShopOverviewQuestion` (`shopRuleRule` in `localRules.ts`).
- `einkaufsliste_anzeigen`, `einkaufsliste_leeren` (Op `clear_shopping`:
  eigene weg, Rezept-Zutaten „haben wir“), `einkaufsliste_entfernen` (Op
  `remove_shopping`) in `homeTools.ts`. „Ich bin bei REWE“ mit KI über
  `app_befehl`. Die KI sieht offene Artikel mit Laden („Milch (Rewe)“).
- Ohne KI (`useChatRules.ts`, `localRules.ts`, `homeChat.ts`): „Müsli von
  Rossmann und Windeln auf die Liste“ / „Wir brauchen Milch und Eier“
  (`isShoppingRequest`) → „Steht drauf ✓ …“ mit Rückgängig; „Wir nehmen immer
  Alsan statt Butter“ → eigenes Produkt; „Nimm Milch von der Liste“, „Leer
  die Einkaufsliste“, „Zeig mir die Einkaufsliste“; „Ich bin bei REWE“, „Ich
  geh zu Lidl einkaufen“, „Einkaufsmodus Aldi“ (`shopModeRequest`, nur
  bekannte Läden, kurze Sätze) → Einkaufsmodus.
- Im Supermarkt („Lachs ist im Angebot“) legt „Auf die Liste“ Produkt und
  Zutaten als „Jetzt mitnehmen“ an (`useMarketChat.ts`, siehe Essen).

## Tests

- `tests/einkauf/einsortieren.test.ts` – Antippen in der Liste ändert nie
  „gekauft“, Einkaufsmodus hakt ab, drei Zustände (Bisheriges = noch ohne
  Laden), Laden wählen + „immer bei“ + Rückgängig, „Mia sortiert“ +
  Rückgängig, nie raten, Zone und Kachel. `tests/heute/einkaufKachel.test.ts`
  – Kachel mit 0-Läden, „noch ohne Laden“, Beispiel-Tag. Durchklick
  `einsortieren` (`e2e/ablaeufe/einsortieren.mjs`), angepasst `einkauf` und
  `imHaus` (`essen.mjs`: Antippen → Fenster → „Schon gekauft“).
- `tests/einkauf/listeBauen.test.ts` – Mengen, Liste aus dem Plan, Teilen.
- `tests/einkauf/listeBearbeiten.test.ts` – Ändern, Läden, Migration v1–v5.
- `tests/einkauf/meineLaeden.test.ts` – Läden bewusst wählen: Frage
  (Fertig/Später), bestehende Nutzer, Reihe mit 0, Knopftexte, Vorwahl,
  eigener Laden, Sätze mit Laden, Farben, Prüfstand. Durchklick
  `laedenWaehlen`, `laedenSpaeter`.
- `tests/einkauf/laedenRegeln.test.ts` – Gruppen Alle/Laden, Grundsachen,
  Silbentrennung, Regeln setzen/löschen/ähnlich/von Hand, Regel im
  Wochenplan, Lernen nach 2×, „Was kauf ich wo?“, Werkzeug, Prüfstand.
- `tests/heute/einkaufKachel.test.ts` – Kachel C2, Beispiel-Reihenfolge.
- `tests/einkauf/schnellEintrag.test.ts` – Sätze, Schnell-Plus,
  Einkaufsmodus, Läden-Gruppen.
- `tests/einkauf/stammartikel.test.ts` – Rhythmus, fällig, ändern.
- `tests/einkauf/laeden.test.ts` – Einkaufsmodus, „Ich bin bei REWE“,
  Jetzt-Karte „Auf dem Heimweg?“.
- `tests/einkauf/unterwegs.test.ts` – Familie Bescheid sagen: Speicher,
  Schnellknöpfe, Gelb, Texte, Abgleich, Server-Mitteilungen (Ruhezeit,
  Pause, nicht proaktiv), „Steh grad davor“ (Mitteilung an die Person im
  Laden, Antwort an die Person, die es draufsetzte, Link aus der Mitteilung).
- Durchklick: Ablauf `familieTeilen` (`e2e/ablaeufe/familieTeilen.mjs`):
  Lisa sagt Mia „Milch auf die Liste“ → bei Felix im Laden gelb in
  höchstens 5 s → „Steh grad davor“ kommt bei Lisa an.
- Durchklick: Ablauf `einkaufUnterwegs` in `e2e/ablaeufe/konten.mjs` (zwei
  Geräte mit `KONTEN_TEST`: Bescheid sagen → Hinweis bei B, „+ Butter“ →
  gelb bei A, „Fertig eingekauft“ kommt an).
- Durchklick: Ablauf `einkauf` in `e2e/ablaeufe/essen.mjs` (Milch, Brot
  eintragen, abhaken → „Erledigte anzeigen“).

## Ein Weg (v0.122.0)

- ＋ → „Mehr Details“ öffnet den Katalog (`CatalogSheet`, Suchtext wird übernommen); kein fester Knopf unten. Schließen übernimmt die Auswahl, kein eigenes Mikro. Laden-Chips ohne Zahl. Sichtbarer Name „Einkaufsliste“ (Kachel, Zurück). Tests `tests/einkauf/einWeg.test.ts`.
