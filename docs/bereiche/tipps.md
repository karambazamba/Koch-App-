# „Was los?“ (früher „Tipps aus der Region“)

## Feste Regeln (aus CLAUDE.md umgezogen)

- **„Was los?“ (A-055):** Veranstaltungen aus dem öffentlichen Kalender des
  Kreises Ostholstein. Sind KEINE Termine, bis jemand „In den Kalender“
  tippt (dann ein normaler Familientermin mit Link zur Quelle). Kein GPS:
  Wohnort = eigener Ort oder Wetter-Ort. Quelle immer sichtbar, „ohne
  Gewähr“. Nur Server holt (nie pro Person, keine Nutzerdaten an den Kreis).
  Übernommen werden nur ID, Titel, Datum, Uhrzeit, Ort (Text), Link,
  Kategorien – keine Beschreibungen, keine Bilder. Beispieldaten nur im
  Testbetrieb, nie in Produktion. Not-Schalter `REGION_TIPPS_QUELLE=aus`.
- **Name KARAMBA:** immer „KARAMBA Eis“, nie nur „KARAMBA“ (Verwechslung
  mit einem Online-Casino) – in allen Texten (Tipps „von KARAMBA Eis“,
  Spendentopf, Mails, „Über Mia“, Hallo-Bildschirm „Gemacht in Eutin von
  KARAMBA Eis“). Test in `tests/app/regeln.test.ts`.
- Die alte lila Tipps-Ebene (Kachel „Tipps“, `/tipps`, Kalender-Ebene,
  Jetzt-Tipp, `tipps_suchen`, Gemerkt, KARAMBA-Aktionen, nur offene
  Lizenzen) ist versteckt, nicht gelöscht (`tipps/alt.ts` `ALTE_TIPPS`).

Kurz: Ein Fenster „Was ist los in <Wohnort>?“ mit Heute · Wochenende ·
2 Wochen (Tafel 142), Kalender-Knopf trägt sofort ein, Detail mit „In den
Kalender“, „An die Pinnwand“ und Originallink. Mia antwortet auf „Was ist
los?“ aus denselben Daten. Der Mini-Kreis „Was los?“ oben auf der Startseite
(A-050, Tafel 143, `components/heute/kreise/KreisReihe.tsx`) steht nur da,
wenn `useWasLosSichtbar()` true ist, und öffnet `WasLosFenster`.

## Stand des Parsers (WICHTIG)

- Parser fertig (v0.169.0), gebaut an echten Seiten vom 29.10.2026 in
  `tests/fixtures/kreis-oh/` (Liste `liste-0/25`, Gemeinde Eutin erste und
  letzte Seite, Detailseite, robots.txt). `PARSER_BEREIT = true`.
- Die Liste nennt keinen Ort. Deshalb fragt `holeKreisOh` je Gemeinde ab
  (Suchformular `ort=247.<n>`, Liste der Gemeinden aus `<select name="ort">`
  der ersten Seite) mit Zeitraum `dat_tv`/`dat_tb` (heute bis +14 Tage): die
  Gemeinde ist dann der Ort, ohne jede Detailseite zu holen. Probelauf
  29.10.: 35 Anfragen, 45 s, 203 Veranstaltungen (= alle des Kreises im
  Zeitraum). „Kreis Ostholstein“ = kreisweit (Ort „Ostholstein“, Gemeinde
  leer → erst ab 30 km). Detailseite nur, wenn das Datum in der Liste
  unlesbar ist (höchstens 10). Höchstens 70 Seiten bzw. 95 s je Lauf.
- Die Seiten sind ISO-8859-15 kodiert: `kreisHolen` liest Bytes und
  dekodiert nach Kopfzeile bzw. `<meta charset>` (`dekodiere`).
- Erster Lauf: Steht der Status noch auf „wartet“ (oder fehlt), holt
  `/api/region` den Abruf einmal nach der Antwort nach (`after`,
  `ersterLauf`, Status zuerst „laeuft“) – der Kreis erscheint also nach der
  Auslieferung beim ersten Öffnen der App, nicht erst um 5 Uhr. Bis dahin
  nur 60 s zwischengespeichert.
