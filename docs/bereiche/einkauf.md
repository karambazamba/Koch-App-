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
  `recentBought`, `catalog`), `basics.ts` (Grundsortiment für den Katalog).
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
    `itemShops`: Artikel (klein) → Laden. `staples`: Stammartikel (`name`,
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

- **Einfach wie Bring (v0.66)**: Jeder Artikel ist eine quadratische Kachel
  in der Farbe seiner Abteilung (Symbol, Name, Menge, oben links das
  Gericht); 3 Spalten, ab 390 px 4, ab 24 Artikeln eine Stufe kleiner.
  Tippen = gekauft (bleibt 2 s stehen, dann „Zuletzt gekauft“, ab 8
  eingeklappt; dort Tippen = wieder auf die Liste). Lange drücken =
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

## Begleitung (Mia)

- `einkaufsliste_hinzufuegen` (`src/lib/begleitung/shoppingTools.ts`): Artikel
  mit Menge, Abteilung, `fuer_tag`, `gericht`, `laden` → Op `add_shopping`
  (Vorschau „Übernehmen“; der Laden wird beim Übernehmen gemerkt).
- `laden_regel` (Op `set_shop_rule`, sofort mit Rückgängig: „Merk ich mir.
  Tomaten → Rewe.“, leerer Laden = Regel weg) und `laeden_anzeigen` („Was
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
  Pause, nicht proaktiv).
- Durchklick: Ablauf `einkaufUnterwegs` in `e2e/ablaeufe/konten.mjs` (zwei
  Geräte mit `KONTEN_TEST`: Bescheid sagen → Hinweis bei B, „+ Butter“ →
  gelb bei A, „Fertig eingekauft“ kommt an).
- Durchklick: Ablauf `einkauf` in `e2e/ablaeufe/essen.mjs` (Milch, Brot
  eintragen, abhaken → „Erledigte anzeigen“).

## Ein Weg (v0.122.0)

- ＋ → „Mehr Details“ öffnet den Katalog (`CatalogSheet`, Suchtext wird übernommen); kein fester Knopf unten. Schließen übernimmt die Auswahl, kein eigenes Mikro. Laden-Chips ohne Zahl. Sichtbarer Name „Einkaufsliste“ (Kachel, Zurück). Tests `tests/einkauf/einWeg.test.ts`.
