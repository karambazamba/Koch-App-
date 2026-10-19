# Leitbild "Was gibt's?"

Bei ALLEN Änderungen beachten.

## Wofür die App da ist
"Was gibt's?" ist eine cleane Alltags-App für Felix und seine Familie. Lotte
ist die Assistentin für Termine, Aufgaben, Essen und Einkauf – man gibt ihr
Dinge ab wie einer guten Haushaltshilfe, mit der man ganz natürlich spricht.
Lotte legt an und räumt wieder weg. Die Assistentin hat einen Namen, den die
Familie wählt (Standard: Lotte).

## 1. Ruhig und leer
- Heute + Woche sind die Hauptansichten (Woche kommt in Phase 2). Die
  Oberfläche ist ruhig und leer; nichts steht herum, was nicht gebraucht wird.
- Keine Überladung: Alles Neue startet versteckt (Feature-Flags,
  `src/lib/core/features.ts`) und wird nur bei Bedarf gezeigt.
- Pro Bildschirm eine große Hauptsache, wenig Text, viel Weißraum. Leere
  Zustände freundlich und einladend, nie als Fehler.

## 2. Gespräch zuerst
- Lotte (Sprache/Chat) ist der Hauptweg. Jede Funktion soll auch per Gespräch
  erreichbar sein. Bildschirme dienen zum Nachschauen und Feinjustieren.
- Lieber eine Frage mit 2–3 Knöpfen als ein Formular.
- Machen statt fragen: Kleine Dinge selbst erledigen und kurz melden (mit
  "Rückgängig"). Rückfragen nur bei echten Entscheidungen. Änderungen der KI
  immer als Vorschau mit "Übernehmen".

## 3. Räume
- "Familie" ist gemeinsam (alle im Haushalt sehen es), "Arbeit" ist
  persönlich. Ohne Angabe gehört etwas zur Familie.

## 4. Ohne Druck
- Keine Streaks, keine Zähler, keine roten Badges, keine Aufgaben-Stapel.
- Nicht Erledigtes verschwindet leise. Nie "Du hast … nicht gemacht", nie
  "du musst / du solltest / vergiss nicht", nie "Ich vermisse dich".
- Wortwahl: keine Wörter wie "fehlt", "offen", "überfällig", "noch zu
  erledigen", "verpasst", "Alles da". Stattdessen vorbereitend ("Für Montag",
  "Ich hab schon …", "Bereit für …").
- Startseite: höchstens ein Satz von Lotte, nur wenn wirklich wichtig.
  Push (später): höchstens 1 proaktive Mitteilung pro Tag, Ruhezeit
  20:00–7:00. Pause-Modus = absolute Ruhe.

## 5. Ton
- Kurz, warm, mitdenkend, natürlich, Deutsch, etwas Humor, kein Formularton,
  keine Fachbegriffe. Antworten im Chat 2–3 Sätze, außer jemand will Details.
- Erleichterung statt Leistung: nicht übertrieben loben, nichts vorrechnen.
- Gesundheit: keine Diagnosen, nie Aussagen über Körper/Gewicht/Kalorien; bei
  Gesundheitsfragen freundlich auf Arzt/Ärztin verweisen.

## 6. Kennt die Familie
- Profil, Allergien (strikt), "mag nicht", eigene Produkte, Läden und
  bisherige Entscheidungen immer berücksichtigen. Nie zweimal dasselbe fragen.
- Datenschutz: so wenig Daten wie nötig, besonders bei Kindern; alles löschbar.

## 7. Design
- Warmes Off-White, weiße Karten, eine Akzentfarbe (Orange), Linien-Icons
  (lucide), Emojis nur sparsam. App-Icon: Lotte als lächelnde weiße
  Sprechblase mit drei Härchen auf orangem Verlauf (#F7843E → #EE5F14;
  einzige Quelle `scripts/generate-icons.mjs`, `npm run icons` erzeugt
  icon.svg, favicon 32/48 + favicon.ico, apple-touch-icon 180, PWA 192/512,
  maskable 512 mit mehr Rand, lotte-192.png für Push). Lottes Gesicht in der
  App: `<LotteAvatar size … />` (`src/components/LotteAvatar.tsx`, dasselbe
  Motiv im orangen Kreis #F26B21, "plain" = nur die Sprechblase im orangen
  Knopf) – in Lotte-Leiste, Chat-Kopf, Knopf und Push (`lottePush()`,
  `LOTTE_PUSH_ICON`). Manifest theme_color #EE5F14 (`BRAND_COLOR`).
- Startseite (Neustart): Kopf (Logo, Datum, Zahnrad), schlichte Heute-Karte
  fürs Essen (`CalmMealCard`), Einkaufsliste als Karte (`ShoppingCard`, beide
  in `src/components/home/CalmHome.tsx`), unten die Leiste "Sag Lotte, was
  ansteht …". Neue Funktionen bekommen keinen eigenen Platz, solange sie nicht
  gebraucht werden.

## 8. Technik-Regeln
- Nach jeder Änderung: testen (iPhone-Simulation UND Android-Chrome-Simulation,
  z. B. Pixel 7), PR erstellen und in main mergen – ohne Rückfrage.
- Nur Zwischenstände pushen, die bauen (npm run build muss durchlaufen).
- Bestehende gespeicherte Daten bei Formatänderungen immer migrieren, nie
  verlieren. Verstecken heißt nie löschen.
- KI nur serverseitig (ANTHROPIC_API_KEY aus Vercel, nie ins Repo, nie in die
  App). Die KI schlägt vor, der Nutzer übernimmt. Die App muss immer auch ohne
  KI funktionieren. Zugangscode (APP_ACCESS_CODE) und Tageslimit gelten für
  alle KI-Aufrufe.
- Zurück = eine Ebene zurück, Pfeil und Geste identisch, Scrollposition bleibt.
- Eingabefelder mindestens 16px Schrift (kein iOS-Zoom), Safe-Areas beachten.
  Weiter/Zurück-Buttons am Inhaltsende, nicht fixiert.
- Neue Farben/Komponenten immer über die Design-Tokens.
- Zeit immer über `now()` aus `src/lib/core/now.ts` (Europe/Berlin, in Tests
  überschreibbar), nie direkt `new Date()`.
