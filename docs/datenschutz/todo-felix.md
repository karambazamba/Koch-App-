# Datenschutz: was Felix erledigen muss (Schritt für Schritt)

Nichts davon braucht Code. Schlüssel und Verträge nie in den Chat oder ins Repo.

1. **Verträge zur Auftragsverarbeitung (AVV/DPA) abschließen bzw. annehmen**
   - Vercel: Dashboard → Team-Einstellungen → „Legal“ bzw. vercel.com/legal/dpa – DPA annehmen.
   - Supabase: Dashboard → Organization → „Legal Documents“ → DPA anfordern/unterzeichnen.
   - Anthropic: console.anthropic.com → Settings → Legal/Privacy – DPA (Teil der Commercial Terms) prüfen und annehmen. Dabei nachlesen: Wie lange speichert Anthropic Anfragen? Werden sie zum Trainieren genutzt? (Danach den Text der KI-Einwilligung final machen.)
   - Resend: resend.com → Settings → „Legal“/DPA.
2. **Datenübermittlung in die USA prüfen** (je Anbieter): Ist die Firma unter dem EU-US Data Privacy Framework zertifiziert (dataprivacyframework.gov → „Search“)? Sonst Standardvertragsklauseln im DPA. Ergebnis in `docs/datenschutz/anbieter.md` eintragen.
3. **Supabase-Region prüfen**: Dashboard → Project Settings → General → „Region“. Ziel: Frankfurt (eu-central-1). In `anbieter.md` und `verarbeitungsverzeichnis.md` den Platzhalter [Supabase-Region] ersetzen. Steht dort etwas anderes: ein neues Projekt in Frankfurt wäre nötig – erst mit mir besprechen, nichts löschen.
4. **Vercel-Region nach dem nächsten Ausliefern prüfen**: Vercel → Projekt → Settings → Functions → „Function Region“ sollte `fra1` (Frankfurt) zeigen (kommt aus `vercel.json`).
5. **Impressum und Datenschutzerklärung ausfüllen**: Platzhalter auf den Seiten /impressum und /datenschutz ([Verantwortlicher], [Anschrift], [Datenschutz-Kontakt-Mail] …) stehen zentral in `src/lib/datenschutz/rechtstexte.ts` (`BETREIBER`). Danach alle drei Texte (Datenschutz, Impressum, Nutzungsbedingungen) **juristisch prüfen lassen**.
6. **Logs**: In Vercel nachsehen, wie lange Logs aufbewahrt werden (Plan), Ergebnis in `datenkarte.md`.
7. **Dependabot einschalten**: GitHub → Repo → Settings → Code security → „Dependabot alerts“ und „security updates“ an.
8. **Später**: Verschlüsselungs-Schlüssel für besonders schützenswerte Felder – erst nötig, wenn Kalender-Links oder Mail-Inhalte auf dem Server liegen sollen (heute nicht). Dann sage ich Bescheid und schreibe die Anleitung.
9. **Optional** vor einem größeren Start: externer Sicherheits-Check (Pentest).
