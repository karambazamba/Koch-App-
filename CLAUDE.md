# Leitbild „Mia“

Bei ALLEN Änderungen beachten.

## Wofür die App da ist
Die App heißt Mia (`APP_NAME` in `src/lib/core/app.ts` – einzige Stelle,
nie fest schreiben). Mia ist eine cleane Alltags-App für Felix und seine
Familie und zugleich die Assistentin für Termine, Aufgaben, Essen und Einkauf
– man gibt ihr Dinge ab wie einer guten Haushaltshilfe, mit der man ganz
natürlich spricht. Sie legt an und räumt wieder weg.

Die Begleitung heißt fest Mia (Orange, rund, Assistentin; nur die Stimme ist
wählbar). Steckbrief: deine persönliche Assistentin („Ich sortier deinen
Alltag.“) für Singles, Paare und Familien, warm, organisiert, trockener
norddeutscher Humor, nie chefig (`src/lib/mia/persona.ts`). Lebendig ohne
Ansprüche: EIN Zubehör je Anlass/Wetter/Tageszeit, nachts schläft sie, nie
Bedürfnisse, nie traurig (`src/lib/mia/zubehoer.ts`). „Was gibt’s?“ ist nur noch der Essen-Bereich („Was gibt’s heute?“).
In Aufträgen meint „Lotte“ immer Mia. Texte trotzdem über `helperName()`,
`helperTitle()`, `helperMessage()`. Mia und App-Icon immer Orange (Marke). EIN
Design (Warm) mit Hell/Dunkel/Automatisch. Einzige Wahl: Startseite „Farbig“
oder „Schlicht“ – gleiche App-Farben, nur die Kachel-Flächen (Profil `look`).
Die frühere Lieblingsfarbe ist „Meine Farbe im Kalender“ (Profil
`calendarColor`).

## Launch „Mia 1.0“
- **Bis zum Launch keine neuen Funktionen.** Nur Aufräumen, Fehler,
  Einheitlichkeit.
- Drin: Mia (sprechen, tippen, erledigen), Startseite, Termine (inkl.
  Kalender mitbringen per Link), Aufgaben, Einkauf, Essen (heute, Ideen,
  Rezept, Kochmodus, Wochenkarte), Pinnwand als Kühlschranktür (allein aus),
  Notizen (Kachel standardmäßig an), Im Haus mit Spontan kochen (Baustein an,
  Bereich unter Essen mit „Was koch ich daraus?“, Kachel S/M nur über die
  Auswahl), Sport (Baustein, nur Wochen zählen), Wochenplan (Baustein),
  Wetter, Timer (Baustein), Familie teilen per E-Mail-Code, Datenschutz.
- Ausgeblendet (Baustein aus, nicht gelöscht, Daten bleiben; wer ihn schon
  nutzt, behält ihn): Mails an Mia, Tipps aus der Region,
  Spendentopf (ein Satz unter „Über Mia“
  bleibt), Anmelden mit Apple/Google (nur E-Mail-Code), ElevenLabs (aus,
  solange kein Schlüssel). Liste `LAUNCH_AUS` in `core/features.ts`,
  `LAUNCH_NUR_EMAIL` in `konten/oauth.ts`; Mia schaltet nichts davon frei.

## 1. Ruhig und leer
- Drei Seiten: Kalender · Heute · Essen (Heute ist die Startseite), Wechsel über
  die Leiste unten (`ui/Leiste`, Logik `core/leiste.ts`, Tafel 96) oder Wischen;
  kein Segment-Schalter oben. Jede Unterseite gehört zu einem Bereich und lässt
  dessen Reiter leuchten. Reiter: anderer Bereich = Hauptseite, aktiver auf
  Unterseite = zurück zur Hauptseite, aktiver auf Hauptseite = nach oben.
  Nichts steht herum, was nicht gebraucht wird.
- EIN Design. Zusätzliche Funktionen sind Bausteine (`src/lib/core/features.ts`,
  Einstellungen → „Mehr Funktionen – Was <Name> noch kann“). Alles Neue startet
  als ausgeschalteter Baustein und erscheint nur bei Bedarf.
