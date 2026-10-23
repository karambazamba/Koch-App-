# Konten und gemeinsamer Haushalt

Kurz: Mit einem Konto (Supabase) teilt sich eine Familie einen Haushalt.
Anmelden immer per E-Mail-Code (6 Ziffern), nie per Link. Ohne Konto – und
ohne Supabase-Variablen – läuft die App wie bisher komplett auf dem Gerät.

Etappen: **3a Anmeldung und Haushalt** · **3b Synchronisieren** ·
**3c Sprachmemos teilen** (fertig) · 3d Sichtbar machen (wer hat was eingetragen).

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
- Aufgaben sind persönlich (seit v0.65, Migration
  `20261024120000_aufgaben_persoenlich.sql`, Funktion `entry_visible`): eine
  Aufgabe sehen und ändern nur der Besitzer, wer sie bekommen hat
  (`data.fuer` = Konto-ID) und wer sie zuletzt zurückgegeben hat
  (`data.zurueck` – nötig, weil Postgres keine Änderung erlaubt, nach der man
  die Zeile nicht mehr sieht; die App blendet sie dort aus). Seit 3b geteilte
  Aufgaben bleiben beim Ersteller und sind jetzt nur für ihn – nichts wird
  gelöscht. Der Test-Server (`testServer.ts`) spiegelt dieselbe Regel.
  Test: `tests/datenbank/aufgaben.test.sql`.
- Abgleich (3b): neueste Änderung je Eintrag gewinnt; Löschen nur als
  Markierung (`geloescht`), nie hart. Geteilt werden Termine, Aufgaben,
  Notizen, Pinnwand (mit Sprachnachrichten, 3c), Einkaufsliste,
  Wochenplan und Vorrat – Einstellungen, Startseite und Beispiel-Tag nie.
- Übernahme: Beim ersten Mal mit einem Haushalt bleibt alles nur auf dem
  Gerät, bis „Mitnehmen“ getippt ist (Vorschau „3 Termine, 2 Aufgaben …
  werden mitgenommen.“). Ohne eigene Daten geht es ohne Frage los.
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
  Hallo-Bildschirm: vorerst KEIN Anmelden-Link (Präsentations-Check – erst mit
  Tafel 22); „Familie verbinden“ nur in den Einstellungen. Familie →
  „Jemanden einladen“ (`/konto?einladen=1`).
- Anmelden-Seiten (Tafel 20, nicht mehr von der Begrüßung verlinkt; wird mit
  Tafel 22 ersetzt): `WelcomeLogin` auf `/anmelden` und
  `/beitreten?code=…` (`JoinLink`) – ruhige Seiten im Stil des
  Hallo-Bildschirms, Zurück jederzeit: E-Mail → Code (ein Feld,
  `inputmode=numeric`, `autocomplete="one-time-code"`, prüft bei 6 Ziffern
  selbst, „Neuen Code senden in 0:60“, falscher Code: freundlicher Satz, Feld
  leer) → „Angemeldet ✓ – Wie wollt ihr starten?“ → anlegen/beitreten →
  Startseite, die Begleitung fliegt in die Jetzt-Karte. „Was schon auf diesem
  Handy ist, nehmen wir mit.“ = Übernahme ohne weitere Frage
  (`startSyncTakingOver`). Der Einladungs-Text enthält den Link
  `…/beitreten?code=4K7-P2Q`; wer ihn ohne Konto öffnet, landet bei
  „Anmelden“, der Code ist danach schon eingetragen.
- Datenbank: `supabase/migrations/20261022120000_konten_haushalt.sql` –
  `households`, `members` (ein Haushalt je Konto), `invites` (Code-Hash, 7
  Tage, einmal), `invite_attempts` (höchstens 10 Fehlversuche je Stunde),
  `profiles`; Funktionen `create_household`, `create_invite`,
  `join_household` (Fehler als jsonb, damit Fehlversuche gezählt bleiben),
  `leave_household`; leerer Haushalt wird gelöscht.

