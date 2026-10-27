# Heute

Kurz: Die Startseite der App. Oben Begrüßung und die Jetzt-Karte (EIN Thema
für den Moment), darunter die Kacheln in der einen gespeicherten Anordnung.
Links liegt der Kalender, rechts Essen – gewechselt wird per Tipp oder Wischen.

## Wo im Code

- Seiten-Pager: `src/components/heute/HomePager.tsx` (Kalender · Heute · Essen),
  Wischen in `usePagerSwipe.ts` (`swipeDecision`); Einstieg `HomeView.tsx`.
- Seite Heute: `TodayPage.tsx`; Kacheln `HomeBoard.tsx`, `EditFrame.tsx`,
  `EditHeader.tsx`, `EditLook.tsx`, `TilePicker.tsx`, `useHomeEditing.ts`, `Pressable.tsx`.
- Kachel-Inhalte: `MiniCards.tsx` (Termine, Aufgaben), `HomeTiles.tsx` (Essen,
  Einkauf, Notizen, Vorrat, Ausblick morgen); andere Kacheln in ihren Bereichen
  (`wetter/WeatherTile`, `pinnwand/PinboardTile`, `timer/TimerTile`, …).
- Layout (rein + Speicher): `src/lib/core/homeLayout.ts`; Einheiten/Reihen:
  `src/lib/core/homeUnits.ts` (`unitsOf`, `rowsOf`, `glowTile`).
- Jetzt-Karte: `src/lib/heute/jetztTopics.ts` (Punkte), `jetztStore.ts`
  (Speicher), `jetztCommand.ts` (Satz an/aus); Oberfläche
  `src/components/heute/JetztCard.tsx`, Daten `useJetztTopics.ts`.
- „Dein Tag“: `src/lib/heute/deinTag.ts` (Symbole, Zeilen, Übersicht,
  Öffnen), `src/components/heute/DeinTag.tsx`; Mia-Knopf beim Scrollen
  `src/lib/begleitung/knopfScroll.ts`.
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
  `wasgibts.einmalhinweise` („+ Kachel“), `wasgibts.dunkeltipp`, `wasgibts.willkommen`,
  `wasgibts.hinweise` v1 `{gezeigt: {id: Tag}}` (Hinweis-Warteschlange).

## So verhält es sich

### Hinweise (Launch 1.0, `core/hinweise.ts`)
- Höchstens EIN Hinweis unter der Jetzt-Karte und höchstens EINE schwebende
  Blase je Öffnen („Schreiben & sprechen“ am Mia-Knopf). Reihenfolge: „Ich heiße
  jetzt Mia“ → Familie einladen (ohne Mia-Gesicht) → Spendentopf → „Halte die
  Startseite gedrückt“ → „Lieber schlicht?“ → „Abends lieber dunkel?“.
- Jeder Hinweis nur einmal: am ersten Tag bleibt er, ab dem nächsten ist er
  weg (auch ohne Antippen). In den ersten 3 Tagen nur Beispiel-Tag und
  „Schreiben & sprechen“; „Lieber schlicht?“ kommt damit frühestens am 4. Tag.
  Ausnahme „Ich heiße jetzt Mia“ (nur alte Installationen, schützt vor
  Datenverlust): steht immer zuerst, bis ✕.

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
- M und L = volle Breite, S = immer halbe. Zwei S hintereinander stehen
  nebeneinander, jede S-fähige Kachel mit jeder anderen (`rowsOf`). Eine
  einzelne S bleibt halb; im Bearbeiten zeigt die freie Hälfte „＋ Kachel“
  (`data-freie-haelfte`, Auswahl nur S-fähiger Kacheln, `placeBeside`),
  sonst bleibt sie leer. Ziehen tauscht die Partner. Startseite v6
  (`lonelySToM`): eine einzelne S, die bisher breit war, wird einmal M.
- Notizen-Kachel (`heute/notizenKachel.ts`): S = neueste bzw. angeheftete
  Notiz (Titel + 1 Zeile) oder „Schnell was aufschreiben …“, M = 3 Zeilen
  „Titel · Anfang“, L = bis 5, Angeheftete zuerst; Listen als „x von y
  erledigt“. Zeile = diese Notiz, Stift = Schnelleingabe „Neue Notiz“.
