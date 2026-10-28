# Tipps aus der Region

## Feste Regeln (aus CLAUDE.md umgezogen)

- **Tipps aus der Region:** keine Termine, eigene lila Ebene, bis jemand
  „Übernehmen“ tippt. Kein GPS. KARAMBA nie bevorzugt (nur bei gleicher
  Uhrzeit zuerst, höchstens eine pro Woche in der Kachel), sichtbar „von
  KARAMBA Eis“. Nur offene Lizenzen (CC0/CC BY/CC BY-SA). `TIPS_SOURCE` off/demo/
  tldb, Zugang nie im Code. → `docs/bereiche/tipps.md`
- **Name KARAMBA:** immer „KARAMBA Eis“, nie nur „KARAMBA“ (Verwechslung
  mit einem Online-Casino) – in allen Texten (Tipps „von KARAMBA Eis“,
  Spendentopf, Mails, „Über Mia“, Hallo-Bildschirm „Gemacht in Eutin von
  KARAMBA Eis“). Test in `tests/app/regeln.test.ts`.


Kurz: Veranstaltungen in der Nähe (Märkte, Kinderkino, Konzerte …) als eigene
lila Ebene – Kachel, Seite `/tipps`, Kalender, Jetzt-Karte und Antworten der
Begleitung (Standard Mia). Ein Tipp wird erst durch Antippen zum Termin.

## FESTE REGELN

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

## Wo im Code

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

## Daten und Speicher

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

## So verhält es sich

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

## Begleitung (Mia)

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

## Tests

- `tests/tipps/tippsModell.test.ts` – Lizenzen, Zeiträume, Kachel und
  Jetzt-Karte, Filter/Etiketten/Icons, Fragen.
- `tests/tipps/tippsServer.test.ts` – Schalter, Demo-Quelle, TLDB-Gerüst.
- `tests/tipps/tippsAbruf.test.ts` – Einstellungen, Quelle, heute + 20 Tage,
  Aktionen.
- `tests/tipps/region.test.ts` – Modell, Fragen, Quellen, übernommener Tipp,
  Gemerkt und Link im Termin.
- Durchklick `e2e/ablaeufe/mehr.mjs` → `tipps` (Ort-Chip, nach Tag gruppiert).
