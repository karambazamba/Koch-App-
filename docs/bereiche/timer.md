# Timer

Kurz: Bis zu 5 Timer und eine Stoppuhr, z. B. fürs Kochen. Jeder Timer rechnet
mit seiner Endzeit – nach Hintergrund, Sperre oder Neustart stimmt die Anzeige
sofort.

## Wo im Code

- Logik (rein): `src/lib/timer/model.ts` (`addTimer`, `plusMinute`,
  `pauseTimer`, `resumeTimer`, `removeTimer`, `ackTimers`, Stoppuhr
  `startStopwatch`/`pauseStopwatch`/`resetStopwatch`/`stopwatchMs`,
  `sortTimers`, `shownOnTile`, `formatLeft`, `durationLabel`, `leftWords`,
  `findTimer`, `parseTimerCommand`, `sanitizeTimers`, `pruneTimers`,
  `timerPushPlan`).
- Speicher: `src/lib/timer/store.ts` (`loadTimers`, `changeTimers`,
  `useTimers`).
- Aktionen: `src/lib/timer/actions.ts` (`startTimer`, `stopTimerByName`,
  `stopwatch`).
- Ton: `src/lib/timer/sound.ts` (`unlockTimerSound`, `chime`).
- Oberfläche: `src/components/timer/TimerTile.tsx`,
  `src/components/timer/TimerAlarm.tsx` (im Layout `src/app/layout.tsx`).
- Kochen: Schritt-Timer aus Kochmodus und Rezeptseite (`startStepTimer`,
  Tafel 122; je Schritt nur einer, Leiste `KochTimerLeiste`); Phase
  „Kochen“ nutzt `firstAt`/`lastEnd` (`src/lib/heute/phases.ts`).
- Begleitung: `src/lib/begleitung/dayTools.ts` (Werkzeuge),
  `runInstantOps` in `src/lib/begleitung/client.ts`,
  `src/lib/begleitung/dayChat.ts` (Regeln ohne KI).

## Daten und Speicher

| Schlüssel | Version | Inhalt | Sicherung |
|---|---|---|---|
| `wasgibts.timer` | v1 | `TimerState` | nein |

- `TimerState`: `timers`, `stopwatch` (`startedAt`, `elapsedMs`) oder null,
  `hintSeen`, `firstAt`/`lastEnd` (fürs Kochen).
- `Timer`: `id`, `name` (bis 30 Zeichen), `emoji` (aus dem Namen geraten),
  `durationMs`, `endsAt`, `pausedLeft` (Restzeit, sonst null), `startedAt`,
  `acked`, optional `step` (aus einem Rezept-Schritt).
- Pro Gerät, nicht in „Daten sichern“. Beim Speichern räumt `pruneTimers`
  Timer weg, die seit über 12 Stunden abgelaufen sind.

## So verhält es sich

Regeln:
- Höchstens 5 Timer (abgelaufen und gesehen zählt nicht mit). Dauer 1 Sekunde
  bis 24 Stunden. Ohne Name: „Timer 10 Min“.
- Pause merkt die Restzeit, Weiter setzt eine neue Endzeit. „+1“ geht auch
  nach Ablauf (läuft dann wieder 1 Minute).
- Reihenfolge: Abgelaufenes zuerst, dann was als Nächstes fertig wird,
  Pausiertes zuletzt (`sortTimers`).
- Auf der Kachel steht ein abgelaufener Timer noch 1 Minute (`shownOnTile`).

Kachel `timer` (Größen S/M, Standard M, standardmäßig aus):
- M: Kopf „Timer“ (ohne Zähler), der wichtigste Timer mit
  Ring (Timer-Symbol), Restzeit groß, Name, Knöpfe +1 · Pause/Weiter · ✕; weitere als
  Zeilen; die Stoppuhr (anhalten/weiter, zurücksetzen); „Bereit, wenn du ihn
  brauchst.“; Schnellknöpfe 5 · 10 · 15 Min · Stoppuhr. Lange drücken
  (0,5 s) = eigene Dauer + Name („Neuer Timer“).
