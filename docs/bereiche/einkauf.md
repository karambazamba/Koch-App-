# Einkauf

Kurz: Die Seite „Einkauf“ ist so klar wie die Startseiten-Kachel (v0.142, Tafel
110/111): oben **Einsprechen** (Mia hört zu und macht die Liste daraus) und
**Aussuchen** (erst Laden, dann Sachen antippen), darunter „Meine Läden“ als
große farbige Karten und – nur wenn nötig – „Noch ohne Laden“ zum Antippen
oder Draufziehen. Abgehakt wird auf der Laden-Seite (zu Hause wie im Laden)
wie bei Aufgaben: erst „Im Wagen ⌄“, dann „Einkauf fertig“ (→ Im Haus).
Seit A-040/A-041 (Tafel 127/128) steht auf der Liste nur, was man kauft:
Symbol und Name, eine Menge nur, wenn selbst gesagt. Zutaten aus dem
Wochenplan sind ein Angebot oben auf der Laden-Seite („Für deinen
Wochenplan“, „Alle dazu“). Mia merkt sich beim Abhaken, wo es was gibt
(„Rewe · wie immer“, „Oft bei Rewe“). Gleiche Sachen im selben Laden stehen
nur einmal da. Kennt Läden, feste Regeln und eure Produkte. Immer sichtbar
(kein Baustein).

## Wo im Code

- Seiten (`src/components/einkauf/`): `EinkaufSeite.tsx` (`/einkaufsliste`),
  `aussuchen/Aussuchen.tsx` + `aussuchen/AussuchenKachel.tsx`
  (`/einkaufsliste/aussuchen`), `LadenSeite.tsx` (`/einkaufsliste/laden?name=…`,
  `&unterwegs=1` = Einkauf beginnt gleich), `seite/LadenKarten.tsx` (große
  Karte, `ladenFarbe`), `seite/OhneLaden.tsx` („Noch ohne Laden“, Ziehen,
  `HALTEN_MS` 250), `seite/EinkaufMenue.tsx` („···“), `Einsortieren.tsx`
  („Wo kaufst du das?“), `EinsprechenKarte.tsx` („Hab ich:“ + Live-Blase),
  `EinkaufBeispiel.tsx`, `MeineLaeden.tsx` (Frage, „Meine Läden“),
  `seite/LadenZeile.tsx` (Zeile der Laden-Seite: Kreis, Symbol, Name, Menge
  nur selbst gesagt; Zeile antippen = `seite/SacheFenster.tsx`),
  `seite/WochenplanAngebot.tsx` („Für deinen Wochenplan“),
  `merken/ErgebnisLaden.tsx` („Rewe · wie immer ⌄“ in Mias Ergebnis-Karte),
  `ShoppingParts.tsx` (`EditItemSheet`, `StaplesSheet`), `QuickAdd.tsx` (＋ der
  Kachel und des Essen-Reiters), `EinkaufLaden.tsx` (Laden in der
  Schnelleingabe), `kacheln/ItemTile.tsx` (Kachel für „Im Haus“),
  `kacheln/ItemSymbol.tsx` (Zeichnungen).
- Logik (`src/lib/einkauf/`): `einsprechen.ts` (Einsprechen ohne KI:
  `einkaufVerstehen`, `einkaufVorschlag`, `EINKAUF_PREFIX`, `passtText`),
  `aussuchen/katalog.ts` (Abschnitte, `KATALOG`, `BELIEBT`, `abschnittFuer`),
  `aussuchen/abschnitte.ts` (`aussuchenAbschnitte`, `oftBei`, `fuerDieWoche`,
  `aussuchenSuche`, `kennzeichen`, `tippAktion`, Menge, `zusammenfassung`),
  `seite/karten.ts` (`ladenKarten`, `ohneLadenListe`, `ladenHref`, gemeinsame
  Woche `useEinkaufWoche`), `wagen/wagen.ts` (Laden-Seite: `wagenTeilen`,
  `leerVorschlaege`, `einkaufFertig`, `STEHEN_MS`/`GLEITEN_MS`),
  `wagen/useAbhaken.ts` (EIN Ablauf fürs Abhaken: `abhakenAblauf`,
  `useAbhaken`), `merken/gelernt.ts` (Laden lernen: `abgehakt`, `korrigiert`,
  `gilt` = 90-Tage-Regel, `oftBeiGelernt`, `gelerntListe`), `merken/karte.ts`
  („wie immer“, „Hab Rewe genommen …“, „Merk ich mir …“),
  `angebot/angebot.ts` (Wochenplan-Angebot: `angebotFuer`, `alleDazu`,
  `alsEintrag`, `wofuer`),
  `zusammen/zusammen.ts` (Doppeltes: `normalform`, `gleicheSache`,
  `mengenAddieren`, `zielFuer`, `wocheZusammenfassen`),
  `zusammen/packung.ts` (Packung nur als Vorschlag: `einkaufsMenge`,
  `packungFuer`, `packungAus`; `alsEinkauf` ohne Menge, `rezeptHinweis`),
  `einsortieren.ts`, `meineLaeden.ts`, `shopRules.ts` (`ladenHerkunft`,
  `shopChoice`, `noteShopCheck`, `ladenKorrigieren`, `gelerntVergessen`), `shopMode.ts` (gemerkter Laden, `shopModeHref`,
  „Ich bin bei REWE“), `kacheln/view.ts` (`walkOrder`, `recentBought`),
  `kacheln/gruppen.ts` (`grundsachen`), dazu wie bisher `shoppingList.ts`
  (Einstieg), `sections.ts`, `amounts.ts`, `listModel.ts`, `listStore.ts`,
  `listMigration.ts`, `listEdits.ts`, `shops.ts`, `staples.ts`,
  `buildList.ts`, `quickAdd.ts` (`istEinkaufSache`), `shoppingParse.ts`.