- Außerdem: ID aus `FID=3906.<id>.1`
  (`idAusLink`), Blättern über `ofs_1` (25 je Seite, Schluss ohne nächste Seite), robots.txt (`kreisOh/robots.ts`), 1 Anfrage pro
  Sekunde bzw. Crawl-delay, User-Agent „Mia-App (mia.karamba-eis.de)“,
  Datum/Uhrzeit
  (`region/zeit.ts`), Ort (`region/orte.ts`), Kategorie
  (`region/kategorien.ts`).
- Geklärt an echten Seiten: Ort-Filter nutzbar (`ort=247.<n>`, in
  `listenUrl`), „weiter“ = Link nach `pn_active`, die Liste hat Uhrzeit,
  aber keinen Ort.
- Ändert der Kreis sein HTML: neue Seiten nach `tests/fixtures/kreis-oh/`,
  Parser anpassen. Bis dahin liefert der Lauf 0 Treffer → alte Daten
  bleiben, „Für Entwickler“ meldet „Quelle liefert nichts“.

## Wo im Code

- Rein: `src/lib/region/model.ts` (`RegionEvent`, `sanitizeEvent`,
  `nachTagen`, `reiterZeitraum`, `wochenendeVon`, `imUmkreis`,
  `hatEintraege14Tage`, `wasLosSichtbar`, `wochenendTipps`, `pinnwandZettel`,
  `terminDaten`, `quellenHinweis`), `orte.ts` (Orte, `erkenneOrt`,
  `inOstholstein`, `orteImUmkreis`), `kategorien.ts`, `zeit.ts`, `frage.ts`
  (`wasLosFrage`, `wasLosTreffer`), `sperrliste.ts`, `demo.ts`
  (Beispieldaten, nur Testbetrieb). Sortierregeln `WAS_LOS`, `WAS_LOS_TIPPS`
  in `core/sort.ts`.
- Kreis: `src/lib/region/kreisOh/` – `parser.ts` (`parseListe`, `parseDetail`, `parseGemeinden`, `dekodiere`), `abruf.ts`
  (`holeKreisOh`, `zuEvent`, `listenUrl`, `kreisHolen`), `robots.ts`.
- Server: `src/lib/region/server.ts` (`regionQuelle`, `supabaseSpeicher`,
  `aktualisiereRegion`, `ladeRegion`, `ersterLauf`). Routen `src/app/api/region/route.ts`
  (öffentlich, `Cache-Control: public, max-age=3600`) und
  `src/app/api/region/aktualisieren/route.ts` (Cron, `CRON_SECRET`).
- App: `src/lib/region/client.ts` (`useWasLosDaten`, `useWasLosListe`,
  `useWasLosAn`, `setWasLos`, `useWasLosSichtbar`, `inDenKalender`,
  `anDiePinnwand`, `wasLosFreischalten`, `wasLosKontext`).
- Oberfläche: `src/components/region/` – `WasLosFenster`, `WasLosDetail`,
  `WasLosTeile` (Zeile, Fahne, Ergebnis-Karte, Quelle), `WasLosKarten`
  (Chat), `WasLosEinstellungen` (`/profil/regiontipps`), `WasLosStatus`
  („Für Entwickler“).
- Mia: `src/lib/begleitung/wasLosTools.ts` (`was_los`), Prüfstand
  `begleitung/pruefstand/wasLos.ts` (10 Sätze).
- Datenbank: `supabase/migrations/20261110120000_region_events.sql`
  (`region_events`, `region_status`), Test Abschnitt 8 in
  `tests/datenbank/sicherheit.test.sql`.

## Daten und Speicher

