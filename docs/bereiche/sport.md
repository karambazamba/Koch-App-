# Sport

Kurz: Persönliche Trainings als Stempelkarte der Woche (A-044, Tafel 132) –
ohne Druck. Diese Woche, das Nächste, ein Knopf; alles andere im „•••“. Die
Begleitung (Mia) stempelt, sagt, wie die Woche läuft, und plant Trainings in
freie Kalender-Lücken.

## Wo im Code

- Logik (rein): `src/lib/sport/model.ts` (`SPORTS`, `trainingsBetween`,
  `weekStatus`, `weekStreak`, `celebrationText`, `monthStats`,
  `nextTraining`, `todaysTraining`, `parseSportCommand`, `guessMinutes`,
  `freeStarts`, `plannedOn`, `lastTraining`, `planTrainings`, `validGoal`).
- Stempelkarte (rein): `src/lib/sport/stempel.ts` (`stempelkarte`,
  `stempelDrehung`, `letzteWochen`, `wochenLabel`, `gestempeltText`,
  `sportLage`, `zielFrageFaellig`, `ZIEL_FRAGE`).
- Erinnerung am Vorabend (rein): `src/lib/sport/erinnerung.ts`
  (`sportVorabend`, `SPORT_VORABEND_MINUTE`, `proaktivHeute`); läuft in
  `components/heute/mitteilungen/NotifyHost.tsx`.
- Speicher: `src/lib/sport/store.ts` (`migrateSport`, `loadSport`,
  `saveSport`, `changeSport`, `useSport`); `src/lib/sport/index.ts` bündelt
  Modell, Speicher und Planen.
- Aktionen: `src/lib/sport/actions.ts` (`addTraining`, `updateTraining`,
  `removeTraining`, `setSportGoal` (auch `null` = ohne Ziel),
  `markZielGefragt`, `setSportErinnerung`, `setPack`, `rememberSport`,
  `forgetSport`).
- Oberfläche: `src/components/sport/SportTile.tsx`, `SportView.tsx`
  (`/sport`), `Stempel.tsx` (Feld, Stempel, `useNeueStempel`),
  `SportMenu.tsx` („•••“), `SportEintragen.tsx` (Eintragen + Ziel-Frage),
  `SportDaySheet.tsx`, `SportAddSheet.tsx`, `SportPlanForm.tsx`,
  `SportCelebration.tsx` (im Layout); Feier-Zustand `src/lib/core/celebrate.ts`.
- Begleitung: `src/lib/begleitung/dayTools.ts` (Werkzeuge),
  `src/lib/begleitung/dayChat.ts` (Regeln ohne KI).
- Tagesphase „Sport“: `src/lib/heute/phases.ts`; Jetzt-Karte Thema `sport`
  in `src/lib/heute/jetztTopics.ts`.

## Daten und Speicher

| Schlüssel | Version | Inhalt | Sicherung |
|---|---|---|---|
| `wasgibts.sport` | v2 | `SportState` | ja |

- `SportState`: `goal` (1–7 oder `null` = „Ohne Ziel“, Standard ohne Ziel),
  `zielGefragt` (Ziel-Frage schon gestellt), `erinnerung` (am Vorabend,
  Standard aus), `trainings`, `packs` (eigene
  Packlisten je Sportart, bis 12 Sachen), `celebrated` (Montage gefeierter
  Wochen), `hidden` (abgehakte Sport-Termine, die nicht zählen sollen),
  `custom` (eigene Sportarten aus „Andere“, bis 12; fehlt in alten
  Speicherständen und Sicherungen → leer).
- v1 → v2 (A-044, `migrateSport`): Ziel bleibt (fehlt es: früherer Standard
  3), `zielGefragt` = ja (wer v1 hatte, wird nie gefragt), `erinnerung` = aus.
  Alte Sicherungen laufen beim Laden durch dieselbe Migration.
- Training = Eintrag `typ: "training"` im einheitlichen Modell mit `sport`,
  `minutes` (1–600), optional `km`, `date`, `time`, `note`, `terminKey`.
- Sportarten: laufen, fitness, rad, schwimmen, yoga, fussball, spazieren,
  volleyball – oder ein eigener Name.
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

