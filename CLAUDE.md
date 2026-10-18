# Hinweise für Claude

## Leitbild

Bei allen Änderungen beachten.

"Was gibt's?" ist ein Küchenmanager, an den die Familie das Kochen-Organisieren
abgeben kann – wie an eine Haushaltskraft, mit der man ganz natürlich spricht.

1. Gespräch zuerst: Der Küchenhelfer (Sprache/Chat) ist der Hauptweg. Jede
   Funktion soll auch per Gespräch erreichbar sein; Bildschirme dienen zum
   Nachschauen und Feinjustieren, nie als Pflicht.
2. Proaktiv: Der Küchenhelfer meldet sich selbst, wenn etwas ansteht
   (Morgen-Check, Einkauf, Planung, Frische).
3. Kleine Dinge selbst lösen, große vorschlagen: Ersatz für Nebenzutaten selbst
   anbieten; Änderungen am Plan immer als Vorschau mit "Übernehmen".
4. Kennt die Familie: Profil, Vorlieben und bisherige Entscheidungen immer
   berücksichtigen; nie zweimal dasselbe fragen.
5. Ton: kurz, warm, natürlich, Deutsch, etwas Humor, keine Fachbegriffe.
6. Einfachheit vor Vollständigkeit: lieber eine Frage mit 2–3 Knöpfen als ein
   Formular.
7. Lernt mit: Vorlieben (Lieblingszutaten, Basen, 👍/👎) aus Bewertungen,
   Gekochtem, gewählten Vorschlägen und dem Gespräch merken und nutzen –
   Neues bleibt "neu, aber nicht fremd". Alles Gelernte ist einsehbar und
   änderbar.
8. Gesundheit sanft: Tipps nur laut Einstellung (aus / ab und zu = max. 1 pro
   Woche / gern öfter = max. 3), immer als konkreter, freiwilliger Tausch mit
   "Ausprobieren" (nur für dieses Rezept), gern Lob für Gutes. Grundlage:
   allgemein anerkannte Empfehlungen (z. B. DGE: mehr Gemüse, Hülsenfrüchte,
   Vollkorn; weniger Zucker, Salz, verarbeitetes Fleisch) – keine Trends oder
   Heilversprechen. Nie zum Cheat Day oder Wunschessen, nie über Körper,
   Gewicht oder Kalorien, nie belehrend, nie als Pop-up.

@AGENTS.md

## Arbeitsweise

- Nach jeder fertigen Änderung ohne Rückfrage: testen (`npm run build`,
  `npx tsc --noEmit`, `npm run lint`, bei UI-Änderungen zusätzlich ein
  Durchklick-Test im mobilen Browser), committen, Pull Request nach `main`
  erstellen und direkt mergen.
- Sprache der App und der Antworten: Deutsch.
- Gespeicherte Profile müssen bei Datenmodell-Änderungen weiter funktionieren
  (Version in `src/lib/profile.ts` erhöhen, `migrateProfile` erweitern).

## Design-System

- Tokens in `src/app/globals.css` (`@theme`): `bg-background` (warmes
  Off-White), `bg-surface` (weiß), `border-line`, `text-ink`, `text-muted`,
  Akzent `bg-accent`/`text-accent`/`text-accent-strong`/`bg-accent-soft`,
  `rounded-card`, `shadow-card`. Keine `orange-*`-Klassen direkt, keine
  weiteren Farben für Flächen.
- Bausteine in `src/components/ui`: `CARD`/`CARD_LIST`/`<Card>`,
  `buttonClass()`/`<Button>` (primary, secondary, soft, ghost, danger; sm/md/lg),
  `ICON_BUTTON`, `chipClass()`, `tileClass()`, `INPUT`, `LABEL`,
  `SECTION_TITLE`, `SUBTLE`, `NOTE`, `WARNING`, `PAGE_MAIN` (unten Platz für den
  Küchenhelfer-Knopf, `FAB_CLEARANCE` – jedes `<main>` mit Knopf braucht ihn,
  auch über `StickyActions`, damit am Seitenende nichts unter dem Knopf liegt), `INPUT_BASE`, `<ListRow>` (Icon links, Titel +
  Untertitel, Pfeil rechts), `<IconBadge>`, `<CategoryChip>`/`<CategoryDot>`.
  Neue Seiten nur daraus bauen; fehlt etwas, dort ergänzen.
