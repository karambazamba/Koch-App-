# Leitbild "Was gibt's?"

Bei ALLEN Änderungen beachten.

## Wofür die App da ist
"Was gibt's?" ist eine cleane Alltags-App für Felix und seine Familie. Lotte
ist die Assistentin für Termine, Aufgaben, Essen und Einkauf – man gibt ihr
Dinge ab wie einer guten Haushaltshilfe, mit der man ganz natürlich spricht.
Lotte legt an und räumt wieder weg. Die Assistentin hat einen Namen, den die
Familie wählt (Standard: Lotte).

Die Begleitung heißt nicht fest Lotte: Name, Art (Assistentin/Assistent),
Stimme und Icon-Farbe sind Nutzereinstellungen; Standard-Auswahl Mia (Orange) /
Theo (Nachtblau). In allen Aufträgen meint ‚Lotte‘ die gewählte Begleitung.
Namen nie hart codieren. Nur ein Design (Warm) + Hell/Dunkel/Automatisch;
App-Farben fest, nur die Icon-Farbe der Begleitung ist wählbar (10 Farben). Seit v0.23 gilt diese Lieblingsfarbe auch für das App-Icon.

## 1. Ruhig und leer
- Drei Seiten: Woche · Heute · Essen (Heute ist die Startseite). Die
  Oberfläche ist ruhig und leer; nichts steht herum, was nicht gebraucht wird.
- Es gibt nur noch EIN Design. Zusätzliche Funktionen sind Bausteine, die
  sich in das neue Design einfügen (`src/lib/core/features.ts`, Einstellungen
  → "Bausteine – Was <Name> noch kann"). Alles Neue startet als
  ausgeschalteter Baustein und wird nur bei Bedarf gezeigt.
- Pro Bildschirm eine große Hauptsache, wenig Text, viel Weißraum. Leere
  Zustände freundlich und einladend, nie als Fehler.
- Termin = feste Uhrzeit, Aufgabe = zu erledigen, Notiz = nur festhalten.
  Heute zeigt bis zu 3 Termine (Kärtchen nebeneinander) und bis zu 3
  Aufgaben (schlanke Zeilen). Kachel antippen = öffnen, kleiner Knopf oben
  rechts = Neues (20 px, hell-orange, nie schwarz). Lottes Satz: eine Zeile,
  max. ~8 Wörter, nur was die Kacheln nicht zeigen, ohne Druck-Wörter.
  Gesten: Tippen = Eintrag, lange Drücken = Startseite bearbeiten, Wischen =
  Seite wechseln.
- Notizen = eine Kachel (Schnellnotiz + Angeheftetes), keine Kladde mehr.
  Kacheln: Wetter (DWD via Bright Sky/Open-Meteo, serverseitig, gecacht) und
  Pinnwand (Familien-Nachrichten, später geteilt über Konten, verschwinden
  nach 3 Tagen). Startseite wird direkt auf der Startseite bearbeitet
  (wackeln, ziehen, –, S/M/L). Zwei S nebeneinander, einzelne S wird breit.
  Standard-Reihenfolge: Pinnwand, Termine, Aufgaben, Wetter, Essen+Einkauf
  (Paar), Notizen, Vorrat, Morgen, Post – neue Kacheln landen dort. Kein
  Rückgängig beim Hinzufügen, nur beim Löschen (3 s).
- Startseite: Nutzer wählt Mitdenkend oder Immer gleich; Ruhe nach Feierabend
  ist ein eigener Schalter. Tagesphasen Morgen/Tagsüber/Kochen/Sport/Feierabend
  als erweiterbare Liste; Phasen ändern nie die gespeicherte Sortierung, immer
  Schild + ‚Alles zeigen‘; Feierabend frühestens nach letztem Arbeitstermin.
  Timer rechnen mit Endzeit. Sport: Wochenziel, Serien nur in Wochen, Lotte
  plant Trainings in Kalender-Lücken mit Wetter. Motivation: Erfolge zeigen,
  Versäumnisse nicht, konkret loben, selten feiern. iPhone-Web-Apps können
  nicht vibrieren. Push später: Feierabend respektieren.
- Erster Start = kurzes Kennenlernen im Chat (max. 4 Schritte,
  überspringbar). Antworten steuern die Startseite.

## 2. Gespräch zuerst
- Lotte (Sprache/Chat) ist der Hauptweg. Jede Funktion soll auch per Gespräch
  erreichbar sein. Bildschirme dienen zum Nachschauen und Feinjustieren.
- Lieber eine Frage mit 2–3 Knöpfen als ein Formular.
- Machen statt fragen: Kleine Dinge selbst erledigen und kurz melden (mit
  "Rückgängig"). Rückfragen nur bei echten Entscheidungen. Änderungen der KI
  immer als Vorschau mit "Übernehmen".

## 2a. Volle Kontrolle (Grundregel)
- Alles, was der Assistent anlegt oder ändert, muss ich selbst sehen,
  antippen, ändern und entfernen können. Und alles, was ich in der App tun
  kann, kann auch der Assistent tun – inklusive rückgängig machen. Die
  Startseite bleibt clean.
- Nichts auf der Startseite ist eine Sackgasse: jede Kachel öffnet ihre Seite.
- Nutzt Lotte eine versteckte Funktion, wird sie freigeschaltet und kurz
  gesagt, wo sie steht.
- KI zuerst: Ist die KI erreichbar, bekommt IMMER sie die Nachricht. Feste
  Regeln (Stichwort-Erkennung) sind nur die Notlösung ohne KI – oder werden
  ausgeführt, wenn die KI es per `app_befehl` so vorschlägt. Keine Regel
  darf einen Zustand hinterlassen, der weitere Nachrichten abfängt.

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
  Sprechblase mit mittiger Spitze auf orangem Verlauf (#F7843E → #EE5F14;
  einzige Quelle `scripts/generate-icons.mjs`, `npm run icons` erzeugt
  icon.svg, favicon 32/48 + favicon.ico, apple-touch-icon 180, PWA 192/512,
  maskable 512 mit Zeichen auf 72 % statt 88 %, lotte-192.png für Push). Alle Icon-Dateien
  tragen die Version im Namen (`ICON_VERSION` in `src/lib/core/app.ts`, z. B.
  `apple-touch-icon-v3.png`; Pfade nur über `icon("…")`), damit iPhone/Android
  ein neues Icon nicht aus dem Cache holen – bei neuem Icon Version erhöhen,
  `npm run icons`, Liste in `public/sw.js` und `CACHE_VERSION` anpassen.
  Icon-Motiv: Sprechblase mit mittiger Spitze, senkrechte Augen, dezentes
  Lächeln, keine Härchen. Quelle: MOTIF in scripts/generate-icons.mjs; in der
  App nur über LotteAvatar.
  Icon/Avatar: Sprechblase mit mittiger Spitze, ruhiges Gesicht; eine
  Avatar-Komponente für alle Stellen. Lieblingsfarbe = Begleitung und
  App-Icon, einheitlich; übrige App-Farben fest. (Senkrechte Augen, dezentes
  Lächeln; ohne gewählte Farbe Orange)
  (`<LotteAvatar size color? />`, `src/components/LotteAvatar.tsx`: Kreis in
  der Icon-Farbe, Motiv auf 72 %; dunkle Farben Nachtblau/Anthrazit/Beere im
  Dunkel-Modus und auf der dunklen Leiste mit feinem hellem Rand) – in
  Lotte-Leiste, Chat-Kopf und -Blasen, Lottes Satz, Kennenlernen,
  Einstellungen und Push (`lottePush()`, `LOTTE_PUSH_ICON`). Manifest theme_color #EE5F14 (`BRAND_COLOR`).
- Schrift Plus Jakarta Sans, große fette Überschriften, weiße Karten
  (Radius 22px) auf #F7F4EF. Seiten-Leiste oben als Segment-Schalter
  (`bg-segment`, aktiv weiß). Lotte-Leiste unten dunkel (`bg-bar` #1F1B17,
  `text-on-bar`) mit orangem Avatar links und weißem Mikrofon-Knopf rechts –
  auf allen drei Seiten gleich und immer sichtbar. Familie = Orange
  (`bg-accent`), Arbeit = Blau (`bg-work`). Alles über Tokens, Hell/Dunkel/
  Automatisch (intern `warm`/`nacht`/`auto`).
