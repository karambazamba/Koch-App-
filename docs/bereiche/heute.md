# Heute

Kurz: Die Startseite der App. Oben Begrüßung und die Jetzt-Karte (EIN Thema
für den Moment), darunter die Kacheln in der einen gespeicherten Anordnung.
Links liegt der Kalender, rechts Essen – gewechselt wird per Tipp oder Wischen.

## Wo im Code

- Seiten-Pager: `src/components/heute/HomePager.tsx` (Kalender · Heute · Essen),
  Wischen in `usePagerSwipe.ts` (`swipeDecision`); Einstieg `HomeView.tsx`.
- Seite Heute: `TodayPage.tsx`; Kacheln `HomeBoard.tsx`, `EditFrame.tsx`,
  `EditHeader.tsx`, `UnitMenu.tsx`, `TilePicker.tsx`, `useHomeEditing.ts`, `Pressable.tsx`.
- Kachel-Inhalte: `MiniCards.tsx` (Termine, Aufgaben), `HomeTiles.tsx` (Essen,
  Einkauf, Notizen, Vorrat, Morgen); andere Kacheln in ihren Bereichen
  (`wetter/WeatherTile`, `pinnwand/PinboardTile`, `timer/TimerTile`, …).
- Layout (rein + Speicher): `src/lib/core/homeLayout.ts`; Einheiten/Reihen:
  `src/lib/core/homeUnits.ts` (`unitsOf`, `rowsOf`, `glowTile`).
- Jetzt-Karte: `src/lib/heute/jetztTopics.ts` (Punkte), `jetztStore.ts`
  (Speicher), `jetztCommand.ts` (Satz an/aus); Oberfläche
  `src/components/heute/JetztCard.tsx`, Daten `useJetztTopics.ts`.
- Tagesphasen: `src/lib/heute/phases.ts`, Einstellungen `tagesablauf.ts`,
  Sofort-Wechsel `nudge.ts`, Push-Regeln (vorbereitet) `push.ts`;
  Hook `src/components/heute/useHomePhase.ts`.
- Beispiel-Tag: `src/lib/core/demo.ts`, `useDemoDay.ts`, `DemoBits.tsx`.
- Erster Start: `begleitung/HelloScreen.tsx`, `core/hello.ts`, `einstellungen/welcomeStore.ts`.

## Daten und Speicher

- `wasgibts.startseite` v4 `{version, tiles: {id, visible, size}[], tipSeen}`
  (`migrateHome`). v1 → Aufgaben hinter Termine; v1/v2 → Größen S/M/L,
  Kachel „kladde“ wird „notizen“ an derselben Stelle; v3 → v4 hängt die
  Spendentopf-Kachel einmal hinter die letzte sichtbare (`withPotTile`).
  `sanitizeHome` wirft Unbekanntes raus, ergänzt fehlende Kacheln unsichtbar
  und hält Essen + Einkauf zusammen. In der Sicherung.
- `wasgibts.jetzt` v1 `{on, day, hidden, weights}` – an/aus, heute
  ausgeblendete Themen, Interesse je Thema-Art (±6). In der Sicherung.
- `wasgibts.tagesablauf` v1 `{routine}` – `ruhe`, `morgenBis` (10:00),
  `feierabendAb` (20:00), `nachArbeit`, `arbeitstage` (0 = Mo … 6 = So,
  Standard alle), `kochenAuto`, `kochenMin` (20, erlaubt 5–90). Ein altes
  `mode` wird still übergangen. In der Sicherung.
- `wasgibts.zeitvorschau` (Sitzung): „So tun, als wäre es …“, wirkt nur auf
  die Startseite (`setPreview`, `PreviewBanner`).
- Nur auf dem Gerät: `wasgibts.beispiel` v1 `{since, cleared, done, gone, asked}`,
  `wasgibts.einmalhinweise` („+ Kachel“), `wasgibts.dunkeltipp`, `wasgibts.willkommen`.

## So verhält es sich

### Kacheln
- `HOME_TILES` in Standard-Reihenfolge: Pinnwand (S), Wetter (S), Termine (M),
  Aufgaben (M), Essen (S), Einkauf (S), Spendentopf (nur M), Tipps (M/L,
  Baustein), Timer (S/M), Sport, Notizen, Vorrat (S/M, Baustein), Morgen (nur M),
  Post („bald“, nie sichtbar).
- `DEFAULT_HOME` zeigt Pinnwand, Wetter, Termine, Aufgaben, Essen, Einkauf,
  Spendentopf und Vorrat; Vorrat erscheint nur mit Baustein, Tipps nur mit
  Quelle und Baustein (Filter in `TodayPage`).
- M und L = volle Breite, S = halbe. Zwei S hintereinander stehen
  nebeneinander, eine einzelne S wird breit (`rowsOf`). Essen + Einkauf sind
  ein Paar: immer direkt hintereinander, Essen zuerst (`keepPair`), und
  wandern zusammen. Als eine Einheit im Raster zählen sie nur, wenn beide S sind.