- Abgleich: `src/lib/konten/sync/` – `docs.ts` (Übersetzer je Speicher in
  einzelne Einträge und zurück, verlustfrei; Fingerabdruck; Vorschau-Text),
  `engine.ts` (rein: Änderungen erkennen, Warteschlange, Einspielen nach
  „neueste gewinnt“, Übernahme mit Zusammenführen der Listen-Einstellungen),
  `runner.ts` (Browser: nach dem Speichern 0,7 s warten, hochladen, holen;
  Realtime bzw. im Test alle 2 s; Wiederholen nach 15 s, sonst jede Minute),
  `status.ts` (klein, für die Oberfläche). Stand in `wasgibts.abgleich`
  (nur Fingerabdrücke, Warteschlange, Übernahme erledigt).
  Oberfläche: `SyncRunner` (im Layout, lädt den Abgleich nur mit Haushalt;
  Hinweis „Offline – wird gleich abgeglichen“ erst nach > 1 Min. und nur, wenn
  etwas wartet), `TakeoverCard` (auf /konto).
- `localStore.ts`: `onLocalSave` (Bescheid bei jedem Speichern) und
  `notifyStore` (Anzeigen neu laden, wenn der Abgleich geschrieben hat).
- Datenbank 3b: `supabase/migrations/20261023120000_eintraege_abgleich.sql` –
  `entries` (household_id, id, typ, raum, besitzer, erstellt, geaendert,
  geloescht, data jsonb, rev), RLS (Familie für alle im Haushalt, Arbeit nur
  Besitzer, kein hartes Löschen, Besitzer/rev nicht änderbar),
  `sync_entries` (je Eintrag „neueste gewinnt“, Abgelehntes hält den Rest
  nicht auf), Realtime-Veröffentlichung; wer geht, nimmt seine „Arbeit“ mit.

## Verhalten

- Anmelden: E-Mail → „Code schicken“ → Ziffernfeld
  (`autocomplete="one-time-code"`, prüft bei 6 Ziffern selbst) → „Code neu
  senden“ nach 60 s. Falscher oder abgelaufener Code: „Der Code stimmt nicht
  oder ist abgelaufen – nochmal versuchen oder neu senden.“
- Danach: „Neuen Haushalt anlegen“ (Name aus dem Profil vorgeschlagen) oder
  „Mit Code beitreten“ (z. B. 4K7-P2Q, Groß/Klein und Bindestrich egal).
- Einladen (nur Erwachsene): Erwachsene/Kind → Code (7 Tage, einmal) →
  Teilen: „Komm in unseren Haushalt bei Mia. Code: 4K7-P2Q“.
- Abgleich: Änderungen gehen kurz nach dem Speichern raus; was andere ändern,
  kommt per Realtime sofort. Offline geht alles weiter, die Warteschlange
  bleibt auf dem Gerät und geht beim nächsten Netz mit.
- Abmelden/Konto löschen vergisst den Stand des Abgleichs (die Daten bleiben);
  beim nächsten Anmelden fragt die Übernahme wieder – gleiche Einträge werden
  dabei nicht doppelt angelegt (gleiche Kennung).
- Bekannte Grenzen: Wird ein Familien-Eintrag zu „Arbeit“, behalten die
  anderen ihre letzte Familien-Fassung. Gleichzeitiges Abhaken von
  Rezept-Zutaten derselben Woche: die spätere Änderung gewinnt (eigene
  Zeilen der Liste sind einzeln und kommen sich nicht in die Quere).

## Einrichtung (Vercel/Supabase)

- Variablen (von der Vercel-Marketplace-Anbindung gesetzt, nichts selbst
  anlegen): `NEXT_PUBLIC_SUPABASE_URL` oder `SUPABASE_URL`;
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `…_PUBLISHABLE_KEY` (bzw. ohne
  `NEXT_PUBLIC_`); geheim `SUPABASE_SERVICE_ROLE_KEY` oder
  `SUPABASE_SECRET_KEY`.
- Mails: Resend-SMTP, Absender mia@karamba-eis.de (Domain karamba-eis.de
  verifiziert), Absendername „Mia“, Betreff „Dein Code für Mia: {{ .Token }}“ (Vorlage: `docs/mail-vorlage.md`), Code 6-stellig, 900 s
  gültig, höchstens 30 Mails pro Stunde.