- Startseite (`HomePager`, `src/components/alltag/`): siehe "Drei Seiten"
  und "Startseite anpassen" unten. Neue Funktionen bekommen keinen eigenen Platz, solange sie nicht
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
- Kein Alt-Modus mehr. Daten nur über das zentrale Speicher-Verzeichnis (mit Version/Migration); ‚Daten sichern/wiederherstellen‘ muss immer funktionieren. Jeder behobene Fehler bekommt einen Test; npm test vor jedem PR. Spracheingabe nur über useSpeechInput; beim Absenden immer cancel/reset. Aufgaben: dringend → heute → Frist → Woche → irgendwann, innerhalb nach Uhrzeit bzw. Erstellungszeit, nie alphabetisch. Jedes Fenster schließt per ✕, Danebentippen, Runterwischen, Zurück. Phase heißt ‚Morgens‘, der nächste Tag immer mit Wochentag. Größe ändert nur die Menge; S ≤ M ≤ L. Aufgaben 2er-Raster schlank, Termine schlanke Kärtchen. Wetter Standard S, eigenes Symbol-Set, Seite Heute/Morgen/7 Tage. Dateien möglichst unter 600 Zeilen.

## Roadmap
- Phase 1: Konten + Haushalt (Supabase) – Anmeldung, Haushalt mit Mitgliedern,
  gemeinsame Daten; Umzug der Einträge ins einheitliche Modell.
- Phase 2: Heute/Woche mit Terminen, Aufgaben (v0.10 lokal fertig) und Push.
- Phase 3: Essen + Einkauf neu.
- Phase 4: Post (Briefe, Rechnungen erfassen).
- Phase 5: Foto → Termin/Aufgabe.

# Hinweise für Claude

@AGENTS.md

## Arbeitsweise

- Nach jeder fertigen Änderung ohne Rückfrage: testen (`npm test`, `npm run build`,
  `npx tsc --noEmit`, `npm run lint`, bei UI-Änderungen zusätzlich ein
  Durchklick-Test im mobilen Browser – iPhone und Android-Chrome, z. B.
  Pixel 7), committen, Pull Request nach `main`
  erstellen und direkt mergen.
- Sprache der App und der Antworten: Deutsch.
- Gespeicherte Profile müssen bei Datenmodell-Änderungen weiter funktionieren
  (Version in `src/lib/einstellungen/profile.ts` erhöhen, `migrateProfile` in
  `profileStore.ts` erweitern, Version im Speicher-Verzeichnis anpassen).

## Aufgeräumt (v0.25)

- Kein Alt-Modus mehr. Daten nur über das zentrale Speicher-Verzeichnis (mit
  Version/Migration); „Daten sichern/wiederherstellen“ muss immer
  funktionieren. Jeder behobene Fehler bekommt einen Test; `npm test` vor
  jedem PR. Dateien möglichst unter 600 Zeilen.
- Speicher-Verzeichnis `src/lib/core/storage.ts` (`STORAGE`: Schlüssel, Zweck,
  Version, Ort der Migration, local/session, `backup`). `createLocalStore`
  nimmt nur `StorageKey`; direkte `localStorage`-Schlüssel ebenfalls als
  `StorageKey` typisieren. Nicht mehr genutzte Schlüssel stehen in
  `RETIRED_KEYS` und werden beim Start gelöscht (`removeRetiredKeys`,
  KitchenHelper; alte Termine erst nach der Übernahme, alter Vorlese-Schalter
  nach `adoptLegacySpeech`).
- Daten sichern/wiederherstellen (`src/lib/core/backup.ts`, Einstellungen →
  Daten & App): Datei mit allen `backup`-Schlüsseln (Teilen-Menü bzw.
  Download); Wiederherstellen zeigt vorher „3 Termine, 5 Aufgaben, …“
  (`backupSummary`) und fragt nach; Zugangscode, Zähler und Geräte-Kennung
  bleiben auf dem Gerät. Der Icon-Hinweis (`iconChangeHint`) verweist darauf.
  „Daten & App“ geht auch ohne Profil; beim Kennenlernen steht oben links
  „Sicherung einspielen“ (nach dem Neu-Hinzufügen zum Home-Bildschirm).
- Tests: Vitest (`npm test`, `tests/*.test.ts`, Zeit fest über `at()` aus
  `tests/helpers.ts`, Zeitzone Europe/Berlin). Ungenutzter Code: `npx knip`
  (Konfiguration `knip.json`; `@public` im Kommentar = bewusst für Tests/Push).
- Neue Version: Der Service Worker wartet; die App zeigt oben „Neue Version
  da – Antippen zum Aktualisieren“ (`ServiceWorkerRegistration`, Nachricht
  `SKIP_WAITING`, beim Öffnen/Zurückkehren `update()`); erst das Antippen lädt
  neu. Einstellungen ganz unten „Version 0.25 · Stand {Datum}“
  (`versionLabel()`, Datum beim Bauen über `BUILD_DATE` in `next.config.ts`).
- Erst bei Bedarf geladen: das Gespräch (`HelperPanel` über `next/dynamic`, im
  Leerlauf vorgeholt – mit Mails, Backstube, Supermarkt) und die Tipp-Sammlung
  (nur wenn Tipps/Wochenend-Ideen an sind).
- Chat aufgeteilt: `chatTypes.ts` (Typen), `localRules.ts` (feste Regeln
  ohne KI, `RuleContext`), `mailRules.ts`, `ChatTurnItem.tsx`, `ChatBits.tsx`.
  Profil: `profile.ts` (Modell, Hilfen) + `profileStore.ts` (Migration,
  Speichern). Testmodus: `mock.ts` + `mockAlltag.ts` + `mockShared.ts`.
  `onboarding/engine.ts` ist nur noch „neue Person“ im Chat.
- „Kladde“ heißt im Code überall „Schnellnotiz“ (`schnellnotiz.ts`,
  `Schnellnotiz.tsx`, Tokens `bg-schnellnotiz` …, Werkzeuge
  `schnellnotiz_schreiben/_aufraeumen`, Op `set_schnellnotiz`); nur der
  Speicher-Schlüssel bleibt `wasgibts.kladde`, und Lotte versteht „Kladde“
  weiter.
- Tippflächen mindestens 44 × 44 px: kleine Knöpfe bekommen die Klasse `hit`
  (unsichtbare Fläche, Aussehen bleibt; `chipClass` hat sie schon).
- Sicherheit: KI-Routen prüfen Zugangscode und Limits (`guard.ts`), Wetter hat
  ein Limit pro IP (ohne Code, weil es auch ohne KI gehen muss). Vor jedem PR
  `.next/static` nach `sk-ant` durchsuchen.

## Fundament (Neustart, v0.9)

- Ordner nach Bereichen in `src/lib/`: `core` (Zeit `now.ts`, Speicher
  `localStore.ts`/`useExternalStore.ts`, Feature-Flags `features.ts`,
  Datenmodell `entries.ts`, Navigation, Toast, Ansicht, Aktivität, Termine,
  Wetter), `lotte` (KI-Client, Engine, Werkzeuge, Prompt, Sprache ein/aus,
  Chat-Vorschläge), `essen` (Plan, Rezepte, Ideen, Vorrat, Tipps, Backstube …),
  `einkauf` (Einkaufsliste, Plus), `aufgaben` (Termine & Aufgaben),
  `einstellungen` (Profil, Kennenlernen, erster Start `welcome.ts`). Oberfläche in
  `src/components/` nach Bildschirmen.