- Die Anordnung ändert sich nie von selbst. „zeigen“ setzt eine Kachel in
  Standard-Größe hinter die nächste sichtbare, die laut Standard davor steht
  (Paar: neben den Partner). `standardLayout`: Reihenfolge und Größen wie am Anfang.
- Größe ändert nur die Menge: Termine S 1 / M bis 4 / L bis 6 (höchstens zwei
  Spalten), Aufgaben S 2 / M 4 / L 8 (`TERMIN_COUNT`, `TASK_COUNT`).
  Aufgaben auf der Startseite: dringend, heute dran und diese Woche.
- Jede Kachel öffnet ihre Seite. Abhaken: 2 s durchgestrichen (`LEAVE_MS`),
  dann „Erledigt · Rückgängig“. Die Morgen-Kachel füllt sich erst ab 16 Uhr.

### Bearbeiten-Modus (direkt auf der Startseite)
- Öffnen: lange drücken, Link „Startseite bearbeiten“ unten, Einstellungen
  oder die Begleitung (`requestHomeEdit`). Schließen: „Fertig“, Zurück
  (eigener Verlaufseintrag) oder Danebentippen auf freie Fläche.
- Kopf (sticky): „+ Kachel“, „Fertig“, Titel und Hinweis. Beim ersten Mal
  der Tipp „Neue Kacheln holen“ (`heute/AddTileTip.tsx`, Portal an `body`):
  Abdunklung (`bg-tip-scrim`), „+ Kachel“ hervorgehoben genau über dem echten
  Knopf, weiße Karte darunter (16 px Rand, `rounded-pair`) mit Spitze zur
  gemessenen Knopf-Mitte. „Verstanden“, Abdunklung, Zurück oder Escape
  schließen; „+ Kachel“ schließt und öffnet sofort die Auswahl. Ein-/Ausblenden
  200 ms, Fokus zuerst auf „Verstanden“. Gesehen-Status in
  `wasgibts.einmalhinweise` (`core/hints.ts`); zurücksetzen über Daten & App →
  „Tipps wieder zeigen“.
- Kacheln wackeln, Inhalte sind gesperrt; „–“ entfernt mit „Gelöscht ·
  Rückgängig“, „S · M · L“ ändert die Größe. Kurz antippen = Menü (Ganz nach
  oben · Nach oben · Nach unten · Größe · Entfernen).
- Ziehen per Touch-Events: Wischen scrollt (`touch-action: pan-y`), erst
  ruhiges Festhalten (`HOLD_MS` 350, Toleranz 8 px) hebt an. Antippen kurz nach
  dem Scrollen (`FLING_MS` 120) hält nur den Schwung an. Schwebende Kopie,
  gestrichelter Platzhalter, Auto-Scroll am Rand.
- Unten „Kachel hinzufügen“ und „Standard-Anordnung wiederherstellen“ (mit
  Nachfrage). Hinzufügen ist still (kein Rückgängig); nach dem Schließen der
  Auswahl leuchtet die neue Kachel kurz auf. Kacheln eines Bausteins schalten
  ihn beim Hinzufügen ein.
- Statt der Jetzt-Karte steht oben ein gestrichelter Platz (`JetztPlaceholder`).

### Jetzt-Karte
- Feste Höhe 78 px, zwei Zeilen (Titel fett, Detail in Dunkelorange), Emojis
  werden entfernt (`withoutEmoji`). Ganze Karte antippbar; ✕ blendet das Thema
  für heute aus („Für heute ausgeblendet“ mit Rückgängig). Wischen = nächstes
  Thema, höchstens drei.
- `jetztTopics` ist rein und nie leer (sonst „Heute ist es ruhig“). Punkte aus
  Dringlichkeit, Handlung (`tip` schlägt Info) und Interesse (`weights`,
  ±5 % je Punkt; Antippen +1, Weiterwischen −0,5, ✕ −1,5).
- Themen u. a.: Erinnerung (100), Timer, Kochschritt, Pause, Termin ≤ 60 Min,
  Pinnwand ungelesen (auch Sprachnachricht nur mit Dauer), Wetter-Tipp,
  morgens „8° · 8:15 …“, ab 15 Uhr Essen mit Startzeit oder „Noch nichts zum
  Essen – 3 Ideen“, „Heute wichtig/dran“, Geburtstag, Sport, „Auf dem
  Heimweg?“ (15:00–19:30), ab 19 Uhr „Morgen · Mi: …“, „Alles geschafft“,
  Freizeit-Idee, Regional-Tipp, Tipp, Beispiel-Tag.
- Regeln: Was die erste Kachel-Reihe zeigt, zählt nur halb (außer mit Tipp).
  `calm` (Feierabend mit Ruhe oder Wochenende) = nur sanfte Themen. Nachts
  (22–6 Uhr) nur Erinnerung, Timer, Kochen, Pause, Morgen, Geburtstag,
  Beispiel. Arbeit-Termine sind nicht sanft.
