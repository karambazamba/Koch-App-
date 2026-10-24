# Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO) – ENTWURF

Vor Veröffentlichung juristisch prüfen lassen. Platzhalter in eckigen Klammern.

**Verantwortlicher:** [Verantwortlicher], [Anschrift], [Datenschutz-Kontakt-Mail]
**Datenschutzbeauftragter:** [falls nötig – bitte prüfen; bei kleinen Anbietern meist nicht Pflicht]

| Nr. | Tätigkeit | Zweck | Betroffene | Datenkategorien | Empfänger | Drittland | Löschfrist | TOMs |
|---|---|---|---|---|---|---|---|---|
| 1 | Konto und Anmeldung | Zugang, Familie verbinden | Nutzende | E-Mail, Anzeigename, Rolle, Anmelde-Code | Supabase (AV) | USA-Firma, Region [Supabase-Region] | bei „Konto löschen“ sofort | toms.md 1–4 |
| 2 | Familien-Daten abgleichen | Termine, Aufgaben, Einkauf, Pinnwand gemeinsam | Nutzende, genannte Familienmitglieder (auch Kinder, nur Vornamen) | Einträge, Namen | Supabase (AV) | wie 1 | Löschen als Markierung; mit Familie/Konto komplett | 1–5 |
| 3 | Sprachnachrichten | Pinnwand | Nutzende | Ton | Supabase Storage (AV) | wie 1 | 24 Std. (täglicher Aufräum-Job) | 1–5 |
| 4 | KI „Mia“ | Gespräch, Vorschläge | Nutzende, genannte Personen | Satz + nötiger Ausschnitt | Anthropic (AV), Vercel (AV) | USA | bei Anthropic laut Vertrag – **bitte prüfen**; bei uns nicht gespeichert | 6 |
| 5 | Mails an Mia | Vorschläge aus weitergeleiteten Mails | Nutzende, Absender der Mails | Domain, Betreff, Auszug ≤ 300 Zeichen | Resend (AV), Supabase (AV) | USA | 7 Tage / 24 Std. | 7 |
| 6 | Erinnerungen (Push) | Bescheid sagen | Nutzende | Push-Abo (Endpunkt, Schlüssel) | Supabase, Push-Dienste der Browser | USA | bei Abbestellen | 1–3 |
| 7 | Wetter | Wetter am Wohnort | Nutzende | Ortsname, ggf. gerundete Koordinaten | Bright Sky, Open-Meteo, Nominatim | EU/UK | nicht gespeichert | 8 |
| 8 | Kalender-Abo | fremde Termine anzeigen | Nutzende | geheimer Link (nur auf dem Weg) | Kalender-Anbieter der Person | je nach Anbieter | nicht gespeichert (nur Gerät) | 8 |
| 9 | Betrieb, Fehler | Stabilität, Missbrauch verhindern | Nutzende | IP, Zeit, Technik-Zahlen | Vercel (AV) | USA-Firma, Funktionen in Frankfurt | laut Vercel – **bitte prüfen** | 9 |
| 10 | Mia-Wünsche | sehen, was gefragt wird | Nutzende | Text des Wunsches, Datum (ohne Person) | Supabase | wie 1 | Vorschlag 12 Monate – **bitte festlegen** | 1–3 |