- Nur EINE Akzentfarbe (Orange) für Buttons, aktive Zustände und Logo. Karten
  weiß mit feinem Rahmen und leisem Schatten, keine farbigen Kachel-Flächen.
  Kategorien nur als kleiner farbiger Punkt (`CATEGORY_DOT`). Rot nur für
  Allergien/Löschen.
- Icons: `lucide-react`, Akzentfarbe oder Grau, Strichstärke 2. Emojis nur
  für Spaß-Momente (Wunschtag, Cheat Day, Willkommen).
- Typografie: Seitentitel 26px extrabold (`PageHeader`), Abschnitte
  `text-lg font-bold`, Text `text-base`, Untertitel `text-sm text-muted`.
  Abstände im 8er-Raster (gap-2/3/4, p-4/p-5), Seitenrand 16px.
- Unterseiten: `PageHeader` (Zurück-Pfeil + Titel), Inhalt in `PAGE_MAIN`,
  Fuß-Buttons über `StickyActions` (`PRIMARY_BUTTON`/`SECONDARY_BUTTON`).
- App-Icon: weißer Kochtopf mit drei Dampfwölkchen auf Orange. Einzige Quelle
  `scripts/generate-icons.mjs` (`npm run icons` erzeugt icon.svg, PNGs,
  maskable, apple-touch-icon, favicon.ico). In der App `AppIcon`/`AppLogo`
  (`src/components/AppLogo.tsx`): Startseite Icon 44px + Schriftzug,
  Unterseiten 32px oben rechts im `PageHeader` als Link "Zur Startseite".
- Startseite: Logo, Gruß, Karte "Heute" (Hauptgericht groß, darunter klein die
  zweite Mahlzeit: "Reste von …" oder Link "Schnelle Idee? → Was ist noch da?";
  `src/components/home/TodayCard.tsx`), Wochen-Check-Karte, Bereiche als
  `ListRow`-Liste, Haushalts-Zeile.

## Produktentscheidungen

- Erstes Kennenlernen als Gespräch (`/profil` ohne Profil → `OnboardingChat`,
  Vollbild im Stil des Küchenhelfer-Panels). Ablauf rein in
  `src/lib/onboarding/engine.ts` (Begrüßung, Name/Stimme der Küchenhilfe,
  Familienname, "Wer isst bei euch mit?", Namen bestätigen mit antippbaren
  Chips und Schreibvarianten aus `names.ts`, pro Person "Erzähl mir kurz was
  über …" – nachgefragt wird nur Pflicht: Rolle, bei Kindern Gruppe –,
  Allergien/Abneigungen, warme Mahlzeit, Einkaufstag, Standardwoche,
  Abschluss mit Zusammenfassung und "Erste Woche planen"/"Erstmal umschauen").
  Antworten per Sprache, Tippen oder Chips; jede Frage hat "Überspringen"
  (sinnvolle Standardwerte). Bestätigungen ("Notiert ✓ …") und die
  aufklappbare Familienkarte sind antippbar → Frage nochmal (`revisit`), danach
  geht's an der alten Stelle weiter. Zwischenstand unter `wasgibts.kennenlernen`
  (`progress.ts`) nach jeder Antwort, beim Abschluss gelöscht. Erkennung freier
  Antworten: Regeln in `recognize.ts` (Füllwörter, Namen, Alter, Gruppe,
  Mittag, Allergien …); mit `ANTHROPIC_API_KEY` vorher Claude über
  `/api/kennenlernen` (`ai.ts`, festes JSON-Schema je Art names/person/diet,
  geprüft, Modell `KENNENLERNEN_MODEL`, Standard `claude-haiku-5-5`) – Client
  `recognizeAnswer()` in `recognizer.ts` ist austauschbar und fällt bei Fehlern
  auf die Regeln zurück. Die Oberfläche (`GuidedChat`) nutzt auch der
  Küchenhelfer: "X wohnt jetzt bei uns" o. ä. (`isAddPersonRequest`) startet
  dort `startAddPerson()` – Namen bestätigen, kurz vorstellen, "Fertig ✓"
  speichert (geht auch ohne KI).
- "Lieber Formular" öffnet den bisherigen Assistenten (8 Schritte) mit dem
  bisher Erzählten als Startwert. Der Assistent wird nur beim ersten Anlegen verwendet. Danach
  zeigt `/profil` die Übersicht "Unsere Familie"; Personen und Bereiche werden
  dort einzeln bearbeitet (eigene Seiten unter `/profil/...`).
