AUFTRAG (29.10.): „Was los?“ – Veranstaltungen in der Umgebung aus dem Kalender des Kreises Ostholstein (Tafel 142, Kreise laut Tafel 143)
Tafel als docs/tafeln/tafel-142.png ablegen. Auf neuestem main aufbauen, nicht nachfragen, testen, PR, mergen, docs/auftraege.md aktualisieren.
Baustein „Tipps aus der Region“ heißt in der Oberfläche jetzt „Was los?“, aus LAUNCH_AUS herausnehmen (Entscheidung Felix). Standard an für Wohnorte in Ostholstein, sonst aus (später weitere Regionen).

1 · DATEN HOLEN (nur Server, nie im Client)
- Quelle: öffentlicher Veranstaltungskalender des Kreises Ostholstein
  https://www.kreis-oh.de/Bildung-Kultur-Sport/Kultur-erleben-Kultur-f%C3%B6rdern/Veranstaltungen/
  Liste mit 25 Einträgen je Seite, Blättern über Parameter ofs_1 (0, 25, 50 …); Detailseite enthält FID=3906.<id>.1 = eindeutige ID. Ort-Filter des Formulars ermitteln und nutzen; falls nicht möglich, Ort aus Titel/Text erkennen.
- Orte (Standard „Eutin + 15 km“): Eutin, Bad Malente-Gremsmühlen, Süsel, Scharbeutz, Ahrensbök, Schönwalde, Kasseedorf, Stockelsdorf; Liste je Wohnort + Umkreis (5 / 15 / 30 km) in src/lib/region/orte.ts, erweiterbar.
- Vercel-Cron täglich 5:00 (CRON_SECRET), Zeitraum heute bis +14 Tage. Höflich abrufen: max. 1 Anfrage pro Sekunde, nur nötige Seiten, eigener User-Agent „Mia-App (mia.karamba-eis.de)“, robots.txt beachten.
- Übernommen werden NUR: ID, Titel, Datum, Uhrzeit von–bis bzw. ganztags, Ort (Text), Link zur Detailseite, Kategorie (selbst abgeleitet aus Titel/Text: Kinder & Familie, Kultur, Draußen, Markt, Sonstiges). KEINE Beschreibungstexte, KEINE Bilder.
- Speicher: Supabase-Tabelle region_events (RLS: lesen für App, schreiben nur Server; tests/datenbank/sicherheit.test.sql ergänzen). Abgelaufene Einträge täglich löschen. Ohne Konto: App holt die öffentliche Liste über eine eigene API-Route (zwischengespeichert, 1 h).
- Not-Schalter REGION_TIPPS_QUELLE (Vercel, an/aus): aus = kein Abruf mehr, Kreis und Hinweise verschwinden still.
- Wenn die Seite sich ändert (0 Treffer oder Fehler): vorhandene Daten bis Ablauf behalten, Hinweis im Entwickler-Bereich und in docs/auftraege.md („Was los?: Quelle liefert nichts“), Nutzer sehen nie etwas Kaputtes.
- Sperrliste für einzelne IDs (falls ein Veranstalter Entfernung wünscht).

2 · MINI-KREIS „WAS LOS?“ (Tafel 143)
- Fahne, Blau. Unter dem Kreis nur das Wort „Was los?“ – keine Zahl, kein Tipp, keine Uhrzeit.
- Einer der bis zu 5 Kreise (Standard: Sport · Pause · Was los? · Rätsel · Timer; Regeln laut Auftrag „Mini-Kreise final“).
- Ausblenden, wenn in den nächsten 14 Tagen nichts da ist oder die Quelle aus ist.

3 · FENSTER (Tafel 142/2–3)
- Kopf: Fahnen-Symbol, Titel „Was ist los in <Wohnort>?“, Unterzeile „Veranstaltungen · bis 15 km“, ✕.
- Reiter: Heute · Wochenende · 2 Wochen (Wochenende = Fr ab 15 Uhr bis So).
- Liste nach Tagen gruppiert („HEUTE · DO 29. OKT“, „SA 31. OKT“ …): links Uhrzeit bzw. „ganztags“, Mitte Titel (bis 2 Zeilen, nie „…“) und Ort mit Ortssymbol, Schild „für Kinder“ bei Kinder & Familie, rechts runder Kalender-Knopf (trägt sofort ein, Ergebnis-Karte „Eingetragen“, Raum Familie).
- Filter-Chips bei Wochenende und 2 Wochen: Alles · Für Kinder · Kultur · Draußen · Märkte. Haushalt Familie: „für Kinder“ zuerst.
- Unten klein: „Quelle: Kreis Ostholstein · kreis-oh.de ›“.
- Leer: „Heute ist nichts eingetragen. Schau mal aufs Wochenende.“

4 · DETAIL (Tafel 142/4)
- Datum · Uhrzeit, Titel groß, Ort.
- Knöpfe „In den Kalender“ (orange) und „An die Pinnwand“ (Zettel: „Sa 17:00 Nachtwächter-Rundgang · Wer kommt mit?“).
- „Mehr beim Kreis Ostholstein ›“ öffnet die Originalseite.
- Zeile „Angaben vom Kreis Ostholstein, ohne Gewähr“.

5 · ANDERE STELLEN
- Freitags-Karte „Wochenende planen?“ (Jetzt-Karte) schlägt 1–2 Wochenend-Tipps vor.
- Mia versteht: „Was ist los?“, „Was ist heute in Eutin los?“, „Was können wir am Wochenende mit den Kindern machen?“ → Antwort aus region_events mit Quelle und Knopf „In den Kalender“. Prüfstand-Sätze ergänzen (≥ 95 %).
- Einstellungen → „Was los?“: Umkreis 5 / 15 / 30 km, Kategorien an/aus, Baustein aus.

6 · DATENSCHUTZ UND DOKU
- Keine Nutzerdaten an den Kreis (Server holt allgemein, nicht pro Person).
- docs/datenschutz/datenkarte.md und anbieter.md ergänzen; Rechtstexte: „Veranstaltungsangaben: Kreis Ostholstein, ohne Gewähr“.
- docs/bereiche/tipps.md auf neuen Stand („Was los?“).

7 · TESTS
- Parser mit gespeicherten Beispielseiten (tests/fixtures/kreis-oh/*.html): Liste, Blättern, Detail-ID, Zeitformate („bis“, ganztags), Ort- und Kategorie-Erkennung.
- Cron: schreibt heute + 14 Tage, löscht Abgelaufenes; Schalter aus → nichts sichtbar; Fehler/0 Treffer → alte Daten bleiben + Hinweis.
- Kreis zeigt nur „Was los?“, verschwindet ohne Einträge; Fenster: Reiter, Filter, Kalender-Knopf, Pinnwand-Zettel, Originallink.
- Kein Text mit „…“ auf iPhone SE / 15 Pro / Pixel 7; bilder:vergleich.
- Version, Changelog, PR, mergen.
