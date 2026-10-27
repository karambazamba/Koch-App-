# Wetter

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
  `buildDays`, `weatherTip`, `dayAnswer`, `umbrellaAnswer`, `weatherQuestion`,
  `sanitizeForecast`) und `src/lib/wetter/view.ts` (`dayParts`, `daySentence`,
  `bestOutdoorDay`, `weekSentence`, `skyFor`, `sunTimes`, `isNight`,
  `skyLine`, `columnTone`, `weatherStartTab`).
- App: `src/lib/wetter/client.ts` (`useForecast`, `refreshForecast`,
  `usePlace`, `savePlace`, `placeFromLocation`).
- Oberfläche: `src/components/wetter/WeatherTile.tsx`, `WeatherView.tsx`,
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
- Wind (`lib/wetter/wind.ts`, Tafel 63 B): Tageswert aus den Stunden 7–21 Uhr
  (`windOf(…, true)`, am Tag als `wind`): höchste mittlere Windstärke, dazu
  die stärkste Böe; Richtung als nach Stärke gewichteter Vektor-Mittelwert
  (350° + 10° = Nord). Tageszeiten genauso je Abschnitt. 8 Kürzel N · NO · O ·
  SO · S · SW · W · NW (Grenzen bei 22,5°), ausgeschrieben Nord … Nordwest,
  im Satz „aus Westen“. Windsack-Stufen (`windLevel`): leicht < 20 km/h
  (hängt), windig 20–39 (halb), stürmisch ab 40 oder Böen ab 60 (gerade).
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

Kachel `wetter` (Standard S, Größen S/M/L, Pastell über `TILE`, Verlauf je
Lage über `data-wx` = `weatherGroup`):
- S: Symbol, Temperatur, EIN Satz (Tipp, sonst Lage + Höchstwert).
- M: dazu Morgens · Mittags · Abends (drei Felder).
- L: dazu die nächsten 5 Tage in Worten (`dayWords`).
- Feierabend-Phase (`weatherTomorrow`): das Wetter von morgen, „Schirm
  einpacken“ bei Regenstunden.
- Offline: letzte Werte mit „Stand 8:10“. Nie geladen: „Gerade keine
  Wetterdaten – ich schau gleich nochmal.“ Antippen → `/wetter`.

EIN Tipp (`weatherTip`): echte Regenstunde zur Termin-Zeit „☂️ Ab 15 Uhr
Regen – Schirm für …“, sonst „☂️ Ab 15 Uhr Regen“ („Gerade“ nur bei gemessenem
Regen) → vor 11 Uhr Frost 5–9 Uhr „Heute früh glatt ❄️“ → Böen ab 75
„Sturmböen bis …“ → ab 25 °C vor 18 Uhr „Sonnencreme einpacken ☀️“ → Böen ab
50 „Windig – …“ → sonst keiner. Auf der Kachel ohne Emojis (`withoutEmoji`).

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

### Wind auf der Seite (v0.69)
- Windsack (`Windsock` in `WeatherSymbol.tsx`): grauer Mast, 4 Streifen
  Blau-Grau/Weiß wie die Regenbalken; zeigt nur die Stärke, nie die Richtung
  (keine Pfeile – die Richtung steht als Buchstaben daneben).
- 7 Tage: unten in jeder Spalte (feine Linie darüber) Windsack, Zahl („28“),
  Kürzel („NW“); Legende zweizeilig „Balken = Regenrisiko · ☀ =
  Sonnenstunden“ und „[Windsack] = Wind km/h · W = Wind aus Westen“.
- Heute/Morgen: unter der Temperatur der Chip „[Windsack] 22 km/h aus West“.
- Tageszeiten: rechts „[Windsack] 22 km/h · W“, Böen nur ab 50 km/h („35 · W
  · Böen 60“). Der frühere Tipp „🌬️ Windig“ ist weg (sonst doppelt); die
  Text-Hinweise bei Sturm bleiben.
- VoiceOver: „Wind 22 Kilometer pro Stunde aus Westen, windig“.
- Die Startseiten-Kachel bleibt ohne Wind (ruhig).

## Begleitung (Mia)

- Mit KI: Werkzeug `wetter_abfragen` (`tag` als YYYY-MM-DD). Die Vorhersage
  holt `engine.ts` vorab, wenn die letzte Nachricht nach Wetter oder
  Trainingsplanung klingt (`WEATHER_QUESTION`, `TRAINING_PLAN`). Ergebnis:
  Beschreibung, Tief/Hoch, Regenrisiko, Regenstunden, mm, Sonnenstunden, Wind
  („Tagsüber wird es windig – 28 km/h aus Westen, Böen bis 55 km/h.“); für
  heute die Regen-Uhrzeiten.
- Ohne KI: `weatherQuestion` erkennt „Wie wird das Wetter morgen?“, „Brauch
  ich heute einen Schirm?“, „… am Samstag?“, „übermorgen“, „Ist es windig?“,
  „Woher kommt der Wind morgen?“; Antwort über `dayAnswer`, `umbrellaAnswer`
  bzw. `windAnswer`.
- Kontext: Wetter-Ort (`wetterOrt`). `trainings_planen` nutzt dieselbe
  Vorhersage für trockene Zeiten.

## Tests

- `tests/wetter/tagesbeschreibung.test.ts` – ehrliche Tage, Tipp nur bei
  echter Regenstunde, beide Quellen im gleichen Format, Himmel und Wochensatz.
- `tests/wetter/wind.test.ts` – Stufen-Grenzen 19/20/39/40, Böen 59/60,
  Richtung (350° + 10° → N, 8 Kürzel, 22,5°), Tageswert nur 7–21 Uhr, alte
  Daten ohne Wind, Sätze und Mia.
- `tests/wetter/wetterRegeln.test.ts` – WMO-Code, Tage, EIN Tipp, Antworten,
  Server-Daten prüfen, Seite, Quellen-Formate.
- `tests/wetter/wetterServer.test.ts` – Testmodus, echter Abruf (fetch
  ersetzt), Nominatim.
- `tests/wetter/wetterSpeicher.test.ts` – Ort, letzte Vorhersage, Standort,
  `useForecast`.
- `tests/wetter/seite.test.ts` – Wetter-Seite.
- Durchklick `e2e/ablaeufe/alltag.mjs` → `wetter` (Himmel-Karte, 7 Säulen).
