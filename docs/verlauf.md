# Verlauf der Funktionen (aus CLAUDE.md)

Die Abschnitte je Version, unverändert aus der früheren CLAUDE.md übernommen
(Aufräumen, Etappe 8). Sie beschreiben, wie etwas entstanden ist – manches
ist inzwischen anders. Den aktuellen Stand je Bereich beschreibt
`docs/bereiche/<bereich>.md`, die festen Regeln stehen in `CLAUDE.md`.
Ältere Pfadangaben meinen die Orte vor dem Umzug (siehe CLAUDE.md, „Ordner“).

## Großer fester Vorrat: jede Sorte 180 Karten (A-068, v0.176.0)

- Paket 002: 148 Witze, 90 Plattdeutsch (Sass bzw. Duden „norddeutsch“, ohne
  ausgedachte Beispielsätze), 89 Rätsel mit eindeutiger Lösung. Damit hat
  jede Sorte 180 feste Karten; Mias KI-Nachschub ist nur noch Reserve.
- Neue Karten vorher gegen alle vorhandenen geprüft
  (`tests/wundertuete/paket002.test.ts`), dazu die bisherigen Ton- und
  Dubletten-Regeln.

## Läden einrichten, Mia verteilt automatisch (A-067, Tafel 151 + Nachtrag, v0.175.0)

- Einmal sagen, wo der Haushalt was kauft: drei Schritte beim ersten Öffnen
  der Einkaufsliste bzw. über „Sortieren ›“ (✕/„Später“, nie Pflicht),
  später unter „···“ → „Meine Läden & was wo“.
- 10 feste Sorten (Wortliste, sonst einmal die KI), Hauptladen, je Sorte bis
  zu 3 Läden; Zuordnung Ausnahme → Sorte → Hauptladen, danach kein „ohne
  Laden“ mehr. Eine Sache mehrerer Läden steht in allen („auch Markt“),
  Abhaken in einem = überall.
- Ergebnis-Karte: Laden antippen = umlegen (Ausnahme). Laden-Seite sortiert
  wie im Laden mit Reitern. Lern-Frage nach zweimal woanders, Ja/Nein.
- Mia-Sätze: „Milch immer bei Rewe“ (Ausnahme), „Getränke kaufe ich bei
  Edeka“, „Obst kaufe ich auf dem Markt und bei Rewe“ (Sorte).
- Die frühere Frage „In welchen Läden kaufst du ein?“ (`LadenFrage`) ist
  durch Schritt 1 ersetzt.

## Demo-Startseite: einfach, zur Uhrzeit, mit Erklärung (A-066, Tafel 150, v0.174.0)

- Beispiel-Inhalte neu: 1–3 Wörter, je Werktag/Samstag/Sonntag drei
  Varianten (zu zweit/allein eigene), nie Kita/Elternabend am Wochenende.
- Zur echten Uhrzeit: laufende Termine 30 Min „läuft“, ab 20 Uhr morgen,
  Essen = nächste Mahlzeit (vor 13 Uhr Mittag), Jetzt-Karte = nächster
  Termin mit vorbereitendem Satz, Sport-Ring nach Wochentag.
- Graue Erklärsätze unter Jetzt-Karte, Kreisen und Kacheln (eigene
  Raster-Zeilen, `hinweisZeilen`), Streifen „Beispiel · tipp überall rein ·
  Hinweise aus“; `wasgibts.beispiel` bekommt das optionale `hinweiseAus`.
- Durchklick `demoTag` (Di 10:15, Sa 16:05), Tests zu 5 Uhrzeiten ×
  Werktag/Wochenende.

## Einkauf M: alle 4 Läden direkt antippen (A-065, Tafel 148 B, v0.173.0)

- `ladenChips` liefert jetzt auch `spalten`: 1–3 Läden eine Reihe wie bisher,
  4 Läden alle als 2 × 2, ab 5 Läden 2 × 2 mit „+n weitere“ als viertem Feld.
- Im 2 × 2 sind die Felder 44 px hoch; Namen brechen notfalls um, statt
  abgeschnitten zu werden. „ohne Laden · Sortieren ›“ bleibt darunter.

## Rätsel in der Wundertüte, vier Kreise oben (A-064, v0.172.0)

- Rätsel und Wundertüte waren zu ähnlich (Frage → Antippen → Lösung): Rätsel
  ist die vierte Sorte der Wundertüte (Witz · Platt · Wissen · Rätsel). Die
  Kachel wechselt die Sorten streng der Reihe nach, nie doppelt; Seite mit
  Filter Alles · Witze · Platt · Wissen · Rätsel (`wundertuete/mischung.ts`).
- Die Rätsel behalten ihren Vorrat (`lib/raetsel`, Paket 001, `wasgibts.raetsel`
  mit „gesehen“, Mias Nachschub und Abgleich) – keine Daten umgezogen, nichts
  gelöscht. Die aktuelle Karte merkt sich `raetsel: true`.
- Mini-Kreis „Rätsel“ und `RaetselFenster` entfallen: oben Sport · Pause ·
  Was los? · Timer (höchstens 4, 64 px, gleich verteilt). Gespeicherte
  Anordnungen verlieren den Rätsel-Kreis still (`sanitizeKreise`).
- Mia: „Gib mir ein Rätsel“ → `app_befehl` „Rätsel“ → Bühne zu, Seite
  `/wundertuete?sorte=raetsel` (`wundertuete/oeffnen.ts`, auch ohne KI).
  Prüfstand: „Rätsel!“, „Gib mir ein Rätsel“, „Hast du noch ein Rätsel für
  die Kinder?“ → app_command; „Nimm Rätsel oben raus“ → „Nimm Was los oben raus“.

## „Was los?“-Kreis immer da, wenn an (A-063, v0.171.0)

- Felix sah den Kreis auf v0.169 erst nicht (der erste Abruf lief erst beim
  ersten Öffnen). Neue Regel: Quelle an + Baustein an → Kreis immer
  (`wasLosSichtbar({ quelle, baustein })`, ohne Blick auf die Einträge). Ist
  in 14 Tagen im Umkreis nichts, sagt das Fenster „Gerade nichts in deiner
  Nähe.“. Die Bearbeiten-Liste zeigt ihn wie bisher, sobald die Quelle an ist.

## Pinnwand flach, Termine ohne „…“ (Tafel 147 B, v0.170.0)

- Pinnwand-Kachel und -Seite ohne inneren Korkrahmen: feine Kork-Punkte über
  die ganze Fläche (`.korkpunkte`, ersetzt `.korkrahmen`, Token
  `--app-kork-rand` entfällt), Ecken wie alle Kacheln, Zettel und Pins bleiben.
- Termin-Zeile der Startseite nie mit „…“: Ort nach Komma bzw. „ · “ klein in
  der zweiten Zeile (`titelUndOrt`), sonst bricht der Titel um; die Zeile
  wächst mit (mind. 30 px). Passt es nicht in die Kachel, steht eine Zeile
  weniger da (zählt bei „+N“), abgeschnitten wird nie.

## „Was los?“: Parser an echten Seiten, Kreis erscheint (v0.169.0)

- www.kreis-oh.de war freigegeben: echte Seiten nach
  `tests/fixtures/kreis-oh/` (Liste, Gemeinde Eutin erste/letzte Seite,
  Detailseite, robots.txt), Parser daran gebaut (`parseListe`,
  `parseDetail`, `parseGemeinden`, `entitaeten`, `dekodiere`),
  `PARSER_BEREIT = true`.
- Die Liste nennt keinen Ort → Abfrage je Gemeinde (Suchformular
  `ort=247.<n>`) mit Zeitraum heute bis +14 Tage, die Gemeinde ist der Ort.
  Probelauf: 35 Anfragen in 45 s, 203 Veranstaltungen (alle im Zeitraum).
  Höchstens 70 Seiten bzw. 95 s je Lauf, 1 Anfrage pro Sekunde.
- Seiten sind ISO-8859-15: `kreisHolen` dekodiert selbst (sonst kaputte
  Umlaute). Links ohne Such-Angaben.
- Erster Lauf gleich nach der Auslieferung: `/api/region` holt den Abruf
  einmal nach (`after`, `ersterLauf`), solange der Status fehlt oder
  „wartet“ – der Kreis „Was los?“ erscheint beim ersten Öffnen, nicht erst
  um 5 Uhr.

## Fenster: Schließen trifft nie ein neues Öffnen (v0.168.0)

- Offener Punkt: Fenster mit ✕ schließen und binnen ~300 ms wieder öffnen →
  ging gleich wieder zu. Ursache in `core/fensterVerlauf.ts`: Das eigene
  Zurück (Eintrag des geschlossenen Fensters entfernen) kam als `popstate`
  manchmal erst, nachdem das neue Fenster seinen Eintrag angelegt hatte
  (Warten nach 1 s vorbei, oder der Weg „Auswahl geht selbst zurück“ ganz
  ohne Warten), und das neue Fenster hielt es für „Zurück“.
- Jetzt wird jedes eigene Zurück vorgemerkt (3 s Frist); dessen `popstate`
  schließt kein Fenster. Auch der Weg „Auswahl geht selbst zurück“ läuft über
  das Entfernen mit Warten. Tests: ✕ und wieder öffnen nach 0–600 ms,
  spätes `popstate`, Auswahl mit eigenem Zurück.

## „Was los?“ (A-055, v0.167.0)

- Auftrag A-055 (Tafel 142, Wortlaut `docs/auftraege/A-055-was-los.md`):
  Baustein „Tipps aus der Region“ heißt „Was los?“ (Schlüssel `regiontipps`
  bleibt), raus aus `LAUNCH_AUS`, Standard an für Wohnorte in Ostholstein
  (Bausteine v8 mit `aus` = selbst ausgeschaltet; v7 kam mit Durchatmen).
- Neuer Bereich `region`: Orte/Umkreis, Kategorien, Zeitformate, Modell,
  Kreis-Abruf (`region/kreisOh/`, Parser wartet auf echte Beispielseiten –
  www.kreis-oh.de war aus der Arbeitsumgebung gesperrt), Server mit
  Supabase-Tabelle `region_events` + `region_status`, Cron 5:00 Berlin,
  Not-Schalter `REGION_TIPPS_QUELLE`, Sperrliste, öffentliche Route
  `/api/region` (1 Std.).
- Fenster „Was ist los in <Wohnort>?“, Detail mit Kalender/Pinnwand/Link,
  Einstellungen „Was los?“ (Umkreis 5/15/30, Kategorien; `wasgibts.regiontipps`
  v2), „Für Entwickler“ mit „Quelle liefert nichts“, Mia-Werkzeug `was_los`
  mit 10 Prüfstand-Sätzen, `wochenendTipps` für die Freitags-Karte.
- Mini-Kreis „Was los?“ (A-050) hängt an `useWasLosSichtbar()` und öffnet
  das Fenster; die Freitags-Karte „Wochenende planen?“ (A-054) zeigt
  höchstens 2 Veranstaltungs-Chips (`wochenendTipps`).
- Alte lila Tipps-Ebene versteckt (`tipps/alt.ts`), nicht gelöscht.

## Startseite neu: Mini-Kreise, Fenster, Einkauf M, Korkrahmen (A-050, v0.166.0)

- Auftrag A-050 (Paket P4, Tafeln 137, 140, 141, 143; Wortlaut
  `docs/auftraege/A-050-minikreise-durchatmen.md`). Es gilt „Mini-Kreise
  final“ (Tafel 143) samt Nachtrag „kein Schild“ – Tafel 136 und Teil 1/2 der
  Tafel 137 sind ersetzt, die Fenster aus 137 bleiben.
- Mini-Kreise oben (`heute/kreise.ts`, `components/heute/kreise/`): direkt
  unter Kopf bzw. Jetzt-Karte, über allen Kacheln, nicht wischbar. Bis zu 5
  Kreise gleich verteilt (5 = 56 px, sonst 64 px), je EIN Wort. Standard Sport ·
  Pause · Was los? · Rätsel · Timer. Nur Sport hat einen Wochen-Ring (Stücke =
  Ziel, geschafft grün), der laufende Timer zeigt die Restzeit im Kreis und
  rückt nach vorn – sonst keine Schilder, Zahlen oder Plaketten. „Was los?“
  bleibt ausgeblendet, bis A-055 `wasLosVerfuegbar()` anbindet.
- Fenster: Sport (Stempel, Woche planen → Termin im Raum „Ich“), Timer
  (laufende Timer, 6 Felder, ein Tipp startet), Pause öffnet Durchatmen
  (A-051), Rätsel das Rätsel-Fenster (A-052).
- Bearbeiten: Abschnitt „Kreise oben“ (an/aus, ziehen, „Höchstens 5 Kreise“);
  Mia: Werkzeug `kreise_anpassen`, ohne KI „Nimm Rätsel oben raus“, „Timer
  nach vorn“ (Prüfstand +4 Sätze).
- Startseite v10: XS-Kacheln Sport/Timer → Kreise, Im Haus aus der Anordnung
  (A-032 entschieden: bleibt unter Essen, als Kachel nur wählbar S/M), nichts
  gelöscht. Neuer Standard je Haushalt nach Tafel 140, Knopf „Neue
  Standard-Ordnung übernehmen“. Essen + Einkauf sind nur noch ein Paar, wenn
  beide S sind. Ein gestarteter Timer blendet keine Kachel mehr ein; Sport
  von Mia schaltet den Sport-Kreis an. Neue Nutzer: Sport an.
- Einkauf M: eine Reihe Laden-Chips nebeneinander, gleich breit, „+n
  weitere“, nie abgekürzt (gemessen per Canvas). Beispiel-Einkauf ohne
  Rossmann (Tafel 140).
- Pinnwand mit Korkrahmen (Tafel 141 A) in Kachel und auf der Seite (statt
  der grauen Kühlschranktür), 8 Farben, hell/dunkel, Schlicht nur Rand.
- Tests: `tests/heute/kreise.test.ts`, `tests/heute/kreisFenster.test.ts`,
  Durchklick `e2e/ablaeufe/kreise.mjs` (`kreiseOben`, `kreisFenster`,
  `kreiseBearbeiten`, `kreiseMigration`), `einkaufChips`, `timerKreis`.

## Notizen-Vorschau + Mia-Zubehör (A-060 Block B, v0.165.0)

- Notizen-Kachel (Punkt 3, Tafel 144): die neueste Notiz in XS (und als
  erste Zeile in S/M) in bis zu 2 Zeilen, Umbruch an Wortgrenzen, die zweite
  läuft weich aus (Maske statt „…“, `NotizVorschau`, `data-ausblenden`);
  `abgeschnitteneTexte` erlaubt das nur mit Maske und nie seitlich
  (Gegenproben im Durchklick `notizVorschau`, SE/15 Pro/Pixel 7).
- Mia-Zubehör (Punkt 4, darin aufgegangen A-058, Nachtrag vom 29.10.,
  Wortlaut `docs/auftraege/A-058-zubehoer-sonne-blaetter.md`).
- Sonnig großzügiger und als Tagesentscheidung: Code ≤ 2 oder ≥ 30
  Sonnenminuten je Stunde, sonniger Tag ab der Hälfte der hellen Stunden;
  Sonne bzw. Sonnenbrille dann den ganzen hellen Tag, Schirm bei Regen bald
  weiter mit Vorrang. Gemerkt pro Tag in `wasgibts.miazubehoer` v1 (neu im
  Speicher-Verzeichnis, pro Gerät, nicht in der Sicherung).
- Das einzelne fallende Blatt entfällt. Neu: Herbstblätter bei Wind
  (Sep–Nov, Wind ≥ 25 / Böen ≥ 35 km/h), 7 Blätter in 2–3 s an Mia vorbei,
  Mia kneift die Augen (neue Augenform `av-kneifen`); Öffnen alle 30 Min,
  Antippen alle 5 Min (dann auf der Bühne), Sturm = Wackeln + Blätter.
- Daten: Wind, Böen und Sonnenminuten kamen schon je Stunde aus Bright Sky
  (DWD) bzw. Open-Meteo; keine neue Quelle.

## Durchatmen verständlich, keine Roboterstimme (A-061, v0.164.0)

- SOFORT-Fix von Felix (Tafel 146): Jede der 12 Übungen erklärt sich vorher
  auf einem hellen Start-Bildschirm (Symbol, „AUGEN · 1 MIN“, Titel, 3
  nummerierte Schritte, „Wofür?“, Stimme + Klang / Nur Klang / Still,
  „Los“). Kein Sofort-Start mehr; erst nach „Los“ und 3 s dunkel (auch die
  Handy-Pause). Neue Felder `vorher`, `wofuer`, `ende` in
  `content/durchatmen/uebungen.json`.
- Dunkel: Ring mit Symbol und Restzeit, darunter die Anweisung groß (26 px,
  weich überblendet) und klein „Mia sagt dir, wenn die Minute um ist.“.
  Ende hell mit Satz je Übung („Eine Minute nur für deine Augen.“).
- Keine Roboterstimme: Durchatmen spricht nie mit der Stimme des Handys
  (`speak` mit `ersatz: false`); ohne Datei nur Klang.
- Mias Ansagen entstehen von selbst: `/audio/durchatmen/<id>.mp3`
  (Weiterleitung auf `/api/durchatmen/ansage/[datei]`) liefert aus dem Bucket
  oder erzeugt einmal (nur IDs aus `ansagen.json`, eine Erzeugung je Datei
  gleichzeitig); nachts Vercel Cron für alle fehlenden. Knopf „Ansagen
  erzeugen“, POST-Route und `scripts/ansagen-erzeugen.mjs` entfallen, unter
  „Für Entwickler“ steht nur noch der Stand (`AnsagenStand`).

## Jetzt-Karte nur mit Nutzen für heute, Wochenende freitags (A-054, v0.163.0)

- Auftrag A-054 (SOFORT, 29.10., ohne Tafel): Die Jetzt-Karte zeigt nur noch,
  was man heute braucht und die Kacheln nicht zeigen – EIN Thema, höchstens
  zwei, aus einer festen Rangliste (`JETZT_RANG`, `jetztThemen` in
  `lib/heute/jetztTopics.ts`): Erinnerung, Gleich (< 60 Min, Notiz bzw.
  „Losgehen um …“ mit festem Vorlauf 15 Min bei Terminen mit Ort), Wetter mit
  Folge, Essen mit Folge (Knopf „Auf die Liste: Eier“ über das
  Wochenplan-Angebot), Geburtstag/Jahrestag aus dem Kalender, Neu vom
  Haushalt, Timer/Kochmodus/Pause, Wochenende, abends ab 18 Uhr „Morgen · Fr:
  8:00 Laufen“, leise „Kurz durchatmen?“ (A-051, Rang 70), ganz hinten
  selbst eingeschaltete Bausteine. Nichts dran =
  keine Karte.
- Weg: Spruch des Tages samt Satz-Pool (`mia/denktmit/sprueche.ts`, rund 200
  Sätze, u. a. „Donnerstag. Das Wochenende winkt schon.“), „Alles ruhig. Ich
  sag Bescheid.“, „Morgen ist ruhig.“/„Für morgen ist alles sortiert.“ ·
  „Schönen Abend.“, „Moin!“-Morgengruß, Morgen-Info (`morgenInfo`), „Genießt
  die Zeit“, gelerntes Interesse, Wochencheck- und Kühlschrank-Check-Thema
  (der Check ist jetzt eine Karte von „Mia denkt mit“), Heimweg-Einkauf,
  Kochstart, Absprache, Aufgaben/Ideen, Pinnwand-Neu, Überschneidung/Packen.
- Neu: „Wochenende planen?“ nur freitags 12–20 Uhr (`lib/heute/wochenende.ts`)
  mit Chips aus eigenen Daten, „Mit Mia planen“ und „Später“.
- Karte bricht um statt „…“ (auch `stormForPlan` und die Neuigkeiten aus dem
  Haushalt kürzen nicht mehr), Symbole Uhr/Wolke/Topf/Geschenk statt Glitzer.
- Tests: `tests/heute/jetztThemen.test.ts` neu (Rangliste mit `now()`),
  `jetztMorgens`/`abends` entfallen; Durchklick `jetztKarte` neu (SE/15
  Pro/Pixel 7).

## Kaputt: Notizen-Kachel, Wundertüte zum Umdrehen, ••• beim ersten Tippen, Wischen nur klar (A-059, v0.162.0)

- Sammel-Auftrag 29.10. mittags, Block A + D (Wortlaut
  `docs/auftraege/A-059-sammel-mittags.md`, Tafel 144 und 145).
- Notizen-Kachel: Antippen der ganzen Kachel (Zeile, Leertext, Fläche) öffnet
  in allen Größen immer die Notizen-Seite, nur der Stift legt an. Leere Seite:
  „Noch keine Notizen. Tipp aufs Plus oder sag Mia: „Notiz: …““. Ursache:
  der Leertext war ein Knopf für die Schnelleingabe, Zeilen führten zur Notiz.
- Wundertüte (Tafel 145 ersetzt „Lösung im weißen Feld / Antippen für mehr“
  aus Tafel 144): Kachel vorn nur die Frage, Antippen dreht die Karte um
  (0,6 s), hinten die Lösung im weißen Feld und „Mehr ›“ zur Seite. Seite und
  Rätsel-Fenster: Lösung nach jeder neuen Karte verdeckt, „Noch eine“ bzw.
  „Noch eins“ vorher hell. Keine Silbentrennung mehr („De-ern“; Ursache
  `hyphens-auto`), Frage vorn möglichst in 2 Zeilen, Schrift immer in voller
  Farbe, Filter Alles · Witze · Platt · Wissen (umbrechen statt abschneiden).
- Menü „•••“ → „Einstellungen“ beim ersten Tippen: Das Menü-Fenster nahm 300 ms
  nach dem Schließen seinen Verlaufseintrag per `history.back()` weg. Lud die
  Zielseite länger (Kaltstart), kam dieses Zurück vor dem `pushState` der
  Navigation und brach sie ab. Jetzt: Zeilen mit `href`, erst Eintrag weg,
  nach dem `popstate` navigieren (`fensterVerlauf.danach`, `nachDemFenster`).
- Wischen: Seitenwechsel nur bei klarer Geste (nicht unten, nicht am linken
  Rand, |dx| ≥ 2 · |dy|, ≥ 60 px), `touchcancel` wechselt nie, Hintergrund
  binnen 500 ms nach dem Wisch nimmt den Wechsel zurück. Ursache: der Wisch
  vom unteren Rand zum Schließen der App kam als schräger Seitenwisch an
  (Richtung ab 1,2:1, beim Abbrechen wie Loslassen gewertet).

## Eingebaute Rezepte liefern ihre Zutaten (A-057, v0.161.0)

- Auftrag A-057 (Kleinkram von Felix), betrifft A-040/A-046: Die
  Einkaufsliste kannte nur Rezepte aus dem Kochbuch. Gerichte mit
  eingebautem Rezept („Wok-Nudeln mit Hähnchen“, ID „k:…“ oder nur der Titel
  aus der Wochenkarte) lieferten keine Plan-Zutaten, und „Nehmen“ in der
  Rezept-Vorschau nahm ersatzweise, was die Vorschau „auf die Liste“ nannte
  (nur die Hauptzutaten).
- EINE Stelle: `zutatenFuerGericht` (`einkauf/angebot/rezeptZutaten.ts`):
  eigenes Rezept über die ID, sonst eingebaut über die ID bzw. den Titel
  (`cookRecipe`, `rezeptIdFuer`); Klammer-Erklärungen fallen weg („Reis (am
  besten vom Vortag)“ → „Reis“). `buildShoppingList` nimmt die Zutaten von
  dort – damit gilt das Angebot „Für deinen Wochenplan“ samt Zusammenführen
  (eine Zeile, „für Wok-Nudeln mit Hähnchen, Nasi Goreng · Mo“, Mengen
  addiert als Hinweis), Grundsachen blass und „Haben wir schon“ wie bisher.
  Auch ein Kinder-Wunsch mit dem Namen eines eingebauten Rezepts bringt
  dessen Zutaten mit.
- „Nehmen“: Die Essen-Kachel rechnet `needs` jetzt über `bedarfFuerGericht`
  aus allen Zutaten des Rezepts minus „im Haus“ (und ohne Grundsachen); ohne
  bekannten Vorrat kein Abgleich, ohne Rezept wie bisher die Vorschau. Nicht
  im Plan (spontan): die Namen mit der Rezeptmenge als Hinweis.
- Speicherformat unverändert. Tests: `tests/einkauf/rezeptZutaten.test.ts`.

## Rätsel und Wundertüte: Noch eine, nie doppelt (A-052, v0.160.0)

- Paket C des Gesamtauftrags vom 29.10. (Wortlaut
  `docs/auftraege/A-050-minikreise-durchatmen.md`, Teil 5 und 6, Tafel 137
  Bild 4 und Tafel 140). Ersetzt A-049 („eine Karte pro Tag“, nie gemergt;
  übernommen sind feste IDs in Paketen, „gesehen“ im Haushalt, Ähnlichkeit,
  Route mit Guard, `alltagsModell()`).
- Rätsel ziehen aus: eigener Bereich `lib/raetsel` mit Fenster
  (`components/raetsel/RaetselFenster.tsx`): „Kinder raten zuerst“, Frage
  27 px, Lösung erst nach Antippen im gestrichelten Kasten, „Noch eins ›“.
  Paket `content/raetsel/paket-001.json` mit 91 Rätseln (55 alte + 36 neue).
  Den Mini-Kreis bindet Paket A an; bis dahin Test-Öffner in „Für Entwickler“.
- Wundertüte nur noch Witze (32 neue), Plattdeutsch (90), Angeberwissen
  (180, Schätz mal dazu): `content/wundertuete/paket-001.json`. Kachel ohne
  Punkte und ohne Drehen: Titel je Sorte („Platt för Plietsche“ mit Anker,
  sonst „Wundertüte“ mit Geschenk), kleine Sorte, groß Wort/Witz/Frage,
  darunter Pointe bzw. „Antippen für die Lösung“; Antippen öffnet die neue
  Seite `/wundertuete` (Lösung groß, Filter, „Noch eine ›“, „Nie doppelt.
  Mia legt immer neue nach.“). Tischrunde, Schätz mal (als Sorte), Wer
  zuerst, Heute vor 100 Jahren entfallen.
- Nie doppelt (`wundertuete/vorrat.ts`, für beide Bereiche): gesehene IDs,
  ältestes Paket zuerst, Sorten anteilig gemischt; Mias Nachschub per KI nur
  für Witze und Rätsel (`/api/nachschub`, 20 im Voraus, Ähnlichkeitsabgleich,
  höchstens 6 Anfragen am Tag je Gerät); ohne Vorrat „… kommen bald.“.
- Speicher `wasgibts.wundertuete` v2 (Migration v1: alles Gezeigte gesehen)
  und neu `wasgibts.raetsel` v1 (übernimmt die in der Wundertüte gezeigten
  Rätsel); im Haushalt geteilt über `entries` (Übersetzer `wundertuete`,
  `raetsel`), keine neue Tabelle.
- Für Entwickler: Vorrat je Sorte, unter 50 Platt bzw. Angeberwissen „Paket
  nötig (n übrig)“.
- Datenschutz: Datenkarte, Anbieter (Anthropic), Datenschutzerklärung.

## Durchatmen + Mia leitet an (A-051, v0.159.0)

- Paket B des Gesamtauftrags vom 29.10. (A-050 bis A-053, Tafel 138/139):
  Baustein `durchatmen`, Standard an (Bausteine v7: beim Update einmal an),
  von Felix gewollte Ausnahme vom Launch-Stopp.
- 12 feste Übungen (`content/durchatmen/`), Fenster „Durchatmen“ mit
  „Passt gerade“ (Tageszeit, Lieblinge öfter), Sorten, Herz; Vollbild je
  Sorte, nach 3 s dunkel (Handy-Pause sofort), Antippen = hell, Ende ohne
  Zähler. „Eine Sache“ legt eine Aufgabe ganz oben an, „Kopf leeren“
  sortiert (KI zuerst, sonst Regel-Weg).
- Stimme und Klang: Art „Stimme + Klang“ / „Nur Klang“ / „Still“ pro Gerät
  (`wasgibts.durchatmen` v1), Ansagen über `speak` (Datei oder Handy-Stimme
  langsamer und leiser), Lolas Ansagen einmal auf dem Server erzeugen
  (`/api/durchatmen/ansagen-erzeugen`, Knopf auf „Für Entwickler“) in den
  öffentlichen Bucket `durchatmen-ansagen` (Migration, Manifest, Hash im
  Dateinamen, nur Fehlendes),
  Web-Audio-Klang, Wake Lock, Vibration, Stumm-Schalter-Hinweis einmal.
- Jetzt-Karte: Thema `durchatmen` (höchstens 2× am Tag, nie nachts, nie
  Push), Mia: `app_befehl` + Sofort-Weg, 5 + 12 Prüfstand-Sätze. Einstieg
  bis zum Kreis (A-050): Einstellungen → Durchatmen.

## Startseite kompakter (A-048, v0.158.0)

- Auftrag A-048 (SOFORT, Tafel 135, Wortlaut
  `docs/auftraege/A-048-startseite-kompakter.md`) nach Screenshots vom 29.10.
  07:03: unter Termine und Aufgaben viel Leerraum, Einkauf nur 2 Läden +
  „+4“, Sport und Im Haus XS ohne Bild, „8:00 ·Laufen“.
- Höhe = Inhalt: `zeilenPlan` (`lib/heute/raster.ts`) macht ein Band aus zwei
  Grund-Zeilen, in dem nur Listen-Kacheln liegen (Termine, Aufgaben, Einkauf,
  auch im Paar mit Essen), zu EINER Zeile `auto`. Termine/Aufgaben/Einkauf
  unten 14 px (`pb-3.5`). Neben Kacheln mit fester Höhe bleibt die Reihe fest
  (gleich hoch). Raster-Plätze XS · S · M unverändert, kein Speicherformat
  geändert. Wasserzeichen S/M höchstens Kachelhöhe − 10 px.
- Klarstellung von Felix zu Tafel 135: auch Einkauf S und Notizen S/M
  wachsen und schrumpfen mit dem Inhalt (1/2/3 Zeilen, mehr = 3 + „+n
  weitere“, leer = ein Satz in einer Zeile, so hoch wie ein Eintrag), Liste
  neben anderer Kachel = beide die Höhe der größeren. Leer-Zeilen 30 px
  (ganz tippbar, `data-zeile`), Einkauf leer „Was braucht ihr?“; getestet
  mit 0, 1, 2, 3, 5 Einträgen (Unit-Test und Durchklick `listenHoehen`).
- Einkauf: bis zu 3 Läden (meiste Sachen zuerst, Gleichstand „Meine
  Läden“), „+n“ erst ab dem 4., darunter „n ohne Laden · Sortieren ›“
  (`kachelLaeden`, `tileRows`).
- Wasserzeichen auch in XS (110 px, 11 %/10 %, `--app-wasserzeichen-xs`):
  Notizen, Im Haus (Kühlschrank), Timer; Text in seiner Nähe freigestellt.
  Sport XS bekam die Stempel-Variante (zwei kleine Stempel, „Heute“ /
  „8:00 · Laufen“, `xsFelder`/`xsZeilen`), daher dort kein Wasserzeichen.
- Kleinkram: „8:00 ·Laufen“ (Leerzeichen am Ende eines flex-Kinds) behoben;
  Notizen-Leertext überall „Schnell notieren …“ (Nachtrag Tafel 140: auch XS,
  auf der Notizen-Seite und im Schnellfeld, ohne Stift im Text – der Stift ist
  nur der Knopf oben rechts), markiert mit `data-platzhalter-text` und nur
  dort vom „…“-Verbot aus A-045 ausgenommen.
- Prüfungen angepasst: `rasterHoehen`/`pruefen` messen bei
  `data-hoehe="inhalt"` Breite und Mindesthöhe statt fester Höhe,
  `rasterBuendig` erwartet Termine/Aufgaben niedriger als die Pinnwand; neuer
  Durchklick `startseiteKompakt`, Tests `tests/heute/hoeheInhalt.test.ts`,
  `einkaufKachel`, `stempel`, `wasserzeichen`.

## Mia hört von Anfang an und versteht mehrere Sachen (A-056, v0.157.0)

- Auftrag A-056 (SOFORT, Vorrang, Wortlaut `docs/auftraege/A-056-mia-hoert-sofort.md`),
  betrifft v0.143 (A-019/A-026): Am Anfang gingen Wörter verloren, und
  „Ähm, Aufgabe heute dazu: Maler kommt und Bank anrufen“ wurde eine
  einzige Aufgabe mit Füllwörtern im Titel.
- Kein Wort verlieren: Vorlauf (`begleitung/ohrPuffer.ts`, rein; Browser-Teil
  `begleitung/ohrMikro.ts`). Mikrofon schon im Antippen (Mia-Knopf in der
  Leiste bzw. Mia auf der Bühne), Ringpuffer 8 s, parallel Schlüssel und
  Websocket; die Runde nimmt den Puffer zuerst, dann live. Scheitert live,
  nachdem schon etwas zu hören war, übernimmt die eigene Aufnahme den
  Puffer (WAV 16 kHz an `/api/hoeren`), sonst wie bisher der Browser.
  Schlüssel vorgewärmt (App auf, Zurückkommen, Bühne auf, nach jedem
  Verbrauch; 13 Min. frisch, gilt 15). „Ich höre“-Ring und Tonwelle erst bei
  echtem Ton, dazu kurz Vibrieren bzw. ein leiser Ton. Mikro-Protokoll:
  „Ohr (live): Tippen→Mikro … · →Verbindung … · →erstes Wort …“.
- Mehrere Sachen: Füllwörter weg vor jeder Auswertung (`fuellwoerter.ts`),
  im Regel-Weg und bevor die Nachricht an die KI geht. Sofort-Weg nur bei
  GENAU EINER Sache (`aufteilen.ts` `mehrteilig`). KI-Prompt und Werkzeuge:
  Aufzählungen getrennt, gemischt Termin + Aufgabe, Titel sauber; der
  Server räumt Titel nach (`titelSauber`). Ohne KI teilt `mehrereOhneKi`
  eindeutig auf (sonst merken und nachholen). Ein „Rückgängig“ nimmt alle
  Einträge einer Nachricht zurück, auch in „Mia hat schon …“.
- Raum: Nur-ich-Einträge „Nur für dich. Tippen zum Ändern.“ statt „Nur für
  dich gewählt.“; kein „Privat“, wo „Ich“ gemeint ist (geprüft).
- Prüfstand: 34 neue Sätze (`pruefstand/aufzaehlung.ts`, jetzt 269), ohne KI
  34/34; Sofort-Prüfstand mit neuen Kurzsätzen. Tests `hoertSofort.test.ts`
  (erstes Wort in den ersten 500 ms bleibt, Gegenprobe ohne Vorlauf),
  `mehrereSachen.test.ts`; Durchklick `hoertSofort`, `ohrLivePufferUebernimmt`.

## Mias Wundertüte (A-022, v0.156.0)

- Auftrag A-022 (Tafel 116, Wortlaut `docs/auftraege/A-022-wundertuete.md`),
  ersetzt „Kachel Angeberwissen“. Erst zurückgestellt bis nach dem
  Feature-Stopp, mit der Änderung vom 28.10. direkt nach der Sport-Kachel
  (A-029) gebaut: von Felix gewollte Ausnahme von „keine neuen Funktionen“.
- Neue Kachel `wundertuete` (S/M) mit Baustein `wundertuete`: für neue
  Nutzer an (`DEFAULT_ON`, `ersteStartseite`: S direkt hinter Essen +
  Einkauf), bestehende behalten Bausteine und Anordnung (`NUR_NEU` in
  `launchSchnitt` und `homeForHaushalt`); keine Format-Migration nötig, die
  Kachel kommt in alten Anordnungen still unsichtbar dazu (`sanitizeHome`).
- Sieben Sorten (Angeberwissen, Platt för Plietsche, Rätselstunde, Heute vor
  100 Jahren, Tischrunde, Schätz mal!, Wer zuerst) mit Farbe aus der
  Palette über `data-tone`, Hinweis unten links, drei Punkte = Anzeigen.
  Antippen dreht um (0,8 s, reduced-motion = Überblenden), nochmal = Neues,
  nach 3 Anzeigen von selbst. Passendes zuerst (Regen, Jahreszeit,
  Wochentag, Gericht, Feiertag, heute vor 100 Jahren), nie dieselbe Sorte
  zweimal, keine Wiederholung bis die Sorte durch ist.
- Pool von 459 geprüften Einträgen in `src/lib/wundertuete/data/` mit Quelle
  je Fakt; Speicher `wasgibts.wundertuete` v1 (nur IDs, in der Sicherung).
- Mia: Werkzeug `wundertuete_karte` (liest nur aus dem Pool, Rätsel mit
  Knopf „Lösung“), 6 neue Prüfstand-Sätze. Beispiel-Tag: feste Karte
  Angeberwissen. Doku `docs/bereiche/wundertuete.md` (Regeln, Zählung,
  Nachfüllen als Monats-Auftrag „Wundertüte nachfüllen“).
- Neu aufgesetzt auf v0.155 (Raster XS · S · M, Wasserzeichen, drei Räume,
  Ergebnis-Karten): Kachel S/M ohne Platz im Tafel-119-Standard,
  Wasserzeichen Geschenk nur vorne. Nichts abgeschnitten (A-045): Frage und
  Antwort mit Schrift in Stufen statt `line-clamp`, Kopf mit Kurzform bzw.
  nur Symbol (`useEinpassen`), Sorte „Wer zuerst“ ohne „…“. Durchklick
  `wundertueteAlle` (alle Karten vorne/hinten, S/M, iPhone SE),
  Wundertüte in `nichtsAbgeschnitten`. Beispiel-Tag ohne eigenes Schild
  „Beispiel“ (nur VoiceOver, Tafel 119). Fakten nachgeprüft: Hamburgs Brücken
  und 500 g Spaghetti vorsichtiger formuliert.

## Aufgeräumt (v0.25)

- Kein Alt-Modus mehr. Daten nur über das zentrale Speicher-Verzeichnis (mit
  Version/Migration); „Daten sichern/wiederherstellen“ muss immer
  funktionieren. Jeder behobene Fehler bekommt einen Test; `npm test` vor
  jedem PR. Dateien möglichst unter 600 Zeilen.
- Speicher-Verzeichnis `src/lib/core/storage.ts` (`STORAGE`: Schlüssel, Zweck,
  Version, Ort der Migration, local/session, `backup`). `createLocalStore`
  nimmt nur `StorageKey`; direkte `localStorage`-Schlüssel ebenfalls als
  `StorageKey` typisieren. Nicht mehr genutzte Schlüssel stehen in
  `RETIRED_KEYS` und werden beim Start gelöscht (`removeRetiredKeys`,
  KitchenHelper; alte Termine erst nach der Übernahme, alter Vorlese-Schalter
  nach `adoptLegacySpeech`).
- Daten sichern/wiederherstellen (`src/lib/core/backup.ts`, Einstellungen →
  Daten & App): Datei mit allen `backup`-Schlüsseln (Teilen-Menü bzw.
  Download); Wiederherstellen zeigt vorher „3 Termine, 5 Aufgaben, …“
  (`backupSummary`) und fragt nach; Zugangscode, Zähler und Geräte-Kennung
  bleiben auf dem Gerät. Der Icon-Hinweis (`iconChangeHint`) verweist darauf.
  „Daten & App“ geht auch ohne Profil; auf dem Hallo-Bildschirm steht leise
  „Ich habe eine Sicherung“ (nach dem Neu-Hinzufügen zum Home-Bildschirm).
- Durchklick und Bildvergleich im Projekt (seit dem Aufräumen, Etappe 0):
  `npm run durchklick` (Ordner `e2e/`, Playwright, echte Touch-Gesten über
  CDP; startet selbst einen Testserver nach `npm run build`, oder `E2E_BASE`),
  `npm run bilder` (96 Bildschirmfotos, `-- --basis` = Ausgangslage) und
  `npm run bilder:vergleich` (Abweichung > 0,1 %), `npm run messen` (JS je
  Seite). Bilder liegen in `.bilder/` (nicht im Repo).
- Tests: Vitest (`npm test`, je Bereich ein Ordner `tests/<bereich>/` wie in
  `src/lib`, plus `tests/app/` für Code- und Textregeln). Gemeinsame Hilfen in
  `tests/helpers.ts`: `at()`/`atFresh()` (feste Zeit, Europe/Berlin),
  `memoryStorage()`, `fakeWindow()`/`noBrowser()` (Browser-Ersatz mit Speicher,
  Verlauf, Scrollhöhe), `termin()`/`aufgabe()`. `npm run test:abdeckung` =
  Abdeckung von `src/lib` (ohne `use*.ts` und reine Browser-Schnittstellen),
  Untergrenze 80 % Zeilen. In Regex nie `\b` direkt an ä/ö/ü/ß (dort keine
  Wortgrenze) – stattdessen `(?<![a-zäöüß])` bzw. `(?![a-zäöüß])`. Ungenutzter Code: `npx knip`
  (Konfiguration `knip.json`; `@public` im Kommentar = bewusst für Tests/Push).
- Neue Version: Der Service Worker wartet; die App zeigt oben „Neue Version
  da – Antippen zum Aktualisieren“ (`ServiceWorkerRegistration`, Nachricht
  `SKIP_WAITING`, beim Öffnen/Zurückkehren `update()`); erst das Antippen lädt
  neu. Einstellungen ganz unten „Version 0.25 · Stand {Datum}“
  (`versionLabel()`, Datum beim Bauen über `BUILD_DATE` in `next.config.ts`).
- Erst bei Bedarf geladen: das Gespräch (`HelperPanel` über `next/dynamic`, im
  Leerlauf vorgeholt – mit Mails, Backstube, Supermarkt) und die Tipp-Sammlung
  (nur wenn Tipps/Wochenend-Ideen an sind).
- Chat aufgeteilt: `chatTypes.ts` (Typen), `localRules.ts` (feste Regeln
  ohne KI, `RuleContext`), `mailRules.ts`, `ChatTurnItem.tsx`, `ChatBits.tsx`.
  Profil: `profile.ts` (Modell, Hilfen) + `profileStore.ts` (Migration,
  Speichern). Testmodus: `mock.ts` + `mockAlltag.ts` + `mockShared.ts`.
  `onboarding/engine.ts` ist nur noch „neue Person“ im Chat.
- „Kladde“ heißt im Code überall „Schnellnotiz“ (`schnellnotiz.ts`,
  `Schnellnotiz.tsx`, Werkzeuge `schnellnotiz_schreiben/_aufraeumen`, Op
  `set_schnellnotiz`); seit v0.32 ist sie die angeheftete Notiz
  „Schnellnotiz“ (`schnell: true`), `wasgibts.kladde` wird nur noch einmal
  übernommen. Lotte versteht „Kladde“ weiter.
- Tippflächen mindestens 44 × 44 px: kleine Knöpfe bekommen die Klasse `hit`
  (unsichtbare Fläche, Aussehen bleibt; `chipClass` hat sie schon).
- Sicherheit: KI-Routen prüfen Zugangscode und Limits (`guard.ts`), Wetter hat
  ein Limit pro IP (ohne Code, weil es auch ohne KI gehen muss). Vor jedem PR
  `.next/static` nach `sk-ant` durchsuchen.

## Fundament (Neustart, v0.9)

- Ordner nach Bereichen in `src/lib/`: `core` (Zeit `now.ts`, Speicher
  `localStore.ts`/`useExternalStore.ts`, Feature-Flags `features.ts`,
  Datenmodell `entries.ts`, Navigation, Toast, Ansicht, Aktivität, Termine,
  Wetter), `lotte` (KI-Client, Engine, Werkzeuge, Prompt, Sprache ein/aus,
  Chat-Vorschläge), `essen` (Plan, Rezepte, Ideen, Vorrat, Tipps, Backstube …),
  `einkauf` (Einkaufsliste, Plus), `aufgaben` (Termine & Aufgaben),
  `einstellungen` (Profil, erster Start `welcome.ts`). Oberfläche in
  `src/components/` nach Bildschirmen.
- Bausteine (v0.13, `src/lib/core/features.ts`, Speicher
  `wasgibts.funktionen` v2 `{ on: Feature[] }`): `BAUSTEINE` = Wochenplan,
  Vorrat & Tiefkühler, Rezepte, Backen mit Timern, Spontan-Ideen (inkl.
  `/ideen`), Tipps, Wochenend-Ideen, Kochstil & Vorlieben, Wie oft melde ich
  mich? – je Icon, Name, Satz, `where` ("Der Wochenplan steht jetzt rechts
  unter Essen."). `useFeature()`/`featureOn()`/`setFeature()`/
  `unlockFeature()`; Seiten eines Bausteins über `FeatureGate` (auch mehrere,
  z. B. `/kochbuch` = Rezepte oder Backen). Einstellungen → "Bausteine"
  (`/profil/bausteine`, `BausteineView`: An/Aus mit Hinweis und Rückgängig).
  Eingeschaltet im neuen Design: Wochenplan → "Ganze Woche planen" auf Essen
  (+ Standardwoche in den Einstellungen), Rezepte/Backen/Vorrat/Spontan →
  Abschnitte auf Essen (`BausteinSections`), Vorrat zusätzlich als Kachel
  "vorrat" auf Heute (über "Startseite anpassen" ein-/ausblendbar, ohne
  Baustein nicht in der Liste), Tipps/Wochenend-Ideen → nur über den einen
  Satz oben auf Heute an ruhigen Tagen (`dailyTip`, "Mehr dazu"), Kochstil/
  Modi → Zeilen in den Einstellungen. Lotte: `baustein_an`/`baustein_aus`
  (Op `set_feature`, Vorschau + Übernehmen; Kontext "Bausteine an/aus"); ohne
  KI `parseBausteinCommand` ("Zeig mir den Vorrat", "Ich brauche die Tipps
  nicht", "Was kannst du noch?"). Nutzt Lotte einen ausgeschalteten Baustein,
  schaltet sie ihn ein und sagt, wo er steht. Der alte Schalter "Alte
  Funktionen anzeigen (Test)" ist weg: v1 mit `legacy` wird beim Update
  zurückgesetzt, Genutztes (Plan, Vorrat, Rezepte, Backen, Tipps, Ideen,
  Vorlieben, Modus) als Bausteine übernommen. Den alten Aufbau (`/?legacy=1`) gibt
  es seit v0.25 nicht mehr. Auf allen Seiten dieselbe
  helle Mia-Leiste (`LotteBar`, statt des runden Knopfs).
- Immer sichtbar: Startseite (siehe Leitbild 7), Chat mit Lotte,
  Einkaufsliste, schlanke Einstellungen (siehe v0.32) und beim ersten Start der
  Hallo-Bildschirm (siehe unten).
- Erster Start (v0.27, ohne Profil auf `/` und `/profil`, nach "Neu
  anfangen" wieder): `HelloScreen` (`src/components/welcome/`) – alles mittig,
  viel Luft: lebendiger Avatar ~150 px (begrüßen → ruhig) im oberen Drittel,
  „Hallo, ich bin Mia.“ (30/800), „Ich behalte euren Alltag im Blick.“
  (16/500, grau), Hinweis-Chip mit Mikrofon „Du kannst auch einfach mit mir
  sprechen“ (`bg-quick`, kein Knopf), unten „Los geht’s“ in Mia-Farbe (volle
  Breite, Radius 18) und grauer Link „Ich habe eine Sicherung“
  (`/profil/daten`). Passt ohne Scrollen (SE bis Pro Max), Safe-Area,
  reduzierte Bewegung = keine Animation. „Los geht’s“ = `startFresh()`
  (`welcomeStore.ts`): Standardwerte (`startState()` in `welcome.ts`: Mia,
  Termine/Essen/Einkauf, mal so mal so), die Standard-Startseite
  (`DEFAULT_HOME`: Pinnwand S + Wetter S, Termine, Aufgaben, Essen + Einkauf)
  und `startDemo()`. Name, Familie, Begleitung, Farbe stellt man später ein
  (oder sagt es). Ein Zwischenstand des alten Kennenlernens wird verworfen
  (`help` bleibt, steuert `useWorkRoom`).
- Beispiel-Tag (`src/lib/core/demo.ts`, Speicher `wasgibts.beispiel` v1
  `{since, cleared, done, gone, asked}`, nicht in der Sicherung; Vorlage
  `docs/vorlagen/demo-startseite.md`): Jetzt-Karte mit Beispiel-Themen („Das
  ist ein Beispiel-Tag“, seit v0.29), Beispielgericht in der Essen-Kachel, Termine aus dem festen
  Tagesplan `DEMO_DAY` (seit v0.38: 07:30 Frühstück · 08:00 Kita bringen · 10:30
  Kaffeepause · 12:30 Mittagessen · 15:00 Kinder abholen · 17:00 Einkaufen ·
  18:30 Kochen · 20:15 Lieblingsserie · 22:30 Ins Bett – nur was noch kommt,
  keine „in 1 Std“-Rechnung; kommen heute weniger als 2, Beispiel-Tag für
  morgen ab dem Morgen mit „Morgen · Mi“, Aufgaben ebenso; Jetzt-Karte nimmt
  dieselben Zeiten; Essen bis 18:30 + 90 Min Pasta, danach „Morgen · Do ·
  18:30“ Ofengemüse mit Feta, `demoDishAt`; Test je halbe Stunde in
  `tests/demo.test.ts`), Aufgaben (App kennenlernen ✓,
  „!“ {Name} etwas fragen, Ersten Termin eintragen, Kachel verschieben,
  Pinnwand ausprobieren), Pinnwand-Gruß der Begleitung, Einkauf „Milch · Brot
  · Äpfel“ – je mit Schild „BEISPIEL“ und gestricheltem Rahmen (Tokens
  `demo*`), unten „✨ Beispiele verschwinden, sobald du Eigenes einträgst.
  Jetzt leeren“ (`DemoBits.tsx`). Beispiele liegen nie in den echten
  Speichern (nicht in Kalender/Woche, Push, KI); Antippen erklärt und bietet
  „Eigenen Termin/Aufgabe eintragen“, Abhaken nur lokal (`toggleDemoDone`).
  Je Kachel weg beim ersten eigenen Eintrag (`clearDemoTile`, für immer),
  alle nach 3 Tagen oder mit „Jetzt leeren“ (`useDemoDay`).
- Einheitliches Datenmodell für Supabase (`src/lib/core/entries.ts`): jeder
  Eintrag mit `id`, `typ` (termin/aufgabe/gericht/einkauf), `raum`
  (familie/arbeit), `besitzer` (bis zu Konten "lokal"), `erstellt`,
  `geaendert`, `data`. Neue Funktionen speichern so; Bestehendes zieht in
  Phase 1 um (mit Migration).
- Zeit: `now()` (überschreibbar per `setNowForTests` oder
  `window.__WASGIBTS_NOW__`), `todayIso()`, `berlinTime()` für den Server,
  `useToday()`, `useMinutes()`.
- Lotte (`/api/lotte`, `src/lib/lotte/`): seit v0.42 automatische Modellwahl –
  `claude-haiku-5-5` für Alltägliches, `claude-sonnet-5-5` gleich bei Planen,
  Rezepten, Mails, langen Texten oder offenem Vorschlag (`needsLargeModel`);
  will Haiku ein großes Werkzeug (`LARGE_TOOLS`: rezept_erstellen,
  mail_entwurf, wochenplan_aendern, vorgaben_aendern, trainings_planen,
  schnellnotiz_aufraeumen, kochbuch_durchsuchen, antwort_knoepfe), lehnt ab
  oder läuft über, übernimmt Sonnet (Stream-Ereignis "round" setzt den Text
  zurück). `LOTTE_MODEL` = festes Modell, `LOTTE_SMALL_MODEL`/
  `LOTTE_LARGE_MODEL` ändern die beiden. Verbrauch je Antwort (`usage`:
  klein/groß, hochgeschaltet, Kosten in Millionstel US-Dollar) speichert die
  App still je Tag (`wasgibts.verbrauch` v1, `lotte/usage.ts`, 62 Tage, nicht
  angezeigt, nicht in der Sicherung) – Vorbereitung fürs Guthaben. (Bis v0.41:
  Gespräch mit `claude-sonnet-5-5`;
  adaptives Nachdenken, Aufwand "low" außer bei Haiku,
  `max_tokens` 8000, höchstens 6 Runden, serverseitiges Ausweichen bei
  Ablehnungen `fallbacks: "default"`), Haiku (`claude-haiku-5-5`) nur für
  kleine Hintergrundaufgaben (Kennenlernen-Erkennung). Streaming: die Route
  antwortet als NDJSON (`StreamEvent`: text/round/done/error), der Chat zeigt
  "Lotte denkt …" und dann die Antwort Wort für Wort. Gesprächsverlauf: die
  letzten 10 Nachrichten. Kontext je Anfrage: Datum, Wochentag, Uhrzeit
  (Europe/Berlin), Familie, Essen heute/morgen, Einkaufsliste, Vorrat,
  Kochbuch-Überblick. Systemanweisung: warme, kurze, mitdenkende
  Alltags-Assistentin für Familie und Arbeit (`prompt.ts`). Werkzeuge als
  Register (`registry.ts`, Anmeldung in `toolset.ts`; neue Bereiche wie
  Termine/Aufgaben/Erinnerungen melden sich dort an); Schreib-Werkzeuge
  liefern nur Vorschläge mit "Übernehmen". Token-Verbrauch und grobe Kosten
  je Anfrage im Server-Log ("Lotte Tokens", nur Zahlen, nie Inhalte). Kein
  Untertitel mehr im Chat, nur der Name.

## Startseite "Heute" – Kacheln 2.0 (v0.20)

- Layout (`src/lib/core/homeLayout.ts`, Speicher `wasgibts.startseite` v3
  `{tiles: {id, visible, size}[], tipSeen}`): pinnwand, termine, aufgaben,
  wetter, essen, einkauf, notizen, vorrat, morgen, post ("bald") –
  `HOME_TILES` in Standard-Reihenfolge mit erlaubten Größen (`sizes`) und
  Standard-Größe (M; Essen/Einkauf/Vorrat S; Morgen nur M; Post/Vorrat S·M).
  L und M = volle Breite, S = halb; zwei S direkt hintereinander stehen
  nebeneinander, eine einzelne S wird breit (`tileRows`). Essen + Einkauf =
  Paar (`keepPair`: immer direkt hintereinander, Essen zuerst; wandern
  zusammen). "zeigen" setzt eine Kachel an ihren Standard-Platz (direkt nach
  der nächsten sichtbaren, die laut Standard davor steht; Paar neben den
  Partner) in Standard-Größe; `standardLayout()` = Reihenfolge und Größen wie
  am Anfang. Aktionen auch für Lotte: zeigen, ausblenden, klein/mittel/gross
  (alt kompakt/ausfuehrlich), hoch/runter/nach_oben/nach_unten, standard.
  Migration v2→v3: Größen gesetzt, Kladde-Kachel wird Notizen an derselben
  Stelle. Standard sichtbar: Termine, Aufgaben, Essen + Einkauf, Morgen
  (Vorrat nur mit Baustein); Pinnwand/Wetter/Notizen in der Auswahl mit "NEU".
- Verschieben (v0.23, flüssig seit v0.34): Finger über Touch-Events (Pointer-
  Events bricht iOS beim Scrollen ab); im Bearbeiten-Modus `touch-action:
  pan-y` auf den Kacheln – Wischen scrollt überall natives mit Schwung, wie
  auf dem iPhone-Homescreen. Angehoben wird erst nach ruhigem Festhalten
  (`HOLD_MS` 350, Toleranz 8 px); bewegt sich der Finger vorher, ist es
  Scrollen (kein Anheben, kein Menü). Ein nicht-passiver `touchmove` auf
  `document` macht erst NACH dem Anheben `preventDefault` (dann steht die
  Seite, die Kachel folgt dem Finger). Tippen in eine noch rollende Seite
  (`FLING_MS` 120 nach dem letzten Scrollen) hält nur an. Das Original-
  Element bleibt beim Ziehen im DOM (gleicher key, gestrichelter
  Platzhalter, flaches 2-Spalten-Raster), schwebende Kopie, FLIP, Auto-
  Scroll am Rand, kein Wackeln beim Halten/Ziehen, Callout/Auswahl aus.
  Kurz antippen = Menü (Ganz nach oben · Nach oben · Nach unten · Größe ·
  Entfernen, `UnitMenu`). Test mit echten Touch-Ereignissen (CDP
  `Input.dispatchTouchEvent`, Durchklick `dragtouch` und `flussig`).
- Bearbeiten-Modus DIREKT auf der Startseite (`HomeBoard.tsx`, `TodayPage`
  `useHomeEditing`): lange drücken, Link "✎ Startseite bearbeiten",
  Einstellungen (`/profil/startseite` → `requestHomeEdit()` + "/"), Lotte
  ("Startseite bearbeiten"). Kopf sticky (`EditHeader`): links „+ Kachel“
  (Pille accent-soft, öffnet `TilePicker`), rechts „Fertig“ (orange),
  darunter Titel „Startseite bearbeiten“ und grau „Festhalten & ziehen ·
  Danebentippen = fertig“. Beim allerersten Bearbeiten einmal Mias
  Sprechblase unter „+ Kachel“ („Hier holst du neue Kacheln dazu – z. B.
  Timer oder Sport.“, weg bei jedem Tipp oder nach 6 s; Merker
  `wasgibts.einmalhinweise` v1, `core/hints.ts`). Beim Schließen der
  Auswahl scrollt die Seite zur zuletzt hinzugefügten Kachel, sie leuchtet
  kurz auf (`.tile-glow`) – mehrere nacheinander hinzufügen geht weiter. Danebentippen beendet (zentral in
  `useHomeEditing`: ein Klick auf jede freie Fläche – Kopf, Hinweis,
  Jetzt-Platzhalter, Lücken, Ränder, unten; nicht auf Kacheln, Knöpfe,
  Links, Felder, Fenster, Mia-Leiste; der Seiten-Schalter wechselt und
  beendet). Kacheln
  wackeln (±0,6°, abwechselnd), Inhalte `inert`; "–" oben links (Gelöscht ·
  Rückgängig), "S · M · L" unten rechts. Festhalten (0,2 s) und ziehen:
  schwebende Kopie, gestrichelter Platzhalter, andere rutschen (FLIP),
  Auto-Scroll am Rand, Vibration; Touch: nicht-passiver `touchmove` blockt
  das Scrollen nur beim Ziehen. Unten "+ Kachel hinzufügen" (`TilePicker`)
  und "Standard-Anordnung wiederherstellen" (mit Nachfrage). Wischen aus;
  "Fertig", Zurück (eigener Verlaufseintrag) oder freie Fläche beendet.
- Kachel-Inhalte je Größe: Termine S = nächster + "+2 weitere heute", M = 3
  Kärtchen, L = alle des Tages; Aufgaben S = Anzahl + wichtigste, M = 3, L =
  6 Zeilen (Abhaken: ca. 1 s durchgestrichen, nochmal tippen = doch nicht);
  Essen S / M (Zeit, "alles im Haus" bzw. "noch: …", ⇄) / L (+ Ideen für
  morgen); Einkauf S / M (6 zum Abhaken) / L (10); Notizen (gelblich) S =
  Schnellnotiz 2 Zeilen, M + angeheftete Chips, L + 3 neueste; Wetter;
  Pinnwand 1/2/4; Vorrat S/M; Morgen M (`HomeTiles.tsx`, `MiniCards.tsx`).
- Schnellnotiz (früher Kladde; seit v0.32 angeheftete Notiz, siehe dort):
  oben auf `/notizen` „Schnell was notieren …“ (`QuickNoteCard`), von der
  Notizen-Kachel über ✎ als Fenster (`KladdeSheet`). Lotte versteht "Schreib
  in die Kladde/Schnellnotiz …", "Notier mir schnell …", "Räum meine
  Schnellnotiz auf" (`kladdeCommand`, `isKladdeTidyRequest`).
- Wetter (`src/lib/wetter/`): `/api/wetter?ort=` (seit v0.40: DWD MOSMIX über
  Bright Sky `/weather` + `/current_weather`, Fallback Open-Meteo
  `models=icon_seamless`, beides in dasselbe Format über `sources.ts`
  (`fromBrightSky`, `fromOpenMeteo`); Geocoding, 30 Min Server-Cache, Limit pro
  IP; `?lat&lon` → nur Stadtname über Nominatim), `WETTER_MOCK=1` = Testmodus
  (fester Regen 15–18 Uhr, `szenario` heiss/frost/klar/sturm, `heute`). Stunde
  mit `mm`, `rain` (Regenrisiko %), `sun` (Sonnenminuten), `cloud`; Tage baut
  immer `buildDays` aus den Stunden (nie der schlimmste Tages-Code).
  EHRLICHE REGEL (`dayLook`, Stunden 7–21 Uhr): Regenstunde = ≥ 0,2 mm UND
  ≥ 50 %; „Regnerisch“ ab 4 Regenstunden oder 3 mm, „Schauer möglich“ bei 1–3,
  sonst „Sonnig“ (≥ 6 Std. Sonne) · „Sonne und Wolken“ (2–6) · „Wolkig“ ·
  „Bedeckt“; Gewitter/Schnee nur ab echter Stunde, „Stürmisch“ ab Böen 75.
  Morgens/Mittags/Abends nach derselben Regel (anteilig). 7 Tage: „Sa ·
  Symbol · Sonne und Wolken, 9 bis 12° · ☂ 70 %“, darunter „☀ 1 Std.“
  (`dayExtras`: Regenrisiko ab 30 %, Sonne nur > 0); Symbol „Schauer“ = Sonne
  + Wolke + Tropfen. „Gerade Regen“ nur, wenn die nächste Station (≤ 25 km,
  ≤ 90 Min alt) Regen misst (`current.raining`), sonst Vorhersage. Quellenzeile
  „Daten: Deutscher Wetterdienst (über Bright Sky)“ bzw. „Open-Meteo (DWD
  ICON)“, Nachweis `docs/credits.md`. Test `tests/wetter.test.ts`. App: Ort
  `wasgibts.wetterort` (Standard Eutin, Einstellungen → "Wetter-Ort"
  `/profil/wetter`, "Meinen Standort verwenden"), letzte Daten
  `wasgibts.wetterdaten` (offline "Stand 8:10"; ältere Daten ohne neue Felder
  werden beim Lesen neu beschrieben). Kachel leicht blau (Tokens
  `bg-weather`/`weather-2`/`weather-line`/`text-weather-ink`): S Symbol +
  Temperatur + Tipp; M + Beschreibung, Tief/Hoch, 4 Zeitpunkte; L + 5 Tage;
  Antippen = Stunden heute + 7 Tage. EIN Tipp (`weatherTip`): echte
  Regenstunde zur Termin-Zeit "☂️ Ab 15 Uhr Regen – Schirm für …", sonst
  Regen, Frost morgens, Sturm, ab 25 °C "Sonnencreme einpacken ☀️", Wind –
  oder keiner.
  Lotte: `wetter_abfragen` (Vorhersage vorab geholt, wenn die Frage nach
  Wetter klingt; bekommt Text, Regenstunden, mm, Sonnenstunden), ohne KI
  `weatherQuestion` ("Wie wird das Wetter morgen?",
  "Brauch ich heute einen Schirm?", "… am Samstag?").
- Pinnwand (`src/lib/pinnwand/`, Speicher `wasgibts.pinnwand` v1, Einträge
  typ "pinnwand", Raum Familie; Autor = eigener Name, später aus dem Konto):
  Text bis 140, Reaktionen 👍/❤️, gelesen von, dauerhaft angeheftet; älter
  als 3 Tage verschwindet (`prunePins`). Kachel weiß: oranger Punkt bei
  Ungelesenem, "+" (Textfeld + Mikrofon, "Anheften"), Kreis mit Anfangsbuch-
  stabe (feste Farbe je Person, `personTone`, Tokens `person-3/4`), "Lisa ·
  7:48"/"Du · gestern"; Antippen = reagieren, dauerhaft anheften, Löschen
  (nur eigene). Lotte: `pinnwand_schreiben` (Op `add_pin`), Kontext
  "Pinnwand: …"; ohne KI "Schreib an die Pinnwand: …", "Was steht auf der
  Pinnwand?". Nutzt Lotte die Pinnwand, kommt die Kachel auf die Startseite.
- Kein Rückgängig beim Hinzufügen (app-weit): Hinzufügen,
  Übernehmen, Kachel hinzufügen, Größe, Sortieren = still (Animation,
  Vibration); das Zurücknehmen bleibt für "Mach das rückgängig" registriert
  (`pushUndo`). Nur echtes Löschen (Eintrag, Notiz, Pinnwand-Nachricht,
  Schnellnotiz leeren, Kachel entfernen, Tag freimachen; im Chat
  Wochenplan/Einkaufsliste leeren) zeigt die kleine Meldung "Gelöscht ·
  Rückgängig" für 3 s (`showDeleted` in `core/toast.ts`, `act(…, label,
  { deleted: true })`, Chat-Turn `deleted`).
- Weiter wie v0.18/v0.19: Lottes Satz (`homeSentence`), Schnell-Knöpfe
  (`QuickButton`), Schnell-Termin (`TerminQuickAdd`), Schnell-Aufgabe
  (`TaskQuickAdd`), einmaliger Hinweis nach dem Kennenlernen, Start-Kacheln
  aus dem Kennenlernen (`homeTilesFor`, in Standard-Reihenfolge).

## Wetter-Seite hübscher (v0.47, Tafel 16)

- Daten und Texte wie v0.40. Heute (Variante B „Himmel oben“): große Karte
  (`SkyCard`, Radius 24, weißer Text) mit Verlauf je Lage (`skyFor`: sonne ·
  wolken · regen · gewitter · schnee; nachts zwischen Sonnenunter- und
  -aufgang immer „nacht“ – `sunTimes`/`isNight`, Näherung für Norddeutschland),
  klein „JETZT · 6:50“, Temperatur 54/800 (Messung der Station, sonst
  Vorhersage der aktuellen Stunde), Zustand, „Heute 9 bis 12° · ☂ 39 % · ☀ 3
  Std.“ (`skyLine`: Regen ab 30 %, Sonne nur > 0), großes Symbol oben rechts
  angeschnitten (nachts Mond), unten drei halbtransparente Felder Morgens/
  Mittags/Abends (`.wx-glass`). Darunter Satz zu den Terminen und die drei
  Tageszeit-Karten. Morgen: dieselbe Karte ohne Jetzt, „MORGEN · FR“, groß
  der Höchstwert, darunter „7 bis 11°“.
- 7 Tage (Variante D „Wochen-Band“): „Bester Tag für draußen“ (`BestDayCard`,
  gelber Verlauf, nur wenn `bestOutdoorDay` einen findet), 7 Säulen
  nebeneinander (`WeekBand`: Tag, Symbol, Hoch/Tief, Regenbalken = Regenrisiko
  mit %, ☀ Sonnenstunden; Pastell je Lage `columnTone` sonne/wolken/regen,
  bester Tag mit gelbem Ring; antippen = Tages-Fenster), Legende, EIN Satz zur
  Woche/zum Wochenende (`weekSentence` in `view.ts`, rein, ohne KI, ruhig: nasses
  Wochenende mit Sonnenfenster, „Ab Dienstag wird’s freundlicher.“, „Die ganze
  Woche trocken – gut für draußen.“, …) als Karte in der Farbe der Lage.
- Farben nur über `--app-wx-*` (hell, nacht, auto; dunkel gedämpft), Klassen
  `.wx-sky[data-sky]`, `.wx-col[data-tone]`, `.wx-best`, `.wx-note`, `.wx-bar`.
  Symbole: EIN Satz `WeatherSymbol` (bunt, `night` = Mond) für Seite, Kachel,
  Sport. Kleine Bildschirme (Höhe ≤ 620 px): kompaktere Abstände, damit 7 Tage
  auf das iPhone SE passt.
- Test: `tests/wetter.test.ts` (Wochensatz, Himmel je Lage inkl. Nacht);
  Durchklick `wetter47` (SE / 15 Pro / Pixel 7, hell/dunkel, Szenarien regen,
  klar, schnee, gewitter, Nacht).

## Memos in der Pinnwand (v0.45, Tafel 11)

- Kurze Sprachnachrichten an die Familie direkt in der Pinnwand – keine eigene
  Kachel, kein Mia, keine KI, keine Abschrift. Mikro in der Kachel-Akzentfarbe
  (rosé, `MemoMic`, nie Orange – Orange ist Mias Mikro) in der Kachel neben dem
  Plus und auf `/pinnwand` neben dem Feld (Seite trägt `data-tone="pinnwand"`).
- Aufnehmen (`pinnwand/useMemoRecorder.ts`): gedrückt halten = Aufnahme (Mikro
  ×1,3, Zeile mit rotem Punkt, Zeit, Tonwelle – `RecordingRow`), Loslassen =
  senden, > 70 px zur Seite = verwerfen, < 1 s = nichts (Hinweis „gedrückt
  halten“), 60 s = automatisch senden. MediaRecorder `pickMemoMime` (iPhone
  audio/mp4 AAC, sonst webm/Opus), 32 kbit/s mono, Pegel per Analyser; Welle
  28 Balken, normalisiert. Freigabe erst beim ersten Halten (wer schon
  losgelassen hat: „Jetzt geht’s – nochmal halten“); abgelehnt = freundlicher
  Satz, wo man es erlaubt. Tastatur/VoiceOver (Klick ohne Finger): Tippen
  startet, „Senden“/✕ in der Zeile. Mikro hat `data-no-swipe` und
  `data-no-longpress` (kein Seitenwechsel, kein Bearbeiten-Modus).
- Anzeigen (`MemoRow.tsx`): zwischen den Text-Nachrichten nach Zeit gemischt
  (`useBoard`): Avatar (Punkt = noch nicht gehört), Abspiel-Knopf (Name + Dauer
  für Screenreader), Welle füllt sich, Dauer „0:12“. Nur eins spielt
  (`memoPlayer.ts`, Ton vorab als Adresse bereitgelegt – das iPhone spielt
  sonst nach dem Datenbank-Warten nicht ab). Abspielen = gehört. Fenster
  (`MemoSheet`): 👍/❤️; eigenes Memo „Gehört von“ (Häkchen je Person,
  antippbar – auf einem geteilten Handy kann man sagen, wer es gehört hat) und
  „Memo löschen“ (Gelöscht · Rückgängig). Kein Anheften.
- Verschwinden (`pinnwand/memo.ts`, rein): 24 Std., nachdem alle im Haushalt
  (`householdNames` = Personen im Profil) es gehört haben (`alleGehoertAm`),
  spätestens nach 3 Tagen (`memoAlive`, `pruneMemos` beim Speichern). Beim
  Start `tidyMemos` (KitchenHelper): Abgelaufenes austragen, verwaisten Ton
  löschen (nicht jünger als 10 Min).
- Speicher: `wasgibts.pinnwand` v2 `{messages, memos}` (Einträge typ "memo":
  author, dauer, mime, wave, gehoertVon, alleGehoertAm, reactions,
  storagePath – null bis zu den Konten), v1 → leere `memos`
  (`migratePinStore`). Ton in IndexedDB `wasgibts-memos` hinter
  `MemoAudioStore` (`memoAudio.ts`; später Supabase Storage). Nicht in „Daten
  sichern“: `createBackup` nimmt die Memos heraus und merkt nur die Zahl
  („2 Sprachnachrichten (nicht gesichert)“ in `backupSummary`);
  Wiederherstellen behält die Memos dieses Geräts.
- Mia schreibt weiter nur Text. „Spiel das Memo von Lisa ab“ (`memoPlayRequest`,
  `memoToPlay`: neuestes Ungehörtes zuerst) spielt ab, ohne den Inhalt zu
  kennen – als Regel vor der KI (direkt im Antippen, sonst spielt das iPhone
  nicht); im KI-Kontext nur „[Sprachnachricht 0:12]“. „Was steht auf der
  Pinnwand?“ nennt Sprachnachrichten mit Dauer. Jetzt-Karte: ungehörtes Memo
  als „Felix: Sprachnachricht · 0:12“.
- Test: `tests/pinnwand.test.ts`; Durchklick `memos45` im Scratchpad (Chromium
  mit simuliertem Mikrofon, iPhone 15 + Pixel 7, Ablehnung).

## Essen „Kochen mit dem, was da ist“ (v0.43)

- Essen-Reiter (`FoodPage`): oben das Gericht von heute (nach dem Essen
  morgen) wie die Foto-Kachel – Bild vollflächig mit weichem Verlauf, „HEUTE ·
  18:30“, Name, Chips „alles im Haus“ (grün) bzw. „auf die Liste: …“,
  Personen/Minuten, „Kochen ›“ (Kochmodus), oben links „⇄ Tauschen“ (das eine
  Tausch-Fenster); Antippen = Rezept. Ohne Gericht: „Noch frei“ mit „Ideen
  zeigen“ / „<Name> fragen“.
- Darunter „Diese Woche“ (heute mit orangem Ring), dann „Das ist da“
  (`CookFromStock.tsx` `StockChips`, nur mit Baustein Vorrat und wenn etwas da
  ist: Chips, „bald aufbrauchen“ zuerst mit Sanduhr in Hellorange, dann
  „+ N“ → `/vorrat`) und „Daraus kannst du kochen“ (`CookIdeas`, drei Ideen
  aus `useTodayIdeas` mit Bild, Zeit · Grund, „alles im Haus“ → „Heute“
  (`takeForToday`), sonst „auf die Liste: …“ → „+ Einkauf“ legt das Fehlende
  für heute auf die Liste (Gericht gemerkt) und zeigt „✓ Liste“; nach dem
  Essen „Ideen für morgen“). Die alte Vorrat-Karte mit Zählern ist weg (leer:
  ein Einstieg „Trag ein, was da ist“).

## Vorrat und Einkaufsliste aufgeräumt (v0.44)

- Vorrat (`PantryView`): oben nur wenn passend „Vom Einkauf einräumen: Milch,
  Brot … [Einräumen]“ (abgehakte Einkäufe der Woche, die noch nicht im
  Vorrat stehen → naheliegender Ort; `essen/einraeumen.ts` `toPutAway`,
  Merker `wasgibts.eingeraeumt` v1, mit Rückgängig) und „Bald aufbrauchen“
  (hellorange, bis 4 Sachen mit −/+, „Rezept dazu“ → Essen-Reiter). Je Ort
  eine Liste statt Chips (`PantryRow`: Ort-Symbol, Name, „seit 3 Tagen“ bzw.
  im Tiefkühler „seit 12.10.“, Menge −/+ in Stück bzw. 100 g/ml; − bis null =
  aufgebraucht mit „… aufgebraucht · Rückgängig“); antippen = ändern.
- Einkaufsliste: großes Feld „Was brauchst du?“ mit Mikrofon immer oben (mehrere
  mit Komma, „Oft gekauft“ als eine Reihe); fällige Stammartikel als EINE
  waagerechte Reihe „Bald wieder fällig“ (keine Box); Zeilen aus Rezepten mit
  kleinem Etikett (z. B. „Pasta“); Abgehaktes bleibt ~2 s durchgestrichen
  stehen und rutscht dann nach unten unter „Erledigte anzeigen“ (keine
  Zähler).

## Einkauf nach Läden (v0.41)

- Läden wie bisher: Vorschläge (`SHOP_SUGGESTIONS`) + eigene (`/profil/produkte`,
  jetzt mit festem Farbpunkt je Laden, `shopTone`, keine Logos), Laden je
  Artikel in `itemShops` (Bearbeiten-Fenster, „Müsli von Rossmann“, Mia).
- Einkaufsliste merkt sich die Ansicht „Nach Abteilung | Nach Laden“ pro Gerät
  (`wasgibts.einkaufsansicht` v1, `einkauf/shopMode.ts`). Oben „Einkaufen bei
  [REWE] [Lidl] …“ (Läden mit offenen Sachen, meiste zuerst), in der
  Laden-Ansicht Farbpunkt + „Einkaufen“ am Gruppenkopf.
- Einkaufsmodus `/einkaufsliste/laden?name=REWE` (`ShopMode.tsx`, Titel „Bei
  REWE“): „Gibt’s hier“ · „Egal wo“ (ohne Laden) · „Andere Läden“
  (eingeklappt, Namen statt Zahlen) · „Im Korb“; Bildschirm bleibt an;
  „Fertig“ = eine Ebene zurück; leer: „Alles für REWE im Korb.“ LERNEN: Wird
  hier etwas ohne Laden abgehakt, merkt sich die Liste den Laden dafür
  (`setItemShop`, leise, „Gemerkt für REWE: …“, zurück mit „Mach das
  rückgängig“). Rein: `shopModeLists`.
- Jetzt-Karte „Auf dem Heimweg? 3 Sachen bei REWE“ öffnet den Einkaufsmodus
  (im Beispiel-Tag die Einkaufsliste). Mia: ohne KI „Ich bin bei REWE“, „Ich
  geh zu Lidl einkaufen“, „Einkaufsmodus Aldi“ (`shopModeRequest`, nur
  bekannte Läden, kurze Sätze – die Supermarkt-Frage „… im Angebot“ bleibt
  eigen); mit KI `app_befehl` mit diesem Satz; `einkaufsliste_hinzufuegen`
  nimmt `laden` mit (wird gemerkt, Vorschau „bei Rossmann“); die KI sieht
  offene Artikel mit Laden („Milch (Rewe)“).
- Test: `tests/einkaufLaeden.test.ts`; Durchklick `laeden` im Scratchpad.

## Tipps aus der Region (v0.37, Tafel 9 – Schritt 1)

- FESTE REGELN: Tipps sind KEINE Termine – eine eigene lila Ebene, bis jemand
  „In unseren Kalender“/„Übernehmen“ tippt (dann ein normaler Familientermin
  mit Ort, `link` zur Quelle und `note` „aus Tipps“). Kein GPS: Ort = Wetter-Ort
  oder eigener Ort aus den Einstellungen, Entfernung aus Koordinaten. Keine
  Werbung: KARAMBA-Aktionen sichtbar „von KARAMBA“ (Pink), nie bevorzugt
  (nur bei gleicher Uhrzeit zuerst), höchstens eine pro Woche in der Kachel
  (Veranstalter-Liste `tipps/karamba.ts`). Beispieldaten nur im Demo-Modus und
  überall als „Beispiel“ erkennbar. Farben: Lila = Tipps (`tipp` #8A63D2,
  `tipp-soft` #F1ECF9), Pink = KARAMBA (`karamba`). Keine Zähler.
- Schalter `TIPS_SOURCE` (Vercel): `off` (Standard – nirgends etwas von Tipps,
  auch nicht in Mehr Funktionen, Kachel-Auswahl, Kalender, Jetzt-Karte, Mia) |
  `demo` (`DemoTipSource`, ~16 Veranstaltungen um Eutin/Malente/Plön/Bad
  Segeberg/Scharbeutz + eine KARAMBA-Aktion) | `tldb` (`TldbTipSource`, Gerüst;
  Zugang über `TIPS_API_URL`/`TIPS_API_KEY`, nie im Code/Client). Schnittstelle
  `TipSource.fetchRange(von, bis, gebiet)` (`src/lib/tipps/sources/`).
  Datenmodell `Tip` (`tipps/model.ts`) = Spalten der späteren Supabase-Tabelle
  `tips`. Nur CC0/CC BY/CC BY-SA (`openLicense`), Lizenz + Urheber im Detail,
  Bilder nur mit offener Bild-Lizenz, sonst Linien-Icon der Kategorie.
  Kategorien → Filter (Für Kinder, Bei Regen, Draußen, Kostenlos, Musik,
  Märkte, Sport) in `tipps/categories.ts` (`CATEGORY_MAP`).
- Server (`tipps/server.ts`): `/api/tipps?ort&km&von&bis&heute` (Cache 6 Std,
  höchstens 21 Tage), `?nurquelle=1` = nur der Schalter; täglicher Abruf
  `/api/tipps/aktualisieren` (Vercel Cron 4 Uhr, `CRON_SECRET`), schreibt
  später in Supabase. App: ein Abruf heute + 20 Tage (`useTipsWindow`) für
  Kachel, /tipps, Kalender und Jetzt-Karte; Speicher `wasgibts.regiontipps` v1
  (`ort`, `km` 5/10/20/40, `kalender`, `gemerkt`, `uebernommen`, `jetztAus`).
- Sichtbar nur mit Quelle UND Baustein „Tipps aus der Region“ (`regiontipps`,
  `TIPS_BAUSTEIN`, nicht in `BAUSTEINE`; einschalten bringt die Kachel). Kachel
  `tipps` („Tipps diese Woche“ Mo–Do, sonst „Tipps fürs Wochenende“, M/L, zwei
  bzw. vier Karten, „Alle“); Seite `/tipps` (Ort-Chip „Eutin + 20 km · Ändern“,
  Heute | Wochenende | Diese Woche, Filter-Chips, nach Tag gruppiert, leer:
  „Gerade nichts in eurer Nähe. Größeren Umkreis wählen?“, unten die Quelle,
  `?tipp=<id>` öffnet das Detail; Karten-Icon vorerst ausgeblendet); Detail
  `TipSheet` (Wer kommt mit?, In unseren Kalender, Pinnwand „Wollen wir Sa 15
  Uhr zu …?“, Merken, Quelle/Lizenz/Urheber); Einstellungen → Startseite →
  „Tipps aus der Region“ (`/profil/regiontipps`); Kalender: Chip „Tipps an/aus“
  neben dem Monat, lila Ring-Punkt, in der Tagesliste gestrichelter lila
  Streifen + „Übernehmen“ (höchstens 3, dann „+ weitere Tipps“).
- Jetzt-Karte: Thema `region` Fr ab 12 bis So 12 Uhr (`jetztTip`: Regen →
  drinnen, Sonne → draußen, mit Kindern „Für Kinder“ zuerst), ✕ = an diesem
  Wochenende nicht mehr (`jetztAus`). Mia: `tipps_suchen` (nur mit Quelle,
  `LotteTool.enabled`; Tipps vorab geholt, wenn `tipQuestion` passt), Antwort
  nur aus den Treffern, bis zu 3 Karten (`tips` an der Antwort, `TipCards`) und
  „Soll ich einen davon eintragen?“; ohne KI dieselbe Erkennung als Regel. Nutzt
  Mia die Tipps, schaltet sie den Baustein frei und sagt, wo sie stehen.
- Schritt 2 (v0.46): auf `/tipps` oben „Gemerkt“ (Lesezeichen, nur gemerkte
  ab heute, nach Zeit – `rememberedTips`; Vergangenes fällt still weg, keine
  Zähler). Termine aus Tipps zeigen im Formular die Zeile „Mehr dazu ·
  <Seite> · aus Tipps“ (öffnet die Quelle in neuem Fenster); Bearbeiten
  behält Link und Notiz (`terminExtras` – bis v0.45 gingen sie beim Sichern
  verloren).
- Test: `tests/regiontipps.test.ts`; Durchklick `regiontipps` im Scratchpad.

## Ein Bild für jedes Gericht (v0.36)

- Jedes Gericht hat eine eigene Illustration im Stil der Burrata-Pasta –
  eigene Zeichnungen im Code, keine fremden Fotos, keine KI
  (`docs/credits.md`). Erkennen: `dishArt(title, ingredients?, category?)`
  (`src/lib/essen/dishArt.ts`, rein) → `{form, toppings, bg, seed, variant,
  side, guessed}`; Formen per Stichwort erst im Titel, dann in den Zutaten
  (Nudeln lang/kurz, Auflauf, Reis, Bowl/Curry/Chili, Suppe, Pfanne, Blech,
  Wraps, Brot, Pfannkuchen/Puffer/Omelett, Kartoffeln, Fisch/Fleisch +
  Beilage, Salat, Pizza/Flammkuchen, Süßes, Kuchen, Muffins, Kekse, Waffeln,
  Schnecken), Toppings aus Titel + Zutaten (höchstens 5, nie leer), fester
  Zufall aus dem Namen; Unbekanntes = allgemeine Form der Kategorie
  (`guessed`, z. B. Pfanne mit Gemüse).
- Zeichnen: `renderDishSvg(art)` (`dishSvg.ts`: Bühne mit Verlauf,
  Serviette, Gabel, Gefäß – Teller, Schale, Pfanne, Auflaufform, Blech,
  Brett; Essen in `dishBases.ts`/`dishBakes.ts`, Stückchen und Toppings in
  `dishBits.ts`). Neue Formen/Toppings dort ergänzen.
- Eingebaute Bilder: `npm run gerichte-bilder` (`scripts/generate-dish-images.mjs`,
  lädt die TS-Module über jiti) → `public/gerichte/<slug>.webp` (900 × 600,
  < 80 KB) für alle DISHES, Beispiel-Gerichte und die Backstube, dazu
  `public/demo/gericht.webp` (aus denselben Bausteinen) und die Liste
  `src/lib/essen/dishImageList.ts` (erzeugt, nicht von Hand ändern);
  `--bogen <png>` = Kontaktbogen. Neues eingebautes Gericht → Skript
  laufen lassen. Der Service Worker merkt sich `/gerichte/…` beim ersten
  Anzeigen (nur gericht.webp wird vorgeladen).
- App: `DishPicture title ingredients? category? photo? tone small` – eigenes
  Foto → eingebautes Bild (`builtinDishImage`) → live gezeichnet (data-URL,
  im Speicher gemerkt, `dishImage` in `dishImages.ts`) → einfacher Teller nur
  als Notlösung (Zeichnen/Laden scheitert). `small` = Ausschnitt auf den
  Teller (`scale 1.3`). Gilt für Essen-Seite, Wochenreihe, Wochenplan,
  „Was koche ich?“, Ideen-Karten, Rezepte, Rezeptseite, Backstube.
- Test: `tests/dishArt.test.ts`; Durchklick `bilder` im Scratchpad.

## Spendentopf (v0.35, Tafel 14 – ersetzt die „Beitrags-Frage“)

- FESTE REGELN: Es gibt KEINE Zahlung in der App – Beiträge sind nur
  „zugesagt“ (`pledge.status: "zugesagt"`), bis Beiträge möglich sind. Texte
  nur aus `POT_TEXTS` (`src/lib/spendentopf/model.ts`): „100 % für Projekte in
  deiner Region“, „Jeder Euro geht in deine Region“, „Die App ist kostenlos.
  KARAMBA zahlt Server & KI. Keine Werbung, kein Abo, keine Daten verkauft.“
  (Seite und Einstellungen → „Über die App“). Nie „an KARAMBA“ – das Geld
  geht in die Region, verwaltet von einer Stiftung vor Ort (Spendenquittung
  kommt von der Stiftung). Die App bleibt ohne Beitrag komplett kostenlos.
- Region: aus dem Wohnort – manuell gewählte Region, sonst PLZ aus dem Profil
  (`weather.postcode`), sonst Wetter-Ort (`useFamilyRegion`,
  `regionForPlace`: längster PLZ-Anfang, sonst Ort/Name); jederzeit änderbar
  über den Chip ▾ („Region wählen“, Suche „Ort oder Postleitzahl“, Status
  aktiv/bald/sucht Paten). Daten (`regions.ts`, Form wie später Supabase):
  `regions` (id, name, plz, orte, status, pate_name/-text, stiftung_name),
  `pot_projects`, `pot_votes` (eine Stimme je Familie und Jahr),
  `pot_contributions` (nur zugesagt), `region_interest`. Lokal in
  `wasgibts.spendentopf` v1 (`{region, support, interest, votes, pledge,
  ask, voteCardHidden}`, in der Sicherung).
- Ablauf je Jahr (`SCHEDULE`, `potPhase`): Vorschlagen 1.–14.11., Abstimmen
  15.–30.11. („noch X Tage“ nur dann), Übergabe 12.12. Abstimmen nur in der
  Abstimm-Zeit; eigene Wahl orange umrandet „✓ Gewählt“.
- Seite `/spendentopf` (`SpendentopfView`): Region-Chip, goldene Karte „2026
  BISHER“ + Betrag (Münze fällt bei neuer Zusage), Pate in Pink (`karamba`,
  #D6336C), Stiftung, „Wohin geht der Topf?“ (Balken, Stimmen), Zeitplan,
  Beitrag 2 € · 4 € · 7 € (`PledgeChoice`). Region ohne Topf (`NoPot`):
  gestrichelter Kreis mit blassem Topf, „Bescheid geben, wenn es einen gibt“
  (Schalter), „<Nachbarregion> unterstützen“, „Pate werden“ (mailto
  `PATE_MAIL`), unten „Die App bleibt für dich trotzdem komplett kostenlos.“
- Kachel „spendentopf“ (gold #FBF0D9/#A8730C, dunkel #2A2312/#E0B45A, nur M,
  Standard an, entfernbar): in der Abstimm-Zeit „Abstimmen“, sonst „Euer
  Beitrag“ bzw. „Was ist dir die App wert?“. Startseite v4: bestehende
  Nutzer bekommen die Kachel einmal ans Ende angehängt (übrige Anordnung
  bleibt). Höchstens EIN Hinweis unter der Jetzt-Karte (`PotHintCard`, vor
  dem Dunkel-Tipp): in der Abstimm-Zeit „<Betrag> im Topf – stimmt jetzt ab!“
  (✕ blendet aus), sonst nach 28 Tagen die Beitrags-Frage („Was ist dir die
  App wert?“, 2/4/7 € · Später = in 4 Wochen wieder, höchstens 3×; nicht im
  Beispiel-Tag). Nach der Wahl Dank: „Danke! Wir melden uns, sobald Beiträge
  möglich sind.“
- Beispiel: Ostholstein (Pate KARAMBA, 2.344 €, Bolzplatz · Lese-Ecke ·
  Jugendfeuerwehr) trägt das Schild „Beispiel“. Einstellungen: Zeile
  „Spendentopf“ (Wert = Region). Lotte kennt den Topf noch nicht.
- Test: `tests/spendentopf.test.ts`; Durchklick `spendentopf` im Scratchpad.

## Pastell-Kacheln + aufgeräumter Beispiel-Tag (v0.33, Tafel 12+13)

- FESTE REGEL – Palette je Kachel (hell Fläche / Akzent · dunkel Fläche /
  Akzent): Pinnwand #FBEEF1/#B24A66 · #2B1F24/#E59AB0; Wetter #FFF5D6/#9A7410
  · #2A2515/#E8C66A; Termine #EDF2FC/#3F5FBF · #1B2130/#9BB2F0; Aufgaben
  #E9F5EE/#2B8A5E · #18261F/#86D0AC; Essen #FDEEE4/#C4531A · #2B1F18/#F2A57A;
  Einkauf #EEF4E6/#5E7F2E · #1F2618/#B2CF85; Tipps #F3EEFB/#6B45B5 ·
  #231E2E/#BBA2EE; Sport #E6F4EC/#2E8B5F · #16251D/#7FCFA6; Vorrat
  #E8F4F4/#2F7D80 · #152526/#82CBCD; Timer #F5F0E8/#7A6A55 · #25211B/#CDBDA4;
  Notizen #FFF8E5/#9A7410 · #2A2515/#E8C66A. Kachel-Label und Icon im Akzent,
  Text bleibt dunkel; innere Karten auf rgba(255,255,255,.72) (dunkel .06);
  Kachel-Plus weiß halbtransparent mit Plus im Kachel-Akzent. Orange nur für
  Knöpfe und Mia, Pastell nie für Knöpfe. Neue Kacheln bekommen eine eigene
  Pastell-Farbe nach diesem Muster.
- Technik: Tokens `--app-tile-<id>` / `--app-tile-<id>-ac` (hell, nacht,
  auto) in `globals.css`; `HomeBoard` (`EditFrame`) setzt `data-tone="<id>"`
  um jede Kachel, daraus `bg-tile`, `text-tile-accent`, `bg-tile-inner`,
  `text-tile-label`. Außerhalb einer Kachel fallen sie auf Weiß, Hellorange
  und Grau zurück (Plus/Label wie bisher). Bausteine in `ui/styles.ts`:
  `TILE`, `TILE_INNER`, `TILE_LABEL`, `TILE_PLUS_DOT`. `PersonAvatar soft` =
  weiß halbtransparent mit Buchstabe im Akzent (Pinnwand). Im Code nie
  `var(--color-…)` (gibt es zur Laufzeit nicht), nur `var(--app-…)`.
- Termine/Aufgaben: Kopf, „+N weitere“ und Plus IN der Kachel; Termine ohne
  Kästchen (Erledigt über das Menü – auch dort jetzt „Erledigt ·
  Rückgängig“ wie beim Abhaken); Dringend = kleines rotes „!“
  (`UrgentMark`). Keine Emojis in Kacheln, Termin-Titeln und Laden-Zeilen
  (`withoutEmoji` in `core/text.ts`, Läden nur mit Farbpunkt).
- Jetzt-Karte: Pfirsich-Verlauf (`jetzt-from/to`), Mia 32 px links, oben
  rechts kursiv „Passt sich deinem Tag an“ (10,5 px, `jetzt-hint`), Titel
  ohne Emoji, Zeile 2 in Dunkelorange, rechts Punkte und ✕, kein „›“ – die
  ganze Karte ist antippbar. Die Tageszeit-Farben (`jetztTone`) sind weg.
- Beispiel-Tag: keine gestrichelten Rahmen, keine BEISPIEL-Schilder an den
  Kacheln; stattdessen EINE weiße Zeile oben über den Kacheln (`DemoRow`):
  [BEISPIEL] „So sieht ein Tag aus“ … „Eigenen starten“ (leert die
  Beispiele); nach dem ersten Eigenen dort „Alle Beispiele entfernen? Ja ·
  Behalten“. Beispiel-Titel ohne Emojis. Essen-Foto-Kachel und Wetter-Kachel
  bleiben in ihrer Form (Wetter jetzt pastellgelb).
- Test: `tests/stilblatt.test.ts` (kein `var(--color-…)`, Kacheln mit
  `TILE`), `tests/demo.test.ts` (`withoutEmoji`); Durchklick `pastell` im
  Scratchpad (Farben hell/dunkel, keine Strichel, ein Schild, „Eigenen
  starten“).

## Notizen, Einstellungen, Altlasten (v0.32, „Apple-mäßig“ Etappe 7–9)

- Notizen (`NotesView`): oben weiße Karte „Schnell was notieren …“
  (`QuickNoteCard`, Enter hängt eine Zeile an die Schnellnotiz, „Notiert“),
  Filter Alle · Familie · Arbeit, Abschnitt „Angeheftet“ mit Pin-Symbol,
  darunter „Alle Notizen“ im 2er-Raster, keine Zähler. Die gelbe
  Schnellnotiz ist weg: `adoptSchnellnotiz()` (beim Start im KitchenHelper)
  schreibt den Text aus `wasgibts.kladde` in eine angeheftete Notiz
  „Schnellnotiz“ (📝, `NotizData.schnell`, bis 20000 Zeichen; gibt es sie
  schon, wird angehängt) und leert den alten Speicher.
  `load/save/changeSchnellnotiz` arbeiten auf dieser Notiz (Lotte-Werkzeuge
  unverändert); im Notiz-Editor zusätzlich „<Name>, räum auf“ und „Leeren“.
  Die Notizen-Kachel zeigt sie nicht doppelt. Tokens `schnellnotiz*` entfernt.
  Test: `tests/notizen.test.ts`.
- Pinnwand-Seite `/pinnwand` (`PinboardView`, Fenster in `PinSheets.tsx`):
  Feld „Nachricht an alle …“ mit Mikrofon/Senden rechts, weiße Karten,
  angeheftete zuerst mit hellorangem Rand; das Kachel-Label führt dorthin.
- Einstellungen (`FamilyOverview`): oben zwei große Karten – Familie
  (Personen-Kreise, „3 Personen · Familie mit Kindern“ → `/profil/familie`)
  und Begleitung (Avatar, Name, Anrede → `/profil/kuechenhelfer`); Gruppe
  „Startseite“ (Startseite bearbeiten · Tagesablauf · Wetter-Ort · Sport ·
  Mehr Funktionen), Gruppe „Essen“ (Kochstil · Essen & Vorlieben · Feste Tage
  · Rezepte · Vorrat, je nach Baustein), dann Darstellung (Automatisch · Hell
  · Dunkel) und eine Gruppe ohne Überschrift (Mails · Daten & App). Zeilen
  heißen wie ihre Seiten, keine Zähler.
- Seite der Begleitung (`MiaView`, `/profil/kuechenhelfer`, Titel = Name):
  Name & Art (`BegleitungPicker`), Farbe (`FarbeChoice` mit Icon-Hinweis),
  Vorlesen/Stimme/Tempo (`VoiceSettings`), „Wie oft melde ich mich?“ Selten ·
  Normal · Gern (`helperMode` locker/normal/dranbleiben), Tipps (mit
  Baustein), Wochenend-Ideen, Pause. `/profil/lotte`, `/profil/vorlesen` und
  `/profil/farbe` leiten dorthin. „Bausteine“ heißt überall „Mehr
  Funktionen“ (`/profil/bausteine`). Tagesablauf-Seite heißt „Tagesablauf“;
  „So tun, als wäre es …“ nur im Testmodus (oder während einer Vorschau).
  Der Baustein „Wie oft melde ich mich?“ (`modi`) ist aus der Liste
  genommen – die Auswahl steht fest auf der Seite der Begleitung (ein
  gespeichertes `modi` stört nicht).
- Altlasten: `/schnellkueche` und `/ideen` → Essen-Seite, `/profil/ansicht`
  und `/profil/darstellung` → Einstellungen, `/profil/wochenende` →
  Kochstil; `/api/kuechenhelfer`, `SpontanRedirect`, `AppearanceView`,
  `useRatingCandidate`, `InstantSettingsPage`, Wochenend-/Darstellungs-Auswahl
  entfernt; `HomeCustomizer` heißt `TilePicker`. Ohne Namen heißt die
  Begleitung jetzt Mia (`migrateHelper(raw, fallback)`); nur Profile bis v6
  behalten Lotte.

## Eintragen, Kalender, Essen, Rezepte (v0.31, „Apple-mäßig“ Etappe 3–6)

- Eintragen: ein Fenster „Was möchtest du eintragen?“ (`kalender/AddSheet.tsx`:
  Termin · Aufgabe · Notiz · Einkauf + „Oder einfach <Name> sagen“), vom Plus
  im Kalender und auf der Tag-Seite („Neu für diesen Tag“). „Neuer Termin“
  (`TerminQuickAdd`): Wann · Uhrzeit · Für wen (Avatare, `who`) · Familie |
  Arbeit · „Mehr Optionen“ (Ort, Erinnerung) · „Eintragen“ am Inhaltsende.
  Bearbeiten (`EntryForm`) als gruppierte Liste wie auf dem iPhone:
  „Abbrechen | Titel | Sichern“, Zeilen Tag/Beginn/Ende, Für, Wer ist dabei,
  Etikett, Wiederholen/Erinnerung (Auswahl rechts), unten rot „Löschen“; kein
  „(optional)“. Avatare überall `PersonAvatar` (`ui/PersonAvatar.tsx`).
- Kalender (Reiter statt „Woche“, `?seite=kalender`, alt `?seite=woche`):
  `kalender/CalendarPage.tsx` Monat | Woche | Liste, Plus = Eintragen,
  Filter Alle | Familie | Arbeit (nur mit Arbeit). Monat: Raster Mo–So,
  Punkte (`dayDots`: orange Familie, blau Arbeit, grün Sport), heute
  oranger Kreis, gewählter Tag hellorange, darunter `DayAgenda` (Termine ·
  Aufgaben „Alle ›“ · Essen als eine Zeile). Woche: 7 Tageskarten mit ‹ ›.
  Liste: nächste 14 Tage + „Weitere Wochen“. Die Karten Aufgaben/Notizen
  unten sind weg. Später: Tipps als eigene lila Ebene (nie als Termin).
- /tag: Titel = Wochentag, darunter „22. Oktober · morgen“ (`dayHeading`,
  `PageHeader subtitle`), `DayAgenda`, Plus = dasselbe Eintragen-Fenster.
- Essen-Reiter = einziger Ort für den Plan: Heute-Karte mit Teller-Bild,
  Woche Mo–So als Reihe mit Bildern (frei gestrichelt mit Plus, feste Tage
  hellorange), „Plan öffnen“ (mit Baustein Wochenplan). Gerichte ohne Foto:
  eigene Illustration (seit v0.36, siehe „Ein Bild für jedes Gericht“;
  `dishTone` nur noch als Platzhalter-Farbe), keine Emojis. EIN Fenster „Was koche ich?“
  (`essen/SwapSheet.tsx`, `SwapContext`) für Essen-Seite, Wochenreihe und
  Wochenplan („Ideen“). /ideen leitet auf die Essen-Seite, /schnellkueche in
  den Spontan-Modus.
- /wochenplan: Zeitraum ‹ ›, 7 Zeilen (Bild, Gericht, „fester Tag“, Notiz;
  frei „Noch frei“ + „Ideen“), „<Name>, füll die freien Tage“; im „…“
  (`ui/MoreMenu.tsx`): Vorlage speichern/laden, Frühere Wochen (Rückblick),
  Feste Tage & Vorlieben, Plan teilen, Unsere Rezepte. Kein Tag/Woche-
  Umschalter, keine Zähler, Kosten oder Kategorie-Punkte.
- „Kurz vor der Woche“ (früher Wochen-Check, `/woche/check`): drei Fragen mit
  Chips (unterwegs? · wie oft Fleisch? · etwas Besonderes?), Fortschritt als
  Striche, „Weiter“/„Überspringen“ am Inhaltsende, Feinheiten hinter „Alles
  im Detail“. `StickyActions` gibt es nicht mehr – Knöpfe stehen am
  Inhaltsende (auch im Rezept-Editor).
- Rezepte: Bilder-Raster (Foto bzw. Teller), Suche, Text-Filter-Chips, Herz
  als runder weißer Knopf, ohne „6× gekocht“. Rezeptseite: Bild in voller
  Breite mit runden weißen Knöpfen (Zurück `BackButton round`, Herz, „…“ mit
  Bearbeiten/Teilen/Löschen bzw. „In unsere Rezepte“), Name einmal 30/800,
  Infozeile mit Icons, Personen-Zähler (rechnet Zutaten um), „Jetzt kochen“
  und „Für einen Tag einplanen“ (nächste 7 Tage, `takeForDay`); kein
  Bewertungs-Block. „Neues Rezept“ ohne ausgegraute KI-Kacheln.

## Stilblatt + Ohne Druck (v0.30, „Apple-mäßig“ Etappe 1+2)

- Farben nur über Tokens (`globals.css`, je Token Hell- und Dunkel-Wert):
  ein Orange je Ton – `accent` (Knöpfe), `accent-strong` #C4531A (Text/Links,
  „Rückgängig“), `accent-soft` #FDEBDF (helle Flächen, Kachel-Plus; früher
  auch `quick`); Grün `good`/`good-soft`/`good-ink` #2E9E6B, Blau `work`
  #4C6FD9; Rot nur `danger`/`danger-soft`/`danger-line` (Warnung, Löschen);
  Grau `fill`/`fill-strong`/`faint`/`line-strong`; Abdunkeln `scrim`; Text
  auf Fotos/Wunschfarbe `on-color`. Kategorien `cat-veggie/fleisch/fisch/cheat`
  (Fleisch braun, nicht rot), Läden `shop-1..8`. Keine festen Tailwind-Farben
  (stone/red/emerald …, black/white) – `tests/stilblatt.test.ts` prüft das.
  `--app-bar`/`bg-bar` gibt es nicht mehr.
- Drei Radien: `rounded-card` 20 px, `rounded-field` 14 px (Feld/Knopf),
  `rounded-full` (Chip). Kein rounded-xl/2xl.
- Schrift: Seitentitel 30/800 (`PageHeader`), Abschnitt `SECTION_TITLE`
  15/800 in normaler Schreibweise, Kachel-Label `TILE_LABEL` 10/800 in
  Großbuchstaben – nur innerhalb von Kacheln.
- Nur zwei Plus-Arten: Seiten-Plus `PagePlus` (34 px orange, rechts im
  Seitenkopf) und Kachel-Plus `QuickButton`/`TILE_PLUS_DOT` (26 px hellorange).
- Seitenkopf: oben „‹ <vorherige Seite>“ (`BackButton`, Name aus
  `pageLabel()` und `previousUrl()` in `navigation.ts`), rechts höchstens ein
  Knopf (Plus oder „…“), darunter der große Titel. Kein App-Icon-Link mehr.
- Ein Fenster für alles: `src/components/ui/Sheet.tsx` (`fill`, `height`,
  `inset`, `layer` base/chat/above) – auch Chat und Einkauf-Plus.
- Nichts Schwarzes: Timer fertig = weiße Karte mit orangem Ring, „+1 Min.“
  und „Stopp“; Meldungen (`ToastHost`, „Gelöscht“ im Chat) = weiße Karte mit
  grünem Haken und „Rückgängig“ in Dunkelorange.
- Chat-Kopf: Stift links = neues Gespräch, Mia + Name mittig, „Fertig“
  rechts; klein „Vorlesen“ unter jeder Antwort; Mikrofon immer rechts (beim
  Tippen wird es zum Senden-Knopf); kein „Testmodus“-Schild.
- Keine Emojis in Knöpfen/Chips (Linien-Icons oder Text); Emojis nur als
  Inhalt (Gerichte, Notizen).
- Ohne Zähler: Sport ohne „2/3“, Balken und 🔥 (Woche Mo–So als Kreise
  `SportWeekRow`, grün = trainiert, heute oranger Ring, ein Satz
  `statusLine` ohne Zahlen; Seite: Woche, „Zuletzt“ mit `PersonAvatar`,
  Packlisten, Wochenziel); Jetzt-Karte zeigt Sport nur als heute geplantes
  Training. Kein „Einkauf · 7“/„Vorrat · 12“, keine Zahlen an Vorrat-Reitern,
  kein „5/7 geplant“, keine Kategorie-Zähler und Kosten im Wochenplan, kein
  Fortschrittsbalken in der Einkaufsliste, „Erledigte anzeigen“ statt „✓ 3
  erledigt“.
- (Seit v0.33 Pastell-Kacheln statt „alle weiß“, siehe dort.) Notizen mit
  Stift, Vorrat „Bald aufbrauchen“ mit 2 Sachen, Einkauf 3 Sachen + „und N
  weitere“.
  Höchstens ein Hinweis unter der Jetzt-Karte. Bearbeiten-Modus: heller
  „–“-Knopf, Auswahl ohne „Post – bald“.
- Leere Seiten freundlich: Aufgaben mit großer Mia, „Alles erledigt.“ und
  „Neue Aufgabe“; Einkaufsliste mit großem Feld „Was brauchst du?“ + Mikrofon und
  „Oft gekauft“ (`ShoppingAddField`), „Liste teilen“ am Ende.

## Feste Anordnung + Jetzt-Karte + Beispielgericht (v0.29)

- Kachel-Anordnung ändert sich nie automatisch: `TodayPage` zeigt genau die
  gespeicherte Reihenfolge/Größe (`HomeBoard`), im Bearbeiten-Modus dieselbe.
  `arrangeHome`, Phasen-Schild, „Alles zeigen“, Zusammenklappen und der Modus
  Mitdenkend/Immer gleich (`routine.mode`, `HOME_MODES`, Lotte
  `startseite_modus`) sind entfernt; Phasen (`phases.ts`) liefern nur Inhalte
  (`hideWork`, `familyUpcomingOnly`/`tasksRest` bei Ruhe nach Feierabend,
  `weatherTomorrow`, `cooking` = Kochschritte in der Essen-Kachel, Wake Lock).
  Standard neuer Nutzer (`DEFAULT_HOME`): Pinnwand S + Wetter S, Termine,
  Aufgaben, Essen + Einkauf; Morgen nicht im Standard. Bestehende Nutzer
  behalten ihre Anordnung. Ein gestarteter Timer blendet die Timer-Kachel an
  ihrem Standard-Platz ein (immer, nicht mehr nur bei „Immer gleich“).
- Jetzt-Karte (`JetztCard.tsx`, ersetzt Lottes Satz): oben unter
  Begrüßung/Datum, volle Breite, feste Höhe 78 px (2 Zeilen, nie größer),
  links Mias Gesicht (beim Wechsel kurz „sprechen“), Zeile 1 fett, Zeile 2
  Detail/Tipp, rechts „›“ (nur mit Ziel), ✕ = für heute ausblenden (Meldung
  mit Rückgängig), oben rechts klein „Passt sich deinem Tag an“. Farbe je
  Tageszeit (`jetztTone`: morgens bis 11 gelb, bis 18 orange, sonst blau;
  Tokens `jetzt-morgen/tag/abend` + `-ink`, hell und dunkel). Wischen nach
  links = nächstes Thema (max. 3, Punkte), Antippen öffnet den Bereich (Tag,
  Aufgaben, Wetter, Sport, Essen-Seite, Spontan-Ideen, Pinnwand-/Timer-Kachel
  per Scroll). Reihenfolge der Themen bleibt stehen, bis die App wieder
  geöffnet wird, 15 Min vergehen, ein Thema wegfällt oder sehr Dringendes
  (≥ 90 Punkte) dazukommt – Wechsel sanft (`jetzt-in`), Höhe gleich.
- Punktesystem (`src/lib/jetzt/topics.ts`, rein, ohne KI): Dringlichkeit
  (Zeit bis zum Termin, heute dran, Wetter zur Termin-Zeit), Handlung (Tipp
  schlägt Info) und Interesse (`wasgibts.jetzt` v1 `{on, day, hidden,
  weights}`: Antippen +1, Weiterwischen −0,5, ✕ −1,5, ±6, wirkt mit 5 % je
  Punkt). Themen: Erinnerung, Timer, Kochschritt, Pause, Termin ≤ 60 Min
  („In 40 Min: Zahnarzt · 16:15 · Ort“), Pinnwand ungelesen, Wetter-Tipp,
  morgens „8° · 8:15 Kaffeepause“, ab 15 Uhr Essen mit Startzeit (Essenszeit
  − Kochdauer, „alles im Haus“ bzw. „noch: …“) oder „Noch nichts zum Essen – 3
  Ideen“, „Heute wichtig/fällig: …“, Geburtstag heute/morgen
  (`birthdayName`), Sport-Wochenziel, ab 19 Uhr „Morgen · Do: …“, „Alles
  geschafft 🎉“, Freizeit-Idee, Tipp (Bausteine), Beispiel-Tag, sonst „Heute
  ist es ruhig“. Regeln: nichts wiederholen, was die erste Kachel-Reihe zeigt
  (außer mit Tipp, ×0,5), Feierabend mit Ruhe/Wochenende nur Sanftes, nachts
  (22–6) nur Morgen/Erinnerung/Timer, Arbeit-Termine nur lokal. Optionaler
  Haiku-Satz ist (noch) nicht eingebaut – die Vorlagen reichen.
- Bearbeiten-Modus: oben gestrichelter fester Platz „Jetzt-Karte · passt sich
  automatisch an – fester Platz oben, nicht verschiebbar“ (`JetztPlaceholder`).
  Einstellungen → „Startseite & Tageszeiten“ (`/profil/tagesablauf`):
  „Jetzt-Karte anzeigen“ (Standard an) und „Ausgeblendete Themen und
  Gelerntes · Zurücksetzen“. Lotte: `jetzt_karte` (Op `set_jetzt`, Vorschau);
  ohne KI `jetztCommand` („Blende die Jetzt-Karte aus“, „Zeig die Jetzt-Karte
  wieder“, alte Sätze „Lass die Startseite immer gleich“/„… soll mitdenken“).
- Beispiel-Tag füllt nur Inhalte in dieselben Kacheln (auch im
  Bearbeiten-Modus als Vorschau); Jetzt-Karte zeigt Beispiel-Themen je
  Uhrzeit. Neue Beispiel-Kachel „essen“: Beispielgericht „Pasta mit Tomaten &
  Burrata“ (`src/lib/essen/demoDish.ts`, IDs `d:…`, über `findRecipe` lesbar
  und kochbar, nie im Kochbuch/Plan/Sicherung) als `DemoFoodTile` – Bild
  vollflächig (`DishPicture`, ohne Foto warmer Verlauf + Symbol, Platzhalter-
  farbe beim Laden), weicher dunkler Verlauf (`.dish-shade`), weiß „ESSEN ·
  18:30“, Name, „alles im Haus · 25 Min“, Schild BEISPIEL, höher als sonst.
  Antippen = Beispiel-Rezept (`RecipeView`: Bild oben `DemoHero`, „Kochen
  starten“, unten „Mehr Ideen“ mit drei Karten `DemoMoreIdeas`); Essen-Reiter
  zeigt es als „Heute“ (`DemoDishHero`). Verschwindet mit eigenem Gericht
  (`clearDemoTile("essen")`), „Jetzt leeren“ oder nach 3 Tagen. Bild
  `public/demo/gericht.webp` = eigene Illustration
  (seit v0.36 aus `npm run gerichte-bilder`, Nachweis `docs/credits.md`), im Service
  Worker vorgeladen.
- Hallo-Bildschirm lebendig (`HelloScreen`, Ablauf nach Mockup „Mia
  Begrüßung“): 0,0 s Mia ploppt auf, 0,7 s winkt, 0,95 s „Hallo, ich bin
  Mia.“ tippt sich ein (Mia „sprechen“), 2,1 s Untertitel, 2,5 s
  Mikrofon-Hinweis mit Puls-Ring, 2,9 s Knöpfe gleiten herein; danach
  blinzeln (4 s), Augen folgen dem Finger (`.av-look`, max. ~3 px); Mia
  antippen = hüpfen („freuen“), drei Herzchen/Funken, Sprechblase („Hihi!“,
  „Bereit, wenn du es bist!“, „Kitzelig!“, „Los geht’s?“). „Los geht’s“: Mia
  fliegt 0,7 s in die Jetzt-Karte (`core/hello.ts` `setHelloFlight`/
  `takeHelloFlight`), dort tippt sich der erste Satz ein, Kacheln erscheinen
  je 70 ms versetzt (`.tiles-arrive`). Kein Flackern: Animation erst nach
  dem Laden (Schrift da, max. 600 ms), vorher unsichtbar; `helloElapsed`
  setzt nach einem Neuaufbau fort statt neu; `HomeView`/`ProfilePageContent`
  bleiben beim Hallo, bis es ein Profil gibt (kein Wechsel über „lädt
  noch“); `LotteAvatar stabil` = Zustand wechselt am selben Element (kein
  Neuaufbau). Bewegung reduzieren = alles sofort, ohne Animation.
- Ursache des Flackerns beim ersten Start: Der Service Worker übernimmt beim
  allerersten Öffnen die Seite („controllerchange“), und die App lud deshalb
  nach ~0,7 s komplett neu. Neu geladen wird jetzt nur nach einem selbst
  angetippten „Neue Version da“ (`ServiceWorkerRegistration`). Test:
  Durchklick `hallo2` (10× frisch, keine zweite Navigation, Mia genau einmal).
- Einkauf nach Läden (Startseite, Teil 5 des Auftrags): Einkauf-Kachel (S)
  zeigt bis zu 3 Läden als Zeilen – Farbpunkt, Name fett, Artikel grau
  („REWE Milch, Brot, Butter“, `ShopRows`, `shopGroups` in
  `einkauf/shopGroups.ts`: meiste zuerst, ohne Laden „Egal wo“ zuletzt);
  ohne Läden wie bisher. Farbe je Laden fest aus 8 Tokens (`--color-shop-N`,
  `shopTone`), bis Läden eigene Farben bekommen. Beispiel-Tag: „REWE: Milch,
  Brot, Butter · EDEKA: Äpfel, Eier · Lidl: Zahnpasta, Küchenrolle“
  (`DEMO_SHOPS`). Keine Firmenlogos: Symbol nach Ladentyp (`shopType`,
  `SHOP_TYPE_ICON`: 🛒 Supermarkt · 🌿 Biomarkt · 🧴 Drogerie · 🥖 Bäcker · 🥕
  Wochenmarkt · 🏪 Sonstiges) + Name + Farbpunkt (REWE rot, EDEKA gelb, Lidl
  blau).
  Jetzt-Karte 15:00–19:30: „Auf dem Heimweg? 3 Sachen bei REWE“ (ab 2
  Sachen). Einkaufsmodus und Lernen seit v0.41 (siehe „Einkauf nach Läden“).
- Test: `tests/jetzt.test.ts`; Durchklick `jetzt` im Scratchpad (7:10 /
  16:40 / 20:30 / 23:00, Tauschen bleibt, Wischen, ✕, SE bis Pro Max).

## Korrekturen Teil 0 (v0.28)

- Abhaken überall gleich (Startseite, Tag, Aufgaben-Seite, Beispiel-Tag):
  durchgestrichen, nach ~2 s (`LEAVE_MS` in `alltag/actions.ts`) weich weg
  (`card-out`), dann „Erledigt · Rückgängig“ für 4 s (`showDone`, `act(…,
  { done: true })`). Beispiele werden dabei nur ausgeblendet
  (`hideDemoItem`, `gone`), nie gespeichert.
- Start in Hell: neue Profile `theme: "warm"`, Profil v20 `themeSet`
  (selbst gewählt). Migration: ohne eigene Wahl → Hell, Dunkel bleibt. Ab dem
  3. Tag einmal leise „🌙 Abends lieber dunkel? Automatisch · Nein danke“
  (`DarkTip`, `core/darkTip.ts`, Speicher `wasgibts.dunkeltipp`).
- Statusleiste: `.status-veil` deckend in Seitenfarbe (Safe-Area oben).
- Beispiel-Tag: je Kachel weg beim ersten Eigenen (Termine, Aufgaben,
  Pinnwand, Einkauf); nach dem ersten eigenen Termin/der ersten eigenen
  Aufgabe einmal „Alle Beispiele entfernen? Ja · Behalten“ (`askRemoveAll`,
  `asked`). Hinweis: „Trägst du in einer Kachel Eigenes ein, verschwinden
  dort die Beispiele.“
- Termine höchstens 2 Spalten: S 1, M bis 4 (2×2), L bis 6 (2×3), Titel bis 2
  Zeilen, mehr → „+N weitere“.
- Helle, schwebende Mia-Leiste (`LotteBar`), „Fertig“- und Größen-Knöpfe in
  Orange statt Schwarz.
- Test: `tests/daten.test.ts` (Ansicht v20), `tests/demo.test.ts` (Frage);
  Durchklick `teil0` im Scratchpad.

## Korrekturen Teil B (v0.26)

- Diktat: `useSpeechInput().reset()` beim Absenden (alle Eingaben), danach
  schreibt nichts mehr zurück; Doppel-Absenden gesperrt.
- Aufgaben-Reihenfolge zentral (`orderedTasks`, `sortItems`,
  `byTimeThenAge` in `aufgaben/model.ts`): dringend → heute (inkl. "von
  gestern") → nächste Frist → diese Woche → irgendwann; innerhalb Uhrzeit,
  sonst Erstellungszeit (`seit` nach "Auf morgen" = ans Ende), nie alphabetisch.
- Dringend: `AufgabeData.dringend`, Chip „❗ Dringend“ im Schnell-Eintrag,
  Menü „Als dringend markieren“/„Nicht mehr dringend“, Sprache „Dringend: …“ /
  „… ist wichtig“ (`urgentFrom`), Lotte `aufgabe_*` mit `dringend`; kleines
  oranges „!“ (`UrgentMark`, Tokens `quick`) vor dem Titel; Lottes Satz
  „**X** ist heute wichtig.“ Keine zusätzlichen Erinnerungen.
- Fenster: `useBackCloses` (Zurück-Geste schließt; Verlaufseintrag
  `{sheets}`) in `Sheet`, `ConfirmDialog`, Einkauf-Plus und Chat; ✕,
  Danebentippen, Runterwischen wie gehabt. Phasen-Schild öffnet ein Fenster
  (Erklärung, „Normale Ansicht“, „Einstellungen“); danach nur der Chip „✨
  Wieder mitdenken“ (`phase.resume`). Phase „☀️ Morgens · Überblick für den
  Tag“, nächster Tag immer mit Wochentag (`tomorrowLabel` → „Morgen · Mi“,
  Erinnerung „Morgen (Mi) um …“), Einstellung „Morgens bis 10:00“.
- Startseite: Termine als schlanke Kärtchen (`TerminCard`; seit v0.28 höchstens
  2 Spalten), Aufgaben im 2er-Raster (`TaskField`; S 2 –
  halb untereinander, breit nebeneinander –, M 2×2, L 2×4, ungerade = leeres
  Feld). Leere Kacheln „+ eintragen“, Einkauf-Vorschau mit „ · “.
  Statusleiste: `.status-veil` (Safe-Area, Hintergrund durchscheinend mit
  Weichzeichner), theme-color hell/dunkel ab dem ersten Zeichnen.
- Wetter: Standard S; eigenes Symbol-Set `WeatherSymbol`
  (`src/components/wetter/`, Farben `--wx-*`), Kachel-Verlauf je Lage
  (`.wx-card[data-wx]`, `weatherGroup`, im Dunkeln gedämpft); S Symbol +
  Temperatur + ein Satz, M + Morgens/Mittags/Abends, L + 5 Tage in Worten.
  Seite `/wetter` (`WeatherView`): Heute · Morgen · 7 Tage (wischen, Punkte;
  ab 18 Uhr „Morgen“, `?tag=`), Kopfkarte, Satz zu Terminen (`daySentence`),
  drei Tageszeit-Karten mit Tipp-Chips (`dayParts`), 7 Tage mit „☀ draußen“
  und „Bester Tag für draußen“ (`bestOutdoorDay`). Rein in
  `src/lib/wetter/view.ts`; Testmodus zusätzlich `schnee`/`gewitter`/`wolkig`.
- Sport: jeder Tag der Kachel öffnet `SportDaySheet` (leer: „✓ Wie letztes
  Mal“ + Eintragen; trainiert: Ändern, „+ Noch ein Training“, Löschen;
  geplant: Erinnerung, Wetter, „✓ Erledigt“, „Verschieben …“, „Absagen“;
  Zukunft: „Training planen“ mit `freeStarts` → Termin Etikett Sport,
  Erinnerung 30 Min).
- Test: `tests/teilb.test.ts`; Durchklick `groessen` (Höhen S ≤ M ≤ L) und
  `teilB` im Scratchpad.

## Begleitung zum Aussuchen + Hell/Dunkel (v0.22)

- Seit v0.23: Lieblingsfarbe = Begleitung UND App-Icon (siehe "App-Icon in der
  Lieblingsfarbe"); die übrigen App-Farben bleiben fest.

- Datenmodell (Profil v19, `src/lib/einstellungen/profile.ts`): `helper =
  { name, art: assistentin|assistent, voice, farbe }`; `voice` folgt immer der
  Art (`voiceForArt`, `helperWith`). `STANDARD_HELPERS` = Mia (Assistentin,
  Orange) und Theo (Assistent, Nachtblau), `DEFAULT_HELPER` = Mia (neue
  Nutzer). `AVATAR_COLORS` (10: Orange #F26B21, Nachtblau #2B4470, Himmelblau
  #3B82C4, Lila #7357C4, Beere #A33B67, Rosa #E06C9F, Koralle #E8615A, Senf
  #C9962B, Waldgrün #3F7A5A, Anthrazit #3E3A37), `avatarHex()`. Migration
  (`migrateHelper`): ohne Namen → Lotte (wer Lotte hat, behält Lotte); Art
  aus dem Namen (Mia/Lotte → Assistentin, Theo → Assistent, sonst aus der
  bisherigen Stimme); Farbe Theo → Nachtblau, sonst Orange. Texte nur über
  `helperName()`, `helperTitle()` ("deine Assistentin"/"dein Assistent"),
  `helperTitlePersonal()`, `helperMessage()` – nie einen Namen hart codieren.
- Gesicht: `<LotteAvatar size color? />` nimmt ohne `color` die Profilfarbe
  (seit v0.23 das ruhige Gesicht, siehe Leitbild 7; `.begleitung-ring` in
  `globals.css`). App-Icon bleibt orange.
- Auswahl (`src/components/begleitung/BegleitungPicker.tsx`): zwei Karten
  Mia/Theo (Radio, ✓ und oranger Rand, "▶ Stimme" = `playVoice` → "Hallo,
  ich bin …" mit passender Stimme), "✎ Oder gib mir einen eigenen Namen …"
  (Feld, `ArtChoice` Assistentin/Assistent, `ColorDots` 2×5 mit Ring). Unter
  `/profil/kuechenhelfer` (`HelperEditor`).
- Stimme (`speech.ts`): Assistentin → beste weibliche deutsche Stimme,
  Assistent → beste männliche, sonst irgendeine deutsche. Fehlt eine passende:
  einmal der Hinweis `VOICE_HINT` (iPhone-Einstellungen → Bedienungshilfen →
  Gesprochene Inhalte → Stimmen → Deutsch; `takeVoiceHint`,
  `wasgibts.stimmenhinweis`). Stimme frei wählbar unter `/profil/vorlesen`;
  wechselt die Art, wird eine fest gewählte Stimme auf "Passend" gesetzt.
- (Historie – seit v0.32 alles auf der Seite der Begleitung, `MiaView`.)
  Einstellungen ganz oben (`BegleitungSettings.tsx`): DEINE BEGLEITUNG – Name
  (mit Gesicht) › · Ist: Assistentin | Assistent · Stimme › · Farbe ›
  (`/profil/farbe`) · Vorlesen an/aus (an = automatisch), Hinweis "Oder
  einfach sagen: ‚Ich nenn dich ab jetzt Frieda.‘"; DARSTELLUNG – Automatisch
  · Hell · Dunkel (Standard für neue Profile Automatisch). "Frisch" ist weg
  (wird Automatisch).
- Lotte: `assistent_anpassen` (`helperTools.ts`, Op `set_helper`, Vorschau +
  Übernehmen; Mia/Theo bringen Art und Farbe mit), antwortet im neuen Namen
  ("Gern – ab jetzt bin ich Frieda. 😊"), danach Hinweis, wo man es ändert.
  Ohne KI `parseHelperCommand` in `settingsChange` ("Ich nenn dich ab jetzt
  Frieda", "Sei lieber Theo", "Nimm eine männliche Stimme", "Mach dich
  lila") – sofort, zurück mit "Mach das rückgängig". Systemanweisung: "Du
  heißt {Name} und bist {die persönliche Assistentin | der persönliche
  Assistent} der Familie in der App ‚Was gibt's?‘. Charakter: warm, kurz,
  ohne Druck, motivierend."

## Lebendiger Avatar (v0.24)

- Icon/Avatar: Sprechblase mit mittiger Spitze, ruhiges Gesicht; eine
  Avatar-Komponente für alle Stellen. Lieblingsfarbe = Begleitung und
  App-Icon, einheitlich; übrige App-Farben fest. Avatar-Zustände (ruhig,
  begruessen, zuhoeren, denken, sprechen, freuen, verwirrt, schlafen) setzt
  die App automatisch – nie vom Nutzer gewählt; im Chat ersetzt ‚denken‘ jede
  Lade-Anzeige; Fehler zeigt ‚verwirrt‘ statt Fehlermeldung.
- Vorlage: `docs/vorlagen/avatar-animation.md` (SVG mit Klassen `av-*`, CSS in
  `globals.css`, `data-zustand` am Wrapper, `--c` = Lieblingsfarbe, `.klein` <
  44 px bzw. Leiste, `.gross` ≥ 56 px bzw. Chat-Kopf/Vorstellung; nur
  transform/opacity, `prefers-reduced-motion` = keine Bewegung).
- Zentraler Zustand `src/lib/core/avatarState.ts` (alle Avatare gleich):
  Rangfolge zuhören > sprechen > denken > verwirrt > freuen/begrüßen >
  schlafen > ruhig. Auslöser: `useSpeechInput` (Mikrofon an), Chat
  (`busy` ohne Text → denken; Fehler-Turn → verwirrt), `speech.ts` (onstart/
  onboundary: Mund nur während Worte, Pause > 0,6 s = ruhig), `act()` (letzte
  Aufgabe des Tages erledigt → freuen), `celebrate()` (Sport-Wochenziel →
  freuen), `TodayPage` (Feierabend mit Ruhe → schlafen; erstes Öffnen am Tag →
  begrüßen, `wasgibts.avatargruss`), Leiste antippen weckt. Einmalige Zustände
  starten per neuem Element neu und fallen danach auf ruhig zurück.
  Fester Zustand nur wo passend (`zustand`: Mia/Theo-Karten ruhig,
  Vorstellung begrüßen). Kein 👋 mehr.
- Sätze statt Fehlermeldung: "Hm, das hab ich nicht verstanden." /
  "Ich bin gerade offline – was du einträgst, speichere ich trotzdem."
  (`unavailableText`). Lautstärke-Ring per Web Audio bewusst nicht (kollidiert
  auf dem iPhone mit der Spracherkennung) – normales Pulsieren.

## App-Icon in der Lieblingsfarbe (v0.23)

- `npm run icons` erzeugt je Farbe aus `AVATAR_COLORS` einen Satz unter
  `public/icons/<farbe>/` (icon.svg, icon-192, icon-512, icon-maskable-512 mit
  Zeichen auf 72 %, apple-touch-icon 180, favicon-32; Verlauf von der Farbe
  18 % heller zur vollen Farbe, Gesicht in der vollen Farbe; Orange = Original).
  Pfade über `iconFor(farbe, "…")` (`src/lib/core/app.ts`).
- Manifest dynamisch (`src/app/manifest.ts`): liest das Cookie `farbe`, feste
  `id: "/"`, gleiche URL – Android/Chrome übernimmt ein neues Icon selbst.
- `IconSync` (Layout): setzt beim Laden und nach jeder Farbwahl das Cookie und
  `apple-touch-icon`/Favicon auf die Farbe (das iPhone liest das Icon beim
  "Zum Home-Bildschirm"). Die Icon-Vorschau in den Einstellungen ebenfalls in der Farbe.
- Farbwechsel später (Einstellungen `/profil/farbe` mit Icon-Vorschau, Lotte,
  Regel ohne KI): auf dem iPhone als Homescreen-App `iconChangeHint()` – "Das
  Icon auf dem Homescreen bleibt, bis du die App neu hinzufügst." und, solange
  `CLOUD_SYNC` aus ist, die Warnung zum Datenverlust beim Entfernen.

## Tagesphasen, Timer, Sport (v0.21)

- Seit v0.29: Phasen ändern nur Inhalte, nie die Anordnung; Modus
  Mitdenkend/Immer gleich, Schild, „Alles zeigen“, Vorrang-Kacheln und
  Zusammenklappen sind entfernt (siehe „Feste Anordnung + Jetzt-Karte“). Die
  Beschreibung unten ist insoweit Historie.

- Tagesablauf (`src/lib/tagesablauf/settings.ts`, Speicher
  `wasgibts.tagesablauf` v1): `mode` mitdenkend (Standard) / gleich, `ruhe`
  (Ruhe nach Feierabend, Standard an), `morgenBis` 10:00, `feierabendAb`
  20:00 + `nachArbeit` (frühestens nach dem letzten Arbeit-Termin),
  `arbeitstage` (0 = Mo … 6 = So, Standard alle), `kochenAuto` + `kochenMin`
  (20). Einstellungen → ganz oben "Tagesablauf" (`/profil/tagesablauf`,
  `DayRoutineView`: zwei große Karten mit Mini-Vorschau, Schalter, Zeiten,
  Arbeitstage, Kochen-Modus, Zeit-Vorschau "So tun, als wäre es …" =
  sessionStorage `wasgibts.zeitvorschau`, wirkt nur auf die Startseite,
  Hinweis "Vorschau: 18:20 · beenden" (`PreviewBanner`)). Kennenlernen: Frage
  "Soll sich deine Startseite dem Tag anpassen?" (Schritt `startseite`),
  "Sport" als Auswahl mit Frage nach dem Wochenziel (Schritt `sport`). Lotte:
  `startseite_modus` (Op `set_day_mode`, Vorschau); ohne KI "Lass die
  Startseite immer gleich" / "Startseite soll mitdenken". Push-Regeln schon
  vorbereitet (`tagesablauf/push.ts`, `pushAllowed`).
- Phasen (`src/lib/tagesablauf/phases.ts`, rein): `PHASES` = Liste mit `id`,
  `rank` (Kochen 50 > Sport 40 > Feierabend 30 > Morgen 20 > Tagsüber 10),
  `active(ctx)`, `view(ctx)` (Schild, Erklärung, `top` Vorrang-Kacheln mit
  Größe/`force`, `collapse`, `hide`, `hideWork`, `familyUpcomingOnly`,
  `weatherTomorrow`, `wakeLock`). `arrangeHome()` ordnet nur die Anzeige –
  die gespeicherte Sortierung bleibt. Morgen (5:00–morgenBis): Pinnwand (nur
  bei Neuem, dann mit Wetter klein nebeneinander) · Wetter · Termine ·
  Aufgaben. Kochen: Essen mit Uhrzeit 20 Min vorher bis 45 Min danach, ein
  laufender Timer (bis 15 Min nach dem letzten) oder "Ich koche jetzt"
  (Essen-Kachel/Lotte, `kochen/session.ts`, `wasgibts.kochen`); Essen L
  (`CookingTile`: Schritte abhaken, "JETZT", ⏱ je Schritt mit Zeit,
  "Rezept groß öffnen ›", "Gegessen ✓"), Timer M, Einkauf/Wetter weg,
  Termine/Aufgaben/Pinnwand als Zeile "Heute noch: …" (aufklappbar), Wake
  Lock (`core/wakeLock.ts`). Sport: 60 Min vor einem Termin mit Etikett
  Sport bis zu seinem Ende (nur mit Sport-Kachel). Feierabend: ab
  feierabendAb bzw. nach dem letzten Arbeit-Termin bis 5 Uhr; Pinnwand,
  Familien-Termine, die heute noch kommen (nachts keine), Wetter "MORGEN"
  (S), Notizen, Freizeit-Idee (Liste "Als Freizeit markieren",
  `leisureIdea`), "1 Aufgabe wandert auf morgen", unten "💼 Arbeit, Termine
  und Aufgaben machen Pause bis morgen früh. Alles zeigen". Nicht-Arbeitstag:
  Arbeit ganztags weg. Lottes Satz je Phase (Timer-Stand/Schritt, Training,
  "Schönen Feierabend – für heute ist alles getan."). Wechsel nur beim
  Öffnen/Zurückkehren oder nach 30 s ohne Berührung (`useHomePhase`, nie im
  Bearbeiten-Modus), bewusste Schritte sofort (`nudgePhase`). Schild unter
  dem Datum (Tokens `phase-*`), antippen = Erklärung + "Normale Ansicht";
  "Alles zeigen" gilt bis zum nächsten Phasenwechsel
  (`wasgibts.alleszeigen`). "Immer gleich" = keine Phase, Timer/Sport nur
  als aktive Kacheln.
- Timer (`src/lib/timer/`, `wasgibts.timer` v1): bis 5 Timer + Stoppuhr,
  jeder mit Endzeit (stimmt nach Hintergrund/Neustart), Pause = Restzeit.
  Kachel (`TimerTile`, NEU) M: Ring, Restzeit groß, "+1", Pause/Weiter, ✕,
  weitere als Zeilen, Schnellknöpfe 5/10/15 Min · Stoppuhr (lange drücken =
  eigene Dauer + Name); S: nächster Timer oder "⏱ Timer starten". Bei
  "Mitdenkend" erscheint ein laufender Timer automatisch oben (bis 1 Min nach
  Ablauf). Band über allen Seiten (`TimerAlarm` im Layout): "⏰ Nudeln sind
  fertig – OK" mit Ton (Web Audio, beim Start freigeschaltet, alle 2,5 s bis
  OK, max. 1 Min); abgelaufen, während die App zu war: "⏰ Nudeln war um 18:30
  fertig". Einmaliger Hinweis zum Ton; `timerPushPlan` für Push später.
  Lotte: timer_stellen, timer_stoppen, stoppuhr, timer_status, kochen_starten,
  kochschritt – sofort ausgeführt (`INSTANT_OP_TYPES`, `runInstantOps`), ohne
  Übernehmen; ohne KI `dayChat()` (`lotte/dayChat.ts`).
- Sport (`src/lib/sport/`, `wasgibts.sport` v1, persönlich): Trainings (typ
  "training": Sportart, Minuten, km, Datum), Wochenziel (Standard 3, Woche ab
  Montag), Packlisten je Sportart, gefeierte Wochen. Sport-Termine = Termine
  mit Etikett "Sport" (nur meine/ohne "wer"); abgehakt zählen sie automatisch
  (`trainingsBetween`, Dauer aus dem Termin, ändern/löschen auf `/sport`).
  Kachel (`SportTile`, grün, NEU) S/M/L, Seite `/sport` (`SportView`: Ziel,
  Verlauf, Trainings, Packlisten), Eintragen-Fenster (`SportAddSheet`).
  Serie nur in Wochen (`weekStreak`). Feier genau einmal pro Woche
  (`SportCelebration` im Layout, `core/celebrate.ts`), mehr als das Ziel =
  "Bonusrunde! 🔥", Montag "Neue Woche, neues Glück." bzw. "Letzte Woche
  geschafft 🔥 – auf ein Neues". Lotte: sport_eintragen, sport_ziel_setzen,
  trainings_planen (`planTrainings`: freie Lücken, 60 Min Abstand zu Arbeit,
  Wunsch-Tageszeit, Wetter → trockene Zeit oder drinnen, Erklärung der
  Ausnahmen, Termine mit Erinnerung 30 Min vorher), sport_statistik – mit
  Vorschau; ohne KI `dayChat()`. Apple Health/Watch geht nicht (Web-App).
- Standard-Reihenfolge: Pinnwand · Termine · Aufgaben · Wetter · Essen +
  Einkauf · Timer · Sport · Notizen · Vorrat · Morgen · Post.
- Vibration nur über `navigator.vibrate?.` (Android); iPhone still.

## Termine, Aufgaben und die drei Seiten (v0.10)

- Datenmodell `src/lib/aufgaben/` (Speicher `wasgibts.eintraege` v1, im
  einheitlichen Eintrags-Modell): Termin = Titel, Datum, Startzeit, opt.
  Ende, Ort/Notiz, Raum, Etikett, Wiederholung (täglich/wöchentlich/
  monatlich/Wochentage), Erinnerung (aus/15/30/60/Vorabend), wer. Aufgabe =
  Titel, opt. Wunschtag oder Frist, opt. Uhrzeit, Raum, Etikett,
  Wiederholung, Erinnerung, erledigt (`doneOn` bzw. `doneDates`). Reine
  Logik in `model.ts` (`itemsForDay`, `setDone`, `moveItem` – bei Serien nur
  dieser Tag + Einzelkopie, `removeItem(onlyDate)`, `setReminder`). Alte
  Termine (`wasgibts.termine`) werden einmalig übernommen
  (`migrateOldTermine`, im KitchenHelper), alte Daten bleiben liegen.
- Termine, Aufgaben, Notizen getrennt (v0.16): Aufgabe hat optional Tag,
  Frist oder Zeitraum (`week` = Montag, "diese Woche"); ohne alles =
  "Irgendwann" (steht an keinem Tag). `taskOverview()` gruppiert Heute dran ·
  Diese Woche · Später · Irgendwann · Erledigt (14 Tage); `urgentTasks()`
  (heute, nächste Frist, diese Woche), `upcomingTermine()` (läuft noch oder
  kommt noch). Speicher `wasgibts.eintraege` v2: alte "Aufgaben" mit Tag +
  Uhrzeit (ohne Frist) wurden zu Terminen. Heute (`MiniCards.tsx`):
  Abschnitte TERMINE und AUFGABEN mit je 2 Kärtchen nebeneinander (1 = volle
  Breite, 0 = Abschnitt weg), Farbstreifen links (Familie orange, Arbeit
  blau), Termin: Uhrzeit 15 px fett, Titel 12,5 px, graue Zeile, Kästchen
  oben rechts; Aufgabe: Kreis links; "+ N weitere" → Tag bzw. `/aufgaben`;
  Antippen = Menü, Abhaken mit Animation/Vibration, der nächste gleitet
  herein (`card-in`). Essen und Einkauf (beide kompakt) nebeneinander.
  Seite `/aufgaben` (`TasksView`, Filter, Gruppen, "✓ N erledigt"
  eingeklappt, "+" mit "Irgendwann/Diese Woche"). Notizen
  (`src/lib/notizen/`, Speicher `wasgibts.notizen` v1, typ "notiz"): Titel,
  Emoji, Text ODER Liste (abhakbar), Raum, angeheftet. Seite `/notizen`
  (angeheftet oben voll, sonst 2er-Raster, Hinweis "Merk dir …"), Editor
  `/notizen/bearbeiten?id=|?neu=text|liste` (speichert sofort). Erreichbar
  über die Woche (unten "Aufgaben · Notizen"), Lotte und optional die Kachel
  "notizen" (Startseite anpassen, standardmäßig aus). Woche: Aufgaben mit Tag/
  Frist klein mit Kreis. Lotte: notiz_anlegen, notiz_aendern, notiz_loeschen,
  liste_eintrag_hinzufuegen (legt Liste an; "… wünscht sich …" → Geschenkideen),
  notiz_anheften, notizen_anzeigen, aufgaben_anzeigen, aufgabe_anlegen mit
  `zeitraum` (Ops `upsert_note`/`remove_note`); Kontext: Notiz-Titel und
  Aufgaben ohne festen Tag. Ohne KI `parseNoteCommand()` ("Merk dir das
  WLAN-Passwort: …", "Was steht auf der Packliste?", "Häng das WLAN oben an",
  "Was muss ich heute noch erledigen?", "Zeig mir meine Aufgaben/Notizen").
- Unerledigte einmalige Aufgaben mit Tag rutschen still auf heute: kein
  "überfällig", nur "von gestern"/"von Montag"/"von letzter Woche".
  Vergangene Termine und Serien-Tage verschwinden leise.
- Seiten (`HomePager`): Leiste "Woche · Heute · Essen" (seit v0.31 „Kalender ·
  Heute · Essen“), Wechsel per Tipp
  oder Wischen (nicht in Feldern/`data-no-swipe`/Fenstern), Scrollhöhe je Seite
  gemerkt, keine Seiten-Punkte. Seit v0.39 wie eine iPhone-App
  (`usePagerSwipe`): die drei Seiten liegen nebeneinander (Nachbarn kurz nach
  dem Start vorgerendert, `fixed` auf ihrer gemerkten Scrollhöhe), Richtung
  einmal pro Geste (> 10 px, mehr waagerecht als senkrecht), die Seite folgt
  1:1 dem Finger (nur transform, nicht-passiver `touchmove` erst ab
  Waagerechte, kein React-Rendern beim Wischen), Wechsel ab 25 % Breite oder
  > 0,35 px/ms (`swipeDecision`), sonst zurückfedern, 280 ms weiche Kurve,
  Gummiband am Rand, Segment-Schalter gleitet mit, „Bewegung reduzieren“ =
  kurzes Überblenden. Verlauf: Heute → Kalender/Essen = EIN Eintrag
  (`router.push`), Kalender ↔ Essen ersetzen, zu Heute = `router.back()`
  (`expectTabSwitch` in `navigation.ts`: kein Sprung nach oben). Test:
  Durchklick `wischen` (CDP-Touch).
  - Heute (`TodayPage`): "Guten Morgen/Hallo/Guten Abend, <Name>." (bis 11/
    18 Uhr), Datum, EIN Satz von Lotte (`todaySentence`, z. B. "Ruhiger Tag:
    2 Termine, eine Aufgabe und abends Gemüsepfanne.") oder eine fällige
    Erinnerung ("In 30 Minuten: Jonne abholen.", `dueReminder`, "Okay" =
    gesehen), höchstens ein Knopf. Karte "Heute" (`DayItemsCard`): nach
    Uhrzeit, ohne Uhrzeit darunter; Zeile = Uhrzeit, farbiger Strich, Titel,
    Unterzeile (Etikett, von gestern, Frist, Erinnerung, Wiederholung),
    Kästchen (Animation + Vibration). Max. 3, "+ N weitere"; Erledigtes
    eingeklappt "✓ N erledigt"; alles erledigt: "Alles erledigt für heute
    🌙"; ohne Einträge keine Karte. Antippen = Menü (Erledigt · Auf morgen ·
    Erinnerung ändern · Bearbeiten · Löschen, bei Serien "Nur diesen Tag"/
    "Alle"), immer mit Rückgängig-Toast. Kacheln Essen (⇄ andere Idee,
    "Nehmen") und Einkauf ("+" mit Tippen/Einsprechen und "Oft gekauft"-
    Chips aus der Stammliste). Ab 16 Uhr gestrichelte Vorschau "Morgen".
    Keine Gesamtzähler auf Karten.
  - Woche (`WeekPage`): Filter Alles · Familie · Arbeit, Tageskarten ab heute
    (14 Tage, "Weitere Wochen"), links Wochentag + Datum groß, rechts
    Einträge mit Punkt und Uhrzeit, darunter 🍽 Essen; heute umrandet, leer
    "frei". Antippen → `/tag?datum=` (`DayView`, wie Heute für dieses Datum,
    Zurück → Woche). Plus → Formular (`EntryForm`).
  - Essen (`FoodPage`): groß das Gericht von heute (nach dem Essen morgen)
    mit Uhrzeit, Dauer, "alles im Haus" bzw. "noch: …", "Rezept ansehen"
    (`/kochbuch/rezept` ist dafür immer sichtbar) und "Tauschen"; "Diese
    Woche" als Liste (Antippen = tauschen mit 3 Ideen, Lotte fragen oder Tag
    freimachen; leer "noch frei – Lotte fragen" – nie "offen"); Einkauf als
    Chips. Nutzt die bestehenden Essensdaten (`useMeals`).
- Lotte (Bereich "alltag", `src/lib/lotte/calendarTools.ts`): termin_anlegen,
  termin_aendern, termin_loeschen, aufgabe_anlegen, aufgabe_aendern,
  aufgabe_erledigen, aufgabe_verschieben, tag_anzeigen, woche_anzeigen – als
  Vorschau mit "Übernehmen" (Ops `upsert_entry`, `remove_entry`,
  `done_entry`, `move_entry`, gespeichert in `save()`). Kontext je Anfrage:
  Datumsliste der nächsten 14 Tage und alle Einträge der nächsten 7 Tage mit
  ids (`contextLines`). Lotte erkennt Termin vs. Aufgabe, Familie/Arbeit und
  Etikett selbst und fragt nur bei Unklarheit.
- Startseite anpassen (v0.11, `src/lib/core/homeLayout.ts`, Speicher
  `wasgibts.startseite` v1): Kacheln termine/essen/einkauf/morgen mit
  Reihenfolge, Größe (kompakt = Titel + eine Zeile Vorschau, z. B. "Einkauf ·
  11 Sachen: Petersilie, Gurke …"; ausführlich = mehr) und sichtbar.
  Standard: Termine ausführlich, alles andere kompakt. Langes Drücken auf
  eine Kachel oder Einstellungen → "Startseite anpassen" (`/profil/startseite`,
  `HomeCustomizer`: ziehen, Kompakt/Ausführlich, ausblenden, "+ zeigen").
  Jede Kachel ist antippbar: Essen → Essen-Seite (Wochenplan), Einkauf →
  `/einkaufsliste`, Termine → "Tag öffnen" (`/tag`), Morgen → Tag morgen.
- Lotte kann alles, was man selbst kann (`homeTools.ts`):
  startseite_anpassen, wochenplan_anzeigen/aendern/loeschen,
  einkaufsliste_anzeigen/leeren/entfernen, rueckgaengig (Ops `home`,
  `clear_week`, `clear_shopping`, `remove_shopping`, `undo_last`). Ohne KI
  sofort mit Rückgängig (`homeChat.ts`, vor der KI): "Mach die Einkaufsliste
  wieder klein/groß", "Nimm die Einkaufsliste von der Startseite", "Zeig mir
  den Wochenplan", "Lösch den Wochenplan wieder", "Nimm Milch von der Liste",
  "Leer die Einkaufsliste", "Mach das rückgängig".
- Rückgängig überall (`src/lib/core/undo.ts`): jede Änderung von Lotte (KI
  übernommen oder lokal) legt ihr Zurücknehmen ab – Toast-Knopf ca. 10 s,
  danach "Mach das rückgängig" (letzte noch gültige, in dieser Sitzung).
- Sichtbar machen: Übernimmt man einen Wochenplan, wird "wochenplan"
  freigeschaltet (`unlockFeature`, `wasgibts.funktionen.unlocked`), die
  Essen-Kachel eingeblendet und Lotte sagt "Dein Wochenplan steht rechts unter
  Essen." sowie "Einkaufsliste: 11 Sachen für die Woche, davon 4 für heute."
  Vorrat/Rezepte werden beim ersten Nutzen freigeschaltet und erscheinen in
  den Einstellungen.
- Einkaufsliste: Einträge merken sich Gericht (`ManualItem.dish`) und Tag;
  oben "Für heute", darunter "Für die Woche". Lotte gibt `fuer_tag`/`gericht`
  mit.
- Chat-Reihenfolge (v0.12, `HelperPanel` `route`/`rules`): mit KI geht jede
  Nachricht an die KI (auch Startseite, Rückgängig, Einstellungen); die KI
  nutzt Werkzeuge oder `app_befehl` (Op `app_command`: die App führt den Satz
  nach "Übernehmen" mit `rules()` aus – Ansicht, Vorlesen, Einstellungen, neue
  Person, Produkte, Seiten). Ohne KI (oder wenn sie ausfällt) greifen die
  Regeln. Nur ein selbst geöffneter Spontan-Modus nimmt Zutaten direkt an;
  ein Satz ohne Zutaten beendet ihn.
- Schleifenschutz: Antwortet die KI genauso wie zuletzt, vergisst der Chat
  den bisherigen Verlauf und offenen Vorschlag und schickt die Frage frisch.
  Oben im Chat "Neues Gespräch" (setzt Verlauf, Vorschlag, Spontan-Modus und
  geführte Fragen zurück; gespeicherte Daten bleiben).
- Pause nur bei echter Abwesenheit (`parsePauseRequest`: Urlaub/verreist/
  Ferien/"wir sind … weg" PLUS Zeitangabe; nie bei "nur zu zweit", "nicht
  da", bloßem "Pause"). Mit KI: `pause_setzen`/`pause_beenden` (Op
  `set_pause`, Vorschau + Übernehmen); ohne KI eine Frage mit "Ja,
  eintragen"/"Nein". "Ab Montag" an einem Montag = nächste Woche. Sichtbar:
  Heute "Pause … – genießt die Zeit ☀️" mit "Pause beenden", Woche "Pause ☀️".
  Profil v18 entfernt einmalig offene Pausen ohne Ende (Fehler der alten
  Regel).
- Portionen nur für einen Tag (`portionen_anpassen`, Op `set_persons`):
  `persons` am Gericht des Tages (Wochenplan-Eintrag), `PlanDay.persons`
  übernimmt es, die Einkaufsliste rechnet die Rezeptmengen um, "Rezept
  ansehen" zeigt `?personen=` ("Zutaten für 2 Personen (nur heute)"). Familie,
  Rezept und Plan bleiben unverändert.
- Mails schreiben und beantworten (v0.15, ohne Postfach – nie automatisch
  senden): `src/lib/lotte/mail.ts` (rein: `looksLikeMail`,
  `splitInstruction`, `summaryOf`, `eventsIn`, `mailtoHref`, `draftText`,
  `localReply`/`localNewMail`/`reviseDraft` für die Zeit ohne KI und den
  Testmodus). Werkzeuge `mail_entwurf` und `antwort_knoepfe`
  (`mailTools.ts`, Bereich "post"; Antwort trägt `mail`/`chips`, auch im
  Stream-Ereignis "done"). Eingefügte Mail mit Anweisung ("Antworte, dass
  Donnerstag passt, aber erst ab 9") → "Kurz gesagt: …" + Entwurf; ohne
  Anweisung → "Wie willst du antworten?" mit Knöpfen (Zusagen/Absagen/
  Nachfragen). Neue Mail ("Mail an die Kita: Jonne ist morgen krank",
  "Schreib dem Großhandel, dass …"). Adresse nur, wenn genannt oder in der
  Mail ("Von:"), sonst leer. Karte `MailCard` im Chat: Betreff, Absätze, "In
  Mail öffnen" (mailto mit Empfänger, Betreff, Text), "Kopieren" ("Kopiert ✓"),
  "Ändern" (Kürzer, Etwas förmlicher, Auf Du/Sie, Lockerer – oder per
  Sprache). Termin/Frist in der Mail → zusätzlich termin_anlegen/
  aufgabe_anlegen als Vorschlag (ohne KI: Knopf "📅 … eintragen" mit
  Rückgängig). Stil: Du/Sie je Empfänger (gemerkt bei "Auf Du/Sie"),
  Geschäftliches förmlicher, Gruß + Name, Signatur nur bei förmlichen Mails;
  Einstellungen → Mails (`/profil/mails`, `wasgibts.mails` v1 pro Gerät:
  Grußformel, Signatur, gemerkte Anrede) oder "Unterschreib meine Mails mit
  …". Eingefügte Mails werden nirgends gespeichert (nur der Chat im Speicher;
  der Entwurf geht als Text im Verlauf mit, damit "Kürzer" klappt). Das
  Eingabefeld im Chat ist mehrzeilig (Absätze bleiben, Enter schickt ab),
  Nachrichten bis 6000 Zeichen.
- Ohne KI (und im Testmodus): `parseCalendar()` (`parse.ts`) erkennt Tag,
  Uhrzeit, Frist, Wiederholung, Erinnerung, Raum, Etikett und die Befehle
  verschieben/löschen/erledigt/"Was steht … an?"/"Hab ich … Zeit?";
  `calendarChat()` antwortet und trägt sofort ein (mit Rückgängig).

## Design-System

- Tokens in `src/app/globals.css` (`@theme`): `bg-background` (warmes
  Off-White), `bg-surface` (weiß), `border-line`, `text-ink`, `text-muted`,
  Akzent `bg-accent`/`text-accent`/`text-accent-strong`/`bg-accent-soft`,
  `rounded-card`, `shadow-card`. Keine `orange-*`-Klassen direkt, keine
  weiteren Farben für Flächen.
- Bausteine in `src/components/ui`: `CARD`/`CARD_LIST`,
  `buttonClass()` (primary, secondary, soft, ghost, danger; sm/md/lg),
  `ICON_BUTTON`, `chipClass()`, `tileClass()`, `INPUT`, `LABEL`,
  `SECTION_TITLE`, `SUBTLE`, `NOTE`, `WARNING`, `PAGE_MAIN` (unten Platz für den
  Küchenhelfer-Knopf, `FAB_CLEARANCE` – jedes `<main>` mit Knopf braucht ihn,
  damit am Seitenende nichts unter dem Knopf liegt), `INPUT_BASE`, `<ListRow>` (Icon links, Titel +
  Untertitel, Pfeil rechts), `<IconBadge>`, `<CategoryChip>`/`<CategoryDot>`.
  Neue Seiten nur daraus bauen; fehlt etwas, dort ergänzen.
- Nur EINE Akzentfarbe (Orange) für Buttons, aktive Zustände und Logo. Karten
  weiß mit feinem Rahmen und leisem Schatten, keine farbigen Kachel-Flächen.
  Kategorien nur als kleiner farbiger Punkt (`CATEGORY_DOT`). Rot nur für
  Allergien/Löschen.
- Icons: `lucide-react`, Akzentfarbe oder Grau, Strichstärke 2. Emojis nur
  für Spaß-Momente (Wunschtag, Cheat Day, Willkommen).
- Typografie: Seitentitel 26px extrabold (`PageHeader`), Abschnitte
  `text-lg font-bold`, Text `text-base`, Untertitel `text-sm text-muted`.
  Abstände im 8er-Raster (gap-2/3/4, p-4/p-5), Seitenrand 16px.
- Unterseiten: `PageHeader` (Zurück-Pfeil + Titel), Inhalt in `PAGE_MAIN`,
  Knöpfe am Inhaltsende (keine fixierte Fußleiste).
- App-Icon: Lotte als Sprechblase auf orangem Verlauf (siehe Leitbild 7). Einzige Quelle
  `scripts/generate-icons.mjs` (`npm run icons` erzeugt icon.svg, PNGs,
  maskable, apple-touch-icon, favicon.ico). In der App erscheint das Icon nur
  noch als Vorschau in den Einstellungen; der Seitenkopf hat seit v0.30 keinen
  Icon-Link mehr („‹ vorherige Seite“).
## Funktionen hinter den Bausteinen (aus der Koch-App)

Sichtbar über den passenden Baustein (im neuen Design). Seit v0.25 sind
Alt-Modus, alter Hinweis-Platz (Lottes Platz), Bewertungen nach dem Kochen,
Twists, "Sanft erkennen", "Willkommen zurück", das alte Kennenlernen und der
Formular-Assistent entfernt; Beschreibungen dazu unten sind nur noch Historie.
Neue Arbeit baut auf dem Fundament oben auf.

- Personen-Schritte im Assistenten (Allergien, Mittagessen) beginnen mit einer
  Vorfrage ("Nein, alle essen alles" bzw. "Passt so – alle wie üblich" oder
  Personen auswählen). Nur ausgewählte Personen bekommen eine Einzelseite mit
  Personen-Leiste; "Doch nichts – überspringen" setzt sie zurück. Mittagessen
  "wie üblich" = `usualLunch()`: Erwachsene zu Hause, Kita-/Schulkinder
  auswärts, Kleinkinder zu Hause.
- Planungswoche = 7 Tage ab dem Einkaufstag (Profil `shoppingDay`, Standard
  Montag). Wochen werden unter dem Datum ihres ersten Tags gespeichert; nach
  einem Wechsel des Einkaufstags findet `resolveWeekKey()` die überlappende
  alte Woche. Datumslogik zentral in `src/lib/essen/weekPlan.ts`
  (`weekStartFor`, `planningWeekStart`, `weekDayNames`).
- "Standardwoche" (früher "Wochenregeln") ist die Vorlage im Profil. Der
  Wochen-Check (`/woche/check`, optional `?woche=`) übernimmt sie als Startwert
  und speichert Vorgaben pro Woche separat. Ist ab 2 Tage vor dem nächsten
  Einkaufstag die nächste Woche noch ohne Vorgaben, bietet der Helfer-Satz
  auf der Startseite an, sie zu planen.
- Es wird genau EIN Hauptgericht pro Tag geplant. Profil `warmMeal`
  ("Wann esst ihr meistens zusammen warm?", Profil v6): mittags oder abends,
  getrennt für Mo–Fr und Sa–So – bestimmt nur Anzeige und Personenzahl
  (`mainMealTime`, `mainMealHeadcount`: mittags unter der Woche nur, wer dann
  zu Hause ist), nicht die Anzahl der Plätze.
- Wunschtag: in der Standardwoche einstellbar (Tag, Mindestalter).
  Teilnahme ab Mindestalter, ohne Alter Schul-/Kitakinder ja, Kleinkinder nein.
  Reihum in `wishDay.order`; wer dran ist, ergibt sich aus der letzten
  gespeicherten Woche mit Wunsch. Der Wunschtag belegt einen Kochtag und zählt
  nicht bei Fleisch/Veggie/Fisch.
- "Unsere Rezepte" (`/kochbuch`, `CookbookList`): oben großes rundes "+",
  Suche, Filter-Chips (Alle, ❤️ Lieblinge, ⚡ Schnell bis 25 Min., 🥦 Veggie,
  🥩 Fleisch, 🐟 Fisch, 🍕 Cheat Day), Raster-Karten (Emoji, Name, Zeit,
  "<n>× gekocht" bzw. "Mathis' Liebling" = schon mal Wunschessen). Nicht auf
  der Startseite (außer als dritte Kachel ohne Vorrat); erreichbar über
  "Unsere Rezepte" im Wochenplan, "Rezept ansehen", den Küchenhelfer ("Zeig
  mir unsere Rezepte") und die Einstellungen (Abschnitt "Küche"). "+" öffnet
  "Neues Rezept" (`NewRecipeSheet`): "<Name> erzählen" (Sprache oder Tippen →
  `parseSpokenRecipe()` in `src/lib/essen/recipeSpeech.ts`, regelbasiert, später KI:
  Titel, Zutaten mit Mengen, Schritte, Minuten → Vorschau "Speichern"/"Noch
  ändern"), "Selbst schreiben" (`/kochbuch/bearbeiten`), "Link einfügen" und
  "Foto vom Rezeptzettel" (Label "mit KI", bis dahin deaktiviert).
- Kochbuch-Daten (`src/lib/essen/cookbook.ts`): Rezepte mit Kategorie
  Fleisch/Vegetarisch/Fisch/Cheat Day, Herkunft "eigenes" oder "ki".
  KI-Rezepte später über `saveAiRecipe()` direkt (als Favorit) übernehmen.
  Feste Gerichte im Wochen-Check zählen in ihre Kategorie (Zähler kann nicht
  darunter sinken); ein Cheat-Day-Rezept setzt den Cheat Day auf diesen Tag.
- Wochenplan (`/wochenplan`, `src/lib/essen/mealPlan.ts`, Oberfläche
  `src/components/plan/`): Umschalter "Tag" (Standard) / "Woche"
  (`Segmented`), darunter eine schmale Zusammenfassung (x/7 geplant,
  Kategorien, ~Kosten von Budget). Tag-Ansicht: Tagesleiste (7 Tage ab
  Einkaufstag, gewählter Tag in Akzentfarbe, Kategorie-Punkt: Veggie grün,
  Fleisch rot, Fisch blau, Cheat Day orange, leer grau), große Karte
  (`DayCard`: Emoji auf Akzent-Verlauf als Platzhalter fürs Rezeptbild
  (`dishEmoji`), "WOCHENTAG · MAHLZEIT", Name, Chips Kategorie/Zeit/Personen/
  ~Kosten (`estimateCost` in `src/lib/essen/costs.ts`, grobe Richtwerte),
  "Tauschen"/"Rezept", "…" für doppelt kochen/verschieben/löschen; leer
  "+ Planen"; Ausflug, Wunschtag, Cheat Day eigen gestaltet), seitlich
  wischen wechselt den Tag, darunter "Danach" (nächste 2 Tage). Woche-Ansicht
  (`WeekListView`): eine Zeile pro Tag, Gerichte am Griff ziehen (Pointer
  Events, auch Touch) = tauschen, Tippen öffnet den Tag. Zurückblättern bis
  26 Wochen = Rückblick (nur lesen, "Nochmal kochen" setzt das Gericht auf
  einen Tag dieser/nächster Woche). Lieblingswochen (`src/lib/essen/templates.ts`,
  `wasgibts.vorlagen`): "Vorlage speichern" (Name, je Wochentag Rezept/
  Freitext) und "Vorlage laden" (Tage abwählbar, belegte Tage: "Überschreiben"
  oder "Nur freie Tage"). `buildWeek()`/`composeWeek()` setzen Plätze,
  feste Gerichte, Wunsch, Ausflugstage und Cheat Day aus dem Wochen-Check
  zusammen (Speicher v3, Schlüssel = Wochentag, Notiz unter "Tag:notiz",
  "doppelt" am Eintrag). Gespeichert werden nur eigene Einträge und
  Überschreibungen ("cleared"). Die Kategorie eines Eintrags kommt immer vom
  Gericht, nie vom Kategorie-Hinweis des Platzes.
- Einkaufsliste (`/einkaufsliste`, `src/lib/einkauf/shoppingList.ts` Speicher v4,
  Oberfläche `src/components/shopping/`): Artikel aus Rezepten im Wochenplan
  werden immer neu berechnet (`buildShoppingList`, Mengen je Einheitenfamilie
  addiert, doppelt kochen ×2, Abteilung per Stichwort). Je Artikel nur
  Häkchen, Name, Menge rechtsbündig; Info-Symbol oder langes Drücken zeigt
  die Gerichte. Abteilungen als kleine Großbuchstaben-Überschrift mit Icon,
  Artikel in einer weißen Karte; Abgehaktes durchgestrichen ans Ende, ganz
  erledigte Abteilung zugeklappt. Oben Fortschrittsbalken, "Für heute"
  (offene Artikel für heute/morgen) und fällige Stammartikel. Wischen nach
  links (`SwipeRow`): "Haben wir" bzw. "Löschen" und "Bearbeiten". Umschalter
  "Nach Abteilung | Nach Laden", Teilen gesamt oder pro Laden.
  Gespeichert je Woche: eigene Artikel, Häkchen, "Haben wir schon",
  einmalige Umbenennungen, übersprungene Stammartikel. Für den Haushalt:
  eigene Produkte (`products`: Zutat → Produkt, aus "Immer so?" beim
  Umbenennen oder Chat "Wir nehmen immer Alsan statt Butter"; Rezepte bleiben
  unverändert; Verwaltung `/profil/produkte` "Eure Produkte & Läden"),
  Läden je Artikel (`itemShops`, Vorschläge `SHOP_SUGGESTIONS` + eigene),
  Stammliste (`staples`: Kaufrhythmus gelernt aus abgehakten Artikeln,
  Median der Abstände; die frühere "Immer da"-Liste wurde zu Stammartikeln
  mit festem Wochenrhythmus migriert; fällig = Vorschlag, antippen =
  übernehmen, wischen/× = diesmal nicht). Chat/Sprache: "Müsli von Rossmann
  und Windeln auf die Liste" (`src/lib/einkauf/shoppingParse.ts`) wird ohne KI
  erkannt (Artikel, Menge, Laden) und in die Planungswoche einsortiert.
  Standard-Woche und Kachel-Zähler: die Woche, für die gerade eingekauft wird
  (`planningWeekStart`).
- Migrationen: `createLocalStore` schreibt einen migrierten Stand einmalig
  zurück, wenn sich die Version geändert hat.
- Spontan kochen (EIN Modus für alles Ungeplante): `openHelper("spontan",
  ask?, filters?)`, "Was ist noch da?"/"Reste"/"Spontan kochen" im Chat; die
  alte Route `/schnellkueche` leitet zur Startseite mit Spontan-Modus um
  (`SpontanRedirect`). Leitbild: Einfachheit vor Vollständigkeit. Die
  Ideen-Antwort (`SpontanAnswer` in `SpontanBoard.tsx`) zeigt in dieser
  Reihenfolge: EINEN Satz ("Mit dem, was da ist, gehen heute diese drei – die
  schnellste zuerst:", `spontanHeading`; nie ohne Ideen darunter), eine graue
  Zeile "Noch da: … ändern" (max. 5, öffnet den Vorrat), genau 3 kompakte
  Karten (`IdeaCards`: Emoji, Name, "25 Min · alles im Haus" grün bzw. "35
  Min · noch: Kokosmilch" – nie "fehlt"/"Alles da"; rechts "Heute", Tippen
  öffnet das Rezept) und die Chips "Anpassen" und "Andere Ideen" (3 neue,
  ohne die eben gezeigten; `exclude` je Antwort). Die besten 3
  (`rankedSpontanIdeas`, meiste Vorrats-Zutaten zuerst) werden schnellste
  zuerst angezeigt. Filter nicht im Chat, sondern im Fenster "Ideen anpassen"
  (`AdjustSheet`: ZEIT unter 20 Min/egal, VORRANG Reste zuerst/1 Sache darf
  fehlen, BEILAGE mehrfach) mit "3 neue Ideen zeigen", für die Sitzung
  gemerkt (`wasgibts.spontan.filter` in sessionStorage); per Sprache "Was
  Schnelles mit Nudeln" (`filtersFromText`, `isIdeaFilterRequest`). Jede
  Ideen-Antwort ist ein Eintrag mit eigenen Filtern/`exclude`/`extra` und
  rechnet live aus dem Bestand; nur die letzte ist offen, ältere stehen
  eingeklappt als "Frühere Ideen". Gesagtes zerlegt `parseLeftovers()` und
  landet im Vorrat ("Notiert ✓" + neue Ideen); Unbekanntes als grauer Chip
  "Meintest du …?"; ein normaler Satz ohne Zutaten beendet den Modus.
  "Heute" (`takeForToday()` in `src/lib/essen/spontanTake.ts`) ersetzt das heutige
  Gericht, das alte rutscht auf den nächsten freien Tag, mit "Rückgängig".
  Eingabefeld immer "Sag <Name>, was ansteht …". Gleiche Karten auf `/ideen`
  und in "Was gibt's heute?".
- "Kennt ihr" oder "Neu" (`src/lib/essen/dishStatus.ts`): bekannt = von Hand
  "Kennen wir" (Kochbuch v2 `known`; Schalter im Wochenplan-Eintrag und auf
  der Rezeptseite), 2× gekocht, eigenes Rezept schon gekocht, Wunsch und
  Freitext. Neu = KI-Rezepte und neu angelegte Rezepte, die noch nie gekocht
  wurden. Bei der Migration auf Kochbuch v2 gelten vorhandene eigene Rezepte
  als bekannt. Kochstil im Küchenstil (`/profil/kochstil`, Profil v12
  `cookingStyle`: "Wir kochen meist nach Gefühl" (Standard) / "gern nach
  Rezept" = Rezept immer im Vordergrund; `newPerWeek` 1 oder 2 = Abenteuerlust).
  Wochenplanung (KI-Prompt, `kochbuch_durchsuchen` liefert `bekannt` und
  `minuten`; Testmodus `pickWeekDishes()`): überwiegend bekannte, schnelle
  Gerichte, so viele neue wie `newPerWeek`.
- Tipps (`src/lib/essen/tips/`, Speicher `wasgibts.tippkarten`, Einstellung Profil
  v13 `tips` unter `/profil/tipps`: aus / ab und zu (Standard, an höchstens 4
  Tagen pro Woche) / täglich): nur auf Lottes Platz und nur, wenn nichts
  Wichtigeres ansteht. Eingebaute Sammlung (150 Tipps in `data/`: Profi-Tricks
  aus der Gastro, Tipps zum heutigen Gericht mit `match`, Spartipps,
  Reste-Ideen, Vorrat/Vorkochen; später KI). `tipDeck()`: höchstens 3 am Tag,
  stabil über den Tag – zuerst Twist, dann Tipps zum heutigen Gericht, dann
  der Gesundheits-Tipp (eigene Einstellung), dann allgemeine reihum; gezeigte
  kommen 90 Tage nicht wieder. Tipp-Karte (`TipCard`): Glühbirne, kleine
  Überschrift (z. B. "PROFI-TIPP ZUR BOLOGNESE"), 1–2 Sätze, "Mehr dazu ›".
  Gesten: Tippen = Details (Erklärung, evtl. Schritte); nach links wischen =
  für heute weg (Kategorie 3× weggewischt → nur noch jeden 4. Tag); nach
  rechts = nächster Tipp; Punkte darunter; beim allerersten Tipp einmal
  "← weg · tippen = mehr · nächster →". Twist (`src/lib/essen/twists.ts`, bei
  bekannten Gerichten höchstens 2× pro Planungswoche, nie zwei Tage
  hintereinander, nie beim Wunschessen) ist eine Tipp-Karte mit "Übernehmen"
  (Zutat → "Für heute", mit Rückgängig); der Gesundheits-Tipp eine mit
  "Ausprobieren" (links wischen = "Nein danke").
- Vorrat (`/vorrat`, `PantryView`, Speicher `wasgibts.vorrat` v2 mit Ort
  `place`): Reiter Kühlschrank (die frühere Liste "Noch da"), Tiefkühler (mit
  "seit"-Datum) und Vorratsschrank; eintragen per Textfeld oder im Gespräch
  (`placeFor()` wählt den naheliegenden Ort), antippen = ändern, verschieben,
  löschen. Grundlage für Spontan kochen und Lottes Platz (Auftauen,
  Tiefkühler-Erinnerung, Reste verwandeln).
- Schritt für Schritt kochen (`/kochbuch/kochen?id=`, `CookMode`): erst die
  Zutaten, dann ein Schritt pro Seite, Weiter/Zurück am Inhaltsende,
  Bildschirm bleibt an (Wake Lock, wo möglich).
- Plus für die Einkaufsliste (`QuickAddButton` in
  `src/components/shopping/QuickAdd.tsx`, auf der Einkauf-Karte und oben auf
  `/einkaufsliste`): rundes "+" (Trefferfläche 44×44) öffnet ein kleines
  Panel mit Textfeld (Fokus) und Mikrofon. `parseQuickAdd()`
  (`src/lib/einkauf/quickAdd.ts`): Artikel, Menge und Laden ("Müsli von Rossmann"),
  erkannt über Lebensmittel-Liste, Abteilungs-Stichwörter, Drogerie-/
  Haushaltsartikel und eigene Produkte/Läden/Stammliste – nie automatisch
  "korrigiert". Danach "<n> Sachen hinzugefügt ✓" mit "Rückgängig", Panel
  schließt; Unbekanntes als grauer Chip zum Bestätigen.
- Basis (`src/lib/essen/bases.ts`): Kartoffeln, Reis, Nudeln, Quinoa/Couscous, Brot,
  Salat oder "Egal". Gefragt bei neuen Rezeptvorschlägen (nicht beim
  Spontan kochen – da gibt's sofort Ideen; KI fragt laut System-Prompt; fragt sie nach der "Basis", zeigt das Panel
  die Chips). Chips nach Beliebtheit (Profil v8 `bases`: Zähler je Basis,
  erhöht bei Wahl und bei 👍 über `recipeBase()`), im Profil unter
  Essgewohnheiten "Eure Lieblings-Basen" (`/profil/basen`) bearbeitbar.
- Küchenstil (Profil-Abschnitt): "So kocht ihr", "Das mögt ihr", Lieblings-Basen,
  Gesundheits-Tipps, Nie wieder.
- "Das mögt ihr" (`src/lib/essen/likes.ts`, Profil v9 `likes` gewichtet,
  `likesBlocked`): gelernt aus 👍 (+2), "Gekocht" im Rezept (+1), gewählten
  Vorschlägen (Reste-Idee angetippt, KI-Vorschlag übernommen: +1) und Sätzen
  im Chat ("wir lieben Käse", "Paprika geht immer": +3, `extractLikeStatements`;
  reine Aussagen beantwortet die App selbst mit "Gemerkt ✓ …"). Nur bekannte
  Lebensmittel, ohne Grundzutaten, Basen, Allergien und "mag nicht".
  `/profil/das-moegt-ihr`: Chips mit Stufe (♥–♥♥♥), entfernen (wird dann nicht
  wieder gelernt) und ergänzen. Geht an die KI: bevorzugt einbauen, auch in
  Entdecker-Rezepten ("neu, aber nicht fremd").
- Gesundheits-Tipps (`src/lib/essen/healthTips.ts`, Profil v9 `healthTips`, Standard
  "ab und zu"; Einstellung `/profil/gesundheit`): regelbasierte Tausch-Ideen
  (`SWAPS`: halbe Sahne → Joghurt, Vollkornnudeln halb/halb, Naturreis, Hack
  zu einem Drittel → rote Linsen, halbe Menge Wurst/Speck + Paprika, weniger
  Zucker, Vollkornbrot) für geplante Rezepte ab heute – nie Cheat Day,
  Wunschessen oder bei Allergie-Konflikt. Als Tipp-Karte auf Lottes Platz
  ("Kleine Idee für …" mit "Ausprobieren") und im Chat (`TipBubble`: "Ausprobieren" ändert nur
  dieses Rezept, Notiz "🌱 Ausprobiert", mit "Rückgängig"; "Nein danke").
  Wochenlimit über `wasgibts.tipps` (gezeigte Tipps je Woche, erledigte
  kommen nicht wieder). Lob zum Wochenrückblick (`weekPraise`, ab dem
  vorletzten Tag der Planungswoche, z. B. "Diese Woche 5 Gemüsetage – stark!
  💪"). Die KI bekommt Einstellung, Zahl der Tipps dieser Woche und die
  Regeln (Systemanweisung).
- Ohne Druck (`src/lib/core/activity.ts`, Speicher `wasgibts.aktivitaet`):
  - Willkommen zurück: Nach 3+ Tagen ohne Öffnen begrüßt der Helfer auf der
    Startseite einmalig ("Hey, schön, dass du da bist! 😊 Hattet ihr eine
    gute Zeit? Frisch starten oder noch Pause?"). "Frisch starten" verwirft
    still die Planung ab heute (mit KI fragt der Chat nach Ideen, sonst
    Wochenplan), "Noch Pause" schaltet den Pause-Modus ein. Kein Rückblick
    auf Verpasstes.
  - Leiser werden: Bleiben proaktive Nachrichten (Helfer-Satz,
    Bewertungszeile) an 3 Tagen seit dem letzten eigenen Tun unbeachtet,
    schweigt der Helfer, bis wieder jemand selbst etwas tut (Plan oder Liste
    ändern, Chat, Chip antippen – `noteUserAction`).
- Pause-Modus (Profil v11 `pause` {from, until|null}; per Chat "Wir sind
  ab Freitag eine Woche im Urlaub" / "Wir sind wieder da" – `parsePauseRequest`
  in `src/lib/essen/spontan.ts` – oder unter `/profil/pause`): Pausentage zählen wie
  Ausflugstage (`PlanDay.paused`, kein Platz, keine Einkäufe), keine
  Hinweise und keine Push. Startseite: "Pause bis <Datum> – genießt die
  Zeit ☀️" mit "Pause beenden". Bis 3 Tage vor Beginn einmal "Im Kühlschrank
  ist noch … – soll ich das in die letzten Tage einplanen?", 2 Tage vor Ende
  einmal "Ihr seid bald wieder da – soll ich für <Tag> schon was
  vorbereiten?" (`markAsked`, nie wiederholt).
- Wochenend-Stil (Profil v11 `weekendStyle`, Standard "locker"; Kennenlernen
  "Wie seid ihr am Wochenende?" und `/profil/wochenende`):
  - 🏖 Frei: Sa/So keine Kategorie-Hinweise, zählen nicht bei "x/7 geplant",
    keine Hinweise/Push/Bewertung; Startseite "Wochenende – genießt es".
  - 🌿 Locker: Startseite "Falls ihr Lust habt: <Gericht>" ohne Uhrzeit,
    Zutaten auf der Einkaufsliste als "optional", keine Erinnerungen ans
    Wochenend-Essen, keine Bewertungsfragen (das Angebot, die nächste Woche
    zu planen, darf am Wochenende kommen).
  - 📅 Wie unter der Woche: normale Planung.
  - Wurden 3 Wochenenden in Folge geplante Gerichte nicht gekocht (keine
    Bewertung, nicht als gekocht vermerkt), bietet der Helfer EINMAL "frei" an.
- Spontan-Hilfe im Chat (immer, auch ohne Plan und ohne KI, `src/lib/essen/spontan.ts`):
  Ausflugs-Snacks aus dem Vorrat ("Wir fahren spontan los, was nehmen wir
  mit?"), drei schnelle Ideen unter 20 Minuten ("Wir kommen erst um 19 Uhr
  heim"; ohne KI aus dem Kochbuch, sonst Klassiker). Freitags höchstens EIN
  Grill-Vorschlag, wenn fürs Wochenende gutes Wetter vorhergesagt ist (nur
  mit Zustimmung, Ort grob per PLZ, Open-Meteo, `src/lib/core/weather.ts`).
- Planen ist optional: Ohne Gericht für heute zeigt die Startseite "Was gibt's
  heute?" mit 3 Ideen (siehe Ideen für heute) – nie als Fehler oder Warnung.
- Nach dem Essen (`src/lib/essen/mealDone.ts`, Speicher `wasgibts.gekocht` je
  Kochtag, `AutoCooked` im Layout): ab Essenszeit + 90 Minuten zählt das
  Gericht ohne Nachfrage als gekocht (auch für gestern, falls die App zu war;
  nicht bei Pause/Ausflug, nicht am lockeren/freien Wochenende, bei "spontan"
  nur aus den Ideen Gewähltes). Dann: Kochbuch "<n>× gekocht" +1
  (`countCookedOn`, Bewertung zählt nicht doppelt, Status "Neu" und erste
  Bewertung rechnen mit dem Stand vor dem Kochtag – `recipeBeforeDay`),
  Zutaten aus Kühlschrank/Tiefkühler raus (Vorratsschrank bleibt), Gekauftes
  zählt 7 Tage nicht mehr als "da" (`usedRecently` in `useStock`). "Gekocht"
  auf der Rezeptseite beim heutigen Gericht beendet das Essen sofort.
  Wochenplan heute: "✓ Gekocht · Doch nicht? Auf morgen verschieben"
  (`moveToTomorrow`: morgiges Gericht rutscht auf den nächsten freien Tag;
  Zähler und Vorrat zurück, mit Rückgängig).
- Küchenhelfer (KI, `src/lib/lotte/`, API `/api/lotte`, alter Pfad
  `/api/kuechenhelfer` leitet dorthin): schwebender
  Knopf auf allen Seiten außer der Startseite (`KitchenHelper` im Layout,
  bei offener Tastatur ausgeblendet), Panel mit Chat, Mikrofon
  (`useSpeechInput`, Fallback Tastatur-Diktat; jede Aufnahme ist eine frische
  Sitzung, der Hook liefert den ganzen Text dieser Aufnahme – nie anhängen;
  nach dem Abschicken oder Abbrechen ist alles leer) und optionalem Vorlesen; die
  Eingabeleiste der Startseite öffnet es.
  Die App schickt nur das Nötige mit (Profil, diese/nächste Woche, Kochbuch
  ohne Schritte, Vorrat); der Server führt die Claude-Tool-Schleife aus
  (`engine.ts`, Werkzeuge in `tools.ts` – je Tag ein Hauptgericht, inkl.
  "doppelt kochen", Einkaufsliste, `vorrat_hinzufuegen`, `wunsch_merken`,
  `termin_notieren`; Modell und Streaming siehe "Fundament"; Systemanweisung
  mit Prompt-Caching). Schreib-Werkzeuge ändern nichts, sie liefern `ChangeOp`s
  (`ops.ts`; Vorrat/Wunsch/Termin landen erst beim Übernehmen in ihren
  Speichern, Termine unter `wasgibts.termine` → Heute-Karte). Vorschau
  "Das würde ich machen:" (`preview.ts`, `ProposalCard`, "Übernehmen"/"Ändern")
  und Übernehmen rechnen mit denselben reinen Funktionen (`applyOps`);
  "Rückgängig" (10 s) stellt alles wieder her. Einzelne Änderungen abwählbar;
  "Ändern" schickt den offenen Vorschlag mit (`pending`). Neue KI-Rezepte
  prüfen Allergien/"mag nicht" strikt (`diet.ts`).
  Schutz (`src/lib/lotte/guard.ts`, gilt für ALLE KI-Aufrufe – Lotte und
  `/api/kennenlernen`; neue KI-Routen immer darüber): Die KI ist nur an, wenn
  `ANTHROPIC_API_KEY` UND `APP_ACCESS_CODE` gesetzt sind. Die App fragt den Zugangscode einmal im Panel
  (`AccessCodeCard`, gemerkt unter `wasgibts.zugangscode`, Header
  `x-lotte-code`, Vergleich in konstanter Zeit, falsche Versuche begrenzt);
  gemeinsames Tageslimit 100 KI-Anfragen pro Gerät für alle Aufrufe (Server
  `takeDailySlot`, App `takeAiSlot`). Ohne Code nutzt auch das Kennenlernen nur
  die Regeln. Reihenfolge im Chat:
  Navigation, Pause, Produkte, Einstellungen, Supermarkt, Backen, "Wir
  lieben …" lokal; alles andere an die KI. Ist sie nicht da (offline, aus,
  Limit, Code, kein Guthaben), greifen die Regeln (Einkaufsliste inkl. "Wir
  brauchen …", Wünsche, schnelle Ideen), sonst sagt Lotte "Gerade kann ich
  dich nicht richtig verstehen – tipp es mir kurz anders ein." – nie
  Technik-Wörter. `KUECHENHELFER_MOCK=1` = Testmodus (`mock.ts`, nutzt
  dieselben Werkzeuge, versteht die Alltags-Sätze). Daten-Module importieren
  React nur über `useExternalStore.ts`, damit der Server ihre reine Logik
  nutzen kann.
- Lotte liest vor (`src/lib/lotte/speech.ts`, Web Speech API, ohne Server;
  Einstellungen pro Gerät unter `wasgibts.vorlesen`: Modus automatisch = nur
  wenn per Mikrofon gefragt (Standard) / immer / nie, Stimme (`voiceURI`, leer
  = automatisch passend zu weiblich/männlich, sonst beste deutsche),
  Tempo langsam/normal/schnell; alter Schalter wird übernommen). Stimmenwahl:
  zuerst deutsche Stimmen mit "Premium", "Enhanced" oder "Erweitert" (auch
  Edge "Natural"; `isNaturalVoice`, Premium vor Erweitert), danach die übrigen
  (Google/Netz vor compact); Spaß-Stimmen wie Eddy, Rocko, Grandma nie, auch
  nicht in der Auswahl; erst dann Geschlecht (`voiceScore`). In der Auswahl
  stehen die natürlicheren oben mit Kennzeichen "natürlicher", darunter der
  Hinweis, wo man sie auf dem iPhone lädt. Tempo "normal" = 0,95 (ruhiger),
  langsam 0,8, schnell 1,2. Klammern, Schrägstriche,
  Auslassungen und "Mo–Fr" werden für flüssigeres Vorlesen umgeschrieben. Vor dem
  Vorlesen `cleanForSpeech()` (ohne Emojis/Markdown, Einheiten und
  Abkürzungen ausgeschrieben, "17:30" → "17 Uhr 30") und `speechChunks()`
  (Sätze bis 200 Zeichen, gegen Chromes Abbruch). iPhone: `unlockSpeech()`
  beim ersten Tippen (Mikrofon, Lautsprecher, Eingabeleiste); Stimmen über
  `useVoices()` (voiceschanged + Nachschauen). Im Chat: Lautsprecher an jeder
  Nachricht von Lotte (`SpeakButton`, nochmal = Stopp), Schalter "Antworten
  vorlesen" im Kopf (setzt immer/nie), Mikrofon stoppt sofort. Kochansicht:
  "Vorlesen an/aus" und "Nochmal", jeder Schritt (auch Zutaten, Fertig) wird
  bei "immer" beim Öffnen vorgelesen. Einstellung unter Lotte → Vorlesen
  (`/profil/vorlesen`, Probehören je Stimme); per Chat "Lies mir vor", "Nicht
  mehr vorlesen", "Sprich langsamer/schneller" (`speechChat.ts`). Geht es
  nicht (kein Ton, stumm, keine Stimme): nichts tun, keine Meldung.
- Küchenhelfer hat Namen und Gesicht (Profil v7 `helper`, seit v19 mit Art
  und Farbe – siehe "Begleitung zum Aussuchen"): Name frei (max. 20 Zeichen),
  Stimme weiblich/männlich (folgt der Art; `pickVoice()` wählt
  eine passende deutsche Systemstimme, sonst Standard). Einstellbar im
  Kennenlernen (erste Frage), im Assistenten (letzter Schritt) und unter `/profil/kuechenhelfer`. Knopf mit
  Lottes Gesicht (`LotteAvatar`); Anrede `helperTitle()`: "deine
  Küchenhelferin" bei weiblicher, "dein Küchenhelfer" bei männlicher Stimme.
  Panel-Kopf: Avatar, Name, `helperTitle()`; erste Nachricht
  "Hi, ich bin <Name> – was steht an?". Darunter keine Beispiel-Blasen,
  sondern über dem Eingabefeld klein "Zum Beispiel:" mit höchstens 3 Chips
  mit Rahmen (waagerecht scrollbar, `chatSuggestions()` in
  `src/lib/lotte/chatSuggestions.ts`): vor dem Essen "Was gibt's heute?", danach
  "Was machen wir morgen?" (ohne KI "Was ist noch da?"), Wunsch mit einer
  zufälligen Person aus dem Profil (allein "Ich wünsche mir …"), gelegentlich
  Vorrat ("Was mach ich mit Blumenkohl?") oder Einkauf. Antippen = eigene
  Nachricht; weg nach der ersten eigenen Nachricht (auch Mikrofon) und in
  diesem Chat nicht wieder; nach 10 eigenen Nachrichten nie mehr
  (`wasgibts.chatnutzung`). Mitteilungen im Namen des
  Küchenhelfers (auch künftige Push) immer über `helperMessage()` →
  "<Name>: …". Die KI bekommt Name, Familie und Ton aus dem Leitbild
  (`identityPrompt()`).
- Haushaltstypen (Profil v14 `householdType`: single/paar/familie/wg,
  `HOUSEHOLD_TYPES`): erste Frage im Kennenlernen "Für wen kochst du?" (🙋 Nur
  für mich / 👫 Zu zweit / 👨‍👩‍👧‍👦 Familie mit Kindern / 🏠 WG/Mehrpersonen,
  auch frei per `householdTypeFrom`). Ohne Kinder kürzer: keine Personen-Runde
  (alle erwachsen), Familienname nur bei Familie (WG optional "Name eurer WG"),
  bei "Nur für mich" du-Form ("Wie heißt du?", `isSolo()`). Einstellbar unter
  `/profil/haushalt` (Kacheln). Sprache: "Unsere Familie" nur bei Familie,
  sonst "Mein/Unser Haushalt" (`householdNoun`). Bestehende Profile: Typ aus
  den Personen (`deriveHouseholdType`, Kinder → Familie); kommen Personen
  dazu, passt `fitHouseholdType` an. Kinder-Funktionen (Wunschtag –
  `wishDayActive`, Kinder-Schritte beim Backen, Kita/Schule-Fragen,
  Kinder-Tipps) nur mit Kindern (`hasKids`). Kleiner Haushalt
  (`isSmallHousehold`, 1–2 Personen): Einkaufsliste rechnet Rezeptmengen auf
  die Personen des Tages um und rundet auf (g/ml auf 50, Stück ganz;
  `buildShoppingList(…, { small })`), "doppelt kochen" heißt "Reicht für
  morgen", bei Resten im Kühlschrank bietet Lotte "Einfrieren" an, Tipps
  Vorrat/Einfrieren zuerst. Wochenend-Ideen (Tipp-Kategorie `wochenende`,
  Fr–So, `audience` kids/nokids/paar): ohne Kinder Freunde einladen,
  Wochenmarkt, Kochabend zu zweit, Brunch, Ausflug, Neues ausprobieren.
- Backen (Kochbuch v3: `kind` "kochen"/"backen", `oven` {mode, temp, minutes},
  `pan`, `kidSteps`, `machineSteps`): Backrezepte immer in g/ml. Eingebaute
  Backstube `src/lib/essen/baking/` (20 Familienrezepte, IDs `b:<id>`, lesbar und
  backbar wie eigene; "In unsere Rezepte" = `adoptBuiltin`). Filter
  "🧁 Backen" in "Unsere Rezepte" zeigt eigene Backrezepte und darunter "Aus
  unserer Backstube". "Zusammen backen" (`CookMode`): Backofen + Form auf der
  Zutatenseite, Schritte mit Zeit bieten "<n> Min – ich sag Bescheid" →
  sichtbarer Timer (`role="timer"`, läuft über alle Schritte, am Ende Ton per
  Web Audio + Vibration); Kinder-Schritte "🧒 <Kind> darf jetzt:" reihum
  (`kidStepLabel`). Küchenhelfer: Backwünsche ("Können wir einen Apfelkuchen
  backen?", "Was kann ich mit den Kindern backen?", `isBakingRequest`) →
  bis zu 3 Rezepte mit "Zusammen backen"/"Rezept" (ohne KI). KI-Backrezepte
  später.
- Im Supermarkt fragen (`src/lib/essen/market.ts`): "im Angebot", "ich steh grad
  im …", "hier gibt's …" (`isMarketSituation`, Produkt `marketProduct`) →
  besonders kurze Antwort mit 2–3 Ideen samt Zeit (Kochbuch zuerst, dann
  Vorlagen; `marketIdeas`), "Was du dafür noch brauchst: …" (ohne Vorrat,
  Einkaufsliste und Grundzutaten). "Auf die Liste" legt Produkt + Fehlendes
  als `now`-Artikel an → Abschnitt "Jetzt mitnehmen" ganz oben in der
  Einkaufsliste (bis abgehakt), mit Rückgängig. "Statt <Tag> einplanen"
  (`marketTargetDay`: heute vor der Essenszeit oder nächstes geplantes
  Gericht) → `takeForDay`, das bisherige Gericht rutscht auf den nächsten
  freien Tag, mit Rückgängig. `MarketAnswer.source` ist offen für "foto"
  (Produkt/Angebotsschild per KI später).
- Thermomix (Profil v14 `kitchenMachine` "keine"/"thermomix", Küchenstil →
  "So kocht ihr" → Küchenmaschine): Rezepte mit `machineSteps` zeigen den
  Umschalter "Mit Thermomix"/"Klassisch" (`MachineSteps.tsx`, gemerkt unter
  `wasgibts.maschinenansicht`), "Schritte für Thermomix" mit Zeit/Temperatur/
  Stufe/Linkslauf. Rein beschreibend – keine Logos, keine Partnerschaft.
  Vorerst nur eingebaute Rezepte, KI später.
- Einstellungen (`/profil`, `FamilyOverview`, Bausteine in
  `src/components/profile/settings/`) nach Häufigkeit: KOCHEN (Kochstil,
  Essen & Vorlieben, Wochenende – nicht bei spontan), UNSERE KÜCHE (Rezepte,
  Vorrat mit Anzahl), LOTTE ("Wie oft meldet sich Lotte?" → `/profil/lotte`:
  Modus, Tipps, Vorlesen, Wochenend-Ideen, Name & Stimme, Pause), AUSSEHEN (Ansicht,
  Darstellung), EINMAL EINGERICHTET (grau: Unsere Familie `/profil/familie`
  mit Personen, Haushaltstyp, warm essen, Einkaufstag, Produkte; Daten & App
  `/profil/daten`). Gruppenüberschrift klein in Großbuchstaben, darunter eine
  weiße Karte; jede Zeile Icon, Titel + Untertitel, rechts der Wert in
  Akzentfarbe (`ListRow value`). Unterseiten stellen eine klare Frage mit
  Antwort-Karten (`ChoiceCards`, `SettingsPage`) und wirken sofort – auch die
  Formulare (`ProfileEditPage` speichert jede gültige Änderung); unten "Gilt
  sofort – nichts wird gelöscht." "Essen & Vorlieben" (`/profil/essen`):
  Veggie-Tage & Woche (nur mit Planung), Das mögt ihr, Mag nicht & Allergien,
  Lieblingsgerichte; bei "Einfach" hinter "Mehr anzeigen": Basen, Nie
  wieder, Gesundheits-Tipps. Joker gibt es (noch) nicht – wird nicht
  angezeigt. Per Lotte (`src/lib/lotte/settingsChat.ts`, ohne KI, mit
  Rückgängig): "Jonne isst jetzt vegetarisch/vegan/wieder Fleisch", "Lisa mag
  keine Pilze", "… allergisch gegen …", "Ich koche jetzt spontan", "Mach die
  Ansicht dunkel", "Melde dich seltener/öfter", "Keine Tipps mehr", "Zeig mir
  alles" u. a.
- Profil v17 `mixSuggest` (nie / zwei / woche, Standard 2 Tage): bei "Mal so,
  mal so" auf der Kochstil-Seite "Darf ich von mir aus was vorschlagen?";
  "Ganze Woche" = höchstens einmal pro Woche "Soll ich dir für nächste Woche
  ein paar Gerichte vorschlagen?".
- Profil v15: `theme` (warm/nacht/auto – "frisch" gibt es seit v19 nicht mehr, wird Automatisch), `helperMode`
  (locker/normal/dranbleiben), `display` (einfach/alles), `weekendIdeas`;
  Migration: Warm, Normal, Einfach, an.
- Ansichten (`/profil/ansicht`, Vorschau-Karten als Mini-Startseite): Farben
  nur als CSS-Variablen in `globals.css` (`--app-*` → Tokens; Nacht stellt
  zusätzlich Grau-/Rottöne um, `text-on-accent` für Text auf Akzentflächen,
  Toasts `bg-ink text-background`). `data-theme` am `<html>`, gesetzt vor dem
  ersten Zeichnen (`THEME_BOOT_SCRIPT`) und von `ThemeSync` (auch
  theme-color). Automatisch folgt `prefers-color-scheme`. Das App-Icon
  bleibt immer orange; Lottes Gesicht hat die gewählte Icon-Farbe.
- Darstellung "Einfach": seltene Einstellungen hinter "Mehr anzeigen", keine
  Kosten-Schätzungen im Wochenplan (außer mit Budget); "Alles zeigen" zeigt
  alles.
- Lotte-Modus (`/profil/lotte`, steuert nur Lottes Platz, Regeln ohne KI):
  "Ganz locker" = nur Stufe 1 (zeitkritisch), keine Bewertung/Lob/Tipps;
  "Normal" = wie beschrieben; "Dranbleiben" = zusätzlich ab 4 Tage vorher
  "Soll ich die nächste Woche schon mal vorbereiten?" und für freie Tage der
  nächsten zwei Tage "<Tag> ist noch frei – soll ich dir was Schnelles
  vorschlagen?" (je einmal). Die KI bekommt den Modus im Kontext.
- Personen entfernen (`src/lib/einstellungen/removePerson.ts`, `usePersonRemoval`):
  Rückfrage "<Name> entfernen?" (`ConfirmDialog`), danach Toast mit
  "Rückgängig" (`showToast`, `ToastHost` im Layout). Aufgeräumt werden
  Personenzahl, Wunschtag-Reihenfolge, Wünsche in Wochen-Vorgaben (→ keiner)
  und im Plan (→ normales Gericht). Die letzte Person bleibt (freundlicher
  Hinweis).
- Zurück-Navigation (`src/lib/core/navigation.ts`, `NavigationMemory` im Layout,
  `BackButton` im `PageHeader`, `useGoBack()`): eigener Verlauf in
  sessionStorage; der Pfeil macht `router.back()`, nur ohne Verlauf geht's zu
  `backHref`. Scrollhöhe je Verlaufs-Eintrag gemerkt (beim Verlassen, beim
  Scrollen), beim Zurück nach dem Rendern wiederhergestellt; vorwärts oben.
  Speichern/Abbrechen in Formularen nutzen ebenfalls `useGoBack()`;
  `router.replace` immer mit `expectReplace()`.
- Kochstil "Plan oder spontan" (Profil v16 `planStyle`: plan / spontan / mix,
  `PLAN_STYLES`; Migration: Gerichte im Plan → "Ich plane gern", sonst "Mal
  so, mal so"; `planWeek` = "nur diese Woche planen"). Einstellbar unter
  Kochstil (`/profil/kochstil`), im Kennenlernen (Frage "Wie kocht ihr eher –
  mit Plan oder spontan?" nach dem Wochenend-Stil; spontan → ohne Einkaufstag
  und Wochenvorgaben) und im Formular (Schritt "Mit Plan oder spontan?").
  `effectivePlanStyle()`/`usePlanStyle()`: spontan mit `planWeek` dieser
  Woche zählt wie "mix".
- "Ich koche spontan": Daten bleiben, nur ausgeblendet. Wochenplan,
  Wochen-Check, Wochenvorlage und Einkaufstag leiten weiter (`PlanningGate`),
  Einstellungen ohne Einkaufstag/Wochenvorlage/Wochenend-Stil. Startseite:
  `useHomeData` zeigt vom Plan nur, was aus den Ideen gewählt wurde
  (`spontan: true` am Eintrag); Kachel "Ideen" statt "Woche"; Lottes Platz
  ohne Planungs-Stufe (Vorrat-Texte ohne "einplanen"), keine Tipps übers
  Planen, Bewertung nur für gewählte Ideen. Einkaufsliste: keine Wochenliste
  aus dem Plan (`manualOnly`), immer die laufende Woche, offene Artikel
  früherer Wochen wandern mit (`carryOverManual`). KI: Kochstil im Kontext;
  von der KI übernommene Gerichte werden als spontan markiert.
- Ideen für heute (`src/lib/essen/ideas.ts`, ohne KI): Wünsche ganz oben, dann
  Lieblinge/kennt ihr/👍, Vorrat und Reste, Jahreszeit, nicht dasselbe wie in
  den letzten 5 Tagen, unter der Woche eher schnell; dazu Familien-Klassiker.
  Heute-Karte ohne Gericht (alle Kochstile): `IdeasCard` "Was gibt's heute?"
  mit 3 kompakten Ideen-Karten ("Heute" übernimmt, Tippen = Rezept bzw.
  Details mit "Nicht jetzt"). Braucht die Idee noch etwas: "Soll ich dir das für
  heute auf die Liste setzen? Dafür brauchst du noch: …" → Einkaufsliste
  "Für heute" (ganz oben, für alle Kochstile; ersetzt "Heute holen"). Seite
  `/ideen` mit Filtern (schnell, veggie, mit Vorrat), Wunsch-Feld und – nur
  bei spontan – leise "Lieber ein paar Tage vorplanen?". Tagesstand unter
  `wasgibts.ideen`.
- Ideen aus dem Bestand (`src/lib/essen/dishIdeas.ts`, `src/lib/essen/useStock.ts`):
  Bestand = Vorrat + auf der Einkaufsliste Abgehaktes/"Haben wir schon"
  (diese und Einkaufswoche) + eben im Chat Genanntes (`ChatState.extra`,
  landet nicht im Vorrat). EINE Gerichte-Liste `DISHES` für "Was gibt's
  heute?", Spontan kochen und Testmodus. Bewertung: sobald etwas da ist,
  zählen genutzte Hauptzutaten, Abdeckung und Reste/bald Ablaufendes
  (Kühlschrank seit 2+ Tagen, `soonToUse`) mehr als Liebling/kennt ihr;
  Spontan: meiste Vorrats-Zutaten zuerst, reicht es ohne Einkauf nicht, dürfen
  1–2 Kleinigkeiten fehlen. Jede Idee zeigt "nutzt: … · noch: …" (`usesLine`).
  Vorrat (fast) leer (< 3 echte Zutaten): Grundzutaten-Gerichte und "Sag mir,
  was da ist, dann passe ich die Ideen an." Ideen werden bei jeder Änderung
  neu gerechnet; die gemerkte Position der Ideen-Karte gilt nur für denselben
  Bestand (`stockKey`). Die KI bekommt den aktuellen Bestand kompakt (Name,
  Menge, Ort, "gekauft", "bald verbrauchen"). Ohne KI: "Was kann ich heute
  kochen?" (`isCookIdeasRequest`) und "Was mach ich mit Hack und Paprika?"
  (`ingredientsFromQuestion`) öffnen die Spontan-Ideen.
- Wunsch-Ideen (`src/lib/essen/wishes.ts`, `wasgibts.wuensche`): "Mathis wünscht
  sich Pfannkuchen" im Chat (ohne Wochentag bzw. bei spontan immer lokal) oder
  auf `/ideen`; "Mathis' Wunsch" ganz oben, bis gewählt oder weggewischt.
- Planung freischalten (`src/lib/essen/planUnlock.ts`): "Ich will doch mal planen"
  im Chat (bei spontan) oder auf `/ideen` → "Nur diese Woche oder ab jetzt
  immer?"; immer → "Mal so, mal so" oder "Ich plane gern".
- "Mal so, mal so": freie Tage sind normal – kein "x/7 geplant", leerer Tag
  im Wochenplan "Spontan – Ideen gibt's am Tag selbst"; Lotte bietet statt
  der ganzen Woche höchstens einmal pro Woche "Soll ich dir die nächsten 2
  Tage vorschlagen?" an (nicht im Modus "Ganz locker").

## Großes Aufräumen (v0.47.1 – v0.48.0)

Etappen 0–9 ohne neue Funktionen: Sicherheitsnetz (Durchklick, 96
Vergleichsbilder), Ungenutztes entfernt (knip 0, alte Seiten als
Weiterleitungen), große Dateien geteilt, Ordner nach Bereichen, einheitliche
Regeln als Tests, feste Sortierung (`core/sort.ts`), Tests je Bereich
(Abdeckung 98,5 %), schneller (Layout ohne Startseite, Fenster und Zeichnen
bei Bedarf), CLAUDE.md kompakt mit `docs/bereiche/`. Zahlen und gefundene
Fehler in `docs/aufraeumen-nachher.md`.

## Tipp „Neue Kacheln holen“ (v0.48.1)

- Statt der Sprechblase unter „+ Kachel“ ein Tipp-Overlay beim allerersten
  Bearbeiten der Startseite (`heute/AddTileTip.tsx`): Abdunklung, „+ Kachel“
  hervorgehoben, Karte mit Spitze zur echten Knopf-Mitte, „Verstanden“.
  Tipp auf „+ Kachel“ öffnet sofort die Auswahl. Zurücksetzen über Daten &
  App → „Tipps wieder zeigen“. Durchklick-Ablauf `kachelTipp`.
- v0.48.2: an die gültige Fassung angeglichen – echter Knopf statt Kopie über
  der Abdunklung, Farben nur über Tokens (`accent`, `accent-strong`,
  `tip-scrim`, `tip-ring`), neuer Merker „kachel-tipp“ (erscheint auch bei
  allen, die die alte Sprechblase gesehen haben), Zurück/Escape, Scroll-Sperre,
  Fokus bleibt im Tipp, Zurücksetzen nur im Testmodus („Einmal-Hinweise
  zurücksetzen“). Durchklick zusätzlich iPhone SE und dunkel.

## Begrüßung neu (v0.49.0)

- Hallo-Bildschirm nach Tafel 19: Pastell-Kacheln, Begleitung, „Euer Alltag
  an einem Ort.“, Sprech-Knopf mit direktem Einsprechen, „Daten
  wiederherstellen“ statt „Ich habe eine Sicherung“. Neuer Op
  `set_household` („Ich bin Felix, wir sind Lisa und drei Kinder“), Werkzeug
  `haushalt_vorstellen`. Durchklick `hallo2` (10× frisch, passt ohne Scrollen
  auf SE/15 Pro/Pro Max/Pixel 7, Sprech-Knopf mit Schein-Mikrofon, abgelehnt,
  Link).

## Kalender übernehmen – Datei (v0.50.0)

- Baustein „Kalender übernehmen“: .ics aus Google/Apple einlesen (eigener
  Parser, Zeitzonen, Serien, Ausnahmen, Erinnerungen), Vorschau, Familie/Arbeit
  je Kalender, Übernehmen mit Rückgängig, keine Doppelten. Termin-Modell um
  ganztägig, Serienende, mehrtägig und „alle N Wochen“ erweitert. Die
  Begleitung erklärt den Weg und öffnet die Seite. Teil 2 (Kalender-Link/Abo)
  folgt.

## Kalender übernehmen – Kalender-Link (v0.51.0)

- Dauerhaft verbinden per geheimem iCal-/webcal-Link (Google/Apple), nur lesen:
  Server-Abruf mit SSRF-Schutz, Abo-Termine als eigene Ebene in Farbe des
  Kalenders, „In unseren Kalender kopieren“, Aktualisieren beim Öffnen und
  höchstens alle 30 Minuten, Links nicht in der Sicherung (außer auf Wunsch).

## Konten 3a – Anmeldung und Haushalt (v0.52.0)

- Supabase-Konten: Anmelden per E-Mail-Code, Haushalt anlegen oder mit Code
  beitreten, Einladen (Erwachsene/Kind, 7 Tage, Teilen-Text), Abmelden mit
  Frage, Konto löschen und Daten exportieren. Tabellen mit RLS und
  Spalten-Rechten, Migration in `supabase/migrations/`, Datenbank-Test gegen
  echtes Postgres, Test-Backend für den Durchklick mit zwei Browsern. Ohne
  Variablen bleibt alles wie bisher. Teilen der Einträge folgt mit 3b.

## Konten 3b – Synchronisieren (v0.53.0)

- Tabelle `entries` mit RLS, `sync_entries` (neueste Änderung gewinnt,
  Löschen nur als Markierung), Realtime. Abgleich als Schicht über den
  bestehenden Speichern (Übersetzer je Speicher, Fingerabdrücke,
  Warteschlange) – die Bereiche selbst blieben unverändert. Übernahme mit
  Vorschau „… werden mitgenommen.“, Hinweis „Offline – wird gleich
  abgeglichen“ erst nach über einer Minute. Durchklick mit zwei Browsern.

## Anmelden direkt von der Begrüßung (v0.54.0)

- Tafel 20: „Familie schon dabei? Anmelden“ auf dem Hallo-Bildschirm (nur
  mit Konten), eigene ruhige Seiten für E-Mail, Code und Start (anlegen oder
  beitreten), danach direkt die Startseite mit dem Flug der Begleitung.
  Einladungs-Link `/beitreten?code=…` mit eingetragenem Code. „Los geht’s“
  bleibt der Weg ohne Konto.

## Großer Check vor der Präsentation (v0.54.1 – v0.55.0)

- Begrüßung: Sprech-Chip raus, unten die Leiste mit Mikro; kein Anmelden-Link
  bis Tafel 22. Prüfskripte `npm run pruefen` (684 Seitenaufrufe je Lauf) und
  `npm run knoepfe`. Gefunden und behoben: Stammartikel-Chips in der
  Einkaufsliste nicht antippbar (vergrößerte Tippfläche lag darüber), Mikro
  und Plus über dem Titel der kleinen Pinnwand-Kachel, zu kleine Tippflächen
  (Kalender-Zeilen, „Noch frei“, Hinweis-Links), Vibrations-Warnung ohne
  Tipp. Neu: Bearbeiten beenden ganz leicht (Tafel 24, Fertig-Leiste unten,
  kurzer Tipp = fertig, Kachel-Menü weg), Pinnwand-Memo antippen statt halten.
  Durchklick zusätzlich: Offline-Start, „Neue Version da“, Stammartikel.

## Sport – klarer und schöner (Tafel 25, v0.55.1)

- Geplante Tage zeigten nur die Stunde im Kreis („18“) – jetzt gestrichelter
  Ring mit Sport-Icon und die volle Uhrzeit darunter; heute frei = oranger
  Ring mit „+“. Kachel S/M/L: „Als Nächstes“ („Sa 18:00 · Laufen · 45 Min“),
  Woche, letzte Trainings. Linien-Icons statt Emojis überall.
- Training planen: eigene Uhrzeit (Zeit-Rad) und Dauer neben den
  Vorschlägen, „Andere“ Sportart (gemerkt), Überschneidungs-Hinweis,
  zuletzt genutzte Zeit, „Jede Woche“, Knopf „Planen · Sa 18:30“; dasselbe
  Formular zum Ändern (nur diesmal/jede Woche). Ende geht nie über
  Mitternacht (23:30 + 45 Min ergab „23:15“). Ohne KI zählen jetzt auch
  „laufen/joggen/yoga/fitness“ als Sport-Termin. Schmale Felder
  (`INPUT_INLINE`).

## Jetzt-Karte: zuerst einkaufen, dann kochen (v0.55.2)

- Nachmittags stand das Essen („Start 18:05“) vor „Auf dem Heimweg?“. Jetzt
  gilt: Was zuerst zu tun ist, steht zuerst – Einkauf vor Essen, solange der
  Kochstart mehr als 30 Min weg ist; fehlende Zutaten fürs Essen stehen im
  Einkauf-Hinweis.

## Mikrofon aus – so findet es jeder (Tafel 27, v0.56.0)

- Statt Kleingedrucktem: einmalige Vorab-Frage „Darf ich zuhören?“, großes
  Hilfe-Fenster mit vier Schritten je Gerät (iPhone/iPad, Android/Chrome,
  Diktieren aus) und „Zeig’s mir“ Bild für Bild; danach gelber Streifen und
  grauer, durchgestrichener Mikro-Knopf an allen Mikro-Stellen. Bugfix: kein
  hängender Stopp-Knopf mehr nach einem Mikro-Fehler. Neue Tokens
  `--app-warn-soft`/`--app-warn-ink`.

## Termin eintragen – ein Satz genügt (Tafel 26, v0.57.0)

- Das Uhrzeit-Feld wurde von der iPhone-Tastatur verdeckt, und man sah nicht,
  was erkannt wurde. Jetzt: ein Satz („Mittwoch 12.30 Zahnarzt“), zwei Pillen
  für Tag und Uhrzeit zum Korrigieren, Zeit-Rad, ohne Uhrzeit ganztägig mit
  Vorschlägen, Hinweis bei schon vergangener Zeit, Leiste mit „Eintragen“
  klebt über der Tastatur. Neuer gemeinsamer Parser `kalender/sentence.ts`.

## Stimme – weg vom Blech-Klang (Tafel 28, v0.58.0)

- Mia nimmt immer die beste deutsche Stimme des Geräts. Fehlt eine gute,
  bietet sie nach dem ersten Vorlesen EINMAL an, eine zu laden – mit
  Schritt-Karten je Gerät und iOS-Version („Lesen & Sprechen“ ab iOS 26,
  „Gesprochene Inhalte“ bis 18) und „Zeig’s mir“; neue Stimme wird erkannt
  („✓ Neue Stimme gefunden“). „liest vor …“ im Chat, Tipp stoppt. Schritt-
  Karten jetzt gemeinsam mit dem Mikrofon (`ui/StepGuide`).

## Wochencheck – einfach drauflos reden (Tafel 36, v0.59.0)

- Einfach erzählen, was diese Woche ansteht – Mia sortiert. Eigenes Fenster
  mit langem Zuhören (Pausen sind okay), markierten Kernwörtern und „Ich hab
  schon“; danach „Deine Woche“ mit Fragen als Knöpfen, Ändern per Antippen
  und „Alles übernehmen“ mit einem Rückgängig. KI-Werkzeug
  `woche_eintragen`, ohne KI eigene Erkennung (`kalender/wochencheck.ts`).
  Jetzt-Karte montags und sonntags ab 17 Uhr, ✕ = diese Woche nicht mehr.
  `sentence.ts` versteht jetzt auch „Kino um acht“ und „nächste Woche
  Dienstag“.

## Kochtipp – spontan mit Mia (v0.60.0)

- Kochmütze in der Essen-Kachel für spontane Tage: Mia fragt kurz nach
  Vorrat, Resten oder Einkauf, versteht freie Antworten und schlägt EIN
  Gericht als Karte vor („Anderes“ / „Machen wir“ → heutiges Essen, der Plan
  bleibt). Die Mütze erscheint ab dem 3. Nutzungstag, früher auf Nachfrage
  oder mit „Alles zeigen“.

## Mehr Ideen – bunte Mischung zum Durchschieben (v0.61.0)

- Unter jedem Rezept eine endlose, wischbare Reihe mit 8 Ideen – jeden Tag
  eine andere Mischung (schnell, Lieblinge, besonders, wenn Zeit ist),
  passend zur Familie. Neuer Rezeptvorrat „Aus unserer Küche“ mit 34
  Gerichten und eigenen Zeichnungen.

## Mia zuerst – erzählen statt ausfüllen (Tafel 53, v0.62.0)

- Statt der Schreib-Leiste ein runder Mia-Knopf unten rechts. Tippen holt
  Mia in die Mitte (sie fliegt hinein), sie hört gleich zu, Status und Text
  groß, Antworten als Untertitel, Karten darunter, „Passt“ oder „ja“
  übernimmt und Mia schließt von selbst. „＋“ holt erst Mia, „Lieber
  Formular“ bleibt. Weiche Bewegung nur über transform/opacity.

## Marke Mia – Teil 1: Logo-Dateien (v0.63.0)
- Hauptlogo = App-Icon + Schriftzug „Mia“ (Plus Jakarta Sans 800, leicht
  eng, als Pfad, runder i-Punkt). Varianten hell, dunkel, auf Orange, nur
  Icon, runder Aufkleber, „Mia.“ – je SVG, PNG 1×/2×/3× und Druck (300 dpi)
  in `public/brand/` (`npm run brand`). Komponente `BrandMark`, Tokens
  `--app-brand*`, Regeln in `docs/brand.md`, Vorschau `/brand` nur im
  Testmodus. Die App heißt noch „Was gibt’s?“ (Teil 4 erst nach „Name frei“).

## Marke Mia – Teil 2: zwei Looks „Farbig“ und „Schlicht“ (Tafel 51, v0.64.0)
- Profil v21: `look` (Standard Farbig) und `calendarColor` (die frühere
  Lieblingsfarbe). Farbig = Pastell eine Stufe kräftiger mit gleicher
  Sättigung, Innen-Kärtchen weiß, Uhrzeit in Tonfarbe, Wetter als Himmel;
  Schlicht = weiße Kacheln mit feinem Rand. Wahl beim ersten Start („Wie
  magst du’s?“), in der Bearbeiten-Leiste („+ Kacheln · Aussehen · Fertig“),
  unter Einstellungen → Aussehen und per Mia („ruhiger“/„wieder farbig“).
- Mia und das App-Icon sind immer orange; Farbbefehle an Mia entfallen.
- Jetzt-Karte ohne Doppelung zu Kacheln, die schon „Morgen“ zeigen;
  Beispiel-Tag mit echten Terminen statt Mahlzeiten.

## Marke Mia – Teil 3: Aufgaben sind persönlich, abgeben geht (Tafel 52 B, v0.65.0)
- Aufgaben gehören der Person, die sie anlegt (RLS `entry_visible`,
  Migration `aufgaben_persoenlich`); geteilt wird nur durch Abgeben
  (`data.fuer`). „An … geben“, „von Felix“, „Passt gerade nicht“,
  „Zurückholen“, eingeklappt „Abgegeben“, Meldung bei Erledigt, Mia „Sag Lisa,
  sie soll …“. Kachel „Aufgaben“ als Checkliste (S 2 / M 4 / L 6).

## Versprechen offen halten (v0.65.1)
- Mia verspricht nur, was die App kann: keine Erinnerungs-/Nachrichten-
  Versprechen ohne Push (Prompt-Regel, Textregel, Sport-Formular ehrlich).

## Einkauf – einfach wie Bring (Tafel 35, v0.66.0)

- Einkaufsliste als Kacheln in Abteilungsfarben mit 56 eigenen, im Code
  gezeichneten Symbolen (`symbolFor`, `ItemSymbol`); unbekannt = Anfangs-
  buchstabe. Chips „Alle“ + Läden statt „Nach Abteilung/Nach Laden“;
  gewählten Laden nochmal tippen = Einkaufsmodus. Ansicht v1 → Chip v2.
- „Mehr hinzufügen“: Katalog mit Suche/Mikro, „Oft gekauft“, Mehrfachauswahl.
  Das große Feld „Was brauchst du?“ ist dafür weg (`ShoppingAddField`).
- Tippen = gekauft → „Zuletzt gekauft“; lange drücken = bearbeiten (statt
  Wischen). Startseiten-Kachel M/L mit kleinen Kacheln.
- Rezept-Links an Mia (Teil B) und „Familie Bescheid sagen“ (Teil 6, wartet
  auf Push) folgen.

## Pinnwand-Sprachnachricht geht wieder + Knöpfe getrennt (v0.66.1)

- Ein Mikrofon-Verwalter in `core/mic` (nur ein Nutzer, Freigabe in allen
  Wegen, kurze Pause nach dem Abgeben für iOS, getUserMedia mit 4 s Zeitlimit).
  Spracheingabe (`useSpeechInput`) und Pinnwand-Aufnahme melden sich dort an.
- Pinnwand-Aufnahme: AudioContext im Tipp, Aufräumen auch ohne „stop“-Ereignis,
  „sehr kurz“ nur mit echtem Ton, nie hängen in „wird vorbereitet“.
- Gefunden beim Testen: der nachgeschobene Klick vom Antippen landete auf
  „Senden“ der Aufnahme-Zeile und verschluckte danach den nächsten Tipp.
- Pinnwand-Kachel: „+“ oben, Mikro unten; e2e-Regel „Tippflächen in Kacheln
  überlappen nie, kleine Knöpfe mit ≥ 8 px Abstand“.

## App heißt Mia (Teil 4, Tafel 55, v0.67.0)

- Name an einer Stelle (`APP_NAME`), Manifest „Mia – Familienplaner“ /
  „Mia“, Icons v4 (gleiches Motiv, neuer Dateiname), CACHE_VERSION.
- Begrüßung nach Tafel 55, Startseiten-Kopf mit BrandMark und Datum,
  „Über Mia“, Sicherung `mia-sicherung-…`, Einladungstext.
- Begleitung fest Mia: Auswahl Mia/Theo und Umbenennen entfernt, Profil v22
  (Migration, einmal „Ab jetzt heiße ich überall Mia.“), „Ich bleib lieber
  Mia 😊“. Einstellungsseite „Mia“: Stimme oben, Vorlesen darunter.
- iPhone-Hinweis „neu hinzufügen“ (einmal, mit Sichern zuerst).
- Mail-Vorlage `docs/mail-vorlage.md`. „Was gibt’s?“ bleibt nur fürs Essen.

## Startseite – Feinschliff nach dem Handy-Test (Tafel 58/59, v0.67.1)

- Termine und Aufgaben im gleichen Listenstil: ein weißes Feld, Zeilen 30 px
  (ganze Zeile tippbar, `data-zeile`), Kopf auf allen Kacheln gleich (26 px,
  Titel 11 px, „+N weitere“ neben dem Plus), S 2 / M 4 / L 6, 8 px zwischen
  den Kacheln.
- Termine: ganztägig oben, „läuft“ (30 Min bzw. bis Ende), nächster Termin
  als Pfirsich-Zeile mit „gleich“, alles vorbei → „Morgen · Sa“
  (`lib/heute/termineKachel.ts`); neu gerechnet auch beim Zurückkommen.
- Aufgaben: erledigt 1,5 s durchgestrichen, dann weich weg (auch am
  Beispiel-Tag).
- Spendentopf fragt „Gemeinsam für Ostholstein“ (`POT_TEXTS.together`), nie
  „App wert“ (Test in `tests/app/regeln.test.ts`).
- Kochmütze am Beispiel-Tag sichtbar, ohne Blase; „ab Tag 3“ bleibt.
- Pinnwand S am Beispiel-Tag zweizeilig; Mia-Knopf verdeckt auf keiner Seite
  den letzten Inhalt (Durchklick `miaKnopfFrei`).

## Sprachnachricht: erster Tipp nimmt auf, Speichern klappt immer (v0.67.2)

- Felix (iPhone, v0.67.0): erst der 2. Tipp nahm auf, nach „Senden“ kam „ließ
  sich gerade nicht speichern“ und die Nachricht war weg.
- Ton als ArrayBuffer + Typ in IndexedDB, alte Blob-Zeilen lesbar; scheitert
  IndexedDB, bleibt der Ton im Arbeitsspeicher und die Nachricht steht
  trotzdem in der Pinnwand. Fehler beim Senden: Aufnahme bleibt, „Nochmal
  senden“.
- Erster Tipp der Sitzung startet beim Loslassen; hängendes Mikro: einmal
  still neu versuchen. Safari-Tab: einmal der Tipp mit dem Homescreen-Icon.
- Mikro-Protokoll (5× auf die Version in Daten & App).

## Jetzt-Karte – neu gedacht (Tafel 60, v0.68.0)

- Nur, was die Kacheln nicht zeigen, mit höchstens einem Knopf (Erledigt /
  Öffnen / Antworten / Liste / Kochen / Packliste); „Erledigt“ mit kurzem ✓.
- Neue Themen: Vorbereiten (Notiz am Termin), Gleich ≤ 15 Min mit Zusatz,
  Packliste, Absprache bei Abendterminen mit Kindern, Ausblick ab 19 Uhr,
  Wetter nur mit Draußen-Termin. Weg: Grad, reiner Morgen, Wetter ohne Plan,
  Zähler, ✕ und „Passt sich deinem Tag an“.
- „Alles ruhig – ich sag Bescheid.“, wenn nichts ansteht.

## Hallo-Bildschirm: Freudensprung + „KARAMBA Eis“ (v0.68.1)

- Nach 2 s springt Mia einmal vor Freude (ducken, eine Drehung, Landung mit
  Funken, zwei kleine Hüpfer) und sagt „Ich bin bereit!“; „Los geht’s“
  pulsiert zweimal. Antippen macht sie kitzelig (wackeln, Herzen, „Hihi,
  kitzelig!“).
- Unten „Gemacht in Eutin · von KARAMBA Eis“. Regel: immer „KARAMBA Eis“,
  nie nur „KARAMBA“ (Test in `tests/app/regeln.test.ts`).

## Wetter: Wind mit Windsack und Richtung (Tafel 63 B, v0.69.0)

- Je Stunde jetzt auch Windstärke und -richtung (Bright Sky bzw. Open-Meteo);
  Tageswert aus 7–21 Uhr, Richtung als Vektor-Mittel, 8 Kürzel.
- Windsack in drei Stufen (hängt · halb · gerade), Richtung nur als
  Buchstaben. 7 Tage: Zeile unten je Spalte; Heute/Morgen: „22 km/h aus
  West“; Tageszeiten: „22 km/h · W“ (Böen ab 50). „🌬️ Windig“ entfällt.
- Mia: „Ist es windig?“, „Woher kommt der Wind morgen?“.

## Gespräch mit Mia – eine Bühne (v0.70.0)

- Felix: Jedes Gespräch mit Mia soll gleich aussehen, egal ob über den
  Mia-Knopf, „＋“, Wochencheck, Termin per Satz oder Kochidee. Aus „Mia in
  der Mitte“ (Tafel 53) wurde die Bühne: Seite verschwommen dahinter,
  Gespräch oben als Blasen, Mia groß im unteren Drittel, fliegt ein und
  zurück. Statt Untertitel und Status-Zeile („ICH HÖRE ZU …“) sprechen jetzt
  Blasen und Mias Zustand; statt „Tippen“ + großem Mikro-Knopf
  (`MiaControls`, entfernt) gilt: Mia antippen = zuhören ↔ fertig, „Lieber
  tippen“. Der Wochencheck nutzt dieselbe Bühne.

## Kochidee statt Kochtipp (Tafel 64 C/65, v0.71.0)

- Felix (Video): Die Mütze auf einem geplanten Gericht klang wie ein Tipp
  ZUR Pasta, „Was da ist oder neu kaufen?“ wollte keiner entscheiden, eigene
  Wünsche hatten keinen Platz, Mikro-Hilfe und Zugangscode schoben sich
  davor. Jetzt: „Was anderes?“ bzw. „Idee“, sofort drei Vorschläge ohne
  Frage, die einladende Mia-Karte, frei erzählen, Karussell, „Nehmen“
  ersetzt und trägt Fehlendes ein. Kochtipp-Karte, Schnellantworten und die
  alte Einzelauswahl (`pickCookDish`, `parseCookWish`) sind entfernt.

## Schnelleingabe + Pinnwand (Tafel 69–72, 76, v0.72.0)

- Felix: „＋ = schreiben, Mia = sprechen.“ Jedes ＋ öffnet jetzt eine
  Schnelleingabe (ein Feld, Tastatur sofort, ➤ speichert, „Eingetragen: … ·
  Rückgängig“, Feld bleibt offen) mit Live-Chips ohne KI (Tag · Uhrzeit,
  Familie/Arbeit, „bis …“, „Für mich“). Kein eigenes Mikro mehr in
  Eingabefeldern; Formulare nur über „Mehr Details“. Kalender-＋ = „NEUER
  TERMIN“ mit gewähltem Tag (das Fenster „Was möchtest du eintragen?“ ist
  weg). „＋ holt Mia“ und „Lieber Formular“ sind weg.
- Pinnwand: Man will in die Pinnwand reinsprechen, Nachrichten wie bei
  WhatsApp wegwischen und mit Daumen/Herz beantworten; die Kachel soll klein
  bleiben. Jetzt: Kachel fest 156 px mit 2 Zeilen und „+N“, ＋ =
  Schnelleingabe „NACHRICHT AN ALLE“, Mikro = Sprachnachricht; auf der Seite
  links wischen = löschen (eigene), rechts = antworten (Zitat), lange drücken
  = 👍 ❤️ 😂 😮 🙏 + Menü. Reaktionen je Person (Speicher v3), Mias Gruß im
  Beispiel-Tag ersetzt durch eine Familien-Nachricht.
- Alles an der Pinnwand verschwindet 24 Std. nach dem Schreiben bzw. der
  Aufnahme (gehört oder nicht, Ton gleich mit) – außer „Dauerhaft anheften“
  (oben, kleine Nadel). Beim Start wird Altes aus der 3-Tage-Zeit still
  weggeräumt. Einmal im Kopf: „Nachrichten verschwinden nach 24 Stunden“.

## Kalender – nur Termine (Tafel 74/73, angepasst an Tafel 76, v0.73.0)

- Felix (Video): Tag antippen zeigte „Ein freier Tag“ und „Noch frei – Mia
  fragen“ (das Abendessen, als Termin gelesen); Mia antwortete ohne
  Zugangscode auf ihre eigene Frage „Hm, das hab ich nicht verstanden“; ein
  einfacher Weg, am gewählten Tag einen Termin einzutragen, fehlte.
- Jetzt: Kalender = nur Termine. Punkte je Person (max. 3), Tag darunter mit
  „in 7 Tagen“, Zeile „Termin am Fr, 30. Okt“ → Schnelleingabe mit dem Tag
  (auch ＋ und lange drücken), „Schnell eintragen“ nur bei Wiederkehrendem.
  Leiste bleibt oben mit „⌂ Heute“. Mia versteht „Was könnten wir morgen
  essen?“ und „Was gibt’s morgen?“ auch ohne KI.

## Pinnwand: Aufnahme-Leiste & Hinweis (Tafel 80, v0.73.0)

- Felix (Video, v0.70): Beim Aufnehmen lag Senden unten rechts auf dem Mikro,
  der Hinweis „＋ = schreiben · Mik…“ war abgeschnitten. Jetzt: EINE Leiste
  wie bei WhatsApp (🗑 · Zeit · Welle · ➤ rechts), ＋ und Mikro währenddessen
  weg, unten nur „Sprachnachricht“, beim ersten Mal „schreiben“ unter dem ＋,
  nach dem Senden „✓ Gesendet“.

## Weniger Mia + „Dein Tag“ (Tafel 66 B, 67, 68, v0.74.0)
- Startseite mit genau zwei Mias (Logo + Knopf); die Jetzt-Karte trägt ein
  Themen-Symbol statt Mias Gesicht und keinen Knopf mehr, wischt 1 → 3 ohne
  Kreisel und öffnet per Antippen „Dein Tag“ (Termine mit „Jetzt“-Linie,
  Essen mit „Kochen“, Pinnwand von heute, Aufgaben zum Abhaken; Thema
  hervorgehoben). Mia beantwortet „Was steht heute an?“ in zwei Sätzen und
  öffnet „Dein Tag“. Der Mia-Knopf macht beim Runterscrollen Platz.

## Essen: 8 Ideen immer da + Gerichte ohne Braun (Tafel 62 B, v0.75.0)
- Die 8 Ideen zum Durchschieben stehen immer auf der Essen-Seite (statt
  „Daraus kannst du kochen“), mit „Fürs Abendessen“.
- Pfannen hell mit farbigem Rand und Holzgriff, Soße passend und sparsam,
  Eintöpfe rot, Lachs-Bowl als Bowl („poke“), Linsensuppe orange.

## Spendentopf als Vorschau („bald verfügbar“, v0.76.0)
- `POT_STATUS` vorschau/live; Band „Vorschau“, Etikett „Beispiel“ an Summe
  und Projekten, Kachel „Spendentopf · bald“; Monatlich/Einmalig, 3/6/10 €
  oder eigener Betrag, „6 € im Monat vormerken“ (gespeichert als
  „vorgemerkt“, Speicher v2), löschbar mit Rückgängig; nach dem Start einmal
  sanft in der Jetzt-Karte. Ohne „Keine Werbung“.

## Mia spricht knapp (v0.77.0)
- Norddeutsch, kurz, nie vorstellen: „Moin!“ statt „Hallo, ich bin Mia.“,
  Chat-Begrüßung „Was steht an?“, Stimmprobe „Moin! So klinge ich.“
- `tidyMiaText()` für jede KI-Antwort (Anzeige, Vorlesen): keine
  Gedankenstriche als Satzverbindung, keine Spiegelstriche, höchstens ein „!“.
- Prompt: max. 2 Sätze, Bestätigungen 1–3 Wörter, keine Floskeln, drei
  Beispiele gut/schlecht. Alle festen Mia-Sätze umgeschrieben, Test prüft sie.

## Mia auf Claude-Niveau – nie halbgar (v0.78.0)
- KI zuerst, ehrlich: ohne Netz merkt Mia sich den Satz und macht ihn, sobald
  wieder Netz da ist; Limit/Fehler mit eigenem Satz, ein stiller zweiter
  Versuch bei Fehlern.
- Modellwahl: kurze Befehle schnell, alles andere mit dem großen Modell;
  zögert das kleine ohne Werkzeug, übernimmt das große.
- Kleines sofort („Ist drauf.“ + 10 s Rückgängig im Chat, „Mia hat schon …“
  in Dein Tag), Großes als Vorschau.
- Was Mia noch nicht kann, landet als Wunsch (Tabelle `mia_wuensche`, nur
  Server). Prüfstand mit 120 Sätzen (`/api/pruefstand`) und Seite „Für
  Entwickler“ mit Trefferquote und KI-Kosten.

## Konten 3c: Sprachnachrichten teilen (v0.79.0)
- Ton in Supabase Storage (Bucket `memos`, privat, nur Haushalt, 2 MB), Pfad
  `<haushalt>/<memo-id>.m4a|webm|ogg`; das Memo wird erst geteilt, wenn der
  Ton oben liegt. Andere Geräte holen den Ton beim ersten Abspielen.
- „Gehört von“ und Reaktionen gehen mit. Aufräumen nach 25 Std. per Vercel
  Cron (`/api/memos/aufraeumen`, `CRON_SECRET`) und einmal je Start in der App.

## Konten 3d: Sichtbar machen (v0.80.0)
- Leises „von Lisa“ an Terminen und auf der Einkaufsliste (nur bei anderen,
  nur mit mehreren Personen).
- Jetzt-Karte: höchstens eine Neuigkeit am Tag aus dem Haushalt („Milch
  steht auf der Liste – hat Lisa gerade gesetzt.“), jede nur einmal.
- Spendentopf: Region, Stimme und Beitrag gelten für den ganzen Haushalt.

## Erinnerungen & Mitteilungen, Teil 1 (v0.81.0, Tafel 77)
- Erinnerung = Uhrzeit an Termin/Aufgabe: Standard 30 Min vorher (in
  „Mitteilungen“ änderbar), ganztägig 8:00, am Vorabend 19:00, Aufgaben mit
  Uhrzeit genau dann. Glocke an Einträgen, Chip „17:00 erinnern“ in der
  Schnelleingabe.
- Mia fragt im passenden Moment (erster Termin mit Uhrzeit), nie beim ersten
  Start, erst nach „Ja, gern“ die Systemabfrage; im Safari-Tab die
  Homescreen-Anleitung. Einstellungen → „Mitteilungen“.
- Mitteilungen kommen, solange die App offen ist; der Server-Versand folgt.

## Erinnerungen & Mitteilungen, Teil 2: Server-Push (v0.82.0)
- Web Push mit VAPID: Schlüssel erzeugt der Server selbst und legt sie nur in
  Supabase ab (`push_config`, nur Service-Rolle). Abo je Gerät (`push_abos`,
  RLS). Versand jede Minute über pg_cron/pg_net → `/api/push/senden`.
- Familien-Termine an alle, Arbeit nur Besitzer, Aufgaben nur wer sie hat;
  Pinnwand und Abgeben höchstens 1× am Tag, nicht 20–7 Uhr.

## Mia – die Familienmanagerin (v0.83.0, Tafel 81/82)
- Steckbrief und feste Sätze zentral (`src/lib/mia/persona.ts`), Varianten
  nie doppelt, verbotene Formulierungen per Test.
- Lebendig ohne Ansprüche: EIN Zubehör (Partyhut, Halloween-Kürbis,
  Adventsmütze, Silvester-Konfetti, Osterei, Kochmütze, Schirm, Sonnenbrille,
  Schal), nachts schläft Mia, morgens verschlafen, abends ruhiger; kurze
  Momente (Sturm wackelt, Herbstblatt).
- „Danke“ → Herzen, Lob → Freudensprung (max. 1× je Gespräch, 3× am Tag).
  Knopf links für Linkshänder.
- Routinen: Morgen-Info („Moin! Fußball 15, Zahnarzt 16“), Überschneidungen
  mit 2 Knöpfen („Ich fahre“ / „Lisa fragen“), Packliste am Vorabend
  („Ja, bitte“ / „Hab ich schon“) – jede Frage nur einmal.

## Einkauf Teil 6: Familie Bescheid sagen (v0.84.0)
- Mit Konto fragt der erste Einkaufsmodus einmal „Familie Bescheid sagen?“;
  bei „Ja, immer“ bekommen die anderen „Felix ist gleich bei REWE. Braucht
  ihr noch was?“ mit Schnellknöpfen („+ Butter“, „Nichts, danke“).
- Was andere während des Einkaufs draufsetzen, steht gelb „Neu von Lisa ·
  gerade eben“; „Fertig eingekauft“ meldet „Eingekauft ✓ – 9 Sachen bei
  REWE“. Ruhezeit 20–7 und Pause gelten, zählt nicht als proaktiv.

## „Im Haus“ statt Vorrat (v0.85.0, Tafel 78/79)
- Ohne Mengen, nur da / nicht da; dieselben Kacheln wie im Einkauf; Orte
  Kühlschrank/Schrank/Tiefkühler automatisch (lange drücken = ändern, gemerkt).
- Füllt sich von selbst (Einkauf abhaken → rein, kochen → raus), vergisst
  still je Sorte, Grundsachen immer da. „Vom Einkauf einräumen“ entfällt.
- Ehrlich: „alles im Haus“ nur sicher, sonst „vermutlich im Haus“.

## Kalender mitbringen, Rezept-Links, Aufgaben übernehmen (v0.86.0)
- Ruhige Karte oben im Kalender: „Termine schon woanders? Hol sie rein.“
  (Apple · Google · Outlook · Später – nach 14 Tagen noch einmal, dann nie).
- Geführte Schritte je Anbieter, Link aus der Zwischenablage erkennen,
  „Steht drin. 23 Termine in den nächsten 4 Wochen.“, „zuletzt aktualisiert“.
- Rezept-Links an Mia: Link schicken oder teilen → Karte mit umgerechneten
  Zutaten, „im Haus“-Abgleich, „auf die Liste“ oder „In den Wochenplan“.
- Aufgaben übernehmen: To-do-Liste einfügen (Kästchen weg, Fristen erkannt,
  Überschriften = Listen, Doppelte nur einmal), Vorschau zum Abwählen; die
  Aufgaben-Seite zeigt „Jetzt dran“ und die Listen eingeklappt; einmal pro
  Woche „Drei für diese Woche?“.
- Fehler behoben: „abgegeben an“ (und Mias „Sag Lisa …“) ging beim Laden
  verloren – die Prüfung der Einträge behält jetzt `fuer`, `zurueck`, `an`.

## Kalender verbinden – auf jedem Gerät (v0.87.0)
- Anleitung je Dienst und Gerät („Ich bin am …“), „Weiß nicht?“-Hilfe,
  falsch eingefügte Links freundlich erklärt.
- Todoist als schreibgeschützte Aufgaben über die Kalender-Abonnement-URL;
  Abhaken bleibt in Todoist.
- Parser: VTODO und RDATE; derselbe Termin aus zwei Kalendern nur einmal.

## Anmelden wie man es kennt (v0.88.0)
- Ohne Konto starten; „Schon ein Konto? Anmelden“ auf der Begrüßung (nur mit
  Konten); nach dem Anmelden keine Frage, die Familie wird still angelegt.
- Einladen per Link (/e/…, 14 Tage, mehrfach, zurückziehbar) statt Code;
  Einladungsseite „<Name> lädt dich ein.“, Wechseln nur auf Wunsch.
- Karte „Soll Lisa auch sehen, was du einträgst?“ nach 3 Tagen; Mia: „Lade
  Lisa ein“. Apple/Google vorbereitet (Schalter, PKCE, /auth/callback).

## Mails an Mia (v0.89.0)
- Mails weiterleiten statt abtippen: eigene Adresse je Familie (und je Person
  für die Arbeit), Mia macht Vorschläge (Termin mit Ort, Aufgabe mit Frist,
  Einkauf) – „Übernehmen“ trägt ein, nichts automatisch.
- Nur Weitergeleitetes von Mitgliedern, keine Werbung, keine Rohmail
  gespeichert, Vorschläge 7 Tage. Gmail-/Outlook-Code zur Bestätigung direkt
  in der App.
- Mia lernt Absender („Von der Kita kommt öfter was …“) und liefert den
  fertigen Gmail-Filter.

## Datenschutz & Sicherheit (v0.90.0, Platz 23)
- Bestandsaufnahme in `docs/datenschutz/` (Datenkarte, Anbieter,
  Verarbeitungsverzeichnis, TOMs, OWASP-Selbstprüfung, Liste für Felix).
- Server-Funktionen in Frankfurt, Sicherheits-Header für alle Seiten, Test:
  jede Tabelle mit RLS, Familien getrennt, Austritt wirkt sofort; Protokolle
  ohne Inhalte.
- Seiten Datenschutz (mit „Kurz gesagt“), Impressum, Nutzungsbedingungen als
  Entwurf mit Platzhaltern; Links in Einstellungen, Begrüßung, Anmelden.
- Einwilligungen: Pflicht-Häkchen beim Anmelden, „Darf ich mitdenken?“ vor der
  ersten KI-Anfrage (ohne OK fragt die App die KI nie), Mails an Mia beim
  Einschalten; mit Konto als Nachweis in `einwilligungen`.
- Einstellungen → „Deine Daten“: Kurz gesagt, Einwilligungen widerrufen,
  Daten mitnehmen, „Auf diesem Gerät löschen“, Kontakt.

## Hallo-Bildschirm cleaner (v0.91.0, Tafel 84 Variante A)
- Unten kein kleines Logo mehr (die große Mia reicht): mittig „Gemacht in
  Eutin von KARAMBA Eis“, darunter leiser „Datenschutz · Impressum“.
- Untertitel kürzer: „Erzähl einfach, was ansteht. / Ich sortier das.“

## Mia stellt sich vor (v0.92.0)
- Hallo-Bildschirm: „Moin, ich bin Mia.“ statt „Moin!“, der Name (über
  `helperName()`) in Orange, immer eine Zeile (auch iPhone SE).
- Regel „nie vorstellen“ mit genau einer Ausnahme: der Hallo-Bildschirm beim
  allerersten Start (Test in `tests/begleitung/knapp.test.ts`).

## Datenschutz nachschärfen (v0.93.0)
- Werbung ehrlich: „Kein Tracking, keine Werbe-Profile“ statt „Keine
  Werbung“; Test, dass kein Text „keine Werbung“ verspricht.
- „Bevor’s losgeht“ vor der App für alle: neue Nutzer nach „Los geht’s“,
  bestehende einmal beim nächsten Öffnen; Häkchen Pflicht, kein Schließen,
  Rechtstexte bleiben lesbar; neue Textfassung = einmal neu fragen.
- Mia-Knopf verdeckt keinen Text mehr: mehr Platz unten auf allen Seiten,
  auf den Rechtsseiten kein Knopf; `pruefen` meldet es.
- Rechtsseiten mit Band „Entwurf“, solange Betreiber-Angaben fehlen.

## Erster Start: Mia sagt, wie’s losgeht (v0.94.0)
- Höchstens 3 Bildschirme vor der App, jeder mit genau 1 Knopf: Hallo,
  „Bevor’s losgeht“, NEU „Zeig mal“ (Mia zwinkert, Sprechblase mit drei
  Zeilen: Beispiel-Tag angucken, Eigenes mit ＋, Mia antippen).
- Look-Frage entfällt: Standard „Farbig“, nach 3 Tagen einmal „Lieber
  schlicht?“ als Hinweis (nie zusammen mit dem Dunkel-Tipp).
- Zurück-Geste geht im Hallo-Ablauf einen Schritt zurück; der Mia-Knopf
  zwinkert beim ersten Erscheinen einmal, „Schreiben & sprechen“ erst nach 4 s.

## Mikrofon und Stimme – richtig einfach (v0.95.0, Tafel 86)
- Mikro-Check: Häkchen-Liste (Mikrofon · Diktierfunktion/Spracherkennung ·
  Ton), öffnet sich von selbst, wenn Zuhören scheitert, und unter
  Einstellungen → Mia → „Mikrofon prüfen“. Zeigt nur die Schritte für den
  fehlenden Schalter (iPhone: drei Schalter an drei Stellen), erkennt den
  privaten Tab, „Details“ mit Mikro-Protokoll, am Ende „Nochmal testen“.
- Echter Fall: Mikrofon und Diktierfunktion an, „Spracherkennung → Safari“
  aus → jetzt genau dieser Schalter.
- Stimme: „Probe hören“, Karte „Mia kann schöner klingen“, neue Anleitung
  (iOS 26 „Lesen & Sprechen“, laden UND antippen), nach Rückkehr „Neue
  Stimme gefunden: … Nehmen?“.

## Mia hört zuverlässig zu (v0.96.0)
- Kurze Atempause schickt nichts mehr ab: Mia hört still weiter und schickt
  erst nach 2,5 s Stille, beim Antippen oder bei „fertig“ (Ring zeigt es).
- Nichts geht verloren: unfertiger letzter Teil kommt mit, neu begonnene
  Ergebnisliste wird angehängt, „Okay“ wird nie abgeschnitten.
- Weiterreden, während Mia antwortet: als „wartet“ gemerkt, danach geschickt.
- Gespräch scrollt mit, „↓ Neu“ beim Hochscrollen, lange Live-Blase zeigt die
  letzten Zeilen über Mia.

## „Lieber schreiben“ bleibt offen (v0.97.0)
- Der Tippen-Modus schloss sich auf dem iPhone von selbst (Safari schob die
  Seite hoch, die gemessene Tastaturhöhe sprang kurz auf 0). Jetzt zählt der
  Fokus des Felds; schließen nur bei echtem Fokusverlust, leerem Feld und nach
  300 ms. „Lieber sprechen“ als Weg zurück, Bühne am sichtbaren Bereich.

## Mia hört und spricht über den Server (v0.98.0, ElevenLabs)
- Sprechen: `/api/stimme` (Antwort bereinigt wie Anzeige und Vorlesen,
  Stimme `MIA_VOICE_ID`, Modell Flash, Deutsch), feste Sätze („Steht drin.“
  …) einmal erzeugt und zwischengespeichert. Kommt die erste Silbe nicht in
  ~1 s oder klappt es nicht: still die Stimme des Handys.
- Hören: auf der Bühne eigene Aufnahme (nur Mikrofon-Freigabe, Satzende an
  der Stille, höchstens 60 s), `/api/hoeren` (Scribe, Deutsch). Fehler: einmal
  still nochmal, dann „Hat grad nicht geklappt. Nochmal?“; „aus“ → Browser.
- Einstellungen → Mia → „Wer spricht?“: Mias Stimme (Standard) oder Stimme
  des Handys. Mikro-Check mit Server-Ohr: nur Mikrofon und Ton.
- Grenzen wie die KI (Zugangscode, je Minute/Stunde/Tag), Kosten in
  „KI-Kosten letzte 7 Tage“ (Zeichen, Sekunden). Ohne `ELEVENLABS_API_KEY`
  alles wie bisher. KI-Einwilligung Fassung 2 (mit Sprach-Anbieter).

## Mia als Umriss und Beispiel-Tag nach Wochentag (v0.99.0)
- „Zeig mal“ (Erster Start, „Kein Stress …“): die Zeile „Oder mich antippen
  und erzählen“ zeigt Mia als Linien-Icon statt einer Sprechblase.
- Neue Komponente `ui/MiaLineIcon` (aus `BegleitungAvatar` abgeleitet:
  Sprechblase mit mittiger Spitze, senkrechte Augen, Lächeln; 24er Raster,
  Linienstärke 2, currentColor) – auch für Seiten-Tipps und Einstellungen → Mia.
- Beispiel-Tag passt zum Wochentag: Mo–Fr wie bisher (Elternabend nur
  Di–Do), Samstag (Brötchen, Wochenmarkt, Fußballspiel, Kindergeburtstag,
  Grillen) und Sonntag (Familienfrühstück, See, Oma, Pizza backen, Tatort);
  Feiertage bundesweit + Schleswig-Holstein wie Sonntag (`core/feiertage.ts`).
  Am Wochenende alle Beispiel-Aufgaben „diese Woche“, keine dringend; Essen
  samstags Lasagne, sonntags Ofen-Hähnchen am Mittag.

## Launch-Schnitt „Mia 1.0“ (v0.100.0)
- Feature-Stopp bis zum Launch (CLAUDE.md „Launch Mia 1.0“).
- Ausgeblendet als Baustein (nichts gelöscht, Daten bleiben): Mails an Mia,
  Tipps aus der Region, Im Haus, Wochenplan, Sport, Notizen, Spendentopf
  (Satz unter „Über Mia“ bleibt). Wer etwas davon schon nutzt, behält es.
- Mia bietet Ausgeblendetes nicht an und schaltet es nicht frei („Kann ich
  noch nicht.“). Anmelden nur per E-Mail-Code. ElevenLabs bleibt aus, solange
  kein Schlüssel gesetzt ist.
- Neue Startseite ohne Spendentopf.

## Mia-Bühne launchfest (v0.101.0)
- Danebentippen schließt die Bühne (freie Fläche, auch zwischen den Blasen);
  bei offener Tastatur schließt der erste Tipp nur die Tastatur.
- Wochencheck schließt mit ✕ statt „Abbrechen“ (ein Fenster für alles).
- Termine ohne KI (Schnelleingabe, Testmodus, Rückfall): „am 29.“,
  „Mittwoch nächste Woche“, „Donnerstag in einer Woche“, „do 16 uhr“,
  „viertel nach drei“, „um drei“, Selbstkorrektur („nicht Donnerstag sondern
  Freitag“, „morgen, nee übermorgen“), mehrere Termine in einem Satz. „6 Uhr“
  und „7:30“ bleiben morgens, nur „um 3“ meint nachmittags.
- Prüfstand: 124 Sätze; Fehler in der Bewertung behoben (Frist einer Aufgabe
  zählte nicht als Datum). Der echte Lauf braucht die KI in Vercel.
- Durchklick „Mia sprechen“: Pausen, Rückgängig, Lieber schreiben, Danebentippen.

## Startseite aus einem Guss (v0.102.0)
- Ganze Kachel = Seite: ein Tipp auf freie Fläche öffnet die Seite der
  Kachel; Termine öffnet den Kalender (steht auf „Heute“).
- Hinweis-Warteschlange `core/hinweise.ts`: höchstens ein Hinweis unter der
  Jetzt-Karte, jeder nur einmal (ab dem nächsten Tag weg), in den ersten 3
  Tagen nur Beispiel-Tag und „Schreiben & sprechen“. Einladen ohne Mia-Gesicht.
- Statusleiste weich verschwommen statt deckend.
- Essen-Kachel mit Bild für das geplante Gericht: dieselbe Komponente wie im
  Beispiel-Tag (`DishTile`), mit „Ich koche jetzt ›“.
- Pinnwand-Kachel: S 1, M 2, L 4 Nachrichten; das Schild „schreiben“ steht
  neben dem ＋ und nie über dem Text.
- Bearbeiten: genau ein „＋ Kachel“ und ein „Fertig“ (oben), keine Leiste
  unten; ein Tipp auf eine Kachel beendet nicht mehr, nur freie Fläche.

## Prüfstand ohne „Load failed“ (v0.103.0)
- 20 Sätze in einem Aufruf dauerten länger, als Vercel erlaubt: jetzt 3 je
  Aufruf, der Reihe nach, mit Fortschritt („Läuft … 12 von 124“).
- Fehler je Aufruf: einmal still nochmal, sonst „Fehler beim Aufruf“ und
  weiter; Verbindungsabbruch → „Nochmal ab hier?“ mit „Weiter“.
- Hinweis „Bildschirm anlassen“, am Ende Fehlschläge zum Kopieren.

## Termine & Kalender – ein Weg (v0.104.0)
- Eintragen nur über ＋ (Schnelleingabe); kein langes Drücken auf einen Tag,
  keine Zeile „Termin am …“, die Chips „Schnell eintragen“ bleiben.
- „Mehr Details“ = das EINE Formular (`EntryForm`) für Termine und
  Aufgaben, vorbefüllt aus dem Satz: oben Titel + ✕, am Ende oranges
  „Speichern“; ohne Uhrzeit ganztägig, Vergangenes heute nie still
  gespeichert. `TerminQuickAdd`, `TaskQuickAdd` und das Zeit-Rad sind weg.
- Tag antippen in Monat, Woche und Liste gleich: der Tag steht darunter.
- Termine ohne „Erledigt“; Erinnerung „Keine Erinnerung“ … „Am Vorabend“.

## Prüfstand fair + Mia knapper (v0.105.0)

- Felix’ echter Lauf: 85/124 (69 %). Viele Fehlschläge waren unfair
  (Haushalt passte nicht zum Satz, Daten als Satzende gezählt). Jetzt: je
  Satz eine Ausgangslage, feste Test-Vorhersage, Satzzähler ohne Daten und
  Abkürzungen, Grenzen 2/3 Sätze, erlaubte Wege (Ideen + Frage, Kalender
  vorlesen, „steht schon drin“), langsam = Warnung ab 6 s, Fehler ab 10 s.
  129 Sätze (neu: „Ich bin müde“, „Merk dir: Lisa mag keine Pilze“,
  „Klassenfahrt 9. bis 13. Nov“, „Sachen fürs Frühstück“, Zahnarzt doppelt).
- Mia knapper: Prompt (eine Frage ODER ein Angebot, keine Oberflächen-
  Erklärungen, keine erfundenen Angebote, Allergien nur bei Bedarf, ehrlich
  KI) und `tidyMiaText` (wirft solche Sätze und zweite Fragen raus).
- Verhalten: Vorlieben direkt ins Profil (`vorliebe_merken`), nie in
  ausgeblendete Notizen schreiben, vager Einkauf als Vorschau, mehrtägige
  Termine als ein Eintrag, „Woche“ allein schaltet nicht aufs große Modell.

## Wischen ohne Wackeln (v0.106.0)

- Befund (Video Felix, iPhone Safari): beim seitlichen Wischen wanderte die
  Seite senkrecht mit und federte nach. Ursache: Richtung erst ab 10 px –
  bis dahin hatte iOS schon senkrecht gescrollt – und das Gummiband.
- Jetzt: `touch-action: pan-y` am Pager, Richtung ab 6 px mit Verhältnis
  1,2 und dann fest, waagerecht Scrollhöhe gesperrt, kein Overscroll.

## Aufgaben & „Dein Tag“ – gleich abhaken (v0.107.0)

- Abhaken überall gleich (Kachel, Aufgaben-Seite, Dein Tag): durchstreichen,
  1,5 s (`LEAVE_MS`), weg, „Erledigt · Rückgängig“. In „Dein Tag“ früher
  sofort umgeschaltet und Erledigtes blieb stehen.
- „Dein Tag“ mit ✕ im Kopf.
- Schnelleingabe Aufgaben: Raum-Chip „Familie“ statt „Für mich“.
- Aufgaben leer: „Gerade nichts.“ statt „Alles erledigt.“, ohne „Ich muss
  noch …“. Ohne-Druck-Test um „alles erledigt“, „ich muss noch“, „ich
  vermisse dich“, „nicht gemacht“ erweitert. Durchklick `abhaken.mjs`.

## Prüfstand auf 95 % (v0.108.0)

- Felix’ Lauf: 117/129 (91 %). Test angepasst, wo Mia richtig lag: Tausch
  mit vergangenem Montag darf nachfragen (`rueckfrage`), „Lösch den
  Wochenplan“ und „Zeig mir den Vorrat“ → „Kommt bald.“ (`kommt_bald`).
- „Später“-Bausteine (`LAUNCH_AUS`) schaltet Mia nie ein (`spaeter()`), nur
  „Kommt bald.“ + Wunsch anonym. „Unsere Rezepte“ bleibt einschaltbar.
- „… ist alle“ → direkt auf die Einkaufsliste; Prompt kürzer (Bestätigung,
  Wochenplan, Ideen, Gesundheit).
- Mehreres auf einmal = kurze Übersicht: bei 2+ erledigten Dingen nur
  „Erledigt.“ und darunter die Karte `MiaDoneCard` (Termine · Aufgaben ·
  Einkaufsliste …, „Alles rückgängig“). Prüfstand jetzt 132 Sätze.

## Testcode gleich am Anfang (v0.109.0)

- Vorher fragte Mia den Code erst im Gespräch (Karte im Chat). Jetzt EIN
  Bildschirm „Fast geschafft.“ direkt nach dem ersten Start bzw. beim
  nächsten Öffnen; „Später“ geht, dann kommt er beim ersten KI-Versuch.
- „Testcode ändern“ unter Einstellungen → Mia. Schutz gegen Durchprobieren:
  5 Fehlversuche, dann 15 Minuten Pause (vorher 10 pro Stunde).

## Notizen gehören zu Launch 1.0 (v0.110.0)

- „notizen“ raus aus `LAUNCH_AUS`; Baustein standardmäßig an (Bausteine v4,
  beim Update einmal an), Kachel für alle (Startseite v5, einmal ans Ende).
- Mia: Notiz-Werkzeuge schreiben wieder, `baustein_an` „notizen“ geht; der
  Prüfstand erwartet bei „Merk dir …“/„Notier dir …“ jetzt eine Notiz
  (133 Sätze).


## S-Kacheln frei kombinierbar, Notizen in S/M/L (v0.111.0)

- Jede S ist halb breit, zwei S nebeneinander, jede S-fähige Kachel mit jeder
  anderen. Eine einzelne S bleibt halb; im Bearbeiten „＋ Kachel“ in der
  freien Hälfte (nur S-fähige Kacheln). Essen + Einkauf bleiben ein Paar.
- Startseite v6: eine einzelne S, die bisher breit war, wird einmal M.
- Notizen-Kachel S/M/L mit Stift (Schnellnotiz), Angeheftete zuerst.

## Notizen neu + Absätze überall (v0.112.0)

- Ein Mehrzeilen-Feld (`ui/MehrzeilenFeld`) für Notizen-Schnellfeld,
  Schnelleingabe von Notiz und Pinnwand und Notiz bearbeiten: Return = neue
  Zeile, gespeichert nur per Knopf; Anzeige mit `whitespace-pre-line`.
- Jede Schnellnotiz wird eine eigene Notiz (erste Zeile = Titel). Notizen v2:
  die alte Sammel-Schnellnotiz wird in einzelne Notizen geteilt (Ids am
  Inhalt, auch für Sicherung und Abgleich), nichts geht verloren.
- Notizen-Seite: Schnellfeld, „Angeheftet“ und „Zuletzt“ als Karten in 2
  Spalten, Seiten-Plus = leere Notiz. Bearbeiten im Vollbild mit
  Werkzeugleiste (Liste · Anheften · Familie/Arbeit · Teilen · Löschen),
  Autosave, Leeres fällt weg.
- Mia: „Schreib auf …“ und „Schreib in die Schnellnotiz …“ = eigene Notiz,
  „Setz Laufrad auf die Geschenkideen“ = Listen-Eintrag; Werkzeuge
  `schnellnotiz_schreiben`/`_aufraeumen` entfallen. Prüfstand 136 Sätze.
## Sprechen hängt nicht mehr + „Lieber schreiben“ (v0.113.0)

- Wachhund für die Spracherkennung (iPhone hing nach 3–4 Runden), erzwungenes
  Ende, Notausgang, Mia verstummt vor dem Zuhören, Hintergrund setzt zurück.
- Mikro-Protokoll mit 50 Zeilen unter „Für Entwickler“, mit Teilen.
- „Lieber tippen“ → „Lieber schreiben“, „＋ = schreiben, Mia = sprechen“.
- Live-Text nie doppelt: die Blase hängte den unfertigen Teil ein zweites Mal
  an, und iOS liefert Unfertiges kumuliert. `zusammen` (mitschrift.ts) legt
  Überlappungen wortweise zusammen, echte Wiederholungen bleiben.
- Ablauf-Ring mittig: feste Größe (Mia + 2 × 8 px) statt `inset` (ein SVG
  dehnt sich nicht), 2,5 px, Start oben, läuft im Uhrzeigersinn ab;
  Durchklick misst die Mitte (± 1 px).


## Launch-Schnitt angepasst: Sport und Wochenplan gehören zu 1.0 (v0.114.0)

- `LAUNCH_AUS` nur noch Mails an Mia, Tipps aus der Region, Im Haus,
  Spendentopf. Sport (nur Wochen zählen) und Wochenplan sind wieder als
  Baustein in „Mehr Funktionen“, Mia darf sie einschalten; den ganzen Plan
  leeren geht als Vorschau. Notizen waren schon mit v0.110 drin.
- Prüfstand: „Lösch den Wochenplan“ erwartet jetzt `clear_week`, neu „Schalt
  Sport ein“ (137 Sätze).

## Navigation: immer zur Startseite (v0.115.0)

- Haus-Knopf (lucide House, 44 px) links neben „‹ …“ auf Seiten tiefer als
  eine Ebene unter Heute: geht im Verlauf mehrere Schritte zurück (Scrollhöhe
  der Startseite bleibt), ohne Verlauf neu auf Heute.
- Öffnen = Startseite: Kaltstart oder Rückkehr nach mehr als 5 Minuten →
  Heute (`core/heimkehr.ts`, `wasgibts.zuletztweg`); Kochmodus, Einladung,
  Anmelden, Rechtliches und Links mit Angaben bleiben.
- Wischen Kalender → Heute: das Monatsraster war als „kein Wischen“ markiert,
  obwohl es kein eigenes Wischen hat – jetzt führt Wischen auch dort zu Heute.
  Durchklick: Kalender → Heute → Essen → Heute je 5 Mal.

## Essen-Kachel – immer Bild, gezeigtes Gericht immer wählbar (v0.116.0)

- Fehler: „MORGEN · MO – Bibimbap – 3 Ideen ansehen“ ohne Bild, auf der
  Essen-Seite nicht auswählbar. Jetzt Bild in jedem Zustand, Antippen öffnet
  das Gericht, Vorschläge mit „Für heute/morgen nehmen“, auch im Beispiel-Tag.

## Essen: Wochenkarte und mehr Abwechslung (v0.117.0)

- Wochenkarte auf der Essen-Seite: „Diese Woche“ / „Nächste Woche“ mit ‹ ›,
  jeder Tag mit Gericht-Bild, Antippen = das Gericht (Rezept bzw. Fenster),
  freier Tag = „Was gibt’s am …?“ mit Vorschlägen. Essen-Kachel: „Woche ›“.
  Mia: „Was gibt's Mittwoch?“, „Plan mir nächste Woche“ (Prüfstand 136).
- Abwechslung (`ideas.ts`): Gegessenes 14 Tage nicht wieder, an früheren
  Tagen Gezeigtes und nicht Genommenes 7 Tage weiter hinten
  (`wasgibts.ideengezeigt`), unter den ersten drei höchstens eine je
  Grundlage, ⇄ nie dieselbe zweimal hintereinander (`naechsteIdee`).
- 123 eingebaute Gerichte (vorher 39, `dishList.ts`), jedes mit eigener
  Zeichnung (`npm run gerichte-bilder`, neue Formregeln in `dishArt.ts`).

## Wetter genauer (v0.118.0)

- Pinnwand-Absätze stecken schon in v0.112 (Notizen neu + Absätze überall).
- Wetter: „Gerade Regen“ nur noch aus dem DWD-Regenradar über Bright Sky
  (gleicher Anbieter); hört es auf, „Regen hat aufgehört“. Station nur
  ≤ 10 km und ≤ 40 Min alt, App lädt nach 15 statt 30 Minuten neu.

## Einkaufsliste aufgeräumt + Läden + Mia merkt sich den Laden (v0.119.0)

- Läden-Frage als Chips (Tafel 91), Laden-Reihe immer sichtbar, Liste nach
  Laden bzw. Laufweg, 3 Spalten mit Silbentrennung, Grundsachen-Karte,
  Zugeklapptes, Wochenwechsel in einer Zeile (Tafel 89).
- Feste Laden-Regeln per Mia und ohne KI, gelten überall; Lernen nach 2×
  Abhaken mit einmaliger Frage; „Was kauf ich wo?“. Speicher v6.
- Einkauf-Kachel C2 (Tafel 92) und Beispiel-Einkauf nach Läden.

## Mia für alle – allein, zu zweit, Familie (v0.120.0)

- Mia ist „deine persönliche Assistentin“ („Ich sortier deinen Alltag.“),
  Startbildschirm „Kein Stress. Ich sortier deinen Alltag, Stück für Stück.“
- Bildschirm 3 fragt „Für wen soll ich sortieren?“ (Nur für mich / Für uns
  zwei / Für die Familie), speichert die Haushaltsart im Profil und passt
  Beispiel-Tag und Startseite an (allein ohne Pinnwand).
- Wörter je Art zentral in `core/haushalt.ts`: Bereich Privat/Wir/Familie,
  Einladen-Knopf, „Seid ihr zu zweit?“ einmal beim zweiten Mitglied.

## Mia denkt mit (v0.121.0, Tafel 90)

- Mia stellt ab Tag 2 eine Kachel am Tag vor (Ring + Karte „Zeig mal“ /
  „Später“), begleitet den ersten Besuch jeder Seite („Alles klar“), erkennt
  Muster (3× gleicher Wochentag → Serie; Essens-Rituale), denkt mit (Wer
  bringt?, Regen × Wäsche, voller Tag → schnelles Gericht) und hat einen
  Spruch des Tages statt „Alles ruhig“. Höchstens eine Karte am Tag, Regler
  „Wie gesprächig?“, Liste „Was ich mir merke“. Ersetzt Phase-0-Auftrag 8.

## Phase-0-Reste (v0.122.0)

- Einkauf ein Weg: kein fester Knopf „Mehr hinzufügen“ mehr, der Katalog
  kommt über ＋ → „Mehr Details“; Schließen (✕, Wischen, Zurück) übernimmt die
  Auswahl; kein eigenes Mikro im Katalog; Laden-Chips ohne Zahl; sichtbar
  heißt es überall „Einkaufsliste“.
- Essen: Rezept löschen mit Fenster und „Gelöscht · Rückgängig“ statt
  Browser-Frage (auch Wochen-Check); Kochmodus übernimmt die Personenzahl;
  Hackbraten als Scheiben vom Laib; Herz in der Infozeile, oben nur „…“;
  „Kochmodus ›“, „Unsere Rezepte“, keine Emojis im Kochmodus; „Rezept
  erzählen“ ohne eigenes Mikro; Links zu Rezepten nur, wenn es sie gibt.
- Pinnwand: „Senden“ und „Gesendet“; Kopfzeile immer „Nachrichten und
  Sprachnachrichten verschwinden nach 24 Stunden.“
- Wetter: Stundenleiste (12 Std.) unter der großen Karte, Tipp-Chips mit
  Linien-Symbolen statt Emojis, Titel „Wetter“ mit Ort darunter.
- Timer: laufender Timer auf der Jetzt-Karte ohne Timer-Kachel öffnet das
  Timer-Fenster (vorher die Fehlerseite /timer, mit Kachel sogar beides).

## Koch-Kachel mit Bild, Essen-Kopf einzeilig, Einkauf ohne Buchstaben (v0.123.0)

- Die Koch-Kachel zeigt dasselbe Gerichtsbild wie die Essen-Kachel: klein
  „Koche gerade“, Name weiß auf Verlauf, „Schritt 3 von 6“ aus dem
  Kochmodus, weiße Pille „Gegessen“; Antippen öffnet den Kochmodus. Jeder
  Zustand der Essen-Kachel hat ein Bild („Noch frei“ und „Kein Kochtag“: leerer
  Teller mit Besteck).
- Kopf der Essen-Kachel einzeilig: „ESSEN · 18:30“, ab M „· für 4“.
- Einkauf-Kachel: Sachen ohne eigene Zeichnung zeigen das Symbol ihrer
  Abteilung statt eines Buchstabens; neue Zeichnung „Aufschnitt“; nur „Egal
  wo“ = bis zu 6 Symbole + Anzahl, mit Läden die Zeilen je Laden.

## Abends nichts doppelt (v0.124.0, Tafel 98)

- Der gestrichelte Streifen „Ausblick morgen“ ist weg (Startseite und
  Kachel-Auswahl); gespeicherte Anordnungen verlieren ihn still (Startseite
  v7, `migrateHome`), auch aus alten Sicherungen. Abends zeigen Termine- und
  Essen-Kachel wie bisher schon morgen.
- Jetzt-Karte abends (ab Feierabend bzw. 19 Uhr, wenn heute nichts mehr
  kommt): höchstens EIN Thema, nur was keine Kachel zeigt, fest in der
  Reihenfolge Jahrestag/Geburtstag morgen, Regen morgen früh mit Plan,
  Termin vor 9 Uhr mit Wecker, Essen mit Vorlauf, sonst „Morgen ist ruhig.
  Schönen Abend.“ Das alte Thema „Ausblick“ entfällt. Nachts wie bisher.
- Ganztägige Termine: „Ganztägig“ statt „Tag“, besondere Tage mit Herz bzw.
  Geschenk in Rosé (neues Token `--app-rose`).

## Navigation neu – Leiste unten (v0.125.0, Tafel 96)

- Ersetzt „Navigation: immer zur Startseite“ (v0.115) samt Haus-Knopf. Unten
  eine schwebende Leiste mit Kalender · Heute · Essen und Mia rechts darin;
  der Segment-Umschalter oben und das Zahnrad sind weg (Startseite: „···“ mit
  Einstellungen und Startseite bearbeiten), Kalender und Essen tragen einen
  großen Titel.
- Reiter: anderer Bereich = Hauptseite, aktiver Reiter auf Unterseite = zurück
  (Scrollhöhe bleibt), auf der Hauptseite = nach oben. Leiste weich weg bei
  Tastatur, Fenstern, Bühne, Kochmodus, Notiz-Editor, erstem Start,
  Rechtsseiten. Wischen vom linken Rand = eine Ebene zurück. Nach > 5 Min:
  Startseite, Bühne zu, Kochmodus bleibt. Mia erklärt es einmal.

## Essen – die nächsten 7 Tage (v0.126.0, Tafel 97)

- Ersetzt die Wochenkarte (Diese/Nächste Woche) und den Nachtrag „150
  beliebteste Gerichte“. Essen zeigt immer die nächsten 7 Tage ab heute, als
  Liste oder Reihe (gemerkt); jeder Tag öffnet dasselbe Tag-Fenster mit großem
  Bild, „Rezept ansehen“, Tauschen, Anderer Tag, Kein Kochtag und drei Ideen.
- Halten & ziehen tauscht zwei Tage (auch über die Wochengrenze) mit
  „Rückgängig“; „Zuletzt gegessen ›“ zeigt die letzten 14 Tage; „Woche
  planen“ übergibt an Mia. Mia verschiebt rollend, auch über den Namen des
  Gerichts.

## „Im Haus“ gehört zu 1.0 – mit Spontan kochen (v0.127.0)

- Baustein `vorrat` nicht mehr in `LAUNCH_AUS`: für neue Nutzer an, bisherige
  einmal beim Start (`wasgibts.funktionen` v5, `imHaus`); die Kachel kommt
  dabei nicht auf die Startseite (nur über die Auswahl, S/M, S = 3 Sachen
  „bald aufbrauchen“ + „Was koch ich daraus?“). Daten bleiben, wie sie sind.
- Essen: EIN Bereich „Im Haus“ statt „Spontan kochen“ und „Das ist da“ –
  Chips (bald zuerst, höchstens 8, Antippen = Sache öffnen), ＋ für mehrere
  auf einmal, „Alle ›“, groß „Was koch ich daraus?“ = Spontan kochen mit genau
  diesen Sachen; leer „Sag mir, was da ist, dann schlag ich was vor.“
- Füllt sich ohne Arbeit: Einkauf abhaken → rein, Gegessen → raus, „Eier sind
  alle“ → raus und auf die Einkaufsliste (Mia, Regel, Fenster), „Hab noch
  Hack“ → rein. Mia darf „Im Haus“ nutzen (kein „Kommt bald.“ mehr).
- Mia denkt mit: beim ersten Besuch der Essen-Seite einmal „Sag mir, was im
  Kühlschrank ist, dann koch ich mit dir spontan.“

## Wetter-Kachel neu: stiller Himmel, Wind in Worten, 2-Stunden-Überblick (v0.128.0)

- Kachel nach der Vorlage „ruhig mit Regentropfen“: Hintergrund je Wetter
  (Regen/Niesel grau-blau mit feinen Tropfen, Bewölkt weiches Grau-Blau mit
  Wolken, Sonne warmer Verlauf mit angedeuteter Sonne, Schnee helle Punkte,
  Gewitter dunkler mit kleinem Blitz), nachts dunkler, Look „Schlicht“ weiß
  mit farbigem Symbol; nichts bewegt sich. Rein: `kachelHimmel` in
  `lib/wetter/kachel.ts`, Farben als `--app-sky-*`-Tokens, Kontrast getestet.
- Inhalt: „WETTER · EUTIN“, Temperatur mit Windsack, ↑ max / ↓ min, „Regen ·
  ab 10 Uhr trocken“ (ehrliche Regel), „Frischer Wind · 32 km/h aus West“
  (ab Böen 60 „Böen 85“ in Orange), unten 4 Stunden im 2-Stunden-Abstand. S:
  Temperatur, Windsack, eine Zeile.
- Windstufen nach Tafel 87 (Beaufort, Mittelwind) zentral in
  `lib/wetter/wind.ts` statt der drei alten Stufen (leicht/windig/stürmisch,
  Böen ab 50): gleiche Wörter auf Kachel, Wetter-Seite und in Mias
  Antworten; Windsack steht je Stufe höher, Windstriche ab „Lebhaft“, Karte
  warm ab „Stürmisch“, Windsack rot ab „Sturm“.
- Jetzt-Karte: Wind nur ab „Stürmisch“ und nur mit Planbezug („Stürmisch ab
  14 Uhr · Trampolin sichern?“). Der alte Kachel-Tipp `weatherTip` ist weg.

## Werbeclip-Abgleich „Mia“ vom 23.10. (v0.129.0)

- Clip-Szenen geprüft: „Einfach erzählen“ (ein Satz → Termin + Einkauf mit
  Übersicht, über die KI; Prüfstand „Mehreres auf einmal“), „Einer sagt’s,
  alle wissen’s“, „Gemeinsam/Privat“, Ideen „Mia hat drei“ (Kochidee).
- Neu „Steh grad davor“: setzt jemand während eines geteilten Einkaufs etwas
  drauf, bekommt die Person im Laden eine Mitteilung mit Knopf „Steh grad
  davor“ (auch im Einkaufsmodus unter der gelben Zeile); die Antwort hängt am
  geteilten Einkauf und kommt als Mitteilung und leise oben in der
  Einkaufsliste bei der Person an, die es draufsetzte.
- Kochidee versteht auch kurz „Hähnchen gekauft, was Cremiges?“ (vorher kam
  Grießbrei); Testmodus versteht „Milch auf die Liste“.
- Härtetest „Familie teilen“: `tests/konten/familieTeilen.test.ts` und
  Durchklick `familieTeilen` (zwei Konten, Einkauf live ≤ 5 s, Termine
  Familie/Arbeit, Pinnwand live, „Steh grad davor“).

## Einkauf: erst einsortieren, dann einkaufen (v0.130.0)

- Tafel 99: In der Einkaufsliste heißt Antippen „Wo kaufst du das?“ (Meine
  Läden als große Knöpfe, „Egal wo“, Häkchen „immer bei“, unten „Schon
  gekauft · Ändern · Löschen“), nie mehr „gekauft“ – abgehakt wird im
  Einkaufsmodus. Meldung „Spinat → Rewe. Merk ich mir. · Rückgängig“.
- Neuer Zustand „noch ohne Laden“ neben bewusst „Egal wo“ (leerer gemerkter
  Laden; Bisheriges gilt als noch ohne Laden, kein Formatwechsel). Zone
  „Noch ohne Laden“ oben mit „Mia sortiert“ (Gelerntes, eindeutige ähnliche
  Namen) und „5 einsortiert · Rückgängig“.
- Einkauf-Kachel: immer die Läden aus „Meine Läden“ (auch mit 0), darunter
  „6 noch ohne Laden · Sortieren ›“; die Symbolreihe (Variante A) entfällt.
- Durchklick: neuer Ablauf `einsortieren`, `einkauf`/`imHaus` angepasst.

## Auf der Bühne nur eine Mia (v0.131.0)

- Fehler aus dem Video 27.10. 21:14: bei den Ideen standen zwei Mias mit
  pulsierendem Ring (Karte „Ganz was anderes?“ und groß unten), Beispiel-
  Sätze wirkten nicht wie Knöpfe.
- Karte „Ganz was anderes?“ (und „Passt nicht?“) weg; stattdessen „Oder
  worauf hast du Lust?“ mit 3–4 Vorschlags-Knöpfen (weiß, Rand und Text
  Orange) nach Vorrat, Jahreszeit und Tageszeit (`kochtipp/vorschlaege.ts`).
  Ein Tipp schickt den Satz ab; Mia antwortet kurz + drei neue Karten
  („Kürbis geht immer im Herbst:“).
- Genau eine antippbare Mia auf der Bühne; im Chat nur das kleine Gesicht;
  „Noch was anderes?“ im Karussell mit Linien-Symbol statt Mia.
- Ring um die große Mia nur beim Zuhören bzw. „Gleich schick ich’s ab“, nie
  im Warten, nie zwei zugleich (`stageRing`; vorher Wellen und Ablauf-Ring
  zugleich möglich).
- Tests: `tests/begleitung/eineMia.test.ts`, `tests/essen/vorschlaege.test.ts`,
  Durchklick `eineMia()` in `kochtipp`, `wochencheck`, neu `eineMiaBuehnen`.

## Offene Aufgaben wandern abends mit (v0.132.0)

- Fehler (27.10., 21:11): Abends stand die Aufgaben-Kachel leer da („Aufgabe
  eintragen“), obwohl zehn Aufgaben von heute offen waren.
- Sobald die Startseite abends auf morgen steht, zeigt die Aufgaben-Kachel
  „Morgen · Mi“ mit dem Offenen von heute zuerst („von heute“), dann den
  Aufgaben für morgen. Aufgaben-Seite „Morgen dran“, „Dein Tag“ unter
  „Morgen · Mi“, Jetzt-Karte und Mia („Was steht morgen an?“ → „Dazu von
  heute: …“; die KI bekommt eine Zeile dazu) nutzen dieselbe Logik
  (`kalender/mitwandern.ts`). Nichts wird verschoben, um Mitternacht rutscht
  alles still wie bisher.

## Seiten-Tipps oben statt unten (v0.133.0)

- Fehler (Screenshot 27.10. 21:22): der Erster-Besuch-Tipp von „Mia denkt
  mit“ schwebte als weiße Karte unten rechts über der Liste, ohne Mia-Gesicht,
  wurde übersehen und verdeckte Inhalt.
- Alle Seiten-Tipps stehen jetzt direkt unter dem Seitentitel im normalen
  Seitenfluss (EINE Karte `begleitung/denktmit/SeitenTipp.tsx`): warmer
  Verlauf wie die Jetzt-Karte, feiner orange Rand, kleines Mia-Gesicht ohne
  Ring, „MIA“ in Orange, 1–2 Sätze; „Alles klar“ gleitet weich nach oben weg,
  „Zeig mal“ nur mit echter Aktion (Einkauf → „Meine Läden“). Unterseiten
  über `PageHeader`, Kalender/Essen unter ihrem Titel; die schwebende Karte
  aus `KitchenHelper` ist weg.
- „Mia stellt vor“ auf der Startseite steht direkt unter der vorgestellten
  Kachel mit Pfeil zur Kachel (statt unter der Jetzt-Karte); „Alles klar“
  statt „Später“.
- Texte: Aufgaben „Hier steht, was ansteht. Was heute nicht klappt, nehm ich
  mit auf morgen.“; Einkauf, Essen, Notizen, Termine, Wetter auf zwei kurze,
  gesprochene Sätze ohne Fachwort gebracht.
- Tests: `tests/mia/seitenTipp.test.ts`; Durchklick `ersterBesuchKarte` und
  `imHausEssen` prüfen die Lage unter dem Titel.

## Locker und kurz im Chat (v0.134.0)

- Problem: Mia antwortete im Chat oft steif und zu lang („Ich habe … für
  dich …“, „Möchtest du …?“, Anschlussangebote), obwohl der Prompt 2 Sätze
  vorgab.
- Prompt entschlackt: Ton vorn (`TON_PROMPT`, 13 statt vorher 17 + 6 Zeilen
  „So bist du“/„Ohne Druck“), 20 neue ✓/✗-Beispiele aus dem Alltag;
  Werkzeug-Regeln wandern in die Werkzeug-Beschreibungen.
- Gesprochenes Deutsch erwünscht („hab“, „is“, „passt“, „jo“, „na klar“,
  „Moin“), Liste `STEIF` in `mia/persona.ts`; `tidyMiaText` kürzt steife
  Anhängsel am Ende und einen steifen Einstieg, nie Inhalt.
- Längen: Alltag ≤ 120 Zeichen, Rat/Wissen ≤ 240, außer „erklär mal genau“.
  Kurzes Plaudern (Danke, Gruß, „Bin platt“) geht an Haiku.
- Prüfstand „Ton“: 30 Sätze, Ziel ≥ 90 %, unter „Für Entwickler“.
- Fehler gefunden (Durchklick „zuhoeren“): Antwortete Mia schneller als
  300 ms (jetzt oft bei „Passt.“), hörte sie danach nicht weiter zu. Jetzt
  hört sie auch nach einer sehr schnellen Antwort gleich wieder zu.

## Im Haus – reinsprechen statt pflegen (v0.135.0, Tafel 102)

- Fehler (Screenshot 28.10. 06:47): „Gar nicht im Haus“ stand als Artikel,
  Zucchini mit Apfel-Symbol, Kuchen/Honig mit Korb/Kiste, große Kacheln,
  „Was koch ich daraus?“ lag unter der Leiste.
- Seite neu: „Was ist da?“ (Mia hört zu, Modus „Im Haus“), Chips in fünf
  Gruppen (Kühlschrank, Vorrat, Obst & Gemüse, Brot, Tiefkühl; nur mit
  Inhalt), oranger Punkt = bald aufbrauchen, „Aufgebraucht: …“ als eine Zeile
  mit „Auf die Liste“, Chip = kleines Fenster, „Was koch ich daraus?“ über der
  Leiste. Speicher `wasgibts.vorrat` v4 (Obst/Gemüse/Brot ziehen um).
- Reinsprechen: ein Satz, rein und raus, „Hab ich so verstanden:“ mit Passt/
  Ändern, nie Satzteile als Sache (auch in der Schnelleingabe); 9 neue
  Prüfstand-Sätze mit `nieName`.
- Kurz-Check Sonntag ab 17 Uhr in der Jetzt-Karte („Kurzer
  Kühlschrank-Check? 20 Sekunden.“), Seite `/vorrat/check`.
- Symbole: Zucchini, Kuchen, Honig gezeichnet; ohne Zeichnung nie Korb oder
  Kiste (Vorrat = Ähre, Sonstiges = Besteck, Gemüse = Möhre, Obst = Apfel).

## Windsack nur bei Wind, ein Hinweis-Stil, Jetzt-Karte morgens (v0.136.0)
- Wetter-Kachel und -Seite: Windsack und Wind-Zeile erst ab „Frischer Wind“
  (Mittelwind ≥ 29 km/h) oder Böen ≥ 60 km/h (`windZeigen`); darunter auf
  der Seite nur klein die Zahl.
- Alle einmaligen Hinweise der Startseite („Unten findest du jetzt …“,
  „Lieber schlicht?“, Einladen, Startseite halten …) im Stil der
  Seiten-Tipps (`SeitenTipp`, Tafel 101) mit „Alles klar“.
- Jetzt-Karte morgens: besonderer Tag zuerst („Moin! Heute hat Lisa
  Geburtstag.“), Morgen-Info mit Terminen nur ohne Termine-Kachel.

## Aufgaben: alles ist heute, eine Liste, Arbeit als Schild (v0.137.0, Tafel 103/104)
- Fehler (Screenshot 28.10. 07:28): Abschnitt „Irgendwann“ (darin „heute“),
  in jeder Zeile „von gestern“ + oranger Punkt, lange Namen abgeschnitten.
- Regel „alles ist heute“: jede neue Aufgabe gehört zu heute (Hand, ＋, Mia,
  Mail-Vorschlag); nur mit genanntem Tag („Freitag KFZ-Steuer“) ab diesem Tag,
  bis dahin leise „Geplant · 1 ›“. Speicher `wasgibts.eintraege` v3 setzt
  „Diese Woche“ still auf heute (nächste Woche → ab Montag), auch im Abgleich
  und aus alten Sicherungen.
- Aufgaben-Seite: Kopf „Heute · Mi 28. Okt“ (abends „Heute Abend ·
  Feierabend“), EINE weiße Liste (dringend → neu → Erstellungszeit), Schilder
  nur „neu“ und „Arbeit“, Namen bis 2 Zeilen. Chips „Alle · Familie · Arbeit“
  nur mit Arbeitsaufgaben, gemerkt (`wasgibts.aufgabenfilter`).
- Nach Feierabend ruht die Arbeit (`arbeitRuht`) auf Seite und Kachel: leise
  „Arbeit · 5 für morgen“, antippen blendet sie kurz ein.
- Mia: „Was steht heute an?“ nennt Zahl und die ersten drei, abends ohne
  Arbeit; „Was ist noch bei der Arbeit?“ fragt eigens. Prüfstand +3 Sätze.

## Arbeitsweise: Warteschlange, Tafeln, Pakete (28.10.)

- `docs/auftraege.md` als Warteschlange (A-001 …, Vorlage, Status, oben eine
  Zusammenfassung je Paket); `docs/tafeln/` für Vorlagen-Bilder.
- CLAUDE.md verschlankt (unter 300 Zeilen), Details wörtlich umgezogen nach
  `docs/bereiche/*.md` (feste Regeln je Bereich, Startseite/Jetzt-Karte, Erster
  Start, Ton, Spracheingabe), `docs/design.md`, `docs/testen.md`,
  `docs/ordner.md`, `docs/roadmap.md`. Neu unter „Arbeitsweise“: parallel wo
  getrennt, Überschneidendes nacheinander auf neuestem `main`, gestaffelte Tests.

## Pinnwand als Kühlschranktür (v0.138.0, Tafel 106/107)
- Ersetzt den Auftrag „Pinnwand – nichts verschwindet ungefragt“. Vorlagen
  `docs/tafeln/tafel-106.png` (Tür, Kachel S/M, neuer Zettel) und
  `tafel-107.png` (Kachel: Variante 1 „Fächer“, leer = Variante 4).
- Rollen: Pinnwand = Zettel und Sprachnachrichten für die anderen (geteilt),
  Notizen = für mich. Pinnwand ist ein Baustein: „Nur für mich“ aus, zu
  zweit/Familie an, wer sie hatte, behält sie (Bausteine v6).
- Tür: helle Kühlschranktür mit Griff (dunkel Edelstahl, Tokens
  `--app-fridge-*`), Zettel in zwei Spalten, fest leicht schief, Magnete
  (Punkt, Stern, Apfel, Herz; angeheftet roter Pin), Farbe = Person (5
  Pastell `--app-zettel-<n>`), Papiere Haftnotiz / Karoblatt (Kinder) /
  Kassenbon (Sprachnachricht) / Polaroid (Foto), Haken-Kreis = Erledigt.
- Keine 24-Std.-Regel mehr: Erledigt = 24 Std. blass + durchgestrichen
  („erledigt von Lisa“), dann Archiv „Ältere · n ›“; sonst nach 7 Tagen
  leise ins Archiv; Angeheftete bleiben; gelöscht wird nur von Hand. Server
  räumt nur Dateien gelöschter Einträge weg (`orphanFiles`, Buckets „memos“
  und „fotos“).
- „Neuer Zettel“ (＋, Ausnahme von der Schnelleingabe): Vorschau als echter
  Zettel, Art Zettel / Sprachnachricht / Foto, 5 Farben, Anheften (Pin),
  „Anpinnen“. Fotos verkleinert (1600 px, JPEG), IndexedDB
  `wasgibts-fotos`, mit Konto Bucket „fotos“ (RLS nur Haushalt; Migration
  `20261031120000_pinnwand_fotos.sql`). Datenkarte, Anbieter,
  Datenschutzerklärung aktualisiert.
- Menü (antippen/lange drücken): Erledigt, Antworten (↪ Lisa), In Notizen
  (eigene Notiz, Zettel ins Archiv), Anheften, Löschen. Mia fragt einmal je
  Zettel „Klingt nach Notiz. Soll ich’s bei deinen Notizen ablegen?“; liest
  nur nicht Erledigtes vor. Prüfstand +3 Sätze (167).
- Kachel „Fächer“: S drei aufgefächert (−10°, −2°, +7°), M drei
  nebeneinander, L bis 6, leer gestrichelter Zettel „Erster Zettel?“ / „Oder
  🎙 Sprachnachricht“; Beispiel-Tag mit Mias orangem Zettel, Ole und einer
  Sprachnachricht („Beispiel“).
- Speicher `wasgibts.pinnwand` v4 (alle Zettel bleiben, Farbe = Person),
  Abgleich v4 (Foto-Zettel erst mit Bild geteilt).
- Nebenbei: Einkauf-Kachel Kopf „EINKAUF“ ohne Abschneiden, Zeile „16 ohne
  Laden · Sortieren ›“ vollständig (notfalls zweizeilig).
- Entschieden ohne Rückfrage: Personenfarbe aus der Reihenfolge im Haushalt
  (kein neues Profilfeld); Karoblatt automatisch für Kinder-Profile;
  Kassenbon weiß (Personenfarbe an Magnet, Avatar, Tonwelle); „Für alle“
  weggelassen (gilt immer); Umschalter im App-Stil statt schwarz;
  „Weiterleiten an Mia“ und die Wisch-Gesten an Zetteln entfallen (Tippen
  und lange Drücken öffnen das Menü); Archiv ohne „Wieder aufhängen“.

## Kachel-Farben neu + wählbar (v0.139.0, Tafel 108)
- Palette neu, alle gleich hell und kräftig: Termine Lavendel, Aufgaben Mint,
  Einkauf Salbei (gelblicher, nicht mehr wie Aufgaben), Pinnwand Rosé,
  Notizen Vanille, Im Haus Aqua, Sport Flieder (vorher grün), Timer Sand;
  Wetter bleibt Himmel, Essen Bild. Dunkel: passende dunkle Töne. Schrift
  auf jeder Fläche und auf Weiß ≥ 4,5:1.
- Farbe wählen: im Bearbeiten-Modus unter S · M · L „A“ + 8 Pastelltöne
  (`FarbWahl`), ein Tipp = übernommen, keine freie Farbwahl; Wetter und
  Essen ohne Auswahl. „Schlicht“: der Ton nur in Überschrift/Symbol.
- Speicher `wasgibts.startseite` v8: `farbe` je Kachel (pro Person/Gerät,
  in der Sicherung); alte Anordnungen bleiben automatisch.
- Mia: `startseite_anpassen` mit aktion `farbe` („Mach die Notizen blau“ →
  Lavendel, „Pinnwand wieder in Standardfarbe“ → A), auch ohne KI.
  Prüfstand +2 Sätze.


## Neue Adresse mia.karamba-eis.de (v0.140.0, A-030)
- Feste Adresse `APP_URL` (keine Weiterleitung); Einladungslinks zeigen immer dorthin, Mail-Vorlage lädt das Logo von dort. Supabase-Redirects werden von Hand angepasst (siehe `docs/bereiche/konten.md`).

## Mia-Zubehör: Sonne das ganze Jahr (v0.140.0, A-033)
- `wetter()` in `src/lib/mia/zubehoer.ts`: Regen bald → Schirm (Vorrang);
  jetzt sonnig ab 18 °C → Sonnenbrille, ganzjährig (vorher nur > 22 °C im
  Sommer); sonnig unter 18 °C → neues Zubehör „sonne“. Sonne und Sonnenbrille
  nur tagsüber (Sonnenauf- bis -untergang über `isNight` aus
  `wetter/view.ts`), nachts nie. Rangfolge Geburtstag > Anlass > Kochen >
  Wetter > Jahreszeit unverändert, immer genau EIN Zubehör.
- Sonne: Kreis mit acht kurzen Strahlen in `--app-sonne` (#F5B82E), halb
  hinter Mia oben rechts; am Mia-Knopf und auf der Bühne (dort als einziges
  Zubehör). Neuer Moment `sonne` in `miaMoment`: Strahlen drehen sich einmal
  in 8 s, höchstens 1×/h, nur transform; reduzierte Bewegung = still.
- Das eckige Logo (`BrandMark`) bleibt ohne Zubehör (Test).
- Tests: `tests/mia/familienmanagerin.test.ts` (Oktober 13 °C mittags Sonne,
  April 19 °C Sonnenbrille, nachts nichts, Regen schlägt Sonne, Moment,
  Logo, Token und reduzierte Bewegung).

## Erster Start rund für Testfreunde (v0.141.0, A-027 + A-031)
- Problem: Vor der App standen bis zu vier Bildschirme (Hallo, „Bevor’s
  losgeht“, „Für wen“, Testcode), der Code-Bildschirm hatte ein zweites „Los
  geht’s“, „Testcode“ klang nach Baustelle, und wer Mia im Browser nutzte,
  erfuhr nie, wie sie auf den Home-Bildschirm kommt.
- Höchstens 3 Bildschirme: Die Zustimmung steht jetzt im Hallo – die drei
  Sätze klein (ohne „ihr“: „Deine Sachen bleiben auf diesem Handy. Mit Konto
  teilst du sie mit deinen Leuten.“ · „Ich bin eine KI und kann mich auch mal
  irren.“ · „Deine Daten werden nie verkauft.“), darunter das Häkchen „Ich
  akzeptiere die Nutzungsbedingungen und hab die Datenschutzerklärung
  gelesen.“ (speichert sofort, gleiche Fassung wie bisher, alte Profile
  unverändert); „Los geht’s“ erst mit Häkchen. Danach „Für wen soll ich
  sortieren?“, danach der Zugangscode nur, wenn nötig. „Bevor’s losgeht“
  bleibt nur für bestehende Nutzer ohne gültige Zustimmung.
- Zugangscode statt Testcode (Bildschirm, Einstellungen „Zugangscode
  ändern“, Mias Satz): „Fast geschafft.“, „Gib deinen Zugangscode ein, dann
  kann ich zuhören und mitdenken.“, darunter „Groß/klein und Leerzeichen sind
  egal.“, Knopf „Fertig“. Prüfung nachsichtig in App und Server
  (`normalisiereZugangscode`: Leerzeichen raus, klein; weiter Hash-Vergleich
  in konstanter Zeit und 10 Fehlversuche je Adresse).
- Einladung (/e/…): E-Mail-Code → Startseite; der Zugangscode erst beim
  ersten KI-Versuch (`codeErstBeimKiVersuch`).
- „Mia auf den Home-Bildschirm“: einmal eine ruhige Karte oben auf der
  Startseite, nur im Browser und nicht im Beispiel-Tag (erst auf der echten
  Startseite) (iPhone/Safari mit Skizze und „Zeig’s mir“,
  iPhone in anderem Browser „Öffne mich in Safari …“, Android
  `beforeinstallprompt` → „Mia installieren“ bzw. „Menü ⋮ → App
  installieren“); „Später“ = nach 2 Tagen einmal wieder, dann nie mehr;
  dauerhaft unter Einstellungen → Daten & App. Speicher
  `wasgibts.homebildschirm` (nur Gerät).
- KI-OK aufgeräumt: „Mia braucht kurz dein OK“ nennt ElevenLabs nur, wenn
  Mias Stimme bzw. Ohr vom Server aktiv ist; „Nicht jetzt“ schließt nur die
  Karte (Einwilligung bleibt unerteilt, Zugangscode unberührt).
- Fehler behoben: `wasgibts.hinweise` stand im Speicher-Verzeichnis UND bei
  den ausgemusterten Schlüsseln (Rest aus v0.25) – `removeRetiredKeys` löschte
  die Hinweis-Warteschlange bei jedem Start, „jeder Hinweis nur einmal“ galt
  so nicht. Jetzt nur noch lebender Schlüssel; Test: kein Schlüssel aus dem
  Verzeichnis wird beim Start gelöscht.


## Neue Adresse mia.karamba-eis.de (v0.141.0, A-030)
- Feste Adresse `APP_URL` (keine Weiterleitung); Einladungslinks zeigen immer dorthin, Mail-Vorlage lädt das Logo von dort. Supabase-Redirects werden von Hand angepasst (siehe `docs/bereiche/konten.md`).

## Mia-Zubehör: Sonne das ganze Jahr (v0.142.0, A-033)
- `wetter()` in `src/lib/mia/zubehoer.ts`: Regen bald → Schirm (Vorrang);
  jetzt sonnig ab 18 °C → Sonnenbrille, ganzjährig (vorher nur > 22 °C im
  Sommer); sonnig unter 18 °C → neues Zubehör „sonne“. Sonne und Sonnenbrille
  nur tagsüber (Sonnenauf- bis -untergang über `isNight` aus
  `wetter/view.ts`), nachts nie. Rangfolge Geburtstag > Anlass > Kochen >
  Wetter > Jahreszeit unverändert, immer genau EIN Zubehör.
- Sonne: Kreis mit acht kurzen Strahlen in `--app-sonne` (#F5B82E), halb
  hinter Mia oben rechts; am Mia-Knopf und auf der Bühne (dort als einziges
  Zubehör). Neuer Moment `sonne` in `miaMoment`: Strahlen drehen sich einmal
  in 8 s, höchstens 1×/h, nur transform; reduzierte Bewegung = still.
- Das eckige Logo (`BrandMark`) bleibt ohne Zubehör (Test).
- Tests: `tests/mia/familienmanagerin.test.ts` (Oktober 13 °C mittags Sonne,
  April 19 °C Sonnenbrille, nachts nichts, Regen schlägt Sonne, Moment,
  Logo, Token und reduzierte Bewegung).

## Einkauf neu – einsprechen oder aussuchen (v0.142.0, Tafel 110/111)
- Problem (Screenshots 28.10. 08:24): die Einkaufsliste war zu voll (Woche,
  Reiter, Einkaufsmodus-Knopf, Abteilungen, Zuletzt gekauft, Gerichte ohne
  Zutaten, Hinweistexte). Die Kachel war klar – so ist jetzt die Seite.
  Ersetzt „Einkauf so einfach wie die Kachel“, „Einkaufs-Diktat“ und die
  Oberfläche aus Tafel 89/99; Datenmodell, „Meine Läden“, Regeln, Lernen und
  Mia bleiben.
- Seite „Einkauf“: zwei große Knöpfe „Einsprechen · Einfach aufzählen“
  (Orange) und „Aussuchen · Suchen & antippen“ (weiß), „Meine Läden“ als große
  farbige Karten (auch mit 0, Tipp = Laden-Seite), „Noch ohne Laden“
  gestrichelt: antippen = „Wo kaufst du das?“, halten (250 ms) und auf eine
  Karte ziehen = sofort gemerkt („Käse → Edeka. Merk ich mir. · Rückgängig“),
  „Mia sortiert“. Alles Seltene im „···“ (Woche, Zuletzt gekauft, Gerichte
  ohne Zutaten, Stammliste, Teilen, Meine Läden).
- Einsprechen: Mia im Modus „Einkauf“ (zuhörend, „Zähl einfach auf.“), KI
  zuerst mit „[Einkauf] …“, ohne KI eigener Versteher (nur Lebensmittel und
  Verbrauchsartikel, Füllwörter/Abbrüche/Smalltalk/Namen raus, Korrekturen,
  Mengen, Doppeltes, „bei Rewe“). Live-Blase streicht Ignoriertes durch,
  „Hab ich: 9 Sachen“ als Chips (×, Farbpunkt), „Passt“ → „9 drauf · 3 ohne
  Laden · Rückgängig“. Prüfstand +12 Sätze (neu geprüft: Anzahl, Menge).
- Aussuchen: erst Laden (große Knöpfe, aktiv voll in Ladenfarbe mit Zahl),
  dann Sachen; feste Abschnitte (Für eure Woche → Oft bei/Beliebt → Obst …
  Süßes & Snacks → Drogerie & Haushalt zuletzt, im Drogerie-Laden zuerst und
  Lebensmittel eingeklappt), klebende Überschriften, Suche und Chip-Reihe
  bleiben oben, Haken „steht drauf“ in Ladenfarbe, Punkt „noch da“, halten =
  Menge („×2“), dunkle Leiste „● Rewe 3 · ● Rossmann 2“ + „Fertig“. Jede Wahl
  wird als feste Regel gemerkt.
- Laden-Seite statt Einkaufsmodus: große Karte „Rewe · 3 Sachen“, großer
  Kreis = gekauft (nach 2 s „Im Korb“), lange drücken = anderer Laden/ändern/
  löschen, Feld „Was noch bei Rewe?“. „Familie Bescheid sagen“ beim ersten
  Abhaken bzw. unterwegs geöffnet („Ich bin bei REWE“, Jetzt-Karte).
- Kachel C2 bleibt: Laden-Zeile = Laden-Seite, „n ohne Laden“ = Einkauf am
  Bereich. Beispiel-Tag mit Edeka/Rewe/Lidl/Rossmann und zwei Chips.
- Entschieden ohne Rückfrage: Leiste unten über das neue Token
  `--app-leiste-dunkel` (warmes Fast-Schwarz, nie reines Schwarz), „Fertig“
  orange; „Süßes & Snacks“/„Drogerie & Haushalt“ nur als Anzeige-Abschnitte
  (gespeichert bleibt die Abteilung, kein Formatwechsel); der gemerkte Chip
  (`wasgibts.einkaufsansicht`) ist jetzt der aktive Laden in „Aussuchen“
  (gleiches Format); Rückgängig nach dem Ziehen nimmt den Schritt samt Regel
  zurück; Grundsachen aus Rezepten und fällige Stammartikel stehen nicht
  mehr als Extra-Zeilen auf der Seite (Grundsachen unter „Aussuchen · Für
  eure Woche“, Stammliste im „···“); „Tomaten und Gurke bei Rewe“ gilt auch
  ohne KI für beide (nur ohne Komma).
- Nachtrag (vor dem Merge): **Laden leer, Wagen, Mengen**.
  - Laden ohne Einträge: „Für Edeka steht nichts drauf.“, darunter „Oft bei
    Edeka“ (Regel, Gelerntes, Gemerktes, hier Gekauftes; sonst „Zuletzt
    gekauft“, sonst „Beliebt“). Antippen = direkt bei Edeka (feste Regel),
    kurz „Steht drin.“ – kein Laden-Wählen. Der alte Satz „Antippen: Laden
    wählen. Abhaken im Laden.“ ist weg.
  - Abhaken im Laden: Häkchen orange, Zeile blasser (nie durchgestrichen),
    1 s stehen (nochmal tippen = doch nicht), dann gleitet sie 0,8 s nach
    unten in „Schon im Wagen“ (zugeklappt, ohne Zahl, antippen = aufklappen;
    ersetzt „Im Korb“). Einmal oben „Abhaken, was im Wagen liegt.“ (bis zum
    ersten Abhaken, Einmal-Hinweis `einkauf-wagen`). Großer Knopf „Einkauf
    fertig“: Wagen → Im Haus (nur mit Baustein), „Fertig. Liegt jetzt bei Im
    Haus.“ bzw. „Fertig.“ mit Rückgängig, zurück zur Übersicht „Einkauf“;
    meldet wie bisher der Familie „Eingekauft ✓“ (ersetzt „Fertig
    eingekauft“).
  - Doppeltes zusammen (`einkauf/zusammen`): gleiche Sache (Groß/klein,
    Einzahl/Mehrzahl, Umlaute) im selben Laden = ein Eintrag, Mengen addiert,
    wenn die Einheiten passen („500 g“ + „250 g“ = „750 g“), sonst beide
    („500 g + 1 Packung“). Beim Hinzufügen (Tippen, Rezept, Mia), in der
    Anzeige (auch Rezept-Zutat + eigener Artikel) und rückwirkend:
    `wasgibts.einkaufsliste` v7 fasst beim Laden zusammen.
  - Rezeptmengen als Einkaufsmengen (`zusammen/packung.ts`): auf übliche
    Packungen gerundet (Milch 250 ml → „Milch“, Lasagneplatten 2 Stück →
    „1 Packung“, Parmesan 20 g → „Parmesan“, Löffel/Prisen/unter 50 g weg),
    die Rezeptmenge klein darunter („250 ml für Lasagne“). Eigene Mengen
    bleiben, wie sie eingegeben wurden.
  - Entschieden ohne Rückfrage: Abhaken auf der Laden-Seite legt noch nichts
    nach Im Haus, erst „Einkauf fertig“ (sonst stünde die Meldung doppelt);
    „Einkauf fertig“ erscheint, sobald etwas im Wagen liegt (nicht nur beim
    geteilten Einkauf) und hat Rückgängig (4 s: wieder im Wagen, wieder raus
    aus Im Haus); was fertig ist, merkt die Woche (`fertig`, im Abgleich
    `einkauf-woche`), Haken weg = wieder offen. Ein eigener Knopf „Bei Edeka
    einkaufen ›“ kommt nicht: die Laden-Seite ist seit Einkauf neu schon der
    Laden-Modus, jede Laden-Karte (auch mit 0) öffnet sie gleich.
    Zusammenfassen behält beim Speichern die kleinste Kennung (alle Geräte im
    Haushalt entscheiden gleich, der andere Eintrag wird beim Abgleich als
    gelöscht markiert, neueste Änderung gewinnt); Rückgängig nach einem
    zusammengefassten Hinzufügen nimmt nur die dazugekommene Menge heraus.
    Laden-Vergleich beim Zusammenfassen über den gemerkten Laden des Namens;
    bei Mia-Vorschlägen hängt der Laden ohnehin am Namen. Eier als 6er/10er.


## Mia schneller und flüssiger (v0.143.0, A-019)
- Auftrag A-019: einfache Sachen in unter 1,5 s nach dem letzten Wort, bei
  großen sofort eine Reaktion. Messen zuerst: `begleitung/tempo.ts`
  (`wasgibts.tempo`, nur Zahlen, nur Gerät), Server schickt seine Zeiten mit,
  „Tempo: Median der letzten 20“ unter Für Entwickler.
- Stille 2,5 s → 1,2 s, Ring 0,8 s; Fortsetzung innerhalb 1,5 s nach dem
  Abschicken hängt an (Frage zurückgezogen, beides zusammen neu).
- Sofort-Weg ohne Warten auf die KI für eindeutige Kurzbefehle (Einkauf aus
  dem Katalog, Termin mit Uhrzeit, Aufgabe, Notiz, Pinnwand, Timer), die KI
  prüft im Hintergrund und korrigiert nur bei anderer Lesart; Prüfstand 74
  Kurzsätze (100 %, Ziel ≥ 98 %). CLAUDE.md „KI zuerst“ um diese Ausnahme ergänzt.
- Modellwahl vor dem Aufruf, Haiku Standard für den Alltag (effort low), kein
  „erst Haiku, dann Sonnet“ mehr außer bei echtem Fehler. Eine Runde bei
  kleinen Werkzeugen (Bestätigung aus dem Ergebnis).
- Erster Satz wird schon beim Streamen vorgelesen, Rest nahtlos; „Mhm.“ nach
  1,2 s ohne Antwort, einmal. Mias Stimme: erster Satz als eigenes Stück.
- Kontext nur mit den Daten, die die Nachricht braucht (−58 % Zeichen im
  nicht gecachten Kontext bei 10 Alltagsfragen), Cache des festen Teils 1 Stunde.
- Fehler Mikro belegt (Video 28.10. 09:09): keine Neustart-Schleife mehr –
  höchstens ein stiller Neustart ohne Ton, dann „Mikro ist gerade belegt.
  Lieber schreiben?“.

## Mia hört live über ElevenLabs (v0.143.0, A-026)
- Auftrag A-026 (Nachtrag zu A-019, Video 28.10. im Café): Seit ElevenLabs
  aktiv war, nahm Mia per MediaRecorder auf und schickte die Datei am Ende an
  scribe_v1 – kein Live-Text mehr, Satzende nur über den Pegel (im Café nie
  still, man musste Mia antippen), danach 1–3 s Warten auf die Mitschrift.
- Jetzt live über ElevenLabs Realtime (`scribe_v2_realtime`): `/api/stimme/ohr-token`
  holt einen Einmal-Schlüssel (`realtime_scribe`, Zugangscode und Grenzen wie
  das Ohr, echter Schlüssel bleibt auf dem Server), die App streamt PCM 16 kHz
  direkt an den Websocket (Deutsch fest). Vorläufiger Text live auf der Bühne,
  Satzende per VAD von ElevenLabs (1,2 s Stille) – der fertige Satz geht sofort
  an Mia; Antippen = Commit von Hand; Ring nach 0,6 s ohne neue Wörter;
  höchstens 20 s ohne neue Wörter; Mikro-Wachhund für alle Wege.
- Protokoll an einer Stelle (`begleitung/echtzeitProtokoll.ts`), Runde ohne
  React (`ohrLive.ts`, getestet mit nachgestelltem Websocket), Browser-Teil
  `ohrLiveBrowser.ts`, Reihenfolge `ohrWeg.ts`: live → Spracherkennung des
  Browsers → eigene Aufnahme (scribe_v1). Zweimal hintereinander keine
  Verbindung = bis zum Neuladen Browser.
- Pegel-Ende (`lauschen.ts`, letzter Ersatz) robuster: Grundrauschen läuft
  auch beim Sprechen langsam mit, Ende relativ zum Sprech-Pegel, Dauer-Laut
  höchstens 20 s (Test mit Café-Rauschen 0,05).
- Messen: Tempo merkt den Weg (live/Browser/Aufnahme), neu „Erstes Wort → Ton“
  und „Ende Sprechen → Antwort zu hören“ (Ziel unter 2 s); jede gesprochene
  Runde als Zahlen-Zeile im Mikro-Protokoll.
- Datenschutz: Datenkarte, Anbieter und Datenschutzerklärung um das
  Streaming ergänzt (gestreamt, nicht gespeichert, nur mit KI-Einwilligung).

## Mias Stimme bleibt Mias Stimme (v0.143.0, A-035)
- Nachtrag zu A-019: Mia sprang mitten im Gespräch still auf die Stimme des
  Handys, weil der Server-Status bei jeder Antwort neu abgewartet wurde
  (Grenze 400 ms) und die erste Silbe nach 1 s als zu spät galt.
- Status einmal beim Öffnen von App und Bühne holen und merken; bekannt
  „sprechen“ = sofort ElevenLabs. Erste Silbe darf 2,5 s dauern, solange
  zeigt die Bühne das Denk-Zeichen.
- Eine Stimme je Gespräch (Bühne auf bis zu): ein Fehler = Antwort bleibt als
  Text, still einmal nachladen; erst zwei Fehler in Folge = Handy-Stimme bis
  zum Schließen, mit kleinem Hinweis „Netz wackelt, ich sprech kurz mit
  Handy-Stimme.“
- Vorwärmen beim Öffnen der Bühne über den eigenen Server (`/api/stimme?warm=1`):
  HEAD zu ElevenLabs ohne Schlüssel, kein Sprechen, kein Kontingent.
- Mikro-Protokoll: jeder Ersatz mit Grund (Status zu spät, erste Silbe zu
  spät, Fehler-Code). Tests `tests/begleitung/stimmeGespraech.test.ts`.

## Fenster-Zurück ohne Wettlauf (v0.144.0)
- Fehler: Schloss man die Schnelleingabe per ✕ und erschien gleich danach ein
  neues Fenster (z. B. „Soll ich dich erinnern?“), konnte das verspätete
  `popstate` des eigenen Zurück das neue Fenster sofort wieder schließen –
  die Frage blinkte kurz auf und „Lieber nicht“ wurde still gemerkt.
- Jetzt wartet ein neues Fenster mit seinem Verlaufseintrag, bis das eigene
  Zurück angekommen ist (höchstens 1 s); wird es vorher geschlossen, legt es
  gar keinen an (`src/lib/core/fensterVerlauf.ts`, `useBackCloses.ts` nur
  noch Hülle). Test `tests/core/fensterVerlauf.test.ts` mit asynchronem
  Verlauf; Durchklick `erinnerungFrage` war vorher schwankend.

## Pinnwand: Wörter klarer, Erledigtes geht sofort von der Tür (v0.145.0, A-024)

- Wörter überall gleich (`pinnwand/woerter.ts`): großer Knopf „Aufhängen“
  (statt „Anpinnen“), Toast „Hängt.“ (statt „Angepinnt“), Schalter „Bleibt
  hängen“ mit lucide Pin und leisem „Verschwindet nicht von selbst, z. B.
  fürs WLAN.“ (statt „Anheften“; an = roter Pin in der Vorschau), Menü
  „Nicht mehr festhalten“ (statt „Nicht mehr anheften“), Zeile „Lisa ·
  bleibt hängen“, Schnelleingabe „Hängt: …“, Seiten-Tipp und leere Tür
  „Kurze Zettel für alle. Abhaken räumt auf, ‚Bleibt hängen‘ bleibt.“
  Notizen behalten ihr „Anheften“ (eigener Bereich). Intern bleibt `pinned`.
- Abhaken wie Aufgaben und Einkauf (Nachtrag): Häkchen orange, 1 s stehen
  (nochmal tippen = zurück), dann gleitet der Zettel 0,8 s weich ins Archiv
  „Ältere“ (nur transform/opacity, reduziert nur Überblenden), nicht mehr
  blass und nie durchgestrichen. Dieselben Zeiten wie im Laden, jetzt an
  einer Stelle (`core/abhaken.ts`: `STEHEN_MS`, `GLEITEN_MS`; `ABHAK_MS` =
  1,8 s). Liegt er im Archiv, kommt „Erledigt · Rückgängig“ (5 s) und holt
  ihn zurück an die Tür. Gilt auch in der Kachel: gerade Abgehaktes steht
  1 s mit Häkchen im Fächer und gleitet dann weg. Die 24-Stunden-Wartezeit ist weg. Nicht
  Erledigtes wie bisher nach 7 Tagen ins Archiv, „Bleibt hängen“ nie.
- Archiv: nach 30 Tagen still gelöscht (`isForgotten`, `forgetOldArchive`
  beim Start über `tidyPinboard`), als Lösch-Markierung über den Abgleich;
  der Server räumt die Dateien wie bisher nur für gelöschte Einträge weg.
  Speicherformat unverändert (v4). Datenschutzerklärung und Datenkarte
  angepasst. Leitbild: Rückgängig auch beim Abhaken.
- Mia: `pinnwand_schreiben` kennt `bleibt_haengen` („Häng dauerhaft an die
  Pinnwand: …“, ohne KI `pinStays`), Beschreibung mit den neuen Regeln,
  Prüfstand +1 Satz (195).
- Behoben (Bildschirmfoto v0.138, iPhone 15 Pro): Die Tür war mit einem
  Zettel fast bildschirmhoch (Mindesthöhe 420 → 220 px, wächst mit dem
  Inhalt), und der schmale lange Griff rechts sah wie ein innerer
  Scrollbalken aus (jetzt kurzer, kräftiger Bügel mit Rand und Schatten).
  „Felix · gest…“ wurde abgeschnitten – Name · Zeit bricht jetzt lieber
  um, der Haken-Kreis behält seinen Platz.

## Essen-Kachel „Rezept“ und Kochmodus (v0.146.0, Tafel 122, A-025)
- Problem: Die Essen-Kachel hatte zu viele Wege („Ich koche jetzt ›“, „Woche
  ›“, Antippen = Rezept, eigene Koch-Kachel mit „Gegessen“). Ersetzt den
  Nachtrag aus Tafel 121.
- Kachel: Bild mit dunklem Verlauf (Token, Kontrast ≥ 4,5:1 geprüft), Pille
  oben links, Name groß in der Mitte (S 20/M 24 px, nie mitten im Wort
  abgeschnitten), Unterzeile „90 Min · auf die Liste: …“ bzw. „alles im
  Haus“, unten „Rezept“ | „Wochenplan“ (S „Woche“); ohne Gericht „Vorschlag“,
  beim Kochen „Weiter kochen“ mit „Schritt 3 von 6“. Rest = Tagesansicht.
  Eigener Eintrag ohne Rezept: Fenster „Mia schreibt dir ein Rezept dazu“.
- Rezeptseite: Bild mit „‹ Heute“, „HEUTE · 18:30 · FÜR 5“, Vorrat-Satz, dann
  „Los, Schritt für Schritt“, Zutaten mit Kästchen und „+ Liste“, „So geht’s“.
- Kochmodus dunkel, ein Schritt in 24 px, „Timer 10 Min“ (derselbe Timer wie
  überall), Zurück/Weiter 56 px, Wischen, Wake Lock, ✕ merkt den Schritt (nur
  heute), Mia hört auf „Weiter“, „Zurück“, „Nochmal“, „Timer X Minuten“,
  „Fertig“; am Ende „Gegessen“ mit einem Satz („Lasst es euch schmecken.“).
- Nachtrag Schnellanleitung: „So geht’s“ mit „Kurz | Ausführlich“ (Standard
  Kurz, Wahl pro Gerät), Kurzfassungen für alle eingebauten Gerichte fest in
  den Daten, Mia liefert sie beim Rezept-Schreiben mit, sonst erster Satz;
  Zeit-Chips starten den Timer, Leiste „⏱ 7:42 · Tomatensoße“, Schritt
  antippen = durchgestrichen, „Gegessen“ am Ende.
- Speicher: `wasgibts.kochen` v2 (Kochmodus-Stand, abgehakte Zutaten; v1 →
  v2 ergänzt leer), neu `wasgibts.rezeptansicht` v1 (Gerät, nicht in der
  Sicherung), Rezept `shortSteps` optional (Kochbuch v3, additiv).

## Vorschläge erst anschauen, dann nehmen (v0.146.0, A-038, Tafel 122)
- Problem: Bei „Was anderes?“ und der Kochidee (drei Vorschläge mit „Nehmen“)
  konnte man das Rezept nicht ansehen, nur nehmen.
- Karte antippen öffnet überall die Rezept-Vorschau (ein Fenster über Bühne
  bzw. Seite) mit den Bausteinen der Rezeptseite: Bild, Zeit, Personen,
  „alles im Haus“ / „auf die Liste: …“, Zutaten für den Haushalt, „So geht’s“
  mit „Kurz | Ausführlich“; unten „Zurück zu den Ideen“ und „Nehmen“. Zurück
  zeigt dieselben Vorschläge an derselben Stelle.
- Ohne Rezept (Vorschlag nur mit Name/Zeit) schreibt Mia es über den
  normalen Server-Weg, genau einmal, gemerkt für „Nehmen“; Fehler „Hat grad
  nicht geklappt. Nochmal?“ nach einem stillen zweiten Versuch.
- Gleich an allen Stellen über `useVorschau`: Kochidee, Spontan kochen, „Was
  koche ich?“, Wochenkarte, Mias Wochenplan-Vorschlag. Einmal „Antippen zum
  Reinschauen.“.

## Erledigte Aufgaben nur 12 Stunden (v0.147.0, A-043)
- Wunsch (28.10.): Erledigtes stand bisher 14 Tage unter „Erledigte
  anzeigen“. Jetzt höchstens 12 Stunden nach dem Abhaken, danach still weg.
  Kein Archiv, keine Zahl.
- „Erledigt ⌄“ statt „Erledigte anzeigen/ausblenden“: standardmäßig
  zugeklappt, ohne Anzahl, aufgeklappt neueste oben (Regel `TASKS_DONE` in
  `core/sort.ts`); Häkchen antippen = wieder offen. Abhaken in der Liste wie
  bisher (kurz durchgestrichen, dann weich weg, „Erledigt · Rückgängig“).
- Abhaken merkt den Zeitpunkt: `doneAt` (einmalig), `doneTimes[datum]`
  (Serie, je Runde). Ohne Zeitpunkt (vor dem Update) gilt Erledigtes als alt
  und geht beim ersten Start einmal still – keine neue Speicher-Version, die
  Felder sind optional; alte Sicherungen laden unverändert
  (`tests/fixtures/sicherung-v0.144-erledigt.json`).
- Eine reine Regel für jede Aufgabe, unabhängig vom Raum
  (`lib/kalender/erledigt.ts`) – greift später auch für Familien-Aufgaben mit
  „erledigt von …“ (A-034). Verschwinden = löschen über den vorhandenen
  Abgleich-Weg (Lösch-Markierung wie beim echten Löschen, nur ohne Meldung),
  damit alle Geräte gleich sind; idempotent, wenn mehrere Geräte aufräumen.
- Serien: nur die erledigte Runde fällt aus „Erledigt“, die Reihe bleibt.
- Mia: „Was hab ich heute geschafft?“ nennt nur, was in den letzten 12
  Stunden abgehakt wurde (Kontextzeile, Werkzeug-Ausgaben gefiltert, die App
  schickt Älteres gar nicht mit). Prüfstand +1 Satz (182), Bewertung kennt
  `nennt`/`nenntNie`. Tests `tests/kalender/erledigt12.test.ts`, Durchklicks
  `erledigtZwoelf`, `erledigtAbgleich`.

## Familie verbinden klarer + Namen statt Mail-Adresse (v0.148.0, A-042)

- Vorher stand ohne Profilnamen der Teil vor dem @ als Anzeigename und
  „Familie <mail>“ als Haushaltsname im Konto. Jetzt: Name aus dem Profil,
  sonst einmal „Wie sollen dich die anderen sehen?“ (vorausgefüllt aus der
  Mail, bereinigt); Haushaltsname je Haushaltsart „Familie“ / „Wir zwei“ /
  „Privat“ bzw. „Familie <Nachname>“, antippen = umbenennen.
- Überschrift je Haushaltsart, neue Texte beim Anmelden ohne
  Gedankenstriche, Mail nur klein unter „Angemeldet als“, Avatar in der
  Personenfarbe.
- Einladungs-Link mit „Link gilt 14 Tage, bis Mi, 11. Nov.“ und Zeilen je
  offenem Link mit Nutzung und „Zurückziehen“.
- Alte Konten: Supabase-Migration `20261101143000_namen_ohne_mail.sql` plus
  einmalige Korrektur beim nächsten Anmelden. Details: `docs/bereiche/konten.md`.
- Bild 1/2 des Auftrags kamen nicht an, gebaut nach Text
  (`docs/auftraege/A-042-familie-namen.md`).

## Einladungsseite ohne Leiste (v0.149.0)
- Fehler: Auf der Einladungsseite (`/e/…`, `/einladung`) lag die Leiste unten unsichtbar unter dem Anmelde-Fenster, das Wischen vom Rand war aktiv. Wer zu schnell weitertippte, brach das Beitreten ab und landete ohne Familie – die App legte dann still eine eigene an. Jetzt ohne Leiste und Mia-Knopf (`core/leiste.ts`, Test). Ursache des Konto-Durchklicks, der auf main meist rot war.

## Essen-Kachel final (v0.150.0, A-045 + A-046, Tafel 133/134)
- Problem (Screenshot 21:03): in der S-Kachel „Rez…“ / „Wo…“, „Würstc…“,
  „Eier, …“; oranger „Idee“-Kreis sah aus wie ein zweiter Mia-Knopf. Dann
  A-046: die großen Knöpfe ganz weg, die Kachel selbst öffnet das Rezept.
- Essen-Kachel: oben links nur noch die weiße Pille „⇄ Was anderes?“,
  unten links Statuszeile („KOCHIDEE · MORGEN DO“, „ESSEN · 18:30“,
  „ESSEN · JETZT“), Name (S 19, M 22 px, nie „…“), S zweizeilig „30 Min“ /
  „auf die Liste: Eier +3“, M „30 Min · auf die Liste: Eier, Limette +2“;
  unten rechts „Wochenplan ›“ bzw. „Weiter kochen ›“. Ohne Plan gleich ein
  Vorschlag, sonst „Was gibt’s heute?“.
- Antippen: Vorschlag → Rezept-Vorschau (A-038) mit „Zurück zu den Ideen“
  und „Nehmen“, fest geplant → Rezeptseite, beim Kochen → Kochmodus am
  Schritt, frei → Ideen des Tages. Beispiel-Tag: Vorschau, erst „Nehmen“
  übernimmt. `GerichtSheet` und die großen Kachel-Knöpfe sind weg.
- Grundregel für alle Kacheln: kein sichtbarer Text endet auf „…“ (außer
  frei Eingegebenem, `data-freitext`). Knopftexte über Stufen (Symbol weg →
  12–13 px → kurze Form, `lib/heute/kachelKnopf.ts`, `ui/KachelKnopf`), Namen
  der Essen-Kachel für 320 px berechnet (`TITEL_BREITE` 116/264), Zutaten
  höchstens 2 + „+N“ (`zutatenKurz`, auch auf der Rezeptseite), Im Haus:
  Name vor Schild, Schild 10,5 px, sonst Umbruch. Wetter, Einkauf, Sport,
  Spendentopf, Tipps brechen um statt abzuschneiden; Notizen-Kachel leer
  „Schnell was aufschreiben.“.
- Prüfung: Durchklick `nichtsAbgeschnitten` (Beispiel-Tag, Familie, langer
  Name „Gemüselasagne mit Béchamel“, abends) auf iPhone SE (320 px), 15 Pro,
  Pixel 7, jede Kachel in S/M/L; Abläufe `essenkachel`/`kochmodus` für
  Antippen je Zustand, Pillen, „Zurück zu den Ideen“, „Nehmen“.
- Kein neuer Speicher, keine Migration.

## Neue Aufgabe & Termin: ein Feld, Familie · Ich · Arbeit (v0.151.0, A-020, Tafel 114)
- Problem (Screenshot 28.10. 09:11): ＋ bei Aufgaben zeigte erst „privat“ +
  „Mehr Details“, dann ein Formular mit 9 Bausteinen; für Persönliches, das
  nicht Arbeit ist, gab es keinen Platz.
- Drei Räume nach „wer sieht es“: Familie (zu zweit „Wir“) = alle im
  Haushalt, NEU „Ich“ = nur ich (nicht geteilt, abends sichtbar), Arbeit =
  nur ich (nach Feierabend weg). Allein nur „Ich | Arbeit“. Raum `ich` in
  Speicher, Abgleich (`roomOf`, nie als Familie hochladen), Test-Backend,
  Push und Datenbank (Migration `20261101120000_raum_ich.sql`, RLS wie
  Arbeit, beim Verlassen weg). Bestehende Einträge bleiben unverändert.
  Farben: Ich Grün (`--app-ich*`), „Privat“ heißt nirgends mehr so.
  Raum „Ich“ vor dem Ausliefern durch A-021 ersetzt (zwei Räume Familie /
  Geschäftlich, Migration und RLS-Test gelöscht).
- EIN Fenster „Neue Aufgabe“ und EIN Fenster „Neuer Termin“
  (`components/kalender/eintragen/`), für jeden Einstieg (Kacheln, Seiten,
  Kalender, Tag, Beispiel-Tag) und zum Ändern („Bearbeiten“). Das alte
  Formular `EntryForm` (Umschalter, Uhrzeit bei Aufgaben, Bis spätestens,
  Etikett-Chips, „Mehr Details“) ist weg; Etiketten bleiben gespeichert.
- Aufgabe: ein Feld „Was steht an?“, Return = speichern für heute, Feld
  bleibt offen („Steht drin · Rückgängig“); Zeile Familie | Ich | Arbeit
  (Start = letzte Wahl, nach Feierabend Familie) · Glocke (In 1 Std, 16:00,
  18:00, Morgen früh → „Erinnern heute 16:00 ✕“) · „Mehr ›“ (Ab wann,
  Wiederholen, An jemanden geben). „Freitag …“ → „Ab Freitag“.
- Termin: ein Feld, blaue Chips Tag · Uhrzeit · Dauer; ohne Uhrzeit
  „Uhrzeit?“, gespeichert wird erst danach; „Mehr ›“: Ort, Wiederholen,
  ganztägig, Personen; Glocke = Erinnern vorher.
- Listen: „Ich“ grünes, „Arbeit“ blaues Schild (Aufgaben, Kachel, Dein Tag),
  Filter „Alle · Familie · Ich · Arbeit“ nur mit Ich/Arbeit (auch im Kalender).
- Mia: „nur für mich“/„privat“ → Ich, „für alle“/„Familie“ → Familie,
  Arbeit/Büro und gelernte Arbeits-Stichworte (Laden, Café …, aus früheren
  Arbeits-Einträgen) → Arbeit. Prüfstand +7 Sätze mit Raum-Prüfung.

## Termine – Raum Familie / Geschäftlich (v0.151.0, A-021)
- Problem: Beim Anlegen eines Termins zeigte der Chip nur „Privat“ (so hieß
  der gemeinsame Raum allein), bei Aufgaben gab es eine andere Auswahl. Es
  gibt aber nur zwei Räume: „Familie“ (gemeinsam, Lisa sieht alles) und
  „Geschäftlich“ (nur Felix). Gilt vor A-020: der Raum „Ich“ ist wieder raus.
- Termine und Aufgaben: derselbe Schalter „Familie | Geschäftlich“
  (`EintragZeile`, `RAUM_WAHL`, Punkt in Raumfarbe), Start = zuletzt gewählter
  Raum, nach Feierabend Familie; auch allein (dort heißt der Raum jetzt
  „Familie“ statt „Privat“, zu zweit weiter „Wir“). „Arbeit“ heißt in der
  Oberfläche überall „Geschäftlich“ (Schild, Filter, „Geschäftlich · 5 für
  morgen“, Notizen, Kalender-Links, Übernahme-Karte, Tagesablauf, Rechtstexte).
- Kalender: Filter „Alle · Familie · Geschäftlich“ nur mit geschäftlichen
  Terminen; im Tag Strich, Uhrzeit und Schild in Raumfarbe, in Woche/Liste
  Punkt und Uhrzeit. Raum ändern: Termin öffnen → Schalter antippen.
- Mia und Sofort-Weg erkennen den Raum aus dem Inhalt (Tohuus, KARAMBA Eis,
  Lieferant, Personal, Großhandel … → Geschäftlich; Kinder, Arzt, Kita,
  Schule … → Familie; gelernte Arbeits-Stichworte). Nur wenn beides drin ist,
  fragt Mia mit zwei Knöpfen. Prüfstand +6 Termin-Sätze mit Raum, die 7
  Raum-Sätze aus A-020 auf Familie/Geschäftlich umgestellt; Sofort-Prüfstand
  mit Raum-Prüfung.
- Migration: Speicher v4 – Etikett „Privat“ (Wochencheck, lag als Arbeit) wird
  Familie, wenn es nur auf dem Gerät liegt; mit Konto bleibt es beim Besitzer
  (nie ungefragt sichtbar machen). Etikett bleibt gespeichert, wird nie gezeigt.
- Sichtbarkeit mit Tests festgehalten: Felix’ Geschäftliches erreicht Lisa
  weder im Abgleich noch in Push, Neuigkeiten/Pinnwand, Heute, Kalender oder
  Mias Kontext.

## Räume Familie · Ich · Arbeit für Termine und Aufgaben (v0.151.0, A-034)
- Nachtrag zu A-020, gilt vor A-021: „Ich“ ist zurück, „Geschäftlich“ heißt
  wieder „Arbeit“. Drei Räume, für Termine und Aufgaben gleich: Familie (alle
  im Haushalt, Orange; zu zweit „Wir“, allein „Privat“), Ich (nur ich, Grau,
  kleines Schloss), Arbeit (nur ich, Blau, Schild). Allein entfällt „Ich“.
- Vorauswahl: Termine Familie, Aufgaben Ich; Mia rät aus dem Satz
  (`kalender/raum/raten.ts`: Schule/Kinder/Oma/Geburtstag → Familie,
  Meeting/Kunde/Lieferant/Büro → Arbeit, Arzt/Friseur → Ich), der Chip ist
  schon aktiv. Beim allerersten Mal „Hab Familie gewählt. Tippen zum Ändern.“
- EINE Raum-Wahl `ui/RaumChips` statt des Schalters: Schnelleingabe,
  Detail-Fenster (Menü beim Antippen), Bearbeiten, Wochencheck-Karte und als
  Chip „Familie ⌄“ unter Mias Bestätigung (mit und ohne KI). Lange drücken
  auf eine Zeile (Aufgaben-Seite, Kalender) → „Für Familie / Nur ich /
  Arbeit“. Ändern immer mit Rückgängig. Die „letzte Wahl“ (`wasgibts.eintragraum`)
  und der Feierabend-Start sind weg.
- Mia lernt: Korrektur → Stichwort des Titels → Raum
  (`wasgibts.raumgedaechtnis`, nur Gerät, in der Sicherung), geht als
  „Gelernte Räume“ in Mias Kontext, löschbar unter „Was ich mir gemerkt hab“
  (früher „Was ich mir merke“). Raum per Satz ändern auch ohne KI („Mach den
  Zahnarzt nur für mich“, `raumBefehl`); Werkzeuge mit `raum: familie|ich|arbeit`.
- Familien-Aufgaben sehen alle, jeder darf abhaken („erledigt von Lisa“,
  `doneBy`); „An … geben“ bleibt.
- Datenbank: Migration `raeume_ich` (Raum „ich“, Ich/Arbeit nur Besitzer,
  Familien-Aufgaben für alle, Ändern nur wenn danach sichtbar, bestehende
  Aufgaben einmalig „ich“). Dabei behoben (Verdacht aus A-028):
  `entry_visible` suchte `fuer`/`zurueck` oben in `data`, die App lädt sie
  unter `data.data` – abgegebene Aufgaben kamen beim Empfänger nie an
  (`entry_holder`, auch im Test-Backend).
- Speicher v5: bestehende Aufgaben → „Ich“, Etikett „Privat“ → „Ich“,
  Termine bleiben; Abgleich hebt v2–v4 auf v5.
- Prüfstand: 35 Raum-Sätze (Termin und Aufgabe, alle drei Räume) im großen
  Prüfstand; ohne KI 35/35.

## Ergebnis-Karten wie im Clip + Aufleuchten (v0.151.0, A-037, Tafel 126)
- Vorlage: Clip-Bild „Einfach erzählen. Mia sortiert.“ (`docs/tafeln/tafel-126.png`).
- Die Text-Übersicht `MiaDoneCard` (Gruppen mit „·“) ist weg. Nach jedem
  Satz, mit dem Mia etwas anlegt, steht pro Eintrag eine weiße Karte unter
  ihrem kurzen Satz: Symbol in der Kachelfarbe, fett der Inhalt, klein
  „Termin · Familie ⌄“ bzw. „Einkauf · für alle“, rechts die grüne Pille
  („Eingetragen“, „Steht drauf“, „Hängt dran“, „Notiert“). Nacheinander weich
  eingeblendet (0,15 s versetzt). Nie abgeschnitten, die Pille schrumpft
  notfalls aufs Häkchen; mehr als 4 → „und N weitere ⌄“.
- Der Raum-Chip „Familie ⌄“ unter Mias Bestätigung (A-034) wohnt jetzt in der
  Karte (`RaumZeile`, dieselben `ui/RaumChips`); auch die Regeln ohne KI
  zeigen die Karte.
- EIN „Rückgängig“ (10 s) für alle Karten einer Antwort, danach „Mia hat
  schon …“. Karte antippen = Eintrag öffnen.
- Große Dinge aus einfachen neuen Sachen: dieselbe Karte mit orangem
  „Übernehmen“ → grün; Wochenplan, Rezept, Ändern, Löschen bleiben Vorschau.
- Aufleuchten: nach dem Schließen der Bühne bzw. bei der Rückkehr zur
  Startseite leuchtet der neue Eintrag einmal 1,5 s weich orange in seiner
  Kachel (Zeile oder Kachel als Ganzes), Merker nur im Arbeitsspeicher.
- Mias Satz dazu ist bei 1 oder mehr Karten nur „Steht drin.“ (wie im Clip;
  früher „Erledigt.“ bei Mehrerem), auch in `kurzeBestaetigung`, Prompt und
  Prüfstand. Abhaken und Sonstiges behalten „Erledigt.“.
- Neue Tokens `--app-good-pill`/`--app-on-good-pill`, `--app-leuchten`,
  `--app-leuchten-flaeche` (hell und dunkel).
- Testmodus: mehrere Sätze werden einzeln gelesen, wenn das Ganze nicht
  verstanden wird und jeder Satz etwas einträgt; Termin mit Kind aus dem
  Haushalt = Familie. Prüfstand im Testmodus unverändert (Raum- und
  Sofort-Prüfstand weiter ≥ 95 %).

## Pinnwand aufgeräumt (v0.152.0, A-028 Teil 1, Tafel 123)

- Fotos als Polaroid in Zettelgröße (halbe Breite, quadratisch,
  `object-fit: cover`), antippen = groß im Fenster (`FotoFenster`, Text,
  Erledigt, Mehr). Wand so hoch wie der Inhalt (keine Mindesthöhe, leer mit
  ruhigem Innenabstand). Meta-Zeile EINE Zeile: Zeit zuerst im DOM,
  rückwärts umbrechend – passt der Name nicht, bleibt nur die Zeit; die
  letzten sechs Tage als Wochentag („Lisa · Mo“). „Bleibt hängen“ zeigt
  statt „· bleibt hängen“ die kleine Markierung „OBEN“ (Großbuchstaben,
  Zettelfarbe dunkel), der Text hat rechts Platz.
- Entschieden: „OBEN“ nur an „Bleibt hängen“-Zettel (die stehen vorn);
  eigene Zettel heißen weiter „Du“ (Tafel: „Ich“).

## Pinnwand: Größe, Ordnen, „Nur für mich“ (v0.152.0, A-028 Teil 2, Tafel 123)

- Lange drücken hebt den Zettel an (Schatten, 1,06); loslassen = Fenster wie
  Tafel 123 C (Titel = Zettel in „…“, Klein | Groß, Nach oben, Nur für mich
  bzw. Für alle, Erledigt, „Zum Verschieben: halten und ziehen“); halten und
  ziehen = verschieben, die anderen rutschen weich nach (FLIP, 0,8 s, nur
  transform; reduziert ohne Gleiten). Gespeichert wird `sort` nur am
  gezogenen Zettel (zwischen den Nachbarn); ohne `sort` zählt die Zeit – so
  behalten alte Zettel ihre Reihenfolge ohne Umschreiben.
  `wasgibts.pinnwand` v5 (Größe, Platz, privat; alte Zettel klein, nach der
  Zeit, für alle). Im Menü „Größe und Platz“ für VoiceOver/Tastatur.
- Ecke „Nur für mich“: private Zettel unter einer gestrichelten Linie ganz
  unten („Nur für mich · sieht nur du“, grau-weiß, grauer Pin, Schloss in
  der Meta-Zeile); ohne private Zettel und im Haushalt „allein“ keine Linie.
  Einklappbar (Nachtrag 7a): Linie antippen = nur „Nur für mich ⌄“, ohne
  Anzahl; pro Gerät gemerkt (`wasgibts.pinnwandansicht`, nicht in der
  Sicherung), Standard auf. Kachel, Push, Jetzt-Karte, „ungelesen“ ohne
  private Zettel. Supabase: owner-only wie „Arbeit“ (Migration
  `20261101130000_pinnwand_nur_fuer_mich.sql`), Bilder privater Zettel
  bleiben auf dem Gerät; „Nur für mich“ an = neue ID, damit der Zettel auch
  bei den anderen verschwindet. Test-Backend mit denselben Regeln.
- Mia: `pinnwand_schreiben` mit `nur_fuer_mich`, „Mach den Zettel mit dem
  Geschenk für alle sichtbar“ über `app_befehl` (ohne KI: `pinForAllCommand`,
  `pinToShare`), fünf neue Prüfstand-Sätze (mit Prüfung `privat`).
- Entschieden: „Nach oben“ = vor alle anderen, „Bleibt hängen“ bleibt davor.
  Sprachnachrichten haben Größe und Platz, aber kein „Nur für mich“ (sie
  sind für die anderen). Kein „Nur für mich“-Schalter beim Schreiben (nur
  im Fenster und per Mia).
- Auf v0.151 (A-034) aufgesetzt: Die Pinnwand-Migration `20261101130000`
  baut jetzt auf `20261101120000_raeume_ich.sql` auf – „Nur für mich“ kommt
  als erste Regel vor die drei Räume, „ich“ und „arbeit“ bleiben nur für den
  Besitzer (vorher hätte die Pinnwand-Migration `entry_visible` auf den
  Stand vor A-034 zurückgesetzt). Test-Backend (`visible`, `fremdPrivat`)
  genauso; RLS-Test Abschnitt 7 und `nurFuerMichTeilen.test.ts` prüfen auch
  Pinnwand-Einträge in „ich“/„arbeit“. Abhaken bleibt wie seit v0.145 (1 s
  stehen, Kachel zeigt das Häkchen kurz mit). Prüfstand 226 Sätze.
  Tafel 123 in neuer, schärferer Fassung (gleicher Inhalt).
- Abgleich mit Tafel 123 (neue Fassung): Die Meta-Zeile ließ rechts 32 px
  für den Haken-Kreis frei, gebraucht werden 24 – dadurch fiel auf dem
  iPhone 15 Pro „Mathis“ bei „Mathis · 12:08“ und bei privaten Zetteln „Du“
  vor dem Schloss weg. Jetzt `pr-6`, Name und Zeit passen wie auf der Tafel
  (Durchklick `pinnwandOrdnen` prüft es ab 390 px). Durchklick-Helfer
  `halten` rollt den Zettel vorher in die Mitte (vorher drückte er unter Mias
  Hinweis-Blase bzw. außerhalb des Bildschirms).

## Startseite XS · S · M, Standard je Haushalt, Wetter mit Himmel (v0.153.0, Tafel 118–120, A-023)

- Problem (Video 28.10. 11:49): Kacheln waren je Inhalt unterschiedlich hoch,
  Pinnwand S neben Wetter S passte nicht, Wetter in M hatte eine andere Höhe,
  und nach „Fertig“ schrumpfte die Pinnwand-S auf einen Streifen (feste
  `h-[156px]` gegen das Strecken der Zeile, im Bearbeiten Einzug + Knöpfe
  unter der Kachel = andere Flächen).
- Festes Raster (`lib/heute/raster.ts`): 2 Spalten, Grund-Zeile = halbe
  S-Höhe aus der Breite; XS 1 × 1, S 1 × 2 (quadratisch), M 2 × 2; L entfällt
  (alte L → M). Dicht und stabil in der gespeicherten Reihenfolge, zwei XS als
  Paar (übereinander bzw. nebeneinander vor etwas Breitem), Lücken nur ohne
  Partner (im Bearbeiten „＋ Kachel“, statt „freie Hälfte“). Bearbeiten =
  Fertig-Ansicht (Knöpfe in der Kachel). Erlaubte Größen je Kachel wie Tafel
  118; jede Kachel füllt ihre Fläche, Rest als „+n“.
- Standard je Haushalt (Tafel 119) für neue Nutzer und Beispiel-Tag; Timer
  ohne festen Platz (XS oben, solange er läuft); Haushaltswechsel überschreibt
  keine eigene Anordnung. Beispiel-Inhalte wie Tafel 119 („Arbeit“ = blaues
  Schild, „Ich“ = Familie ohne Schild).
- Wetter mit Himmel (Tafel 120): kleine stille Szene je Wetterlage rechts
  oben (ersetzt Muster und Windsack auf der Kachel), kurzer Satz ≤ 22 Zeichen.
- Speicher: Startseite v9 (Migration L → M, nicht erlaubte Größen auf die
  nächste erlaubte, keine Kachel verschwindet).

## Sport-Kachel mit Wasserzeichen (v0.153.0, Tafel 124 A)

- Auftrag A-029, Tafel 124 A nur als Text. Sport-Kachel (S) mit großem,
  stillem Linien-Symbol unten rechts (150 px, Strich 1,3, 30 px angeschnitten,
  hinter dem Inhalt, `aria-hidden`, nicht antippbar): Sportart des nächsten
  Trainings, sonst des letzten, sonst Laufschuh (lucide `SportShoe`). Farbe
  = Kachel-Akzent der gewählten Farbe, Deckkraft als Tokens
  `--app-wasserzeichen` (hell 12,5 %, dunkel 10 %), Schlicht Grau 6 %. Im Haus
  (S) mit Kühlschrank (9 %, dunkel 7 %). XS ohne Wasserzeichen.
- Im Haus: Namen nie abgeschnitten (Symbol 20 px, Name 14 px, Schild 10,5 px
  rechts, nur wenn nötig darunter).
- Sport leer: „Diese Woche ist noch frei. Plus tippen.“ Kachel-Texte ohne
  Gedankenstrich (Spendentopf „<Region> · noch kein Topf“, Tipps „Gerade
  nichts in eurer Nähe. Umkreis ansehen“, Jetzt-Karte „… · lieber
  drinnen?“); Code-Regel `tests/app/kachelTexte.test.ts`.
- Bildvergleich: Szenen Sport/Im Haus in 8 Farben × hell/dunkel ×
  Farbig/Schlicht (`e2e/bilder.mjs`).

## Wasserzeichen für alle Kacheln ohne Bild (v0.153.0, A-036, Tafel 124 A/125)

- Auftrag A-036, Tafel 125 nur als Text. EINE Komponente
  `ui/KachelWasserzeichen` für alle: Termine Calendar, Aufgaben CircleCheck,
  Einkauf ShoppingCart, Sport Sportart des nächsten Trainings, Im Haus
  Refrigerator, Notizen StickyNote, Timer Timer; dazu Tipps MapPin und Post
  (bald) Mail. Ohne: Wetter, Essen, Pinnwand, Spendentopf (eigenes Bild),
  Jetzt-Karte. Zuordnung als `Record` über alle Kachel-IDs plus Test: eine
  neue Kachel ohne Symbol oder Grund scheitert. Eine Wochenplan-Kachel gibt es
  nicht (CalendarDays bleibt für später).
- 150 px, Strich 1,3, unten rechts 30 px angeschnitten, −8° gedreht, Farbe =
  Akzent der gewählten Kachel-Farbe. Deckkraft hell 12,5 % / dunkel 10 %, mit
  freiem Text (`frei`) 9 % / 8 % (`--app-wasserzeichen-frei` ersetzt
  `-haus`). Look „Schlicht“: keine Wasserzeichen (vorher Grau 6 %). XS ohne.
- Kachel `isolate`; Fenster (Termin-Möglichkeiten, Tipp, Einkauf „Mehr
  Details“) stehen neben der `<section>`, damit sie nicht unter späteren
  Kacheln liegen. Leiser Text über dem Zeichen mit `kachel-frei`.
- Bildvergleich: Familie-Beispiel auch in „Schlicht“, alle Wasserzeichen-
  Kacheln in den 8 Farben × Farbig/Schlicht × hell/dunkel (`e2e/bilder.mjs`).

## Sport als Stempelkarte (v0.153.0, A-044, Tafel 132)

- Auftrag A-044 mit Tafel 132 (ersetzt die nie angekommenen Tafeln 129/130
  und den Wochen-Kreis-Teil von Tafel 124). Leitsatz: nur was rein muss,
  diese Woche, das Nächste, ein Knopf; alles andere im „•••“.
- Sport-Seite: Karte „Diese Woche“ mit so vielen Feldern wie das Wochenziel
  (ohne Ziel 3). Training = Stempel (doppelter Ring im Kachel-Akzent, Symbol,
  „MO“, fest gedreht je Training aus der ID), geplant = gestrichelt mit „Do
  8:00“, mehr als Ziel = kleine Bonus-Stempel. Zwei Sätze („Mo war Laufen.“ /
  „Do 8:00 ist geplant.“), geschafft grün („Woche geschafft.“ / „Mehr ist
  Bonus.“), neuer Stempel setzt weich auf (1 s, reduced-motion Überblenden).
  Großer Knopf „Training eintragen“, Link „Planen“, „Letzte Wochen“ (3
  Zeilen, Punkte, „geschafft“; keine Serien, keine Summen). Weg: Kreise Mo–So
  (`SportWeekRow`, `weekDots`), Wochensatz (`statusLine`), Ziel-Chips,
  Packlisten-Block, „Zuletzt“-Liste (Ändern/Löschen jetzt über den Stempel
  bzw. die Woche), Lob-Satz `praiseFor`.
- Menü „•••“: Wochenziel (1×–7×, Ohne Ziel), Packlisten, Meine Sportarten
  (eigene entfernen/dazu), Erinnerung am Vorabend (Schalter, Standard aus;
  19:00, wenn morgen ein Training geplant ist, proaktiv höchstens 1 am Tag,
  Ruhe 20–7, Pause; nur auf dem Gerät).
- Ziel-Frage einmalig beim ersten Training: „Wie oft willst du Sport machen?
  Pro Woche. Dann sag ich dir, wenn die Woche geschafft ist.“ (2× · 3× ·
  Ohne Ziel).
- Kachel XS/S/M (M neu erlaubt): Stempel + das Nächste, M mit Wetter zur
  Trainingszeit, geschafft grün, leer „Diese Woche ist noch frei.“, Plus =
  „Training eintragen“, ganze Kachel = Sport-Seite. Kein Wasserzeichen mehr
  (`OHNE_WASSERZEICHEN.sport = "Stempel sind das Bild"`,
  `lib/sport/wasserzeichen.ts` entfernt). Laufen zeigt den Laufschuh.
- Speicher `wasgibts.sport` v2: Ziel darf leer sein, `zielGefragt`,
  `erinnerung`; v1 behält sein Ziel (sonst 3) und wird nicht gefragt.
- Mia: „War heute Volleyball“ → Stempel, „Volleyball · heute · gestempelt“;
  „Wie läuft’s mit Sport?“ (auch „Wie oft …?“ für die Woche) → „Mo war
  Laufen, Do ist geplant.“ bzw. „Woche geschafft.“. Die Texte liegen als
  Bausteine in `lib/sport/stempel.ts` (eine eigene Ergebnis-Karte aus A-037
  für Stempel gibt es noch nicht). Prüfstand +2 Sätze.
- Neu: Sportart Volleyball. Durchklick `sportStempel`, `sportPlanen`
  (ersetzt `sportKachel`); Bilder Kachel S/M × leer/normal/geschafft ×
  Farbig/Schlicht, Sport-Seite, Menü.

## Raster, Wasserzeichen und Stempel auf dem neuen Stand (v0.153.0)
- Zusammengeführt mit Essen-Kachel final und „nichts abgeschnitten“
  (A-045/A-046), Räumen Familie · Ich · Arbeit mit Aufleuchten (A-020/021/
  034/037) und Pinnwand A-028: Essen-Kachel ohne große Knöpfe in der festen
  Fläche, kein „…“ in XS · S · M (Wetter-Ort und -Satz brechen um, Notizen
  leer „Schnell notieren.“, Im Haus XS Name vor Schild), frei Eingegebenes
  mit `data-freitext`; Beispiel-Tag zu zweit „Mama anrufen“ im Raum Ich.
- iPhone SE 1 (320 px): Grund-Zeile mindestens 80 px (S 168 hoch), Einkauf
  ohne Symbole unter 320 px Board-Breite.
- Wetter S: Temperatur nur so breit wie die Zahl (nie unter der Szene), M
  4 px enger (passt auf dem SE ohne Überquellen).
- Tafel 125 als Bild abgelegt und abgeglichen (ein Symbol je Kachel unten
  rechts angeschnitten, hinter weißen Kärtchen, nicht bei Wetter/Essen/
  Pinnwand, Schlicht ganz aus; Sport mit Stempeln statt Zeichen).
- Durchklick an das Raster angepasst (Pinnwand S neben Wetter XS über
  Notizen XS, Wasserzeichen zählen beim Überquellen nicht, Größen-Knopf im
  Wackeln getippt, `nichtsAbgeschnitten` auf XS · S · M).

## Einkaufsliste nur mit Namen + Abhaken und Merken (v0.154.0, A-040/A-041, Tafel 127/128)
- Vorlagen: `docs/tafeln/tafel-127.png` (A-040, Auftragstext nicht angekommen,
  umgesetzt nach Tafel und Bildunterschriften) und `tafel-128.png` (A-041),
  Wortlaut `docs/auftraege/A-040-041-einkauf-namen.md`.
- **Nur Namen:** die Liste zeigt Symbol und Name; eine Menge nur, wenn man sie
  selbst gesagt hat („2 Liter“). Rezeptmengen sind nie mehr eine Menge auf der
  Liste (auch nicht die Packungen aus A-018): Zutaten aus dem Plan haben
  `amount: ""`, die übliche Packung steht nur als Vorschlag im Mengenfeld
  („z. B. 1 Packung“, `packung`), die Rezeptmenge als Hinweis im Fenster.
  Rezept-Link und Kochidee legen nur den Namen an (`alsEinkauf`). Teilen per
  Text ebenso nur Namen.
- **Wochenplan als Angebot:** oben auf der Laden-Seite „Für deinen
  Wochenplan“ („Lasagne · Fr · Curry · Sa“, einklappbar), Zutaten als Chips –
  einzeln oder „Alle dazu“ („Steht drauf.“); Grundsachen (Salz …) blass, nie
  bei „Alle dazu“. Übernommen steht die Zutat ganz normal da (eigener Eintrag
  mit `dish`, `day`, `rezeptMenge`). Ohne eigene Läden steht die Karte auf der
  Übersicht; „Aussuchen · Für eure Woche“ nimmt das Angebot vom Öffnen.
- **„Nehmen“ bietet die Zutaten an** (A-046 → A-040): „Nehmen“ in der
  Rezept-Vorschau der Essen-Kachel trägt ein (`takeDish`) und fragt danach
  einmal klein „Auf die Liste: Eier, Limette +2?“ mit „Alle dazu“ (Grundsachen
  nie, nur was die Vorschau „auf die Liste“ nannte; `einkauf/angebot/nachNehmen`).
  Ohne Antippen bleiben die Zutaten im Wochenplan-Angebot der Laden-Seite.
  Kennt die Liste das Rezept nicht (eingebautes Rezept) oder kocht man
  spontan, gilt, was die Vorschau „auf die Liste“ nannte. Nichts anzubieten
  (alles im Haus, steht schon drauf) = still.
  Die Meldung kann dafür statt „Rückgängig“ einen Angebots-Knopf tragen
  (`showToast({ action })`). Der Beispiel-Tag bietet nichts an.
- **Zeile antippen** = ein Fenster (`ui/Sheet`): Name, darunter erst hier
  „für Gemüselasagne · Fr“ und die Rezeptmenge, dann Menge, Laden („● Rewe
  ⌄“, ändern = gemerkt) und „Von der Liste nehmen“. Lange drücken bleibt „Wo
  kaufst du das?“. Die Laden-Seite trägt statt der großen Karte den Titel mit
  Strich in Ladenfarbe, darunter immer „Abhaken, was im Wagen liegt.“.
- **Abhaken wie bei Aufgaben** (ein Ablauf `useAbhaken`/`abhakenAblauf`): 1 s
  stehen (nochmal tippen = zurück, auch das Gemerkte), 0,8 s weich weg in „Im
  Wagen ⌄“ (vorher „Schon im Wagen“; zugeklappt, ohne Zahl, jetzt direkt unter
  der Liste). Übersicht und Kachel haben keine Haken – dort zählt Abgehaktes
  sofort nicht mehr mit.
- **Mia merkt sich den Laden** (`einkauf/merken`): jedes Abhaken auf einer
  Laden-Seite → `learned[sache] = { shop, n, am }` (gefunden über die
  Normalform). Neue Sachen ohne Laden (Mia, Plus, Angebot) landen im gelernten
  Laden (`ladenHerkunft`: Regel → gewählt → gelernt → ähnlicher Name). Das
  frühere „zweimal hintereinander, dann einmal fragen“ ist damit abgelöst.
  90-Tage-Regel: nur einmal und vor über 90 Tagen gekauft = verblasst still.
  „Oft bei Rewe“ auf der Laden-Seite: am häufigsten dort abgehakt, nicht was
  draufsteht, höchstens 8, Gleichstand neueste zuerst; einmal klein „Merk ich
  mir, wenn du bei Rewe abhakst.“ (bis zum ersten Abhaken).
- **Ergebnis-Karte:** „Tomaten · ● Rewe · wie immer ⌄“ – antippen = andere
  Läden als Chips, die Korrektur gilt sofort und wird gemerkt
  (`ladenKorrigieren`). Beim ersten Mal einmal „Hab Rewe genommen, wie letztes
  Mal.“.
- **Einstellungen → Mia → „Was ich mir gemerkt hab“:** eigene Gruppe „Wo du
  was kaufst“ mit „Tomaten → Rewe“ und Löschen (feste Regeln bleiben unter
  „Läden“).
- **Stellt sich beim ersten Mal vor** (Ergänzung): Seiten-Tipp auf der
  Einkaufsliste (drei Zeilen, neuer Schlüssel `seite:einkaufsliste`, damit auch
  Bisherige ihn einmal sehen) und einmal auf der Laden-Seite überhaupt
  („Abhaken, was im Wagen liegt. Ich merk mir das für Rewe.“). Neu in
  Einstellungen → Mia: „Tipps nochmal zeigen“ (Seiten-Tipps, Hinweise der
  Startseite, Einkauf-Tipps; Fragen wie das Mikrofon bleiben beantwortet).
- **Speicher v8** (`wasgibts.einkaufsliste`, Abgleich `einkauf` v8): Gelerntes
  mit Datum (alt: Datum der Umstellung), `angebotAb` (diese und die nächste
  Planungswoche rechnen wie bisher, damit nichts von der Liste verschwindet;
  neu angelegt = immer Angebot), unsere gerundeten Packungsmengen an
  Rezept-Zutaten fallen weg (selbst geänderte bleiben). Datenkarte und
  Datenschutzerklärung ergänzt (gelernte Läden, nur Gerät/Haushalt).
- Tests: `tests/einkauf/merken.test.ts` (Abhaken 1 s/zurück/Im Wagen, Tomaten
  2× bei Rewe → „wie immer“, Korrektur, 90 Tage, „Oft bei“, Löschen, „Alle
  dazu“, Migration, Tipps je Stelle einmal und zurückholen); Durchklick
  `wochenplanAngebot`, `ladenMerken`, `einkaufTipps`
  (`e2e/ablaeufe/einkaufnamen.mjs`), „Im Wagen“ in `imWagen`, `einsortieren`,
  `einkauf`.

## Prüfen-Fehler im Raster (v0.155.0)
- `npm run pruefen` war seit dem festen Raster (v0.153) rot. Ursachen und
  Abhilfe:
- **„Kachel quillt über“ bei Termine, Aufgaben, Einkauf:** gemessen wurde das
  Wasserzeichen (A-036) mit – es ragt absichtlich 30 px gedreht über den Rand
  und zählt in `scrollHeight`. `pruefen` blendet es beim Messen aus wie der
  Durchklick `raster` (Prüfung korrigiert, nicht abgeschwächt).
- **Dafür neu gemessen: die Bild-Fläche der Essen-Kachel** (`[data-essen-
  antippen]`, schneidet selbst ab und fiel deshalb nie auf). Sie quoll
  wirklich über (zweizeiliger Name + „25 Min“ + „auf die Liste: Gyrosfleisch“,
  auch „Pasta mit Tomaten & Burrata“ im Beispiel-Tag). Jetzt zeigt sie nur so
  viele Unterzeilen, wie sicher in die kleinste Fläche passen
  (`passendeUnterzeilen`, gerechnet für das SE 1 und 375er-Geräte, auf dem
  SE 1 per `@max-[320px]` ggf. eine weniger; lieber Vorrat als Zeit).
- **„Kleine Tippfläche ‚WLAN‘“:** die EINE Zeile in Notizen-XS (und Im Haus
  XS) war 19 px hoch; jetzt 30 px wie jede ganz tippbare Listenzeile.
- **iPhone SE 1 (320 px):** `pruefen` kannte die Mindest-Zeile (80 px,
  `grundZeile`) nicht und meldete jede Kachel „nicht im Raster“ – jetzt wie
  im Durchklick. Echt waren: Einkauf-Kopf „+2“ rutschte unter den Plus
  (Symbol ganz schmal aus, „+N“ mit `ml-auto`), Wetter-XS „Morgen · Do“
  quoll abends über (Satz unter der Szene in voller Breite, ganz schmal ohne
  Satz).
- Tests: `essenKachel.test.ts` (Unterzeilen je Breite); Durchklick
  `rasterHoehen` (Zeilen ≥ 30 px, kein Knopf unter einem anderen, Essen-Fläche),
  `standardJeHaushalt` (Beispiel-Tag auch auf 320 px), neu `wetterMorgenXS`.