- Einstellungen nach Nutzungshäufigkeit sortieren, aktueller Wert rechts.
- Versionsnummer (`package.json` und `APP_VERSION` in `src/lib/core/app.ts`)
  und `CACHE_VERSION` in `public/sw.js` bei jeder Auslieferung erhöhen.

## Roadmap
- Phase 1: Konten + Haushalt (Supabase) – Anmeldung, Haushalt mit Mitgliedern,
  gemeinsame Daten; Umzug der Einträge ins einheitliche Modell.
- Phase 2: Heute/Woche mit Terminen, Aufgaben und Push.
- Phase 3: Essen + Einkauf neu.
- Phase 4: Post (Briefe, Rechnungen erfassen).
- Phase 5: Foto → Termin/Aufgabe.

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
  (Version in `src/lib/einstellungen/profile.ts` erhöhen, `migrateProfile` erweitern).

## Fundament (Neustart, v0.9)

- Ordner nach Bereichen in `src/lib/`: `core` (Zeit `now.ts`, Speicher
  `localStore.ts`/`useExternalStore.ts`, Feature-Flags `features.ts`,
  Datenmodell `entries.ts`, Navigation, Toast, Ansicht, Aktivität, Termine,
  Wetter), `lotte` (KI-Client, Engine, Werkzeuge, Prompt, Sprache ein/aus,
  Chat-Vorschläge), `essen` (Plan, Rezepte, Ideen, Vorrat, Tipps, Backstube …),
  `einkauf` (Einkaufsliste, Plus), `aufgaben` (leer, vorbereitet),
  `einstellungen` (Profil, Kennenlernen, Schnellstart-Logik). Oberfläche in
  `src/components/` nach Bildschirmen.
- Feature-Flags an EINER Stelle (`src/lib/core/features.ts`): versteckt sind
  Wochenplan-Oberfläche, Vorrat, Rezepte, Ideen, Tipps, Joker,
  Wochenend-Ideen, Modi, Kochstil-Seiten, Kacheln, Spontan-Knopf,
  Bewertungen, Lottes Platz, Kennenlernen-Chat. `useFeature()`/`featureOn()`;
  versteckte Seiten über `FeatureGate` (leitet zur Startseite). In den
  Einstellungen ganz unten "Alte Funktionen anzeigen (Test)" (pro Gerät,
  `wasgibts.funktionen`) blendet alles wieder ein; die Daten bleiben immer
  vollständig erhalten. Dauerhaft freischalten über `ENABLED` in features.ts.
- Sichtbar ohne Test-Schalter: Startseite (siehe Leitbild 7), Chat mit Lotte,
  Einkaufsliste, schlanke Einstellungen (Name & Stimme, Vorlesen, Ansicht,
  Familie, Daten & App) und der Schnellstart ohne Profil (`QuickStart`: Name
  + wer noch dazugehört).
- Einheitliches Datenmodell für Supabase (`src/lib/core/entries.ts`): jeder
  Eintrag mit `id`, `typ` (termin/aufgabe/gericht/einkauf), `raum`
  (familie/arbeit), `besitzer` (bis zu Konten "lokal"), `erstellt`,
  `geaendert`, `data`. Neue Funktionen speichern so; Bestehendes zieht in
  Phase 1 um (mit Migration).
- Zeit: `now()` (überschreibbar per `setNowForTests` oder
  `window.__WASGIBTS_NOW__`), `todayIso()`, `berlinTime()` für den Server,
  `useToday()`, `useMinutes()`.
- Lotte (`/api/lotte`, `src/lib/lotte/`): Gespräch mit `claude-sonnet-5-5`
  (`LOTTE_MODEL` überschreibt; adaptives Nachdenken, Aufwand "low",
  `max_tokens` 8000, höchstens 6 Runden, serverseitiges Ausweichen bei
  Ablehnungen `fallbacks: "default"`), Haiku (`claude-haiku-5-5`) nur für
  kleine Hintergrundaufgaben (Kennenlernen-Erkennung). Streaming: die Route
  antwortet als NDJSON (`StreamEvent`: text/round/done/error), der Chat zeigt
  "Lotte denkt …" und dann die Antwort Wort für Wort. Gesprächsverlauf: die
  letzten 10 Nachrichten. Kontext je Anfrage: Datum, Wochentag, Uhrzeit
  (Europe/Berlin), Familie, Essen heute/morgen, Einkaufsliste, Vorrat,
  Kochbuch-Überblick. Systemanweisung: warme, kurze, mitdenkende
  Alltags-Assistentin für Familie und Arbeit (`prompt.ts`). Werkzeuge als
  Register (`registry.ts`, Anmeldung in `toolset.ts`; neue Bereiche wie
  Termine/Aufgaben/Erinnerungen melden sich dort an); Schreib-Werkzeuge
  liefern nur Vorschläge mit "Übernehmen". Token-Verbrauch und grobe Kosten
  je Anfrage im Server-Log ("Lotte Tokens", nur Zahlen, nie Inhalte). Kein
  Untertitel mehr im Chat, nur der Name.

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
- App-Icon: Lotte als Sprechblase auf orangem Verlauf (siehe Leitbild 7). Einzige Quelle
  `scripts/generate-icons.mjs` (`npm run icons` erzeugt icon.svg, PNGs,
  maskable, apple-touch-icon, favicon.ico). In der App `AppIcon`/`AppLogo`
  (`src/components/AppLogo.tsx`): Startseite Icon 44px + Schriftzug,
  Unterseiten 32px oben rechts im `PageHeader` als Link "Zur Startseite".
