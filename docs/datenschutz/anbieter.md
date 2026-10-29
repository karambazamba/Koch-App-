# Anbieter (Stand v0.167)

Was gelistet ist, wird wirklich genutzt (geprüft im Code). „bitte prüfen“ =
Felix klärt; nichts davon ist hier erfunden.

| Dienst | Zweck | Welche Daten | Standort | Vertrag nötig |
|---|---|---|---|---|
| Vercel Inc. | Hosting der App und der Server-Funktionen | IP-Adresse, Anfragen; Inhalte nur auf dem Weg (KI, Wetter, Kalender-Abo) | Funktionen auf Frankfurt festgelegt (`vercel.json` `regions: ["fra1"]`); Firma in den USA | ja, AVV/DPA (Vercel-Konto → Legal) – **bitte prüfen**, Data Privacy Framework – **bitte prüfen** |
| Supabase Inc. | Konten, Datenbank, Speicher für Sprachnachrichten und Pinnwand-Fotos | E-Mail, Anzeigename, Einträge der Familie, Ton, Fotos (verkleinert, nur im Haushalt sichtbar) | Projekt-Region: **[Supabase-Region] bitte prüfen** (Ziel Frankfurt, eu-central-1) | ja, DPA (Supabase-Dashboard → Organization → Legal) |
| Anthropic PBC | KI „Mia“ (Claude) | der Satz und der nötige Ausschnitt (Termine des Tages, Einkauf, Profil-Auszug); Nachschub für Wundertüte und Rätsel (A-052): nur die Bitte „Witze“ bzw. „Rätsel“, keine Angaben über die Familie; nie Ton von Sprachnachrichten | USA | ja, DPA/Commercial Terms – **bitte prüfen**: Speicherdauer und „kein Training“ in den aktuellen Bedingungen |
| ElevenLabs (Eleven Labs Inc.) | Mias Stimme (Vorlesen) und Ohr (Sprache in Text), nur mit KI-Einwilligung und nur, wenn `ELEVENLABS_API_KEY` gesetzt ist | Mias Antworttext (bereinigt) bzw. der Ton beim Sprechen mit Mia: live gestreamt (Realtime, seit A-026; die App verbindet sich mit einem kurzlebigen Einmal-Schlüssel direkt mit ElevenLabs, der echte Schlüssel bleibt auf unserem Server) oder als Ersatz die Aufnahme (höchstens 60 s) über unseren Server; wird bei uns nicht gespeichert, nie protokolliert. Nie Pinnwand-Sprachnachrichten | **bitte prüfen** (USA; EU-Datenhaltung nur mit Enterprise?) | ja, DPA – **bitte prüfen**: Speicherdauer, „kein Training“, ggf. Zero-Retention |
| ElevenLabs – Durchatmen-Ansagen (A-051) | feste Ansagen fürs Durchatmen EINMAL auf dem Server erzeugen (beim ersten Abruf einer fehlenden Ansage bzw. nachts per Cron; nur Sätze aus `content/durchatmen/ansagen.json`, nie freier Text) | nur die festen Sätze aus `content/durchatmen/ansagen.json` – keine Nutzerdaten; bei Übungen wird nichts gesendet | wie oben | wie oben |
| Supabase – Bucket `durchatmen-ansagen` (A-051) | die erzeugten Ansagen (MP3) + `manifest.json`, öffentlich lesbar | keine Personendaten (feste Sätze); Abruf über unsere Adresse `/audio/durchatmen/…` | wie oben | wie oben |
| Resend (Plus Five Five Inc.) | Empfang „Mails an Mia“ (und ggf. Anmelde-Mails – **bitte prüfen**, ob Supabase-Mails über Resend laufen) | weitergeleitete Mails (nur auf dem Weg) | **bitte prüfen** (EU-Region wählbar?) | ja, DPA |
| Bright Sky (DWD-Daten) | Wetter (Vorhersage, Station, Regenradar am Ort) | Ortsname | **bitte prüfen** (offenes Projekt, Daten vom DWD) | nein (keine Personendaten außer IP der Server-Funktion) |
| Open-Meteo | Wetter-Ersatz, Ortssuche | Ortsname | Schweiz/EU | nein |
| OpenStreetMap Nominatim | Ort aus Standort (nur bei „Meinen Standort verwenden“) | auf 2 Nachkommastellen gerundete Koordinaten (≈1 km) | Großbritannien/EU (OSMF) | nein; Nutzungsregeln beachten. Bleibt, weil Open-Meteo keine Rückwärtssuche hat |
| Kalender-Abo-Quellen (Apple iCloud, Google, Outlook, Todoist) | fremde Termine anzeigen | der geheime Link (Abruf über unseren Server) | Anbieter der Person | nein (die Person nutzt ihren eigenen Dienst) |
| Kreis Ostholstein (öffentlicher Veranstaltungskalender, www.kreis-oh.de) | „Was los?“: Veranstaltungen in der Umgebung (A-055). Unser Server holt die Liste einmal täglich um 5 Uhr allgemein ab (Vercel-Cron, User-Agent „Mia-App (mia.karamba-eis.de)“, robots.txt, höchstens 1 Anfrage pro Sekunde); die App lädt nur von unserem Server | keine Nutzerdaten an den Kreis – nur die Anfrage unseres Servers (Frankfurt) | Deutschland | nein (öffentliche Quelle; Angaben ohne Gewähr, Sperrliste für einzelne Einträge) |
| Tipps-Quelle (Tourismus-Kalender SH, `TIPS_SOURCE`) | alte Tipps-Ebene, seit A-055 versteckt | keine Personendaten | Deutschland | nein |
| Browser-Spracherkennung | Sprechen statt tippen (ohne ElevenLabs bzw. als Ersatz) | gesprochener Ton | Chrome/Android → Google; Safari/iOS → Apple (teils auf dem Gerät) | nein, aber in der Datenschutzerklärung nennen |
| Browser-Vorlesen | Mia liest vor („Stimme des Handys“ bzw. als Ersatz) | Text | meist auf dem Gerät (Systemstimmen) | nein |
| Web-Push (Apple, Google, Mozilla) | Erinnerungen | verschlüsselter Inhalt | USA | nein, in der Datenschutzerklärung nennen |
| Google Fonts | – | – | – | zur Laufzeit nicht genutzt: next/font lädt die Schrift beim Bauen und liefert sie selbst aus |

Keine Werbe-, Analyse- oder Tracking-Dienste.