- Kachel „Einkauf“ auf Heute: `ShoppingTile`/`ShopRows` in
  `src/components/heute/HomeTiles.tsx` (Laden-Zeile = Laden-Seite).
- Mia im Modus „Einkauf“: `openHelper("einkauf")`, `chat.einkauf`,
  `components/begleitung/useModusChat.ts`, Testmodus `lib/begleitung/mockModus.ts`.
- Feste Reihenfolgen in `src/lib/core/sort.ts`: `SECTION_WALK`, `SHOPPING`,
  `SHOP_GROUPS`, `SHOPS`, `OFT_BEI`.

## Daten und Speicher

- `wasgibts.einkaufsliste` v8 (in der Sicherung, Abgleich `einkauf` v8):
  `{ version: 8, weeks, products, shops, itemShops, staples, myShops,
  shopsAsked, shopRules, learned, learnAsked, alwaysList, angebotAb }`. `myShops` =
  „Meine Läden“ in gewählter Reihenfolge, `shopsAsked` = Läden-Frage
  beantwortet, `shopRules` = feste Regeln (Artikel klein → Laden),
  `learned` = gelernt beim Abhaken auf einer Laden-Seite (Artikel klein →
  `{ shop, n, am }`: Laden, wie oft hintereinander, letztes Datum; gefunden über
  die Normalform; geteilt im Haushalt über die Einkauf-Einstellungen, keine
  Server-Statistik), `learnAsked` = früher „schon gefragt“ (ungenutzt, bleibt),
  `angebotAb` = ab welchem Wochenbeginn der Plan ein Angebot ist ("" = immer),
  `alwaysList` = Grundsachen, die trotzdem auf die Liste sollen
  (v4 → v5 → v6: leer, einmal fragen; nichts geht verloren; v6 → v7:
  doppelte offene eigene Artikel je Woche zusammengefasst – gleiche Sache im
  selben Laden, Mengen addiert, die kleinste Kennung bleibt, damit alle
  Geräte im Haushalt gleich entscheiden; der Abgleich markiert den anderen
  als gelöscht, `upgrade` fasst ältere Stände genauso zusammen; v7 → v8:
  Gelerntes bekommt das Datum der Umstellung, `angebotAb` = heute + 8 Tage
  (diese und die nächste Planungswoche rechnen wie bisher von selbst, nichts
  verschwindet von der Liste), unsere gerundete Packungsmenge an
  Rezept-Zutaten (`rezeptMenge`) fällt weg, selbst geänderte bleiben).
  - `weeks[<Wochenbeginn>]` = `WeekList`: `manual` (eigene Artikel: `id`,
    `name`, `amount` als Text, `section`, `done`, optional `day` = Wochentag,
    `now` = „Jetzt mitnehmen“, `dish`, `rezeptMenge` = Rezeptmenge als
    Hinweis im Fenster bei Zutaten aus Rezept-Link/Kochidee/Angebot), `checked` (Schlüssel
    abgehakter Rezept-Artikel), `have` („Haben wir schon“), `renamed` (nur
    diese Woche), `skippedStaples` („diesmal nicht“), `fertig` (Schlüssel
    nach „Einkauf fertig“ – nicht mehr in „Im Wagen“; im Abgleich mit
    `einkauf-woche`).
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
  „zutat|einheitenfamilie“) – so übersteht es Änderungen am Plan. Seit v8
  sind sie (ab `angebotAb`) nur ein Angebot (`ShoppingList.angebot`); was man
  übernimmt, wird ein eigener Eintrag.
- `wasgibts.einkaufsansicht` v2 (pro Gerät, nicht in der Sicherung):
  `{ version: 2, chip: "laden:<Name>" | … }` – seit v0.142 der zuletzt aktive
  Laden in „Aussuchen“ (gleiches Format wie früher der Chip der Liste, kein
  Formatwechsel; „alle“/„ohne“/„meist“ aus alten Ständen = erster eigener
  Laden). Migration `migrateShopView` (v1 → v2) bleibt.
- Kachel-Farben je Abteilung: Tokens `--app-shop-section-<abteilung>`
  (hell und dunkel in `globals.css`).

## So verhält es sich