- Im Assistenten werden Namen nur in Schritt 2 "Wie heißen alle?" eingegeben;
  spätere Schritte zeigen sie nur an. Schritt 1 muss ohne Scrollen aufs iPhone
  passen.
- Grundregel im Assistenten: Ist ein Schritt länger als der Bildschirm und noch
  nicht bis unten gescrollt, scrollt "Weiter" erst zum nächsten offenen
  Abschnitt (`src/lib/stepScroll.ts`). Wischen links = Weiter, rechts = Zurück
  (nicht in Eingabefeldern und Elementen mit `data-no-swipe`).
- Personen-Schritte im Assistenten (Allergien, Mittagessen) beginnen mit einer
  Vorfrage ("Nein, alle essen alles" bzw. "Passt so – alle wie üblich" oder
  Personen auswählen). Nur ausgewählte Personen bekommen eine Einzelseite mit
  Personen-Leiste; "Doch nichts – überspringen" setzt sie zurück. Mittagessen
  "wie üblich" = `usualLunch()`: Erwachsene zu Hause, Kita-/Schulkinder
  auswärts, Kleinkinder zu Hause.
- Planungswoche = 7 Tage ab dem Einkaufstag (Profil `shoppingDay`, Standard
  Montag). Wochen werden unter dem Datum ihres ersten Tags gespeichert; nach
  einem Wechsel des Einkaufstags findet `resolveWeekKey()` die überlappende
  alte Woche. Datumslogik zentral in `src/lib/weekPlan.ts`
  (`weekStartFor`, `planningWeekStart`, `weekDayNames`).
- "Standardwoche" (früher "Wochenregeln") ist die Vorlage im Profil. Der
  Wochen-Check (`/woche/check`, optional `?woche=`) übernimmt sie als Startwert
  und speichert Vorgaben pro Woche separat. Startseiten-Karte: bis 2 Tage vor
  dem nächsten Einkaufstag "Diese Woche planen" (mit Vorgaben ausgeblendet),
  danach "Nächste Woche planen" bzw. "Nächste Woche steht ✓".
- Startseite: Kachel "Was ist noch da?" (Route bleibt `/schnellkueche`).
  Untertitel von Wochenplan, Einkaufsliste und Kochbuch sind dynamisch.
- Es wird genau EIN Hauptgericht pro Tag geplant. Profil `warmMeal`
  ("Wann esst ihr meistens zusammen warm?", Profil v6): mittags oder abends,
  getrennt für Mo–Fr und Sa–So – bestimmt nur Anzeige und Personenzahl
  (`mainMealTime`, `mainMealHeadcount`: mittags unter der Woche nur, wer dann
  zu Hause ist), nicht die Anzahl der Plätze.
- Wunschtag: in der Standardwoche einstellbar (Tag, Mindestalter).
  Teilnahme ab Mindestalter, ohne Alter Schul-/Kitakinder ja, Kleinkinder nein.
  Reihum in `wishDay.order`; wer dran ist, ergibt sich aus der letzten
  gespeicherten Woche mit Wunsch. Der Wunschtag belegt einen Kochtag und zählt
  nicht bei Fleisch/Veggie/Fisch.
- Kochbuch (`/kochbuch`, `src/lib/cookbook.ts`): Rezepte mit Kategorie
  Fleisch/Vegetarisch/Fisch/Cheat Day, Herkunft "eigenes" oder "ki".
  KI-Rezepte später über `saveAiRecipe()` direkt (als Favorit) übernehmen.
  Feste Gerichte im Wochen-Check zählen in ihre Kategorie (Zähler kann nicht
  darunter sinken); ein Cheat-Day-Rezept setzt den Cheat Day auf diesen Tag.
