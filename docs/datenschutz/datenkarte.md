# Datenkarte (Stand v0.98)

Jede Datenart: wo sie liegt, wozu, wie lange, wer sie sieht, Rechtsgrundlage
(ENTWURF – vor Veröffentlichung juristisch prüfen lassen).

Abkürzungen: **Gerät** = Browser-Speicher (localStorage/IndexedDB) nur auf
diesem Gerät · **Server** = Supabase-Datenbank (nur mit Konto) · Art. 6 Abs. 1
lit. b DSGVO = Vertrag (Nutzung der App) · lit. a = Einwilligung · lit. f =
berechtigtes Interesse.

| Datenart | Wo | Wozu | Wie lange | Wer sieht sie | Grundlage |
|---|---|---|---|---|---|
| Termine, Aufgaben (`wasgibts.eintraege`) | Gerät; mit Konto Server (`entries`) | Kalender, Heute | bis gelöscht; Löschen als Markierung, danach weg beim Abgleich | Familie (Raum „Familie“), nur Besitzer (Raum „Arbeit“), Aufgaben nur Besitzer + Empfänger | lit. b |
| Einkauf, Im Haus, Rezepte, Wochenplan | Gerät; mit Konto Server (`entries`) | Essen, Einkauf | bis gelöscht | Familie | lit. b |
| Einkauf unterwegs („Familie Bescheid sagen“, `wasgibts.einkaufswege`): Laden, Anzeigename, Start/Ende, Anzahl, 2 Schnellknöpfe, Antworten „Steh grad davor“ (an wen = Konto-ID, welche Sache, wann) | Gerät; mit Konto Server (`entries`, Typ `unterwegs`) | der Familie sagen, wer gerade einkauft; Antwort an die Person, die etwas draufsetzte | 2 Tage, Antworten höchstens 20 je Einkauf | Familie; Mitteilungstexte gehen verschlüsselt über die Push-Dienste der Browser | lit. b |
| Notizen | Gerät (mit Konto: Familie bzw. Arbeit über `entries`) | festhalten | bis gelöscht | wie Raum | lit. b |
| Pinnwand-Zettel (Text, Farbe, Papier, Erledigt, Archiv) | Gerät; mit Konto Server | Absprachen für alle im Haushalt | an der Tür bis „Erledigt“ (+24 Std.) bzw. 7 Tage, dann im Archiv „Ältere“, bis jemand löscht | Familie | lit. b |
| Pinnwand-Fotos (Bild, verkleinert auf 1600 px, JPEG) | IndexedDB `wasgibts-fotos`; mit Konto Supabase Storage „fotos“ (RLS: nur der Haushalt) | Foto-Zettel (Polaroid) | wie der Zettel; Bild gelöschter Zettel räumt der Server täglich weg (`/api/memos/aufraeumen`), auf dem Gerät beim nächsten Start; nicht in „Daten sichern“ | Familie | lit. b |
| Sprachnachrichten (Ton) | IndexedDB; mit Konto Supabase Storage „memos“ | Pinnwand | wie die Zettel (Archiv statt Verschwinden); Ton gelöschter Sprachnachrichten räumt der Server täglich weg (`/api/memos/aufraeumen`) | Familie | lit. b |
| Chat mit Mia | nur im Arbeitsspeicher der offenen Seite | Gespräch | bis die Seite geschlossen wird – nie gespeichert | niemand außer der Person; Inhalt geht pro Anfrage an Anthropic | lit. a (KI-Einwilligung, ab 23b) |
| Aufnahme beim Sprechen mit Mia (Ohr vom Server) | nur im Arbeitsspeicher, auf dem Weg über unseren Server zu ElevenLabs | Satz verstehen | bis der Text da ist (Sekunden) – nie gespeichert, nie protokolliert | niemand; geht nur an ElevenLabs | lit. a (KI-Einwilligung) |
| Mias Antworttext zum Vorlesen (Stimme vom Server) | auf dem Weg über unseren Server zu ElevenLabs; der Ton nur im Arbeitsspeicher | Vorlesen | bis vorgelesen – nie gespeichert (feste Sätze wie „Steht drin.“ liegen ohne Personenbezug im Zwischenspeicher) | niemand; geht nur an ElevenLabs | lit. a (KI-Einwilligung) |
| Mia denkt mit (`wasgibts.miadenkt`): wie gesprächig, Antworten auf Muster-Fragen, Essens-Rituale, vorgestellte Kacheln, besuchte Seiten, Sprüche | Gerät | Gewohnheiten erkennen, nie zweimal fragen | bis gelöscht („Was Mia sich merkt“, einzeln); Hinweise je Tag 7 Tage, Sprüche 30 Tage | nur Gerät; geht nicht an die KI | lit. b |
| Kurz-Check „Im Haus“ (`wasgibts.kuehlcheck`): nur die Woche (Datum des Sonntags), in der er erledigt ist | Gerät | nicht zweimal in der Woche fragen | bis zum nächsten Check | nur Gerät | lit. b |
| „Was Mia heute erledigt hat“ (`wasgibts.mia.erledigt`) | Gerät | Übersicht | ein Tag | nur Gerät | lit. b |
| Offline Gesagtes (`wasgibts.lotte.nachholen`) | Gerät | später nachholen | bis gesendet | nur Gerät | lit. b |
| Kalender-Links (Abos) | nur Gerät (`wasgibts.kalenderabos`); Abruf über `/api/kalender/abo` | fremde Termine anzeigen | bis entfernt | nur Gerät; der Link geht pro Abruf durch unseren Server, wird nicht gespeichert oder protokolliert | lit. b |
| Profil, Namen, Allergien, Vorlieben | Gerät (`familienkueche.haushaltsprofil`) | Vorschläge passend zur Familie | bis gelöscht | nur Gerät; Ausschnitte gehen bei KI-Anfragen an Anthropic | lit. b; Allergien = Gesundheitsdaten → Art. 9 Abs. 2 lit. a (Einwilligung) – **bitte prüfen** |
| Wetter-Ort | Gerät | Wetter | bis geändert | Ortsname geht an Bright Sky/Open-Meteo; bei „Meinen Standort verwenden“ gerundete Koordinaten (≈1 km) an Nominatim | lit. b |
| Konto: E-Mail, Anzeigename, Rolle | Server (Supabase Auth, `members`) | Anmelden, Familie | bis Konto gelöscht | E-Mail: nur die Person (und Supabase); Anzeigename/Rolle: Familie | lit. b |
| Familie: Name, Region | Server (`households`) | Familie, Spendentopf-Region | bis die letzte Person austritt | Familie | lit. b |
| Einladungs-Links | Server (`invite_links`) | Einladen | 14 Tage | Erwachsene der Familie | lit. b |
| Push-Abos | Server (`push_abos`) | Erinnerungen | bis abbestellt | nur Server | lit. a (Browser-Erlaubnis) |
| Mails an Mia: Adressen, Vorschläge, gelernte Absender | Server (`mail_addresses`, `mail_items`, `mail_senders`) | Vorschläge aus Mails | Vorschläge 7 Tage, „angekommen“ 24 Std.; Rohmail nie | Familie bzw. nur Person (Arbeit) | lit. a (Einschalten des Bausteins) |
| Mia-Wünsche („Kann ich noch nicht“) | Server (`mia_wuensche`), nur Text + Datum | sehen, was gefragt wird | **bitte festlegen** (Vorschlag 12 Monate) | nur Betreiber | lit. f |
| Bekannte Stimmen (`wasgibts.stimmen`) | Gerät, nur Kennungen der Systemstimmen | „Neue Stimme gefunden … Nehmen?“ | bis gelöscht | nur Gerät | lit. b |
| KI-Verbrauch (`wasgibts.verbrauch`) | Gerät, nur Zahlen (auch vorgelesene Zeichen, gehörte Sekunden) | Tageslimit, Guthaben | 62 Tage | nur Gerät | lit. f |
| Zugangscode (+ Merker „Später“), Geräte-Kennung | Gerät | Tageslimit | bis gelöscht | nur Gerät; Code nur im Header an den Server (Prüfung), Kennung als Zahl (Limit) | lit. f |
| Server-Logs (Vercel) | Vercel | Fehler finden | laut Vercel-Plan **bitte prüfen** | Betreiber | lit. f; enthalten nur Technik (Dauer, Kosten, Fehlercode) – Test `tests/app/datenschutz.test.ts` |
| Einwilligungen | Gerät (`wasgibts.einwilligungen`: Art, ja/nein, Textfassung, Zeit; „Bevor’s losgeht“ ab v0.93) und mit Konto Server (`einwilligungen`, ab 23b) | Nachweis | Gerät bis gelöscht, Server solange Konto besteht | nur die Person | Art. 7 Abs. 1 |

Nicht gespeichert: Rohmails, Chat-Verläufe, GPS-Koordinaten, Werbe- oder
Tracking-Kennungen. Keine Analyse-Werkzeuge, keine Tracker.
