# Konten und gemeinsamer Haushalt

## Feste Regeln (aus CLAUDE.md umgezogen)

- **Konten (Supabase):** Anmelden nur per E-Mail-Code (`signInWithOtp` +
  `verifyOtp`), nie per Link. Geheimer Schlüssel nur auf dem Server, nie im
  Client/Repo/Log. Jede Tabelle mit RLS (nur eigener Haushalt, „Geschäftlich“
  (intern arbeit) nur Besitzer). Migrationen nur in `supabase/migrations/`, laufen beim Merge;
  nie SQL von Hand. Lokale Daten bleiben, bis die Übernahme bestätigt ist.
  Abgleich: neueste Änderung je Eintrag gewinnt, Löschen nur als Markierung;
  neue geteilte Daten = Übersetzer in `src/lib/konten/sync/docs.ts`.
  → `docs/bereiche/konten.md`


Kurz: Mit einem Konto (Supabase) teilt sich eine Familie einen Haushalt.
Anmelden immer per E-Mail-Code (6 Ziffern), nie per Link. Ohne Konto – und
ohne Supabase-Variablen – läuft die App wie bisher komplett auf dem Gerät.

Etappen: **3a Anmeldung und Haushalt** · **3b Synchronisieren** ·
**3c Sprachmemos teilen** · **3d Sichtbar machen** (alle fertig).

## FESTE REGELN

- Lokal zuerst: Ohne Konto und offline geht alles wie bisher. Konten zeigen
  sich nur, wenn der Server sagt, dass sie eingerichtet sind.
- Schlüssel nur aus Vercel-Variablen, zur Laufzeit gelesen
  (`src/lib/konten/serverEnv.ts`). Der geheime Schlüssel
  (`SUPABASE_SERVICE_ROLE_KEY` bzw. `SUPABASE_SECRET_KEY`) nur auf dem Server
  (`serverEnv.ts`, `app/api/…`) – Test `tests/app/regeln.test.ts`; nach dem
  Bauen `.next/static` durchsuchen. Nie loggen.
- Jede Tabelle mit Row Level Security; Zugriff nur für Mitglieder des eigenen
  Haushalts. „Geschäftlich“ (intern `arbeit`) nur für den Besitzer (ab 3b,
  Tabelle `entries`). Es gibt genau zwei Räume (A-021); den Raum „ich“ aus
  A-020 gab es nur vor dem Ausliefern, seine Migration ist gelöscht.
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
- Erledigte Aufgaben gehen nach 12 Stunden still (A-043, `kalender/erledigt.ts`):
  das Gerät löscht sie lokal, der Abgleich schickt wie beim Löschen die
  Markierung – alle Geräte gleich, mehrfaches Aufräumen ändert nichts mehr.
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
  geloescht, data jsonb, rev; raum familie/arbeit), RLS (Familie für alle im Haushalt, Arbeit nur
  Besitzer, kein hartes Löschen, Besitzer/rev nicht änderbar),
  `sync_entries` (je Eintrag „neueste gewinnt“, Abgelehntes hält den Rest
  nicht auf), Realtime-Veröffentlichung; wer geht, nimmt seine „Arbeit“ mit
  (`drop_work_entries`). Der Übersetzer (`sync/docs.ts`, `roomOf`) lädt Arbeit nie
  als Familie hoch (ein „ich“ aus Testständen wird Arbeit, nie Familie);
  Test-Backend (`testServer.ts`) und Push (`versand.ts`) prüfen `nurBesitzer`.
  Kalender-Übersetzer v4 (A-021): Etikett „Privat“ nur von „lokal“ wird Familie.

## Verhalten

- Anmelden: E-Mail → „Code schicken“ → Ziffernfeld
  (`autocomplete="one-time-code"`, prüft bei 6 Ziffern selbst) → „Code neu
  senden“ nach 60 s. Falscher oder abgelaufener Code: „Der Code stimmt nicht
  oder ist abgelaufen – nochmal versuchen oder neu senden.“
- Danach (seit v0.88): keine Frage – die Familie wird still angelegt bzw.
  per Einladungs-Link beigetreten (siehe „Anmelden wie man es kennt“).
- Einladen (nur Erwachsene): per Link, 14 Tage, mehrfach nutzbar. Codes
  (7 Tage, einmal) gibt es nur noch für alte Links.
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

## Anmelden wie man es kennt (Tafel 22, seit v0.88)