- **Seite „Einkauf“ (v0.142, Tafel 110, Bild 1)**: Kopf „‹ Heute“, „···“, Titel
  „Einkauf“ (kein ＋; bei nächster Woche leise „Nächste Woche · …“).
  - Oben zwei große Knöpfe nebeneinander: „Einsprechen · Einfach aufzählen“
    (Orange, Mikro) und „Aussuchen · Suchen & antippen“ (weiß, Lupe).
  - „Meine Läden“ als große farbige Karten (`ladenKarten`): Farbstreifen,
    Name, die ersten Sachen leise („Milch, Brot, Butter …“, leer „Noch nichts
    drauf“), bis 3 Symbole, Anzahl, „›“ – auch mit 0. Danach andere Läden mit
    Sachen (meiste zuerst) und nur mit Sachen bewusst „Egal wo“. Tipp =
    Laden-Seite. Ohne Läden: einmalige Frage „In welchen Läden kaufst du
    ein?“ bzw. „Läden wählen“.
  - „Noch ohne Laden · n“ (gestrichelt, nur wenn vorhanden): Chips mit
    Symbol; antippen = „Wo kaufst du das?“ (Läden als große Knöpfe, „Egal
    wo“, „immer bei“, Löschen bzw. „Haben wir schon“); halten (250 ms, hebt
    sich, Vibration) und auf eine Karte ziehen – die Karte leuchtet in
    Ladenfarbe, Loslassen = in den Laden, sofort als feste Regel gemerkt,
    Meldung „Käse → Edeka. Merk ich mir. · Rückgängig“ (Rückgängig nimmt nur
    diesen Schritt zurück, die Regel ist wieder weg). Vor dem Heben gewinnt
    die Bewegung (Scrollen, Wischen; `data-no-swipe`, kein `touch-none`).
    „Mia sortiert“ (Name über `helperName`) nur, wenn sie etwas kennt
    (Gelerntes, eindeutig ähnlicher Name), mit Rückgängig; leise „oder auf
    einen Laden ziehen“.
  - Grundsachen aus Rezepten (Salz, Pfeffer, Mehl …) stehen nicht herum;
    man findet sie unter „Aussuchen · Für eure Woche“.
  - „···“: Woche wechseln (gilt für alle Einkauf-Seiten bis zum Neuladen),
    Zuletzt gekauft (mit „Haben wir schon“, je „Doch kaufen“), Gerichte ohne
    Zutaten, Stammliste, Liste teilen, Meine Läden bearbeiten.
  - Leer ohne Beispiel: „Die Liste ist leer. Einsprechen oder aussuchen,
    ich sortier’s in die Läden.“
- **Einsprechen (Tafel 110, Bild 2)**: öffnet die Mia-Bühne zuhörend im Modus
  „Einkauf“ (Kopf „EINKAUF“, „Zähl einfach auf.“, „Lieber schreiben“ geht).
  KI zuerst („[Einkauf] …“, Regeln in `einkaufsliste_hinzufuegen`), ohne KI
  `einkaufVerstehen`: nur Lebensmittel und Verbrauchsartikel; Füllwörter,
  Abbrüche („M…“, „äh“), „weiß ich nicht mehr“, Smalltalk und Namen raus;
  Korrekturen („nee, keine Sahne“, „Milch, nee Hafermilch“, „doch nicht“),
  Mengen („zwei Milch“ → 2), Doppeltes zusammen (Zahlen addiert), „bei Rewe“
  gilt für die „und“-Kette davor. Die Live-Blase streicht Ignoriertes durch.
  Bestätigung „Hab ich: 9 Sachen“ als Chips (× nimmt raus, Farbpunkt =
  gemerkter Laden), „Weiter erzählen“ / „Passt“. Nie sofort eingetragen. Bei
  „Passt“: Gemerktes direkt in den Laden, Rest in „Noch ohne Laden“, Meldung
  „9 drauf · 3 ohne Laden · Rückgängig“.