- S: nächster Timer bzw. Stoppuhr klein, sonst „Timer starten“. Antippen
  öffnet ein Fenster mit der M-Kachel (oder den eigenen Timer). Eine eigene
  Seite gibt es nicht.
- Kachel-Plus = „Neuer Timer“ (Standard 10 Min).
- Emojis der Timer (`emoji`) bleiben in den Daten (für Mitteilungen später),
  die Kachel zeigt sie nicht (keine Emojis in Kacheln).
- Ist die Timer-Kachel ausgeblendet, blendet `startTimer` sie an ihrem
  Standard-Platz ein – egal ob aus der Oberfläche (z. B. Schritt-Timer der
  Koch-Kachel) oder von der Begleitung (`tileShown`; sie sagt dann, wo er
  steht). Seit dem Aufräumen (Etappe 8), vorher nur über die Begleitung.

Erster Start eines Timers:
- `unlockTimerSound` schaltet den Ton frei (iPhone braucht ein Antippen).
- Einmal die Meldung: „Der Ton kommt, solange die App geöffnet ist.
  Erinnerungen bei geschlossener App kommen bald per Mitteilung.“
- `nudgePhase` – die Startseite kann sofort in die Phase „Kochen“ wechseln.

Fertig-Karte (`TimerAlarm`, über allen Seiten):
- Weiße Karte mit orangem Rand: „Nudeln sind fertig“ (Mehrzahl erkannt) bzw.
  „Reis ist fertig“, bei mehreren „(+1)“. Knöpfe „+1 Min.“ und „Stopp“.
- Ton (Web Audio) und Vibration (nur Android) sofort und alle 2,5 s, höchstens
  1 Minute (`RING_MS`). iPhone-Web-Apps vibrieren nicht.
- Lief der Timer ab, während die App zu war: still „Nudeln war um 18:30
  fertig“ ohne Ton.

Jetzt-Karte: ein laufender Timer ist ein Thema („Nudeln: noch 4 Minuten“,
auch nachts); Antippen scrollt zur Timer-Kachel.

Push (später): `timerPushPlan` bereitet die Mitteilung zum Timer-Ende vor
(„<Name der Begleitung>: 🍝 Nudeln“). Timer-Push ist auch in der Ruhezeit
erlaubt (`src/lib/heute/push.ts`).

## Begleitung (Mia)

- Mit KI: `timer_stellen` (Op `add_timer`), `timer_stoppen` (`stop_timer`),
  `stoppuhr` (`stopwatch`), `timer_status` (nur lesen). Diese Ops stehen in
  `INSTANT_OP_TYPES` (`src/lib/begleitung/ops.ts`) und laufen sofort über
  `runInstantOps` – ohne „Übernehmen“, zurück mit „Mach das rückgängig“.
- Kontext: laufende Timer mit Restzeit und die Stoppuhr.
- Ohne KI (`dayChat` + `parseTimerCommand`): „Timer 10 Minuten für die
  Nudeln“, „Weck mich in einer halben Stunde“, „Wie lange noch?“, „Stopp den
  Nudel-Timer“, „Stoppuhr starten“. Bei 5 laufenden: „Fünf Timer laufen schon
  – sobald einer fertig ist, geht der nächste.“
- Startet die Begleitung einen Timer und die Kachel ist aus, wird sie an
  ihrem Standard-Platz eingeblendet: „Der Timer steht jetzt auf der
  Startseite.“

## Tests

- `tests/timer/timer.test.ts` – Endzeit, Anzeige, Stoppuhr, Namen und Sätze,
  Speicher prüfen, Push vorbereiten.
- `tests/timer/timerSpeicher.test.ts` – Speicher, starten/stoppen, Ton.
- Kein eigener Ablauf in `e2e/ablaeufe/`.