- Die Reihenfolge bleibt stehen (`useStableOrder`), bis die App zurückkehrt,
  15 Min vergehen, ein Thema wegfällt oder eines mit ≥ 90 Punkten dazukommt.

### Tagesphasen
- Kochen (50) > Sport (40) > Feierabend (30) > Morgens (20) > Tagsüber (10).
  Sie ändern nur Inhalte, nie die Anordnung.
- Kochen: von Hand („Ich koche jetzt“), Timer läuft (bis 15 Min nach dem
  letzten) oder automatisch `kochenMin` vor bis 45 Min nach der Essenszeit.
  Dann zeigt die Essen-Kachel die Schritte (`CookingTile`), Bildschirm bleibt an.
- Sport: 60 Min vor einem Training bis zu seinem Ende (nur mit Sport-Kachel).
- Feierabend: ab `feierabendAb`, mit `nachArbeit` frühestens nach dem letzten
  Arbeit-Termin, bis 5 Uhr. Mit Ruhe: Arbeit weg, Aufgaben pausieren, Termine
  nur Familie; Wetter zeigt morgen; der Avatar schläft.
- Nicht-Arbeitstag: Arbeit ganztags weg. Wechsel nur beim Öffnen/Zurückkehren
  oder nach 30 s ohne Berührung, nie beim Bearbeiten; `nudgePhase` wirkt sofort.
- `pushAllowed`: Timer immer, Pause nie, proaktiv höchstens 1×/Tag außerhalb
  20–7 Uhr, im Feierabend mit Ruhe nichts zu Arbeit und Aufgaben.

### Beispiel-Tag und erster Start
- Erster Start ohne Profil: Hallo-Bildschirm („Hallo, ich bin Mia.“ aus
  `DEFAULT_HELPER`, „Ich behalte euren Alltag im Blick.“, Mikrofon-Hinweis,
  „Los geht’s“, „Ich habe eine Sicherung“). „Los geht’s“ = `startFresh()`:
  Standardwerte, `DEFAULT_HOME`, `startDemo()`; der Avatar fliegt in die Jetzt-Karte.
- Beispiele liegen nie in echten Speichern. Termine aus `DEMO_DAY` (nur was
  heute noch kommt; weniger als 2 → Beispiele für morgen, „Morgen · Do“),
  fünf Beispiel-Aufgaben, Pinnwand-Gruß, Einkauf `DEMO_SHOPS`, Beispielgericht.
- Eine Zeile oben (`DemoRow`): „So sieht ein Tag aus“ · „Eigenen starten“.
  Je Kachel verschwinden die Beispiele beim ersten Eigenen (`clearDemoTile`),
  alle nach 3 Tagen oder per „Eigenen starten“. Danach einmal „Alle Beispiele
  entfernen?“ (`askRemoveAll`).

### Seiten-Pager
- Wischen: Richtung einmal pro Geste (> 10 px), Wechsel ab 25 % Breite oder
  > 0,35 px/ms, sonst zurückfedern; Gummiband am Rand. Nicht in Feldern,
  Fenstern und `[data-no-swipe]`.
- Verlauf: Heute → Kalender/Essen ein Eintrag, Kalender ↔ Essen ersetzt; Zurück
  führt immer zu Heute. `?seite=woche` gilt weiter als Kalender.

## Begleitung (Mia)

- `startseite_anpassen` (Op `home`, Vorschau + Übernehmen): zeigen,
  ausblenden, klein/mittel/gross, hoch/runter/nach_oben/nach_unten, standard.
- `jetzt_karte` (Op `set_jetzt`): Jetzt-Karte an/aus.
- „Startseite bearbeiten“ → `app_befehl` mit diesem Satz → `requestHomeEdit`.
- Ohne KI: `parseHomeCommand` in `src/lib/begleitung/homeChat.ts` („Mach die
  Einkaufsliste wieder klein“, „Nimm das Wetter weg“) und `jetztCommand` in
  `dayChat.ts` („Blende die Jetzt-Karte aus“, auch „Lass die Startseite immer
  gleich“).
- Nutzt die Begleitung eine Kachel, die fehlt, kommt sie dazu (`unlockHomeTile`).

## Tests

- `tests/heute/`: `jetztKarte.test.ts`, `jetztThemen.test.ts`,
  `phasen.test.ts`, `tagesphasen.test.ts`, `tagesablaufSpeicher.test.ts`.
- `tests/core/`: `kachelAnordnung.test.ts`, `startseite.test.ts`,
  `beispielTag.test.ts`, `beispielTagSpeicher.test.ts`, `wischen.test.ts`.
- `tests/einstellungen/ersterStart.test.ts`, `tests/begleitung/werkzeugeStartseite.test.ts`.
- Durchklick `e2e/ablaeufe/start.mjs`: `hallo`, `bearbeiten`, `wischen`.