- Starten ohne Konto; ein Konto erst, wenn man teilen will. In der
  Oberfläche gibt es die Wörter „Haushalt“ und „Familien-Code“ nicht mehr
  (Test in `tests/app/regeln.test.ts`).
- Begrüßung: nur mit Konten klein „Schon ein Konto? Anmelden“ (→ `/anmelden`,
  „Willkommen zurück“). „Daten wiederherstellen“ steht in Einstellungen →
  Daten & App.
- EIN Anmelde-Ablauf (`WelcomeLogin`): „Mit Apple fortfahren“ / „Mit Google
  fortfahren“ nur mit Schalter (`NEXT_PUBLIC_AUTH_APPLE=1`,
  `NEXT_PUBLIC_AUTH_GOOGLE=1`, `lib/konten/oauth.ts`; Start: nur E-Mail),
  dann „Mit E-Mail fortfahren“ → E-Mail → 6-stelliger Code. „Kein Passwort
  nötig. Kostenlos.“ Apple/Google per Supabase OAuth mit PKCE, Rückkehr auf
  `/auth/callback` (`OAuthCallback`, Prüfwert unter `wasgibts.konto-pkce`,
  Rückkehr-Ziel unter `wasgibts.anmelden-zurueck`, nur eigene Seiten).
  Der Apple-Knopf ist weiß mit Rand (Leitbild: Knöpfe nie schwarz).
- Nach dem Anmelden keine Frage: Familie wird still angelegt („Familie
  <Nachname aus dem Profil>“, sonst „Familie <Vorname>“, `familyNameFor`,
  `ensureFamily`; umbenennbar). Was auf dem Handy ist, kommt wie bisher über
  die Übernahme mit.
- Einladen per Link (`InviteSheet`): „Familie einladen“ → Erwachsene/Kind →
  „Einladungs-Link erstellen“ → Teilen-Menü „Komm zu uns in „Mia“ 🧡
  https://…/e/<token>“. Token zufällig (32 Zeichen), in der Datenbank nur
  der Hash, 14 Tage gültig, mehrfach nutzbar; „Eure Einladungen“ mit
  „Zurückziehen“ (nur Erwachsene). Migration
  `20261028120000_einladen_link.sql`: Tabelle `invite_links` (kein direkter
  Zugriff), `create_invite_link`, `list_invite_links`, `revoke_invite_link`,
  `join_by_link` (Fehlversuche zählen wie beim Code), `invite_link_info`
  (auch ohne Konto: nur Name der einladenden Person und der Familie).
  Test: `tests/datenbank/einladen.test.sql`.
- Einladungsseite `/e/<token>` (Rewrite auf die statische Seite `/einladung`,
  `EinladungView` liest den Token aus der Adresse): „<Name> lädt dich ein.“,
  „Termine, Einkauf und Pinnwand – gemeinsam.“, anmelden → sofort Mitglied →
  Startseite. Schon in einer anderen Familie: „Du bist schon in Familie X.
  Wechseln?“ (Wechseln/Bleiben). Abgelaufen/zurückgezogen: freundliche
  Seite. Vorschau (Open Graph): „Einladung zu Mia“ mit Mia – der Name in
  der Vorschau bräuchte eine dynamische Seite (mit Cache Components später).
- Notfall ohne Link zum Antippen: Familie → klein „Ich wurde eingeladen“ →
  Link einfügen. Alte Code-Links (`/beitreten?code=…`) gehen weiter.
- Startseite: nach 3 Tagen Nutzung (oder mit zweiter erwachsener Person im
  Profil) EINE Karte unter der Jetzt-Karte „Soll Lisa auch sehen, was du
  einträgst?“ → „Familie einladen“ / „Später“ (7 Tage Ruhe, beim zweiten Mal
  nur noch in den Einstellungen; `einladenHinweis.ts`,
  `wasgibts.einladenhinweis`). Nur mit Konten, nicht wenn schon verbunden.
- Mia: „Lade Lisa ein“ → Einladungs-Link (`inviteRule`).
- Noch nicht: Name/Foto von Apple/Google als Vorschlag fürs Profil,
  Apple-Token beim Konto löschen widerrufen (kommt mit dem Apple-Knopf),
  Pinnwand/Einkauf „Mit Familie teilen“, Jetzt-Karte „<Name> hat schon 2
  Termine eingetragen.“

### Einrichten (wartet auf Felix)

Google („Mit Google fortfahren“):
1. console.cloud.google.com → Projekt anlegen → „APIs & Dienste“ →
   „OAuth-Zustimmungsbildschirm“: Extern, App-Name „Mia“, Support-Mail.