| Wo | Schlüssel/Tabelle | Inhalt |
|---|---|---|
| Server | `region_events` | id (`kreisoh-<FID>`), titel, datum, bis_datum, letzter_tag, beginn, ende, ganztags, ort, gemeinde, link, kategorien, aktualisiert |
| Server | `region_status` | eine Zeile: lauf, treffer, grund (ok/leer/fehler/robots/wartet/laeuft) |
| Gerät | `wasgibts.regiontipps` v2 | neu: `umkreis` (5/15/30, Standard 15; aus v1: ≤5 → 5, ≤20 → 15, sonst 30), `kategorienAus`; `ort` = Wohnort; `uebernommen` = Veranstaltung → Termin; alte Felder bleiben |
| Gerät | `wasgibts.funktionen` v8 | neu: `aus` = selbst ausgeschaltete Bausteine (damit „Was los?“ in Ostholstein aus bleibt) |

RLS: anon und authenticated nur SELECT, schreiben nur service role (geheimer
Schlüssel nur in der Cron-Route). Die Tabelle hat keinen Personenbezug.

## So verhält es sich

- Baustein `regiontipps` heißt „Was los?“, nicht mehr in `LAUNCH_AUS`.
  Standard an, wenn der Wohnort in Ostholstein liegt (`inOstholstein`:
  Ortsname, Ortsteil oder PLZ), sonst aus. Selbst ausgeschaltet bleibt aus.
  „Mehr Funktionen“ zeigt ihn nur mit laufender Quelle.
- Cron täglich 5:00 Berlin (`vercel.json`: 3:00 und 4:00 UTC, die Route läuft
  nur, wenn es in Berlin 5 Uhr ist; `?jetzt=1` sofort). Zeitraum heute bis
  +14 Tage. Schreibt, löscht Abgelaufenes (`letzter_tag` vor heute) und
  Gesperrtes (`sperrliste.ts` + `REGION_TIPPS_SPERRE`). 0 Treffer oder
  Fehler: nichts überschreiben, Status sagt es.
- Schalter `REGION_TIPPS_QUELLE`: `aus` = kein Abruf, `/api/region` liefert
  `{ quelle: "aus" }`, nirgends etwas zu sehen; `demo` (oder
  `TIPS_SOURCE=demo`) = Beispieldaten, nur wenn `VERCEL_ENV` nicht
  `production` ist; sonst Kreis.
- Umkreis: feste Liste für Eutin (5 km: Eutin, Malente; 15 km: Eutin,
  Bad Malente-Gremsmühlen, Süsel, Scharbeutz, Ahrensbök, Schönwalde,
  Kasseedorf, Stockelsdorf), andere Wohnorte nach Luftlinie. Einträge ohne
  erkannte Gemeinde erst bei 30 km.
- Fenster (Tafel 142/2–3): Kopf mit blauer Fahne, „Was ist los in Eutin?“,
  „Veranstaltungen · bis 15 km“, ✕. Reiter Heute · Wochenende (Fr ab 15 Uhr
  bis So) · 2 Wochen. Filter-Chips nur bei Wochenende/2 Wochen: Alles · Für
  Kinder · Kultur · Draußen · Märkte (Familie: „Für Kinder“ zuerst, sonst
  hinten; ausgeschaltete Kategorien fehlen). Liste nach Tagen
  („HEUTE · MI 21. OKT“), jeder Eintrag einmal; links Uhrzeit bzw.
  „ganztags“, Titel ganz (nie „…“), Ort, „bis …“ bei Mehrtägigem, Schild
  „für Kinder“, rechts Kalender-Knopf → sofort Familientermin, Ergebnis-Karte
  „Eingetragen“ mit Rückgängig (10 s), danach Häkchen. Heute schon Vorbeies
  fällt still weg. Leer: „Heute ist nichts eingetragen. Schau mal aufs
  Wochenende.“ Unten „Quelle: Kreis Ostholstein · kreis-oh.de ›“.
- Detail (Tafel 142/4): „SA 24. OKT · 17:00“, Titel groß, Ort, „In den
  Kalender“ (orange), „An die Pinnwand“ (Zettel „Sa 17:00
  Nachtwächter-Rundgang · Wer kommt mit?“, Vorschau „Auf der Pinnwand sieht
  die Familie:“), „Mehr beim Kreis Ostholstein ›“, „Angaben vom Kreis
  Ostholstein, ohne Gewähr“.
