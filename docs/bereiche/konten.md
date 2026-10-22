# Konten und gemeinsamer Haushalt

Kurz: Mit einem Konto (Supabase) teilt sich eine Familie einen Haushalt.
Anmelden immer per E-Mail-Code (6 Ziffern), nie per Link. Ohne Konto – und
ohne Supabase-Variablen – läuft die App wie bisher komplett auf dem Gerät.

Etappen: **3a Anmeldung und Haushalt (fertig)** · 3b Synchronisieren ·
3c Sprachmemos teilen · 3d Sichtbar machen (wer hat was eingetragen).

## FESTE REGELN

- Lokal zuerst: Ohne Konto und offline geht alles wie bisher. Konten zeigen
  sich nur, wenn der Server sagt, dass sie eingerichtet sind.
- Schlüssel nur aus Vercel-Variablen, zur Laufzeit gelesen
  (`src/lib/konten/serverEnv.ts`). Der geheime Schlüssel
  (`SUPABASE_SERVICE_ROLE_KEY` bzw. `SUPABASE_SECRET_KEY`) nur auf dem Server
  (`serverEnv.ts`, `app/api/…`) – Test `tests/app/regeln.test.ts`; nach dem
  Bauen `.next/static` durchsuchen. Nie loggen.
- Jede Tabelle mit Row Level Security; Zugriff nur für Mitglieder des eigenen
  Haushalts. „Arbeit“ nur für den Besitzer (ab 3b, Tabelle `entries`).
- Kinder dürfen nicht einladen und den Haushalt nicht ändern; niemand kann
  sich selbst eine andere Rolle geben (Spalten-Rechte).
- Migrationen nur in `supabase/migrations/` – sie laufen beim Merge nach
  `main` automatisch (GitHub-Anbindung von Supabase). Nie SQL von Hand
  einfügen lassen. Migrationen sind wiederholbar (`if not exists`,
  `create or replace`).
- Nie Daten verlieren: Abmelden fragt „Auf dem Handy behalten“ / „Vom Handy
  löschen“; Konto löschen lässt die Daten auf dem Handy.
- Datenschutz: so wenig wie nötig – E-Mail, Anzeigename, Rolle. Einladungs-
  Codes nur als Hash. „Meine Daten exportieren“ und „Konto löschen“ in
  Daten & App.

## Wo im Code

- Modell (rein): `src/lib/konten/model.ts` – Codes (`normalizeInviteCode`,
  `formatInviteCode`, `inviteShareText`), `isEmail`, `otpDigits`,
  `friendlyError` (Fehler als Satz).
- Verbindung: `src/lib/konten/backend.ts` – `useCloudMode()` (lädt Supabase
  nicht), `getBackend()`; Supabase erst bei Bedarf
  (`supabaseBackend.ts`, `signInWithOtp` + `verifyOtp`, Sitzung unter
  `wasgibts.konto`). Test-Backend für den Durchklick.
- Zustand: `src/lib/konten/account.ts` (`useAccount`, Anmelden, Haushalt,
  Einladen, Abmelden, Konto löschen, Export); letzter bekannter Stand
  `cache.ts` (`wasgibts.haushalt`, `cloudSync()`, `useCachedAccount`).
- Server: `/api/konto/config` (Modus `supabase` mit öffentlicher URL und
  Schlüssel, `test` oder `aus`), `/api/konto/loeschen` (prüft die Sitzung und
  löscht mit dem geheimen Schlüssel), `/api/test-konten` (nur mit
  `KONTEN_TEST=1` und nie in Produktion; `testServer.ts` mit denselben
  Regeln wie die Datenbank).
- Oberfläche: `src/components/konten/` – `/konto` (`KontoView`),
  `LoginSteps`, `HouseholdChoice`, `HouseholdCard` (+ `InviteSheet`),
  `FamilyConnectCard` (Einstellungen oben), `AccountDataSection` (Daten & App).
  Hallo-Bildschirm: „Anmelden“ unter „Daten wiederherstellen“
  (`/konto?von=hallo`). Familie → „Jemanden einladen“ (`/konto?einladen=1`).
- Datenbank: `supabase/migrations/20261022120000_konten_haushalt.sql` –
  `households`, `members` (ein Haushalt je Konto), `invites` (Code-Hash, 7
  Tage, einmal), `invite_attempts` (höchstens 10 Fehlversuche je Stunde),
  `profiles`; Funktionen `create_household`, `create_invite`,
  `join_household` (Fehler als jsonb, damit Fehlversuche gezählt bleiben),
  `leave_household`; leerer Haushalt wird gelöscht.

## Verhalten

- Anmelden: E-Mail → „Code schicken“ → Ziffernfeld
  (`autocomplete="one-time-code"`, prüft bei 6 Ziffern selbst) → „Code neu
  senden“ nach 60 s. Falscher oder abgelaufener Code: „Der Code stimmt nicht
  oder ist abgelaufen – nochmal versuchen oder neu senden.“
- Danach: „Neuen Haushalt anlegen“ (Name aus dem Profil vorgeschlagen) oder
  „Mit Code beitreten“ (z. B. 4K7-P2Q, Groß/Klein und Bindestrich egal).
- Einladen (nur Erwachsene): Erwachsene/Kind → Code (7 Tage, einmal) →
  Teilen: „Komm in unseren Haushalt bei Was gibt’s? Code: 4K7-P2Q“.
- Bis 3b werden noch keine Einträge geteilt – die Daten bleiben auf dem
  Gerät; die Übernahme mit Vorschau kommt mit dem Synchronisieren.

## Einrichtung (Vercel/Supabase)

- Variablen (von der Vercel-Marketplace-Anbindung gesetzt, nichts selbst
  anlegen): `NEXT_PUBLIC_SUPABASE_URL` oder `SUPABASE_URL`;
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `…_PUBLISHABLE_KEY` (bzw. ohne
  `NEXT_PUBLIC_`); geheim `SUPABASE_SERVICE_ROLE_KEY` oder
  `SUPABASE_SECRET_KEY`.
- Offen bei Felix: Resend-Domain „Verified“ (sonst kommen Mails nur
  eingeschränkt an), `CRON_SECRET` (für 3c).

## Tests

- `npm run test:datenbank` – echtes Postgres (lokal, mit Nachbau der
  Supabase-Rollen): Migration zweimal, dann `tests/datenbank/*.test.sql`
  (fremder Haushalt sieht nichts, Kind darf nicht einladen und sich nicht
  befördern, Codes benutzt/abgelaufen/unbekannt, Fehlversuche, anonym
  nichts, Konto löschen).
- `tests/konten/konten.test.ts` – Codes, Texte, Test-Backend, Variablen.
- Durchklick `konten` – zwei bzw. drei Browser: anmelden (Code über die
  Test-Schnittstelle), Haushalt, Einladen, Beitreten, Kind ohne Einladen,
  Abmelden (Daten bleiben), Konto löschen.
