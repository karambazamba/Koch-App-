# Kalender

Kurz: Termine (feste Uhrzeit) und Aufgaben (zu erledigen) im einheitlichen
Eintrags-Modell. Dazu der Reiter Kalender (Monat/Woche/Liste), die Tag-Seite,
die Aufgaben-Seite und das Eintragen-Fenster.

## Wo im Code

- Reine Logik: `src/lib/kalender/model.ts` (`itemsForDay`, `taskOverview`,
  `orderedTasks`, `sortItems`, `setDone`, `moveItem`, `removeItem`,
  `setReminder`, `setUrgent`, `upcomingTermine`, `terminToAufgabe`,
  `aufgabeToTermin`, `sanitizeEntry`).
- Speicher: `src/lib/kalender/store.ts` (`loadEntries`, `changeEntries`,
  `useEntries`, `markReminderSeen`, `migrateOldTermine`).
- Erinnerungen: `reminders.ts` (`dueReminder`).
- Sprache ohne KI: `parse.ts` (`parseCalendar`, `findDate`, `urgentFrom`,
  `guessRoom`, `guessLabel`), `chat.ts` (`calendarChat`, `draftSummary`),
  Antworten `answers.ts` (`showAnswer`, `freeAnswer`, `contextLines`),
  Schnell-Eintrag `quick.ts` (`readQuickText`, `readTerminText`,
  `WHEN_CHOICES`), Begrüßung `summary.ts` (`greeting`).
- Oberfläche `src/components/kalender/`: `CalendarPage.tsx` (`dayDots`,
  `dayHeading`), `DayView.tsx` (/tag), `DayAgenda.tsx`, `TasksView.tsx`
  (/aufgaben), `AddSheet.tsx`, `TerminQuickAdd.tsx`, `TaskQuickAdd.tsx`,
  `EntryForm.tsx`, `Items.tsx` (Zeilen, Menü), `UrgentMark.tsx`.
- Kleine Änderungen aus der Oberfläche: `act()` in
  `src/components/heute/actions.ts`.

## Daten und Speicher

- `wasgibts.eintraege` v2 `{entries, migratedTermine, seenReminders}`
  (`migrate` in `store.ts`). Jeder Eintrag hat `id`, `typ` (termin/aufgabe),
  `raum` (familie/arbeit), `besitzer`, `erstellt`, `geaendert`, `data`.
  In der Sicherung.
- v1 → v2: einmalige, offene „Aufgaben“ mit Tag und Uhrzeit (ohne Frist)
  werden zu Terminen (`asTermin`).
- Alte Termine aus `wasgibts.termine` übernimmt `migrateOldTermine` einmal,
  danach wird der alte Schlüssel gelöscht. `seenReminders` hält höchstens 200.
- `TerminData`: `title`, `date`, `start`, `end?`, `place?`, `label?`,
  `repeat`, `reminder`, `who?`, `note?`, `link?`, `doneDates?`, `skipDates?`.
- `AufgabeData`: `title`, `date?` (Wunschtag), `due?` (Frist), `week?`
  (Montag, „diese Woche“), `time?`, `label?`, `repeat`, `reminder`,
  `doneOn?`, `doneDates?`, `skipDates?`, `dringend?`, `seit?`.
- `Repeat`: taeglich · woechentlich · monatlich · wochentage (0 = Mo … 6 = So).
  `Reminder`: aus · 15 · 30 · 60 · vorabend.

## So verhält es sich

### Termine und Aufgaben an einem Tag
- Termin = feste Uhrzeit. Aufgabe = an einem Wunschtag, bis zu einer Frist,
  „diese Woche“ oder ohne alles („Irgendwann“, steht an keinem Tag).
- Unerledigte einmalige Aufgaben von früher erscheinen still heute mit „von
  gestern“, „von Montag“, „von letzter Woche“ oder „von früher“
  (`carriedLabel`). Nie „überfällig“. „Diese Woche“ von letzter Woche rutscht
  ebenso auf heute.
- Fristen zeigen „bis heute“, „bis morgen“, „bis Mi“ oder „bis 24.10.“.
- Ein Tag sortiert: Erledigtes ans Ende, dringende Aufgaben vorn, ganztägige
  Termine, dann Uhrzeit bzw. Erstellungszeit (`sortItems`).
