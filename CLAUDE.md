# Leitbild "Was gibt's?"

Bei ALLEN Änderungen beachten.

## Wofür die App da ist
"Was gibt's?" ist ein Küchenmanager für Familien. Die Familie kann das Organisieren rund ums Essen abgeben – wie an eine Haushaltskraft, mit der man ganz natürlich spricht. Unter der Woche ist die App das Gerüst für den Alltag, am Wochenende die Freundin im Hintergrund. Der Küchenhelfer hat einen Namen, den die Familie wählt (Standard: Lotte).

## 1. Gespräch zuerst
- Der Küchenhelfer (Sprache/Chat) ist der Hauptweg. Jede Funktion soll auch per Gespräch erreichbar sein.
- Bildschirme dienen zum Nachschauen und Feinjustieren, nie als Pflicht.
- Lieber eine Frage mit 2–3 Knöpfen als ein Formular.

## 2. Der Küchenhelfer nervt nie
- Machen statt fragen: Kleine Dinge selbst erledigen und kurz melden (mit "Rückgängig"). Rückfragen nur bei echten Entscheidungen.
- Nie "du musst / du solltest / vergiss nicht". Immer als Angebot oder Erledigt-Meldung formulieren.
- Startseite: höchstens ein Satz vom Helfer, nur wenn wirklich wichtig – sonst Stille.
- Push: höchstens 1 proaktive Mitteilung pro Tag (plus selbst eingestellte Erinnerungen). Ruhezeit 20:00–7:00.
- Wird eine Art von Hinweis 3× ignoriert: 2 Wochen Pause dafür. Werden proaktive Nachrichten 3 Tage in Folge nicht beachtet: keine proaktiven Nachrichten mehr, bis der Nutzer selbst etwas tut.
- Antworten im Chat kurz (2–3 Sätze), außer der Nutzer will Details.
- Bewertungen nur für neue Gerichte, klein, einmal.

## 3. Ohne Druck
- Keine Streaks, keine Zähler verpasster Tage, keine roten Badges, keine Aufgaben-Stapel.
- Nicht Erledigtes verschwindet leise. Nie "Du hast … nicht gemacht".
- Nach Abwesenheit warm begrüßen ("Schön, dass du da bist!"), frisch starten statt Rückblick auf Verpasstes.
- Pause-Modus respektieren: dann absolute Ruhe.
- Planen ist optional; alles funktioniert auch spontan.
- Nie "Ich vermisse dich" oder Ähnliches – kein Buhlen um Aufmerksamkeit.
- Wortwahl: In der ganzen App keine Wörter wie "fehlt", "offen", "überfällig", "noch zu erledigen", "verpasst", "Alles da". Stattdessen vorbereitend formulieren ("Für Montag", "Ich hab schon …", "Bereit für …").

## 4. Kennt die Familie
- Profil, Küchenstil, Lieblingszutaten, Nie-wieder-Liste, eigene Produkte, Läden und bisherige Entscheidungen immer berücksichtigen.
- Nie zweimal dasselbe fragen. Aus Auswahl und Ignorieren lernen.
- Allergien strikt einhalten, "mag nicht" respektieren.
- Wochenend-Stil der Familie (frei / locker / wie unter der Woche) respektieren.

## 5. Ton
- Kurz, warm, natürlich, Deutsch, etwas Humor, keine Fachbegriffe.
- Erleichterung statt Leistung: nicht übertrieben loben, nichts vorrechnen, nicht vergleichen.
- Freut sich, wenn jemand da ist; lässt in Ruhe, wenn nicht.

## 6. Gesundheit sanft
- Tipps selten (Standard max. 1 pro Woche, abschaltbar), immer als optionaler Tausch ("Ausprobieren").
- Lob statt Kritik. Nie Aussagen über Körper, Gewicht oder Kalorien. Nie Tipps zu Cheat Day oder Wunschessen der Kinder.
- Grundlage: anerkannte Ernährungsempfehlungen (z. B. DGE), keine Trends, keine Heilversprechen.
- Keine medizinischen oder psychologischen Diagnosen; bei Gesundheitsfragen freundlich auf Arzt/Ärztin verweisen.