- **Aussuchen (Tafel 111 + Nachtrag)**: Seite „‹ Einkauf“, „···“ (Meine Läden
  bearbeiten), Titel „Aussuchen“.
  - „Für welchen Laden?“: Meine Läden als große Knöpfe (2 Spalten, hell in
    Ladenfarbe; aktiver voll in Ladenfarbe, weiße Schrift, Zahl der heute
    gewählten Sachen als Pille). Ohne eigene Läden die ersten vier der Frage.
    Der aktive Laden wird pro Gerät gemerkt.
  - Darunter klebend: Suchfeld „In Rewe suchen …“ (ganzer Katalog, Eigenes,
    sonst der getippte Name als Kachel) und die wischbare Chip-Reihe der
    Abschnitte (Tipp = springen, aktiver hervorgehoben).
  - Abschnitte in fester Reihenfolge, Überschriften kleben: „Für eure Woche“
    (Zutaten der geplanten Gerichte mit Tag „für Mi“) → „Oft bei Rewe“
    (höchstens 9: Regel > Gelerntes > Gemerktes > Gekauftes; ohne Verlauf
    „Beliebt“ mit 9 Grundsachen) → Obst & Gemüse → Brot & Backwaren →
    Kühlregal → Fleisch & Wurst → Vorrat → Tiefkühl → Getränke → Süßes &
    Snacks → Drogerie & Haushalt (immer zuletzt). Leere fallen weg. Die
    Abschnitte sind nur Anzeige (`abschnittFuer`); gespeichert bleibt die
    Abteilung (`sectionFor`).
  - Drogerie-Läden (Rossmann, dm, Müller, `shopType` „drogerie“): „Oft bei
    Rossmann · Drogerie zuerst“, dann Drogerie & Haushalt, Woche und
    Lebensmittel eingeklappt („Lebensmittel bei Rossmann ›“).
  - Kacheln (3 Spalten, weiß, Symbol + Name, „+“ in Orange): antippen = sofort
    in den aktiven Laden (Haken + Fläche in Ladenfarbe, als feste Regel
    gemerkt); nochmal = wieder raus (alles wie vorher). Steht es in einem
    anderen Laden, bleibt es sichtbar mit kleinem Ladennamen; antippen zieht
    es um. Ohne Laden: ruhiger Haken „steht drauf“. Im Haus: kleiner Punkt
    „noch da“ (Tipp fügt trotzdem hinzu). Halten = „Wie viel?“ (− 1 +,
    Standard 1, Anzeige „×2“; Zutaten aus dem Plan behalten ihre Menge).
  - Unten fest über der Leiste die dunkle Leiste „● Rewe 3 · ● Rossmann 2“
    und rechts der orange Knopf „Fertig“ (zurück zu „Einkauf“). Dunkel über
    das Token `--app-leiste-dunkel` (warmes Fast-Schwarz, nie reines
    Schwarz; der Knopf selbst ist orange).
- **Laden-Seite (Punkt 5 + Nachtrag, Tafel 127/128)**: Tipp auf eine Karte
  oder eine Kachel-Zeile; jede Laden-Karte (auch mit 0) öffnet sie gleich.
  Großer Titel „Rewe“ mit Strich in Ladenfarbe (`data-laden-kopf`, „Rewe · 3
  Sachen“ zum Vorlesen). Beim ersten Mal überhaupt (nicht je Laden) Mias
  Seiten-Tipp „Abhaken, was im Wagen liegt. Ich merk mir das für Rewe.“
  (`seite:einkauf-laden`), sonst darüber die Zeile „Abhaken, was im Wagen liegt.“.
  - **Für deinen Wochenplan** (A-040, nur wenn der Plan etwas anbietet): Karte
    mit Gerichten („Lasagne · Fr · Curry · Sa“, einklappbar ⌄), Zutaten als
    Chips mit Symbol (≥ 44 px), einzeln antippen = drauf, „Alle dazu“
    (orange) = alles außer Grundsachen („Steht drauf.“). Salz & Co. blass,
    kommen nie von selbst (außer „immer auf die Liste“). Angeboten wird, was
    hierher gelernt/gemerkt ist oder noch ohne Laden; übernommen landet es
    hier. Danach verschwindet die Karte von selbst. Ohne eigene Läden steht
    sie auf der Übersicht.
  - **Nach „Nehmen“** (Rezept-Vorschau der Essen-Kachel, A-046): kleine
    Meldung „Auf die Liste: Eier, Limette +2?“ mit „Alle dazu“ – nur die
    Zutaten dieses Gerichts aus dem Angebot, ohne Grundsachen, eingegrenzt auf
    das, was die Vorschau „auf die Liste“ nannte (`angebotFuerGericht`,
    `angebotFrage`, `zutatenAnbieten` in `einkauf/angebot/nachNehmen.ts`).
    „Alle dazu“ setzt sie wie auf der Laden-Seite drauf („Steht drauf.“);
    sonst bleiben sie hier im Angebot. Nichts anzubieten = still.
  - Liste: großer Kreis, Symbol, Name, sonst nichts; Menge nur, wenn selbst
    gesagt („2 Liter“). Zeile antippen = Fenster (`SacheFenster`, `ui/Sheet`):
    Name, darunter erst hier „für Gemüselasagne · Fr“ und „200 g im Rezept“,
    Menge („z. B. 1 Packung“ bzw. die übliche Packung), Laden („● Rewe ⌄“,
    ändern wird gemerkt), „Von der Liste nehmen“ (Löschen mit Rückgängig bzw.
    „Haben wir schon“). Lange drücken = „Wo kaufst du das?“ (anderer Laden,
    „Schon gekauft“, „Ändern“ → „Artikel bearbeiten“, Löschen).
  - Abhaken wie bei Aufgaben (A-041, `useAbhaken`, ein Ablauf für alle
    Stellen): Häkchen orange, Zeile blasser (nie durchgestrichen), 1 s stehen
    (nochmal tippen = zurück, auch das Gemerkte), dann gleitet sie 0,8 s weg
    (transform/opacity, `cubic-bezier(.16,1,.3,1)`, reduzierte Bewegung = nur
    Überblenden) in „Im Wagen ⌄“, direkt unter der Liste, zugeklappt, ohne
    Zahl, antippen = aufklappen. Übersicht und Kachel haben keine Haken;
    Abgehaktes zählt dort sofort nicht mehr mit.
  - Darunter „Was noch bei Rewe?“ mit Vorschlägen ab 2 Buchstaben; landet in
    diesem Laden (feste Regel). `name=` leer = bewusst „Egal wo“.
  - **Oft bei Rewe** (A-041): die am häufigsten hier abgehakten Sachen, die
    gerade nicht draufstehen (höchstens 8, Gleichstand zuletzt gekauft
    zuerst), als Chips mit Symbol; antippen = direkt hier, kurz „Steht
    drin.“. Darunter einmal klein „Merk ich mir, wenn du bei Rewe abhakst.“
    (bis zum ersten Abhaken, Einmal-Hinweis `einkauf-merken`). Noch nichts
    gelernt und leer: „Für Edeka steht nichts drauf.“ und wie bisher
    `leerVorschlaege` (Regel, Gemerktes, hier Gekauftes; sonst „Zuletzt
    gekauft“, sonst „Beliebt“; aus dem Stand beim Öffnen).
  - „Einkauf fertig“ (großer Knopf, sobald etwas im Wagen liegt oder der
    Einkauf geteilt ist): alles aus dem Wagen nach „Im Haus“ (nur mit
    Baustein; Abhaken allein legt noch nichts hinein), Meldung „Fertig. Liegt
    jetzt bei Im Haus.“ bzw. „Fertig.“ mit Rückgängig („Wieder im Wagen“),
    zurück zur Übersicht „Einkauf“. Geteilter Einkauf: meldet „Eingekauft ✓“.
