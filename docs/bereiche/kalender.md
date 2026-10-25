# Kalender

Kurz: Termine (feste Uhrzeit) und Aufgaben (zu erledigen) im einheitlichen
Eintrags-Modell. Dazu der Reiter Kalender (Monat/Woche/Liste), die Tag-Seite
und die Aufgaben-Seite. **Kalender = nur Termine** (Tafel 74, seit v0.73.0):
Aufgaben und Essen stehen nie im Kalender – alles zusammen zeigt „Dein Tag“.

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
- Kalender (rein): `monat.ts` (`termineOn`, `calendarDots`, `dayDistance`,
  `recurringSuggestions`).
- Oberfläche `src/components/kalender/`: `CalendarPage.tsx` (Monat, Woche,
  Liste – Tag antippen überall gleich, `dayHeading`), `DayPanel.tsx` (der
  gewählte Tag), `DayView.tsx` (/tag), `TasksView.tsx` (/aufgaben),
  `EntryForm.tsx` (das EINE Formular, auch „Mehr Details“ der
  Schnelleingabe), `Items.tsx` (Strich-Farbe, Menü), `UrgentMark.tsx`.
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
- Monat: Raster Mo–So, unter jedem Tag höchstens 3 Punkte (5 px,
  `calendarDots`) in der Farbe der Person (`who` am Termin, feste Farbe je
  Person wie bei der Pinnwand; ich = „Meine Farbe im Kalender“), Familie ohne
  Person = Orange, Arbeit = Blau (sieht ohnehin nur der Besitzer). Heute =
  Zahl in Orange mit feinem Ring, gewählter Tag = gefüllter oranger Kreis.
  Mit Tipps aus der Region: Chip „Tipps“ und lila Punkt
  (`components/tipps/CalendarTips`), nie als Termin.
- Tag antippen → darunter der Tag (`DayPanel`, kein neuer Bildschirm): Kopf
  „Freitag, 30. Oktober“ + rechts „heute / morgen / in 7 Tagen“
  (`dayDistance`), Termine als ruhige Zeilen (Uhrzeit Blau, Titel, rechts der
  Kreis der Person; antippen = Menü), dann die Zeile „Termin am Fr, 30. Okt“ /
  „Antippen und eintragen“ (zart Orange, gestrichelt) → Schnelleingabe
  „NEUER TERMIN“ mit diesem Tag. „Schnell eintragen“ nur bei Wiederkehrendem
  (`recurringSuggestions`: ≥ 3× am selben Wochentag in 8 Wochen, gleiche
  Uhrzeit ±30 Min, keine Serie, an dem Tag noch nicht da; höchstens 3 Chips,
  „Eingetragen · Rückgängig“).
- Lange drücken auf einen Tag (0,4 s, Vibrieren) und das ＋ oben = dieselbe
  Schnelleingabe für den Tag. Das Fenster kommt erst beim Loslassen (bzw. bei
  Android über „contextmenu“), sonst schlösse der Klick des Loslassens es.
- Woche: sieben Tageskarten mit ‹ ›. Liste: die nächsten 14 Tage und
  „Weitere Wochen“. Beide nur mit Terminen („frei“ wenn leer), kein Essen.
- Leiste „Kalender · Heute · Essen“ bleibt auf Kalender und Essen oben
  (sticky); beim Runterscrollen schmal, durchsichtig mit Weichzeichner und
  feinem Schatten. „Heute“ trägt dort ein kleines Haus (orange, VoiceOver „Zur
  Startseite“) – antippen = Startseite (Tafel 73).

### Aufgaben sind persönlich – abgeben geht (Tafel 52 B, seit v0.65)

- Logik rein in `lib/kalender/abgeben/model.ts`: `taskRole` (meine ·
  bekommen · abgegeben · fremd), `isMyTask`, `fromLabel` („von Felix“),
  `giveTo` / `giveBack` („Passt gerade nicht“) / `takeBack`, `changeTask`,
  `doneNotes`, `memberByName`, `resolveGiving`. Ohne Konto ist jede Aufgabe
  meine.
