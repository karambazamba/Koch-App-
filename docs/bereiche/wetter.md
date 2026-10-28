# Wetter

## Feste Regeln (aus CLAUDE.md umgezogen)

- **Wetter:** ehrliche Regel – Regenstunde = ≥ 0,2 mm UND ≥ 50 %, Tage immer
  aus den Stunden 7–21 Uhr. → `docs/bereiche/wetter.md`


Kurz: Das Wetter am Wohnort – als Kachel auf Heute, als eigene Seite `/wetter`
und als Antwort der Begleitung (Standard Mia). Ehrlich aus den Stunden
gerechnet, ohne Panik, mit höchstens EINEM Tipp.

## Wo im Code

- Server: `src/app/api/wetter/route.ts` (GET), `src/lib/wetter/server.ts`
  (`fetchForecast`, `geocode`, `placeFromCoords`, `weatherMock`, Testmodus
  `mockForecast`).
- Quellen umwandeln (rein): `src/lib/wetter/sources.ts` (`fromBrightSky`,
  `fromOpenMeteo`).
- Regeln (rein): `src/lib/wetter/forecast.ts` (`isRainy`, `dayLook`,
  `buildDays`, `dayAnswer`, `umbrellaAnswer`, `weatherQuestion`,
  `sanitizeForecast`) und `src/lib/wetter/view.ts` (`dayParts`, `daySentence`,
  `bestOutdoorDay`, `weekSentence`, `skyFor`, `sunTimes`, `isNight`,
  `skyLine`, `columnTone`, `weatherStartTab`), `src/lib/wetter/kachel.ts`
  (Kachel: `rainingNow`, `kachelLage`, `kachelZeile`, `kachelSatz`,
  `kachelSzene`/`szeneAus`, `kachelWind`, `zweiStunden`, `kachelHimmel`) und `src/lib/wetter/wind.ts` (Windstufen,
  Wörter, Windsack-Aussehen, `stormForPlan` für die Jetzt-Karte).
- App: `src/lib/wetter/client.ts` (`useForecast`, `refreshForecast`,
  `usePlace`, `savePlace`, `placeFromLocation`).
- Oberfläche: `src/components/wetter/WeatherTile.tsx`, `WetterSzene.tsx`
  (kleine stille Szene rechts oben, Tafel 120), `WeatherView.tsx`,
  `WeatherParts.tsx` (`SkyCard`, `BestDayCard`, `WeekBand`, `WeekNote`),
  `WeatherSymbol.tsx` (eigenes Symbol-Set, `night` = Mond).
- Einstellung: `src/components/einstellungen/WeatherPlaceForm.tsx`
  (`/profil/wetter`).
- Begleitung: Werkzeug `wetter_abfragen` in `src/lib/begleitung/noteTools.ts`,
  Regel ohne KI in `src/components/begleitung/localRules.ts`.

## Daten und Speicher

| Schlüssel | Version | Inhalt | Sicherung |
|---|---|---|---|
| `wasgibts.wetterort` | v1 | `{ city }`, Standard Eutin | ja |
| `wasgibts.wetterdaten` | v1 | letzte Vorhersage (offline) | nein |
| `wasgibts.wetterszenario` | – (session) | Testmodus-Szenario | nein |

- Format `Forecast`: `place`, `fetchedAt`, `source` (`dwd` | `icon` | `mock`),
  `current` (`temp`, `code`, `measured`, `raining`), `hours`, `days`.
- Stunde: `temp`, `code` (WMO), `rain` (Regenrisiko %), `mm`, `sun`
  (Sonnenminuten), `cloud`, `gust`, seit v0.69 `wind` (mittlere Windstärke
  km/h; Bright Sky `wind_speed`, Open-Meteo `wind_speed_10m`) und `dir`
  (Windrichtung in Grad, woher; `wind_direction` bzw. `wind_direction_10m`).
  Ältere gespeicherte Vorhersagen haben beides nicht – dann zeigt die Seite
  keinen Wind (statt „0 km/h“).
