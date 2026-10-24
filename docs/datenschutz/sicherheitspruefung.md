# Sicherheits-Selbstprüfung nach OWASP Top 10 (2021) – Stand v0.90

Selbst geprüft im Code, kein externer Test. Fundstellen sind behoben oder
als offen markiert.

| # | Thema | Ergebnis |
|---|---|---|
| A01 | Zugriffskontrolle | RLS auf jeder Tabelle, getestet (`tests/datenbank/sicherheit.test.sql`, dazu je Bereich eigene Tests). Server-Routen: Konto löschen und Push-Abo nur mit gültigem Token; Cron-Routen (`memos/aufraeumen`, `push/senden`, `tipps/aktualisieren`, `pruefstand`) nur mit `CRON_SECRET` bzw. `PRUEFSTAND_SECRET`; `test-konten` nur im Testmodus (sonst 404). Mail-Webhook nur mit gültiger Svix-Signatur. ✓ |
| A02 | Kryptografie | HTTPS (Vercel) + HSTS-Header (neu in v0.90). Keine eigenen Passwörter (nur Einmal-Codes). Offen: Kalender-Links liegen unverschlüsselt im Browser-Speicher des Geräts (nie auf dem Server) – vertretbar, weil sie nur auf dem eigenen Gerät liegen. Verschlüsselung von Feldern auf dem Server wird erst nötig, wenn dort Links oder Mail-Inhalte gespeichert würden (heute: nur Auszug ≤ 300 Zeichen, 7 Tage). |
| A03 | Injection | Datenbank nur über Supabase-Client/PostgREST bzw. SQL-Funktionen mit Parametern; keine zusammengesetzten SQL-Texte. React maskiert Ausgaben; kein `dangerouslySetInnerHTML` mit Nutzertext – **geprüft**: nur ein festes Start-Skript für Hell/Dunkel im Layout. Eingaben werden gekürzt (`slice`) und geprüft. ✓ |
| A04 | Unsicheres Design | KI schlägt vor, Nutzer übernimmt; Tageslimit + Zugangscode für jede KI-Anfrage; Mails nur als Vorschlag. ✓ |
| A05 | Fehlkonfiguration | Sicherheits-Header für alle Seiten (v0.90): `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (Kamera/Zahlung/USB aus, Mikrofon und Standort nur eigene Seite), `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'`, `X-Frame-Options: DENY`. Offen: volle CSP für Skripte (braucht Nonces in Next.js, eigener Schritt). |
| A06 | Veraltete Komponenten | `npm audit` vor großen Auslieferungen – **bitte regelmäßig** (Dependabot in GitHub einschalten, Felix). |
| A07 | Anmeldung | Einmal-Code per Mail, Supabase-Rate-Limits; Einladungen: höchstens 10 Fehlversuche/Stunde; Links 14 Tage, zurückziehbar. ✓ |
| A08 | Integrität | Service Worker liefert nur eigene Dateien; Webhook-Signatur geprüft; keine Skripte von fremden Servern (Schrift wird beim Bauen eingebunden). ✓ |
| A09 | Logging | Logs nur mit Technik-Zahlen, nie Inhalte – Test `tests/app/datenschutz.test.ts`. Offen: kein Alarm bei vielen Fehlern (Vercel-Plan prüfen). |
| A10 | SSRF | Kalender-Abo und Rezept-Links: nur https (webcal → https), Standard-Port, keine Zugangsdaten in der Adresse, private/lokale Adressen gesperrt (auch nach DNS-Auflösung, IPv4/IPv6), Umleitungen manuell geprüft, 5 MB, 10 s, Limit pro IP. Rest-Risiko: DNS-Rebinding zwischen Prüfung und Abruf (gering; ob Vercel-Funktionen interne Netze erreichen, bitte prüfen). ✓ |