- **Mia merkt sich den Laden (A-041, `einkauf/merken`)**: jedes Abhaken auf
  einer Laden-Seite merkt Sache (Normalform) → Laden, Zähler, Datum, auch
  neben einer festen Regel (zählt für „Oft bei“). Eine neue Sache ohne Laden
  (Mia, ＋, Angebot) landet von selbst im gelernten Laden (`ladenHerkunft`:
  feste Regel → gewählter Laden → gelernt → ähnlicher Name). Anderer Laden
  beim Abhaken = neu gezählt (zuletzt gilt). Nie gemerkt: nur einmal und vor
  über 90 Tagen gekauft (verblasst still, `gilt`). Korrektur (Ergebnis-Karte,
  Fenster) gilt sofort und fürs nächste Mal (`ladenKorrigieren`; eine feste
  Regel zieht mit). Einstellungen → Mia → „Was ich mir gemerkt hab“: Gruppe
  „Wo du was kaufst“ („Tomaten → Rewe“, Löschen = `gelerntVergessen`). Das
  frühere „zweimal hintereinander, dann einmal fragen“ ist abgelöst.
- **Stellt sich vor**: beim ersten Öffnen der Einkaufsliste Mias Seiten-Tipp
  mit drei Zeilen („Ich merk mir, wo du was kaufst.“ / „Sag einfach ‚Tomaten
  auf die Liste‘, den Laden such ich aus.“ / „Abgehakt ist weg. Fürs Rezept
  leg ich dir Zutaten oben hin.“, Schlüssel `seite:einkaufsliste`, auch am
  Beispiel-Tag), auf der Laden-Seite einmal (siehe oben). Zurück über
  Einstellungen → Mia → „Tipps nochmal zeigen“ (`mia/denktmit/tipps.ts`).
- **Doppeltes zusammen (Nachtrag)**: gleiche Sache (`normalform`: Groß/klein,
  Einzahl/Mehrzahl, Umlaute; „Milch“ ≠ „Hafermilch“) im selben Laden = ein
  Eintrag. Mengen addiert, wenn die Einheiten passen („500 g“ + „250 g“ =
  „750 g“, „2“ + „1“ = „3“, „1 l“ + „500 ml“ = „1,5 l“), sonst beide
  („500 g + 1 Packung“); hat nur einer eine Menge, bleibt sie. Gilt beim
  Hinzufügen (`addManualItem`, Mia `add_shopping`, Rezept), in der Anzeige
  (`buildShoppingList`: Rezept-Zutaten untereinander und eigene Artikel zur
  Rezept-Zutat, `teile` – Abhaken und Löschen gelten für alle) und
  rückwirkend (v7). Abgehaktes bleibt für sich. Rückgängig nach einem
  zusammengefassten Hinzufügen nimmt nur die dazugekommene Menge heraus.
- **Rezeptmengen und Packungen (Nachtrag, seit A-040 nur noch Vorschlag)**:
  `einkaufsMenge` rundet auf übliche Packungen (Milch 1 l, Sahne 200 ml,
  Mehl/Zucker 1 kg, Butter 250 g, Parmesan/Käse Stück bzw. Packung,
  Nudeln/Lasagneplatten 500 g = „1 Packung“, Reis, Eier 6/10, Dosen …);
  Löffel, Prisen und unter 50 g/ml ergeben keine Packung. Auf der Liste
  steht das nie: die Packung ist nur der Vorschlag im Mengenfeld des
  Fensters (`packung`), die Rezeptmenge ein Hinweis dort („250 ml für
  Lasagne“). Gilt für Zutaten aus dem Plan, dem Rezept-Link, der Kochidee und
  dem Angebot; eigene Mengen der Nutzer bleiben immer, wie sie sind.