- Wochenplan (`/wochenplan`, `src/lib/mealPlan.ts`, Oberfläche
  `src/components/plan/`): Umschalter "Tag" (Standard) / "Woche"
  (`Segmented`), darunter eine schmale Zusammenfassung (x/7 geplant,
  Kategorien, ~Kosten von Budget). Tag-Ansicht: Tagesleiste (7 Tage ab
  Einkaufstag, gewählter Tag in Akzentfarbe, Kategorie-Punkt: Veggie grün,
  Fleisch rot, Fisch blau, Cheat Day orange, leer grau), große Karte
  (`DayCard`: Emoji auf Akzent-Verlauf als Platzhalter fürs Rezeptbild
  (`dishEmoji`), "WOCHENTAG · MAHLZEIT", Name, Chips Kategorie/Zeit/Personen/
  ~Kosten (`estimateCost` in `src/lib/costs.ts`, grobe Richtwerte),
  "Tauschen"/"Rezept", "…" für doppelt kochen/verschieben/löschen; leer
  "+ Planen"; Ausflug, Wunschtag, Cheat Day eigen gestaltet), seitlich
  wischen wechselt den Tag, darunter "Danach" (nächste 2 Tage). Woche-Ansicht
  (`WeekListView`): eine Zeile pro Tag, Gerichte am Griff ziehen (Pointer
  Events, auch Touch) = tauschen, Tippen öffnet den Tag. Zurückblättern bis
  26 Wochen = Rückblick (nur lesen, "Nochmal kochen" setzt das Gericht auf
  einen Tag dieser/nächster Woche). Lieblingswochen (`src/lib/templates.ts`,
  `wasgibts.vorlagen`): "Vorlage speichern" (Name, je Wochentag Rezept/
  Freitext) und "Vorlage laden" (Tage abwählbar, belegte Tage: "Überschreiben"
  oder "Nur freie Tage"). `buildWeek()`/`composeWeek()` setzen Plätze,
  feste Gerichte, Wunsch, Ausflugstage und Cheat Day aus dem Wochen-Check
  zusammen (Speicher v3, Schlüssel = Wochentag, Notiz unter "Tag:notiz",
  "doppelt" am Eintrag). Gespeichert werden nur eigene Einträge und
  Überschreibungen ("cleared"). Die Kategorie eines Eintrags kommt immer vom
  Gericht, nie vom Kategorie-Hinweis des Platzes.
- Einkaufsliste (`/einkaufsliste`, `src/lib/shoppingList.ts` Speicher v4,
  Oberfläche `src/components/shopping/`): Artikel aus Rezepten im Wochenplan
  werden immer neu berechnet (`buildShoppingList`, Mengen je Einheitenfamilie
  addiert, doppelt kochen ×2, Abteilung per Stichwort). Je Artikel nur
  Häkchen, Name, Menge rechtsbündig; Info-Symbol oder langes Drücken zeigt
  die Gerichte. Abteilungen als kleine Großbuchstaben-Überschrift mit Icon,
  Artikel in einer weißen Karte; Abgehaktes durchgestrichen ans Ende, ganz
  erledigte Abteilung zugeklappt. Oben Fortschrittsbalken, "Heute holen"
  (offene Artikel für heute/morgen) und fällige Stammartikel. Wischen nach
  links (`SwipeRow`): "Haben wir" bzw. "Löschen" und "Bearbeiten". Umschalter
  "Nach Abteilung | Nach Laden", Teilen gesamt oder pro Laden.
  Gespeichert je Woche: eigene Artikel, Häkchen, "Haben wir schon",
  einmalige Umbenennungen, übersprungene Stammartikel. Für den Haushalt:
  eigene Produkte (`products`: Zutat → Produkt, aus "Immer so?" beim
  Umbenennen oder Chat "Wir nehmen immer Alsan statt Butter"; Rezepte bleiben
  unverändert; Verwaltung `/profil/produkte` "Eure Produkte & Läden"),
  Läden je Artikel (`itemShops`, Vorschläge `SHOP_SUGGESTIONS` + eigene),
  Stammliste (`staples`: Kaufrhythmus gelernt aus abgehakten Artikeln,
  Median der Abstände; die frühere "Immer da"-Liste wurde zu Stammartikeln
  mit festem Wochenrhythmus migriert; fällig = Vorschlag, antippen =
  übernehmen, wischen/× = diesmal nicht). Chat/Sprache: "Müsli von Rossmann
  und Windeln auf die Liste" (`src/lib/shoppingParse.ts`) wird ohne KI
  erkannt (Artikel, Menge, Laden) und in die Planungswoche einsortiert.
  Standard-Woche und Kachel-Zähler: die Woche, für die gerade eingekauft wird
  (`planningWeekStart`).
- Migrationen: `createLocalStore` schreibt einen migrierten Stand einmalig
  zurück, wenn sich die Version geändert hat.