- Bausteine (v0.13, `src/lib/core/features.ts`, Speicher
  `wasgibts.funktionen` v2 `{ on: Feature[] }`): `BAUSTEINE` = Wochenplan,
  Vorrat & Tiefkühler, Rezepte, Backen mit Timern, Spontan-Ideen (inkl.
  `/ideen`), Tipps, Wochenend-Ideen, Kochstil & Vorlieben, Wie oft melde ich
  mich? – je Icon, Name, Satz, `where` ("Der Wochenplan steht jetzt rechts
  unter Essen."). `useFeature()`/`featureOn()`/`setFeature()`/
  `unlockFeature()`; Seiten eines Bausteins über `FeatureGate` (auch mehrere,
  z. B. `/kochbuch` = Rezepte oder Backen). Einstellungen → "Bausteine"
  (`/profil/bausteine`, `BausteineView`: An/Aus mit Hinweis und Rückgängig).
  Eingeschaltet im neuen Design: Wochenplan → "Ganze Woche planen" auf Essen
  (+ Standardwoche in den Einstellungen), Rezepte/Backen/Vorrat/Spontan →
  Abschnitte auf Essen (`BausteinSections`), Vorrat zusätzlich als Kachel
  "vorrat" auf Heute (über "Startseite anpassen" ein-/ausblendbar, ohne
  Baustein nicht in der Liste), Tipps/Wochenend-Ideen → nur über den einen
  Satz oben auf Heute an ruhigen Tagen (`dailyTip`, "Mehr dazu"), Kochstil/
  Modi → Zeilen in den Einstellungen. Lotte: `baustein_an`/`baustein_aus`
  (Op `set_feature`, Vorschau + Übernehmen; Kontext "Bausteine an/aus"); ohne
  KI `parseBausteinCommand` ("Zeig mir den Vorrat", "Ich brauche die Tipps
  nicht", "Was kannst du noch?"). Nutzt Lotte einen ausgeschalteten Baustein,
  schaltet sie ihn ein und sagt, wo er steht. Der alte Schalter "Alte
  Funktionen anzeigen (Test)" ist weg: v1 mit `legacy` wird beim Update
  zurückgesetzt, Genutztes (Plan, Vorrat, Rezepte, Backen, Tipps, Ideen,
  Vorlieben, Modus) als Bausteine übernommen. Den alten Aufbau (`/?legacy=1`) gibt
  es seit v0.25 nicht mehr. Auf allen Seiten dieselbe
  dunkle Lotte-Leiste (`LotteBar`, statt des runden Knopfs).
- Immer sichtbar: Startseite (siehe Leitbild 7), Chat mit Lotte,
  Einkaufsliste, schlanke Einstellungen (Startseite & Bausteine, Name &
  Stimme, Vorlesen, Ansicht, Familie, Daten & App) und beim ersten Start das
  Kennenlernen (siehe unten).
- Kennenlernen beim ersten Start (v0.17, ohne Profil auf `/` und `/profil`,
  nach "Neu anfangen" wieder; `WelcomeChat` in `src/components/welcome/`,
  Ablauf rein in `src/lib/einstellungen/welcome.ts`, Zwischenstand v2 unter
  `wasgibts.willkommen`, v0.14-Stand wird übernommen – `migrateWelcome`).
  1. Im Vollbild (seit v0.22, siehe "Begleitung zum Aussuchen"): "Wer soll
  dir helfen?" (Mia/Theo/eigener Name) und die Vorstellung der Begleitung,
  oben "Überspringen". Ab Schritt 2 Chat: 2.
  "Wobei soll ich dir helfen?" (Termine, Arbeit, Essen, Einkauf, Familie;
  Standard Termine+Essen+Einkauf), bei Essen "Woche planen / Spontan / Mal so,
  mal so", 3. bei Familie "Wer gehört zu deiner Familie? …", sonst "Wie heißt
  du?" – Formular im Chat (`WhoForm`): DEIN NAME (Pflicht, erwachsen), bei
  Familie Liste mit Erwachsen | Kind, ✕, "+ Person hinzufügen" (Fokus);
  Gesagtes/Getipptes füllt es aus (`fillMembers`, mit KI `recognizeAnswer
  ("names")`); Chips "Fertig" (erst mit Namen) · "Nur ich"; das Formular ist
  die Bestätigung. 4. "Super, <Name> – alles bereit!" mit 3 Beispiel-Sätzen.
  Das Gespräch wird aus dem Zustand gebaut (`transcript`): jeder Schritt genau
  einmal, Antippen einer Antwort öffnet ihn wieder (`editStep`), danach geht
  es beim nächsten offenen Schritt weiter. Wirkung (`finishWelcome`): Profil
  (Personen, Haushaltstyp, Name/Stimme, Planstil), Kacheln (ohne Essen/Einkauf
  keine Kachel), Bausteine Wochenplan/Spontan, Raum "Arbeit" nur wenn gewählt
  (`useWorkRoom`). Überspringen = Standardwerte.
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

## Startseite "Heute" – Kacheln 2.0 (v0.20)

- Layout (`src/lib/core/homeLayout.ts`, Speicher `wasgibts.startseite` v3
  `{tiles: {id, visible, size}[], tipSeen}`): pinnwand, termine, aufgaben,
  wetter, essen, einkauf, notizen, vorrat, morgen, post ("bald") –
  `HOME_TILES` in Standard-Reihenfolge mit erlaubten Größen (`sizes`) und
  Standard-Größe (M; Essen/Einkauf/Vorrat S; Morgen nur M; Post/Vorrat S·M).
  L und M = volle Breite, S = halb; zwei S direkt hintereinander stehen
  nebeneinander, eine einzelne S wird breit (`tileRows`). Essen + Einkauf =
  Paar (`keepPair`: immer direkt hintereinander, Essen zuerst; wandern
  zusammen). "zeigen" setzt eine Kachel an ihren Standard-Platz (direkt nach
  der nächsten sichtbaren, die laut Standard davor steht; Paar neben den
  Partner) in Standard-Größe; `standardLayout()` = Reihenfolge und Größen wie
  am Anfang. Aktionen auch für Lotte: zeigen, ausblenden, klein/mittel/gross
  (alt kompakt/ausfuehrlich), hoch/runter/nach_oben/nach_unten, standard.
  Migration v2→v3: Größen gesetzt, Kladde-Kachel wird Notizen an derselben
  Stelle. Standard sichtbar: Termine, Aufgaben, Essen + Einkauf, Morgen
  (Vorrat nur mit Baustein); Pinnwand/Wetter/Notizen in der Auswahl mit "NEU".
- Verschieben (v0.23): Finger über Touch-Events (Pointer-Events bricht iOS beim
  Scrollen ab); das Original-Element bleibt beim Ziehen im DOM (wandert mit
  gleichem key als gestrichelter Platzhalter an die Zielstelle, flaches
  2-Spalten-Raster ohne Zeilen-Wrapper), `touchmove` mit `passive: false` auf
  `document` ab Beginn des Haltens, nach dem Anheben `preventDefault`; im
  Bearbeiten-Modus `touch-action: none` auf den Kacheln (gescrollt wird über
  freie Flächen und Auto-Scroll am Rand); kein Wackeln beim Halten/Ziehen;
  Wackeln auf dem inneren Element, Ziehen außen; Callout/Auswahl aus
  (`[-webkit-touch-callout:none]`, `select-none`, `contextmenu` verhindert).
  Absicherung: kurz antippen = Menü (Ganz nach oben · Nach oben · Nach unten ·
  Größe · Entfernen, `UnitMenu`, jede Auswahl schließt). Drag: Wackeln auf
  inneres Element, Callout aus, Menü-Absicherung. Test mit echten
  Touch-Ereignissen (CDP `Input.dispatchTouchEvent`).
- Bearbeiten-Modus DIREKT auf der Startseite (`HomeBoard.tsx`, `TodayPage`
  `useHomeEditing`): lange drücken, Link "✎ Startseite bearbeiten",
  Einstellungen (`/profil/startseite` → `requestHomeEdit()` + "/"), Lotte
  ("Startseite bearbeiten"). Kopf "Startseite bearbeiten" + "Fertig", grau
  "Gedrückt halten & ziehen · Größe unten rechts · – entfernt". Kacheln
  wackeln (±0,6°, abwechselnd), Inhalte `inert`; "–" oben links (Gelöscht ·
  Rückgängig), "S · M · L" unten rechts. Festhalten (0,2 s) und ziehen:
  schwebende Kopie, gestrichelter Platzhalter, andere rutschen (FLIP),
  Auto-Scroll am Rand, Vibration; Touch: nicht-passiver `touchmove` blockt
  das Scrollen nur beim Ziehen. Unten "+ Kachel hinzufügen" (`TilePicker`)
  und "Standard-Anordnung wiederherstellen" (mit Nachfrage). Wischen aus;
  "Fertig", Zurück (eigener Verlaufseintrag) oder freie Fläche beendet.
- Kachel-Inhalte je Größe: Termine S = nächster + "+2 weitere heute", M = 3
  Kärtchen, L = alle des Tages; Aufgaben S = Anzahl + wichtigste, M = 3, L =
  6 Zeilen (Abhaken: ca. 1 s durchgestrichen, nochmal tippen = doch nicht);
  Essen S / M (Zeit, "alles im Haus" bzw. "noch: …", ⇄) / L (+ Ideen für
  morgen); Einkauf S / M (6 zum Abhaken) / L (10); Notizen (gelblich) S =
  Schnellnotiz 2 Zeilen, M + angeheftete Chips, L + 3 neueste; Wetter;
  Pinnwand 1/2/4; Vorrat S/M; Morgen M (`HomeTiles.tsx`, `MiniCards.tsx`).
- Schnellnotiz (früher Kladde, Speicher weiter `wasgibts.kladde`; `Kladde.tsx`):
  oben auf `/notizen` direkt beschreibbar (`SchnellnotizCard`), von der
  Notizen-Kachel über ✎ als Fenster (`KladdeSheet`). Lotte versteht "Schreib
  in die Kladde/Schnellnotiz …", "Notier mir schnell …", "Räum meine
  Schnellnotiz auf" (`kladdeCommand`, `isKladdeTidyRequest`).
- Wetter (`src/lib/wetter/`): `/api/wetter?ort=` (Open-Meteo inkl. DWD-
  Modelle, Geocoding, 30 Min Server-Cache, Limit pro IP; `?lat&lon` → nur
  Stadtname über Nominatim), `WETTER_MOCK=1` = Testmodus (fester Regen 15–18
  Uhr, `szenario` heiss/frost/klar/sturm, `heute`). App: Ort
  `wasgibts.wetterort` (Standard Eutin, Einstellungen → "Wetter-Ort"
  `/profil/wetter`, "Meinen Standort verwenden"), letzte Daten
  `wasgibts.wetterdaten` (offline "Stand 8:10"). Kachel leicht blau (Tokens
  `bg-weather`/`weather-2`/`weather-line`/`text-weather-ink`): S Symbol +
  Temperatur + Tipp; M + Beschreibung, Tief/Hoch, 4 Zeitpunkte; L + 5 Tage;
  Antippen = Stunden heute + 7 Tage. EIN Tipp (`weatherTip`): Regen zur
  Termin-Zeit "☂️ Ab 15 Uhr Regen – Schirm für …", sonst Regen, Frost
  morgens, Sturm, ab 25 °C "Sonnencreme einpacken ☀️", Wind – oder keiner.
  Lotte: `wetter_abfragen` (Vorhersage vorab geholt, wenn die Frage nach
  Wetter klingt), ohne KI `weatherQuestion` ("Wie wird das Wetter morgen?",
  "Brauch ich heute einen Schirm?", "… am Samstag?").
- Pinnwand (`src/lib/pinnwand/`, Speicher `wasgibts.pinnwand` v1, Einträge
  typ "pinnwand", Raum Familie; Autor = eigener Name, später aus dem Konto):
  Text bis 140, Reaktionen 👍/❤️, gelesen von, dauerhaft angeheftet; älter
  als 3 Tage verschwindet (`prunePins`). Kachel weiß: oranger Punkt bei
  Ungelesenem, "+" (Textfeld + Mikrofon, "Anheften"), Kreis mit Anfangsbuch-
  stabe (feste Farbe je Person, `personTone`, Tokens `person-3/4`), "Lisa ·
  7:48"/"Du · gestern"; Antippen = reagieren, dauerhaft anheften, Löschen
  (nur eigene). Lotte: `pinnwand_schreiben` (Op `add_pin`), Kontext
  "Pinnwand: …"; ohne KI "Schreib an die Pinnwand: …", "Was steht auf der
  Pinnwand?". Nutzt Lotte die Pinnwand, kommt die Kachel auf die Startseite.
- Kein Rückgängig beim Hinzufügen (app-weit): Hinzufügen, Abhaken,
  Übernehmen, Kachel hinzufügen, Größe, Sortieren = still (Animation,
  Vibration); das Zurücknehmen bleibt für "Mach das rückgängig" registriert
  (`pushUndo`). Nur echtes Löschen (Eintrag, Notiz, Pinnwand-Nachricht,
  Schnellnotiz leeren, Kachel entfernen, Tag freimachen; im Chat
  Wochenplan/Einkaufsliste leeren) zeigt die kleine Meldung "Gelöscht ·
  Rückgängig" für 3 s (`showDeleted` in `core/toast.ts`, `act(…, label,
  { deleted: true })`, Chat-Turn `deleted`).
- Weiter wie v0.18/v0.19: Lottes Satz (`homeSentence`), Schnell-Knöpfe
  (`QuickButton`), Schnell-Termin (`TerminQuickAdd`), Schnell-Aufgabe
  (`TaskQuickAdd`), einmaliger Hinweis nach dem Kennenlernen, Start-Kacheln
  aus dem Kennenlernen (`homeTilesFor`, in Standard-Reihenfolge).

## Korrekturen Teil B (v0.26)

- Diktat: `useSpeechInput().reset()` beim Absenden (alle Eingaben), danach
  schreibt nichts mehr zurück; Doppel-Absenden gesperrt.
- Aufgaben-Reihenfolge zentral (`orderedTasks`, `sortItems`,
  `byTimeThenAge` in `aufgaben/model.ts`): dringend → heute (inkl. "von
  gestern") → nächste Frist → diese Woche → irgendwann; innerhalb Uhrzeit,
  sonst Erstellungszeit (`seit` nach "Auf morgen" = ans Ende), nie alphabetisch.
- Dringend: `AufgabeData.dringend`, Chip „❗ Dringend“ im Schnell-Eintrag,
  Menü „Als dringend markieren“/„Nicht mehr dringend“, Sprache „Dringend: …“ /
  „… ist wichtig“ (`urgentFrom`), Lotte `aufgabe_*` mit `dringend`; kleines
  oranges „!“ (`UrgentMark`, Tokens `quick`) vor dem Titel; Lottes Satz
  „**X** ist heute wichtig.“ Keine zusätzlichen Erinnerungen.
- Fenster: `useBackCloses` (Zurück-Geste schließt; Verlaufseintrag
  `{sheets}`) in `Sheet`, `ConfirmDialog`, Einkauf-Plus und Chat; ✕,
  Danebentippen, Runterwischen wie gehabt. Phasen-Schild öffnet ein Fenster
  (Erklärung, „Normale Ansicht“, „Einstellungen“); danach nur der Chip „✨
  Wieder mitdenken“ (`phase.resume`). Phase „☀️ Morgens · Überblick für den
  Tag“, nächster Tag immer mit Wochentag (`tomorrowLabel` → „Morgen · Mi“,
  Erinnerung „Morgen (Mi) um …“), Einstellung „Morgens bis 10:00“.
- Startseite: Termine als schlanke Kärtchen (`TerminCard`, 44–48 px; S 1,
  M bis 3, L bis 6 in 2 Reihen), Aufgaben im 2er-Raster (`TaskField`; S 2 –
  halb untereinander, breit nebeneinander –, M 2×2, L 2×4, ungerade = leeres
  Feld). Leere Kacheln „+ eintragen“, Einkauf-Vorschau mit „ · “.
  Statusleiste: `.status-veil` (Safe-Area, Hintergrund durchscheinend mit
  Weichzeichner), theme-color hell/dunkel ab dem ersten Zeichnen.
- Wetter: Standard S; eigenes Symbol-Set `WeatherSymbol`
  (`src/components/wetter/`, Farben `--wx-*`), Kachel-Verlauf je Lage
  (`.wx-card[data-wx]`, `weatherGroup`, im Dunkeln gedämpft); S Symbol +
  Temperatur + ein Satz, M + Morgens/Mittags/Abends, L + 5 Tage in Worten.
  Seite `/wetter` (`WeatherView`): Heute · Morgen · 7 Tage (wischen, Punkte;
  ab 18 Uhr „Morgen“, `?tag=`), Kopfkarte, Satz zu Terminen (`daySentence`),
  drei Tageszeit-Karten mit Tipp-Chips (`dayParts`), 7 Tage mit „☀ draußen“
  und „Bester Tag für draußen“ (`bestOutdoorDay`). Rein in
  `src/lib/wetter/view.ts`; Testmodus zusätzlich `schnee`/`gewitter`/`wolkig`.
- Sport: jeder Tag der Kachel öffnet `SportDaySheet` (leer: „✓ Wie letztes
  Mal“ + Eintragen; trainiert: Ändern, „+ Noch ein Training“, Löschen;
  geplant: Erinnerung, Wetter, „✓ Erledigt“, „Verschieben …“, „Absagen“;
  Zukunft: „Training planen“ mit `freeStarts` → Termin Etikett Sport,
  Erinnerung 30 Min).
- Test: `tests/teilb.test.ts`; Durchklick `groessen` (Höhen S ≤ M ≤ L) und
  `teilB` im Scratchpad.

## Begleitung zum Aussuchen + Hell/Dunkel (v0.22)

- Seit v0.23: Lieblingsfarbe = Begleitung UND App-Icon (siehe "App-Icon in der
  Lieblingsfarbe"); die übrigen App-Farben bleiben fest.

- Datenmodell (Profil v19, `src/lib/einstellungen/profile.ts`): `helper =
  { name, art: assistentin|assistent, voice, farbe }`; `voice` folgt immer der
  Art (`voiceForArt`, `helperWith`). `STANDARD_HELPERS` = Mia (Assistentin,
  Orange) und Theo (Assistent, Nachtblau), `DEFAULT_HELPER` = Mia (neue
  Nutzer). `AVATAR_COLORS` (10: Orange #F26B21, Nachtblau #2B4470, Himmelblau
  #3B82C4, Lila #7357C4, Beere #A33B67, Rosa #E06C9F, Koralle #E8615A, Senf
  #C9962B, Waldgrün #3F7A5A, Anthrazit #3E3A37), `avatarHex()`. Migration
  (`migrateHelper`): ohne Namen → Lotte (wer Lotte hat, behält Lotte); Art
  aus dem Namen (Mia/Lotte → Assistentin, Theo → Assistent, sonst aus der
  bisherigen Stimme); Farbe Theo → Nachtblau, sonst Orange. Texte nur über
  `helperName()`, `helperTitle()` ("deine Assistentin"/"dein Assistent"),
  `helperTitlePersonal()`, `helperMessage()` – nie einen Namen hart codieren.
- Gesicht: `<LotteAvatar size color? />` nimmt ohne `color` die Profilfarbe
  (seit v0.23 das ruhige Gesicht, siehe Leitbild 7; `.begleitung-ring` in
  `globals.css`). App-Icon bleibt orange.
- Auswahl (`src/components/begleitung/BegleitungPicker.tsx`): zwei Karten
  Mia/Theo (Radio, ✓ und oranger Rand, "▶ Stimme" = `playVoice` → "Hallo,
  ich bin …" mit passender Stimme), "✎ Oder gib mir einen eigenen Namen …"
  (Feld, `ArtChoice` Assistentin/Assistent, `ColorDots` 2×5 mit Ring). Im
  Kennenlernen und unter `/profil/kuechenhelfer` (`HelperEditor`).
- Kennenlernen: Schritt `begleitung` (Vollbild "Wer soll dir helfen?",
  "Deine persönliche Begleitung im Alltag", Mia vorausgewählt, "Kannst du
  jederzeit ändern.", "Weiter") → `hallo` (Vorstellung: Avatar in der Farbe,
  Sprechblase "Hallo, schön, dass du da bist! 👋 Ich bin **Name**, deine
  persönliche Assistentin | dein persönlicher Assistent bei **Was gibt's?** …",
  "🔊 Vorlesen", 4 Kacheln Termine · Aufgaben · Essen · Einkauf, "Los geht's")
  → weiter wie bisher. Zwischenstand v2: alter Schritt "name" → `begleitung`.
- Stimme (`speech.ts`): Assistentin → beste weibliche deutsche Stimme,
  Assistent → beste männliche, sonst irgendeine deutsche. Fehlt eine passende:
  einmal der Hinweis `VOICE_HINT` (iPhone-Einstellungen → Bedienungshilfen →
  Gesprochene Inhalte → Stimmen → Deutsch; `takeVoiceHint`,
  `wasgibts.stimmenhinweis`). Stimme frei wählbar unter `/profil/vorlesen`;
  wechselt die Art, wird eine fest gewählte Stimme auf "Passend" gesetzt.
- Einstellungen ganz oben (`BegleitungSettings.tsx`): DEINE BEGLEITUNG – Name
  (mit Gesicht) › · Ist: Assistentin | Assistent · Stimme › · Farbe ›
  (`/profil/farbe`) · Vorlesen an/aus (an = automatisch), Hinweis "Oder
  einfach sagen: ‚Ich nenn dich ab jetzt Frieda.‘"; DARSTELLUNG – Automatisch
  · Hell · Dunkel (Standard für neue Profile Automatisch). "Frisch" ist weg
  (wird Automatisch).
- Lotte: `assistent_anpassen` (`helperTools.ts`, Op `set_helper`, Vorschau +
  Übernehmen; Mia/Theo bringen Art und Farbe mit), antwortet im neuen Namen
  ("Gern – ab jetzt bin ich Frieda. 😊"), danach Hinweis, wo man es ändert.
  Ohne KI `parseHelperCommand` in `settingsChange` ("Ich nenn dich ab jetzt
  Frieda", "Sei lieber Theo", "Nimm eine männliche Stimme", "Mach dich
  lila") – sofort, zurück mit "Mach das rückgängig". Systemanweisung: "Du
  heißt {Name} und bist {die persönliche Assistentin | der persönliche
  Assistent} der Familie in der App ‚Was gibt's?‘. Charakter: warm, kurz,
  ohne Druck, motivierend."

## Lebendiger Avatar (v0.24)

- Icon/Avatar: Sprechblase mit mittiger Spitze, ruhiges Gesicht; eine
  Avatar-Komponente für alle Stellen. Lieblingsfarbe = Begleitung und
  App-Icon, einheitlich; übrige App-Farben fest. Avatar-Zustände (ruhig,
  begruessen, zuhoeren, denken, sprechen, freuen, verwirrt, schlafen) setzt
  die App automatisch – nie vom Nutzer gewählt; im Chat ersetzt ‚denken‘ jede
  Lade-Anzeige; Fehler zeigt ‚verwirrt‘ statt Fehlermeldung.
- Vorlage: `docs/vorlagen/avatar-animation.md` (SVG mit Klassen `av-*`, CSS in
  `globals.css`, `data-zustand` am Wrapper, `--c` = Lieblingsfarbe, `.klein` <
  44 px bzw. Leiste, `.gross` ≥ 56 px bzw. Chat-Kopf/Vorstellung; nur
  transform/opacity, `prefers-reduced-motion` = keine Bewegung).
- Zentraler Zustand `src/lib/core/avatarState.ts` (alle Avatare gleich):
  Rangfolge zuhören > sprechen > denken > verwirrt > freuen/begrüßen >
  schlafen > ruhig. Auslöser: `useSpeechInput` (Mikrofon an), Chat
  (`busy` ohne Text → denken; Fehler-Turn → verwirrt), `speech.ts` (onstart/
  onboundary: Mund nur während Worte, Pause > 0,6 s = ruhig), `act()` (letzte
  Aufgabe des Tages erledigt → freuen), `celebrate()` (Sport-Wochenziel →
  freuen), `TodayPage` (Feierabend mit Ruhe → schlafen; erstes Öffnen am Tag →
  begrüßen, `wasgibts.avatargruss`), Leiste antippen weckt. Einmalige Zustände
  starten per neuem Element neu und fallen danach auf ruhig zurück.
  Fester Zustand nur wo passend (`zustand`: Mia/Theo-Karten ruhig,
  Vorstellung begrüßen). Kein 👋 mehr.
- Sätze statt Fehlermeldung: "Hm, das hab ich nicht verstanden." /
  "Ich bin gerade offline – was du einträgst, speichere ich trotzdem."
  (`unavailableText`). Lautstärke-Ring per Web Audio bewusst nicht (kollidiert
  auf dem iPhone mit der Spracherkennung) – normales Pulsieren.

## App-Icon in der Lieblingsfarbe (v0.23)

- `npm run icons` erzeugt je Farbe aus `AVATAR_COLORS` einen Satz unter
  `public/icons/<farbe>/` (icon.svg, icon-192, icon-512, icon-maskable-512 mit
  Zeichen auf 72 %, apple-touch-icon 180, favicon-32; Verlauf von der Farbe
  18 % heller zur vollen Farbe, Gesicht in der vollen Farbe; Orange = Original).
  Pfade über `iconFor(farbe, "…")` (`src/lib/core/app.ts`).
- Manifest dynamisch (`src/app/manifest.ts`): liest das Cookie `farbe`, feste
  `id: "/"`, gleiche URL – Android/Chrome übernimmt ein neues Icon selbst.
- `IconSync` (Layout): setzt beim Laden und nach jeder Farbwahl das Cookie und
  `apple-touch-icon`/Favicon auf die Farbe (das iPhone liest das Icon beim
  "Zum Home-Bildschirm"). App-Logo (`AppIcon`) ebenfalls in der Farbe.
- Kennenlernen: nach "Wer soll dir helfen?" (nur im Browser, nicht als
  Homescreen-App – `isStandalone()`) Hinweis "Jetzt zum Home-Bildschirm
  hinzufügen" mit Icon-Vorschau und 2 Schritten je Gerät (`addToHomeSteps`).
- Farbwechsel später (Einstellungen `/profil/farbe` mit Icon-Vorschau, Lotte,
  Regel ohne KI): auf dem iPhone als Homescreen-App `iconChangeHint()` – "Das
  Icon auf dem Homescreen bleibt, bis du die App neu hinzufügst." und, solange
  `CLOUD_SYNC` aus ist, die Warnung zum Datenverlust beim Entfernen.

## Tagesphasen, Timer, Sport (v0.21)

- Tagesablauf (`src/lib/tagesablauf/settings.ts`, Speicher
  `wasgibts.tagesablauf` v1): `mode` mitdenkend (Standard) / gleich, `ruhe`
  (Ruhe nach Feierabend, Standard an), `morgenBis` 10:00, `feierabendAb`
  20:00 + `nachArbeit` (frühestens nach dem letzten Arbeit-Termin),
  `arbeitstage` (0 = Mo … 6 = So, Standard alle), `kochenAuto` + `kochenMin`
  (20). Einstellungen → ganz oben "Tagesablauf" (`/profil/tagesablauf`,
  `DayRoutineView`: zwei große Karten mit Mini-Vorschau, Schalter, Zeiten,
  Arbeitstage, Kochen-Modus, Zeit-Vorschau "So tun, als wäre es …" =
  sessionStorage `wasgibts.zeitvorschau`, wirkt nur auf die Startseite,
  Hinweis "Vorschau: 18:20 · beenden" (`PreviewBanner`)). Kennenlernen: Frage
  "Soll sich deine Startseite dem Tag anpassen?" (Schritt `startseite`),
  "Sport" als Auswahl mit Frage nach dem Wochenziel (Schritt `sport`). Lotte:
  `startseite_modus` (Op `set_day_mode`, Vorschau); ohne KI "Lass die
  Startseite immer gleich" / "Startseite soll mitdenken". Push-Regeln schon
  vorbereitet (`tagesablauf/push.ts`, `pushAllowed`).
- Phasen (`src/lib/tagesablauf/phases.ts`, rein): `PHASES` = Liste mit `id`,
  `rank` (Kochen 50 > Sport 40 > Feierabend 30 > Morgen 20 > Tagsüber 10),
  `active(ctx)`, `view(ctx)` (Schild, Erklärung, `top` Vorrang-Kacheln mit
  Größe/`force`, `collapse`, `hide`, `hideWork`, `familyUpcomingOnly`,
  `weatherTomorrow`, `wakeLock`). `arrangeHome()` ordnet nur die Anzeige –
  die gespeicherte Sortierung bleibt. Morgen (5:00–morgenBis): Pinnwand (nur
  bei Neuem, dann mit Wetter klein nebeneinander) · Wetter · Termine ·
  Aufgaben. Kochen: Essen mit Uhrzeit 20 Min vorher bis 45 Min danach, ein
  laufender Timer (bis 15 Min nach dem letzten) oder "Ich koche jetzt"
  (Essen-Kachel/Lotte, `kochen/session.ts`, `wasgibts.kochen`); Essen L
  (`CookingTile`: Schritte abhaken, "JETZT", ⏱ je Schritt mit Zeit,
  "Rezept groß öffnen ›", "Gegessen ✓"), Timer M, Einkauf/Wetter weg,
  Termine/Aufgaben/Pinnwand als Zeile "Heute noch: …" (aufklappbar), Wake
  Lock (`core/wakeLock.ts`). Sport: 60 Min vor einem Termin mit Etikett
  Sport bis zu seinem Ende (nur mit Sport-Kachel). Feierabend: ab
  feierabendAb bzw. nach dem letzten Arbeit-Termin bis 5 Uhr; Pinnwand,
  Familien-Termine, die heute noch kommen (nachts keine), Wetter "MORGEN"
  (S), Notizen, Freizeit-Idee (Liste "Als Freizeit markieren",
  `leisureIdea`), "1 Aufgabe wandert auf morgen", unten "💼 Arbeit, Termine
  und Aufgaben machen Pause bis morgen früh. Alles zeigen". Nicht-Arbeitstag:
  Arbeit ganztags weg. Lottes Satz je Phase (Timer-Stand/Schritt, Training,
  "Schönen Feierabend – für heute ist alles getan."). Wechsel nur beim
  Öffnen/Zurückkehren oder nach 30 s ohne Berührung (`useHomePhase`, nie im
  Bearbeiten-Modus), bewusste Schritte sofort (`nudgePhase`). Schild unter
  dem Datum (Tokens `phase-*`), antippen = Erklärung + "Normale Ansicht";
  "Alles zeigen" gilt bis zum nächsten Phasenwechsel
  (`wasgibts.alleszeigen`). "Immer gleich" = keine Phase, Timer/Sport nur
  als aktive Kacheln.
- Timer (`src/lib/timer/`, `wasgibts.timer` v1): bis 5 Timer + Stoppuhr,
  jeder mit Endzeit (stimmt nach Hintergrund/Neustart), Pause = Restzeit.
  Kachel (`TimerTile`, NEU) M: Ring, Restzeit groß, "+1", Pause/Weiter, ✕,
  weitere als Zeilen, Schnellknöpfe 5/10/15 Min · Stoppuhr (lange drücken =
  eigene Dauer + Name); S: nächster Timer oder "⏱ Timer starten". Bei
  "Mitdenkend" erscheint ein laufender Timer automatisch oben (bis 1 Min nach
  Ablauf). Band über allen Seiten (`TimerAlarm` im Layout): "⏰ Nudeln sind
  fertig – OK" mit Ton (Web Audio, beim Start freigeschaltet, alle 2,5 s bis
  OK, max. 1 Min); abgelaufen, während die App zu war: "⏰ Nudeln war um 18:30
  fertig". Einmaliger Hinweis zum Ton; `timerPushPlan` für Push später.
  Lotte: timer_stellen, timer_stoppen, stoppuhr, timer_status, kochen_starten,
  kochschritt – sofort ausgeführt (`INSTANT_OP_TYPES`, `runInstantOps`), ohne
  Übernehmen; ohne KI `dayChat()` (`lotte/dayChat.ts`).
- Sport (`src/lib/sport/`, `wasgibts.sport` v1, persönlich): Trainings (typ
  "training": Sportart, Minuten, km, Datum), Wochenziel (Standard 3, Woche ab
  Montag), Packlisten je Sportart, gefeierte Wochen. Sport-Termine = Termine
  mit Etikett "Sport" (nur meine/ohne "wer"); abgehakt zählen sie automatisch
  (`trainingsBetween`, Dauer aus dem Termin, ändern/löschen auf `/sport`).
  Kachel (`SportTile`, grün, NEU) S/M/L, Seite `/sport` (`SportView`: Ziel,
  Verlauf, Trainings, Packlisten), Eintragen-Fenster (`SportAddSheet`).
  Serie nur in Wochen (`weekStreak`). Feier genau einmal pro Woche
  (`SportCelebration` im Layout, `core/celebrate.ts`), mehr als das Ziel =
  "Bonusrunde! 🔥", Montag "Neue Woche, neues Glück." bzw. "Letzte Woche
  geschafft 🔥 – auf ein Neues". Lotte: sport_eintragen, sport_ziel_setzen,
  trainings_planen (`planTrainings`: freie Lücken, 60 Min Abstand zu Arbeit,
  Wunsch-Tageszeit, Wetter → trockene Zeit oder drinnen, Erklärung der
  Ausnahmen, Termine mit Erinnerung 30 Min vorher), sport_statistik – mit
  Vorschau; ohne KI `dayChat()`. Apple Health/Watch geht nicht (Web-App).
- Standard-Reihenfolge: Pinnwand · Termine · Aufgaben · Wetter · Essen +
  Einkauf · Timer · Sport · Notizen · Vorrat · Morgen · Post.
- Vibration nur über `navigator.vibrate?.` (Android); iPhone still.

## Termine, Aufgaben und die drei Seiten (v0.10)

- Datenmodell `src/lib/aufgaben/` (Speicher `wasgibts.eintraege` v1, im
  einheitlichen Eintrags-Modell): Termin = Titel, Datum, Startzeit, opt.
  Ende, Ort/Notiz, Raum, Etikett, Wiederholung (täglich/wöchentlich/
  monatlich/Wochentage), Erinnerung (aus/15/30/60/Vorabend), wer. Aufgabe =
  Titel, opt. Wunschtag oder Frist, opt. Uhrzeit, Raum, Etikett,
  Wiederholung, Erinnerung, erledigt (`doneOn` bzw. `doneDates`). Reine
  Logik in `model.ts` (`itemsForDay`, `setDone`, `moveItem` – bei Serien nur
  dieser Tag + Einzelkopie, `removeItem(onlyDate)`, `setReminder`). Alte
  Termine (`wasgibts.termine`) werden einmalig übernommen
  (`migrateOldTermine`, im KitchenHelper), alte Daten bleiben liegen.
- Termine, Aufgaben, Notizen getrennt (v0.16): Aufgabe hat optional Tag,
  Frist oder Zeitraum (`week` = Montag, "diese Woche"); ohne alles =
  "Irgendwann" (steht an keinem Tag). `taskOverview()` gruppiert Heute dran ·
  Diese Woche · Später · Irgendwann · Erledigt (14 Tage); `urgentTasks()`
  (heute, nächste Frist, diese Woche), `upcomingTermine()` (läuft noch oder
  kommt noch). Speicher `wasgibts.eintraege` v2: alte "Aufgaben" mit Tag +
  Uhrzeit (ohne Frist) wurden zu Terminen. Heute (`MiniCards.tsx`):
  Abschnitte TERMINE und AUFGABEN mit je 2 Kärtchen nebeneinander (1 = volle
  Breite, 0 = Abschnitt weg), Farbstreifen links (Familie orange, Arbeit
  blau), Termin: Uhrzeit 15 px fett, Titel 12,5 px, graue Zeile, Kästchen
  oben rechts; Aufgabe: Kreis links; "+ N weitere" → Tag bzw. `/aufgaben`;
  Antippen = Menü, Abhaken mit Animation/Vibration, der nächste gleitet
  herein (`card-in`). Essen und Einkauf (beide kompakt) nebeneinander.
  Seite `/aufgaben` (`TasksView`, Filter, Gruppen, "✓ N erledigt"
  eingeklappt, "+" mit "Irgendwann/Diese Woche"). Notizen
  (`src/lib/notizen/`, Speicher `wasgibts.notizen` v1, typ "notiz"): Titel,
  Emoji, Text ODER Liste (abhakbar), Raum, angeheftet. Seite `/notizen`
  (angeheftet oben voll, sonst 2er-Raster, Hinweis "Merk dir …"), Editor
  `/notizen/bearbeiten?id=|?neu=text|liste` (speichert sofort). Erreichbar
  über die Woche (unten "Aufgaben · Notizen"), Lotte und optional die Kachel
  "notizen" (Startseite anpassen, standardmäßig aus). Woche: Aufgaben mit Tag/
  Frist klein mit Kreis. Lotte: notiz_anlegen, notiz_aendern, notiz_loeschen,
  liste_eintrag_hinzufuegen (legt Liste an; "… wünscht sich …" → Geschenkideen),
  notiz_anheften, notizen_anzeigen, aufgaben_anzeigen, aufgabe_anlegen mit
  `zeitraum` (Ops `upsert_note`/`remove_note`); Kontext: Notiz-Titel und
  Aufgaben ohne festen Tag. Ohne KI `parseNoteCommand()` ("Merk dir das
  WLAN-Passwort: …", "Was steht auf der Packliste?", "Häng das WLAN oben an",
  "Was muss ich heute noch erledigen?", "Zeig mir meine Aufgaben/Notizen").
- Unerledigte einmalige Aufgaben mit Tag rutschen still auf heute: kein
  "überfällig", nur "von gestern"/"von Montag"/"von letzter Woche".
  Vergangene Termine und Serien-Tage verschwinden leise.
- Seiten (`HomePager`): Leiste "Woche · Heute · Essen", Wechsel per Tipp
  oder Wischen (nicht in Feldern/`data-no-swipe`), `?seite=woche|essen` per
  `router.replace`, Scrollhöhe je Seite gemerkt, keine Seiten-Punkte.
  - Heute (`TodayPage`): "Guten Morgen/Hallo/Guten Abend, <Name>." (bis 11/
    18 Uhr), Datum, EIN Satz von Lotte (`todaySentence`, z. B. "Ruhiger Tag:
    2 Termine, eine Aufgabe und abends Gemüsepfanne.") oder eine fällige
    Erinnerung ("In 30 Minuten: Jonne abholen.", `dueReminder`, "Okay" =
    gesehen), höchstens ein Knopf. Karte "Heute" (`DayItemsCard`): nach
    Uhrzeit, ohne Uhrzeit darunter; Zeile = Uhrzeit, farbiger Strich, Titel,
    Unterzeile (Etikett, von gestern, Frist, Erinnerung, Wiederholung),
    Kästchen (Animation + Vibration). Max. 3, "+ N weitere"; Erledigtes
    eingeklappt "✓ N erledigt"; alles erledigt: "Alles erledigt für heute
    🌙"; ohne Einträge keine Karte. Antippen = Menü (Erledigt · Auf morgen ·
    Erinnerung ändern · Bearbeiten · Löschen, bei Serien "Nur diesen Tag"/
    "Alle"), immer mit Rückgängig-Toast. Kacheln Essen (⇄ andere Idee,
    "Nehmen") und Einkauf ("+" mit Tippen/Einsprechen und "Oft gekauft"-
    Chips aus der Stammliste). Ab 16 Uhr gestrichelte Vorschau "Morgen".
    Keine Gesamtzähler auf Karten.
  - Woche (`WeekPage`): Filter Alles · Familie · Arbeit, Tageskarten ab heute
    (14 Tage, "Weitere Wochen"), links Wochentag + Datum groß, rechts
    Einträge mit Punkt und Uhrzeit, darunter 🍽 Essen; heute umrandet, leer
    "frei". Antippen → `/tag?datum=` (`DayView`, wie Heute für dieses Datum,
    Zurück → Woche). Plus → Formular (`EntryForm`).
  - Essen (`FoodPage`): groß das Gericht von heute (nach dem Essen morgen)
    mit Uhrzeit, Dauer, "alles im Haus" bzw. "noch: …", "Rezept ansehen"
    (`/kochbuch/rezept` ist dafür immer sichtbar) und "Tauschen"; "Diese
    Woche" als Liste (Antippen = tauschen mit 3 Ideen, Lotte fragen oder Tag
    freimachen; leer "noch frei – Lotte fragen" – nie "offen"); Einkauf als
    Chips. Nutzt die bestehenden Essensdaten (`useMeals`).
- Lotte (Bereich "alltag", `src/lib/lotte/calendarTools.ts`): termin_anlegen,
  termin_aendern, termin_loeschen, aufgabe_anlegen, aufgabe_aendern,
  aufgabe_erledigen, aufgabe_verschieben, tag_anzeigen, woche_anzeigen – als
  Vorschau mit "Übernehmen" (Ops `upsert_entry`, `remove_entry`,
  `done_entry`, `move_entry`, gespeichert in `save()`). Kontext je Anfrage:
  Datumsliste der nächsten 14 Tage und alle Einträge der nächsten 7 Tage mit
  ids (`contextLines`). Lotte erkennt Termin vs. Aufgabe, Familie/Arbeit und
  Etikett selbst und fragt nur bei Unklarheit.
- Startseite anpassen (v0.11, `src/lib/core/homeLayout.ts`, Speicher
  `wasgibts.startseite` v1): Kacheln termine/essen/einkauf/morgen mit
  Reihenfolge, Größe (kompakt = Titel + eine Zeile Vorschau, z. B. "Einkauf ·
  11 Sachen: Petersilie, Gurke …"; ausführlich = mehr) und sichtbar.
  Standard: Termine ausführlich, alles andere kompakt. Langes Drücken auf
  eine Kachel oder Einstellungen → "Startseite anpassen" (`/profil/startseite`,
  `HomeCustomizer`: ziehen, Kompakt/Ausführlich, ausblenden, "+ zeigen").
  Jede Kachel ist antippbar: Essen → Essen-Seite (Wochenplan), Einkauf →
  `/einkaufsliste`, Termine → "Tag öffnen" (`/tag`), Morgen → Tag morgen.
- Lotte kann alles, was man selbst kann (`homeTools.ts`):
  startseite_anpassen, wochenplan_anzeigen/aendern/loeschen,
  einkaufsliste_anzeigen/leeren/entfernen, rueckgaengig (Ops `home`,
  `clear_week`, `clear_shopping`, `remove_shopping`, `undo_last`). Ohne KI
  sofort mit Rückgängig (`homeChat.ts`, vor der KI): "Mach die Einkaufsliste
  wieder klein/groß", "Nimm die Einkaufsliste von der Startseite", "Zeig mir
  den Wochenplan", "Lösch den Wochenplan wieder", "Nimm Milch von der Liste",
  "Leer die Einkaufsliste", "Mach das rückgängig".
- Rückgängig überall (`src/lib/core/undo.ts`): jede Änderung von Lotte (KI
  übernommen oder lokal) legt ihr Zurücknehmen ab – Toast-Knopf ca. 10 s,
  danach "Mach das rückgängig" (letzte noch gültige, in dieser Sitzung).
- Sichtbar machen: Übernimmt man einen Wochenplan, wird "wochenplan"
  freigeschaltet (`unlockFeature`, `wasgibts.funktionen.unlocked`), die
  Essen-Kachel eingeblendet und Lotte sagt "Dein Wochenplan steht rechts unter
  Essen." sowie "Einkaufsliste: 11 Sachen für die Woche, davon 4 für heute."
  Vorrat/Rezepte werden beim ersten Nutzen freigeschaltet und erscheinen in
  den Einstellungen.
- Einkaufsliste: Einträge merken sich Gericht (`ManualItem.dish`) und Tag;
  oben "Für heute", darunter "Für die Woche". Lotte gibt `fuer_tag`/`gericht`
  mit.
- Chat-Reihenfolge (v0.12, `HelperPanel` `route`/`rules`): mit KI geht jede
  Nachricht an die KI (auch Startseite, Rückgängig, Einstellungen); die KI
  nutzt Werkzeuge oder `app_befehl` (Op `app_command`: die App führt den Satz
  nach "Übernehmen" mit `rules()` aus – Ansicht, Vorlesen, Einstellungen, neue
  Person, Produkte, Seiten). Ohne KI (oder wenn sie ausfällt) greifen die
  Regeln. Nur ein selbst geöffneter Spontan-Modus nimmt Zutaten direkt an;
  ein Satz ohne Zutaten beendet ihn.
- Schleifenschutz: Antwortet die KI genauso wie zuletzt, vergisst der Chat
  den bisherigen Verlauf und offenen Vorschlag und schickt die Frage frisch.
  Oben im Chat "Neues Gespräch" (setzt Verlauf, Vorschlag, Spontan-Modus und
  geführte Fragen zurück; gespeicherte Daten bleiben).
- Pause nur bei echter Abwesenheit (`parsePauseRequest`: Urlaub/verreist/
  Ferien/"wir sind … weg" PLUS Zeitangabe; nie bei "nur zu zweit", "nicht
  da", bloßem "Pause"). Mit KI: `pause_setzen`/`pause_beenden` (Op
  `set_pause`, Vorschau + Übernehmen); ohne KI eine Frage mit "Ja,
  eintragen"/"Nein". "Ab Montag" an einem Montag = nächste Woche. Sichtbar:
  Heute "Pause … – genießt die Zeit ☀️" mit "Pause beenden", Woche "Pause ☀️".
  Profil v18 entfernt einmalig offene Pausen ohne Ende (Fehler der alten
  Regel).
- Portionen nur für einen Tag (`portionen_anpassen`, Op `set_persons`):
  `persons` am Gericht des Tages (Wochenplan-Eintrag), `PlanDay.persons`
  übernimmt es, die Einkaufsliste rechnet die Rezeptmengen um, "Rezept
  ansehen" zeigt `?personen=` ("Zutaten für 2 Personen (nur heute)"). Familie,
  Rezept und Plan bleiben unverändert.
- Mails schreiben und beantworten (v0.15, ohne Postfach – nie automatisch
  senden): `src/lib/lotte/mail.ts` (rein: `looksLikeMail`,
  `splitInstruction`, `summaryOf`, `eventsIn`, `mailtoHref`, `draftText`,
  `localReply`/`localNewMail`/`reviseDraft` für die Zeit ohne KI und den
  Testmodus). Werkzeuge `mail_entwurf` und `antwort_knoepfe`
  (`mailTools.ts`, Bereich "post"; Antwort trägt `mail`/`chips`, auch im
  Stream-Ereignis "done"). Eingefügte Mail mit Anweisung ("Antworte, dass
  Donnerstag passt, aber erst ab 9") → "Kurz gesagt: …" + Entwurf; ohne
  Anweisung → "Wie willst du antworten?" mit Knöpfen (Zusagen/Absagen/
  Nachfragen). Neue Mail ("Mail an die Kita: Jonne ist morgen krank",
  "Schreib dem Großhandel, dass …"). Adresse nur, wenn genannt oder in der
  Mail ("Von:"), sonst leer. Karte `MailCard` im Chat: Betreff, Absätze, "In
  Mail öffnen" (mailto mit Empfänger, Betreff, Text), "Kopieren" ("Kopiert ✓"),
  "Ändern" (Kürzer, Etwas förmlicher, Auf Du/Sie, Lockerer – oder per
  Sprache). Termin/Frist in der Mail → zusätzlich termin_anlegen/
  aufgabe_anlegen als Vorschlag (ohne KI: Knopf "📅 … eintragen" mit
  Rückgängig). Stil: Du/Sie je Empfänger (gemerkt bei "Auf Du/Sie"),
  Geschäftliches förmlicher, Gruß + Name, Signatur nur bei förmlichen Mails;
  Einstellungen → Mails (`/profil/mails`, `wasgibts.mails` v1 pro Gerät:
  Grußformel, Signatur, gemerkte Anrede) oder "Unterschreib meine Mails mit
  …". Eingefügte Mails werden nirgends gespeichert (nur der Chat im Speicher;
  der Entwurf geht als Text im Verlauf mit, damit "Kürzer" klappt). Das
  Eingabefeld im Chat ist mehrzeilig (Absätze bleiben, Enter schickt ab),
  Nachrichten bis 6000 Zeichen.
- Ohne KI (und im Testmodus): `parseCalendar()` (`parse.ts`) erkennt Tag,
  Uhrzeit, Frist, Wiederholung, Erinnerung, Raum, Etikett und die Befehle
  verschieben/löschen/erledigt/"Was steht … an?"/"Hab ich … Zeit?";
  `calendarChat()` antwortet und trägt sofort ein (mit Rückgängig).

## Design-System

- Tokens in `src/app/globals.css` (`@theme`): `bg-background` (warmes
  Off-White), `bg-surface` (weiß), `border-line`, `text-ink`, `text-muted`,
  Akzent `bg-accent`/`text-accent`/`text-accent-strong`/`bg-accent-soft`,
  `rounded-card`, `shadow-card`. Keine `orange-*`-Klassen direkt, keine
  weiteren Farben für Flächen.
- Bausteine in `src/components/ui`: `CARD`/`CARD_LIST`,
  `buttonClass()` (primary, secondary, soft, ghost, danger; sm/md/lg),
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
## Funktionen hinter den Bausteinen (aus der Koch-App)

Sichtbar über den passenden Baustein (im neuen Design). Seit v0.25 sind
Alt-Modus, alter Hinweis-Platz (Lottes Platz), Bewertungen nach dem Kochen,
Twists, "Sanft erkennen", "Willkommen zurück", das alte Kennenlernen und der
Formular-Assistent entfernt; Beschreibungen dazu unten sind nur noch Historie.
Neue Arbeit baut auf dem Fundament oben auf.

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
- Küchenhelfer hat Namen und Gesicht (Profil v7 `helper`, seit v19 mit Art
  und Farbe – siehe "Begleitung zum Aussuchen"): Name frei (max. 20 Zeichen),
  Stimme weiblich/männlich (folgt der Art; `pickVoice()` wählt
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
- Profil v15: `theme` (warm/nacht/auto – "frisch" gibt es seit v19 nicht mehr, wird Automatisch), `helperMode`
  (locker/normal/dranbleiben), `display` (einfach/alles), `weekendIdeas`;
  Migration: Warm, Normal, Einfach, an.
- Ansichten (`/profil/ansicht`, Vorschau-Karten als Mini-Startseite): Farben
  nur als CSS-Variablen in `globals.css` (`--app-*` → Tokens; Nacht stellt
  zusätzlich Grau-/Rottöne um, `text-on-accent` für Text auf Akzentflächen,
  Toasts `bg-ink text-background`). `data-theme` am `<html>`, gesetzt vor dem
  ersten Zeichnen (`THEME_BOOT_SCRIPT`) und von `ThemeSync` (auch
  theme-color). Automatisch folgt `prefers-color-scheme`. Das App-Icon
  bleibt immer orange; Lottes Gesicht hat die gewählte Icon-Farbe.
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