- Anzeige: `useCalendarEntries`/`loadCalendarEntries` zeigen nur meine und
  bekommene Aufgaben; die Aufgaben-Seite hat unten eingeklappt „Abgegeben“
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
- Kachel „Aufgaben“ als Checkliste in EINEM hellen Feld: Kreis, voller Titel,
  rechts „heute“/„bis Fr“, „!“ bei dringend, „von Lisa“ klein darunter;
  S 2, M 4, L 6 Zeilen, „+ N weitere“ unten.

### Tag-Seite und Aufgaben-Seite
- `/tag?datum=…`: Titel = Wochentag, darunter „22. Oktober · morgen“
  (`dayHeading`), dann der Tag (`DayPanel`, ohne eigenen Kopf). Plus =
  Schnelleingabe „NEUER TERMIN“ für diesen Tag.
- `/aufgaben`: Filter, Gruppen, „Erledigte anzeigen“ eingeklappt; leer
  „Gerade nichts.“ mit großer Begleitung („Fällt dir was ein? Mit ＋ eintragen oder mir einfach sagen.“).
- Antippen eines Eintrags = Menü: Erledigt · Auf morgen · Erinnerung ändern ·
  Bearbeiten · Löschen; bei Serien „Nur diesen Tag“ / „Alle – die ganze Reihe“.
  Abhaken überall gleich (Kachel, Aufgaben-Seite, Dein Tag): 1,5 s durchgestrichen (`LEAVE_MS`), dann „Erledigt · Rückgängig“;
  Löschen „Gelöscht · Rückgängig“.

### Aufgaben übernehmen – große Listen ohne Chaos (seit v0.86)

- Regel: importiert wird alles, angezeigt wird nur, was jetzt dran ist.
- „Liste einfügen“ (`kalender/liste/ListeEinfuegen.tsx`, Logik
  `lib/kalender/liste/einfuegen.ts`): in der Schnelleingabe jeder Aufgabe
  („＋“ → „Liste einfügen“), automatisch beim Einfügen von mehreren Zeilen
  ins Feld, im leeren Zustand der Aufgaben-Seite und per Mia („Ich hab hier
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
- Ordnung (`lib/kalender/liste/ordnung.ts`): Die Startseiten-Kachel zeigt wie
  bisher nur dringend, heute und diese Woche. Gibt es Listen, zeigt die
  Aufgaben-Seite oben „Jetzt dran“ (heute, von gestern, diese Woche), dann
  Später/Irgendwann ohne Liste und jede Liste eingeklappt mit Anzahl („Haus ·
  14“, nach Name, `TASK_LISTS`). Ohne Listen bleibt die Seite wie gehabt.
- Vorschlag (`lib/kalender/liste/vorschlag.ts`): ab 8 Aufgaben ohne Datum, die
  schon 3 Tage liegen, oben auf der Aufgaben-Seite „Drei für diese Woche?“
  (dringende, dann die ältesten) mit „Übernehmen“ (→ diese Woche, Rückgängig)
  und „Nicht jetzt“; höchstens einmal pro Woche (`wasgibts.aufgabenvorschlag`).
- Todoist verbinden (Teil 3) folgt mit den Verbindungen (🔑).

### Eintragen
- Jedes ＋ öffnet die Schnelleingabe (`docs/bereiche/core.md`); das frühere
  Fenster „Was möchtest du eintragen?“ gibt es nicht mehr.
- Launch 1.0: EIN Weg. ＋ öffnet die Schnelleingabe (ein Satz genügt, ➤
  speichert; Parser `src/lib/kalender/sentence.ts` bzw. `parse.ts`: Zeiten
  „12:30“, „12.30“, „12 Uhr 30“, „um 4“ (→ 16:00), „6 Uhr“ (bleibt 6:00),
  „halb eins“, „viertel nach/vor“; Tage „28.10.“, „28. Oktober“, „am 29.“,
  heute/morgen/übermorgen, Wochentage, „do“, „nächsten Mittwoch“, „Mittwoch
  nächste Woche“, „Donnerstag in einer Woche“, „in 3 Tagen“; mehrere Termine
  in einem Satz; Selbstkorrektur „nicht … sondern …“, „…, nee …“).
- „Mehr Details“ = das EINE Formular (`EntryForm`) für Termine und
  Aufgaben, vorbefüllt aus dem Satz (Titel, Tag, Uhrzeit, Raum, Etikett,
  dringend): oben Titel + ✕, gruppierte Zeilen (Für, Wer ist dabei,
  Etikett, Wiederholen, Erinnerung „Keine Erinnerung“ … „Am Vorabend“), am
  Ende oranges „Speichern“, bei Bestehendem rot „Löschen“. Ohne Uhrzeit =
  ganztägig; Neues heute in der Vergangenheit → „9:00 ist heute schon
  vorbei.“ (nie still speichern). Die früheren Fenster `TerminQuickAdd` /
  `TaskQuickAdd` und das Zeit-Rad sind weg.
- Kalender: kein langes Drücken auf einen Tag, keine Zeile „Termin am …“;
  die Vorschlags-Chips „Schnell eintragen“ bleiben. Tag antippen in Monat,
  Woche und Liste gleich: der Tag steht direkt darunter (`DayPanel`).
- Termine haben kein „Erledigt“ (ein Termin ist einfach vorbei); Aufgaben
  schon.
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
  (`contextLines`).
- Ohne KI: `calendarChat` (aufgerufen in
  `src/components/begleitung/useChatRules.ts`) trägt sofort ein und meldet
  „Eingetragen ✓ …“ mit Rückgängig. `parseCalendar` erkennt Tag, Uhrzeit,
  Frist, „diese Woche“, Wiederholung, Erinnerung, Raum, Etikett und
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
  „halb acht“ abends, Raum Familie/Arbeit/Privat, Personen „Mathis: Spiel“,
  Dauer Termin 60 / Elternabend 120 Minuten, Aufgaben ohne Tag = diese Woche,
  „bis Freitag“ = Frist, ohne Uhrzeit Frage mit Knöpfen, schon Eingetragenes
  grau „schon drin“). Ohne KI keine Sport-Vorschläge.