- Einstellungen → „Was los?“ (`/profil/regiontipps`, Zeile nur wenn an):
  an/aus, Wohnort, Umkreis 5/15/30, Kategorien, „Anzeigen“ (Test-Einstieg bis
  zum Mini-Kreis).
- Jetzt-Karte freitags (A-054 „Wochenende planen?“, 12–20 Uhr):
  `wochenendTipps(events, haushalt, heute, jetzt)` → höchstens 2 Treffer
  `{ event, tag }` (Familie: für Kinder zuerst, dann draußen/Markt, früher vor
  später). `useJetztTopics` gibt sie als `wochenende.tipps` in
  `wochenendChips` (`heute/wochenende.ts`): nach dem Wetter-Chip „Sa
  Herbstmarkt am Schloss“, zusammen höchstens 3 Chips; antippen fragt Mia
  („Was ist am Samstag los? …“), sie antwortet mit der Karte und „In den
  Kalender“. Nur mit Baustein und Quelle.

## Mini-Kreis (A-050)

- `KreisReihe` nutzt `useWasLosSichtbar()` (Quelle an + Baustein an – seit
  A-063 immer, auch ohne Einträge) und öffnet `WasLosFenster` (nachgeladen).
  Ist in 14 Tagen im Umkreis nichts, sagt das Fenster „Gerade nichts in
  deiner Nähe.“ statt den Kreis still zu verstecken.
- `KreiseBearbeiten` zeigt „Was los?“, sobald die Quelle an ist; einschalten
  schaltet den Baustein mit ein (`setWasLos`).
- Unter dem Kreis nur „Was los?“ – keine Zahl, kein Tipp, keine Uhrzeit.
- Rein (ohne Hook): `wasLosSichtbar({ quelle, baustein })`,
  `hatEintraege14Tage(events, heute)`. Das frühere `wasLosVerfuegbar()`
  (immer false) ist weg.

## Begleitung (Mia)

- Mit KI: Werkzeug `was_los` (nur wenn `REGION_TIPPS_QUELLE ≠ aus`). Die
  Engine lädt die Veranstaltungen vorab, wenn `wasLosFrage` passt oder lose
  Wörter („los“, „Veranstaltung“, „Markt“ …) vorkommen. Antwort nur aus den
  Treffern (höchstens 3), als Karten mit „In den Kalender“, Quelle genannt.
  Kontext `wasLos` (Wohnort, Umkreis, Kategorien). Nutzt Mia es bei
  ausgeschaltetem Baustein, schaltet `wasLosFreischalten` ihn an und sie
  sagt, wo es steht.
- Ohne KI: dieselbe Erkennung als Regel in `localRules.ts`.
- Prüfstand: 10 Sätze („Was ist los?“, „Was ist heute in Eutin los?“, „Was
  können wir am Wochenende mit den Kindern machen?“ …), geprüft mit den
  Beispieldaten; Testmodell 100 %.

## Tests

- `tests/region/text.test.ts` – Ort, Kategorie, Zeitformate („bis“,
  ganztags, „10:00 – 12:00 Uhr“, „ganztägig“).
- `tests/region/model.test.ts` – Reiter, Wochenende, Umkreis, Sichtbarkeit,
  Wochenend-Tipps, Zettel, Termin, Hinweis.
- `tests/region/kreisOh.test.ts` – Parser an echten Seiten (Umlaute,
  25 Einträge, mehrtägig, letzte Seite, Gemeinden, Detail), ID, Adresse,
  Abruf je Gemeinde, Zeitgrenze, robots.txt, Höflichkeit, Fehler.
- `tests/region/server.test.ts` – Schalter, Lauf (schreibt/löscht, 0 Treffer
  → alte Daten bleiben), Liste 1 Std., Routen, vercel.json.
- `tests/region/client.test.ts` – Baustein, Einstellungen v2, Laden,
  Kalender, Pinnwand.
