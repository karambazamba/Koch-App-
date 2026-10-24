# Datenkarte (Stand v0.90)

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
| Notizen | Gerät (mit Konto: Familie bzw. Arbeit über `entries`) | festhalten | bis gelöscht | wie Raum | lit. b |
| Pinnwand-Nachrichten | Gerät; mit Konto Server | Absprachen | 24 Std. sichtbar, dann aufgeräumt | Familie | lit. b |
| Sprachnachrichten (Ton) | IndexedDB; mit Konto Supabase Storage „memos“ | Pinnwand | 24 Std.; Server räumt täglich auf (`/api/memos/aufraeumen`) | Familie | lit. b |
| Chat mit Mia | nur im Arbeitsspeicher der offenen Seite | Gespräch | bis die Seite geschlossen wird – nie gespeichert | niemand außer der Person; Inhalt geht pro Anfrage an Anthropic | lit. a (KI-Einwilligung, ab 23b) |
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
| KI-Verbrauch (`wasgibts.verbrauch`) | Gerät, nur Zahlen | Tageslimit, Guthaben | 62 Tage | nur Gerät | lit. f |
| Zugangscode, Geräte-Kennung | Gerät | Tageslimit | bis gelöscht | nur Gerät; Kennung geht als Zahl an den Server (Limit) | lit. f |
| Server-Logs (Vercel) | Vercel | Fehler finden | laut Vercel-Plan **bitte prüfen** | Betreiber | lit. f; enthalten nur Technik (Dauer, Kosten, Fehlercode) – Test `tests/app/datenschutz.test.ts` |
| Einwilligungen | Server (`einwilligungen`, ab 23b) | Nachweis | solange Konto besteht | nur die Person | Art. 7 Abs. 1 |

Nicht gespeichert: Rohmails, Chat-Verläufe, GPS-Koordinaten, Werbe- oder
Tracking-Kennungen. Keine Analyse-Werkzeuge, keine Tracker.