- Essen + Einkauf sind ein Paar: immer direkt hintereinander, Essen zuerst
  (`keepPair`), und wandern zusammen. Als eine Einheit im Raster zählen sie
  nur, wenn beide S sind.
- Die Anordnung ändert sich nie von selbst. „zeigen“ setzt eine Kachel in
  Standard-Größe hinter die nächste sichtbare, die laut Standard davor steht
  (Paar: neben den Partner). `standardLayout`: Reihenfolge und Größen wie am Anfang.
- Termine und Aufgaben im gleichen Listenstil (v0.67.1, Tafel 58/59): ein
  weißes Feld je Kachel, feine Trennlinien, Zeilen 30 px (`data-zeile`, die
  ganze Zeile ist tippbar), Titel 13,5 px, Uhrzeit 13,5 px fett in fester
  Breite (tabular-nums), Nebeninfo 11 px. Größe ändert nur die Menge: S 2 /
  M 4 / L 6 (`ROW_COUNT`). Kopf auf allen Kacheln gleich (26 px, Titel 11 px,
  „+N weitere“ 12,5 px neben dem Plus), unten nichts; Abstand der Kacheln 8 px.
- Termine (`lib/heute/termineKachel.ts`, `termineTile`): ganztägige oben, dann
  nach Uhrzeit; ein laufender Termin bleibt 30 Min nach Beginn („läuft“) bzw.
  bis zum Ende, wenn es eins gibt; der nächste Termin hat eine Pfirsich-Zeile
  mit kräftigerem Titel, in der nächsten Stunde dazu „gleich“. Alles vorbei →
  „Morgen · Sa“ mit den Terminen von morgen. Neu gerechnet jede halbe Minute
  und sofort beim Zurückkommen in die App (`useMinutes`, `visibilitychange`).
- Aufgaben: Kreis (Tippfläche 44 × 30), Titel, „heute“ / „bis Fr“ / „diese
  Woche“, „!“ bei dringend; dringend, heute dran und diese Woche. Abhaken:
  1,5 s durchgestrichen (`LEAVE_MS`, überall gleich), dann weich weg – auch am
  Beispiel-Tag.
- Jede Kachel öffnet ihre Seite – die ganze Kachel, nicht nur der Titel
  (`EditFrame` mit `TILE_PAGE` in `TodayPage`; Zeilen, Knöpfe und Links in der
  Kachel behalten ihr Ziel). Termine öffnet den Kalender (er steht auf
  „Heute“), Essen den Essen-Reiter; Timer bleibt ein Fenster. Auf dem iPhone 15 Pro (als App) sind
  Pinnwand/Wetter, Termine und Aufgaben ohne Scrollen ganz zu sehen, Essen +
  Einkauf angeschnitten (`e2e/ablaeufe/startseite.mjs`). Die Kachel „Ausblick morgen“ (bis v0.51.0 „Morgen“, missverständlich wie „der Morgen“) füllt sich erst ab 16 Uhr; Titel in der Kachel „Ausblick morgen · Do“, Platzhalter im Bearbeiten-Modus „ab 16 Uhr“, in der Auswahl „Was morgen ansteht, ab 16 Uhr“.

### Bearbeiten-Modus (direkt auf der Startseite)
- Öffnen: lange drücken, Link „Startseite bearbeiten“ unten, Einstellungen
  oder die Begleitung (`requestHomeEdit`). Seit Launch 1.0 genau EIN
  „＋ Kachel“ und EIN „Fertig“ (beide im Kopf); die frühere Leiste unten
  (`EditDoneBar`) und der gestrichelte „Kachel hinzufügen“ sind weg, Mia
  ruht solange (`data-edit-leiste`). Schließen: „Fertig“, Zurück (eigener
  Verlaufseintrag) oder ein Tipp auf freie Fläche – ein Tipp auf eine Kachel
  beendet NICHT. Beim Beenden kurz „✓ Gespeichert“. Unten im Board leise
  „Aussehen“ (`EditLook`: Farbig | Schlicht und Hell | Dunkel | Automatisch,
  wirkt sofort).
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
- Unten „Aussehen“ und „Standard-Anordnung wiederherstellen“ (mit
  Nachfrage). Hinzufügen ist still (kein Rückgängig); nach dem Schließen der
  Auswahl leuchtet die neue Kachel kurz auf. Kacheln eines Bausteins schalten
  ihn beim Hinzufügen ein.