- `tests/region/mia.test.ts` – Fragen, Treffer, Prüfstand im Testmodus.
- Durchklick `wasLos` (`e2e/ablaeufe/waslos.mjs`).

## Alte Tipps-Ebene (versteckt seit A-055)

Was nicht mehr passt, ist versteckt, nicht gelöscht: `ALTE_TIPPS = false`
(`tipps/alt.ts`) schaltet `tipsMode()` (Server) und die Quelle in der App auf
„off“. Damit sind Kachel „Tipps“, `/tipps` (zeigt „gibt es hier noch
nicht“), Kalender-Ebene, Jetzt-Tipp, `tipps_suchen`, „Gemerkt“ und die
KARAMBA-Kennzeichnung unsichtbar. Gespeicherte Merker und übernommene
Termine bleiben; der Link im Termin („Mehr dazu“) bleibt und wird von
„Was los?“ genauso gesetzt. Spendentopf: keine Kopplung mehr nötig – „Was
los?“ nutzt nur die Ostholstein-PLZ aus `spendentopf/regions.ts` zur
Erkennung des Wohnorts. Die alten Einstellungen „Tipps aus der Region“ sind
in „Was los?“ aufgegangen (Ort = Wohnort, km → Umkreis). Alte Tests schalten
die Ebene per `vi.mock("@/lib/tipps/alt")` ein.

### Frühere Beschreibung

Kurz: Veranstaltungen in der Nähe (Märkte, Kinderkino, Konzerte …) als eigene
lila Ebene – Kachel, Seite `/tipps`, Kalender, Jetzt-Karte und Antworten der
Begleitung (Standard Mia). Ein Tipp wird erst durch Antippen zum Termin.

### FESTE REGELN

- Tipps sind KEINE Termine. Erst „In unseren Kalender“ bzw. „Übernehmen“ legt
  einen normalen Familientermin an (`takeTip`).
- Eigene Farbe: Lila (`tipp`, `tipp-soft`); KARAMBA in Pink (`karamba`).
- Kein GPS: Ort = Wetter-Ort oder eigener Ort aus den Einstellungen.
  Entfernung aus Koordinaten (`distanceKm`).
- Keine Werbung: KARAMBA-Aktionen sichtbar „von KARAMBA“, nie bevorzugt
  (nur bei gleicher Beginn-Zeit zuerst), höchstens eine pro Woche in der
  Kachel, nie von der Jetzt-Karte vorgeschlagen.
- Nur offene Lizenzen: CC0, CC BY, CC BY-SA, Public Domain (`openLicense`).
  Lizenz und bei CC BY/BY-SA der Urheber im Detail. Bilder nur mit offener
  Bild-Lizenz, sonst Linien-Icon der Kategorie.
- Beispieldaten nur bei `TIPS_SOURCE=demo` und überall als „Beispiel“
  erkennbar.
- Keine Zähler, keine roten Markierungen.

### Wo im Code

- Modell (rein): `src/lib/tipps/model.ts` (`Tip`, `TipView`, `nearTips`,
  `sortTips`, `rangeFor`, `tileTitle`, `tileTips`, `jetztTip`, `weekendKey`,
  `rememberedTips`, `groupByDay`, `matchesFilters`, `pinboardText`,
  `answerTips`); Sortierregel `TIPS` in `src/lib/core/sort.ts`.
- Kategorien und Filter: `src/lib/tipps/categories.ts` (`TIP_CHIPS`,
  `CATEGORY_MAP`, `filtersOf`, `tipTags`, `tipIcon`).
- KARAMBA-Veranstalter: `src/lib/tipps/karamba.ts` (`KARAMBA_VERANSTALTER`).
- Server: `src/lib/tipps/server.ts` (`tipsMode`, `tipsNear`, `refreshTips`),
  Quellen `src/lib/tipps/sources/` (`types.ts` `TipSource`, `demo.ts`
  `DemoTipSource`, `tldb.ts` `TldbTipSource`).