- Pro Bildschirm eine große Hauptsache, wenig Text, viel Weißraum. Leere
  Zustände freundlich und einladend, nie als Fehler.
- Termin = feste Uhrzeit, Aufgabe = steht jetzt an (ohne Tag heute, mit
  genanntem Tag ab dem Tag, bis dahin „Geplant“), Notiz = nur festhalten.
  Leerer Kalender = Angebot „Kalender mitbringen“ (Apple/Google/Outlook).
- Startseite = Kacheln in EINER gespeicherten Anordnung, die sich nie von
  selbst ändert; Bearbeiten direkt dort (Details in `docs/bereiche/heute.md`).
- Auf der Startseite gibt es genau zwei Mias: das eckige Logo (BrandMark,
  nicht antippbar) und den runden Mia-Knopf rechts in der Leiste (= reden).
  Einzige Ausnahme: das kleine Gesicht in Mias Tipp-Karte („Mia stellt vor“,
  Seiten-Tipps) – nicht antippbar, ohne Ring, verschwindet nach „Alles klar“.
- Jetzt-Karte: höchstens 3 Themen, nur was die Kacheln nicht zeigen, nie
  Temperatur (Tafel 60; Details in `docs/bereiche/heute.md`).
- Gesten: Tippen = Eintrag öffnen, lange Drücken = Startseite bearbeiten,
  Wischen = Seite wechseln (Kalender · Heute · Essen), Wischen vom linken Rand
  auf Unterseiten = eine Ebene zurück.
- Erster Start: höchstens 3 Bildschirme (Hallo mit Zustimmungs-Häkchen → „Für
  wen?“ → Zugangscode nur wenn nötig), Details in `docs/bereiche/heute.md`.
- Rückgängig nur bei echtem Löschen („Gelöscht · Rückgängig“, 3 s) und in der
  Schnelleingabe („Eingetragen: … · Rückgängig“); sonst meldet sich
  Hinzufügen still. Typografischer Apostroph überall („Was gibt’s?“).

## 2. Gespräch zuerst
- Die Begleitung (Sprache/Chat) ist der Hauptweg; jede Funktion ist auch per
  Gespräch erreichbar. Bildschirme dienen zum Nachschauen und Feinjustieren.
- ＋ = schreiben, Mia = sprechen. Jedes ＋ öffnet eine Schnelleingabe (ein Feld,
  Tastatur sofort, Satz rein, ➤ speichert; `ui/QuickEntry`, `core/schnelleingabe`;
  Ausnahmen: Notizen-Plus = leere Notiz, Pinnwand-Plus = „Neuer Zettel“). Absätze:
  Notiz und Pinnwand mehrzeilig (`ui/MehrzeilenFeld`, Return = neue Zeile,
  gespeichert nur per Knopf), angezeigt mit `whitespace-pre-line`.
  Sprechen geht immer über den Mia-Knopf. Kein eigenes Mikro in Eingabefeldern
  (die iPhone-Tastatur hat ihres). Formular nur über „Mehr Details“. Mia ist
  ein runder Knopf rechts in der Leiste unten; Tippen holt sie auf die Bühne, sie hört
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
  nochmal, dann „Hat grad nicht geklappt. Nochmal?“). Modell vor dem Aufruf: Haiku für den Alltag, Sonnet für Planen, Rezepte, Mails, Ideen, Rat (`begleitung/modellwahl.ts`), hochschalten nur bei echtem Fehler. Was Mia kann, steht im Prompt automatisch aus den
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
  wenn die KI es per `app_befehl` vorschlägt. Ausnahme Sofort-Weg (`begleitung/sofort/`, Prüfstand ≥ 98 %):
  eindeutige Kurzbefehle erledigt die App sofort, die KI bekommt die Nachricht trotzdem im Hintergrund und
  korrigiert nur, wenn sie etwas anderes versteht. Keine Regel darf einen Zustand hinterlassen, der weitere Nachrichten abfängt.