- „Deine Woche“ (`WeekPreview.tsx`): Legende, eine Zeile je Punkt, Fragen als
  Chips („weiß noch nicht“ = ganztägig), Zeile antippen = Karte (Tag,
  Uhrzeit, Dauer, Familie | Arbeit | Privat, Weglassen), Haken zum
  Abwählen, „Nochmal“ / „Alles übernehmen“ → „N Sachen eingetragen ✓“, ein
  Rückgängig für alles, danach der Kalender. Privat = nur für mich (Raum
  Arbeit) mit Etikett „Privat“.

## Tests

- `tests/kalender/kalenderAbo.test.ts`: Server-Schutz (private IPs, DNS, Weiterleitungen, zu groß, Zeitüberschreitung, kein Kalender), Abo-Termine, Kopie, Fälligkeit, Schreibschutz, Sicherung nur auf Wunsch; Durchklick `kalenderAbo` (verbinden, im Kalender, kopieren, Änderung kommt an).
- `tests/kalender/listeEinfuegen.test.ts`: Zeilen bereinigen (alle Kästchen-/Aufzählungsformen), Abgehaktes, Fristen, Überschriften → Listen, Doppelte, Gespräch, Ordnung (Kachel nur jetzt dran, Listen eingeklappt), Vorschlag; Durchklick `listeEinfuegen` (30 Zeilen).
- `tests/kalender/mitbringen.test.ts`: Angebot einmal/nach 14 Tagen/nie wieder, Link aus der Zwischenablage, Anbieter aus dem Satz, Erfolgs-Satz, „zuletzt aktualisiert“, Schritte je Dienst und Gerät, falsche Links; Durchklick `kalenderMitbringen`, `todoistAufgaben`.
- `tests/kalender/kalenderAbo.test.ts` zusätzlich: Todoist-Feed → Aufgaben, VTODO, RDATE, doppelte UID.
- `tests/kalender/kalenderImport.test.ts`: Dateien im Google- und Apple-Stil (Serie mit Ausnahme, verschobener Einzeltermin, ganztägig, mehrtägig, Sommerzeit, andere Zeitzone, Erinnerungen, Umlaute/Emojis, doppelt einlesen); Durchklick `kalenderImport`.

- `tests/kalender/`: `termineAufgaben.test.ts`, `wiederholungen.test.ts`,
  `spracheKalender.test.ts`, `kalenderChat.test.ts`.
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