Stempelkarte (A-044, Tafel 132; ersetzt die Kreise Mo–So, den Wochensatz
`statusLine` und das Wasserzeichen):
- Felder = Wochenziel (ohne Ziel 3). Jedes Training dieser Woche (Mo–So,
  `now()`) = Stempel: doppelter Ring im Sport-Akzent (`--tile-ac`, folgt der
  Kachel-Farbe der Sport-Kachel), Linien-Symbol der Sportart, Tag in
  Großbuchstaben („MO“), fest gedreht −10° bis +10° (`stempelDrehung` aus der
  ID). Geplantes (ab jetzt bis Sonntag, schon vorbei = leise weg) =
  gestrichelter Kreis mit „Do 8:00“, frei = gestrichelt leer. Mehr Trainings
  als Felder = kleine Bonus-Stempel daneben.
- Zwei Sätze: groß „Mo war Laufen.“ (heute: „Heute war …“; leer: „Diese
  Woche ist noch frei.“), klein „Do 8:00 ist geplant.“. Ziel erreicht: Karte
  und Stempel grün (`data-geschafft`, Tokens `--app-good-soft`/`-ink`;
  Schlicht: Fläche weiß), „Woche geschafft.“ / „Mehr ist Bonus.“ Ohne Ziel nie
  „geschafft“.
- Neuer Stempel (seit dem Öffnen dazugekommen, `useNeueStempel`) setzt weich
  auf: kurz größer, dann aufsetzen (`.stempel-neu`, 1 s,
  `cubic-bezier(.16,1,.3,1)`, nur transform/opacity); reduced-motion = nur
  Überblenden.
- „Letzte Wochen“: die 3 Wochen davor („20.–26. Okt“, über den Monat „27.
  Okt–2. Nov“), gefüllte Punkte je Training, gestrichelte bis zum Ziel, rechts
  grün „geschafft“. Keine Serien, keine Summen; ohne jedes Training dort fehlt
  der Abschnitt ganz. Antippen = die Trainings der Woche (ändern/löschen).
- Sportarten zeigen Linien-Icons (`SportIcon`: Laufen = Laufschuh
  `SportShoe`, Dumbbell, Bike, WavesLadder, Flower2, Volleyball (auch
  Fußball), Trees; sonst Activity), nie Emojis in Chips oder Knöpfen.
  `emoji` bleibt im Modell nur für Chat-Texte.

Seite `/sport` (`SportView`): Kopf „‹ Heute“, rechts „•••“ (kein Plus),
Titel „Sport“. Karte „Diese Woche“ (weiß, feiner gestrichelter Rand, rechts
„Ziel: 2×“ bzw. „Ohne Ziel“), darunter der große Knopf „Training eintragen“
(Sportart, Dauer, heute/gestern; `SportAddSheet`) und der Link „Planen“
(`SportPlanForm` mit Tag-Chips für 7 Tage), dann „Letzte Wochen“. Ein Stempel
öffnet Ändern/Löschen (Gelöscht · Rückgängig), ein geplantes Feld sein
Tag-Fenster, ein freies „Training eintragen“.

Menü „•••“ (`SportMenu`, ein Fenster): Wochenziel (Auswahl 1×–7× oder „Ohne
Ziel“, Wert rechts „2× ⌄“), Packlisten (Wert: die ersten zwei Sportarten;
antippen = Liste je Sportart), Meine Sportarten (zuletzt genutzte und eigene;
eigene entfernen, neue dazu), Erinnerung am Vorabend (Schalter, Standard
aus).

Ziel-Frage (einmalig, `SportEintragen`/`SportZielFrage`): beim ersten
Training ohne Ziel „Wie oft willst du Sport machen? Pro Woche. Dann sag ich
dir, wenn die Woche geschafft ist.“ mit „2×“, „3×“, „Ohne Ziel“. Wegwischen
zählt als beantwortet; stempelt Mia das erste Training, kommt die Frage beim
nächsten Öffnen von `/sport`.

Erinnerung am Vorabend: an + morgen ein geplantes Training → um 19:00
(5 Min Fenster) „Morgen (Do): Laufen · 8:00“, antippen = `/sport`. Zählt als
proaktiv (`pushAllowed` Art „proaktiv“): höchstens 1 am Tag (Schlüssel
`proaktiv:<tag>:sport-vorabend` in `wasgibts.mitteilungen`), Ruhe 20–7 Uhr
(19:00 liegt davor), Pause = nichts. Hat das Training selbst „Am Vorabend“,
kommt nur jene. Nur auf dem Gerät, solange die App offen ist (Sport liegt
nicht beim Server; Server-Push sieht ihn nicht).