- "Was ist noch da?" läuft über den Küchenhelfer: Die Startseiten-Kachel
  (und "Schnelle Idee?" in der Heute-Karte) öffnet das Panel im Reste-Modus
  (`openHelper("reste")`, `src/lib/assistant/open.ts`; `ChatState.reste`)
  mit "Was ist noch da? Erzähl einfach." Gesagtes zerlegt `parseLeftovers()`
  (`src/lib/leftovers/parser.ts`, austauschbar; Füllwörter, Zahlwörter,
  Einheiten, unscharfer Abgleich mit `foods.ts`); erkannte Zutaten erscheinen
  als Chips und landen im Vorrat (`wasgibts.vorrat`, `src/lib/pantry.ts`,
  gleiche Zutaten werden zusammengezählt), Unbekanntes als grauer Chip
  "Meintest du …?". Danach die Basis-Frage, dann 3 Vorschläge: mit KI über
  den normalen Chat (Reste + Basis als Nachricht), ohne KI Kochbuch-Treffer
  (`leftoverIdeas()` in `src/lib/leftovers/suggest.ts`: `matchRecipes()`,
  gefiltert nach Basis, ohne "Nie wieder", Beliebtes zuerst). Die Seite
  `/schnellkueche` ist nur noch die Übersicht "Noch da" (ändern/löschen) mit
  Knopf "Mit <Name> kochen" – kein eigenes Mikrofon.
- Basis (`src/lib/bases.ts`): Kartoffeln, Reis, Nudeln, Quinoa/Couscous, Brot,
  Salat oder "Egal". Gefragt bei Reste-Ideen und neuen Rezeptvorschlägen
  (KI fragt laut System-Prompt; fragt sie nach der "Basis", zeigt das Panel
  die Chips). Chips nach Beliebtheit (Profil v8 `bases`: Zähler je Basis,
  erhöht bei Wahl und bei 👍 über `recipeBase()`), im Profil unter
  Essgewohnheiten "Eure Lieblings-Basen" (`/profil/basen`) bearbeitbar.
- Küchenstil (Profil-Abschnitt): "Das mögt ihr", Lieblings-Basen,
  Gesundheits-Tipps, Nie wieder.
- "Das mögt ihr" (`src/lib/likes.ts`, Profil v9 `likes` gewichtet,
  `likesBlocked`): gelernt aus 👍 (+2), "Gekocht" im Rezept (+1), gewählten
  Vorschlägen (Reste-Idee angetippt, KI-Vorschlag übernommen: +1) und Sätzen
  im Chat ("wir lieben Käse", "Paprika geht immer": +3, `extractLikeStatements`;
  reine Aussagen beantwortet die App selbst mit "Gemerkt ✓ …"). Nur bekannte
  Lebensmittel, ohne Grundzutaten, Basen, Allergien und "mag nicht".
  `/profil/das-moegt-ihr`: Chips mit Stufe (♥–♥♥♥), entfernen (wird dann nicht
  wieder gelernt) und ergänzen. Geht an die KI: bevorzugt einbauen, auch in
  Entdecker-Rezepten ("neu, aber nicht fremd").
