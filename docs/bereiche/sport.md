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
  Wochen), `hidden` (abgehakte Sport-Termine, die nicht zählen sollen).
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
- Kreise Mo–So (`SportWeekRow`): grün gefüllt = trainiert, grüner Rand =
  geplant, heute oranger Ring.
- EIN Satz (`statusLine`, ohne Zahlen): „Wochenziel geschafft – schön.“,
  „Mehr als geplant – richtig schöne Woche.“, „Ein Training noch, dann ist die
  Woche rund.“, montags „Neue Woche, neues Glück.“ bzw. „Letzte Woche lief
  richtig gut – auf ein Neues.“, sonst „Die Woche ist bereit für dich.“

Kachel `sport` (Größen S/M/L, Standard M, Pastell-Grün, standardmäßig aus):
- S: nur die Kreise. M und L (gleicher Inhalt): dazu der Satz und „Nächstes
  Training“ (Tag, Uhrzeit, Titel, Wetter zur Trainingszeit, „Mitnehmen: …“).
- „+“ = `SportAddSheet` (Was? · Wie lange? 20/30/45/60/90 oder eigene · Wann?
  · optional km). Kachel-Label → `/sport`. Jeder Kreis → `SportDaySheet`.

Tag-Fenster (`SportDaySheet`), vier Arten:
- leer, heute/vergangen: „Wie letztes Mal: Laufen · 45 Min“ oder Sportart +
  Dauer wählen.
- trainiert: „Ändern“, „Löschen“ (Gelöscht · Rückgängig), „+ Noch ein
  Training an diesem Tag“.
- geplant: Uhrzeit, Erinnerung, Wetter, „Erledigt“, „Verschieben …“,
  „Absagen“.
- Zukunft: „Training planen“ mit Zeiten aus `freeStarts` → Termin mit Etikett
  Sport und Erinnerung 30 Min vorher.

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
- Kein eigener Ablauf in `e2e/ablaeufe/`.
