# Leitbild „Mia“

Bei ALLEN Änderungen beachten.

## Wofür die App da ist
Die App heißt Mia (`APP_NAME` in `src/lib/core/app.ts` – einzige Stelle,
nie fest schreiben). Mia ist eine cleane Alltags-App für Felix und seine
Familie und zugleich die Assistentin für Termine, Aufgaben, Essen und Einkauf
– man gibt ihr Dinge ab wie einer guten Haushaltshilfe, mit der man ganz
natürlich spricht. Sie legt an und räumt wieder weg.

Die Begleitung heißt fest Mia (Orange, rund, Assistentin; nur die Stimme ist
wählbar). Steckbrief: Familienmanagerin, warm, organisiert, trockener
norddeutscher Humor, nie chefig (`src/lib/mia/persona.ts`). Lebendig ohne
Ansprüche: EIN Zubehör je Anlass/Wetter/Tageszeit, nachts schläft sie, nie
Bedürfnisse, nie traurig (`src/lib/mia/zubehoer.ts`). „Was gibt’s?“ ist nur noch der Essen-Bereich („Was gibt’s heute?“).
In Aufträgen meint „Lotte“ immer Mia. Texte trotzdem über `helperName()`,
`helperTitle()`, `helperMessage()`. Mia und App-Icon immer Orange (Marke). EIN
Design (Warm) mit Hell/Dunkel/Automatisch. Einzige Wahl: Startseite „Farbig“
oder „Schlicht“ – gleiche App-Farben, nur die Kachel-Flächen (Profil `look`).
Die frühere Lieblingsfarbe ist „Meine Farbe im Kalender“ (Profil
`calendarColor`).

## 1. Ruhig und leer
- Drei Seiten: Kalender · Heute · Essen (Heute ist die Startseite), Wechsel per
  Segment-Schalter oder Wischen. Nichts steht herum, was nicht gebraucht wird.
- EIN Design. Zusätzliche Funktionen sind Bausteine (`src/lib/core/features.ts`,
  Einstellungen → „Mehr Funktionen – Was <Name> noch kann“). Alles Neue startet
  als ausgeschalteter Baustein und erscheint nur bei Bedarf.
- Pro Bildschirm eine große Hauptsache, wenig Text, viel Weißraum. Leere
  Zustände freundlich und einladend, nie als Fehler.
- Termin = feste Uhrzeit, Aufgabe = zu erledigen, Notiz = nur festhalten.
  Leerer Kalender = Angebot „Kalender mitbringen“ (Apple/Google/Outlook).
- Startseite = Kacheln in EINER gespeicherten Anordnung, die sich nie von
  selbst ändert. Bearbeiten direkt auf der Startseite (lange drücken: wackeln,
  ziehen, „–“, S/M/L); zwei S nebeneinander, eine einzelne S wird breit; Essen
  + Einkauf sind ein Paar. Größe ändert nur die Menge (S ≤ M ≤ L). Standard für
  neue Nutzer: Pinnwand + Wetter (S), Termine, Aufgaben, Essen + Einkauf,
  Spendentopf („Im Haus“ nur mit Baustein). Jede Kachel öffnet ihre Seite.
- Auf der Startseite gibt es genau zwei Mias: das eckige Logo (BrandMark,
  nicht antippbar) und den runden Mia-Knopf unten rechts (= reden).
- Die Jetzt-Karte zeigt höchstens 3 Themen zum Wischen und öffnet wie jede
  Kachel per Antippen – ohne eigenen Knopf – die Seite „Dein Tag“ (Ausnahme:
  laufender Timer öffnet den Timer). Feste Höhe, 2 Zeilen (Zeile 1 ≤ 32
  Zeichen, nie mitten im Wort abgeschnitten), Themen-Symbol statt Gesicht,
  Punktesystem, nur was die Kacheln nicht zeigen. Nie
  Temperatur, Wetter nur mit Planbezug (Tafel 60). Tagesphasen ändern nur Inhalte, nie
  die Anordnung; Ruhe nach Feierabend ist ein eigener Schalter.