Sport-Kreis oben und Fenster (A-050, Tafel 143/137/2): Auf der Startseite steht
Sport seit A-050 als Kreis (`heute/kreise.ts`, siehe `heute.md`): Laufschuh
bzw. Symbol der nächsten Sportart, Ring außen = Wochenziel (Stücke wie Ziel,
ohne Ziel 3; füllt sich je Training; geschafft grün), nur „Sport“ darunter.
Antippen = Fenster `SportFenster` (`components/sport/SportFenster.tsx`, rein
`lib/sport/wochePlanen.ts`): Kopf „Sport · diese Woche“, Unterzeile „Ziel 2× ·
Mo geschafft, Do geplant“ (`wochenUnterzeile`), die Stempel der Woche
(geplant gestrichelt mit „Do 8:00“), „Woche planen“: Mo–So als Kreise
(geschafft voll mit Symbol, geplant gestrichelt mit Symbol, frei = Plus,
vergangene freie Tage still). Tag tippen → orange → Sportart-Chips (eigene
zuerst, höchstens 4) und Uhrzeiten 8:00 · 10:00 · 18:00 · andere → großer
Knopf „Sa 10:00 Volleyball planen“ legt einen Termin im Raum „Ich“ an
(`plannedEntry(…, "ich")`, Etikett Sport, Erinnerung 30 Min, 60 Min, mit
Rückgängig); der Tag steht danach gestrichelt da. „Schon trainiert?
Eintragen“ (`SportEintragen`), „Alles zu Sport ›“ = `/sport`. Neue Nutzer
haben Sport an. Die XS-Kachel ist bei bestehenden Nutzern zum Kreis geworden
(Startseite v10); S/M bleiben als Kachel wählbar.

Kachel `sport` (Größen XS/S/M im festen Raster, Standard S, Pastell-Flieder;
nicht mehr im Standard, nur wählbar), Plus = „Training eintragen“, die
ganze Kachel = `/sport`, kein Wasserzeichen (die Stempel sind das Bild):
- XS (A-048, Tafel 135): zwei kleine Stempel (30 px, `xsFelder`: bei mehr
  Feldern die letzten zwei Stempel) links, rechts zwei Zeilen (`xsZeilen`):
  „Heute“ / „8:00 · Laufen“ (morgen „Morgen“ / „Do 8:00 · Laufen“, vorgelesen
  „Morgen · Do 8:00 · Laufen“), geschafft „Geschafft.“ / „Diese Woche“, ohne
  Plan „Mo war“ / „Laufen.“, leer „Diese Woche“ / „noch frei.“, Beispiel
  „2 von 3“ / „diese Woche“. Ganz schmal (unter 320 px) ohne Stempel. Kein
  Wasserzeichen. Fehler „8:00 ·Laufen“ (Leerzeichen am Ende eines flex-Kinds
  fiel weg) behoben: Teile mit Abstand (`gap`).
- S: „SPORT“ + Plus, die Felder der Woche nebeneinander (54 px; ab 3 Feldern
  34 px), darunter groß „Do · 8:00“, klein der Titel. Geschafft: Kachel grün,
  „Geschafft.“ / „Diese Woche“. Leer: gestrichelte Felder + „Diese Woche ist
  noch frei.“ Ohne Plan, aber mit Training: der große Satz („Mo war Laufen.“).
- M: Felder links (68 px; ab 4 Feldern 34 px), rechts „ALS NÄCHSTES“, „Do ·
  8:00“, „Laufen · ☀ 9°“ (Wetter zur Trainingszeit).
- Beispiel-Tag: „2 von 3 diese Woche“ (bis zum ersten eigenen Training).
- Die Kachel trägt `data-sport-zustand` (beispiel/leer/normal/geschafft).

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

`planTrainings`:
- Tage der gewählten Woche nach heute, möglichst verteilt (nicht zwei Tage
  hintereinander im ersten Durchgang).
- Kandidaten je Tageszeit (morgens / mittags / abends / egal). Keine
  Überschneidung mit Terminen (15 Min Luft), 60 Min Abstand zu Arbeit.
- Draußen-Sport bei Regen: andere trockene Zeit am Tag, sonst Fitnessstudio
  („Regen angesagt – lieber drinnen“). Höchstens 3 kurze Erklärungen.

Feier (`SportCelebration` im Layout, nur mit Ziel): genau EINMAL je Woche, wenn ein neues
Training die Zahl genau auf das Ziel bringt. Pokal-Karte „Stark, <Name>! Dein
Wochenziel ist geschafft.“, 2 Sekunden, Antippen schließt, Avatar „freuen“.
Beim Öffnen der App wird nicht nachgefeiert.

