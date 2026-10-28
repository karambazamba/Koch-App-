# Sport

Kurz: Persönliche Trainings und ein Wochenziel – ohne Druck. Die Woche Mo–So
als Kreise, ein freundlicher Satz, Packlisten, und die Begleitung (Standard
Mia) plant Trainings in freie Kalender-Lücken.

## Wo im Code

- Logik (rein): `src/lib/sport/model.ts` (`SPORTS`, `trainingsBetween`,
  `weekStatus`, `weekStreak`, `weekDots`, `statusLine`, `celebrationText`,
  `praiseFor`, `monthStats`, `nextTraining`, `todaysTraining`,
  `parseSportCommand`, `guessMinutes`, `freeStarts`, `plannedOn`,
  `lastTraining`, `planTrainings`).
- Speicher: `src/lib/sport/store.ts` (`loadSport`, `saveSport`,
  `changeSport`, `useSport`); `src/lib/sport/index.ts` bündelt beides.
- Aktionen: `src/lib/sport/actions.ts` (`addTraining`, `updateTraining`,
  `removeTraining`, `setSportGoal`, `setPack`).
- Oberfläche: `src/components/sport/SportTile.tsx`, `SportView.tsx`
  (`/sport`), `SportWeekRow.tsx`, `SportDaySheet.tsx`, `SportAddSheet.tsx`,
  `SportCelebration.tsx` (im Layout); Feier-Zustand `src/lib/core/celebrate.ts`.
- Begleitung: `src/lib/begleitung/dayTools.ts` (Werkzeuge),
  `src/lib/begleitung/dayChat.ts` (Regeln ohne KI).
- Tagesphase „Sport“: `src/lib/heute/phases.ts`; Jetzt-Karte Thema `sport`
  in `src/lib/heute/jetztTopics.ts`.

## Daten und Speicher

| Schlüssel | Version | Inhalt | Sicherung |
|---|---|---|---|
| `wasgibts.sport` | v1 | `SportState` | ja |

- `SportState`: `goal` (1–7, Standard 3), `trainings`, `packs` (eigene
  Packlisten je Sportart, bis 12 Sachen), `celebrated` (Montage gefeierter
  Wochen), `hidden` (abgehakte Sport-Termine, die nicht zählen sollen),
  `custom` (eigene Sportarten aus „Andere“, bis 12; fehlt in alten
  Speicherständen und Sicherungen → leer, Version bleibt v1).
- Training = Eintrag `typ: "training"` im einheitlichen Modell mit `sport`,
  `minutes` (1–600), optional `km`, `date`, `time`, `note`, `terminKey`.
- Sportarten: laufen, fitness, rad, schwimmen, yoga, fussball, spazieren –
  oder ein eigener Name.
- Persönlich: Sport-Termine zählen nur ohne „wer“ oder mit mir
  (`persons[0]`).

## So verhält es sich

Trainings und Woche:
- Woche ab Montag. `trainingsBetween` = selbst eingetragene Trainings plus
  abgehakte Termine mit Etikett „Sport“ (Dauer aus dem Termin, ohne Ende 60
  Min; Sportart aus dem Titel über `guessSport`).
- Ein abgeleitetes Training ändern legt ein eigenes mit `terminKey` an.
  Löschen setzt den Termin auf `hidden` – der Termin bleibt.
- Serie nur in Wochen (`weekStreak`), nie in Tagen. Angezeigt wird sie nur
  in Antworten der Begleitung.

Ohne Zähler in der Oberfläche:
- Kreise Mo–So (`SportWeekRow`, 34 px, Tafel 25): grün gefüllt mit Haken =
  trainiert, gestrichelter grüner Ring mit Sport-Icon = geplant
  (`DayDot.sport`; eigene Sportart = ihr Name), heute frei = oranger Ring mit
  „+“, sonst weiß halbtransparent. Uhrzeit vollständig unter dem Kreis
  („18:00“, 10 px grün) – nie nur die Stunde im Kreis (früher „18“).
- Sportarten zeigen Linien-Icons (`SportIcon`: Footprints, Dumbbell, Bike,
  WavesLadder, Flower2, Volleyball, Trees; sonst Activity), nie Emojis in
  Chips oder Knöpfen. `emoji` bleibt im Modell nur für Chat-Texte.
- EIN Satz (`statusLine`, ohne Zahlen): „Wochenziel geschafft – schön.“,
  „Mehr als geplant – richtig schöne Woche.“, „Ein Training noch, dann ist die
  Woche rund.“, montags „Neue Woche, neues Glück.“ bzw. „Letzte Woche lief
  richtig gut – auf ein Neues.“, sonst „Die Woche ist bereit für dich.“

Kachel `sport` (Größen XS/S im festen Raster, Tafel 118, Standard XS,
Pastell-Grün; Standard nur bei „allein“, Tafel 119):
- XS: EINE Zeile („Heute 18:00 · Yoga“, ohne Plan „Diese Woche frei“). S: „Als
  Nächstes“ (Icon, „Fr 17:00“, Titel; antippen = Tag-Fenster des Trainings).
  Ohne geplantes Training: „Diese Woche noch nichts geplant – einfach Plus
  tippen.“ Die Woche als Kreise und der Wochensatz stehen auf `/sport`.
  Beispiel-Tag: „2 von 3 diese Woche“ (bis zum ersten eigenen Training).