- Gesundheits-Tipps (`src/lib/healthTips.ts`, Profil v9 `healthTips`, Standard
  "ab und zu"; Einstellung `/profil/gesundheit`): regelbasierte Tausch-Ideen
  (`SWAPS`: halbe Sahne → Joghurt, Vollkornnudeln halb/halb, Naturreis, Hack
  zu einem Drittel → rote Linsen, halbe Menge Wurst/Speck + Paprika, weniger
  Zucker, Vollkornbrot) für geplante Rezepte ab heute – nie Cheat Day,
  Wunschessen oder bei Allergie-Konflikt. Hinweis des Tages (Sprechblase
  "Kleiner Tipp für …") und im Chat (`TipBubble`: "Ausprobieren" ändert nur
  dieses Rezept, Notiz "🌱 Ausprobiert", mit "Rückgängig"; "Nein danke").
  Wochenlimit über `wasgibts.tipps` (gezeigte Tipps je Woche, erledigte
  kommen nicht wieder). Lob zum Wochenrückblick (`weekPraise`, ab dem
  vorletzten Tag der Planungswoche, z. B. "Diese Woche 5 Gemüsetage – stark!
  💪"). Die KI bekommt Einstellung, Zahl der Tipps dieser Woche und die
  Regeln (Systemanweisung).
- Bewerten nach dem Kochen (`src/lib/ratings.ts`, Speicher
  `wasgibts.bewertungen` je Kochtag): Am Kochtag ab 19 Uhr (bzw. 14 Uhr bei
  "mittags") oder beim nächsten Öffnen (bis 2 Tage zurück) fragt die Karte
  auf der Startseite (`RatingCard`, auch als Sprechblase) "Wie war …?".
  👍: Zähler hoch, KI-Rezept wird Favorit, Basis-Statistik. 👎: Grund per
  Chip ("zu scharf", "zu aufwendig", "Kinder mögen's nicht", "schmeckt
  nicht") oder Freitext → Profil `neverAgain` (Titel, Hauptzutaten, Grund,
  Kopie des Rezepts), Rezept raus aus dem Kochbuch, künftige Plätze mit dem
  Gericht werden geleert. "Haben wir nicht gekocht" fragt nicht mehr. Die
  "Nie wieder"-Liste geht immer an die KI (`prompt.ts`, mit Anweisung: diese
  und sehr ähnliche Gerichte nie, Gründe beachten); `rezept_erstellen` und
  freie Gerichte lehnen Einträge der Liste ab (`isNeverAgain`). Einsehbar
  und einzeln wiederherstellbar unter `/profil/nie-wieder`.
- Küchenhelfer (KI, `src/lib/assistant/`, API `/api/kuechenhelfer`): schwebender
  Knopf auf allen Seiten (`KitchenHelper` im Layout, über `StickyActions`,
  bei offener Tastatur ausgeblendet), Panel mit Chat, Mikrofon
  (`useSpeechInput`, Fallback Tastatur-Diktat) und optionalem Vorlesen.
  Die App schickt einen Daten-Schnappschuss mit; der Server führt die
  Claude-Tool-Schleife aus (`engine.ts`, Werkzeuge in `tools.ts` – je Tag ein
  Hauptgericht, inkl. "doppelt kochen", Modell
  `KUECHENHELFER_MODEL`, Standard `claude-sonnet-5-5`). Schreib-Werkzeuge ändern
  nichts, sie liefern `ChangeOp`s (`ops.ts`). Vorschau (`preview.ts`) und
  Übernehmen rechnen mit denselben reinen Funktionen (`applyOps`); Übernehmen
  ersetzt die Speicherstände, "Rückgängig" (10 s) stellt sie wieder her.
  Einzelne Änderungen abwählbar; "Anpassen" schickt den offenen Vorschlag mit
  (`pending`). Neue KI-Rezepte prüfen Allergien/"mag nicht" strikt (`diet.ts`).
  Ohne `ANTHROPIC_API_KEY`: Hinweis "KI noch nicht eingerichtet";
  `KUECHENHELFER_MOCK=1` = Testmodus (`mock.ts`, nutzt dieselben Werkzeuge).
  Daten-Module importieren React nur über `useExternalStore.ts`, damit der
  Server ihre reine Logik nutzen kann.
- Küchenhelfer hat Namen und Gesicht (Profil v7 `helper`): Name Lotte, Ida,
  Theo, Bruno oder eigener (max. 20 Zeichen, Standard Lotte), Stimme
  weiblich/männlich (bei Vorschlägen passend zum Namen; `pickVoice()` wählt
  eine passende deutsche Systemstimme, sonst Standard). Einstellbar im
  Kennenlernen (erste Frage), im Assistenten (letzter Schritt) und unter `/profil/kuechenhelfer`. Knopf mit
  Topf-Gesicht (`HelperAvatar`); Anrede `helperTitle()`: "deine
  Küchenhelferin" bei weiblicher, "dein Küchenhelfer" bei männlicher Stimme, nur auf der Startseite einmal pro App-Start
  eine Sprechblase ("Frag Lotte" bzw. aktueller Hinweis aus `useHelperHint`,
  z. B. "Lotte: Für morgen fehlt Sahne"), klappt nach 5 s oder beim Scrollen
  zu. Panel-Kopf: Avatar, Name, `helperTitle()`; erste Nachricht
  "Hi, ich bin <Name> – was steht an?". Mitteilungen im Namen des
  Küchenhelfers (auch künftige Push) immer über `helperMessage()` →
  "<Name>: …". Die KI bekommt Name, Familie und Ton aus dem Leitbild
  (`identityPrompt()`).
