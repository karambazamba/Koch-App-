# Kalender

Kurz: Termine (feste Uhrzeit) und Aufgaben (stehen jetzt an – alles ist heute) im einheitlichen
Eintrags-Modell. Dazu der Reiter Kalender (Monat/Woche/Liste), die Tag-Seite
und die Aufgaben-Seite. **Kalender = nur Termine** (Tafel 74, seit v0.73.0):
Aufgaben und Essen stehen nie im Kalender – alles zusammen zeigt „Dein Tag“.

## Wo im Code

- Reine Logik: `src/lib/kalender/model.ts` (`itemsForDay`, `taskOverview`,
  `taskFrom`, `isNeu`, `ohneZeitraum`, `sortItems`, `setDone`, `moveItem`, `removeItem`,
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
- Kalender (rein): `monat.ts` (`termineOn`, `calendarDots`, `dayDistance`,
  `recurringSuggestions`).
- Oberfläche `src/components/kalender/`: `CalendarPage.tsx` (Monat, Woche,
  Liste – Tag antippen überall gleich, `dayHeading`), `DayPanel.tsx` (der
  gewählte Tag), `DayView.tsx` (/tag), `TasksView.tsx` (/aufgaben),
  `Items.tsx` (Strich-Farbe, Menü), `UrgentMark.tsx`.
- Eintragen (Tafel 114): EIN Fenster je Art – `components/kalender/eintragen/`
  `AufgabeFenster.tsx`, `TerminFenster.tsx`, gemeinsame Teile
  `EintragTeile.tsx`, Speichern `speichern.ts`; Logik rein in
  `lib/kalender/eintragen/` (`aufgabe.ts`, `termin.ts`, `tage.ts`), Raum-Wahl
  `components/kalender/eintragen/useRaumWahl.ts`, Öffnen NUR über `oeffnen.ts`
  (`neuEintragen`, `eintragAendern`).
- Räume (A-034): rein in `lib/kalender/raum/` – `raten.ts` (`raumRaten`,
  `guessRoom`, `raumUnklar`, `arbeitsWorte`, `stichwort`, `raumBefehl`),
  `wahl.ts` (`chipRaum`, `raumZumSpeichern`, `istKorrektur`,
  `vorgewaehltText`), Gedächtnis `gedaechtnis.ts`; Oberfläche `ui/RaumChips`,
  `components/kalender/raum/` (`raumAendern.ts`, `RaumBestaetigung.tsx`),
  lange drücken `ui/LangKnopf` bzw. `ui/useLangDruecken`.
- Aufgaben-Liste (rein): `aufgaben.ts` (`aufgabenKopf`, `aufgabenAnsicht`,
  leise Zeilen, `aufgabenSatz` für Mia, `feierabendNachUhr`), gemerkter Filter
  `aufgabenFilter.ts`, Schilder `components/kalender/AufgabeSchild.tsx`,
  Feierabend der Seite `components/kalender/useArbeitRuht.ts` (Regel
  `arbeitRuht`/`istFeierabend` in `heute/phases.ts`).
- Kleine Änderungen aus der Oberfläche: `act()` in
  `src/components/heute/actions.ts`.

## Daten und Speicher

- `wasgibts.eintraege` v5 `{entries, migratedTermine, seenReminders}`
  (`migrate` in `store.ts`). Jeder Eintrag hat `id`, `typ` (termin/aufgabe),
  `raum` (familie/ich/arbeit), `besitzer`, `erstellt`, `geaendert`, `data`.
  In der Sicherung.
- v1 → v2: einmalige, offene „Aufgaben“ mit Tag und Uhrzeit (ohne Frist)
  werden zu Terminen (`asTermin`).
- v2 → v3 (v0.137, Tafel 103): `week` („Diese Woche“) fällt still weg – die
  Aufgabe steht heute; ein Zeitraum in der Zukunft („nächste Woche“) wird
  zum Tag, ab dem sie erscheint (`ohneZeitraum`, auch im Abgleich
  `konten/sync/docs.ts` und für alte Sicherungen). Nichts geht verloren.
- v3/v4 → v5 (A-034): bestehende Aufgaben im Raum „familie“ werden „ich“
  (`aufgabeIch` – sie gehörten bisher nur dem Ersteller), Etikett „Privat“
  wird Raum „ich“ (`ohnePrivat`, Etikett bleibt gespeichert, wird nie gezeigt),
  Termine bleiben Familie bzw. Arbeit. Auch im Abgleich (`konten/sync/docs.ts`)
  und für alte Sicherungen; nichts geht verloren.
- `wasgibts.aufgabenfilter` v1 `{filter: alle|familie|ich|arbeit}` – pro Gerät,
  nicht in der Sicherung.
- `wasgibts.raumgedaechtnis` v1 `{worte: [{wort, raum, seit}], hinweisGesehen}`
  – gelernte Räume (höchstens 60, neueste vorn) und ob der Satz „Hab …
  gewählt“ schon kam; in der Sicherung (`migrateRaumGedaechtnis`). Den
  früheren `wasgibts.eintragraum` (letzte Wahl, nie ausgeliefert) gibt es
  nicht mehr.
- Räume: `familie` · `ich` · `arbeit`; Unbekanntes wird „familie“ (`roomOf`).
- Alte Termine aus `wasgibts.termine` übernimmt `migrateOldTermine` einmal,
  danach wird der alte Schlüssel gelöscht. `seenReminders` hält höchstens 200.
- `TerminData`: `title`, `date`, `start`, `end?`, `place?`, `label?`,
  `repeat`, `reminder`, `who?`, `note?`, `link?`, `doneDates?`, `skipDates?`.
- `AufgabeData`: `title`, `date?` (ab diesem Tag; neue Aufgaben immer mit
  Tag, ohne genannten = heute), `due?` (Frist), `week?` (nur noch alt, wird
  migriert), `time?`, `label?`, `repeat`, `reminder`,
  `doneOn?`, `doneAt?` (Abhak-Zeitpunkt, ISO), `doneDates?`, `doneTimes?`
  (Serie: Abhak-Zeitpunkt je Runde, nur die letzten 12 h), `doneBy?` (Konto-ID,
  wer abgehakt hat), `skipDates?`,
  `dringend?`, `seit?`.
- Erledigtes nur 12 Stunden (A-043): keine neue Speicher-Version – die
  Felder sind optional. Erledigtes ohne Zeitpunkt (vor dem Update, alte
  Sicherung `tests/fixtures/sicherung-v0.144-erledigt.json`) gilt als alt und
  wird beim ersten Start einmal still entfernt; das ist dieselbe Regel wie
  sonst (`ohneAbgelaufene`), deshalb idempotent.
- `Repeat`: taeglich · woechentlich · monatlich · wochentage (0 = Mo … 6 = So).
  `Reminder`: aus · 15 · 30 · 60 · vorabend.

## So verhält es sich

### Termine und Aufgaben an einem Tag
- Termin = feste Uhrzeit. Aufgabe = steht jetzt an (Tafel 103/104, v0.137):
  jede neue Aufgabe gehört zu HEUTE (Hand, ＋, Mia, Mail-Vorschlag). Nur bei
  ausdrücklich genanntem Tag („Freitag KFZ-Steuer“) erscheint sie ab diesem
  Tag (`taskFrom`), bis dahin unter „Geplant“. Eine Frist („bis Mittwoch“)
  ändert daran nichts. Kein „Irgendwann“, kein „Diese Woche“.
- Erkannt wird ein Tag nur, wenn er genannt ist (`genannterTag` in
  `parse.ts`: die Erkennung setzt sonst „heute“ ein).
- Unerledigte einmalige Aufgaben rutschen still auf heute – ohne Etikett
  (kein „von gestern“, kein `carried` mehr). Nie „überfällig“.
- Fristen zeigen „bis heute“, „bis morgen“, „bis Mi“ oder „bis 24.10.“ (nur
  noch für Mia, nicht in der Zeile).
- Ein Tag sortiert: Erledigtes ans Ende, dringende Aufgaben vorn, ganztägige
  Termine, dann Uhrzeit bzw. Erstellungszeit (`sortItems`).
- Ganztägige Termine (vX, Tafel 98) zeigen in der Uhrzeit-Spalte „Ganztägig“
  (früher „Tag“ bzw. „ganzt.“) – Termine-Kachel, „Dein Tag“ und Kalender-Tag
  (`components/kalender/GanztagMarke.tsx`, Spaltenbreite `zeitSpalte`: breiter,
  sobald ein ganztägiger dabei ist, nie umbrochen). Geburtstag, Jahrestag,
  Hochzeitstag (Stichwort im Titel oder Etikett, `lib/kalender/anlass.ts`
  `anlassOf`) bekommen davor ein kleines Linien-Symbol in Rosé (Geschenk bzw.
  Herz, Token `--app-rose`, Klasse `text-rosee`). In halben Kacheln steht nur
  das Symbol (ohne Anlass das Kalender-Symbol). Tests `tests/heute/abends.test.ts`.
- „Heute“ zählt nur Termine, die noch laufen oder kommen; ohne Ende gilt
  1 Stunde (`upcomingTermine`).
- Der nächste Tag heißt immer mit Wochentag: „Morgen · Mi“ (`tomorrowLabel`).

### Die eine Liste (Tafel 103/104, v0.137)
- `taskOverview` liefert `{heute, geplant, erledigt}`: Heute = EINE Liste
  (ohne Tag, von früher, mit Frist), Geplant = ab einem genannten Tag (mit
  `when` „Fr 30.10.“), Erledigt = höchstens 12 Stunden nach dem Abhaken,
  neueste oben (`jetzt`, siehe unten).
- Reihenfolge (Regel `TASKS` in `core/sort.ts`): dringend → heute angelegt
  (`isNeu`, Schild „neu“, am nächsten Tag weg) → Rest nach Erstellungszeit;
  „Auf morgen“ setzt `seit` neu (dann hinten). Nie alphabetisch.
- Dringend: kleines rotes „!“ (`UrgentMark`), im Menü „Als dringend
  markieren“/„Nicht mehr dringend“.
- Kennzeichen nur „neu“ (Seite), das graue Schloss „Ich“ (`text-ich`) und
  das Schild „Arbeit“ (klein, blau, `bg-work-soft text-work`) – `RaumSchild`;
  Familie ohne Kennzeichen, kein Punkt pro Zeile; Abgegebene und fremde
  Familien-Aufgaben „von Lisa“, von anderen Erledigtes „erledigt von Lisa“.
- Filter „Alle · Familie · Ich · Arbeit“ (`aufgabenAnsicht`, `raumChips`) nur,
  wenn mindestens zwei Räume vorkommen, und nur die vorhandenen; die Wahl
  merkt sich das Gerät. Gefiltert unten leise „Familie · 5 ausgeblendet“.
- Nach Feierabend (Tagesablauf: „Feierabend ab“, frühestens nach dem letzten
  Arbeit-Termin, mit „Ruhe nach Feierabend“; freie Tage laut Arbeitstagen)
  ruht die Arbeit (`arbeitRuht`): ohne Arbeit, unten leise „Arbeit · 5 für
  morgen ›“ („Ich“ bleibt sichtbar) – antippen blendet es kurz ein. Ab 5 Uhr (Morgens) wieder
  normal; ein Arbeitsbeginn ist im Tagesablauf nicht eingestellt.

### Abends wandert Offenes mit auf morgen
- EINE Stelle: `lib/kalender/mitwandern.ts`. `aufMorgen` sagt, ob die
  Startseite abends schon auf morgen steht (ab Feierabend bzw. 19 Uhr bis
  Mitternacht, solange heute kein Termin und kein Essen mehr kommt und nicht
  gekocht wird). `abendsNachUhr` rechnet dasselbe für Mia (mit und ohne KI).
- `aufgabenUebersicht(entries, { heute, abends })` wie `taskOverview`, abends
  für morgen: das Offene von heute steht still in derselben Liste
  (`wandertMit`, ohne „von heute“), dazu, was für morgen geplant ist;
  Erledigtes und „neu“ bleiben die von heute, Abhaken trägt das echte Heute
  ein. `aufgabenFuerTag` liefert die Aufgaben eines angezeigten Tages.
- Die Aufgaben-Seite zeigt immer das echte Heute (abends Kopf „Heute Abend ·
  Feierabend“), nur die Startseite steht abends auf morgen.
- Wiederkehrende Aufgaben wandern nicht mit (wie um Mitternacht kommt das
  nächste Vorkommen, sonst stünde „täglich“ doppelt da).
- Nur Anzeige: In den Daten wird nichts verschoben.

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
  Monat | Woche | Liste, Filter „Alle · Familie · Ich · Arbeit“ nur, wenn
  mindestens zwei Räume vorkommen (`raumChips`, wie bei Aufgaben).
- Monat: Raster Mo–So, unter jedem Tag höchstens 3 Punkte (5 px,
  `calendarDots`) in der Farbe der Person (`who` am Termin, feste Farbe je
  Person wie bei der Pinnwand; ich = „Meine Farbe im Kalender“), Familie ohne
  Person = Orange, Ich = Grau, Arbeit = Blau (sieht nur der Besitzer). Im Tag und in
  Woche/Liste Strich bzw. Punkt und Uhrzeit in Raumfarbe (`zeitFarbe`), dazu
  Schloss bzw. Schild wie in den Listen; lange drücken auf einen Termin →
  „Für Familie / Nur ich / Arbeit“. Heute =
  Zahl in Orange mit feinem Ring, gewählter Tag = gefüllter oranger Kreis.
  Mit Tipps aus der Region: Chip „Tipps“ und lila Punkt
  (`components/tipps/CalendarTips`), nie als Termin.
- Tag antippen → darunter der Tag (`DayPanel`, kein neuer Bildschirm): Kopf
  „Freitag, 30. Oktober“ + rechts „heute / morgen / in 7 Tagen“
  (`dayDistance`), Termine als ruhige Zeilen (Uhrzeit Blau, Titel, rechts der
  Kreis der Person; antippen = Menü). Das ＋ oben öffnet das Fenster „Neuer
  Termin“ mit diesem Tag (Tafel 114). „Schnell eintragen“ nur bei Wiederkehrendem
  (`recurringSuggestions`: ≥ 3× am selben Wochentag in 8 Wochen, gleiche
  Uhrzeit ±30 Min, keine Serie, an dem Tag noch nicht da; höchstens 3 Chips,
  „Eingetragen · Rückgängig“).
- Woche: sieben Tageskarten mit ‹ ›. Liste: die nächsten 14 Tage und
  „Weitere Wochen“. Beide nur mit Terminen („frei“ wenn leer), kein Essen.
- Leiste „Kalender · Heute · Essen“ bleibt auf Kalender und Essen oben
  (sticky); beim Runterscrollen schmal, durchsichtig mit Weichzeichner und
  feinem Schatten. „Heute“ trägt dort ein kleines Haus (orange, VoiceOver „Zur
  Startseite“) – antippen = Startseite (Tafel 73).

### Aufgaben: Familie für alle, Ich und Arbeit persönlich – abgeben geht (Tafel 52 B, A-034)

- Seit A-034 sehen alle im Haushalt die Familien-Aufgaben, jeder darf
  abhaken („erledigt von Lisa“, `doneBy`, gesetzt in `changeEntries` über
  `mitErledigtVon`); „Ich“ und „Arbeit“ bleiben beim Besitzer. Rolle
  `familie` in `taskRole`; den Raum ändern darf nur der Besitzer
  (`darfRaumAendern`). Erinnerungen per Push bekommt bei Aufgaben weiter nur,
  wer sie hält.

- Logik rein in `lib/kalender/abgeben/model.ts`: `taskRole` (meine ·
  bekommen · abgegeben · fremd), `isMyTask`, `fromLabel` („von Felix“),
  `giveTo` / `giveBack` („Passt gerade nicht“) / `takeBack`, `changeTask`,
  `doneNotes`, `memberByName`, `resolveGiving`. Ohne Konto ist jede Aufgabe
  meine.
- Anzeige: `useCalendarEntries`/`loadCalendarEntries` zeigen meine, bekommene
  und die Familien-Aufgaben der anderen; die Aufgaben-Seite hat unten eingeklappt „Abgegeben“
  (bei wem bzw. „erledigt ✓“). Im Menü einer Aufgabe (`abgeben/GiveRows`):
  „An … geben“ mit den Leuten aus dem Haushalt, bei bekommenen „Passt gerade
  nicht“, bei abgegebenen „Zurückholen“.
- Meldung beim Absender, wenn eine abgegebene Aufgabe erledigt wurde
  (`DoneNotes` im Layout: „Lisa hat ‚Turnbeutel waschen‘ erledigt ✓“, Push
  später). Einmaliger Hinweis „Aufgaben sind jetzt nur für dich – abgeben geht
  mit einem Tipp.“ (Merker `aufgaben-persoenlich`).
- Mia: „Sag Lisa, sie soll den Turnbeutel waschen“ → `aufgabe_anlegen` mit
  `an: "Lisa"`; beim Übernehmen wird daraus das Konto (`resolveGiving` in
  `commitOps`), unbekannte Namen bleiben bei mir („Oma ist noch nicht im
  Haushalt – ich hab’s erstmal bei dir notiert.“). „Gib das an Lisa“ geht
  über `aufgabe_aendern` mit `an`.
- Kachel „Aufgaben“ als Checkliste in EINEM hellen Feld: Kreis, Titel, „!“
  bei dringend, „von Lisa“ klein, rechts nur Schloss bzw. Schild „Arbeit“ (keine
  Etiketten „heute“/„bis Fr“/„von gestern“); S 2, M 4, L 6 Zeilen, „+ N
  weitere“. Nach Feierabend ohne Arbeit, unten leise „Arbeit · 5 für morgen“.

### Erledigte Aufgaben nur 12 Stunden (A-043)
- EINE Regel für jede Aufgabe, egal welcher Raum, wem sie gehört oder wer
  sie abgehakt hat (`lib/kalender/erledigt.ts`, rein): Aufgaben-Seite,
  Aufgabe-Kachel, „Abgegeben“ und Mia rechnen dort. Familien-Aufgaben mit
  „erledigt von Lisa“ (A-034) bekommen sie damit automatisch.
- Abhaken (`setDone`) merkt den Zeitpunkt (`doneAt` bzw. `doneTimes[datum]`),
  wieder öffnen löscht ihn – dann bleibt die Aufgabe.
- Höchstens 12 Stunden steht sie unter „Erledigt ⌄“ (`nochErledigt`), dann
  ist sie still weg. Kein Archiv, keine Zahl.
- Einmalige: danach gelöscht (`ohneAbgelaufene`, Speicher
  `erledigteAufraeumen` in `store.ts`, Hook `components/kalender/
  useErledigtAufraeumen.ts` im Layout: 5 s nach dem Start, beim
  Zurückkommen, jede Minute). Ohne „Gelöscht · Rückgängig“. Der Abgleich
  macht daraus wie beim Löschen die Lösch-Markierung (`geloescht`), damit
  alle Geräte gleich sind; räumt ein zweites Gerät dasselbe auf, ist nichts
  mehr zu tun (idempotent).
- Serien: nur die erledigte Runde fällt aus „Erledigt“, die Reihe bleibt
  (nächste Runde unter Heute bzw. Geplant).
- Mia: Die App schickt nur Erledigtes der letzten 12 h (`client.ts`), der
  Kontext nennt es eigens („Geschafft in den letzten 12 Stunden …“, jetzt aus
  Datum + Uhrzeit des Geräts, `berlinInstant`), `tag_anzeigen` und
  `woche_anzeigen` lassen Älteres weg. Prüfstand-Satz „Was hab ich heute
  geschafft?“ (Lage `geschafft`, `nennt`/`nenntNie`).
- Bekannte Grenze: Räumt ein Gerät offline mit altem Stand auf, während ein
  anderes die Aufgabe gerade wieder geöffnet hat, gewinnt die neuere
  Änderung – meist das Löschen.

### Tag-Seite und Aufgaben-Seite
- `/tag?datum=…`: Titel = Wochentag, darunter „22. Oktober · morgen“
  (`dayHeading`), dann der Tag (`DayPanel`, ohne eigenen Kopf). Plus =
  Fenster „Neuer Termin“ für diesen Tag.
- `/aufgaben` (Tafel 103/104): Kopf „Aufgaben“, darunter leise „Heute · Mi
  28. Okt“ (nach Feierabend „Heute Abend · Feierabend“); Chips nur mit
  mindestens zwei Räumen; EINE weiße Liste (Titel bis 2 Zeilen, dann „…“); darunter
  leise „Familie · 5 ausgeblendet“ bzw. „Arbeit · 5 für morgen ›“, „Geplant ·
  1 ›“ (nur wenn vorhanden), eingeklappte Listen, „Abgegeben“ und „Erledigt ⌄“
  (zugeklappt, ohne Zahl, nur die letzten 12 Stunden, neueste oben; Häkchen
  antippen = wieder offen); leer „Gerade nichts.“ mit großer Begleitung („Fällt dir was ein? Mit ＋ eintragen oder mir einfach sagen.“).
- Antippen eines Eintrags = Menü, oben die Raum-Chips (nur eigene Einträge),
  darunter: Erledigt · Auf morgen · Erinnerung ändern ·
  Bearbeiten (= dasselbe Fenster „Aufgabe“/„Termin“) · Löschen; bei Serien „Nur diesen Tag“ / „Alle – die ganze Reihe“.
  Abhaken überall gleich (Kachel, Aufgaben-Seite, Dein Tag): 1,5 s durchgestrichen (`LEAVE_MS`), dann „Erledigt · Rückgängig“;
  Löschen „Gelöscht · Rückgängig“. Lange drücken auf eine Zeile (Aufgaben-Seite,
  Kalender-Tag) = gleich „Für Familie / Nur ich / Arbeit“.

### Aufgaben übernehmen – große Listen ohne Chaos (seit v0.86)

- Regel: importiert wird alles, angezeigt wird nur, was jetzt dran ist.
- „Liste einfügen“ (`kalender/liste/ListeEinfuegen.tsx`, Logik
  `lib/kalender/liste/einfuegen.ts`): automatisch beim Einfügen von mehreren
  Zeilen ins Feld „Neue Aufgabe“, im leeren Zustand der Aufgaben-Seite und per Mia („Ich hab hier
  meine To-do-Liste:“ + Zeilen – ein App-Befehl vor der KI, wie Rezept-Links).
- Jede Zeile = eine Aufgabe; Kästchen/Aufzählungen (☐ - [ ] * • 1. 2) –)
  und Leerzeilen fallen weg, Abgehaktes (☑ [x] ✓ ~~durchgestrichen~~) wird
  weggelassen. Fristen und Tage erkennt der gemeinsame Parser
  (`parseCalendar`: „bis Freitag“, „28.10.“, „morgen“, „nächste Woche“).
  Überschriften („Haus:“, „KINDER“, „## Arbeit“) werden zum Listennamen
  (`data.liste`); eine Liste „Arbeit/Büro/Job“ landet in „Arbeit“.
- Vorschau: „37 Aufgaben gefunden · 12 mit Datum · 3 Listen (Haus, Arbeit,
  Kinder)“, darunter alle Zeilen zum Abwählen; „Alle übernehmen“ (bzw. „N
  übernehmen“) / „Nur mit Datum“; „4 schon vorhanden“ (gleicher Text, gleiche
  Liste, offen) wird nicht doppelt angelegt. Kleine Anleitung je Gerät
  (Apple Erinnerungen bzw. Android). Danach „Eingetragen: 29 Aufgaben ·
  Rückgängig“.
- Ordnung (`lib/kalender/liste/ordnung.ts`, `listenAnsicht`): Zeilen einer
  eingefügten Liste ohne genannten Tag und ohne Frist (und nicht dringend)
  bleiben in ihrer Liste geparkt (`inListe`) – eingeklappt mit Anzahl („Haus ·
  14“, nach Name, `TASK_LISTS`) unter der einen Liste. Alles andere steht in
  der einen Liste; Startseiten-Kachel und Mia zählen genauso.
- Vorschlag (`lib/kalender/liste/vorschlag.ts`): ab 8 geparkten Aufgaben, die
  schon 3 Tage liegen, oben auf der Aufgaben-Seite „Drei für heute?“ (die
  ältesten) mit „Übernehmen“ (→ Tag heute, Rückgängig) und „Nicht jetzt“;
  höchstens einmal pro Woche (`wasgibts.aufgabenvorschlag`).
- Todoist verbinden (Teil 3) folgt mit den Verbindungen (🔑).

### Eintragen – ein Feld, Familie · Ich · Arbeit (Tafel 114, A-034)
- EIN Fenster „Neue Aufgabe“ und EIN Fenster „Neuer Termin“ für jeden
  Einstieg: ＋ auf den Startseiten-Kacheln, ＋ oben auf Aufgaben-, Kalender-
  und Tag-Seite, Beispiel-Tag, „Bearbeiten“ im Menü eines Eintrags (dann
  „Aufgabe“/„Termin“, vorbefüllt). Geöffnet wird nur über
  `neuEintragen(art, tag?)`/`eintragAendern(entry)`; die Schnelleingabe zeigt
  dafür `AufgabeFenster`/`TerminFenster`. Kein anderes Formular (das frühere
  `EntryForm` mit Umschalter, Uhrzeit bei Aufgaben, „Bis spätestens“,
  Etikett-Chips und „Mehr Details“ ist weg; Etiketten, Fristen, Listen
  bleiben gespeichert und beim Ändern erhalten).
- Neue Aufgabe: EIN Feld („Was steht an?“, Tastatur sofort offen), Knopf ↑.
  Return = speichern für heute, Feld leer und offen für die nächste, Toast
  „Steht drin · Rückgängig“. Darunter EINE Zeile: Raum-Chips „Familie · Ich ·
  Arbeit“ (`ui/RaumChips`, Mia wählt vor, siehe unten), Glocke (42 px) → In 1 Std · 16:00 ·
  18:00 · Morgen früh (Vorbeies fällt weg) → Zeile „Erinnern heute 16:00 ✕“
  (Glocke orange; „Morgen früh“ legt die Aufgabe auf morgen), rechts leise
  „Mehr ›“. Hinweis „Für heute. Return = speichern.“. „Mehr“ = genau drei
  Zeilen: Ab wann (Standard Heute), Wiederholen (Nie · Täglich · Wöchentlich ·
  Monatlich), An jemanden geben (nur mit Haushalt) + „Speichern“ (schließt).
  „Freitag …“ im Feld → „Ab Freitag“ (korrigierbar über „Ab wann“), eine
  genannte Uhrzeit wird zur Erinnerung, „Tohuus“/„Kita“/„Zahnarzt“
  stellt den Chip. Eine eingefügte Liste öffnet „Liste einfügen“.
- Neuer Termin: EIN Feld („Zahnarzt Freitag 13 Uhr“). Tag, Uhrzeit, Dauer
  werden gelesen (`terminLesen`, Dauer „1 Std“, „90 Minuten“ zuerst, damit sie
  keine Uhrzeit wird) und stehen als blaue Chips darunter (antippen = ändern:
  Tage, Uhrzeiten, Dauer 30 Min … 3 Std). Ohne Uhrzeit ist der Chip
  „Uhrzeit?“ hervorgehoben, Speichern erst danach (oder ganztägig). Gleiche
  Zeile Raum | Glocke (Erinnern vorher: 15/30 Min, 1 Std, Vorabend; Standard
  aus den Mitteilungen) | „Mehr ›“ (Ort, Wiederholen, Ganztägig, Personen).
  Mehrere Termine in einem Satz werden mehrere Einträge; „9:00 ist heute
  schon vorbei.“ (nie still in der Vergangenheit speichern). Ohne genannten
  Tag gilt der vorgewählte (Kalender, Tag-Seite) bzw. heute.
- Termine und Aufgaben haben dieselben Chips (`EintragZeile`, `RaumChips`).
  Raum nachträglich ändern: Chip im Detail-Fenster, lange drücken auf die
  Zeile oder Bearbeiten.
- Kalender: kein langes Drücken auf einen Tag, keine Zeile „Termin am …“;
  die Vorschlags-Chips „Schnell eintragen“ bleiben.
- Termine haben kein „Erledigt“ (ein Termin ist einfach vorbei); Aufgaben
  schon. Ohne Angabe gehört alles zur Familie.
- Parser für Tag und Uhrzeit: `src/lib/kalender/sentence.ts` bzw. `parse.ts`
  (Zeiten „12:30“, „12.30“, „12 Uhr 30“, „um 4“ (→ 16:00), „halb eins“,
  „viertel nach/vor“; Tage „28.10.“, „am 29.“, heute/morgen/übermorgen,
  Wochentage, „nächsten Mittwoch“, „in 3 Tagen“; Selbstkorrektur).

### Räume Familie · Ich · Arbeit (A-034, Nachtrag zu A-020)
- Drei Räume, für Termine und Aufgaben gleich: Familie (Orange, zu zweit
  „Wir“, allein „Privat“) = alle im Haushalt, Ich (Grau, Schloss) = nur ich,
  Arbeit (Blau, Schild) = nur ich, nach Feierabend ausgeblendet. Allein
  entfällt „Ich“: eine Ich-Aufgabe zeigt sich als „Privat“ und bleibt
  gespeichert „ich“ (`sichtRaum`, `raumZumSpeichern`), damit sie auch später
  mit Partner nur für einen bleibt. „Geschäftlich“ (A-021) heißt wieder „Arbeit“.
- EINE Raum-Wahl `ui/RaumChips` (Reihenfolge Familie · Ich · Arbeit, Farben
  Orange · Grau · Blau): Schnelleingabe (＋), Detail-Fenster (Menü beim
  Antippen), Bearbeiten, Wochencheck-Karte und unter Mias Bestätigung als
  kleiner Chip „Familie ⌄“ (`RaumBestaetigung`, `ChatTurnView.raum`,
  `eingetragenMitRaum`; auch ohne KI über `calendarChat` → `neu`). Lange
  drücken auf eine Zeile → „Für Familie / Nur ich / Arbeit“ (`ItemMenu` mit
  `start="raum"`). Ändern immer über `raumAendern` (Meldung mit Rückgängig,
  Mia lernt, nur eigene Einträge).
- Vorauswahl (`raumRaten`): ausdrücklich gesagt („geschäftlich“, „nur für
  mich“/„privat“, „für alle“/„Familie“) › gelernt › Inhalt (Meeting, Kunde,
  Lieferant, Büro, Tohuus, KARAMBA Eis, Personal … → Arbeit; Schule, Kinder,
  Kita, Oma, Geburtstag, Elternabend … → Familie; Arzt, Zahnarzt, Friseur,
  Physio, Therapie … → Ich; Familie geht vor Ich: „mit den Kindern zum Arzt“)
  › Arbeits-Stichworte früherer Arbeits-Einträge (`arbeitsWorte`: Laden,
  Café …) › Standard: Termine Familie, Aufgaben Ich. Personen aus dem
  Haushalt machen nichts zu Familie („Geschenk für Lisa“). Arbeit und
  Familie zugleich ohne Hinweis ist unklar (`raumUnklar`): der Sofort-Weg
  überlässt es der KI, die kurz fragt.
- Beim allerersten Vorwählen steht einmal darunter „Hab Familie gewählt.
  Tippen zum Ändern.“ (bei Ich „Nur für dich. Tippen zum Ändern.“, A-056), danach nie wieder
  (`raumHinweisOffen`).
- Mia lernt: Korrigiert man den Raum (Chips, Detail, lange drücken, Satz
  „Mach den Zahnarzt nur für mich“), merkt sie sich ein Stichwort des Titels
  (`stichwort`: letztes großgeschriebenes Wort, z. B. „Peter“, „Zahnarzt“) →
  Raum und wählt beim nächsten Mal richtig. Lokal (`wasgibts.raumgedaechtnis`),
  geht als „Gelernte Räume“ in Mias Kontext (`AssistantData.raumWorte`), löschbar
  unter Einstellungen → Mia → „Was ich mir gemerkt hab“ (Gruppe „Wer was sieht“).
- Ohne KI: `raumBefehl` in `parseCalendar` (Art `raum`): „Mach den Zahnarzt
  nur für mich“, „Stell X auf Arbeit“, „Der X ist privat“, „Das gehört zur
  Familie“ (= zuletzt eingetragen). Nicht gefunden = keine Regel.
- Mia: Werkzeuge `raum: familie|ich|arbeit` („privat“ = ich, ohne Angabe rät
  die App); Ändern über `termin_aendern`/`aufgabe_aendern` mit `raum`.
- Sichtbarkeit: Ich und Arbeit anderer kommen nie an – RLS (Migration
  `raeume_ich`), Test-Backend, Push (`versand.ts`), Neuigkeiten, Heute,
  Kalender und Mias Kontext arbeiten nur mit dem, was ankommt.
- Tests: `tests/kalender/raeume.test.ts`, `neueAufgabeTermin.test.ts`,
  `einFenster.test.ts`, Prüfstand (35 Raum-Sätze, `pruefstand/raeume.ts`),
  Sofort-Prüfstand; `tests/datenbank/sicherheit.test.sql`; Durchklick
  `raumChipsPlus`, `raumAendern`, `raumSprache`, `raumMigration`,
  `raeumeZweiKonten` (`e2e/ablaeufe/raumwahl.mjs`), `schnelleingabe`.

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

### Kalender mitbringen (seit v0.86)

- Oben im Kalender eine ruhige Karte „Termine schon woanders? Hol sie rein.“
  – Apple · Google · Outlook · Später (`kalender/mitbringen/KalenderMitbringen.tsx`,
  Logik `lib/kalender/mitbringen/angebot.ts`). Groß bei leerem Kalender, klein,
  wenn schon eigene Termine da sind; weg, sobald ein Kalender verbunden ist.
  „Später“: nach 14 Tagen noch EINMAL, danach nie wieder
  (`wasgibts.kalenderangebot`, pro Gerät). Immer erreichbar unter
  Einstellungen → Kalender und per Mia („Hol meinen Google-Kalender rein“ →
  `/profil/kalender` mit den Schritten für Google, `openMitbringen`).
- Geführte Schritte je Anbieter (ein Schritt pro Bildschirm, Weiter/Zurück am
  Ende): Apple (Öffentlicher Kalender → Link teilen → Kopieren), Google
  (ehrlich: nur am Computer; „Anleitung per Mail an mich schicken“), Outlook
  (Kalender veröffentlichen → ICS-Link). Zum Schluss „Link aus der
  Zwischenablage holen“ (`kalenderLink`: webcal, .ics, iCal, Google, Outlook,
  iCloud) → „Diesen Link verwenden?“ oder einfügen → Verbinden. Daneben
  „Lieber eine .ics-Datei einlesen“. Bei Apple: „Der Link ist geheim …“.
- Erfolg: Mia freut sich, „Steht drin. 23 Termine in den nächsten 4 Wochen.“,
  „Was du hier einträgst, bleibt erst mal nur hier.“, „Noch einen
  hinzufügen“. Je verbundenem Kalender „zuletzt aktualisiert 10:12“.

### Kalender verbinden – auf jedem Gerät (Tafel 23, seit v0.87)

- Nicht das Gerät entscheidet, sondern wo die Termine liegen. Die Schritte in
  „Kalender mitbringen“ passen zu Dienst UND Gerät
  (`lib/kalender/mitbringen/anleitung.ts`: `schritte(anbieter, geraet)`,
  Gerät aus dem Browser, umschaltbar „Ich bin am iPhone · Android ·
  Computer“). Apple: iPhone (ⓘ → Öffentlicher Kalender), Mac, sonst
  icloud.com. Google: nur calendar.google.com („Einstellungen und Freigabe“ →
  „Geheime Adresse im iCal-Format“), am Handy mit Knopf
  „calendar.google.com öffnen“ und Hinweis „Desktop-Website anfordern“, dazu
  „Anleitung per Mail an mich schicken“. Outlook: „Kalender veröffentlichen“.
- „Weiß nicht, wo meine Termine liegen?“ – kurze Hilfe je Gerät.
- Falsch eingefügt (`linkFehler`): normaler Google-Link, öffentliche statt
  geheime Adresse, iCloud-/Outlook-Seite statt Link, Todoist-App-Link →
  freundlicher Satz und zurück zum passenden Schritt.
- Todoist als AUFGABEN (vierter Weg, klein unter der Karte „Aufgaben aus
  Todoist holen“ und per Mia „Hol meine Todoist-Aufgaben“): die
  „Kalender-Abonnement-URL“ verbinden; die Einträge werden schreibgeschützte
  Aufgaben (Etikett „Todoist“, Tag bzw. Tag + Uhrzeit, `feedEntries` +
  `isTodoistUrl`). Sie stehen in der Aufgaben-Seite und auf Heute; Abhaken
  sagt freundlich „In Todoist abhaken …“ (`readOnlyDone`), antippen zeigt
  „In Todoist öffnen“ und „Zu meinen Aufgaben kopieren“.
- Parser: VTODO (DUE statt DTSTART, erledigte/abgesagte bleiben draußen) und
  RDATE (zusätzliche Tage). Derselbe Termin aus zwei Kalendern (gleiche UID)
  erscheint nur einmal (`withoutDoubles`).
- Noch nicht: „Mit Google verbinden“ per OAuth (Calendar API, nur Leserecht)
  – kommt mit dem Google-Knopf (🔑, siehe Konten); ETag/Last-Modified beim
  Abruf.

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
  (`contextLines`, Aufgaben ohne Tag stehen heute, Geplantes jenseits der 7
  Tage extra); abends (`abendsNachUhr` in `engine.ts`) eine Zeile „Still mit
  auf morgen gewandert“, `tag_anzeigen` für morgen nennt sie kurz mit
  (`showAnswer` mit `abends`, ohne KI ebenso über `calendarChat`).
- Alles ist heute: `aufgabe_anlegen` legt ohne genannten Tag für heute an
  (`tag` nur bei ausdrücklichem Tag, sonst `ctx.today`); `woche_eintragen`
  ebenso. „Was steht heute an?“ nennt die Termine und kurz Zahl und die ersten
  drei Aufgaben (`aufgabenSatz`/`aufgabenKurz`); nach Feierabend
  (`feierabendNachUhr`, `ctx.feierabend`; ohne KI `arbeitRuht`) ohne Arbeit.
  „Was ist noch bei der Arbeit?“ → `aufgaben_anzeigen` mit `raum: "arbeit"`
  (ohne KI `parseNoteCommand` → `tasks` mit `raum`). Prüfstand: „Irgendwann
  mal den Keller aufräumen“/„Diese Woche noch Reifen wechseln“/„Aufgabe:
  Fahrrad zur Werkstatt bringen“ = heute, „Freitag KFZ-Steuer überweisen“ =
  ab Freitag, „Was ist noch bei der Arbeit?“ = Antwort.
- Ohne KI: `calendarChat` (aufgerufen in
  `src/components/begleitung/useChatRules.ts`) trägt sofort ein und meldet
  „Eingetragen ✓ …“ mit Rückgängig. `parseCalendar` erkennt Tag, Uhrzeit,
  Frist, „nächste Woche“ (ab Montag), Wiederholung, Erinnerung, Raum, Etikett und
  „Dringend: …“. Termin nur mit fester Uhrzeit und ohne Frist, sonst Aufgabe.
- Befehle: „Verschieb … auf Donnerstag“, „Lösch …“ / „… fällt aus“, „… ist
  erledigt“, „Was steht diese Woche an?“, „Hab ich morgen Nachmittag Zeit?“.
  Sätze über Essen, Einkauf oder Urlaub lässt `parseCalendar` liegen.

### Wochencheck – einfach drauflos reden (Tafel 36, seit v0.59)

- Einstiege: „Wochencheck“, „Lass uns die Woche durchgehen“, „Ich lese dir den
  Kalender vor“ (KI schickt `app_befehl`, ohne KI die Regel in
  `useChatRules`; beides öffnet sofort, `runInstantOps`) und die Jetzt-Karte
  „Kurzer Wochencheck? Sag einfach alles, ich sortiere.“ – montags und
  sonntags ab 17 Uhr (`weekCheckKey`), nicht nachts, nicht in Feierabend-Ruhe,
  Pause oder Beispiel-Tag. Antippen oder ✕ = diese Woche nicht mehr
  (`weekCheckDone`, Feld `weekOff` in `wasgibts.jetzt`, optional).
- Fenster `components/kalender/WochencheckSheet.tsx`: oben „Abbrechen“ +
  Titel, langes Zuhören (`useSpeechInput({ long: true })`, Neustart nach
  Pausen, Schluss mit „Fertig“, „fertig“/„das war’s“ oder nach 5 Minuten),
  Text mit orange markierten Kernwörtern und grauen Füllwörtern, tippen
  geht immer, „Ich hab schon“ (grobe lokale Erkennung), Mikro gesperrt →
  Hilfe (Tafel 27).
- „Fertig“: mit KI eine Nachricht „[Wochencheck] …“ (großes Modell,
  maxTokens 16000, zählt als eine Nachricht) → Werkzeug `woche_eintragen`
  (alle Punkte in einem Rutsch); ohne KI `parseWeekTalk`
  (`src/lib/kalender/wochencheck.ts`: Füllwörter, Korrekturen „nee,
  Mittwoch“, Nachträge, Wochentage ab heute, „nächste Woche Dienstag“,
  „halb acht“ abends, Raum Familie · Ich · Arbeit (`raumRaten`), Personen „Mathis: Spiel“,
  Dauer Termin 60 / Elternabend 120 Minuten, Aufgaben ohne Tag = heute,
  „bis Freitag“ = Frist, ohne Uhrzeit Frage mit Knöpfen, schon Eingetragenes
  grau „schon drin“). Ohne KI keine Sport-Vorschläge.
- „Deine Woche“ (`WeekPreview.tsx`): Legende, eine Zeile je Punkt, Fragen als
  Chips („weiß noch nicht“ = ganztägig), Zeile antippen = Karte (Tag,
  Uhrzeit, Dauer, Raum-Chips, Weglassen), Haken zum
  Abwählen, „Nochmal“ / „Alles übernehmen“ → „N Sachen eingetragen ✓“, ein
  Rückgängig für alles, danach der Kalender. „Privat“ von früher ist „Ich“
  (A-034).

## Tests

- `tests/kalender/kalenderAbo.test.ts`: Server-Schutz (private IPs, DNS, Weiterleitungen, zu groß, Zeitüberschreitung, kein Kalender), Abo-Termine, Kopie, Fälligkeit, Schreibschutz, Sicherung nur auf Wunsch; Durchklick `kalenderAbo` (verbinden, im Kalender, kopieren, Änderung kommt an).
- `tests/kalender/listeEinfuegen.test.ts`: Zeilen bereinigen (alle Kästchen-/Aufzählungsformen), Abgehaktes, Fristen, Überschriften → Listen, Doppelte, Gespräch, Ordnung (geparkt in Listen, sonst die eine Liste), Vorschlag „Drei für heute?“; Durchklick `listeEinfuegen` (30 Zeilen).
- `tests/kalender/mitbringen.test.ts`: Angebot einmal/nach 14 Tagen/nie wieder, Link aus der Zwischenablage, Anbieter aus dem Satz, Erfolgs-Satz, „zuletzt aktualisiert“, Schritte je Dienst und Gerät, falsche Links; Durchklick `kalenderMitbringen`, `todoistAufgaben`.
- `tests/kalender/kalenderAbo.test.ts` zusätzlich: Todoist-Feed → Aufgaben, VTODO, RDATE, doppelte UID.
- `tests/kalender/kalenderImport.test.ts`: Dateien im Google- und Apple-Stil (Serie mit Ausnahme, verschobener Einzeltermin, ganztägig, mehrtägig, Sommerzeit, andere Zeitzone, Erinnerungen, Umlaute/Emojis, doppelt einlesen); Durchklick `kalenderImport`.

- `tests/kalender/`: `termineAufgaben.test.ts`, `wiederholungen.test.ts`,
  `spracheKalender.test.ts`, `kalenderChat.test.ts`, `mitwandern.test.ts`.
- `tests/kalender/allesHeute.test.ts` (Tafel 103/104): ohne Tag = heute, mit
  Tag = ab dem Tag + „Geplant“, Migration v2 → v3 (Speicher, Abgleich, alte
  Sicherung), keine Etiketten pro Zeile, Reihenfolge dringend → neu →
  Erstellungszeit, Filter nur mit Arbeitsaufgaben und gemerkt, Feierabend
  („Arbeit · n für morgen“), Startseiten-Kachel, 2-zeilige Namen. Durchklick
  `listeEinfuegen` (eine Liste, „Geplant · 2“, Filter gemerkt, Arbeit-Schild).
- `tests/kalender/erledigt12.test.ts` (A-043): abgehakt vor 11 h sichtbar,
  vor 13 h weg, über Mitternacht, neueste oben, wieder öffnen, jeder Raum
  gleich, Serien nur die Runde, Laden/Prüfen, Migration (idempotent), alte
  Sicherung v0.144, Abgleich zwischen zwei Geräten (Lösch-Markierung, beide
  räumen gleichzeitig auf, wieder geöffnet), „Erledigt ⌄“ zugeklappt, Mia
  (Kontext, Prüfstand-Satz). Durchklick `erledigtZwoelf`
  (`e2e/ablaeufe/erledigt.mjs`) und `erledigtAbgleich` (zwei Geräte,
  `e2e/ablaeufe/konten.mjs`).
- `tests/core/sortierung.test.ts` („Termine und Aufgaben“),
  `tests/begleitung/werkzeugeKalender.test.ts`.
- Durchklick `e2e/ablaeufe/alltag.mjs`: `eintragen`, `kalender`.
- `tests/kalender/nurTermine.test.ts`: Punkte je Person (max. 3, Arbeit,
  ich), Aufgaben nie im Kalender, „in 7 Tagen“, Schnell-Chips (≥ 3×, nie bei
  Serien), Satz → 16:00 am gewählten Tag (anderes Datum gewinnt), ＋/Zeile/
  lange drücken mit Tag, kein Essen, Mias eigene Fragen ohne KI, „⌂ Heute“.
  Durchklick `kalenderTag` (`e2e/ablaeufe/kalendertag.mjs`).
- `tests/kalender/einSatz.test.ts`: alle Formen von `readSentence`,
  Titelbereinigung, Vorschläge, „schon vorbei“. Durchklick `terminSatz`
  (`e2e/ablaeufe/termin.mjs`): „Mittwoch 12.30 …“, „28.10. …“ ganztägig,
  „Hallo“, schon vorbei, Hand schlägt Automatik, SE mit Tastatur (380 px)
  ohne Scrollen. Bilder: `termin-satz`, `termin-frei`, `termin-vorbei`.