- Statt der Jetzt-Karte steht oben ein gestrichelter Platz (`JetztPlaceholder`).

### Jetzt-Karte (Tafel 60, v0.68.0)
- Zeigt nur, was Mia weiß und die Kacheln NICHT zeigen – seit v0.74 ohne
  eigenen Knopf (siehe „Weniger Mia + Dein Tag“).
  Kein Wetterbericht, keine Wiederholung, keine Zähler, kein ✕, keine
  „Passt sich deinem Tag an“-Zeile. Feste Höhe 78 px, zwei Zeilen: Zeile 1
  = was (höchstens 32 Zeichen, `TITLE_MAX`, gekürzt am Wortende), Zeile 2 =
  warum. Ganze Karte antippbar; Wischen = nächstes Thema (höchstens drei,
  kleine Punkte oben rechts, 1 → 3 und nicht weiter). „Erledigt“ (jetzt in
  „Dein Tag“) legt das Thema mit `doneJetztTopic` für heute weg – ohne
  weniger Interesse; eine Erinnerung gilt dann als gesehen.
- Themen (`jetztTopics`, rein, nie leer – sonst „Alles ruhig – ich sag
  Bescheid.“): Erinnerung (100), Timer (nur ohne Timer-Kachel), Kochschritt,
  Pause, Gleich (Termin ≤ 15 Min mit Notiz/Ort; ohne Zusatz nur ohne
  Termine-Kachel), Vorbereiten (Termin heute mit Notiz → „Versichertenkarte
  einpacken?“), Packliste fürs Training heute, Wetter NUR mit Planbezug
  (Regen zur Stunde eines Draußen-Termins/-Trainings, `isOutdoor`: „Regen um
  17 Uhr · Fußball – lieber drinnen?“), Neu von der Familie (Pinnwand,
  „Antworten“), Heimweg-Einkauf ohne Zahl („Auf dem Heimweg bei REWE?“, vor
  dem Kochen), Kochstart (≤ 30 Min vor dem Start; ohne Essen-Kachel früher),
  Absprache bei Abendterminen ab 18 Uhr mit Kindern („Wer bleibt bei den
  Kindern?“, mit Notiz „Oma bleibt …“ ✓), Geburtstag, Ausblick ab 19 Uhr
  (erster Termin morgen, mit Notiz als Packliste; ohne Notiz nur, wenn keine
  Kachel „Morgen“ zeigt), Aufgaben/Ideen nur ohne ihre Kachel,
  Wochencheck. Selbst eingeschaltete Bausteine leise: Freizeit-Idee (Ruhe),
  Tipp aus der Region (nur ohne Tipps-Kachel; Weiterwischen = dieses
  Wochenende nicht mehr), kleiner Tipp. Beispiel-Tag erklärt sich.
  Mit Haushalt (seit v0.80, Konten 3d): leise Neuigkeit von anderen
  („Milch steht auf der Liste“ – „Hat Lisa gerade gesetzt.“, „Neu:
  Elternabend“ – „Hat Lisa eingetragen.“), sanft, 45 Punkte, höchstens eine
  am Tag, jede nur einmal, nur 6 Std. frisch (`newsForCard` in
  `src/lib/konten/wer.ts`, Speicher `wasgibts.neu`).
- Weggefallen: „start“ (Grad · Termin), reines „morgen“, Wetter-Tipps ohne
  Plan, „Als Nächstes“-Termin, „Alles geschafft“, Sport-Info ohne Packliste.
- Punkte aus Dringlichkeit und Interesse (`weights`, ±5 % je Punkt;
  Antippen +1, Weiterwischen −0,5). `calm` (Feierabend mit Ruhe oder
  Wochenende) = nur sanfte Themen. Nachts (22–6 Uhr) nur Erinnerung, Timer,
  Kochen, Pause, Ausblick, Geburtstag, Beispiel. Arbeit-Termine sind nicht sanft.