- **Kein eigener Einkaufsmodus mehr (Punkt 6)**: der Kreis gilt zu Hause und
  im Laden (ein Knopf „Bei Edeka einkaufen ›“ ist deshalb nicht nötig). Die Abteilungs-Reihenfolge (Laufweg) sortiert still im
  Hintergrund. Lernen bleibt still (`noteShopCheck` beim Abhaken).
- **Startseiten-Kachel (C2, bleibt)**: je Laden aus „Meine Läden“ eine Zeile
  (auch 0), Zeile = Laden-Seite, „n noch ohne Laden · Sortieren ›“ =
  „Einkauf“ am Bereich „Noch ohne Laden“ (`#ohne-laden`).
- **Beispiel-Tag**: Karten Edeka/Rewe/Lidl/Rossmann (`DEMO_SHOPS`) und zwei
  Chips „Noch ohne Laden“ (`DEMO_OHNE`: Spinat, Haferflocken), leise
  „Beispiel“; nur zum Anschauen (kein Link, kein Ziehen), nichts in echten
  Speichern.
- **Früher (bis v0.141)**: Wochen-Pfeile, Laden-Chip-Reihe, Einkaufsmodus „Bei
  REWE“, Abteilungs-Überschriften, Hinweiszeilen, Katalog „Mehr hinzufügen“,
  „Bald wieder fällig“, „Hast du bestimmt im Haus“ – siehe `docs/verlauf.md`.
- **Welche Woche**: Die Planungswoche beginnt am Einkaufstag (Profil
  `shoppingDay`, Standard Montag). „planning“ = ab 2 Tage vor dem nächsten
  Einkaufstag schon die nächste Woche (`planningWeekStart`). Im „···“ „Nächste Woche
  zeigen“ bzw. „Diese Woche zeigen“. Beim Kochstil „spontan“: immer die laufende
  Woche, ohne Artikel aus dem Plan (`manualOnly`), kein Umschalter; offene
  eigene Artikel früherer Wochen wandern mit (`carryOverManual`).
- **Aus dem Plan** (`buildShoppingList`, mit `angebot` nur als Angebot; Wochen vor `angebotAb` wie früher als Zeilen): Zutaten aller Gerichte der Woche
  (nicht an Ausflugs-/Pausetagen), Mengen je Einheitenfamilie addiert
  (g/kg, ml/l; 1500 g → „1,5 kg“), „doppelt kochen“ = ×2. Ein für den Tag
  umgerechnetes Gericht („heute nur zu zweit“) wird auf diese Personenzahl
  gerechnet; ein kleiner Haushalt (`isSmallHousehold`: Haushaltstyp
  single/paar) auf die Personen des Tages, aufgerundet (`roundSmall`; Backen
  bleibt ganz). Zutaten nur fürs lockere Wochenende heißen „optional“.
  Gerichte ohne Zutaten: „Ohne Zutaten: … – selbst ergänzen.“
- Angezeigter Name: „nur diesmal“ umbenannt → euer Produkt → Rezeptname.
- **Abteilungen im Laufweg** (`SECTION_WALK`, still im Hintergrund): Obst &
  Gemüse → Brot & Backwaren → Kühlregal → Fleisch & Fisch → Vorrat → Getränke
  → Tiefkühl → Sonstiges. Abteilung per Stichwort (`sectionFor`, Sonderfälle
  zuerst: „Kokosmilch“ ≠ Milch).
- **Bearbeiten** (`EditItemSheet`): Name, Menge (nur eigene), Laden (Chips
  „Egal“, alle Läden, „Neuer Laden“). Umbenannt → „Immer so?“ – „Ja, immer“
  speichert ein eigenes Produkt (Rezepte bleiben gleich), „Nur diesmal“
  gilt nur diese Woche.
- **Läden**: Vorschläge `SHOP_SUGGESTIONS` (Aldi, Lidl, Edeka, Rewe,
  Rossmann, dm, Wochenmarkt, Bäcker) + eigene (bis 30 Zeichen), Auswahl nach
  Nutzung sortiert (`SHOPS`). Fester Farbpunkt je Laden (`shopTone`: bekannte
  Läden fester Ton, sonst aus dem Namen; Tokens `--app-shop-1…8`), keine
  Logos.
- **Stammartikel** (`staples.ts`): Rhythmus fest oder gelernt (Median der
  Abstände ≥ 3 Tage zwischen Kauftagen). Fällig, wenn nie gekauft (fester
  Rhythmus) oder letzter Kauf + Rhythmus bis zur Wochenmitte erreicht und
  nicht schon auf der Liste. Fällige Stammartikel stehen seit vX nicht mehr als
  eigene Zeile auf der Seite; „···“ → „Stammliste“: Rhythmus („jede Woche“, „alle 2
  Wochen“, „· gelernt“), entfernen (mit Rückgängig), „Jede Woche“ hinzufügen.
