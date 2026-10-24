# Technische und organisatorische Maßnahmen (Stand v0.90) – ENTWURF

1. **Zugriff nur für die eigene Familie.** Jede Tabelle hat Row Level Security
   (Test `tests/datenbank/sicherheit.test.sql`: RLS auf jeder Tabelle, „anon“
   ohne Rechte, Familien getrennt, Austritt wirkt sofort). „Arbeit“ sieht nur
   die Person selbst, Aufgaben nur Besitzer und Empfänger.
2. **Geheimnisse nur auf dem Server.** `ANTHROPIC_API_KEY`, Supabase-Service-
   Schlüssel, `RESEND_WEBHOOK_SECRET`, `CRON_SECRET` liegen als Vercel-
   Umgebungsvariablen; nie im Repo, im Client oder in Logs. Test
   `tests/app/regeln.test.ts` (Service-Schlüssel nur in Server-Dateien) und
   Suche nach Schlüsseln im Build vor jedem PR.
3. **Anmelden ohne Passwort.** Nur Einmal-Code per Mail (bzw. Apple/Google mit
   PKCE); höchstens 10 Fehlversuche pro Stunde bei Einladungen.
4. **Transport verschlüsselt.** HTTPS mit HSTS; Sicherheits-Header für alle
   Seiten (`next.config.ts`): Referrer-Policy, Permissions-Policy (Mikrofon
   und Standort nur eigene Seite, Kamera/Zahlung aus), `frame-ancestors 'none'`,
   `nosniff`. Test `tests/app/datenschutz.test.ts`.
5. **Datensparsamkeit.** Ohne Konto bleibt alles auf dem Gerät. Pinnwand und
   Sprachnachrichten 24 Std., Chat wird nie gespeichert, Mail-Vorschläge 7 Tage,
   nie die Rohmail.
6. **KI nur mit dem Nötigen.** Pro Anfrage der Satz und ein Ausschnitt
   (heutige Termine, Einkauf, Profil-Auszug); nie Ton von Sprachnachrichten.
   Tageslimit und Zugangscode für jeden KI-Aufruf (`begleitung/guard.ts`).
7. **Mails an Mia.** Webhook-Signatur (Svix) geprüft, nur Weitergeleitetes von
   Mitgliedern, Werbung verworfen, höchstens 30 Mails pro Familie und Tag.
8. **Ort und Kalender.** Nur Ortsname bzw. auf ≈1 km gerundete Koordinaten;
   Kalender-Links nur auf dem Gerät, beim Abruf nicht gespeichert oder
   protokolliert.
9. **Logs ohne Inhalte.** Nur Technik-Zahlen (Dauer, Tokens, Kosten,
   Fehlercode). Test `tests/app/datenschutz.test.ts` prüft jede Log-Zeile.
10. **Server in der EU.** Vercel-Funktionen in Frankfurt (`fra1`), Supabase-
    Region [bitte prüfen, Ziel Frankfurt].
11. **Prüfen vor jeder Auslieferung.** Unit-, Datenbank-, Durchklick-Tests;
    OWASP-Selbstprüfung in `sicherheitspruefung.md`.