- Die Reihenfolge bleibt stehen (`useStableOrder`), bis die App zurückkehrt,
  15 Min vergehen, ein Thema wegfällt oder eines mit ≥ 90 Punkten dazukommt.
- Tests: `tests/heute/jetztThemen.test.ts` (Tag wie Tafel 60 um 7:00, 8:10,
  10:20, 12:40, 16:45, 17:35, 19:00, 21:00; nie „°“; Regen nur mit
  Draußen-Termin; „Erledigt“), Durchklick `jetztKarte`.

### Weniger Mia + „Dein Tag“ (Tafel 66 B, 67, 68, v0.74.0)
- Auf der Startseite genau zwei Mias: das eckige Logo (`BrandMark`, nicht
  antippbar) und der runde Mia-Knopf. Die Jetzt-Karte zeigt statt Mias
  Gesicht ein Themen-Symbol (lucide, Orange im weißen 46-px-Kreis); die
  Zuordnung steht an EINER Stelle: `topicIcon` in `src/lib/heute/deinTag.ts`.
- Antippen öffnet „Dein Tag“ (`components/heute/DeinTag.tsx`, ein Sheet):
  Datum klein, Titel 30/800; TERMINE nach Uhrzeit mit „Jetzt · 10:30“-Linie
  (Vorbei grau mit ✓, `terminRows`), ESSEN (Abendessen mit „Kochen“ →
  Kochmodus, „Einkaufen · REWE“ mit „Liste“), neue PINNWAND-Nachrichten von
  heute, AUFGABEN zum Abhaken („von gestern“ leise; seit v0.107 wie überall:
  1,5 s durchgestrichen, weg, „Erledigt · Rückgängig“; Erledigtes steht
  nicht mehr da). Oben rechts ✕; schließt wie jedes Fenster (✕,
  Danebentippen, Runterwischen, Zurück). Das Thema der Karte ist
  hervorgehoben und in Sicht gescrollt (`topicSpot`), mit dem Hinweis der
  Karte; „Erledigt“ nur bei Vorbereiten/Packliste/Geburtstag/Erinnerung.
  Leerer Tag: „Heute ist nichts geplant. Genieß es.“ Ab 22 Uhr Umschalter
  „Morgen · Do“. Eintrag antippen = öffnen. „Arbeit“ trägt „Nur für dich“
  (fremde Arbeit kommt per RLS nie aufs Gerät). Ausnahme: laufender Timer
  öffnet den Timer.
- Mia: „Was steht heute an?“ / „Wie sieht mein Tag aus?“ (`isDayQuestion`)
  → 2 Sätze (`daySummary`), dann öffnet sich „Dein Tag“ (`openDeinTag`).
  Mit KI läuft es als App-Befehl wie der Wochencheck.
- Der Mia-Knopf gleitet beim Runterscrollen weg (`knopfAway`, nur
  transform/opacity) und kommt beim Hochscrollen bzw. nach 0,6 s Ruhe zurück.
- Tests: `tests/heute/deinTag.test.ts`, Durchklick `jetztKarte`.

### Tagesphasen
- Kochen (50) > Sport (40) > Feierabend (30) > Morgens (20) > Tagsüber (10).
  Sie ändern nur Inhalte, nie die Anordnung.
- Kochen: von Hand („Ich koche jetzt“), Timer läuft (bis 15 Min nach dem
  letzten) oder automatisch `kochenMin` vor bis 45 Min nach der Essenszeit.
  Dann zeigt die Essen-Kachel „Koche gerade“ (`CookingTile`, siehe unten), Bildschirm bleibt an.
- Sport: 60 Min vor einem Training bis zu seinem Ende (nur mit Sport-Kachel).
- Feierabend: ab `feierabendAb`, mit `nachArbeit` frühestens nach dem letzten
  Arbeit-Termin, bis 5 Uhr. Mit Ruhe: Arbeit weg, Aufgaben pausieren, Termine
  nur Familie; Wetter zeigt morgen; der Avatar schläft.