- Gesten: Tippen = Eintrag öffnen, lange Drücken = Startseite bearbeiten,
  Wischen = Seite wechseln.
- Erster Start = ruhiger Hallo-Bildschirm („Moin!“, „Los
  geht’s“), danach höchstens EINE Frage (Look „Farbig“/„Schlicht“) mit
  Standard und Überspringen, dann die Startseite mit Beispiel-Tag.
- Rückgängig nur bei echtem Löschen („Gelöscht · Rückgängig“, 3 s) und in der
  Schnelleingabe („Eingetragen: … · Rückgängig“); sonst meldet sich
  Hinzufügen still. Typografischer Apostroph überall („Was gibt’s?“).

## 2. Gespräch zuerst
- Die Begleitung (Sprache/Chat) ist der Hauptweg; jede Funktion ist auch per
  Gespräch erreichbar. Bildschirme dienen zum Nachschauen und Feinjustieren.
- ＋ = tippen, Mia = sprechen. Jedes ＋ öffnet eine Schnelleingabe (ein Feld,
  Tastatur sofort, Satz rein, ➤ speichert; `ui/QuickEntry`, `core/schnelleingabe`).
  Sprechen geht immer über den Mia-Knopf. Kein eigenes Mikro in Eingabefeldern
  (die iPhone-Tastatur hat ihres). Formular nur über „Mehr Details“. Mia ist
  ein runder Knopf unten rechts; Tippen holt sie auf die Bühne, sie hört
  sofort zu. Keine Schreib-Leiste.
- Lieber eine Frage mit 2–3 Knöpfen als ein Formular.
- Machen statt fragen: Kleines selbst erledigen und kurz melden. Rückfragen nur
  bei echten Entscheidungen. Kleine, sichere Dinge (Einkauf, neue Termine,
  Aufgaben, Notizen, Pinnwand, Im Haus, Timer, Kochschritte) macht Mia sofort
  – kurze Bestätigung, „Rückgängig“ (10 s) und Eintrag in „Mia hat schon …“
  (`begleitung/miaDone.ts`). Große Dinge (Wochenplan, Rezept, Mail, Ändern,
  Löschen) als Vorschau mit „Übernehmen“.
- Mia ist nie halbgar: lieber weniger, aber richtig. Keine Regel-Antwort
  „nicht verstanden“ (offline: merken und nachholen; Fehler: einmal still
  nochmal, dann „Hat grad nicht geklappt. Nochmal?“). Haiku nur für klare
  Kurzbefehle, sonst Sonnet. Was Mia kann, steht im Prompt automatisch aus den
  Werkzeugen; sonst „Kann ich noch nicht.“ (anonym gezählt, `mia_wuensche`).
  Neue Mia-Funktion nur mit Prüfstand-Sätzen (`begleitung/pruefstand/`,
  Ziel ≥ 95 %, vor jeder neuen Mia-Version unter „Für Entwickler“ laufen lassen).

## 2a. Volle Kontrolle (Grundregel)
- Alles, was die Begleitung anlegt oder ändert, kann ich selbst sehen,
  antippen, ändern und entfernen – und alles, was ich kann, kann sie auch,
  inklusive Rückgängig. Die Startseite bleibt clean.
- Nutzt die Begleitung eine versteckte Funktion, wird sie freigeschaltet und
  sie sagt kurz, wo sie steht.
- KI zuerst: Ist die KI erreichbar, bekommt IMMER sie die Nachricht. Feste
  Regeln (Stichwort-Erkennung) sind nur die Notlösung ohne KI – oder laufen,
  wenn die KI es per `app_befehl` vorschlägt. Keine Regel darf einen Zustand
  hinterlassen, der weitere Nachrichten abfängt.

## 3. Räume
- „Familie“ ist gemeinsam, „Arbeit“ ist persönlich. Ohne Angabe gehört etwas
  zur Familie. Familie = Orange (`bg-accent`), Arbeit = Blau (`bg-work`).