- Routen: `src/app/api/tipps/route.ts`,
  `src/app/api/tipps/aktualisieren/route.ts`; Cron in `vercel.json`.
- App: `src/lib/tipps/client.ts` (`useTipsMode`, `useTipsOn`,
  `useTipsWindow`, `loadTipsWindow`, `takeTip`, `pinTip`, `toggleRemember`,
  `hideJetztTipWeekend`, `unlockTips`, `tipContext`).
- Fragen erkennen: `src/lib/tipps/question.ts` (`tipQuestion`).
- Oberfläche: `src/components/tipps/` – `TipsTile`, `TipsView`, `TipSheet`,
  `CalendarTips`, `TipCards`, `TipSettingsView`, `TipBits`.
- Begleitung: `src/lib/begleitung/tipTools.ts` (`tipps_suchen`).

### Daten und Speicher

| Schlüssel | Version | Inhalt | Sicherung |
|---|---|---|---|
| `wasgibts.regiontipps` | v1 | Einstellungen und Merker | ja |

- Felder: `ort` (eigener Ort, sonst null = Wetter-Ort), `km` (5/10/20/40,
  Standard 20), `kalender` (lila Ebene an, Standard an), `gemerkt` (bis 100
  IDs), `uebernommen` (Tipp-ID → Termin-ID), `jetztAus` (Samstag des
  Wochenendes ohne Jetzt-Tipp). Migration `migrateTipSettings`.
- Die Tipps selbst liegen nicht im Gerät: nur im Server-Speicher und im
  Arbeitsspeicher der App. `Tip` hat die Spalten der späteren
  Supabase-Tabelle `tips`.

### So verhält es sich

Schalter `TIPS_SOURCE` (Vercel):
- `off` (Standard): `/api/tipps` liefert nur `{ source: "off" }`. Nirgends
  etwas von Tipps – nicht in Mehr Funktionen, Kachel-Auswahl, Kalender,
  Jetzt-Karte oder bei der Begleitung.
- `demo`: `DemoTipSource` – 17 Beispiel-Veranstaltungen um Eutin, Malente,
  Plön, Bad Segeberg, Scharbeutz, Neustadt, Timmendorfer Strand, Lübeck,
  darunter eine Aktion von „KARAMBA Eis“. `?heute=` wirkt nur hier.
- `tldb`: `TldbTipSource` (Landesdatenbank SH) ist ein Gerüst und liefert
  noch nichts. Zugang über `TIPS_API_URL`/`TIPS_API_KEY`, nie im Code oder
  Client.

Server:
- `/api/tipps?ort&km&von&bis&heute` → `{ source, ort, tips }`. `km` 5–40,
  höchstens 21 Tage auf einmal. `?nurquelle=1` = nur der Schalter.
- Orte aus einer festen Liste, sonst Geocoding des Wetters.
- Zwischenspeicher 6 Stunden. Limit pro IP (`allowRequest`, Faktor 3), nicht
  im Demo-Betrieb. Antwort `Cache-Control: private, max-age=300`.
- `/api/tipps/aktualisieren`: nur mit `Authorization: Bearer <CRON_SECRET>`.
  Leert den Speicher und lädt die nächsten 21 Tage. Vercel Cron
  `0 4 * * *` (UTC). Später schreibt er nach Supabase.

Sichtbar nur mit Quelle UND Baustein „Tipps aus der Region“ (`regiontipps`,
`TIPS_BAUSTEIN`, nicht in `BAUSTEINE`; `useTipsOn`). Die App fragt die Quelle
einmal je Seitenaufruf und lädt EIN Fenster heute + 20 Tage (`useTipsWindow`)
für Kachel, Seite, Kalender und Jetzt-Karte.

Kachel `tipps` (M/L, Standard M, braucht den Baustein): Mo–Do „Tipps diese
Woche“, sonst „Tipps fürs Wochenende“; M zwei, L vier Karten (`tileTips`);
rechts oben „Alle“; im Demo-Betrieb „· Beispiel“.

