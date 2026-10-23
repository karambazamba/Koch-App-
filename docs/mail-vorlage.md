# Mail-Vorlage „Dein Code für Mia“ (Supabase + Resend)

Die Anmelde-Mail (E-Mail-Code, `signInWithOtp` + `verifyOtp`) kommt von
Supabase über Resend-SMTP. Den Text stellt man im Supabase-Dashboard ein –
im Repo liegt nur diese Vorlage. Keine Schlüssel hier eintragen.

## Einstellungen

- **Absendername:** Mia
- **Absender:** mia@karamba-eis.de (wie bisher, Domain bei Resend verifiziert)
- **Betreff:** `Dein Code für Mia: {{ .Token }}`

## Text (HTML, Vorlage „Magic Link“ bzw. „Confirm signup“)

```html
<div style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:#faf7f2;padding:32px 16px;color:#1f1b16">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px 24px;text-align:center">
    <img src="https://koch-app-two.vercel.app/brand/mia-icon@2x.png" width="72" height="72" alt="Mia" style="display:block;margin:0 auto 16px;border-radius:18px">
    <p style="margin:0 0 8px;font-size:17px;font-weight:700">Hallo! Hier ist dein Code:</p>
    <p style="margin:0 0 12px;font-size:40px;font-weight:800;letter-spacing:8px;color:#EE5F14">{{ .Token }}</p>
    <p style="margin:0;font-size:15px;color:#6b625a">Gilt 15 Minuten. Einfach in der App eintippen.</p>
  </div>
  <p style="max-width:420px;margin:16px auto 0;text-align:center;font-size:12px;color:#8a8178">Mia · Gemacht in Eutin · von KARAMBA Eis</p>
</div>
```

## Schritt für Schritt (am Handy, ohne Schlüssel)

**Supabase**

1. supabase.com öffnen, anmelden, das Projekt der App antippen.
2. Links im Menü (☰) **Authentication** → **Emails** (bzw. „Email Templates“).
3. Vorlage **Magic Link** öffnen:
   - Betreff: `Dein Code für Mia: {{ .Token }}`
   - Text: den HTML-Block oben komplett einfügen.
   - **Save** tippen.
4. Dasselbe für **Confirm signup** (gleicher Betreff und Text).
5. Unter **Authentication** → **SMTP Settings** bei **Sender name** „Mia“
   eintragen (Absenderadresse bleibt mia@karamba-eis.de) → **Save**.

**Resend**

6. resend.com öffnen, anmelden → **Domains**: karamba-eis.de muss „Verified“
   zeigen (ist es schon – nichts zu tun).
7. Nichts weiter: Der Absendername kommt aus Supabase.

**Prüfen**

8. In der App unter „Konto“ die eigene Mail-Adresse eingeben → Mail
   abwarten: Absender „Mia“, Betreff „Dein Code für Mia: 123456“, Code groß.