## 3. Räume
- „Familie“ ist gemeinsam, „Arbeit“ ist persönlich. Ohne Angabe gehört etwas
  zur Familie. Familie = Orange (`bg-accent`), Arbeit = Blau (`bg-work`).
- Mit Konto teilt der Haushalt „Familie“; „Arbeit“ sieht nur der Besitzer.
  Konto erst, wenn man teilen will; eingeladen wird per Link (/e/…). In der
  Oberfläche heißt der gemeinsame Bereich je Haushaltsart „Privat“ (allein),
  „Wir“ (zu zweit) oder „Familie“ (`core/haushalt.ts`, `useRaumName`), nie
  „Haushalt“; intern bleibt der Schlüssel „familie“.
  Ohne Konto bleibt alles auf dem Gerät – die App geht immer auch ohne.
- Aufgaben gehören standardmäßig der Person, die sie anlegt; geteilt wird nur
  durch Abgeben („An … geben“, beim Empfänger „von Felix“, zurück mit „Passt
  gerade nicht“; `kalender/abgeben`). Für Absprachen ist die Pinnwand da.
- Aufgaben: EINE Liste, Familie ohne Kennzeichen, Arbeit nur als kleines
  blaues Schild; Chips „Alle · Familie · Arbeit“ nur mit Arbeitsaufgaben.
  Nach Feierabend (Tagesablauf) ist Arbeit ausgeblendet: „Arbeit · 5 für
  morgen“ (`kalender/aufgaben.ts`).

## 4. Ohne Druck
- Keine Streaks, keine Zähler, keine roten Badges, keine Aufgaben-Stapel.
  Sport zählt nur Wochen, nie Tage.
- Nicht Erledigtes verschwindet leise (Aufgaben rutschen still auf den
  nächsten Tag, ohne Etikett – kein „von gestern“, kein „heute“, kein Punkt
  pro Zeile). Nie „Du hast … nicht gemacht“, nie „du musst / du
  solltest / vergiss nicht“, nie „Ich vermisse dich“.
- Nie Wörter wie „fehlt“, „offen“, „überfällig“, „noch zu erledigen“,
  „verpasst“, „Alles da“. Stattdessen vorbereitend („Für Montag“, „Ich hab
  schon …“). Zutaten: „alles im Haus“ (grün) bzw. „auf die Liste: …“.
- Jetzt-Karte: nachts (22–6) nur Morgen/Erinnerung/Timer, im Feierabend und am
  Wochenende nur Sanftes. Höchstens EIN Hinweis unter der Jetzt-Karte.
  Push (`docs/bereiche/push.md`): höchstens 1 proaktive Mitteilung pro Tag, Ruhe 20–7 Uhr,
  Pause-Modus = absolute Ruhe.

## 5. Ton
- Knapp, norddeutsch, nie vorstellen (einzige Ausnahme: der Hallo-Bildschirm
  beim allerersten Start), keine Gedankenstriche/Spiegelstriche,
  keine Floskeln, max. 2 Sätze. Bestätigungen 1–3 Wörter („Steht drin.“),
  höchstens ein „!“ und ein Emoji pro Nachricht. Jede KI-Antwort läuft vor
  Anzeige, Vorlesen und Push durch `tidyMiaText()` (`begleitung/tidy.ts`).
- Kurz, warm, mitdenkend, natürlich, Deutsch, etwas Humor, kein Formularton,
  keine Fachbegriffe.
- Gesprochenes Deutsch erwünscht, nie steif; Längen und Prüfstand „Ton“ in
  `docs/bereiche/begleitung.md`.
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
  gleich hell und kräftig, Tokens `--app-tile-<id>`/`-ac`, Schrift ≥ 4,5:1,
  Innen-Kärtchen weiß, Wetter als Himmel `--app-sky-*`, Essen mit Bild) oder
  „Schlicht“ (weiß mit feinem Rand, Farbe nur in Überschrift, Symbol, Uhrzeit,
  Termin-Strich; `data-look` am `<html>`); Kachel-Farbe aus 8 festen Tönen (Tafel 108,
  `docs/design.md`). Weiße Karten auf Unterseiten, EINE Akzentfarbe (Orange) nur für Knöpfe und die Begleitung, Pastell nie für
  Knöpfe. Linien-Icons (lucide), Emojis nur als Inhalt (Gerichte, Notizen,
  Pinnwand-Reaktionen 👍 ❤️ 😂 😮 🙏 – die sind Inhalt), nie in Knöpfen,
  Chips, Kacheln oder Termin-Titeln.