- Wind (`lib/wetter/wind.ts`, Tafel 87 – EINE Stelle für Kachel, Seite, Mia
  und Jetzt-Karte): Tageswert aus den Stunden 7–21 Uhr (`windOf(…, true)`, am
  Tag als `wind`): höchste mittlere Windstärke, dazu die stärkste Böe;
  Richtung als nach Stärke gewichteter Vektor-Mittelwert (350° + 10° = Nord).
  Tageszeiten genauso je Abschnitt. 8 Kürzel N · NO · O · SO · S · SW · W · NW
  (Grenzen bei 22,5°), ausgeschrieben Nord … Nordwest, im Satz „aus Westen“.
  Stufen nach Beaufort, nur der Mittelwind (gerundet) zählt (`windLevel`,
  `WIND_STUFEN`, `windWord`): Kaum Wind < 12 km/h · Leichter Wind 12–19 ·
  Mäßiger Wind 20–28 · Frischer Wind 29–38 · Lebhafter Wind 39–49 · Starker
  Wind 50–61 · Stürmischer Wind 62–74 · Sturm 75–102 · Orkanartiger Wind ab
  103. Böen nennen erst ab 60 km/h (`gustText`), auch wenn der Mittelwind
  niedriger ist.
- Tage baut immer `buildDays` aus den Stunden (nur Tage mit ≥ 12 Stunden).
  `sanitizeForecast` baut auch alte gespeicherte Daten so neu.
- Der Ort im Profil `weather.postcode` gehört nicht hierher (nutzt der
  Spendentopf).

## So verhält es sich

Server `/api/wetter`:
- `?ort=Eutin` (höchstens 60 Zeichen, ohne `<>{}`) → Vorhersage.
  `?lat&lon` → nur `{ ort }` (Stadtname über Nominatim).
- Ablauf: Ort → Koordinaten (Open-Meteo Geocoding, nur Deutschland) → DWD
  MOSMIX über Bright Sky (`/weather` 7 Tage + `/current_weather` + `/radar`
  mit `distance=1000`, Timeout 6 s, fällt es aus, geht es ohne). Antwortet
  Bright Sky nicht, Open-Meteo mit `models=icon_seamless`. Timeout je 8 s.
- Server-Zwischenspeicher 10 Minuten je Ort (App lädt beim Öffnen neu, wenn
  älter als 15 Minuten). Antwort mit
  `Cache-Control: public, max-age=600`.
- Limit pro IP über `allowRequest("wetter:<ip>", 3)` (30 pro Minute, 180 pro
  Stunde). Kein Zugangscode, weil Wetter auch ohne KI gehen muss.
- `WETTER_MOCK=1` = Testmodus ohne Netz und ohne Limit. `?szenario=` regen
  (Standard, Regen heute 15–18 Uhr) · frost · heiss · klar · sturm · schnee ·
  gewitter · wolkig; `?heute=` setzt den Tag.
- „Jetzt“: Temperatur der Station nur, wenn ≤ 10 km und ≤ 40 Min alt
  (`measured`), sonst Vorhersage der aktuellen Stunde. `raining` („Gerade
  Regen“) nur, wenn das DWD-Regenradar am Ort JETZT Niederschlag zeigt
  (`fromRadar`: Zelle des Orts aus `latlon_position`, ab 0,02 mm je 5 Min,
  jüngster Wert höchstens 20 Min alt). Eben noch Regen, jetzt trocken →
  `stopped` („Regen hat aufgehört“) und Sonne/Wolken laut aktueller Stunde.
  Ohne Radar wie bisher (Station).

Ehrliche Regel (`dayLook`, Stunden 7–21 Uhr):
- Regenstunde = mindestens 0,2 mm UND Regenrisiko ab 50 % (`isRainy`).
- Reihenfolge: Gewitter / Schnee (nur ab echter Regenstunde) →
  „Regnerisch“ (ab 4 Regenstunden oder 3 mm) → „Schauer möglich“ (1–3) →
  „Stürmisch“ (Böen ab 75 km/h) → „Sonnig“ (≥ 6 Std. Sonne) → „Sonne und
  Wolken“ (≥ 2) → „Neblig“ (mind. halbe Zeit Nebel) → „Bedeckt“ (Wolken
  ≥ 85 %) bzw. „Wolkig“.