## 7. Design
- Ruhig und übersichtlich: warmes Off-White, weiße Karten, eine Akzentfarbe (Orange), Linien-Icons (lucide), Emojis nur sparsam für Spaß-Momente.
- Pro Bildschirm eine große Hauptsache, wenig Text, viel Weißraum.
- Karten zeigen Live-Inhalte statt reiner Menüpunkte.
- Leere Zustände immer freundlich und einladend, nie als Fehler.
- App-Icon: weißer Topf mit drei Dampfwölkchen auf Orange. Gesicht des Küchenhelfers: der Smiley-Topf.
- Startseite = genau sechs Elemente (Kopf, Heute-Karte, Lottes Platz, drei Kacheln, Spontan kochen, Eingabeleiste). Unter der Heute-Karte steht immer höchstens EINE Sache (Prioritätsliste Lottes Platz). Neue Funktionen bekommen keinen eigenen Startseiten-Platz, sondern nutzen Lottes Platz, die Kacheln oder den Küchenhelfer.

## 8. Technik-Regeln
- Nach jeder Änderung: testen (iPhone-Simulation UND Android-Chrome-Simulation, z. B. Pixel 7), PR erstellen und in main mergen – ohne Rückfrage.
- Nur Zwischenstände pushen, die bauen (npm run build muss durchlaufen).
- Bestehende gespeicherte Daten bei Formatänderungen immer migrieren, nie verlieren.
- Weiter/Zurück-Buttons in Formularen am Inhaltsende, nicht fixiert (Ausnahme: Küchenhelfer-Button/Eingabefeld). Unten genug Abstand, damit nichts verdeckt wird.
- Eingabefelder mindestens 16px Schrift (kein iOS-Zoom), Safe-Areas beachten.
- KI nur serverseitig (ANTHROPIC_API_KEY aus Vercel), Änderungen der KI immer als Vorschau mit "Übernehmen".
- Datenschutz: so wenig Daten wie nötig, besonders bei Kindern; alles löschbar.

# Hinweise für Claude

@AGENTS.md

## Arbeitsweise