- „+“ = „Training planen“ (`SportPlanForm` mit Tag-Chips für 7 Tage, Start
  = erster freier Tag) und darunter „Schon trainiert? Eintragen“ →
  `SportAddSheet`. Kachel-Label → `/sport`. Jeder Kreis → `SportDaySheet`.

Tag-Fenster (`SportDaySheet`), vier Arten:
- leer, heute/vergangen: „Wie letztes Mal: Laufen · 45 Min“ oder Sportart +
  Dauer wählen.
- trainiert: „Ändern“, „Löschen“ (Gelöscht · Rückgängig), „+ Noch ein
  Training an diesem Tag“.
- geplant: Uhrzeit, Erinnerung, Wetter, „Erledigt“, „Ändern“ (gleiches
  Formular; bei Serien „Nur diesmal“ = Ausnahme + Einzeltermin bzw. „Jede
  Woche“ = Serie ändert sich, `changePlanned`), „Absagen“ (Gelöscht ·
  Rückgängig; bei Serien nur dieser Tag).
- Zukunft: „Training planen“ (`SportPlanForm`, Logik `src/lib/sport/plan.ts`):
  Sportart-Chips mit Icons + „Andere“ (Textfeld, gemerkt in `custom`, danach
  eigener Chip); Wann? = bis zu 3 freie Vorschläge (`freeStarts`, heute nur
  spätere) + „Andere“ (natives Zeit-Rad, 5-Minuten-Schritte); darunter live
  „Frei – nichts im Kalender“ oder „Überschneidet sich mit Zahnarzt 18:00“
  (`clashWith`, trotzdem erlaubt). Vorauswahl: zuletzt genutzte Zeit dieser
  Sportart (`lastTimeFor`), sonst erster Vorschlag. Wie lange? 30/45/60/90 +
  „Andere“. „Jede Woche“ = wöchentliche Serie. Knopf „Planen · Sa 18:30“ →
  Termin mit Etikett Sport (`plannedEntry`), Ende über `endOf` (nie über
  Mitternacht), Erinnerung 30 Min vorher.

Seite `/sport` (`SportView`): Woche mit Satz, „Zuletzt“ (60 Tage, antippen =
ändern/löschen, mit `PersonAvatar`), „Packlisten“, „Wie oft pro Woche?“
(Wochenziel). Plus oben = eintragen.

`planTrainings`:
- Tage der gewählten Woche nach heute, möglichst verteilt (nicht zwei Tage
  hintereinander im ersten Durchgang).
- Kandidaten je Tageszeit (morgens / mittags / abends / egal). Keine
  Überschneidung mit Terminen (15 Min Luft), 60 Min Abstand zu Arbeit.
- Draußen-Sport bei Regen: andere trockene Zeit am Tag, sonst Fitnessstudio
  („Regen angesagt – lieber drinnen“). Höchstens 3 kurze Erklärungen.

Feier (`SportCelebration` im Layout): genau EINMAL je Woche, wenn ein neues
Training die Zahl genau auf das Ziel bringt. Pokal-Karte „Stark, <Name>! Dein
Wochenziel ist geschafft.“, 2 Sekunden, Antippen schließt, Avatar „freuen“.
Beim Öffnen der App wird nicht nachgefeiert.

Phase „Sport“: 60 Min vor einem heutigen Sport-Termin bis zu seinem Ende, nur
mit sichtbarer Sport-Kachel; ändert nur Inhalte. Jetzt-Karte: heute geplantes
Training (sanft).

## Begleitung (Mia)

- Mit KI (Vorschau + „Übernehmen“): `sport_eintragen` (Op `add_training`,
  Dauer geschätzt über `guessMinutes`), `sport_ziel_setzen`
  (`set_sport_goal`), `trainings_planen` (Termine über `upsert_entry`,
  Etikett Sport, Erinnerung 30), `sport_statistik` (nur lesen).
- Kontext: „Sport: Wochenziel 3×, diese Woche 2“.
- Ohne KI sofort (`dayChat` + `parseSportCommand`, mit „Mach das
  rückgängig“): „War heute 5 km laufen“, „Ich will 4× pro Woche Sport
  machen“, „Wie oft war ich diese Woche beim Sport?“, „Plan mir 3 Trainings
  nächste Woche, am liebsten morgens“. Sätze über andere Personen zählen
  nicht.
- Nutzt sie Sport, wird die Sport-Kachel eingeblendet und sie sagt es.

## Tests

- `tests/sport/sportModell.test.ts` – Training anlegen, Sport-Termine zählen
  mit, Woche/Monat/Sätze ohne Druck, nächstes Training, Sätze ohne KI.
- `tests/sport/sportSpeicher.test.ts` – Speicher und Aktionen.
- `tests/sport/tage.test.ts` – Tag-Fenster.
- `tests/sport/trainingsPlanen.test.ts` – `planTrainings`, `freeStarts`.
- `tests/sport/wochen.test.ts` – Wochen zählen.
- `tests/sport/sportPlanen.test.ts` – eigene Zeit, „Jede Woche“, Kreis-
  Zustände, Überschneidung, zuletzt genutzte Zeit, „Als Nächstes“, Ändern
  (einzeln/Serie), eigene Sportarten, „Samstag 18:30 laufen gehen“.
- Durchklick `sportKachel` (`e2e/ablaeufe/vorfuehren.mjs`): Do antippen →
  eigene Zeit 18:30 → „Planen · Do 18:30“ → Kachel zeigt „18:30“ und „Als
  Nächstes“; ändern auf 19:00/60 Min; absagen + Rückgängig.