- „Heute“ zählt nur Termine, die noch laufen oder kommen; ohne Ende gilt
  1 Stunde (`upcomingTermine`).
- Der nächste Tag heißt immer mit Wochentag: „Morgen · Mi“ (`tomorrowLabel`).

### Reihenfolge der Aufgaben
- EINE Reihenfolge (`orderedTasks`): dringend → heute dran (auch „von
  gestern“) → nächste Frist (früheste zuerst) → diese Woche → später →
  irgendwann. Innerhalb nach Uhrzeit, sonst Erstellungszeit; „Auf morgen“
  setzt `seit` neu (dann hinten). Nie alphabetisch.
- `taskOverview` gruppiert für die Aufgaben-Seite: Heute dran · Diese Woche ·
  Später · Irgendwann · Erledigt (letzte 14 Tage); Dringendes je Gruppe zuerst.
- Dringend: kleines rotes „!“ (`UrgentMark`), im Menü „Als dringend
  markieren“/„Nicht mehr dringend“.

### Wiederholungen
- `repeatsOn`: täglich; wöchentlich im 7-Tage-Abstand zum ersten Tag;
  monatlich am gleichen Tag im Monat; bestimmte Wochentage.
- Abhaken bei Serien über `doneDates`, einmalige Aufgaben über `doneOn`.
- Verschieben (`moveItem`): einmalige Einträge wandern ganz; bei Serien
  entfällt nur dieser Tag (`skipDates`) und eine Einzelkopie kommt an den
  neuen Tag. Löschen (`removeItem`) ganz oder nur ein Tag der Serie.

### Erinnerungen
- Noch ohne Push: eine fällige Erinnerung erscheint als Thema der Jetzt-Karte
  auf Heute (`dueReminder`), vom Erinnerungszeitpunkt bis zum Beginn:
  „In 30 Minuten: Jonne abholen.“. Vorabend = ab 19 Uhr am Tag davor:
  „Morgen (Mi) um 9:00: …“. Antippen oder ✕ = gesehen (`markReminderSeen`).
- „Neuer Termin“ schlägt 30 Min vorher vor.

### Kalender-Seite
- Reiter Kalender auf der Startseite (`?seite=kalender`, alt `?seite=woche`):
  Monat | Woche | Liste, Filter Alle | Familie | Arbeit nur, wenn es Arbeit
  gibt (`useWorkRoom` oder Einträge mit Arbeit).
- Monat: Raster Mo–So mit Punkten (`dayDots`: orange Familie, blau Arbeit,
  grün Sport), heute oranger Kreis, darunter der gewählte Tag als `DayAgenda`
  (Termine · Aufgaben · Essen). Mit Tipps aus der Region: Chip „Tipps“ und
  lila Punkt (`components/tipps/CalendarTips`), nie als Termin.
- Woche: sieben Tageskarten mit ‹ ›. Liste: die nächsten 14 Tage und
  „Weitere Wochen“.

### Tag-Seite und Aufgaben-Seite
- `/tag?datum=…`: Titel = Wochentag, darunter „22. Oktober · morgen“
  (`dayHeading`), dann `DayAgenda`; leer „Ein freier Tag.“. Plus = Eintragen.
- `/aufgaben`: Filter, Gruppen, „Erledigte anzeigen“ eingeklappt; leer
  „Alles erledigt.“ mit großer Begleitung.
- Antippen eines Eintrags = Menü: Erledigt · Auf morgen · Erinnerung ändern ·
  Bearbeiten · Löschen; bei Serien „Nur diesen Tag“ / „Alle – die ganze Reihe“.
  Abhaken: 2 s durchgestrichen (`LEAVE_MS`), dann „Erledigt · Rückgängig“;
  Löschen „Gelöscht · Rückgängig“.

### Eintragen
- Ein Fenster „Was möchtest du eintragen?“ (`AddSheet`): Termin · Aufgabe ·
  Notiz · Einkauf, dazu „einfach der Begleitung sagen“ (Mikrofon).