- Mit Konto teilt der Haushalt „Familie“; „Arbeit“ sieht nur der Besitzer.
  Ohne Konto bleibt alles auf dem Gerät – die App geht immer auch ohne.
- Aufgaben gehören standardmäßig der Person, die sie anlegt; geteilt wird nur
  durch Abgeben („An … geben“, beim Empfänger „von Felix“, zurück mit „Passt
  gerade nicht“; `kalender/abgeben`). Für Absprachen ist die Pinnwand da.

## 4. Ohne Druck
- Keine Streaks, keine Zähler, keine roten Badges, keine Aufgaben-Stapel.
  Sport zählt nur Wochen, nie Tage.
- Nicht Erledigtes verschwindet leise (Aufgaben mit Tag rutschen still auf
  heute: „von gestern“). Nie „Du hast … nicht gemacht“, nie „du musst / du
  solltest / vergiss nicht“, nie „Ich vermisse dich“.
- Nie Wörter wie „fehlt“, „offen“, „überfällig“, „noch zu erledigen“,
  „verpasst“, „Alles da“. Stattdessen vorbereitend („Für Montag“, „Ich hab
  schon …“). Zutaten: „alles im Haus“ (grün) bzw. „auf die Liste: …“.
- Jetzt-Karte: nachts (22–6) nur Morgen/Erinnerung/Timer, im Feierabend und am
  Wochenende nur Sanftes. Höchstens EIN Hinweis unter der Jetzt-Karte.
  Push (`docs/bereiche/push.md`): höchstens 1 proaktive Mitteilung pro Tag, Ruhe 20–7 Uhr,
  Pause-Modus = absolute Ruhe.

## 5. Ton
- Knapp, norddeutsch, nie vorstellen, keine Gedankenstriche/Spiegelstriche,
  keine Floskeln, max. 2 Sätze. Bestätigungen 1–3 Wörter („Steht drin.“),
  höchstens ein „!“ und ein Emoji pro Nachricht. Jede KI-Antwort läuft vor
  Anzeige, Vorlesen und Push durch `tidyMiaText()` (`begleitung/tidy.ts`).
- Kurz, warm, mitdenkend, natürlich, Deutsch, etwas Humor, kein Formularton,
  keine Fachbegriffe.
- Erleichterung statt Leistung: nicht übertrieben loben, nichts vorrechnen;
  Erfolge zeigen, Versäumnisse nicht, selten feiern.
- Gesundheit: keine Diagnosen, nie Aussagen über Körper/Gewicht/Kalorien; bei
  Gesundheitsfragen freundlich auf Arzt/Ärztin verweisen.
- Fehler als Satz, nie als Technik: „Hm, das hab ich nicht verstanden.“

## 6. Kennt die Familie
- Profil, Allergien (strikt), „mag nicht“, eigene Produkte, Läden und frühere
  Entscheidungen immer berücksichtigen. Nie zweimal dasselbe fragen.
- Datenschutz: so wenig Daten wie nötig, besonders bei Kindern; alles löschbar.
  Konten: nur E-Mail, Anzeigename, Rolle; „Meine Daten exportieren“ und
  „Konto löschen“ in Daten & App.

## 7. Design
- Warmes Off-White, Kacheln auf der Startseite im Look „Farbig“ (Pastell,
  feste Palette je Kachel, gleiche Sättigung, Tokens `--app-tile-<id>`/`-ac`,
  Innen-Kärtchen weiß, Wetter als Himmel `--app-sky-*`) oder „Schlicht“
  (weiß mit feinem Rand, Farbe nur in Überschrift, Symbol, Uhrzeit,
  Termin-Strich; `data-look` am `<html>`), weiße Karten auf Unterseiten, EINE
  Akzentfarbe (Orange) nur für Knöpfe und die Begleitung, Pastell nie für
  Knöpfe. Linien-Icons (lucide), Emojis nur als Inhalt (Gerichte, Notizen,
  Pinnwand-Reaktionen 👍 ❤️ 😂 😮 🙏 – die sind Inhalt), nie in Knöpfen,
  Chips, Kacheln oder Termin-Titeln.
