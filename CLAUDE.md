# Hinweise für Claude

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
  Küchenhelfer-Knopf, `FAB_CLEARANCE`), `INPUT_BASE`, `<ListRow>` (Icon links, Titel +
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

- Der Assistent (7 Schritte) wird nur beim ersten Anlegen verwendet. Danach
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
- Wochenplan (`/wochenplan`, `src/lib/mealPlan.ts`): aktuelle und nächste
  Woche, je Tag ein Platz "Hauptgericht" (Speicher v3, Schlüssel = Wochentag;
  Notiz am Tag unter "Tag:notiz" – dorthin hat die Migration das frühere
  zweite Gericht gelegt). `buildWeek()`/`composeWeek()` setzen feste Gerichte,
  Wunsch, Ausflugstage und Cheat Day aus dem Wochen-Check zusammen und
  verteilen Kategorie-Hinweise auf freie Tage. "Doppelt kochen – Reste für
  morgen" (`double` am Eintrag) verdoppelt die Mengen in der Einkaufsliste und
  zeigt am Folgetag "Zweite Mahlzeit: Reste von …" (auch über die Wochengrenze,
  `composeWeek`). Gespeichert werden nur
  eigene Einträge und Überschreibungen ("cleared") – der Wochen-Check bleibt
  unverändert. Die Kachel "Wochenplan" führt hierher, nicht zum Wochen-Check.
  Die Kategorie eines Eintrags kommt immer vom Gericht (Rezept bzw. beim
  Selbst-Eintragen gewählt oder per `guessDishCategory()` erkannt), nie vom
  Kategorie-Hinweis des Platzes; ohne Kategorie wird keine angezeigt.
- Einkaufsliste (`/einkaufsliste`, `src/lib/shoppingList.ts`): Artikel aus
  Rezepten im Wochenplan werden immer neu berechnet (`buildShoppingList`,
  Mengen je Einheitenfamilie g/kg, ml/l addiert, Abteilung per Stichwort).
  Gespeichert pro Woche nur eigene Artikel, Häkchen und "Haben wir schon"
  (Schlüssel Zutat + Einheit). Standard-Woche und Kachel-Zähler: die Woche,
  für die gerade eingekauft wird (`planningWeekStart`). "Immer da"-Basics
  (Brot, Aufschnitt, Joghurt, Obst …, Speicher v3 `basics`, null =
  Standardliste) kommen jede Woche automatisch dazu, frei bearbeitbar und
  einzeln abschaltbar.
- Migrationen: `createLocalStore` schreibt einen migrierten Stand einmalig
  zurück, wenn sich die Version geändert hat.
- "Was ist noch da?" (`/schnellkueche`, `src/lib/pantry.ts`): Vorrat unter
  `wasgibts.vorrat` mit Datum. Spracheingabe (Web Speech API, de-DE) oder Text.
  Zerlegen über die austauschbare Schnittstelle `parseLeftovers()` in
  `src/lib/leftovers/parser.ts` (heute regelbasiert in `ruleParser.ts`, später
  KI – nur dort umstellen): Füllwörter raus, Zahlwörter → Ziffern, Einheiten,
  Abgleich mit der Lebensmittel-Liste `foods.ts` (unscharf, korrigiert
  Schreibweise). Unbekanntes wird als grauer Chip "Meintest du …?" nachgefragt
  (nicht gespeichert, bis übernommen). Gleiche Zutaten werden zusammengezählt
  (2 Karotten + 1 Karotte = 3 Karotten). Fehlermeldung der Spracheingabe nur
  bei echtem Fehler (nicht nach selbst Beenden oder wenn schon Text kam). Treffer aus dem
  Kochbuch über `matchRecipes()` (Synonyme, Grundzutaten wie Salz fehlen nie).
  Personenzahl vorausgefüllt (vor 15 Uhr werktags Mittagsrunde, sonst alle).
  KI-Ideen-Button ist vorerst deaktiviert ("kommt bald").
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