- Echter Mail-Test (von Hand, nicht im Durchklick – der nutzt das
  Test-Backend): in der App auf /konto eine echte Adresse eingeben, prüfen,
  dass Betreff und 6-stelliger Code ankommen, Code eingeben.
- Offen bei Felix: `CRON_SECRET` (für 3c – ohne räumt die App auf).

## Sprachnachrichten teilen (3c, seit v0.79)

- Ton in Supabase Storage, Bucket `memos` (privat, höchstens 2 MB, nur Ton),
  Pfad `<haushalt>/<memo-id>.m4a|webm|ogg` (`memoPath` in
  `src/lib/konten/memoShare.ts`). Migration
  `supabase/migrations/20261026120000_memos_teilen.sql`: lesen und löschen
  nur Mitglieder des Haushalts (`memo_household(name)` + `is_member`),
  ablegen nur in den eigenen Haushalt, falsche Pfade (`..`, Unterordner,
  keine Ton-Endung) nie. Test: `tests/datenbank/memos.test.sql`.
- Ablauf: Vor jedem Abgleich lädt der Runner den Ton neuer Memos hoch
  (`uploadPendingMemos`) und vermerkt `storagePath` am Memo – erst dann wird
  das Memo geteilt (Übersetzer `pinnwand` in `sync/docs.ts`; Memos ohne Pfad
  bleiben nur auf dem Gerät und gehen beim Einspielen nicht verloren).
  Auf den anderen Geräten holt `memoAudio` den Ton beim ersten Abspielen
  (`setMemoRemote`) und legt ihn in IndexedDB ab. „Gehört von“ und
  Reaktionen gehen mit dem Eintrag.
- Lebensdauer wie bisher: 24 Std. ab der Aufnahme (Tafel 72, statt „24 Std.
  nach alle gehört“ aus dem Konten-Auftrag). Dateien älter als 25 Std. räumt
  `/api/memos/aufraeumen` täglich weg (Vercel Cron 3:30 UTC, nur mit
  `CRON_SECRET`, geheimer Schlüssel nur dort). Zusätzlich räumt die App
  einmal je Start ihren Haushalt auf (`tidyMemoFiles` im Runner) – so klappt
  es auch ohne `CRON_SECRET`.
- Test-Backend: `upload_memo`, `download_memo`, `list_memos`, `remove_memos`
  mit denselben Regeln. Tests: `tests/konten/memosTeilen.test.ts`.

## Tests

- `npm run test:datenbank` – echtes Postgres (lokal, mit Nachbau der
  Supabase-Rollen): Migration zweimal, dann `tests/datenbank/*.test.sql`
  (fremder Haushalt sieht nichts, Kind darf nicht einladen und sich nicht
  befördern, Codes benutzt/abgelaufen/unbekannt, Fehlversuche, anonym
  nichts, Konto löschen).
- `tests/konten/konten.test.ts` – Codes, Texte, Test-Backend, Variablen.
- `tests/konten/abgleich.test.ts` – Übersetzer verlustfrei, Konflikt,
  Löschen, offline → online, keine doppelte Übernahme, Zusammenführen.
- `tests/datenbank/eintraege.test.sql` – Arbeit nur Besitzer, Fremde sehen
  nichts, neueste gewinnt, Löschen nur Markierung, Verlassen nimmt Arbeit mit.
- Durchklick `abgleich` – A nimmt seine Daten mit (Vorschau), B tritt bei und
  sieht Termin und Pinnwand, B schreibt → A sieht es, B offline → online.
- Durchklick `begruessung` – Begrüßung → Anmelden → Code (falsch, Zurück,
  richtig) → Haushalt anlegen → Startseite; B öffnet den Einladungs-Link,
  Code ist eingetragen; ohne Konten-Variablen kein „Anmelden“.
- Durchklick `konten` – zwei bzw. drei Browser: anmelden (Code über die
  Test-Schnittstelle), Haushalt, Einladen, Beitreten, Kind ohne Einladen,
  Abmelden (Daten bleiben), Konto löschen.
