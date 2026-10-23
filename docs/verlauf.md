# Verlauf der Funktionen (aus CLAUDE.md)

Die Abschnitte je Version, unverändert aus der früheren CLAUDE.md übernommen
(Aufräumen, Etappe 8). Sie beschreiben, wie etwas entstanden ist – manches
ist inzwischen anders. Den aktuellen Stand je Bereich beschreibt
`docs/bereiche/<bereich>.md`, die festen Regeln stehen in `CLAUDE.md`.
Ältere Pfadangaben meinen die Orte vor dem Umzug (siehe CLAUDE.md, „Ordner“).

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
  ändern"), "Selbst eintippen" (`/kochbuch/bearbeiten`), "Link einfügen" und
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

- Felix: „＋ = tippen, Mia = sprechen.“ Jedes ＋ öffnet jetzt eine
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
