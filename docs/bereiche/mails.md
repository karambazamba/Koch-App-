# Mails an Mia (seit v0.89)

## Feste Regeln (aus CLAUDE.md umgezogen)

- **Mails an Mia:** nur Vorschläge mit „Übernehmen“, nie die Rohmail
  speichern (Domain, Betreff, Auszug ≤ 300), 7 Tage; nur Weitergeleitetes von
  Mitgliedern, Webhook-Signatur (`RESEND_WEBHOOK_SECRET`) immer prüfen.
  → `docs/bereiche/mails.md`


Mails von Kita, Schule oder Verein an Mia weiterleiten – Mia macht daraus
Vorschläge (Termin, Aufgabe, Einkauf), die man mit „Übernehmen“ einträgt.
Mia sieht nie ein Postfach, nur was jemand selbst weiterleitet. Baustein
„Mails weiterleiten“ (`mails`, aus), nur mit Konto.

## FESTE REGELN
- Nichts wird automatisch eingetragen – immer Vorschlag mit „Übernehmen“.
- Gespeichert wird nie die Rohmail: nur Absender-Domain, Betreff, Auszug
  (≤ 300 Zeichen), Vorschläge, Namen der Anhänge. Vorschläge verfallen nach
  7 Tagen, „angekommen ohne Vorschlag“ und Bestätigungs-Codes nach 24 Std.
- Angenommen wird nur, was sicher ist: Signatur des Webhooks geprüft
  (`RESEND_WEBHOOK_SECRET`, Svix), an eine aktive Adresse, weitergeleitet von
  jemandem aus der Familie (bei „Arbeit“ nur von der Person selbst), SPF/DKIM
  nicht fehlgeschlagen, keine Werbung/Newsletter (außer gelernte Absender),
  höchstens 5 MB, höchstens 30 Mails pro Familie und Tag. Alles andere wird
  still angenommen (200) und verworfen – nichts protokolliert.
- Adressen: Familie `familie-<name>-<4>@<Domain>` (nur Erwachsene holen sie),
  Arbeit `<vorname>-arbeit-<4>@<Domain>` (nur die Person). „Adresse ändern“
  macht eine neue, die alte nimmt nichts mehr an.
- Geschrieben wird nur vom Server (geheimer Schlüssel, nur in der API-Route);
  lesen, verwerfen, entscheiden über RLS (`mail_visible`: Familie für alle
  Mitglieder, Arbeit nur die Person).

## Wo im Code
- `src/lib/mails/eingang.ts` – Mail lesen: Original-Absender aus dem
  weitergeleiteten Teil (Gmail, Apple Mail, Outlook), Werbung, Bestätigung
  der Weiterleitung (Gmail/Outlook-Code), Prüfung `checkMail`. Rein.
- `src/lib/mails/vorschlag.ts` – Sätze → Vorschläge (`parseCalendar`, Ort,
  Einkauf), `mailThema` für die Jetzt-Karte. Rein.
- `src/lib/mails/lernen.ts` – Absender zählen (Domain bzw. ganze Adresse bei
  Freemailern), einmal fragen (2. Mail + schon etwas übernommen), Gmail-Suche
  und Filter-Datei. Rein.
- `src/lib/mails/adresse.ts` – Domain (`NEXT_PUBLIC_MAIL_DOMAIN`, Standard
  `mia.karamba-eis.de`), lokaler Teil, Empfänger erkennen. Rein.
- `src/lib/mails/verarbeiten.ts` – was mit einer Mail passiert (für Webhook
  und Test-Backend gleich), `mailAusWebhook` (Resend-Format).
- `src/lib/mails/svix.ts` – Signatur prüfen (nur Server).
- `src/lib/mails/anleitung.ts` – Schritte je Postfach. Rein.
- `src/lib/mails/konto.ts` – App: laden, übernehmen (mit Rückgängig),
  verwerfen, Absender entscheiden.