- Nicht-Arbeitstag: Arbeit ganztags weg. Wechsel nur beim Öffnen/Zurückkehren
  oder nach 30 s ohne Berührung, nie beim Bearbeiten; `nudgePhase` wirkt sofort.
- `pushAllowed`: Timer immer, Pause nie, proaktiv höchstens 1×/Tag außerhalb
  20–7 Uhr, im Feierabend mit Ruhe nichts zu Arbeit und Aufgaben.

### Beispiel-Tag und erster Start
- Erster Start ohne Profil: Hallo-Bildschirm („Moin!“, früher „Hallo, ich bin Mia.“ aus
  `DEFAULT_HELPER`, „Ich behalte euren Alltag im Blick.“, Mikrofon-Hinweis,
  „Los geht’s“, „Ich habe eine Sicherung“). Seit v0.94: „Los geht’s“ →
  („Bevor’s losgeht“) → „Für wen soll ich sortieren?“ (Mia 110 px zwinkert
  einmal, Sprechblase „Kein Stress. Ich sortier deinen Alltag, Stück für
  Stück.“, drei Knöpfe, Texte `ERSTER_START` in `mia/persona.ts`, seit
  v0.120) → `startFresh("farbig", haushalt)`: Standardwerte,
  `DEFAULT_HOME`, `startDemo()`; Mia fliegt von „Zeig mal“ zum Mia-Knopf, der
  beim ersten Erscheinen einmal zwinkert; „Schreiben & sprechen“ erst nach 4 s.
  Jeder Schritt ist ein Verlaufseintrag (Zurück = ein Schritt), nach „Zeig
  mal“ werden die Schritte aus dem Verlauf genommen.
- Beispiele liegen nie in echten Speichern. Termine aus `demoDay(datum)`,
  passend zum Wochentag (seit v0.99, `demoArt`; Feiertage bundesweit + SH aus
  `core/feiertage.ts` wie Sonntag), echte Termine statt Mahlzeiten:
  - Mo–Fr: 8:00 Kita bringen, 10:30 Telefonat Versicherung, 15:00 Mathis
    Fußball, 16:00 Zahnarzt Jonne, 19:30 Elternabend (nur Di–Do), 20:15
    Lieblingsserie
  - Samstag: 9:00 Brötchen holen, 10:00 Wochenmarkt, 11:30 Fußballspiel
    Mathis, 15:00 Kindergeburtstag Ben, 18:30 Grillen mit Nachbarn
  - Sonntag/Feiertag: 9:30 Familienfrühstück, 11:00 Spaziergang am See, 15:00
    Kaffee bei Oma, 18:00 Pizza backen, 20:15 Tatort

  Nur was heute noch kommt; weniger als 2 → Beispiele für morgen mit dem Plan
  von morgen („Morgen · Sa“). Fünf Beispiel-Aufgaben (am Wochenende/Feiertag
  alle „diese Woche“, keine dringend), Pinnwand-Gruß, Einkauf `DEMO_SHOPS`,
  Beispielgericht je Tag (`demoDishAt(heute, minuten)`: werktags Pasta 18:30,
  samstags Lasagne 18:30, sonntags Ofen-Hähnchen 12:30; danach das von morgen).
  Wechselt der Tag, wechselt der Plan von selbst (alles aus Datum und Uhrzeit).
- Eine Zeile oben (`DemoRow`): „So sieht ein Tag aus“ · „Eigenen starten“.
  Je Kachel verschwinden die Beispiele beim ersten Eigenen (`clearDemoTile`),
  alle nach 3 Tagen oder per „Eigenen starten“. Danach einmal „Alle Beispiele
  entfernen?“ (`askRemoveAll`).

### Seiten-Pager
- Wischen ohne Wackeln (v0.106): Richtung früh und fest (`swipeAxis`: ab 6 px,
  waagerecht nur bei |dx| > 1,2 · |dy|, dann für die ganze Geste). Waagerecht
  steht die Seite senkrecht still (html `overflow: hidden` + gemerkte
  Scrollhöhe, beim Loslassen frei), senkrecht kein seitliches Wischen. Pager
  `touch-action: pan-y` (Zoomen bleibt), html/body `overscroll-behavior-y:
  none` (kein Gummiband, kein Ziehen zum Neuladen). Durchklick `wischen.mjs`.