- Schrift Plus Jakarta Sans; Seitentitel 30/800 (`PageHeader`), Abschnitte
  `SECTION_TITLE`, Kachel-Label `TILE_LABEL` nur in Kacheln. Radien nur über
  Tokens: `rounded-card` 20 px, `rounded-field` 14 px, `rounded-full`, dazu
  `rounded-bar`/`-sky`/`-pair`/`-icon`.
- Seitenkopf: „‹ <vorherige Seite>“, rechts höchstens ein Knopf (Seiten-Plus
  34 px orange oder „…“), darunter der große Titel. Kalender und Essen: großer
  Titel, kein Zurück. Kachel-Plus 26 px hellorange.
- Leiste unten (Stil B1) und die EINE Bühne (`MiaStage`): auf allen Seiten
  gleich; auf der Bühne GENAU EINE antippbare Mia. Details in `docs/design.md`.
- Bewegung sehr weich: 0,8–1,2 s, `cubic-bezier(.16,1,.3,1)`, nur
  transform/opacity, `prefers-reduced-motion` = nur Überblenden.
- Knöpfe nie schwarz. Standard für neue Nutzer = Hell; Dunkel/Automatisch nur
  nach eigener Wahl (intern `warm`/`nacht`/`auto`).
- Ein Fenster für alles (`ui/Sheet.tsx`); jedes Fenster schließt per ✕,
  Danebentippen, Runterwischen und Zurück.
- Avatar (`BegleitungAvatar`, immer Orange), App-Icon (`scripts/generate-icons.mjs`)
  und Marke (`BrandMark`, `docs/brand.md`): Details in `docs/design.md`.

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
  Kalender und Essen sind Hauptseiten (Zurück führt zu Heute). Zur Startseite
  führt die Leiste unten. Öffnen nach mehr als 5 Minuten weg = Startseite,
  Kochmodus bleibt, offene Mia-Bühne schließt (`core/heimkehr.ts`).
- Eingabefelder mindestens 16 px Schrift, Safe-Areas beachten, Tippflächen
  mindestens 44 × 44 px (`hit`). Listenzeilen auf der Startseite dürfen 30 px
  hoch sein, wenn die ganze Zeile tippbar ist (`data-zeile`). Weiter/Zurück am
  Inhaltsende, nicht fixiert.
- Farben, Radien, Komponenten nur über Tokens und `src/components/ui/`; im Code
  nie `var(--color-…)`, nur `var(--app-…)`.
- Einstellungen nach Nutzungshäufigkeit sortieren, aktueller Wert rechts.
- Version bei jeder Auslieferung erhöhen: `package.json` (+ `package-lock.json`),
  `APP_VERSION` in `src/lib/core/app.ts`, `CACHE_VERSION` in `public/sw.js`.
- Spracheingabe nur über `useSpeechInput`, Mikro nur über `core/mic` (Details
  in `docs/bereiche/begleitung.md`).
- Reihenfolgen nur über `src/lib/core/sort.ts` (deutsche Sortierung, stabil).
  Aufgaben: dringend → neu (heute angelegt, Schild „neu“) → Erstellungszeit,
  nie alphabetisch.
- Phase heißt „Morgens“, der nächste Tag immer mit Wochentag („Morgen · Mi“).
- Regex: nie `\b` direkt an ä/ö/ü/ß (dort gibt es in JS keine Wortgrenze) –
  stattdessen `(?<![a-zäöüß])` bzw. `(?![a-zäöüß])`.
- Reine Typ-Importe als `import type { … }`. Schweres erst bei Bedarf laden
  (`next/dynamic`, `import()`); das Layout lädt nichts von einzelnen Seiten.