- Schrift Plus Jakarta Sans; Seitentitel 30/800 (`PageHeader`), Abschnitte
  `SECTION_TITLE`, Kachel-Label `TILE_LABEL` nur in Kacheln. Radien nur über
  Tokens: `rounded-card` 20 px, `rounded-field` 14 px, `rounded-full`, dazu
  `rounded-bar`/`-sky`/`-pair`/`-icon`.
- Seitenkopf: „‹ <vorherige Seite>“, rechts höchstens ein Knopf (Seiten-Plus
  34 px orange oder „…“), darunter der große Titel. Kachel-Plus 26 px
  hellorange. Mia-Knopf unten rechts (72 px, atmet leicht), auf allen Seiten
  gleich. Jedes Gespräch auf EINER Bühne (`MiaStage`): Seite verschwommen
  dahinter, Gespräch oben, Mia groß im unteren Drittel (antippen = zuhören ↔
  fertig, „Lieber tippen“), fliegt vom Knopf ein und dorthin zurück.
- Bewegung sehr weich: 0,8–1,2 s, `cubic-bezier(.16,1,.3,1)`, nur
  transform/opacity, `prefers-reduced-motion` = nur Überblenden.
- Knöpfe nie schwarz. Standard für neue Nutzer = Hell; Dunkel/Automatisch nur
  nach eigener Wahl (intern `warm`/`nacht`/`auto`).
- Ein Fenster für alles (`ui/Sheet.tsx`); jedes Fenster schließt per ✕,
  Danebentippen, Runterwischen und Zurück.
- Avatar: EINE Komponente `BegleitungAvatar` (Sprechblase mit mittiger Spitze,
  senkrechte Augen, dezentes Lächeln) immer in Orange; Zustände setzt die
  App automatisch. App-Icon: einzige Quelle `scripts/generate-icons.mjs`
  (`npm run icons`; angeboten wird nur Orange, die übrigen Farbsätze bleiben
  nur für ältere Installationen); Dateien tragen `ICON_VERSION` im Namen
  (Pfade nur über `icon()`/`iconFor()`); neues Icon = Version erhöhen, Liste in
  `public/sw.js` und `CACHE_VERSION` anpassen. Manifest-Farbe `BRAND_COLOR`.
- Marke Mia: Logo nur über `BrandMark` (`ui/`) bzw. die Dateien in
  `public/brand/` (Quelle `src/lib/core/brand.ts`, `npm run brand`), Farben
  `--app-brand*`; Regeln (Schutzzone, Mindestgröße, nie Orange auf Orange)
  in `docs/brand.md`. Startseiten-Kopf: links BrandMark (30 px), rechts das
  Datum („Fr, 23. Okt“); die Begrüßung steht nur noch für VoiceOver da.

## 8. Technik-Regeln
- Nach jeder Änderung testen (siehe „Testen“), PR nach `main` und mergen –
  ohne Rückfrage. Nur Zwischenstände pushen, die bauen.
- Gespeicherte Daten bei Formatänderungen immer migrieren, nie verlieren.
  Verstecken heißt nie löschen. Daten nur über das Speicher-Verzeichnis
  `src/lib/core/storage.ts` (Schlüssel, Version, Migration, `backup`);
  „Daten sichern/wiederherstellen“ muss immer funktionieren, auch mit alten
  Sicherungen (`tests/fixtures/`).
- KI nur serverseitig: `ANTHROPIC_API_KEY` liegt in Vercel (Secret) – nie
  danach fragen, nie ausgeben, nie ins Repo oder in die App. Zugangscode
  (`APP_ACCESS_CODE`) und Tageslimit gelten für alle KI-Aufrufe
  (`src/lib/begleitung/guard.ts`). Die KI schlägt vor, der Nutzer übernimmt.
  Die App funktioniert immer auch ohne KI.
