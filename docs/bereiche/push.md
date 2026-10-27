# Erinnerungen & Mitteilungen (Push)

Kurz: Erinnerungen wie bei Termin-Apps (Tafel 77). Eine Erinnerung ist eine
Uhrzeit an einem Termin oder einer Aufgabe – keine eigene Kachel. Sie kommt
als Mitteilung aufs Handy, wenn erlaubt; sonst oben auf Heute (Jetzt-Karte).
Nichts geht verloren.

## FESTE REGELN

- NIE beim ersten Start nach Mitteilungen fragen. Mia fragt im passenden
  Moment (erster Termin mit Uhrzeit aus der Schnelleingabe, erste
  Pinnwand-Nachricht mit Haushalt) mit eigener Frage VOR der Systemabfrage
  („Soll ich dich erinnern?“ – „Ja, gern“ / „Lieber nicht“). Erst nach „Ja,
  gern“ die Systemabfrage (im Tipp – Pflicht bei iOS).
- iPhone im Safari-Tab kann keine Mitteilungen: statt Abfrage die Anleitung
  „Mia auf den Homescreen legen“.
- Abgelehnt: nicht nerven. Höchstens 1 erneute Frage nach 14 Tagen.
  Einstellungen → „Mitteilungen“ zeigt Status und Anleitung.
- Höchstens 1 proaktive Mitteilung pro Tag (selbst gestellte Erinnerungen
  zählen nicht), Ruhe 20–7 Uhr (außer selbst gestellte Erinnerung), Pause =
  absolute Ruhe, Ruhe nach Feierabend: nichts zu Arbeit/Aufgaben
  (`pushAllowed` in `src/lib/heute/push.ts`). Keine Druck-Wörter.
- Absender Mia, Text kurz: „In 30 Min: Zahnarzt Jonne · 16:00 · Praxis
  Dr. Krüger“. Antippen öffnet den Tag des Eintrags.
- Emojis nie in Chips: die Glocke ist ein Linien-Icon (lucide `Bell`).

## Wo im Code

- Zeitpunkte und Texte (rein): `src/lib/heute/mitteilungen/erinnerungen.ts`
  (`reminderFor`, `remindersBetween`, `dueNow`, `remindersToSend`, `pauseOn`,
  `quickReminderLabel`).
- Einstellungen und „wann fragen“: `src/lib/heute/mitteilungen/einstellungen.ts`
  (`askDecision`, `askText`, `notifyStatusLabel`, Speicher
  `wasgibts.mitteilungen` v1, pro Gerät, nicht in der Sicherung).
- Gerät: `src/lib/heute/mitteilungen/geraet.ts` (`notifyPermission`,
  `requestNotifyPermission`, `showNotify`, `askForNotifications`).
- Oberfläche: `src/components/heute/mitteilungen/NotifyHost.tsx` (Frage +
  Erinnerungen alle 30 s, solange die App offen ist), `NotifyAsk.tsx`,
  Einstellungen `src/components/einstellungen/settings/NotifySettingsView.tsx`
  (`/profil/mitteilungen`). Service Worker: `notificationclick`, `push`.

## So verhält es sich

- Termine: Standard „30 Min vorher“ (in „Mitteilungen“ änderbar: aus, 10, 30,
  60 Min, am Vorabend), pro Termin an/aus. Ganztägig: 8:00 am Tag. Am
  Vorabend: 19:00 am Tag davor.
- Aufgaben mit Uhrzeit: genau dann.
- Schnelleingabe: bei erkannter Uhrzeit Chip mit Glocke „17:00 erinnern“
  (antippen = „Nicht erinnern“).
- Glocke (13 px) an Terminen und Aufgaben mit Erinnerung (Kacheln, Tag).
- Mia: „Erinnere mich um 17 Uhr an die Wäsche“ → Aufgabe mit Uhrzeit und
  Erinnerung.
- Mitteilungs-Arten: Erinnerungen, Pinnwand, Abgeben, Morgen-Überblick (aus).

## Server-Push (Teil 2, seit v0.82)

- Abo je Gerät: nach der Erlaubnis meldet `syncPushSubscription`
  (`src/lib/heute/mitteilungen/serverPush.ts`) das Gerät an – nur mit Konto
  und Supabase. Mit dem Abo gehen die Einstellungen des Geräts mit (Arten,
  Pause, Tagesablauf, Absender), damit der Server sie beachtet.
- Routen: `GET /api/push/schluessel` (öffentlicher VAPID-Schlüssel; beim
  ersten Aufruf erzeugt der Server Schlüsselpaar und Cron-Zeichen selbst und
  legt sie NUR in `push_config` ab), `POST/DELETE /api/push/abo` (als das
  Konto, RLS), `POST /api/push/senden` (nur mit dem Cron-Zeichen oder
  `CRON_SECRET`).
- Versand jede Minute: pg_cron ruft über pg_net `/api/push/senden` auf
  (Migration `20261027120000_push.sql`; ohne die Erweiterungen bleibt der
  Versand aus und es gilt Teil 1). Planung rein in
  `src/lib/heute/mitteilungen/versand.ts` (`planPushes`): Familien-Termine an
  alle, Arbeit nur Besitzer, Aufgaben nur wer sie hat; Pinnwand und Abgeben
  proaktiv (1 am Tag, nicht 20–7 Uhr, nie Eigenes); nie doppelt
  (`push_gesendet`). Abgelaufene Abos (404/410) werden entfernt.
- Einkauf unterwegs (Einkauf Teil 6): Start/Ende an die anderen; während
  des eigenen geteilten Einkaufs „Lisa hat Milch auf die Liste gesetzt.“ mit
  Knopf „Steh grad davor“ (`davor:<konto>|<sache>`), die Antwort „Felix zu
  Milch: Steh grad davor.“ an die Person, die es draufsetzte. Vom Menschen
  ausgelöst, also nicht proaktiv; nur 7–20 Uhr, nie in der Pause, Schalter
  „Einkauf unterwegs“. Die Route liest dafür zusätzlich frische
  Einkaufs-Einträge (15 Min.) und die Anzeigenamen des Haushalts.
- Gleicher `tag` wie die Mitteilung auf dem Gerät – kommt beides, ersetzt die
  eine die andere.
- Tabellen: `push_abos` (RLS: nur eigene, nur eigener Haushalt),
  `push_config` und `push_gesendet` (nur Service-Rolle). Test:
  `tests/datenbank/push.test.sql`.

## Tests

- `tests/heute/erinnerungen.test.ts` (Zeitpunkte, Texte, Ruhe, Pause, Frage-
  Zeitpunkt, kein Fragen beim ersten Start, Anleitung ohne Homescreen, Chip).
- `tests/heute/pushVersand.test.ts` (wer bekommt was, Pause, 1-pro-Tag, nie doppelt).
- `tests/heute/tagesphasen.test.ts` (`pushAllowed`).