- Jeder behobene Fehler bekommt einen Test. Dateien möglichst unter 600 Zeilen.

## Feste Regeln einzelner Bereiche
Stehen jeweils oben in `docs/bereiche/<bereich>.md`: Tipps aus der Region
und Name „KARAMBA Eis“ (`tipps`), Spendentopf, Wetter, Beispiel-Tag
(`heute`), Pinnwand, Konten (Supabase), Mails an Mia, Mia denkt mit und
Mias Stimme (`begleitung`), Bilder der Gerichte (`essen`). Vor Änderungen dort lesen.

## Datenschutz
- So wenig Daten wie möglich, so lange wie nötig, nie verkauft, keine Tracker,
  keine Werbe-Profile. Neue Datenart oder neuer Anbieter → im selben PR
  `docs/datenschutz/datenkarte.md`, `anbieter.md` und die Datenschutzerklärung
  (`src/lib/datenschutz/rechtstexte.ts`) aktualisieren.
- Server-Funktionen in Frankfurt (`vercel.json`), Sicherheits-Header in
  `next.config.ts`, jede Tabelle mit RLS (`tests/datenbank/sicherheit.test.sql`),
  Protokolle nur mit Technik-Zahlen (`tests/app/datenschutz.test.ts`).
- Nie „keine Werbung“ versprechen (Test): ehrlich ist „Kein Tracking, keine
  Werbe-Profile, nie verkauft“. Rechtsseiten ohne Mia-Knopf, mit Band
  „Entwurf“, solange Betreiber-Angaben Platzhalter sind.
- Falls je Werbung kommt: nur nicht personalisiert und ohne Tracking, sonst
  braucht es eine Einwilligung.

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
- Mehrere Aufträge auf einmal: parallel arbeiten (eigene Zweige/Helfer), wo sie
  sich nicht überschneiden. Überschneidende Bereiche nacheinander, immer auf
  dem neuesten `main`. Nach jedem Merge: `npm test`, Durchklick,
  `bilder:vergleich`. Bei Konflikten gilt der neuere Auftrag.
- Warteschlange `docs/auftraege.md`: bei jedem Sitzungsstart zuerst lesen;
  neue Aufträge dort eintragen (A-…, Titel, Tafel, Status), bevor die Arbeit
  beginnt; nach jedem Merge den Status aktualisieren; am Ende jedes Pakets
  oben eine kurze Zusammenfassung (fertig, offen, was ausprobieren).
- Tafeln (Vorlagen-Bilder) als `docs/tafeln/tafel-<nr>.png` speichern und im
  Auftrag darauf verweisen.
- Tests gestaffelt: pro Auftrag `npm test`, tsc, lint, knip und die
  betroffenen Durchklick-Abläufe; volle Prüfung (bilder, bilder:vergleich,
  pruefen, kompletter Durchklick, Prüfstand) einmal am Ende jedes Pakets,
  Ergebnis in `docs/auftraege.md`. Alle Befehle: `docs/testen.md`.

## Ordner
Gleiche Bereichsnamen in `src/lib/<bereich>`, `src/components/<bereich>` und
`tests/<bereich>` (Tabelle und Namensregeln in `docs/ordner.md`). Importe nur
über `@/…`.

## Mehr dazu
- `docs/bereiche/<bereich>.md` – aktueller Stand je Bereich (Code, Speicher,
  Verhalten, Begleitung, Tests).
- `docs/verlauf.md` – wie alles entstanden ist (frühere Abschnitte je Version).
- `docs/aufraeumen-vorher.md` / `docs/aufraeumen-nachher.md` – Zahlen vom
  großen Aufräumen.
- `docs/testen.md`, `docs/ordner.md`, `docs/design.md`, `docs/roadmap.md` –
  aus CLAUDE.md umgezogene Details.
- `docs/auftraege.md` – Warteschlange, `docs/tafeln/` – Vorlagen-Bilder.
- `docs/credits.md` – Quellen und Lizenzen. `docs/vorlagen/` – Vorlagen
  (Avatar-Animation, Beispiel-Startseite).