2. „Anmeldedaten“ → „Anmeldedaten erstellen“ → „OAuth-Client-ID“ →
   Webanwendung. Autorisierte Weiterleitungs-URI: die Callback-Adresse aus
   Supabase (Authentication → Providers → Google, steht dort zum Kopieren).
3. In Supabase: Authentication → Providers → Google einschalten, Client-ID
   und Client-Secret aus Schritt 2 einfügen, speichern.
4. Supabase → Authentication → URL Configuration: unter „Redirect URLs“
   `https://<deine-app>/auth/callback` eintragen.
5. In Vercel: Umgebungsvariable `NEXT_PUBLIC_AUTH_GOOGLE` = `1` (kein
   Geheimnis), neu ausliefern. Danach erscheint der Knopf.

Apple („Mit Apple fortfahren“):
1. Apple-Developer-Konto (99 €/Jahr) → Certificates, Identifiers & Profiles.
2. Identifiers → App ID mit „Sign in with Apple“; dann Services ID (z. B.
   `de.karamba-eis.mia.web`) mit „Sign in with Apple“, Domain der App und
   Return URL = Callback-Adresse aus Supabase (Providers → Apple).
3. Keys → neuen Key mit „Sign in with Apple“ anlegen, `.p8` herunterladen
   (Key-ID und Team-ID notieren).
4. In Supabase: Providers → Apple einschalten, Services ID, Team-ID, Key-ID
   und den Inhalt der `.p8` eintragen (bleibt bei Supabase, nie im Repo).
5. In Vercel: `NEXT_PUBLIC_AUTH_APPLE` = `1`, neu ausliefern.

Hinweis Homescreen-App (iPhone): Die Rückkehr von Apple/Google kann im
Safari-Fenster statt in der App landen. Dann dort einmal anmelden und die
App neu öffnen; klappt es nicht zuverlässig, den Knopf wieder ausschalten –
E-Mail bleibt immer der sichere Weg. Bitte am echten iPhone prüfen.

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
- Lebensdauer (Kühlschranktür, Tafel 106): nichts verschwindet nach Alter –
  Sprachnachrichten gehen ins Archiv und behalten ihren Ton. Dateien, deren
  Eintrag von Hand gelöscht wurde (oder nie ankam, mit einem Tag Luft),
  räumt `/api/memos/aufraeumen` täglich weg (`orphanFiles`; Vercel Cron 3:30
  UTC, nur mit `CRON_SECRET`, geheimer Schlüssel nur dort; liest die noch
  vorhandenen Einträge des Haushalts aus `entries`). Die App räumt keine
  Dateien mehr nach Alter (`tidyMemoFiles` ist weg).
- Test-Backend: `upload_memo`, `download_memo` (und für Fotos
  `upload_foto`, `download_foto`) mit denselben Regeln. Tests:
  `tests/konten/memosTeilen.test.ts`.

## Fotos der Pinnwand teilen (Kühlschranktür, Tafel 106)

- Bild in Supabase Storage, Bucket `fotos` (privat, höchstens 1,5 MB, nur
  JPEG), Pfad `<haushalt>/<zettel-id>.jpg` (`fotoPath` in
  `src/lib/pinnwand/foto.ts`). Migration
  `supabase/migrations/20261031120000_pinnwand_fotos.sql`: lesen und löschen
  nur Mitglieder (`foto_household(name)` + `is_member`), ablegen nur in den
  eigenen Haushalt, falsche Pfade nie. Test: `tests/datenbank/fotos.test.sql`.
- Ablauf wie beim Ton: vor jedem Abgleich lädt der Runner neue Bilder hoch
  (`uploadPendingFotos`, `backend.uploadFoto`) und vermerkt `foto.path` –
  erst dann wird der Foto-Zettel geteilt (`pinShared` im Übersetzer
  `pinnwand`, v4). Andere Geräte holen das Bild beim Anzeigen
  (`setFotoRemote`, `downloadFoto`) und legen es in IndexedDB
  `wasgibts-fotos` ab. Ohne Konto bleibt das Bild nur auf dem Gerät.

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
- App-Seite Sichtbarkeit (A-021): `tests/kalender/raumGeschaeftlich.test.ts` –
  zwei Konten im Test-Backend: Lisa bekommt Felix’ Geschäftliches nie (Abgleich,
  Heute/Kalender, Mias Kontext, Neuigkeiten, Push).
