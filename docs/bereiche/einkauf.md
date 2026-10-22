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
  (gemerkte Ansicht, `shopModeLists`, `shopModeRequest`).
- Schnell-Eintrag/Sprache: `quickAdd.ts` (`parseQuickAdd`), `shoppingParse.ts`
  (`parseShoppingText`, `isShoppingRequest`, `parseProductStatement`).
- Oberfläche `src/components/einkauf/`: `ShoppingListView.tsx` (Seite
  `/einkaufsliste`), `ShoppingParts.tsx` (`ItemContent`, `EditItemSheet`,
  `StaplesSheet`), `StapleBar.tsx`, `QuickAdd.tsx` (`QuickAddButton`,
  `ShoppingAddField`, `ShoppingQuickAdd`), `ShopMode.tsx`
  (`/einkaufsliste/laden?name=…`).
- Kachel „Einkauf“ auf Heute: `ShoppingTile`/`ShopRows` in
  `src/components/heute/HomeTiles.tsx`. Chips auf dem Essen-Reiter:
  `ShoppingChips` in `src/components/essen/FoodPage.tsx`.
- Feste Reihenfolgen in `src/lib/core/sort.ts`: `SECTION_WALK`, `SHOPPING`,
  `SHOP_GROUPS`, `SHOPS`.

## Daten und Speicher

- `wasgibts.einkaufsliste` v4 (in der Sicherung): `{ version: 4, weeks,
  products, shops, itemShops, staples }`.
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
- `wasgibts.einkaufsansicht` v1 (pro Gerät, nicht in der Sicherung):
  `{ version: 1, view: "abteilung" | "laden" }`.

## So verhält es sich

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
  wischen (`SwipeRow`): „Haben wir“ (Rezept-Artikel) bzw. „Löschen“ (eigene)
  und „Bearbeiten“. Langes Drücken = Info.
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
  Wochen“, „· gelernt“), entfernen, „Jede Woche“ hinzufügen.
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

## Begleitung (Mia)

- `einkaufsliste_hinzufuegen` (`src/lib/begleitung/shoppingTools.ts`): Artikel
  mit Menge, Abteilung, `fuer_tag`, `gericht`, `laden` → Op `add_shopping`
  (Vorschau „Übernehmen“; der Laden wird beim Übernehmen gemerkt).
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
- `tests/einkauf/listeBearbeiten.test.ts` – Ändern, Läden, Migration v1–v4.
- `tests/einkauf/schnellEintrag.test.ts` – Sätze, Schnell-Plus,
  Einkaufsmodus, Läden-Gruppen.
- `tests/einkauf/stammartikel.test.ts` – Rhythmus, fällig, ändern.
- `tests/einkauf/laeden.test.ts` – Einkaufsmodus, „Ich bin bei REWE“,
  Jetzt-Karte „Auf dem Heimweg?“.
- Durchklick: Ablauf `einkauf` in `e2e/ablaeufe/essen.mjs` (Milch, Brot
  eintragen, abhaken → „Erledigte anzeigen“).