- Alte Startseite "Heute" (nur mit "Alte Funktionen anzeigen (Test)",
  `src/components/home/HomeView.tsx`) – genau sechs Elemente, passt ohne Scrollen aufs iPhone (auch 375 px), wenig Text, viel
  Weißraum:
  1. Kopf: Logo, darunter klein das Datum, rechts Zahnrad zu `/profil`.
  2. Heute-Karte (`HeroCard`): Bildfeld mit Akzent-Verlauf und Emoji (später
     Rezeptbild; Höhe passt sich dem Bildschirm an), "HEUTE · 18:30" (Profil
     v10 `mealClock`), Gerichtname groß mit Status "✓ kennt ihr" (grün) bzw.
     "Neu ✨", eine ruhige Zeile (Besonderheit wie "Mathis' Wunsch 🎉",
     "Reste von …" · Zeit · Personen), darunter nur falls vorhanden die
     Termine des Tages (`src/lib/core/appointments.ts`, neutral wie "Jonne Turnen
     bis 17:30", nie "wird knapp"; notiert per Lotte, kompakt unter der Zeile, Bildfeld dann flacher). Bekannt: dezent "Rezept
     ansehen · Tauschen" (`/wochenplan?tauschen=heute`). Neu (oder Kochstil
     "nach Rezept"): "<n> Schritte · <n> Zutaten" und "Los geht's – Schritt für
     Schritt" (nach der Essenszeit nicht mehr). Kein Gericht für heute:
     `IdeasCard` "Was gibt's heute?" mit genau 3 kompakten Ideen-Karten wie
     im Chat (alle Kochstile; rechts oben "Mehr Ideen" bzw. "Sag mir, was da
     ist"). Nach dem Essen (Essenszeit + 90 Min. oder "Gekocht" getippt,
     `mealIsOver`) zeigt die Karte schon das nächste Essen: "MORGEN · 12:30 ·
     Gulasch" (`HeroCard when="morgen"`), ohne Gericht "Was gibt's morgen?"
     mit Ideen (Knopf "Morgen").
  3. Lottes Platz (`useLottePlace` in `src/components/home/LottePlace.tsx`):
     genau EINE Sache oder Stille, Avatar + Sprechblase, max. 2 Chips, immer
     als Angebot. Die erste zutreffende Stufe gewinnt:
     1. Zeitkritisch heute/morgen: Startzeit langer Gerichte ("… um 17:00
        anfangen, dann ist um 18:30 alles fertig"), ❄️ Auftauen (Zutat für
        morgen liegt im Tiefkühler), Einweichen (getrocknete Hülsenfrüchte),
        Einkauf für morgen ("Für morgen hab ich … schon auf die Liste
        gesetzt"). Antippen der Blase öffnet die Checkliste "Für morgen".
     2. Vorrat: nach dem Essen einmal "Ist was übrig geblieben?" bei
        Gerichten mit Resten (Eintopf, Curry, Bolognese … `leftoverProne`,
        nicht bei "doppelt") → "Kühlschrank"/"Eingefroren" (in den Vorrat)/
        "Nein", wegwischen = nein, bis zum nächsten Morgen; ❄️ seit 60+ Tagen im Tiefkühler, Reste verwandeln (Frisches
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
  4. Drei Kacheln (Bento): Woche ("Morgen: Lachs" bzw. "5/7 geplant"; "Mal
     so, mal so" ohne Zähler; "spontan": Kachel "Ideen" → `/ideen`),
     Einkauf mit rundem "+" (leer: nur "Einkaufsliste"; sonst "Für Montag"
     bzw. "Diese Woche"/"Für heute" und klein "<n> Sachen"; Stammartikel nur
     in der Liste), dritte Kachel "Vorrat" ("<n> Sachen"), sobald der Vorrat
     je genutzt wurde (`usePantryUsed`), sonst "Rezepte" ("<n> Rezepte").
     Nie eine vierte Kachel; Titel nie abgeschnitten.
  5. Breiter Knopf "🥕 Spontan kochen – mit dem, was da ist".
  6. Unten fest EINE Leiste "Sag <Name>, was ansteht …" mit Lottes Gesicht links
     und Mikrofon im Feld rechts (`openHelper("voice")`). Auf der Startseite
     kein schwebender Knopf.

## Alte Funktionen (Koch-App) – versteckt hinter "Alte Funktionen anzeigen (Test)"

Alles hier bleibt im Code und in den Daten erhalten und funktioniert mit dem
Test-Schalter wie bisher. Neue Arbeit baut auf dem Fundament oben auf.

- Erstes Kennenlernen als Gespräch (`/profil` ohne Profil → `OnboardingChat`,
  Vollbild im Stil des Küchenhelfer-Panels). Ablauf rein in
  `src/lib/einstellungen/onboarding/engine.ts` (Begrüßung, "Für wen kochst du?" (Haushaltstyp,
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
  zeigt `/profil` die Übersicht "Einstellungen" (siehe unten); Personen und Bereiche werden
  dort einzeln bearbeitet (eigene Seiten unter `/profil/...`).
- Im Assistenten werden Namen nur in Schritt 2 "Wie heißen alle?" eingegeben;
  spätere Schritte zeigen sie nur an. Schritt 1 muss ohne Scrollen aufs iPhone
  passen.
- Grundregel im Assistenten: Ist ein Schritt länger als der Bildschirm und noch
  nicht bis unten gescrollt, scrollt "Weiter" erst zum nächsten offenen
  Abschnitt (`src/lib/einstellungen/stepScroll.ts`). Wischen links = Weiter, rechts = Zurück
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
  alte Woche. Datumslogik zentral in `src/lib/essen/weekPlan.ts`
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
  `parseSpokenRecipe()` in `src/lib/essen/recipeSpeech.ts`, regelbasiert, später KI:
  Titel, Zutaten mit Mengen, Schritte, Minuten → Vorschau "Speichern"/"Noch
  ändern"), "Selbst eintippen" (`/kochbuch/bearbeiten`), "Link einfügen" und
  "Foto vom Rezeptzettel" (Label "mit KI", bis dahin deaktiviert).
- Kochbuch-Daten (`src/lib/essen/cookbook.ts`): Rezepte mit Kategorie
  Fleisch/Vegetarisch/Fisch/Cheat Day, Herkunft "eigenes" oder "ki".
  KI-Rezepte später über `saveAiRecipe()` direkt (als Favorit) übernehmen.
  Feste Gerichte im Wochen-Check zählen in ihre Kategorie (Zähler kann nicht
  darunter sinken); ein Cheat-Day-Rezept setzt den Cheat Day auf diesen Tag.
- Wochenplan (`/wochenplan`, `src/lib/essen/mealPlan.ts`, Oberfläche
  `src/components/plan/`): Umschalter "Tag" (Standard) / "Woche"
  (`Segmented`), darunter eine schmale Zusammenfassung (x/7 geplant,
  Kategorien, ~Kosten von Budget). Tag-Ansicht: Tagesleiste (7 Tage ab
  Einkaufstag, gewählter Tag in Akzentfarbe, Kategorie-Punkt: Veggie grün,
  Fleisch rot, Fisch blau, Cheat Day orange, leer grau), große Karte
  (`DayCard`: Emoji auf Akzent-Verlauf als Platzhalter fürs Rezeptbild
  (`dishEmoji`), "WOCHENTAG · MAHLZEIT", Name, Chips Kategorie/Zeit/Personen/
  ~Kosten (`estimateCost` in `src/lib/essen/costs.ts`, grobe Richtwerte),
  "Tauschen"/"Rezept", "…" für doppelt kochen/verschieben/löschen; leer
  "+ Planen"; Ausflug, Wunschtag, Cheat Day eigen gestaltet), seitlich
  wischen wechselt den Tag, darunter "Danach" (nächste 2 Tage). Woche-Ansicht
  (`WeekListView`): eine Zeile pro Tag, Gerichte am Griff ziehen (Pointer
  Events, auch Touch) = tauschen, Tippen öffnet den Tag. Zurückblättern bis
  26 Wochen = Rückblick (nur lesen, "Nochmal kochen" setzt das Gericht auf
  einen Tag dieser/nächster Woche). Lieblingswochen (`src/lib/essen/templates.ts`,
  `wasgibts.vorlagen`): "Vorlage speichern" (Name, je Wochentag Rezept/
  Freitext) und "Vorlage laden" (Tage abwählbar, belegte Tage: "Überschreiben"
  oder "Nur freie Tage"). `buildWeek()`/`composeWeek()` setzen Plätze,
  feste Gerichte, Wunsch, Ausflugstage und Cheat Day aus dem Wochen-Check
  zusammen (Speicher v3, Schlüssel = Wochentag, Notiz unter "Tag:notiz",
  "doppelt" am Eintrag). Gespeichert werden nur eigene Einträge und
  Überschreibungen ("cleared"). Die Kategorie eines Eintrags kommt immer vom
  Gericht, nie vom Kategorie-Hinweis des Platzes.
- Einkaufsliste (`/einkaufsliste`, `src/lib/einkauf/shoppingList.ts` Speicher v4,
  Oberfläche `src/components/shopping/`): Artikel aus Rezepten im Wochenplan
  werden immer neu berechnet (`buildShoppingList`, Mengen je Einheitenfamilie
  addiert, doppelt kochen ×2, Abteilung per Stichwort). Je Artikel nur
  Häkchen, Name, Menge rechtsbündig; Info-Symbol oder langes Drücken zeigt
  die Gerichte. Abteilungen als kleine Großbuchstaben-Überschrift mit Icon,
  Artikel in einer weißen Karte; Abgehaktes durchgestrichen ans Ende, ganz
  erledigte Abteilung zugeklappt. Oben Fortschrittsbalken, "Für heute"
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
  und Windeln auf die Liste" (`src/lib/einkauf/shoppingParse.ts`) wird ohne KI
  erkannt (Artikel, Menge, Laden) und in die Planungswoche einsortiert.
  Standard-Woche und Kachel-Zähler: die Woche, für die gerade eingekauft wird
  (`planningWeekStart`).
- Migrationen: `createLocalStore` schreibt einen migrierten Stand einmalig
  zurück, wenn sich die Version geändert hat.
- Spontan kochen (EIN Modus für alles Ungeplante): `openHelper("spontan",
  ask?, filters?)`, "Was ist noch da?"/"Reste"/"Spontan kochen" im Chat; die
  alte Route `/schnellkueche` leitet zur Startseite mit Spontan-Modus um
  (`SpontanRedirect`). Leitbild: Einfachheit vor Vollständigkeit. Die
  Ideen-Antwort (`SpontanAnswer` in `SpontanBoard.tsx`) zeigt in dieser
  Reihenfolge: EINEN Satz ("Mit dem, was da ist, gehen heute diese drei – die
  schnellste zuerst:", `spontanHeading`; nie ohne Ideen darunter), eine graue
  Zeile "Noch da: … ändern" (max. 5, öffnet den Vorrat), genau 3 kompakte
  Karten (`IdeaCards`: Emoji, Name, "25 Min · alles im Haus" grün bzw. "35
  Min · noch: Kokosmilch" – nie "fehlt"/"Alles da"; rechts "Heute", Tippen
  öffnet das Rezept) und die Chips "Anpassen" und "Andere Ideen" (3 neue,
  ohne die eben gezeigten; `exclude` je Antwort). Die besten 3
  (`rankedSpontanIdeas`, meiste Vorrats-Zutaten zuerst) werden schnellste
  zuerst angezeigt. Filter nicht im Chat, sondern im Fenster "Ideen anpassen"
  (`AdjustSheet`: ZEIT unter 20 Min/egal, VORRANG Reste zuerst/1 Sache darf
  fehlen, BEILAGE mehrfach) mit "3 neue Ideen zeigen", für die Sitzung
  gemerkt (`wasgibts.spontan.filter` in sessionStorage); per Sprache "Was
  Schnelles mit Nudeln" (`filtersFromText`, `isIdeaFilterRequest`). Jede
  Ideen-Antwort ist ein Eintrag mit eigenen Filtern/`exclude`/`extra` und
  rechnet live aus dem Bestand; nur die letzte ist offen, ältere stehen
  eingeklappt als "Frühere Ideen". Gesagtes zerlegt `parseLeftovers()` und
  landet im Vorrat ("Notiert ✓" + neue Ideen); Unbekanntes als grauer Chip
  "Meintest du …?"; ein normaler Satz ohne Zutaten beendet den Modus.
  "Heute" (`takeForToday()` in `src/lib/essen/spontanTake.ts`) ersetzt das heutige
  Gericht, das alte rutscht auf den nächsten freien Tag, mit "Rückgängig".
  Eingabefeld immer "Sag <Name>, was ansteht …". Gleiche Karten auf `/ideen`
  und in "Was gibt's heute?".
- "Kennt ihr" oder "Neu" (`src/lib/essen/dishStatus.ts`): bekannt = von Hand
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
- Tipps (`src/lib/essen/tips/`, Speicher `wasgibts.tippkarten`, Einstellung Profil
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
  "← weg · tippen = mehr · nächster →". Twist (`src/lib/essen/twists.ts`, bei
  bekannten Gerichten höchstens 2× pro Planungswoche, nie zwei Tage
  hintereinander, nie beim Wunschessen) ist eine Tipp-Karte mit "Übernehmen"
  (Zutat → "Für heute", mit Rückgängig); der Gesundheits-Tipp eine mit
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
  (`src/lib/einkauf/quickAdd.ts`): Artikel, Menge und Laden ("Müsli von Rossmann"),
  erkannt über Lebensmittel-Liste, Abteilungs-Stichwörter, Drogerie-/
  Haushaltsartikel und eigene Produkte/Läden/Stammliste – nie automatisch
  "korrigiert". Danach "<n> Sachen hinzugefügt ✓" mit "Rückgängig", Panel
  schließt; Unbekanntes als grauer Chip zum Bestätigen.
- Basis (`src/lib/essen/bases.ts`): Kartoffeln, Reis, Nudeln, Quinoa/Couscous, Brot,
  Salat oder "Egal". Gefragt bei neuen Rezeptvorschlägen (nicht beim
  Spontan kochen – da gibt's sofort Ideen; KI fragt laut System-Prompt; fragt sie nach der "Basis", zeigt das Panel
  die Chips). Chips nach Beliebtheit (Profil v8 `bases`: Zähler je Basis,
  erhöht bei Wahl und bei 👍 über `recipeBase()`), im Profil unter
  Essgewohnheiten "Eure Lieblings-Basen" (`/profil/basen`) bearbeitbar.
- Küchenstil (Profil-Abschnitt): "So kocht ihr", "Das mögt ihr", Lieblings-Basen,
  Gesundheits-Tipps, Nie wieder.
- "Das mögt ihr" (`src/lib/essen/likes.ts`, Profil v9 `likes` gewichtet,
  `likesBlocked`): gelernt aus 👍 (+2), "Gekocht" im Rezept (+1), gewählten
  Vorschlägen (Reste-Idee angetippt, KI-Vorschlag übernommen: +1) und Sätzen
  im Chat ("wir lieben Käse", "Paprika geht immer": +3, `extractLikeStatements`;
  reine Aussagen beantwortet die App selbst mit "Gemerkt ✓ …"). Nur bekannte
  Lebensmittel, ohne Grundzutaten, Basen, Allergien und "mag nicht".
  `/profil/das-moegt-ihr`: Chips mit Stufe (♥–♥♥♥), entfernen (wird dann nicht
  wieder gelernt) und ergänzen. Geht an die KI: bevorzugt einbauen, auch in
  Entdecker-Rezepten ("neu, aber nicht fremd").
- Gesundheits-Tipps (`src/lib/essen/healthTips.ts`, Profil v9 `healthTips`, Standard
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
- Ohne Druck (`src/lib/core/activity.ts`, Speicher `wasgibts.aktivitaet`):
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
  in `src/lib/essen/spontan.ts` – oder unter `/profil/pause`): Pausentage zählen wie
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
- Spontan-Hilfe im Chat (immer, auch ohne Plan und ohne KI, `src/lib/essen/spontan.ts`):
  Ausflugs-Snacks aus dem Vorrat ("Wir fahren spontan los, was nehmen wir
  mit?"), drei schnelle Ideen unter 20 Minuten ("Wir kommen erst um 19 Uhr
  heim"; ohne KI aus dem Kochbuch, sonst Klassiker). Freitags höchstens EIN
  Grill-Vorschlag, wenn fürs Wochenende gutes Wetter vorhergesagt ist (nur
  mit Zustimmung, Ort grob per PLZ, Open-Meteo, `src/lib/core/weather.ts`).
- Planen ist optional: Ohne Gericht für heute zeigt die Startseite "Was gibt's
  heute?" mit 3 Ideen (siehe Ideen für heute) – nie als Fehler oder Warnung.
- Nach dem Essen (`src/lib/essen/mealDone.ts`, Speicher `wasgibts.gekocht` je
  Kochtag, `AutoCooked` im Layout): ab Essenszeit + 90 Minuten zählt das
  Gericht ohne Nachfrage als gekocht (auch für gestern, falls die App zu war;
  nicht bei Pause/Ausflug, nicht am lockeren/freien Wochenende, bei "spontan"
  nur aus den Ideen Gewähltes). Dann: Kochbuch "<n>× gekocht" +1
  (`countCookedOn`, Bewertung zählt nicht doppelt, Status "Neu" und erste
  Bewertung rechnen mit dem Stand vor dem Kochtag – `recipeBeforeDay`),
  Zutaten aus Kühlschrank/Tiefkühler raus (Vorratsschrank bleibt), Gekauftes
  zählt 7 Tage nicht mehr als "da" (`usedRecently` in `useStock`). "Gekocht"
  auf der Rezeptseite beim heutigen Gericht beendet das Essen sofort.
  Wochenplan heute: "✓ Gekocht · Doch nicht? Auf morgen verschieben"
  (`moveToTomorrow`: morgiges Gericht rutscht auf den nächsten freien Tag;
  Zähler und Vorrat zurück, mit Rückgängig).
- Bewerten nach dem Kochen – klein und nur bei Neuem (`src/lib/essen/ratings.ts`,
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
- Küchenhelfer (KI, `src/lib/lotte/`, API `/api/lotte`, alter Pfad
  `/api/kuechenhelfer` leitet dorthin): schwebender
  Knopf auf allen Seiten außer der Startseite (`KitchenHelper` im Layout, über `StickyActions`,
  bei offener Tastatur ausgeblendet), Panel mit Chat, Mikrofon
  (`useSpeechInput`, Fallback Tastatur-Diktat; jede Aufnahme ist eine frische
  Sitzung, der Hook liefert den ganzen Text dieser Aufnahme – nie anhängen;
  nach dem Abschicken oder Abbrechen ist alles leer) und optionalem Vorlesen; die
  Eingabeleiste der Startseite öffnet es.
  Die App schickt nur das Nötige mit (Profil, diese/nächste Woche, Kochbuch
  ohne Schritte, Vorrat); der Server führt die Claude-Tool-Schleife aus
  (`engine.ts`, Werkzeuge in `tools.ts` – je Tag ein Hauptgericht, inkl.
  "doppelt kochen", Einkaufsliste, `vorrat_hinzufuegen`, `wunsch_merken`,
  `termin_notieren`; Modell und Streaming siehe "Fundament"; Systemanweisung
  mit Prompt-Caching). Schreib-Werkzeuge ändern nichts, sie liefern `ChangeOp`s
  (`ops.ts`; Vorrat/Wunsch/Termin landen erst beim Übernehmen in ihren
  Speichern, Termine unter `wasgibts.termine` → Heute-Karte). Vorschau
  "Das würde ich machen:" (`preview.ts`, `ProposalCard`, "Übernehmen"/"Ändern")
  und Übernehmen rechnen mit denselben reinen Funktionen (`applyOps`);
  "Rückgängig" (10 s) stellt alles wieder her. Einzelne Änderungen abwählbar;
  "Ändern" schickt den offenen Vorschlag mit (`pending`). Neue KI-Rezepte
  prüfen Allergien/"mag nicht" strikt (`diet.ts`).
  Schutz (`src/lib/lotte/guard.ts`, gilt für ALLE KI-Aufrufe – Lotte und
  `/api/kennenlernen`; neue KI-Routen immer darüber): Die KI ist nur an, wenn
  `ANTHROPIC_API_KEY` UND `APP_ACCESS_CODE` gesetzt sind. Die App fragt den Zugangscode einmal im Panel
  (`AccessCodeCard`, gemerkt unter `wasgibts.zugangscode`, Header
  `x-lotte-code`, Vergleich in konstanter Zeit, falsche Versuche begrenzt);
  gemeinsames Tageslimit 100 KI-Anfragen pro Gerät für alle Aufrufe (Server
  `takeDailySlot`, App `takeAiSlot`). Ohne Code nutzt auch das Kennenlernen nur
  die Regeln. Reihenfolge im Chat:
  Navigation, Pause, Produkte, Einstellungen, Supermarkt, Backen, "Wir
  lieben …" lokal; alles andere an die KI. Ist sie nicht da (offline, aus,
  Limit, Code, kein Guthaben), greifen die Regeln (Einkaufsliste inkl. "Wir
  brauchen …", Wünsche, schnelle Ideen), sonst sagt Lotte "Gerade kann ich
  dich nicht richtig verstehen – tipp es mir kurz anders ein." – nie
  Technik-Wörter. `KUECHENHELFER_MOCK=1` = Testmodus (`mock.ts`, nutzt
  dieselben Werkzeuge, versteht die Alltags-Sätze). Daten-Module importieren
  React nur über `useExternalStore.ts`, damit der Server ihre reine Logik
  nutzen kann.
- Lotte liest vor (`src/lib/lotte/speech.ts`, Web Speech API, ohne Server;
  Einstellungen pro Gerät unter `wasgibts.vorlesen`: Modus automatisch = nur
  wenn per Mikrofon gefragt (Standard) / immer / nie, Stimme (`voiceURI`, leer
  = automatisch passend zu weiblich/männlich, sonst beste deutsche),
  Tempo langsam/normal/schnell; alter Schalter wird übernommen). Stimmenwahl:
  zuerst deutsche Stimmen mit "Premium", "Enhanced" oder "Erweitert" (auch
  Edge "Natural"; `isNaturalVoice`, Premium vor Erweitert), danach die übrigen
  (Google/Netz vor compact); Spaß-Stimmen wie Eddy, Rocko, Grandma nie, auch
  nicht in der Auswahl; erst dann Geschlecht (`voiceScore`). In der Auswahl
  stehen die natürlicheren oben mit Kennzeichen "natürlicher", darunter der
  Hinweis, wo man sie auf dem iPhone lädt. Tempo "normal" = 0,95 (ruhiger),
  langsam 0,8, schnell 1,2. Klammern, Schrägstriche,
  Auslassungen und "Mo–Fr" werden für flüssigeres Vorlesen umgeschrieben. Vor dem
  Vorlesen `cleanForSpeech()` (ohne Emojis/Markdown, Einheiten und
  Abkürzungen ausgeschrieben, "17:30" → "17 Uhr 30") und `speechChunks()`
  (Sätze bis 200 Zeichen, gegen Chromes Abbruch). iPhone: `unlockSpeech()`
  beim ersten Tippen (Mikrofon, Lautsprecher, Eingabeleiste); Stimmen über
  `useVoices()` (voiceschanged + Nachschauen). Im Chat: Lautsprecher an jeder
  Nachricht von Lotte (`SpeakButton`, nochmal = Stopp), Schalter "Antworten
  vorlesen" im Kopf (setzt immer/nie), Mikrofon stoppt sofort. Kochansicht:
  "Vorlesen an/aus" und "Nochmal", jeder Schritt (auch Zutaten, Fertig) wird
  bei "immer" beim Öffnen vorgelesen. Einstellung unter Lotte → Vorlesen
  (`/profil/vorlesen`, Probehören je Stimme); per Chat "Lies mir vor", "Nicht
  mehr vorlesen", "Sprich langsamer/schneller" (`speechChat.ts`). Geht es
  nicht (kein Ton, stumm, keine Stimme): nichts tun, keine Meldung.
- Küchenhelfer hat Namen und Gesicht (Profil v7 `helper`): Name Lotte, Ida,
  Theo, Bruno oder eigener (max. 20 Zeichen, Standard Lotte), Stimme
  weiblich/männlich (bei Vorschlägen passend zum Namen; `pickVoice()` wählt
  eine passende deutsche Systemstimme, sonst Standard). Einstellbar im
  Kennenlernen (erste Frage), im Assistenten (letzter Schritt) und unter `/profil/kuechenhelfer`. Knopf mit
  Lottes Gesicht (`LotteAvatar`); Anrede `helperTitle()`: "deine
  Küchenhelferin" bei weiblicher, "dein Küchenhelfer" bei männlicher Stimme.
  Panel-Kopf: Avatar, Name, `helperTitle()`; erste Nachricht
  "Hi, ich bin <Name> – was steht an?". Darunter keine Beispiel-Blasen,
  sondern über dem Eingabefeld klein "Zum Beispiel:" mit höchstens 3 Chips
  mit Rahmen (waagerecht scrollbar, `chatSuggestions()` in
  `src/lib/lotte/chatSuggestions.ts`): vor dem Essen "Was gibt's heute?", danach
  "Was machen wir morgen?" (ohne KI "Was ist noch da?"), Wunsch mit einer
  zufälligen Person aus dem Profil (allein "Ich wünsche mir …"), gelegentlich
  Vorrat ("Was mach ich mit Blumenkohl?") oder Einkauf. Antippen = eigene
  Nachricht; weg nach der ersten eigenen Nachricht (auch Mikrofon) und in
  diesem Chat nicht wieder; nach 10 eigenen Nachrichten nie mehr
  (`wasgibts.chatnutzung`). Mitteilungen im Namen des
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
  Backstube `src/lib/essen/baking/` (20 Familienrezepte, IDs `b:<id>`, lesbar und
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
- Im Supermarkt fragen (`src/lib/essen/market.ts`): "im Angebot", "ich steh grad
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
- Einstellungen (`/profil`, `FamilyOverview`, Bausteine in
  `src/components/profile/settings/`) nach Häufigkeit: KOCHEN (Kochstil,
  Essen & Vorlieben, Wochenende – nicht bei spontan), UNSERE KÜCHE (Rezepte,
  Vorrat mit Anzahl), LOTTE ("Wie oft meldet sich Lotte?" → `/profil/lotte`:
  Modus, Tipps, Vorlesen, Wochenend-Ideen, Name & Stimme, Pause), AUSSEHEN (Ansicht,
  Darstellung), EINMAL EINGERICHTET (grau: Unsere Familie `/profil/familie`
  mit Personen, Haushaltstyp, warm essen, Einkaufstag, Produkte; Daten & App
  `/profil/daten`). Gruppenüberschrift klein in Großbuchstaben, darunter eine
  weiße Karte; jede Zeile Icon, Titel + Untertitel, rechts der Wert in
  Akzentfarbe (`ListRow value`). Unterseiten stellen eine klare Frage mit
  Antwort-Karten (`ChoiceCards`, `SettingsPage`) und wirken sofort – auch die
  Formulare (`ProfileEditPage` speichert jede gültige Änderung); unten "Gilt
  sofort – nichts wird gelöscht." "Essen & Vorlieben" (`/profil/essen`):
  Veggie-Tage & Woche (nur mit Planung), Das mögt ihr, Mag nicht & Allergien,
  Lieblingsgerichte; bei "Einfach" hinter "Mehr anzeigen": Basen, Nie
  wieder, Gesundheits-Tipps. Joker gibt es (noch) nicht – wird nicht
  angezeigt. Per Lotte (`src/lib/lotte/settingsChat.ts`, ohne KI, mit
  Rückgängig): "Jonne isst jetzt vegetarisch/vegan/wieder Fleisch", "Lisa mag
  keine Pilze", "… allergisch gegen …", "Ich koche jetzt spontan", "Mach die
  Ansicht dunkel", "Melde dich seltener/öfter", "Keine Tipps mehr", "Zeig mir
  alles" u. a.
- Profil v17 `mixSuggest` (nie / zwei / woche, Standard 2 Tage): bei "Mal so,
  mal so" auf der Kochstil-Seite "Darf ich von mir aus was vorschlagen?";
  "Ganze Woche" = höchstens einmal pro Woche "Soll ich dir für nächste Woche
  ein paar Gerichte vorschlagen?".
- Profil v15: `theme` (warm/nacht/frisch/auto), `helperMode`
  (locker/normal/dranbleiben), `display` (einfach/alles), `weekendIdeas`;
  Migration: Warm, Normal, Einfach, an.
- Ansichten (`/profil/ansicht`, Vorschau-Karten als Mini-Startseite): Farben
  nur als CSS-Variablen in `globals.css` (`--app-*` → Tokens; Nacht stellt
  zusätzlich Grau-/Rottöne um, `text-on-accent` für Text auf Akzentflächen,
  Toasts `bg-ink text-background`). `data-theme` am `<html>`, gesetzt vor dem
  ersten Zeichnen (`THEME_BOOT_SCRIPT`) und von `ThemeSync` (auch
  theme-color). Automatisch folgt `prefers-color-scheme`. App-Icon und
  Lottes Gesicht bleiben immer orange.
- Darstellung "Einfach": seltene Einstellungen hinter "Mehr anzeigen", keine
  Kosten-Schätzungen im Wochenplan (außer mit Budget); "Alles zeigen" zeigt
  alles.
- Lotte-Modus (`/profil/lotte`, steuert nur Lottes Platz, Regeln ohne KI):
  "Ganz locker" = nur Stufe 1 (zeitkritisch), keine Bewertung/Lob/Tipps;
  "Normal" = wie beschrieben; "Dranbleiben" = zusätzlich ab 4 Tage vorher
  "Soll ich die nächste Woche schon mal vorbereiten?" und für freie Tage der
  nächsten zwei Tage "<Tag> ist noch frei – soll ich dir was Schnelles
  vorschlagen?" (je einmal). Die KI bekommt den Modus im Kontext.
- Personen entfernen (`src/lib/einstellungen/removePerson.ts`, `usePersonRemoval`):
  Rückfrage "<Name> entfernen?" (`ConfirmDialog`), danach Toast mit
  "Rückgängig" (`showToast`, `ToastHost` im Layout). Aufgeräumt werden
  Personenzahl, Wunschtag-Reihenfolge, Wünsche in Wochen-Vorgaben (→ keiner)
  und im Plan (→ normales Gericht). Die letzte Person bleibt (freundlicher
  Hinweis).
- Zurück-Navigation (`src/lib/core/navigation.ts`, `NavigationMemory` im Layout,
  `BackButton` im `PageHeader`, `useGoBack()`): eigener Verlauf in
  sessionStorage; der Pfeil macht `router.back()`, nur ohne Verlauf geht's zu
  `backHref`. Scrollhöhe je Verlaufs-Eintrag gemerkt (beim Verlassen, beim
  Scrollen), beim Zurück nach dem Rendern wiederhergestellt; vorwärts oben.
  Speichern/Abbrechen in Formularen nutzen ebenfalls `useGoBack()`;
  `router.replace` immer mit `expectReplace()`.
- Kochstil "Plan oder spontan" (Profil v16 `planStyle`: plan / spontan / mix,
  `PLAN_STYLES`; Migration: Gerichte im Plan → "Ich plane gern", sonst "Mal
  so, mal so"; `planWeek` = "nur diese Woche planen"). Einstellbar unter
  Kochstil (`/profil/kochstil`), im Kennenlernen (Frage "Wie kocht ihr eher –
  mit Plan oder spontan?" nach dem Wochenend-Stil; spontan → ohne Einkaufstag
  und Wochenvorgaben) und im Formular (Schritt "Mit Plan oder spontan?").
  `effectivePlanStyle()`/`usePlanStyle()`: spontan mit `planWeek` dieser
  Woche zählt wie "mix".
- "Ich koche spontan": Daten bleiben, nur ausgeblendet. Wochenplan,
  Wochen-Check, Wochenvorlage und Einkaufstag leiten weiter (`PlanningGate`),
  Einstellungen ohne Einkaufstag/Wochenvorlage/Wochenend-Stil. Startseite:
  `useHomeData` zeigt vom Plan nur, was aus den Ideen gewählt wurde
  (`spontan: true` am Eintrag); Kachel "Ideen" statt "Woche"; Lottes Platz
  ohne Planungs-Stufe (Vorrat-Texte ohne "einplanen"), keine Tipps übers
  Planen, Bewertung nur für gewählte Ideen. Einkaufsliste: keine Wochenliste
  aus dem Plan (`manualOnly`), immer die laufende Woche, offene Artikel
  früherer Wochen wandern mit (`carryOverManual`). KI: Kochstil im Kontext;
  von der KI übernommene Gerichte werden als spontan markiert.
- Ideen für heute (`src/lib/essen/ideas.ts`, ohne KI): Wünsche ganz oben, dann
  Lieblinge/kennt ihr/👍, Vorrat und Reste, Jahreszeit, nicht dasselbe wie in
  den letzten 5 Tagen, unter der Woche eher schnell; dazu Familien-Klassiker.
  Heute-Karte ohne Gericht (alle Kochstile): `IdeasCard` "Was gibt's heute?"
  mit 3 kompakten Ideen-Karten ("Heute" übernimmt, Tippen = Rezept bzw.
  Details mit "Nicht jetzt"). Braucht die Idee noch etwas: "Soll ich dir das für
  heute auf die Liste setzen? Dafür brauchst du noch: …" → Einkaufsliste
  "Für heute" (ganz oben, für alle Kochstile; ersetzt "Heute holen"). Seite
  `/ideen` mit Filtern (schnell, veggie, mit Vorrat), Wunsch-Feld und – nur
  bei spontan – leise "Lieber ein paar Tage vorplanen?". Tagesstand unter
  `wasgibts.ideen`.
- Ideen aus dem Bestand (`src/lib/essen/dishIdeas.ts`, `src/lib/essen/useStock.ts`):
  Bestand = Vorrat + auf der Einkaufsliste Abgehaktes/"Haben wir schon"
  (diese und Einkaufswoche) + eben im Chat Genanntes (`ChatState.extra`,
  landet nicht im Vorrat). EINE Gerichte-Liste `DISHES` für "Was gibt's
  heute?", Spontan kochen und Testmodus. Bewertung: sobald etwas da ist,
  zählen genutzte Hauptzutaten, Abdeckung und Reste/bald Ablaufendes
  (Kühlschrank seit 2+ Tagen, `soonToUse`) mehr als Liebling/kennt ihr;
  Spontan: meiste Vorrats-Zutaten zuerst, reicht es ohne Einkauf nicht, dürfen
  1–2 Kleinigkeiten fehlen. Jede Idee zeigt "nutzt: … · noch: …" (`usesLine`).
  Vorrat (fast) leer (< 3 echte Zutaten): Grundzutaten-Gerichte und "Sag mir,
  was da ist, dann passe ich die Ideen an." Ideen werden bei jeder Änderung
  neu gerechnet; die gemerkte Position der Ideen-Karte gilt nur für denselben
  Bestand (`stockKey`). Die KI bekommt den aktuellen Bestand kompakt (Name,
  Menge, Ort, "gekauft", "bald verbrauchen"). Ohne KI: "Was kann ich heute
  kochen?" (`isCookIdeasRequest`) und "Was mach ich mit Hack und Paprika?"
  (`ingredientsFromQuestion`) öffnen die Spontan-Ideen.
- Wunsch-Ideen (`src/lib/essen/wishes.ts`, `wasgibts.wuensche`): "Mathis wünscht
  sich Pfannkuchen" im Chat (ohne Wochentag bzw. bei spontan immer lokal) oder
  auf `/ideen`; "Mathis' Wunsch" ganz oben, bis gewählt oder weggewischt.
- Planung freischalten (`src/lib/essen/planUnlock.ts`): "Ich will doch mal planen"
  im Chat (bei spontan) oder auf `/ideen` → "Nur diese Woche oder ab jetzt
  immer?"; immer → "Mal so, mal so" oder "Ich plane gern".
- "Mal so, mal so": freie Tage sind normal – kein "x/7 geplant", leerer Tag
  im Wochenplan "Spontan – Ideen gibt's am Tag selbst"; Lotte bietet statt
  der ganzen Woche höchstens einmal pro Woche "Soll ich dir die nächsten 2
  Tage vorschlagen?" an (nicht im Modus "Ganz locker").
- Sanft erkennen (`src/lib/essen/planDetect.ts`): "Ich plane gern", aber 3 Wochen
  höchstens 2 Tage selbst geplant (App seit 3+ Wochen genutzt, `since` im
  Aktivitäts-Speicher) → EINMAL "Ihr kocht eher spontan, oder? Soll ich die
  Planung ausblenden?"; "spontan", aber 2× "nur diese Woche" in 6 Wochen →
  EINMAL "… soll ich die Planung wieder einblenden?". Nie automatisch
  umstellen.