- Zeit immer über `now()` aus `src/lib/core/now.ts` (Europe/Berlin, in Tests
  überschreibbar), nie `new Date()` für „jetzt“.
- Zurück = eine Ebene zurück, Pfeil und Geste gleich, Scrollposition bleibt.
  Kalender und Essen zählen als eine Ebene unter Heute.
- Eingabefelder mindestens 16 px Schrift, Safe-Areas beachten, Tippflächen
  mindestens 44 × 44 px (`hit`). Listenzeilen auf der Startseite dürfen 30 px
  hoch sein, wenn die ganze Zeile tippbar ist (`data-zeile`). Weiter/Zurück am
  Inhaltsende, nicht fixiert.
- Farben, Radien, Komponenten nur über Tokens und `src/components/ui/`; im Code
  nie `var(--color-…)`, nur `var(--app-…)`.
- Einstellungen nach Nutzungshäufigkeit sortieren, aktueller Wert rechts.
- Version bei jeder Auslieferung erhöhen: `package.json` (+ `package-lock.json`),
  `APP_VERSION` in `src/lib/core/app.ts`, `CACHE_VERSION` in `public/sw.js`.
- Spracheingabe nur über `useSpeechInput`; beim Absenden immer `reset()`.
  Mikro-Freigabe/Sperre nur über `core/mic` (Vorab-Frage, Hilfe, Streifen).
- Reihenfolgen nur über `src/lib/core/sort.ts` (deutsche Sortierung, stabil).
  Aufgaben: dringend → heute → Frist → Woche → irgendwann, innerhalb Uhrzeit
  bzw. Erstellungszeit, nie alphabetisch.
- Phase heißt „Morgens“, der nächste Tag immer mit Wochentag („Morgen · Mi“).
- Regex: nie `\b` direkt an ä/ö/ü/ß (dort gibt es in JS keine Wortgrenze) –
  stattdessen `(?<![a-zäöüß])` bzw. `(?![a-zäöüß])`.
- Reine Typ-Importe als `import type { … }`. Schweres erst bei Bedarf laden
  (`next/dynamic`, `import()`); das Layout lädt nichts von einzelnen Seiten.
- Jeder behobene Fehler bekommt einen Test. Dateien möglichst unter 600 Zeilen.

## Feste Regeln einzelner Bereiche
- **Tipps aus der Region:** keine Termine, eigene lila Ebene, bis jemand
  „Übernehmen“ tippt. Kein GPS. KARAMBA nie bevorzugt (nur bei gleicher
  Uhrzeit zuerst, höchstens eine pro Woche in der Kachel), sichtbar „von
  KARAMBA Eis“. Nur offene Lizenzen (CC0/CC BY/CC BY-SA). `TIPS_SOURCE` off/demo/
  tldb, Zugang nie im Code. → `docs/bereiche/tipps.md`
- **Spendentopf:** keine Zahlung in der App. Solange `POT_STATUS` „vorschau“
  ist: Band „Vorschau“, Summe/Projekte als „Beispiel“, Beiträge nur
  „vorgemerkt“ (kein Geld, kein Partner-Link); „live“ = „zugesagt“. Texte nur
  aus `POT_TEXTS`, nie „an KARAMBA Eis“ – das Geld geht in die Region. Die App
  bleibt ohne Beitrag kostenlos. → `docs/bereiche/spendentopf.md`
- **Wetter:** ehrliche Regel – Regenstunde = ≥ 0,2 mm UND ≥ 50 %, Tage immer
  aus den Stunden 7–21 Uhr. → `docs/bereiche/wetter.md`
- **Beispiel-Tag:** Beispiele liegen nie in den echten Speichern, nicht in
  Sicherung, Push oder KI. → `docs/bereiche/heute.md`