- **Schnell-Eintrag** (`parseQuickAdd`): „Milch, Windeln und Müsli von
  Rossmann“ → Artikel mit Menge und Laden. Sicher erkannt (Lebensmittel,
  Abteilungs-Stichwort, Drogerie/Haushalt, eigene Produkte/Läden/Stammliste)
  → direkt auf die Liste, still (kein Rückgängig-Band, „Mach das
  rückgängig“ geht). Unsicheres als grauer Chip „Meintest du …?“ bzw. „„…“
  so lassen“ – nie automatisch korrigiert. Diktat über `useSpeechInput`,
  beim Absenden `reset()`. Das Fenster „Auf die Liste“ kommt vom Plus (Kachel,
  Essen-Reiter) und aus „Was möchtest du eintragen?“. „Tomaten und Gurke bei
  Rewe“ (ohne Komma): der Laden am Ende gilt für beide.
- **Teilen**: „···“ → „Liste teilen“ – offene Artikel als Text nach
  Abteilung (`shoppingListText`), über das Teilen-Menü, sonst in die
  Zwischenablage.
- **Jetzt-Karte** 15:00–19:30: „Auf dem Heimweg bei REWE?“ → Laden-Seite
  unterwegs (`&unterwegs=1`).
- **Familie Bescheid sagen** (Einkauf Teil 6, `src/lib/einkauf/unterwegs/`,
  `components/einkauf/unterwegs/BescheidAsk.tsx`): nur mit Konto. Beim ersten
  Einkauf (erstes Abhaken auf der Laden-Seite oder unterwegs geöffnet) einmal
  „Familie Bescheid sagen?“ [Ja, immer] [Nein] – gemerkt
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
  Liste war). „Einkauf fertig“ meldet „Eingekauft ✓ – 9 Sachen bei REWE“
  (`boughtCount`, jetzt über „Einkauf fertig“). Nur 7–20 Uhr, nie in der Pause; zählt nicht als proaktive
  Mitteilung. Auf der Jetzt-Karte der anderen leise „Felix ist gleich bei
  REWE“ (`newsFromDocs`).
- **Steh grad davor** (Clip „Einer sagt’s, alle wissen’s“): setzt jemand
  während eines geteilten Einkaufs etwas drauf, schickt der Server der
  Person im Laden „Lisa hat Milch auf die Liste gesetzt.“ mit Knopf „Steh
  grad davor“ (Service Worker → `/einkaufsliste?davor=<konto>|<sache>`,
  `davorFromLink`, `useDavorLink`); auf der Laden-Seite steht derselbe Knopf
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
  (der Laden wird beim Übernehmen gemerkt). „Tomaten und Gurke bei Rewe“ →
  beide Rewe. Modus „Einkauf“ (Einsprechen): Nachricht „[Einkauf] …“, die
  Beschreibung nennt die Regeln (nur Lebensmittel/Verbrauchsartikel,
  Korrekturen, Mengen, Doppeltes, nichts Falsches); Vorschau „Hab ich:“
  statt sofort (`useAskAssistant`: `!isEinkaufFrage`). Prüfstand: 12 Sätze
  „[Einkauf] …“ mit `anzahl`, `menge`, `nieName`.
- `laden_regel` (Op `set_shop_rule`, sofort mit Rückgängig: „Merk ich mir.
  Tomaten → Rewe.“, leerer Laden = Regel weg, Artikel bewusst „Egal wo“) und `laeden_anzeigen` („Was
  kauf ich wo?“) in `shoppingTools.ts`; Mia sieht Läden und Regeln im
  Kontext. Ohne KI dasselbe über `parseShopRule` bzw.
  `isShopOverviewQuestion` (`shopRuleRule` in `localRules.ts`).
- Mia legt eine Sache ohne Laden an: sie landet im gelernten Laden; die
  Ergebnis-Karte zeigt „● Rewe · wie immer ⌄“ (antippen = andere Läden,
  gemerkt), beim ersten Mal einmal „Hab Rewe genommen, wie letztes Mal.“
  (`ErgebnisLaden`, Einmal-Hinweis `einkauf-laden-gewaehlt`). Gesagter Laden =
  „● Rewe ⌄“. `einkaufsliste_anzeigen` nennt das Wochenplan-Angebot getrennt
  (`wochenplan_angebot`).
- `einkaufsliste_anzeigen`, `einkaufsliste_leeren` (Op `clear_shopping`:
  eigene weg, Rezept-Zutaten „haben wir“), `einkaufsliste_entfernen` (Op
  `remove_shopping`) in `homeTools.ts`. „Ich bin bei REWE“ mit KI über
  `app_befehl` → Laden-Seite unterwegs. Die KI sieht offene Artikel mit Laden („Milch (Rewe)“).
- Ohne KI (`useChatRules.ts`, `localRules.ts`, `homeChat.ts`): „Müsli von
  Rossmann und Windeln auf die Liste“ / „Wir brauchen Milch und Eier“
  (`isShoppingRequest`) → „Steht drauf ✓ …“ mit Rückgängig; „Wir nehmen immer
  Alsan statt Butter“ → eigenes Produkt; „Nimm Milch von der Liste“, „Leer
  die Einkaufsliste“, „Zeig mir die Einkaufsliste“; „Ich bin bei REWE“, „Ich
  geh zu Lidl einkaufen“, „Einkaufsmodus Aldi“ (`shopModeRequest`, nur
  bekannte Läden, kurze Sätze) → Laden-Seite unterwegs.