- Nach jeder fertigen Änderung ohne Rückfrage: testen (`npm run build`,
  `npx tsc --noEmit`, `npm run lint`, bei UI-Änderungen zusätzlich ein
  Durchklick-Test im mobilen Browser – iPhone und Android-Chrome, z. B.
  Pixel 7), committen, Pull Request nach `main`
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
- Startseite "Heute" (`src/components/home/HomeView.tsx`) – genau sechs
  Elemente, passt ohne Scrollen aufs iPhone (auch 375 px), wenig Text, viel
  Weißraum:
  1. Kopf: Logo, darunter klein das Datum, rechts Zahnrad zu `/profil`.
  2. Heute-Karte (`HeroCard`): Bildfeld mit Akzent-Verlauf und Emoji (später
     Rezeptbild; Höhe passt sich dem Bildschirm an), "HEUTE · 18:30" (Profil
     v10 `mealClock`), Gerichtname groß mit Status "✓ kennt ihr" (grün) bzw.
     "Neu ✨", eine ruhige Zeile (Besonderheit wie "Mathis' Wunsch 🎉",
     "Reste von …" · Zeit · Personen), darunter nur falls vorhanden die
     Termine des Tages (`src/lib/appointments.ts`, neutral wie "Jonne Turnen
     bis 17:30", nie "wird knapp"; vorerst leer). Bekannt: dezent "Rezept
     ansehen · Tauschen" (`/wochenplan?tauschen=heute`). Neu (oder Kochstil
     "nach Rezept"): "<n> Schritte · <n> Zutaten" und "Los geht's – Schritt für
     Schritt" (nach der Essenszeit nicht mehr). Nichts geplant: "Noch nichts
     für heute – spontan was kochen?" mit Knopf in den Spontan-Modus.
  3. Lottes Platz (`useLottePlace` in `src/components/home/LottePlace.tsx`):
     genau EINE Sache oder Stille, Avatar + Sprechblase, max. 2 Chips, immer
     als Angebot. Die erste zutreffende Stufe gewinnt:
     1. Zeitkritisch heute/morgen: Startzeit langer Gerichte ("… um 17:00
        anfangen, dann ist um 18:30 alles fertig"), ❄️ Auftauen (Zutat für
        morgen liegt im Tiefkühler), Einweichen (getrocknete Hülsenfrüchte),
        Einkauf für morgen ("Für morgen hab ich … schon auf die Liste
        gesetzt"). Antippen der Blase öffnet die Checkliste "Für morgen".
     2. Vorrat: ❄️ seit 60+ Tagen im Tiefkühler, Reste verwandeln (Frisches
        seit 2+ Tagen im Kühlschrank → Spontan mit "Reste zuerst"), vor einer
        Pause aufbrauchen.
     3. Planung: "Nächste Woche ist noch frei – in 2 Minuten geplant?",
        Grill-Idee (freitags), einmal "Wochenende frei?".
     4. Bewertung eines NEUEN Gerichts (abends ab 1 Stunde nach der
        Essenszeit bis zum nächsten Morgen 10 Uhr): "Wie war …?" 👍 / 👎 / ✕.
     5. Tipp: Lob zum Wochenrückblick, sonst die Tipp-Karte (siehe Tipps).
     6. Nichts.
     Vorrang davor: Willkommen zurück, Pause (nur die Nachricht kurz vor dem
     Ende), "leiser werden", freies Wochenende. Jede Art, die 3× ignoriert
     wird, pausiert 2 Wochen. Es gibt keine eigenen Karten mehr für Hinweis
     des Tages, Morgen-Check, Wochen-Check oder Bewertung.
  4. Drei Kacheln (Bento): Woche ("Morgen: Lachs" bzw. "5/7 geplant"),
     Einkauf mit rundem "+" (leer: nur "Einkaufsliste"; sonst "Für Montag"
     bzw. "Diese Woche"/"Für heute" und klein "<n> Sachen"; Stammartikel nur
     in der Liste), dritte Kachel "Vorrat" ("<n> Sachen"), sobald der Vorrat
     je genutzt wurde (`usePantryUsed`), sonst "Rezepte" ("<n> Rezepte").
     Nie eine vierte Kachel; Titel nie abgeschnitten.
  5. Breiter Knopf "🥕 Spontan kochen – mit dem, was da ist".
  6. Unten fest EINE Leiste "Sag <Name>, was ansteht …" mit Smiley-Topf links
     und Mikrofon im Feld rechts (`openHelper("voice")`). Auf der Startseite
     kein schwebender Knopf.

## Produktentscheidungen

- Erstes Kennenlernen als Gespräch (`/profil` ohne Profil → `OnboardingChat`,
  Vollbild im Stil des Küchenhelfer-Panels). Ablauf rein in
  `src/lib/onboarding/engine.ts` (Begrüßung, "Für wen kochst du?" (Haushaltstyp,
  siehe unten), Name/Stimme der Küchenhilfe,
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
  und speichert Vorgaben pro Woche separat. Ist ab 2 Tage vor dem nächsten
  Einkaufstag die nächste Woche noch ohne Vorgaben, bietet der Helfer-Satz
  auf der Startseite an, sie zu planen.
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
- "Unsere Rezepte" (`/kochbuch`, `CookbookList`): oben großes rundes "+",
  Suche, Filter-Chips (Alle, ❤️ Lieblinge, ⚡ Schnell bis 25 Min., 🥦 Veggie,
  🥩 Fleisch, 🐟 Fisch, 🍕 Cheat Day), Raster-Karten (Emoji, Name, Zeit,
  "<n>× gekocht" bzw. "Mathis' Liebling" = schon mal Wunschessen). Nicht auf
  der Startseite (außer als dritte Kachel ohne Vorrat); erreichbar über
  "Unsere Rezepte" im Wochenplan, "Rezept ansehen", den Küchenhelfer ("Zeig
  mir unsere Rezepte") und die Einstellungen (Abschnitt "Küche"). "+" öffnet
  "Neues Rezept" (`NewRecipeSheet`): "<Name> erzählen" (Sprache oder Tippen →
  `parseSpokenRecipe()` in `src/lib/recipeSpeech.ts`, regelbasiert, später KI:
  Titel, Zutaten mit Mengen, Schritte, Minuten → Vorschau "Speichern"/"Noch
  ändern"), "Selbst eintippen" (`/kochbuch/bearbeiten`), "Link einfügen" und
  "Foto vom Rezeptzettel" (Label "mit KI", bis dahin deaktiviert).
- Kochbuch-Daten (`src/lib/cookbook.ts`): Rezepte mit Kategorie
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
- Spontan kochen (EIN Modus für alles Ungeplante): `openHelper("spontan",
  ask?, filters?)`, "Was ist noch da?"/"Reste"/"Spontan kochen" im Chat; die
  alte Route `/schnellkueche` leitet zur Startseite mit Spontan-Modus um
  (`SpontanRedirect`). Im Küchenhelfer (`ChatState.spontan` = gewählte Filter,
  `SpontanBoard`) sofort 3 Ideen aus Vorrat und Kochbuch (`spontanIdeas()` in
  `src/lib/spontan.ts`: Kochbuch + eingebaute Klassiker + Fertigprodukte aus
  dem Vorrat (Tiefkühlpizza, Maultaschen …), ohne "Nie wieder", ohne Einkauf –
  Gewürze/Öl/Zwiebel u. Ä. zählen als "hat man da" –, schnellste zuerst;
  leerer Vorrat → Klassiker, die meistens gehen). Filter-Chips (mehrfach):
  "⚡ unter 20 Min", "♻️ Reste zuerst", "🛒 1 Sache darf fehlen" und Basis-
  Chips (Nudeln, Reis, Kartoffeln, Brot, Salat – nach Beliebtheit, Wahl zählt
  mit). Einen Joker gibt es (noch) nicht. Gesagtes zerlegt `parseLeftovers()` (`src/lib/leftovers/parser.ts`,
  austauschbar) und landet im Vorrat (`wasgibts.vorrat`, gleiche Zutaten
  zusammengezählt), die Ideen rechnen sich live neu; Unbekanntes als grauer
  Chip "Meintest du …?"; ein normaler Satz ohne Zutaten beendet den Modus.
  "Für heute übernehmen" (`takeForToday()` in `src/lib/spontanTake.ts`)
  ersetzt das heutige Gericht, das alte rutscht auf den nächsten freien Tag
  (diese/nächste Woche), mit "Rückgängig"; ohne Übernehmen ändert sich nichts.
  Mit KI zusätzlich "Andere Ideen von <Name>".
- "Kennt ihr" oder "Neu" (`src/lib/dishStatus.ts`): bekannt = von Hand
  "Kennen wir" (Kochbuch v2 `known`; Schalter im Wochenplan-Eintrag und auf
  der Rezeptseite), 2× gekocht, eigenes Rezept schon gekocht, Wunsch und
  Freitext. Neu = KI-Rezepte und neu angelegte Rezepte, die noch nie gekocht
  wurden. Bei der Migration auf Kochbuch v2 gelten vorhandene eigene Rezepte
  als bekannt. Kochstil im Küchenstil (`/profil/kochstil`, Profil v12
  `cookingStyle`: "Wir kochen meist nach Gefühl" (Standard) / "gern nach
  Rezept" = Rezept immer im Vordergrund; `newPerWeek` 1 oder 2 = Abenteuerlust).
  Wochenplanung (KI-Prompt, `kochbuch_durchsuchen` liefert `bekannt` und
  `minuten`; Testmodus `pickWeekDishes()`): überwiegend bekannte, schnelle
  Gerichte, so viele neue wie `newPerWeek`.
- Tipps (`src/lib/tips/`, Speicher `wasgibts.tippkarten`, Einstellung Profil
  v13 `tips` unter `/profil/tipps`: aus / ab und zu (Standard, an höchstens 4
  Tagen pro Woche) / täglich): nur auf Lottes Platz und nur, wenn nichts
  Wichtigeres ansteht. Eingebaute Sammlung (150 Tipps in `data/`: Profi-Tricks
  aus der Gastro, Tipps zum heutigen Gericht mit `match`, Spartipps,
  Reste-Ideen, Vorrat/Vorkochen; später KI). `tipDeck()`: höchstens 3 am Tag,
  stabil über den Tag – zuerst Twist, dann Tipps zum heutigen Gericht, dann
  der Gesundheits-Tipp (eigene Einstellung), dann allgemeine reihum; gezeigte
  kommen 90 Tage nicht wieder. Tipp-Karte (`TipCard`): Glühbirne, kleine
  Überschrift (z. B. "PROFI-TIPP ZUR BOLOGNESE"), 1–2 Sätze, "Mehr dazu ›".
  Gesten: Tippen = Details (Erklärung, evtl. Schritte); nach links wischen =
  für heute weg (Kategorie 3× weggewischt → nur noch jeden 4. Tag); nach
  rechts = nächster Tipp; Punkte darunter; beim allerersten Tipp einmal
  "← weg · tippen = mehr · nächster →". Twist (`src/lib/twists.ts`, bei
  bekannten Gerichten höchstens 2× pro Planungswoche, nie zwei Tage
  hintereinander, nie beim Wunschessen) ist eine Tipp-Karte mit "Übernehmen"
  (Zutat → "Heute holen", mit Rückgängig); der Gesundheits-Tipp eine mit
  "Ausprobieren" (links wischen = "Nein danke").
- Vorrat (`/vorrat`, `PantryView`, Speicher `wasgibts.vorrat` v2 mit Ort
  `place`): Reiter Kühlschrank (die frühere Liste "Noch da"), Tiefkühler (mit
  "seit"-Datum) und Vorratsschrank; eintragen per Textfeld oder im Gespräch
  (`placeFor()` wählt den naheliegenden Ort), antippen = ändern, verschieben,
  löschen. Grundlage für Spontan kochen und Lottes Platz (Auftauen,
  Tiefkühler-Erinnerung, Reste verwandeln).
- Schritt für Schritt kochen (`/kochbuch/kochen?id=`, `CookMode`): erst die
  Zutaten, dann ein Schritt pro Seite, Weiter/Zurück am Inhaltsende,
  Bildschirm bleibt an (Wake Lock, wo möglich).
- Plus für die Einkaufsliste (`QuickAddButton` in
  `src/components/shopping/QuickAdd.tsx`, auf der Einkauf-Karte und oben auf
  `/einkaufsliste`): rundes "+" (Trefferfläche 44×44) öffnet ein kleines
  Panel mit Textfeld (Fokus) und Mikrofon. `parseQuickAdd()`
  (`src/lib/quickAdd.ts`): Artikel, Menge und Laden ("Müsli von Rossmann"),
  erkannt über Lebensmittel-Liste, Abteilungs-Stichwörter, Drogerie-/
  Haushaltsartikel und eigene Produkte/Läden/Stammliste – nie automatisch
  "korrigiert". Danach "<n> Sachen hinzugefügt ✓" mit "Rückgängig", Panel
  schließt; Unbekanntes als grauer Chip zum Bestätigen.
- Basis (`src/lib/bases.ts`): Kartoffeln, Reis, Nudeln, Quinoa/Couscous, Brot,
  Salat oder "Egal". Gefragt bei neuen Rezeptvorschlägen (nicht beim
  Spontan kochen – da gibt's sofort Ideen; KI fragt laut System-Prompt; fragt sie nach der "Basis", zeigt das Panel
  die Chips). Chips nach Beliebtheit (Profil v8 `bases`: Zähler je Basis,
  erhöht bei Wahl und bei 👍 über `recipeBase()`), im Profil unter
  Essgewohnheiten "Eure Lieblings-Basen" (`/profil/basen`) bearbeitbar.
- Küchenstil (Profil-Abschnitt): "So kocht ihr", "Das mögt ihr", Lieblings-Basen,
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
  Wunschessen oder bei Allergie-Konflikt. Als Tipp-Karte auf Lottes Platz
  ("Kleine Idee für …" mit "Ausprobieren") und im Chat (`TipBubble`: "Ausprobieren" ändert nur
  dieses Rezept, Notiz "🌱 Ausprobiert", mit "Rückgängig"; "Nein danke").
  Wochenlimit über `wasgibts.tipps` (gezeigte Tipps je Woche, erledigte
  kommen nicht wieder). Lob zum Wochenrückblick (`weekPraise`, ab dem
  vorletzten Tag der Planungswoche, z. B. "Diese Woche 5 Gemüsetage – stark!
  💪"). Die KI bekommt Einstellung, Zahl der Tipps dieser Woche und die
  Regeln (Systemanweisung).
- Ohne Druck (`src/lib/activity.ts`, Speicher `wasgibts.aktivitaet`):
  - Willkommen zurück: Nach 3+ Tagen ohne Öffnen begrüßt der Helfer auf der
    Startseite einmalig ("Hey, schön, dass du da bist! 😊 Hattet ihr eine
    gute Zeit? Frisch starten oder noch Pause?"). "Frisch starten" verwirft
    still die Planung ab heute (mit KI fragt der Chat nach Ideen, sonst
    Wochenplan), "Noch Pause" schaltet den Pause-Modus ein. Kein Rückblick
    auf Verpasstes.
  - Leiser werden: Bleiben proaktive Nachrichten (Helfer-Satz,
    Bewertungszeile) an 3 Tagen seit dem letzten eigenen Tun unbeachtet,
    schweigt der Helfer, bis wieder jemand selbst etwas tut (Plan oder Liste
    ändern, Chat, Chip antippen – `noteUserAction`).
- Pause-Modus (Profil v11 `pause` {from, until|null}; per Chat "Wir sind
  ab Freitag eine Woche im Urlaub" / "Wir sind wieder da" – `parsePauseRequest`
  in `src/lib/spontan.ts` – oder unter `/profil/pause`): Pausentage zählen wie
  Ausflugstage (`PlanDay.paused`, kein Platz, keine Einkäufe), keine
  Hinweise und keine Push. Startseite: "Pause bis <Datum> – genießt die
  Zeit ☀️" mit "Pause beenden". Bis 3 Tage vor Beginn einmal "Im Kühlschrank
  ist noch … – soll ich das in die letzten Tage einplanen?", 2 Tage vor Ende
  einmal "Ihr seid bald wieder da – soll ich für <Tag> schon was
  vorbereiten?" (`markAsked`, nie wiederholt).
- Wochenend-Stil (Profil v11 `weekendStyle`, Standard "locker"; Kennenlernen
  "Wie seid ihr am Wochenende?" und `/profil/wochenende`):
  - 🏖 Frei: Sa/So keine Kategorie-Hinweise, zählen nicht bei "x/7 geplant",
    keine Hinweise/Push/Bewertung; Startseite "Wochenende – genießt es".
  - 🌿 Locker: Startseite "Falls ihr Lust habt: <Gericht>" ohne Uhrzeit,
    Zutaten auf der Einkaufsliste als "optional", keine Erinnerungen ans
    Wochenend-Essen, keine Bewertungsfragen (das Angebot, die nächste Woche
    zu planen, darf am Wochenende kommen).
  - 📅 Wie unter der Woche: normale Planung.
  - Wurden 3 Wochenenden in Folge geplante Gerichte nicht gekocht (keine
    Bewertung, nicht als gekocht vermerkt), bietet der Helfer EINMAL "frei" an.
- Spontan-Hilfe im Chat (immer, auch ohne Plan und ohne KI, `src/lib/spontan.ts`):
  Ausflugs-Snacks aus dem Vorrat ("Wir fahren spontan los, was nehmen wir
  mit?"), drei schnelle Ideen unter 20 Minuten ("Wir kommen erst um 19 Uhr
  heim"; ohne KI aus dem Kochbuch, sonst Klassiker). Freitags höchstens EIN
  Grill-Vorschlag, wenn fürs Wochenende gutes Wetter vorhergesagt ist (nur
  mit Zustimmung, Ort grob per PLZ, Open-Meteo, `src/lib/weather.ts`).
- Planen ist optional: Ohne Plan zeigt die Startseite "Noch nichts für heute –
  spontan was kochen?" mit Knopf in den Spontan-Modus – nie als Fehler oder
  Warnung.
- Bewerten nach dem Kochen – klein und nur bei Neuem (`src/lib/ratings.ts`,
  Speicher `wasgibts.bewertungen` je Kochtag): nur für neue Gerichte
  (Status "Neu", siehe dishStatus) beim ersten Mal (`isFirstTime`: noch nie
  gekocht/bewertet und nicht schon früher im Plan), abends ab 1 Stunde nach
  der Essenszeit bis zum nächsten Morgen (10 Uhr, dann "Wie war gestern …?").
  Auf Lottes Platz (Stufe 4) "Wie war …?" 👍 / 👎 / ✕ (`RatingBubble`); weg
  nach Antwort, nach ✕ oder ab 10 Uhr am nächsten Tag. Nach 3 ignorierten Fragen in Folge 2
  Wochen Pause (`nudges.ts`, Art "bewertung"). Push später: "<Name>: Wie war
  …? 👍 👎" ca. 1 Stunde nach dem Essen (`ratingPushText`, `ratingPushTime`).
  👍: Zähler hoch, KI-Rezept wird Favorit, Basis-Statistik. 👎: Grund per
  Chip ("zu scharf", "zu aufwendig", "Kinder mögen's nicht") oder ohne → Profil `neverAgain` (Titel, Hauptzutaten, Grund,
  Kopie des Rezepts), Rezept raus aus dem Kochbuch, künftige Plätze mit dem
  Gericht werden geleert. Die
  "Nie wieder"-Liste geht immer an die KI (`prompt.ts`, mit Anweisung: diese
  und sehr ähnliche Gerichte nie, Gründe beachten); `rezept_erstellen` und
  freie Gerichte lehnen Einträge der Liste ab (`isNeverAgain`). Einsehbar
  und einzeln wiederherstellbar unter `/profil/nie-wieder`.
- Küchenhelfer (KI, `src/lib/assistant/`, API `/api/kuechenhelfer`): schwebender
  Knopf auf allen Seiten außer der Startseite (`KitchenHelper` im Layout, über `StickyActions`,
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
  Küchenhelferin" bei weiblicher, "dein Küchenhelfer" bei männlicher Stimme.
  Panel-Kopf: Avatar, Name, `helperTitle()`; erste Nachricht
  "Hi, ich bin <Name> – was steht an?". Mitteilungen im Namen des
  Küchenhelfers (auch künftige Push) immer über `helperMessage()` →
  "<Name>: …". Die KI bekommt Name, Familie und Ton aus dem Leitbild
  (`identityPrompt()`).
- Haushaltstypen (Profil v14 `householdType`: single/paar/familie/wg,
  `HOUSEHOLD_TYPES`): erste Frage im Kennenlernen "Für wen kochst du?" (🙋 Nur
  für mich / 👫 Zu zweit / 👨‍👩‍👧‍👦 Familie mit Kindern / 🏠 WG/Mehrpersonen,
  auch frei per `householdTypeFrom`). Ohne Kinder kürzer: keine Personen-Runde
  (alle erwachsen), Familienname nur bei Familie (WG optional "Name eurer WG"),
  bei "Nur für mich" du-Form ("Wie heißt du?", `isSolo()`). Einstellbar unter
  `/profil/haushalt` (Kacheln). Sprache: "Unsere Familie" nur bei Familie,
  sonst "Mein/Unser Haushalt" (`householdNoun`). Bestehende Profile: Typ aus
  den Personen (`deriveHouseholdType`, Kinder → Familie); kommen Personen
  dazu, passt `fitHouseholdType` an. Kinder-Funktionen (Wunschtag –
  `wishDayActive`, Kinder-Schritte beim Backen, Kita/Schule-Fragen,
  Kinder-Tipps) nur mit Kindern (`hasKids`). Kleiner Haushalt
  (`isSmallHousehold`, 1–2 Personen): Einkaufsliste rechnet Rezeptmengen auf
  die Personen des Tages um und rundet auf (g/ml auf 50, Stück ganz;
  `buildShoppingList(…, { small })`), "doppelt kochen" heißt "Reicht für
  morgen", bei Resten im Kühlschrank bietet Lotte "Einfrieren" an, Tipps
  Vorrat/Einfrieren zuerst. Wochenend-Ideen (Tipp-Kategorie `wochenende`,
  Fr–So, `audience` kids/nokids/paar): ohne Kinder Freunde einladen,
  Wochenmarkt, Kochabend zu zweit, Brunch, Ausflug, Neues ausprobieren.
- Backen (Kochbuch v3: `kind` "kochen"/"backen", `oven` {mode, temp, minutes},
  `pan`, `kidSteps`, `machineSteps`): Backrezepte immer in g/ml. Eingebaute
  Backstube `src/lib/baking/` (20 Familienrezepte, IDs `b:<id>`, lesbar und
  backbar wie eigene; "In unsere Rezepte" = `adoptBuiltin`). Filter
  "🧁 Backen" in "Unsere Rezepte" zeigt eigene Backrezepte und darunter "Aus
  unserer Backstube". "Zusammen backen" (`CookMode`): Backofen + Form auf der
  Zutatenseite, Schritte mit Zeit bieten "<n> Min – ich sag Bescheid" →
  sichtbarer Timer (`role="timer"`, läuft über alle Schritte, am Ende Ton per
  Web Audio + Vibration); Kinder-Schritte "🧒 <Kind> darf jetzt:" reihum
  (`kidStepLabel`). Küchenhelfer: Backwünsche ("Können wir einen Apfelkuchen
  backen?", "Was kann ich mit den Kindern backen?", `isBakingRequest`) →
  bis zu 3 Rezepte mit "Zusammen backen"/"Rezept" (ohne KI). KI-Backrezepte
  später.
- Im Supermarkt fragen (`src/lib/market.ts`): "im Angebot", "ich steh grad
  im …", "hier gibt's …" (`isMarketSituation`, Produkt `marketProduct`) →
  besonders kurze Antwort mit 2–3 Ideen samt Zeit (Kochbuch zuerst, dann
  Vorlagen; `marketIdeas`), "Was du dafür noch brauchst: …" (ohne Vorrat,
  Einkaufsliste und Grundzutaten). "Auf die Liste" legt Produkt + Fehlendes
  als `now`-Artikel an → Abschnitt "Jetzt mitnehmen" ganz oben in der
  Einkaufsliste (bis abgehakt), mit Rückgängig. "Statt <Tag> einplanen"
  (`marketTargetDay`: heute vor der Essenszeit oder nächstes geplantes
  Gericht) → `takeForDay`, das bisherige Gericht rutscht auf den nächsten
  freien Tag, mit Rückgängig. `MarketAnswer.source` ist offen für "foto"
  (Produkt/Angebotsschild per KI später).
- Thermomix (Profil v14 `kitchenMachine` "keine"/"thermomix", Küchenstil →
  "So kocht ihr" → Küchenmaschine): Rezepte mit `machineSteps` zeigen den
  Umschalter "Mit Thermomix"/"Klassisch" (`MachineSteps.tsx`, gemerkt unter
  `wasgibts.maschinenansicht`), "Schritte für Thermomix" mit Zeit/Temperatur/
  Stufe/Linkslauf. Rein beschreibend – keine Logos, keine Partnerschaft.
  Vorerst nur eingebaute Rezepte, KI später.