- Durchklick `abgleich` – A nimmt seine Daten mit (Vorschau), B tritt bei und
  sieht Termin und Pinnwand, B schreibt → A sieht es, B offline → online.
- Durchklick `begruessung` – Begrüßung → Anmelden → Code (falsch, Zurück,
  richtig) → Haushalt anlegen → Startseite; B öffnet den Einladungs-Link,
  Code ist eingetragen; ohne Konten-Variablen kein „Anmelden“.
- Durchklick `konten` – zwei bzw. drei Browser: anmelden (Code über die
  Test-Schnittstelle), Haushalt, Einladen, Beitreten, Kind ohne Einladen,
  Abmelden (Daten bleiben), Konto löschen.
- Härtetest „Familie teilen“ (Clip „Mia“): `tests/konten/familieTeilen.test.ts`
  (echter Abgleich `engine.ts` gegen das Test-Backend mit den Regeln der
  Datenbank, zwei Konten: Familie-Termin bei beiden, Arbeit nie beim anderen –
  auch nicht nach weiteren Runden, nicht überschreib- oder löschbar, auch
  nicht als „Familie“ getarnt –, Einkauf mit „von“ und Gelb im Laden,
  Pinnwand, „Steh grad davor“) und Durchklick `familieTeilen`
  (`e2e/ablaeufe/familieTeilen.mjs`, zwei Browser mit `KONTEN_TEST`: Termine
  Familie/Arbeit in beide Richtungen inkl. Tag-Seite, Felix „Bei REWE“, Lisa
  sagt Mia „Milch auf die Liste“ → bei Felix gelb in höchstens 5 s, „Steh
  grad davor“ kommt bei Lisa an, Pinnwand live in beide Richtungen ≤ 5 s).

## Sichtbar machen (3d, seit v0.80)

- „von Lisa“ (leiser Text, `AddedBy` in `src/components/konten/`) an
  Terminen (Tag-Ansicht) und auf der Einkaufsliste – nur mit mehreren
  Personen und nie bei Eigenem (`addedBy` in `src/lib/konten/wer.ts`). Text
  statt Kreis, weil der Kreis bei Terminen schon „für wen“ heißt. Aufgaben
  haben ihr „von Felix“ schon über Abgeben, die Pinnwand ihren Absender.
- Einkauf: wer etwas gesetzt hat, steckt im Besitzer des Eintrags (setzt der
  Server); beim Einspielen kommt es als `von` an die Zeile, hochgeladen wird
  es nie in den Daten (Fingerabdruck bleibt gleich).
- Jetzt-Karte: der Abgleich merkt sich Neues von anderen (Einkauf,
  Familien-Termine; nicht bei der ersten Übernahme) in `wasgibts.neu` –
  höchstens eine Neuigkeit am Tag, jede nur einmal (siehe `heute.md`).
- Spendentopf: Region, Stimme je Jahr und Beitrag gelten für den Haushalt
  (Eintrag `pot:haushalt`, typ „spendentopf“); Frage-Zeitpunkte und
  weggetippte Karten bleiben auf dem Gerät. Eigene Tabellen für die Summe
  aller Haushalte kommen erst, wenn der Topf live geht (jetzt Vorschau –
  „vorgemerkt“ zählt noch nicht).
- Tests: `tests/konten/sichtbar.test.ts`.

## Adresse (A-030)
- Feste Adresse der App: `https://mia.karamba-eis.de` (`APP_URL` in `src/lib/core/app.ts`), keine Weiterleitung von der alten Vercel-Adresse.
- Einladungslinks (`/e/…`) nutzen immer die feste Adresse (`appOrigin`), nur auf dem eigenen Rechner bzw. im Testserver die Herkunft.
- Supabase (von Hand im Dashboard, nicht im Code): Authentication → URL Configuration → Site URL `https://mia.karamba-eis.de`; Redirect URLs: `https://mia.karamba-eis.de/**` und statt `https://*.vercel.app/**` nur die eigenen Vorschau-Adressen `https://koch-app-*-karamba1.vercel.app/**`.

## Namen statt Mail-Adresse (A-042)

- Überschrift je Haushaltsart (`verbindenTitel` in `core/haushalt.ts`,
  `useVerbindenTitel`): allein „Mit jemandem teilen“, Paar „Zu zweit
  verbinden“, Familie „Familie verbinden“ (Einstellungen-Karte und `/konto`).