Phase „Sport“: 60 Min vor einem heutigen Sport-Termin bis zu seinem Ende, nur
mit sichtbarer Sport-Kachel oder Sport-Kreis; ändert nur Inhalte. Jetzt-Karte: heute geplantes
Training (sanft).

## Begleitung (Mia)

- Mit KI (Vorschau + „Übernehmen“): `sport_eintragen` (Op `add_training`,
  Dauer geschätzt über `guessMinutes`; das Werkzeug gibt die Bestätigung vor:
  „Volleyball · heute · gestempelt“, beim Erreichen des Ziels dazu „Woche
  geschafft.“, keine Zahlen), `sport_ziel_setzen` (`set_sport_goal`, setzt
  auch `zielGefragt`), `trainings_planen` (Termine über `upsert_entry`,
  Etikett Sport, Erinnerung 30), `sport_statistik` (nur lesen; erste Zeile
  „Lage diese Woche (so antworten): …“ aus `sportLage`).
- Kontext: „Sport: Wochenziel 2×, diese Woche 1“ bzw. „Sport: ohne
  Wochenziel, …“.
- Ohne KI sofort (`dayChat` + `parseSportCommand`, mit „Mach das
  rückgängig“): „War heute Volleyball“ → Stempel + „Volleyball · heute ·
  gestempelt“ (gestern: „· gestern ·“, sonst Wochentag); „Wie läuft’s mit
  Sport?“ (Art `lage`) und „Wie oft war ich diese Woche beim Sport?“ → „Mo war
  Laufen, Do ist geplant.“ bzw. „Woche geschafft.“ (ohne Zähler); Monat/km
  wie bisher; „Ich will 4× pro Woche Sport machen“, „Plan mir 3 Trainings
  nächste Woche, am liebsten morgens“. Sätze über andere Personen zählen
  nicht.
- Ergebnis-Karten (A-037) gibt es auf diesem Stand noch nicht: die Texte
  liegen als Bausteine in `lib/sport/stempel.ts` (`gestempeltText`,
  `sportLage`), die Karte übernimmt sie später unverändert.
- Prüfstand: „War heute Volleyball“ (`add_training`), „Wie läuft’s mit
  Sport?“ (Antwort ohne Aktion).
- Nutzt sie Sport, kommen Baustein und Sport-Kreis oben dazu (`zeigeSportKreis`,
  „Sport steht jetzt oben als Kreis.“) – keine Kachel mehr (A-050).

## Tests

- `tests/sport/stempel.test.ts` – Stempelkarte (Ziel 2: ein Training = 1
  Stempel + 1 Feld, zwei = geschafft, drittes = Bonus, Montag neue Karte,
  ohne Ziel 3 Felder, Drehung fest), Letzte Wochen, Ziel-Frage, Mias Texte,
  Erinnerung am Vorabend (Standard aus, 19:00, 1 am Tag, Pause), Kachel
  S/M/leer/geschafft/XS ohne Wasserzeichen, Stempel-Animation.
- `tests/sport/sportModell.test.ts` – Training anlegen, Sport-Termine zählen
  mit, Woche/Monat, nächstes Training, Sätze ohne KI.
- `tests/sport/sportSpeicher.test.ts` – Speicher v2, Migration v1 → v2 und
  Aktionen (Ziel, ohne Ziel, Erinnerung, eigene Sportarten).
- `tests/sport/tage.test.ts` – Tag-Fenster.
- `tests/sport/trainingsPlanen.test.ts` – `planTrainings`, `freeStarts`.
- `tests/sport/wochen.test.ts` – Wochen zählen.
- `tests/sport/sportPlanen.test.ts` – eigene Zeit, „Jede Woche“, geplante
  Felder, Überschneidung, zuletzt genutzte Zeit, „Als Nächstes“, Ändern
  (einzeln/Serie), eigene Sportarten, „Samstag 18:30 laufen gehen“.
- `tests/begleitung/tagesChat.test.ts`, `werkzeugeTag.test.ts` – Mia ohne
  und mit KI.
- Durchklick `sportStempel` und `sportPlanen` (`e2e/ablaeufe/sport.mjs`):
  leere Karte → eintragen → Ziel-Frage „2×“ → Stempel → geschafft → Bonus →
  Menü (Erinnerung Standard aus) → löschen + Rückgängig → Kachel (Plus,
  antippen = Seite); Planen 18:30 → gestricheltes Feld → absagen + Rückgängig.
- Bilder (`e2e/bilder.mjs`): `sport-kachel-<leer|normal|geschafft>-<S|M>-<look>`,
  `sport-seite-<normal|geschafft>`, `sport-menue`.