- „Neuer Termin“ (`TerminQuickAdd`): Textfeld mit Mikrofon; Tag und Uhrzeit
  aus dem Text setzen die Chips („Morgen 19:30 Elternabend“). Wann ·
  Uhrzeit (häufige zuerst) · Für wen (Avatare) · Familie | Arbeit ·
  „Mehr Optionen“ (Ort, Erinnerung). Ohne Uhrzeit: „Dann lieber als Aufgabe“.
- Aufgabe (`TaskQuickAdd`): Heute · Morgen · Diese Woche · Irgendwann,
  Familie | Arbeit, „+ Uhrzeit oder Erinnerung“; Enter lässt das Fenster offen.
- Bearbeiten (`EntryForm`): „Abbrechen | Titel | Sichern“, gruppierte Zeilen,
  unten rot „Löschen“. Link und Notiz aus Tipps bleiben (`terminExtras`).
- Ohne Angabe gehört alles zur Familie.

### Kalender übernehmen (Baustein „kalender“, seit v0.50)

- Seite `/profil/kalender` (`kalender/import/CalendarImportView.tsx`), Zeile in
  den Einstellungen und leise „Aus Apple/Google übernehmen“ im
  Eintragen-Fenster – nur mit Baustein (aus). Die Begleitung schaltet ihn frei.
- Einmal per Datei (.ics, auch mehrere): `lib/kalender/import/ics.ts` (eigener
  Parser: entfaltete Zeilen, TZID/UTC/floating → Europe/Berlin inkl.
  Sommerzeit, Windows-Zonen, ganztägig/mehrtägig, DURATION, EXDATE,
  RECURRENCE-ID, STATUS:CANCELLED, VALARM), `rrule.ts` (RRULE → unsere Serie:
  täglich, wöchentlich/alle N Wochen, Wochentage, monatlich – mit Ende aus
  UNTIL/COUNT; sonst einzelne Tage), `plan.ts` (Vorschau-Zahlen, Termine,
  Zusammenführen).
- Vorschau „112 Termine gefunden · 8 Serien · ab heute 46“, Zeitraum ab heute
  (Standard) / alles, Familie oder Arbeit je Kalender (Namen wie „Arbeit“
  starten in Arbeit). „Übernehmen“ → „46 Termine übernommen · Rückgängig“
  (alle auf einmal). Besondere Serien („jeden 2. Dienstag im Monat“,
  jährlich) werden für 12 Monate einzeln angelegt und im Bericht genannt.
- Erinnerungen: ≤ 15/30/60 Min → Stufe, am Vortag 16–22 Uhr → Vorabend, sonst aus.
- Herkunft `source: { kind: google|apple|ics, uid }` im Termin: erneutes
  Einlesen aktualisiert (id, erstellt, Abgehaktes bleiben) statt doppelt; im
  Termin klein „aus Google“/„aus Apple“.
- Modell dafür erweitert (ohne Versionswechsel, alles optional): ganztägige
  Termine (`start: ""`), `until` (Serienende), `endDate` (mehrtägig, Uhrzeit nur
  am ersten, Ende nur am letzten Tag), `woechentlich.every` (alle N Wochen).
  Das Formular behält diese Feinheiten beim Sichern (`terminExtras`).

### Kalender-Link (Abo, nur lesen, seit v0.51)