- Im Supermarkt („Lachs ist im Angebot“) legt „Auf die Liste“ Produkt und
  Zutaten als „Jetzt mitnehmen“ an (`useMarketChat.ts`, siehe Essen; auf der
  Seite stehen sie im jeweiligen Laden bzw. „Noch ohne Laden“).

## Tests

- `tests/einkauf/einsprechen.test.ts` – Einsprechen filtert (Füllwörter,
  Abbrüche, Korrekturen, Mengen, Doppeltes, Namen, „bei Rewe“), Live-Blase,
  „Hab ich:“, gemerkte Läden, „Weiter erzählen“, Meldung nach „Passt“, Modus
  „Einkauf“ (Bühne, KI zuerst, nie sofort), Testmodus, Prüfstand (≥ 10 Sätze).
- `tests/einkauf/aussuchen.test.ts` – Abschnitts-Reihenfolge, Drogerie zuletzt
  bzw. zuerst, „Beliebt“ ohne Verlauf, „Oft bei“, „Für eure Woche“ aus dem
  Plan, Suche, Haken/Punkt, Tipp (rein/umziehen/raus), Menge,
  Zusammenfassung, aktiver Laden, Ladenwechsel, kleben/springen, dunkle
  Leiste ohne Schwarz.
- `tests/einkauf/einkaufSeite.test.ts` – Seite (Knöpfe, Karten, aufgeräumt),
  Menü, gemeinsame Woche, Ziehen (250 ms, kein Scrollen, Rückgängig nimmt die
  Regel), „Mia sortiert“, Laden-Seite (Kreis, 2 s, Feld, kein Einkaufsmodus),
  Kachel-Sprünge, Beispiel-Tag.
- `tests/einkauf/merken.test.ts` – A-040/A-041: Abhaken (1 s, zurück, „Im
  Wagen“), Tomaten 2× bei Rewe → „wie immer“, Korrektur, 90-Tage-Regel, „Oft
  bei Rewe“, Löschen in den Einstellungen, Angebot („Alle dazu“, Salz blass,
  wofür im Fenster), nur Namen, Migration v7 → v8, Tipps je Stelle einmal +
  „Tipps nochmal zeigen“.
- `tests/einkauf/wagen.test.ts` – Laden leer (Satz, „Oft bei Edeka“, sonst
  Zuletzt gekauft/Beliebt, Tippen landet bei Edeka), Abhaken (1 s, 0,8 s,
  „Im Wagen“, nochmal tippen, noch nicht Im Haus), „Einkauf fertig“
  (Im Haus nur mit Baustein, Meldung, Rückgängig, `fertig`).
- `tests/einkauf/zusammen.test.ts` – Normalform, Mengen addieren, „Zucchini“
  zweimal = eins (Rückgängig nimmt nur das Dazugekommene), Mia, Migration
  v6 → v7 (kleinste Kennung, verschiedene Läden getrennt, Abgleich ohne
  Doppel-Löschung), Packungen, Plan ohne Krümel-Mengen mit Hinweis,
  Rezept-Zutat + eigener Artikel, Rezept-Link.
- `tests/einkauf/einsortieren.test.ts` – drei Zustände, Laden wählen + Rückgängig,
  „Mia sortiert“, nie raten, Oberfläche.
- `tests/einkauf/meineLaeden.test.ts`, `laedenRegeln.test.ts`,
  `schnellEintrag.test.ts`, `stammartikel.test.ts`, `laeden.test.ts`,
  `kacheln.test.ts`, `listeBauen.test.ts`, `listeBearbeiten.test.ts`,
  `unterwegs.test.ts` – wie bisher (Läden, Regeln, Lernen, Sätze, Rhythmus,
  „Ich bin bei REWE“, Jetzt-Karte, Mengen, Migration, Familie Bescheid sagen).
- `tests/heute/einkaufKachel.test.ts` – Kachel C2, Beispiel-Reihenfolge.
- Durchklick (iPhone 15 Pro und Pixel 7): `einsortieren`
  (`e2e/ablaeufe/einsortieren.mjs`: ＋ der Kachel → „Noch ohne Laden“, Chip →
  Fenster, „Mia sortiert“, echtes Touch-Ziehen per CDP auf eine Karte +
  Rückgängig, ohne Halten kein Einsortieren, Laden-Seite hakt ab →
  „Im Wagen“), `einkaufSeite`, `aussuchenLaeden`, `einsprechen`,
  `ladenLeer`, `imWagen`, `doppeltEins` (`e2e/ablaeufe/einkaufneu.mjs`),
  `wochenplanAngebot`, `ladenMerken`, `einkaufTipps` (`e2e/ablaeufe/einkaufnamen.mjs`), `laedenWaehlen`, `laedenSpaeter`
  (`laeden.mjs`), `einkauf`/`imHaus` (`essen.mjs`), `stammartikel`
  (`vorfuehren.mjs`), `familieTeilen`, `einkaufUnterwegs` (`konten.mjs`,
  Laden-Seite mit `&unterwegs=1`).