- **Konten (Supabase):** Anmelden nur per E-Mail-Code (`signInWithOtp` +
  `verifyOtp`), nie per Link. Geheimer Schlüssel nur auf dem Server, nie im
  Client/Repo/Log. Jede Tabelle mit RLS (nur eigener Haushalt, „Arbeit“ nur
  Besitzer). Migrationen nur in `supabase/migrations/`, laufen beim Merge;
  nie SQL von Hand. Lokale Daten bleiben, bis die Übernahme bestätigt ist.
  Abgleich: neueste Änderung je Eintrag gewinnt, Löschen nur als Markierung;
  neue geteilte Daten = Übersetzer in `src/lib/konten/sync/docs.ts`.
  → `docs/bereiche/konten.md`
- **Bilder der Gerichte:** eigene Zeichnungen im Code, keine fremden Fotos,
  keine KI (`docs/credits.md`); neues eingebautes Gericht → `npm run
  gerichte-bilder`. Kein Braun und kein Dunkelgrau als große Fläche. Soßen
  frisch: Rot, Gelb, Grün, Creme, und sparsam (Fläche unter dem Essen, Rand
  bleibt frei). Braun nur für Kleinteile (Kruste, Brot, Gewürz).
  → `docs/bereiche/essen.md`

- **Name KARAMBA:** immer „KARAMBA Eis“, nie nur „KARAMBA“ (Verwechslung
  mit einem Online-Casino) – in allen Texten (Tipps „von KARAMBA Eis“,
  Spendentopf, Mails, „Über Mia“, Hallo-Bildschirm „Gemacht in Eutin · von
  KARAMBA Eis“). Test in `tests/app/regeln.test.ts`.

## Roadmap
- Phase 1: Konten + Haushalt (Supabase) – Anmeldung, Haushalt mit Mitgliedern,
  gemeinsame Daten (Pinnwand teilen, Push, Guthaben auf dem Server).
- Phase 2: Heute/Woche mit Push.
- Phase 3: Essen + Einkauf neu.
- Phase 4: Post (Briefe, Rechnungen erfassen).
- Phase 5: Foto → Termin/Aufgabe.

# Hinweise für Claude

@AGENTS.md

## Arbeitsweise
- Sprache der App und der Antworten: Deutsch.
- Nach jeder fertigen Änderung ohne Rückfrage: testen, committen, Pull Request
  nach `main` (mit Abschnitt „Entschieden ohne Rückfrage“) und direkt mergen.
- Gespeicherte Profile müssen weiter funktionieren: Version in
  `src/lib/einstellungen/profileModel.ts` erhöhen, `migrateProfile` in
  `profileStore.ts` erweitern, Version im Speicher-Verzeichnis anpassen.
- Neue Funktion = neuer Baustein (aus), eigener Ordner im passenden Bereich,
  Abschnitt in `docs/bereiche/<bereich>.md` aktualisieren, Eintrag in
  `docs/verlauf.md`.

## Ordner
Gleiche Bereichsnamen in `src/lib/<bereich>` (Logik, rein wo möglich),
`src/components/<bereich>` (Oberfläche) und `tests/<bereich>`:

| Bereich | Inhalt |
|---|---|
| `heute` | Startseite, Kacheln, Bearbeiten, Jetzt-Karte, Tagesphasen |
| `kalender` | Termine, Aufgaben, Kalender- und Tag-Seite, Eintragen |
| `essen` | Essen-Reiter, Wochenplan (`essen/plan`), Rezepte (`essen/rezepte`), Ideen, Bilder, Kochmodus |
| `einkauf` | Einkaufsliste, Läden, Stammartikel |
| `vorrat` | „Im Haus“: was da ist (ohne Mengen), Orte, vergisst von selbst |
| `pinnwand` | Nachrichten und Sprachnachrichten |
| `notizen` | Notizen, Schnellnotiz |
| `wetter` | Wetter-Server, Kachel, Seite |
| `sport` | Trainings, Wochenziel |
| `timer` | Timer, Stoppuhr |
| `tipps` | Tipps aus der Region |
| `spendentopf` | Spendentopf |
| `begleitung` | Chat, KI-Route, Werkzeuge, Sprache, Avatar, Hallo-Bildschirm |
| `einstellungen` | Profil, Einstellungen, Mehr Funktionen |
| `konten` | Konto, Haushalt, Einladen (Supabase), Datenbank-Tests (`tests/datenbank`) |
| `core` | Speicher, Sicherung, Zeit, Navigation, Toast/Rückgängig, Sortieren, Bausteine |
| `ui` | Bausteine der Oberfläche (`styles.ts`, `Sheet`, `PageHeader` …) |