Seite `/tipps` (`TipsView`):
- Ort-Chip „Eutin + 20 km · Ändern“ (→ `/profil/regiontipps`).
- „Gemerkt“ oben (nur ab heute, nach Zeit; Vergangenes fällt still weg).
- Heute | Wochenende | Diese Woche (Standard Wochenende, `?zeit=`).
- Filter-Chips: Für Kinder, Bei Regen, Draußen, Kostenlos, Musik.
- Nach Tag gruppiert. Leer: „Gerade nichts in eurer Nähe. Größeren Umkreis
  wählen?“. Unten die Quelle. `?tipp=<id>` öffnet das Detail.

Detail (`TipSheet`): Icon/Bild, Titel, Zeit, Etiketten, Ort mit Entfernung,
Eintritt, Kurztext, „Wer kommt mit?“, „In unseren Kalender“ (danach „Steht im
Kalender“), „Pinnwand“ (`pinboardText`: „Wollen wir Sa 15 Uhr zu „…“?“),
„Merken“; unten Quelle, Lizenz, Urheber.

Übernehmen (`takeTip`): Familientermin mit Titel, Tag, Beginn (ganztags
10:00), Ende, Ort (Adresse + Ort), Erinnerung 60 Min, `note` „aus Tipps“,
`link` zur Quelle; Rückgängig möglich. Im Termin-Formular steht „Mehr dazu ·
<Seite>“; Bearbeiten behält Link und Notiz (`terminExtras`).

Kalender (`CalendarTips`): Chip „Tipps“ neben dem Monat (an/aus = `kalender`),
lila Ring-Punkt an Tagen mit Tipps, in der Tagesliste gestrichelter lila
Streifen + „Übernehmen“ (höchstens 3, dann „+ weitere Tipps“). Übernommene
Tipps mit bestehendem Termin erscheinen nicht mehr als Tipp (`takenIds`).

Jetzt-Karte: Thema `region` Fr ab 12 Uhr bis So 12 Uhr (`jetztTip`): bei Regen
drinnen, bei trockenem Wetter draußen, mit Kindern „Für Kinder“ zuerst, nahe
vor fern. ✕ = an diesem Wochenende nicht mehr (`jetztAus`). Nicht nachts.

Einstellungen → Startseite → „Tipps aus der Region“ (`TipSettingsView`): Ort,
Umkreis, „Tipps im Kalender zeigen“.

### Begleitung (Mia)

- Mit KI: `tipps_suchen` (nur wenn `tipsMode() !== "off"`). Die Tipps holt
  `engine.ts` vorab, wenn `tipQuestion` passt. Antwort nur aus den Treffern
  (`answerTips`, höchstens 3), als Karten (`TipCards`), am Ende „Soll ich
  einen davon eintragen?“. Eintragen = `termin_anlegen`.
- Kontext: `tippOrt`, `tippKm`.
- Ohne KI: dieselbe Erkennung als Regel in `localRules.ts` („Was ist am
  Wochenende los?“, „Was können wir bei Regen mit den Kindern machen?“,
  „Gibt’s heute was in Malente?“; nie bei Essen, Wetter, Terminen).
- Nutzt sie Tipps, schaltet `unlockTips` Baustein und Kachel frei und sie
  sagt, wo sie stehen.

### Tests

- `tests/tipps/tippsModell.test.ts` – Lizenzen, Zeiträume, Kachel und
  Jetzt-Karte, Filter/Etiketten/Icons, Fragen.
- `tests/tipps/tippsServer.test.ts` – Schalter, Demo-Quelle, TLDB-Gerüst.
- `tests/tipps/tippsAbruf.test.ts` – Einstellungen, Quelle, heute + 20 Tage,
  Aktionen.
- `tests/tipps/region.test.ts` – Modell, Fragen, Quellen, übernommener Tipp,
  Gemerkt und Link im Termin.
- Durchklick `e2e/ablaeufe/mehr.mjs` → `tipps` (Ort-Chip, nach Tag gruppiert).