- Auf `/profil/kalender` unten „Dauerhaft verbinden – per Link“
  (`kalender/import/AboSection.tsx`): Anleitung Google („Geheime Adresse im
  iCal-Format“) und Apple („Öffentlicher Kalender“, webcal://), Link, Name,
  Familie/Arbeit → „Verbinden“. Je Kalender: Farbe (antippen = nächste), Name,
  Raum, an/aus, Entfernen (Rückgängig), „Jetzt aktualisieren“.
- Abruf über `POST /api/kalender-abo` (`lib/kalender/abo/fetchFeed.ts`): nur
  https/webcal, Standard-Port, keine Zugangsdaten, keine privaten/lokalen
  Adressen (auch per DNS und Weiterleitung, höchstens 3), 5 MB, 10 s, Limit pro
  IP; der Link wird nie protokolliert. Testmodus: `https://kalender.test/…`
  liefert der Server selbst (`mockFeed`, `?v=2` = Änderung).
- Speicher: `wasgibts.kalenderabos` (Links, nur Gerät; in der Sicherung nur mit
  „Kalender-Links mitsichern“) und `wasgibts.kalenderabo-termine`
  (Zwischenspeicher). Abruf beim Öffnen/Zurückkommen, höchstens alle 30 Min
  (`aboRefreshDue` billig, `abo/sync.ts` mit Parser erst bei Bedarf).
- Abo-Termine: besitzer `abo:<id>`, feste ids; `useCalendarEntries` /
  `loadCalendarEntries` mischen sie für Heute, Kalender, Jetzt-Karte,
  Wetter-Tipp, Tipps im Kalender und die Begleitung (Kontext „aus verbundenem
  Kalender, nur lesen“). Strich/Punkt in der Farbe des Kalenders, kein
  Abhaken; Antippen → `AboItemSheet` mit „In unseren Kalender kopieren“.
  `replaceEntries` lässt Abo-Termine nie in die eigenen; Mias Werkzeuge
  ändern sie nicht (freundlicher Hinweis).
- Später (mit Konten): in beide Richtungen mit Google (OAuth/Calendar API)
  und Apple (CalDAV), Export der eigenen Termine als Abo-Link.

## Begleitung (Mia)

- Werkzeuge in `src/lib/begleitung/calendarTools.ts` (Bereich „alltag“):
  `termin_anlegen`, `termin_aendern`, `termin_loeschen`, `aufgabe_anlegen`,
  `aufgabe_aendern`, `aufgabe_erledigen`, `aufgabe_verschieben`,
  `tag_anzeigen`, `woche_anzeigen`. Schreibende liefern nur Vorschläge mit
  „Übernehmen“ (Ops `upsert_entry`, `remove_entry`, `done_entry`, `move_entry`).
- In `noteTools.ts`: `termin_in_aufgabe_umwandeln`,
  `aufgabe_in_termin_umwandeln`, `aufgaben_anzeigen`.
- Kontext je Anfrage: Datumsliste und Einträge der nächsten Tage mit ids
  (`contextLines`).
- Ohne KI: `calendarChat` (aufgerufen in
  `src/components/begleitung/useChatRules.ts`) trägt sofort ein und meldet
  „Eingetragen ✓ …“ mit Rückgängig. `parseCalendar` erkennt Tag, Uhrzeit,
  Frist, „diese Woche“, Wiederholung, Erinnerung, Raum, Etikett und
  „Dringend: …“. Termin nur mit fester Uhrzeit und ohne Frist, sonst Aufgabe.
- Befehle: „Verschieb … auf Donnerstag“, „Lösch …“ / „… fällt aus“, „… ist
  erledigt“, „Was steht diese Woche an?“, „Hab ich morgen Nachmittag Zeit?“.
  Sätze über Essen, Einkauf oder Urlaub lässt `parseCalendar` liegen.

## Tests

- `tests/kalender/kalenderAbo.test.ts`: Server-Schutz (private IPs, DNS, Weiterleitungen, zu groß, Zeitüberschreitung, kein Kalender), Abo-Termine, Kopie, Fälligkeit, Schreibschutz, Sicherung nur auf Wunsch; Durchklick `kalenderAbo` (verbinden, im Kalender, kopieren, Änderung kommt an).
- `tests/kalender/kalenderImport.test.ts`: Dateien im Google- und Apple-Stil (Serie mit Ausnahme, verschobener Einzeltermin, ganztägig, mehrtägig, Sommerzeit, andere Zeitzone, Erinnerungen, Umlaute/Emojis, doppelt einlesen); Durchklick `kalenderImport`.

- `tests/kalender/`: `termineAufgaben.test.ts`, `wiederholungen.test.ts`,
  `spracheKalender.test.ts`, `kalenderChat.test.ts`.
- `tests/core/sortierung.test.ts` („Termine und Aufgaben“),
  `tests/begleitung/werkzeugeKalender.test.ts`.
- Durchklick `e2e/ablaeufe/alltag.mjs`: `eintragen`, `kalender`.
