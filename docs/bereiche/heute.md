# Heute

Kurz: Die Startseite der App. Oben Begrüßung und die Jetzt-Karte (EIN Thema
für den Moment), darunter die Kacheln in der einen gespeicherten Anordnung.
Links liegt der Kalender, rechts Essen – gewechselt wird per Tipp oder Wischen.

## Wo im Code

- Seiten-Pager: `src/components/heute/HomePager.tsx` (Kalender · Heute · Essen),
  Wischen in `usePagerSwipe.ts` (`swipeDecision`); Einstieg `HomeView.tsx`.
- Seite Heute: `TodayPage.tsx`; Kacheln `HomeBoard.tsx`, `EditFrame.tsx`,
  `EditHeader.tsx`, `EditDoneBar.tsx`, `TilePicker.tsx`, `useHomeEditing.ts`, `Pressable.tsx`.
- Kachel-Inhalte: `MiniCards.tsx` (Termine, Aufgaben), `HomeTiles.tsx` (Essen,
  Einkauf, Notizen, Vorrat, Ausblick morgen); andere Kacheln in ihren Bereichen
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
- Zwei Looks (Profil `look`, `data-look` am `<html>`, Regeln in
  `globals.css`): „Farbig“ = Pastell-Flächen eine Stufe kräftiger, alle mit
  gleicher Sättigung (`--app-tile-<id>`/`-ac`, Text ≥ 4,5:1), Überschriften in
  der dunklen Tonfarbe, Innen-Kärtchen weiß, Wetter als Himmel je Wetterlage
  (`--app-sky-*`, nachts Nachtblau mit weißer Schrift); „Schlicht“ = weiße
  Kacheln mit feinem Rand, Innen-Kärtchen sehr hell, Farbe nur in Überschrift,
  Symbol, Uhrzeit und Termin-Strich. Termine: Uhrzeit fett in der Tonfarbe,
  Strich links in Raumfarbe. Hell/Dunkel gilt für beide.
- `HOME_TILES` in Standard-Reihenfolge: Pinnwand (S), Wetter (S), Termine (M),
  Aufgaben (M), Essen (S), Einkauf (S), Spendentopf (nur M), Tipps (M/L,
  Baustein), Timer (S/M), Sport, Notizen, Vorrat (S/M, Baustein), Ausblick morgen (nur M, Kalender-Icon),
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
  dann „Erledigt · Rückgängig“. Die Kachel „Ausblick morgen“ (bis v0.51.0 „Morgen“, missverständlich wie „der Morgen“) füllt sich erst ab 16 Uhr; Titel in der Kachel „Ausblick morgen · Do“, Platzhalter im Bearbeiten-Modus „ab 16 Uhr“, in der Auswahl „Was morgen ansteht, ab 16 Uhr“.

### Bearbeiten-Modus (direkt auf der Startseite)
- Öffnen: lange drücken, Link „Startseite bearbeiten“ unten, Einstellungen
  oder die Begleitung (`requestHomeEdit`). Schließen (Tafel 24): „Fertig“
  oben oder in der Leiste unten (`EditDoneBar`, ersetzt dort den Mia-Knopf:
  „+ Kacheln · Aussehen · Fertig“ mit hellem Verlauf dahinter, seit v0.64;
  „Aussehen“ öffnet Farbig | Schlicht und Hell | Dunkel | Automatisch, wirkt
  sofort), Zurück (eigener Verlaufseintrag), Danebentippen auf freie
  Fläche ODER ein kurzer Tipp auf eine Kachel (< 0,35 s, < 8 px, nicht nach
  Schwung). Beim Beenden kurz „✓ Gespeichert“.
- Kopf (sticky): „+ Kachel“, „Fertig“, Titel und Hinweis. Beim ersten Mal
  der Tipp „Neue Kacheln holen“ (`heute/AddTileTip.tsx`, Vorlage Variante D):
  Abdunklung (`bg-tip-scrim`, Portal an `body`, z-50), der Kopf darüber
  (z-[55], durchlässig) mit dem ECHTEN „+ Kachel“ hervorgehoben (`bg-accent`,
  4 px Ring `--app-tip-ring`, oranger Schein), „Fertig“ gedämpft, Titel
  ausgeblendet; die Karte (`bg-surface`, 16 px Rand, `rounded-pair`, z-[60])
  mit Spitze zur gemessenen Knopf-Mitte (ResizeObserver, Größe, Drehen,
  Safe-Area). „Verstanden“, Abdunklung, Zurück und Escape schließen, der
  Bearbeiten-Modus bleibt; „+ Kachel“ schließt sofort und öffnet die Auswahl
  (übernimmt den Verlaufseintrag – deshalb lädt `HomeBoard` die Auswahl beim
  Bearbeiten vor und zeigt sie ohne Suspense). Solange offen: Seite scrollt
  nicht, Fokus bleibt zwischen „Verstanden“ (zuerst) und „+ Kachel“, danach
  zurück auf „+ Kachel“. Ein-/Ausblenden 200 ms, bei „Bewegung reduzieren“
  sofort. Merker „kachel-tipp“ in `wasgibts.einmalhinweise` (`core/hints.ts`,
  getrennt von der alten Sprechblase „kachel-hinzufuegen“), gespeichert beim
  Schließen; Daten & App → „Einmal-Hinweise zurücksetzen“ (nur Testmodus).
- Kacheln wackeln, Inhalte sind gesperrt; „–“ entfernt mit „Gelöscht ·
  Rückgängig“, „S · M · L“ ändert die Größe (beides beendet NICHT). Das
  frühere Kachel-Menü ist weg; Verschieben ohne Ziehen per Pfeiltasten auf der
  Kachel bzw. die Screenreader-Knöpfe „Nach oben/unten“ und über die
  Begleitung („Schieb das Wetter nach oben“).
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
- Zuerst einkaufen, dann kochen: Ist der Kochstart des heutigen Gerichts noch
  mehr als 30 Min weg, steht „Auf dem Heimweg?“ knapp über dem Essen (Essen +
  4); fehlende Zutaten des Gerichts kommen dazu („4 Sachen bei REWE“ ·
  „Milch, Brot, Butter + Paprika fürs Essen“). Ab ≤ 30 Min gewinnt das Essen
  (80). Ohne Gericht mit Startzeit bleibt der Einkauf bei 40.
- Regeln: Was die erste Kachel-Reihe zeigt, zählt nur halb (außer mit Tipp).
  Zeigt eine Kachel schon „Morgen“ (Termine bzw. Ausblick morgen, Wetter von
  morgen – `tomorrowTiles`), entfällt das reine Morgen- bzw. Wetter-Thema;
  ein Schirm-Hinweis zu einem Termin bleibt.
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
  „Los geht’s“, „Ich habe eine Sicherung“). „Los geht’s“ → „Wie magst du’s?“
  (Look, siehe einstellungen.md) → `startFresh(look)`:
  Standardwerte, `DEFAULT_HOME`, `startDemo()`; der Avatar fliegt in die Jetzt-Karte.
- Beispiele liegen nie in echten Speichern. Termine aus `DEMO_DAY` (echte
  Termine statt Mahlzeiten: 8:00 Kita bringen, 10:30 Telefonat Versicherung,
  15:00 Mathis Fußball, 16:00 Zahnarzt Jonne, 19:30 Elternabend, 20:15
  Lieblingsserie; nur was
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