Importe nur über `@/…`. Die Begleitung heißt im Code neutral
(`BegleitungAvatar`, `BegleitungBar`, `BegleitungTool`, `begleitungPush`);
`/api/lotte`, Speicher-Schlüssel, Op- und Werkzeugnamen und die Umgebungs-
variablen `LOTTE_*` bleiben. Alte Adressen leiten in `next.config.ts`
(`OLD_PAGES`) weiter.

## Testen
Vor jedem PR alles grün:
- `npm test` – Vitest, `tests/<bereich>/*.test.ts`, `tests/app/` für Code- und
  Textregeln (Stilblatt, Ohne-Druck-Wörter, Speicher, Service Worker).
  Gemeinsame Hilfen in `tests/helpers.ts`: `at()`/`atFresh()` (feste Zeit),
  `memoryStorage()`, `fakeWindow()`/`noBrowser()`, `termin()`/`aufgabe()`.
- `npm run test:abdeckung` – Abdeckung `src/lib` (ohne `use*.ts` und reine
  Browser-Schnittstellen), Untergrenze 80 % Zeilen.
- `npx tsc --noEmit`, `npm run lint`, `npx knip` (ungenutzter Code muss 0
  sein; `@public` im Kommentar = bewusst für Tests/Push).
- `npm run build`, danach `.next/static` nach `sk-ant` und Supabase-
  Geheimnissen (`service_role`, `SUPABASE_SECRET`) durchsuchen.
- `npm run test:datenbank` – Migrationen und RLS gegen echtes Postgres
  (bei Änderungen in `supabase/`).
- `npm run durchklick` – Playwright mit echten Touch-Gesten, iPhone 15 Pro und
  Pixel 7 (Abläufe in `e2e/ablaeufe/`, eigener Testserver mit Testmodus).
- Bei Oberflächen-Änderungen: `npm run bilder` (96 Bildschirmfotos) und
  `npm run bilder:vergleich` (Abweichung > 0,1 %); gewollte Änderungen
  ansehen, dann `npm run bilder -- --basis`. Bilder liegen in `.bilder/`.
- `npm run messen` – JavaScript je Seite.
- Vor dem Vorführen bzw. bei großen Änderungen: `npm run pruefen` (jede Seite
  auf SE/15 Pro/Pixel 7, hell/dunkel, Browser/App, Startseite zu 5 Uhrzeiten:
  seitlich verrutscht, unter der Leiste, Tippflächen, Knopf über Text, Knopf
  fängt keinen Tipp, 16 px, Konsole, 404, Texte; `-- --schnell` = ein Gerät)
  und `npm run knoepfe` (jeden Knopf antippen: passiert etwas?).
- Testmodus ohne KI: `KUECHENHELFER_MOCK=1`, `WETTER_MOCK=1`,
  `TIPS_SOURCE=demo`, `KONTEN_TEST=1` (Test-Backend für Konten).

## Mehr dazu
- `docs/bereiche/<bereich>.md` – aktueller Stand je Bereich (Code, Speicher,
  Verhalten, Begleitung, Tests).
- `docs/verlauf.md` – wie alles entstanden ist (frühere Abschnitte je Version).
- `docs/aufraeumen-vorher.md` / `docs/aufraeumen-nachher.md` – Zahlen vom
  großen Aufräumen.
- `docs/credits.md` – Quellen und Lizenzen. `docs/vorlagen/` – Vorlagen
  (Avatar-Animation, Beispiel-Startseite).