- Morgens (6–11) / Mittags (11–17) / Abends (17–23) nach derselben Regel,
  Sonnen-Grenzen anteilig (`dayParts`, je bis zu 2 Tipp-Chips).

Kachel `wetter` (Standard XS, Größen XS/S/M im festen Raster, Tafel 118/120;
`WeatherTile`, Logik rein in `lib/wetter/kachel.ts`):
- Lage jetzt ehrlich (`kachelLage`): nass nur, wenn Radar/Station Regen misst
  (`raining`) bzw. ohne Messung die Stunde jetzt eine echte Regenstunde ist
  (`rainingNow`); dann Regen, Schnee oder Gewitter, sonst Sonnig (klar/heiter)
  oder Bewölkt.
- EIN kurzer Satz (`kachelSatz`, ≤ 22 Zeichen `SATZ_MAX`, Stunden ab jetzt
  bis Mitternacht, `isRainy`): nass jetzt → „Regen bis 15 Uhr“ (ohne trockene
  Stunde nur „Regen“; „Niesel“, „Schnee“, „Gewitter“); später nass → „ab 15
  Uhr Regen“ („Schnee“, „Gewitter“); eben aufgehört → „Regen hat aufgehört“;
  Wind, der auffällt (`windZeigen`) → das Wort der Stufe („Frischer Wind“);
  nachts „klar“ bzw. „bewölkt“; sonst „bleibt sonnig“, „bleibt trocken“
  (leicht bewölkt) bzw. „bewölkt“. Für VoiceOver bleibt die längere Zeile
  (`kachelZeile`, „Regen · ab 10 Uhr trocken“) samt Wind in Worten.
- Szene rechts oben (`kachelSzene`/`szeneAus`, `WetterSzene`, eigene
  inline-SVG-Zeichnungen, leicht angeschnitten, nicht animiert): nass geht vor
  (Gewitter, Schnee, Regen – auch nachts), dann Wind (nur mit `windZeigen`:
  ab „Frischer Wind“ oder Böen ≥ 60; ersetzt den früheren Windsack auf der
  Kachel), nachts Mond + Sterne, sonst bewölkt, leicht bewölkt (heiter) oder
  Sonne. Hauptmotiv in der Motiv-Farbe des Himmels (`--sky-motiv`), Wolken,
  Wind und Sterne als Tokens `--app-szene-*` (hell/dunkel/auto).
- Größen, Text immer links und nie unter der Zeichnung (Platz rechts frei):
  XS = „WETTER“, Temperatur groß, darunter der Satz; S = dazu ↑ max / ↓ min
  (Satz und ↑/↓ unten, unter der Szene ist Platz); M = „WETTER · EUTIN“,
  Temperatur mit ↑/↓, Satz, unten feine Linie und 4 Spalten im
  2-Stunden-Abstand ab jetzt (`zweiStunden`, auch über Mitternacht, nachts
  Mond): Stunde, Symbol, Temperatur.
- Hintergrund (`kachelHimmel(lage, nacht, look, wind)`, `data-himmel`):
  Look „Farbig“ = Himmel je Lage, nachts (`isNight`) die dunklere Variante
  (`<lage>-nacht`), Tokens `--app-sky-<key>-a/-b/-ink/-soft/-motiv` (hell und
  dunkel in `globals.css`). Look „Schlicht“ = Kachel-Fläche weiß, Szene
  kleiner (`scale-75`) und blasser (Deckkraft 0,6). Ab „Stürmisch“ leicht
  warm getönt, ab „Sturm“ rötlich (`data-ton`, beide Looks). Kontrast jeder
  Variante (auch getönt, hell/dunkel/auto) rechnerisch ≥ 4,5:1
  (`tests/wetter/kachel.test.ts`).