- Wechsel ab 25 % Breite oder
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

- `tests/heute/`: `jetztKarte.test.ts`, `jetztThemen.test.ts`, `deinTag.test.ts`,
  `phasen.test.ts`, `tagesphasen.test.ts`, `tagesablaufSpeicher.test.ts`.
- `tests/core/`: `kachelAnordnung.test.ts`, `startseite.test.ts`,
  `beispielTag.test.ts`, `beispielTagSpeicher.test.ts`, `wischen.test.ts`.
- `tests/einstellungen/ersterStart.test.ts`, `tests/begleitung/werkzeugeStartseite.test.ts`.
- Durchklick `e2e/ablaeufe/start.mjs`: `hallo`, `bearbeiten`, `wischen`.

## Kopf und „neu hinzufügen“ (v0.67)

- Kopf (Tafel 55): links BrandMark (30 px), rechts „Fr, 23. Okt“
  (`headerDate`, `lib/heute/kopfDatum.ts`); „Guten Morgen, Lisa.“ bleibt als
  Überschrift für VoiceOver (unsichtbar).
- iPhone/iPad als Web-App, vor v0.67 installiert (`miaHomeHint`): einmal der
  Hinweis „Ich heiße jetzt Mia …“ (`MiaNameHint`, Vorrang vor den anderen
  Hinweisen) mit „Zeig mir wie“: sichern → Icon entfernen → Safari → Zum
  Home-Bildschirm → wiederherstellen (`miaHomeSteps`). Sichern zuerst, weil
  iOS beim Entfernen die Daten der Web-App löscht.


## Essen-Kachel immer mit Bild, Koch-Kachel, Einkauf-Symbole (Sofort-Kachel)

- Essen-Kachel: JEDER Zustand ist eine Bild-Kachel (`DishTile`) – geplant,
  Vorschlag, morgen, kocht gerade, gegessen (zeigt dann morgen), „Noch frei“
  und „Kein Kochtag“. Ohne Gericht ein gezeichneter leerer Teller mit Besteck
  (`DishPicture leer`). Das Bild je Zustand kommt rein aus `kachelBild`
  (`lib/heute/essenKachel.ts`). „3 Ideen ansehen“ steht bei „Noch frei“ als
  Zeile unter dem Namen; die frühere L-Zeile „Ideen für morgen“ entfällt.
- Kopfzeile einzeilig und nie umbrochen (`truncate whitespace-nowrap`,
  `data-kopf`): „ESSEN · 18:30“. Personenzahl nur ab M und kurz („für 4“),
  bei S nie (`essenKopf`).
- Koch-Kachel (`CookingTile`): dasselbe Gerichtsbild, klein „Koche gerade“,
  der Name weiß auf dem Verlauf, darunter „Schritt 3 von 6“, sobald im
  Kochmodus Schritte erledigt sind (`kochSchrittZeile`; der Kochmodus merkt
  den Schritt über `markStepsBefore` in `kochSession`). Unten links
  „Kochmodus ›“, unten rechts der weiße Knopf „Gegessen“ (Schrift
  `on-photo-ink`). Antippen öffnet den Kochmodus (ohne Rezept die Essen-Seite).
  Die Schritte-Liste zum Abhaken gibt es nur noch im Kochmodus und bei Mia.
- Einkauf-Kachel: Artikel ohne eigene Zeichnung zeigen das Linien-Symbol
  ihrer Abteilung (`abteilungSymbol`, `lib/einkauf/kacheln/abteilung.ts`),
  nie einen Buchstaben. Gibt es nur „Egal wo“, zeigt die Kachel bis zu 6
  runde Symbole der ersten Sachen, „+N“ und die Zahl (Variante A,
  `tileArt`/`symbolReihe`); sobald Läden da sind, die Zeilen je Laden (C2).
- Tests: `tests/heute/essenKachel.test.ts` (sieben Zustände mit Bild,
  Kopfzeile, Schritt-Zeile), `tests/einkauf/kachelSymbole.test.ts` (nie ein
  Buchstabe, Variante A/C2, Kochmodus-Schritt).