- Anmelden auf `/konto`: „Teil Termine, Einkauf und Pinnwand mit deinen
  Leuten.“, darunter klein „Ohne Konto bleibt alles auf diesem Handy.“; unter
  dem Knopf „Du bekommst einen Code per Mail. Ein Passwort brauchst du nicht.“
- EINE Stelle für Namen: `src/lib/konten/namen.ts` – `personName` (nie eine
  Mail), `mitgliedName`, `nameAusMail` (Teil vor dem @ ohne Punkte, Zahlen,
  Unterstriche, großgeschrieben), `standardHaushaltsname`, `haushaltAnzeige`,
  `namensKorrektur`, `ohneMail`. Genutzt in Familie/Mitglieder
  (`HouseholdCard`), „von …“ (`wer.ts`), Abgeben (`abgeben/model.ts`,
  `GiveRows`), Einkauf unterwegs, Einladungsseite („<Name> lädt dich ein.“),
  Push-Texte und Pinnwand-Absender (alte Absender mit @ werden beim Lesen
  bereinigt). Die Mail steht nur klein unter „Angemeldet als“.
- Anzeigename = Name aus dem Profil. Nur ohne Profilnamen fragt Mia beim
  Anlegen bzw. Beitreten einmal „Wie sollen dich die anderen sehen?“
  (`NameFrage`, ein Feld, vorausgefüllt aus der Mail); die Antwort kommt auch
  ins Profil, damit nie zweimal gefragt wird.
- Haushaltsname: Standard je Haushaltsart „Familie“ / „Wir zwei“ / „Privat“,
  mit Nachname „Familie Gabriel“ (Nachname = Name des Haushalts im Profil,
  sonst das letzte Wort des eigenen Namens; nur bei Familie). Ein eigener
  Name aus dem Profil („Villa Kunterbunt“) gilt vor dem Standard. Antippen des
  Namens auf `/konto` = umbenennen (nur Erwachsene, `renameHousehold`).
- Avatar-Kreis der Mitglieder: Anfangsbuchstabe in der Personenfarbe
  (`PersonAvatar`, Tokens `bg-accent`/`bg-work`/`bg-person-*`).
- Einladungs-Link: „Link gilt 14 Tage, bis Mi, 11. Nov.“ (Laufzeit aus dem
  Ablaufdatum des Servers, nur ohne Antwort `LINK_TAGE` = 14 wie
  `interval '14 days'`), darunter klein „Wer ihn öffnet, gehört zur Familie.
  Danach einfach neu holen.“ (allein/Paar: „gehört dazu“, `linkWerSatz`). „Eure
  Einladungen“: je Link eine Zeile „Link für Erwachsene · gilt bis Mi, 11. Nov.
  · 1× benutzt“ (ohne Nutzung ohne den letzten Teil) mit „Zurückziehen“
  (`einladenText.ts`, `InviteRows`).
- Alte Konten (einmalig): Migration
  `supabase/migrations/20261101143000_namen_ohne_mail.sql` (Funktion
  `namen_ohne_mail`, nur für die Migration, nicht für die App): Anzeigename
  mit @ oder gleich dem Teil vor dem @ → bereinigter Teil vor dem @
  (`members`, `profiles`, `invite_links.inviter_name`), Haushaltsname
  „Familie <mail…>“ → leer. Beim nächsten Anmelden (`refreshAccount` →
  `namensKorrektur`) setzt die App über die vorhandenen Rechte (eigener
  Name; Haushalt nur Erwachsene) den Profilnamen und den Standard-Namen.
  Danach passt beides, es gibt nichts mehr zu tun. Der Stand im Gerät
  (`wasgibts.haushalt`) wird beim Lesen bereinigt (`ohneMail` in `cache.ts`).
  Neue Backend-Wege: `setMyName`, `renameHousehold` (Supabase und
  Test-Backend `set_display_name`/`rename_household` mit denselben Regeln).
- Tests: `tests/konten/namen.test.ts` (Profilname, Nachfrage, Vorschlag aus der
  Mail, Korrektur, Haushaltsname, Link-Texte, Zeilen, Zurückziehen, Familie-
  Ansicht ohne „@“ außer „Angemeldet als“), `tests/datenbank/namen.test.sql`
  (Bereinigung, wiederholbar, App kommt nicht an die Funktion, Rechte),
  Durchklick `konten` (kein „@“, Umbenennen, Link-Text, Zeilen, Vorschlag beim
  Beitreten). Bild 1/2 des Auftrags kamen nicht an: nach Text gebaut.