- Feierabend-Phase (`weatherTomorrow`): das Wetter von morgen (Höchstwert,
  ab S mit Tiefstwert) mit der Szene von morgen, Satz „Schirm einpacken“ bei
  Regenstunden, sonst der Tagestext.
- Offline: letzte Werte mit „· 8:10“ im Kopf. Nie geladen: „Gerade keine
  Wetterdaten.“ Antippen → `/wetter`.
- Der frühere EINE Tipp (`weatherTip`) ist weg: Regen zum Termin steht auf der
  Jetzt-Karte bzw. im Satz der Wetter-Seite (`daySentence`). Die L-Größe
  (nächste Tage) gibt es seit dem festen Raster nicht mehr – die stehen auf
  der Wetter-Seite.

Seite `/wetter` (`WeatherView`):
- Reiter Heute · Morgen · 7 Tage (tippen oder wischen, Punkte; ab 18 Uhr
  startet sie auf Morgen; `?tag=heute|morgen|woche`).
- Heute: `SkyCard` mit Verlauf je Lage (`skyFor`: sonne, wolken, regen,
  gewitter, schnee; nachts immer `nacht` und Mond – `isNight` aus
  `sunTimes`, Näherung für Norddeutschland). „Jetzt · 6:50“, Temperatur,
  Zustand, Zeile „Heute 9 bis 12° · ☂ 39 % · ☀ 3 Std.“ (`skyLine`: Regen ab
  30 %, Sonne ab 0,5 Std.), drei Glasfelder. Darunter ein Satz zu den
  Terminen (`daySentence`) und drei Tageszeit-Karten.
- Morgen: dieselbe Karte, groß der Höchstwert, darunter „7 bis 11°“.
- 7 Tage: „Bester Tag für draußen“ (`bestOutdoorDay`, nur wenn ein Tag ohne
  Regen/Gewitter und unter 40 % Risiko taugt), Wochen-Band mit 7 Säulen
  (`columnTone`, Regenbalken, Sonnenstunden; Säule antippen = Fenster), EIN
  Satz zur Woche (`weekSentence`, ohne KI, ruhig).
- Unten Quelle („Daten: Deutscher Wetterdienst (über Bright Sky)“ bzw.
  „Open-Meteo (DWD ICON)“) und „Ort ändern“. Farben nur über `--app-wx-*`.

Ort: Einstellungen → Wetter-Ort (`WeatherPlaceForm`): Stadt eintippen oder
„Meinen Standort verwenden“ (Koordinaten auf 2 Stellen gerundet, gespeichert
wird nur die Stadt). Die App holt höchstens alle 30 Minuten neu.

### Wind auf der Seite (v0.69, Tafel 87)
- Windsack (`Windsock` in `WeatherSymbol.tsx`, Tafel 87): grauer Mast, Sack
  orange mit weißen Streifen (ab „Sturm“ rot), steht je Stufe höher (hängt
  bei „Kaum Wind“, waagerecht ab „Lebhaft“); ab „Lebhaft“ Windstriche
  daneben (1 · 1 · 2 · 3 · 4, `windLook`). Zeigt nur die Stärke, nie die
  Richtung (keine Pfeile – die Richtung steht als Buchstaben daneben). Still.
- 7 Tage: unten in jeder Spalte (feine Linie darüber) Windsack, Zahl („28“),
  Kürzel („NW“); Legende zweizeilig „Balken = Regenrisiko · ☀ =
  Sonnenstunden“ und „[Windsack] = Wind km/h · W = Wind aus Westen“.
- Heute/Morgen: unter der Temperatur der Chip „[Windsack] Mäßiger Wind ·
  22 km/h aus West“ (ab Böen 60 „· Böen 85“).
- Tageszeiten: rechts „[Windsack] 22 km/h · W“, Böen nur ab 60 km/h („35 · W
  · Böen 60“).