- `src/app/api/mail/eingang/route.ts` – Webhook (Resend „email.received“).
- Oberfläche: `components/mails/MailsAnMiaView.tsx` (/profil/mails-an-mia),
  `components/mails/MailsView.tsx` (/mails „Aus euren Mails“), Thema `mail`
  auf der Jetzt-Karte.
- Datenbank: `supabase/migrations/20261029120000_mails_an_mia.sql` (Tabellen
  `mail_addresses`, `mail_items`, `mail_senders`; Funktionen `mail_address`,
  `mail_sender_decide`, `mail_sender_accepted`), Tests
  `tests/datenbank/mails.test.sql`.
- Test-Backend: Aktionen `mail_address`, `mail_eingang`, `mail_items`,
  `drop_mail_item`, `mail_senders`, `mail_sender` in `konten/testServer.ts`.

## Verhalten
- Einstellungen → „Mails an Mia“ (mit Baustein): Adresse mit „Kopieren“ und
  „Adresse ändern“, Anleitung (einzeln weiterleiten; automatisch je Gmail,
  Outlook, Apple Mail, Andere – das Postfach wird aus der Konto-Mail
  geraten), „Automatisch an Mia“ mit Ja/Nein je Absender, Gmail-Suchtext und
  Filter-Datei zum Importieren.
- Jetzt-Karte: „2 Vorschläge aus Mails“ bzw. „Gmail-Code: …“ (nicht nachts),
  Öffnen → /mails.
- /mails: je Mail eine Karte (Domain, Betreff, Auszug, Anhänge), Vorschläge
  zum Abwählen, „Übernehmen“ → „Eingetragen: … · Rückgängig“, „Verwerfen“.
  Ganz oben höchstens eine Frage „Von Kita Sonnenschein kommt öfter was. Soll
  ich deren Mails künftig automatisch bekommen?“ – „Nein danke“ = nie wieder.
- Leer: „Hier landet, was ihr weiterleitet.“

## Einrichten (wartet auf Felix)
1. resend.com → Konto → Domains → `mia.karamba-eis.de` hinzufügen, „Receiving“
   (Empfangen) einschalten.
2. Bei Hostinger (DNS von karamba-eis.de): den MX-Eintrag für
   `mia.karamba-eis.de` genau so anlegen, wie Resend ihn anzeigt (Wert und
   Priorität kopieren). Die Hauptdomain bleibt unberührt.
3. Resend → Webhooks → „Add endpoint“: URL `https://<deine-app>/api/mail/eingang`,
   Ereignis `email.received`. Das angezeigte Signing Secret (`whsec_…`)
   in Vercel als Umgebungsvariable `RESEND_WEBHOOK_SECRET` (Typ Secret)
   eintragen – nie ins Repo, nie in den Chat.
4. Optional andere Domain: `NEXT_PUBLIC_MAIL_DOMAIN` in Vercel setzen.
5. Neu ausliefern. Test: an die Adresse aus den Einstellungen eine Mail
   weiterleiten – nach ein paar Sekunden steht der Vorschlag in der App.

Bitte prüfen: Resend liefert im Webhook je nach Version den Text der Mail
direkt mit oder nur eine Kennung zum Nachladen. Die Route liest `text`/`html`
aus `data`; kommt dort nichts an, braucht es zusätzlich `RESEND_API_KEY`
zum Nachladen (kleine Ergänzung in der Route).

## Tests
- `tests/mails/mailEingang.test.ts` – Weiterleitungen, Prüfung, Bestätigung,
  Kita-Vorschläge, Adressen, Lernen, Filter, Signatur.
- `tests/mails/mailKonto.test.ts` – Test-Backend (Familie/Arbeit, verwerfen,
  lernen, Adresse ändern, Tageslimit), Anleitung, Jetzt-Karte.
- `tests/datenbank/mails.test.sql` – RLS und Funktionen gegen Postgres.
- Durchklick `mailsAnMia` (`e2e/ablaeufe/mails.mjs`).