- VoiceOver: „Mäßiger Wind, 22 Kilometer pro Stunde aus Westen“.
- Seit v0.136 unter „Frischer Wind“ und Böen unter 60: kein Chip in der
  Himmel-Karte, in den Tageszeiten nur klein die Zahl („12 km/h · W“,
  `WindZahl`), im 7-Tage-Band Zahl und Kürzel ohne Windsack.

## Begleitung (Mia)

- Mit KI: Werkzeug `wetter_abfragen` (`tag` als YYYY-MM-DD). Die Vorhersage
  holt `engine.ts` vorab, wenn die letzte Nachricht nach Wetter oder
  Trainingsplanung klingt (`WEATHER_QUESTION`, `TRAINING_PLAN`). Ergebnis:
  Beschreibung, Tief/Hoch, Regenrisiko, Regenstunden, mm, Sonnenstunden, Wind
  mit denselben Wörtern wie Kachel und Seite („Wind tagsüber: Frischer Wind,
  32 km/h aus Westen, Böen bis 85 km/h.“, `windWords`); für heute die
  Regen-Uhrzeiten.
- Ohne KI: `weatherQuestion` erkennt „Wie wird das Wetter morgen?“, „Brauch
  ich heute einen Schirm?“, „… am Samstag?“, „übermorgen“, „Ist es windig?“,
  „Woher kommt der Wind morgen?“; Antwort über `dayAnswer`, `umbrellaAnswer`
  bzw. `windAnswer` („Morgen: Mäßiger Wind, 28 km/h aus Westen.“).
- Kontext: Wetter-Ort (`wetterOrt`). `trainings_planen` nutzt dieselbe
  Vorhersage für trockene Zeiten.

## Tests

- `tests/wetter/tagesbeschreibung.test.ts` – ehrliche Tage, Tipp nur bei
  echter Regenstunde, beide Quellen im gleichen Format, Himmel und Wochensatz.
- `tests/wetter/wind.test.ts` – jede der neun Stufen an ihren Grenzen,
  Windsack-Aussehen, Böen 59/60, Richtung (350° + 10° → N, 8 Kürzel,
  22,5°), Tageswert nur 7–21 Uhr, alte Daten ohne Wind, Sätze und Mia,
  Jetzt-Karte nur ab „Stürmisch“ mit Planbezug.
- `tests/wetter/kachel.test.ts` – ehrliche Lage und Zeile, kurzer Satz
  (≤ 22 Zeichen), Szene je Lage, Wind jetzt, 2-Stunden-Überblick,
  Hintergrund je Wetter/Tag/Nacht/Look, Kontrast jeder Variante (WCAG, auch
  getönt), jede Lage × XS/S/M × Tag/Nacht × Farbig/Schlicht als echte Ausgabe.
- `tests/wetter/wetterRegeln.test.ts` – WMO-Code, Tage, EIN Tipp, Antworten,
  Server-Daten prüfen, Seite, Quellen-Formate.
- `tests/wetter/wetterServer.test.ts` – Testmodus, echter Abruf (fetch
  ersetzt), Nominatim.
- `tests/wetter/wetterSpeicher.test.ts` – Ort, letzte Vorhersage, Standort,
  `useForecast`.
- `tests/wetter/seite.test.ts` – Wetter-Seite.
- Durchklick `e2e/ablaeufe/alltag.mjs` → `wetter` (Kachel mit Himmel,
  Szene und Satz; Himmel-Karte, 7 Säulen), `e2e/ablaeufe/raster.mjs` →
  `wetterSzenen` (jede Lage × XS/S/M, Text nie unter der Zeichnung).

## Stundenleiste (v0.122.0)

- Heute: die nächsten 12 Stunden ab jetzt, Morgen: ab 7 Uhr (`nextHours`, `HourStrip`), waagerecht wischbar, ohne die Seiten umzublättern. Tipp-Chips mit Linien-Symbol (`WetterTipp`). Titel „Wetter“, Ort als Untertitel. Tests `tests/wetter/phase0Reste.test.ts`.
